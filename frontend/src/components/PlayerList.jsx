import { useGameStore } from '../store/gameStore'

export default function PlayerList() {
  const { players, playerId, decidedPlayers, activeEmotes, openEmotePicker } = useGameStore()

  const getBalanceColor = (balance) => {
    if (balance > 5) return 'text-green-400'
    if (balance >= 1) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="bg-white/10 rounded-xl border border-white/20 p-3">
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto custom-scroll">
        {players.map((player) => {
          const isMe = player.id === playerId
          const hasDecided = decidedPlayers.includes(player.id)
          
          const playerEmote = activeEmotes[player.id]
          
          return (
            <div
              key={player.id}
              className={`rounded-lg p-3 min-h-[100px] flex items-center justify-between transition-all relative ${
                isMe 
                  ? 'bg-blue-600/20 border border-blue-500/50 cursor-pointer hover:bg-blue-600/30' 
                  : 'bg-white/5 border border-white/10'
              }`}
              onClick={isMe ? openEmotePicker : undefined}
              title={isMe ? 'Click to send an emote' : undefined}
            >
              {/* Player info - on the left side */}
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
              
              {/* Emote - on the right side */}
              {playerEmote && (
                <div 
                  className={`flex-shrink-0 ml-2 pointer-events-none ${
                    playerEmote.fading ? 'animate-fade-out' : 'animate-fade-in'
                  }`}
                >
                  <div className="relative" style={{ width: '64px', height: '64px' }}>
                    {/* Highlighted border/glow effect */}
                    <div className="absolute inset-0 rounded-lg bg-blue-500/40 blur-sm -z-10 scale-110"></div>
                    <div className="absolute inset-0 rounded-lg border-2 border-blue-400/60 shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
                    <img
                      src={playerEmote.emoteUrl}
                      alt="Emote"
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Decision checkmark - on the far right */}
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
