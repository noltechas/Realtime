import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@karaoke/shared'

// We can't reuse @karaoke/shared's `createKaraokeClient` directly here because
// the React Native runtime needs AsyncStorage wired into the auth/realtime
// client and a URL polyfill. The shared module stays platform-agnostic; we
// build the RN-specific client here once and export the singleton.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export type { KaraokeClient } from '@karaoke/shared'
