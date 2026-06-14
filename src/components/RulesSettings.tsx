import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { formatMoney } from '../utils/format'

const RulesSettings = () => {
  const { rules, updateRules, resetGame } = useGameStore()
  const [localRules, setLocalRules] = useState(rules)
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (key: string, value: number) => {
    setLocalRules(prev => {
      const updated = { ...prev, [key]: value }
      setHasChanges(true)
      return updated
    })
  }

  const handleSave = () => {
    updateRules(localRules)
    setHasChanges(false)
  }

  const handleReset = () => {
    if (window.confirm('确定要重置游戏吗？所有进度将丢失。')) {
      resetGame()
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>⚙️ 规则设置</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-small" onClick={handleReset}>
            重置游戏
          </button>
          <button 
            className={`btn ${hasChanges ? 'btn-primary' : 'btn-secondary'} btn-small`}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            保存设置
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="rules-form">
          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>💰 计费规则</h3>
            </div>
            <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>起步价 (元)</label>
                <input 
                  type="number" 
                  value={localRules.baseFare}
                  onChange={(e) => handleChange('baseFare', parseFloat(e.target.value) || 0)}
                  step="0.5"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>每分钟费用 (元)</label>
                <input 
                  type="number" 
                  value={localRules.perMinuteRate}
                  onChange={(e) => handleChange('perMinuteRate', parseFloat(e.target.value) || 0)}
                  step="0.05"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>单日最高收费 (元)</label>
                <input 
                  type="number" 
                  value={localRules.maxDailyCharge}
                  onChange={(e) => handleChange('maxDailyCharge', parseFloat(e.target.value) || 0)}
                  step="1"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>🎁 优惠政策</h3>
            </div>
            <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>会员折扣 (0-1)</label>
                <input 
                  type="number" 
                  value={localRules.membershipDiscount}
                  onChange={(e) => handleChange('membershipDiscount', parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                  max="1"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  当前折扣: {Math.round(localRules.membershipDiscount * 100)}%
                </span>
              </div>
              <div className="form-group">
                <label>规范停车奖励 (元/次)</label>
                <input 
                  type="number" 
                  value={localRules.parkingGuideBonus}
                  onChange={(e) => handleChange('parkingGuideBonus', parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>🅿️ 停车规则</h3>
            </div>
            <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>违规停车罚款 (元)</label>
                <input 
                  type="number" 
                  value={localRules.illegalParkingFine}
                  onChange={(e) => handleChange('illegalParkingFine', parseFloat(e.target.value) || 0)}
                  step="1"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>低电量阈值 (%)</label>
                <input 
                  type="number" 
                  value={localRules.lowBatteryThreshold}
                  onChange={(e) => handleChange('lowBatteryThreshold', parseFloat(e.target.value) || 0)}
                  step="5"
                  min="0"
                  max="100"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  低于此电量视为低电量车辆
                </span>
              </div>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px' }}>⚠️ 运营罚款</h3>
            </div>
            <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>站点超载罚款 (元/次)</label>
                <input 
                  type="number" 
                  value={localRules.overcapacityPenalty}
                  onChange={(e) => handleChange('overcapacityPenalty', parseFloat(e.target.value) || 0)}
                  step="10"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>📋 当前规则预览</h3>
          <div style={{ fontSize: '13px', lineHeight: '2', color: 'var(--text-secondary)' }}>
            <p>• 计费: 起步价 {formatMoney(rules.baseFare)} + 每分钟 {formatMoney(rules.perMinuteRate)}</p>
            <p>• 封顶: 单日最高 {formatMoney(rules.maxDailyCharge)}</p>
            <p>• 会员: 享受 {Math.round(rules.membershipDiscount * 100)}% 折扣</p>
            <p>• 奖励: 规范停车奖励 {formatMoney(rules.parkingGuideBonus)}</p>
            <p>• 罚款: 违规停车 {formatMoney(rules.illegalParkingFine)}，站点超载 {formatMoney(rules.overcapacityPenalty)}</p>
            <p>• 低电量标准: 低于 {rules.lowBatteryThreshold}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RulesSettings
