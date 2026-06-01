import type { KaraokeClient } from './client'
import type { SingerConfig } from './tables'

// ============================================================
//  AWARDS — mirrors the companion site's docs/js/supabase.js
// ============================================================
//
// Row shapes match karaoke_awards / karaoke_award_votes / karaoke_award_results
// verbatim so query results can be cast without remapping.

export type AwardSubjectType = 'performance' | 'singer' | 'group'

export interface KaraokeAwardRow {
  id: string
  session_id: string
  slug: string | null
  title: string
  description: string
  subject_type: AwardSubjectType
  icon_id: string | null
  icon_data_url: string | null
  is_default: boolean
  created_by_guest_id: string | null
  finalized_at: string | null
  created_at: string
  updated_at: string | null
}

export interface KaraokeAwardVoteRow {
  id?: string
  award_id: string
  voter_guest_id: string
  subject_guest_id: string | null
  subject_queue_row_id: string | null
  created_at?: string
  updated_at?: string
}

export interface KaraokeAwardResultRow {
  id?: string
  session_id: string
  award_id: string
  vote_count: number | null
  winner_guest_id: string | null
  winner_queue_row_id: string | null
}

// "Played" rows used by buildAwardCandidates(); narrower than KaraokeQueueRow
// since we only need a handful of columns from the played history.
export interface AwardHistoryRow {
  queueRowId: string
  trackId: string
  trackName: string
  trackArtist: string
  trackArtUrl: string | null
  singers: SingerConfig[]
  playedAt: string
}

export interface AwardGuestRow {
  id: string
  name: string
  profilePicture: string | null
}

export interface AwardsBundle {
  awards: KaraokeAwardRow[]
  history: AwardHistoryRow[]
  guests: AwardGuestRow[]
  results: KaraokeAwardResultRow[]
  votes: Record<string, KaraokeAwardVoteRow>
}

export async function loadAwards(
  client: KaraokeClient,
  sessionId: string,
  guestId: string | null,
): Promise<AwardsBundle> {
  const awP = client
    .from('karaoke_awards')
    .select('*')
    .eq('session_id', sessionId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
  // RPC over a direct SELECT so the server strips the base64 profilePicture
  // from each singer_configs entry. With photo-uploaded avatars in
  // singer_configs, the un-stripped payload reached ~24 MB on busy sessions
  // and made the Awards tab take 20+ seconds to load over cellular. The
  // Awards tab matches singers by name and pulls the live profile picture
  // from karaoke_guests separately, so profilePicture is dead weight here.
  const hP = client.rpc('karaoke_played_lean', { p_session_id: sessionId })
  const gP = client
    .from('karaoke_guests')
    .select('id,name,profile_picture')
    .eq('session_id', sessionId)
  const rP = client.from('karaoke_award_results').select('*').eq('session_id', sessionId)

  const [awR, hR, gR, rR] = await Promise.all([awP, hP, gP, rP])

  const awards = ((awR.data ?? []) as KaraokeAwardRow[]) || []
  const history: AwardHistoryRow[] = ((hR.data ?? []) as Array<{
    id: string
    track_id: string
    track_name: string
    track_artist: string
    track_art_url: string | null
    singer_configs: SingerConfig[] | null
    created_at: string
  }>).map((r) => ({
    queueRowId: r.id,
    trackId: r.track_id,
    trackName: r.track_name,
    trackArtist: r.track_artist,
    trackArtUrl: r.track_art_url,
    singers: r.singer_configs || [],
    playedAt: r.created_at,
  }))
  const guests: AwardGuestRow[] = ((gR.data ?? []) as Array<{
    id: string
    name: string
    profile_picture: string | null
  }>).map((g) => ({ id: g.id, name: g.name, profilePicture: g.profile_picture }))
  const results = ((rR.data ?? []) as KaraokeAwardResultRow[]) || []

  let votes: Record<string, KaraokeAwardVoteRow> = {}
  if (guestId && awards.length) {
    const ids = awards.map((a) => a.id)
    const v = await client
      .from('karaoke_award_votes')
      .select('*')
      .in('award_id', ids)
      .eq('voter_guest_id', guestId)
    ;(v.data ?? []).forEach((vt: KaraokeAwardVoteRow) => {
      votes[vt.award_id] = vt
    })
  }

  return { awards, history, guests, results, votes }
}

export interface CastAwardVoteInput {
  awardId: string
  guestId: string
  subjectQueueRowId?: string | null
  subjectGuestId?: string | null
}

export async function castAwardVote(
  client: KaraokeClient,
  input: CastAwardVoteInput,
): Promise<KaraokeAwardVoteRow> {
  const row: KaraokeAwardVoteRow = {
    award_id: input.awardId,
    voter_guest_id: input.guestId,
    subject_queue_row_id: input.subjectQueueRowId ?? null,
    subject_guest_id: input.subjectGuestId ?? null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await client
    .from('karaoke_award_votes')
    .upsert(row, { onConflict: 'award_id,voter_guest_id' })
  if (error) throw new Error(`Failed to cast vote: ${error.message}`)
  return row
}

export interface CreateAwardInput {
  sessionId: string
  guestId: string
  title: string
  description?: string
  subjectType: AwardSubjectType
  iconId?: string | null
  iconDataUrl?: string | null
}

export async function createCustomAward(
  client: KaraokeClient,
  input: CreateAwardInput,
): Promise<KaraokeAwardRow> {
  const row = {
    session_id: input.sessionId,
    slug: null,
    title: input.title,
    description: input.description ?? '',
    subject_type: input.subjectType,
    icon_id: input.iconId ?? null,
    icon_data_url: input.iconDataUrl ?? null,
    is_default: false,
    created_by_guest_id: input.guestId,
  }
  const { data, error } = await client
    .from('karaoke_awards')
    .insert(row)
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') {
      throw new Error('You already created an award for this session.')
    }
    throw new Error(`Failed to create award: ${error.message}`)
  }
  return data as KaraokeAwardRow
}

