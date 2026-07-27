import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp, NEON_COLORS, type QueueItem, type Singer } from '../context/AppContext'
import { FEATURED_SVGS, awardIconCdnUrl } from './icons/manifest'
import { Button, Card, Icon, IconButton, Input, TextArea } from '../components/ui'
import {
    Award,
    AwardCandidate,
    AwardVote,
    AwardSubjectType,
    EncoreSong,
    RevealStep
} from './types'
import {
    buildCandidates,
    computeTally,
    fetchVotesForAwards,
    fetchPlayedHistory,
    fetchGuests,
    buildPersistedResults,
    buildFinalistSongs,
    buildRevealStoryboard,
    pickEncoreSongs,
    describeRevealSlide,
    getRevealBroadcastChannel,
    sendRevealStepBroadcast,
    awardsSupabase,
    PlayedPerformance,
    KnownGuest,
    RevealSequenceItem
} from './AwardsManager'

const ENCORE_BUILDUP_MS = 10000
const ENCORE_VOTE_MS = 45000
const ENCORE_WINNER_MS = 7000

const REFRESH_MS = 4000
const RANK_LABELS = ['1st', '2nd', '3rd']

// Ceremony order for the three house awards when the admin hasn't set their own
// running order: Best Duo/Group, then Singer of the Night, then Best
// Performance as the closer. Custom awards precede these (least- to most-voted).
const DEFAULT_REVEAL_SLUG_ORDER = ['best-duo-group', 'singer-of-the-night', 'best-performance']

// Limits mirror the companion app's award create/edit form.
const AWARD_TITLE_MAX = 40
const AWARD_DESCRIPTION_MAX = 180

