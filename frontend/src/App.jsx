import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import LandingPage from './components/LandingPage'
import Lobby from './components/Lobby'
import GameRoom from './components/GameRoom'
import GameEnd from './components/GameEnd'
import Notification from './components/Notification'
import BuyBackModal from './components/BuyBackModal'

function App() {
  const { gameState, initSocket, disconnect } = useGameStore()

  useEffect(() => {
    initSocket()
    // Don't disconnect on unmount - let socket.io handle reconnection automatically
    // This allows players to leave the site and come back without losing connection
  }, [initSocket])

  const renderScreen = () => {
    switch (gameState) {
      case 'landing':
        return <LandingPage />
      case 'lobby':
        return <Lobby />
      case 'playing':
        return <GameRoom />
      case 'ended':
        return <GameEnd />
      default:
        return <LandingPage />
    }
  }

  return (
    <div className="w-full min-h-screen gradient-mesh">
      <div className="w-full min-h-screen flex flex-col safe-area-padding">
        {renderScreen()}
        <Notification />
        <BuyBackModal />
      </div>
    </div>
  )
}

export default App

