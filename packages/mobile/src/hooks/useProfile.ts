import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'karaoke.profile.v1'

export interface UserProfile {
  name: string
  defaultColor?: string
  profilePicture?: string
}

interface UseProfileResult {
  profile: UserProfile | null
  loading: boolean
  saveProfile: (p: UserProfile) => Promise<void>
  clearProfile: () => Promise<void>
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return
        if (raw) {
          try {
            setProfile(JSON.parse(raw) as UserProfile)
          } catch {
            // corrupt — treat as no profile
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

  const saveProfile = useCallback(async (p: UserProfile) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    setProfile(p)
  }, [])

  const clearProfile = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY)
    setProfile(null)
  }, [])

  return { profile, loading, saveProfile, clearProfile }
}
