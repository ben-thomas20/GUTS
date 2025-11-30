# 🚂 Railway Quick Start

## Quick Deployment Steps

### 1. Create Project on Railway
- Go to [railway.app](https://railway.app)
- New Project → Deploy from GitHub
- Select your repository

### 2. Deploy Backend
- **New Service** → GitHub Repo
- **Settings** → **Source** → **Root Directory**: `backend` ⚠️ **MUST SET THIS**
- **Variables**:
  ```
  NODE_ENV=production
  FRONTEND_URL=https://your-frontend-url.railway.app
  ```
  (PORT is auto-provided by Railway)
- **Generate Domain** → Copy URL

### 3. Deploy Frontend
- **New Service** → GitHub Repo  
- **Settings** → **Source** → **Root Directory**: `frontend` ⚠️ **MUST SET THIS**
- **Variables**:
  ```
  VITE_API_URL=https://your-backend-url.railway.app
  ```
  ⚠️ **Must include `https://` protocol!**
- **Generate Domain** → If asked for port, Railway usually auto-detects (or check logs for PORT value)
- Copy URL

### 4. Update Backend
- Update `FRONTEND_URL` with frontend domain (must include `https://`)
- Auto-redeploys

## ✅ Done!

Your game is live at your frontend Railway URL!

