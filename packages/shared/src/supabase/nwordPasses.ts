import type { KaraokeClient } from './client'
import type { KaraokeGuestRow } from './tables'

export interface NwordPassGiftRow {
  id: string
  session_id: string
  giver_guest_id: string
  recipient_guest_id: string
  giver_name_snapshot: string
  created_at: string
  notified_at: string | null
  seen_at: string | null
  used_at: string | null
  used_turn_id: string | null
  used_track_id: string | null
  used_track_name: string | null
  revoked_at: string | null
  revoked_reason: string | null
}

export interface ConsumeNwordPassGiftInput {
  sessionId: string
  recipientGuestId: string
  turnId: string
  trackId: string
  trackName: string
}

/** The legacy DB flag is inverse: FALSE means the host granted a pass. */
export function guestHasNwordPass(
  guest: Pick<KaraokeGuestRow, 'white_person_check'> | null | undefined,
): boolean {
  return guest?.white_person_check === false
}

export async function listPendingNwordPassGifts(
  client: KaraokeClient,
  recipientGuestId: string,
): Promise<NwordPassGiftRow[]> {
  const { data, error } = await client
    .from('karaoke_nword_pass_gifts')
    .select('*')
    .eq('recipient_guest_id', recipientGuestId)
    .is('used_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to load N-Word Pass gifts: ${error.message}`)
  }
  return (data ?? []) as NwordPassGiftRow[]
}

export async function giftNwordPass(
  client: KaraokeClient,
  input: {
    sessionId: string
    giverGuestId: string
    recipientGuestId: string
  },
): Promise<NwordPassGiftRow> {
  const { data, error } = await client
    .from('karaoke_nword_pass_gifts')
    .insert({
      session_id: input.sessionId,
      giver_guest_id: input.giverGuestId,
      recipient_guest_id: input.recipientGuestId,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('That guest already has a one-time pass waiting.')
    }
    throw new Error(error.message || 'Failed to gift the N-Word Pass.')
  }

  const gift = data as NwordPassGiftRow
  // The gift itself is already durable. A push failure is non-fatal because
  // Realtime and the initial fetch still deliver the in-app reveal.
  void client.functions.invoke('notify-nword-pass', {
    body: { gift_id: gift.id },
  })
  return gift
}

export async function markNwordPassGiftSeen(
  client: KaraokeClient,
  giftId: string,
): Promise<void> {
  const { error } = await client
    .from('karaoke_nword_pass_gifts')
    .update({ seen_at: new Date().toISOString() })
    .eq('id', giftId)
    .is('seen_at', null)

  if (error) {
    throw new Error(`Failed to acknowledge N-Word Pass gift: ${error.message}`)
  }
}

/**
 * Atomically claims the oldest pending gift for a recipient. The guarded
 * UPDATE means a second desktop/window racing the same row receives null and
 * cannot reuse it.
 */
export async function consumeNwordPassGift(
  client: KaraokeClient,
  input: ConsumeNwordPassGiftInput,
): Promise<NwordPassGiftRow | null> {
  const pending = await client
    .from('karaoke_nword_pass_gifts')
    .select('*')
    .eq('session_id', input.sessionId)
    .eq('recipient_guest_id', input.recipientGuestId)
    .is('used_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (pending.error) {
    throw new Error(`Failed to find a pending N-Word Pass: ${pending.error.message}`)
  }
  if (!pending.data) return null

  const { data, error } = await client
    .from('karaoke_nword_pass_gifts')
    .update({
      used_at: new Date().toISOString(),
      used_turn_id: input.turnId,
      used_track_id: input.trackId,
      used_track_name: input.trackName,
    })
    .eq('id', pending.data.id)
    .is('used_at', null)
    .is('revoked_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to consume N-Word Pass: ${error.message}`)
  }
  return (data as NwordPassGiftRow | null) ?? null
}

export type NwordPassGiftChangeHandler = (
  rows: NwordPassGiftRow[],
) => void

export function subscribeToNwordPassGifts(
  client: KaraokeClient,
  recipientGuestId: string,
  onChange: NwordPassGiftChangeHandler,
): () => void {
  let cancelled = false

  const refresh = async (): Promise<void> => {
    if (cancelled) return
    try {
      const rows = await listPendingNwordPassGifts(client, recipientGuestId)
      if (!cancelled) onChange(rows)
    } catch {
      // A transient reconnect should not erase the last known gift state.
    }
  }

  void refresh()
  const channel = client
    .channel(
      `nword-pass-${recipientGuestId}-${Math.random().toString(36).slice(2)}`,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'karaoke_nword_pass_gifts',
        filter: `recipient_guest_id=eq.${recipientGuestId}`,
      },
      () => void refresh(),
    )
    .subscribe()

  return () => {
    cancelled = true
    void client.removeChannel(channel)
  }
}
