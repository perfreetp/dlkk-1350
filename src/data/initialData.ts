import { Station, Bike, Employee, Achievement, GameRules, GameStats, GameEvent, Task, RepairJob, ChallengeConfig } from '../types'

export const generateStations = (): Station[] => {
  return [
    { id: 'st-001', name: '中央广场站', position: { x: 400, y: 300 }, capacity: 30, type: 'hub', availableBikes: 18, brokenBikes: 2, lowBatteryBikes: 5, demandLevel: 50, congestionLevel: 30 },
    { id: 'st-002', name: '科技园A站', position: { x: 650, y: 180 }, capacity: 25, type: 'hot', availableBikes: 22, brokenBikes: 0, lowBatteryBikes: 3, demandLevel: 80, congestionLevel: 60 },
    { id: 'st-003', name: '科技园B站', position: { x: 750, y: 280 }, capacity: 20, type: 'hot', availableBikes: 15, brokenBikes: 1, lowBatteryBikes: 2, demandLevel: 70, congestionLevel: 50 },
    { id: 'st-004', name: '商业街站', position: { x: 250, y: 450 }, capacity: 25, type: 'hot', availableBikes: 8, brokenBikes: 1, lowBatteryBikes: 4, demandLevel: 90, congestionLevel: 75 },
    { id: 'st-005', name: '地铁站C口', position: { x: 500, y: 500 }, capacity: 35, type: 'hub', availableBikes: 5, brokenBikes: 3, lowBatteryBikes: 2, demandLevel: 95, congestionLevel: 85 },
    { id: 'st-006', name: '住宅区东站', position: { x: 150, y: 200 }, capacity: 20, type: 'normal', availableBikes: 16, brokenBikes: 0, lowBatteryBikes: 1, demandLevel: 30, congestionLevel: 20 },
    { id: 'st-007', name: '住宅区西站', position: { x: 100, y: 350 }, capacity: 20, type: 'normal', availableBikes: 14, brokenBikes: 1, lowBatteryBikes: 2, demandLevel: 35, congestionLevel: 25 },
    { id: 'st-008', name: '大学东门', position: { x: 600, y: 450 }, capacity: 30, type: 'hot', availableBikes: 25, brokenBikes: 2, lowBatteryBikes: 6, demandLevel: 85, congestionLevel: 70 },
    { id: 'st-009', name: '医院北门', position: { x: 350, y: 150 }, capacity: 15, type: 'normal', availableBikes: 12, brokenBikes: 0, lowBatteryBikes: 1, demandLevel: 45, congestionLevel: 35 },
    { id: 'st-010', name: '体育中心站', position: { x: 700, y: 550 }, capacity: 25, type: 'normal', availableBikes: 20, brokenBikes: 1, lowBatteryBikes: 3, demandLevel: 55, congestionLevel: 40 },
    { id: 'st-011', name: '维修中心', position: { x: 50, y: 550 }, capacity: 50, type: 'maintenance', availableBikes: 10, brokenBikes: 5, lowBatteryBikes: 8, demandLevel: 10, congestionLevel: 5 },
    { id: 'st-012', name: '公园南门', position: { x: 850, y: 350 }, capacity: 15, type: 'normal', availableBikes: 10, brokenBikes: 0, lowBatteryBikes: 2, demandLevel: 25, congestionLevel: 15 },
    { id: 'st-np-01', name: '禁停区A', position: { x: 300, y: 550 }, capacity: 0, type: 'no_parking', availableBikes: 0, brokenBikes: 0, lowBatteryBikes: 0, demandLevel: 0, congestionLevel: 0 },
    { id: 'st-np-02', name: '禁停区B', position: { x: 800, y: 100 }, capacity: 0, type: 'no_parking', availableBikes: 0, brokenBikes: 0, lowBatteryBikes: 0, demandLevel: 0, congestionLevel: 0 },
  ]
}

