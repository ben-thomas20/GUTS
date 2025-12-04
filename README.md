# GUTS Card Game

A real-time multiplayer card game built with a high-performance C++ backend and React frontend. Players compete in fast-paced poker-style rounds where they must decide whether to hold or drop their three-card hand.

## Overview

GUTS is a house-rules poker variant designed for 2-8 players. Each round, players receive three cards and must decide within 30 seconds whether to stay in (hold) or fold (drop). The tension builds as players with the weakest hands face penalties, while a single holder must beat "THE DECK" to win the entire pot.

## Tech Stack

**Backend (C++)**
- Crow (HTTP/WebSocket framework)
- OpenSSL (cryptographic card shuffling)
- nlohmann/json (JSON parsing)
- CMake (build system)

**Frontend (React)**
- React 18
- Vite (build tool)
- Zustand (state management)
- Tailwind CSS (styling)
- Native WebSocket API

**Deployment**
- Railway (hosting platform)
- Docker with BuildKit (containerization & build system)
- Multi-stage builds for optimized images

## Project Structure

```
GUTS/
├── backend_cpp/              # C++ backend server
│   ├── include/              # Header files
│   │   ├── Card.hpp          # Card types and hand evaluation
│   │   ├── Player.hpp        # Player data structures
│   │   ├── Game.hpp          # Game state management
│   │   ├── GameLogic.hpp     # Card game logic
│   │   └── GameManager.hpp   # Game session management
│   ├── src/                  # Implementation files
│   │   ├── server.cpp        # HTTP/WebSocket server
│   │   ├── GameLogic.cpp     # Game logic implementation
│   │   └── GameManager.cpp   # Game manager implementation
│   ├── CMakeLists.txt        # Build configuration
│   ├── Dockerfile            # Container deployment
│   └── nixpacks.toml         # Railway deployment config
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── store/            # Zustand state management
│   │   ├── App.jsx           # Main application
│   │   └── main.jsx          # Entry point
│   └── package.json
├── start.sh                  # Development startup script
├── GAME_RULES.md            # Detailed game rules
└── README.md
```

## Game Rules

### Setup
- **Players**: 2-8 players
- **Buy-in**: $5-$100 (configurable per player)
- **Ante**: $0.50 per round

### Round Types

**Rounds 1-3: "NOTHING" Rounds**
- Only pairs and three-of-a-kind count
- No straights or flushes
- Hand rankings: Three of a Kind > Pair > High Card

**Rounds 4+: Full Poker**
- All poker hands count
- Hand rankings: Straight Flush > Three of a Kind > Straight > Flush > Pair > High Card

### Gameplay

1. **Ante**: Each player pays $0.50 to the pot
2. **Deal**: Each player receives 3 cards (private)
3. **Decision**: 30-second timer to choose HOLD or DROP
4. **Resolution**:
   - **Everyone drops**: Pot carries over, each player adds $0.50
   - **Multiple holders**: Highest hand wins the pot, losers match the pot (carries to next round)
   - **Single holder vs THE DECK**:
     - Player wins → Takes pot, game ends
     - THE DECK wins → Player matches pot, game continues

### Special Rules

- Players in debt must buy back in before continuing
- Game continues until one player beats THE DECK in a solo showdown
- Debt tracking prevents players from leaving without settling

## Quick Start

**Build and run:**
```bash
./start.sh
```

**Manual build:**
```bash
# Backend
cd backend_cpp && mkdir build && cd build
cmake .. && make
./guts_server

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

**Access:** http://localhost:5173

## Deployment

Deploy to Railway in 5 minutes. See [RAILWAY.md](./RAILWAY.md) for complete instructions.

**Quick steps:**
1. Backend service → set `FRONTEND_URL`
2. Frontend service → **set `VITE_API_URL` before deploying**
3. Update backend CORS with frontend URL

Uses Docker multi-stage builds for optimized images.

## License

Open source - available for educational purposes.

---

Built for CSE101 • High-performance multiplayer gaming
