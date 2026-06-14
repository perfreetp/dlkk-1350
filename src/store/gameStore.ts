import { create } from 'zustand'
import { 
  GameState, Task, Employee, GameEvent, RepairJob, Bike, 
  Station, GameRules, Achievement, TaskPriority 
} from '../types'
import { 
  generateStations, generateBikes, generateEmployees, 
  defaultRules, defaultStats, generateAchievements,
  initialTasks, initialEvents, initialRepairJobs
} from '../data/initialData'

interface GameStore extends GameState {
  setActivePanel: (panel: string) => void
  setSelectedStation: (stationId: string | null) => void
  togglePause: () => void
  setSpeed: (speed: number) => void
  tick: () => void
  
  assignTask: (taskId: string, employeeId: string) => void
  completeTask: (taskId: string) => void
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'progress' | 'status'>) => void
  updateTaskPriority: (taskId: string, priority: TaskPriority) => void
  
  updateEmployeeRoute: (employeeId: string, route: { stationId: string; action: string; order: number }[]) => void
  setEmployeeStatus: (employeeId: string, status: 'idle' | 'working' | 'rest') => void
  
  addEvent: (event: Omit<GameEvent, 'id'>) => void
  removeEvent: (eventId: string) => void
  
  addRepairJob: (bikeId: string, type: RepairJob['type']) => void
  startRepair: (jobId: string) => void
  completeRepair: (jobId: string) => void
  
  updateRules: (rules: Partial<GameRules>) => void
  
  updateMoney: (amount: number) => void
  updateStats: (stats: Partial<GameState['stats']>) => void
  
  unlockAchievement: (achievementId: string) => void
  updateAchievementProgress: (achievementId: string, progress: number) => void
  
  getStationById: (id: string) => Station | undefined
  getBikeById: (id: string) => Bike | undefined
  getEmployeeById: (id: string) => Employee | undefined
  
  resetGame: () => void
}

let taskIdCounter = 5
let eventIdCounter = 1
let repairIdCounter = 4

const generateId = (prefix: string, counter: number) => `${prefix}-${String(counter).padStart(3, '0')}`

export const useGameStore = create<GameStore>((set, get) => ({
  day: 1,
  time: 8 * 60,
  speed: 1,
  isPaused: false,
  money: 5000,
  activePanel: 'map',
  selectedStationId: null,
  
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
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  setSpeed: (speed) => set({ speed }),

  tick: () => {
    const state = get()
    if (state.isPaused) return

    let newTime = state.time + state.speed
    let newDay = state.day
    
    if (newTime >= 24 * 60) {
      newTime = newTime % (24 * 60)
      newDay += 1
    }

    const updatedBikes = state.bikes.map(bike => {
      if (bike.status === 'riding') {
        const newBattery = Math.max(0, bike.battery - 0.02 * state.speed)
        return { ...bike, battery: newBattery }
      }
      return bike
    })

    const updatedEmployees = state.employees.map(emp => {
      if (emp.status === 'working' && emp.currentTaskId) {
        const task = state.tasks.find(t => t.id === emp.currentTaskId)
        if (task && task.status === 'in_progress') {
          return emp
        }
      }
      return emp
    })

    const updatedTasks = state.tasks.map(task => {
      if (task.status === 'in_progress') {
        const newProgress = Math.min(100, task.progress + state.speed * 2)
        if (newProgress >= 100) {
          return { ...task, status: 'completed' as const, progress: 100 }
        }
        return { ...task, progress: newProgress }
      }
      return task
    })

    const updatedRepairJobs = state.repairJobs.map(job => {
      if (job.status === 'repairing') {
        const newProgress = Math.min(100, job.progress + state.speed * 1.5)
        if (newProgress >= 100) {
          return { ...job, status: 'done' as const, progress: 100 }
        }
        return { ...job, progress: newProgress }
      }
      return job
    })

    const updatedStations = state.stations.map(station => {
      if (station.type === 'no_parking' || station.type === 'maintenance') return station
      
      const stationBikes = updatedBikes.filter(b => b.stationId === station.id && b.status === 'available')
      const brokenBikes = updatedBikes.filter(b => b.stationId === station.id && b.status === 'broken')
      const lowBatteryBikes = stationBikes.filter(b => b.battery < state.rules.lowBatteryThreshold)
      
      return {
        ...station,
        availableBikes: stationBikes.length,
        brokenBikes: brokenBikes.length,
        lowBatteryBikes: lowBatteryBikes.length,
      }
    })

    set({
      time: newTime,
      day: newDay,
      bikes: updatedBikes,
      employees: updatedEmployees,
      tasks: updatedTasks,
      repairJobs: updatedRepairJobs,
      stations: updatedStations,
    })
  },

  assignTask: (taskId, employeeId) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId)
    const employee = state.employees.find(e => e.id === employeeId)
    if (!task || !employee) return state

    return {
      tasks: state.tasks.map(t => 
        t.id === taskId ? { ...t, status: 'in_progress' as const, assignedTo: employeeId } : t
      ),
      employees: state.employees.map(e => 
        e.id === employeeId ? { ...e, status: 'working' as const, currentTaskId: taskId } : e
      ),
    }
  }),

  completeTask: (taskId) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId)
    if (!task) return state

    const employee = state.employees.find(e => e.currentTaskId === taskId)
    
    return {
      tasks: state.tasks.map(t => 
        t.id === taskId ? { ...t, status: 'completed' as const, progress: 100 } : t
      ),
      employees: state.employees.map(e => 
        e.currentTaskId === taskId ? { ...e, status: 'idle' as const, currentTaskId: null } : e
      ),
      money: state.money + task.reward,
      stats: {
        ...state.stats,
        completedTasks: state.stats.completedTasks + 1,
        satisfaction: Math.min(100, state.stats.satisfaction + 1),
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
      e.id === employeeId ? { ...e, status } : e
    )
  })),

  addEvent: (event) => set((state) => {
    const newEvent: GameEvent = {
      ...event,
      id: `event-${eventIdCounter++}`,
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
      bikes: state.bikes.map(b => b.id === bikeId ? { ...b, status: 'maintenance' as const } : b),
    }
  }),

  startRepair: (jobId) => set((state) => ({
    repairJobs: state.repairJobs.map(j => 
      j.id === jobId ? { ...j, status: 'repairing' as const } : j
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
        expenses: state.stats.expenses + job.cost,
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

  resetGame: () => set({
    day: 1,
    time: 8 * 60,
    speed: 1,
    isPaused: false,
    money: 5000,
    activePanel: 'map',
    selectedStationId: null,
    rules: { ...defaultRules },
    stats: { ...defaultStats },
    stations: generateStations(),
    bikes: generateBikes(),
    tasks: initialTasks,
    employees: generateEmployees(),
    events: [],
    repairJobs: initialRepairJobs,
    achievements: generateAchievements(),
  }),
}))
