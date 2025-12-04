# Railway Deployment Checklist

## ✅ Pre-Deployment Verification

Use this checklist before deploying to Railway to ensure everything is configured correctly.

### Backend Configuration

- [x] **Dockerfile exists** (`backend_cpp/Dockerfile`)
  - Multi-stage build for optimal image size
  - BuildKit cache mounts for faster builds
  - Exposes port 3001
  - Ubuntu 22.04 base with minimal runtime dependencies
  - Builder stage: Full build tools
  - Runtime stage: Only necessary libraries (~50% smaller)

- [x] **.dockerignore configured** (`backend_cpp/.dockerignore`)
  - Excludes build artifacts
  - Reduces build context size

- [x] **Environment variable support**
  - `PORT`: Dynamic port assignment ✓
  - `FRONTEND_URL`: CORS configuration ✓
  - Both have fallback defaults ✓

- [x] **CORS configuration**
  - Headers set in `server.cpp` line 206-210
  - Currently set to `*` (wildcard) - works for development
  - ⚠️ Consider restricting to specific frontend URL in production

- [x] **WebSocket support**
  - WebSocket endpoint: `/ws`
  - Proper connection/disconnection handling
  - Room-based broadcasting implemented

- [x] **Health check endpoint**
  - Endpoint: `/api/health`
  - Returns JSON status and timestamp

### Frontend Configuration

- [x] **Dockerfile exists** (`frontend/Dockerfile`)
  - Multi-stage build for optimal image size
  - Node 20 Alpine base (minimal size)
  - BuildKit cache mounts for npm installs
  - Build command: `npm run build`
  - Runtime: Serves static files with `serve`

- [x] **.dockerignore configured** (`.dockerignore`)
  - Excludes node_modules and build artifacts
  - Reduces build context size

- [x] **Environment variable support**
  - `VITE_API_URL`: Backend URL configuration ✓
  - Automatic HTTP/HTTPS to WS/WSS conversion ✓

- [x] **Production build**
  - Vite build configured in `package.json`
  - Static file serving with `serve` package
  - Dist folder properly configured

