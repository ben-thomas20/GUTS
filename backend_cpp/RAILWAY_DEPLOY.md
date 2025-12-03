# Railway Deployment Guide for C++ Backend

## Quick Deploy Steps

### 1. Push to GitHub

Make sure all changes are committed and pushed:
```bash
git add .
git commit -m "Fix Railway deployment - bind to 0.0.0.0"
git push origin main
```

### 2. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `ben-thomas20/GUTS`
5. Railway will detect the project

### 3. Configure Backend Service

**Settings:**
- **Name**: `guts-backend-cpp` (or any name you prefer)
- **Root Directory**: `backend_cpp`
- **Build Command**: (leave empty - nixpacks handles it)
- **Start Command**: (leave empty - nixpacks handles it)

**Environment Variables:**
```
FRONTEND_URL=https://your-frontend-service.railway.app
```
(You'll update this after deploying frontend)

### 4. Configure Frontend Service

Create a second service for the frontend:

**Settings:**
- **Name**: `guts-frontend`
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Start Command**: `npx serve -s dist -p $PORT`

**Environment Variables:**
```
VITE_API_URL=https://your-backend-service.railway.app
```

### 5. Update Cross-References

After both services are deployed:

1. Copy the backend URL from Railway
2. Update frontend's `VITE_API_URL` to that URL
3. Copy the frontend URL from Railway
4. Update backend's `FRONTEND_URL` to that URL
5. Both services will redeploy automatically

## Troubleshooting

### Build Fails

**Problem**: "OpenSSL not found"
**Solution**: Already fixed - nixpacks.toml includes OpenSSL

**Problem**: "cmake version too old"
**Solution**: nixPkgs in nixpacks.toml uses latest cmake

**Problem**: "Build timeout"
**Solution**: First build takes 2-3 minutes (normal for C++)

### Runtime Issues

**Problem**: "Cannot create game" or "Connection refused"
**Solution**: Check these:

1. **Backend is running**: Check Railway logs
   ```
   Starting C++ GUTS server on 0.0.0.0:XXXX
   ```

2. **Environment variables are set**:
   - Backend needs `FRONTEND_URL`
   - Frontend needs `VITE_API_URL`

3. **URLs are correct**: Use Railway-provided HTTPS URLs
   ```
   https://guts-backend-cpp-production-XXXX.up.railway.app
   ```

4. **WebSocket endpoint**: Frontend should connect to
   ```
   wss://your-backend.railway.app/ws
   ```

**Problem**: "WebSocket connection failed"
**Solution**: 
- Verify backend URL in frontend
- Check browser console for exact error
- Ensure backend is using `wss://` not `ws://`

**Problem**: "CORS error"
**Solution**:
- Check `FRONTEND_URL` is set correctly in backend
- Should be the full URL with https://

### Check Logs

View Railway logs to debug:
```
# Backend logs will show:
Starting C++ GUTS server on 0.0.0.0:XXXX
Frontend URL: https://...
WebSocket connected: ...
Client connected: ...
```

## Performance on Railway

Expected metrics for C++ backend:
- **Memory**: 10-20 MB under load
- **CPU**: <5% with 50 players
- **Cold start**: <500ms
- **Build time**: 2-3 minutes (first time), <1 minute (cached)

## Railway Settings Checklist

### Backend Service (backend_cpp)
- [ ] Root Directory: `backend_cpp`
- [ ] nixpacks.toml detected
- [ ] Environment variable: `FRONTEND_URL` set
- [ ] Build succeeds (check logs)
- [ ] Service is running
- [ ] Health check works: `https://your-backend/api/health`

### Frontend Service (frontend)
- [ ] Root Directory: `frontend`  
- [ ] Environment variable: `VITE_API_URL` set to backend URL
- [ ] Build command: `npm run build`
- [ ] Start command: `npx serve -s dist -p $PORT`
- [ ] Service is running
- [ ] Can access in browser

## Testing Deployment

1. **Backend Health Check**:
   ```bash
   curl https://your-backend.railway.app/api/health
   ```
   Should return: `{"status":"ok","timestamp":...}`

2. **Create Game Test**:
   ```bash
   curl -X POST https://your-backend.railway.app/api/game/create
   ```
   Should return: `{"roomCode":"XXXXXX","hostToken":"..."}`

3. **Frontend Test**:
   - Open `https://your-frontend.railway.app`
   - Click "Create Game"
   - Should show room code

4. **Full Game Test**:
   - Create game on one device
   - Join game on another device (or incognito)
   - Play a full round

## Cost Estimates

Railway pricing (as of 2024):
- **Starter Plan**: $5/month
- **C++ Backend**: ~$0.50-2/month (very efficient)
- **Frontend**: ~$0.50-1/month
- **Total**: ~$1-3/month for both services

C++ backend uses ~90% less resources than Node.js!

## Common Railway Commands

Using Railway CLI:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# View logs
railway logs

# Set environment variable
railway variables set FRONTEND_URL=https://...

# Redeploy
railway up
```

## Architecture on Railway

```
┌─────────────────────────────────────────────────┐
│               Railway Platform                   │
│                                                  │
│  ┌──────────────────┐    ┌──────────────────┐  │
│  │  Backend Service │    │ Frontend Service  │  │
│  │   (C++ server)   │◄──►│  (React + Vite)  │  │
│  │                  │    │                   │  │
│  │  Port: Auto      │    │  Port: Auto       │  │
│  │  Memory: ~15MB   │    │  Memory: ~50MB    │  │
│  └──────────────────┘    └──────────────────┘  │
│          │                        │             │
│          └────────────────────────┘             │
│                HTTPS + WSS                       │
└─────────────────────────────────────────────────┘
                      │
                      ▼
              Players (Browser)
```

## Next Steps After Deployment

1. **Test thoroughly**: Run through all game scenarios
2. **Monitor logs**: Check for any errors
3. **Set up alerts**: Railway can notify on crashes
4. **Custom domain** (optional): Add your own domain
5. **Scaling** (if needed): Railway auto-scales

## Support

If issues persist:
1. Check Railway logs for errors
2. Review `BUILD_INSTRUCTIONS.md` for local testing
3. Verify all environment variables are set
4. Test locally first with `./start.sh`

Railway-specific support:
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

