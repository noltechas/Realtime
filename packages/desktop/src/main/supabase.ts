import { createClient, RealtimeChannel } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hnnbxwitjkeijvoldfuv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubmJ4d2l0amtlaWp2b2xkZnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjcwMTQsImV4cCI6MjA5MDUwMzAxNH0.ENzZ2VLxszHr9StjFds06In7CyGkiyPvu6Jh1LUMMvA'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(length = 6): string {
    let code = ''
    for (let i = 0; i < length; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    }
    return code
}

export interface SessionInfo {
    sessionId: string
    sessionCode: string
    sessionName: string | null
}

export async function createSession(name: string, themeName: string): Promise<SessionInfo> {
    const code = generateCode()
    const { data, error } = await supabase
        .from('karaoke_sessions')
        .insert({ code, is_active: true, name: name || null, theme_name: themeName || 'neo-brutal' })
        .select('id, code, name')
        .single()

    if (error) throw new Error(`Failed to create session: ${error.message}`)

    return {
        sessionId: data.id,
        sessionCode: data.code,
        sessionName: data.name
    }
}

const GIPHY_API_KEY = import.meta.env.MAIN_VITE_GIPHY_API_KEY || ''

interface TrendingGif {
    id: string
    title: string
    preview: string
    url: string
}

export async function fetchAndStoreTrendingGifs(sessionId: string): Promise<void> {
    try {
        const response = await fetch(
            `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=100&rating=pg`
        )
        if (!response.ok) throw new Error(`Giphy API error: ${response.status}`)
        const data = await response.json()

        const gifs: TrendingGif[] = (data.data || [])
            .map((g: any) => ({
                id: g.id,
                title: g.title || '',
                preview: g.images?.fixed_width_small?.url || '',
                url: g.images?.fixed_width?.url || ''
            }))
            .filter((g: TrendingGif) => g.preview && g.url)

        await supabase
            .from('karaoke_sessions')
            .update({ trending_gifs: gifs })
            .eq('id', sessionId)
    } catch (e) {
        console.error('Failed to fetch trending GIFs:', e)
    }
}

export interface RecentSession {
    id: string
    code: string
    name: string | null
    themeName: string | null
    createdAt: string
    guestCount: number
}

export async function listRecentSessions(): Promise<RecentSession[]> {
    const { data, error } = await supabase
        .from('karaoke_sessions')
        .select('id, code, name, theme_name, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Failed to list sessions:', error.message)
        return []
    }

    const sessions = await Promise.all((data || []).map(async (s: any) => {
        const { count } = await supabase
            .from('karaoke_guests')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id)
        return {
            id: s.id,
            code: s.code,
            name: s.name,
            themeName: s.theme_name,
            createdAt: s.created_at,
            guestCount: count || 0,
        }
    }))
    return sessions
}

export async function getSession(sessionId: string): Promise<SessionInfo & { themeName: string | null }> {
    const { data, error } = await supabase
        .from('karaoke_sessions')
        .select('id, code, name, theme_name, is_active')
        .eq('id', sessionId)
        .single()

    if (error || !data) throw new Error('Session not found')
    if (!data.is_active) throw new Error('Session is no longer active')

    return {
        sessionId: data.id,
        sessionCode: data.code,
        sessionName: data.name,
        themeName: data.theme_name
    }
}

export interface CatalogItem {
    trackId: string
    name: string
    artist: string
    artUrl: string
    albumName: string
    durationMs: number
    roles?: string[]
    hasVocals: boolean
    spotifyData?: any
    offensiveRoleIndices?: number[]
    genres?: string[]
}

