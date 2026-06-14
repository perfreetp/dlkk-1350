import { useGameStore } from '../store/gameStore'
import { formatTime, formatMoney } from '../utils/format'

const TopBar = () => {
  const { day, time, speed, isPaused, money, stats, togglePause, setSpeed } = useGameStore()

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <div className="time-display">
          <span className="day">第 {day} 天</span>
          <span className="time">{formatTime(time)}</span>
        </div>
        <div className="speed-controls">
          <button
            className={`pause-btn ${isPaused ? 'paused' : ''}`}
            onClick={togglePause}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
          <button
            className={`speed-btn ${speed === 1 ? 'active' : ''}`}
            onClick={() => setSpeed(1)}
          >
            1x
          </button>
          <button
            className={`speed-btn ${speed === 2 ? 'active' : ''}`}
            onClick={() => setSpeed(2)}
          >
            2x
          </button>
          <button
            className={`speed-btn ${speed === 4 ? 'active' : ''}`}
            onClick={() => setSpeed(4)}
          >
            4x
          </button>
        </div>
      </div>
      <div className="top-bar-right">
        <div className="stat-mini money">
          <span className="label">资金</span>
          <span className="value">{formatMoney(money)}</span>
        </div>
        <div className="stat-mini satisfaction">
          <span className="label">满意度</span>
          <span className="value">{stats.satisfaction}%</span>
        </div>
      </div>
    </div>
  )
}

export default TopBar
