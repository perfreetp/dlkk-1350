import { useGameStore } from '../store/gameStore'
import { 
  getEventTypeLabel, getEventTypeIcon, 
  formatTime 
} from '../utils/format'
import { GameEvent, EventType } from '../types'

const EventSystem = () => {
  const { events, stations, time, addEvent, removeEvent, stats } = useGameStore()

  const activeEvents = events.filter(e => 
    time >= e.startTime && time < e.startTime + e.duration
  )

  const upcomingEvents = events.filter(e => time < e.startTime)
  const pastEvents = events.filter(e => time >= e.startTime + e.duration)

  const demandMultiplier = activeEvents.reduce((acc, e) => 
    acc * (e.effects.demandMultiplier || 1), 1
  )
  const speedMultiplier = activeEvents.reduce((acc, e) => 
    acc * (e.effects.speedMultiplier || 1), 1
  )
  const violationMultiplier = activeEvents.reduce((acc, e) => 
    acc * (e.effects.parkingViolationRate || 1), 1
  )
  const batteryDrainMultiplier = activeEvents.reduce((acc, e) => 
    acc * (e.effects.batteryDrainMultiplier || 1), 1
  )
  const fineMultiplier = activeEvents.reduce((acc, e) => 
    acc * (e.effects.fineMultiplier || 1), 1
  )

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'severe': return '严重'
      case 'moderate': return '中等'
      case 'mild': return '轻微'
      default: return severity
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'var(--danger)'
      case 'moderate': return 'var(--warning)'
      case 'mild': return 'var(--info)'
      default: return 'var(--text-secondary)'
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

    const severityMultiplier = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.2 : 1.0

    const eventData: Record<EventType, { title: string; description: string; effects: GameEvent['effects'] }> = {
      rain: {
        title: '暴雨天气',
        description: '突降暴雨，骑行需求下降，车辆速度减慢，电池消耗增加',
        effects: { 
          demandMultiplier: 0.5 * severityMultiplier, 
          speedMultiplier: 0.7 / severityMultiplier, 
          batteryDrainMultiplier: 1.3 * severityMultiplier 
        }
      },
      concert: {
        title: '演唱会散场',
        description: '大型演唱会散场，周边站点需求暴增，拥堵加剧',
        effects: { demandMultiplier: 2.5 * severityMultiplier }
      },
      subway_failure: {
        title: '地铁故障',
        description: '地铁线路故障，大量乘客转骑电单车，枢纽站压力大',
        effects: { demandMultiplier: 2.0 * severityMultiplier }
      },
      illegal_parking: {
        title: '集中乱停',
        description: '出现集中乱停现象，违规率大幅上升，需要及时处理',
        effects: { 
          parkingViolationRate: 3.0 * severityMultiplier,
          fineMultiplier: 1.5 * severityMultiplier
        }
      },
      peak_hour: {
        title: '高峰期',
        description: '早晚高峰时段，骑行需求旺盛',
        effects: { demandMultiplier: 1.8 * severityMultiplier }
      }
    }

    const data = eventData[type]

    addEvent({
      type,
      title: data.title,
      description: data.description,
      severity,
      startTime: time,
      duration: (30 + Math.floor(Math.random() * 60)) * severityMultiplier,
      affectedStations,
      effects: data.effects,
    })
  }

  const formatEffect = (value: number | undefined, type: 'demand' | 'speed' | 'violation' | 'battery' | 'fine') => {
    if (!value || value === 1) return null
    
    const labels = {
      demand: '需求',
      speed: '速度',
      violation: '违规率',
      battery: '电池消耗',
      fine: '罚款'
    }
    
    const isPositive = type === 'demand' || type === 'violation' || type === 'battery' || type === 'fine'
      ? value > 1 
      : value < 1
    
    const isNegative = !isPositive
    
    const color = isPositive ? 'var(--danger)' : 'var(--secondary)'
    const arrow = value > 1 ? '↑' : '↓'
    const percent = Math.abs(Math.round((value - 1) * 100))
    
    return (
      <span style={{ color, fontSize: '11px' }}>
        {labels[type]} {arrow}{percent}%
      </span>
    )
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
              
              const affectedStationNames = event.affectedStations
                .map(id => stations.find(s => s.id === id)?.name || id)
                .join('、')
              
              return (
                <div 
                  key={event.id} 
                  className={`event-banner ${event.severity}`}
                  style={{ marginBottom: '12px' }}
                >
                  <div className="event-icon" style={{ fontSize: '28px' }}>
                    {getEventTypeIcon(event.type)}
                  </div>
                  <div className="event-content" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0 }}>{event.title}</h3>
                      <span 
                        className="badge"
                        style={{ 
                          backgroundColor: getSeverityColor(event.severity) + '20',
                          color: getSeverityColor(event.severity),
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        {getSeverityLabel(event.severity)}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>{event.description}</p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      {formatEffect(event.effects.demandMultiplier, 'demand')}
                      {formatEffect(event.effects.speedMultiplier, 'speed')}
                      {formatEffect(event.effects.parkingViolationRate, 'violation')}
                      {formatEffect(event.effects.batteryDrainMultiplier, 'battery')}
                      {formatEffect(event.effects.fineMultiplier, 'fine')}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>剩余: {Math.floor(remaining)}分钟</span>
                      <span>影响站点: {affectedStationNames || '全城'}</span>
                    </div>
                    <div className="progress-bar" style={{ marginTop: '8px', height: '4px' }}>
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

        {activeEvents.length > 0 && (
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', marginBottom: '20px' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>📊 当前事件综合影响</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    需求倍率
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: demandMultiplier > 1 ? 'var(--danger)' : demandMultiplier < 1 ? 'var(--secondary)' : 'var(--text-primary)'
                  }}>
                    x{demandMultiplier.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {demandMultiplier > 1 ? '需求增加' : demandMultiplier < 1 ? '需求减少' : '正常'}
                  </div>
                </div>
                
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    速度倍率
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: speedMultiplier < 1 ? 'var(--warning)' : speedMultiplier > 1 ? 'var(--secondary)' : 'var(--text-primary)'
                  }}>
                    x{speedMultiplier.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {speedMultiplier < 1 ? '通行减慢' : speedMultiplier > 1 ? '通行顺畅' : '正常'}
                  </div>
                </div>
                
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    违规率倍率
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: violationMultiplier > 1 ? 'var(--danger)' : 'var(--secondary)'
                  }}>
                    x{violationMultiplier.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {violationMultiplier > 1 ? '违规增加' : '正常'}
                  </div>
                </div>
                
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    电池消耗倍率
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: batteryDrainMultiplier > 1 ? 'var(--warning)' : 'var(--secondary)'
                  }}>
                    x{batteryDrainMultiplier.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {batteryDrainMultiplier > 1 ? '耗电加快' : '正常'}
                  </div>
                </div>
              </div>
              
              {fineMultiplier > 1 && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '10px', 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                  borderRadius: '6px',
                  border: '1px solid var(--danger)',
                  fontSize: '12px',
                  color: 'var(--danger)',
                  textAlign: 'center'
                }}>
                  ⚠️ 罚款倍率 x{fineMultiplier.toFixed(2)} - 乱停罚款增加
                </div>
              )}
            </div>
          </div>
        )}

        {activeEvents.length > 0 && (
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', marginBottom: '20px' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>🏢 受影响站点状态</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {stations
                  .filter(s => s.type !== 'no_parking' && s.type !== 'maintenance')
                  .filter(s => {
                    const allAffected = activeEvents.some(e => e.affectedStations.length === 0)
                    const specificallyAffected = activeEvents.some(e => e.affectedStations.includes(s.id))
                    return allAffected || specificallyAffected
                  })
                  .slice(0, 6)
                  .map(station => {
                    const usageRate = station.capacity > 0 ? (station.availableBikes / station.capacity) * 100 : 0
                    return (
                      <div key={station.id} style={{
                        padding: '8px',
                        backgroundColor: 'var(--bg-dark)',
                        borderRadius: '6px',
                        fontSize: '11px'
                      }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{station.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>需求</span>
                          <span style={{ color: station.demandLevel > 70 ? 'var(--danger)' : station.demandLevel > 40 ? 'var(--warning)' : 'var(--secondary)' }}>
                            {station.demandLevel.toFixed(0)}%
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>拥堵</span>
                          <span style={{ color: station.congestionLevel > 70 ? 'var(--danger)' : station.congestionLevel > 40 ? 'var(--warning)' : 'var(--secondary)' }}>
                            {station.congestionLevel.toFixed(0)}%
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>车辆</span>
                          <span>{station.availableBikes}/{station.capacity}</span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
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
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                骑行需求下降50%，车辆速度减慢30%，电池消耗增加30%
              </p>
            </div>
            
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-card)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>🎵</span>
                <span style={{ fontWeight: '600' }}>演唱会散场</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                周边站点需求暴增150%，需要快速调度车辆补充
              </p>
            </div>
            
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-card)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>🚇</span>
                <span style={{ fontWeight: '600' }}>地铁故障</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                大量乘客转骑电单车，需求增加100%，枢纽站压力大
              </p>
            </div>
            
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-card)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <span style={{ fontWeight: '600' }}>集中乱停</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                乱停现象增加200%，需要及时处理避免罚款和投诉
              </p>
            </div>
          </div>
        </div>

        {pastEvents.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '12px', color: 'var(--text-muted)' }}>
              📜 已结束事件 ({pastEvents.length})
            </h3>
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {pastEvents.slice(-5).reverse().map(event => (
                <div 
                  key={event.id}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    opacity: 0.5,
                    fontSize: '12px'
                  }}
                >
                  <span>{getEventTypeIcon(event.type)}</span>
                  <span style={{ flex: 1 }}>{event.title}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {formatTime(event.startTime)} - {formatTime(event.startTime + event.duration)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeEvents.length === 0 && upcomingEvents.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">☀️</div>
            <div className="empty-state-text">当前没有事件，运营平稳</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              需求倍率: x{demandMultiplier.toFixed(2)} | 违规率倍率: x{violationMultiplier.toFixed(2)}
            </div>
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
