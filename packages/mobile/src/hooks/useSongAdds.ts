import { useEffect, useMemo, useRef, useState } from 'react'
import { listSongAdds, type KaraokeSongAddRow } from '@karaoke/shared'
import { supabase } from '../supabase/client'
import { useForegroundEpoch } from './useAppForeground'

interface UseSongAddsResult {
  /** Every "Add a Song" add in the session, newest first. */
  rows: KaraokeSongAddRow[]
  /** Newest add per track, for "is this queued song still building?". */
  byTrack: Map<string, KaraokeSongAddRow>
}

// Live view of the session's song adds (karaoke_song_requests): initial fetch
// plus realtime INSERT/UPDATE, re-fetched on foreground like useSessionRow.
// `onLanded` fires when an add reaches the library, so screens can refresh
// their catalog without a pull-to-refresh.
export function useSongAdds(
  sessionId: string | undefined,
  onLanded?: (row: KaraokeSongAddRow) => void,
): UseSongAddsResult {
  const [rows, setRows] = useState<KaraokeSongAddRow[]>([])
  const foregroundEpoch = useForegroundEpoch()
  const onLandedRef = useRef(onLanded)
  onLandedRef.current = onLanded

  useEffect(() => {
    if (!sessionId) {
      setRows([])
      return
    }
    let cancelled = false
    listSongAdds(supabase, sessionId).then((r) => {
      if (!cancelled) setRows(r)
    })
    // Unique suffix per subscription (see useSessionRow for why).
    const channel = supabase
      .channel('mobile-song-adds-' + sessionId + '-' + Math.random().toString(36).slice(2))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'karaoke_song_requests', filter: 'session_id=eq.' + sessionId },
        (payload) => {
          if (cancelled) return
          const row = payload.new as KaraokeSongAddRow
          if (!row?.id) return
          setRows((prev) => {
            const i = prev.findIndex((r) => r.id === row.id)
            if (i < 0) return [row, ...prev]
            const merged = { ...prev[i], ...row }
            if (merged.status === 'added' && prev[i].status !== 'added') {
              // Defer the callback out of the state updater.
              setTimeout(() => onLandedRef.current?.(merged), 0)
            }
            const next = [...prev]
            next[i] = merged
            return next
          })
        },
      )
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [sessionId, foregroundEpoch])

  const byTrack = useMemo(() => {
    const m = new Map<string, KaraokeSongAddRow>()
    for (const r of rows) if (r.track_id && !m.has(r.track_id)) m.set(r.track_id, r)
    return m
  }, [rows])

  return { rows, byTrack }
}
