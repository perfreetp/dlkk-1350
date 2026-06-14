import { useGameStore } from '../store/gameStore'
import { 
  getRepairTypeLabel, getRepairTypeIcon,
  formatMoney, formatTime 
} from '../utils/format'
import { RepairType } from '../types'

const RepairShop = () => {
  const { bikes, repairJobs, stations, employees, dispatchLogs, addRepairJob, startRepair, completeRepair, setReturnStation } = useGameStore()

  const queuedJobs = repairJobs.filter(j => j.status === 'queued')
  const repairingJobs = repairJobs.filter(j => j.status === 'repairing')
  const doneJobs = repairJobs.filter(j => j.status === 'done')

  const brokenBikes = bikes.filter(b => b.status === 'broken')

  const repairCenter = stations.find(s => s.type === 'maintenance')
  const MAINTENANCE_STATION_ID = 'st-011'

  const availableStations = stations.filter(s => s.type !== 'no_parking')

  const getBikeInfo = (bikeId: string) => {
    return bikes.find(b => b.id === bikeId)
  }

  const getStationName = (stationId?: string) => {
    if (!stationId) return '维修中心'
    const station = stations.find(s => s.id === stationId)
    return station?.name || stationId
  }

  const getEmployeeName = (employeeId?: string) => {
    if (!employeeId) return undefined
    const emp = employees.find(e => e.id === employeeId)
    return emp?.name
  }

  const handleAddRepair = (bikeId: string) => {
    const bike = getBikeInfo(bikeId)
    if (!bike) return

    const types: RepairType[] = []
    if (!bike.brakeWorking) types.push('brake')
    if (!bike.lockWorking) types.push('lock')
    if (!bike.gpsWorking) types.push('gps')
    if (bike.battery < 20) types.push('battery')

    const type = types.length > 0 ? types[0] : 'brake'
    addRepairJob(bikeId, type)
  }

  const getDispatchLogInfo = (log: typeof dispatchLogs[0]) => {
    const stationFromName = log.stationFrom ? getStationName(log.stationFrom) : ''
    const stationToName = log.stationTo ? getStationName(log.stationTo) : ''
    const empName = getEmployeeName(log.employeeId)

    switch (log.type) {
      case 'pickup':
        return {
          icon: '📥',
          text: `装车：从 ${stationFromName} 装车 ${log.bikeCount} 辆 → ${stationToName}`,
        }
      case 'dropoff':
        return {
          icon: '📤',
          text: `卸车：卸到 ${stationToName} ${log.bikeCount} 辆`,
        }
      case 'recycle':
        return {
          icon: '♻️',
          text: `回收：从 ${stationFromName} 回收 ${log.bikeCount} 辆故障车`,
        }
      case 'repair_done':
        return {
          icon: '🔧',
          text: `维修完成：${log.bikeCount} 辆修完送至 ${stationToName}`,
        }
      default:
        return {
          icon: '📋',
          text: `${log.type}: ${log.bikeCount} 辆`,
        }
    }
  }

  const recentLogs = [...dispatchLogs].reverse().slice(0, 20)

  return (
    <div className="card">
      <div className="card-header">
        <h2>🔧 维修车间</h2>
        <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span>待维修: {queuedJobs.length}</span>
          <span>维修中: {repairingJobs.length}</span>
          <span>已完成: {doneJobs.length}</span>
        </div>
      </div>
      <div className="card-body">
        <div className="two-col">
          <div>
            <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>⏳ 等待维修</h3>
            <div className="repair-list">
              {queuedJobs.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px' }}>
                  <div className="empty-state-icon">📭</div>
                  <div className="empty-state-text">暂无待维修任务</div>
                </div>
              ) : (
                queuedJobs.map(job => {
                  const bike = getBikeInfo(job.bikeId)
                  return (
                    <div key={job.id} className="repair-item">
                      <div className="repair-type-icon">{getRepairTypeIcon(job.type)}</div>
                      <div className="repair-info" style={{ flex: 1 }}>
                        <div className="bike-id">{bike?.id || job.bikeId}</div>
                        <div className="type">{getRepairTypeLabel(job.type)} · 费用: {formatMoney(job.cost)}</div>
                        <div className="type">预计耗时: {job.duration}分钟</div>
                        <div style={{ marginTop: '8px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginRight: '6px' }}>返回站点:</label>
                          <select
                            value={job.returnStationId || MAINTENANCE_STATION_ID}
                            onChange={(e) => setReturnStation(job.id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-dark)',
                              color: 'var(--text-primary)',
                              fontSize: '11px',
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {availableStations.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button 
                        className="btn btn-primary btn-small"
                        onClick={() => startRepair(job.id)}
                      >
                        开始维修
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>🔨 正在维修</h3>
            <div className="repair-list">
              {repairingJobs.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px' }}>
                  <div className="empty-state-icon">⏸️</div>
                  <div className="empty-state-text">暂无维修中的车辆</div>
                </div>
              ) : (
                repairingJobs.map(job => {
                  const bike = getBikeInfo(job.bikeId)
                  return (
                    <div key={job.id} className="repair-item">
                      <div className="repair-type-icon">{getRepairTypeIcon(job.type)}</div>
                      <div className="repair-info" style={{ flex: 1 }}>
                        <div className="bike-id">{bike?.id || job.bikeId}</div>
                        <div className="type">{getRepairTypeLabel(job.type)}</div>
                        <div className="repair-progress">
                          <div className="repair-status">
                            进度: {Math.floor(job.progress)}%
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${job.progress}%` }}
                            ></div>
                          </div>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginRight: '6px' }}>返回站点:</label>
                          <select
                            value={job.returnStationId || MAINTENANCE_STATION_ID}
                            onChange={(e) => setReturnStation(job.id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-dark)',
                              color: 'var(--text-primary)',
                              fontSize: '11px',
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {availableStations.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button 
                        className="btn btn-success btn-small"
                        onClick={() => completeRepair(job.id)}
                      >
                        完成
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>✅ 已完成维修</h3>
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'var(--bg-card)', 
            borderRadius: '6px',
          }}>
            {doneJobs.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <div className="empty-state-icon">🎉</div>
                <div className="empty-state-text">暂无已完成维修</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                {doneJobs.map(job => {
                  const bike = getBikeInfo(job.bikeId)
                  const returnStationId = job.returnStationId || MAINTENANCE_STATION_ID
                  const isReturned = bike?.stationId === returnStationId
                  const stationName = getStationName(returnStationId)
                  return (
                    <div 
                      key={job.id}
                      style={{
                        padding: '12px',
                        backgroundColor: 'var(--bg-dark)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        borderLeft: `3px solid ${isReturned ? 'var(--success-color)' : 'var(--warning-color)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '600' }}>{bike?.id || job.bikeId}</span>
                        <span className={`badge ${isReturned ? 'badge-low' : 'badge-medium'}`} style={{ fontSize: '10px' }}>
                          {isReturned ? '已返回' : '待返回'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                        <span>{getRepairTypeIcon(job.type)}</span>
                        <span>{getRepairTypeLabel(job.type)}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        完成时间: {job.completedAt !== undefined ? formatTime(job.completedAt) : '-'}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        📍 返回站: {stationName}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>🩹 故障车辆列表</h3>
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'var(--bg-card)', 
            borderRadius: '6px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '10px'
          }}>
            {brokenBikes.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px', gridColumn: '1 / -1' }}>
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-text">没有故障车辆</div>
              </div>
            ) : (
              brokenBikes.map(bike => (
                <div 
                  key={bike.id}
                  style={{
                    padding: '10px',
                    backgroundColor: 'var(--bg-dark)',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '6px' }}>{bike.id}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {!bike.brakeWorking && (
                      <span className="badge badge-high">刹车故障</span>
                    )}
                    {!bike.lockWorking && (
                      <span className="badge badge-medium">车锁故障</span>
                    )}
                    {!bike.gpsWorking && (
                      <span className="badge badge-medium">GPS故障</span>
                    )}
                    {bike.battery < 20 && (
                      <span className="badge badge-low">低电量</span>
                    )}
                  </div>
                  <button 
                    className="btn btn-secondary btn-small"
                    style={{ width: '100%' }}
                    onClick={() => handleAddRepair(bike.id)}
                  >
                    送修
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>📊 维修类型统计</h3>
          <div className="four-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>🛑</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                {repairJobs.filter(j => j.type === 'brake').length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>刹车维修</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>🔋</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                {repairJobs.filter(j => j.type === 'battery').length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>电池更换</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>📡</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                {repairJobs.filter(j => j.type === 'gps').length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>定位器维修</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>🔒</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                {repairJobs.filter(j => j.type === 'lock').length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>车锁维修</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>📦 流转日志（最近{recentLogs.length}条）</h3>
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'var(--bg-card)', 
            borderRadius: '6px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}>
            {recentLogs.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-text">暂无流转日志</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recentLogs.map(log => {
                  const info = getDispatchLogInfo(log)
                  const empName = getEmployeeName(log.employeeId)
                  return (
                    <div 
                      key={log.id}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-dark)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{info.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--text-primary)', marginBottom: '2px' }}>
                          {info.text}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                          <span>🕐 {formatTime(log.time)}</span>
                          {empName && <span>👷 {empName}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RepairShop
