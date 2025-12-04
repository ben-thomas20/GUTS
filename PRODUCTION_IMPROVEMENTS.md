# Production Improvements for Railway Deployment

This document outlines optional improvements you can make to enhance the production deployment of GUTS Card Game on Railway.

## 🔒 Security Improvements

### 1. Restrict CORS to Specific Origin (Recommended)

Currently, the backend accepts requests from any origin (`Access-Control-Allow-Origin: *`). For production, restrict this to your frontend domain.

**Current code** (`backend_cpp/src/server.cpp` line 207):
```cpp
resp->addHeader("Access-Control-Allow-Origin", "*");
```

**Production code** (restricts to frontend URL):
```cpp
// Get frontend URL from environment
std::string frontendUrl = std::getenv("FRONTEND_URL") ? 
    std::getenv("FRONTEND_URL") : "http://localhost:5173";

// In registerPostHandlingAdvice:
resp->addHeader("Access-Control-Allow-Origin", frontendUrl);
resp->addHeader("Access-Control-Allow-Credentials", "true");
```

### 2. Add Rate Limiting

Protect your API from abuse by implementing rate limiting.

**Option A: Railway Built-in Rate Limiting**
- Configure in Railway dashboard under service settings
- Set limits per IP address
- Recommended: 100 requests per minute per IP

**Option B: Application-level Rate Limiting**
- Add to `server.cpp` using Drogon's built-in filters
- More granular control over specific endpoints

### 3. Environment Variable Validation

Add validation to ensure required environment variables are set.

**Add to `server.cpp` main function**:
```cpp
void validateEnvironment() {
    if (!std::getenv("FRONTEND_URL")) {
        std::cerr << "WARNING: FRONTEND_URL not set. CORS may not work in production." << std::endl;
    }
    
    int port = std::getenv("PORT") ? std::atoi(std::getenv("PORT")) : 3001;
    if (port < 1024 || port > 65535) {
        std::cerr << "ERROR: Invalid PORT: " << port << std::endl;
        exit(1);
    }
}
```

## 📊 Monitoring Improvements

### 1. Enhanced Health Check Endpoint

Add more detailed health information to the `/api/health` endpoint.

**Enhanced health check**:
```cpp
app().registerHandler("/api/health",
    [](const HttpRequestPtr&, std::function<void(const HttpResponsePtr&)>&& callback) {
        Json::Value response;
        response["status"] = "ok";
        response["timestamp"] = (Json::Int64)std::chrono::system_clock::now().time_since_epoch().count();
        response["version"] = "1.0.0";
        response["uptime"] = getUptime(); // Implement uptime tracking
        response["active_games"] = gameManager->getActiveGameCount();
        response["active_connections"] = wsManager->getConnectionCount();
        callback(HttpResponse::newHttpJsonResponse(response));
    }, {Get, Options});
```

### 2. Add Metrics Endpoint

Track important metrics for monitoring.

**Add to `GameManager.hpp`**:
```cpp
struct Metrics {
    int totalGamesCreated;
    int totalGamesCompleted;
    int totalPlayersJoined;
    int currentActivePlayers;
    std::chrono::system_clock::time_point startTime;
};

Metrics getMetrics() const;
```

**Create metrics endpoint**:
```cpp
app().registerHandler("/api/metrics",
    [](const HttpRequestPtr&, std::function<void(const HttpResponsePtr&)>&& callback) {
        auto metrics = gameManager->getMetrics();
        Json::Value response;
        response["total_games_created"] = metrics.totalGamesCreated;
        response["total_games_completed"] = metrics.totalGamesCompleted;
        response["active_games"] = gameManager->getActiveGameCount();
        response["active_players"] = metrics.currentActivePlayers;
        callback(HttpResponse::newHttpJsonResponse(response));
    }, {Get, Options});
```

### 3. Add Error Logging Service

Integrate with error tracking service like Sentry.

**Installation**:
```cmake
# Add to CMakeLists.txt
find_package(sentry CONFIG)
if(sentry_FOUND)
    target_link_libraries(guts_server PRIVATE sentry::sentry)
    target_compile_definitions(guts_server PRIVATE USE_SENTRY)
endif()
```

## 🚀 Performance Improvements

### 1. Connection Pooling

Currently, each game maintains its own state. For scaling, consider connection pooling.

**Add Redis for Shared State**:

1. Add Redis service in Railway dashboard
2. Update `nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ['cmake', 'gcc', 'openssl', 'pkg-config', 'hiredis']
```

