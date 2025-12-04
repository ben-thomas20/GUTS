# Railway Deployment Guide for GUTS Card Game

This guide will help you deploy the GUTS Card Game to Railway with separate backend and frontend services.

## Prerequisites

- Railway account (sign up at https://railway.app)
- Railway CLI installed (optional but recommended)
- GitHub repository connected to Railway

## Architecture

The project consists of two separate services:
1. **Backend**: C++ server using Drogon framework (WebSocket + REST API)
2. **Frontend**: React + Vite static site

## Deployment Steps

### Option 1: Using Railway Dashboard (Recommended)

#### Step 1: Create New Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your GUTS repository

#### Step 2: Deploy Backend (C++ Server)

1. Railway will detect the project. Click "Add Service"
2. Select "New Service" → "GitHub Repo"
3. Configure the backend service:
   - **Name**: `guts-backend`
   - **Root Directory**: `/backend_cpp`
   - **Builder**: Docker (auto-detected via `Dockerfile`)
   
4. Set Environment Variables:
   ```
   PORT=${{PORT}}  # Railway automatically provides this
   FRONTEND_URL=${{FRONTEND_URL}}  # Set after frontend is deployed
   ```

5. Deploy and wait for build to complete
6. Copy the generated public URL (e.g., `https://guts-backend.railway.app`)

#### Step 3: Deploy Frontend (React)

1. In the same project, click "Add Service"
2. Select "New Service" → "GitHub Repo"
3. Configure the frontend service:
   - **Name**: `guts-frontend`
   - **Root Directory**: `/frontend`
   - **Builder**: Docker (auto-detected via `Dockerfile`)

4. Set Environment Variables (**before first deployment**):
   ```
   VITE_API_URL=<YOUR_BACKEND_URL>  # Use the URL from Step 2
   ```
   Example: `VITE_API_URL=https://guts-backend.railway.app`
   
   **⚠️ Important:** This environment variable is used as a Docker build argument. Railway automatically passes environment variables to the Docker build process. Because Vite is a static site generator, the API URL must be known at **build time** (not runtime) - it gets compiled into the JavaScript bundle.

5. Deploy and wait for build to complete
6. Copy the generated public URL (e.g., `https://guts-frontend.railway.app`)

#### Step 4: Update Backend CORS

1. Go back to the backend service settings
2. Update the `FRONTEND_URL` environment variable:
   ```
   FRONTEND_URL=<YOUR_FRONTEND_URL>  # Use the URL from Step 3
   ```
   Example: `FRONTEND_URL=https://guts-frontend.railway.app`

3. Redeploy the backend service

#### Step 5: Test the Deployment

1. Open your frontend URL in a browser
2. Test creating and joining games
3. Verify WebSocket connections are working
4. Check the backend logs in Railway dashboard for any errors

### Option 2: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create a new project
railway init

# Deploy backend
cd backend_cpp
railway up
railway variables set PORT=3001
railway variables set FRONTEND_URL=https://your-frontend.railway.app

# Deploy frontend
cd ../frontend
railway up
railway variables set VITE_API_URL=https://your-backend.railway.app
```

## Environment Variables Reference

### Backend Environment Variables

| Variable | Description | Example | When Set |
|----------|-------------|---------|----------|
| `PORT` | Server port (auto-provided by Railway) | `3001` | Runtime |
| `FRONTEND_URL` | Frontend URL for CORS | `https://guts-frontend.railway.app` | Runtime |

### Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://guts-backend.railway.app` |

## Important Notes

### 1. WebSocket Configuration

The backend is configured to accept WebSocket connections on the same port as HTTP. Railway handles this automatically, but ensure your frontend connects using the correct protocol:
- HTTP → `http://your-backend.railway.app`
- HTTPS → `https://your-backend.railway.app` (WebSocket will use `wss://`)

### 2. CORS Configuration

The backend is currently configured with `Access-Control-Allow-Origin: *` for development. For production, you may want to restrict this to your specific frontend URL.

Update `backend_cpp/src/server.cpp` line 207:
```cpp
// Development (current)
resp->addHeader("Access-Control-Allow-Origin", "*");

// Production (recommended)
resp->addHeader("Access-Control-Allow-Origin", frontendUrl);
```

### 3. Build Configuration

Both services use Docker with BuildKit for building:
- **Backend**: `backend_cpp/Dockerfile` - Multi-stage build for smaller runtime image
- **Frontend**: `frontend/Dockerfile` - Optimized build with caching

BuildKit features used:
- Layer caching for faster rebuilds
- Multi-stage builds for smaller images
- Dependency caching with `--mount=type=cache`

These Dockerfiles are pre-configured and production-ready.

### 4. Persistent Storage

The current implementation stores game state in memory. If you need persistent storage:
1. Add Railway PostgreSQL or Redis service
2. Update the backend to use database storage
3. Set database connection environment variables

### 5. Custom Domains

To use custom domains:
1. Go to your service settings in Railway
2. Click "Networking" → "Custom Domain"
3. Add your domain and configure DNS records
4. Update environment variables with new domain URLs

## Monitoring and Logs

- **View Logs**: Railway Dashboard → Select Service → Logs tab
- **Metrics**: Railway Dashboard → Select Service → Metrics tab
- **Health Check**: Backend has `/api/health` endpoint

## Troubleshooting

### Backend won't start
- Check build logs for C++ compilation errors
- Verify all dependencies are installed (cmake, gcc, openssl)
- Ensure PORT environment variable is set

### Frontend can't connect to backend
- Verify `VITE_API_URL` is set correctly
- Check CORS headers in backend response
- Ensure backend service is running

### WebSocket connection fails
- Check that backend is listening on `0.0.0.0` (not `localhost`)
- Verify Railway has assigned a public URL
- Check browser console for connection errors

### Build takes too long
- Backend C++ build can take 2-3 minutes (normal)
- Frontend build should take < 1 minute
- Use Railway build cache to speed up subsequent deploys

## Cost Estimation

Railway offers:
- **Hobby Plan**: Free $5/month credit
- **Pro Plan**: $20/month with $10 included credit

Estimated usage for GUTS:
- Backend: ~$3-5/month (depending on traffic)
- Frontend: ~$1-2/month
- Total: ~$4-7/month (fits in Hobby plan for small usage)

## Scaling

To handle more players:
1. Increase backend service replicas in Railway dashboard
2. Consider using Redis for shared game state across instances
3. Add load balancing (handled automatically by Railway)

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: Create an issue in your GitHub repository

