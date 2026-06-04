import type { KaraokeClient } from './client'

// Song requests — a guest who can't find a track in the catalog asks the host
// to add it. The companion website (docs/js/supabase.js) already implements
// this; the mobile app and any future client share the data shape + DB write
// here so every client produces identical `karaoke_song_requests` rows that
// the desktop Admin page surfaces in realtime.
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

// Insert a pending row into `karaoke_song_requests`. The desktop Admin page
// subscribes to this table and surfaces each request with "Add to library" /
// "Dismiss" actions. A partial unique index on (session_id, track_id) WHERE
// status='pending' makes a second pending request for the same track raise
// Postgres 23505 — reported here as 'duplicate' so the UI can say "already
// requested" rather than surfacing a raw error.
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
