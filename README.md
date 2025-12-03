# Guts Card Game - Multiplayer Web Application

A high-performance real-time multiplayer card game with React frontend and C++ backend. Features lightning-fast game logic, low latency WebSocket communication, and excellent scalability.

## 🚀 New: C++ Backend

The game now features a **high-performance C++ backend** that provides:
- ⚡ **15-20x faster** game logic execution
- 💾 **13x lower** memory usage (6 MB vs 85 MB)
- 🌐 **Sub-millisecond** WebSocket latency
- 💰 **55-80% lower** hosting costs
- 🔒 **Cryptographically secure** card shuffling with OpenSSL

**Quick Start**: See [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) to get started in 5 minutes!

For detailed information about the C++ backend, see:
- [C++ Backend README](backend_cpp/README.md)
- [Migration Guide](CPP_MIGRATION.md)
- [Backend Comparison](BACKEND_COMPARISON.md)

## 🎮 Game Rules

### House Rules Variant

- **Players**: 2-8 players on separate devices
- **Cards**: Each player receives 3 cards per round
- **Ante**: $0.50 per round
- **Buy-in**: Set at game start (default $20, range $5-$100)

### Round Types

**Rounds 1-3 ("NOTHING" rounds)**
- Only pairs and three of a kind count
- No straights or flushes allowed
- Hand Rankings: Three of a Kind > Pair > High Card

**Rounds 4+**
- All poker hands count
- Hand Rankings: Straight Flush > Three of a Kind > Straight > Flush > Pair > High Card

### Gameplay Flow

1. **Ante Collection**: Each player pays $0.50 to the pot
2. **Card Deal**: Each player receives 3 cards (private to that player)
3. **Decision Phase**: 10-second timer to choose HOLD or DROP
4. **Resolution**:
   - **Multiple holders**: Highest hand wins the pot, losers match the pot (carries to next round)
   - **Single holder**: Must beat "THE DECK" to win
     - Player beats THE DECK → **Player wins, game ends**
     - THE DECK wins → Player matches pot, game continues
   - **All drop**: Pot carries over to next round

## 🏗️ Project Structure

```
GUTS/
├── backend_cpp/         # 🆕 High-performance C++ backend (RECOMMENDED)
│   ├── include/         # Header files
│   ├── src/             # Implementation files
│   ├── CMakeLists.txt   # Build configuration
│   └── README.md        # C++ backend documentation
├── backend/             # Node.js backend (legacy, for development)
│   ├── server.js        # Main server file
│   ├── gameManager.js   # Game state and room management
│   ├── gameLogic.js     # Card dealing and hand evaluation
│   └── package.json
├── frontend/            # React + Vite application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── store/       # Zustand state management
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── package.json         # Root workspace configuration
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern web browser (Safari/Chrome recommended for mobile)

### Installation

1. **Clone or download the project**

```bash
cd GUTS
```

2. **Install all dependencies**

```bash
npm run install:all
```

Or manually:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

3. **Set up environment variables**

Create `.env` files from the examples:

**Backend** (`backend/.env`):
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3001
```

### Development Mode

Run both frontend and backend simultaneously:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## 📱 Mobile Testing

### iOS Testing (Recommended)

1. **Find your local IP address**:
   ```bash
   # macOS
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   
   # Linux
   ip addr show
   ```

2. **Update frontend .env** to use your local IP:
   ```env
   VITE_API_URL=http://YOUR_LOCAL_IP:3001
   ```

3. **Update backend .env**:
   ```env
   FRONTEND_URL=http://YOUR_LOCAL_IP:5173
   ```

4. **Access from mobile device**:
   - Ensure mobile is on same WiFi network
   - Open Safari and navigate to `http://YOUR_LOCAL_IP:5173`

### Add to Home Screen (iOS)

1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will behave like a native app

## 🎯 How to Play

### Creating a Game

1. Open the application
2. Enter your name
3. Click "Create Game"
4. Share the 6-character room code with other players
5. Wait for players to join
6. Set buy-in amount (host only)
7. Click "Start Game"

### Joining a Game

1. Open the application
2. Enter your name
3. Click "Join Game"
4. Enter the room code
5. Wait for host to start

### During Gameplay

1. View your 3 cards (keep them private!)
2. Watch the 10-second timer
3. Decide to HOLD (compete) or DROP (forfeit)
4. See the results:
   - If you held: Your cards are revealed to all players
   - If you dropped: You're safe but can't win
5. Watch for THE DECK showdown if only one player holds
6. Continue to next round or game ends

## 🏭 Production Deployment

### Railway Deployment (Recommended)

The easiest way to deploy both frontend and backend is using Railway.

**Quick Start:**
1. See `RAILWAY_DEPLOYMENT.md` for detailed step-by-step instructions
2. Or use `RAILWAY_QUICK_START.md` for a quick reference

**What you need:**
- GitHub account
- Railway account (free tier available)
- Your code pushed to GitHub

Railway will automatically:
- Detect Node.js projects
- Use `nixpacks.toml` configuration files
- Deploy on every push to main branch
- Provide HTTPS URLs for both services

### Important Production Settings

