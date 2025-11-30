# 🚂 Railway Quick Start

## Quick Deployment Steps

### 1. Create Project on Railway
- Go to [railway.app](https://railway.app)
- New Project → Deploy from GitHub
- Select your repository

### 2. Deploy Backend
- **New Service** → GitHub Repo
- **Root Directory**: `backend`
- **Variables**:
  ```
  PORT=3001
  NODE_ENV=production
  FRONTEND_URL=https://your-frontend-url.railway.app
  ```
- **Generate Domain** → Copy URL

### 3. Deploy Frontend
- **New Service** → GitHub Repo  
- **Root Directory**: `frontend`
- **Variables**:
  ```
  VITE_API_URL=https://your-backend-url.railway.app
  ```
- **Generate Domain** → Copy URL

### 4. Update Backend
- Update `FRONTEND_URL` with frontend domain
- Auto-redeploys

## ✅ Done!

Your game is live at your frontend Railway URL!

