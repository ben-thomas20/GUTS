# 🚀 Quick Start Guide - Guts Card Game

Get up and running in 5 minutes!

## 📋 Prerequisites

- Node.js 18+ installed ([Download here](https://nodejs.org/))
- Modern web browser (Safari/Chrome recommended)

## ⚡ Fast Setup

### Option 1: Automated Setup (Recommended)

**macOS/Linux:**
```bash
cd GUTS
./setup.sh
```

**Windows:**
```cmd
cd GUTS
setup.bat
```

### Option 2: Manual Setup

```bash
# Install all dependencies
npm run install:all

# Create environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## 🎮 Start Playing

### Single Command
```bash
npm run dev
```

This starts both frontend and backend simultaneously.

### Access the Game
Open your browser to: **http://localhost:5173**

## 📱 Quick Mobile Setup

1. **Find your computer's IP address:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. **Update `frontend/.env`:**
   ```env
   VITE_API_URL=http://YOUR_IP:3001
   ```

3. **Update `backend/.env`:**
   ```env
   FRONTEND_URL=http://YOUR_IP:5173
   ```

4. **Restart the app:**
   ```bash
   npm run dev
   ```

5. **Access from phone/tablet:**
   - Connect to same WiFi
   - Open Safari/Chrome
   - Go to: `http://YOUR_IP:5173`

## 🎯 First Game (Test with Multiple Tabs)

1. **Open the app** in multiple browser tabs (simulate multiple players)

2. **Tab 1 (Host):**
   - Enter name: "Alice"
   - Click "Create Game"
   - Copy the room code (e.g., "ABC123")

3. **Tab 2 (Player 2):**
   - Enter name: "Bob"
   - Click "Join Game"
   - Enter room code
   - Click "Join Game"

4. **Tab 3, 4, etc.** (Optional - add more players)

5. **Back to Tab 1 (Host):**
   - Set buy-in amount (default $20)
   - Click "Start Game"

6. **Play the game!**
   - Each player sees their 3 cards
   - Choose HOLD or DROP within 10 seconds
   - See the results
   - Continue until someone beats THE DECK!

## 🎴 Basic Rules Recap

- **Rounds 1-3 ("NOTHING")**: Only pairs count
- **Rounds 4+**: All poker hands (straights, flushes, etc.)
- **Multiple holders**: Best hand wins, losers match pot
- **Single holder**: Must beat THE DECK to win game
- **All drop**: Pot carries over

## 🛠️ Troubleshooting

### "Cannot connect to server"
```bash
# Make sure backend is running
cd backend
npm run dev
```

### "Port already in use"
```bash
# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill
```

### Cards not appearing
- Check browser console (F12)
- Verify Socket.io connection established
- Check backend terminal for errors

### Mobile can't connect
- Ensure same WiFi network
- Use IP address, not "localhost"
- Check firewall allows connections on ports 3001 & 5173

## 📂 Project Structure Overview

```
GUTS/
├── backend/           # Node.js server
│   ├── server.js     # Express + Socket.io
│   ├── gameManager.js # Game state
│   └── gameLogic.js  # Hand evaluation
├── frontend/         # React app
│   └── src/
│       ├── components/ # UI components
│       └── store/     # State management
└── README.md         # Full documentation
```

## 🔧 Useful Commands

```bash
# Run everything
npm run dev

# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend

# Build for production
cd frontend && npm run build

# Clean install (if issues)
rm -rf node_modules backend/node_modules frontend/node_modules
npm run install:all
```

## 📖 Next Steps

- Read [GAME_RULES.md](GAME_RULES.md) for detailed game rules
- See [README.md](README.md) for full documentation
- Check API reference in README for customization

## 🎉 You're Ready!

The game is now running. Invite friends to join and have fun!

**Need help?** Check the full README.md or open an issue.

---

**Pro Tip**: For the best mobile experience on iOS, add the web app to your home screen from Safari's share menu!

