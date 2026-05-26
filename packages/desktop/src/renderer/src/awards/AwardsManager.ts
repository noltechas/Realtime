// Renderer-side helpers for the awards system: candidate generation,
// tally computation, finalize-results denormalization, and the
// admin reveal sequencer.

import { createClient } from '@supabase/supabase-js'
import {
    Award,
    AwardCandidate,
    AwardSubjectType,
    AwardTally,
    AwardVote,
    REVEAL_TIMING,
    RevealPhase,
    RevealStep
} from './types'

// We re-create a client here for direct queries (vote tally fetch). Same
// credentials as useKaraokeSession.ts.
const SUPABASE_URL = 'https://hnnbxwitjkeijvoldfuv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubmJ4d2l0amtlaWp2b2xkZnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjcwMTQsImV4cCI6MjA5MDUwMzAxNH0.ENzZ2VLxszHr9StjFds06In7CyGkiyPvu6Jh1LUMMvA'
export const awardsSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// --- Candidate generation --------------------------------------------------

export interface PlayedPerformance {
    queueRowId: string                           // karaoke_queue.id
    trackId: string
    trackName: string
    trackArtist: string
    trackArtUrl: string | null
    singers: Array<{ name: string; color?: string | null; profilePicture?: string | null; guestId?: string | null }>
    playedAt: string
}

export interface KnownGuest {
    id: string
    name: string
    profilePicture: string | null
}

// Build candidates for an award given the played-history + guest roster.
// Returns an empty array (with a hint about why) for awards with no eligible
// candidates yet.
export function buildCandidates(opts: {
    subjectType: AwardSubjectType
    history: PlayedPerformance[]
    guests: KnownGuest[]
}): AwardCandidate[] {
    const { subjectType, history, guests } = opts
    if (subjectType === 'performance') {
        return history.map(p => ({
            subjectKey: p.queueRowId,
            subjectType: 'performance',
            label: p.trackName,
            subtitle: p.singers.length
                ? p.singers.map(s => s.name).join(', ')
                : p.trackArtist,
            avatarUrl: p.trackArtUrl,
            singers: p.singers,
            trackName: p.trackName,
            trackArtist: p.trackArtist,
            bannedVoterNames: p.singers.map(s => s.name),
            bannedVoterGuestIds: p.singers.map(s => s.guestId || '').filter(Boolean)
        }))
    }
    if (subjectType === 'group') {
        return history
            .filter(p => p.singers.length >= 2)
            .map(p => ({
                subjectKey: p.queueRowId,
                subjectType: 'group',
                label: p.singers.map(s => s.name).join(' & '),
                subtitle: p.trackName + ' — ' + p.trackArtist,
                avatarUrl: p.trackArtUrl,
                singers: p.singers,
                trackName: p.trackName,
                trackArtist: p.trackArtist,
                bannedVoterNames: p.singers.map(s => s.name),
                bannedVoterGuestIds: p.singers.map(s => s.guestId || '').filter(Boolean)
            }))
    }
    // singer
    const sangNames = new Set<string>()
    const sangIds = new Set<string>()
    for (const p of history) {
        for (const s of p.singers) {
            if (s.name) sangNames.add(s.name)
            if (s.guestId) sangIds.add(s.guestId)
        }
    }
    // Match guests who appear in either set (by id OR name).
    const candidates: AwardCandidate[] = []
    for (const g of guests) {
        if (sangIds.has(g.id) || sangNames.has(g.name)) {
            candidates.push({
                subjectKey: g.id,
                subjectType: 'singer',
                label: g.name,
                subtitle: 'Performer',
                avatarUrl: g.profilePicture,
                bannedVoterGuestIds: [g.id],
                bannedVoterNames: [g.name]
            })
        }
    }
    // Also include any non-guest-resolvable performers (e.g., singers added
    // via the desktop with no companion guest record) as name-only entries.
    for (const p of history) {
        for (const s of p.singers) {
            if (!s.guestId && s.name && !candidates.some(c => c.label === s.name)) {
                candidates.push({
                    subjectKey: 'name:' + s.name,
                    subjectType: 'singer',
                    label: s.name,
                    subtitle: 'Performer',
                    avatarUrl: s.profilePicture || null,
                    bannedVoterNames: [s.name]
                })
            }
        }
    }
    return candidates
}

// --- Self-vote check -------------------------------------------------------

export function canVote(voter: { guestId: string; name: string } | null, candidate: AwardCandidate): boolean {
    if (!voter) return false
    if (candidate.bannedVoterGuestIds?.includes(voter.guestId)) return false
    if (candidate.bannedVoterNames?.includes(voter.name)) return false
    return true
}

// --- Tally computation -----------------------------------------------------

