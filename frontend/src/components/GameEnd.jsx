import { useGameStore } from '../store/gameStore'

export default function GameEnd() {
  const { finalStandings, leaveGame } = useGameStore()

  if (!finalStandings || finalStandings.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-white text-xl font-semibold">Game Ended</p>
      </div>
    )
  }

  const winner = finalStandings[0]

  return (
    <div className="min-h-full flex flex-col p-6 pb-8 safe-area-padding">
      {/* Winner Announcement */}
      <div className="flex-shrink-0 text-center mb-8">
        <h1 className="text-6xl font-black mb-3">🎉</h1>
        <h2 className="text-4xl font-black text-white mb-3">
          {winner.playerName} Wins!
        </h2>
        <p className="text-2xl text-white/90 font-bold mb-2">
          Final Balance: <span className="text-green-400">${winner.balance.toFixed(2)}</span>
        </p>
        <p className="text-lg text-white/70 font-semibold">
          Profit: <span className={winner.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
            {winner.profit >= 0 ? '+' : ''}${winner.profit.toFixed(2)}
          </span>
        </p>
      </div>

      {/* Final Standings */}
      <div className="flex-1 bg-white/10 rounded-xl border border-white/20 p-5 mb-6 overflow-hidden flex flex-col">
        <h3 className="text-white/80 font-black text-lg mb-4 flex-shrink-0 uppercase tracking-wide">Final Standings</h3>
        <div className="flex-1 overflow-y-auto custom-scroll space-y-3">
          {finalStandings.map((player, index) => (
            <div
              key={player.playerId}
              className={`rounded-xl p-4 transition-all ${
                index === 0
                  ? 'bg-orange-500/20 border-2 border-orange-500 shadow-lg'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-white/40 font-black text-2xl w-10 text-center">
                    #{index + 1}
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                    index === 0 
                      ? 'bg-orange-500' 
                      : 'bg-gray-600'
                  }`}>
                    {player.playerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{player.playerName}</p>
                    <p className={`text-sm font-bold ${player.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {player.profit >= 0 ? '+' : ''}${player.profit.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-black text-2xl">
                    ${player.balance.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 space-y-3">
        <button
          onClick={leaveGame}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl rounded-xl shadow-lg active:scale-95 transition-all"
          style={{ minHeight: '44px' }}
        >
          New Game
        </button>
      </div>
    </div>
  )
}
