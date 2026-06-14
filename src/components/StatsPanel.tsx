import { useState, useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import { formatMoney, formatTime } from '../utils/format'

const StatsPanel = () => {
  const { 
    stats, money, stations, bikes, tasks, day, time, events,
    challengeMode, challengeConfig, challengeHistory
  } = useGameStore()
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

  const displayTaskRevenue = selectedDayStats ? selectedDayStats.taskRevenue : stats.todayTaskRevenue
  const displayTaskPenalty = selectedDayStats ? selectedDayStats.taskPenalty : stats.todayTaskPenalty

  const taskTypeLabels: Record<string, { name: string; icon: string }> = {
    replenish: { name: '补车任务', icon: '🚚' },
    recycle: { name: '回收任务', icon: '♻️' },
    battery: { name: '换电任务', icon: '🔋' },
    complaint: { name: '投诉处理', icon: '📞' },
  }

  const totalTaskRevenue = Object.values(displayTaskRevenue).reduce((sum, v) => sum + v, 0)
  const totalTaskPenalty = Object.values(displayTaskPenalty).reduce((sum, v) => sum + v, 0)

  const stationRankingData = useMemo(() => {
    let rankings: {
      stationId: string
      stationName: string
      rides: number
      revenue: number
      violations: number
      satisfactionContribution: number
      score: number
    }[] = []

    if (selectedDayStats && selectedDayStats.stationStats && selectedDayStats.stationStats.length > 0) {
      rankings = selectedDayStats.stationStats.map(s => ({
        ...s,
        score: s.revenue * 0.5 + s.rides * 10 + s.satisfactionContribution * 50,
      }))
    } else if (stats.todayStationStats && stats.todayStationStats.size > 0) {
      rankings = Array.from(stats.todayStationStats.entries()).map(([stationId, data]) => {
        const station = stations.find(s => s.id === stationId)
        return {
          stationId,
          stationName: station?.name || stationId,
          rides: data.rides,
          revenue: data.revenue,
          violations: data.violations,
          satisfactionContribution: data.satisfactionContribution,
          score: data.revenue * 0.5 + data.rides * 10 + data.satisfactionContribution * 50,
        }
      })
    } else {
      rankings = stations
        .filter(s => s.type !== 'no_parking')
        .map(s => ({
          stationId: s.id,
          stationName: s.name,
          rides: 0,
          revenue: s.availableBikes * 2,
          violations: Math.floor(s.congestionLevel / 10),
          satisfactionContribution: (100 - s.congestionLevel) * 0.1,
          score: s.availableBikes * 5 + s.demandLevel * 0.5 - s.congestionLevel * 0.3,
        }))
    }

    rankings.sort((a, b) => b.score - a.score)
    return rankings
  }, [selectedDayStats, stats.todayStationStats, stations])

  const top3Stations = stationRankingData.slice(0, 3)
  const bottom3Stations = stationRankingData.slice(-3).reverse()

  const bestHistory = useMemo(() => {
    if (!challengeMode || challengeMode === 'none') return null
    const sameModeHistory = challengeHistory.filter(h => h.mode === challengeMode)
    if (sameModeHistory.length === 0) return null
    
    if (challengeMode === 'peak_guarantee') {
      return sameModeHistory
        .filter(h => h.finalSatisfaction !== undefined)
        .sort((a, b) => (b.finalSatisfaction || 0) - (a.finalSatisfaction || 0))[0]
    } else {
      return sameModeHistory.sort((a, b) => b.profit - a.profit)[0]
    }
  }, [challengeMode, challengeHistory])

  const currentRank = useMemo(() => {
    if (!challengeMode || challengeMode === 'none' || !challengeConfig) return null
    const sameModeHistory = challengeHistory.filter(h => h.mode === challengeMode)
    if (sameModeHistory.length === 0) return { rank: 1, total: 1 }

    let currentValue: number
    if (challengeMode === 'peak_guarantee') {
      currentValue = stats.satisfaction
    } else {
      currentValue = money - challengeConfig.startMoney
    }

    let betterCount = 0
    for (const h of sameModeHistory) {
      const hValue = challengeMode === 'peak_guarantee' ? (h.finalSatisfaction || 0) : h.profit
      if (hValue > currentValue) betterCount++
    }

    return { rank: betterCount + 1, total: sameModeHistory.length + 1 }
  }, [challengeMode, challengeHistory, challengeConfig, money, stats.satisfaction])

  const difficultyLabels: Record<string, { label: string; color: string }> = {
    easy: { label: '简单', color: 'var(--secondary)' },
    medium: { label: '中等', color: 'var(--warning)' },
    hard: { label: '困难', color: 'var(--danger)' },
  }

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
              <h3 style={{ fontSize: '14px' }}>✅ 任务收入明细</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(taskTypeLabels).map(([type, { name, icon }]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{icon}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                    </div>
                    <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>
                      +{formatMoney(displayTaskRevenue[type as keyof typeof displayTaskRevenue])}
                    </span>
                  </div>
                ))}
                <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>任务收入合计</span>
                  <span style={{ color: 'var(--secondary)' }}>+{formatMoney(totalTaskRevenue)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>❌ 任务罚款明细</h3>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(taskTypeLabels).map(([type, { name, icon }]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{icon}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                    </div>
                    <span style={{ color: 'var(--danger)', fontWeight: '600' }}>
                      -{formatMoney(displayTaskPenalty[type as keyof typeof displayTaskPenalty])}
                    </span>
                  </div>
                ))}
                <div style={{ height: '1px', backgroundColor: 'var(--border)' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                  <span>任务罚款合计</span>
                  <span style={{ color: 'var(--danger)' }}>-{formatMoney(totalTaskPenalty)}</span>
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
            <h3 style={{ fontSize: '14px' }}>🏆 站点经营排名 / 拖后腿警告</h3>
          </div>
          <div className="card-body" style={{ padding: '16px' }}>
            <div className="two-col" style={{ gap: '16px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--secondary)', marginBottom: '10px' }}>
                  🎉 TOP 3 优秀站点
                </div>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-secondary)' }}>排名</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-secondary)' }}>站点</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-secondary)' }}>营收</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-secondary)' }}>骑行</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-secondary)' }}>满意度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top3Stations.map((s, idx) => (
                      <tr key={s.stationId} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 8px', fontWeight: '600', color: 'var(--secondary)' }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: '500' }}>{s.stationName}</td>
                        <td style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--secondary)' }}>
                          +{formatMoney(s.revenue)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>{s.rides}</td>
                        <td style={{ textAlign: 'right', padding: '6px 8px', color: s.satisfactionContribution >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                          {s.satisfactionContribution >= 0 ? '+' : ''}{s.satisfactionContribution.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--danger)', marginBottom: '10px' }}>
                  ⚠️ BOTTOM 3 待改进站点
                </div>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-secondary)' }}>排名</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-secondary)' }}>站点</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-secondary)' }}>营收</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-secondary)' }}>骑行</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-secondary)' }}>满意度</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bottom3Stations.map((s, idx) => (
                      <tr key={s.stationId} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 8px', fontWeight: '600', color: 'var(--danger)' }}>
                          {idx === 0 ? '💀' : idx === 1 ? '😱' : '😟'}
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: '500' }}>{s.stationName}</td>
                        <td style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--danger)' }}>
                          +{formatMoney(s.revenue)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>{s.rides}</td>
                        <td style={{ textAlign: 'right', padding: '6px 8px', color: s.satisfactionContribution >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                          {s.satisfactionContribution >= 0 ? '+' : ''}{s.satisfactionContribution.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

        {challengeMode !== 'none' && challengeConfig && (
          <div className="card" style={{ marginTop: '20px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--primary)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>🎯 挑战模式整局表现</h3>
              <div style={{ 
                fontSize: '12px', 
                padding: '2px 8px', 
                borderRadius: '4px',
                backgroundColor: `${difficultyLabels[challengeConfig.difficulty].color}22`,
                color: difficultyLabels[challengeConfig.difficulty].color,
                fontWeight: '600'
              }}>
                {difficultyLabels[challengeConfig.difficulty].label}
              </div>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>
                    {challengeConfig.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {challengeConfig.description}
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                  gap: '12px' 
                }}>
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: 'var(--bg-dark)', 
                    borderRadius: '8px' 
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>起始资金</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--secondary)' }}>
                      {formatMoney(challengeConfig.startMoney)}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: 'var(--bg-dark)', 
                    borderRadius: '8px' 
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>已运营天数</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>
                      第 {day} 天
                    </div>
                  </div>
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: 'var(--bg-dark)', 
                    borderRadius: '8px' 
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>当前资金</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: money >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                      {formatMoney(money)}
                    </div>
                  </div>
                  {challengeMode !== 'peak_guarantee' && (
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: 'var(--bg-dark)', 
                      borderRadius: '8px' 
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>当前利润</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: (money - challengeConfig.startMoney) >= 0 ? 'var(--secondary)' : 'var(--danger)' }}>
                        {(money - challengeConfig.startMoney) >= 0 ? '+' : ''}{formatMoney(money - challengeConfig.startMoney)}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ 
                  padding: '14px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '8px' 
                }}>
                  {challengeMode === 'peak_guarantee' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600' }}>满意度目标</span>
                        <span style={{ fontSize: '13px' }}>
                          当前 {stats.satisfaction.toFixed(1)}% / 最低 {challengeConfig.targetSatisfaction}%
                        </span>
                      </div>
                      <div className="progress-bar" style={{ height: '10px' }}>
                        <div 
                          className={`progress-fill ${stats.satisfaction >= (challengeConfig.targetSatisfaction || 0) ? 'success' : 'warning'}`}
                          style={{ 
                            width: `${Math.min(100, (stats.satisfaction / Math.max(1, (challengeConfig.targetSatisfaction || 0))) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {stats.satisfaction >= (challengeConfig.targetSatisfaction || 0) 
                          ? '✅ 满意度达标，继续保持！' 
                          : '⚠️ 满意度低于目标，注意高峰时段服务质量！'}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600' }}>利润目标</span>
                        <span style={{ fontSize: '13px' }}>
                          当前 {money - challengeConfig.startMoney >= 0 ? '+' : ''}{formatMoney(money - challengeConfig.startMoney)} 
                          {' / '}
                          目标 {formatMoney(challengeConfig.targetProfit || 0)}
                        </span>
                      </div>
                      <div className="progress-bar" style={{ height: '10px' }}>
                        <div 
                          className={`progress-fill ${(money - challengeConfig.startMoney) >= (challengeConfig.targetProfit || 0) ? 'success' : (money - challengeConfig.startMoney) >= 0 ? 'warning' : 'danger'}`}
                          style={{ 
                            width: `${Math.min(100, Math.max(0, ((money - challengeConfig.startMoney) / Math.max(1, (challengeConfig.targetProfit || 0))) * 100))}%` 
                          }}
                        ></div>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {(money - challengeConfig.startMoney) >= (challengeConfig.targetProfit || 0)
                          ? '🎉 已达成目标！'
                          : `还差 ${formatMoney((challengeConfig.targetProfit || 0) - (money - challengeConfig.startMoney))} 达成目标`}
                      </div>
                    </>
                  )}
                </div>

                {bestHistory && (
                  <div style={{ 
                    padding: '14px', 
                    backgroundColor: 'var(--bg-dark)', 
                    borderRadius: '8px',
                    border: '1px dashed var(--border)'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px', color: 'var(--warning)' }}>
                      🏆 历史最好成绩
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                      gap: '10px',
                      fontSize: '12px'
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>结果：</span>
                        <span style={{ 
                          fontWeight: '600', 
                          color: bestHistory.result === 'won' ? 'var(--secondary)' : 'var(--danger)' 
                        }}>
                          {bestHistory.result === 'won' ? '✓ 通关成功' : '✗ 挑战失败'}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>运营天数：</span>
                        <span style={{ fontWeight: '600' }}>{bestHistory.totalDays.toFixed(1)} 天</span>
                      </div>
                      {bestHistory.rank && (
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>评级：</span>
                          <span style={{ fontWeight: '600' }}>{'★'.repeat(bestHistory.rank)}{'☆'.repeat(5 - bestHistory.rank)}</span>
                        </div>
                      )}
                      {challengeMode === 'peak_guarantee' ? (
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>最终满意度：</span>
                          <span style={{ fontWeight: '600', color: 'var(--secondary)' }}>
                            {(bestHistory.finalSatisfaction || 0).toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>最终利润：</span>
                          <span style={{ 
                            fontWeight: '600', 
                            color: bestHistory.profit >= 0 ? 'var(--secondary)' : 'var(--danger)' 
                          }}>
                            {bestHistory.profit >= 0 ? '+' : ''}{formatMoney(bestHistory.profit)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>总骑行：</span>
                        <span style={{ fontWeight: '600' }}>{bestHistory.totalRides} 次</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>完成任务：</span>
                        <span style={{ fontWeight: '600' }}>{bestHistory.completedTasks} 个</span>
                      </div>
                    </div>
                  </div>
                )}

                {currentRank && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: `${currentRank.rank <= Math.ceil(currentRank.total / 3) ? 'var(--secondary)' : currentRank.rank <= Math.ceil(currentRank.total * 2 / 3) ? 'var(--warning)' : 'var(--danger)'}15`,
                    borderRadius: '8px',
                    border: `1px solid ${currentRank.rank <= Math.ceil(currentRank.total / 3) ? 'var(--secondary)' : currentRank.rank <= Math.ceil(currentRank.total * 2 / 3) ? 'var(--warning)' : 'var(--danger)'}44`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>本局目前排名估算：</span>
                        <span style={{ 
                          fontSize: '20px', 
                          fontWeight: '700',
                          marginLeft: '8px',
                          color: currentRank.rank <= Math.ceil(currentRank.total / 3) ? 'var(--secondary)' : currentRank.rank <= Math.ceil(currentRank.total * 2 / 3) ? 'var(--warning)' : 'var(--danger)'
                        }}>
                          第 {currentRank.rank} 名
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        共 {currentRank.total} 次历史记录
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      {currentRank.rank <= Math.ceil(currentRank.total / 3) 
                        ? '🌟 表现优秀，保持领先！'
                        : currentRank.rank <= Math.ceil(currentRank.total * 2 / 3)
                        ? '💪 中等水平，还有提升空间！'
                        : '📉 需要加油，争取更好成绩！'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatsPanel
