import { create } from 'zustand'
import { 
  GameState, Task, Employee, GameEvent, RepairJob, Bike, 
  Station, GameRules, Achievement, TaskPriority, TaskType,
  DailyStats, ChallengeConfig, ChallengeMode, ChallengeHistoryEntry, EventType
} from '../types'
import { 
  generateStations, generateBikes, generateEmployees, 
  defaultRules, defaultStats, generateAchievements,
  initialTasks, initialEvents, initialRepairJobs,
  challengeConfigs
} from '../data/initialData'
import { calculateDistance } from '../utils/format'

interface GameStore extends GameState {
  setActivePanel: (panel: string) => void
  setSelectedStation: (stationId: string | null) => void
  togglePause: () => void
  setSpeed: (speed: number) => void
  tick: () => void
  
  assignTask: (taskId: string, employeeId: string) => void
  assignTaskWithSource: (taskId: string, employeeId: string, sourceStationId?: string) => void
  completeTask: (taskId: string) => void
  failTask: (taskId: string) => void
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'progress' | 'status' | 'assignedTo'>) => void
  updateTaskPriority: (taskId: string, priority: TaskPriority) => void
  setTaskSourceStation: (taskId: string, sourceStationId: string | undefined) => void
  
  updateEmployeeRoute: (employeeId: string, route: { stationId: string; action: string; order: number }[]) => void
  setEmployeeStatus: (employeeId: string, status: 'idle' | 'working' | 'rest') => void
  
  addEvent: (event: Omit<GameEvent, 'id' | 'active' | 'affectedStations'>) => void
  removeEvent: (eventId: string) => void
  
  addRepairJob: (bikeId: string, type: RepairJob['type']) => void
  startRepair: (jobId: string, employeeId?: string) => void
  completeRepair: (jobId: string) => void
  setReturnStation: (repairJobId: string, stationId: string) => void
  
  updateRules: (rules: Partial<GameRules>) => void
  
  updateMoney: (amount: number) => void
  updateStats: (stats: Partial<GameState['stats']>) => void
  
  unlockAchievement: (achievementId: string) => void
  updateAchievementProgress: (achievementId: string, progress: number) => void
  
  getStationById: (id: string) => Station | undefined
  getBikeById: (id: string) => Bike | undefined
  getEmployeeById: (id: string) => Employee | undefined
  
  startChallenge: (mode: ChallengeMode) => void
  endChallenge: (won: boolean) => void
  setShowChallengeSelect: (show: boolean) => void
  
  resetGame: () => void
  nextDay: () => void
}

let taskIdCounter = 5
let eventIdCounter = 1
let repairIdCounter = 4
let bikeIdCounter = 200
let dispatchLogIdCounter = 1
let challengeHistoryIdCounter = 1

const generateId = (prefix: string, counter: number) => `${prefix}-${String(counter).padStart(3, '0')}`

const MAINTENANCE_STATION_ID = 'st-011'
const CONCERT_CENTER_STATION_ID = 'st-010'
const SUBWAY_STATION_ID = 'st-005'

const VEHICLE_SPEEDS = {
  truck: 3,
  van: 4,
  scooter: 6,
  bike: 5,
}

const getStationsNear = (stations: Station[], centerId: string, count: number): string[] => {
  const center = stations.find(s => s.id === centerId)
  if (!center) return []
  const sorted = stations
    .filter(s => s.id !== centerId && s.type !== 'no_parking')
    .map(s => ({ id: s.id, dist: calculateDistance(center.position, s.position) }))
    .sort((a, b) => a.dist - b.dist)
  return [centerId, ...sorted.slice(0, count - 1).map(s => s.id)]
}

const getRandomStations = (stations: Station[], count: number): string[] => {
  const valid = stations.filter(s => s.type !== 'no_parking' && s.type !== 'maintenance')
  const shuffled = [...valid].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length)).map(s => s.id)
}

const getAllStations = (stations: Station[]): string[] => {
  return stations.filter(s => s.type !== 'no_parking').map(s => s.id)
}

const generateAffectedStations = (type: EventType, stations: Station[]): string[] => {
  switch (type) {
    case 'concert':
      return getStationsNear(stations, CONCERT_CENTER_STATION_ID, 5)
    case 'subway_failure':
      return getStationsNear(stations, SUBWAY_STATION_ID, 5)
    case 'illegal_parking':
      return getRandomStations(stations, 3)
    case 'rain':
      return getAllStations(stations)
    case 'peak_hour':
      return getAllStations(stations)
    default:
      return getAllStations(stations)
  }
}

const findBestSourceStation = (stations: Station[], targetStationId: string, bikeCount: number): string => {
  const maintenance = stations.find(s => s.id === MAINTENANCE_STATION_ID)
  if (maintenance && maintenance.availableBikes >= bikeCount) {
    return MAINTENANCE_STATION_ID
  }
  const target = stations.find(s => s.id === targetStationId)
  if (!target) return MAINTENANCE_STATION_ID
  const candidates = stations
    .filter(s => 
      s.id !== targetStationId && 
      s.type !== 'no_parking' && 
      s.availableBikes >= Math.ceil(bikeCount / 2) &&
      (s.demandLevel || 50) < 60
    )
    .map(s => ({ id: s.id, dist: calculateDistance(target.position, s.position), available: s.availableBikes }))
    .sort((a, b) => a.dist - b.dist)
  if (candidates.length > 0) return candidates[0].id
  return MAINTENANCE_STATION_ID
}

const getStationEventEffects = (
  stationId: string,
  events: GameEvent[],
  currentTime: number
): { demandMultiplier: number; speedMultiplier: number; violationMultiplier: number; batteryDrainMultiplier: number; priorityBoost: number } => {
  const activeEvents = events.filter(e => 
    currentTime >= e.startTime && 
    currentTime < e.startTime + e.duration &&
    e.affectedStations.includes(stationId)
  )
  return {
    demandMultiplier: activeEvents.reduce((acc, e) => acc * (e.effects.demandMultiplier || 1), 1),
    speedMultiplier: activeEvents.reduce((acc, e) => acc * (e.effects.speedMultiplier || 1), 1),
    violationMultiplier: activeEvents.reduce((acc, e) => acc * (e.effects.parkingViolationRate || 1), 1),
    batteryDrainMultiplier: activeEvents.reduce((acc, e) => acc * (e.effects.batteryDrainMultiplier || 1), 1),
    priorityBoost: activeEvents.reduce((acc, e) => acc + (e.severity === 'severe' ? 3 : e.severity === 'moderate' ? 2 : 1), 0),
  }
}

const computeRank = (mode: ChallengeMode, profit: number, satisfaction: number): number => {
  if (mode === 'time_limit') {
    if (profit >= 2000) return 1
    if (profit >= 1500) return 2
    if (profit >= 1000) return 3
    if (profit >= 500) return 4
    return 5
  }
  if (mode === 'low_budget') {
    if (profit >= 3000) return 1
    if (profit >= 2000) return 2
    if (profit >= 1000) return 3
    if (profit >= 500) return 4
    return 5
  }
  if (mode === 'peak_guarantee') {
    if (satisfaction >= 90) return 1
    if (satisfaction >= 85) return 2
    if (satisfaction >= 80) return 3
    if (satisfaction >= 70) return 4
    return 5
  }
  return 5
}

