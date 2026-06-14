import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { 
  getEmployeeRoleLabel, getVehicleTypeLabel, getShiftLabel,
} from '../utils/format'
import { Employee, RoutePoint, Bike, Task } from '../types'

const FleetDispatch = () => {
  const { 
    employees, stations, tasks, bikes,
    setEmployeeStatus, updateEmployeeRoute, assignTask, assignTaskWithSource,
    setTaskSourceStation
  } = useGameStore()
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showRouteEditor, setShowRouteEditor] = useState<string | null>(null)
  const [selectedSourceStation, setSelectedSourceStation] = useState<Record<string, string>>({})

  const getStatusText = (status: string) => {
    switch (status) {
      case 'idle': return '空闲'
      case 'working': return '工作中'
      case 'rest': return '休息'
      default: return status
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'idle': return 'status-idle'
      case 'working': return 'status-working'
      case 'rest': return 'status-rest'
      default: return ''
    }
  }

  const getActionText = (action: string) => {
    switch (action) {
      case 'idle': return '待命'
      case 'traveling': return '行驶中'
      case 'loading': return '装载中'
      case 'unloading': return '卸载中'
      case 'repairing': return '维修中'
      case 'swapping_battery': return '换电中'
      case 'resting': return '休息中'
      default: return action
    }
  }

  const getActionIcon = (action: RoutePoint['action']) => {
    switch (action) {
      case 'pickup': return '📦'
      case 'dropoff': return '📤'
      case 'repair': return '🔧'
      case 'battery': return '🔋'
      default: return '📍'
    }
  }

  const getActionLabel = (action: RoutePoint['action']) => {
    switch (action) {
      case 'pickup': return '取车'
      case 'dropoff': return '送车'
      case 'repair': return '维修'
      case 'battery': return '换电'
      default: return action
    }
  }

  const getBikeStatusBadge = (bike: Bike) => {
    if (bike.status === 'broken') return { label: '故障', color: '#ef4444' }
    if (bike.status === 'maintenance') return { label: '维修', color: '#8b5cf6' }
    if (bike.status === 'transit') return { label: '转运', color: '#10b981' }
    if (bike.battery < 20) return { label: '低电', color: '#f59e0b' }
    return { label: '正常', color: '#22c55e' }
  }

  const getCapacityPercent = (emp: Employee) => {
    if (emp.capacity === 0) return 0
    return Math.min(100, (emp.currentLoad / emp.capacity) * 100)
  }

  const getCapacityColor = (percent: number) => {
    if (percent >= 90) return '#ef4444'
    if (percent >= 70) return '#f59e0b'
    return '#22c55e'
  }

  const getStationOptions = stations.filter(s => s.type !== 'no_parking')

  const addRoutePoint = (employeeId: string, stationId: string) => {
    const emp = employees.find(e => e.id === employeeId)
    if (!emp) return

    const newPoint: RoutePoint = {
      stationId,
      action: 'pickup',
      order: emp.route.length
    }

    updateEmployeeRoute(employeeId, [...emp.route, newPoint])
  }

  const removeRoutePoint = (employeeId: string, index: number) => {
    const emp = employees.find(e => e.id === employeeId)
    if (!emp) return

    const newRoute = emp.route.filter((_, i) => i !== index)
      .map((point, i) => ({ ...point, order: i }))
    updateEmployeeRoute(employeeId, newRoute)
  }

  const getCurrentTask = (emp: Employee) => {
    if (!emp.currentTaskId) return null
    return tasks.find(t => t.id === emp.currentTaskId)
  }

  const getCarryingBikesDetails = (emp: Employee): Bike[] => {
    return emp.carryingBikes
      .map(id => bikes.find(b => b.id === id))
      .filter((b): b is Bike => b !== undefined)
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending')

  return (
    <div className="card">
      <div className="card-header">
        <h2>🚚 车队调度</h2>
        <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span>在岗: {employees.filter(e => e.status !== 'rest').length}/{employees.length}</span>
          <span>空闲: {employees.filter(e => e.status === 'idle').length}</span>
          <span>工作中: {employees.filter(e => e.status === 'working').length}</span>
        </div>
      </div>
      <div className="card-body">
        <div className="panel-grid">
          {employees.map(emp => {
            const currentTask = getCurrentTask(emp)
            const carryingBikes = getCarryingBikesDetails(emp)
            const capacityPercent = getCapacityPercent(emp)
            const showActionProgress = emp.currentAction === 'loading' || emp.currentAction === 'unloading'
            
            return (
              <div 
                key={emp.id} 
                className="employee-card"
                style={{ 
                  border: selectedEmployee === emp.id ? '2px solid var(--primary)' : 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedEmployee(emp.id)}
              >
                <div className="employee-header">
                  <div>
                    <div className="employee-name">
                      {emp.name}
                      <span 
                        className={`employee-status ${getStatusClass(emp.status)}`}
                        style={{ marginLeft: '8px' }}
                      >
                        {getStatusText(emp.status)}
                      </span>
                    </div>
                    <div className="employee-role">
                      {getEmployeeRoleLabel(emp.role)} · {getVehicleTypeLabel(emp.vehicle)}
                      {emp.currentAction !== 'idle' && emp.currentAction !== 'resting' && (
                        <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>
                          | {getActionText(emp.currentAction)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '24px' }}>
                    {emp.vehicle === 'truck' ? '🚚' : emp.vehicle === 'van' ? '🚐' : emp.vehicle === 'scooter' ? '🛵' : '🚲'}
                  </div>
                </div>

                <div className="employee-stats">
                  <div className="employee-stat">
                    <span className="label">载具容量</span>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span>{emp.currentLoad}/{emp.capacity}辆</span>
                        <span style={{ color: getCapacityColor(capacityPercent), fontWeight: '600' }}>
                          {Math.round(capacityPercent)}%
                        </span>
                      </div>
                      <div className="progress-bar" style={{ height: '6px' }}>
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${capacityPercent}%`,
                            backgroundColor: getCapacityColor(capacityPercent)
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="employee-stat">
                    <span className="label">工作效率</span>
                    <span>{Math.round(emp.efficiency * 100)}%</span>
                  </div>
                  <div className="employee-stat">
                    <span className="label">疲劳度</span>
                    <span style={{ color: emp.fatigue > 80 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {emp.fatigue}%
                    </span>
                  </div>
                  <div className="employee-stat">
                    <span className="label">班次</span>
                    <span>{getShiftLabel(emp.shift)}</span>
                  </div>
                </div>

                {showActionProgress && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px 10px', 
                    backgroundColor: emp.currentAction === 'loading' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '6px',
                    border: `1px solid ${emp.currentAction === 'loading' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600' }}>
                        {emp.currentAction === 'loading' ? '📦 装载进度' : '📤 卸载进度'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{Math.floor(emp.actionProgress)}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: '6px' }}>
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${emp.actionProgress}%`,
                          backgroundColor: emp.currentAction === 'loading' ? '#3b82f6' : '#10b981'
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {carryingBikes.length > 0 && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px', 
                    backgroundColor: 'var(--bg-dark)',
                    borderRadius: '4px'
                  }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-secondary)', 
                      marginBottom: '6px',
                      fontWeight: '600'
                    }}>
                      🚲 装载车辆 ({carryingBikes.length}辆):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {carryingBikes.slice(0, 5).map(bike => {
                        const badge = getBikeStatusBadge(bike)
                        return (
                          <div 
                            key={bike.id}
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              fontSize: '11px',
                              padding: '3px 6px',
                              backgroundColor: 'var(--bg-card)',
                              borderRadius: '3px'
                            }}
                          >
                            <span style={{ fontFamily: 'monospace' }}>{bike.id}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ 
                                padding: '1px 5px', 
                                borderRadius: '3px', 
                                backgroundColor: badge.color,
                                color: '#fff',
                                fontSize: '10px'
                              }}>
                                {badge.label}
                              </span>
                              <span style={{ color: 'var(--text-muted)' }}>
                                🔋{Math.round(bike.battery)}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {carryingBikes.length > 5 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                          ...还有 {carryingBikes.length - 5} 辆
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentTask && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px', 
                    backgroundColor: 'var(--bg-dark)',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      当前任务:
                    </div>
                    <div style={{ fontWeight: '600' }}>{currentTask.title}</div>
                    {currentTask.type === 'replenish' && currentTask.sourceStationId && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {stations.find(s => s.id === currentTask.sourceStationId)?.name || '未知'} → {stations.find(s => s.id === currentTask.stationId)?.name || '未知'}
                      </div>
                    )}
                    <div className="progress-bar" style={{ marginTop: '6px' }}>
                      <div 
                        className="progress-fill"
                        style={{ width: `${currentTask.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {emp.route.length > 0 && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px', 
                    backgroundColor: 'rgba(139, 92, 246, 0.08)',
                    borderRadius: '4px',
                    border: '1px solid rgba(139, 92, 246, 0.2)'
                  }}>
                    <div style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '6px', fontWeight: '600' }}>
                      🗺️ 规划路线 ({emp.route.length}个站点)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {emp.route.map((point, idx) => {
                        const station = stations.find(s => s.id === point.stationId)
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              fontSize: '11px',
                              padding: '4px 6px',
                              backgroundColor: 'var(--bg-card)',
                              borderRadius: '3px'
                            }}
                          >
                            <span style={{ 
                              width: '18px', 
                              height: '18px', 
                              borderRadius: '50%', 
                              backgroundColor: '#8b5cf6',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: '700',
                              flexShrink: 0
                            }}>
                              {idx + 1}
                            </span>
                            <span>{getActionIcon(point.action)}</span>
                            <span style={{ fontWeight: '600' }}>{station?.name || '未知站点'}</span>
                            <span style={{ 
                              marginLeft: 'auto', 
                              padding: '1px 6px',
                              backgroundColor: 'rgba(139, 92, 246, 0.2)',
                              borderRadius: '3px',
                              color: '#a78bfa',
                              fontSize: '10px'
                            }}>
                              {getActionLabel(point.action)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                  <button 
                    className="btn btn-secondary btn-small"
                    style={{ flex: 1 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowRouteEditor(showRouteEditor === emp.id ? null : emp.id)
                    }}
                  >
                    编辑路线
                  </button>
                  {emp.status === 'idle' && (
                    <button 
                      className="btn btn-primary btn-small"
                      style={{ flex: 1 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEmployeeStatus(emp.id, 'rest')
                      }}
                    >
                      安排休息
                    </button>
                  )}
                  {emp.status === 'rest' && (
                    <button 
                      className="btn btn-success btn-small"
                      style={{ flex: 1 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEmployeeStatus(emp.id, 'idle')
                      }}
                    >
                      恢复工作
                    </button>
                  )}
                </div>

                {showRouteEditor === emp.id && (
                  <div 
                    className="route-editor"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h4>添加路线站点</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                      {emp.route.map((point, idx) => {
                        const station = stations.find(s => s.id === point.stationId)
                        return (
                          <span key={idx} className="route-point">
                            {idx + 1}. {getActionIcon(point.action)} {station?.name}
                            <span 
                              className="remove"
                              onClick={() => removeRoutePoint(emp.id, idx)}
                            >
                              ×
                            </span>
                          </span>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      选择站点添加:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {getStationOptions.slice(0, 8).map(station => (
                        <button
                          key={station.id}
                          className="btn btn-secondary btn-small"
                          onClick={() => addRoutePoint(emp.id, station.id)}
                        >
                          + {station.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>📋 可分配任务</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingTasks.slice(0, 5).map(task => {
                const station = stations.find(s => s.id === task.stationId)
                const priorityLabel = task.priority === 'urgent' ? '紧急' 
                  : task.priority === 'high' ? '高' 
                  : task.priority === 'medium' ? '中' 
                  : '低'
                const idleEmployees = employees.filter(e => e.status === 'idle')
                const currentSource = selectedSourceStation[task.id] || task.sourceStationId
                const isReplenish = task.type === 'replenish'
                
                return (
                  <div 
                    key={task.id} 
                    style={{
                      padding: '10px',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div>
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>{task.title}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '10px' }}>
                          📍 {station?.name}
                        </span>
                        <span className={`badge badge-${task.priority}`} style={{ marginLeft: '10px' }}>
                          {priorityLabel}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                        <span style={{ color: '#22c55e', fontWeight: '600' }}>
                          +{task.reward}
                        </span>
                        <span style={{ color: '#ef4444', fontWeight: '600' }}>
                          -{task.penalty}
                        </span>
                      </div>
                    </div>

                    {isReplenish && (
                      <div style={{
                        padding: '8px 10px',
                        backgroundColor: 'var(--bg-dark)',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>来源站:</span>
                          <select
                            className="select-input"
                            style={{ fontSize: '11px', padding: '3px 6px' }}
                            value={currentSource || ''}
                            onChange={(e) => {
                              const val = e.target.value || undefined
                              setSelectedSourceStation(prev => ({ ...prev, [task.id]: val || '' }))
                              if (val) {
                                setTaskSourceStation(task.id, val)
                              }
                            }}
                          >
                            <option value="">-- 选择来源站 --</option>
                            {stations
                              .filter(s => s.type !== 'no_parking' && s.id !== task.stationId && s.availableBikes > 0)
                              .map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.availableBikes}辆)
                                </option>
                              ))}
                          </select>
                          {currentSource && (
                            <span style={{ color: '#10b981' }}>
                              → {stations.find(s => s.id === task.stationId)?.name}
                            </span>
                          )}
                          {!currentSource && !task.sourceStationId && (
                            <span style={{ color: '#f59e0b', fontSize: '11px' }}>⚠️ 建议先选择来源站</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {task.type !== 'complaint' && task.bikeCount ? `🚲 ${task.bikeCount}辆` : ''}
                      </div>
                      <select 
                        className="select-input"
                        style={{ fontSize: '12px', padding: '4px 8px', minWidth: '140px' }}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            if (isReplenish) {
                              assignTaskWithSource(task.id, e.target.value, currentSource || task.sourceStationId)
                            } else {
                              assignTask(task.id, e.target.value)
                            }
                            setSelectedSourceStation(prev => {
                              const next = { ...prev }
                              delete next[task.id]
                              return next
                            })
                          }
                        }}
                      >
                        <option value="">分配给...</option>
                        {idleEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} (容量:{emp.capacity - emp.currentLoad}辆空)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
              
              {pendingTasks.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">✅</div>
                  <div className="empty-state-text">所有任务已全部分配</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FleetDispatch
