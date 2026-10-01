import type { KaraokeClient } from './client'
import type { KaraokeCatalogRow } from './catalog'

// "Add a Song": a guest picks any Spotify track and the host's desktop app
// builds it into the library automatically (desktop main/autogen.ts: audio →
// vocal separation → import → tuning pass), with no host approval step. Each
// add is a `karaoke_song_requests` row; the generator mirrors its progress
// into the row's generation_* columns. Guests can also sign up for a song
// before it's built: the queue row waits (the host skips past it) until it
// lands. The companion website (docs/js/supabase.js) implements the same flow;
// the mobile app and any future client share the data shape + DB write here
// so every client produces identical rows.
//
// The network search call itself (api.spotify.com) is NOT here: the shared
// package targets `lib: ["ES2020"]` (no DOM), so `fetch` isn't typed. Each
// platform owns the fetch and returns this normalized `SpotifyTrackResult`.

// A track from the Spotify search API, normalized to the fields the request
// flow needs. Mirrors the shape `spotifySearch()` builds in docs/js/supabase.js
// so rows written from web/mobile are interchangeable.
export interface SpotifyTrackResult {
  trackId: string
  name: string
  artist: string
  art: string | null
  album: string | null
  durationMs: number | null
  /** The raw Spotify track object, stored in the `spotify_data` jsonb column
   *  so the host's import flow has the full metadata on hand. */
  raw: unknown
}

// Return the Spotify access token only if present and at least 30s from expiry.
// The host's desktop app writes `spotify_token` / `spotify_token_expires_at`
// onto the session row; guests reuse it to search. Mirrors `tokenIfFresh()` in
// docs/js/utils.js so the website and app gate the request UI identically.
export function spotifyTokenIfFresh(
  token: string | null | undefined,
  expiresAt: string | null | undefined,
): string | null {
  if (!token) return null
  if (!expiresAt) return token
  const t = Date.parse(expiresAt)
  if (Number.isNaN(t)) return token
  return t > Date.now() + 30000 ? token : null
}

// Map a raw Spotify API track object to a `SpotifyTrackResult`. Exposed so the
// per-platform fetch wrappers don't each re-derive the art/artist/duration
// fields (and risk drifting from the website's shape).
export function normalizeSpotifyTrack(track: unknown): SpotifyTrackResult {
  const t = (track ?? {}) as {
    id?: string
    name?: string
    artists?: Array<{ name?: string }>
    album?: { name?: string; images?: Array<{ url?: string }> }
    duration_ms?: number
  }
  const art = t.album?.images?.[0]?.url ?? null
  return {
    trackId: t.id ?? '',
    name: t.name ?? '',
    artist: (t.artists ?? []).map((a) => a?.name ?? '').filter(Boolean).join(', '),
    art,
    album: t.album?.name ?? null,
    durationMs: t.duration_ms ?? null,
    raw: track,
  }
}

export interface SubmitSongRequestInput {
  sessionId: string
  requestedByGuestId?: string | null
  requestedByName: string
  requestedByProfilePicture?: string | null
  track: SpotifyTrackResult
}

export type SubmitSongRequestResult =
  | { status: 'ok' }
  | { status: 'duplicate' }
  | { status: 'error'; message: string }

// Insert a pending row into `karaoke_song_requests`; the host's generator
// picks it up right away. A partial unique index on (session_id, track_id)
// WHERE status='pending' makes a second add of a song that's already building
// raise Postgres 23505, reported here as 'duplicate' ("already on its way").
// A failed build is resolved as 'dismissed', so the song can be added again.
export async function submitSongRequest(
  client: KaraokeClient,
  input: SubmitSongRequestInput,
): Promise<SubmitSongRequestResult> {
  const { error } = await client.from('karaoke_song_requests').insert({
    session_id: input.sessionId,
    requested_by_guest_id: input.requestedByGuestId ?? null,
    requested_by_name: input.requestedByName || 'Guest',
    requested_by_profile_picture: input.requestedByProfilePicture ?? null,
    track_id: input.track.trackId,
    track_name: input.track.name,
    track_artist: input.track.artist,
    track_art_url: input.track.art ?? null,
    track_album: input.track.album ?? null,
    track_duration_ms: input.track.durationMs ?? null,
    spotify_data: input.track.raw ?? null,
  })
  if (error) {
    if (error.code === '23505') return { status: 'duplicate' }
    return { status: 'error', message: error.message }
  }
  return { status: 'ok' }
}

// A `karaoke_song_requests` row as guests read it.
export interface KaraokeSongAddRow {
  id: string
  session_id: string
  track_id: string
  track_name: string | null
  track_artist: string | null
  track_art_url: string | null
  requested_by_guest_id: string | null
  requested_by_name: string | null
  /** pending → added (in the library) | dismissed (build failed, or an old
   *  host dismissal). */
  status: 'pending' | 'added' | 'dismissed'
  generation_status: 'queued' | 'downloading' | 'separating' | 'importing' | 'tuning' | 'ready' | 'failed' | null
  generation_progress: number | null
  generation_error: string | null
  created_at: string
}

// Every add in the session, newest first. select('*') on purpose: naming the
// generation_* columns would fail the whole query on a database that predates
// them (see supabase/migrations/*_song_request_generation.sql).
export async function listSongAdds(client: KaraokeClient, sessionId: string): Promise<KaraokeSongAddRow[]> {
  const { data, error } = await client
    .from('karaoke_song_requests')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return []
  return (data ?? []) as KaraokeSongAddRow[]
}

// What the host's generator is doing with an add, in guest terms. Mirrors
// requestView() in docs/js/render/songs.js.
const BUILD_STAGE_LABELS: Record<string, string> = {
  queued: 'In line to be built',
  downloading: 'Grabbing the audio',
  separating: 'Splitting the vocals from the music',
  importing: 'Syncing the lyrics',
  tuning: 'Dialing in the vocal effects',
}

export interface SongAddView {
  tone: 'working' | 'ready' | 'failed'
  label: string
  /** 0–100 while a stage reports progress, else null. */
  pct: number | null
}

export function songAddView(row: KaraokeSongAddRow | undefined): SongAddView {
  if (!row) return { tone: 'working', label: 'Waiting to start', pct: null }
  if (row.status === 'added' || row.generation_status === 'ready') {
    return { tone: 'ready', label: 'In the library', pct: null }
  }
  if (row.generation_status === 'failed') {
    return { tone: 'failed', label: row.generation_error || 'Couldn’t build this one', pct: null }
  }
  const label = row.generation_status ? BUILD_STAGE_LABELS[row.generation_status] : undefined
  if (label) {
    const pct = row.generation_status !== 'queued' && typeof row.generation_progress === 'number'
      ? row.generation_progress
      : null
    return { tone: 'working', label, pct }
  }
  return { tone: 'working', label: 'Waiting to start', pct: null }
}

// A stand-in catalog row for a track that isn't in the library yet, so the
// sign-up wizard can run before the song is built. Its parts are unknown
// (roles: []), so singers skip the parts step; the host assigns parts once the
// song lands.
export function catalogRowFromSpotify(track: SpotifyTrackResult, sessionId: string): KaraokeCatalogRow {
  return {
    session_id: sessionId,
    track_id: track.trackId,
    name: track.name,
    artist: track.artist,
    art_url: track.art,
    album_name: track.album,
    duration_ms: track.durationMs,
    roles: [],
    has_vocals: null,
    genres: null,
    offensive_role_indices: null,
    spotify_data: null,
  }
}
