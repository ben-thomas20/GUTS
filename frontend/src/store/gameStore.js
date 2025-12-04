import { create } from 'zustand'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const WS_URL = API_URL.replace('http://', 'ws://').replace('https://', 'wss://')

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

// WebSocket wrapper to emulate socket.io interface
class SocketWrapper {
  constructor(url) {
    this.url = url
    this.ws = null
    this.connected = false
    this.reconnectDelay = 1000
    this.reconnectAttempts = 0
    this.maxReconnectDelay = 30000
    this.eventHandlers = {}
    this.messageQueue = []
    this.shouldReconnect = true
    
    this.connect()
  }
  
  connect() {
    try {
      this.ws = new WebSocket(`${this.url}/ws`)
      
      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.connected = true
        this.reconnectAttempts = 0
        this.reconnectDelay = 1000
        
        // Send queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift()
          this.ws.send(JSON.stringify(msg))
        }
        
        if (this.eventHandlers['connect']) {
          this.eventHandlers['connect'].forEach(handler => handler())
        }
      }
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.event && this.eventHandlers[message.event]) {
            this.eventHandlers[message.event].forEach(handler => handler(message.data))
          }
        } catch (e) {
          console.error('Failed to parse message:', e)
        }
      }
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.connected = false
        
        if (this.eventHandlers['disconnect']) {
          this.eventHandlers['disconnect'].forEach(handler => handler())
        }
        
        // Attempt reconnection
        if (this.shouldReconnect) {
          this.reconnectAttempts++
          const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, this.maxReconnectDelay)
          setTimeout(() => this.connect(), delay)
        }
      }
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      // Retry connection
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectDelay)
      }
    }
  }
  
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = []
    }
    this.eventHandlers[event].push(handler)
  }
  
  once(event, handler) {
    const wrappedHandler = (...args) => {
      handler(...args)
      this.off(event, wrappedHandler)
    }
    this.on(event, wrappedHandler)
  }
  
  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler)
    }
  }
  
  emit(event, data) {
    const message = { event, data }
    
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message)
    }
  }
  
  disconnect() {
    this.shouldReconnect = false
    if (this.ws) {
      this.ws.close()
    }
  }
}

