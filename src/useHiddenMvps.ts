import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'ragnarok-tools:hidden-mvps'

function loadHidden(): number[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as number[]) : []
  } catch {
    return []
  }
}

export function useHiddenMvps() {
  const [hiddenIds, setHiddenIds] = useState<number[]>(loadHidden)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenIds))
  }, [hiddenIds])

  const hideMvp = useCallback((id: number) => {
    setHiddenIds((current) => (current.includes(id) ? current : [...current, id]))
  }, [])

  const restoreMvp = useCallback((id: number) => {
    setHiddenIds((current) => current.filter((item) => item !== id))
  }, [])

  const restoreAll = useCallback(() => setHiddenIds([]), [])

  return { hiddenIds, hideMvp, restoreMvp, restoreAll }
}
