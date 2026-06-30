import { useEffect, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

// ── Foreground-resync signal ────────────────────────────────────────────────
//
// On iOS/Android the OS suspends the app's network sockets while it's
// backgrounded. Supabase Realtime is a WebSocket, so any postgres_changes the
// host fired while we were away (new song, theme change, "you're up", queue
// edits) are simply MISSED — realtime does not replay missed events on
// reconnect. When the user comes back, our cached state is stale: the wrong
// song/theme is shown and the React→Stage auto-jump never fires because the
// session row still lacks the local guest in now_playing_singer_configs.
//
// The fix is the standard "refetch on focus" pattern: every realtime hook
// includes `useForegroundEpoch()` in its effect deps. Each time the app
// returns to the foreground we bump a shared counter, which re-runs those
// effects — tearing down the (possibly dead) channel, doing a fresh authoritative
// fetch, and re-subscribing for future live updates.
//
// A single module-level AppState listener serves every consumer so we don't
// attach N listeners. It lives for the app's lifetime by design.

let epoch = 0
const listeners = new Set<() => void>()
let appStateSub: { remove: () => void } | null = null
let lastState: AppStateStatus = AppState.currentState

function ensureListener(): void {
  if (appStateSub) return
  appStateSub = AppState.addEventListener('change', (next) => {
    const cameToForeground =
      /inactive|background/.test(lastState) && next === 'active'
    lastState = next
    if (!cameToForeground) return
    epoch += 1
    listeners.forEach((fn) => fn())
  })
}

/**
 * Returns a counter that increments each time the app returns to the
 * foreground. Add it to a realtime subscription effect's dependency array to
 * force a fresh fetch + re-subscribe on resume, recovering any state that
 * changed while the OS had the WebSocket suspended.
 */
export function useForegroundEpoch(): number {
  const [, force] = useState(0)
  useEffect(() => {
    ensureListener()
    const fn = () => force((n) => n + 1)
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])
  return epoch
}
