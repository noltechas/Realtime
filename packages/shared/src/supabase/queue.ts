import type { KaraokeClient } from './client'
import type { KaraokeQueueRow, SingerConfig } from './tables'

// Companion-site ordering: locked items pin to the top, then highest combined
// score+bonus, then oldest-created (FIFO tie-breaker). Mirrors the sort used in
// docs/index.html so the mobile queue matches what guests see in the browser.
export function sortQueue(rows: KaraokeQueueRow[]): KaraokeQueueRow[] {
  return [...rows].sort((a, b) => {
    if (a.locked !== b.locked) return a.locked ? -1 : 1
    const totalA = (a.score ?? 0) + (a.bonus_points ?? 0)
    const totalB = (b.score ?? 0) + (b.bonus_points ?? 0)
    if (totalA !== totalB) return totalB - totalA
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

export interface AddQueueItemInput {
  sessionId: string
  trackId: string
  trackName: string
  trackArtist: string
  trackArtUrl?: string | null
  trackDurationMs?: number | null
  singerConfigs: SingerConfig[]
  addedByGuestId?: string | null
  addedByName?: string | null
  stageTheme?: string | null
  isHidden?: boolean
}

// Insert a row into karaoke_queue. Mirrors the companion site's logic: fetch
// the current max position and append at maxPos+1 so the host's local ordering
// stays consistent.
//
// Note: we don't chain a `.select()` after the insert. RLS on this table can
// allow INSERT while blocking SELECT for guests; chaining the returning-select
// turns a successful write into a silent failure. The realtime subscription
// picks up the new row anyway.
export async function addQueueItem(
  client: KaraokeClient,
  input: AddQueueItemInput,
): Promise<void> {
  const maxRow = await client
    .from('karaoke_queue')
    .select('position')
    .eq('session_id', input.sessionId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextPosition = ((maxRow.data?.position as number | undefined) ?? -1) + 1

  const row: Record<string, unknown> = {
    session_id: input.sessionId,
    track_id: input.trackId,
    track_name: input.trackName,
    track_artist: input.trackArtist,
    track_art_url: input.trackArtUrl ?? null,
    track_duration_ms: input.trackDurationMs ?? null,
    singer_configs: input.singerConfigs,
    added_by_guest_id: input.addedByGuestId ?? null,
    added_by_name: input.addedByName ?? null,
    source: 'remote',
    position: nextPosition,
    status: 'queued',
  }
  if (input.stageTheme) row.stage_theme = input.stageTheme
  if (input.isHidden) row.is_hidden = true

  const { error } = await client.from('karaoke_queue').insert(row)
  if (error) throw new Error(`Failed to add song: ${error.message}`)
}

export async function listQueue(
  client: KaraokeClient,
  sessionId: string,
): Promise<KaraokeQueueRow[]> {
  const { data, error } = await client
    .from('karaoke_queue')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'queued')

  if (error) throw new Error(`Failed to list queue: ${error.message}`)
  return sortQueue((data ?? []) as KaraokeQueueRow[])
}

export interface UpdateQueueItemInput {
  queueRowId: string
  singerConfigs: SingerConfig[]
  stageTheme?: string | null
  isHidden?: boolean
}

// UPDATE an existing karaoke_queue row's singer/theme/hidden fields. Used by
// the "edit your queued song" flow on both mobile and the companion site —
// the guest who added the song can revise singer assignments, change the
// stage theme, or toggle the surprise/hidden flag without removing and re-
// adding the row (which would forfeit its current position and votes).
// Score / locked / position are deliberately untouched.
export async function updateQueueItem(
  client: KaraokeClient,
  input: UpdateQueueItemInput,
): Promise<void> {
  const row: Record<string, unknown> = {
    singer_configs: input.singerConfigs,
  }
  if (input.stageTheme !== undefined) row.stage_theme = input.stageTheme
  if (input.isHidden !== undefined) row.is_hidden = input.isHidden
  const { error } = await client
    .from('karaoke_queue')
    .update(row)
    .eq('id', input.queueRowId)
  if (error) throw new Error(`Failed to update song: ${error.message}`)
}

export interface CastVoteInput {
  queueRowId: string
  guestId: string
  value: 1 | -1
}

// Insert a row into karaoke_votes. The companion site treats a UNIQUE-violation
// (Postgres code 23505) as a no-op success — the guest has already voted on
// this row and the optimistic local state is correct. Any other error is
// surfaced so the caller can roll back its optimistic state.
export async function castVote(
  client: KaraokeClient,
  input: CastVoteInput,
): Promise<void> {
  const { error } = await client.from('karaoke_votes').insert({
    queue_row_id: input.queueRowId,
    guest_id: input.guestId,
    value: input.value,
  })
  if (error && error.code !== '23505') {
    throw new Error(`Failed to cast vote: ${error.message}`)
  }
}

export type QueueChangeHandler = (rows: KaraokeQueueRow[]) => void

// Subscribe to live queue changes for a session. The handler receives the
// full, freshly-sorted queue on every change (simpler than diffing inserts /
// updates / deletes on the consumer side). Returns an unsubscribe function.
export function subscribeToQueue(
  client: KaraokeClient,
  sessionId: string,
  onChange: QueueChangeHandler,
): () => void {
  let cancelled = false

  const refresh = async () => {
    if (cancelled) return
    try {
      const rows = await listQueue(client, sessionId)
      if (!cancelled) onChange(rows)
    } catch {
      // Caller can detect staleness via timestamps; we don't want to crash the
      // subscription on a transient network blip.
    }
  }

  void refresh()

  // Append a random suffix so each subscription instance gets its own channel.
  // Without this, calling client.channel('cq-<sessionId>') twice (e.g. when
  // Strict Mode double-invokes a useEffect, or when a previous cleanup hasn't
  // finished removing the channel) returns the SAME instance — and binding a
  // second `.on()` to an already-`.subscribe()`d channel crashes with
  // "cannot add postgres_changes callbacks ... after subscribe()".
  const channelName = `cq-${sessionId}-${Math.random().toString(36).slice(2)}`
  const channel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'karaoke_queue',
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
