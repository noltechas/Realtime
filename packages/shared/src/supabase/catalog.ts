import type { KaraokeClient } from './client'

export interface KaraokeCatalogRow {
  session_id: string
  track_id: string
  name: string
  artist: string
  art_url: string | null
  album_name: string | null
  duration_ms: number | null
  roles: string[] | null
  has_vocals: boolean | null
  genres: string[] | null
  offensive_role_indices: number[] | null
}

// Companion-site genre ordering. Anything not in the list gets dropped to the
// end so the mobile filter tabs match what the web app renders.
export const GENRE_ORDER = [
  'Hip Hop',
  'R&B',
  'Pop',
  'Rock',
  'Indie',
  'Electronic',
  'Folk',
  'Other',
]

export async function listCatalog(
  client: KaraokeClient,
  sessionId: string,
): Promise<KaraokeCatalogRow[]> {
  const { data, error } = await client
    .from('karaoke_catalog')
    .select('*')
    .eq('session_id', sessionId)

  if (error) throw new Error(`Failed to load catalog: ${error.message}`)
  return (data ?? []) as KaraokeCatalogRow[]
}

// Same shuffle the companion site uses so the catalog isn't biased toward
// alphabetical / insertion order. Stable across renders since it's pure.
export function shuffleCatalog<T>(rows: T[]): T[] {
  return rows
    .map((v) => ({ v, s: Math.random() }))
    .sort((a, b) => a.s - b.s)
    .map((o) => o.v)
}

export interface GenreCounts {
  [genre: string]: number
}

export function computeGenreCounts(catalog: KaraokeCatalogRow[]): GenreCounts {
  const counts: GenreCounts = { 'All Songs': catalog.length }
  for (const row of catalog) {
    if (!row.genres?.length) continue
    for (const g of row.genres) {
      counts[g] = (counts[g] ?? 0) + 1
    }
  }
  return counts
}

export function genreList(catalog: KaraokeCatalogRow[]): {
  list: string[]
  counts: GenreCounts
} {
  const counts = computeGenreCounts(catalog)
  const present = GENRE_ORDER.filter((g) => counts[g])
  return { list: ['All Songs', ...present], counts }
}

export function filterCatalog(
  catalog: KaraokeCatalogRow[],
  query: string,
  genre: string,
): KaraokeCatalogRow[] {
  const q = query.trim().toLowerCase()
  const g = genre || 'All Songs'
  return catalog.filter((s) => {
    if (g !== 'All Songs') {
      if (!s.genres || s.genres.indexOf(g) < 0) return false
    }
    if (q) {
      if (
        s.name.toLowerCase().indexOf(q) < 0 &&
        s.artist.toLowerCase().indexOf(q) < 0
      ) {
        return false
      }
    }
    return true
  })
}
