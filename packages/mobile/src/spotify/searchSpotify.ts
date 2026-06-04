import { normalizeSpotifyTrack, type SpotifyTrackResult } from '@karaoke/shared'

// Search Spotify for tracks the guest can ask the host to add. Requires a fresh
// access token (see `spotifyTokenIfFresh`) — the host's desktop app publishes
// its token onto the session row and guests reuse it. Returns [] for an empty
// query or missing token so callers can invoke it unconditionally on keystroke.
//
// Lives in the mobile package (not @karaoke/shared) because the shared package
// targets `lib: ["ES2020"]` where `fetch` isn't typed. The result shape comes
// from shared so it stays interchangeable with the website's request rows.
export async function searchSpotify(
  token: string | null,
  query: string,
): Promise<SpotifyTrackResult[]> {
  const q = query.trim()
  if (!q || !token) return []

  const res = await fetch(
    'https://api.spotify.com/v1/search?type=track&limit=20&q=' +
      encodeURIComponent(q),
    { headers: { Authorization: 'Bearer ' + token } },
  )
  if (!res.ok) throw new Error('Spotify ' + res.status)

  const json = (await res.json()) as { tracks?: { items?: unknown[] } }
  const items = json?.tracks?.items ?? []
  return items.map(normalizeSpotifyTrack)
}
