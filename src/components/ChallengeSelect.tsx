import { useGameStore } from '../store/gameStore'
import { challengeConfigs } from '../data/initialData'
import { formatMoney } from '../utils/format'
import { ChallengeMode } from '../types'

const ChallengeSelect = () => {
  const { showChallengeSelect, setShowChallengeSelect, startChallenge, gameOver, gameWon, endChallenge, money, challengeConfig, stats } = useGameStore()

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

  if (!showChallengeSelect && !gameOver) {
    return null
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        {gameOver ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
              {gameWon ? '🏆' : '😢'}
            </div>
            <h2 style={{ fontSize: '24px', marginBottom: '8px', color: gameWon ? 'var(--warning)' : 'var(--danger)' }}>
              {gameWon ? '挑战成功！' : '挑战失败'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {challengeConfig?.title}
            </p>
            
            <div style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderRadius: '8px', 
              padding: '20px', 
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                📊 挑战结果
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    最终资金
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--secondary)' }}>
                    {formatMoney(money)}
                  </div>
                </div>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    利润
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: money - (challengeConfig?.startMoney || 0) >= 0 ? 'var(--secondary)' : 'var(--danger)'
                  }}>
                    {money - (challengeConfig?.startMoney || 0) >= 0 ? '+' : ''}
                    {formatMoney(money - (challengeConfig?.startMoney || 0))}
                  </div>
                </div>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-dark)', 
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    满意度
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
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    完成任务
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {stats.completedTasks} 个
                  </div>
                </div>
              </div>
              
              {gameWon && challengeConfig && (
                <div style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                  borderRadius: '6px',
                  border: '1px solid var(--warning)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--warning)', marginBottom: '4px' }}>
                    🎁 通关奖励
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--warning)' }}>
                    +{formatMoney(challengeConfig.reward)}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={handleClose}>
                返回主菜单
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => challengeConfig && handleStartChallenge(challengeConfig.mode)}
              >
                再来一次
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
                {challengeConfigs.map(config => (
                  <div 
                    key={config.mode}
                    style={{
                      padding: '20px',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    className="challenge-card"
                    onClick={() => handleStartChallenge(config.mode)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{ fontSize: '36px' }}>
                        {getModeIcon(config.mode)}
                      </div>
                      <div style={{ flex: 1 }}>
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
                          margin: '0 0 12px 0',
                          lineHeight: '1.6'
                        }}>
                          {config.description}
                        </p>
                        
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '12px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>起始资金: </span>
                            <span style={{ fontWeight: '600', color: 'var(--secondary)' }}>
                              {formatMoney(config.startMoney)}
                            </span>
                          </div>
                          {config.timeLimit && (
                            <div style={{ fontSize: '12px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>时间限制: </span>
                              <span style={{ fontWeight: '600' }}>
                                {Math.floor(config.timeLimit / 60)}分钟
                              </span>
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
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '12px', textAlign: 'right' }}>
                      <button className="btn btn-primary btn-small">
                        开始挑战 →
                      </button>
                    </div>
                  </div>
                ))}
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
