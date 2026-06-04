import { useEffect, useState } from 'react'
import type { AwardsRevealStep, KaraokeSessionRow, SingerConfig } from '@karaoke/shared'
import { supabase } from '../supabase/client'

// Extends the shared KaraokeSessionRow with the columns the React/Stage tab
// reads. These exist in the live DB but aren't in the shared `tables.ts` type
// yet — the website reads/writes them directly. We keep them optional here so
// missing values fall back to defaults that match the website's behavior.
export interface MicFxOverride {
  vocal_fx?: boolean
  autotune?: boolean
}

export interface SessionRowExtras {
  vocal_fx_enabled?: boolean | null
  autotune_enabled?: boolean | null
  // Per-singer FX / autotune overrides, keyed by singer key (guestId, or
  // "name:<name>" for name-only singers). A guest toggling their own Vocal FX
  // / Autotune writes only its own key, so the desktop applies it to that
  // singer's mic ONLY. Absent key falls back to the session-wide flags above.
  mic_fx_overrides?: Record<string, MicFxOverride> | null
  skip_requested_at?: string | null
  trending_gifs?: TrendingGif[] | null
  // Spotify access token the host's desktop app publishes onto the session so
  // guests can search Spotify when requesting a song to be added. Nullable /
  // short-lived — gate the request UI through `spotifyTokenIfFresh`.
  spotify_token?: string | null
  spotify_token_expires_at?: string | null
  // Current awards-ceremony reveal step, persisted by the host so remote
  // devices that join late (or had the app closed) can resume the reveal.
  // Null / absent when no reveal is in progress.
  awards_reveal?: AwardsRevealStep | null
}
export type FullSessionRow = KaraokeSessionRow & SessionRowExtras

// Stable key for a singer in the mic_fx_overrides map. Guest-linked singers key
// by their session-scoped guestId; name-only (admin/host) singers key by name.
// Desktop and mobile MUST compute this identically.
export function singerFxKey(args: { guestId?: string | null; name?: string | null }): string | null {
  if (args.guestId) return args.guestId
  if (args.name) return 'name:' + args.name
  return null
}

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
        // Initial fetch is authoritative — replace whatever placeholder
        // state we have. Subsequent realtime UPDATEs merge (see below).
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
          // Merge incoming payload into the existing row instead of
          // replacing it. The desktop fires several narrow updates
          // (`syncIsPlaying` only writes `is_playing`, theme/trending_gifs
          // updates only touch their own columns) and Supabase realtime
          // can deliver a `payload.new` that omits unchanged JSONB
          // columns like `now_playing_singer_configs`. Replacing the row
          // wholesale would briefly drop the singer match — flipping the
          // stage-tab label/icon back to "React" mid-song or during the
          // skip→next-song transition even when the local guest is still
          // a singer. Merge keeps every known field until a later update
          // explicitly overwrites it.
          const next = payload.new as Partial<FullSessionRow>
          setRow((prev) => (prev ? { ...prev, ...next } : (next as FullSessionRow)))
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

// Whether the local guest is "up" — i.e., they appear in the current
// now_playing singer configs.
//
// Matching strategy (in order):
//   1. guestId — stable session-scoped UUID. Most reliable, immune to
//      profile-name edits, and what the wizard now writes onto every
//      locally-added singer.
//   2. name (case-insensitive) — fallback for songs that predate the
//      guestId carry-through, and for singers added from the website /
//      desktop that don't have a guestId yet.
//
// The previous version ONLY matched on name, which caused a silent bug:
// the mobile wizard stamps each singer's `name` from `profile.name`, but
// `guestIsUp` was called with `session.guestName` (the name captured at
// session-join time). The two strings drift apart any time the user edits
// their profile after joining, and the user's own songs stop being
// recognized as "theirs" — so the React tab never auto-flips to Stage and
// "who's singing" can't render the YoureUp panel for the local user.
export function guestIsUp(
  row: FullSessionRow | null,
  guestName: string | undefined,
  guestId?: string,
): SingerConfig | null {
  if (!row) return null
  if (!row.now_playing_track_id && !row.now_playing_name) return null
  const configs = row.now_playing_singer_configs
  if (!Array.isArray(configs)) return null

  if (guestId) {
    const idMatch = configs.find((s) => s?.guestId && s.guestId === guestId)
    if (idMatch) return idMatch
  }

  if (guestName) {
    const gn = guestName.toLowerCase()
    const nameMatch = configs.find((s) => (s?.name || '').toLowerCase() === gn)
    if (nameMatch) return nameMatch
  }

  return null
}
