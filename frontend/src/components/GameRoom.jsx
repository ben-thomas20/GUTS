import { useState, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import Card from './Card'
import Timer from './Timer'
import PlayerList from './PlayerList'
import RevealScreen from './RevealScreen'
import DeckShowdown from './DeckShowdown'
import EmotePicker from './EmotePicker'

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
    showBuyBackModal,
    makeDecision,
    isHost,
    endGame
  } = useGameStore()

  const [isDealing, setIsDealing] = useState(false)
  const [previousRound, setPreviousRound] = useState(0)
  const [hasAnimatedDecision, setHasAnimatedDecision] = useState(false)
  const [cardsTimeout, setCardsTimeout] = useState(false)

  // Reset when round changes
  useEffect(() => {
    if (round !== previousRound) {
      setPreviousRound(round)
      setIsDealing(false)
      setHasAnimatedDecision(false)
      setCardsTimeout(false)
    }
  }, [round, previousRound])

  // Trigger animation when new cards are dealt
  useEffect(() => {
    if (myCards.length > 0 && round === previousRound && !myDecision && !isDealing) {
      // Cards received for current round, trigger dealing animation
      setIsDealing(true)
      setHasAnimatedDecision(false) // Reset decision animation for new round
      setCardsTimeout(false) // Reset timeout flag
      
      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setIsDealing(false)
      }, 1000) // Slightly longer than animation duration
      
      return () => clearTimeout(timer)
    } else if (timerActive && myCards.length === 0) {
      // Timer started but no cards yet - set timeout warning
      const timeout = setTimeout(() => {
        setCardsTimeout(true)
      }, 3000) // 3 seconds after timer starts
      
      return () => clearTimeout(timeout)
    } else if (myCards.length > 0 && myDecision) {
      // If decision is made, stop dealing animation
      setIsDealing(false)
    }
  }, [myCards.length, timerActive, myDecision, round, previousRound, isDealing])

  // Trigger decision animation when decision is made
  useEffect(() => {
    if (myDecision && !hasAnimatedDecision) {
      setHasAnimatedDecision(true)
    }
  }, [myDecision, hasAnimatedDecision])

  const showDecisionButtons = timerActive && !myDecision && myCards.length > 0
  const showWaiting = timerActive && myDecision
  const showReveal = revealData && !showdownData
  // Only show deck showdown if we have showdown data (skip reveal if going straight to showdown)
  const showDeckShowdown = showdownData

  const handleEndGame = () => {
    if (window.confirm('Are you sure you want to end the game? This will end the game for all players.')) {
      endGame()
    }
  }

  return (
    <div className="min-h-full flex flex-col pt-6 pb-6 safe-area-padding relative" style={{ overflow: 'visible' }}>
      
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
      <div className="flex-shrink-0 mb-4" style={{ overflow: 'visible' }}>
        <PlayerList />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center min-h-0 mb-4">
        {showDeckShowdown ? (
          <div className="w-full min-h-full">
            <DeckShowdown />
          </div>
        ) : showReveal ? (
          <div className="w-full min-h-full overflow-y-auto">
            <RevealScreen />
          </div>
        ) : (
          <>
            {/* Player's Cards */}
            {myCards.length > 0 && (
              <div className={`${myDecision === 'hold' ? 'mb-12 mt-4' : 'mb-6'}`}>
                <p className={`text-white/60 text-sm text-center font-semibold tracking-wide uppercase ${myDecision === 'hold' ? 'mb-6' : 'mb-4'}`}>Your Hand</p>
                <div className={`flex justify-center ${myDecision === 'hold' ? 'gap-6' : 'space-x-4'}`}>
                  {myCards.map((card, index) => (
                    <Card 
                      key={`${card.rank}-${card.suit}-${index}-${myDecision || 'none'}`} 
                      card={card} 
                      index={index}
                      isDealing={isDealing}
                      decision={myDecision}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Waiting Message */}
            {showWaiting && (
              <div className={`text-center bg-white/10 border border-white/20 rounded-xl p-6 ${myDecision === 'hold' ? 'mt-8' : ''}`}>
                <p className="text-white text-xl mb-2 font-semibold">
                  You chose to <span className="font-black text-blue-400">{myDecision.toUpperCase()}</span>
                </p>
                <p className="text-white/60 font-medium">Waiting for other players...</p>
              </div>
            )}

            {/* Show message if waiting for buy-back and no other content */}
            {myCards.length === 0 && !revealData && !showdownData && !timerActive && showBuyBackModal && (
              <div className="text-center bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-6 max-w-md">
                <p className="text-yellow-400 text-xl font-bold mb-2">⚠️ Buy-Back Required</p>
                <p className="text-white/80 font-medium mb-2">Please use the buy-back modal to continue playing.</p>
                <p className="text-white/60 text-sm">The round cannot start until all players can afford the ante.</p>
              </div>
            )}
            
            {/* No Cards Yet */}
            {myCards.length === 0 && !revealData && !showdownData && !timerActive && !showBuyBackModal && (
              <div className="text-center text-white/50">
                <div className="animate-pulse">
                  <p className="font-semibold">Waiting for cards...</p>
                </div>
              </div>
            )}
            
            {/* Cards should arrive but haven't - show error after delay */}
            {myCards.length === 0 && timerActive && !cardsTimeout && (
              <div className="text-center text-white/50">
                <div className="animate-pulse">
                  <p className="font-semibold">Dealing cards...</p>
                </div>
              </div>
            )}
            
            {myCards.length === 0 && cardsTimeout && (
              <div className="text-center bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                <p className="text-red-400 font-semibold">Cards not received</p>
                <p className="text-white/60 text-sm mt-1">Please refresh or contact support</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Decision Buttons - Pushed to bottom */}
      {showDecisionButtons && (
        <div className="flex-shrink-0 grid grid-cols-2 gap-4 mt-auto pb-2 w-full">
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
      
      {/* Exit Game Button (Host Only) - Bottom Center - Show when not making decision and not in reveal/showdown */}
      {isHost && !showDecisionButtons && !showReveal && !showDeckShowdown && (
        <div className="flex-shrink-0 flex justify-center pb-4 pt-2">
          <button
            onClick={handleEndGame}
            className="bg-red-600/80 hover:bg-red-700/90 border border-red-500/50 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-lg active:scale-95 transition-all"
            style={{ minHeight: '36px' }}
            title="End Game"
          >
            Exit Game
          </button>
        </div>
      )}
      
      {/* Emote Picker */}
      <EmotePicker />
    </div>
  )
}
