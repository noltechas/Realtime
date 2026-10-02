import { useCallback, useEffect, useReducer } from 'react'
import { Image } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { listCatalog, shuffleCatalog, spotifyArtUrl, type KaraokeCatalogRow } from '@karaoke/shared'
import { supabase } from '../supabase/client'

interface UseCatalogResult {
  catalog: KaraokeCatalogRow[]
  /** True until this session's catalog has been fetched fresh at least once
   *  (a saved copy may already be showing). */
  loading: boolean
  refresh: () => Promise<void>
}

// ── One catalog per session, shared by every screen ─────────────────────────
// Queue, Songs and Add a Song all need the catalog. Each used to download the
// whole table on mount (550+ rows, ~300 KB) and shuffle its own copy; now they
// share one store per session:
//
//   • It is SAVED on the phone, so on the next launch the list appears straight
//     from storage while a fresh copy downloads in the background.
//   • One request at a time, however many screens ask.
//   • The order is shuffled once (so the same songs don't always sit at the
//     top) and then KEPT: a background refresh slots new songs in and drops
//     removed ones without reshuffling under the guest, and rows that didn't
//     change keep their object identity, so memoised cards don't re-render.
//   • As soon as rows arrive, the first screenful of covers is prefetched at
//     card size, usually before the Songs tab is even opened.

const STORE_VERSION = 1
const storageKey = (sessionId: string) => `catalog:v${STORE_VERSION}:${sessionId}`
/** A screen that subscribes after this long refetches in the background. */
const STALE_MS = 3 * 60 * 1000
const PREFETCH_COUNT = 24
const EMPTY: KaraokeCatalogRow[] = []

interface Entry {
  rows: KaraokeCatalogRow[]
  fetchedAt: number
  hydrated: boolean
  inflight: Promise<void> | null
  listeners: Set<() => void>
  prefetched: Set<string>
}

const entries = new Map<string, Entry>()

function entryFor(sessionId: string): Entry {
  let e = entries.get(sessionId)
  if (!e) {
    e = { rows: EMPTY, fetchedAt: 0, hydrated: false, inflight: null, listeners: new Set(), prefetched: new Set() }
    entries.set(sessionId, e)
  }
  return e
}

function emit(e: Entry): void {
  e.listeners.forEach((fn) => fn())
}

/** Warm the image cache with the covers the guest will see first. */
function prefetchCovers(e: Entry): void {
  for (const row of e.rows.slice(0, PREFETCH_COUNT)) {
    const url = spotifyArtUrl(row.art_url, 300)
    if (!url || e.prefetched.has(url)) continue
    e.prefetched.add(url)
    Image.prefetch(url).catch(() => {
      e.prefetched.delete(url)
    })
  }
}

const sameRow = (a: KaraokeCatalogRow, b: KaraokeCatalogRow) => JSON.stringify(a) === JSON.stringify(b)

/** Fold a fresh download into the order already on screen. */
function mergeInOrder(prev: KaraokeCatalogRow[], fresh: KaraokeCatalogRow[]): KaraokeCatalogRow[] {
  if (prev.length === 0) return shuffleCatalog(fresh)
  const byId = new Map(fresh.map((r) => [r.track_id, r]))
  const kept: KaraokeCatalogRow[] = []
  for (const old of prev) {
    const next = byId.get(old.track_id)
    if (!next) continue // removed from the library
    kept.push(sameRow(old, next) ? old : next)
    byId.delete(old.track_id)
  }
  // Songs that are new since last time go in at random places.
  for (const row of byId.values()) kept.splice(Math.floor(Math.random() * (kept.length + 1)), 0, row)
  return kept
}

async function hydrate(sessionId: string, e: Entry): Promise<void> {
  if (e.hydrated) return
  e.hydrated = true
  try {
    const raw = await AsyncStorage.getItem(storageKey(sessionId))
    // A fresh download may have landed while storage was being read.
    if (!raw || e.rows.length > 0) return
    const saved = JSON.parse(raw) as KaraokeCatalogRow[]
    if (!Array.isArray(saved) || saved.length === 0) return
    e.rows = shuffleCatalog(saved)
    emit(e)
    prefetchCovers(e)
  } catch {
    // A missing or unreadable copy just means waiting for the network.
  }
}

function fetchFresh(sessionId: string, e: Entry): Promise<void> {
  if (e.inflight) return e.inflight
  e.inflight = (async () => {
    try {
      const fresh = await listCatalog(supabase, sessionId)
      e.rows = mergeInOrder(e.rows, fresh)
      prefetchCovers(e)
      AsyncStorage.setItem(storageKey(sessionId), JSON.stringify(fresh)).catch(() => {})
    } finally {
      // Even a failed fetch ends "loading", as before: screens show what they
      // have (the saved copy, or nothing) and pull-to-refresh retries.
      e.fetchedAt = Date.now()
      e.inflight = null
      emit(e)
    }
  })()
  return e.inflight
}

export function useCatalog(sessionId: string | undefined): UseCatalogResult {
  const [, rerender] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    if (!sessionId) return
    const e = entryFor(sessionId)
    e.listeners.add(rerender)
    void hydrate(sessionId, e)
    if (!e.inflight && Date.now() - e.fetchedAt > STALE_MS) void fetchFresh(sessionId, e).catch(() => {})
    return () => {
      e.listeners.delete(rerender)
    }
  }, [sessionId])

  const refresh = useCallback(async () => {
    if (!sessionId) return
    await fetchFresh(sessionId, entryFor(sessionId)).catch(() => {})
  }, [sessionId])

  const e = sessionId ? entries.get(sessionId) : undefined
  return {
    catalog: e?.rows ?? EMPTY,
    loading: !e || e.fetchedAt === 0,
    refresh,
  }
}

// Card-size cover rows for grids. Cached per row object, so a row keeps the
// same thumbnail object (and memoised cards bail out) for as long as the row
// itself is unchanged.
const coverRows = new WeakMap<KaraokeCatalogRow, KaraokeCatalogRow>()

/** The row with its cover swapped for the 300px size, for grid cards. Keep
 *  the original for anything that's stored or shown large. */
export function withCardCover(row: KaraokeCatalogRow): KaraokeCatalogRow {
  let c = coverRows.get(row)
  if (!c) {
    const art = spotifyArtUrl(row.art_url, 300)
    c = art === row.art_url ? row : { ...row, art_url: art }
    coverRows.set(row, c)
  }
  return c
}
