import { useGameStore } from '../store/gameStore'
import { formatMoney, getAchievementTypeLabel } from '../utils/format'

const Achievements = () => {
  const { achievements, stats, updateAchievementProgress, unlockAchievement } = useGameStore()

  const timeLimitAchievements = achievements.filter(a => a.type === 'time_limit')
  const lowBudgetAchievements = achievements.filter(a => a.type === 'low_budget')
  const peakGuaranteeAchievements = achievements.filter(a => a.type === 'peak_guarantee')

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalReward = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.reward, 0)

  const getProgressPercent = (current: number, target: number) => {
    return Math.min(100, (current / target) * 100)
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>🏆 成就挑战</h2>
        <div style={{ display: 'flex', gap: '15px', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            已解锁: <span style={{ color: 'var(--warning)', fontWeight: '600' }}>{unlockedCount}/{achievements.length}</span>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            累计奖励: <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>{formatMoney(totalReward)}</span>
          </span>
        </div>
      </div>
      <div className="card-body">
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⏱️ 限时挑战
          </h3>
          <div className="achievement-list">
            {timeLimitAchievements.map(achievement => {
              const progressPercent = getProgressPercent(achievement.current, achievement.target)
              return (
                <div 
                  key={achievement.id} 
                  className={`achievement-item ${achievement.unlocked ? 'unlocked' : ''}`}
                >
                  <div className="achievement-icon">
                    {achievement.unlocked ? '🏆' : '🔒'}
                  </div>
                  <div className="achievement-info">
                    <h3>{achievement.title}</h3>
                    <p>{achievement.description}</p>
                    <div className="achievement-reward">
                      奖励: {formatMoney(achievement.reward)}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span>进度</span>
                        <span>{achievement.current}/{achievement.target}</span>
                      </div>
                      <div className="progress-bar">
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
                      <button 
                        className="btn btn-secondary btn-small"
                        onClick={() => {
                          const newProgress = achievement.current + 1
                          updateAchievementProgress(achievement.id, newProgress)
                          if (newProgress >= achievement.target) {
                            unlockAchievement(achievement.id)
                          }
                        }}
                      >
                        模拟进度
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            💰 低预算挑战
          </h3>
          <div className="achievement-list">
            {lowBudgetAchievements.map(achievement => {
              const progressPercent = getProgressPercent(achievement.current, achievement.target)
              return (
                <div 
                  key={achievement.id} 
                  className={`achievement-item ${achievement.unlocked ? 'unlocked' : ''}`}
                >
                  <div className="achievement-icon">
                    {achievement.unlocked ? '🏆' : '🔒'}
                  </div>
                  <div className="achievement-info">
                    <h3>{achievement.title}</h3>
                    <p>{achievement.description}</p>
                    <div className="achievement-reward">
                      奖励: {formatMoney(achievement.reward)}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span>进度</span>
                        <span>{achievement.current}/{achievement.target}</span>
                      </div>
                      <div className="progress-bar">
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
                      <button 
                        className="btn btn-secondary btn-small"
                        onClick={() => {
                          const newProgress = achievement.current + 100
                          updateAchievementProgress(achievement.id, newProgress)
                          if (newProgress >= achievement.target) {
                            unlockAchievement(achievement.id)
                          }
                        }}
                      >
                        模拟进度
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '15px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ 高峰保障挑战
          </h3>
          <div className="achievement-list">
            {peakGuaranteeAchievements.map(achievement => {
              const progressPercent = getProgressPercent(achievement.current, achievement.target)
              return (
                <div 
                  key={achievement.id} 
                  className={`achievement-item ${achievement.unlocked ? 'unlocked' : ''}`}
                >
                  <div className="achievement-icon">
                    {achievement.unlocked ? '🏆' : '🔒'}
                  </div>
                  <div className="achievement-info">
                    <h3>{achievement.title}</h3>
                    <p>{achievement.description}</p>
                    <div className="achievement-reward">
                      奖励: {formatMoney(achievement.reward)}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span>进度</span>
                        <span>{achievement.current}%/{achievement.target}%</span>
                      </div>
                      <div className="progress-bar">
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
                      <button 
                        className="btn btn-secondary btn-small"
                        onClick={() => {
                          const newProgress = Math.min(achievement.target, achievement.current + 10)
                          updateAchievementProgress(achievement.id, newProgress)
                          if (newProgress >= achievement.target) {
                            unlockAchievement(achievement.id)
                          }
                        }}
                      >
                        模拟进度
                      </button>
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
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎮</div>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>游戏说明</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            完成成就挑战可获得额外资金奖励。<br/>
            在运营过程中注意控制成本、提升满意度、保障高峰时段服务质量。<br/>
            合理调度车辆和人员是取得高分的关键！
          </p>
        </div>
      </div>
    </div>
  )
}

export default Achievements