export function AdminAwardsTab() {
    const { state, dispatch } = useApp()
    const sessionId = state.karaokeSessionId
    const sessionCode = state.karaokeSessionCode
    const [votes, setVotes] = useState<AwardVote[]>([])
    const [history, setHistory] = useState<PlayedPerformance[]>([])
    const [guests, setGuests] = useState<KnownGuest[]>([])
    const [revealStatus, setRevealStatus] = useState<'idle' | 'running'>('idle')
    const [expandedBallots, setExpandedBallots] = useState<Record<string, boolean>>({})
    // Admin-paced reveal: precomputed slides + the index currently on stage.
    const [storyboard, setStoryboard] = useState<RevealStep[]>([])
    const [slideIdx, setSlideIdx] = useState(0)
    // The order awards are revealed in (array of award ids); admin can reorder.
    const [revealOrder, setRevealOrder] = useState<string[]>([])
    // Inline editing of an award's name + description (one at a time).
    const [editDraft, setEditDraft] = useState<{ id: string; title: string; description: string } | null>(null)

    // --- Encore orchestration (runtime, ref-held so it survives re-renders) ---
    const encoreTimers = useRef<{ buildup?: ReturnType<typeof setTimeout>; voteEnd?: ReturnType<typeof setTimeout>; toQueue?: ReturnType<typeof setTimeout>; rebroadcast?: ReturnType<typeof setInterval> }>({})
    const encoreChannel = useRef<ReturnType<typeof awardsSupabase.channel> | null>(null)
    const encoreTally = useRef<Map<string, Record<string, number>>>(new Map())
    const encoreVoteStep = useRef<RevealStep | null>(null)
    const encoreContext = useRef<{ songs: EncoreSong[]; singers: Array<{ name: string; color?: string | null; guestId?: string | null }> } | null>(null)
    useEffect(() => () => clearEncoreTimers(), [])

    // Periodic refresh of votes, history, guests so admin sees a live tally
    const refresh = useCallback(async () => {
        if (!sessionId) return
        const awardIds = state.awards.map(a => a.id)
        const [v, h, g] = await Promise.all([
            fetchVotesForAwards(awardIds),
            fetchPlayedHistory(sessionId),
            fetchGuests(sessionId)
        ])
        setVotes(v); setHistory(h); setGuests(g)
    }, [sessionId, state.awards.map(a => a.id).join(',')])

    useEffect(() => {
        refresh()
        const t = setInterval(refresh, REFRESH_MS)
        return () => clearInterval(t)
    }, [refresh])

    // `revealOrder` holds the admin's MANUAL order and stays empty until they
    // reorder. While empty we fall back to the vote-driven default order
    // (computed in render below). Reconciliation against added/removed awards
    // also happens in render, so no sync effect is needed here.

    if (!sessionId) {
        return (
            <Card style={{ textAlign: 'center', color: 'var(--adm-text-3)', fontSize: 13.5 }}>
                Start or resume a session to enable awards.
            </Card>
        )
    }

    const guestNameById = new Map(guests.map(g => [g.id, g.name]))

    const candidatesFor = (subjectType: AwardSubjectType): AwardCandidate[] =>
        buildCandidates({ subjectType, history, guests })

    const tallies = state.awards.map(a => ({
        award: a,
        candidates: candidatesFor(a.subjectType),
        tally: computeTally(a, votes.filter(v => v.awardId === a.id), candidatesFor(a.subjectType))
    }))
    const talliesById = new Map(tallies.map(t => [t.award.id, t]))
    const currentAwardIds = state.awards.map(a => a.id)

    // Default reveal order: custom awards from least- to most-voted (the show
    // builds toward the crowd favorites), then the three house awards in
    // ceremony order (Best Duo/Group → Singer of the Night → Best Performance).
    const defaultOrderIds = [
        ...tallies
            .filter(t => !t.award.isDefault)
            .sort((a, b) =>
                a.tally.totalBallots - b.tally.totalBallots ||
                a.award.createdAt.localeCompare(b.award.createdAt))
            .map(t => t.award.id),
        ...tallies
            .filter(t => t.award.isDefault)
            .sort((a, b) =>
                DEFAULT_REVEAL_SLUG_ORDER.indexOf(a.award.slug ?? '') -
                DEFAULT_REVEAL_SLUG_ORDER.indexOf(b.award.slug ?? ''))
            .map(t => t.award.id),
    ]

    // The admin's manual order wins once set; otherwise use the default above.
    // When set, reconcile against the live award list: drop deleted awards and
    // append any newly-created ones at the end.
    const customOrder = revealOrder.filter(id => currentAwardIds.includes(id))
    const effectiveOrderIds = customOrder.length
        ? [...customOrder, ...currentAwardIds.filter(id => !customOrder.includes(id))]
        : defaultOrderIds

    const orderedTallies = effectiveOrderIds
        .map(id => talliesById.get(id))
        .filter((t): t is typeof tallies[number] => !!t)

    // Best Performance always closes the show, regardless of the admin's order.
    const orderedForReveal = [
        ...orderedTallies.filter(t => t.award.slug !== 'best-performance'),
        ...orderedTallies.filter(t => t.award.slug === 'best-performance'),
    ]

    const buildRevealItems = (): RevealSequenceItem[] =>
        orderedForReveal.map(({ award, tally }) => ({
            award,
            finalists: tally.finalists
                .filter(s => s.candidate)
                .map(s => ({
                    candidate: s.candidate as AwardCandidate,
                    score: s.score,
                    firstPlaceVotes: s.firstPlaceVotes,
                    totalVotes: s.totalVotes,
                    songs: award.subjectType === 'singer'
                        ? buildFinalistSongs(history, s.candidate as AwardCandidate)
                        : undefined
                })),
            winnerKey: tally.winner?.candidate?.subjectKey ?? null,
            winnerStats: tally.winner
                ? { score: tally.winner.score, firstPlaceVotes: tally.winner.firstPlaceVotes, totalVotes: tally.winner.totalVotes }
                : null
        }))

    // pushStep does NOT restamp startedAt (used for live encore-vote totals so
    // the stage doesn't re-mount); broadcastStep restamps so entrances replay.
    const pushStep = (step: RevealStep) => {
        dispatch({ type: 'SET_REVEAL_STEP', payload: step })
        if (sessionId) sendRevealStepBroadcast(sessionId, step)
    }
    const broadcastStep = (step: RevealStep) => pushStep({ ...step, startedAt: new Date().toISOString() })

    const handleStartReveal = async () => {
        if (revealStatus === 'running') return
        if (!sessionCode) return

        const items = buildRevealItems()
        const allResults = orderedForReveal.flatMap(({ award, tally }) =>
            buildPersistedResults({ award, tally, sessionId, sessionCode })
        )
        await window.electronAPI?.persistAwardResults(allResults)
        try { await getRevealBroadcastChannel(sessionId) } catch (e) { console.warn('[Awards] broadcast channel warmup failed:', e) }

        // Encore closer: 5 best-fit catalog songs for the Best Performance
        // winners, chosen from what they sang tonight (not random).
        const bestPerf = orderedForReveal.find(t => t.award.slug === 'best-performance')
        const bpSingers = bestPerf?.tally.winner?.candidate?.singers ?? []
        const encoreCatalog: any[] = (await window.electronAPI?.listCatalog()) || []
        const encoreSongs = pickEncoreSongs(history, bpSingers, encoreCatalog, 5)
        const encoreViable = encoreSongs.length > 0 && bpSingers.length > 0
        encoreContext.current = encoreViable ? { songs: encoreSongs, singers: bpSingers } : null

        const slides = buildRevealStoryboard(items, encoreViable ? { songs: encoreSongs } : undefined)
        setStoryboard(slides)
        setSlideIdx(0)
        setRevealStatus('running')
        if (slides.length) broadcastStep(slides[0])
    }

    const clearEncoreTimers = () => {
        const t = encoreTimers.current
        if (t.buildup) clearTimeout(t.buildup)
        if (t.voteEnd) clearTimeout(t.voteEnd)
        if (t.toQueue) clearTimeout(t.toQueue)
        if (t.rebroadcast) clearInterval(t.rebroadcast)
        encoreTimers.current = {}
        if (encoreChannel.current) { awardsSupabase.removeChannel(encoreChannel.current); encoreChannel.current = null }
    }

    const computeEncoreTotals = (): Record<string, number> => {
        const totals: Record<string, number> = {}
        encoreTally.current.forEach(counts => {
            for (const k in counts) totals[k] = (totals[k] || 0) + (counts[k] || 0)
        })
        return totals
    }

    // Live tap-vote: subscribe to per-guest tallies, re-broadcast running totals
    // to the stage every second, and pick the winner after 45s.
    const startEncoreVote = (voteStep: RevealStep) => {
        encoreTally.current = new Map()
        const fixed: RevealStep = { ...voteStep, startedAt: new Date().toISOString(), encoreEndsAt: Date.now() + ENCORE_VOTE_MS, encoreTotals: {} }
        encoreVoteStep.current = fixed
        pushStep(fixed)
        const ch = awardsSupabase.channel('encore-' + sessionId)
        ch.on('broadcast', { event: 'encore-tally' }, (pl: { payload?: { guestId?: string; counts?: Record<string, number> } }) => {
            const p = pl?.payload || {}
            if (p.guestId && p.counts) encoreTally.current.set(p.guestId, p.counts)
        }).subscribe()
        encoreChannel.current = ch
        encoreTimers.current.rebroadcast = setInterval(() => {
            if (!encoreVoteStep.current) return
            const next = { ...encoreVoteStep.current, encoreTotals: computeEncoreTotals() }
            encoreVoteStep.current = next
            pushStep(next)
        }, 1000)
        encoreTimers.current.voteEnd = setTimeout(finishEncore, ENCORE_VOTE_MS)
    }

    const finishEncore = () => {
        if (encoreTimers.current.rebroadcast) clearInterval(encoreTimers.current.rebroadcast)
        if (encoreChannel.current) { awardsSupabase.removeChannel(encoreChannel.current); encoreChannel.current = null }
        const totals = computeEncoreTotals()
        const songs = encoreContext.current?.songs ?? encoreVoteStep.current?.encoreSongs ?? []
        let winner: EncoreSong | undefined = songs[0]
        let max = -1
        for (const s of songs) { const v = totals[s.id] || 0; if (v > max) { max = v; winner = s } }
        broadcastStep({ phase: 'encore-winner', awardIndex: 0, totalAwards: 0, encoreWinner: winner, encoreTotals: totals, encoreSongs: songs, startedAt: '' })
        encoreTimers.current.toQueue = setTimeout(() => queueEncoreWinner(winner), ENCORE_WINNER_MS)
    }

    // Drop the winning song at the FRONT of the queue with the Best Performance
    // winners as the singers, then return to the normal stage.
    const queueEncoreWinner = async (winner?: EncoreSong) => {
        try {
            if (winner) {
                const catalog: any[] = (await window.electronAPI?.listCatalog()) || []
                const song = catalog.find(c => c.trackId === winner.id)
                if (song) {
                    const ctxSingers = encoreContext.current?.singers ?? []
                    const roleCount = (song.roles || []).length
                    const singers: Singer[] = ctxSingers.map((s, i) => ({
                        id: i,
                        name: s.name,
                        color: s.color || NEON_COLORS[i % NEON_COLORS.length].color,
                        colorGlow: NEON_COLORS[i % NEON_COLORS.length].colorGlow,
                        micDeviceId: '',
                        vocalTrack: i === 0 ? 'lead' : 'backing',
                        roleIndices: roleCount ? [Math.min(i, roleCount - 1)] : [],
                        guestId: s.guestId || undefined,
                    }))
                    const track = {
                        id: song.trackId, name: song.name, artists: [{ name: song.artist }],
                        album: { name: song.albumName || '', images: song.artUrl ? [{ url: song.artUrl, width: 640, height: 640 }] : [] },
                        duration_ms: song.durationMs || 0, uri: 'spotify:track:' + song.trackId,
                    }
                    const item: QueueItem = {
                        id: song.trackId + '-' + Date.now(),
                        track, lyrics: song.lyrics || [], roles: song.roles || [], singers,
                        voiceEffects: song.voiceEffects || null,
                        stemsPath: { instrumental: song.instrumentalPath, vocals: song.vocalsPath },
                        songPath: null, backgroundVideoPath: song.youtubeUrl || null,
                        stageTheme: null, isHidden: false, locked: true, score: 0, bonusPoints: 0,
                        createdAt: new Date().toISOString(),
                    }
                    dispatch({ type: 'ENQUEUE_SONG', payload: item })
                    window.electronAPI?.pushLocalQueueItem({
                        trackId: track.id, trackName: track.name, trackArtist: song.artist,
                        trackArtUrl: song.artUrl || null, trackDurationMs: song.durationMs || 0,
                        singerConfigs: singers.map(s => {
                            const c: Record<string, unknown> = { color: s.color, colorGlow: s.colorGlow, roleIndices: s.roleIndices }
                            if (s.guestId) c.guestId = s.guestId; else c.name = s.name
                            return c
                        }),
                    }).then((r) => { if (r && r.id) dispatch({ type: 'SET_QUEUE_ITEM_REMOTE_ID', payload: { itemId: item.id, remoteQueueId: r.id } }) })
                      .catch((e) => console.warn('[Encore] queue sync failed:', e))
                }
            }
        } catch (e) { console.warn('[Encore] queue winner failed:', e) }
        handleEndReveal()
    }

    const goToSlide = (idx: number) => {
        if (idx < 0 || idx >= storyboard.length) return
        clearEncoreTimers()
        setSlideIdx(idx)
        const step = storyboard[idx]
        if (step.phase === 'encore-vote') {
            startEncoreVote(step)
        } else {
            broadcastStep(step)
            if (step.phase === 'encore-buildup') {
                encoreTimers.current.buildup = setTimeout(() => goToSlide(idx + 1), ENCORE_BUILDUP_MS)
            }
        }
    }

    const handleEndReveal = () => {
        clearEncoreTimers()
        setRevealStatus('idle')
        setStoryboard([])
        setSlideIdx(0)
        dispatch({ type: 'SET_REVEAL_STEP', payload: null })
        if (sessionId) sendRevealStepBroadcast(sessionId, { phase: 'idle', awardIndex: 0, totalAwards: 0, startedAt: new Date().toISOString() })
    }

    // Reorder from whatever is currently displayed — on the first move this
    // captures the vote-driven default order, after which it's the admin's own.
    const moveReveal = (idx: number, dir: -1 | 1) => {
        const next = effectiveOrderIds.slice()
        const j = idx + dir
        if (j < 0 || j >= next.length) return
        ;[next[idx], next[j]] = [next[j], next[idx]]
        setRevealOrder(next)
    }

    const handleUnfinalize = async () => {
        if (!confirm('Reopen voting and clear stored winners?')) return
        const awardIds = state.awards.map(a => a.id)
        await window.electronAPI?.unfinalizeAwards(awardIds)
        refresh()
    }

    const handleDeleteAward = async (award: Award) => {
        if (!confirm(`Permanently delete "${award.title}"?\nThis removes all votes for this award.`)) return
        const result = await window.electronAPI?.deleteAward(award.id)
        if (result?.error) {
            alert(`Failed to delete award: ${result.error}`)
            return
        }
        dispatch({ type: 'REMOVE_AWARD', payload: award.id })
        refresh()
    }

    // Edit an award's name + description (works for both default and custom
    // awards). Saves through the karaoke:update-award IPC and updates state
    // optimistically; the reveal ceremony reads title/description from state.
    const startEditAward = (award: Award) =>
        setEditDraft({ id: award.id, title: award.title, description: award.description })
    const cancelEditAward = () => setEditDraft(null)
    const saveEditAward = async (award: Award) => {
        if (!editDraft || editDraft.id !== award.id) return
        const title = editDraft.title.trim()
        const description = editDraft.description.trim()
        if (title.length < 2) { alert('Award name must be at least 2 characters.'); return }
        dispatch({ type: 'UPSERT_AWARD', payload: { ...award, title, description } })
        setEditDraft(null)
        const res = await window.electronAPI?.updateAward(award.id, { title, description })
        if (res?.error) {
            alert(`Failed to save award: ${res.error}`)
            refresh()
        }
    }

    // Bump a candidate's manual score adjustment by +/- 1 point. Persists the
    // whole adjustments map (keyed by subjectKey) and updates state optimistically.
    const adjustScore = async (award: Award, subjectKey: string, delta: number) => {
        const next = { ...(award.scoreAdjustments || {}) }
        const v = (next[subjectKey] || 0) + delta
        if (v === 0) delete next[subjectKey]
        else next[subjectKey] = v
        dispatch({ type: 'UPSERT_AWARD', payload: { ...award, scoreAdjustments: next } })
        const res = await window.electronAPI?.setAwardAdjustments(award.id, next)
        if (res?.error) {
            alert(`Failed to adjust score: ${res.error}`)
            refresh()
        }
    }

    const finalized = state.awards.some(a => a.finalizedAt)
    const totalVotes = votes.length

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Toolbar */}
            <Card pad={false} style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 14.5 }}>
                        Awards Overview
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--adm-text-2)', marginTop: 2 }}>
                        {state.awards.length} award{state.awards.length === 1 ? '' : 's'} · {totalVotes} ranked vote{totalVotes === 1 ? '' : 's'} cast · {history.length} performance{history.length === 1 ? '' : 's'} played
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--adm-text-3)', marginTop: 2 }}>
                        Scoring: 1st place = 3 pts · 2nd = 2 · 3rd = 1
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button size="sm" icon="restart" onClick={refresh}>Refresh</Button>
                    {revealStatus === 'idle' ? (
                        <Button
                            variant="primary"
                            icon="monitor"
                            onClick={handleStartReveal}
                            disabled={state.awards.length === 0}
                        >
                            {finalized ? 'Replay Reveal on Stage' : 'Start Reveal on Stage'}
                        </Button>
                    ) : (
                        <Button variant="danger" onClick={handleEndReveal}>End Reveal</Button>
                    )}
                    {finalized && revealStatus === 'idle' && (
                        <Button size="sm" onClick={handleUnfinalize}>Reopen Voting</Button>
                    )}
                </div>
            </Card>

            {/* Reveal control panel — admin paces the show with Prev/Next so each
                winner can give a speech before advancing. */}
            {revealStatus === 'running' && (() => {
                const current = storyboard[slideIdx]
                const onWinner = current?.phase === 'winner' && (current?.winners?.length ?? 0) > 0
                return (
                    <Card style={{
                        borderColor: 'rgba(245,165,36,0.45)',
                        boxShadow: 'var(--adm-card-shadow), 0 0 28px -10px var(--adm-amber-glow)',
                        display: 'flex', flexDirection: 'column', gap: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="adm-led adm-led--on" />
                                    <span style={{ fontFamily: 'var(--adm-display)', fontWeight: 700, fontSize: 15 }}>
                                        On stage now · <span className="adm-mono">{slideIdx + 1} / {storyboard.length}</span>
                                    </span>
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--adm-text-2)', marginTop: 3 }}>
                                    {current ? describeRevealSlide(current) : ''}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Button onClick={() => goToSlide(slideIdx - 1)} disabled={slideIdx === 0}>Back</Button>
                                <Button
                                    variant="primary"
                                    onClick={() => goToSlide(slideIdx + 1)}
                                    disabled={slideIdx >= storyboard.length - 1}
                                    icon="chevronRight"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                        {onWinner && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                fontSize: 12.5, color: 'var(--adm-text)',
                                background: 'var(--adm-amber-soft)', border: '1px solid rgba(245,165,36,0.35)',
                                borderRadius: 'var(--adm-r-sm)', padding: '8px 12px',
                            }}>
                                <Icon name="mic" size={14} style={{ color: 'var(--adm-amber-bright)' }} />
                                <span>
                                    The main mic is live for the winner's speech. Tap <strong>Next</strong> when they're done.
                                    {!state.micSlots?.[0]?.micDeviceId && ' (No main mic configured in Controls — assign mic slot 1 to enable it.)'}
                                </span>
                            </div>
                        )}
                    </Card>
                )
            })()}

            {/* Reveal running order — reorder before starting the show. */}
            {revealStatus === 'idle' && orderedTallies.length > 0 && (
                <Card pad={false} style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 13.5 }}>
                        Reveal running order
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', marginBottom: 2 }}>
                        Awards are revealed top to bottom. By default, custom awards run from least to most voted, then the house awards. Reorder to set your own pacing. Best Performance always closes the show, followed by the live Encore.
                    </div>
                    {orderedTallies.map(({ award }, i) => (
                        <div key={award.id} className="adm-well" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px' }}>
                            <span className="adm-mono" style={{ width: 22, textAlign: 'center', fontWeight: 600, color: 'var(--adm-text-3)', fontSize: 12 }}>{i + 1}</span>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{award.title}</span>
                            <IconButton icon="arrowUp" size={26} title="Move up" onClick={() => moveReveal(i, -1)} disabled={i === 0} />
                            <IconButton icon="arrowDown" size={26} title="Move down" onClick={() => moveReveal(i, 1)} disabled={i === orderedTallies.length - 1} />
                        </div>
                    ))}
                </Card>
            )}

            {/* Live tallies grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 14 }}>
                {tallies.map(({ award, candidates, tally }) => {
                    const subjectLabel = award.subjectType === 'performance'
                        ? 'Performance'
                        : award.subjectType === 'singer' ? 'Singer' : 'Group'
                    const featuredSvg = award.iconId ? FEATURED_SVGS[award.iconId] : undefined
                    const ranked = tally.standings.filter(s => s.score !== 0 || s.totalVotes > 0)
                    const ballotsOpen = !!expandedBallots[award.id]
                    const isEditing = editDraft?.id === award.id
                    return (
                        <Card key={award.id} pad={false} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 9, padding: 6, flexShrink: 0,
                                    background: 'var(--adm-card-2)', border: '1px solid var(--adm-line)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--adm-amber-bright)',
                                }}>
                                    {(() => {
                                        if (award.iconDataUrl) {
                                            return <img src={award.iconDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                                        }
                                        if (featuredSvg) {
                                            return <span style={{ width: '100%', height: '100%', display: 'block' }} dangerouslySetInnerHTML={{ __html: featuredSvg.replace('<svg ', '<svg style="width:100%;height:100%;fill:currentColor" ') }} />
                                        }
                                        const cdn = award.iconId ? awardIconCdnUrl(award.iconId) : null
                                        if (cdn) {
                                            return <span style={{
                                                width: '100%', height: '100%',
                                                background: 'currentColor',
                                                WebkitMaskImage: 'url(' + cdn + ')',
                                                maskImage: 'url(' + cdn + ')',
                                                WebkitMaskSize: 'contain', maskSize: 'contain',
                                                WebkitMaskPosition: 'center', maskPosition: 'center',
                                                WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                                                display: 'block'
                                            }} />
                                        }
                                        return <Icon name="trophy" size={20} />
                                    })()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {isEditing ? (
                                        <Input
                                            value={editDraft!.title}
                                            onChange={e => setEditDraft(d => d ? { ...d, title: e.target.value } : d)}
                                            maxLength={AWARD_TITLE_MAX}
                                            placeholder="Award name"
                                            style={{ fontWeight: 650, fontSize: 13.5, padding: '6px 9px' }}
                                        />
                                    ) : (
                                        <div style={{ fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {award.title}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 11, color: 'var(--adm-text-3)', marginTop: isEditing ? 4 : 1 }}>
                                        {subjectLabel} · {award.isDefault ? 'Default' : 'Custom'}{award.finalizedAt ? ' · Finalized' : ''} · {tally.totalBallots} voter{tally.totalBallots === 1 ? '' : 's'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                    {isEditing ? (
                                        <>
                                            <Button variant="primary" size="sm" title="Save changes" onClick={() => saveEditAward(award)}>Save</Button>
                                            <Button size="sm" title="Discard changes" onClick={cancelEditAward}>Cancel</Button>
                                        </>
                                    ) : (
                                        <>
                                            <IconButton icon="pencil" size={28} title="Edit name & description" onClick={() => startEditAward(award)} />
                                            {!award.isDefault && (
                                                <IconButton icon="trash" size={28} danger title="Delete custom award" onClick={() => handleDeleteAward(award)} />
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {isEditing && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <TextArea
                                        value={editDraft!.description}
                                        onChange={e => setEditDraft(d => d ? { ...d, description: e.target.value.slice(0, AWARD_DESCRIPTION_MAX) } : d)}
                                        maxLength={AWARD_DESCRIPTION_MAX}
                                        rows={3}
                                        placeholder="Description (read aloud during the reveal)"
                                    />
                                    <div className="adm-mono" style={{ fontSize: 10, color: 'var(--adm-text-3)', textAlign: 'right' }}>
                                        {editDraft!.description.length}/{AWARD_DESCRIPTION_MAX}
                                    </div>
                                </div>
                            )}

                            {/* Standings */}
                            {ranked.length === 0 ? (
                                <div style={{ fontSize: 12, color: 'var(--adm-text-3)', padding: '8px 0' }}>
                                    {candidates.length === 0 ? 'No eligible candidates yet' : 'No votes cast yet'}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {ranked.map((entry, i) => {
                                        const isWinner = tally.winner?.subjectKey === entry.subjectKey
                                        const label = entry.candidate?.label || '(deleted)'
                                        return (
                                            <div key={entry.subjectKey} style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '6px 10px', borderRadius: 'var(--adm-r-sm)',
                                                background: isWinner ? 'var(--adm-amber-soft)' : 'var(--adm-well)',
                                                border: isWinner ? '1px solid rgba(245,165,36,0.45)' : '1px solid var(--adm-line-faint)',
                                            }}>
                                                <span className="adm-mono" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--adm-text-3)', width: 18, textAlign: 'center' }}>
                                                    {i + 1}
                                                </span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: 5,
                                                        fontSize: 13, fontWeight: isWinner ? 650 : 500,
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {isWinner && <Icon name="trophy" size={12} style={{ color: 'var(--adm-amber-bright)' }} />}
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                                                    </div>
                                                    <div className="adm-mono" style={{ fontSize: 10, color: 'var(--adm-text-3)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                        <span>1st×{entry.firstPlaceVotes}</span>
                                                        <span>2nd×{entry.secondPlaceVotes}</span>
                                                        <span>3rd×{entry.thirdPlaceVotes}</span>
                                                        {entry.adjustment !== 0 && (
                                                            <span style={{ color: 'var(--adm-amber-bright)', fontWeight: 600 }}>
                                                                {entry.adjustment > 0 ? '+' : ''}{entry.adjustment} adj
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* +/- score adjustment */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <IconButton icon="minus" size={24} title="Subtract a point" onClick={() => adjustScore(award, entry.subjectKey, -1)} />
                                                    <span className="adm-mono" style={{ fontSize: 14, fontWeight: 600, minWidth: 26, textAlign: 'center' }}>
                                                        {entry.score}
                                                    </span>
                                                    <IconButton icon="plus" size={24} title="Add a point" onClick={() => adjustScore(award, entry.subjectKey, +1)} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {/* Allow nudging candidates that have no score yet (manual award). */}
                                    {candidates.length > ranked.length && (
                                        <AddPointPicker
                                            candidates={candidates.filter(c => !ranked.some(r => r.subjectKey === c.subjectKey))}
                                            onAdd={(key) => adjustScore(award, key, +1)}
                                        />
                                    )}
                                </div>
                            )}

                            {/* Ballots */}
                            {tally.totalBallots > 0 && (
                                <div>
                                    <button
                                        onClick={() => setExpandedBallots(s => ({ ...s, [award.id]: !s[award.id] }))}
                                        style={{
                                            fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--adm-body)',
                                            color: 'var(--adm-text-2)', background: 'transparent', border: 'none', cursor: 'pointer',
                                            padding: '4px 0', display: 'flex', alignItems: 'center', gap: 5,
                                        }}
                                    >
                                        <span style={{ display: 'inline-flex', transform: ballotsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}>
                                            <Icon name="chevronRight" size={11} />
                                        </span>
                                        {ballotsOpen ? 'Hide' : 'Show'} individual ballots ({tally.totalBallots})
                                    </button>
                                    {ballotsOpen && (
                                        <div className="adm-scroll" style={{ maxHeight: 220, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                            {groupBallots(award, votes.filter(v => v.awardId === award.id), candidates).map(b => (
                                                <div key={b.voterGuestId} className="adm-well" style={{ padding: '6px 10px' }}>
                                                    <div style={{ fontSize: 12, fontWeight: 650, marginBottom: 2 }}>
                                                        {guestNameById.get(b.voterGuestId) || 'Guest ' + b.voterGuestId.slice(0, 4)}
                                                    </div>
                                                    <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                        {b.picks.map(p => (
                                                            <span key={p.rank}>
                                                                <span className="adm-mono" style={{ color: p.rank === 1 ? 'var(--adm-amber-bright)' : 'var(--adm-text-3)' }}>
                                                                    {RANK_LABELS[p.rank - 1] || p.rank + ')'}
                                                                </span>
                                                                {' '}{p.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    )
                })}
            </div>

            {state.awards.length === 0 && (
                <Card style={{ textAlign: 'center', color: 'var(--adm-text-3)', fontSize: 13, padding: 32 }}>
                    No awards yet. Default awards seed automatically when the session opens.
                    Guests can create custom awards from the companion site.
                </Card>
            )}
        </div>
    )
}

// Group a session's award votes by voter into ranked ballots, resolving each
// pick to its candidate label.
function groupBallots(
    award: Award,
    votes: AwardVote[],
    candidates: AwardCandidate[]
): Array<{ voterGuestId: string; picks: Array<{ rank: number; label: string }> }> {
    const byKey = new Map<string, AwardCandidate>()
    for (const c of candidates) { byKey.set(c.subjectKey, c); }
    const byVoter = new Map<string, Array<{ rank: number; label: string }>>()
    for (const v of votes) {
        const key = award.subjectType === 'singer' ? v.subjectGuestId : v.subjectQueueRowId
        if (!key) continue
        const cand = byKey.get(key) || byKey.get('name:' + key)
        const label = cand?.label || '(removed)'
        const list = byVoter.get(v.voterGuestId) || []
        list.push({ rank: v.rank || 1, label })
        byVoter.set(v.voterGuestId, list)
    }
    return Array.from(byVoter.entries()).map(([voterGuestId, picks]) => ({
        voterGuestId,
        picks: picks.sort((a, b) => a.rank - b.rank)
    }))
}

// A tiny dropdown to grant a starting point to a candidate that has no votes —
// lets the admin manually seat a finalist that polling missed.
function AddPointPicker({ candidates, onAdd }: {
    candidates: AwardCandidate[]
    onAdd: (subjectKey: string) => void
}) {
    const [open, setOpen] = useState(false)
    if (candidates.length === 0) return null
    return (
        <div style={{ marginTop: 2 }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--adm-body)', color: 'var(--adm-text-3)',
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0',
                    display: 'flex', alignItems: 'center', gap: 5,
                }}
            >
                <span style={{ display: 'inline-flex', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}>
                    <Icon name="chevronRight" size={11} />
                </span>
                Add points to another candidate
            </button>
            {open && (
                <div className="adm-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, maxHeight: 160 }}>
                    {candidates.map(c => (
                        <button
                            key={c.subjectKey}
                            onClick={() => { onAdd(c.subjectKey); setOpen(false) }}
                            className="adm-well"
                            style={{
                                textAlign: 'left', fontSize: 12, color: 'var(--adm-text)', fontFamily: 'var(--adm-body)',
                                padding: '5px 10px', cursor: 'pointer',
                            }}
                        >+1 · {c.label}</button>
                    ))}
                </div>
            )}
        </div>
    )
}
