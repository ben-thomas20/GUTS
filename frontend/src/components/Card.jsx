import { useState, useEffect } from 'react'

export default function Card({ card, small = false, index = 0, isDealing = false, decision = null, className = '' }) {
  const [shouldAnimate, setShouldAnimate] = useState(false)
  
  useEffect(() => {
    if (decision) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setShouldAnimate(true)
      }, 10)
      return () => clearTimeout(timer)
    } else {
      setShouldAnimate(false)
    }
  }, [decision])
  
  if (!card) return null

  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  }

  const suitColors = {
    hearts: 'text-card-red',
    diamonds: 'text-card-red',
    clubs: 'text-card-black',
    spades: 'text-card-black'
  }

  const cardSize = small
    ? 'w-20 h-28'
    : 'w-24 h-36'
  
  const fontSize = small
    ? 'text-base'
    : 'text-xl'
  
  const symbolSize = small
    ? 'text-2xl'
    : 'text-4xl'

  const animationDelay = index * 0.3 // Stagger cards by 300ms each (slower)

  // Determine animation class based on decision
  // Priority: decision animations > dealing animation
  let animationClass = ''
  let animationStyle = {}
  
  if (decision && shouldAnimate) {
    // Decision animation takes priority
    if (decision === 'drop') {
      animationClass = 'card-flip-down'
      animationStyle = { animationDelay: `${index * 0.1}s` } // Stagger flip
    } else if (decision === 'hold') {
      animationClass = 'card-hold-forward'
      animationStyle = { animationDelay: `${index * 0.1}s` } // Stagger forward
    }
  } else if (decision && !shouldAnimate) {
    // After animation completes, maintain state
    if (decision === 'drop') {
      animationClass = 'card-flipped'
    } else if (decision === 'hold') {
      animationClass = 'card-held'
    }
  } else if (isDealing) {
    // Only show dealing animation if no decision has been made
    animationClass = 'card-deal'
    animationStyle = { animationDelay: `${animationDelay}s` }
  }

  const isFlipped = decision === 'drop' && (shouldAnimate || animationClass === 'card-flipped')

  return (
    <div 
      className={`${cardSize} relative ${animationClass} ${className}`}
      style={{ ...animationStyle, perspective: '1000px' }}
    >
      <div 
        className="relative w-full h-full card-flip-container"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Card Front */}
        <div 
          className="absolute inset-0 bg-white rounded-lg shadow-lg flex flex-col justify-between p-2 card-front"
          style={{ 
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          {/* Top Left */}
          <div className={`${suitColors[card.suit]} ${fontSize} font-bold leading-tight`}>
            <div className="leading-none">{card.rank}</div>
            <div className="text-sm leading-none">{suitSymbols[card.suit]}</div>
          </div>

          {/* Center Symbol */}
          <div className={`flex items-center justify-center ${suitColors[card.suit]} ${symbolSize}`}>
            {suitSymbols[card.suit]}
          </div>

          {/* Bottom Right (upside down) */}
          <div className={`${suitColors[card.suit]} ${fontSize} font-bold leading-tight text-right`}>
            <div className="text-sm transform rotate-180 inline-block leading-none">{suitSymbols[card.suit]}</div>
            <div className="transform rotate-180 inline-block leading-none">{card.rank}</div>
          </div>
        </div>

        {/* Card Back */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center card-back"
          style={{ 
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="w-full h-full border-4 border-white/20 rounded-lg flex items-center justify-center">
            <div className="text-white/40 text-4xl font-black">♠</div>
          </div>
        </div>
      </div>
    </div>
  )
}