3. Add Redis client to `CMakeLists.txt`:
```cmake
find_package(hiredis REQUIRED)
target_link_libraries(guts_server PRIVATE hiredis::hiredis)
```

4. Implement Redis-backed game state storage

### 2. WebSocket Compression

Enable WebSocket compression for reduced bandwidth.

**Add to server configuration**:
```cpp
app()
    // ... existing config ...
    .enableCompression(true)
    .setGzipStatic(true);
```

### 3. Static Asset Caching

For frontend, add proper caching headers.

**Update `frontend/vite.config.js`**:
```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'game-logic': ['zustand']
        }
      }
    }
  }
})
```

## 🔄 Reliability Improvements

### 1. Graceful Shutdown

Handle shutdown signals properly to avoid data loss.

**Add to `server.cpp`**:
```cpp
#include <signal.h>

std::atomic<bool> shutdownRequested{false};

void signalHandler(int signum) {
    std::cout << "Shutdown signal received (" << signum << ")" << std::endl;
    shutdownRequested = true;
    app().quit();
}

int main() {
    // Register signal handlers
    signal(SIGINT, signalHandler);
    signal(SIGTERM, signalHandler);
    
    // ... existing code ...
    
    // Cleanup before exit
    std::cout << "Cleaning up..." << std::endl;
    gameManager->saveAllGameStates(); // Implement if needed
    std::cout << "Server stopped cleanly" << std::endl;
}
```

### 2. Auto-Reconnection for Frontend

Already implemented, but can be enhanced.

**Add reconnection status UI** (`frontend/src/components/ConnectionStatus.jsx`):
```jsx
export const ConnectionStatus = () => {
  const connected = useGameStore(state => state.connected)
  
  if (connected) return null
  
  return (
    <div className="fixed top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
      <div className="flex items-center gap-2">
        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
        Reconnecting...
      </div>
    </div>
  )
}
```

### 3. Database Persistence

For long-term game history and player stats.

**Add PostgreSQL service in Railway**:
1. Click "New" → "Database" → "PostgreSQL"
2. Railway provides connection URL automatically
3. Add to backend environment: `DATABASE_URL=${{Postgres.DATABASE_URL}}`

## 💰 Cost Optimization

### 1. Optimize Build Times

Faster builds = lower costs on Railway.

**Cache build artifacts** in `backend_cpp/CMakeLists.txt`:
```cmake
# Enable ccache if available
find_program(CCACHE_PROGRAM ccache)
if(CCACHE_PROGRAM)
    set(CMAKE_CXX_COMPILER_LAUNCHER "${CCACHE_PROGRAM}")
    set(CMAKE_C_COMPILER_LAUNCHER "${CCACHE_PROGRAM}")
endif()
```

### 2. Reduce Log Verbosity

Less logging = less storage costs.

**Update log level in production**:
```cpp
.setLogLevel(trantor::Logger::kError) // Only errors in production
```

### 3. Implement Request Batching

Reduce WebSocket message frequency by batching updates.

**Frontend batching**:
```javascript
// Instead of sending each decision immediately, batch them
const batchedUpdates = []
const flushInterval = 100 // ms

setInterval(() => {
  if (batchedUpdates.length > 0) {
    socket.emit('batch_update', { updates: batchedUpdates })
    batchedUpdates.length = 0
  }
}, flushInterval)
```

## 🎯 Feature Enhancements

### 1. Add Chat Functionality

Players can communicate during games.

**Backend** (add to WebSocket handler):
```cpp
socket.on('chat_message', (data) => {
    const message = {
        playerId: data.playerId,
        playerName: data.playerName,
        message: data.message,
        timestamp: Date.now()
    }
    broadcastToRoom(data.roomCode, 'chat_message', message)
})
```

**Frontend** (add ChatBox component):
```jsx
// See implementation in separate component file
```

### 2. Add Player Statistics

Track wins, losses, total hands played, etc.

**Database schema**:
```sql
CREATE TABLE player_stats (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(255) UNIQUE,
    games_played INT DEFAULT 0,
    games_won INT DEFAULT 0,
    total_winnings DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Add Spectator Mode

Allow players to watch games without participating.

**Backend changes**:
- Add `spectators` array to game state
- Send game updates to spectators (read-only)
- Don't count spectators in player decisions

### 4. Add Tournament Mode

Multi-table tournaments with bracket system.

**Implementation outline**:
1. Create `Tournament` class to manage multiple games
2. Add tournament lobby for registration
3. Implement bracket progression logic
4. Add tournament results and rankings

## 🧪 Testing Improvements

### 1. Add Integration Tests

Test full game flow automatically.

**Create `backend_cpp/tests/integration_test.cpp`**:
```cpp
#include <gtest/gtest.h>
#include "GameManager.hpp"

