import { create } from 'zustand'
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// LocalStorage helpers for persistence
const STORAGE_KEY = 'guts_game_session'

const saveSessionToStorage = (roomCode, playerToken, playerName) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ roomCode, playerToken, playerName }))
  } catch (e) {
    console.error('Failed to save session to localStorage:', e)
  }
}

const loadSessionFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (e) {
    console.error('Failed to load session from localStorage:', e)
    return null
  }
}

const clearSessionFromStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.error('Failed to clear session from localStorage:', e)
  }
}

// Helper to check and update debt status
const checkDebtStatus = (players, playerId) => {
  const myPlayer = players.find(p => p.id === playerId)
  if (!myPlayer) return { debtAmount: null, showBuyBackModal: false }
  
  const balance = myPlayer.balance ?? 0
  const debtAmount = balance < 0 ? Math.abs(balance) : null
  
  return {
    debtAmount,
    showBuyBackModal: debtAmount !== null && debtAmount > 0
  }
}

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
  myBuyInAmount: 20, // Individual player's buy-in
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
  showdownResult: null,
  showdownPhase: null, // 'transition', 'dealing', 'result'
  multipleHoldersResult: null,
  
  // Final results
  finalStandings: null,
  
  // Buy-back state
  debtAmount: null, // null = not in debt, number = debt amount
  showBuyBackModal: false,
  
  // Notifications
  notification: null,
  
  // Actions
  initSocket: () => {
    const socket = io(API_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity, // Keep trying to reconnect indefinitely
      timeout: 20000
    })
    
    socket.on('connect', () => {
      set({ socket, connected: true })
      console.log('Connected to server')
      
      // Auto-rejoin if we have stored session info
      const session = loadSessionFromStorage()
      if (session && session.roomCode && session.playerToken && session.playerName) {
        console.log('Auto-rejoining room after reconnection...')
        set({
          roomCode: session.roomCode,
          playerToken: session.playerToken,
          playerName: session.playerName
        })
        get().joinRoom(session.roomCode, session.playerToken, session.playerName)
      }
    })
    
    socket.on('disconnect', () => {
      set({ connected: false })
      // Don't show error notification on disconnect - it might be temporary
      // Only show if we're actually in a game
      if (get().gameState !== 'landing') {
        get().showNotification('Disconnected from server. Reconnecting...', 'info')
      }
    })
    
    socket.on('error', (data) => {
      get().showNotification(data.message, 'error')
    })
    
    socket.on('room_joined', (data) => {
      const myPlayer = data.players.find(p => p.id === data.playerId)
      set({
        gameState: data.gameState.state || 'lobby', // Use state from server (could be 'lobby' or 'playing')
        playerId: data.playerId,
        players: data.players.map(p => ({
          ...p,
          buyInAmount: p.buyInAmount || 20
        })),
        pot: data.gameState.pot,
        round: data.gameState.round,
        buyInAmount: data.gameState.buyInAmount,
        myBuyInAmount: myPlayer?.buyInAmount || data.gameState.buyInAmount || 20
      })
      
      const player = data.players.find(p => p.id === data.playerId)
      if (player) {
        set({ isHost: player.isHost })
      }
      
      // Update localStorage with current session
      const { roomCode, playerToken, playerName } = get()
      if (roomCode && playerToken && playerName) {
        saveSessionToStorage(roomCode, playerToken, playerName)
      }
    })
    
    socket.on('player_joined', (data) => {
      set(state => ({
        players: [...state.players, {
          ...data.player,
          buyInAmount: data.player.buyInAmount || 20
        }]
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
        players: data.players.map(p => ({
          ...p,
          buyInAmount: p.buyInAmount || 20
        }))
      })
    })
    
    socket.on('buy_in_updated', (data) => {
      set({
        players: data.players.map(p => ({
          ...p,
          buyInAmount: p.buyInAmount || 20
        }))
      })
      // Update my buy-in if it's for this player
      if (data.playerId === get().playerId) {
        set({ myBuyInAmount: data.buyInAmount })
      }
    })
    
    socket.on('round_started', (data) => {
      set(state => {
        const updatedPlayers = data.players
        const debtStatus = checkDebtStatus(updatedPlayers, state.playerId)
        
        return {
          round: data.round,
          pot: data.pot,
          isNothingRound: data.isNothingRound,
          players: updatedPlayers,
          myDecision: null,
          decidedPlayers: [],
          revealData: null,
          showdownData: null,
          showdownResult: null,
          showdownPhase: null,
          multipleHoldersResult: null,
          ...debtStatus
          // Don't clear myCards here - wait for cards_dealt to set them
        }
      })
    })
    
    socket.on('cards_dealt', (data) => {
      // Only accept cards if they're for this player (or if no playerId specified, assume it's for us)
      if (!data.playerId || data.playerId === get().playerId) {
        set({
          myCards: data.cards,
          round: data.round,
          isNothingRound: data.isNothingRound
        })
      }
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
      set(state => {
        const updatedPlayers = state.players.map(p => {
          const newBalance = data.balances.find(b => b.playerId === p.id)
          return newBalance ? { ...p, balance: newBalance.balance } : p
        })
        
        const debtStatus = checkDebtStatus(updatedPlayers, state.playerId)
        
        return {
          pot: data.pot,
          players: updatedPlayers,
          ...debtStatus
        }
      })
      get().showNotification('Everyone dropped! Each player adds $0.50 to pot.', 'info')
    })
    
    socket.on('multiple_holders_result', (data) => {
      set(state => {
        const updatedPlayers = state.players.map(p => {
          const newBalance = data.balances.find(b => b.playerId === p.id)
          return newBalance ? { ...p, balance: newBalance.balance } : p
        })
        
        const debtStatus = checkDebtStatus(updatedPlayers, state.playerId)
        
        return {
          players: updatedPlayers,
          pot: data.newPot,
          multipleHoldersResult: data,
          ...debtStatus
        }
      })
    })
    
    socket.on('single_holder_vs_deck', (data) => {
      set({ 
        revealData: null, // Clear reveal data to skip PVP comparison
        showdownData: data,
        showdownPhase: 'transition' // Start transition phase
      })
    })
    
    socket.on('deck_showdown_result', (data) => {
      set(state => {
        const updatedPlayers = state.players.map(p => 
          p.id === state.playerId && data.newBalance !== undefined
            ? { ...p, balance: data.newBalance }
            : p
        )
        
        const debtStatus = checkDebtStatus(updatedPlayers, state.playerId)
        
        return {
          showdownResult: data,
          showdownPhase: 'result', // Show result phase
          players: updatedPlayers,
          ...debtStatus
        }
      })
      
      // Don't auto-advance - wait for host to continue
      // If game ended, host will call endGame
      // If game continues, host will call nextRound
    })
    
    socket.on('player_balance_updated', (data) => {
      set(state => {
        const updatedPlayers = state.players.map(p => 
          p.id === data.playerId
            ? { ...p, balance: data.newBalance }
            : p
        )
        
        const debtStatus = checkDebtStatus(updatedPlayers, state.playerId)
        
        return {
          players: updatedPlayers,
          ...debtStatus
        }
      })
    })
    
    socket.on('player_in_debt', (data) => {
      set({
        debtAmount: data.debtAmount,
        showBuyBackModal: true
      })
      get().showNotification(`You're in debt! You must buy back $${data.debtAmount.toFixed(2)} to continue.`, 'error')
    })
    
    socket.on('buy_back_result', (data) => {
      set(state => {
        const updatedPlayers = state.players.map(p => {
          if (p.id === data.playerId) {
            return { ...p, balance: data.newBalance }
          }
          return p
        })
        
        const debtStatus = checkDebtStatus(updatedPlayers, state.playerId)
        
        return {
          players: updatedPlayers,
          ...debtStatus
        }
      })
      get().showNotification(data.success ? 'Buy-back successful!' : data.message || 'Buy-back failed', data.success ? 'info' : 'error')
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
    // Don't actually disconnect - let socket.io handle reconnection
    // Only clear the socket reference if explicitly leaving
    const { socket } = get()
    if (socket) {
      // Don't call socket.disconnect() - let it handle reconnection automatically
      // Just clear the reference if needed
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
      
      // Save to localStorage for reconnection
      saveSessionToStorage(data.roomCode, data.hostToken, playerName)
      
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
      
      // Save to localStorage for reconnection
      saveSessionToStorage(data.roomCode, data.playerToken, playerName)
      
      get().joinRoom(data.roomCode, data.playerToken, playerName)
    } catch (error) {
      get().showNotification(error.message, 'error')
    }
  },
  
  joinRoom: (roomCode, playerToken, playerName) => {
    const { socket, connected } = get()
    if (socket && connected) {
      socket.emit('join_room', { roomCode, playerToken, playerName })
    } else if (socket) {
      // Socket exists but not connected yet - wait for connection
      socket.once('connect', () => {
        socket.emit('join_room', { roomCode, playerToken, playerName })
      })
    }
  },
  
  setMyBuyIn: (amount) => {
    set({ myBuyInAmount: amount })
    const { socket } = get()
    if (socket) {
      socket.emit('set_buy_in', { buyInAmount: amount })
    }
  },
  
  startGame: () => {
    const { socket } = get()
    if (socket) {
      socket.emit('start_game', {})
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
    const { socket, showdownResult } = get()
    if (socket) {
      // Clear showdown state
      set({
        showdownData: null,
        showdownResult: null,
        showdownPhase: null
      })
      
      // If in showdown and game ended, the backend will handle ending
      // Otherwise, continue to next round
      socket.emit('next_round', {})
    }
  },
  
  buyBackIn: (amount) => {
    const { socket, debtAmount } = get()
    if (!socket) {
      get().showNotification('Not connected to server', 'error')
      return
    }
    
    if (debtAmount > 0 && amount < debtAmount) {
      get().showNotification(`You must buy back at least $${debtAmount.toFixed(2)} to cover your debt`, 'error')
      return
    }
    
    socket.emit('buy_back_in', { amount })
  },
  
  leaveGame: () => {
    const { debtAmount } = get()
    
    // Prevent leaving if in debt
    if (debtAmount && debtAmount > 0) {
      get().showNotification(`You cannot leave while in debt. You must buy back at least $${debtAmount.toFixed(2)} first.`, 'error')
      return
    }
    
    const { socket } = get()
    if (socket) {
      socket.emit('leave_game')
    }
    
    // Clear localStorage when explicitly leaving
    clearSessionFromStorage()
    
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
      pot: 0,
      debtAmount: null,
      showBuyBackModal: false
    })
  },
  
  showNotification: (message, type = 'info') => {
    set({ notification: { message, type } })
    setTimeout(() => {
      set({ notification: null })
    }, 3000)
  }
}))