export const useGameStore = create<GameStore>((set, get) => ({
  day: 1,
  time: 8 * 60,
  speed: 1,
  isPaused: true,
  money: 5000,
  gameStarted: false,
  challengeMode: 'none',
  challengeConfig: null,
  activePanel: 'map',
  selectedStationId: null,
  showChallengeSelect: true,
  gameOver: false,
  gameWon: false,
  lossReason: undefined,
  challengeHistory: [],
  dispatchLogs: [],
  challengeStart: 0,
  
  rules: { ...defaultRules },
  stats: { 
    ...defaultStats,
    todayStationStats: new Map(),
  },
  stations: generateStations(),
  bikes: generateBikes(),
  tasks: initialTasks,
  employees: generateEmployees(),
  events: initialEvents,
  repairJobs: initialRepairJobs,
  achievements: generateAchievements(),

  setActivePanel: (panel) => set({ activePanel: panel }),
  setSelectedStation: (stationId) => set({ selectedStationId: stationId }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused, gameStarted: true })),
  setSpeed: (speed) => set({ speed }),

  tick: () => {
    const state = get()
    if (state.isPaused || state.gameOver || !state.gameStarted) return

    const speed = state.speed
    const deltaMinutes = speed * 0.5
    
    let newTime = state.time + deltaMinutes
    let newDay = state.day
    let dayChanged = false
    
    if (newTime >= 24 * 60) {
      newTime = newTime % (24 * 60)
      newDay += 1
      dayChanged = true
    }

    let updatedBikes = [...state.bikes]
    let updatedStations = [...state.stations]
    let updatedEmployees = [...state.employees]
    let updatedTasks = [...state.tasks]
    let updatedEvents = [...state.events]
    let updatedRepairJobs = [...state.repairJobs]
    let newDispatchLogs = [...state.dispatchLogs]
    let newMoney = state.money
    let newStats = { 
      ...state.stats,
      todayTaskRevenue: { ...state.stats.todayTaskRevenue },
      todayTaskPenalty: { ...state.stats.todayTaskPenalty },
      todayStationStats: new Map(state.stats.todayStationStats),
    }
    let newLossReason = state.lossReason

    const hour = Math.floor(newTime / 60)
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)

    const globalSpeedMultiplier = updatedEvents
      .filter(e => newTime >= e.startTime && newTime < e.startTime + e.duration)
      .reduce((acc, e) => acc * (e.effects.speedMultiplier || 1), 1)

    updatedBikes = updatedBikes.map(bike => {
      if (bike.status === 'riding' && bike.targetStationId) {
        const targetStation = updatedStations.find(s => s.id === bike.targetStationId)
        if (!targetStation) return bike

        const stationEffects = getStationEventEffects(bike.rideStartStationId || '', updatedEvents, newTime)
        const localSpeedMult = stationEffects.speedMultiplier > 1 ? stationEffects.speedMultiplier : globalSpeedMultiplier

        const dx = targetStation.position.x - bike.position.x
        const dy = targetStation.position.y - bike.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < 3) {
          const rideDuration = bike.rideStartTime 
            ? (newTime - bike.rideStartTime) 
            : 10
          
          const fare = Math.min(
            state.rules.baseFare + rideDuration * state.rules.perMinuteRate,
            state.rules.maxDailyCharge
          )
          
          newMoney += fare
          newStats.todayRevenue.rideFares += fare
          newStats.totalRides += 1
          
          const startStationId = bike.rideStartStationId
          const violationRateMult = stationEffects.violationMultiplier
          const newBattery = Math.max(0, bike.battery - rideDuration * 0.1 * stationEffects.batteryDrainMultiplier)
          
          const isViolation = Math.random() < state.stats.violationRate / 100 * violationRateMult
          
          if (isViolation) {
            newMoney += state.rules.illegalParkingFine
            newStats.todayRevenue.fines += state.rules.illegalParkingFine
            newStats.satisfaction = Math.max(0, newStats.satisfaction - 0.5)
            
            if (startStationId) {
              const existing = newStats.todayStationStats.get(startStationId)
              if (existing) {
                newStats.todayStationStats.set(startStationId, {
                  rides: existing.rides + 1,
                  revenue: existing.revenue + fare,
                  violations: existing.violations + 1,
                  satisfactionContribution: existing.satisfactionContribution - 0.5,
                })
              } else {
                const station = updatedStations.find(s => s.id === startStationId)
                newStats.todayStationStats.set(startStationId, {
                  rides: 1,
                  revenue: fare,
                  violations: 1,
                  satisfactionContribution: -0.5,
                })
              }
            }
          } else {
            newMoney -= state.rules.parkingGuideBonus
            newStats.todayExpenses.other += state.rules.parkingGuideBonus
            newStats.satisfaction = Math.min(100, newStats.satisfaction + 0.1)
            
            if (startStationId) {
              const existing = newStats.todayStationStats.get(startStationId)
              if (existing) {
                newStats.todayStationStats.set(startStationId, {
                  rides: existing.rides + 1,
                  revenue: existing.revenue + fare,
                  violations: existing.violations,
                  satisfactionContribution: existing.satisfactionContribution + 0.1,
                })
              } else {
                const station = updatedStations.find(s => s.id === startStationId)
                newStats.todayStationStats.set(startStationId, {
                  rides: 1,
                  revenue: fare,
                  violations: 0,
                  satisfactionContribution: 0.1,
                })
              }
            }
          }
          
          const stationIdx = updatedStations.findIndex(s => s.id === bike.targetStationId)
          if (stationIdx >= 0) {
            updatedStations[stationIdx] = {
              ...updatedStations[stationIdx],
              availableBikes: updatedStations[stationIdx].availableBikes + 1,
              lowBatteryBikes: newBattery < state.rules.lowBatteryThreshold 
                ? updatedStations[stationIdx].lowBatteryBikes + 1 
                : updatedStations[stationIdx].lowBatteryBikes,
            }
          }
          
          return {
            ...bike,
            status: 'available' as const,
            stationId: bike.targetStationId,
            position: { ...targetStation.position },
            battery: newBattery,
            totalRides: bike.totalRides + 1,
            rideStartTime: undefined,
            rideStartStationId: undefined,
            targetStationId: undefined,
          }
        }

        const moveSpeed = 2 * localSpeedMult
        const ratio = Math.min(moveSpeed / dist, 1)
        
        return {
          ...bike,
          position: {
            x: bike.position.x + dx * ratio,
            y: bike.position.y + dy * ratio,
          },
          battery: Math.max(0, bike.battery - 0.05 * stationEffects.batteryDrainMultiplier * speed),
        }
      }
      return bike
    })

    const availableBikeCount = updatedBikes.filter(b => b.status === 'available').length
    const demandBase = isPeakHour ? 0.3 : 0.1

    updatedStations = updatedStations.map(station => {
      if (station.type === 'no_parking') return station
      const stationEffects = getStationEventEffects(station.id, updatedEvents, newTime)
      const localDemandChance = demandBase * stationEffects.demandMultiplier * speed / 60
      
      const newBoost = stationEffects.priorityBoost
      const boostedUntil = newBoost > 0 ? newTime + 60 : (station.boostedUntil || 0)

      return {
        ...station,
        dispatchPriorityBoost: newBoost,
        boostedUntil,
      }
    })

    if (Math.random() < demandBase * speed / 60 && availableBikeCount > 10) {
      const availableStations = updatedStations.filter(s => 
        s.type !== 'no_parking' && s.type !== 'maintenance' && s.availableBikes > 0
      )
      
      if (availableStations.length > 1) {
        const weightedStations: { station: Station; weight: number }[] = []
        availableStations.forEach(s => {
          const stationEffects = getStationEventEffects(s.id, updatedEvents, newTime)
          const weight = (s.availableBikes > 0 ? 1 : 0) * stationEffects.demandMultiplier
          weightedStations.push({ station: s, weight })
        })
        const totalWeight = weightedStations.reduce((acc, ws) => acc + ws.weight, 0)
        let r = Math.random() * totalWeight
        let startStation = weightedStations[0].station
        for (const ws of weightedStations) {
          r -= ws.weight
          if (r <= 0) {
            startStation = ws.station
            break
          }
        }

        const endStations = availableStations.filter(s => s.id !== startStation.id)
        const endStation = endStations[Math.floor(Math.random() * endStations.length)]
        
        const stationBikes = updatedBikes.filter(b => 
          b.stationId === startStation.id && b.status === 'available'
        )
        
        if (stationBikes.length > 0) {
          const bike = stationBikes[Math.floor(Math.random() * stationBikes.length)]
          
          const bikeIdx = updatedBikes.findIndex(b => b.id === bike.id)
          if (bikeIdx >= 0) {
            updatedBikes[bikeIdx] = {
              ...updatedBikes[bikeIdx],
              status: 'riding' as const,
              stationId: null,
              rideStartTime: newTime,
              rideStartStationId: startStation.id,
              targetStationId: endStation.id,
            }
          }
          
          const stationIdx = updatedStations.findIndex(s => s.id === startStation.id)
          if (stationIdx >= 0) {
            const isLowBattery = bike.battery < state.rules.lowBatteryThreshold
            updatedStations[stationIdx] = {
              ...updatedStations[stationIdx],
              availableBikes: Math.max(0, updatedStations[stationIdx].availableBikes - 1),
              lowBatteryBikes: isLowBattery 
                ? Math.max(0, updatedStations[stationIdx].lowBatteryBikes - 1)
                : updatedStations[stationIdx].lowBatteryBikes,
            }
          }
        }
      }
    }

    updatedEmployees = updatedEmployees.map(emp => {
      if (emp.status === 'rest') return emp
      
      if (emp.status === 'working' && emp.targetStationId) {
        const targetStation = updatedStations.find(s => s.id === emp.targetStationId)
        if (!targetStation) return emp

        const task = updatedTasks.find(t => t.id === emp.currentTaskId)
        const sourceStationId = task?.sourceStationId
        
        const effectiveSpeedMult = globalSpeedMultiplier

        const dx = targetStation.position.x - emp.position.x
        const dy = targetStation.position.y - emp.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        const vehicleSpeed = VEHICLE_SPEEDS[emp.vehicle] * effectiveSpeedMult
        
        if (dist < 5) {
          if (task) {
            if (emp.currentAction === 'traveling') {
              if (task.type === 'replenish' && sourceStationId && emp.targetStationId === sourceStationId) {
                return { ...emp, currentAction: 'loading' as const, actionProgress: 0 }
              }
              return { ...emp, currentAction: 'loading' as const, actionProgress: 0 }
            }
            
            const workSpeed = emp.efficiency * speed
            const newProgress = emp.actionProgress + workSpeed
            
            if (newProgress >= 100) {
              if (task.type === 'replenish') {
                if (sourceStationId && emp.targetStationId === sourceStationId) {
                  const sourceIdx = updatedStations.findIndex(s => s.id === sourceStationId)
                  const bikesToLoad = Math.min(task.bikeCount || 5, emp.capacity)
                  let actualLoaded = 0
                  
                  if (sourceIdx >= 0) {
                    const sourceStation = updatedStations[sourceIdx]
                    const availableInSource = updatedBikes.filter(b => 
                      b.stationId === sourceStationId && b.status === 'available'
                    )
                    actualLoaded = Math.min(bikesToLoad, availableInSource.length, sourceStation.availableBikes)
                    
                    const toLoad = availableInSource.slice(0, actualLoaded)
                    toLoad.forEach(bike => {
                      const bikeIdx = updatedBikes.findIndex(b => b.id === bike.id)
                      if (bikeIdx >= 0) {
                        updatedBikes[bikeIdx] = {
                          ...updatedBikes[bikeIdx],
                          status: 'transit' as const,
                          stationId: null,
                          inTransit: 'from_station' as const,
                          transitSourceId: sourceStationId,
                          transitTargetId: task.stationId,
                          dispatchTime: newTime,
                        }
                      }
                    })
                    
                    updatedStations[sourceIdx] = {
                      ...sourceStation,
                      availableBikes: Math.max(0, sourceStation.availableBikes - actualLoaded),
                    }
                    
                    newDispatchLogs.push({
                      id: generateId('dl', dispatchLogIdCounter++),
                      time: newTime,
                      type: 'pickup',
                      stationFrom: sourceStationId,
                      stationTo: task.stationId,
                      bikeCount: actualLoaded,
                      employeeId: emp.id,
                    })
                  }
                  
                  return {
                    ...emp,
                    currentAction: 'traveling' as const,
                    targetStationId: task.stationId,
                    currentLoad: actualLoaded,
                    carryingBikes: updatedBikes.filter(b => b.status === 'transit' && b.transitTargetId === task.stationId).map(b => b.id),
                    actionProgress: 0,
                  }
                } else {
                  const stationIdx = updatedStations.findIndex(s => s.id === task.stationId)
                  const bikesToDrop = emp.currentLoad || (task.bikeCount || 5)
                  
                  if (stationIdx >= 0 && bikesToDrop > 0) {
                    const station = updatedStations[stationIdx]
                    const inTransitToStation = updatedBikes.filter(b => 
                      b.status === 'transit' && b.transitTargetId === task.stationId
                    )
                    const toDrop = inTransitToStation.slice(0, bikesToDrop)
                    
                    toDrop.forEach(bike => {
                      const bikeIdx = updatedBikes.findIndex(b => b.id === bike.id)
                      if (bikeIdx >= 0) {
                        updatedBikes[bikeIdx] = {
                          ...updatedBikes[bikeIdx],
                          status: 'available' as const,
                          stationId: task.stationId,
                          position: { ...station.position },
                          inTransit: null,
                          transitSourceId: undefined,
                          transitTargetId: undefined,
                        }
                      }
                    })
                    
                    const remainingNeeded = (task.bikeCount || 5) - toDrop.length
                    for (let i = 0; i < remainingNeeded; i++) {
                      const newBike: Bike = {
                        id: generateId('bk', bikeIdCounter++),
                        battery: 80 + Math.random() * 20,
                        status: 'available',
                        stationId: task.stationId,
                        position: { ...station.position },
                        lockWorking: true,
                        brakeWorking: true,
                        gpsWorking: true,
                        totalRides: 0,
                        lastMaintenance: 0,
                        inTransit: null,
                      }
                      updatedBikes.push(newBike)
                    }
                    
                    updatedStations[stationIdx] = {
                      ...station,
                      availableBikes: station.availableBikes + toDrop.length + remainingNeeded,
                    }
                    
                    newDispatchLogs.push({
                      id: generateId('dl', dispatchLogIdCounter++),
                      time: newTime,
                      type: 'dropoff',
                      stationFrom: sourceStationId,
                      stationTo: task.stationId,
                      bikeCount: toDrop.length + remainingNeeded,
                      employeeId: emp.id,
                    })
                  }
                  
                  const taskIdx = updatedTasks.findIndex(t => t.id === task.id)
                  if (taskIdx >= 0) {
                    updatedTasks[taskIdx] = {
                      ...updatedTasks[taskIdx],
                      status: 'completed' as const,
                      progress: 100,
                      completedAt: newTime,
                      actualReward: task.reward,
                    }
                  }
                  
                  newMoney += task.reward
                  newStats.todayTaskRevenue.replenish += task.reward
                  newStats.completedTasks += 1
                  newStats.satisfaction = Math.min(100, newStats.satisfaction + 0.5)
                  
                  return {
                    ...emp,
                    status: 'idle' as const,
                    currentAction: 'idle' as const,
                    currentTaskId: null,
                    targetStationId: null,
                    currentLoad: 0,
                    carryingBikes: [],
                    actionProgress: 0,
                  }
                }
              }
              
              if (task.type === 'recycle') {
                const stationIdx = updatedStations.findIndex(s => s.id === task.stationId)
                const bikesToRecycle = task.bikeCount || 2
                const maintenanceStation = updatedStations.find(s => s.id === MAINTENANCE_STATION_ID)
                
                if (emp.currentAction === 'loading' && emp.targetStationId === task.stationId) {
                  if (stationIdx >= 0) {
                    const station = updatedStations[stationIdx]
                    const brokenBikesInStation = updatedBikes.filter(b => 
                      b.stationId === task.stationId && b.status === 'broken'
                    )
                    
                    const toRecycle = brokenBikesInStation.slice(0, bikesToRecycle)
                    
                    toRecycle.forEach(bike => {
                      const bikeIdx = updatedBikes.findIndex(b => b.id === bike.id)
                      if (bikeIdx >= 0) {
                        updatedBikes[bikeIdx] = {
                          ...updatedBikes[bikeIdx],
                          status: 'transit' as const,
                          stationId: null,
                          inTransit: 'to_repair' as const,
                          transitSourceId: task.stationId,
                          transitTargetId: MAINTENANCE_STATION_ID,
                          dispatchTime: newTime,
                        }
                      }
                    })
                    
                    updatedStations[stationIdx] = {
                      ...station,
                      brokenBikes: Math.max(0, station.brokenBikes - toRecycle.length),
                    }
                    
                    newDispatchLogs.push({
                      id: generateId('dl', dispatchLogIdCounter++),
                      time: newTime,
                      type: 'recycle',
                      stationFrom: task.stationId,
                      stationTo: MAINTENANCE_STATION_ID,
                      bikeCount: toRecycle.length,
                      employeeId: emp.id,
                    })
                  }
                  
                  return {
                    ...emp,
                    currentAction: 'traveling' as const,
                    targetStationId: MAINTENANCE_STATION_ID,
                    currentLoad: bikesToRecycle,
                    actionProgress: 0,
                  }
                } else if (emp.targetStationId === MAINTENANCE_STATION_ID) {
                  const inTransitToRepair = updatedBikes.filter(b => 
                    b.status === 'transit' && b.inTransit === 'to_repair'
                  )
                  
                  inTransitToRepair.forEach(bike => {
                    const bikeIdx = updatedBikes.findIndex(b => b.id === bike.id)
                    if (bikeIdx >= 0) {
                      updatedBikes[bikeIdx] = {
                        ...updatedBikes[bikeIdx],
                        status: 'maintenance' as const,
                        stationId: MAINTENANCE_STATION_ID,
                        position: maintenanceStation ? { ...maintenanceStation.position } : bike.position,
                        inTransit: null,
                        transitSourceId: undefined,
                        transitTargetId: undefined,
                      }
                      
                      const repairTypes: RepairJob['type'][] = ['brake', 'lock', 'gps', 'battery']
                      const randomType = repairTypes[Math.floor(Math.random() * repairTypes.length)]
                      const costs = { brake: 50, battery: 100, gps: 80, lock: 30 }
                      const durations = { brake: 30, battery: 20, gps: 45, lock: 15 }
                      
                      const newJob: RepairJob = {
                        id: generateId('rp', repairIdCounter++),
                        bikeId: bike.id,
                        type: randomType,
                        status: 'queued',
                        cost: costs[randomType],
                        duration: durations[randomType],
                        progress: 0,
                        createdAt: newTime,
                      }
                      updatedRepairJobs.push(newJob)
                    }
                  })
                  
                  if (maintenanceStation) {
                    const maintIdx = updatedStations.findIndex(s => s.id === MAINTENANCE_STATION_ID)
                    if (maintIdx >= 0) {
                      updatedStations[maintIdx] = {
                        ...updatedStations[maintIdx],
                        availableBikes: updatedStations[maintIdx].availableBikes + inTransitToRepair.length,
                      }
                    }
                  }
                  
                  const taskIdx = updatedTasks.findIndex(t => t.id === task.id)
                  if (taskIdx >= 0) {
                    updatedTasks[taskIdx] = {
                      ...updatedTasks[taskIdx],
                      status: 'completed' as const,
                      progress: 100,
                      completedAt: newTime,
                      actualReward: task.reward,
                    }
                  }
                  
                  newMoney += task.reward
                  newStats.todayTaskRevenue.recycle += task.reward
                  newStats.completedTasks += 1
                  
                  return {
                    ...emp,
                    status: 'idle' as const,
                    currentAction: 'idle' as const,
                    currentTaskId: null,
                    targetStationId: null,
                    currentLoad: 0,
                    actionProgress: 0,
                  }
                }
              }
              
              if (task.type === 'battery') {
                const stationIdx = updatedStations.findIndex(s => s.id === task.stationId)
                
                if (stationIdx >= 0) {
                  const station = updatedStations[stationIdx]
                  const lowBikes = updatedBikes.filter(b => 
                    b.stationId === task.stationId && 
                    b.status === 'available' && 
                    b.battery < state.rules.lowBatteryThreshold
                  )
                  
                  const toCharge = lowBikes.slice(0, task.bikeCount || 6)
                  
                  toCharge.forEach(bike => {
                    const bikeIdx = updatedBikes.findIndex(b => b.id === bike.id)
                    if (bikeIdx >= 0) {
                      updatedBikes[bikeIdx] = {
                        ...updatedBikes[bikeIdx],
                        battery: 100,
                      }
                    }
                  })
                  
                  const chargedCount = toCharge.length
                  updatedStations[stationIdx] = {
                    ...station,
                    lowBatteryBikes: Math.max(0, station.lowBatteryBikes - chargedCount),
                  }
                  
                  newStats.todayExpenses.batteries += chargedCount * 5
                  newMoney -= chargedCount * 5
                }
                
                const taskIdx = updatedTasks.findIndex(t => t.id === task.id)
                if (taskIdx >= 0) {
                  updatedTasks[taskIdx] = {
                    ...updatedTasks[taskIdx],
                    status: 'completed' as const,
                    progress: 100,
                    completedAt: newTime,
                    actualReward: task.reward,
                  }
                }
                
                newMoney += task.reward
                newStats.todayTaskRevenue.battery += task.reward
                newStats.completedTasks += 1
                
                return {
                  ...emp,
                  status: 'idle' as const,
                  currentAction: 'idle' as const,
                  currentTaskId: null,
                  targetStationId: null,
                  actionProgress: 0,
                }
              }
              
              if (task.type === 'complaint') {
                const taskIdx = updatedTasks.findIndex(t => t.id === task.id)
                if (taskIdx >= 0) {
                  updatedTasks[taskIdx] = {
                    ...updatedTasks[taskIdx],
                    status: 'completed' as const,
                    progress: 100,
                    completedAt: newTime,
                    actualReward: task.reward,
                  }
                }
                
                newMoney += task.reward
                newStats.todayTaskRevenue.complaint += task.reward
                newStats.completedTasks += 1
                newStats.satisfaction = Math.min(100, newStats.satisfaction + 2)
                
                return {
                  ...emp,
                  status: 'idle' as const,
                  currentAction: 'idle' as const,
                  currentTaskId: null,
                  targetStationId: null,
                  actionProgress: 0,
                }
              }
            }
            
            return { ...emp, actionProgress: newProgress }
          }
          
          return {
            ...emp,
            status: 'idle' as const,
            currentAction: 'idle' as const,
            currentTaskId: null,
            targetStationId: null,
          }
        }

        const moveSpeed = vehicleSpeed * speed * 0.5
        const ratio = Math.min(moveSpeed / dist, 1)
        
        return {
          ...emp,
          position: {
            x: emp.position.x + dx * ratio,
            y: emp.position.y + dy * ratio,
          },
        }
      }
      
      return emp
    })

    updatedRepairJobs = updatedRepairJobs.map(job => {
      if (job.status === 'repairing') {
        const newProgress = job.progress + speed * 1.5
        
        if (newProgress >= 100) {
          const bikeIdx = updatedBikes.findIndex(b => b.id === job.bikeId)
          if (bikeIdx >= 0) {
            const bike = updatedBikes[bikeIdx]
            const updates: Partial<Bike> = {}
            
            if (job.type === 'brake') updates.brakeWorking = true
            if (job.type === 'lock') updates.lockWorking = true
            if (job.type === 'gps') updates.gpsWorking = true
            if (job.type === 'battery') updates.battery = 100
            
            if (job.returnStationId && job.returnStationId !== MAINTENANCE_STATION_ID) {
              updates.status = 'transit' as const
              updates.inTransit = 'to_station' as const
              updates.transitSourceId = MAINTENANCE_STATION_ID
              updates.transitTargetId = job.returnStationId
              updates.stationId = null
              updates.dispatchTime = newTime
            } else {
              updates.status = 'available' as const
              const maintenanceStation = updatedStations.find(s => s.id === MAINTENANCE_STATION_ID)
              if (maintenanceStation) {
                updates.position = { ...maintenanceStation.position }
                updates.stationId = MAINTENANCE_STATION_ID
              }
            }
            
            updatedBikes[bikeIdx] = { ...bike, ...updates }
            
            const maintenanceStation = updatedStations.find(s => s.id === MAINTENANCE_STATION_ID)
            if (maintenanceStation && !job.returnStationId) {
              const stationIdx = updatedStations.findIndex(s => s.id === maintenanceStation.id)
              if (stationIdx >= 0) {
                updatedStations[stationIdx] = {
                  ...updatedStations[stationIdx],
                  availableBikes: updatedStations[stationIdx].availableBikes + 1,
                }
              }
            }
            
            newDispatchLogs.push({
              id: generateId('dl', dispatchLogIdCounter++),
              time: newTime,
              type: 'repair_done',
              stationFrom: MAINTENANCE_STATION_ID,
              stationTo: job.returnStationId || MAINTENANCE_STATION_ID,
              bikeCount: 1,
              employeeId: job.assignedTo,
            })
          }
          
          newMoney -= job.cost
          newStats.todayExpenses.repairs += job.cost
          
          return { ...job, status: 'done' as const, progress: 100, completedAt: newTime }
        }
        
        return { ...job, progress: newProgress }
      }
      return job
    })

    updatedBikes = updatedBikes.map(bike => {
      if (bike.status === 'transit' && bike.inTransit === 'to_station' && bike.transitTargetId) {
        const targetStation = updatedStations.find(s => s.id === bike.transitTargetId)
        if (!targetStation) return bike
        
        const dx = targetStation.position.x - bike.position.x
        const dy = targetStation.position.y - bike.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < 5) {
          const stationIdx = updatedStations.findIndex(s => s.id === bike.transitTargetId)
          if (stationIdx >= 0) {
            updatedStations[stationIdx] = {
              ...updatedStations[stationIdx],
              availableBikes: updatedStations[stationIdx].availableBikes + 1,
            }
          }
          
          return {
            ...bike,
            status: 'available' as const,
            stationId: bike.transitTargetId,
            position: { ...targetStation.position },
            inTransit: null,
            transitSourceId: undefined,
            transitTargetId: undefined,
            dispatchTime: undefined,
          }
        }
        
        const moveSpeed = 2 * globalSpeedMultiplier
        const ratio = Math.min(moveSpeed / dist, 1)
        
        return {
          ...bike,
          position: {
            x: bike.position.x + dx * ratio,
            y: bike.position.y + dy * ratio,
          },
        }
      }
      return bike
    })

    const taskGenerationChance = 0.02 * speed
    if (Math.random() < taskGenerationChance) {
      const types: TaskType[] = ['replenish', 'recycle', 'battery', 'complaint']
      const type = types[Math.floor(Math.random() * types.length)]
      const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
      const priorityWeights = [0.4, 0.3, 0.2, 0.1]
      let r = Math.random()
      let priority: TaskPriority = 'low'
      for (let i = 0; i < priorities.length; i++) {
        if (r < priorityWeights[i]) {
          priority = priorities[i]
          break
        }
        r -= priorityWeights[i]
      }
      
      const validStations = updatedStations.filter(s => 
        s.type !== 'no_parking' && s.type !== 'maintenance'
      )
      const station = validStations[Math.floor(Math.random() * validStations.length)]
      
      const titles: Record<TaskType, string> = {
        replenish: '缺车补车',
        recycle: '故障回收',
        battery: '换电作业',
        complaint: '投诉处理',
      }
      
      const descriptions: Record<TaskType, string> = {
        replenish: `${station.name}车辆不足，需要补充车辆`,
        recycle: `${station.name}有故障车辆需要回收`,
        battery: `${station.name}多辆车电量过低`,
        complaint: `用户投诉${station.name}车辆问题`,
      }
      
      const rewards: Record<TaskType, number> = {
        replenish: 100,
        recycle: 80,
        battery: 60,
        complaint: 120,
      }
      
      const penalties: Record<TaskType, number> = {
        replenish: 200,
        recycle: 100,
        battery: 150,
        complaint: 300,
      }
      
      const bikeCounts: Record<TaskType, number> = {
        replenish: Math.floor(Math.random() * 5) + 3,
        recycle: Math.floor(Math.random() * 3) + 1,
        battery: Math.floor(Math.random() * 6) + 2,
        complaint: 0,
      }

      const newTask: Task = {
        id: generateId('task', taskIdCounter++),
        type,
        title: titles[type],
        description: descriptions[type],
        stationId: station.id,
        priority,
        status: 'pending',
        createdAt: newTime,
        assignedTo: null,
        progress: 0,
        reward: rewards[type],
        penalty: penalties[type],
        bikeCount: bikeCounts[type],
        sourceStationId: type === 'replenish' ? findBestSourceStation(updatedStations, station.id, bikeCounts[type]) : undefined,
      }
      updatedTasks.push(newTask)
    }

    updatedStations = updatedStations.map(station => {
      if (station.type === 'no_parking' || station.type === 'maintenance') return station
      
      const stationBikes = updatedBikes.filter(b => b.stationId === station.id && b.status === 'available')
      const brokenBikes = updatedBikes.filter(b => b.stationId === station.id && b.status === 'broken')
      const lowBatteryBikes = stationBikes.filter(b => b.battery < state.rules.lowBatteryThreshold)
      
      const usageRate = station.capacity > 0 ? stationBikes.length / station.capacity : 0
      const baseDemand = station.baseDemandLevel ?? (
        station.type === 'hot' ? 70 + Math.random() * 30 : 
        station.type === 'hub' ? 60 + Math.random() * 30 :
        30 + Math.random() * 40
      )
      const baseCongestion = station.baseCongestionLevel ?? (usageRate * 80 + Math.random() * 20)
      
      const stationEffects = getStationEventEffects(station.id, updatedEvents, newTime)
      const hasActiveEvent = stationEffects.demandMultiplier !== 1 || stationEffects.priorityBoost > 0
      
      let targetDemand = baseDemand * stationEffects.demandMultiplier
      let targetCongestion = baseCongestion * (1 + (stationEffects.demandMultiplier - 1) * 0.5)
      
      let newDemandLevel = station.demandLevel
      let newCongestionLevel = station.congestionLevel
      
      const recoveryRate = 0.05 * speed
      if (hasActiveEvent) {
        newDemandLevel = station.demandLevel + (targetDemand - station.demandLevel) * 0.1 * speed
        newCongestionLevel = station.congestionLevel + (targetCongestion - station.congestionLevel) * 0.1 * speed
      } else {
        if (Math.abs(station.demandLevel - baseDemand) > 0.5) {
          newDemandLevel = station.demandLevel + (baseDemand - station.demandLevel) * recoveryRate
        } else {
          newDemandLevel = baseDemand
        }
        if (Math.abs(station.congestionLevel - baseCongestion) > 0.5) {
          newCongestionLevel = station.congestionLevel + (baseCongestion - station.congestionLevel) * recoveryRate
        } else {
          newCongestionLevel = baseCongestion
        }
      }
      
      let newBoost = station.dispatchPriorityBoost || 0
      if (stationEffects.priorityBoost > 0) {
        newBoost = stationEffects.priorityBoost
      } else if (newBoost > 0 && station.boostedUntil && newTime > station.boostedUntil) {
        newBoost = Math.max(0, newBoost - 0.5 * speed)
      }
      
      return {
        ...station,
        availableBikes: stationBikes.length,
        brokenBikes: brokenBikes.length,
        lowBatteryBikes: lowBatteryBikes.length,
        demandLevel: Math.min(100, newDemandLevel),
        congestionLevel: Math.min(100, newCongestionLevel),
        dispatchPriorityBoost: newBoost,
      }
    })

    const totalBikes = updatedBikes.length
    const avgBattery = totalBikes > 0 
      ? updatedBikes.reduce((sum, b) => sum + b.battery, 0) / totalBikes 
      : 0
    
    const availableBikesCount = updatedBikes.filter(b => b.status === 'available').length
    const turnover = newStats.totalRides / Math.max(1, totalBikes) * state.day

    newStats.avgBattery = avgBattery
    newStats.bikesInCirculation = availableBikesCount
    newStats.bikeTurnover = turnover
    newStats.violationRate = 5 + (dayChanged ? 0 : Math.random() * 2 - 1)

    if (dayChanged) {
      const stationStatsArray = Array.from(newStats.todayStationStats.entries()).map(([stationId, data]) => {
        const station = updatedStations.find(s => s.id === stationId)
        return {
          stationId,
          stationName: station?.name || stationId,
          rides: data.rides,
          revenue: data.revenue,
          violations: data.violations,
          satisfactionContribution: data.satisfactionContribution,
        }
      })
      
      const dailyStat: DailyStats = {
        day: state.day,
        revenue: {
          rideFares: newStats.todayRevenue.rideFares,
          memberships: newStats.todayRevenue.memberships,
          fines: newStats.todayRevenue.fines,
          other: newStats.todayRevenue.other,
          total: newStats.todayRevenue.rideFares + newStats.todayRevenue.memberships + newStats.todayRevenue.fines + newStats.todayRevenue.other,
        },
        expenses: {
          repairs: newStats.todayExpenses.repairs,
          batteries: newStats.todayExpenses.batteries,
          salaries: newStats.todayExpenses.salaries,
          penalties: newStats.todayExpenses.penalties,
          other: newStats.todayExpenses.other,
          total: newStats.todayExpenses.repairs + newStats.todayExpenses.batteries + newStats.todayExpenses.salaries + newStats.todayExpenses.penalties + newStats.todayExpenses.other,
        },
        rides: newStats.totalRides,
        avgRideDuration: newStats.avgRideDuration,
        avgSatisfaction: newStats.satisfaction,
        avgViolationRate: newStats.violationRate,
        bikeTurnover: turnover,
        completedTasks: newStats.completedTasks,
        failedTasks: newStats.failedTasks,
        eventsTriggered: state.events.length,
        taskRevenue: { ...newStats.todayTaskRevenue },
        taskPenalty: { ...newStats.todayTaskPenalty },
        stationStats: stationStatsArray,
      }
      
      newStats.dailyHistory = [...newStats.dailyHistory, dailyStat]
      
      newStats.todayRevenue = { rideFares: 0, memberships: 0, fines: 0, other: 0 }
      newStats.todayExpenses = { repairs: 0, batteries: 0, salaries: 0, penalties: 0, other: 0 }
      newStats.todayTaskRevenue = { replenish: 0, recycle: 0, battery: 0, complaint: 0 }
      newStats.todayTaskPenalty = { replenish: 0, recycle: 0, battery: 0, complaint: 0 }
      newStats.todayStationStats = new Map()
    }

    newStats.revenue = newStats.dailyHistory.reduce((sum, d) => sum + d.revenue.total, 0) 
      + newStats.todayRevenue.rideFares + newStats.todayRevenue.memberships + newStats.todayRevenue.fines + newStats.todayRevenue.other
    newStats.expenses = newStats.dailyHistory.reduce((sum, d) => sum + d.expenses.total, 0)
      + newStats.todayExpenses.repairs + newStats.todayExpenses.batteries + newStats.todayExpenses.salaries + newStats.todayExpenses.penalties + newStats.todayExpenses.other

    let gameOver: boolean = state.gameOver
    let gameWon: boolean = state.gameWon
    let updatedChallengeHistory = [...state.challengeHistory]
    
    if (state.challengeMode !== 'none' && state.challengeConfig && !gameOver) {
      const config = state.challengeConfig
      
      if (config.timeLimit && newTime >= config.timeLimit && state.day === 1) {
        const profit = newMoney - config.startMoney
        if (config.targetProfit && profit >= config.targetProfit) {
          gameWon = true
        } else {
          gameOver = true
          gameWon = false
          newLossReason = '限时挑战未达利润目标'
        }
        gameOver = true
      }
      
      if (config.mode === 'peak_guarantee' && config.targetSatisfaction) {
        if (newStats.satisfaction < config.targetSatisfaction && isPeakHour) {
          gameOver = true
          gameWon = false
          newLossReason = '高峰时段满意度低于目标'
        }
      }
      
      if (config.mode === 'low_budget' && newMoney < 0) {
        gameOver = true
        gameWon = false
        newLossReason = '资金不足，预算耗尽'
      }
    }

    if (gameOver && state.challengeMode !== 'none' && state.challengeConfig && !state.gameOver) {
      const config = state.challengeConfig
      const profit = newMoney - config.startMoney
      const entry: ChallengeHistoryEntry = {
        id: generateId('ch', challengeHistoryIdCounter++),
        mode: state.challengeMode,
        title: config.title,
        startTime: state.challengeStart,
        endTime: Date.now(),
        totalDays: newDay - 1 + (newTime / (24 * 60)),
        result: gameWon ? 'won' : 'lost',
        lossReason: gameWon ? undefined : newLossReason,
        startMoney: config.startMoney,
        endMoney: newMoney,
        profit,
        targetProfit: config.targetProfit,
        finalSatisfaction: newStats.satisfaction,
        targetSatisfaction: config.targetSatisfaction,
        completedTasks: newStats.completedTasks,
        failedTasks: newStats.failedTasks,
        totalRides: newStats.totalRides,
        totalRevenue: newStats.revenue,
        totalExpenses: newStats.expenses,
        reward: gameWon ? config.reward : 0,
        rank: computeRank(state.challengeMode, profit, newStats.satisfaction),
      }
      updatedChallengeHistory.push(entry)
    }

    set({
      time: newTime,
      day: newDay,
      bikes: updatedBikes,
      stations: updatedStations,
      employees: updatedEmployees,
      tasks: updatedTasks,
      events: updatedEvents,
      repairJobs: updatedRepairJobs,
      dispatchLogs: newDispatchLogs,
      money: newMoney,
      stats: newStats,
      gameOver,
      gameWon,
      lossReason: newLossReason,
      challengeHistory: updatedChallengeHistory,
    })
  },

  assignTask: (taskId, employeeId) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId)
    const employee = state.employees.find(e => e.id === employeeId)
    if (!task || !employee || employee.status !== 'idle') return state

    let targetStationId = task.stationId
    if (task.type === 'replenish' && task.sourceStationId) {
      targetStationId = task.sourceStationId
    }
    if (task.type === 'recycle') {
      targetStationId = task.stationId
    }

    return {
      tasks: state.tasks.map(t => 
        t.id === taskId ? { ...t, status: 'in_progress' as const, assignedTo: employeeId } : t
      ),
      employees: state.employees.map(e => 
        e.id === employeeId ? { 
          ...e, 
          status: 'working' as const, 
          currentAction: 'traveling' as const,
          currentTaskId: taskId,
          targetStationId: targetStationId,
          actionProgress: 0,
        } : e
      ),
    }
  }),

  assignTaskWithSource: (taskId, employeeId, sourceStationId) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId)
    const employee = state.employees.find(e => e.id === employeeId)
    if (!task || !employee || employee.status !== 'idle') return state

    const effectiveSource = sourceStationId || task.sourceStationId || 
      (task.type === 'replenish' ? findBestSourceStation(state.stations, task.stationId, task.bikeCount || 5) : undefined)

    let targetStationId = task.stationId
    if (task.type === 'replenish' && effectiveSource) {
      targetStationId = effectiveSource
    }

    return {
      tasks: state.tasks.map(t => 
        t.id === taskId ? { 
          ...t, 
          status: 'in_progress' as const, 
          assignedTo: employeeId,
          sourceStationId: effectiveSource,
        } : t
      ),
      employees: state.employees.map(e => 
        e.id === employeeId ? { 
          ...e, 
          status: 'working' as const, 
          currentAction: 'traveling' as const,
          currentTaskId: taskId,
          targetStationId: targetStationId,
          actionProgress: 0,
        } : e
      ),
    }
  }),

  completeTask: (taskId) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId)
    if (!task) return state

    const newTodayTaskRevenue = { ...state.stats.todayTaskRevenue }
    newTodayTaskRevenue[task.type] += task.reward

    return {
      tasks: state.tasks.map(t => 
        t.id === taskId ? { ...t, status: 'completed' as const, progress: 100, completedAt: state.time, actualReward: task.reward } : t
      ),
      employees: state.employees.map(e => 
        e.currentTaskId === taskId ? { 
          ...e, 
          status: 'idle' as const, 
          currentAction: 'idle' as const,
          currentTaskId: null,
          targetStationId: null,
          actionProgress: 0,
        } : e
      ),
      money: state.money + task.reward,
      stats: {
        ...state.stats,
        completedTasks: state.stats.completedTasks + 1,
        satisfaction: Math.min(100, state.stats.satisfaction + 1),
        todayTaskRevenue: newTodayTaskRevenue,
      }
    }
  }),

  failTask: (taskId) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId)
    if (!task) return state

    const newTodayTaskPenalty = { ...state.stats.todayTaskPenalty }
    newTodayTaskPenalty[task.type] += task.penalty

    return {
      tasks: state.tasks.map(t => 
        t.id === taskId ? { ...t, status: 'failed' as const, progress: 0, actualPenalty: task.penalty } : t
      ),
      employees: state.employees.map(e => 
        e.currentTaskId === taskId ? { 
          ...e, 
          status: 'idle' as const, 
          currentAction: 'idle' as const,
          currentTaskId: null,
          targetStationId: null,
        } : e
      ),
      money: state.money - task.penalty,
      stats: {
        ...state.stats,
        failedTasks: state.stats.failedTasks + 1,
        satisfaction: Math.max(0, state.stats.satisfaction - 2),
        todayExpenses: {
          ...state.stats.todayExpenses,
          penalties: state.stats.todayExpenses.penalties + task.penalty,
        },
        todayTaskPenalty: newTodayTaskPenalty,
      }
    }
  }),

  addTask: (task) => set((state) => {
    const sourceStationId = task.type === 'replenish' 
      ? findBestSourceStation(state.stations, task.stationId, task.bikeCount || 5)
      : undefined
    const newTask: Task = {
      ...task,
      id: generateId('task', taskIdCounter++),
      createdAt: state.time,
      progress: 0,
      status: 'pending',
      assignedTo: null,
      sourceStationId,
    }
    return { tasks: [...state.tasks, newTask] }
  }),

  updateTaskPriority: (taskId, priority) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, priority } : t)
  })),

  setTaskSourceStation: (taskId, sourceStationId) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, sourceStationId } : t)
  })),

  updateEmployeeRoute: (employeeId, route) => set((state) => ({
    employees: state.employees.map(e => 
      e.id === employeeId ? { ...e, route: route as any } : e
    )
  })),

  setEmployeeStatus: (employeeId, status) => set((state) => ({
    employees: state.employees.map(e => 
      e.id === employeeId ? { ...e, status, currentAction: status === 'rest' ? 'resting' as const : 'idle' as const } : e
    )
  })),

  addEvent: (event) => set((state) => {
    const affectedStations = generateAffectedStations(event.type, state.stations)
    const newEvent: GameEvent = {
      ...event,
      id: `event-${eventIdCounter++}`,
      active: true,
      affectedStations,
    }
    return { events: [...state.events, newEvent] }
  }),

  removeEvent: (eventId) => set((state) => ({
    events: state.events.filter(e => e.id !== eventId)
  })),

  addRepairJob: (bikeId, type) => set((state) => {
    const costs = { brake: 50, battery: 100, gps: 80, lock: 30 }
    const durations = { brake: 30, battery: 20, gps: 45, lock: 15 }
    
    const newJob: RepairJob = {
      id: generateId('rp', repairIdCounter++),
      bikeId,
      type,
      status: 'queued',
      cost: costs[type],
      duration: durations[type],
      progress: 0,
      createdAt: state.time,
    }
    
    return {
      repairJobs: [...state.repairJobs, newJob],
      bikes: state.bikes.map(b => b.id === bikeId ? { ...b, status: 'maintenance' as const, stationId: null } : b),
    }
  }),

  startRepair: (jobId, employeeId) => set((state) => ({
    repairJobs: state.repairJobs.map(j => 
      j.id === jobId ? { ...j, status: 'repairing' as const, assignedTo: employeeId } : j
    )
  })),

  completeRepair: (jobId) => set((state) => {
    const job = state.repairJobs.find(j => j.id === jobId)
    if (!job) return state

    const bikeUpdates: Partial<Bike> = {}
    if (job.type === 'brake') bikeUpdates.brakeWorking = true
    if (job.type === 'lock') bikeUpdates.lockWorking = true
    if (job.type === 'gps') bikeUpdates.gpsWorking = true
    if (job.type === 'battery') bikeUpdates.battery = 100
    
    if (job.returnStationId && job.returnStationId !== MAINTENANCE_STATION_ID) {
      bikeUpdates.status = 'transit' as const
      bikeUpdates.inTransit = 'to_station' as const
      bikeUpdates.transitSourceId = MAINTENANCE_STATION_ID
      bikeUpdates.transitTargetId = job.returnStationId
      bikeUpdates.stationId = null
      bikeUpdates.dispatchTime = state.time
    } else {
      bikeUpdates.status = 'available' as const
      bikeUpdates.stationId = MAINTENANCE_STATION_ID
    }

    const newLogs = [...state.dispatchLogs, {
      id: generateId('dl', dispatchLogIdCounter++),
      time: state.time,
      type: 'repair_done' as const,
      stationFrom: MAINTENANCE_STATION_ID,
      stationTo: job.returnStationId || MAINTENANCE_STATION_ID,
      bikeCount: 1,
      employeeId: job.assignedTo,
    }]

    return {
      repairJobs: state.repairJobs.map(j => 
        j.id === jobId ? { ...j, status: 'done' as const, progress: 100, completedAt: state.time } : j
      ),
      bikes: state.bikes.map(b => b.id === job.bikeId ? { ...b, ...bikeUpdates } : b),
      money: state.money - job.cost,
      dispatchLogs: newLogs,
      stats: {
        ...state.stats,
        todayExpenses: {
          ...state.stats.todayExpenses,
          repairs: state.stats.todayExpenses.repairs + job.cost,
        }
      }
    }
  }),

  setReturnStation: (repairJobId, stationId) => set((state) => ({
    repairJobs: state.repairJobs.map(j => 
      j.id === repairJobId ? { ...j, returnStationId: stationId } : j
    )
  })),

  updateRules: (rules) => set((state) => ({
    rules: { ...state.rules, ...rules }
  })),

  updateMoney: (amount) => set((state) => ({ money: state.money + amount })),

  updateStats: (stats) => set((state) => ({
    stats: { ...state.stats, ...stats }
  })),

  unlockAchievement: (achievementId) => set((state) => {
    const achievement = state.achievements.find(a => a.id === achievementId)
    if (!achievement || achievement.unlocked) return state

    return {
      achievements: state.achievements.map(a => 
        a.id === achievementId ? { ...a, unlocked: true } : a
      ),
      money: state.money + achievement.reward,
    }
  }),

  updateAchievementProgress: (achievementId, progress) => set((state) => ({
    achievements: state.achievements.map(a => 
      a.id === achievementId ? { ...a, current: Math.min(a.target, progress) } : a
    )
  })),

  getStationById: (id) => get().stations.find(s => s.id === id),
  getBikeById: (id) => get().bikes.find(b => b.id === id),
  getEmployeeById: (id) => get().employees.find(e => e.id === id),

  startChallenge: (mode) => set((state) => {
    const config = challengeConfigs.find(c => c.mode === mode)
    if (!config) return state

    const stations = generateStations()
    const bikes = generateBikes()
    
    return {
      day: 1,
      time: 8 * 60,
      speed: 1,
      isPaused: true,
      money: config.startMoney,
      gameStarted: false,
      challengeMode: mode,
      challengeConfig: config,
      challengeStart: Date.now(),
      stations,
      bikes,
      tasks: initialTasks.map(t => ({
        ...t,
        sourceStationId: t.type === 'replenish' ? findBestSourceStation(stations, t.stationId, t.bikeCount || 5) : undefined,
      })),
      employees: generateEmployees(),
      events: [],
      repairJobs: initialRepairJobs,
      dispatchLogs: [],
      lossReason: undefined,
      stats: { 
        ...defaultStats,
        dailyHistory: [],
        todayRevenue: { rideFares: 0, memberships: 0, fines: 0, other: 0 },
        todayExpenses: { repairs: 0, batteries: 0, salaries: 0, penalties: 0, other: 0 },
        todayTaskRevenue: { replenish: 0, recycle: 0, battery: 0, complaint: 0 },
        todayTaskPenalty: { replenish: 0, recycle: 0, battery: 0, complaint: 0 },
        todayStationStats: new Map(),
      },
      showChallengeSelect: false,
      gameOver: false,
      gameWon: false,
      activePanel: 'map',
    }
  }),

  endChallenge: (won) => set((state) => {
    const config = state.challengeConfig
    const reward = won && config ? config.reward : 0
    
    let updatedChallengeHistory = [...state.challengeHistory]
    
    if (config && state.challengeMode !== 'none') {
      const profit = state.money + reward - config.startMoney
      let lossReasonVal: string | undefined
      if (!won) {
        if (state.lossReason) {
          lossReasonVal = state.lossReason
        } else if (config.mode === 'low_budget') {
          lossReasonVal = '资金不足，预算耗尽'
        } else if (config.mode === 'peak_guarantee') {
          lossReasonVal = '高峰时段满意度低于目标'
        } else if (config.mode === 'time_limit') {
          lossReasonVal = '限时挑战未达利润目标'
        }
      }
      
      const entry: ChallengeHistoryEntry = {
        id: generateId('ch', challengeHistoryIdCounter++),
        mode: state.challengeMode,
        title: config.title,
        startTime: state.challengeStart,
        endTime: Date.now(),
        totalDays: state.day - 1 + (state.time / (24 * 60)),
        result: won ? 'won' : 'lost',
        lossReason: lossReasonVal,
        startMoney: config.startMoney,
        endMoney: state.money + reward,
        profit,
        targetProfit: config.targetProfit,
        finalSatisfaction: state.stats.satisfaction,
        targetSatisfaction: config.targetSatisfaction,
        completedTasks: state.stats.completedTasks,
        failedTasks: state.stats.failedTasks,
        totalRides: state.stats.totalRides,
        totalRevenue: state.stats.revenue,
        totalExpenses: state.stats.expenses,
        reward: won ? reward : 0,
        rank: computeRank(state.challengeMode, profit, state.stats.satisfaction),
      }
      updatedChallengeHistory.push(entry)
    }
    
    return {
      gameOver: true,
      gameWon: won,
      money: state.money + reward,
      challengeHistory: updatedChallengeHistory,
    }
  }),

  setShowChallengeSelect: (show) => set({ showChallengeSelect: show }),

  nextDay: () => set((state) => ({
    day: state.day + 1,
    time: 8 * 60,
  })),

  resetGame: () => set({
    day: 1,
    time: 8 * 60,
    speed: 1,
    isPaused: true,
    money: 5000,
    gameStarted: false,
    challengeMode: 'none',
    challengeConfig: null,
    challengeStart: 0,
    activePanel: 'map',
    selectedStationId: null,
    rules: { ...defaultRules },
    stats: { 
      ...defaultStats,
      dailyHistory: [],
      todayRevenue: { rideFares: 0, memberships: 0, fines: 0, other: 0 },
      todayExpenses: { repairs: 0, batteries: 0, salaries: 0, penalties: 0, other: 0 },
      todayTaskRevenue: { replenish: 0, recycle: 0, battery: 0, complaint: 0 },
      todayTaskPenalty: { replenish: 0, recycle: 0, battery: 0, complaint: 0 },
      todayStationStats: new Map(),
    },
    stations: generateStations(),
    bikes: generateBikes(),
    tasks: initialTasks.map(t => ({
      ...t,
      sourceStationId: t.type === 'replenish' ? findBestSourceStation(generateStations(), t.stationId, t.bikeCount || 5) : undefined,
    })),
    employees: generateEmployees(),
    events: [],
    repairJobs: initialRepairJobs,
    achievements: generateAchievements(),
    showChallengeSelect: true,
    gameOver: false,
    gameWon: false,
    lossReason: undefined,
    challengeHistory: [],
    dispatchLogs: [],
  }),
}))