export async function pushCatalog(sessionId: string, songs: CatalogItem[]): Promise<void> {
    const CHUNK = 100
    for (let i = 0; i < songs.length; i += CHUNK) {
        const chunk = songs.slice(i, i + CHUNK).map(s => ({
            session_id: sessionId,
            track_id: s.trackId,
            name: s.name,
            artist: s.artist,
            art_url: s.artUrl,
            album_name: s.albumName,
            duration_ms: s.durationMs,
            roles: s.roles || [],
            has_vocals: s.hasVocals,
            spotify_data: s.spotifyData || null,
            offensive_role_indices: s.offensiveRoleIndices || [],
            genres: s.genres || []
        }))
        const { error } = await supabase
            .from('karaoke_catalog')
            .upsert(chunk, { onConflict: 'session_id,track_id' })
        if (error) console.error('Failed to push catalog chunk:', error.message)
    }
}

export interface QueueCallbacks {
    onInsert: (row: any) => void
    onDelete: (row: any) => void
    onUpdate: (row: any) => void
}

let queueChannel: RealtimeChannel | null = null
let sessionChannel: RealtimeChannel | null = null

export function subscribeToQueue(sessionId: string, callbacks: QueueCallbacks): void {
    if (queueChannel) {
        supabase.removeChannel(queueChannel)
    }

    queueChannel = supabase
        .channel(`queue-${sessionId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'karaoke_queue', filter: `session_id=eq.${sessionId}` },
            (payload) => callbacks.onInsert(payload.new)
        )
        .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'karaoke_queue', filter: `session_id=eq.${sessionId}` },
            (payload) => callbacks.onDelete(payload.old)
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'karaoke_queue', filter: `session_id=eq.${sessionId}` },
            (payload) => callbacks.onUpdate(payload.new)
        )
        .subscribe()
}

// Last queue-turn we fired a "you're up" push for, per session. Keyed by the
// queue item's own client-generated id (QueueItem.id in AppContext.tsx) —
// NOT trackId, so the same song queued twice in a row still notifies twice.
// The renderer's now-playing sync effect legitimately calls updateNowPlaying
// TWICE for one turn (once when nowPlaying.id changes, again moments later
// once remoteQueueId lands — see the comment above that effect in
// useKaraokeSession.ts); both calls carry the same turnId, so this map is
// what collapses them back into a single push instead of a duplicate.
const lastNotifiedTurnIdBySession = new Map<string, string>()

export async function updateNowPlaying(sessionId: string, info: {
    trackId: string; name: string; artist: string; artUrl: string | null;
    singerConfigs?: any[];
    stageTheme?: string | null;
    turnId?: string;
} | null): Promise<void> {
    const { error } = await supabase
        .from('karaoke_sessions')
        .update({
            now_playing_track_id: info?.trackId || null,
            now_playing_name: info?.name || null,
            now_playing_artist: info?.artist || null,
            now_playing_art_url: info?.artUrl || null,
            is_playing: false,
            now_playing_singer_configs: info?.singerConfigs ?? null,
            now_playing_stage_theme: info?.stageTheme ?? null,
            updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
    if (error) {
        console.error('Failed to update now playing:', error.message)
        return
    }
    // Fire push notifications to singers who have the app closed. Fire-and-forget.
    // Deduped by turnId (see lastNotifiedTurnIdBySession above) — the renderer
    // calls updateNowPlaying twice for the same turn, and without this guard
    // that means two Expo push messages (two banners) for one "you're up".
    if (info?.singerConfigs?.length) {
        const alreadyNotified = info.turnId !== undefined
            && lastNotifiedTurnIdBySession.get(sessionId) === info.turnId
        if (!alreadyNotified) {
            if (info.turnId !== undefined) lastNotifiedTurnIdBySession.set(sessionId, info.turnId)
            supabase.functions.invoke('notify-singer', {
                body: {
                    session_id: sessionId,
                    singer_configs: info.singerConfigs,
                    track_name: info.name,
                    track_artist: info.artist,
                },
            }).catch((err: unknown) => console.error('Push notify failed:', err))
        }
    } else {
        lastNotifiedTurnIdBySession.delete(sessionId)
    }
}

export async function updateIsPlaying(sessionId: string, isPlaying: boolean): Promise<void> {
    const { error } = await supabase
        .from('karaoke_sessions')
        .update({ is_playing: isPlaying, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
    if (error) console.error('Failed to update is_playing:', error.message)
}

export async function insertQueueItem(sessionId: string, item: {
    trackId: string
    trackName: string
    trackArtist: string
    trackArtUrl: string | null
    trackDurationMs: number
    singerConfigs: any[]
    addedByName?: string | null
    source: 'local' | 'remote'
    stageTheme?: string | null
    isHidden?: boolean
}): Promise<{ id: string }> {
    // Get next position
    const { data: maxRow } = await supabase
        .from('karaoke_queue')
        .select('position')
        .eq('session_id', sessionId)
        .order('position', { ascending: false })
        .limit(1)
        .single()

    const nextPosition = (maxRow?.position ?? -1) + 1

    const { data, error } = await supabase
        .from('karaoke_queue')
        .insert({
            session_id: sessionId,
            track_id: item.trackId,
            track_name: item.trackName,
            track_artist: item.trackArtist,
            track_art_url: item.trackArtUrl,
            track_duration_ms: item.trackDurationMs,
            singer_configs: item.singerConfigs,
            added_by_name: item.addedByName || null,
            source: item.source,
            stage_theme: item.stageTheme || null,
            is_hidden: !!item.isHidden,
            position: nextPosition,
            status: 'queued'
        })
        .select('id')
        .single()

    if (error) throw new Error(`Failed to insert queue item: ${error.message}`)
    return { id: data.id }
}

export async function removeQueueItem(queueRowId: string): Promise<void> {
    const { error } = await supabase
        .from('karaoke_queue')
        .delete()
        .eq('id', queueRowId)
    if (error) console.error('Failed to remove queue item:', error.message)
}

export async function reorderQueue(sessionId: string, orderedIds: string[]): Promise<void> {
    // Drag-reorder is the host's manual override of vote-based ordering.
    // Write descending `score` values with large gaps so subsequent ±1 votes
    // don't shuffle the host's intent. `position` is kept in sync for
    // backwards compatibility with anything that still reads it.
    const STEP = 1000
    for (let i = 0; i < orderedIds.length; i++) {
        const score = (orderedIds.length - i) * STEP
        await supabase
            .from('karaoke_queue')
            .update({ position: i, score, bonus_points: 0, locked: i === 0 })
            .eq('id', orderedIds[i])
    }
}

export async function bumpBonusPointsForRemaining(sessionId: string): Promise<void> {
    const { data: rows, error: readErr } = await supabase
        .from('karaoke_queue')
        .select('id, bonus_points')
        .eq('session_id', sessionId)
        .eq('status', 'queued')
    if (readErr) {
        console.error('Failed to read queued items for bonus bump:', readErr.message)
        return
    }
    await Promise.all((rows || []).map((r: any) =>
        supabase
            .from('karaoke_queue')
            .update({ bonus_points: (r.bonus_points ?? 0) + 1 })
            .eq('id', r.id)
    ))
}

// Host-driven score override. Reads the current bonus_points and bumps it by
// `delta` so the host can hand-tune a queue item's standing (e.g. promote a
// crowd-favorite that hasn't been voted up enough, or sink a song that got
// brigaded). We adjust `bonus_points` rather than `score` because `score` is
// reserved for (host drag-reorder STEP values) + (vote sum from the DB
// trigger) — touching it would race with the trigger.
export async function adjustQueueBonusPoints(queueRowId: string, delta: number): Promise<void> {
    const { data, error: readErr } = await supabase
        .from('karaoke_queue')
        .select('bonus_points')
        .eq('id', queueRowId)
        .single()
    if (readErr) {
        console.error('Failed to read bonus_points for adjust:', readErr.message)
        return
    }
    const next = ((data?.bonus_points as number | undefined) ?? 0) + delta
    const { error } = await supabase
        .from('karaoke_queue')
        .update({ bonus_points: next })
        .eq('id', queueRowId)
    if (error) console.error('Failed to adjust queue bonus_points:', error.message)
}

// Clear the next-up lock from every still-queued row in a session. Lobby Mode
// has no next-up song — every queued song stays in open vote competition — so
// entering it drops any pin the companion / mobile queues are still showing.
export async function unlockQueuedItems(sessionId: string): Promise<void> {
    const { error } = await supabase
        .from('karaoke_queue')
        .update({ locked: false })
        .eq('session_id', sessionId)
        .eq('status', 'queued')
        .eq('locked', true)
    if (error) console.error('Failed to unlock queued items:', error.message)
}

export async function lockQueueItem(queueRowId: string): Promise<void> {
    const { error } = await supabase
        .from('karaoke_queue')
        .update({ locked: true })
        .eq('id', queueRowId)
    if (error) console.error('Failed to lock queue item:', error.message)
}

export interface Guest {
    id: string
    sessionId: string
    name: string
    profilePicture: string | null
    whitePersonCheck: boolean
}

export async function listGuests(sessionId: string): Promise<Guest[]> {
    const { data, error } = await supabase
        .from('karaoke_guests')
        .select('id, session_id, name, profile_picture, white_person_check')
        .eq('session_id', sessionId)
    if (error) {
        console.error('Failed to list guests:', error.message)
        return []
    }
    return (data || []).map((r: any) => ({
        id: r.id,
        sessionId: r.session_id,
        name: r.name,
        profilePicture: r.profile_picture,
        whitePersonCheck: r.white_person_check !== false
    }))
}

export async function updateGuest(id: string, fields: { name?: string; profilePicture?: string | null; whitePersonCheck?: boolean }): Promise<void> {
    const update: any = {}
    if (fields.name !== undefined) update.name = fields.name
    if (fields.profilePicture !== undefined) update.profile_picture = fields.profilePicture
    if (fields.whitePersonCheck !== undefined) update.white_person_check = fields.whitePersonCheck
    const { error } = await supabase
        .from('karaoke_guests')
        .update(update)
        .eq('id', id)
    if (error) console.error('Failed to update guest:', error.message)
}

export async function removeGuest(id: string): Promise<void> {
    const { error } = await supabase
        .from('karaoke_guests')
        .delete()
        .eq('id', id)
    if (error) console.error('Failed to remove guest:', error.message)
}

export async function closeSession(sessionId: string): Promise<void> {
    if (queueChannel) {
        supabase.removeChannel(queueChannel)
        queueChannel = null
    }
    if (sessionChannel) {
        supabase.removeChannel(sessionChannel)
        sessionChannel = null
    }

    await supabase
        .from('karaoke_sessions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', sessionId)

    lastNotifiedTurnIdBySession.delete(sessionId)
}

export async function deleteSession(sessionId: string): Promise<void> {
    // Delete dependents first (queue, guests, catalog), then session.
    // karaoke_award_results retains a denormalized snapshot — it does NOT
    // cascade-delete with the session so the audit trail survives. Award
    // and award-vote rows reference guests/queue which DO get deleted, so
    // we clear them explicitly here to avoid dangling FKs on those tables.
    const { data: sessionAwards } = await supabase
        .from('karaoke_awards')
        .select('id')
        .eq('session_id', sessionId)
    const awardIds = (sessionAwards || []).map((a: any) => a.id)
    if (awardIds.length) {
        await supabase.from('karaoke_award_votes').delete().in('award_id', awardIds)
    }
    await supabase.from('karaoke_awards').delete().eq('session_id', sessionId)
    await supabase.from('karaoke_queue').delete().eq('session_id', sessionId)
    await supabase.from('karaoke_guests').delete().eq('session_id', sessionId)
    await supabase.from('karaoke_catalog').delete().eq('session_id', sessionId)
    const { error } = await supabase.from('karaoke_sessions').delete().eq('id', sessionId)
    if (error) console.error('Failed to delete session:', error.message)

    lastNotifiedTurnIdBySession.delete(sessionId)
}

// ============================================================================
// Awards
// ============================================================================

export interface AwardRow {
    id: string
    sessionId: string
    slug: string | null
    title: string
    description: string
    subjectType: 'performance' | 'singer' | 'group'
    iconId: string | null
    iconDataUrl: string | null
    isDefault: boolean
    createdByGuestId: string | null
    finalizedAt: string | null
    createdAt: string
    updatedAt: string
    scoreAdjustments: Record<string, number>
}

export interface AwardVoteRow {
    id: string
    awardId: string
    voterGuestId: string
    subjectQueueRowId: string | null
    subjectGuestId: string | null
    rank: number
    createdAt: string
    updatedAt: string
}

function mapAward(r: any): AwardRow {
    return {
        id: r.id,
        sessionId: r.session_id,
        slug: r.slug,
        title: r.title,
        description: r.description ?? '',
        subjectType: r.subject_type,
        iconId: r.icon_id,
        iconDataUrl: r.icon_data_url,
        isDefault: !!r.is_default,
        createdByGuestId: r.created_by_guest_id,
        finalizedAt: r.finalized_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        scoreAdjustments: (r.score_adjustments && typeof r.score_adjustments === 'object') ? r.score_adjustments : {}
    }
}

function mapVote(r: any): AwardVoteRow {
    return {
        id: r.id,
        awardId: r.award_id,
        voterGuestId: r.voter_guest_id,
        subjectQueueRowId: r.subject_queue_row_id,
        subjectGuestId: r.subject_guest_id,
        rank: r.rank ?? 1,
        createdAt: r.created_at,
        updatedAt: r.updated_at
    }
}

// Curated Oscar-style descriptions for the three default categories. These
// must stay in sync with the SQL migration `add_description_to_karaoke_awards`
// — same strings, single source of truth here for client-side seeding.
export const DEFAULT_AWARD_DESCRIPTION_BEST_PERFORMANCE =
    'Awarded to the performance that brought the house to its feet. The one moment everyone will still be talking about on the drive home.'
export const DEFAULT_AWARD_DESCRIPTION_SINGER_OF_THE_NIGHT =
    'Awarded to the voice that owned the room tonight, with the pitch, the presence, and a stage they refused to share.'
export const DEFAULT_AWARD_DESCRIPTION_BEST_DUO_GROUP =
    'Awarded to the duo or group who sang as one, with every harmony locked, every cue caught, and every glance a rehearsal we missed.'

// Stable seed list (must match DEFAULT_AWARD_ICONS keys in icons/manifest.ts).
const DEFAULT_AWARD_SEEDS: Array<{
    slug: string
    title: string
    description: string
    subject_type: 'performance' | 'singer' | 'group'
    icon_id: string
}> = [
    { slug: 'best-performance', title: 'Best Performance', description: DEFAULT_AWARD_DESCRIPTION_BEST_PERFORMANCE, subject_type: 'performance', icon_id: 'game-icons__trophy-cup' },
    { slug: 'singer-of-the-night', title: 'Singer of the Night', description: DEFAULT_AWARD_DESCRIPTION_SINGER_OF_THE_NIGHT, subject_type: 'singer', icon_id: 'game-icons__microphone' },
    { slug: 'best-duo-group', title: 'Best Duo / Group', description: DEFAULT_AWARD_DESCRIPTION_BEST_DUO_GROUP, subject_type: 'group', icon_id: 'game-icons__high-five' }
]

export async function ensureDefaultAwards(sessionId: string): Promise<void> {
    // Idempotent — relies on uniq_karaoke_award_default_slug index.
    const { data: existing } = await supabase
        .from('karaoke_awards')
        .select('slug')
        .eq('session_id', sessionId)
        .eq('is_default', true)
    const have = new Set((existing || []).map((r: any) => r.slug))
    const toInsert = DEFAULT_AWARD_SEEDS.filter(s => !have.has(s.slug)).map(s => ({
        session_id: sessionId,
        slug: s.slug,
        title: s.title,
        description: s.description,
        subject_type: s.subject_type,
        icon_id: s.icon_id,
        is_default: true
    }))
    if (toInsert.length === 0) return
    const { error } = await supabase.from('karaoke_awards').insert(toInsert)
    if (error) console.error('Failed to seed default awards:', error.message)
}

export async function listAwards(sessionId: string): Promise<AwardRow[]> {
    const { data, error } = await supabase
        .from('karaoke_awards')
        .select('*')
        .eq('session_id', sessionId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })
    if (error) {
        console.error('Failed to list awards:', error.message)
        return []
    }
    return (data || []).map(mapAward)
}

export async function listAwardVotes(sessionId: string): Promise<AwardVoteRow[]> {
    // Fetch all votes for a session by joining through awards.
    const { data: awards } = await supabase
        .from('karaoke_awards')
        .select('id')
        .eq('session_id', sessionId)
    const ids = (awards || []).map((a: any) => a.id)
    if (ids.length === 0) return []
    const { data, error } = await supabase
        .from('karaoke_award_votes')
        .select('*')
        .in('award_id', ids)
    if (error) {
        console.error('Failed to list award votes:', error.message)
        return []
    }
    return (data || []).map(mapVote)
}

export interface CreateCustomAwardInput {
    sessionId: string
    title: string
    description: string
    subjectType: 'performance' | 'singer' | 'group'
    iconId: string | null
    iconDataUrl: string | null
    createdByGuestId: string
}

export async function createCustomAward(input: CreateCustomAwardInput): Promise<{ id?: string; error?: string }> {
    const row: any = {
        session_id: input.sessionId,
        slug: null,
        title: input.title,
        description: input.description,
        subject_type: input.subjectType,
        icon_id: input.iconId,
        icon_data_url: input.iconDataUrl,
        is_default: false,
        created_by_guest_id: input.createdByGuestId
    }
    const { data, error } = await supabase
        .from('karaoke_awards')
        .insert(row)
        .select('id')
        .single()
    if (error) return { error: error.message }
    return { id: data.id }
}

export async function updateAward(awardId: string, fields: { title?: string; description?: string; iconId?: string | null; iconDataUrl?: string | null }): Promise<{ error?: string }> {
    const upd: any = { updated_at: new Date().toISOString() }
    if (fields.title !== undefined) upd.title = fields.title
    if (fields.description !== undefined) upd.description = fields.description
    if (fields.iconId !== undefined) upd.icon_id = fields.iconId
    if (fields.iconDataUrl !== undefined) upd.icon_data_url = fields.iconDataUrl
    const { error } = await supabase.from('karaoke_awards').update(upd).eq('id', awardId)
    return error ? { error: error.message } : {}
}

export async function deleteAward(awardId: string): Promise<{ error?: string }> {
    // Delete any votes first (FK is non-cascading).
    await supabase.from('karaoke_award_votes').delete().eq('award_id', awardId)
    const { error } = await supabase.from('karaoke_awards').delete().eq('id', awardId)
    return error ? { error: error.message } : {}
}

export interface CastVoteInput {
    awardId: string
    voterGuestId: string
    subjectQueueRowId: string | null
    subjectGuestId: string | null
}

export async function castAwardVote(input: CastVoteInput): Promise<{ error?: string }> {
    // Upsert on (award_id, voter_guest_id, rank) unique constraint. The host
    // path casts a single first-place pick (rank 1, 3 pts).
    const row: any = {
        award_id: input.awardId,
        voter_guest_id: input.voterGuestId,
        subject_queue_row_id: input.subjectQueueRowId,
        subject_guest_id: input.subjectGuestId,
        rank: 1,
        updated_at: new Date().toISOString()
    }
    const { error } = await supabase
        .from('karaoke_award_votes')
        .upsert(row, { onConflict: 'award_id,voter_guest_id,rank' })
    return error ? { error: error.message } : {}
}

// Persist the admin's manual per-candidate score adjustments for an award.
// `adjustments` is keyed by candidate subjectKey -> integer point delta.
export async function setAwardAdjustments(awardId: string, adjustments: Record<string, number>): Promise<{ error?: string }> {
    const { error } = await supabase
        .from('karaoke_awards')
        .update({ score_adjustments: adjustments, updated_at: new Date().toISOString() })
        .eq('id', awardId)
    return error ? { error: error.message } : {}
}

export async function clearAwardVote(awardId: string, voterGuestId: string): Promise<void> {
    const { error } = await supabase
        .from('karaoke_award_votes')
        .delete()
        .eq('award_id', awardId)
        .eq('voter_guest_id', voterGuestId)
    if (error) console.error('Failed to clear vote:', error.message)
}

export interface PersistedAwardResult {
    awardId: string
    sessionId: string
    sessionCode: string
    rank: number
    winnerLabel: string
    winnerSubtitle: string | null
    winnerAvatarUrl: string | null
    winnerMeta: Record<string, unknown> | null
    voteCount: number
}

export async function persistAwardResults(results: PersistedAwardResult[]): Promise<void> {
    if (results.length === 0) return
    const awardIds = Array.from(new Set(results.map(r => r.awardId)))
    const sessionIds = Array.from(new Set(results.map(r => r.sessionId)))
    await supabase.from('karaoke_award_results').delete().in('award_id', awardIds)
    const rows = results.map(r => ({
        award_id: r.awardId,
        session_id: r.sessionId,
        session_code: r.sessionCode,
        rank: r.rank,
        winner_label: r.winnerLabel,
        winner_subtitle: r.winnerSubtitle,
        winner_avatar_url: r.winnerAvatarUrl,
        winner_meta: r.winnerMeta,
        vote_count: r.voteCount
    }))
    const { error } = await supabase.from('karaoke_award_results').insert(rows)
    if (error) console.error('Failed to persist award results:', error.message)

    // Mark EVERY award in the session as finalized (not just ones the caller
    // explicitly listed) so default awards always get the closed badge too.
    const finalizedAt = new Date().toISOString()
    if (sessionIds.length > 0) {
        const { error: upErr } = await supabase
            .from('karaoke_awards')
            .update({ finalized_at: finalizedAt, updated_at: finalizedAt })
            .in('session_id', sessionIds)
        if (upErr) console.error('Failed to finalize awards:', upErr.message)
    }
}

// Clear finalized state and winner snapshot — used when admin wants to
// reopen voting for an award (or for the whole session).
export async function unfinalizeAwards(awardIds: string[]): Promise<void> {
    if (awardIds.length === 0) return
    await supabase.from('karaoke_award_results').delete().in('award_id', awardIds)
    await supabase
        .from('karaoke_awards')
        .update({ finalized_at: null, updated_at: new Date().toISOString() })
        .in('id', awardIds)
}

export async function listAwardResults(sessionId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('karaoke_award_results')
        .select('*')
        .eq('session_id', sessionId)
        .order('award_id', { ascending: true })
        .order('rank', { ascending: true })
    if (error) {
        console.error('Failed to list award results:', error.message)
        return []
    }
    return data || []
}

// Cache one channel per session so successive broadcasts reuse the socket
// instead of opening a new channel (and waiting for SUBSCRIBED) on every step.
let revealChannel: RealtimeChannel | null = null
let revealChannelSession: string | null = null

// Broadcast the reveal step on the per-session awards channel. Times out the
// subscribe wait so a flaky network doesn't stall the entire reveal sequence —
// the local stage already has the step via the state:action IPC relay, so a
// failed broadcast only loses companion-phone sync, not the show on stage.
export async function broadcastRevealStep(sessionId: string, step: unknown): Promise<void> {
    if (!revealChannel || revealChannelSession !== sessionId) {
        if (revealChannel) supabase.removeChannel(revealChannel)
        revealChannel = supabase.channel('ar-' + sessionId)
        revealChannelSession = sessionId
        await new Promise<void>((resolve) => {
            let done = false
            const settle = () => { if (!done) { done = true; resolve() } }
            revealChannel!.subscribe(status => {
                if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    settle()
                }
            })
            setTimeout(settle, 2500)
        })
    }
    try {
        await revealChannel.send({ type: 'broadcast', event: 'reveal-step', payload: { step } })
    } catch (e) {
        console.error('[Awards] broadcast send failed:', e)
    }
}
