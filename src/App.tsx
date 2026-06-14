import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import MapView from './components/MapView'
import TaskPanel from './components/TaskPanel'
import FleetDispatch from './components/FleetDispatch'
import EventSystem from './components/EventSystem'
import RepairShop from './components/RepairShop'
import RulesSettings from './components/RulesSettings'
import StatsPanel from './components/StatsPanel'
import Achievements from './components/Achievements'
import ChallengeSelect from './components/ChallengeSelect'

function App() {
  const { activePanel, tick, isPaused } = useGameStore()

  useEffect(() => {
    const interval = setInterval(() => {
      tick()
    }, 500)

    return () => clearInterval(interval)
  }, [tick])

  const renderContent = () => {
    switch (activePanel) {
      case 'map':
        return <MapView />
      case 'tasks':
        return <TaskPanel />
      case 'fleet':
        return <FleetDispatch />
      case 'events':
        return <EventSystem />
      case 'repair':
        return <RepairShop />
      case 'rules':
        return <RulesSettings />
      case 'stats':
        return <StatsPanel />
      case 'achievements':
        return <Achievements />
      default:
        return <MapView />
    }
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="content-area">
          {renderContent()}
        </div>
      </div>
      <ChallengeSelect />
    </div>
  )
}

export default App
