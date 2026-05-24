import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { FEATURED_SVGS, awardIconCdnUrl } from './icons/manifest'
import {
    Award,
    AwardCandidate,
    AwardVote,
    AwardSubjectType,
    RevealStep
} from './types'
import {
    buildCandidates,
    computeTally,
    fetchVotesForAwards,
    fetchPlayedHistory,
    fetchGuests,
    buildPersistedResults,
    runRevealSequence,
    PlayedPerformance,
    KnownGuest,
    RevealSequenceItem
} from './AwardsManager'

const REFRESH_MS = 4000

export function AdminAwardsTab() {
    const { state, dispatch } = useApp()
    const theme = useTheme()
    const sessionId = state.karaokeSessionId
    const sessionCode = state.karaokeSessionCode
    const [votes, setVotes] = useState<AwardVote[]>([])
    const [history, setHistory] = useState<PlayedPerformance[]>([])
    const [guests, setGuests] = useState<KnownGuest[]>([])
    const [revealStatus, setRevealStatus] = useState<'idle' | 'running'>('idle')
    const sequenceRef = useRef<{ cancel: () => void } | null>(null)

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

    if (!sessionId) {
        return (
            <div style={{ ...theme.card, border: theme.border, padding: 24, textAlign: 'center', color: theme.faint }}>
                Start or resume a session to enable awards.
            </div>
        )
    }

    const candidatesFor = (subjectType: AwardSubjectType): AwardCandidate[] =>
        buildCandidates({ subjectType, history, guests })

    const tallies = state.awards.map(a => ({
        award: a,
        tally: computeTally(a, votes.filter(v => v.awardId === a.id), candidatesFor(a.subjectType))
    }))

    const handleRevealClick = async () => {
        if (revealStatus === 'running') return
        if (!sessionCode) return

        const items: RevealSequenceItem[] = tallies.map(({ award, tally }) => ({
            award,
            candidates: candidatesFor(award.subjectType),
            winners: tally.winners,
            voteCount: tally.byCandidate[0]?.count ?? 0
        }))

        // Persist results immediately so they survive a refresh / replay
        const allResults = tallies.flatMap(({ award, tally }) =>
            buildPersistedResults({ award, tally, sessionId, sessionCode })
        )
        await window.electronAPI?.persistAwardResults(allResults)

        setRevealStatus('running')
        sequenceRef.current = runRevealSequence({
            items,
            onBroadcast: async (step: RevealStep) => {
                // Drive local stage immediately via IPC state relay — the stage
                // window picks this up regardless of whether the supabase
                // broadcast succeeds.
                dispatch({ type: 'SET_REVEAL_STEP', payload: step })
                // Fire-and-forget the supabase broadcast so a slow / failed
                // send to companion phones never stalls the on-stage sequence.
                window.electronAPI?.broadcastRevealStep(step).catch(e =>
                    console.warn('[Awards] reveal broadcast failed:', e)
                )
            },
            onComplete: () => {
                setRevealStatus('idle')
                dispatch({ type: 'SET_REVEAL_STEP', payload: null })
                window.electronAPI?.broadcastRevealStep({ phase: 'idle', awardIndex: 0, totalAwards: 0, startedAt: new Date().toISOString() }).catch(() => {})
            }
        })
    }

    const handleCancelReveal = () => {
        sequenceRef.current?.cancel()
        sequenceRef.current = null
        setRevealStatus('idle')
        dispatch({ type: 'SET_REVEAL_STEP', payload: null })
        window.electronAPI?.broadcastRevealStep({ phase: 'idle', awardIndex: 0, totalAwards: 0, startedAt: new Date().toISOString() })
    }

    const handleUnfinalize = async () => {
        if (!confirm('Reopen voting and clear stored winners?')) return
        const awardIds = state.awards.map(a => a.id)
        await window.electronAPI?.unfinalizeAwards(awardIds)
        refresh()
    }

    const handleDeleteAward = async (award: Award) => {
        if (!confirm(`Permanently delete "${award.title}"?\nThis removes all votes for this award.`)) return
        await window.electronAPI?.deleteAward(award.id)
        refresh()
    }

    const finalized = state.awards.some(a => a.finalizedAt)
    const totalVotes = votes.length

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Toolbar */}
            <div style={{ ...theme.card, border: theme.border, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 14, color: theme.black }}>
                        Awards Overview
                    </div>
                    <div style={{ fontSize: 12, color: theme.faint, fontFamily: theme.fontBody }}>
                        {state.awards.length} award{state.awards.length === 1 ? '' : 's'} · {totalVotes} vote{totalVotes === 1 ? '' : 's'} cast · {history.length} performance{history.length === 1 ? '' : 's'} played
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        onClick={refresh}
                        style={{
                            padding: '8px 14px', fontSize: 12, fontWeight: 700, fontFamily: theme.fontDisplay,
                            cursor: 'pointer', border: theme.border, borderRadius: theme.radius,
                            background: theme.cream, color: theme.black
                        }}
                    >Refresh</button>
                    {revealStatus === 'idle' ? (
                        <button
                            onClick={handleRevealClick}
                            disabled={state.awards.length === 0}
                            style={{
                                padding: '10px 18px', fontSize: 13, fontWeight: 800, fontFamily: theme.fontDisplay,
                                cursor: state.awards.length === 0 ? 'not-allowed' : 'pointer',
                                border: theme.border, borderRadius: theme.radius,
                                background: theme.accentB, color: '#1A1A1A',
                                opacity: state.awards.length === 0 ? 0.6 : 1,
                                letterSpacing: 0.5
                            }}
                        >{finalized ? 'Replay Reveal on Stage' : 'Reveal Awards on Stage'}</button>
                    ) : (
                        <button
                            onClick={handleCancelReveal}
                            style={{
                                padding: '10px 18px', fontSize: 13, fontWeight: 800, fontFamily: theme.fontDisplay,
                                cursor: 'pointer', border: theme.border, borderRadius: theme.radius,
                                background: '#FF4D6D', color: '#fff', letterSpacing: 0.5
                            }}
                        >Cancel Reveal</button>
                    )}
                    {finalized && revealStatus === 'idle' && (
                        <button
                            onClick={handleUnfinalize}
                            style={{
                                padding: '8px 14px', fontSize: 12, fontWeight: 700, fontFamily: theme.fontDisplay,
                                cursor: 'pointer', border: theme.border, borderRadius: theme.radius,
                                background: theme.cream, color: theme.black
                            }}
                        >Reopen Voting</button>
                    )}
                </div>
            </div>

            {/* Live tallies grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
                {tallies.map(({ award, tally }) => {
                    const candidates = candidatesFor(award.subjectType)
                    const subjectLabel = award.subjectType === 'performance'
                        ? 'Performance'
                        : award.subjectType === 'singer' ? 'Singer' : 'Group'
                    const featuredSvg = award.iconId ? FEATURED_SVGS[award.iconId] : undefined
                    return (
                        <div key={award.id} style={{ ...theme.card, border: theme.border, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: theme.radiusSmall, background: theme.creamDark, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.black }}>
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
                                        return <span style={{ fontSize: 22 }}>🏆</span>
                                    })()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 15, color: theme.black, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {award.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: theme.faint, fontFamily: theme.fontBody }}>
                                        {subjectLabel} · {award.isDefault ? 'Default' : 'Custom'}{award.finalizedAt ? ' · Finalized' : ''}
                                    </div>
                                </div>
                                {!award.isDefault && (
                                    <button
                                        onClick={() => handleDeleteAward(award)}
                                        title="Delete custom award"
                                        style={{
                                            padding: '4px 10px', fontSize: 11, fontWeight: 700, fontFamily: theme.fontDisplay,
                                            cursor: 'pointer', border: theme.border, borderRadius: theme.radiusSmall,
                                            background: theme.cream, color: '#c33'
                                        }}
                                    >Delete</button>
                                )}
                            </div>

                            {tally.byCandidate.length === 0 ? (
                                <div style={{ fontSize: 12, color: theme.faint, padding: '8px 0' }}>
                                    {candidates.length === 0
                                        ? 'No eligible candidates yet'
                                        : 'No votes cast yet'}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {tally.byCandidate.slice(0, 5).map((entry, i) => {
                                        const isWinner = entry.count > 0 && entry.count === tally.byCandidate[0].count
                                        const label = entry.candidate?.label || '(deleted)'
                                        return (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '6px 10px', borderRadius: theme.radiusSmall,
                                                background: isWinner ? `${theme.accentA}24` : theme.creamDark,
                                                border: isWinner ? `1px solid ${theme.accentA}` : `1px solid transparent`
                                            }}>
                                                <span style={{ fontSize: 13, fontWeight: isWinner ? 700 : 500, color: theme.black, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {isWinner && '🏆 '}{label}
                                                </span>
                                                <span style={{ fontSize: 12, color: theme.black, fontWeight: 700, fontFamily: theme.fontDisplay }}>
                                                    {entry.count}
                                                </span>
                                            </div>
                                        )
                                    })}
                                    {tally.byCandidate.length > 5 && (
                                        <div style={{ fontSize: 11, color: theme.faint, textAlign: 'center' }}>
                                            + {tally.byCandidate.length - 5} more
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {state.awards.length === 0 && (
                <div style={{ ...theme.card, border: theme.border, padding: 32, textAlign: 'center', color: theme.faint }}>
                    No awards yet. Default awards seed automatically when the session opens.
                    Guests can create custom awards from the companion site.
                </div>
            )}
        </div>
    )
}
