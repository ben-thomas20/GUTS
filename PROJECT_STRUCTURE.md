# Project Structure

Complete file structure of the Guts Card Game application.

```
GUTS/
│
├── 📄 README.md                    # Comprehensive documentation
├── 📄 QUICKSTART.md                # Fast setup guide (5 min)
├── 📄 GAME_RULES.md                # Detailed game rules reference
├── 📄 TESTING.md                   # Testing guide and checklist
├── 📄 PROJECT_STRUCTURE.md         # This file
├── 📄 package.json                 # Root workspace configuration
├── 📄 .gitignore                   # Git ignore rules
├── 🔧 setup.sh                     # Automated setup (Unix)
└── 🔧 setup.bat                    # Automated setup (Windows)
│
├── 📁 backend/                     # Node.js + Express + Socket.io
│   ├── 📄 package.json            # Backend dependencies
│   ├── 📄 .env.example            # Environment variables template
│   ├── 🔧 server.js               # Main server & Socket.io setup
│   ├── 🎮 gameManager.js          # Game state & room management
│   └── 🎴 gameLogic.js            # Card dealing & hand evaluation
│
└── 📁 frontend/                    # React + Vite + Tailwind CSS
    ├── 📄 package.json            # Frontend dependencies
    ├── 📄 .env.example            # Environment variables template
    ├── 📄 index.html              # HTML entry point
    ├── 🔧 vite.config.js          # Vite configuration
    ├── 🎨 tailwind.config.js      # Tailwind CSS configuration
    ├── 🎨 postcss.config.js       # PostCSS configuration
    │
    └── 📁 src/
        ├── 🔧 main.jsx            # React entry point
        ├── 📱 App.jsx             # Main app component
        ├── 🎨 index.css           # Global styles
        │
        ├── 📁 store/
        │   └── 🗂️ gameStore.js    # Zustand state management
        │
        └── 📁 components/
            ├── 🏠 LandingPage.jsx     # Create/Join game screen
            ├── 👥 Lobby.jsx           # Pre-game lobby
            ├── 🎮 GameRoom.jsx        # Main game screen
            ├── 🏆 GameEnd.jsx         # Final standings screen
            ├── 🃏 Card.jsx            # Playing card component
            ├── ⏱️ Timer.jsx           # Countdown timer
            ├── 👥 PlayerList.jsx      # Player list with balances
            ├── 📋 RevealScreen.jsx    # Round results display
            ├── 🎰 DeckShowdown.jsx    # THE DECK showdown screen
            └── 📢 Notification.jsx    # Toast notifications
```

## File Descriptions

### Root Level

- **README.md**: Complete documentation including setup, deployment, API reference, troubleshooting
- **QUICKSTART.md**: Get started in 5 minutes
- **GAME_RULES.md**: Comprehensive game rules with examples
- **TESTING.md**: Testing guide with manual and automated test scenarios
- **package.json**: Workspace configuration, runs both frontend/backend
- **setup.sh / setup.bat**: One-command setup scripts

### Backend (`backend/`)

#### `server.js` (Main Server)
- Express server setup
- Socket.io WebSocket server
- Security middleware (Helmet, CORS, rate limiting)
- REST API endpoints
- Socket event handlers

#### `gameManager.js` (Game Logic Manager)
- Game room creation and management
- Player connection handling
- Round flow orchestration
- Decision collection and resolution
- THE DECK showdown logic
- Pot calculation and distribution
- Player elimination
- Reconnection handling

#### `gameLogic.js` (Card & Hand Logic)
- Deck creation and shuffling (crypto-secure)
- Card dealing
- Hand evaluation (all poker hands)
- Hand comparison
- NOTHING round vs Normal round logic
- Flush, straight, pair detection

### Frontend (`frontend/`)

#### Configuration
- **vite.config.js**: Development server, proxy settings
- **tailwind.config.js**: Custom colors (felt green, card red/black)
- **postcss.config.js**: CSS processing
- **index.html**: PWA-ready, mobile-optimized meta tags

#### Core (`src/`)

**App.jsx**: Main router, renders screens based on game state

**main.jsx**: React initialization

**index.css**: Global styles, iOS safe areas, custom scrollbars

#### State Management (`src/store/`)

**gameStore.js**: Zustand store managing:
- WebSocket connection
- Game state (lobby, playing, ended)
- Player data
- Card hands
- Timer state
- Real-time updates via Socket.io events

#### Components (`src/components/`)

**LandingPage.jsx**
- Create new game
- Join existing game
- Player name input

**Lobby.jsx**
- Room code display (copyable)
- Player list
- Buy-in amount selector (host)
- Start game button (host)
- Leave game button

**GameRoom.jsx**
- Main game container
- Header (round, pot, timer)
- Player list
- Card display
- Hold/Drop buttons
- Delegates to RevealScreen or DeckShowdown

**Card.jsx**
- Playing card visual
- Suit symbols (♠ ♥ ♦ ♣)
- Red/black coloring
- Large and small variants