export function computeTally(award: Award, votes: AwardVote[], candidates: AwardCandidate[]): AwardTally {
    const candidatesByKey = new Map<string, AwardCandidate>()
    for (const c of candidates) candidatesByKey.set(c.subjectKey, c)
    const counts = new Map<string, { candidate: AwardCandidate | null; count: number }>()
    for (const v of votes) {
        const key = (award.subjectType === 'singer'
            ? (v.subjectGuestId || (v.subjectQueueRowId ? '' : ''))
            : (v.subjectQueueRowId || ''))
        if (!key) continue
        const existing = counts.get(key)
        if (existing) {
            existing.count += 1
        } else {
            // For singer awards, the key is a guest id. We also store the
            // synthetic "name:NAME" form — match either.
            const candidate = candidatesByKey.get(key) || candidatesByKey.get('name:' + key) || null
            counts.set(key, { candidate, count: 1 })
        }
    }
    const byCandidate = Array.from(counts.values()).sort((a, b) => b.count - a.count)
    const top = byCandidate[0]?.count ?? 0
    const winners = top > 0
        ? byCandidate.filter(e => e.count === top).map(e => e.candidate).filter((c): c is AwardCandidate => !!c)
        : []
    return {
        awardId: award.id,
        votes,
        byCandidate,
        winners,
        totalVotes: votes.length
    }
}

// --- Vote fetching (admin-only path) ---------------------------------------

export async function fetchVotesForAwards(awardIds: string[]): Promise<AwardVote[]> {
    if (awardIds.length === 0) return []
    const { data, error } = await awardsSupabase
        .from('karaoke_award_votes')
        .select('*')
        .in('award_id', awardIds)
    if (error) {
        console.error('[Awards] Failed to fetch votes:', error.message)
        return []
    }
    return (data || []).map((r: any) => ({
        id: r.id,
        awardId: r.award_id,
        voterGuestId: r.voter_guest_id,
        subjectQueueRowId: r.subject_queue_row_id,
        subjectGuestId: r.subject_guest_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at
    }))
}

export async function fetchOwnVotesForGuest(guestId: string, awardIds: string[]): Promise<Record<string, AwardVote>> {
    if (awardIds.length === 0) return {}
    const { data, error } = await awardsSupabase
        .from('karaoke_award_votes')
        .select('*')
        .in('award_id', awardIds)
        .eq('voter_guest_id', guestId)
    if (error) {
        console.error('[Awards] Failed to fetch own votes:', error.message)
        return {}
    }
    const map: Record<string, AwardVote> = {}
    for (const r of (data || [])) {
        map[r.award_id] = {
            id: r.id,
            awardId: r.award_id,
            voterGuestId: r.voter_guest_id,
            subjectQueueRowId: r.subject_queue_row_id,
            subjectGuestId: r.subject_guest_id,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }
    }
    return map
}

// --- Played-history fetcher (used by AdminPage candidate computation) ------

export async function fetchPlayedHistory(sessionId: string): Promise<PlayedPerformance[]> {
    const { data, error } = await awardsSupabase
        .from('karaoke_queue')
        .select('id, track_id, track_name, track_artist, track_art_url, singer_configs, created_at')
        .eq('session_id', sessionId)
        .eq('status', 'played')
        .order('created_at', { ascending: true })
    if (error) {
        console.error('[Awards] Failed to fetch played history:', error.message)
        return []
    }
    return (data || []).map((r: any) => ({
        queueRowId: r.id,
        trackId: r.track_id,
        trackName: r.track_name,
        trackArtist: r.track_artist,
        trackArtUrl: r.track_art_url || null,
        singers: (r.singer_configs || []).map((sc: any) => ({
            name: sc.name || 'Singer',
            color: sc.color || null,
            profilePicture: sc.profilePicture || null,
            guestId: sc.guestId || null
        })),
        playedAt: r.created_at
    }))
}

export async function fetchGuests(sessionId: string): Promise<KnownGuest[]> {
    const { data, error } = await awardsSupabase
        .from('karaoke_guests')
        .select('id, name, profile_picture')
        .eq('session_id', sessionId)
    if (error) {
        console.error('[Awards] Failed to fetch guests:', error.message)
        return []
    }
    return (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        profilePicture: r.profile_picture || null
    }))
}

// --- Finalize: denormalize winners into result rows ------------------------

