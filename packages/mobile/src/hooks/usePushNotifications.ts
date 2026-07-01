import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { AppState, Platform } from 'react-native'
import { supabase } from '../supabase/client'

// Suppress the OS banner/sound when the app is FOREGROUNDED — if the user is
// actively in the app they see the turn change live (the Stage/React tab flips
// and QueueToastOverlay fires), so an "it's your turn" push on top is noise.
// The notify-singer edge function already skips guests whose presence heartbeat
// is fresh, so a push normally won't even arrive while we're foreground; this
// handler is the client-side safety net for the race where one is already
// in-flight as the user opens the app. Backgrounded/closed → the OS shows it
// directly (this handler doesn't run), so those still come through.
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const active = AppState.currentState === 'active'
    return {
      shouldShowBanner: !active,
      shouldShowList: !active,
      shouldPlaySound: !active,
      shouldSetBadge: false,
    }
  },
})

const EXPO_PROJECT_ID = '98da3795-cb1a-457d-80d7-a662090b1b84'

// How often to refresh the presence heartbeat while foregrounded. Must be
// comfortably below the edge function's ACTIVE_WINDOW_SECONDS (45s) so the
// timestamp never goes stale while the user is actually looking at the app.
const HEARTBEAT_MS = 20_000

// Registers this device's Expo push token with the guest row so the host's
// desktop can notify the guest when it's their turn to sing. Runs once per
// session join; silently no-ops on simulators/emulators where push tokens
// aren't available.
export function usePushNotifications(guestId: string | undefined): void {
  const registered = useRef(false)

  useEffect(() => {
    if (!guestId || registered.current) return

    async function register(): Promise<void> {
      const { status: existing } = await Notifications.getPermissionsAsync()
      let finalStatus = existing

      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') return

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('karaoke', {
          name: 'Karaoke',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8B5CF6',
        })
      }

      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId: EXPO_PROJECT_ID,
        })
        if (!token) return

        await supabase
          .from('karaoke_guests')
          .update({ push_token: token })
          .eq('id', guestId)

        registered.current = true
      } catch {
        // Simulators and devices without push capability fail silently here.
      }
    }

    void register()
  }, [guestId])

  // ── Presence heartbeat ──────────────────────────────────────────────────
  // Tell the backend whether this guest is actively in the app so notify-singer
  // can skip pushes to on-screen users. While foregrounded we stamp
  // last_active_at now + every HEARTBEAT_MS; on background/inactive we clear it
  // to NULL (immediate "not in app"). The freshness window on the server also
  // covers the force-quit-from-foreground case, where the background transition
  // never fires and the heartbeat simply stops.
  useEffect(() => {
    if (!guestId) return

    let interval: ReturnType<typeof setInterval> | null = null

    const stamp = (value: string | null): void => {
      void supabase
        .from('karaoke_guests')
        .update({ last_active_at: value })
        .eq('id', guestId)
    }

    const startBeating = (): void => {
      stamp(new Date().toISOString())
      if (interval) clearInterval(interval)
      interval = setInterval(() => stamp(new Date().toISOString()), HEARTBEAT_MS)
    }

    const stopBeating = (): void => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    // Kick off immediately — the hook only mounts once the user is in a session,
    // which means the app is foreground.
    if (AppState.currentState === 'active') startBeating()

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        startBeating()
      } else {
        stopBeating()
        stamp(null)
      }
    })

    return () => {
      stopBeating()
      sub.remove()
      // Leaving the session (or unmount) means we're no longer waiting to sing.
      stamp(null)
    }
  }, [guestId])
}
