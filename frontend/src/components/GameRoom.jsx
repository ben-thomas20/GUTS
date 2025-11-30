import { useGameStore } from '../store/gameStore'
import Card from './Card'
import Timer from './Timer'
import PlayerList from './PlayerList'
import RevealScreen from './RevealScreen'
import DeckShowdown from './DeckShowdown'

export default function GameRoom() {
  const {
    round,
    pot,
    isNothingRound,
    myCards,
    timerActive,
    myDecision,
    revealData,
    showdownData,
    makeDecision
  } = useGameStore()

  const showDecisionButtons = timerActive && !myDecision && myCards.length > 0
  const showWaiting = timerActive && myDecision
  const showReveal = revealData && !showdownData
  const showDeckShowdown = showdownData

  return (
    <div className="h-full flex flex-col p-4 safe-area-padding">
      {/* Header Info */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/10 rounded-xl border border-white/20 p-4 text-center">
          <p className="text-white/50 text-xs font-bold tracking-wider uppercase mb-1">Round</p>
          <p className="text-white text-3xl font-black">{round}</p>
          {isNothingRound && (
            <p className="text-orange-400 text-xs font-bold mt-1 tracking-wide">NOTHING</p>
          )}
        </div>
        <div className="bg-white/10 rounded-xl border border-white/20 p-4 text-center">
          <p className="text-white/50 text-xs font-bold tracking-wider uppercase mb-1">Pot</p>
          <p className="text-2xl font-black text-green-400">
            ${pot.toFixed(2)}
          </p>
        </div>
        <div className="bg-white/10 rounded-xl border border-white/20 p-4">
          <Timer />
        </div>
      </div>

      {/* Player List */}
      <div className="flex-shrink-0 mb-4">
        <PlayerList />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center overflow-hidden">
        {showDeckShowdown ? (
          <DeckShowdown />
        ) : showReveal ? (
          <div className="w-full h-full overflow-y-auto">
            <RevealScreen />
          </div>
        ) : (
          <>
            {/* Player's Cards */}
            {myCards.length > 0 && (
              <div className="mb-6">
                <p className="text-white/60 text-sm text-center mb-4 font-semibold tracking-wide uppercase">Your Hand</p>
                <div className="flex space-x-4 justify-center">
                  {myCards.map((card, index) => (
                    <Card key={index} card={card} />
                  ))}
                </div>
              </div>
            )}

            {/* Waiting Message */}
            {showWaiting && (
              <div className="text-center bg-white/10 border border-white/20 rounded-xl p-6">
                <p className="text-white text-xl mb-2 font-semibold">
                  You chose to <span className="font-black text-blue-400">{myDecision.toUpperCase()}</span>
                </p>
                <p className="text-white/60 font-medium">Waiting for other players...</p>
              </div>
            )}

            {/* No Cards Yet */}
            {myCards.length === 0 && !revealData && (
              <div className="text-center text-white/50">
                <div className="animate-pulse">
                  <p className="font-semibold">Waiting for cards...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Decision Buttons */}
      {showDecisionButtons && (
        <div className="flex-shrink-0 grid grid-cols-2 gap-4">
          <button
            onClick={() => makeDecision('drop')}
            className="py-6 bg-gray-700 hover:bg-gray-600 border-2 border-gray-600 hover:border-white/30 text-white font-bold text-2xl rounded-xl shadow-lg active:scale-95 transition-all"
            style={{ minHeight: '60px' }}
          >
            DROP
          </button>
          <button
            onClick={() => makeDecision('hold')}
            className="py-6 bg-red-600 hover:bg-red-700 text-white font-bold text-2xl rounded-xl shadow-lg active:scale-95 transition-all"
            style={{ minHeight: '60px' }}
          >
            HOLD
          </button>
        </div>
      )}
    </div>
  )
}
