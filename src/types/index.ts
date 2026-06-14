export interface Position {
  x: number
  y: number
}

export type BikeStatus = 'available' | 'riding' | 'broken' | 'maintenance' | 'transit'

export interface Bike {
  id: string
  battery: number
  status: BikeStatus
  stationId: string | null
  position: Position
  lockWorking: boolean
  brakeWorking: boolean
  gpsWorking: boolean
  totalRides: number
  lastMaintenance: number
  rideStartTime?: number
  rideStartStationId?: string
  targetStationId?: string
  inTransit?: 'to_repair' | 'to_station' | 'from_station' | null
  transitSourceId?: string
  transitTargetId?: string
  dispatchTime?: number
}

export type StationType = 'normal' | 'hot' | 'no_parking' | 'maintenance' | 'hub'

export interface Station {
  id: string
  name: string
  position: Position
  capacity: number
  type: StationType
  availableBikes: number
  brokenBikes: number
  lowBatteryBikes: number
  demandLevel: number
  congestionLevel: number
  baseDemandLevel?: number
  baseCongestionLevel?: number
  dispatchPriorityBoost?: number
  boostedUntil?: number
}

export type TaskType = 'replenish' | 'recycle' | 'battery' | 'complaint'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export interface Task {
  id: string
  type: TaskType
  title: string
  description: string
  stationId: string
  priority: TaskPriority
  status: TaskStatus
  createdAt: number
  assignedTo: string | null
  progress: number
  reward: number
  penalty: number
  bikeCount?: number
  sourceStationId?: string
  targetStationId?: string
  completedAt?: number
  actualReward?: number
  actualPenalty?: number
}

export type EmployeeRole = 'dispatcher' | 'maintenance' | 'battery' | 'patrol'

export type VehicleType = 'truck' | 'van' | 'scooter' | 'bike'

export type ShiftType = 'morning' | 'afternoon' | 'night' | 'all'

export type EmployeeAction = 'idle' | 'traveling' | 'loading' | 'unloading' | 'repairing' | 'swapping_battery' | 'resting'

export interface RoutePoint {
  stationId: string
  action: 'pickup' | 'dropoff' | 'repair' | 'battery'
  order: number
  bikeIds?: string[]
}

export interface Employee {
  id: string
  name: string
  role: EmployeeRole
  vehicle: VehicleType
  capacity: number
  currentLoad: number
  carryingBikes: string[]
  position: Position
  status: 'idle' | 'working' | 'rest'
  currentAction: EmployeeAction
  currentTaskId: string | null
  targetStationId: string | null
  route: RoutePoint[]
  shift: ShiftType
  efficiency: number
  fatigue: number
  actionProgress: number
}

export type EventType = 'rain' | 'concert' | 'subway_failure' | 'illegal_parking' | 'peak_hour'

export interface GameEvent {
  id: string
  type: EventType
  title: string
  description: string
  severity: 'mild' | 'moderate' | 'severe'
  startTime: number
  duration: number
  affectedStations: string[]
  effects: {
    demandMultiplier?: number
    speedMultiplier?: number
    parkingViolationRate?: number
    batteryDrainMultiplier?: number
    fineMultiplier?: number
  }
  active: boolean
}

export type RepairType = 'brake' | 'battery' | 'gps' | 'lock'

export interface RepairJob {
  id: string
  bikeId: string
  type: RepairType
  status: 'queued' | 'repairing' | 'done'
  cost: number
  duration: number
  progress: number
  createdAt: number
  assignedTo?: string
  returnStationId?: string
  completedAt?: number
}

export interface GameRules {
  baseFare: number
  perMinuteRate: number
  maxDailyCharge: number
  membershipDiscount: number
  parkingGuideBonus: number
  illegalParkingFine: number
  lowBatteryThreshold: number
  overcapacityPenalty: number
}

export interface DailyStats {
  day: number
  revenue: {
    rideFares: number
    memberships: number
    fines: number
    other: number
    total: number
  }
  expenses: {
    repairs: number
    batteries: number
    salaries: number
    penalties: number
    other: number
    total: number
  }
  rides: number
  avgRideDuration: number
  avgSatisfaction: number
  avgViolationRate: number
  bikeTurnover: number
  completedTasks: number
  failedTasks: number
  eventsTriggered: number
  taskRevenue: {
    replenish: number
    recycle: number
    battery: number
    complaint: number
  }
  taskPenalty: {
    replenish: number
    recycle: number
    battery: number
    complaint: number
  }
  stationStats: {
    stationId: string
    stationName: string
    rides: number
    revenue: number
    violations: number
    satisfactionContribution: number
  }[]
}

export type ChallengeResult = 'won' | 'lost' | 'abandoned'

export interface ChallengeHistoryEntry {
  id: string
  mode: ChallengeMode
  title: string
  startTime: number
  endTime: number
  totalDays: number
  result: ChallengeResult
  lossReason?: string
  startMoney: number
  endMoney: number
  profit: number
  targetProfit?: number
  finalSatisfaction?: number
  targetSatisfaction?: number
  completedTasks: number
  failedTasks: number
  totalRides: number
  totalRevenue: number
  totalExpenses: number
  reward?: number
  rank?: number
}

export interface GameStats {
  revenue: number
  expenses: number
  satisfaction: number
  violationRate: number
  bikeTurnover: number
  totalRides: number
  avgRideDuration: number
  completedTasks: number
  failedTasks: number
  bikesInCirculation: number
  avgBattery: number
  dailyHistory: DailyStats[]
  todayRevenue: {
    rideFares: number
    memberships: number
    fines: number
    other: number
  }
  todayExpenses: {
    repairs: number
    batteries: number
    salaries: number
    penalties: number
    other: number
  }
  todayTaskRevenue: {
    replenish: number
    recycle: number
    battery: number
    complaint: number
  }
  todayTaskPenalty: {
    replenish: number
    recycle: number
    battery: number
    complaint: number
  }
  todayStationStats: Map<string, {
    rides: number
    revenue: number
    violations: number
    satisfactionContribution: number
  }>
}

export type AchievementType = 'time_limit' | 'low_budget' | 'peak_guarantee'

export type ChallengeMode = 'none' | 'time_limit' | 'low_budget' | 'peak_guarantee'

export interface ChallengeConfig {
  mode: ChallengeMode
  title: string
  description: string
  startMoney: number
  timeLimit?: number
  targetProfit?: number
  targetSatisfaction?: number
  reward: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface Achievement {
  id: string
  type: AchievementType
  title: string
  description: string
  target: number
  current: number
  reward: number
  unlocked: boolean
}

export interface GameState {
  day: number
  time: number
  speed: number
  isPaused: boolean
  money: number
  gameStarted: boolean
  challengeMode: ChallengeMode
  challengeConfig: ChallengeConfig | null
  challengeStart: number
  rules: GameRules
  stats: GameStats
  stations: Station[]
  bikes: Bike[]
  tasks: Task[]
  employees: Employee[]
  events: GameEvent[]
  repairJobs: RepairJob[]
  achievements: Achievement[]
  activePanel: string
  selectedStationId: string | null
  showChallengeSelect: boolean
  gameOver: boolean
  gameWon: boolean
  lossReason?: string
  challengeHistory: ChallengeHistoryEntry[]
  dispatchLogs: {
    id: string
    time: number
    type: 'pickup' | 'dropoff' | 'recycle' | 'repair_done' | 'to_repair'
    stationFrom?: string
    stationTo?: string
    bikeCount: number
    employeeId?: string
  }[]
}
