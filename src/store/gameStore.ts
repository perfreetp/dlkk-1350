import { create } from 'zustand'
import { 
  GameState, Task, Employee, GameEvent, RepairJob, Bike, 
  Station, GameRules, Achievement, TaskPriority, TaskType,
  DailyStats, ChallengeConfig, ChallengeMode
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
  completeTask: (taskId: string) => void
  failTask: (taskId: string) => void
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'progress' | 'status' | 'assignedTo'>) => void
  updateTaskPriority: (taskId: string, priority: TaskPriority) => void
  
  updateEmployeeRoute: (employeeId: string, route: { stationId: string; action: string; order: number }[]) => void
  setEmployeeStatus: (employeeId: string, status: 'idle' | 'working' | 'rest') => void
  
  addEvent: (event: Omit<GameEvent, 'id' | 'active'>) => void
  removeEvent: (eventId: string) => void
  
  addRepairJob: (bikeId: string, type: RepairJob['type']) => void
  startRepair: (jobId: string, employeeId?: string) => void
  completeRepair: (jobId: string) => void
  
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

const generateId = (prefix: string, counter: number) => `${prefix}-${String(counter).padStart(3, '0')}`

const VEHICLE_SPEEDS = {
  truck: 3,
  van: 4,
  scooter: 6,
  bike: 5,
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
  
  rules: { ...defaultRules },
  stats: { ...defaultStats },
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
    let newMoney = state.money
    let newStats = { ...state.stats }

    const hour = Math.floor(newTime / 60)
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)

    const activeEvents = state.events.filter(e => 
      newTime >= e.startTime && newTime < e.startTime + e.duration
    )
    
    const demandMultiplier = activeEvents.reduce((acc, e) => 
      acc * (e.effects.demandMultiplier || 1), 1
    )
    const speedMultiplier = activeEvents.reduce((acc, e) => 
      acc * (e.effects.speedMultiplier || 1), 1
    )
    const violationMultiplier = activeEvents.reduce((acc, e) => 
      acc * (e.effects.parkingViolationRate || 1), 1
    )
    const batteryDrainMultiplier = activeEvents.reduce((acc, e) => 
      acc * (e.effects.batteryDrainMultiplier || 1), 1
    )

    updatedBikes = updatedBikes.map(bike => {
      if (bike.status === 'riding' && bike.targetStationId) {
        const targetStation = updatedStations.find(s => s.id === bike.targetStationId)
        if (!targetStation) return bike

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
          
          const newBattery = Math.max(0, bike.battery - rideDuration * 0.1 * batteryDrainMultiplier)
          
          const isViolation = Math.random() < state.stats.violationRate / 100 * violationMultiplier
          
          if (isViolation) {
            newMoney += state.rules.illegalParkingFine
            newStats.todayRevenue.fines += state.rules.illegalParkingFine
            newStats.satisfaction = Math.max(0, newStats.satisfaction - 0.5)
          } else {
            newMoney -= state.rules.parkingGuideBonus
            newStats.todayExpenses.other += state.rules.parkingGuideBonus
            newStats.satisfaction = Math.min(100, newStats.satisfaction + 0.1)
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

        const moveSpeed = 2 * speedMultiplier
        const ratio = Math.min(moveSpeed / dist, 1)
        
        return {
          ...bike,
          position: {
            x: bike.position.x + dx * ratio,
            y: bike.position.y + dy * ratio,
          },
          battery: Math.max(0, bike.battery - 0.05 * batteryDrainMultiplier * speed),
        }
      }
      return bike
    })

    const availableBikeCount = updatedBikes.filter(b => b.status === 'available').length
    const demandBase = isPeakHour ? 0.3 : 0.1
    const demandChance = demandBase * demandMultiplier * speed / 60

    if (Math.random() < demandChance && availableBikeCount > 10) {
      const availableStations = updatedStations.filter(s => 
        s.type !== 'no_parking' && s.type !== 'maintenance' && s.availableBikes > 0
      )
      
      if (availableStations.length > 1) {
        const startStation = availableStations[Math.floor(Math.random() * availableStations.length)]
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

        const dx = targetStation.position.x - emp.position.x
        const dy = targetStation.position.y - emp.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        const vehicleSpeed = VEHICLE_SPEEDS[emp.vehicle] * speedMultiplier
        
        if (dist < 5) {
          const task = updatedTasks.find(t => t.id === emp.currentTaskId)
          
          if (task) {
            if (emp.currentAction === 'traveling') {
              return { ...emp, currentAction: 'loading' as const, actionProgress: 0 }
            }
            
            const workSpeed = emp.efficiency * speed
            const newProgress = emp.actionProgress + workSpeed
            
            if (newProgress >= 100) {
              if (task.type === 'replenish') {
                const stationIdx = updatedStations.findIndex(s => s.id === task.stationId)
                const bikesToAdd = Math.min(task.bikeCount || 5, emp.currentLoad)
                
                if (stationIdx >= 0 && bikesToAdd > 0) {
                  const station = updatedStations[stationIdx]
                  updatedStations[stationIdx] = {
                    ...station,
                    availableBikes: station.availableBikes + bikesToAdd,
                  }
                  
                  for (let i = 0; i < bikesToAdd; i++) {
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
                    }
                    updatedBikes.push(newBike)
                  }
                }
                
                const taskIdx = updatedTasks.findIndex(t => t.id === task.id)
                if (taskIdx >= 0) {
                  updatedTasks[taskIdx] = {
                    ...updatedTasks[taskIdx],
                    status: 'completed' as const,
                    progress: 100,
                  }
                }
                
                newMoney += task.reward
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
              
              if (task.type === 'recycle') {
                const stationIdx = updatedStations.findIndex(s => s.id === task.stationId)
                const bikesToRecycle = task.bikeCount || 2
                
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
                      }
                    }
                  })
                  
                  updatedStations[stationIdx] = {
                    ...station,
                    brokenBikes: Math.max(0, station.brokenBikes - toRecycle.length),
                  }
                }
                
                const taskIdx = updatedTasks.findIndex(t => t.id === task.id)
                if (taskIdx >= 0) {
                  updatedTasks[taskIdx] = {
                    ...updatedTasks[taskIdx],
                    status: 'completed' as const,
                    progress: 100,
                  }
                }
                
                newMoney += task.reward
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
                  }
                }
                
                newMoney += task.reward
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
                  }
                }
                
                newMoney += task.reward
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
            const updates: Partial<Bike> = { status: 'available' as const }
            
            if (job.type === 'brake') updates.brakeWorking = true
            if (job.type === 'lock') updates.lockWorking = true
            if (job.type === 'gps') updates.gpsWorking = true
            if (job.type === 'battery') updates.battery = 100
            
            updatedBikes[bikeIdx] = { ...bike, ...updates }
            
            const maintenanceStation = updatedStations.find(s => s.type === 'maintenance')
            if (maintenanceStation) {
              const stationIdx = updatedStations.findIndex(s => s.id === maintenanceStation.id)
              if (stationIdx >= 0) {
                updatedStations[stationIdx] = {
                  ...updatedStations[stationIdx],
                  availableBikes: updatedStations[stationIdx].availableBikes + 1,
                }
              }
            }
          }
          
          newMoney -= job.cost
          newStats.todayExpenses.repairs += job.cost
          
          return { ...job, status: 'done' as const, progress: 100 }
        }
        
        return { ...job, progress: newProgress }
      }
      return job
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
      }
      updatedTasks.push(newTask)
    }

    updatedStations = updatedStations.map(station => {
      if (station.type === 'no_parking' || station.type === 'maintenance') return station
      
      const stationBikes = updatedBikes.filter(b => b.stationId === station.id && b.status === 'available')
      const brokenBikes = updatedBikes.filter(b => b.stationId === station.id && b.status === 'broken')
      const lowBatteryBikes = stationBikes.filter(b => b.battery < state.rules.lowBatteryThreshold)
      
      const usageRate = station.capacity > 0 ? stationBikes.length / station.capacity : 0
      const demandLevel = station.type === 'hot' ? 70 + Math.random() * 30 : 
                         station.type === 'hub' ? 60 + Math.random() * 30 :
                         30 + Math.random() * 40
      
      const adjustedDemand = demandLevel * demandMultiplier
      
      return {
        ...station,
        availableBikes: stationBikes.length,
        brokenBikes: brokenBikes.length,
        lowBatteryBikes: lowBatteryBikes.length,
        demandLevel: Math.min(100, adjustedDemand),
        congestionLevel: Math.min(100, usageRate * 80 + Math.random() * 20),
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
      }
      
      newStats.dailyHistory = [...newStats.dailyHistory, dailyStat]
      
      newStats.todayRevenue = { rideFares: 0, memberships: 0, fines: 0, other: 0 }
      newStats.todayExpenses = { repairs: 0, batteries: 0, salaries: 0, penalties: 0, other: 0 }
    }

    newStats.revenue = newStats.dailyHistory.reduce((sum, d) => sum + d.revenue.total, 0) 
      + newStats.todayRevenue.rideFares + newStats.todayRevenue.memberships + newStats.todayRevenue.fines + newStats.todayRevenue.other
    newStats.expenses = newStats.dailyHistory.reduce((sum, d) => sum + d.expenses.total, 0)
      + newStats.todayExpenses.repairs + newStats.todayExpenses.batteries + newStats.todayExpenses.salaries + newStats.todayExpenses.penalties + newStats.todayExpenses.other

    let gameOver: boolean = state.gameOver
    let gameWon: boolean = state.gameWon
    
    if (state.challengeMode !== 'none' && state.challengeConfig) {
      const config = state.challengeConfig
      
      if (config.timeLimit && newTime >= config.timeLimit && state.day === 1) {
        const profit = newMoney - config.startMoney
        if (config.targetProfit && profit >= config.targetProfit) {
          gameWon = true
        }
        gameOver = true
      }
      
      if (config.mode === 'peak_guarantee' && config.targetSatisfaction) {
        if (newStats.satisfaction < config.targetSatisfaction && isPeakHour) {
          gameOver = true
          gameWon = false
        }
      }
      
      if (config.mode === 'low_budget' && newMoney < 0) {
        gameOver = true
        gameWon = false
      }
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
      money: newMoney,
      stats: newStats,
      gameOver,
      gameWon,
    })
  },

  assignTask: (taskId, employeeId) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId)
    const employee = state.employees.find(e => e.id === employeeId)
    if (!task || !employee || employee.status !== 'idle') return state

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
          targetStationId: task.stationId,
          actionProgress: 0,
        } : e
      ),
    }
  }),

  completeTask: (taskId) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId)
    if (!task) return state

    return {
      tasks: state.tasks.map(t => 
        t.id === taskId ? { ...t, status: 'completed' as const, progress: 100 } : t
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
      }
    }
  }),

  failTask: (taskId) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId)
    if (!task) return state

    return {
      tasks: state.tasks.map(t => 
        t.id === taskId ? { ...t, status: 'failed' as const, progress: 0 } : t
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
        }
      }
    }
  }),

  addTask: (task) => set((state) => {
    const newTask: Task = {
      ...task,
      id: generateId('task', taskIdCounter++),
      createdAt: state.time,
      progress: 0,
      status: 'pending',
      assignedTo: null,
    }
    return { tasks: [...state.tasks, newTask] }
  }),

  updateTaskPriority: (taskId, priority) => set((state) => ({
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, priority } : t)
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
    const newEvent: GameEvent = {
      ...event,
      id: `event-${eventIdCounter++}`,
      active: true,
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

    const bikeUpdates: Partial<Bike> = { status: 'available' }
    if (job.type === 'brake') bikeUpdates.brakeWorking = true
    if (job.type === 'lock') bikeUpdates.lockWorking = true
    if (job.type === 'gps') bikeUpdates.gpsWorking = true
    if (job.type === 'battery') bikeUpdates.battery = 100

    return {
      repairJobs: state.repairJobs.map(j => 
        j.id === jobId ? { ...j, status: 'done' as const, progress: 100 } : j
      ),
      bikes: state.bikes.map(b => b.id === job.bikeId ? { ...b, ...bikeUpdates } : b),
      money: state.money - job.cost,
      stats: {
        ...state.stats,
        todayExpenses: {
          ...state.stats.todayExpenses,
          repairs: state.stats.todayExpenses.repairs + job.cost,
        }
      }
    }
  }),

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
      stations,
      bikes,
      tasks: initialTasks,
      employees: generateEmployees(),
      events: [],
      repairJobs: initialRepairJobs,
      stats: { 
        ...defaultStats,
        dailyHistory: [],
        todayRevenue: { rideFares: 0, memberships: 0, fines: 0, other: 0 },
        todayExpenses: { repairs: 0, batteries: 0, salaries: 0, penalties: 0, other: 0 },
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
    
    return {
      gameOver: true,
      gameWon: won,
      money: state.money + reward,
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
    activePanel: 'map',
    selectedStationId: null,
    rules: { ...defaultRules },
    stats: { 
      ...defaultStats,
      dailyHistory: [],
      todayRevenue: { rideFares: 0, memberships: 0, fines: 0, other: 0 },
      todayExpenses: { repairs: 0, batteries: 0, salaries: 0, penalties: 0, other: 0 },
    },
    stations: generateStations(),
    bikes: generateBikes(),
    tasks: initialTasks,
    employees: generateEmployees(),
    events: [],
    repairJobs: initialRepairJobs,
    achievements: generateAchievements(),
    showChallengeSelect: true,
    gameOver: false,
    gameWon: false,
  }),
}))
