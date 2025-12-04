# Railway Build Arguments

## How Railway Handles Build Arguments

Railway automatically passes **all environment variables** as Docker build arguments when using Dockerfiles.

## Frontend Build Configuration

### The Issue

Vite (the frontend build tool) needs to know the backend API URL at **build time**, not runtime, because:
1. Vite replaces `import.meta.env.VITE_API_URL` with the actual value during build
2. The resulting JavaScript bundle has the URL hardcoded
3. This cannot be changed at runtime

### The Solution

**Set `VITE_API_URL` as an environment variable in Railway BEFORE deploying:**

```
VITE_API_URL=https://your-backend.railway.app
```

Railway will automatically:
1. Read this environment variable
2. Pass it as `--build-arg VITE_API_URL=https://your-backend.railway.app` to Docker
3. The Dockerfile's `ARG VITE_API_URL` receives it
4. Vite uses it during `npm run build`
5. The value gets embedded in the built JavaScript

### Verification

After deployment, you can verify the API URL is correct:

1. Open your frontend in a browser
2. Open Developer Tools → Sources tab
3. Look at the bundled JavaScript files
4. Search for your backend URL - you should find it hardcoded in the bundle

### Common Mistakes

❌ **Setting the variable AFTER first deployment**
- The first build will have empty/localhost URL
- **Solution:** Set variable first, then deploy OR redeploy after setting

❌ **Trying to change URL at runtime**
- Vite variables are build-time only
- **Solution:** Change the environment variable and redeploy (triggers rebuild)

❌ **Forgetting the `https://` prefix**
- Browser will try to connect to `guts-backend.railway.app` (no protocol)
- **Solution:** Always include full URL: `https://your-backend.railway.app`

### How the Dockerfile Works

```dockerfile
# Railway passes env vars as build args automatically
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Vite reads VITE_API_URL from environment during build
RUN npm run build  
```

This is equivalent to running:
```bash
docker build --build-arg VITE_API_URL=https://backend.railway.app .
```

Railway does this automatically when you set environment variables.

### Testing Locally

To test the Dockerfile locally with build args:

```bash
cd frontend
docker build \
  --build-arg VITE_API_URL=http://localhost:3001 \
  -t guts-frontend .

docker run -p 3000:3000 -e PORT=3000 guts-frontend
```

Open http://localhost:3000 and verify it connects to your local backend.

### Railway Deployment Order

**Correct order:**

1. Deploy backend first
2. Copy backend URL
3. Create frontend service
4. **Set `VITE_API_URL` environment variable**
5. Deploy frontend
6. Update backend's `FRONTEND_URL` with frontend URL
7. Redeploy backend

**Wrong order (common mistake):**

1. Deploy frontend ← No `VITE_API_URL` set yet!
2. Frontend builds with localhost:3001
3. Set `VITE_API_URL` ← Too late, already built!
4. Frontend still connects to localhost

**Fix:** Trigger a manual redeploy of the frontend after setting the variable.

## Backend Configuration

The backend doesn't use build arguments - it reads environment variables at runtime:

```cpp
int port = std::getenv("PORT") ? std::atoi(std::getenv("PORT")) : 3001;
string frontendUrl = std::getenv("FRONTEND_URL") ? 
    std::getenv("FRONTEND_URL") : "http://localhost:5173";
```

These can be changed at runtime without rebuilding.

## Summary

| Service | Variable | When Used | Can Change at Runtime? |
|---------|----------|-----------|----------------------|
| Backend | `PORT` | Runtime | ✅ Yes |
| Backend | `FRONTEND_URL` | Runtime | ✅ Yes |
| Frontend | `VITE_API_URL` | **Build time** | ❌ No - requires redeploy |

The key difference: Static site generators (Vite, Next.js, etc.) embed configuration at build time.

