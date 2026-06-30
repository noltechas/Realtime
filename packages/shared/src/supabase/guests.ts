import type { KaraokeClient } from './client'
import type { KaraokeGuestRow } from './tables'

export interface CreateGuestInput {
  sessionId: string
  name: string
  defaultColor?: string
  profilePicture?: string
}

export async function createGuest(
  client: KaraokeClient,
  { sessionId, name, defaultColor, profilePicture }: CreateGuestInput,
): Promise<KaraokeGuestRow> {
  const { data, error } = await client
    .from('karaoke_guests')
    .insert({
      session_id: sessionId,
      name: name.trim(),
      default_color: defaultColor ?? null,
      profile_picture: profilePicture ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create guest: ${error.message}`)
  return data as KaraokeGuestRow
}

export interface UpdateGuestInput {
  name?: string
  defaultColor?: string | null
  profilePicture?: string | null
}

export async function updateGuest(
  client: KaraokeClient,
  guestId: string,
  updates: UpdateGuestInput,
): Promise<KaraokeGuestRow | null> {
  const row: Record<string, unknown> = {}
  if (updates.name !== undefined) row.name = updates.name.trim()
  if ('defaultColor' in updates) row.default_color = updates.defaultColor ?? null
  if ('profilePicture' in updates) row.profile_picture = updates.profilePicture ?? null

  const { data, error } = await client
    .from('karaoke_guests')
    .update(row)
    .eq('id', guestId)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(`Failed to update guest: ${error.message}`)
  return (data as KaraokeGuestRow) ?? null
}

// Finds an existing guest row in this session that almost certainly belongs to
// the SAME person, so a rejoin can reuse it instead of inserting a ghost
// duplicate the host then sees twice in the singer picker. We match on name +
// avatar and ONLY when an avatar is set: two avatar-less guests sharing a name
// may genuinely be different people, so we never merge those. Returns the most
// recent match, or null (callers fall back to createGuest). Avatar comparison
// is done client-side rather than via `.eq()` because avatars can be large
// data URLs that would blow past query-string length limits.
export async function findReusableGuest(
  client: KaraokeClient,
  sessionId: string,
  name: string,
  profilePicture: string | null | undefined,
): Promise<KaraokeGuestRow | null> {
  if (!profilePicture) return null
  const { data, error } = await client
    .from('karaoke_guests')
    .select('*')
    .eq('session_id', sessionId)
    .eq('name', name.trim())
    .order('created_at', { ascending: false })

  if (error || !data) return null
  const match = (data as KaraokeGuestRow[]).find(
    (g) => (g.profile_picture || '') === profilePicture,
  )
  return match ?? null
}

export async function getGuest(
  client: KaraokeClient,
  guestId: string,
): Promise<KaraokeGuestRow | null> {
  const { data, error } = await client
    .from('karaoke_guests')
    .select('*')
    .eq('id', guestId)
    .maybeSingle()

  if (error) return null
  return (data as KaraokeGuestRow) ?? null
}

export async function listGuests(
  client: KaraokeClient,
  sessionId: string,
): Promise<KaraokeGuestRow[]> {
  const { data, error } = await client
    .from('karaoke_guests')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to list guests: ${error.message}`)
  return (data ?? []) as KaraokeGuestRow[]
}

export type GuestChangeHandler = (rows: KaraokeGuestRow[]) => void

export function subscribeToGuests(
  client: KaraokeClient,
  sessionId: string,
  onChange: GuestChangeHandler,
): () => void {
  let cancelled = false

  const refresh = async () => {
    if (cancelled) return
    try {
      const rows = await listGuests(client, sessionId)
      if (!cancelled) onChange(rows)
    } catch {
      // Treat transient errors as no-ops; the subscription will retry on the
      // next change event.
    }
  }

  void refresh()

  // Unique suffix per subscription — see queue.ts subscribeToQueue for the
  // detailed reasoning. Same Supabase channel-name collision problem.
  const channelName = `cg-${sessionId}-${Math.random().toString(36).slice(2)}`
  const channel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'karaoke_guests',
        filter: `session_id=eq.${sessionId}`,
      },
      () => void refresh(),
    )
    .subscribe()

  return () => {
    cancelled = true
    void client.removeChannel(channel)
  }
}
