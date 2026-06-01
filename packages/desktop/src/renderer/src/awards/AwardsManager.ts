// Renderer-side helpers for the awards system: candidate generation,
// tally computation, finalize-results denormalization, and the
// admin reveal sequencer.

import { createClient } from '@supabase/supabase-js'
import {
    Award,
    AwardCandidate,
    AwardStanding,
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
    // Resolve each performance's singers to their LIVE name + avatar from the
    // guest roster, so reveal faces reflect current profiles (history rows
    // only carry a guestId after the base64 refactor). Name-only singers (no
    // guestId) keep their inline name and have no avatar.
    const guestById = new Map(guests.map(g => [g.id, g]))
    const resolveSingers = (singers: PlayedPerformance['singers']) =>
        singers.map(s => {
            const g = s.guestId ? guestById.get(s.guestId) : undefined
            return {
                name: g?.name ?? s.name,
                color: s.color ?? null,
                profilePicture: g ? g.profilePicture : (s.profilePicture ?? null),
                guestId: s.guestId ?? null,
            }
        })
    if (subjectType === 'performance') {
        return history.map(p => {
            const rs = resolveSingers(p.singers)
            return {
                subjectKey: p.queueRowId,
                subjectType: 'performance' as const,
                label: p.trackName,
                subtitle: rs.length ? rs.map(s => s.name).join(', ') : p.trackArtist,
                avatarUrl: p.trackArtUrl,
                singers: rs,
                trackName: p.trackName,
                trackArtist: p.trackArtist,
                bannedVoterNames: rs.map(s => s.name),
                bannedVoterGuestIds: rs.map(s => s.guestId || '').filter(Boolean)
            }
        })
    }
    if (subjectType === 'group') {
        return history
            .filter(p => p.singers.length >= 2)
            .map(p => {
                const rs = resolveSingers(p.singers)
                return {
                    subjectKey: p.queueRowId,
                    subjectType: 'group' as const,
                    label: rs.map(s => s.name).join(' & '),
                    subtitle: p.trackName + ' — ' + p.trackArtist,
                    avatarUrl: p.trackArtUrl,
                    singers: rs,
                    trackName: p.trackName,
                    trackArtist: p.trackArtist,
                    bannedVoterNames: rs.map(s => s.name),
                    bannedVoterGuestIds: rs.map(s => s.guestId || '').filter(Boolean)
                }
            })
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

// Points per ranked position: 1st = 3, 2nd = 2, 3rd = 1.
export function pointsForRank(rank: number): number {
    return rank === 1 ? 3 : rank === 2 ? 2 : rank === 3 ? 1 : 0
}

export function computeTally(award: Award, votes: AwardVote[], candidates: AwardCandidate[]): AwardTally {
    const candidatesByKey = new Map<string, AwardCandidate>()
    for (const c of candidates) candidatesByKey.set(c.subjectKey, c)
    const resolveCandidate = (key: string): AwardCandidate | null =>
        candidatesByKey.get(key) || candidatesByKey.get('name:' + key) || null

    interface Acc {
        subjectKey: string
        candidate: AwardCandidate | null
        score: number
        adjustment: number
        firstPlaceVotes: number
        secondPlaceVotes: number
        thirdPlaceVotes: number
        totalVotes: number
    }
    const acc = new Map<string, Acc>()
    const voters = new Set<string>()
    const ensure = (key: string): Acc => {
        let a = acc.get(key)
        if (!a) {
            a = { subjectKey: key, candidate: resolveCandidate(key), score: 0, adjustment: 0, firstPlaceVotes: 0, secondPlaceVotes: 0, thirdPlaceVotes: 0, totalVotes: 0 }
            acc.set(key, a)
        }
        return a
    }

    for (const v of votes) {
        const key = award.subjectType === 'singer' ? (v.subjectGuestId || '') : (v.subjectQueueRowId || '')
        if (!key) continue
        voters.add(v.voterGuestId)
        const a = ensure(key)
        const rank = v.rank || 1
        a.score += pointsForRank(rank)
        a.totalVotes += 1
        if (rank === 1) a.firstPlaceVotes += 1
        else if (rank === 2) a.secondPlaceVotes += 1
        else if (rank === 3) a.thirdPlaceVotes += 1
    }

    // Apply the admin's manual per-candidate score adjustments.
    const adj = award.scoreAdjustments || {}
    for (const key of Object.keys(adj)) {
        const delta = Math.round(adj[key]) || 0
        if (!delta) continue
        const a = ensure(key)
        a.adjustment += delta
        a.score += delta
    }

    const standings: AwardStanding[] = Array.from(acc.values()).map(a => ({
        candidate: a.candidate,
        subjectKey: a.subjectKey,
        score: a.score,
        adjustment: a.adjustment,
        firstPlaceVotes: a.firstPlaceVotes,
        secondPlaceVotes: a.secondPlaceVotes,
        thirdPlaceVotes: a.thirdPlaceVotes,
        totalVotes: a.totalVotes
    }))
    // Best-first. Ties broken by 1st-place votes, then 2nd, then 3rd, then label.
    standings.sort((x, y) =>
        y.score - x.score ||
        y.firstPlaceVotes - x.firstPlaceVotes ||
        y.secondPlaceVotes - x.secondPlaceVotes ||
        y.thirdPlaceVotes - x.thirdPlaceVotes ||
        (x.candidate?.label || '').localeCompare(y.candidate?.label || '')
    )

    // Finalists / winner only consider resolvable candidates with positive score.
    const ranked = standings.filter(s => s.score > 0 && s.candidate)
    const finalists = ranked.slice(0, 3)
    const winner = ranked[0] || null

    return { awardId: award.id, votes, standings, finalists, winner, totalBallots: voters.size }
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
        rank: r.rank ?? 1,
        createdAt: r.created_at,
        updatedAt: r.updated_at
    }))
}

