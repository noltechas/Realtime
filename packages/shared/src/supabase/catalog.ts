import type { KaraokeClient } from './client'

export interface CatalogSpotifyData {
  key?: number
  mode?: number
  tempo?: number
  releaseDate?: string
  releaseYear?: number
  instrumentalness?: number
  popularity?: number
}

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
  /** Raw Spotify metadata JSON column (key/mode/tempo/releaseYear/popularity…). */
  spotify_data: CatalogSpotifyData | null
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

// Only the columns a client reads. `select('*')` also shipped the row id,
// created_at and session_id on every row (a fifth of a 550-song payload);
// session_id is the filter, so it's filled back in here instead of fetched.
const CATALOG_COLUMNS =
  'track_id,name,artist,art_url,album_name,duration_ms,roles,has_vocals,genres,offensive_role_indices,spotify_data'

export async function listCatalog(
  client: KaraokeClient,
  sessionId: string,
): Promise<KaraokeCatalogRow[]> {
  const { data, error } = await client
    .from('karaoke_catalog')
    .select(CATALOG_COLUMNS)
    .eq('session_id', sessionId)

  if (error) throw new Error(`Failed to load catalog: ${error.message}`)
  return ((data ?? []) as Omit<KaraokeCatalogRow, 'session_id'>[]).map((row) => ({ ...row, session_id: sessionId }))
}

// Spotify serves every album cover at three sizes, named by a fixed prefix on
// the image id: 640px (ab67616d0000b273), 300px (ab67616d00001e02) and 64px
// (ab67616d00004851). The catalog stores the 640px one, which is 60 to 180 KB;
// the 300px one is a quarter of that and plenty for a grid card. Any URL that
// isn't a Spotify cover is returned unchanged.
const SPOTIFY_COVER = /^(https:\/\/i\.scdn\.co\/image\/)ab67616d0000(?:b273|1e02|4851)/
const COVER_SIZE: Record<640 | 300 | 64, string> = { 640: 'b273', 300: '1e02', 64: '4851' }

export function spotifyArtUrl(url: string | null | undefined, size: 640 | 300 | 64): string | null {
  if (!url) return null
  return SPOTIFY_COVER.test(url) ? url.replace(SPOTIFY_COVER, `$1ab67616d0000${COVER_SIZE[size]}`) : url
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
