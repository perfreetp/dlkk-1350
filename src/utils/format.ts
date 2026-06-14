export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export const formatMoney = (amount: number): string => {
  return `¥${amount.toFixed(2)}`
}

export const getBatteryColor = (battery: number): string => {
  if (battery >= 60) return '#22c55e'
  if (battery >= 20) return '#f59e0b'
  return '#ef4444'
}

export const getBatteryClass = (battery: number): string => {
  if (battery >= 60) return 'high'
  if (battery >= 20) return 'mid'
  return 'low'
}

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent': return '#ef4444'
    case 'high': return '#f59e0b'
    case 'medium': return '#06b6d4'
    case 'low': return '#22c55e'
    default: return '#64748b'
  }
}

export const getPriorityLabel = (priority: string): string => {
  switch (priority) {
    case 'urgent': return '紧急'
    case 'high': return '高'
    case 'medium': return '中'
    case 'low': return '低'
    default: return priority
  }
}

export const getTaskTypeLabel = (type: string): string => {
  switch (type) {
    case 'replenish': return '缺车补车'
    case 'recycle': return '故障回收'
    case 'battery': return '换电作业'
    case 'complaint': return '投诉处理'
    default: return type
  }
}

export const getTaskTypeIcon = (type: string): string => {
  switch (type) {
    case 'replenish': return '🚲'
    case 'recycle': return '🔧'
    case 'battery': return '🔋'
    case 'complaint': return '📋'
    default: return '📌'
  }
}

export const getEmployeeRoleLabel = (role: string): string => {
  switch (role) {
    case 'dispatcher': return '调度员'
    case 'maintenance': return '维修员'
    case 'battery': return '换电员'
    case 'patrol': return '巡检员'
    default: return role
  }
}

export const getVehicleTypeLabel = (vehicle: string): string => {
  switch (vehicle) {
    case 'truck': return '货车'
    case 'van': return '厢式车'
    case 'scooter': return '电动车'
    case 'bike': return '自行车'
    default: return vehicle
  }
}

export const getShiftLabel = (shift: string): string => {
  switch (shift) {
    case 'morning': return '早班 (6-14)'
    case 'afternoon': return '午班 (14-22)'
    case 'night': return '夜班 (22-6)'
    case 'all': return '全天'
    default: return shift
  }
}

export const getRepairTypeLabel = (type: string): string => {
  switch (type) {
    case 'brake': return '刹车维修'
    case 'battery': return '电池更换'
    case 'gps': return '定位器维修'
    case 'lock': return '车锁维修'
    default: return type
  }
}

export const getRepairTypeIcon = (type: string): string => {
  switch (type) {
    case 'brake': return '🛑'
    case 'battery': return '🔋'
    case 'gps': return '📡'
    case 'lock': return '🔒'
    default: return '🔧'
  }
}

export const getEventTypeLabel = (type: string): string => {
  switch (type) {
    case 'rain': return '暴雨天气'
    case 'concert': return '演唱会散场'
    case 'subway_failure': return '地铁故障'
    case 'illegal_parking': return '集中乱停'
    case 'peak_hour': return '高峰期'
    default: return type
  }
}

export const getEventTypeIcon = (type: string): string => {
  switch (type) {
    case 'rain': return '🌧️'
    case 'concert': return '🎵'
    case 'subway_failure': return '🚇'
    case 'illegal_parking': return '⚠️'
    case 'peak_hour': return '⏰'
    default: return '📢'
  }
}

export const getStationTypeLabel = (type: string): string => {
  switch (type) {
    case 'normal': return '普通站点'
    case 'hot': return '热门站点'
    case 'no_parking': return '禁停区'
    case 'maintenance': return '维修中心'
    case 'hub': return '枢纽站'
    default: return type
  }
}

export const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

export const getAchievementTypeLabel = (type: string): string => {
  switch (type) {
    case 'time_limit': return '限时挑战'
    case 'low_budget': return '低预算挑战'
    case 'peak_guarantee': return '高峰保障'
    default: return type
  }
}
