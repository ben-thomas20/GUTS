import { useGameStore } from '../store/gameStore'
import Card from './Card'

export default function DeckShowdown() {
  const { showdownData } = useGameStore()

  if (!showdownData) return null

  return (
    <div className="w-full text-center">
      <h2 className="text-white text-3xl font-black mb-2">
        {showdownData.player.playerName} vs THE DECK
      </h2>
      <p className="text-orange-400 text-lg font-bold mb-6 uppercase tracking-wide">Single holder must beat THE DECK!</p>

      {/* Player's Hand */}
      <div className="mb-8">
        <p className="text-white/60 text-sm mb-3 font-semibold uppercase tracking-wide">{showdownData.player.playerName}</p>
        <div className="flex space-x-3 justify-center mb-3">
          {showdownData.playerCards.map((card, idx) => (
            <Card key={idx} card={card} small />
          ))}
        </div>
        <p className="text-white font-bold text-lg text-blue-400">
          {showdownData.playerHandType}
        </p>
      </div>

      {/* VS Divider */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
          <span className="text-white/50 text-3xl font-black mx-6">VS</span>
          <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        </div>
      </div>

      {/* THE DECK's Hand */}
      <div className="mb-8">
        <p className="text-white/60 text-sm mb-3 font-semibold uppercase tracking-wide">THE DECK</p>
        <div className="flex space-x-3 justify-center mb-3 animate-pulse">
          {showdownData.deckCards.map((card, idx) => (
            <Card key={idx} card={card} small />
          ))}
        </div>
        <p className="text-white font-bold text-lg text-red-400">
          {showdownData.deckHandType}
        </p>
      </div>

      {/* Resolving */}
      <div className="bg-white/10 border border-white/20 rounded-xl p-4 animate-pulse">
        <p className="text-white/70 font-semibold">Resolving showdown...</p>
      </div>
    </div>
  )
}
