import { useGameStore } from '../store/gameStore'

export default function Notification() {
  const { notification } = useGameStore()

  if (!notification) return null

  const bgColors = {
    info: 'bg-blue-600 border-blue-500',
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    warning: 'bg-orange-500 border-orange-400'
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
      <div className={`${bgColors[notification.type] || bgColors.info} border text-white px-5 py-4 rounded-xl shadow-2xl`}>
        <p className="text-center font-bold tracking-wide">{notification.message}</p>
      </div>
    </div>
  )
}
