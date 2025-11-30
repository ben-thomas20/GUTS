#!/bin/bash

echo "🎴 Setting up Guts Card Game..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating backend .env file..."
    cp .env.example .env
    echo "✅ Created backend/.env"
else
    echo "ℹ️  backend/.env already exists"
fi

cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating frontend .env file..."
    cp .env.example .env
    echo "✅ Created frontend/.env"
else
    echo "ℹ️  frontend/.env already exists"
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   npm run dev"
echo ""
echo "📱 For mobile testing:"
echo "   1. Find your local IP: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
echo "   2. Update frontend/.env: VITE_API_URL=http://YOUR_IP:3001"
echo "   3. Update backend/.env: FRONTEND_URL=http://YOUR_IP:5173"
echo "   4. Restart the app and access from mobile on same WiFi"
echo ""
echo "📖 See README.md for full documentation"
echo ""