export function buildPersistedResults(opts: {
    award: Award
    tally: AwardTally
    sessionId: string
    sessionCode: string
}) {
    const { award, tally, sessionId, sessionCode } = opts
    if (tally.winners.length === 0) {
        return [{
            awardId: award.id,
            sessionId,
            sessionCode,
            rank: 1,
            winnerLabel: 'No winner',
            winnerSubtitle: 'No votes cast',
            winnerAvatarUrl: null,
            winnerMeta: null,
            voteCount: 0
        }]
    }
    const voteCount = tally.byCandidate[0]?.count ?? 0
    return tally.winners.map(w => ({
        awardId: award.id,
        sessionId,
        sessionCode,
        rank: 1,
        winnerLabel: w.label,
        winnerSubtitle: w.subtitle ?? null,
        winnerAvatarUrl: w.avatarUrl ?? null,
        winnerMeta: {
            subjectType: w.subjectType,
            subjectKey: w.subjectKey,
            singers: w.singers || null,
            trackName: w.trackName || null,
            trackArtist: w.trackArtist || null
        },
        voteCount
    }))
}

// --- Reveal sequencer ------------------------------------------------------
// Drives the broadcast-step timeline. The caller owns cancellation.

export interface RevealSequenceItem {
    award: Award
    candidates: AwardCandidate[]
    winners: AwardCandidate[]
    voteCount: number
}

export interface RevealSequenceController {
    cancel: () => void
}

export function runRevealSequence(opts: {
    items: RevealSequenceItem[]
    onBroadcast: (step: RevealStep) => Promise<void> | void
    onComplete?: () => void
}): RevealSequenceController {
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []

    const wait = (ms: number) => new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ms)
        timers.push(t)
    })

    const broadcast = async (phase: RevealPhase, partial: Partial<RevealStep> = {}) => {
        if (cancelled) return
        const step: RevealStep = {
            phase,
            awardIndex: 0,
            totalAwards: opts.items.length,
            startedAt: new Date().toISOString(),
            ...partial
        }
        await opts.onBroadcast(step)
    }

    ;(async () => {
        // Opening card
        await broadcast('opening', { awardIndex: 0 })
        await wait(REVEAL_TIMING.opening)

        // Per award
        for (let i = 0; i < opts.items.length; i++) {
            if (cancelled) break
            const item = opts.items[i]
            await broadcast('nominees', { awardIndex: i, award: item.award, candidates: item.candidates })
            await wait(REVEAL_TIMING.nominees)
            if (cancelled) break
            await broadcast('drumroll', { awardIndex: i, award: item.award })
            await wait(REVEAL_TIMING.drumroll)
            if (cancelled) break
            await broadcast('winner', { awardIndex: i, award: item.award, winners: item.winners, voteCount: item.voteCount })
            await wait(REVEAL_TIMING.winner)
            if (i < opts.items.length - 1) await wait(REVEAL_TIMING.gap)
        }
        if (cancelled) return

        // Finale
        await broadcast('finale', {
            awardIndex: opts.items.length,
            finaleSummary: opts.items.map(it => ({ award: it.award, winners: it.winners }))
        })
        await wait(REVEAL_TIMING.finale)
        await broadcast('done', { awardIndex: opts.items.length })
        await wait(REVEAL_TIMING.done)
        // Clear stage
        await broadcast('idle', { awardIndex: 0 })
        opts.onComplete?.()
    })().catch(e => console.error('[Awards] Reveal sequencer error:', e))

    return {
        cancel: () => {
            cancelled = true
            for (const t of timers) clearTimeout(t)
        }
    }
}

// --- Renderer-side broadcast channel cache --------------------------------
// One channel per session, kept open for the lifetime of the session so
// successive reveal steps reuse it. Renderer-side (not main-process) so the
// connection rides the same websocket the rest of the app already uses.

const revealChannels: Map<string, ReturnType<typeof awardsSupabase.channel>> = new Map()
const revealChannelReady: Map<string, Promise<void>> = new Map()

export async function getRevealBroadcastChannel(sessionId: string) {
    if (revealChannels.has(sessionId)) {
        await revealChannelReady.get(sessionId)
        return revealChannels.get(sessionId)!
    }
    const ch = awardsSupabase.channel('ar-' + sessionId, { config: { broadcast: { self: false, ack: false } } })
    revealChannels.set(sessionId, ch)
    const ready = new Promise<void>((resolve) => {
        let done = false
        const settle = () => { if (!done) { done = true; resolve() } }
        ch.subscribe(status => {
            if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                settle()
            }
        })
        setTimeout(settle, 3000)
    })
    revealChannelReady.set(sessionId, ready)
    await ready
    return ch
}

export async function sendRevealStepBroadcast(sessionId: string, step: unknown): Promise<void> {
    const ch = await getRevealBroadcastChannel(sessionId)
    try {
        await ch.send({ type: 'broadcast', event: 'reveal-step', payload: { step } })
    } catch (e) {
        console.warn('[Awards] reveal broadcast send failed:', e)
    }
}
