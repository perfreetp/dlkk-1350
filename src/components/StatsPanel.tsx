import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { formatMoney, formatTime } from '../utils/format'

const StatsPanel = () => {
  const { stats, money, stations, bikes, tasks, day, time, events } = useGameStore()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

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

  const activeEvents = events.filter(e => 
    time >= e.startTime && time < e.startTime + e.duration
  )

  const demandMultiplier = activeEvents.reduce((acc, e) => 
    acc * (e.effects.demandMultiplier || 1), 1
  )
  const violationMultiplier = activeEvents.reduce((acc, e) => 
    acc * (e.effects.parkingViolationRate || 1), 1
  )

  const todayRevenue = stats.todayRevenue
  const todayExpenses = stats.todayExpenses
  const todayTotalRevenue = todayRevenue.rideFares + todayRevenue.memberships + todayRevenue.fines + todayRevenue.other
  const todayTotalExpenses = todayExpenses.repairs + todayExpenses.batteries + todayExpenses.salaries + todayExpenses.penalties + todayExpenses.other

  const selectedDayStats = selectedDay !== null 
    ? stats.dailyHistory.find(d => d.day === selectedDay) 
    : null

  const displayStats = selectedDayStats ? {
    revenue: selectedDayStats.revenue.total,
    expenses: selectedDayStats.expenses.total,
    satisfaction: selectedDayStats.avgSatisfaction,
    violationRate: selectedDayStats.avgViolationRate,
    bikeTurnover: selectedDayStats.bikeTurnover,
    totalRides: selectedDayStats.rides,
    completedTasks: selectedDayStats.completedTasks,
    failedTasks: selectedDayStats.failedTasks,
  } : {
    revenue: stats.revenue,
    expenses: stats.expenses,
    satisfaction: stats.satisfaction,
    violationRate: stats.violationRate,
    bikeTurnover: stats.bikeTurnover,
    totalRides: stats.totalRides,
    completedTasks: stats.completedTasks,
    failedTasks: stats.failedTasks,
  }

  const displayRevenue = selectedDayStats ? selectedDayStats.revenue : todayRevenue
  const displayExpenses = selectedDayStats ? selectedDayStats.expenses : todayExpenses
  const displayTotalRevenue = selectedDayStats ? selectedDayStats.revenue.total : todayTotalRevenue
  const displayTotalExpenses = selectedDayStats ? selectedDayStats.expenses.total : todayTotalExpenses

  return (
    <div className="card">
      <div className="card-header">
        <h2>📊 运营结算</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            第 {day} 天 {formatTime(time)}
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="stats-grid">
          <div className="stat-card revenue">
            <div className="value">{formatMoney(displayStats.revenue)}</div>
            <div className="label">总收入</div>
          </div>
          <div className="stat-card satisfaction">
            <div className="value">{displayStats.satisfaction.toFixed(1)}%</div>
            <div className="label">用户满意度</div>
          </div>
          <div className="stat-card violation">
            <div className="value">{displayStats.violationRate.toFixed(1)}%</div>
            <div className="label">违规率</div>
          </div>
          <div className="stat-card turnover">
            <div className="value">{displayStats.bikeTurnover.toFixed(1)}</div>
            <div className="label">车辆周转率</div>
          </div>
        </div>

        <div className="two-col" style={{ marginTop: '20px' }}>
          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>💰 收入来源明细</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🚲</span>
                    <span style={{ color: 'var(--text-secondary)' }}>骑行费用</span>
                  </div>
                  <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>
                    +{formatMoney(displayRevenue.rideFares)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🎫</span>
                    <span style={{ color: 'var(--text-secondary)' }}>会员收入</span>
                  </div>
                  <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>
                    +{formatMoney(displayRevenue.memberships)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>💸</span>
                    <span style={{ color: 'var(--text-secondary)' }}>违规罚款</span>
                  </div>
                  <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>
                    +{formatMoney(displayRevenue.fines)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📦</span>
                    <span style={{ color: 'var(--text-secondary)' }}>其他收入</span>
                  </div>
                  <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>
                    +{formatMoney(displayRevenue.other)}
                  </span>
                </div>
                <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>收入合计</span>
                  <span style={{ color: 'var(--secondary)' }}>+{formatMoney(displayTotalRevenue)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>💳 支出明细</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🔧</span>
                    <span style={{ color: 'var(--text-secondary)' }}>维修费用</span>
                  </div>
                  <span style={{ color: 'var(--danger)', fontWeight: '600' }}>
                    -{formatMoney(displayExpenses.repairs)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🔋</span>
                    <span style={{ color: 'var(--text-secondary)' }}>电池成本</span>
                  </div>
                  <span style={{ color: 'var(--danger)', fontWeight: '600' }}>
                    -{formatMoney(displayExpenses.batteries)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>👷</span>
                    <span style={{ color: 'var(--text-secondary)' }}>员工薪资</span>
                  </div>
                  <span style={{ color: 'var(--danger)', fontWeight: '600' }}>
                    -{formatMoney(displayExpenses.salaries)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span style={{ color: 'var(--text-secondary)' }}>任务罚款</span>
                  </div>
                  <span style={{ color: 'var(--danger)', fontWeight: '600' }}>
                    -{formatMoney(displayExpenses.penalties)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🎁</span>
                    <span style={{ color: 'var(--text-secondary)' }}>其他支出</span>
                  </div>
                  <span style={{ color: 'var(--danger)', fontWeight: '600' }}>
                    -{formatMoney(displayExpenses.other)}
                  </span>
                </div>
                <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>支出合计</span>
                  <span style={{ color: 'var(--danger)' }}>-{formatMoney(displayTotalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="two-col" style={{ marginTop: '20px' }}>
          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>😊 满意度计算说明</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>基础满意度</span>
                  <span>75%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>完成任务加成</span>
                  <span style={{ color: 'var(--secondary)' }}>+{displayStats.completedTasks * 0.5}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>失败任务扣减</span>
                  <span style={{ color: 'var(--danger)' }}>-{displayStats.failedTasks * 2}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>违规停车扣减</span>
                  <span style={{ color: 'var(--danger)' }}>-{(displayStats.violationRate * 0.5).toFixed(1)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>规范停车奖励</span>
                  <span style={{ color: 'var(--secondary)' }}>+{(displayStats.totalRides * 0.1).toFixed(1)}%</span>
                </div>
                {activeEvents.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>事件影响</span>
                    <span style={{ color: 'var(--warning)' }}>进行中 {activeEvents.length} 个</span>
                  </div>
                )}
                <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>当前满意度</span>
                  <span style={{ color: displayStats.satisfaction >= 80 ? 'var(--secondary)' : displayStats.satisfaction >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                    {displayStats.satisfaction.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>⚠️ 违规率计算说明</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>基础违规率</span>
                  <span>5%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>站点拥堵影响</span>
                  <span style={{ color: 'var(--warning)' }}>
                    +{((stations.reduce((sum, s) => sum + s.congestionLevel, 0) / stations.length / 100) * 2).toFixed(2)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>需求倍率影响</span>
                  <span style={{ color: demandMultiplier > 1 ? 'var(--danger)' : 'var(--secondary)' }}>
                    {demandMultiplier > 1 ? '+' : ''}{((demandMultiplier - 1) * 3).toFixed(2)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>事件违规倍率</span>
                  <span style={{ color: violationMultiplier > 1 ? 'var(--danger)' : 'var(--secondary)' }}>
                    x{violationMultiplier.toFixed(1)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>车辆低电量占比</span>
                  <span style={{ color: 'var(--warning)' }}>
                    {bikes.filter(b => b.battery < 20).length}/{bikes.length}
                  </span>
                </div>
                <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>当前违规率</span>
                  <span style={{ color: displayStats.violationRate <= 5 ? 'var(--secondary)' : displayStats.violationRate <= 10 ? 'var(--warning)' : 'var(--danger)' }}>
                    {displayStats.violationRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px', backgroundColor: 'var(--bg-card)' }}>
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
                <span style={{ color: 'var(--secondary)' }}>{displayStats.completedTasks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>失败/超时</span>
                <span style={{ color: 'var(--danger)' }}>{displayStats.failedTasks}</span>
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

        {stats.dailyHistory.length > 0 && (
          <div className="card" style={{ marginTop: '20px', backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>📅 每日历史记录</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                共 {stats.dailyHistory.length} 天记录
              </div>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <button 
                  className={`btn btn-small ${selectedDay === null ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedDay(null)}
                >
                  今日
                </button>
                {stats.dailyHistory.map(d => (
                  <button 
                    key={d.day}
                    className={`btn btn-small ${selectedDay === d.day ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedDay(d.day)}
                  >
                    第{d.day}天
                  </button>
                ))}
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>日期</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>收入</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>支出</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>利润</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>满意度</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>违规率</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>骑行数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.dailyHistory.map(d => {
                      const profit = d.revenue.total - d.expenses.total
                      return (
                        <tr 
                          key={d.day} 
                          style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                          className={selectedDay === d.day ? 'selected' : ''}
                          onClick={() => setSelectedDay(d.day)}
                        >
                          <td style={{ padding: '8px' }}>第 {d.day} 天</td>
                          <td style={{ textAlign: 'right', padding: '8px', color: 'var(--secondary)' }}>
                            +{formatMoney(d.revenue.total)}
                          </td>
                          <td style={{ textAlign: 'right', padding: '8px', color: 'var(--danger)' }}>
                            -{formatMoney(d.expenses.total)}
                          </td>
                          <td style={{ textAlign: 'right', padding: '8px', fontWeight: '600', color: profit >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                            {profit >= 0 ? '+' : ''}{formatMoney(profit)}
                          </td>
                          <td style={{ textAlign: 'right', padding: '8px' }}>{d.avgSatisfaction.toFixed(1)}%</td>
                          <td style={{ textAlign: 'right', padding: '8px' }}>{d.avgViolationRate.toFixed(1)}%</td>
                          <td style={{ textAlign: 'right', padding: '8px' }}>{d.rides}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginTop: '6px', fontSize: '11px' }}>
                      <span>需求: {station.demandLevel.toFixed(0)}%</span>
                      <span>拥堵: {station.congestionLevel.toFixed(0)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px', backgroundColor: 'var(--bg-card)' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px' }}>💰 财务概览</h3>
          </div>
          <div className="card-body" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>当前资金</span>
                <span style={{ fontWeight: '600', color: money >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                  {formatMoney(money)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>累计营业收入</span>
                <span style={{ color: 'var(--secondary)' }}>+{formatMoney(stats.revenue)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>累计运营支出</span>
                <span style={{ color: 'var(--danger)' }}>-{formatMoney(stats.expenses)}</span>
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                <span>累计净利润</span>
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

        <div className="card" style={{ marginTop: '20px', backgroundColor: 'var(--bg-card)' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px' }}>🚲 车辆状态概览</h3>
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
                <span style={{ color: 'var(--text-secondary)' }}>骑行中</span>
                <span style={{ color: 'var(--info)' }}>{bikes.filter(b => b.status === 'riding').length} 辆</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>故障车辆</span>
                <span style={{ color: 'var(--danger)' }}>{brokenBikes} 辆</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>维修中</span>
                <span style={{ color: 'var(--warning)' }}>{bikes.filter(b => b.status === 'maintenance').length} 辆</span>
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
    </div>
  )
}

export default StatsPanel