// Songs a given singer finalist performed, newest last. Used by the stage to
// scroll a singer's set during their finalist spotlight.
export function buildFinalistSongs(
    history: PlayedPerformance[],
    candidate: AwardCandidate
): Array<{ trackName: string; trackArtist: string; artUrl: string | null }> {
    const isNameKey = candidate.subjectKey.startsWith('name:')
    const gid = isNameKey ? null : candidate.subjectKey
    const name = candidate.label
    const out: Array<{ trackName: string; trackArtist: string; artUrl: string | null }> = []
    const seen = new Set<string>()
    for (const p of history) {
        const inIt = p.singers.some(s => (gid && s.guestId === gid) || (!!s.name && s.name === name))
        if (!inIt || seen.has(p.queueRowId)) continue
        seen.add(p.queueRowId)
        out.push({ trackName: p.trackName, trackArtist: p.trackArtist, artUrl: p.trackArtUrl })
    }
    return out
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
            rank: r.rank ?? 1,
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
    const winner = tally.winner
    if (!winner || !winner.candidate) {
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
    const w = winner.candidate
    // The persisted result is an audit trail (the live reveal step carries
    // resolved faces). Keep it lean: reference singers by id/name only — no
    // base64 — and don't persist a base64 winner avatar. Singer winners
    // stay resolvable from subjectKey (the guestId); song-subject winners
    // keep their track-art URL.
    const leanSingers = w.singers
        ? w.singers.map(s => ({ name: s.name, color: s.color ?? null, guestId: (s as { guestId?: string | null }).guestId ?? null }))
        : null
    const avatarIsDataUrl = typeof w.avatarUrl === 'string' && w.avatarUrl.startsWith('data:')
    return [{
        awardId: award.id,
        sessionId,
        sessionCode,
        rank: 1,
        winnerLabel: w.label,
        winnerSubtitle: w.subtitle ?? null,
        winnerAvatarUrl: avatarIsDataUrl ? null : (w.avatarUrl ?? null),
        winnerMeta: {
            subjectType: w.subjectType,
            subjectKey: w.subjectKey,
            singers: leanSingers,
            trackName: w.trackName || null,
            trackArtist: w.trackArtist || null,
            score: winner.score,
            firstPlaceVotes: winner.firstPlaceVotes,
            totalVotes: winner.totalVotes
        },
        voteCount: winner.score
    }]
}

// --- Reveal sequencer ------------------------------------------------------
// Drives the broadcast-step timeline. The caller owns cancellation.

// One finalist with the data the stage needs to spotlight them.
export interface RevealFinalistItem {
    candidate: AwardCandidate
    score: number
    firstPlaceVotes: number
    totalVotes: number
    songs?: Array<{ trackName: string; trackArtist: string; artUrl: string | null }>
}

export interface RevealSequenceItem {
    award: Award
    finalists: RevealFinalistItem[]   // in standings (best-first) order
    winnerKey: string | null
    winnerStats: { score: number; firstPlaceVotes: number; totalVotes: number } | null
}

export interface RevealSequenceController {
    cancel: () => void
}

// Fisher–Yates shuffle (renderer-side; Math.random is fine here).
function shuffled<T>(arr: T[]): T[] {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
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

        // Per award: finalists one-by-one (random order) → lineup → winner grows.
        for (let i = 0; i < opts.items.length; i++) {
            if (cancelled) break
            const item = opts.items[i]
            const finalists = item.finalists
            const lineup = finalists.map(f => f.candidate)         // standings order
            const winnerCandidate =
                finalists.find(f => f.candidate.subjectKey === item.winnerKey)?.candidate
                ?? finalists[0]?.candidate ?? null

            if (finalists.length > 0) {
                // Spotlight each finalist in a randomized order so the reveal
                // order doesn't betray the standings.
                const order = shuffled(finalists)
                for (let k = 0; k < order.length; k++) {
                    if (cancelled) break
                    const f = order[k]
                    await broadcast('finalist', {
                        awardIndex: i,
                        award: item.award,
                        finalist: {
                            candidate: f.candidate,
                            score: f.score,
                            firstPlaceVotes: f.firstPlaceVotes,
                            totalVotes: f.totalVotes,
                            order: k,
                            count: order.length,
                            songs: f.songs
                        }
                    })
                    await wait(REVEAL_TIMING.finalist)
                }
                if (cancelled) break
                await broadcast('lineup', { awardIndex: i, award: item.award, lineup })
                await wait(REVEAL_TIMING.lineup)
            }
            if (cancelled) break
            await broadcast('winner', {
                awardIndex: i,
                award: item.award,
                lineup,
                winners: winnerCandidate ? [winnerCandidate] : [],
                winnerKey: item.winnerKey ?? undefined,
                winnerStats: item.winnerStats ?? undefined,
                voteCount: item.winnerStats?.score ?? 0
            })
            await wait(REVEAL_TIMING.winner)
            if (i < opts.items.length - 1) await wait(REVEAL_TIMING.gap)
        }
        if (cancelled) return

        // Finale — montage of all winners
        await broadcast('finale', {
            awardIndex: opts.items.length,
            finaleSummary: opts.items.map(it => {
                const winnerCandidate =
                    it.finalists.find(f => f.candidate.subjectKey === it.winnerKey)?.candidate
                    ?? it.finalists[0]?.candidate ?? null
                return { award: it.award, winners: winnerCandidate ? [winnerCandidate] : [] }
            })
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
