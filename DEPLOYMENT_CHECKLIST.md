# ✅ Railway Deployment Checklist

## Pre-Deployment Verification

### Backend Configuration
- [x] `backend/nixpacks.toml` exists and is correct
- [x] `backend/server.js` binds to `0.0.0.0` (required for Railway)
- [x] `backend/server.js` uses `process.env.PORT` (dynamic port)
- [x] CORS configured to accept `FRONTEND_URL` environment variable
- [x] All dependencies in `backend/package.json`
- [x] Health check endpoint at `/api/health`

### Frontend Configuration
- [x] `frontend/nixpacks.toml` exists and is correct
- [x] `frontend/package.json` includes `serve` package
- [x] `VITE_API_URL` environment variable used in code
- [x] Build command: `npm run build`
- [x] Start command: `npx serve -s dist -l $PORT`
- [x] All dependencies in `frontend/package.json`

### Configuration Files
- [x] `.railwayignore` exists to exclude unnecessary files
- [x] Root `package.json` has workspaces configured (optional, not required for Railway)

## Deployment Steps

### 1. Backend Service
1. [ ] Create new Railway project
2. [ ] Add backend service
3. [ ] Set Root Directory: `backend`
4. [ ] Add environment variables:
   - `PORT=3001`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-frontend-url.railway.app` (update after frontend deploy)
5. [ ] Generate public domain
6. [ ] Verify deployment succeeds
7. [ ] Test health endpoint: `https://your-backend-url.railway.app/api/health`

### 2. Frontend Service
1. [ ] Add frontend service to same project
2. [ ] Set Root Directory: `frontend`
3. [ ] Add environment variable:
   - `VITE_API_URL=https://your-backend-url.railway.app`
4. [ ] Generate public domain
5. [ ] Verify build succeeds
6. [ ] Verify deployment succeeds
7. [ ] Test frontend loads: `https://your-frontend-url.railway.app`

### 3. Final Configuration
1. [ ] Update backend `FRONTEND_URL` with frontend domain
2. [ ] Backend auto-redeploys
3. [ ] Test full game flow:
   - [ ] Create room
   - [ ] Join room
   - [ ] Start game
   - [ ] Cards dealt
   - [ ] Make decisions
   - [ ] Game completes

## Environment Variables Reference

### Backend Service
```bash
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.railway.app
```

### Frontend Service
```bash
VITE_API_URL=https://your-backend-url.railway.app
```

## Testing Checklist

- [ ] Backend health check returns 200 OK
- [ ] Frontend loads without errors
- [ ] Can create a game room
- [ ] Can join a game room
- [ ] WebSocket connection establishes (check browser console)
- [ ] Cards are dealt correctly
- [ ] Timer counts down
- [ ] Decisions register (HOLD/DROP)
- [ ] Round results display correctly
- [ ] Game flow works end-to-end
- [ ] Mobile responsive (test on phone)

## Troubleshooting

### Backend Issues
- Check Railway logs for errors
- Verify PORT environment variable
- Ensure server binds to 0.0.0.0
- Check CORS configuration

### Frontend Issues
- Check build logs for errors
- Verify VITE_API_URL is set correctly
- Check browser console for connection errors
- Ensure serve package is installed

### Connection Issues
- Verify FRONTEND_URL matches frontend domain
- Verify VITE_API_URL matches backend domain
- Check CORS allows frontend origin
- Ensure both services use HTTPS

## Files Ready for Deployment

✅ `backend/nixpacks.toml` - Backend build configuration
✅ `frontend/nixpacks.toml` - Frontend build configuration
✅ `.railwayignore` - Excludes unnecessary files
✅ `backend/server.js` - Configured for Railway (0.0.0.0 binding)
✅ `frontend/package.json` - Includes serve package
✅ `RAILWAY_DEPLOYMENT.md` - Detailed deployment guide
✅ `RAILWAY_QUICK_START.md` - Quick reference

## Ready to Deploy! 🚀

