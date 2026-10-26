import { useCallback, useEffect, useState } from 'react'
import type { Mvp, MvpTimer } from './types'

const STORAGE_KEY = 'ragnarok-tools:mvp-timers'

function loadTimers(): MvpTimer[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as MvpTimer[]) : []
  } catch {
    return []
  }
}

export function useTimers() {
  const [timers, setTimers] = useState<MvpTimer[]>(loadTimers)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timers))
  }, [timers])

  const startTimer = useCallback(
    (mvp: Mvp, mapname: string, killedAt: number) => {
      const spawn = mvp.spawns.find((item) => item.mapname === mapname)
      if (!spawn) return

      const timer: MvpTimer = {
        id: `${mvp.id}:${mapname}`,
        mvpId: mvp.id,
        mapname,
        killedAt,
        respawnAt: killedAt + spawn.respawnTime,
        windowClosesAt: killedAt + spawn.respawnTime + spawn.respawnVariance,
      }

      setTimers((current) => [
        ...current.filter((item) => item.id !== timer.id),
        timer,
      ])
    },
    [],
  )

  const removeTimer = useCallback((id: string) => {
    setTimers((current) => current.filter((timer) => timer.id !== id))
  }, [])

  const clearTimers = useCallback(() => setTimers([]), [])

  return { timers, startTimer, removeTimer, clearTimers }
}