export const generateBikes = (): Bike[] => {
  const bikes: Bike[] = []
  const stations = generateStations()
  let bikeId = 1

  stations.forEach(station => {
    if (station.type === 'no_parking') return
    const totalBikes = station.availableBikes + station.brokenBikes + station.lowBatteryBikes
    for (let i = 0; i < totalBikes; i++) {
      const isBroken = i < station.brokenBikes
      const isLowBattery = i >= station.brokenBikes && i < station.brokenBikes + station.lowBatteryBikes
      const battery = isLowBattery ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 40) + 55
      
      bikes.push({
        id: `bk-${String(bikeId).padStart(3, '0')}`,
        battery,
        status: isBroken ? 'broken' : 'available',
        stationId: station.id,
        position: { 
          x: station.position.x + (Math.random() - 0.5) * 30, 
          y: station.position.y + (Math.random() - 0.5) * 25 
        },
        lockWorking: !isBroken || Math.random() > 0.3,
        brakeWorking: !isBroken || Math.random() > 0.5,
        gpsWorking: !isBroken || Math.random() > 0.6,
        totalRides: Math.floor(Math.random() * 200),
        lastMaintenance: Math.floor(Math.random() * 7),
      })
      bikeId++
    }
  })

  return bikes
}

export const generateEmployees = (): Employee[] => {
  return [
    { id: 'emp-001', name: '张师傅', role: 'dispatcher', vehicle: 'truck', capacity: 10, currentLoad: 0, carryingBikes: [], position: { x: 50, y: 550 }, status: 'idle', currentAction: 'idle', currentTaskId: null, targetStationId: null, route: [], shift: 'morning', efficiency: 0.9, fatigue: 0, actionProgress: 0 },
    { id: 'emp-002', name: '李师傅', role: 'maintenance', vehicle: 'van', capacity: 5, currentLoad: 0, carryingBikes: [], position: { x: 50, y: 550 }, status: 'idle', currentAction: 'idle', currentTaskId: null, targetStationId: null, route: [], shift: 'morning', efficiency: 0.95, fatigue: 0, actionProgress: 0 },
    { id: 'emp-003', name: '王师傅', role: 'battery', vehicle: 'van', capacity: 8, currentLoad: 0, carryingBikes: [], position: { x: 50, y: 550 }, status: 'idle', currentAction: 'idle', currentTaskId: null, targetStationId: null, route: [], shift: 'afternoon', efficiency: 0.85, fatigue: 10, actionProgress: 0 },
    { id: 'emp-004', name: '赵师傅', role: 'patrol', vehicle: 'scooter', capacity: 2, currentLoad: 0, carryingBikes: [], position: { x: 400, y: 300 }, status: 'idle', currentAction: 'idle', currentTaskId: null, targetStationId: null, route: [], shift: 'all', efficiency: 0.8, fatigue: 5, actionProgress: 0 },
    { id: 'emp-005', name: '陈师傅', role: 'dispatcher', vehicle: 'truck', capacity: 12, currentLoad: 0, carryingBikes: [], position: { x: 50, y: 550 }, status: 'idle', currentAction: 'idle', currentTaskId: null, targetStationId: null, route: [], shift: 'night', efficiency: 0.9, fatigue: 0, actionProgress: 0 },
  ]
}

export const defaultRules: GameRules = {
  baseFare: 2.0,
  perMinuteRate: 0.15,
  maxDailyCharge: 15.0,
  membershipDiscount: 0.8,
  parkingGuideBonus: 0.5,
  illegalParkingFine: 10.0,
  lowBatteryThreshold: 20,
  overcapacityPenalty: 50.0,
}

export const defaultStats: GameStats = {
  revenue: 0,
  expenses: 0,
  satisfaction: 75,
  violationRate: 5,
  bikeTurnover: 0,
  totalRides: 0,
  avgRideDuration: 12,
  completedTasks: 0,
  failedTasks: 0,
  bikesInCirculation: 150,
  avgBattery: 65,
  dailyHistory: [],
  todayRevenue: {
    rideFares: 0,
    memberships: 0,
    fines: 0,
    other: 0,
  },
  todayExpenses: {
    repairs: 0,
    batteries: 0,
    salaries: 0,
    penalties: 0,
    other: 0,
  },
}

