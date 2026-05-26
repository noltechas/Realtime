import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'karaoke.session.v1'

export interface CachedSession {
  sessionId: string
  sessionCode: string
  guestId: string
  guestName: string
}

interface UseSessionResult {
  session: CachedSession | null
  loading: boolean
  saveSession: (s: CachedSession) => Promise<void>
  clearSession: () => Promise<void>
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<CachedSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return
        if (raw) {
          try {
            setSession(JSON.parse(raw) as CachedSession)
          } catch {
            // Corrupt cache — ignore and treat as no session.
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const saveSession = useCallback(async (s: CachedSession) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    setSession(s)
  }, [])

  const clearSession = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }, [])

  return { session, loading, saveSession, clearSession }
}
