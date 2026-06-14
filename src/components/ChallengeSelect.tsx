import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import { challengeConfigs } from '../data/initialData'
import { formatMoney } from '../utils/format'
import { ChallengeMode, ChallengeHistoryEntry } from '../types'

const ChallengeSelect = () => {
  const { 
    showChallengeSelect, setShowChallengeSelect, startChallenge, 
    gameOver, gameWon, endChallenge, money, challengeConfig, stats,
    lossReason, challengeHistory, day
  } = useGameStore()

  const handleStartChallenge = (mode: ChallengeMode) => {
    startChallenge(mode)
  }

  const handleClose = () => {
    setShowChallengeSelect(false)
  }

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

  const getBestRecord = (mode: ChallengeMode) => {
    const records = challengeHistory.filter(h => h.mode === mode)
    if (records.length === 0) return null
    
    const wonRecords = records.filter(h => h.result === 'won')
    const pool = wonRecords.length > 0 ? wonRecords : records
    
    if (mode === 'peak_guarantee') {
      return pool.reduce((best, curr) => 
        (curr.finalSatisfaction || 0) > (best.finalSatisfaction || 0) ? curr : best
      )
    }
    return pool.reduce((best, curr) => curr.profit > best.profit ? curr : best)
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

  const currentRank = useMemo(() => {
    if (!challengeConfig || !gameOver) return null
    const modeRecords = challengeHistory.filter(h => h.mode === challengeConfig.mode)
    const sorted = sortHistory(modeRecords, challengeConfig.mode)
    const lastEntry = sorted[sorted.length - 1]
    const rank = sorted.findIndex(h => h.id === lastEntry?.id) + 1
    return rank > 0 ? { rank, total: sorted.length } : null
  }, [challengeHistory, challengeConfig, gameOver])

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: '🥇', color: 'var(--warning)', label: '冠军！' }
    if (rank === 2) return { icon: '🥈', color: 'var(--text-secondary)', label: '亚军！' }
    if (rank === 3) return { icon: '🥉', color: '#cd7f32', label: '季军！' }
    return { icon: '📊', color: 'var(--info)', label: `第${rank}名` }
  }

  const profit = challengeConfig ? money - challengeConfig.startMoney : 0

  if (!showChallengeSelect && !gameOver) {
    return null
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '750px' }}>
        {gameOver ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            {gameWon ? (
              <>
                <div style={{ 
                  fontSize: '80px', 
                  marginBottom: '8px',
                  animation: 'bounce 1s ease infinite'
                }}>
                  🎉🏆🎉
                </div>
                <div style={{ 
                  fontSize: '24px', 
                  marginBottom: '12px',
                  letterSpacing: '4px'
                }}>
                  ✨🌟 恭喜通关 🌟✨
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '72px', marginBottom: '12px' }}>
                  😢💔
                </div>
                <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--danger)' }}>
                  挑战失败
                </h2>
              </>
            )}
            
            <h2 style={{ 
              fontSize: gameWon ? '20px' : '16px', 
              marginBottom: gameWon ? '4px' : '8px', 
              color: gameWon ? 'var(--warning)' : 'var(--text-secondary)',
              fontWeight: gameWon ? '700' : '400'
            }}>
              {challengeConfig?.title}
            </h2>

            {gameWon && challengeConfig && (
              <div style={{ 
                marginBottom: '20px',
                padding: '10px 20px',
                display: 'inline-block',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderRadius: '20px',
                border: '1px solid var(--warning)',
                fontSize: '13px'
              }}>
                <span style={{ color: 'var(--warning)', fontWeight: '600' }}>
                  🎁 奖励已发放：+{formatMoney(challengeConfig.reward)}
                </span>
              </div>
            )}

            {!gameWon && lossReason && (
              <div style={{ 
                marginBottom: '20px',
                padding: '10px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                border: '1px solid var(--danger)',
                fontSize: '13px',
                color: 'var(--danger)',
                display: 'inline-block'
              }}>
                <span style={{ fontWeight: '600' }}>❌ 失败原因：</span>{lossReason}
              </div>
            )}

            {currentRank && (
              <div style={{ 
                marginBottom: '20px',
                padding: '12px 20px',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '10px',
                border: '1px solid var(--info)',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '24px' }}>{getRankBadge(currentRank.rank).icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', color: getRankBadge(currentRank.rank).color }}>
                    本局排名：{getRankBadge(currentRank.rank).label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    共 {currentRank.total} 条历史记录
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderRadius: '12px', 
              padding: '20px', 
              marginBottom: '24px',
              textAlign: 'left',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                📊 本局数据统计
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    🚴 总骑行次数
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {stats.totalRides} 次
                  </div>
                </div>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    ✅ 总任务完成
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--secondary)' }}>
                    {stats.completedTasks} 个
                  </div>
                </div>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    💰 总营收
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--secondary)' }}>
                    {formatMoney(stats.revenue)}
                  </div>
                </div>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    💸 总支出
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--danger)' }}>
                    {formatMoney(stats.expenses)}
                  </div>
                </div>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    💵 最终资金
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--secondary)' }}>
                    {formatMoney(money)}
                  </div>
                </div>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    📈 最终利润
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: profit >= 0 ? 'var(--secondary)' : 'var(--danger)'
                  }}>
                    {profit >= 0 ? '+' : ''}{formatMoney(profit)}
                  </div>
                </div>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    😊 最终满意度
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: stats.satisfaction >= 80 ? 'var(--secondary)' : stats.satisfaction >= 60 ? 'var(--warning)' : 'var(--danger)'
                  }}>
                    {stats.satisfaction.toFixed(1)}%
                  </div>
                </div>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    📅 运营天数
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {day} 天
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={handleClose}>
                🏠 返回主菜单
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => challengeConfig && handleStartChallenge(challengeConfig.mode)}
              >
                🔄 再来一次
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <h2>🎮 选择挑战模式</h2>
              <button className="modal-close" onClick={handleClose}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                选择一种挑战模式开始游戏。不同模式有不同的起始条件和目标，完成挑战可获得丰厚奖励！
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {challengeConfigs.map(config => {
                  const bestRecord = getBestRecord(config.mode)
                  return (
                    <div 
                      key={config.mode}
                      style={{
                        padding: '20px',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      className="challenge-card"
                      onClick={() => handleStartChallenge(config.mode)}
                    >
                      {bestRecord && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          fontSize: '10px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--warning)',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}>
                          🏆 历史最佳：
                          {config.mode === 'peak_guarantee' 
                            ? `${(bestRecord.finalSatisfaction || 0).toFixed(1)}%`
                            : formatMoney(bestRecord.profit)
                          }
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ 
                          fontSize: '40px',
                          width: '56px',
                          height: '56px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'var(--bg-dark)',
                          borderRadius: '12px',
                          flexShrink: 0
                        }}>
                          {getModeIcon(config.mode)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px' }}>{config.title}</h3>
                            <span 
                              style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: getDifficultyColor(config.difficulty) + '20',
                                color: getDifficultyColor(config.difficulty),
                                fontWeight: '600'
                              }}
                            >
                              {getDifficultyLabel(config.difficulty)}
                            </span>
                          </div>
                          <p style={{ 
                            fontSize: '13px', 
                            color: 'var(--text-secondary)', 
                            margin: '0 0 14px 0',
                            lineHeight: '1.6'
                          }}>
                            {config.description}
                          </p>
                          
                          <div style={{ 
                            backgroundColor: 'var(--bg-dark)', 
                            borderRadius: '8px',
                            overflow: 'hidden',
                            marginBottom: '12px'
                          }}>
                            <div style={{ 
                              fontSize: '11px', 
                              padding: '6px 12px', 
                              backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              color: 'var(--info)',
                              fontWeight: '600',
                              borderBottom: '1px solid var(--border)'
                            }}>
                              📋 开始条件
                            </div>
                            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                              <tbody>
                                <tr>
                                  <td style={{ padding: '7px 12px', color: 'var(--text-secondary)', width: '45%', borderBottom: '1px solid var(--border)' }}>
                                    起始资金
                                  </td>
                                  <td style={{ padding: '7px 12px', fontWeight: '600', color: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                                    {formatMoney(config.startMoney)}
                                  </td>
                                </tr>
                                {config.timeLimit && (
                                  <tr>
                                    <td style={{ padding: '7px 12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                                      时限
                                    </td>
                                    <td style={{ padding: '7px 12px', fontWeight: '600', borderBottom: '1px solid var(--border)' }}>
                                      {Math.floor(config.timeLimit / 60)} 分钟
                                    </td>
                                  </tr>
                                )}
                                {config.targetProfit && (
                                  <tr>
                                    <td style={{ padding: '7px 12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                                      目标利润
                                    </td>
                                    <td style={{ padding: '7px 12px', fontWeight: '600', color: 'var(--warning)', borderBottom: '1px solid var(--border)' }}>
                                      {formatMoney(config.targetProfit)}
                                    </td>
                                  </tr>
                                )}
                                {config.targetSatisfaction && (
                                  <tr>
                                    <td style={{ padding: '7px 12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                                      最低满意度
                                    </td>
                                    <td style={{ padding: '7px 12px', fontWeight: '600', color: 'var(--info)', borderBottom: '1px solid var(--border)' }}>
                                      {config.targetSatisfaction}%
                                    </td>
                                  </tr>
                                )}
                                <tr>
                                  <td style={{ padding: '7px 12px', color: 'var(--text-secondary)' }}>
                                    通关奖励
                                  </td>
                                  <td style={{ padding: '7px 12px', fontWeight: '600', color: 'var(--warning)' }}>
                                    🎁 +{formatMoney(config.reward)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '4px', textAlign: 'right' }}>
                        <button className="btn btn-primary btn-small">
                          开始挑战 →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ 
                marginTop: '24px', 
                padding: '16px', 
                backgroundColor: 'var(--bg-card)', 
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                💡 提示：可以随时点击右上角"重置游戏"切换挑战模式
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ChallengeSelect
