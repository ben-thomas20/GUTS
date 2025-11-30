import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import Card from './Card'

export default function DeckShowdown() {
  const { showdownData, showdownResult, showdownPhase, myCards, playerId, isHost, nextRound } = useGameStore()
  const [phase, setPhase] = useState('initial')
  const [dealerCardsVisible, setDealerCardsVisible] = useState(false)
  const [resultVisible, setResultVisible] = useState(false)

  useEffect(() => {
    if (!showdownData) return
    
    // Start with initial state (cards at normal size)
    setPhase('initial')
    setDealerCardsVisible(false)
    setResultVisible(false)
    
    // Small delay to ensure DOM is ready, then start transition (slower)
    const transitionTimer = setTimeout(() => {
      setPhase('transition')
    }, 300)
    
    // After player cards shrink, show dealer cards (much slower pace)
    const dealingTimer = setTimeout(() => {
      setPhase('dealing')
      setDealerCardsVisible(true)
    }, 4000) // 300ms initial + 3700ms transition (slower)
    
    return () => {
      clearTimeout(transitionTimer)
      clearTimeout(dealingTimer)
    }
  }, [showdownData])

  useEffect(() => {
    if (showdownResult) {
      // After dealer cards are dealt, show result (much slower pace)
      const resultTimer = setTimeout(() => {
        setPhase('result')
        setResultVisible(true)
      }, 6000) // Slower: 6 seconds (allows time for 3 cards to deal with slower animation)
      
      return () => clearTimeout(resultTimer)
    }
  }, [showdownResult])

  if (!showdownData) return null

  const isPlayer = showdownData.player.playerId === playerId
  const playerWon = showdownResult?.playerWon
  const isWinner = isPlayer && playerWon

  return (
    <div className="w-full min-h-full flex flex-col px-6 pb-6">
      {/* Header */}
      <div className="text-center mb-4 flex-shrink-0">
        <h2 className="text-white text-2xl sm:text-3xl font-black mb-2">
          {showdownData.player.playerName} vs THE DECK
        </h2>
      </div>

      {/* Top/Bottom layout for mobile, side-by-side for desktop */}
      <div className="flex-1 flex flex-col gap-6 sm:gap-8 min-h-0">
        {/* THE DECK's Hand - Top */}
        <div className="flex flex-col items-center flex-shrink-0">
          <p className="text-white/60 text-sm mb-3 font-semibold uppercase tracking-wide">THE DECK</p>
          <div className={`flex justify-center mb-3 ${!playerWon && resultVisible ? 'gap-6 sm:gap-8' : 'space-x-2 sm:space-x-3'} min-h-[112px]`}>
            {dealerCardsVisible ? (
              showdownData.deckCards.map((card, idx) => (
                <Card 
                  key={idx} 
                  card={card} 
                  small 
                  index={idx}
                  isDealing={phase === 'dealing'}
                  decision={null}
                  className={!playerWon && resultVisible ? 'winner-highlight' : ''}
                />
              ))
            ) : (
              // Placeholder to maintain layout
              <div className="flex space-x-2 sm:space-x-3">
                {showdownData.deckCards.map((_, idx) => (
                  <div key={idx} className="w-16 h-28 sm:w-20 sm:h-28" /> // Match small card size
                ))}
              </div>
            )}
          </div>
          <p className={`text-white font-bold text-base sm:text-lg transition-colors duration-500 ${!playerWon && resultVisible ? 'text-green-400' : 'text-red-400'}`}>
            {dealerCardsVisible ? showdownData.deckHandType : ''}
          </p>
        </div>

        {/* Player's Hand - Bottom */}
        <div className={`flex flex-col items-center flex-shrink-0 ${phase === 'transition' || phase === 'dealing' || phase === 'result' ? 'showdown-player-cards' : ''}`}>
          <p className="text-white/60 text-sm mb-3 font-semibold uppercase tracking-wide">{showdownData.player.playerName}</p>
          <div className={`flex justify-center mb-3 ${isWinner && resultVisible ? 'gap-6 sm:gap-8' : 'space-x-2 sm:space-x-3'}`}>
            {showdownData.playerCards.map((card, idx) => (
              <Card 
                key={idx} 
                card={card} 
                small={phase === 'transition' || phase === 'dealing' || phase === 'result'}
                index={idx}
                isDealing={false}
                decision={null}
                className={isWinner && resultVisible ? 'winner-highlight' : ''}
              />
            ))}
          </div>
          <p className={`text-white font-bold text-base sm:text-lg transition-colors duration-500 ${isWinner && resultVisible ? 'text-green-400' : 'text-blue-400'}`}>
            {showdownData.playerHandType}
          </p>
        </div>

        {/* Result Message */}
        {resultVisible && showdownResult && (
          <div className={`max-w-2xl mx-auto mt-4 sm:mt-6 bg-white/10 border-2 rounded-xl p-4 sm:p-6 transition-all duration-700 flex-shrink-0 ${
            playerWon 
              ? 'border-green-400 bg-green-400/10' 
              : 'border-red-400 bg-red-400/10'
          }`}>
            <p className={`text-xl sm:text-2xl font-black mb-2 text-center ${
              playerWon ? 'text-green-400' : 'text-red-400'
            }`}>
              {playerWon ? '🎉 PLAYER WINS!' : '💀 THE DECK WINS!'}
            </p>
            <p className="text-white/80 font-semibold text-center text-sm sm:text-base">
              {playerWon ? (
                <>{showdownData.player.playerName} wins ${showdownResult.pot.toFixed(2)}!</>
              ) : (
                <>{showdownData.player.playerName} must match ${showdownResult.matchAmount?.toFixed(2) || showdownResult.pot.toFixed(2)}</>
              )}
            </p>
          </div>
        )}

        {/* Resolving (shown during dealing phase) */}
        {phase === 'dealing' && !resultVisible && (
          <div className="max-w-2xl mx-auto mt-4 sm:mt-6 bg-white/10 border border-white/20 rounded-xl p-3 sm:p-4 flex-shrink-0">
            <p className="text-white/70 font-semibold text-center text-sm sm:text-base">Dealing THE DECK's cards...</p>
          </div>
        )}
      </div>

      {/* Continue Button (Host Only) - At bottom */}
      {showdownResult && (
        <div className="w-full max-w-2xl mx-auto mt-4 sm:mt-6 flex-shrink-0 pb-2">
          {isHost ? (
            <button
              onClick={nextRound}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg sm:text-xl rounded-xl shadow-lg active:scale-95 transition-all"
              style={{ minHeight: '44px' }}
            >
              {showdownResult.gameEnded ? 'View Final Results' : 'Continue to Next Round'}
            </button>
          ) : (
            <div className="text-center py-3 bg-white/10 rounded-xl border border-white/20">
              <p className="text-white/70 font-semibold text-sm sm:text-base">Waiting for host to continue...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