export const generateAchievements = (): Achievement[] => {
  return [
    { id: 'ach-001', type: 'time_limit', title: '效率达人', description: '在游戏日内完成10个调度任务', target: 10, current: 0, reward: 500, unlocked: false },
    { id: 'ach-002', type: 'low_budget', title: '精打细算', description: '单日支出低于500元且满意度不低于80', target: 500, current: 0, reward: 800, unlocked: false },
    { id: 'ach-003', type: 'peak_guarantee', title: '高峰卫士', description: '早高峰期间车辆可用率保持在90%以上', target: 90, current: 0, reward: 1000, unlocked: false },
    { id: 'ach-004', type: 'time_limit', title: '闪电维修', description: '单日完成5个维修任务', target: 5, current: 0, reward: 300, unlocked: false },
    { id: 'ach-005', type: 'peak_guarantee', title: '零投诉高峰', description: '晚高峰期间满意度不低于85', target: 85, current: 0, reward: 600, unlocked: false },
    { id: 'ach-006', type: 'low_budget', title: '低耗运营', description: '车辆周转率达到5次/天以上', target: 5, current: 0, reward: 1200, unlocked: false },
  ]
}

export const initialTasks: Task[] = [
  { id: 'task-001', type: 'replenish', title: '缺车补车', description: '地铁站C口车辆不足，急需补充车辆', stationId: 'st-005', priority: 'urgent', status: 'pending', createdAt: 480, assignedTo: null, progress: 0, reward: 100, penalty: 200, bikeCount: 5 },
  { id: 'task-002', type: 'recycle', title: '故障回收', description: '科技园A站有故障车辆需要回收维修', stationId: 'st-002', priority: 'medium', status: 'pending', createdAt: 480, assignedTo: null, progress: 0, reward: 80, penalty: 100, bikeCount: 2 },
  { id: 'task-003', type: 'battery', title: '换电作业', description: '大学东门多辆车电量过低需要换电', stationId: 'st-008', priority: 'high', status: 'pending', createdAt: 480, assignedTo: null, progress: 0, reward: 60, penalty: 150, bikeCount: 6 },
  { id: 'task-004', type: 'complaint', title: '投诉处理', description: '商业街站用户投诉车辆损坏', stationId: 'st-004', priority: 'high', status: 'pending', createdAt: 480, assignedTo: null, progress: 0, reward: 120, penalty: 300 },
]

export const initialEvents: GameEvent[] = []

export const initialRepairJobs: RepairJob[] = [
  { id: 'rp-001', bikeId: 'bk-003', type: 'brake', status: 'queued', cost: 50, duration: 30, progress: 0, createdAt: 480 },
  { id: 'rp-002', bikeId: 'bk-007', type: 'lock', status: 'queued', cost: 30, duration: 15, progress: 0, createdAt: 480 },
  { id: 'rp-003', bikeId: 'bk-012', type: 'gps', status: 'repairing', cost: 80, duration: 45, progress: 30, createdAt: 460, assignedTo: 'emp-002' },
]

export const challengeConfigs: ChallengeConfig[] = [
  {
    mode: 'time_limit',
    title: '限时挑战',
    description: '在5分钟游戏时间内，完成尽可能多的任务，获得更高利润',
    startMoney: 3000,
    timeLimit: 300,
    targetProfit: 1000,
    reward: 2000,
    difficulty: 'medium',
  },
  {
    mode: 'low_budget',
    title: '低预算挑战',
    description: '初始资金紧张，需要精打细算经营3天，目标利润2000元',
    startMoney: 1000,
    targetProfit: 2000,
    reward: 3000,
    difficulty: 'hard',
  },
  {
    mode: 'peak_guarantee',
    title: '高峰保障',
    description: '早晚高峰时段必须保证服务质量，满意度不能低于80%',
    startMoney: 4000,
    targetSatisfaction: 80,
    reward: 2500,
    difficulty: 'easy',
  },
]
