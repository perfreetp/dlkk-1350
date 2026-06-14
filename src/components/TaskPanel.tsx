import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { 
  getTaskTypeLabel, getTaskTypeIcon, getPriorityLabel, 
  formatMoney, formatTime, calculateDistance
} from '../utils/format'
import { TaskPriority, Station, Task } from '../types'

const TaskPanel = () => {
  const { 
    tasks, employees, stations, assignTask, assignTaskWithSource,
    completeTask, updateTaskPriority, addTask, setTaskSourceStation 
  } = useGameStore()
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null)
  const [showSourceSelect, setShowSourceSelect] = useState<string | null>(null)

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
    return task.status === filter
  })

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  const getStationName = (stationId: string | undefined) => {
    if (!stationId) return '未知站点'
    const station = stations.find(s => s.id === stationId)
    return station?.name || '未知站点'
  }

  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) return '未分配'
    const emp = employees.find(e => e.id === employeeId)
    return emp?.name || '未知'
  }

  const availableEmployees = employees.filter(e => e.status === 'idle')

  const getSourceStationSuggestions = (task: Task): Station[] => {
    if (task.type !== 'replenish' || task.status !== 'pending') return []
    
    const targetStation = stations.find(s => s.id === task.stationId)
    if (!targetStation) return []

    const bikeCount = task.bikeCount || 5
    const maintenance = stations.find(s => s.type === 'maintenance')
    
    const candidates: Station[] = []
    
    if (maintenance && maintenance.availableBikes >= Math.ceil(bikeCount / 2)) {
      candidates.push(maintenance)
    }

    const nearbyLowDemand = stations
      .filter(s => 
        s.id !== task.stationId && 
        s.type !== 'no_parking' && 
        s.availableBikes >= Math.ceil(bikeCount / 2) &&
        (s.demandLevel || 50) < 65
      )
      .map(s => ({ 
        station: s, 
        dist: calculateDistance(targetStation.position, s.position) 
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 2)
      .map(x => x.station)

    for (const s of nearbyLowDemand) {
      if (!candidates.find(c => c.id === s.id)) {
        candidates.push(s)
      }
    }

    return candidates.slice(0, 2)
  }

  const handleAddSampleTask = () => {
    const types = ['replenish', 'recycle', 'battery', 'complaint'] as const
    const type = types[Math.floor(Math.random() * types.length)]
    const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
    const priority = priorities[Math.floor(Math.random() * priorities.length)]
    const stationIds = stations.filter(s => s.type !== 'no_parking').map(s => s.id)
    const stationId = stationIds[Math.floor(Math.random() * stationIds.length)]

    const titles: Record<string, string> = {
      replenish: '缺车补车',
      recycle: '故障回收',
      battery: '换电作业',
      complaint: '投诉处理',
    }

    const descriptions: Record<string, string> = {
      replenish: '站点车辆不足，需要尽快补充',
      recycle: '站点有故障车辆需要回收维修',
      battery: '多辆车电量过低，需要换电',
      complaint: '用户投诉车辆问题，需要处理',
    }

    addTask({
      type,
      title: titles[type],
      description: descriptions[type],
      stationId,
      priority,
      reward: type === 'complaint' ? 120 : type === 'replenish' ? 100 : 80,
      penalty: type === 'complaint' ? 300 : type === 'replenish' ? 200 : 100,
    })
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>📋 任务面板</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary btn-small" onClick={handleAddSampleTask}>
            + 模拟任务
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="tabs">
          <div className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            全部 ({tasks.length})
          </div>
          <div className={`tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
            待处理 ({tasks.filter(t => t.status === 'pending').length})
          </div>
          <div className={`tab ${filter === 'in_progress' ? 'active' : ''}`} onClick={() => setFilter('in_progress')}>
            进行中 ({tasks.filter(t => t.status === 'in_progress').length})
          </div>
          <div className={`tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
            已完成 ({tasks.filter(t => t.status === 'completed').length})
          </div>
        </div>

        <div className="task-list">
          {sortedTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">暂无任务</div>
            </div>
          ) : (
            sortedTasks.map(task => {
              const sourceSuggestions = getSourceStationSuggestions(task)
              
              return (
                <div key={task.id} className={`task-item ${task.priority}`}>
                  <div className="task-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{getTaskTypeIcon(task.type)}</span>
                      <span className="task-title">{task.title}</span>
                      <span className={`badge badge-${task.priority}`}>{getPriorityLabel(task.priority)}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {getTaskTypeLabel(task.type)}
                    </span>
                  </div>
                  
                  <div className="task-meta">
                    <span>📍 {getStationName(task.stationId)}</span>
                    <span>👤 {getEmployeeName(task.assignedTo)}</span>
                  </div>

                  {task.type === 'replenish' && (
                    <div style={{ 
                      padding: '8px 10px', 
                      backgroundColor: 'var(--bg-dark)', 
                      borderRadius: '6px', 
                      marginBottom: '10px',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>补车路径:</span>
                        {task.sourceStationId ? (
                          <>
                            <span style={{ color: '#3b82f6', fontWeight: '600' }}>
                              {getStationName(task.sourceStationId)}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                            <span style={{ color: '#10b981', fontWeight: '600' }}>
                              {getStationName(task.stationId)}
                            </span>
                            {task.status === 'pending' && (
                              <button
                                className="btn btn-small"
                                style={{ 
                                  marginLeft: 'auto', 
                                  color: 'var(--text-muted)',
                                  fontSize: '11px',
                                  padding: '2px 8px'
                                }}
                                onClick={() => setTaskSourceStation(task.id, undefined)}
                              >
                                更改
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <span style={{ color: '#f59e0b' }}>⚠️ 未选择来源站</span>
                            {task.status === 'pending' && (
                              <button
                                className="btn btn-secondary btn-small"
                                style={{ marginLeft: 'auto' }}
                                onClick={() => setShowSourceSelect(showSourceSelect === task.id ? null : task.id)}
                              >
                                选择来源站
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {task.status === 'pending' && !task.sourceStationId && sourceSuggestions.length > 0 && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            💡 推荐来源站:
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {sourceSuggestions.map(s => (
                              <button
                                key={s.id}
                                className="btn btn-success btn-small"
                                onClick={() => setTaskSourceStation(task.id, s.id)}
                                style={{ fontSize: '11px' }}
                              >
                                ✓ {s.name} ({s.availableBikes}辆可用)
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {showSourceSelect === task.id && (
                        <div 
                          style={{ 
                            marginTop: '10px', 
                            padding: '10px',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '6px',
                            border: '1px solid var(--border)'
                          }}
                        >
                          <div style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
                            选择来源站点:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {stations
                              .filter(s => s.type !== 'no_parking' && s.id !== task.stationId && s.availableBikes > 0)
                              .map(s => (
                                <button
                                  key={s.id}
                                  className="btn btn-secondary btn-small"
                                  onClick={() => {
                                    setTaskSourceStation(task.id, s.id)
                                    setShowSourceSelect(null)
                                  }}
                                  style={{ fontSize: '11px' }}
                                >
                                  {s.name} ({s.availableBikes}辆)
                                </button>
                              ))}
                          </div>
                          <button
                            className="btn btn-small"
                            style={{ marginTop: '8px', color: 'var(--text-muted)' }}
                            onClick={() => setShowSourceSelect(null)}
                          >
                            取消
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    marginBottom: '10px',
                    fontSize: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ color: '#22c55e', fontWeight: '600' }}>
                      💰 奖励: {formatMoney(task.reward)}
                    </span>
                    <span style={{ color: '#ef4444', fontWeight: '600' }}>
                      ⏰ 超时罚款: {formatMoney(task.penalty)}
                    </span>
                    {task.bikeCount !== undefined && task.type !== 'complaint' && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        🚲 数量: {task.bikeCount}辆
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    {task.description}
                  </p>

                  {task.status === 'in_progress' && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span>进度</span>
                        <span>{Math.floor(task.progress)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className={`progress-fill ${task.progress > 70 ? 'success' : task.progress > 30 ? '' : 'warning'}`}
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="task-actions">
                    {task.status === 'pending' && (
                      <>
                        <button 
                          className="btn btn-secondary btn-small"
                          onClick={() => updateTaskPriority(
                            task.id, 
                            task.priority === 'urgent' ? 'low' : 
                            task.priority === 'high' ? 'urgent' :
                            task.priority === 'medium' ? 'high' : 'medium'
                          )}
                        >
                          调整优先级
                        </button>
                        <button 
                          className="btn btn-primary btn-small"
                          onClick={() => setShowAssignModal(task.id)}
                        >
                          分配任务
                        </button>
                      </>
                    )}
                    {task.status === 'in_progress' && (
                      <button 
                        className="btn btn-success btn-small"
                        onClick={() => completeTask(task.id)}
                      >
                        标记完成
                      </button>
                    )}
                    {task.status === 'completed' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: 'var(--success)', fontSize: '12px', fontWeight: '600' }}>
                          ✅ 已完成
                        </span>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
                          {task.actualReward !== undefined && (
                            <span style={{ color: '#22c55e' }}>
                              实际到账: +{formatMoney(task.actualReward)}
                            </span>
                          )}
                          {task.actualPenalty !== undefined && task.actualPenalty > 0 && (
                            <span style={{ color: '#ef4444' }}>
                              罚款: -{formatMoney(task.actualPenalty)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {task.status === 'failed' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: '600' }}>
                          ❌ 已失败
                        </span>
                        {task.actualPenalty !== undefined && (
                          <span style={{ color: '#ef4444', fontSize: '11px' }}>
                            罚款: -{formatMoney(task.actualPenalty)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {showAssignModal === task.id && (
                    <div 
                      style={{ 
                        marginTop: '12px', 
                        padding: '12px', 
                        backgroundColor: 'var(--bg-dark)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)'
                      }}
                    >
                      {task.type === 'replenish' && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            当前来源站: 
                            <span style={{ color: task.sourceStationId ? '#10b981' : '#f59e0b', fontWeight: '600', marginLeft: '4px' }}>
                              {task.sourceStationId ? getStationName(task.sourceStationId) : '未设置'}
                            </span>
                          </div>
                          <select
                            className="select-input"
                            style={{ fontSize: '12px', padding: '4px 8px', width: '100%' }}
                            value={task.sourceStationId || ''}
                            onChange={(e) => {
                              setTaskSourceStation(task.id, e.target.value || undefined)
                            }}
                          >
                            <option value="">-- 选择来源站 --</option>
                            {stations
                              .filter(s => s.type !== 'no_parking' && s.id !== task.stationId && s.availableBikes > 0)
                              .map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.availableBikes}辆可用)
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                      <div style={{ fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>
                        选择员工:
                      </div>
                      {availableEmployees.length === 0 ? (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          暂无空闲员工
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {availableEmployees.map(emp => (
                            <button
                              key={emp.id}
                              className="btn btn-secondary btn-small"
                              onClick={() => {
                                if (task.type === 'replenish') {
                                  assignTaskWithSource(task.id, emp.id, task.sourceStationId)
                                } else {
                                  assignTask(task.id, emp.id)
                                }
                                setShowAssignModal(null)
                              }}
                            >
                              {emp.name} ({emp.vehicle === 'truck' ? '货车' : emp.vehicle === 'van' ? '厢车' : '电动车'})
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        className="btn btn-small"
                        style={{ marginTop: '8px', color: 'var(--text-muted)' }}
                        onClick={() => setShowAssignModal(null)}
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskPanel
