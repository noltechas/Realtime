import { useEffect, useRef, useState } from 'react'
import { subscribeToQueue, type KaraokeQueueRow } from '@karaoke/shared'
import { supabase } from '../supabase/client'
import { useSession } from './useSession'
import { useForegroundEpoch } from './useAppForeground'

export interface QueueToastData {
  id: string
  trackName: string
  trackArtist: string
  trackArtUrl: string | null
  singerConfigs: KaraokeQueueRow['singer_configs']
  addedByName: string | null
  isHidden: boolean
  stageTheme: string | null
}

export function useQueueToast() {
  const { session } = useSession()
  const [queue, setQueue] = useState<QueueToastData[]>([])
  const seenIds = useRef(new Set<string>())
  const isInitialLoad = useRef(true)
  const foregroundEpoch = useForegroundEpoch()

  useEffect(() => {
    if (!session) return
    isInitialLoad.current = true

    const unsub = subscribeToQueue(supabase, session.sessionId, (rows) => {
      if (isInitialLoad.current) {
        // Seed seen IDs so the existing queue doesn't trigger toasts on join.
        for (const r of rows) seenIds.current.add(r.id)
        isInitialLoad.current = false
        return
      }

      const fresh = rows.filter((r) => !seenIds.current.has(r.id))
      for (const r of fresh) seenIds.current.add(r.id)

      const toasts = fresh
        .filter((r) => r.added_by_guest_id !== session.guestId)
        .map(
          (r): QueueToastData => ({
            id: r.id,
            trackName: r.track_name,
            trackArtist: r.track_artist,
            trackArtUrl: r.track_art_url,
            singerConfigs: r.singer_configs,
            addedByName: r.added_by_name,
            isHidden: r.is_hidden,
            stageTheme: r.stage_theme,
          }),
        )

      if (toasts.length > 0) setQueue((prev) => [...prev, ...toasts])
    })

    return () => {
      unsub()
      isInitialLoad.current = true
      seenIds.current.clear()
    }
    // foregroundEpoch re-runs this on app resume — see useAppForeground.
  }, [session?.sessionId, foregroundEpoch])

  const dismiss = () => setQueue((prev) => prev.slice(1))

  return { toast: queue[0] ?? null, dismiss }
}