TEST(IntegrationTest, FullGameFlow) {
    // Create game
    // Add players
    // Play full round
    // Verify pot calculations
    // Verify winner selection
}
```

### 2. Load Testing

Test how many concurrent players your deployment can handle.

**Using Artillery** (`load-test.yml`):
```yaml
config:
  target: "https://your-backend.railway.app"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Ramp up"
scenarios:
  - name: "Create and join game"
    flow:
      - post:
          url: "/api/game/create"
          json:
            playerName: "LoadTestPlayer"
            buyInAmount: 20
      - ws:
          url: "/ws"
          send:
            event: "join_room"
```

### 3. End-to-End Testing

Use Playwright or Cypress for frontend testing.

**Example Playwright test**:
```javascript
test('complete game flow', async ({ page }) => {
  await page.goto('https://your-frontend.railway.app')
  await page.fill('[data-testid="player-name"]', 'TestPlayer')
  await page.click('[data-testid="create-game"]')
  // ... rest of test
})
```

## 📱 Mobile Optimization

### 1. PWA Support

Make the game installable on mobile devices.

**Add to `frontend/index.html`**:
```html
<link rel="manifest" href="/manifest.json">
```

**Create `frontend/public/manifest.json`**:
```json
{
  "name": "GUTS Card Game",
  "short_name": "GUTS",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1a1a1a",
  "background_color": "#1a1a1a"
}
```

### 2. Touch Gesture Support

Improve mobile user experience.

**Add to Card component**:
```jsx
const [touchStart, setTouchStart] = useState(null)

const handleTouchStart = (e) => {
  setTouchStart(e.touches[0].clientY)
}

const handleTouchEnd = (e) => {
  if (!touchStart) return
  const touchEnd = e.changedTouches[0].clientY
  const diff = touchStart - touchEnd
  
  if (Math.abs(diff) > 50) {
    // Swipe up = Hold, Swipe down = Drop
    diff > 0 ? makeDecision('hold') : makeDecision('drop')
  }
}
```

## 🌐 Internationalization

### 1. Add Multi-language Support

Support players from different countries.

**Install i18next**:
```bash
cd frontend && npm install i18next react-i18next
```

**Setup translations**:
```javascript
// frontend/src/i18n.js
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: require('./locales/en.json') },
    es: { translation: require('./locales/es.json') },
    fr: { translation: require('./locales/fr.json') }
  },
  lng: 'en',
  fallbackLng: 'en'
})
```

## 🔐 Advanced Security

### 1. Add JWT Authentication

More secure than simple player tokens.

**Backend**: Generate JWT on player join
**Frontend**: Include JWT in WebSocket messages
**Validation**: Verify JWT on each request

### 2. Add Input Validation

Prevent injection attacks and invalid data.

**Add validation library to backend**:
```cpp
bool validatePlayerName(const std::string& name) {
    // Max length 20 chars
    if (name.length() > 20) return false;
    // Only alphanumeric and spaces
    return std::all_of(name.begin(), name.end(), 
        [](char c) { return std::isalnum(c) || c == ' '; });
}
```

### 3. Add HTTPS Enforcement

Ensure all traffic is encrypted.

**Railway handles this automatically**, but you can add:
```cpp
// Redirect HTTP to HTTPS
if (req->header("X-Forwarded-Proto") != "https") {
    auto resp = HttpResponse::newRedirectionResponse(
        "https://" + req->header("Host") + req->path());
    callback(resp);
    return;
}
```

---

## Implementation Priority

**High Priority (Recommended for production):**
1. ✅ Restrict CORS to specific origin
2. ✅ Enhanced health check endpoint
3. ✅ Graceful shutdown handling
4. ✅ Environment variable validation

**Medium Priority (Nice to have):**
1. Rate limiting
2. Error logging service (Sentry)
3. Metrics endpoint
4. Connection status UI

**Low Priority (Future enhancements):**
1. Chat functionality
2. Player statistics
3. Tournament mode
4. PWA support
5. Internationalization

---

**Note**: Implement improvements incrementally and test thoroughly after each change. Don't try to implement everything at once.