**Timer.jsx**
- Circular countdown timer
- Color changes (green → yellow → red)
- Visual progress ring

**PlayerList.jsx**
- Compact player grid
- Balance display with color coding
- Decision checkmarks
- "You" indicator

**RevealScreen.jsx**
- Shows all players' decisions
- Displays held hands
- Lists dropped players
- Continue button (host)

**DeckShowdown.jsx**
- Player hand vs THE DECK
- Dramatic comparison display
- Hand type labels
- VS divider

**GameEnd.jsx**
- Winner announcement
- Final standings leaderboard
- Profit/loss display
- New game button

**Notification.jsx**
- Toast notifications
- Info, success, error, warning types
- Auto-dismiss after 3 seconds

## Technology Stack

### Backend
- **Node.js**: Runtime environment
- **Express**: Web framework
- **Socket.io**: Real-time WebSocket communication
- **UUID**: Session token generation
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Compression**: Response compression
- **express-rate-limit**: Rate limiting

### Frontend
- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS
- **Zustand**: Lightweight state management
- **Socket.io-client**: WebSocket client

### Development
- **Nodemon**: Backend auto-reload
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixes
- **Concurrently**: Run multiple commands

## Key Features Implemented

### ✅ Core Gameplay
- 2-8 player support
- 3-card hands
- NOTHING rounds (1-3): pairs only
- Normal rounds (4+): all poker hands
- 10-second decision timer
- Hold/Drop mechanics

### ✅ THE DECK Mechanic
- Single holder vs THE DECK
- Game-ending win condition
- Dramatic showdown UI
- Proper card dealing from remaining deck

### ✅ Pot System
- $0.50 ante per round
- Loser matching mechanics
- Pot accumulation
- Accurate calculations

### ✅ Real-Time Features
- Instant card dealing
- Synchronized timer
- Simultaneous reveals
- Live balance updates
- Player join/leave notifications

### ✅ Mobile Optimization
- Touch-friendly (44×44px buttons)
- iOS safe area support
- No accidental zoom
- Portrait & landscape
- PWA-ready

### ✅ Security
- Server-side validation
- Private card dealing
- Cryptographically secure shuffling
- Rate limiting
- Input sanitization
- CORS protection

### ✅ UX Features
- Casino-style design (felt green)
- Clear hand rankings
- Color-coded balances
- Toast notifications
- Reconnection support
- Responsive layouts

## Data Flow

```
User Action
    ↓
Component (React)
    ↓
Game Store (Zustand)
    ↓
Socket.io Client
    ↓
WebSocket Connection
    ↓
Socket.io Server (backend/server.js)
    ↓
Game Manager (backend/gameManager.js)
    ↓
Game Logic (backend/gameLogic.js)
    ↓
Broadcast to All Players
    ↓
Socket.io Client
    ↓
Game Store Updates
    ↓
React Re-renders
    ↓
UI Updates
```

## State Management

### Server State (gameManager.js)
```javascript
{
  roomCode: string,
  hostToken: string,
  state: 'lobby' | 'playing' | 'ended',
  players: Player[],
  buyInAmount: number,
  pot: number,
  round: number,
  deck: Card[],
  currentHands: Map<playerId, Card[]>,
  decisions: Map<playerId, 'hold' | 'drop'>,
  isNothingRound: boolean
}
```

### Client State (gameStore.js)
```javascript
{
  socket: Socket,
  connected: boolean,
  gameState: 'landing' | 'lobby' | 'playing' | 'ended',
  roomCode: string,
  playerId: string,
  players: Player[],
  pot: number,
  round: number,
  myCards: Card[],
  timerRemaining: number,
  myDecision: 'hold' | 'drop' | null,
  revealData: object,
  showdownData: object
}
```

## API Endpoints

### REST
- `POST /api/game/create` → Create new game
- `POST /api/game/join` → Join existing game
- `GET /api/game/:roomCode/status` → Game status
- `GET /api/health` → Health check

### WebSocket (Socket.io)
See README.md for complete event documentation.

## Deployment Targets

- **Development**: localhost:5173 (frontend), localhost:3001 (backend)
- **Production Options**:
  - Heroku (full stack)
  - Vercel (frontend) + Railway (backend)
  - DigitalOcean / AWS / GCP (custom)
  - Netlify (frontend) + any Node.js host (backend)

## Scripts Reference

### Root
- `npm run dev` - Run both frontend and backend
- `npm run dev:backend` - Backend only
- `npm run dev:frontend` - Frontend only
- `npm run install:all` - Install all dependencies

### Backend
- `npm start` - Production server
- `npm run dev` - Development with nodemon

### Frontend
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview production build

---

**Total Files**: 30+ files across backend, frontend, and documentation
**Total Lines**: ~3,500+ lines of code
**Technologies**: 15+ npm packages

Built with ❤️ for card game enthusiasts!

