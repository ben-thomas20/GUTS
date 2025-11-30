import { useGameStore } from '../store/gameStore'
import Card from './Card'

export default function RevealScreen() {
  const { revealData, multipleHoldersResult, isHost, nextRound } = useGameStore()

  if (!revealData) return null

  const holders = revealData.decisions.filter(d => d.decision === 'hold')
  const droppers = revealData.decisions.filter(d => d.decision === 'drop')

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto custom-scroll px-4 pb-4">
        <h2 className="text-white text-3xl font-black text-center mb-6 pt-4 bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
          Round Results
        </h2>

      {/* Winner Announcement (if multiple holders) */}
      {multipleHoldersResult && (
        <div className="mb-6 bg-orange-500/20 border-2 border-orange-500 rounded-xl p-5 shadow-xl">
          <p className="text-orange-400 text-2xl font-black text-center mb-2">
            🏆 {multipleHoldersResult.winner.playerName} Wins!
          </p>
          <p className="text-white text-center font-semibold">
            {multipleHoldersResult.winner.handType} • <span className="text-green-400 font-bold">${multipleHoldersResult.winAmount.toFixed(2)}</span>
          </p>
        </div>
      )}

      {/* Players who HELD */}
      {holders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-orange-400 font-bold text-base mb-4 text-center uppercase tracking-wider">
            Held ({holders.length})
          </h3>
          <div className="space-y-3">
            {holders.map((player) => {
              const isWinner = multipleHoldersResult && player.playerId === multipleHoldersResult.winner.playerId
              return (
                <div 
                  key={player.playerId} 
                  className={`rounded-xl p-4 border-2 transition-all ${
                    isWinner 
                      ? 'bg-orange-500/20 border-orange-500 shadow-lg' 
                      : 'bg-white/10 border-red-500/50'
                  }`}
                >
                  <p className="text-white font-bold mb-3 text-center text-lg">
                    {player.playerName}
                    {isWinner && ' 👑'}
                  </p>
                  <div className="flex space-x-2 justify-center">
                    {player.cards.map((card, idx) => (
                      <Card key={idx} card={card} small />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Players who DROPPED */}
      {droppers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-white/50 font-bold text-base mb-4 text-center uppercase tracking-wider">
            Dropped ({droppers.length})
          </h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {droppers.map((player) => (
              <div key={player.playerId} className="bg-white/10 border border-white/20 rounded-lg px-4 py-2">
                <p className="text-white/70 text-sm font-medium">{player.playerName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>

      {/* Fixed Bottom Section - Always Visible */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3">
        {/* Next Round Button (Host Only) */}
        {isHost && (
          <button
            onClick={nextRound}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl rounded-xl shadow-lg active:scale-95 transition-all"
            style={{ minHeight: '44px' }}
          >
            Continue to Next Round
          </button>
        )}
        
        {/* Non-host waiting message */}
        {!isHost && (
          <div className="text-center py-3 bg-white/10 rounded-xl border border-white/20">
            <p className="text-white/70 font-semibold">Waiting for host to continue...</p>
          </div>
        )}
      </div>
    </div>
  )
}
