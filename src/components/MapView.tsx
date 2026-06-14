import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getBatteryColor, getStationTypeLabel, formatMoney } from '../utils/format'
import { Station, GameEvent, Bike } from '../types'

const MapView = () => {
  const { stations, bikes, employees, selectedStationId, setSelectedStation, events } = useGameStore()
  const [hoveredStation, setHoveredStation] = useState<Station | null>(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })

  const mapWidth = 960
  const mapHeight = 640

  const handleStationClick = (station: Station, e: React.MouseEvent) => {
    e.stopPropagation()
    if (station.type === 'no_parking') return
    setSelectedStation(station.id === selectedStationId ? null : station.id)
  }

  const handleStationHover = (station: Station, e: React.MouseEvent) => {
    if (station.type === 'no_parking') {
      setHoveredStation(station)
      const rect = (e.target as SVGElement).getBoundingClientRect()
      const parentRect = (e.currentTarget as SVGElement).closest('.map-container')?.getBoundingClientRect()
      if (parentRect) {
        setPopupPosition({
          x: rect.left - parentRect.left + 20,
          y: rect.top - parentRect.top
        })
      }
    } else {
      setHoveredStation(station)
      setPopupPosition({
        x: station.position.x + 30,
        y: station.position.y - 40
      })
    }
  }

  const getStationColor = (station: Station) => {
    switch (station.type) {
      case 'hub': return '#3b82f6'
      case 'hot': return '#f59e0b'
      case 'maintenance': return '#8b5cf6'
      case 'no_parking': return '#ef4444'
      default: return '#64748b'
    }
  }

  const getStationSize = (station: Station) => {
    switch (station.type) {
      case 'hub': return 24
      case 'hot': return 20
      case 'maintenance': return 22
      default: return 16
    }
  }

  const getCapacityFill = (station: Station) => {
    if (station.type === 'no_parking' || station.capacity === 0) return 0
    return station.availableBikes / station.capacity
  }

  const getSeverityColor = (severity: GameEvent['severity']) => {
    switch (severity) {
      case 'severe': return { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.2)' }
      case 'moderate': return { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.2)' }
      case 'mild': return { stroke: '#eab308', fill: 'rgba(234, 179, 8, 0.2)' }
    }
  }

  const getEventLabel = (event: GameEvent) => {
    switch (event.type) {
      case 'concert': return '🎤 演唱会中'
      case 'subway_failure': return '🚇 地铁故障'
      case 'rain': return '🌧️ 暴雨'
      case 'illegal_parking': return '⚠️ 乱停'
      case 'peak_hour': return '⏰ 高峰'
      default: return '📢 事件'
    }
  }

  const getStationEvents = (stationId: string, activeEvents: GameEvent[]) => {
    return activeEvents.filter(e => e.affectedStations.includes(stationId))
  }

  const getDemandIncreasePercent = (station: Station, events: GameEvent[]) => {
    const stationEvents = getStationEvents(station.id, events)
    const multiplier = stationEvents.reduce((acc, e) => acc * (e.effects.demandMultiplier || 1), 1)
    return Math.round((multiplier - 1) * 100)
  }

  const getBikeStatusLabel = (bike: Bike) => {
    if (bike.status === 'broken') return '故障'
    if (bike.status === 'maintenance') return '维修中'
    if (bike.battery < 20) return '低电量'
    return '正常'
  }

  const availableBikes = bikes.filter(b => b.status === 'available' && b.stationId)
  const ridingBikes = bikes.filter(b => b.status === 'riding')
  const transitBikes = bikes.filter(b => b.status === 'transit' || b.inTransit != null)

  const currentTime = useGameStore.getState().time
  const activeEvents = events.filter(e => {
    return currentTime >= e.startTime && currentTime < e.startTime + e.duration
  })

  return (
    <div className="map-container" style={{ height: '100%' }} onClick={() => setSelectedStation(null)}>
      <svg
        className="map-svg"
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.3" />
          </pattern>
          <filter id="glow-severe" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glow-moderate" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glow-mild" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <rect width={mapWidth} height={mapHeight} fill="url(#grid)" />

        {transitBikes.map(bike => {
          if (!bike.transitSourceId || !bike.transitTargetId) return null
          const sourceStation = stations.find(s => s.id === bike.transitSourceId)
          const targetStation = stations.find(s => s.id === bike.transitTargetId)
          if (!sourceStation || !targetStation) return null
          
          return (
            <g key={`transit-line-${bike.id}`}>
              <line
                x1={sourceStation.position.x}
                y1={sourceStation.position.y}
                x2={targetStation.position.x}
                y2={targetStation.position.y}
                stroke={bike.inTransit === 'to_repair' ? '#8b5cf6' : '#10b981'}
                strokeWidth="2"
                strokeDasharray="8 4"
                opacity="0.6"
                style={{ animation: 'dash 1.5s linear infinite' }}
              />
              <circle
                cx={bike.position.x}
                cy={bike.position.y}
                r="5"
                fill={bike.inTransit === 'to_repair' ? '#8b5cf6' : '#10b981'}
                stroke="#fff"
                strokeWidth="1.5"
                opacity="0.9"
              />
            </g>
          )
        })}

        {stations.filter(s => s.type === 'hot').map(station => (
          <circle
            key={`hot-${station.id}`}
            cx={station.position.x}
            cy={station.position.y}
            r={50}
            fill="rgba(245, 158, 11, 0.1)"
            stroke="rgba(245, 158, 11, 0.3)"
            strokeWidth="1"
            className="hot-zone-ring"
          />
        ))}

        {activeEvents.map(event => 
          event.affectedStations.map(stationId => {
            const station = stations.find(s => s.id === stationId)
            if (!station || station.type === 'no_parking') return null
            const severityColors = getSeverityColor(event.severity)
            const size = getStationSize(station)
            
            return (
              <g key={`event-pulse-${event.id}-${stationId}`}>
                <circle
                  cx={station.position.x}
                  cy={station.position.y}
                  r={size + 18}
                  fill="none"
                  stroke={severityColors.stroke}
                  strokeWidth="2"
                  opacity="0.4"
                  style={{ animation: 'pulse 2s infinite' }}
                />
                <circle
                  cx={station.position.x}
                  cy={station.position.y}
                  r={size + 12}
                  fill="none"
                  stroke={severityColors.stroke}
                  strokeWidth="1.5"
                  opacity="0.6"
                  style={{ animation: 'pulse 2s infinite 0.3s' }}
                />
              </g>
            )
          })
        )}

        {stations.filter(s => s.type === 'no_parking').map(station => (
          <g key={`np-${station.id}`}>
            <rect
              x={station.position.x - 45}
              y={station.position.y - 35}
              width="90"
              height="70"
              fill="rgba(239, 68, 68, 0.1)"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="8, 4"
              rx="4"
            />
            <text
              x={station.position.x}
              y={station.position.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ef4444"
              fontSize="12"
              fontWeight="600"
            >
              禁停区
            </text>
            <text
              x={station.position.x}
              y={station.position.y + 18}
              textAnchor="middle"
              fill="#ef4444"
              fontSize="10"
              opacity="0.7"
            >
              {station.name}
            </text>
          </g>
        ))}

        {stations.filter(s => s.type !== 'no_parking').map(station => {
          const size = getStationSize(station)
          const capacityFill = getCapacityFill(station)
          const isSelected = station.id === selectedStationId
          const stationEvents = getStationEvents(station.id, activeEvents)
          const hasActiveEvent = stationEvents.length > 0
          const demandIncrease = hasActiveEvent ? getDemandIncreasePercent(station, activeEvents) : 0
          const priorityBoost = station.dispatchPriorityBoost || 0
          
          return (
            <g
              key={station.id}
              className="station-marker"
              onClick={(e) => handleStationClick(station, e)}
              onMouseEnter={(e) => handleStationHover(station, e)}
              onMouseLeave={() => setHoveredStation(null)}
            >
              <circle
                cx={station.position.x}
                cy={station.position.y}
                r={size + (isSelected ? 6 : 2)}
                fill="none"
                stroke={isSelected ? '#3b82f6' : 'rgba(255,255,255,0.1)'}
                strokeWidth={isSelected ? 3 : 1}
              />
              
              <circle
                cx={station.position.x}
                cy={station.position.y}
                r={size}
                fill={getStationColor(station)}
                stroke="#fff"
                strokeWidth="2"
              />
              
              {station.capacity > 0 && (
                <circle
                  cx={station.position.x}
                  cy={station.position.y}
                  r={size * 0.6 * capacityFill}
                  fill="rgba(255,255,255,0.3)"
                />
              )}
              
              {priorityBoost > 0 && (
                <g>
                  <rect
                    x={station.position.x + size + 2}
                    y={station.position.y - size - 18}
                    width="56"
                    height="18"
                    rx="4"
                    fill="#f59e0b"
                    stroke="#fbbf24"
                    strokeWidth="1"
                  />
                  <text
                    x={station.position.x + size + 30}
                    y={station.position.y - size - 5}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="10"
                    fontWeight="700"
                  >
                    ⚡+{priorityBoost}
                  </text>
                </g>
              )}
              
              <text
                x={station.position.x}
                y={station.position.y + size + 16}
                className="station-label"
                textAnchor="middle"
                fill={station.type === 'hot' ? '#f59e0b' : '#94a3b8'}
                fontSize="11"
              >
                {station.name}
              </text>
              
              {hasActiveEvent && (
                <g>
                  <rect
                    x={station.position.x - 42}
                    y={station.position.y - size - 36}
                    width="84"
                    height="18"
                    rx="4"
                    fill={getSeverityColor(stationEvents[0].severity).stroke}
                    opacity="0.9"
                  />
                  <text
                    x={station.position.x}
                    y={station.position.y - size - 23}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {getEventLabel(stationEvents[0])}
                  </text>
                </g>
              )}
              
              {demandIncrease > 0 && (
                <text
                  x={station.position.x}
                  y={station.position.y + size + 30}
                  textAnchor="middle"
                  fill="#ef4444"
                  fontSize="10"
                  fontWeight="700"
                >
                  需求+{demandIncrease}%
                </text>
              )}
              
              <text
                x={station.position.x}
                y={station.position.y + 4}
                textAnchor="middle"
                fill="#fff"
                fontSize="10"
                fontWeight="600"
              >
                {station.availableBikes}
              </text>
            </g>
          )
        })}

        {availableBikes.slice(0, 30).map(bike => {
          const station = stations.find(s => s.id === bike.stationId)
          if (!station) return null
          
          const offsetX = (Math.random() - 0.5) * 30
          const offsetY = (Math.random() - 0.5) * 20
          
          return (
            <circle
              key={bike.id}
              cx={station.position.x + offsetX}
              cy={station.position.y + offsetY}
              r={3}
              fill={getBatteryColor(bike.battery)}
              opacity="0.8"
              className="bike-dot"
            />
          )
        })}

        {employees.map(emp => (
          <g key={emp.id}>
            <circle
              cx={emp.position.x}
              cy={emp.position.y}
              r={8}
              fill={emp.status === 'working' ? '#3b82f6' : emp.status === 'idle' ? '#22c55e' : '#64748b'}
              stroke="#fff"
              strokeWidth="2"
            />
            <text
              x={emp.position.x}
              y={emp.position.y - 12}
              textAnchor="middle"
              fill="#fff"
              fontSize="10"
            >
              {emp.name}
            </text>
            {emp.carryingBikes.length > 0 && (
              <g>
                <rect
                  x={emp.position.x + 12}
                  y={emp.position.y - 12}
                  width="30"
                  height="16"
                  rx="4"
                  fill="#10b981"
                  stroke="#34d399"
                  strokeWidth="1"
                />
                <text
                  x={emp.position.x + 27}
                  y={emp.position.y - 1}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="10"
                  fontWeight="700"
                >
                  🚲{emp.carryingBikes.length}
                </text>
              </g>
            )}
          </g>
        ))}

        {activeEvents.length > 0 && (
          <g>
            {activeEvents.map(event => 
              event.affectedStations.map(stationId => {
                const station = stations.find(s => s.id === stationId)
                if (!station) return null
                return (
                  <circle
                    key={`${event.id}-${stationId}`}
                    cx={station.position.x}
                    cy={station.position.y}
                    r={40}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    opacity="0.5"
                    style={{ animation: 'pulse 2s infinite' }}
                  />
                )
              })
            )}
          </g>
        )}
      </svg>

      {hoveredStation && hoveredStation.type !== 'no_parking' && (
        <div
          className="station-popup"
          style={{ left: popupPosition.x, top: popupPosition.y }}
        >
          <h3>{hoveredStation.name}</h3>
          <div className="stat-row">
            <span className="label">类型</span>
            <span>{getStationTypeLabel(hoveredStation.type)}</span>
          </div>
          <div className="stat-row">
            <span className="label">容量</span>
            <span>{hoveredStation.availableBikes}/{hoveredStation.capacity}</span>
          </div>
          <div className="stat-row">
            <span className="label">可用车辆</span>
            <span style={{ color: '#22c55e' }}>{hoveredStation.availableBikes}辆</span>
          </div>
          <div className="stat-row">
            <span className="label">故障车辆</span>
            <span style={{ color: '#ef4444' }}>{hoveredStation.brokenBikes}辆</span>
          </div>
          <div className="stat-row">
            <span className="label">低电量</span>
            <span style={{ color: '#f59e0b' }}>{hoveredStation.lowBatteryBikes}辆</span>
          </div>
          <div className="stat-row">
            <span className="label">需求等级</span>
            <span>{Math.round(hoveredStation.demandLevel)}%</span>
          </div>
          <div className="stat-row">
            <span className="label">拥堵等级</span>
            <span>{Math.round(hoveredStation.congestionLevel)}%</span>
          </div>
          {(hoveredStation.dispatchPriorityBoost || 0) > 0 && (
            <div className="stat-row">
              <span className="label">调度优先级</span>
              <span style={{ color: '#f59e0b', fontWeight: '600' }}>⚡ +{hoveredStation.dispatchPriorityBoost}</span>
            </div>
          )}
        </div>
      )}

      <div className="legend">
        <h4>图例</h4>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
          <span>枢纽站</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#f59e0b' }}></div>
          <span>热门站点</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#64748b' }}></div>
          <span>普通站点</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#8b5cf6' }}></div>
          <span>维修中心</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: '#22c55e' }}></div>
          <span>高电量</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></div>
          <span>中电量</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: '#ef4444' }}></div>
          <span>低电量</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: '#10b981' }}></div>
          <span>转运中</span>
        </div>
        <div className="legend-item">
          <div style={{ display: 'inline-block', width: '20px', height: '2px', background: 'repeating-linear-gradient(90deg, #ef4444, #ef4444 4px, transparent 4px, transparent 8px)', verticalAlign: 'middle', marginRight: '6px' }}></div>
          <span>严重事件</span>
        </div>
      </div>
    </div>
  )
}

export default MapView
