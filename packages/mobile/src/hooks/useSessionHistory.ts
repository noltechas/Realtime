import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'karaoke.history.v1'
const MAX_ENTRIES = 25

export interface SessionHistoryEntry {
  sessionId: string
  sessionCode: string
  sessionName: string | null
  guestId: string
  joinedAt: string
}

interface UseSessionHistoryResult {
  history: SessionHistoryEntry[]
  loading: boolean
  recordJoin: (entry: SessionHistoryEntry) => Promise<void>
  removeEntry: (sessionId: string) => Promise<void>
  clearHistory: () => Promise<void>
}

async function readAll(): Promise<SessionHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SessionHistoryEntry[]) : []
  } catch {
    return []
  }
}

async function writeAll(entries: SessionHistoryEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function useSessionHistory(): UseSessionHistoryResult {
  const [history, setHistory] = useState<SessionHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    readAll()
      .then((entries) => {
        if (!cancelled) setHistory(entries)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Move/refresh an entry to the top, deduplicating on sessionId. Newest at
  // index 0; trimmed to MAX_ENTRIES so AsyncStorage doesn't grow unbounded.
  const recordJoin = useCallback(async (entry: SessionHistoryEntry) => {
    const current = await readAll()
    const filtered = current.filter((e) => e.sessionId !== entry.sessionId)
    const next = [entry, ...filtered].slice(0, MAX_ENTRIES)
    await writeAll(next)
    setHistory(next)
  }, [])

  const removeEntry = useCallback(async (sessionId: string) => {
    const current = await readAll()
    const next = current.filter((e) => e.sessionId !== sessionId)
    await writeAll(next)
    setHistory(next)
  }, [])

  const clearHistory = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY)
    setHistory([])
  }, [])

  return { history, loading, recordJoin, removeEntry, clearHistory }
}
