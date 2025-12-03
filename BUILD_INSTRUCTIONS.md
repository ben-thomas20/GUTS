# Build and Run Instructions

This guide will help you build and run the C++ backend and frontend for the GUTS Card Game.

## Quick Start

### 1. Install Prerequisites

#### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install cmake openssl
```

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y build-essential cmake git libssl-dev pkg-config
```

#### Windows (WSL or MinGW)
```bash
# Using WSL (recommended)
sudo apt-get update
sudo apt-get install -y build-essential cmake git libssl-dev pkg-config
```

### 2. Build C++ Backend

```bash
# Navigate to backend directory
cd backend_cpp

# Create build directory
mkdir -p build
cd build

# Configure with CMake
cmake ..

# Build (use all available cores)
make -j$(nproc)

# The executable will be: ./guts_server
```

### 3. Run C++ Backend

```bash
# From backend_cpp/build directory
./guts_server

# Or with custom port and frontend URL
PORT=3001 FRONTEND_URL=http://localhost:5173 ./guts_server
```

You should see:
```
Starting C++ GUTS server on port 3001
Frontend URL: http://localhost:5173
```

### 4. Install Frontend Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### 5. Run Frontend

```bash
# From frontend directory
npm run dev
```

You should see:
```
  VITE v5.1.0  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 6. Access the Game

Open your browser and navigate to: http://localhost:5173

## Development Workflow

### Running Both Backend and Frontend

**Terminal 1 - C++ Backend**:
```bash
cd backend_cpp/build
./guts_server
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

### Making Changes

#### C++ Backend Changes

After modifying C++ code:
```bash
cd backend_cpp/build
make -j$(nproc)
# Kill and restart the server
./guts_server
```

#### Frontend Changes

Vite will automatically reload when you save changes - no restart needed!

## Troubleshooting

### C++ Backend

#### OpenSSL Not Found (macOS)

If CMake can't find OpenSSL on macOS:
```bash
cd backend_cpp/build
cmake -DOPENSSL_ROOT_DIR=/usr/local/opt/openssl ..
make -j$(nproc)
```

Or with Homebrew's OpenSSL:
```bash
export OPENSSL_ROOT_DIR=$(brew --prefix openssl)
cmake ..
make -j$(nproc)
```

#### Compilation Errors

**Missing C++17 support**:
```bash
# Ensure you have a modern compiler
g++ --version  # Should be 7.0 or higher
clang++ --version  # Should be 5.0 or higher
```

**Missing dependencies**:
CMake will automatically download Crow and nlohmann/json on first build. Ensure you have internet connection.

#### Port Already in Use

```bash
# Find what's using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3002 ./guts_server
```

### Frontend

#### Connection Refused

1. Ensure C++ backend is running
2. Check backend URL in `frontend/.env`:
   ```
   VITE_API_URL=http://localhost:3001
   ```

3. Restart frontend:
   ```bash
   npm run dev
   ```

#### WebSocket Connection Failed

Check browser console. You should see:
```
WebSocket connected
```

If you see errors:
1. Verify backend is running
2. Check firewall settings
3. Ensure WebSocket endpoint is accessible: `ws://localhost:3001/ws`

## Production Build

### Backend

```bash
cd backend_cpp
mkdir -p build
cd build

# Build with optimizations
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)

# Run
PORT=3001 FRONTEND_URL=https://yourdomain.com ./guts_server
```

### Frontend

```bash
cd frontend
npm run build

# Serve the built files
npx serve -s dist -p 5173
```

## Docker Deployment

### Build and Run with Docker

```bash
# Build backend image
cd backend_cpp
docker build -t guts-backend .

# Run backend container
docker run -d -p 3001:3001 \
  -e PORT=3001 \
  -e FRONTEND_URL=https://yourdomain.com \
  --name guts-backend \
  guts-backend

# Build frontend image
cd ../frontend
docker build -t guts-frontend .

# Run frontend container
docker run -d -p 5173:5173 \
  -e VITE_API_URL=http://localhost:3001 \
  --name guts-frontend \
  guts-frontend
```

### Using Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend_cpp
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - FRONTEND_URL=http://localhost:5173
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3001
    depends_on:
      - backend
    restart: unless-stopped
```

Then run:
```bash
docker-compose up -d
```

## Performance Tuning

### C++ Backend

**Enable all optimizations**:
```bash
cd backend_cpp/build
cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_FLAGS="-O3 -march=native" ..
make -j$(nproc)
```

**Increase thread count** (for many concurrent games):
The server uses multithreading automatically. Ensure your system has enough cores.

### Frontend

**Optimize build**:
```bash
cd frontend
npm run build
```

This creates optimized, minified production files in `dist/`.

## Testing

### Manual Testing

1. Start backend and frontend
2. Open browser to http://localhost:5173
3. Create a game
4. Open incognito window, join the same game
5. Test game flow: buy-in, start game, make decisions, etc.

### Load Testing

Use `wrk` or `artillery` to test WebSocket performance:

```bash
# Install artillery
npm install -g artillery

# Create test-ws.yml
cat > test-ws.yml << EOF
config:
  target: "ws://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - engine: ws
    flow:
      - connect:
          target: "/ws"
      - think: 10
EOF

# Run load test
artillery run test-ws.yml
```

## Next Steps

1. **Read the game rules**: `GAME_RULES.md`
2. **Understand the architecture**: `CPP_MIGRATION.md`
3. **Deploy to production**: `DEPLOYMENT_CHECKLIST.md`

## Getting Help

- **Build issues**: Check `backend_cpp/README.md`
- **Game logic questions**: See `GAME_RULES.md`
- **Deployment help**: Read `CPP_MIGRATION.md`
- **Report bugs**: Open an issue on GitHub

