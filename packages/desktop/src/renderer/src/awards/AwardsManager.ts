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
    EncoreSong,
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
    // Match by name too — sessions accumulate duplicate guest records, so a
    // performance's singer_config guestId may not point at the guest record
    // that actually holds the profile picture. Prefer a record that has one.
    const guestByName = new Map<string, KnownGuest>()
    for (const g of guests) {
        const existing = guestByName.get(g.name)
        if (!existing || (!existing.profilePicture && g.profilePicture)) guestByName.set(g.name, g)
    }
    const resolveSingers = (singers: PlayedPerformance['singers']) =>
        singers.map(s => {
            const byId = s.guestId ? guestById.get(s.guestId) : undefined
            // Use the id-matched guest, unless it lacks a picture and a same-named
            // guest record has one.
            const byName = s.name ? guestByName.get(s.name) : undefined
            const g = (byId && byId.profilePicture) ? byId : (byName && byName.profilePicture ? byName : (byId || byName))
            return {
                name: g?.name ?? s.name,
                color: s.color ?? null,
                // Prefer a guest's live profile picture, then the picture captured
                // in the performance's singer_config.
                profilePicture: (g && g.profilePicture) || s.profilePicture || null,
                guestId: s.guestId ?? (g ? g.id : null),
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
    // A singer's photo may live on their guest record OR only in the
    // singer_config of a song they sang — index both so the reveal face shows.
    const picByGuestId = new Map<string, string>()
    const picByName = new Map<string, string>()
    for (const p of history) {
        for (const s of p.singers) {
            if (!s.profilePicture) continue
            if (s.guestId && !picByGuestId.has(s.guestId)) picByGuestId.set(s.guestId, s.profilePicture)
            if (s.name && !picByName.has(s.name)) picByName.set(s.name, s.profilePicture)
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
                avatarUrl: g.profilePicture || picByGuestId.get(g.id) || picByName.get(g.name) || null,
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

// --- Reveal storyboard -----------------------------------------------------
// The reveal is ADMIN-PACED: we precompute the full ordered list of slides and
// the admin steps through them with Prev/Next (so each winner can give a speech
// before advancing). `items` arrive already in the admin's chosen reveal order.

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

// Fisher–Yates shuffle (renderer-side; Math.random is fine here).
function shuffled<T>(arr: T[]): T[] {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

// Minimal catalog shape the encore picker needs — a subset of the desktop
// SongMeta + nothing else (audio:list-catalog returns the full meta).
export interface EncoreCatalogEntry {
    trackId: string
    name: string
    artist: string
    artUrl?: string | null
    genres?: string[]
    spotifyData?: {
        key?: number
        mode?: number
        tempo?: number
        popularity?: number
    }
}

const normText = (s: string | null | undefined): string => (s || '').trim().toLowerCase()

// Build the encore vote line-up. Rather than 5 random played songs, we study
// what the Best Performance winner(s) actually sang tonight, distill a quick
// taste profile (artists, genres, tempo, key/mode, popularity), then score the
// whole local catalog and surface the 5 best-fit songs they have NOT already
// sung — fresh material picked to suit them. Falls back to random played songs
// when there's no catalog to pick fresh material from.
export function pickEncoreSongs(
    history: PlayedPerformance[],
    winnerSingers: Array<{ name?: string; guestId?: string | null }>,
    catalog: EncoreCatalogEntry[],
    n = 5
): EncoreSong[] {
    const toSong = (c: EncoreCatalogEntry): EncoreSong => ({
        id: c.trackId, trackName: c.name, trackArtist: c.artist, artUrl: c.artUrl ?? null
    })

    // Last-resort fallback (and the old behaviour): distinct random played songs.
    const randomFromHistory = (): EncoreSong[] => {
        const seen = new Set<string>()
        const unique: EncoreSong[] = []
        for (const p of history) {
            if (!p.trackId || seen.has(p.trackId)) continue
            seen.add(p.trackId)
            unique.push({ id: p.trackId, trackName: p.trackName, trackArtist: p.trackArtist, artUrl: p.trackArtUrl })
        }
        return shuffled(unique).slice(0, n)
    }

    if (!catalog || catalog.length === 0) return randomFromHistory()

    // Which performances were sung by (any of) the winner(s)? Match on guestId
    // first, then case-insensitive name. If we can't identify the winner among
    // the performers, profile against the whole night rather than nothing.
    const winnerGuestIds = new Set(winnerSingers.map(s => s.guestId || '').filter(Boolean))
    const winnerNames = new Set(winnerSingers.map(s => normText(s.name)).filter(Boolean))
    const sangByWinner = (p: PlayedPerformance): boolean =>
        p.singers.some(s =>
            (!!s.guestId && winnerGuestIds.has(s.guestId)) || (!!s.name && winnerNames.has(normText(s.name)))
        )
    const winnerPerfs = history.filter(sangByWinner)
    const profilePerfs = winnerPerfs.length ? winnerPerfs : history

    const catalogById = new Map(catalog.map(c => [c.trackId, c]))
    const sungTrackIds = new Set(profilePerfs.map(p => p.trackId).filter(Boolean))

    // --- Taste profile ------------------------------------------------------
    const artistWeight = new Map<string, number>()   // normalized artist → times sung
    const genreWeight = new Map<string, number>()
    const tempos: number[] = []
    let major = 0, minor = 0
    for (const p of profilePerfs) {
        // Artist signal comes straight from the played row (always present).
        const a = normText(p.trackArtist)
        if (a) artistWeight.set(a, (artistWeight.get(a) || 0) + 1)
        // Genre / tempo / mode come from the catalog meta of the sung track.
        const meta = catalogById.get(p.trackId)
        if (!meta) continue
        for (const g of meta.genres || []) {
            const gg = normText(g)
            if (gg) genreWeight.set(gg, (genreWeight.get(gg) || 0) + 1)
        }
        const t = meta.spotifyData?.tempo
        if (typeof t === 'number' && t > 0) tempos.push(t)
        const m = meta.spotifyData?.mode
        if (m === 1) major++
        else if (m === 0) minor++
    }
    const avgTempo = tempos.length ? tempos.reduce((s, x) => s + x, 0) / tempos.length : null
    const dominantMode = major === minor ? null : (major > minor ? 1 : 0)

    // --- Score every catalog song they did NOT already sing -----------------
    const score = (c: EncoreCatalogEntry): number => {
        let s = 0
        // Same artist they performed — strongest signal.
        const aw = artistWeight.get(normText(c.artist))
        if (aw) s += 5 + Math.min(aw, 3) * 1.5
        // Genre overlap.
        for (const g of c.genres || []) {
            const w = genreWeight.get(normText(g))
            if (w) s += 1.5 + Math.min(w, 3) * 0.5
        }
        // Tempo proximity (full credit within 8 bpm, fading to 0 by 40 bpm).
        const t = c.spotifyData?.tempo
        if (avgTempo != null && typeof t === 'number' && t > 0) {
            const d = Math.abs(t - avgTempo)
            if (d < 40) s += 2 * (1 - Math.max(0, d - 8) / 32)
        }
        // Mode (major/minor) match.
        if (dominantMode != null && c.spotifyData?.mode === dominantMode) s += 1
        // Crowd-pleaser bias — popular songs make better encores. Mild.
        const pop = c.spotifyData?.popularity
        if (typeof pop === 'number') s += (pop / 100) * 1.5
        return s
    }

    const ranked = catalog
        .filter(c => c.trackId && !sungTrackIds.has(c.trackId))
        .map(c => ({ c, s: score(c) }))
        .sort((x, y) =>
            y.s - x.s ||
            (y.c.spotifyData?.popularity ?? 0) - (x.c.spotifyData?.popularity ?? 0) ||
            normText(x.c.name).localeCompare(normText(y.c.name))
        )

    if (ranked.length === 0) return randomFromHistory()

    // Take the top N, but keep variety: at most 2 per artist on the first pass,
    // then backfill from the rest if that left us short.
    const picked: EncoreSong[] = []
    const perArtist = new Map<string, number>()
    const used = new Set<string>()
    for (const { c } of ranked) {
        if (picked.length >= n) break
        const a = normText(c.artist)
        if ((perArtist.get(a) || 0) >= 2) continue
        perArtist.set(a, (perArtist.get(a) || 0) + 1)
        used.add(c.trackId)
        picked.push(toSong(c))
    }
    for (const { c } of ranked) {
        if (picked.length >= n) break
        if (used.has(c.trackId)) continue
        picked.push(toSong(c))
    }
    return picked
}

// Build the ordered slide list the admin steps through:
//   opening → overview → (per award: intro → finalist×N[random] → lineup → winner)
//   → finale  OR  → encore-buildup → encore-vote (when an encore is supplied).
// startedAt is left blank; the admin stamps it fresh on each broadcast so the
// stage replays entrance animations even when re-showing the same slide.
export function buildRevealStoryboard(
    items: RevealSequenceItem[],
    encore?: { songs: EncoreSong[] }
): RevealStep[] {
    const total = items.length
    const slides: RevealStep[] = []
    const slide = (phase: RevealPhase, partial: Partial<RevealStep>): RevealStep => ({
        phase,
        awardIndex: 0,
        totalAwards: total,
        startedAt: '',
        ...partial
    })

    slides.push(slide('opening', { awardIndex: 0 }))
    // Overview of every award (icon + name) before going one-by-one.
    if (items.length > 0) {
        slides.push(slide('overview', { awardIndex: 0, overview: items.map(it => it.award) }))
    }

    items.forEach((item, i) => {
        slides.push(slide('intro', { awardIndex: i, award: item.award }))
        const finalists = item.finalists
        const lineup = finalists.map(f => f.candidate)            // standings order
        const winnerCandidate =
            finalists.find(f => f.candidate.subjectKey === item.winnerKey)?.candidate
            ?? finalists[0]?.candidate ?? null

        if (finalists.length > 0) {
            // Randomize the reveal order so it doesn't betray the standings.
            const order = shuffled(finalists)
            order.forEach((f, k) => {
                slides.push(slide('finalist', {
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
                }))
            })
            slides.push(slide('lineup', { awardIndex: i, award: item.award, lineup }))
        }

        slides.push(slide('winner', {
            awardIndex: i,
            award: item.award,
            lineup,
            winners: winnerCandidate ? [winnerCandidate] : [],
            winnerKey: item.winnerKey ?? undefined,
            winnerStats: item.winnerStats ?? undefined,
            voteCount: item.winnerStats?.score ?? 0
        }))
    })

    // The encore is the grand closer — it replaces the finale recap. The
    // encore-winner slide is broadcast dynamically by the admin after the vote
    // timer, so it isn't part of the static storyboard.
    if (encore && encore.songs.length > 0) {
        slides.push(slide('encore-buildup', { awardIndex: total }))
        slides.push(slide('encore-vote', { awardIndex: total, encoreSongs: encore.songs, encoreTotals: {} }))
    } else {
        slides.push(slide('finale', {
            awardIndex: total,
            finaleSummary: items.map(it => {
                const wc =
                    it.finalists.find(f => f.candidate.subjectKey === it.winnerKey)?.candidate
                    ?? it.finalists[0]?.candidate ?? null
                return { award: it.award, winners: wc ? [wc] : [] }
            })
        }))
    }

    return slides
}

// A short human label for a slide — shown in the admin's reveal control panel.
export function describeRevealSlide(step: RevealStep): string {
    switch (step.phase) {
        case 'opening': return 'Opening — "Tonight’s Awards"'
        case 'overview': return `Overview — all ${step.overview?.length ?? 0} awards`
        case 'intro': return `Intro · ${step.award?.title ?? 'Award'}`
        case 'finalist': return `Finalist ${(step.finalist?.order ?? 0) + 1}/${step.finalist?.count ?? 0} · ${step.award?.title ?? ''}`
        case 'lineup': return `The finalists · ${step.award?.title ?? ''}`
        case 'winner': return `Winner${step.winners && step.winners.length ? ' — speech' : ''} · ${step.award?.title ?? ''}`
        case 'finale': return 'Finale — all winners'
        case 'encore-buildup': return 'Encore — build-up (auto ~10s)'
        case 'encore-vote': return 'Encore — live vote (auto 45s)'
        case 'encore-winner': return 'Encore — winning song'
        default: return step.phase
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

// Dedup key for the persisted reveal step so the per-second encore-vote
// re-broadcasts (which keep the same startedAt) don't hammer the DB.
let lastPersistedRevealKey: string | null = null

export async function sendRevealStepBroadcast(sessionId: string, step: unknown): Promise<void> {
    const ch = await getRevealBroadcastChannel(sessionId)
    try {
        await ch.send({ type: 'broadcast', event: 'reveal-step', payload: { step } })
    } catch (e) {
        console.warn('[Awards] reveal broadcast send failed:', e)
    }
    // Also persist the current step on the session row. Broadcasts are
    // ephemeral — a phone that had the app closed (or never opened the Awards
    // tab) when the reveal started would miss them. Persisting lets any remote
    // device fetch the in-progress reveal on load and jump straight in.
    try {
        const s = step as { phase?: string; awardIndex?: number; startedAt?: string } | null
        const active = !!s && s.phase !== 'idle' && s.phase !== 'done'
        const key = active ? `${s!.phase}|${s!.awardIndex}|${s!.startedAt}` : 'inactive'
        if (key !== lastPersistedRevealKey) {
            lastPersistedRevealKey = key
            await awardsSupabase
                .from('karaoke_sessions')
                .update({ awards_reveal: active ? step : null })
                .eq('id', sessionId)
        }
    } catch (e) {
        console.warn('[Awards] reveal persist failed:', e)
    }
}
