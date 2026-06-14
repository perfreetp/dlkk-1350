import { useGameStore } from '../store/gameStore'
import { 
  getEventTypeLabel, getEventTypeIcon, 
  formatTime 
} from '../utils/format'
import { GameEvent, EventType } from '../types'

const EventSystem = () => {
  const { events, stations, time, addEvent, removeEvent } = useGameStore()

  const activeEvents = events.filter(e => 
    time >= e.startTime && time < e.startTime + e.duration
  )

  const upcomingEvents = events.filter(e => time < e.startTime)
  const pastEvents = events.filter(e => time >= e.startTime + e.duration)

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'severe': return '严重'
      case 'moderate': return '中等'
      case 'mild': return '轻微'
      default: return severity
    }
  }

  const triggerSampleEvent = () => {
    const eventTypes: EventType[] = ['rain', 'concert', 'subway_failure', 'illegal_parking']
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const severities: ('mild' | 'moderate' | 'severe')[] = ['mild', 'moderate', 'severe']
    const severity = severities[Math.floor(Math.random() * severities.length)]
    
    const stationIds = stations
      .filter(s => s.type !== 'no_parking' && s.type !== 'maintenance')
      .map(s => s.id)
    
    const numAffected = Math.floor(Math.random() * 3) + 1
    const affectedStations = stationIds
      .sort(() => Math.random() - 0.5)
      .slice(0, numAffected)

    const eventData: Record<EventType, { title: string; description: string; effects: GameEvent['effects'] }> = {
      rain: {
        title: '暴雨天气',
        description: '突降暴雨，骑行需求下降，车辆速度减慢',
        effects: { demandMultiplier: 0.5, speedMultiplier: 0.7, batteryDrainMultiplier: 1.3 }
      },
      concert: {
        title: '演唱会散场',
        description: '大型演唱会散场，周边站点需求暴增',
        effects: { demandMultiplier: 2.5 }
      },
      subway_failure: {
        title: '地铁故障',
        description: '地铁线路故障，大量乘客转骑电单车',
        effects: { demandMultiplier: 2.0 }
      },
      illegal_parking: {
        title: '集中乱停',
        description: '出现集中乱停现象，需要及时处理',
        effects: { parkingViolationRate: 3.0 }
      },
      peak_hour: {
        title: '高峰期',
        description: '早晚高峰时段，骑行需求旺盛',
        effects: { demandMultiplier: 1.8 }
      }
    }

    const data = eventData[type]

    addEvent({
      type,
      title: data.title,
      description: data.description,
      severity,
      startTime: time,
      duration: 30 + Math.floor(Math.random() * 60),
      affectedStations,
      effects: data.effects,
    })
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>⚡ 事件中心</h2>
        <button className="btn btn-warning btn-small" onClick={triggerSampleEvent}>
          模拟事件
        </button>
      </div>
      <div className="card-body">
        {activeEvents.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '12px', color: 'var(--danger)' }}>
              🔥 进行中事件 ({activeEvents.length})
            </h3>
            {activeEvents.map(event => {
              const progress = ((time - event.startTime) / event.duration) * 100
              const remaining = event.startTime + event.duration - time
              
              return (
                <div 
                  key={event.id} 
                  className={`event-banner ${event.severity}`}
                >
                  <div className="event-icon">{getEventTypeIcon(event.type)}</div>
                  <div className="event-content" style={{ flex: 1 }}>
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '6px', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        严重程度: <span style={{ color: event.severity === 'severe' ? 'var(--danger)' : event.severity === 'moderate' ? 'var(--warning)' : 'var(--info)' }}>
                          {getSeverityLabel(event.severity)}
                        </span>
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        剩余时间: {Math.floor(remaining)}分钟
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        影响站点: {event.affectedStations.length}个
                      </span>
                    </div>
                    <div className="progress-bar" style={{ marginTop: '8px' }}>
                      <div 
                        className={`progress-fill ${event.severity === 'severe' ? 'danger' : event.severity === 'moderate' ? 'warning' : ''}`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      ></div>
                    </div>
                  </div>
                  <button 
                    className="btn btn-secondary btn-small"
                    onClick={() => removeEvent(event.id)}
                  >
                    结束
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '12px', color: 'var(--warning)' }}>
              ⏰ 即将到来 ({upcomingEvents.length})
            </h3>
            {upcomingEvents.map(event => {
              const timeUntil = event.startTime - time
              return (
                <div 
                  key={event.id}
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    opacity: 0.7
                  }}
                >
                  <div style={{ fontSize: '20px' }}>{getEventTypeIcon(event.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{event.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {event.description}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {formatTime(event.startTime)} 开始
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div>
          <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>📋 事件类型说明</h3>
          <div className="panel-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-card)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>🌧️</span>
                <span style={{ fontWeight: '600' }}>暴雨天气</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                骑行需求下降50%，车辆速度减慢30%，电池消耗增加30%
              </p>
            </div>
            
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-card)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>🎵</span>
                <span style={{ fontWeight: '600' }}>演唱会散场</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                周边站点需求暴增150%，需要快速调度车辆补充
              </p>
            </div>
            
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-card)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>🚇</span>
                <span style={{ fontWeight: '600' }}>地铁故障</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                大量乘客转骑电单车，需求增加100%，枢纽站压力大
              </p>
            </div>
            
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-card)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <span style={{ fontWeight: '600' }}>集中乱停</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                乱停现象增加200%，需要及时处理避免罚款和投诉
              </p>
            </div>
          </div>
        </div>

        {activeEvents.length === 0 && upcomingEvents.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">☀️</div>
            <div className="empty-state-text">当前没有事件，运营平稳</div>
            <button 
              className="btn btn-primary btn-small"
              style={{ marginTop: '12px' }}
              onClick={triggerSampleEvent}
            >
              触发模拟事件
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default EventSystem
