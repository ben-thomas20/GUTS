@echo off

echo 🎴 Setting up Guts Card Game...
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ and try again.
    exit /b 1
)

node -v
echo.

:: Install root dependencies
echo 📦 Installing root dependencies...
call npm install

:: Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install

:: Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating backend .env file...
    copy .env.example .env
    echo ✅ Created backend/.env
) else (
    echo ℹ️  backend/.env already exists
)

cd ..

:: Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install

:: Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating frontend .env file...
    copy .env.example .env
    echo ✅ Created frontend/.env
) else (
    echo ℹ️  frontend/.env already exists
)

cd ..

echo.
echo ✅ Setup complete!
echo.
echo 🚀 To start the application:
echo    npm run dev
echo.
echo 📱 For mobile testing:
echo    1. Find your local IP: ipconfig
echo    2. Update frontend/.env: VITE_API_URL=http://YOUR_IP:3001
echo    3. Update backend/.env: FRONTEND_URL=http://YOUR_IP:5173
echo    4. Restart the app and access from mobile on same WiFi
echo.
echo 📖 See README.md for full documentation
echo.

pause

