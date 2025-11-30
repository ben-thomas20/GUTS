# 📤 Push to GitHub

Your GitHub repo: `git@github.com:ben-thomas20/GUTS.git`

## Quick Push Commands

```bash
# Navigate to your project
cd /Users/benthomas/Downloads/CSE101/GUTS

# Initialize git (if not already done)
git init

# Add your remote repository
git remote add origin git@github.com:ben-thomas20/GUTS.git

# Add all files
git add .

# Commit your code
git commit -m "Initial commit - Guts card game complete"

# Push to GitHub
git push -u origin main
```

## If the branch is named 'master' instead of 'main':

```bash
git push -u origin master
```

## If you get an error about existing remote:

```bash
# Remove existing remote and add again
git remote remove origin
git remote add origin git@github.com:ben-thomas20/GUTS.git
git push -u origin main
```

## ✅ Verify

After pushing, visit: **https://github.com/ben-thomas20/GUTS**

You should see all your files there!

---

## 🚀 Next: Deploy to Vercel & Railway

Once your code is on GitHub, follow these steps:

### 1. Deploy Backend to Railway

1. Go to **https://railway.app**
2. Sign in with GitHub
3. **"New Project"** → **"Deploy from GitHub repo"**
4. Select: **ben-thomas20/GUTS**
5. **Root Directory**: `backend`
6. **Environment Variables**:
   ```
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://YOUR-APP.vercel.app
   ```
7. Deploy and copy your Railway URL

### 2. Deploy Frontend to Vercel

1. Go to **https://vercel.com**
2. **"Add New"** → **"Project"**
3. Import: **ben-thomas20/GUTS**
4. **Root Directory**: `frontend`
5. **Framework**: Vite
6. **Environment Variable**:
   ```
   VITE_API_URL=https://YOUR-RAILWAY-URL
   ```
7. Deploy!

### 3. Update Backend

1. Go back to Railway
2. Update `FRONTEND_URL` with your Vercel URL
3. Redeploy

---

## 🎉 Done!

Your game will be live and accessible to anyone with the URL!

