const { v4: uuidv4 } = require('uuid');
const { createDeck, shuffleDeck, dealCards, evaluateHand, compareHands } = require('./gameLogic');

class GameManager {
  constructor(io) {
    this.io = io;
    this.games = new Map();
    this.playerSockets = new Map(); // playerId -> socket
    this.socketPlayers = new Map(); // socketId -> { roomCode, playerId }
    
    // Cleanup abandoned games every 5 minutes
    setInterval(() => this.cleanupAbandonedGames(), 5 * 60 * 1000);
  }
  
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (this.games.has(code));
    return code;
  }
  
  createGame(roomCode, hostToken) {
    const game = {
      roomCode,
      hostToken,
      state: 'lobby', // lobby, playing, ended
      players: [],
      buyInAmount: 20,
      ante: 0.50,
      pot: 0,
      round: 0,
      deck: [],
      currentHands: new Map(),
      decisions: new Map(),
      decisionTimer: null,
      lastActivity: Date.now(),
      isNothingRound: true
    };
    
    this.games.set(roomCode, game);
    return game;
  }
  
  getGame(roomCode) {
    return this.games.get(roomCode);
  }
  
  handleJoinRoom(socket, data) {
    const { roomCode, playerToken, playerName } = data;
    
    if (!roomCode || !playerToken || !playerName) {
      socket.emit('error', { message: 'Missing required fields' });
      return;
    }
    
    const game = this.getGame(roomCode);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    if (game.state !== 'lobby') {
      socket.emit('error', { message: 'Game already started' });
      return;
    }
    
    if (game.players.length >= 8) {
      socket.emit('error', { message: 'Game is full' });
      return;
    }
    
    // Check if player already exists (reconnection)
    let player = game.players.find(p => p.token === playerToken);
    
    if (!player) {
      player = {
        id: uuidv4(),
        token: playerToken,
        name: playerName,
        balance: 0,
        isHost: game.players.length === 0 && playerToken === game.hostToken,
        isActive: true,
        socketId: socket.id
      };
      game.players.push(player);
    } else {
      // Reconnection
      player.socketId = socket.id;
      player.isActive = true;
    }
    
    this.playerSockets.set(player.id, socket);
    this.socketPlayers.set(socket.id, { roomCode, playerId: player.id });
    
    socket.join(roomCode);
    game.lastActivity = Date.now();
    
    // Send confirmation to joining player
    socket.emit('room_joined', {
      playerId: player.id,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        balance: p.balance
      })),
      gameState: {
        state: game.state,
        round: game.round,
        pot: game.pot,
        buyInAmount: game.buyInAmount
      }
    });
    
    // Notify all other players
    socket.to(roomCode).emit('player_joined', {
      player: {
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        balance: player.balance
      }
    });
  }
  
  handleStartGame(socket, data) {
    const playerInfo = this.socketPlayers.get(socket.id);
    if (!playerInfo) return;
    
    const game = this.getGame(playerInfo.roomCode);
    if (!game) return;
    
    const player = game.players.find(p => p.id === playerInfo.playerId);
    if (!player || !player.isHost) {
      socket.emit('error', { message: 'Only host can start game' });
      return;
    }
    
    if (game.players.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }
    
    const { buyInAmount } = data;
    if (buyInAmount < 5 || buyInAmount > 100) {
      socket.emit('error', { message: 'Buy-in must be between $5 and $100' });
      return;
    }
    
    game.buyInAmount = buyInAmount;
    game.state = 'playing';
    
    // Set all players' balances to buy-in amount
    game.players.forEach(p => {
      p.balance = buyInAmount;
    });
    
    this.io.to(game.roomCode).emit('game_started', {
      buyInAmount,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        balance: p.balance
      }))
    });
    
    // Start first round
    setTimeout(() => this.startNewRound(game), 2000);
  }
  
  startNewRound(game) {
    game.round++;
    game.isNothingRound = game.round <= 3;
    game.decisions.clear();
    game.currentHands.clear();
    
    // Collect antes
    const activePlayers = game.players.filter(p => p.balance >= game.ante);
    if (activePlayers.length < 2) {
      this.endGame(game);
      return;
    }
    
    activePlayers.forEach(p => {
      p.balance -= game.ante;
      game.pot += game.ante;
    });
    
    // Eliminate players who can't afford ante
    game.players.forEach(p => {
      if (p.balance < game.ante) {
        p.isActive = false;
      }
    });
    
    // Create and shuffle deck
    game.deck = shuffleDeck(createDeck());
    
    // Deal cards to each active player
    activePlayers.forEach(player => {
      const cards = dealCards(game.deck, 3);
      game.currentHands.set(player.id, cards);
      
      // Send cards only to that player
      const playerSocket = this.playerSockets.get(player.id);
      if (playerSocket) {
        playerSocket.emit('cards_dealt', {
          cards,
          round: game.round,
          isNothingRound: game.isNothingRound
        });
      }
    });
    
    // Broadcast round start to all players
    this.io.to(game.roomCode).emit('round_started', {
      round: game.round,
      pot: game.pot,
      isNothingRound: game.isNothingRound,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        balance: p.balance,
        isActive: p.isActive
      }))
    });
    
    // Start decision timer
    this.startDecisionTimer(game);
  }
  
  startDecisionTimer(game) {
    const duration = 30;
    let remaining = duration;
    
    this.io.to(game.roomCode).emit('timer_started', { duration });
    
    const timerInterval = setInterval(() => {
      remaining--;
      this.io.to(game.roomCode).emit('timer_tick', { remaining });
      
      if (remaining <= 0) {
        clearInterval(timerInterval);
        this.resolveRound(game);
      }
    }, 1000);
    
    game.decisionTimer = timerInterval;
  }
  
  handlePlayerDecision(socket, data) {
    const playerInfo = this.socketPlayers.get(socket.id);
    if (!playerInfo) return;
    
    const game = this.getGame(playerInfo.roomCode);
    if (!game || game.state !== 'playing') return;
    
    const { decision } = data; // 'hold' or 'drop'
    
    if (decision !== 'hold' && decision !== 'drop') {
      socket.emit('error', { message: 'Invalid decision' });
      return;
    }
    
    const player = game.players.find(p => p.id === playerInfo.playerId);
    if (!player || !player.isActive) return;
    
    if (game.decisions.has(player.id)) {
      socket.emit('error', { message: 'Decision already made' });
      return;
    }
    
    game.decisions.set(player.id, decision);
    
    // Notify all players that this player decided (without revealing what)
    this.io.to(game.roomCode).emit('player_decided', {
      playerId: player.id,
      playerName: player.name
    });
    
    // Check if all active players have decided
    const activePlayers = game.players.filter(p => p.isActive);
    if (game.decisions.size === activePlayers.length) {
      clearInterval(game.decisionTimer);
      this.resolveRound(game);
    }
  }
  
  resolveRound(game) {
    const activePlayers = game.players.filter(p => p.isActive);
    
    // Auto-drop players who didn't decide
    activePlayers.forEach(p => {
      if (!game.decisions.has(p.id)) {
        game.decisions.set(p.id, 'drop');
      }
    });
    
    // Compile decisions with cards for players who held
    const decisionsData = activePlayers.map(p => ({
      playerId: p.id,
      playerName: p.name,
      decision: game.decisions.get(p.id),
      cards: game.decisions.get(p.id) === 'hold' ? game.currentHands.get(p.id) : null
    }));
    
    // Reveal all decisions
    this.io.to(game.roomCode).emit('round_reveal', {
      decisions: decisionsData,
      pot: game.pot
    });
    
    // Determine holders
    const holders = activePlayers.filter(p => game.decisions.get(p.id) === 'hold');
    
    setTimeout(() => {
      if (holders.length === 0) {
        // Everyone dropped - each player adds $0.50 to pot
        activePlayers.forEach(p => {
          p.balance -= 0.50;
          game.pot += 0.50;
        });
        
        this.io.to(game.roomCode).emit('all_dropped', { 
          pot: game.pot,
          balances: game.players.map(p => ({
            playerId: p.id,
            balance: p.balance
          }))
        });
        // Don't auto-advance - wait for host to click continue
      } else if (holders.length === 1) {
        // Single holder vs THE DECK
        this.handleDeckShowdown(game, holders[0]);
      } else {
        // Multiple holders - compare hands
        this.handleMultipleHolders(game, holders);
      }
    }, 2000);
  }
  
  handleMultipleHolders(game, holders) {
    // Evaluate all hands
    const evaluatedHands = holders.map(player => {
      const cards = game.currentHands.get(player.id);
      const evaluation = evaluateHand(cards, game.isNothingRound);
      return { player, cards, evaluation };
    });
    
    // Sort by hand strength (best first) - negate compareHands result for descending order
    evaluatedHands.sort((a, b) => -compareHands(a.evaluation, b.evaluation));
    
    const winner = evaluatedHands[0].player;
    const losers = evaluatedHands.slice(1);
    
    // Calculate payments
    const winAmount = game.pot;
    winner.balance += winAmount;
    
    const loserPayments = losers.map(({ player }) => {
      const payment = game.pot;
      player.balance -= payment;
      return { playerId: player.id, playerName: player.name, amount: payment };
    });
    
    // Add loser payments to next round's pot
    const newPotAddition = losers.length * game.pot;
    game.pot = newPotAddition;
    
    this.io.to(game.roomCode).emit('multiple_holders_result', {
      winner: {
        playerId: winner.id,
        playerName: winner.name,
        cards: game.currentHands.get(winner.id),
        handType: evaluatedHands[0].evaluation.typeName
      },
      winAmount,
      loserPayments,
      newPot: game.pot,
      balances: game.players.map(p => ({
        playerId: p.id,
        balance: p.balance
      }))
    });
    
    // Don't auto-advance - wait for host to click continue
  }
  
  handleDeckShowdown(game, holder) {
    // Deal 3 cards to THE DECK from remaining deck
    const deckCards = dealCards(game.deck, 3);
    const playerCards = game.currentHands.get(holder.id);
    
    // Evaluate both hands
    const playerEval = evaluateHand(playerCards, game.isNothingRound);
    const deckEval = evaluateHand(deckCards, game.isNothingRound);
    
    const comparison = compareHands(playerEval, deckEval);
    const playerWon = comparison > 0;
    
    this.io.to(game.roomCode).emit('single_holder_vs_deck', {
      player: {
        playerId: holder.id,
        playerName: holder.name
      },
      playerCards,
      playerHandType: playerEval.type,
      deckCards,
      deckHandType: deckEval.type
    });
    
    setTimeout(() => {
      if (playerWon) {
        // Player wins - game ends
        holder.balance += game.pot;
        
        this.io.to(game.roomCode).emit('deck_showdown_result', {
          playerWon: true,
          winner: {
            playerId: holder.id,
            playerName: holder.name
          },
          pot: game.pot,
          newBalance: holder.balance,
          gameEnded: true
        });
        
        setTimeout(() => this.endGame(game), 3000);
      } else {
        // THE DECK wins - player matches pot, game continues
        const matchAmount = game.pot;
        holder.balance -= matchAmount;
        game.pot += matchAmount;
        
        this.io.to(game.roomCode).emit('deck_showdown_result', {
          playerWon: false,
          loser: {
            playerId: holder.id,
            playerName: holder.name
          },
          matchAmount,
          newPot: game.pot,
          newBalance: holder.balance,
          gameEnded: false
        });
        
        setTimeout(() => this.startNewRound(game), 5000);
      }
    }, 3000);
  }
  
  endGame(game) {
    game.state = 'ended';
    
    // Sort players by balance
    const standings = [...game.players].sort((a, b) => b.balance - a.balance);
    
    this.io.to(game.roomCode).emit('game_ended', {
      finalStandings: standings.map(p => ({
        playerId: p.id,
        playerName: p.name,
        balance: p.balance,
        profit: p.balance - game.buyInAmount
      })),
      winner: standings[0] ? {
        playerId: standings[0].id,
        playerName: standings[0].name,
        finalBalance: standings[0].balance
      } : null,
      totalRounds: game.round
    });
  }
  
  handleNextRound(socket, data) {
    const playerInfo = this.socketPlayers.get(socket.id);
    if (!playerInfo) return;
    
    const game = this.getGame(playerInfo.roomCode);
    if (!game) return;
    
    const player = game.players.find(p => p.id === playerInfo.playerId);
    if (!player || !player.isHost) {
      socket.emit('error', { message: 'Only host can continue to next round' });
      return;
    }
    
    if (game.state === 'ended') {
      // Reset game to lobby
      game.state = 'lobby';
      game.round = 0;
      game.pot = 0;
      game.players.forEach(p => {
        p.balance = 0;
        p.isActive = true;
      });
    } else if (game.state === 'playing') {
      // Continue to next round
      this.startNewRound(game);
    }
  }
  
  handleLeaveGame(socket) {
    this.handleDisconnect(socket);
  }
  
  handleDisconnect(socket) {
    const playerInfo = this.socketPlayers.get(socket.id);
    if (!playerInfo) return;
    
    const game = this.getGame(playerInfo.roomCode);
    if (!game) return;
    
    const player = game.players.find(p => p.id === playerInfo.playerId);
    if (player) {
      // Mark player as inactive (auto-drop in current round)
      if (game.state === 'playing' && !game.decisions.has(player.id)) {
        game.decisions.set(player.id, 'drop');
      }
      
      // Remove player from game if in lobby
      if (game.state === 'lobby') {
        game.players = game.players.filter(p => p.id !== player.id);
        
        // Reassign host if needed
        if (player.isHost && game.players.length > 0) {
          game.players[0].isHost = true;
        }
        
        this.io.to(game.roomCode).emit('player_left', {
          playerId: player.id,
          playerName: player.name
        });
      }
    }
    
    this.socketPlayers.delete(socket.id);
    this.playerSockets.delete(playerInfo.playerId);
    
    // Clean up empty games
    if (game.players.length === 0) {
      this.games.delete(game.roomCode);
    }
  }
  
  cleanupAbandonedGames() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    for (const [roomCode, game] of this.games.entries()) {
      if (now - game.lastActivity > timeout) {
        console.log(`Cleaning up abandoned game: ${roomCode}`);
        this.games.delete(roomCode);
      }
    }
  }
}

module.exports = GameManager;