- [x] **WebSocket handling**
  - Automatic protocol detection (ws:// vs wss://)
  - Reconnection logic implemented
  - Connection state management

### Repository Configuration

- [x] **Railway.json created**
  - Schema reference included
  - Nixpacks builder specified
  - Deployment configuration set

- [x] **.railwayignore created**
  - Build artifacts excluded
  - Node modules excluded
  - Logs excluded

- [x] **Documentation**
  - [x] RAILWAY_DEPLOYMENT.md created
  - [x] README.md updated with deployment section
  - [x] DEPLOYMENT_CHECKLIST.md created (this file)

## 📋 Railway Deployment Steps

### 1. Backend Service Setup

```bash
Service Name: guts-backend
Root Directory: /backend_cpp
Builder: Docker (auto-detected via Dockerfile)
```

**Environment Variables:**
```
PORT=${{PORT}}                    # Auto-provided by Railway
FRONTEND_URL=https://your-frontend-url.railway.app
```

**Expected Build Time:** 2-3 minutes (C++ compilation)

### 2. Frontend Service Setup

```bash
Service Name: guts-frontend
Root Directory: /frontend
Builder: Docker (auto-detected via Dockerfile)
```

**Environment Variables:**
```
VITE_API_URL=https://your-backend-url.railway.app
```

**Expected Build Time:** < 1 minute

### 3. Post-Deployment Verification

- [ ] Backend service is running
  - Check logs for "Starting C++ GUTS server"
  - Test health endpoint: `curl https://your-backend.railway.app/api/health`

- [ ] Frontend service is running
  - Visit frontend URL in browser
  - Check browser console for WebSocket connection
  - Verify no CORS errors

- [ ] WebSocket connection works
  - Create a test game room
  - Check backend logs for WebSocket connection
  - Verify real-time updates work

- [ ] Game functionality works
  - Create room as host
  - Join room with another browser/device
  - Test full game flow:
    - [ ] Room creation
    - [ ] Player joining
    - [ ] Game start
    - [ ] Card dealing
    - [ ] Decision making (Hold/Drop)
    - [ ] Round resolution
    - [ ] Pot calculation
    - [ ] Game end

## 🔧 Common Issues & Solutions

### Issue: Backend build fails

**Symptoms:** Build logs show CMake or compilation errors

**Solutions:**
1. Check that all dependencies are in `nixpacks.toml`
2. Verify CMakeLists.txt is valid
3. Check Railway build logs for specific error messages
4. Try building locally with Docker to reproduce issue

### Issue: Frontend can't connect to backend

**Symptoms:** WebSocket connection fails, CORS errors

**Solutions:**
1. Verify `VITE_API_URL` is set correctly (with https://)
2. Check backend CORS configuration
3. Ensure backend `FRONTEND_URL` matches frontend URL
4. Check browser console for specific error messages
5. Verify backend service is actually running

### Issue: WebSocket connection fails

**Symptoms:** "WebSocket disconnected" in logs, no real-time updates

**Solutions:**
1. Check that backend is listening on `0.0.0.0` (not `localhost`)
2. Verify Railway has assigned a public URL to backend
3. Check that WS/WSS protocol is correct (should auto-convert)
4. Look at backend logs for WebSocket connection attempts
5. Test with WebSocket client tool (like `wscat`)

### Issue: Build takes too long / times out

**Symptoms:** Railway build exceeds time limit

**Solutions:**
1. Backend builds can take 2-3 minutes (normal for C++)
2. Check if Railway has cached previous builds
3. Consider optimizing CMakeLists.txt (reduce dependencies)
4. Use Railway Pro plan for longer build times if needed

### Issue: Game state lost on refresh

**Symptoms:** Players disconnected after page reload

**Solutions:**
1. This is expected behavior - localStorage handles reconnection
2. Check browser console for auto-rejoin logs
3. Verify backend handles reconnection properly
4. Consider adding Redis for persistent game state (advanced)

## 🚀 Production Optimizations (Optional)

### Security Enhancements

1. **Restrict CORS to specific origin**
   - Update `backend_cpp/src/server.cpp` line 207
   - Change from `*` to specific frontend URL

2. **Add rate limiting**
   - Prevent abuse of API endpoints
   - Consider using Railway's built-in rate limiting

3. **Add authentication**
   - Current implementation uses player tokens
   - Consider adding JWT for more secure auth

### Performance Improvements

1. **Add Redis for game state**
   - Enable multi-instance deployments
   - Persistent game state across server restarts
   - Add Redis service in Railway dashboard

2. **Enable horizontal scaling**
   - Increase number of replicas in Railway
   - Requires shared state (Redis/PostgreSQL)
   - Configure load balancing

3. **Add CDN for frontend**
   - Use Railway's CDN features
   - Improves loading times globally
   - Reduces bandwidth costs

### Monitoring

1. **Set up error tracking**
   - Consider Sentry or similar service
   - Track backend crashes
   - Monitor frontend errors

2. **Add analytics**
   - Track player behavior
   - Monitor game completion rates
   - Identify popular features

3. **Set up alerts**
   - Railway can alert on service failures
   - Configure email/Slack notifications
   - Monitor resource usage

## 📊 Cost Estimation

### Railway Pricing

**Hobby Plan (Free Tier):**
- $5/month in credits
- Suitable for: < 100 concurrent players
- Estimated cost: $4-7/month

**Pro Plan ($20/month):**
- $10/month included credits
- Higher resource limits
- Better for: 100-500 concurrent players
- Estimated cost: $15-25/month

### Resource Usage Estimates

**Backend (C++ Server):**
- Memory: 100-200MB (idle), up to 500MB (active)
- CPU: Low (< 5% idle), spikes during game resolution
- Network: ~50-100KB per active connection

**Frontend (Static Site):**
- Memory: Minimal (< 50MB)
- CPU: Very low (just serving static files)
- Network: ~500KB initial load, then WebSocket data

## ✅ Final Pre-Launch Checklist

Before announcing your game to players:

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Environment variables correctly set
- [ ] WebSocket connections working
- [ ] Tested with multiple players
- [ ] Tested game from start to finish
- [ ] Verified pot calculations are correct
- [ ] Tested buy-back functionality
- [ ] Verified THE DECK showdown works
- [ ] Tested on mobile devices
- [ ] Checked browser compatibility (Chrome, Firefox, Safari)
- [ ] Set up monitoring/logging
- [ ] Documented deployment URLs
- [ ] Created backup of configuration
- [ ] Tested error scenarios (disconnection, timeout, etc.)

## 📞 Support Resources

- **Railway Documentation:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Railway Status:** https://status.railway.app
- **Drogon Documentation:** https://drogon.docsforge.com
- **Vite Documentation:** https://vitejs.dev

## 🎯 Next Steps After Deployment

1. **Test thoroughly** with real players
2. **Monitor logs** for errors and issues
3. **Gather feedback** on gameplay and UX
4. **Optimize performance** based on usage patterns
5. **Add features** as needed (chat, tournaments, etc.)
6. **Scale resources** if player count grows
7. **Consider monetization** options if desired

---

**Last Updated:** December 2024
**Railway Status:** ✅ Production Ready

