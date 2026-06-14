import { useGameStore } from '../store/gameStore'
import { formatMoney } from '../utils/format'

const StatsPanel = () => {
  const { stats, money, stations, bikes, tasks, day, time } = useGameStore()

  const profit = stats.revenue - stats.expenses
  const profitRate = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0

  const availableBikes = bikes.filter(b => b.status === 'available').length
  const brokenBikes = bikes.filter(b => b.status === 'broken').length
  const avgBattery = bikes.length > 0 
    ? Math.round(bikes.reduce((sum, b) => sum + b.battery, 0) / bikes.length)
    : 0

  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  const taskCompletionRate = tasks.length > 0 
    ? Math.round((completedTasks / tasks.length) * 100) 
    : 0

  const hourlyData = [42, 58, 73, 95, 82, 67, 55, 48, 62, 78, 91, 85]

  return (
    <div className="card">
      <div className="card-header">
        <h2>📊 运营结算</h2>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          第 {day} 天运营数据
        </div>
      </div>
      <div className="card-body">
        <div className="stats-grid">
          <div className="stat-card revenue">
            <div className="value">{formatMoney(stats.revenue)}</div>
            <div className="label">总收入</div>
          </div>
          <div className="stat-card satisfaction">
            <div className="value">{stats.satisfaction}%</div>
            <div className="label">用户满意度</div>
          </div>
          <div className="stat-card violation">
            <div className="value">{stats.violationRate}%</div>
            <div className="label">违规率</div>
          </div>
          <div className="stat-card turnover">
            <div className="value">{stats.bikeTurnover.toFixed(1)}</div>
            <div className="label">车辆周转率</div>
          </div>
        </div>

        <div className="two-col" style={{ marginTop: '20px' }}>
          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>💰 财务概览</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>当前资金</span>
                  <span style={{ fontWeight: '600', color: profit >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                    {formatMoney(money)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>营业收入</span>
                  <span style={{ color: 'var(--secondary)' }}>+{formatMoney(stats.revenue)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>运营支出</span>
                  <span style={{ color: 'var(--danger)' }}>-{formatMoney(stats.expenses)}</span>
                </div>
                <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>净利润</span>
                  <span style={{ color: profit >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                    {profit >= 0 ? '+' : ''}{formatMoney(profit)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>利润率</span>
                  <span style={{ 
                    fontSize: '12px',
                    color: profitRate >= 20 ? 'var(--secondary)' : profitRate >= 0 ? 'var(--warning)' : 'var(--danger)'
                  }}>
                    {profitRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>🚲 车辆状态</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>总车辆数</span>
                  <span style={{ fontWeight: '600' }}>{bikes.length} 辆</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>可用车辆</span>
                  <span style={{ color: 'var(--secondary)' }}>{availableBikes} 辆</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>故障车辆</span>
                  <span style={{ color: 'var(--danger)' }}>{brokenBikes} 辆</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>平均电量</span>
                  <span style={{ 
                    color: avgBattery >= 60 ? 'var(--secondary)' : avgBattery >= 20 ? 'var(--warning)' : 'var(--danger)'
                  }}>
                    {avgBattery}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>总骑行次数</span>
                  <span style={{ fontWeight: '600' }}>{stats.totalRides} 次</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>平均骑行时长</span>
                  <span>{stats.avgRideDuration} 分钟</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="two-col" style={{ marginTop: '20px' }}>
          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>📋 任务完成情况</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>总任务数</span>
                  <span style={{ fontWeight: '600' }}>{tasks.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>已完成</span>
                  <span style={{ color: 'var(--secondary)' }}>{stats.completedTasks}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>失败/超时</span>
                  <span style={{ color: 'var(--danger)' }}>{stats.failedTasks}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>待处理</span>
                  <span style={{ color: 'var(--warning)' }}>{pendingTasks}</span>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>完成率</span>
                    <span>{taskCompletionRate}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className={`progress-fill ${taskCompletionRate >= 80 ? 'success' : taskCompletionRate >= 50 ? 'warning' : 'danger'}`}
                      style={{ width: `${taskCompletionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>📈 骑行量趋势 (模拟)</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div className="chart-container" style={{ height: '150px' }}>
                {hourlyData.map((value, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div 
                      className="chart-bar" 
                      style={{ height: `${value}%` }}
                    ></div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{idx + 7}时</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px', backgroundColor: 'var(--bg-card)' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px' }}>🏢 站点运营状态</h3>
          </div>
          <div className="card-body" style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {stations.filter(s => s.type !== 'no_parking').map(station => {
                const usageRate = station.capacity > 0 ? (station.availableBikes / station.capacity) * 100 : 0
                return (
                  <div key={station.id} style={{
                    padding: '10px',
                    backgroundColor: 'var(--bg-dark)',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '6px' }}>{station.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>车辆</span>
                      <span>{station.availableBikes}/{station.capacity}</span>
                    </div>
                    <div className="progress-bar" style={{ height: '6px' }}>
                      <div 
                        className={`progress-fill ${usageRate > 80 ? 'danger' : usageRate > 50 ? 'warning' : 'success'}`}
                        style={{ width: `${usageRate}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsPanel
