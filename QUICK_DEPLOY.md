# ⚡ Quick Deploy Guide

## Fastest Way to Deploy (5 Minutes)

### 1️⃣ Deploy Backend to Railway

1. Go to **https://railway.app**
2. Click **"Start a New Project"** → **"Deploy from GitHub repo"**
3. Select your repo → Choose **backend** folder
4. Add environment variables:
   ```
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://YOUR-APP-NAME.vercel.app
   ```
5. Copy your Railway URL (e.g., `guts-backend.up.railway.app`)

### 2️⃣ Deploy Frontend to Vercel

1. Go to **https://vercel.com**
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repo
4. **Root Directory**: `frontend`
5. **Framework**: Vite
6. Add environment variable:
   ```
   VITE_API_URL=https://YOUR-RAILWAY-URL
   ```
7. Click **Deploy**

### 3️⃣ Update Backend with Frontend URL

1. Go back to Railway
2. Update `FRONTEND_URL` to your Vercel URL
3. Redeploy

### ✅ Done!

Your game is now live at `https://your-app.vercel.app`

---

## Alternative: Vercel CLI (For Developers)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel --prod

# Deploy backend
cd ../backend
vercel --prod
```

Then update environment variables in Vercel dashboard.

---

## Test Your Deployment

1. ✅ Visit your frontend URL
2. ✅ Create a game
3. ✅ Open in another tab/device
4. ✅ Join the game
5. ✅ Start playing!

---

## 🆘 Quick Fixes

**Can't connect?**
→ Check VITE_API_URL matches your backend URL

**WebSocket issues?**
→ Make sure backend is on Railway (not Vercel serverless)

**Cards not showing?**
→ Check browser console, verify Socket.io connection

---

**Need detailed help?** See `DEPLOYMENT.md`

