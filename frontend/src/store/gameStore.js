import { create } from 'zustand'
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const useGameStore = create((set, get) => ({
  // Connection state
  socket: null,
  connected: false,
  
  // Game state
  gameState: 'landing', // landing, lobby, playing, ended
  roomCode: null,
  playerToken: null,
  playerId: null,
  playerName: null,
  isHost: false,
  
  // Players
  players: [],
  
  // Game data
  buyInAmount: 20,
  pot: 0,
  round: 0,
  isNothingRound: true,
  
  // Player hand
  myCards: [],
  
  // Round state
  timerRemaining: 0,
  timerDuration: 30,
  timerActive: false,
  myDecision: null,
  decidedPlayers: [],
  
  // Reveal state
  revealData: null,
  showdownData: null,
  multipleHoldersResult: null,
  
  // Final results
  finalStandings: null,
  
  // Notifications
  notification: null,
  
  // Actions
  initSocket: () => {
    const socket = io(API_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })
    
    socket.on('connect', () => {
      set({ socket, connected: true })
      console.log('Connected to server')
    })
    
    socket.on('disconnect', () => {
      set({ connected: false })
      get().showNotification('Disconnected from server', 'error')
    })
    
    socket.on('error', (data) => {
      get().showNotification(data.message, 'error')
    })
    
    socket.on('room_joined', (data) => {
      set({
        gameState: 'lobby',
        playerId: data.playerId,
        players: data.players,
        pot: data.gameState.pot,
        round: data.gameState.round,
        buyInAmount: data.gameState.buyInAmount
      })
      
      const player = data.players.find(p => p.id === data.playerId)
      if (player) {
        set({ isHost: player.isHost })
      }
    })
    
    socket.on('player_joined', (data) => {
      set(state => ({
        players: [...state.players, data.player]
      }))
      get().showNotification(`${data.player.name} joined`, 'info')
    })
    
    socket.on('player_left', (data) => {
      set(state => ({
        players: state.players.filter(p => p.id !== data.playerId)
      }))
      get().showNotification(`${data.playerName} left`, 'info')
    })
    
    socket.on('game_started', (data) => {
      set({
        gameState: 'playing',
        buyInAmount: data.buyInAmount,
        players: data.players
      })
    })
    
    socket.on('round_started', (data) => {
      set({
        round: data.round,
        pot: data.pot,
        isNothingRound: data.isNothingRound,
        players: data.players,
        myDecision: null,
        decidedPlayers: [],
        revealData: null,
        showdownData: null,
        multipleHoldersResult: null
      })
    })
    
    socket.on('cards_dealt', (data) => {
      set({
        myCards: data.cards,
        round: data.round,
        isNothingRound: data.isNothingRound
      })
    })
    
    socket.on('timer_started', (data) => {
      set({
        timerRemaining: data.duration,
        timerDuration: data.duration,
        timerActive: true
      })
    })
    
    socket.on('timer_tick', (data) => {
      set({ timerRemaining: data.remaining })
    })
    
    socket.on('player_decided', (data) => {
      set(state => ({
        decidedPlayers: [...state.decidedPlayers, data.playerId]
      }))
    })
    
    socket.on('round_reveal', (data) => {
      set({
        revealData: data,
        timerActive: false
      })
    })
    
    socket.on('all_dropped', (data) => {
      set(state => ({
        pot: data.pot,
        players: state.players.map(p => {
          const newBalance = data.balances.find(b => b.playerId === p.id)
          return newBalance ? { ...p, balance: newBalance.balance } : p
        })
      }))
      get().showNotification('Everyone dropped! Each player adds $0.50 to pot.', 'info')
    })
    
    socket.on('multiple_holders_result', (data) => {
      set(state => ({
        players: state.players.map(p => {
          const newBalance = data.balances.find(b => b.playerId === p.id)
          return newBalance ? { ...p, balance: newBalance.balance } : p
        }),
        pot: data.newPot,
        multipleHoldersResult: data
      }))
    })
    
    socket.on('single_holder_vs_deck', (data) => {
      set({ showdownData: data })
    })
    
    socket.on('deck_showdown_result', (data) => {
      if (data.gameEnded) {
        set({ gameState: 'ended' })
      } else {
        set(state => ({
          pot: data.newPot,
          players: state.players.map(p => {
            if (data.loser && p.id === data.loser.playerId) {
              return { ...p, balance: data.newBalance }
            }
            return p
          })
        }))
      }
    })
    
    socket.on('game_ended', (data) => {
      set({
        gameState: 'ended',
        finalStandings: data.finalStandings
      })
    })
    
    set({ socket })
  },
  
  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, connected: false })
    }
  },
  
  createGame: async (playerName) => {
    try {
      const response = await fetch(`${API_URL}/api/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      
      set({
        roomCode: data.roomCode,
        playerToken: data.hostToken,
        playerName
      })
      
      get().joinRoom(data.roomCode, data.hostToken, playerName)
    } catch (error) {
      get().showNotification('Failed to create game', 'error')
    }
  },
  
  joinGame: async (roomCode, playerName) => {
    try {
      const response = await fetch(`${API_URL}/api/game/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, playerName })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      
      const data = await response.json()
      
      set({
        roomCode: data.roomCode,
        playerToken: data.playerToken,
        playerName
      })
      
      get().joinRoom(data.roomCode, data.playerToken, playerName)
    } catch (error) {
      get().showNotification(error.message, 'error')
    }
  },
  
  joinRoom: (roomCode, playerToken, playerName) => {
    const { socket } = get()
    if (socket) {
      socket.emit('join_room', { roomCode, playerToken, playerName })
    }
  },
  
  startGame: (buyInAmount) => {
    const { socket } = get()
    if (socket) {
      socket.emit('start_game', { buyInAmount })
    }
  },
  
  makeDecision: (decision) => {
    const { socket } = get()
    if (socket) {
      socket.emit('player_decision', { decision })
      set({ myDecision: decision })
    }
  },
  
  nextRound: () => {
    const { socket } = get()
    if (socket) {
      socket.emit('next_round', {})
    }
  },
  
  leaveGame: () => {
    const { socket } = get()
    if (socket) {
      socket.emit('leave_game')
    }
    set({
      gameState: 'landing',
      roomCode: null,
      playerToken: null,
      playerId: null,
      playerName: null,
      isHost: false,
      players: [],
      myCards: [],
      round: 0,
      pot: 0
    })
  },
  
  showNotification: (message, type = 'info') => {
    set({ notification: { message, type } })
    setTimeout(() => {
      set({ notification: null })
    }, 3000)
  }
}))

