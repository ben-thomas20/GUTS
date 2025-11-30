import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

export default function LandingPage() {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [showJoinForm, setShowJoinForm] = useState(false)
  const { createGame, joinGame } = useGameStore()

  const handleCreateGame = () => {
    if (playerName.trim().length < 2) {
      alert('Please enter a name (at least 2 characters)')
      return
    }
    createGame(playerName.trim())
  }

  const handleJoinGame = () => {
    if (playerName.trim().length < 2) {
      alert('Please enter a name (at least 2 characters)')
      return
    }
    if (roomCode.trim().length !== 6) {
      alert('Please enter a valid 6-character room code')
      return
    }
    joinGame(roomCode.trim().toUpperCase(), playerName.trim())
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black text-white mb-3">GUTS</h1>
          <p className="text-lg text-white/70 font-medium tracking-wide">High Stakes Card Game</p>
        </div>

        {/* Player Name Input */}
        <div className="mb-6">
          <label className="block text-white/80 text-sm font-semibold mb-2 tracking-wide">
            PLAYER NAME
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className="w-full px-4 py-4 rounded-xl text-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Action Buttons */}
        {!showJoinForm ? (
          <div className="space-y-3">
            <button
              onClick={handleCreateGame}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-all"
              style={{ minHeight: '44px' }}
            >
              Create New Game
            </button>
            <button
              onClick={() => setShowJoinForm(true)}
              className="w-full py-4 bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white font-semibold text-lg rounded-xl active:scale-95 transition-all"
              style={{ minHeight: '44px' }}
            >
              Join Existing Game
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-2 tracking-wide">
                ROOM CODE
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABCD12"
                maxLength={6}
                className="w-full px-4 py-4 rounded-xl text-2xl text-center bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest font-bold transition-all"
              />
            </div>
            <button
              onClick={handleJoinGame}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-all"
              style={{ minHeight: '44px' }}
            >
              Join Game
            </button>
            <button
              onClick={() => setShowJoinForm(false)}
              className="w-full py-3 bg-transparent border-2 border-white/30 text-white/80 hover:text-white hover:border-white/50 font-semibold text-base rounded-xl active:scale-95 transition-all"
              style={{ minHeight: '44px' }}
            >
              Back
            </button>
          </div>
        )}

        {/* Game Rules */}
        <div className="mt-12 p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-white/60 text-sm text-center leading-relaxed">
            <span className="text-orange-400 font-semibold">House Rules:</span> Rounds 1-3 are "NOTHING" (pairs only)
            <br />
            <span className="text-blue-400 font-semibold">Beat THE DECK</span> to win the game!
          </p>
        </div>
      </div>
    </div>
  )
}

