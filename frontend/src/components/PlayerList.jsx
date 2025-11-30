import { useGameStore } from '../store/gameStore'

export default function PlayerList() {
  const { players, playerId, decidedPlayers } = useGameStore()

  const getBalanceColor = (balance) => {
    if (balance > 5) return 'text-green-400'
    if (balance >= 1) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="bg-white/10 rounded-xl border border-white/20 p-3">
      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scroll">
        {players.map((player) => {
          const isMe = player.id === playerId
          const hasDecided = decidedPlayers.includes(player.id)
          
          return (
            <div
              key={player.id}
              className={`rounded-lg p-2 flex items-center justify-between transition-all ${
                isMe 
                  ? 'bg-blue-600/20 border border-blue-500/50' 
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isMe 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-white/20 text-white/70'
                }`}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">
                    {isMe ? 'You' : player.name}
                  </p>
                  <p className={`text-xs font-bold ${getBalanceColor(player.balance)}`}>
                    ${player.balance.toFixed(2)}
                  </p>
                </div>
              </div>
              {hasDecided && (
                <div className="flex-shrink-0 ml-2">
                  <span className="text-green-400 text-base">✓</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
