import { useCallback, useEffect, useState } from 'react'
import type { GeneratedName } from '../types'

const STORAGE_KEY = 'archis.favorites.v1'

/**
 * Kept names, held in localStorage.
 *
 * The whole name is stored, not its id. A name's id encodes the roots it came from, so
 * looking one up later would mean re-running the generator with the same query and hoping
 * it still ranks — and a favourite that vanishes because the scorer changed is worse than
 * no favourites at all. Storing the object means a kept name is kept.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<GeneratedName[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      // A corrupt or unavailable store (private mode, quota, hand-edited JSON) must not
      // take the app down with it. Starting empty is a survivable loss.
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    } catch {
      // Over quota or blocked. The list still works for this session.
    }
  }, [favorites])

  const isFavorite = useCallback(
    (name: GeneratedName) => favorites.some((f) => f.name === name.name),
    [favorites],
  )

  const toggle = useCallback((name: GeneratedName) => {
    setFavorites((current) =>
      current.some((f) => f.name === name.name)
        ? current.filter((f) => f.name !== name.name)
        : [name, ...current],
    )
  }, [])

  const clear = useCallback(() => setFavorites([]), [])

  return { favorites, isFavorite, toggle, clear }
}
