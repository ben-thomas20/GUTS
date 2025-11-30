import { useGameStore } from '../store/gameStore'

export default function Timer() {
  const { timerRemaining, timerActive, timerDuration } = useGameStore()

  if (!timerActive) {
    return (
      <div className="text-center">
        <p className="text-white/50 text-xs font-bold tracking-wider uppercase mb-1">Timer</p>
        <p className="text-white/30 text-3xl font-black">--</p>
      </div>
    )
  }

  const duration = timerDuration || 30

  const getColor = () => {
    if (timerRemaining <= 5) return 'text-red-400'
    if (timerRemaining <= 10) return 'text-yellow-400'
    return 'text-white'
  }

  const getProgressColor = () => {
    if (timerRemaining <= 5) return '#EF4444'
    if (timerRemaining <= 10) return '#FBBF24'
    return '#3B82F6'
  }

  const radius = 22
  const circumference = 2 * Math.PI * radius
  const progress = (timerRemaining / duration) * circumference

  return (
    <div className="text-center">
      <p className="text-white/50 text-xs font-bold tracking-wider uppercase mb-1">Timer</p>
      <div className="relative inline-flex items-center justify-center">
        <svg width="56" height="56" className="transform -rotate-90">
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="5"
            fill="none"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke={getProgressColor()}
            strokeWidth="5"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span className={`absolute ${getColor()} text-2xl font-black`}>
          {timerRemaining}
        </span>
      </div>
    </div>
  )
}
