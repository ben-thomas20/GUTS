# Railway Deployment Guide

Complete guide for deploying GUTS Card Game to Railway.

## Prerequisites

- Railway account at https://railway.app
- GitHub repository with this code

## Quick Deploy (5 minutes)

### 1. Deploy Backend

1. Create new Railway project from your GitHub repo
2. Add service: `guts-backend`
   - Root directory: `/backend_cpp`
   - Set variables:
     - `PORT=${{PORT}}` (auto-provided)
     - `FRONTEND_URL=https://placeholder.railway.app`
3. Copy backend URL after deployment

### 2. Deploy Frontend

1. Add service: `guts-frontend`
   - Root directory: `/frontend`
   - **⚠️ Set BEFORE deploying:**
     - `VITE_API_URL=<YOUR_BACKEND_URL>`
2. Copy frontend URL after deployment

### 3. Update Backend CORS

1. Update backend's `FRONTEND_URL` to actual frontend URL
2. Redeploy backend

Done! Open frontend URL to test.

## Important: Build-Time vs Runtime Variables

| Service | Variable | When Used | Can Change at Runtime? |
|---------|----------|-----------|----------------------|
| Backend | `PORT` | Runtime | ✅ Yes |
| Backend | `FRONTEND_URL` | Runtime | ✅ Yes |
| Frontend | `VITE_API_URL` | **Build time** | ❌ No - requires redeploy |

**Frontend caveat:** Vite bakes `VITE_API_URL` into JavaScript during build. Railway auto-passes env vars as build args. If you set `VITE_API_URL` after deploying, the frontend will have `localhost:3001` hardcoded - you must redeploy to fix it.

## Architecture

- **Backend**: C++ server (Drogon framework) - WebSocket + REST API
- **Frontend**: React static site (Vite build) - served with `serve`
- **Both use Docker** with multi-stage builds

## Troubleshooting

### Frontend connects to localhost:3001

**Cause:** `VITE_API_URL` wasn't set before first deployment

**Fix:** Set the variable and trigger manual redeploy

### WebSocket connection fails

**Solutions:**
1. Check `VITE_API_URL` uses `https://` (not `http://`)
2. Verify backend `FRONTEND_URL` matches frontend URL
3. Check backend is running in Railway dashboard

### Backend build fails

**Common issues:**
- Missing dependencies (already fixed in Dockerfile)
- Check Railway build logs for specific CMake errors

## Railway Configuration

Both services use Dockerfiles:
- `backend_cpp/Dockerfile` - Multi-stage C++ build
- `frontend/Dockerfile` - Multi-stage Node build with static serving

Railway auto-detects Dockerfiles and builds with BuildKit.

## Deployment Order (Important!)

**✅ Correct:**
1. Deploy backend → Get URL
2. **Set `VITE_API_URL`** on frontend service (before deploying)
3. Deploy frontend → Get URL
4. Update backend's `FRONTEND_URL`
5. Redeploy backend

**❌ Wrong:**
1. Deploy frontend first (no backend URL yet)
2. Deploy backend
3. Set variables afterward (too late - already built with wrong URLs)

## Cost Estimate

Railway Hobby Plan (Free):
- $5/month in credits
- Backend: ~$3-5/month
- Frontend: ~$1-2/month
- **Total: ~$4-7/month** (fits in free tier)

## Support

- Railway docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project issues: GitHub repository

