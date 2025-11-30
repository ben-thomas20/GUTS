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
    
    // Check if player already exists (reconnection)
    let player = game.players.find(p => p.token === playerToken);
    
    if (!player) {
      // New player joining
      // Only allow new players to join if game is in lobby
      if (game.state !== 'lobby') {
        socket.emit('error', { message: 'Game already started' });
        return;
      }
      
      // Only check player limit for new players
      if (game.players.length >= 8) {
        socket.emit('error', { message: 'Game is full' });
        return;
      }
      
      player = {
        id: uuidv4(),
        token: playerToken,
        name: playerName,
        balance: 0,
        buyInAmount: 20, // Default buy-in for new player
        isHost: game.players.length === 0 && playerToken === game.hostToken,
        isActive: true,
        socketId: socket.id
      };
      game.players.push(player);
    } else {
      // Reconnection - reactivate player
      player.socketId = socket.id;
      player.isActive = true;
      // Update name in case it changed
      player.name = playerName;
      // Ensure buyInAmount exists for reconnecting players
      if (!player.buyInAmount) {
        player.buyInAmount = 20;
      }
      
      // If reconnecting during active game, send current game state
      if (game.state === 'playing') {
        // Send current round info
        socket.emit('round_started', {
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
        
        // Send player's cards if they have them
        const playerCards = game.currentHands.get(player.id);
        if (playerCards) {
          socket.emit('cards_dealt', {
            cards: playerCards,
            round: game.round,
            isNothingRound: game.isNothingRound,
            playerId: player.id
          });
        }
        
        // Send timer state if active
        if (game.decisionTimer) {
          // Calculate remaining time (approximate)
          socket.emit('timer_started', { duration: 30 });
        }
      }
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
        balance: p.balance,
        buyInAmount: p.buyInAmount || 20
      })),
      gameState: {
        state: game.state,
        round: game.round,
        pot: game.pot,
        buyInAmount: player.buyInAmount || 20
      }
    });
    
    // Notify all other players
    socket.to(roomCode).emit('player_joined', {
      player: {
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        balance: player.balance,
        buyInAmount: player.buyInAmount || 20
      }
    });
  }
  
  handleSetBuyIn(socket, data) {
    const playerInfo = this.socketPlayers.get(socket.id);
    if (!playerInfo) return;
    
    const game = this.getGame(playerInfo.roomCode);
    if (!game) return;
    
    const player = game.players.find(p => p.id === playerInfo.playerId);
    if (!player) return;
    
    const { buyInAmount } = data;
    if (buyInAmount < 5 || buyInAmount > 100) {
      socket.emit('error', { message: 'Buy-in must be between $5 and $100' });
      return;
    }
    
    player.buyInAmount = buyInAmount;
    
    // Notify all players of the buy-in change
    this.io.to(game.roomCode).emit('buy_in_updated', {
      playerId: player.id,
      buyInAmount: buyInAmount,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        balance: p.balance,
        buyInAmount: p.buyInAmount || 20
      }))
    });
  }
  
  async handleStartGame(socket, data) {
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
    
    // Validate all player buy-ins
    const invalidBuyIn = game.players.find(p => {
      const buyIn = p.buyInAmount || 20;
      return buyIn < 5 || buyIn > 100;
    });
    
    if (invalidBuyIn) {
      socket.emit('error', { message: 'All buy-ins must be between $5 and $100' });
      return;
    }
    
    game.state = 'playing';
    
    // Set each player's balance to their individual buy-in amount
    game.players.forEach(p => {
      p.balance = p.buyInAmount || 20;
    });
    
    // Ensure all player sockets are properly mapped
    try {
      const socketsInRoom = await this.io.in(game.roomCode).fetchSockets();
      socketsInRoom.forEach(s => {
        const socketPlayerInfo = this.socketPlayers.get(s.id);
        if (socketPlayerInfo && socketPlayerInfo.roomCode === game.roomCode) {
          const player = game.players.find(p => p.id === socketPlayerInfo.playerId);
          if (player) {
            this.playerSockets.set(player.id, s);
          }
        }
      });
    } catch (error) {
      console.error('Error mapping sockets:', error);
    }
    
    this.io.to(game.roomCode).emit('game_started', {
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        balance: p.balance,
        buyInAmount: p.buyInAmount || 20
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
      
      // Send cards only to that player - use room broadcast with playerId filter
      // This is more reliable than socket mapping
      this.io.to(game.roomCode).emit('cards_dealt', {
        cards,
        round: game.round,
        isNothingRound: game.isNothingRound,
        playerId: player.id // Client will filter this
      });
    });
    
    // Broadcast round start to all players (after cards are sent)
    setTimeout(() => {
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
    }, 200); // Small delay to ensure cards_dealt arrives first
    
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
    
    // Determine holders
    const holders = activePlayers.filter(p => game.decisions.get(p.id) === 'hold');
    
    // Wait 2 seconds for card animations to complete before revealing
    setTimeout(() => {
      if (holders.length === 0) {
        // Everyone dropped - each player adds $0.50 to pot
        activePlayers.forEach(p => {
          p.balance -= 0.50;
          game.pot += 0.50;
        });
        
        // Show reveal screen for all dropped
        this.io.to(game.roomCode).emit('round_reveal', {
          decisions: decisionsData,
          pot: game.pot
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
        // Single holder vs THE DECK - skip reveal, go directly to showdown
        this.handleDeckShowdown(game, holders[0]);
      } else {
        // Multiple holders - show reveal screen first
        this.io.to(game.roomCode).emit('round_reveal', {
          decisions: decisionsData,
          pot: game.pot
        });
        
        // Then compare hands after delay
        setTimeout(() => {
          this.handleMultipleHolders(game, holders);
        }, 3000);
      }
    }, 2000); // 2 second buffer for animations
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
        
        // Mark game as ready to end - host will call next_round which will end it
        game.pendingGameEnd = true;
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
          pot: matchAmount,
          newPot: game.pot,
          newBalance: holder.balance,
          gameEnded: false
        });
        
        // Don't auto-advance - wait for host to click continue
      }
    }, 5000); // Slower: 5 seconds for animations
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
      
      this.io.to(game.roomCode).emit('game_reset', {
        players: game.players.map(p => ({
          id: p.id,
          name: p.name,
          isHost: p.isHost,
          balance: p.balance
        }))
      });
    } else if (game.state === 'playing') {
      // Check if we need to end the game (from showdown result)
      if (game.pendingGameEnd) {
        game.pendingGameEnd = false;
        this.endGame(game);
      } else {
        // Continue to next round
        this.startNewRound(game);
      }
    }
  }
  
  handleBuyBackIn(socket, data) {
    const playerInfo = this.socketPlayers.get(socket.id);
    if (!playerInfo) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }
    
    const game = this.getGame(playerInfo.roomCode);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    const player = game.players.find(p => p.id === playerInfo.playerId);
    if (!player) {
      socket.emit('error', { message: 'Player not found in game' });
      return;
    }
    
    const { amount } = data;
    if (!amount || amount <= 0) {
      socket.emit('buy_back_result', {
        success: false,
        message: 'Invalid buy-back amount',
        playerId: player.id,
        newBalance: player.balance
      });
      return;
    }
    
    // Calculate current debt
    const currentDebt = player.balance < 0 ? Math.abs(player.balance) : 0;
    
    // If in debt, must buy back at least the debt amount
    if (currentDebt > 0 && amount < currentDebt) {
      socket.emit('buy_back_result', {
        success: false,
        message: `You must buy back at least $${currentDebt.toFixed(2)} to cover your debt`,
        playerId: player.id,
        newBalance: player.balance
      });
      return;
    }
    
    // Add buy-back amount to balance
    player.balance += amount;
    game.lastActivity = Date.now();
    
    // Notify the player
    socket.emit('buy_back_result', {
      success: true,
      message: 'Buy-back successful!',
      playerId: player.id,
      newBalance: player.balance
    });
    
    // Notify all players of balance update
    this.io.to(game.roomCode).emit('player_balance_updated', {
      playerId: player.id,
      newBalance: player.balance,
      buyBackAmount: amount
    });
  }
  
  handleLeaveGame(socket) {
    const playerInfo = this.socketPlayers.get(socket.id);
    if (!playerInfo) return;
    
    const game = this.getGame(playerInfo.roomCode);
    if (!game) return;
    
    const player = game.players.find(p => p.id === playerInfo.playerId);
    if (player) {
      // Check if player is in debt - prevent leaving if in debt
      if (player.balance < 0) {
        socket.emit('error', { 
          message: `You cannot leave while in debt. You must buy back at least $${Math.abs(player.balance).toFixed(2)} first.` 
        });
        return;
      }
      
      // Explicitly leaving - remove player from game
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
      } else {
        // In active game - mark as inactive but keep in game
        player.isActive = false;
        player.socketId = null;
      }
    }
    
    this.socketPlayers.delete(socket.id);
    this.playerSockets.delete(playerInfo.playerId);
    
    // Clean up empty games only when explicitly leaving
    if (game.players.length === 0) {
      this.games.delete(game.roomCode);
    }
  }
  
  handleDisconnect(socket) {
    const playerInfo = this.socketPlayers.get(socket.id);
    if (!playerInfo) return;
    
    const game = this.getGame(playerInfo.roomCode);
    if (!game) return;
    
    const player = game.players.find(p => p.id === playerInfo.playerId);
    if (player) {
      // Mark player as inactive but don't remove them - allow reconnection
      player.isActive = false;
      player.socketId = null;
      
      // Auto-drop in current round if playing
      if (game.state === 'playing' && !game.decisions.has(player.id)) {
        game.decisions.set(player.id, 'drop');
      }
      
      // Don't notify other players - they might reconnect
      // Only notify if they explicitly leave via leave_game
    }
    
    this.socketPlayers.delete(socket.id);
    this.playerSockets.delete(playerInfo.playerId);
    
    // Don't delete games on disconnect - let cleanupAbandonedGames handle it
    // This allows players to reconnect
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

