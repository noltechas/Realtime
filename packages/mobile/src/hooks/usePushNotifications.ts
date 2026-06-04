import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from '../supabase/client'

// Show banners/sounds even when the app is foregrounded (e.g. on a different tab)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const EXPO_PROJECT_ID = '98da3795-cb1a-457d-80d7-a662090b1b84'

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
}
