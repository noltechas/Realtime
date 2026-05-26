import type { KaraokeClient } from './client'
import type { KaraokeSessionRow } from './tables'

export interface ValidateSessionResult {
  ok: boolean
  session?: KaraokeSessionRow
  reason?: 'not_found' | 'inactive' | 'error'
  errorMessage?: string
}

// Look up a session by its 6-char code. Used by the mobile companion's Join
// screen to verify the code the user typed (or scanned) before letting them
// create a guest row.
export async function validateSession(
  client: KaraokeClient,
  code: string,
): Promise<ValidateSessionResult> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return { ok: false, reason: 'not_found' }

  const { data, error } = await client
    .from('karaoke_sessions')
    .select('*')
    .eq('code', normalized)
    .maybeSingle()

  if (error) return { ok: false, reason: 'error', errorMessage: error.message }
  if (!data) return { ok: false, reason: 'not_found' }

  const session = data as KaraokeSessionRow
  if (!session.is_active) return { ok: false, reason: 'inactive', session }

  return { ok: true, session }
}

export interface SessionStatus {
  id: string
  code: string
  name: string | null
  isActive: boolean
}

// Bulk session lookup keyed by id. The Home screen calls this to refresh the
// active/ended status of every entry in the local history list with a single
// round-trip. Missing rows (deleted on the host) simply don't appear in the
// map — callers should treat absence as "session no longer exists".
export async function getSessionsByIds(
  client: KaraokeClient,
  ids: string[],
): Promise<Map<string, SessionStatus>> {
  const out = new Map<string, SessionStatus>()
  if (ids.length === 0) return out

  const { data, error } = await client
    .from('karaoke_sessions')
    .select('id, code, name, is_active')
    .in('id', ids)

  if (error || !data) return out

  for (const row of data as Array<{
    id: string
    code: string
    name: string | null
    is_active: boolean
  }>) {
    out.set(row.id, {
      id: row.id,
      code: row.code,
      name: row.name,
      isActive: row.is_active,
    })
  }
  return out
}

// Parse a session code out of a companion URL like
// `https://noltechas.github.io/Realtime/?session=ABC123`. Returns null if no
// `session` query param is present. Tolerates plain codes scanned via QR
// formats that aren't URLs.
export function parseSessionCodeFromUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    const fromQuery = url.searchParams.get('session')
    if (fromQuery) return fromQuery.toUpperCase()
  } catch {
    // Not a URL — fall through to treat input as a bare code.
  }

  const match = trimmed.match(/^[A-Z0-9]{4,8}$/i)
  return match ? trimmed.toUpperCase() : null
}
