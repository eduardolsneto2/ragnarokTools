export interface MvpSpawn {
  mapname: string
  mapDisplayName: string
  amount: number
  respawnTime: number
  respawnVariance: number
}

export interface Mvp {
  id: number
  name: string
  level: number
  element: string
  race: string
  health: number
  imageUrl: string
  spawns: MvpSpawn[]
}

export interface MvpTimer {
  id: string
  mvpId: number
  mapname: string
  killedAt: number
  respawnAt: number
  windowClosesAt: number
}

export type TimerStatus = 'waiting' | 'window' | 'overdue'
