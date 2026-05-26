import { useEffect, useState } from 'react'
import type { KaraokeSessionRow, SingerConfig } from '@karaoke/shared'
import { supabase } from '../supabase/client'

// Extends the shared KaraokeSessionRow with the columns the React/Stage tab
// reads. These exist in the live DB but aren't in the shared `tables.ts` type
// yet — the website reads/writes them directly. We keep them optional here so
// missing values fall back to defaults that match the website's behavior.
export interface SessionRowExtras {
  vocal_fx_enabled?: boolean | null
  autotune_enabled?: boolean | null
  skip_requested_at?: string | null
  trending_gifs?: TrendingGif[] | null
}
export type FullSessionRow = KaraokeSessionRow & SessionRowExtras

export interface TrendingGif {
  id: string
  title: string
  preview: string
  url: string
}

// Subscribes to a karaoke_sessions row (initial fetch + realtime UPDATEs) and
// returns the latest snapshot. Used by StageScreen to know when a song is
// playing, who's matched, and to render up-to-date toggles. Doing the fetch +
// realtime sub in one hook keeps StageScreen's lifecycle clean.
export function useSessionRow(sessionId: string | undefined): FullSessionRow | null {
  const [row, setRow] = useState<FullSessionRow | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setRow(null)
      return
    }
    let cancelled = false

    supabase
      .from('karaoke_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()
      .then((res) => {
        if (cancelled) return
        if (res.error || !res.data) return
        setRow(res.data as FullSessionRow)
      })

    // Unique suffix per subscription. Without this, calling
    // supabase.channel('mobile-session-<id>') from two consumers (StageScreen
    // and StageTabIcon both render simultaneously, plus Strict Mode double-
    // invokes the effect) returns the SAME channel instance, and binding a
    // second .on() after subscribe() throws "cannot add postgres_changes
    // callbacks ... after subscribe()". Same fix as subscribeToQueue /
    // subscribeToGuests in @karaoke/shared.
    const channelName =
      'mobile-session-' + sessionId + '-' + Math.random().toString(36).slice(2)
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'karaoke_sessions',
          filter: 'id=eq.' + sessionId,
        },
        (payload) => {
          if (cancelled) return
          setRow(payload.new as FullSessionRow)
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  return row
}

// Whether the local guest is "up" — i.e., their name appears in the current
// now_playing singer configs. Mirrors the website's
// `isSinging = !!(matchedSinger && nowPlaying)` check from docs/js/render/stage.js.
export function guestIsUp(
  row: FullSessionRow | null,
  guestName: string | undefined,
): SingerConfig | null {
  if (!row) return null
  if (!row.now_playing_track_id && !row.now_playing_name) return null
  if (!guestName) return null
  const configs = row.now_playing_singer_configs
  if (!Array.isArray(configs)) return null
  const gn = guestName.toLowerCase()
  const match = configs.find((s) => (s?.name || '').toLowerCase() === gn)
  return match ?? null
}