// Helper to check and update debt status
const checkDebtStatus = (players, playerId, currentState = {}) => {
  const myPlayer = players.find(p => p.id === playerId)
  if (!myPlayer) return { debtAmount: null, showBuyBackModal: false }
  
  const balance = myPlayer.balance ?? 0
  const debtAmount = balance < 0 ? Math.abs(balance) : null
  
  // If there's debt, ALWAYS show the modal - this is the key fix
  // Don't rely on currentState.showBuyBackModal because state updates might clear it
  const hasDebt = debtAmount !== null && debtAmount > 0
  
  // Always show modal if there's debt, regardless of previous state
  // This ensures the modal appears even if state updates try to clear it
  const showBuyBackModal = hasDebt
  
  return {
    debtAmount,
    showBuyBackModal
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
  needsBuyBackForAnte: false, // true if player needs to buy back to afford ante (not in debt)
  anteAmount: 0, // amount needed for ante
  
  // Notifications
  notification: null,
  
  // Actions
  initSocket: () => {
    // Only create socket if one doesn't already exist
    const existingSocket = get().socket
    if (existingSocket) {
      console.log('Socket already initialized')
      return
    }
    
    const socket = new SocketWrapper(WS_URL)
    
    socket.on('connect', () => {
      set({ socket, connected: true })
      console.log('Connected to server')
      
      // Auto-rejoin if we have stored session info
      const session = loadSessionFromStorage()
      console.log('Checking localStorage session:', session)
      if (session && session.roomCode && session.playerToken && session.playerName) {
        console.log('Auto-rejoining room after reconnection...', session.roomCode)
        set({
          roomCode: session.roomCode,
          playerToken: session.playerToken,
          playerName: session.playerName
        })
        get().joinRoom(session.roomCode, session.playerToken, session.playerName)
      } else {
        console.log('No session to auto-rejoin')
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
      // Don't show "game not found" error if we're on landing page or if it's an auto-rejoin failure
      const currentState = get()
      if (data.message === 'Game not found' && (currentState.gameState === 'landing' || !currentState.roomCode)) {
        // Silently ignore - this is expected when auto-rejoining fails on first load
        return
      }
      get().showNotification(data.message, 'error')
    })
    
    socket.on('room_joined', (data) => {
      console.log('room_joined event received:', data)
      const myPlayer = data.players.find(p => p.id === data.playerId)
      
      // IMPORTANT: Only save to localStorage on successful room join
      // This prevents double-join issues on page load
      const { roomCode, playerToken, playerName } = get()
      console.log('Saving session to localStorage:', roomCode, playerToken, playerName)
      if (roomCode && playerToken && playerName) {
        saveSessionToStorage(roomCode, playerToken, playerName)
      }
      
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
    })
    
    socket.on('player_joined', (data) => {
      set(state => {
        // Don't add if player already exists (prevents duplicate when we join)
        if (state.players.some(p => p.id === data.player.id)) {
          console.log('Player already in list, skipping duplicate:', data.player.id)
          return state
        }
        
        return {
        players: [...state.players, {
          ...data.player,
          buyInAmount: data.player.buyInAmount || 20
        }]
        }
      })
      
      // Only show notification if it's not us (we already know we joined)
      const currentPlayerId = get().playerId
      if (data.player.id !== currentPlayerId) {
      get().showNotification(`${data.player.name} joined`, 'info')
      }
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
        })),
        // Clear all previous game state
        pot: 0,
        round: 0,
        isNothingRound: true,
        myCards: [],
        timerRemaining: 0,
        timerDuration: 30,
        timerActive: false,
        myDecision: null,
        decidedPlayers: [],
        revealData: null,
        showdownData: null,
        showdownResult: null,
        showdownPhase: null,
        multipleHoldersResult: null,
        debtAmount: null,
        showBuyBackModal: false,
        needsBuyBackForAnte: false,
        anteAmount: 0
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
          isNothingRound: data.isNothingRound,
          // Clear old timer state when new cards dealt
          timerActive: false,
          timerRemaining: 0,
          myDecision: null,
          decidedPlayers: []
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
      // Only update timer if it's currently active (prevents old ticks from updating)
      const currentState = get()
      if (currentState.timerActive) {
        set({ timerRemaining: data.remaining })
      }
    })
    
    socket.on('player_decided', (data) => {
      set(state => ({
        decidedPlayers: [...state.decidedPlayers, data.playerId]
      }))
    })
    
    socket.on('round_reveal', (data) => {
      set({
        revealData: data,
        timerActive: false,
        timerRemaining: 0
      })
    })
    
    socket.on('all_dropped', (data) => {
      set(state => {
        const updatedPlayers = state.players.map(p => {
          const newBalance = data.balances.find(b => b.playerId === p.id)
          return newBalance ? { ...p, balance: newBalance.balance } : p
        })
        
        const debtStatus = checkDebtStatus(updatedPlayers, state.playerId, state)
        
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
        
        const debtStatus = checkDebtStatus(updatedPlayers, state.playerId, state)
        
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
        
        const debtStatus = checkDebtStatus(updatedPlayers, state.playerId, state)
        
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
        
        const debtStatus = checkDebtStatus(updatedPlayers, state.playerId, state)
        
        return {
          players: updatedPlayers,
          ...debtStatus
        }
      })
    })
    
    socket.on('player_in_debt', (data) => {
      const debtAmount = data.debtAmount || 0
      const needsBuyBack = data.needsBuyBack || false
      const anteAmount = data.anteAmount || 0
      
      // Show modal if in debt OR if they need to buy back to afford ante
      if (debtAmount > 0 || needsBuyBack) {
        set({
          debtAmount: debtAmount > 0 ? debtAmount : (needsBuyBack ? anteAmount : null),
          showBuyBackModal: true,
          needsBuyBackForAnte: needsBuyBack && debtAmount === 0,
          anteAmount: anteAmount
        })
        
        if (debtAmount > 0) {
          get().showNotification(`You're in debt! You must buy back at least $${debtAmount.toFixed(2)} to continue.`, 'error')
        } else if (needsBuyBack) {
          get().showNotification(`You need to buy back to afford the ante ($${anteAmount.toFixed(2)}).`, 'error')
        }
      }
    })
    
    socket.on('round_blocked_debt', (data) => {
      // Round is blocked due to debt - don't clear reveal/showdown data
      // Just show notification to host
      const { isHost } = get()
      if (isHost) {
        const playersList = [
          ...(data.playersInDebt || []).map(p => `${p.playerName} (debt: $${p.debtAmount.toFixed(2)})`),
          ...(data.playersLowOnFunds || []).map(p => `${p.playerName} (needs $${p.neededAmount.toFixed(2)})`)
        ].join(', ')
        get().showNotification(`Round blocked: ${playersList} must buy back first.`, 'error')
      }
    })
    
    socket.on('buy_back_result', (data) => {
      set(state => {
        const updatedPlayers = state.players.map(p => {
          if (p.id === data.playerId) {
            return { ...p, balance: data.newBalance }
          }
          return p
        })
        
        const debtStatus = checkDebtStatus(updatedPlayers, state.playerId, state)
        
        // Check if player can now afford ante (if they needed to buy back for ante)
        const myPlayer = updatedPlayers.find(p => p.id === state.playerId)
        const canAffordAnte = myPlayer && myPlayer.balance >= 0.50 // ante is 0.50
        
        // If buy-back was successful and there's no more debt, clear the modal
        const shouldShowModal = debtStatus.showBuyBackModal || (!canAffordAnte && state.needsBuyBackForAnte)
        
        return {
          players: updatedPlayers,
          ...debtStatus,
          showBuyBackModal: shouldShowModal,
          needsBuyBackForAnte: !canAffordAnte && state.needsBuyBackForAnte,
          anteAmount: !canAffordAnte ? (state.anteAmount || 0.50) : 0
        }
      })
      get().showNotification(data.success ? 'Buy-back successful!' : data.message || 'Buy-back failed', data.success ? 'info' : 'error')
    })
    
    socket.on('game_ended', (data) => {
      set({
        gameState: 'ended',
        finalStandings: data.finalStandings,
        timerActive: false,
        timerRemaining: 0
      })
    })
    
    socket.on('game_reset', (data) => {
      set({
        gameState: 'lobby',
        players: data.players.map(p => ({
          ...p,
          buyInAmount: p.buyInAmount || 20
        })),
        // Clear all game state when resetting to lobby
        pot: 0,
        round: 0,
        isNothingRound: true,
        myCards: [],
        timerRemaining: 0,
        timerDuration: 30,
        timerActive: false,
        myDecision: null,
        decidedPlayers: [],
        revealData: null,
        showdownData: null,
        showdownResult: null,
        showdownPhase: null,
        multipleHoldersResult: null,
        finalStandings: null,
        debtAmount: null,
        showBuyBackModal: false,
        needsBuyBackForAnte: false,
        anteAmount: 0
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
      // Clear any old session data first to prevent auto-rejoin conflicts
      console.log('Clearing localStorage before creating game')
      clearSessionFromStorage()
      
      const response = await fetch(`${API_URL}/api/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Game created:', data)
      
      if (!data.roomCode || !data.hostToken) {
        throw new Error('Invalid response from server')
      }
      
      set({
        roomCode: data.roomCode,
        playerToken: data.hostToken,
        playerName
      })
      
      // Don't save to localStorage yet - wait until room_joined event confirms we're in
      console.log('Calling joinRoom with:', data.roomCode, data.hostToken, playerName)
      get().joinRoom(data.roomCode, data.hostToken, playerName)
    } catch (error) {
      console.error('Create game error:', error)
      get().showNotification(error.message || 'Failed to create game', 'error')
    }
  },
  
  joinGame: async (roomCode, playerName) => {
    try {
      // Clear any old session data first to prevent auto-rejoin conflicts
      clearSessionFromStorage()
      
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
      
      // Don't save to localStorage yet - wait until room_joined event confirms we're in
      get().joinRoom(data.roomCode, data.playerToken, playerName)
    } catch (error) {
      get().showNotification(error.message, 'error')
    }
  },
  
  joinRoom: (roomCode, playerToken, playerName) => {
    console.log('joinRoom called:', { roomCode, playerToken, playerName })
    const { socket, connected } = get()
    if (socket && connected) {
      console.log('Emitting join_room (socket connected)')
      socket.emit('join_room', { roomCode, playerToken, playerName })
    } else if (socket) {
      console.log('Socket not connected, waiting...')
      // Socket exists but not connected yet - wait for connection
      socket.once('connect', () => {
        console.log('Emitting join_room (after connect)')
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
      // Don't clear state here - let the backend handle it
      // If round is blocked due to debt, we want to keep showing the reveal/showdown
      // The backend will clear state when it actually starts the next round
      
      // If in showdown and game ended, the backend will handle ending
      // Otherwise, continue to next round
      socket.emit('next_round', {})
    }
  },
  
  endGame: () => {
    const { socket } = get()
    if (socket) {
      socket.emit('end_game', {})
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
      showBuyBackModal: false,
      needsBuyBackForAnte: false,
      anteAmount: 0
    })
  },
  
  showNotification: (message, type = 'info') => {
    set({ notification: { message, type } })
    setTimeout(() => {
      set({ notification: null })
    }, 3000)
  }
}))