export interface UpdateAwardInput {
  title?: string
  description?: string
  iconId?: string | null
  iconDataUrl?: string | null
}

export async function updateMyAward(
  client: KaraokeClient,
  awardId: string,
  updates: UpdateAwardInput,
): Promise<void> {
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.title !== undefined) upd.title = updates.title
  if (updates.description !== undefined) upd.description = updates.description
  if (updates.iconId !== undefined) upd.icon_id = updates.iconId
  if (updates.iconDataUrl !== undefined) upd.icon_data_url = updates.iconDataUrl
  // Mutually exclusive: clear the other when one is set (mirrors companion site).
  if (updates.iconId) upd.icon_data_url = null
  if (updates.iconDataUrl) upd.icon_id = null
  const { error } = await client.from('karaoke_awards').update(upd).eq('id', awardId)
  if (error) throw new Error(`Failed to update award: ${error.message}`)
}

export async function deleteMyAward(
  client: KaraokeClient,
  awardId: string,
): Promise<void> {
  // Companion guests can only delete if 0 votes — same rule as docs/js/supabase.js.
  const c = await client
    .from('karaoke_award_votes')
    .select('id', { count: 'exact', head: true })
    .eq('award_id', awardId)
  if (c.count && c.count > 0) {
    throw new Error(
      "You can't delete this award — it already has votes. Ask the host to delete it instead.",
    )
  }
  const { error } = await client.from('karaoke_awards').delete().eq('id', awardId)
  if (error) throw new Error(`Failed to delete award: ${error.message}`)
}

// ============================================================
//  Candidate building & lookup helpers
// ============================================================

export interface AwardCandidate {
  key: string
  type: AwardSubjectType
  label: string
  subtitle: string
  avatar: string | null
  singers?: SingerConfig[]
  bannedNames: string[]
  bannedIds: string[]
}

export function buildAwardCandidates(
  award: Pick<KaraokeAwardRow, 'subject_type'>,
  history: AwardHistoryRow[],
  guests: AwardGuestRow[],
): AwardCandidate[] {
  // Singers reference guests by id; resolve their live name + avatar from the
  // guest bundle (history rows no longer embed base64 after the refactor).
  const guestById: Record<string, AwardGuestRow> = {}
  guests.forEach((g) => {
    guestById[g.id] = g
  })
  const nameOf = (s: SingerConfig): string =>
    (s.guestId && guestById[s.guestId] ? guestById[s.guestId].name : s.name) || 'Singer'
  const resolveSingers = (singers: SingerConfig[]): SingerConfig[] =>
    singers.map((s) => ({
      ...s,
      name: nameOf(s),
      profilePicture:
        s.guestId && guestById[s.guestId]
          ? guestById[s.guestId].profilePicture || undefined
          : s.profilePicture,
    }))

  if (award.subject_type === 'performance') {
    return history.map((p) => {
      const singers = resolveSingers(p.singers || [])
      return {
        key: p.queueRowId,
        type: 'performance' as const,
        label: p.trackName,
        subtitle: singers.length ? singers.map((s) => s.name).join(', ') : p.trackArtist,
        avatar: p.trackArtUrl,
        singers,
        bannedNames: singers.map((s) => s.name || ''),
        bannedIds: (p.singers || []).map((s) => s.guestId || '').filter(Boolean),
      }
    })
  }
  if (award.subject_type === 'group') {
    return history
      .filter((p) => (p.singers || []).length >= 2)
      .map((p) => {
        const singers = resolveSingers(p.singers || [])
        return {
          key: p.queueRowId,
          type: 'group' as const,
          label: singers.map((s) => s.name).join(' & '),
          subtitle: `${p.trackName} — ${p.trackArtist}`,
          avatar: p.trackArtUrl,
          singers,
          bannedNames: singers.map((s) => s.name || ''),
          bannedIds: (p.singers || []).map((s) => s.guestId || '').filter(Boolean),
        }
      })
  }
  // singer — collect everyone who sang by id AND by (resolved) name, then
  // surface matching guests.
  const sangNames: Record<string, true> = {}
  const sangIds: Record<string, true> = {}
  history.forEach((p) =>
    (p.singers || []).forEach((s) => {
      if (s.guestId) sangIds[s.guestId] = true
      const n = nameOf(s)
      if (n) sangNames[n] = true
    }),
  )
  const out: AwardCandidate[] = []
  guests.forEach((g) => {
    if (sangIds[g.id] || sangNames[g.name]) {
      out.push({
        key: g.id,
        type: 'singer',
        label: g.name,
        subtitle: 'Performer',
        avatar: g.profilePicture,
        bannedNames: [g.name],
        bannedIds: [g.id],
      })
    }
  })
  return out
}

