import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

export default function Lobby() {
  const { roomCode, players, isHost, playerId, myBuyInAmount, setMyBuyIn, startGame, leaveGame } = useGameStore()
  const [localBuyIn, setLocalBuyIn] = useState(myBuyInAmount || 20)

  // Sync local buy-in with store
  useEffect(() => {
    setLocalBuyIn(myBuyInAmount || 20)
  }, [myBuyInAmount])

  const handleBuyInChange = (amount) => {
    setLocalBuyIn(amount)
    setMyBuyIn(amount)
  }

  const handleStartGame = () => {
    if (players.length < 2) {
      alert('Need at least 2 players to start')
      return
    }
    startGame()
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode)
    alert('Room code copied!')
  }

  return (
    <div className="h-full flex flex-col p-4 safe-area-padding">
      {/* Header with Room Code */}
      <div className="flex-shrink-0 bg-white/10 rounded-xl border border-white/20 p-6 mb-4 shadow-xl">
        <div className="text-center">
          <p className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-2">Room Code</p>
          <button
            onClick={copyRoomCode}
            className="text-5xl font-black text-white tracking-widest hover:text-blue-400 transition-colors active:scale-95"
          >
            {roomCode}
          </button>
          <p className="text-white/50 text-xs mt-2 font-medium">Tap to copy • Share with friends</p>
        </div>
      </div>

      {/* Buy-in Settings - All Players */}
      <div className="flex-shrink-0 bg-white/10 rounded-xl border border-white/20 p-5 mb-4">
        <label className="block text-white/80 text-sm font-bold tracking-wide mb-3 uppercase">
          Your Buy-in Amount
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={localBuyIn}
            onChange={(e) => handleBuyInChange(Number(e.target.value))}
            className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="text-3xl font-bold text-white bg-white/10 px-5 py-2 rounded-lg min-w-[90px] text-center border border-white/20">
            ${localBuyIn}
          </div>
        </div>
        <p className="text-white/50 text-xs mt-2 font-medium">Each player sets their own buy-in</p>
      </div>

      {/* Players List */}
      <div className="flex-1 bg-white/10 rounded-xl border border-white/20 p-4 mb-4 overflow-hidden flex flex-col">
        <h3 className="text-white/80 font-bold text-sm tracking-wide uppercase mb-3 flex-shrink-0">
          Players <span className="text-blue-400">({players.length}/8)</span>
        </h3>
        <div className="flex-1 overflow-y-auto custom-scroll space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-white/5 rounded-lg p-3 flex items-center justify-between border border-white/10 hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-white font-semibold">{player.name}</span>
                  <p className="text-white/60 text-xs font-medium">Buy-in: ${(player.buyInAmount || 20).toFixed(0)}</p>
                </div>
              </div>
              {player.isHost && (
                <span className="bg-orange-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg">
                  HOST
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 space-y-3">
        {isHost ? (
          <button
            onClick={handleStartGame}
            disabled={players.length < 2}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-xl rounded-xl shadow-lg active:scale-95 transition-all"
            style={{ minHeight: '44px' }}
          >
            Start Game
          </button>
        ) : (
          <div className="bg-white/10 rounded-xl border border-white/20 p-4 text-center">
            <p className="text-white/70 font-medium">Waiting for host to start game...</p>
          </div>
        )}
        <button
          onClick={leaveGame}
          className="w-full py-3 bg-white/5 hover:bg-red-600/30 border border-white/20 hover:border-red-500/50 text-white/80 hover:text-white font-semibold text-base rounded-xl active:scale-95 transition-all"
          style={{ minHeight: '44px' }}
        >
          Leave Game
        </button>
      </div>
    </div>
  )
}
