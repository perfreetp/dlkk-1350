import { useState, useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import { challengeConfigs } from '../data/initialData'
import { formatMoney } from '../utils/format'
import { ChallengeMode, ChallengeHistoryEntry } from '../types'

const Achievements = () => {
  const { 
    achievements, stats, challengeMode, challengeConfig,
    startChallenge, showChallengeSelect, setShowChallengeSelect, 
    money, day, time, gameOver, gameWon, lossReason, challengeHistory
  } = useGameStore()

  const [selectedMode, setSelectedMode] = useState<ChallengeMode | null>(null)
  const [historyTab, setHistoryTab] = useState<ChallengeMode>('time_limit')

  const timeLimitAchievements = achievements.filter(a => a.type === 'time_limit')
  const lowBudgetAchievements = achievements.filter(a => a.type === 'low_budget')
  const peakGuaranteeAchievements = achievements.filter(a => a.type === 'peak_guarantee')

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalReward = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.reward, 0)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'var(--secondary)'
      case 'medium': return 'var(--warning)'
      case 'hard': return 'var(--danger)'
      default: return 'var(--text-secondary)'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单'
      case 'medium': return '中等'
      case 'hard': return '困难'
      default: return difficulty
    }
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'time_limit': return '⏱️'
      case 'low_budget': return '💰'
      case 'peak_guarantee': return '⚡'
      default: return '🎮'
    }
  }

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'time_limit': return '限时挑战'
      case 'low_budget': return '低预算挑战'
      case 'peak_guarantee': return '高峰保障'
      default: return mode
    }
  }

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const getStars = (rank?: number) => {
    const stars = rank ? 6 - rank : 1
    return '⭐'.repeat(Math.max(0, Math.min(5, stars)))
  }

  const sortHistory = (entries: ChallengeHistoryEntry[], mode: ChallengeMode) => {
    return [...entries].sort((a, b) => {
      if (a.result === 'won' && b.result !== 'won') return -1
      if (a.result !== 'won' && b.result === 'won') return 1
      if (mode === 'peak_guarantee') {
        return (b.finalSatisfaction || 0) - (a.finalSatisfaction || 0)
      }
      return b.profit - a.profit
    })
  }

  const filteredHistory = useMemo(() => {
    const filtered = challengeHistory.filter(h => h.mode === historyTab)
    return sortHistory(filtered, historyTab)
  }, [challengeHistory, historyTab])

  const handleStartChallenge = (mode: ChallengeMode) => {
    if (window.confirm(`确定要开始${getModeLabel(mode)}吗？当前进度将丢失。`)) {
      startChallenge(mode)
    }
  }

  const handleOpenChallengeSelect = () => {
    setShowChallengeSelect(true)
  }

  const currentProfit = challengeConfig ? money - challengeConfig.startMoney : 0

  return (
    <div className="card">
      <div className="card-header">
        <h2>🏆 成就挑战</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {challengeMode !== 'none' && (
            <div style={{ 
              fontSize: '12px', 
              padding: '4px 10px', 
              backgroundColor: 'var(--warning)',
              color: 'var(--bg-dark)',
              borderRadius: '4px',
              fontWeight: '600'
            }}>
              {getModeIcon(challengeMode)} {challengeConfig?.title}进行中
            </div>
          )}
          <button className="btn btn-primary btn-small" onClick={handleOpenChallengeSelect}>
            选择挑战
          </button>
        </div>
      </div>
      <div className="card-body">
        {challengeMode !== 'none' && challengeConfig && (
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', marginBottom: '20px' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getModeIcon(challengeMode)} 当前挑战状态
              </h3>
              <span 
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: getDifficultyColor(challengeConfig.difficulty) + '20',
                  color: getDifficultyColor(challengeConfig.difficulty),
                  fontWeight: '600'
                }}
              >
                {getDifficultyLabel(challengeConfig.difficulty)}
              </span>
            </div>
            <div className="card-body" style={{ padding: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '15px', margin: '0 0 6px 0' }}>{challengeConfig.title}</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  {challengeConfig.description}
                </p>
              </div>

              <div style={{ 
                marginBottom: '16px', 
                backgroundColor: 'var(--bg-dark)', 
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  padding: '6px 12px', 
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  color: 'var(--info)',
                  fontWeight: '600',
                  borderBottom: '1px solid var(--border)'
                }}>
                  📋 挑战起始条件
                </div>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', width: '50%', borderBottom: '1px solid var(--border)' }}>
                        起始资金
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                        {formatMoney(challengeConfig.startMoney)}
                      </td>
                    </tr>
                    {challengeConfig.timeLimit && (
                      <tr>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                          时限
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: '600', borderBottom: '1px solid var(--border)' }}>
                          {Math.floor(challengeConfig.timeLimit / 60)}分钟
                        </td>
                      </tr>
                    )}
                    {challengeConfig.targetProfit && (
                      <tr>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                          目标利润
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--warning)', borderBottom: '1px solid var(--border)' }}>
                          {formatMoney(challengeConfig.targetProfit)}
                        </td>
                      </tr>
                    )}
                    {challengeConfig.targetSatisfaction && (
                      <tr>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                          最低满意度
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--info)', borderBottom: '1px solid var(--border)' }}>
                          {challengeConfig.targetSatisfaction}%
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                        通关奖励
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--warning)' }}>
                        🎁 +{formatMoney(challengeConfig.reward)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    当前资金
                  </div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    color: money >= 0 ? 'var(--secondary)' : 'var(--danger)'
                  }}>
                    {formatMoney(money)}
                  </div>
                </div>
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    当前利润
                  </div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    color: currentProfit >= 0 ? 'var(--secondary)' : 'var(--danger)'
                  }}>
                    {currentProfit >= 0 ? '+' : ''}
                    {formatMoney(currentProfit)}
                  </div>
                </div>
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    满意度
                  </div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    color: stats.satisfaction >= 80 ? 'var(--secondary)' : stats.satisfaction >= 60 ? 'var(--warning)' : 'var(--danger)'
                  }}>
                    {stats.satisfaction.toFixed(1)}%
                  </div>
                </div>
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    已运营
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    第{day}天
                  </div>
                </div>
              </div>

              {challengeConfig.targetProfit && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>📈 利润目标进度</span>
                    <span>
                      {formatMoney(Math.max(0, currentProfit))} / {formatMoney(challengeConfig.targetProfit)}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill success"
                      style={{ 
                        width: `${Math.min(100, Math.max(0, (currentProfit / challengeConfig.targetProfit) * 100))}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {challengeConfig.targetSatisfaction && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>😊 满意度目标进度</span>
                    <span>{stats.satisfaction.toFixed(1)}% / {challengeConfig.targetSatisfaction}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className={`progress-fill ${stats.satisfaction >= challengeConfig.targetSatisfaction ? 'success' : 'danger'}`}
                      style={{ width: `${Math.min(100, (stats.satisfaction / challengeConfig.targetSatisfaction) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {gameOver && lossReason && (
                <div style={{ 
                  marginBottom: '12px',
                  padding: '10px 12px', 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                  borderRadius: '6px',
                  border: '1px solid var(--danger)',
                  fontSize: '12px',
                  color: 'var(--danger)'
                }}>
                  <span style={{ fontWeight: '600' }}>❌ 失败原因：</span>{lossReason}
                </div>
              )}

              <div style={{ 
                padding: '10px', 
                backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                borderRadius: '6px',
                border: '1px solid var(--warning)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--warning)', marginBottom: '2px' }}>
                  🎁 通关奖励
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--warning)' }}>
                  +{formatMoney(challengeConfig.reward)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎮 挑战模式
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {challengeConfigs.map(config => {
              const isActive = challengeMode === config.mode
              const modeAchievements = achievements.filter(a => a.type === config.mode)
              const modeUnlocked = modeAchievements.filter(a => a.unlocked).length
              
              return (
                <div 
                  key={config.mode}
                  style={{
                    padding: '16px',
                    backgroundColor: isActive ? 'var(--bg-card)' : 'var(--bg-card)',
                    borderRadius: '8px',
                    border: `2px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: isActive ? 1 : 0.9
                  }}
                  onClick={() => setSelectedMode(selectedMode === config.mode ? null : config.mode)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '28px' }}>
                      {getModeIcon(config.mode)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '15px' }}>{config.title}</h4>
                        <span 
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: getDifficultyColor(config.difficulty) + '20',
                            color: getDifficultyColor(config.difficulty),
                            fontWeight: '600'
                          }}
                        >
                          {getDifficultyLabel(config.difficulty)}
                        </span>
                        {isActive && (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            fontWeight: '600'
                          }}>
                            进行中
                          </span>
                        )}
                      </div>
                      <p style={{ 
                        fontSize: '12px', 
                        color: 'var(--text-secondary)', 
                        margin: '4px 0 0 0'
                      }}>
                        {config.description}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                        成就进度
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {modeUnlocked}/{modeAchievements.length}
                      </div>
                    </div>
                  </div>
                  
                  {selectedMode === config.mode && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>起始资金: </span>
                          <span style={{ fontWeight: '600' }}>{formatMoney(config.startMoney)}</span>
                        </div>
                        {config.timeLimit && (
                          <div style={{ fontSize: '12px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>时间限制: </span>
                            <span style={{ fontWeight: '600' }}>{Math.floor(config.timeLimit / 60)}分钟</span>
                          </div>
                        )}
                        {config.targetProfit && (
                          <div style={{ fontSize: '12px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>目标利润: </span>
                            <span style={{ fontWeight: '600', color: 'var(--warning)' }}>
                              {formatMoney(config.targetProfit)}
                            </span>
                          </div>
                        )}
                        {config.targetSatisfaction && (
                          <div style={{ fontSize: '12px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>最低满意度: </span>
                            <span style={{ fontWeight: '600', color: 'var(--info)' }}>
                              {config.targetSatisfaction}%
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>通关奖励: </span>
                          <span style={{ fontWeight: '600', color: 'var(--warning)' }}>
                            +{formatMoney(config.reward)}
                          </span>
                        </div>
                      </div>
                      
                      {!isActive && (
                        <button 
                          className="btn btn-primary btn-small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartChallenge(config.mode)
                          }}
                        >
                          开始此挑战
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏅 挑战历史榜单
          </h3>
          
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            marginBottom: '12px',
            padding: '4px',
            backgroundColor: 'var(--bg-dark)',
            borderRadius: '8px'
          }}>
            {(['time_limit', 'low_budget', 'peak_guarantee'] as ChallengeMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setHistoryTab(mode)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: historyTab === mode ? '600' : '400',
                  backgroundColor: historyTab === mode ? 'var(--primary)' : 'transparent',
                  color: historyTab === mode ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                {getModeIcon(mode)} {getModeLabel(mode)}
              </button>
            ))}
          </div>

          <div style={{ 
            backgroundColor: 'var(--bg-card)', 
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid var(--border)'
          }}>
            {filteredHistory.length === 0 ? (
              <div style={{ 
                padding: '40px 20px', 
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '13px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                <div>暂无记录，开始挑战吧！</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-dark)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>排名</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>日期/时间</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>结果</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>运营天数</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>利润</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>满意度</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>星级</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((entry, index) => (
                      <tr key={entry.id} style={{ 
                        borderBottom: index < filteredHistory.length - 1 ? '1px solid var(--border)' : 'none',
                        backgroundColor: index === 0 ? 'rgba(245, 158, 11, 0.05)' : 'transparent'
                      }}>
                        <td style={{ padding: '10px 12px', fontWeight: index < 3 ? '600' : '400' }}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                          {formatDateTime(entry.endTime)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {entry.result === 'won' ? (
                            <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>✅ 通关</span>
                          ) : (
                            <span style={{ color: 'var(--danger)', fontWeight: '600' }}>❌ 失败</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          {entry.totalDays.toFixed(1)}天
                        </td>
                        <td style={{ 
                          padding: '10px 12px', 
                          textAlign: 'right',
                          fontWeight: '600',
                          color: entry.profit >= 0 ? 'var(--secondary)' : 'var(--danger)'
                        }}>
                          {entry.profit >= 0 ? '+' : ''}{formatMoney(entry.profit)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          {entry.finalSatisfaction !== undefined ? `${entry.finalSatisfaction.toFixed(1)}%` : '-'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px' }}>
                          {getStars(entry.rank)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏆 成就列表
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
              已解锁 {unlockedCount}/{achievements.length}，累计奖励 {formatMoney(totalReward)}
            </span>
          </h3>
          
          <div className="achievement-list">
            {achievements.map(achievement => {
              const progressPercent = Math.min(100, (achievement.current / achievement.target) * 100)
              return (
                <div 
                  key={achievement.id} 
                  className={`achievement-item ${achievement.unlocked ? 'unlocked' : ''}`}
                >
                  <div className="achievement-icon">
                    {achievement.unlocked ? '🏆' : '🔒'}
                  </div>
                  <div className="achievement-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px' }}>{achievement.title}</h4>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-dark)',
                        color: 'var(--text-secondary)',
                      }}>
                        {getModeLabel(achievement.type)}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0' }}>
                      {achievement.description}
                    </p>
                    <div className="achievement-reward" style={{ fontSize: '11px' }}>
                      奖励: {formatMoney(achievement.reward)}
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span>进度</span>
                        <span>{achievement.current}/{achievement.target}</span>
                      </div>
                      <div className="progress-bar" style={{ height: '4px' }}>
                        <div 
                          className={`progress-fill ${achievement.unlocked ? 'success' : ''}`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {achievement.unlocked ? (
                      <span style={{ color: 'var(--warning)', fontSize: '12px', fontWeight: '600' }}>
                        ✅ 已完成
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        未解锁
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ 
          marginTop: '24px', 
          padding: '20px', 
          backgroundColor: 'var(--bg-card)', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎮</div>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>游戏说明</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            完成挑战模式可获得额外资金奖励。<br/>
            在运营过程中注意控制成本、提升满意度、保障高峰时段服务质量。<br/>
            合理调度车辆和人员是取得高分的关键！
          </p>
        </div>
      </div>
    </div>
  )
}

export default Achievements
