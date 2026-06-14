import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { 
  getEmployeeRoleLabel, getVehicleTypeLabel, getShiftLabel,
} from '../utils/format'
import { Employee, RoutePoint } from '../types'

const FleetDispatch = () => {
  const { employees, stations, tasks, setEmployeeStatus, updateEmployeeRoute, assignTask } = useGameStore()
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showRouteEditor, setShowRouteEditor] = useState<string | null>(null)

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
                    </div>
                  </div>
                  <div style={{ fontSize: '24px' }}>
                    {emp.vehicle === 'truck' ? '🚚' : emp.vehicle === 'van' ? '🚐' : emp.vehicle === 'scooter' ? '🛵' : '🚲'}
                  </div>
                </div>

                <div className="employee-stats">
                  <div className="employee-stat">
                    <span className="label">载具容量</span>
                    <span>{emp.currentLoad}/{emp.capacity}辆</span>
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
                    backgroundColor: 'var(--bg-dark)',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      规划路线 ({emp.route.length}个站点)
                    </div>
                    <div className="route-points">
                      {emp.route.map((point, idx) => {
                        const station = stations.find(s => s.id === point.stationId)
                        return (
                          <span key={idx} className="route-point">
                            {idx + 1}. {station?.name}
                          </span>
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
                            {idx + 1}. {station?.name}
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
                
                return (
                  <div 
                    key={task.id} 
                    style={{
                      padding: '10px',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{task.title}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '10px' }}>
                        📍 {station?.name}
                      </span>
                      <span className={`badge badge-${task.priority}`} style={{ marginLeft: '10px' }}>
                        {priorityLabel}
                      </span>
                    </div>
                    <select 
                      className="select-input"
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          assignTask(task.id, e.target.value)
                        }
                      }}
                    >
                      <option value="">分配给...</option>
                      {idleEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
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