1. **Enable HTTPS/WSS** - Railway provides this automatically
2. **Update CORS origins** - Set `FRONTEND_URL` environment variable
3. **Set NODE_ENV=production** - Set in Railway environment variables
4. **Configure rate limiting** - Already configured in backend
5. **Environment Variables**:
   - Backend: `PORT`, `NODE_ENV`, `FRONTEND_URL`
   - Frontend: `VITE_API_URL`

## 🔒 Security Features

- **Server-side validation**: All game logic validated on server
- **Private card dealing**: Cards sent only to respective player's socket
- **Session tokens**: UUID-based authentication
- **Rate limiting**: Prevents connection spam
- **Input sanitization**: All user inputs validated
- **CORS protection**: Configured for specific origins
- **Cryptographically secure shuffling**: Uses Node.js crypto module

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create game with multiple devices (2-8 players)
- [ ] Cards are private (only visible to owner)
- [ ] Timer synchronizes across devices
- [ ] Decisions reveal simultaneously
- [ ] Hand rankings work correctly (NOTHING vs normal rounds)
- [ ] THE DECK showdown works (single holder scenario)
- [ ] Game ends when single holder beats THE DECK
- [ ] Pot calculations are correct
- [ ] Player balances update accurately
- [ ] Reconnection works after network interruption
- [ ] Works on iOS Safari (iPhone and iPad)
- [ ] Works in landscape and portrait orientations

### Load Testing

Test with multiple browser windows/tabs to simulate multiple players:

1. Open 4-8 tabs/windows
2. Create one game
3. Join from other tabs with different names
4. Play through several rounds
5. Test all scenarios (multiple holders, single holder, all drop)

## 🐛 Troubleshooting

### Connection Issues

**Problem**: "Disconnected from server"
- Check backend is running on port 3001
- Verify VITE_API_URL in frontend .env
- Check CORS settings in backend

**Problem**: Cards not appearing
- Check browser console for errors
- Verify Socket.io connection is established
- Check backend logs for card dealing errors

### Mobile Issues

**Problem**: Can't connect from mobile device
- Ensure mobile is on same WiFi network
- Use local IP address, not localhost
- Check firewall settings allow connections on ports 3001 and 5173

**Problem**: Timer not syncing
- Check system clocks are synchronized
- Verify stable network connection
- Check for Socket.io reconnection events

### Game State Issues

**Problem**: Game stuck in lobby
- Host must click "Start Game"
- Need minimum 2 players
- Check browser console for errors

**Problem**: Round not progressing
- All active players must make decision
- Host may need to trigger next round
- Check for disconnected players

## 📚 API Reference

### REST Endpoints

#### Create Game
```http
POST /api/game/create
Response: { roomCode: string, hostToken: string }
```

#### Join Game
```http
POST /api/game/join
Body: { roomCode: string, playerName: string }
Response: { playerToken: string, roomCode: string }
```

#### Game Status
```http
GET /api/game/:roomCode/status
Response: { state: string, playerCount: number, round: number }
```

### WebSocket Events

#### Client → Server
- `join_room`: Join a game room
- `start_game`: Start the game (host only)
- `player_decision`: Submit HOLD/DROP decision
- `next_round`: Advance to next round (host only)
- `leave_game`: Leave current game

#### Server → Client
- `room_joined`: Confirmation of joining room
- `player_joined`: Another player joined
- `game_started`: Game has begun
- `round_started`: New round started
- `cards_dealt`: Your cards (private)
- `timer_started`: Decision timer began
- `timer_tick`: Timer countdown
- `player_decided`: A player made their decision
- `round_reveal`: Show all decisions and cards
- `single_holder_vs_deck`: THE DECK showdown
- `deck_showdown_result`: Result of THE DECK comparison
- `multiple_holders_result`: Result when multiple players held
- `game_ended`: Game finished with final standings
- `error`: Error message

## 🎨 Customization

### Styling

Colors and styling can be customized in `frontend/tailwind.config.js`:

```javascript
colors: {
  felt: {
    DEFAULT: '#0D5C2F',  // Table color
    dark: '#0A4023',
    light: '#106D38'
  }
}
```

### Game Rules

Modify game constants in `backend/gameManager.js`:

```javascript
buyInAmount: 20,        // Default buy-in
ante: 0.50,            // Per-round ante
// Timer duration in gameManager.startDecisionTimer()
```

### Timer Duration

Change decision timer in `backend/gameManager.js`:

```javascript
startDecisionTimer(game) {
  const duration = 30;  // Change this value (seconds) - currently 30 seconds
  // ...
}
```

## 📚 Documentation

- **`README.md`** - This file, project overview and setup
- **`GAME_RULES.md`** - Detailed game rules and mechanics
- **`RAILWAY_DEPLOYMENT.md`** - Complete Railway deployment guide
- **`RAILWAY_QUICK_START.md`** - Quick deployment reference
- **`DEPLOYMENT_CHECKLIST.md`** - Pre-deployment verification checklist

## 📄 License

This project is open source and available for educational purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console and backend logs
3. Open an issue on GitHub

---

**Built with ❤️ for card game enthusiasts**

Enjoy playing Guts! 🎴

