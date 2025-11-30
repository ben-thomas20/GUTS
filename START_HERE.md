# 🎴 START HERE - Test Locally First

Quick guide to get the Guts card game running on your machine.

## Step 1: Install Dependencies

Run the automated setup script:

```bash
./setup.sh
```

Or manually:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

## Step 2: Create Environment Files

**Backend** - Create `backend/.env`:
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Frontend** - Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
```

## Step 3: Start the Application

From the root directory:
```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 5173).

## Step 4: Test with Multiple Browser Tabs

1. **Open** http://localhost:5173 in your browser

2. **Tab 1** (Host):
   - Name: "Alice"
   - Click "Create Game"
   - Copy the room code (e.g., "ABC123")

3. **Tab 2** (Player 2):
   - Open http://localhost:5173 in a new tab
   - Name: "Bob"
   - Click "Join Game"
   - Enter the room code
   - Click "Join Game"

4. **Add more players** (optional - up to 8 total)

5. **Back to Tab 1** (Host):
   - Click "Start Game"

6. **Play!**
   - Each tab shows 3 cards
   - Choose HOLD or DROP within 10 seconds
   - See results
   - Continue until someone beats THE DECK!

## Quick Test Scenarios

### Test 1: Multiple Holders
- Both players HOLD
- Best hand wins
- Loser matches pot
- Next round starts

### Test 2: THE DECK Showdown
- One player HOLDS, other DROPS
- Single holder vs THE DECK
- If player wins → Game ends
- If THE DECK wins → Game continues

### Test 3: All Drop
- Both players DROP
- Pot carries over
- Next round starts

## Troubleshooting

### Can't connect?
```bash
# Check if ports are free
lsof -i :3001  # Backend
lsof -i :5173  # Frontend

# Kill if needed
kill -9 [PID]
```

### Cards not appearing?
- Check browser console (F12)
- Check backend terminal for errors
- Verify Socket.io connection established

### Need to restart?
- Press Ctrl+C in terminal
- Run `npm run dev` again

## Next: Deploy to Vercel

Once local testing works, see **VERCEL_DEPLOYMENT.md** for deployment instructions!

---

**Happy Testing! 🎮**

