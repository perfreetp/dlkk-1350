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
}

export type EmployeeRole = 'dispatcher' | 'maintenance' | 'battery' | 'patrol'

export type VehicleType = 'truck' | 'van' | 'scooter' | 'bike'

export type ShiftType = 'morning' | 'afternoon' | 'night' | 'all'

export interface RoutePoint {
  stationId: string
  action: 'pickup' | 'dropoff' | 'repair' | 'battery'
  order: number
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
  currentTaskId: string | null
  route: RoutePoint[]
  shift: ShiftType
  efficiency: number
  fatigue: number
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
  }
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
}

export type AchievementType = 'time_limit' | 'low_budget' | 'peak_guarantee'

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
}
