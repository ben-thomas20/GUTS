# Railway Quick Start Guide

**Deploy GUTS Card Game to Railway in 5 minutes**

## ⚡ Quick Deploy

### Step 1: Create Railway Project (1 min)

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your GUTS repository
4. Railway will create a project

### Step 2: Deploy Backend (2 min)

1. **Service Name**: `guts-backend`
2. **Settings** → **Service**:
   - Root Directory: `/backend_cpp`
   - Builder: Docker (auto-detected)
3. **Variables** tab:
   ```
   PORT=${{PORT}}
   FRONTEND_URL=https://placeholder.railway.app
   ```
4. Click **Deploy** (takes ~2-3 minutes to build)
5. **Copy the public URL** from Settings → Networking

### Step 3: Deploy Frontend (1 min)

1. Click **"New Service"** → same GitHub repo
2. **Service Name**: `guts-frontend`
3. **Settings** → **Service**:
   - Root Directory: `/frontend`
   - Builder: Docker (auto-detected)
4. **Variables** tab (⚠️ **IMPORTANT** - set BEFORE first deployment):
   ```
   VITE_API_URL=<PASTE_BACKEND_URL_HERE>
   ```
   Example: `VITE_API_URL=https://guts-backend-production.up.railway.app`
   
   **Note:** Railway automatically passes this as a Docker build argument. The frontend must know the backend URL at **build time** because Vite bakes it into the JavaScript files.

5. Click **Deploy** (takes ~1 minute to build)
6. **Copy the public URL** from Settings → Networking

### Step 4: Update Backend CORS (1 min)

1. Go back to **guts-backend** service
2. **Variables** tab → Edit `FRONTEND_URL`:
   ```
   FRONTEND_URL=<PASTE_FRONTEND_URL_HERE>
   ```
   Example: `FRONTEND_URL=https://guts-frontend-production.up.railway.app`
3. Service will automatically redeploy

### Step 5: Test! 🎉

1. Open your **frontend URL** in a browser
2. Create a game room
3. Open another browser/device and join with the room code
4. Play a test game!

---

## 🔧 Environment Variables Reference

### Backend (`guts-backend`)

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | `${{PORT}}` | Auto-provided by Railway |
| `FRONTEND_URL` | `https://your-frontend.railway.app` | Must match frontend URL |

### Frontend (`guts-frontend`)

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://your-backend.railway.app` | Must match backend URL |

---

## ✅ Verification Checklist

- [ ] Backend service shows "Active" status
- [ ] Frontend service shows "Active" status
- [ ] Backend URL responds at `/api/health`
- [ ] Frontend loads in browser
- [ ] Can create a game room
- [ ] Can join a game room from another device
- [ ] WebSocket connection established (check browser console)

---

## 🐛 Troubleshooting

### Backend won't build
- **Check build logs** in Railway dashboard
- Most common: Build timeout (wait for it to complete)
- If fails: Check `backend_cpp/CMakeLists.txt` syntax

### Frontend can't connect to backend
- **Check `VITE_API_URL`** is set correctly (with https://)
- **Check browser console** for CORS errors
- Verify backend `FRONTEND_URL` matches your frontend URL

### WebSocket won't connect
- Ensure backend is running (check logs)
- Verify API URL uses `https://` (not `http://`)
- Check browser console for errors

### "Game not found" errors
- This is normal on first load if auto-rejoin fails
- Create a new game to start fresh
- Clear browser localStorage if needed

---

## 📊 What You Get

**Free Tier (Hobby Plan):**
- $5/month in credits (free)
- Enough for ~50-100 concurrent players
- Perfect for testing and small games

**Costs:**
- Backend: ~$3-5/month
- Frontend: ~$1-2/month
- **Total: ~$4-7/month** (fits in free tier!)

---

## 📚 More Information

- **Full deployment guide**: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- **Deployment checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Production improvements**: [PRODUCTION_IMPROVEMENTS.md](./PRODUCTION_IMPROVEMENTS.md)

---

## 🎮 Next Steps

After deployment:
1. ✅ Test with multiple players
2. 🎨 Customize game settings (buy-in amounts, etc.)
3. 📱 Test on mobile devices
4. 🔒 Consider security improvements (see PRODUCTION_IMPROVEMENTS.md)
5. 📈 Monitor usage in Railway dashboard

---

**Need help?** Check the full [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) guide or Railway's [documentation](https://docs.railway.app).

**Ready to deploy?** Let's go! 🚀

