# 🚂 Railway Deployment Guide

This guide will help you deploy both the frontend and backend of the Guts Card Game to Railway.

## Prerequisites

- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))
- Your code pushed to a GitHub repository

---

## Step 1: Create Railway Project

1. Go to [Railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Select your GUTS repository
5. Click **"Deploy Now"** (we'll configure services next)

---

## Step 2: Deploy Backend Service

1. In your Railway project, click **"New Service"**
2. Select **"GitHub Repo"** and choose your GUTS repository
3. Railway will auto-detect the service - click **"Add Service"**

4. **Configure the Backend Service:**
   - **Name**: `guts-backend` (or any name you prefer)
   - **Root Directory**: `backend` ⚠️ **CRITICAL: Must be set to `backend`**
   - Railway will auto-detect Node.js and use `backend/nixpacks.toml`
   - **Settings** → **Source** → Set **Root Directory** to `backend`

5. **Add Environment Variables:**
   - Go to the service → **Variables** tab
   - Add these variables:
     ```
     PORT=3001
     NODE_ENV=production
     FRONTEND_URL=https://your-frontend-url.railway.app
     ```
     ⚠️ **Note**: You'll update `FRONTEND_URL` after deploying the frontend

6. **Generate Public Domain:**
   - Go to **Settings** → **Networking**
   - Click **"Generate Domain"**
   - Copy the domain (e.g., `guts-backend-production.up.railway.app`)

7. **Deploy**: Railway will automatically deploy when you push to GitHub

---

## Step 3: Deploy Frontend Service

1. In the same Railway project, click **"New Service"** again
2. Select **"GitHub Repo"** and choose your GUTS repository
3. Click **"Add Service"**

4. **Configure the Frontend Service:**
   - **Name**: `guts-frontend` (or any name you prefer)
   - **Root Directory**: `frontend` ⚠️ **CRITICAL: Must be set to `frontend`**
   - Railway will auto-detect and use `frontend/nixpacks.toml`
   - **Settings** → **Source** → Set **Root Directory** to `frontend`

5. **Add Environment Variables:**
   - Go to the service → **Variables** tab
   - Add this variable:
     ```
     VITE_API_URL=https://your-backend-url.railway.app
     ```
     ⚠️ **Replace** `your-backend-url.railway.app` with your actual backend domain from Step 2

6. **Generate Public Domain:**
   - Go to **Settings** → **Networking**
   - Click **"Generate Domain"**
   - Copy the domain (e.g., `guts-frontend-production.up.railway.app`)

7. **Deploy**: Railway will automatically deploy when you push to GitHub

---

## Step 4: Update Backend Environment Variable

1. Go back to your **Backend Service**
2. Go to **Variables** tab
3. Update `FRONTEND_URL` to your frontend Railway domain:
   ```
   FRONTEND_URL=https://your-frontend-url.railway.app
   ```
4. Railway will automatically redeploy with the new variable

---

## Step 5: Verify Deployment

1. **Test Backend:**
   - Visit: `https://your-backend-url.railway.app/api/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Frontend:**
   - Visit: `https://your-frontend-url.railway.app`
   - Should load the game interface

3. **Test Game Flow:**
   - Create a room
   - Join with another device/browser
   - Start a game
   - Verify cards are dealt
   - Verify WebSocket connection works

---

## Environment Variables Summary

### Backend Service:
```
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.railway.app
```

### Frontend Service:
```
VITE_API_URL=https://your-backend-url.railway.app
```

---

## Configuration Files

The project includes these Railway configuration files:

### `backend/nixpacks.toml`
- Defines Node.js 20
- Installs dependencies
- Starts with `node server.js`

### `frontend/nixpacks.toml`
- Defines Node.js 20
- Installs dependencies
- Builds with `npm run build`
- Serves with `npx serve -s dist -l $PORT`

### `.railwayignore`
- Excludes unnecessary files from build context
- Reduces build time

---

## Troubleshooting

### "Error creating build plan with Railpack"
- **Most Common Fix**: Ensure **Root Directory** is set correctly in Railway service settings
  - Backend service: Root Directory = `backend`
  - Frontend service: Root Directory = `frontend`
- Go to **Settings** → **Source** → **Root Directory** and verify it's set
- If Root Directory is not set, Railway tries to build from repository root and fails
- After setting Root Directory, trigger a new deployment

### Backend won't start
- Check logs in Railway dashboard
- Verify `PORT` environment variable is set
- Ensure `server.js` exists in `backend/` directory
- Check that server binds to `0.0.0.0` (already configured)
- Verify Root Directory is set to `backend`

### Frontend won't build
- Check build logs in Railway dashboard
- Verify `VITE_API_URL` is set correctly
- Ensure all dependencies are in `package.json`
- Check that `vite.config.js` exists

### WebSocket connection fails
- Verify `FRONTEND_URL` in backend matches your frontend domain
- Check CORS settings in `backend/server.js`
- Ensure both services are using HTTPS (Railway provides this automatically)
- Check browser console for connection errors

### Cards not appearing
- Verify `VITE_API_URL` points to correct backend URL
- Check backend logs for errors
- Ensure Socket.io connection is established (check browser console)

### Environment variables not working
- **Frontend**: Variables must start with `VITE_` and are set at build time
- **Backend**: Variables are available at runtime
- Redeploy after changing environment variables
- For frontend, you may need to trigger a new build

---

## Auto-Deploy

Railway automatically deploys when you push to your GitHub repository's main branch.

To deploy manually:
1. Go to your service in Railway
2. Click **"Deploy"** → **"Redeploy"**

---

## Monitoring

- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: Check CPU, memory, and network usage
- **Deployments**: View deployment history and status

---

## Cost

Railway offers:
- **$5 free credit per month** (perfect for this project!)
- Pay-as-you-go pricing after free credit
- Both services should fit comfortably in free tier for development/testing

---

## Custom Domains (Optional)

1. Go to service **Settings** → **Domains**
2. Click **"Custom Domain"**
3. Add your domain
4. Update DNS records as instructed
5. Update environment variables to use new domain

---

## Success Checklist

- [ ] Backend service deployed and accessible
- [ ] Frontend service deployed and accessible
- [ ] Backend health check returns OK
- [ ] Frontend loads correctly
- [ ] Can create a game room
- [ ] Can join a game room
- [ ] WebSocket connection establishes
- [ ] Cards are dealt correctly
- [ ] Game flow works end-to-end
- [ ] Mobile responsive (test on phone)

---

## Quick Reference

**Backend URL**: `https://your-backend-url.railway.app`  
**Frontend URL**: `https://your-frontend-url.railway.app`

**Backend Health Check**: `https://your-backend-url.railway.app/api/health`

---

## Support

If you encounter issues:
1. Check Railway deployment logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Test backend URL directly in browser
5. Check Railway status page

**Happy Gaming! 🎴**

