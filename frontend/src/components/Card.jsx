export default function Card({ card, small = false }) {
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

  return (
    <div className={`${cardSize} bg-white rounded-lg shadow-lg flex flex-col justify-between p-2 relative overflow-hidden`}>
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
  )
}

