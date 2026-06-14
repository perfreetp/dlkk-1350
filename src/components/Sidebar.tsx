import { useGameStore } from '../store/gameStore'

const navItems = [
  { id: 'map', label: '城市地图', icon: '🗺️' },
  { id: 'tasks', label: '任务面板', icon: '📋' },
  { id: 'fleet', label: '车队调度', icon: '🚚' },
  { id: 'events', label: '事件中心', icon: '⚡' },
  { id: 'repair', label: '维修车间', icon: '🔧' },
  { id: 'rules', label: '规则设置', icon: '⚙️' },
  { id: 'stats', label: '运营结算', icon: '📊' },
  { id: 'achievements', label: '成就挑战', icon: '🏆' },
]

const Sidebar = () => {
  const { activePanel, setActivePanel } = useGameStore()

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>🚲 电单车调度</h1>
        <p>运营模拟系统</p>
      </div>
      <div className="sidebar-nav">
        {navItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activePanel === item.id ? 'active' : ''}`}
            onClick={() => setActivePanel(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        <p>v1.0.0 | 运营培训模拟</p>
      </div>
    </div>
  )
}

export default Sidebar