export function awardCandidateBanned(
  c: AwardCandidate,
  guestId: string | null,
  guestName: string | null,
): boolean {
  if (!guestId && !guestName) return false
  if (guestId && c.bannedIds.indexOf(guestId) !== -1) return true
  if (guestName && c.bannedNames.indexOf(guestName) !== -1) return true
  return false
}

export function matchCandidateByVote(
  award: Pick<KaraokeAwardRow, 'subject_type'>,
  vote: KaraokeAwardVoteRow | null,
  candidates: AwardCandidate[],
): AwardCandidate | null {
  if (!vote) return null
  const key =
    award.subject_type === 'singer'
      ? vote.subject_guest_id
      : vote.subject_queue_row_id
  for (const c of candidates) {
    if (c.key === key) return c
  }
  return null
}

export function resolveSubjectFromCandidate(
  award: Pick<KaraokeAwardRow, 'subject_type'>,
  c: AwardCandidate,
): { guestId: string | null; queueRowId: string | null } {
  if (award.subject_type === 'singer') {
    return { guestId: c.key, queueRowId: null }
  }
  return { guestId: null, queueRowId: c.key }
}

// ============================================================
//  Realtime subscriptions
// ============================================================

export interface AwardsRevealStep {
  phase: 'opening' | 'nominees' | 'drumroll' | 'winner' | 'finale'
  awardIndex?: number
  totalAwards?: number
  award?: KaraokeAwardRow
  candidates?: Array<{
    key: string
    label: string
    avatarUrl: string | null
    singers?: SingerConfig[]
  }>
  winners?: Array<{
    label: string
    subtitle?: string | null
    avatarUrl: string | null
    singers?: SingerConfig[]
  }>
  voteCount?: number
  finaleSummary?: Array<{
    award: KaraokeAwardRow
    winners: Array<{ label: string; subtitle?: string | null }>
  }>
}

export interface AwardsSubscriptionHandlers {
  onAwardsChange: () => void
  onOwnVotesChange: () => void
  onRevealStep: (step: AwardsRevealStep | null) => void
}

// Subscribe to live awards / votes / reveal-step broadcasts for a session.
// Returns an unsubscribe function. Mirrors subAwardsRealtime() in docs/js/supabase.js.
export function subscribeToAwards(
  client: KaraokeClient,
  sessionId: string,
  handlers: AwardsSubscriptionHandlers,
): () => void {
  const suffix = Math.random().toString(36).slice(2)
  const awCh = client
    .channel(`aw-${sessionId}-${suffix}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'karaoke_awards',
        filter: `session_id=eq.${sessionId}`,
      },
      () => handlers.onAwardsChange(),
    )
    .subscribe()
  const avCh = client
    .channel(`av-${sessionId}-${suffix}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'karaoke_award_votes' },
      () => handlers.onOwnVotesChange(),
    )
    .subscribe()
  const arCh = client
    .channel(`ar-${sessionId}-${suffix}`)
    .on('broadcast', { event: 'reveal-step' }, (pl) => {
      const step =
        (pl.payload && (pl.payload as { step?: AwardsRevealStep }).step) || null
      handlers.onRevealStep(step)
    })
    .subscribe()

  return () => {
    void client.removeChannel(awCh)
    void client.removeChannel(avCh)
    void client.removeChannel(arCh)
  }
}

// Fallback SVG used when an award has no icon assigned. Same trophy glyph the
// companion site uses (state.js: AWARDS_FALLBACK_SVG).
export const AWARDS_FALLBACK_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4H6Zm-3 0V3h2v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V3h2v6a6 6 0 0 1-6 6h-1v3h3v2H8v-2h3v-3h-1a6 6 0 0 1-6-6Z"/></svg>'

export const AWARDS_ICON_PAGE_SIZE = 60

export function awardsIconCdnUrl(id: string | null | undefined): string | null {
  if (!id) return null
  const i = id.indexOf('__')
  if (i < 0) return null
  return `https://api.iconify.design/${id.slice(0, i)}/${id.slice(i + 2)}.svg`
}
