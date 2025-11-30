const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const GameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());
app.use(compression());
app.use(express.json());

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30 // limit each IP to 30 requests per windowMs
});
app.use('/api/', limiter);

// Socket.io setup
const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 30000,
  pingInterval: 25000
});

// Game manager instance
const gameManager = new GameManager(io);

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/game/create', (req, res) => {
  const roomCode = gameManager.generateRoomCode();
  const hostToken = uuidv4();
  
  gameManager.createGame(roomCode, hostToken);
  
  res.json({ roomCode, hostToken });
});

app.post('/api/game/join', (req, res) => {
  const { roomCode, playerName } = req.body;
  
  if (!roomCode || !playerName) {
    return res.status(400).json({ error: 'Room code and player name required' });
  }
  
  const game = gameManager.getGame(roomCode);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  if (game.state !== 'lobby') {
    return res.status(400).json({ error: 'Game already started' });
  }
  
  if (game.players.length >= 8) {
    return res.status(400).json({ error: 'Game is full' });
  }
  
  const playerToken = uuidv4();
  res.json({ playerToken, roomCode });
});

app.get('/api/game/:roomCode/status', (req, res) => {
  const { roomCode } = req.params;
  const game = gameManager.getGame(roomCode);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  res.json({
    state: game.state,
    playerCount: game.players.length,
    round: game.round
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join_room', (data) => {
    gameManager.handleJoinRoom(socket, data);
  });
  
  socket.on('start_game', (data) => {
    gameManager.handleStartGame(socket, data);
  });
  
  socket.on('set_buy_in', (data) => {
    gameManager.handleSetBuyIn(socket, data);
  });
  
  socket.on('player_decision', (data) => {
    gameManager.handlePlayerDecision(socket, data);
  });
  
  socket.on('next_round', (data) => {
    gameManager.handleNextRound(socket, data);
  });
  
  socket.on('leave_game', () => {
    gameManager.handleLeaveGame(socket);
  });
  
  socket.on('buy_back_in', (data) => {
    gameManager.handleBuyBackIn(socket, data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    gameManager.handleDisconnect(socket);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Required for Railway

server.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});

