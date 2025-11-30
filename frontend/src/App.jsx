import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import LandingPage from './components/LandingPage'
import Lobby from './components/Lobby'
import GameRoom from './components/GameRoom'
import GameEnd from './components/GameEnd'
import Notification from './components/Notification'

function App() {
  const { gameState, initSocket, disconnect } = useGameStore()

  useEffect(() => {
    initSocket()
    return () => disconnect()
  }, [initSocket, disconnect])

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
    <div className="w-screen h-screen bg-black overflow-hidden gradient-mesh">
      {renderScreen()}
      <Notification />
    </div>
  )
}

export default App

