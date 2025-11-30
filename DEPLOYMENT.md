# 🚀 Deployment Guide

## Overview

This guide will help you deploy the Guts Card Game. Since the app has both frontend and backend components, you have three deployment options:

**Option 1 (EASIEST)**: Both Frontend + Backend on Railway ⭐ RECOMMENDED
**Option 2**: Frontend on Vercel + Backend on Railway
**Option 3**: Both on Vercel (WebSocket limitations)

---

## ⭐ Option 1: Both on Railway (EASIEST & RECOMMENDED)

This is the **simplest** deployment option with full WebSocket support!

### Step 1: Deploy Backend to Railway

1. **Go to [Railway.app](https://railway.app/)** and sign up/login with GitHub

2. **Click "New Project" → "Deploy from GitHub repo"**

3. **Select your GUTS repository**

4. **Click "Add Service" and configure:**
   - Name it: `guts-backend`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node server.js`

5. **Add Environment Variables:**
   ```
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
   ```

6. **Deploy** and get your backend URL

### Step 2: Deploy Frontend to Railway

1. **In the same Railway project, click "New Service"**

2. **Select the same GitHub repo**

3. **Configure:**
   - Name it: `guts-frontend`
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npx serve -s dist -l $PORT`

4. **Add Environment Variables:**
   ```
   VITE_API_URL=https://YOUR-BACKEND-URL.railway.app
   ```
   (Use the backend URL from Step 1)

5. **Deploy**

### Step 3: Update Backend Environment

1. Go to backend service settings
2. Update `FRONTEND_URL` to your frontend Railway URL
3. Redeploy backend

### ✅ Done! Both services running on Railway!

**Cost**: Railway gives $5 free credit per month - perfect for this project!

---

## 🎯 Option 2: Frontend (Vercel) + Backend (Railway)

This option splits hosting between two platforms.

### Step 1: Deploy Backend to Railway

1. **Go to [Railway.app](https://railway.app/)** and sign up/login with GitHub

2. **Click "New Project" → "Deploy from GitHub repo"**

3. **Select your GUTS repository**

4. **Configure the backend:**
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node server.js`

5. **Add Environment Variables:**
   ```
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```
   (You'll update FRONTEND_URL after deploying frontend)

6. **Deploy** and copy your backend URL (e.g., `https://guts-backend-production.up.railway.app`)

### Step 2: Deploy Frontend to Vercel

1. **Go to [Vercel](https://vercel.com)** and sign up/login with GitHub

2. **Click "Add New" → "Project"**

3. **Import your GUTS repository**

4. **Configure the project:**
   - Framework Preset: **Vite**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Add Environment Variable:**
   - Name: `VITE_API_URL`
   - Value: `https://your-backend-url.up.railway.app` (from Step 1)

6. **Click "Deploy"**

7. **After deployment**, copy your frontend URL (e.g., `https://guts-game.vercel.app`)

### Step 3: Update Backend Environment

1. Go back to **Railway dashboard**
2. Update the `FRONTEND_URL` environment variable to your Vercel frontend URL
3. Redeploy the backend

### ✅ Done! Your game is live!

---

## 🔧 Option 3: Both on Vercel (Serverless Functions)

**Note**: Vercel has limitations with WebSockets in serverless functions. This may cause connection issues.

### Deploy Frontend

1. **Go to [Vercel](https://vercel.com)** and import your repository

2. **Configure:**
   - Root Directory: `frontend`
   - Framework: Vite
   - Environment Variables:
     - `VITE_API_URL`: `/api` (relative path)

3. **Deploy**

### Deploy Backend as API Routes

1. **Create a new Vercel project** for the backend

2. **Configure:**
   - Root Directory: `backend`
   - Framework: Other
   - Environment Variables:
     - `NODE_ENV`: `production`
     - `FRONTEND_URL`: Your frontend Vercel URL

3. **Deploy**

**Warning**: WebSocket support may be limited. If you experience connection issues, use Option 1.

---

## 🛠️ Quick Deploy Commands

### If using Vercel CLI:

**Install Vercel CLI:**
```bash
npm install -g vercel
```

**Deploy Frontend:**
```bash
cd frontend
vercel --prod
```

**Deploy Backend:**
```bash
cd backend
vercel --prod
```

---

## 📋 Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] Backend API is accessible
- [ ] WebSocket connection establishes
- [ ] Can create a game room
- [ ] Can join a game room
- [ ] Cards are dealt correctly
- [ ] Timer works
- [ ] Decisions register
- [ ] Game flow works end-to-end
- [ ] Mobile responsive (test on phone)

---

## 🐛 Troubleshooting

### "Cannot connect to server"
- Check VITE_API_URL in Vercel frontend environment variables
- Verify backend is running (visit backend URL directly)
- Check CORS settings in backend allow your frontend URL

### WebSocket issues
- Use Option 1 (Railway for backend) instead of Vercel serverless
- Check browser console for connection errors
- Verify wss:// (not ws://) is being used in production

### Cards not appearing / Game stuck
- Check browser console for errors
- Verify Socket.io connection is established
- Check backend logs in Railway/Vercel dashboard

### Environment variables not working
- Redeploy after changing environment variables
- For Vite, variables must start with `VITE_`
- Variables are set at build time, not runtime

---

## 🔒 Security Checklist for Production

- [ ] Set CORS to specific frontend URL (not `*`)
- [ ] Use HTTPS/WSS only
- [ ] Set NODE_ENV=production
- [ ] Enable rate limiting
- [ ] Set secure WebSocket configuration
- [ ] Monitor for unusual activity

---

## 📱 Custom Domain (Optional)

### On Vercel:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update FRONTEND_URL in backend to use new domain

### On Railway:
1. Go to Settings → Domains
2. Add custom domain
3. Update DNS records
4. Update VITE_API_URL in frontend to use new backend domain

---

## 🎉 Success!

Once deployed, share your game URL with friends and start playing!

Your game should be accessible at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.up.railway.app` (if using Railway)

---

## 💰 Cost Estimate

**Vercel Free Tier:**
- ✅ Perfect for frontend hosting
- ✅ 100GB bandwidth/month
- ✅ Unlimited deployments

**Railway Free Tier:**
- ✅ $5 free credit/month
- ✅ Great for backend hosting
- ✅ WebSocket support

**Total Cost**: FREE for hobby projects with moderate traffic!

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Vercel/Railway deployment logs
3. Verify all environment variables are set correctly
4. Test backend URL directly in browser

**Happy Gaming! 🎴**

