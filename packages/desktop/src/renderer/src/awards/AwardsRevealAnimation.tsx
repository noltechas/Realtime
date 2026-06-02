import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FEATURED_SVGS, awardIconCdnUrl } from './icons/manifest'
import { Award, AwardCandidate, EncoreSong, RevealFinalist, RevealStep } from './types'
import '../styles/awards.css'

// Helper: render an award's icon. Tries (in order) uploaded photo, inlined
// featured SVG, then mask-image backed by the Iconify CDN.
function AwardIconBody({ award }: { award: Award }) {
    if (award.iconDataUrl) {
        return <img src={award.iconDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
    }
    const iconId = award.iconId
    if (!iconId) {
        return <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '100%', height: '100%' }}><path d="M6 9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4H6Zm-3 0V3h2v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V3h2v6a6 6 0 0 1-6 6h-1v3h3v2H8v-2h3v-3h-1a6 6 0 0 1-6-6Z"/></svg>
    }
    const inlined = FEATURED_SVGS[iconId]
    if (inlined) {
        return <span style={{ width: '100%', height: '100%', display: 'block' }} dangerouslySetInnerHTML={{ __html: inlined }} />
    }
    const url = awardIconCdnUrl(iconId)
    if (!url) return null
    return <span
        className="awards-icon-mask"
        style={{
            width: '100%', height: '100%',
            WebkitMaskImage: 'url(' + url + ')',
            maskImage: 'url(' + url + ')'
        }}
    />
}

// ---- Component -----------------------------------------------------------
interface Props {
    step: RevealStep | null
}

export function AwardsRevealAnimation({ step }: Props) {
    // Debug log so we can confirm in DevTools whether the step is arriving.
    useEffect(() => {
        if (step) console.log('[AwardsRevealAnimation] step:', step.phase, step.awardIndex, '/', step.totalAwards)
    }, [step])

    // Remember the most recent winner screen so the encore build-up can keep it
    // on stage (the "Encore!" words float BEHIND it) instead of cutting to a
    // bare screen. The last winner before the encore is Best Performance.
    const [lastWinner, setLastWinner] = useState<{
        award: Award; lineup: AwardCandidate[]; winners: AwardCandidate[]
        stats?: { score: number; firstPlaceVotes: number; totalVotes: number }
    } | null>(null)
    useEffect(() => {
        if (step?.phase === 'winner' && step.award && (step.winners?.length ?? 0) > 0) {
            setLastWinner({ award: step.award, lineup: step.lineup || [], winners: step.winners || [], stats: step.winnerStats })
        }
    }, [step])

    if (!step || step.phase === 'idle' || step.phase === 'done') {
        return null
    }
    // Portal to <body> so the overlay is never trapped inside an ancestor's
    // stacking context, overflow:hidden, or transform-induced containing block.
    return createPortal((
        <div className="awards-reveal" role="dialog" aria-label="Awards reveal">
            <div className="awards-reveal__spotlight" />
            {((step.phase === 'winner' && (step.winners?.length ?? 0) > 0) || step.phase === 'encore-winner') && <ConfettiBurst key={step.startedAt} />}
            {step.phase === 'opening' && <OpeningCard total={step.totalAwards} />}
            {step.phase === 'overview' && (
                <OverviewCard awards={step.overview || []} />
            )}
            {step.phase === 'intro' && step.award && (
                <IntroCard key={step.startedAt} award={step.award} awardIndex={step.awardIndex} total={step.totalAwards} />
            )}
            {step.phase === 'finalist' && step.award && step.finalist && (
                <FinalistCard key={step.startedAt} award={step.award} finalist={step.finalist} awardIndex={step.awardIndex} total={step.totalAwards} />
            )}
            {step.phase === 'lineup' && step.award && (
                <LineupCard award={step.award} lineup={step.lineup || []} />
            )}
            {step.phase === 'winner' && step.award && (
                <WinnerReveal
                    key={step.startedAt}
                    award={step.award}
                    lineup={step.lineup || []}
                    winners={step.winners || []}
                    stats={step.winnerStats}
                />
            )}
            {step.phase === 'finale' && <FinaleCard summary={step.finaleSummary || []} />}
            {step.phase === 'encore-buildup' && (
                <>
                    {/* "Encore!" words float behind the still-standing winner card. */}
                    <EncoreBuildup />
                    {lastWinner && (
                        <WinnerReveal
                            award={lastWinner.award}
                            lineup={lastWinner.lineup}
                            winners={lastWinner.winners}
                            stats={lastWinner.stats}
                            frozen
                        />
                    )}
                </>
            )}
            {step.phase === 'encore-vote' && (
                <EncoreVote songs={step.encoreSongs || []} totals={step.encoreTotals || {}} endsAt={step.encoreEndsAt} />
            )}
            {step.phase === 'encore-winner' && step.encoreWinner && (
                <EncoreWinner key={step.startedAt} winner={step.encoreWinner} totals={step.encoreTotals || {}} />
            )}
        </div>
    ), document.body)
}

// ---- Encore -------------------------------------------------------------

// Build-up: "Encore!" words multiply across the screen over ~10 seconds.
function EncoreBuildup() {
    const words = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: 3 + Math.random() * 90,
        top: 6 + Math.random() * 82,
        delay: Math.random() * 9,
        size: 1.6 + Math.random() * 3.6,   // vw
        rot: -14 + Math.random() * 28,
    })), [])
    return (
        <div className="awards-reveal__encore-buildup">
            {words.map(w => (
                <span key={w.id} className="awards-reveal__encore-word" style={{ left: w.left + '%', top: w.top + '%', transform: 'rotate(' + w.rot + 'deg)' }}>
                    <span className="awards-reveal__encore-word-in" style={{ animationDelay: w.delay.toFixed(2) + 's', fontSize: w.size.toFixed(2) + 'vw' }}>Encore!</span>
                </span>
            ))}
        </div>
    )
}

function EncoreArt({ song, className }: { song: EncoreSong; className: string }) {
    if (song.artUrl) return <img className={className} src={song.artUrl} alt="" />
    return <div className={className}>♪</div>
}

function EncoreCountdown({ endsAt }: { endsAt?: number }) {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 500)
        return () => clearInterval(t)
    }, [])
    const left = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0
    return <div className="awards-reveal__encore-timer">{left}s</div>
}

// Live vote: 5 songs with bars driven by the broadcast totals + 45s countdown.
function EncoreVote({ songs, totals, endsAt }: { songs: EncoreSong[]; totals: Record<string, number>; endsAt?: number }) {
    const max = Math.max(1, ...songs.map(s => totals[s.id] || 0))
    return (
        <div className="awards-reveal__encore-vote">
            <div className="awards-reveal__encore-eyebrow">Encore — Vote Now!</div>
            <div className="awards-reveal__encore-sub">Tap your phone to vote — the crowd favourite gets sung live</div>
            <EncoreCountdown endsAt={endsAt} />
            <div className="awards-reveal__encore-list">
                {songs.map(s => {
                    const v = totals[s.id] || 0
                    const pct = Math.round((v / max) * 100)
                    return (
                        <div key={s.id} className="awards-reveal__encore-row">
                            <EncoreArt song={s} className="awards-reveal__encore-row-art" />
                            <div className="awards-reveal__encore-row-meta">
                                <div className="awards-reveal__encore-track">{s.trackName}</div>
                                <div className="awards-reveal__encore-artist">{s.trackArtist}</div>
                                <div className="awards-reveal__encore-bar"><div className="awards-reveal__encore-bar-fill" style={{ width: pct + '%' }} /></div>
                            </div>
                            <div className="awards-reveal__encore-count">{v}</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function EncoreWinner({ winner, totals }: { winner: EncoreSong; totals: Record<string, number> }) {
    const v = totals[winner.id] || 0
    return (
        <div className="awards-reveal__encore-winnerwrap">
            <div className="awards-reveal__encore-eyebrow">The Encore</div>
            <EncoreArt song={winner} className="awards-reveal__encore-winner-art" />
            <div className="awards-reveal__encore-winner-track">{winner.trackName}</div>
            <div className="awards-reveal__encore-winner-artist">{winner.trackArtist}</div>
            <div className="awards-reveal__encore-winner-tag">{v} vote{v === 1 ? '' : 's'} · take the stage!</div>
        </div>
    )
}

// ---- Phase subcomponents -------------------------------------------------

function OpeningCard({ total }: { total: number }) {
    return (
        <div className="awards-reveal__opening">
            <div className="awards-reveal__opening-eyebrow">The Ceremony</div>
            <div className="awards-reveal__opening-title">Tonight's Awards</div>
            <div className="awards-reveal__opening-sub">{total} categor{total === 1 ? 'y' : 'ies'} to reveal</div>
        </div>
    )
}

// Per-award introduction: the award's logo, title, and its Oscar-style citation
// (description), shown before its finalists.
function IntroCard({ award, awardIndex, total }: { award: Award; awardIndex: number; total: number }) {
    return (
        <div className="awards-reveal__intro">
            <div className="awards-reveal__intro-eyebrow">Award {awardIndex + 1} of {total}</div>
            <AwardIconSlot award={award} />
            <div className="awards-reveal__intro-title">{award.title}</div>
            <div className="awards-reveal__intro-rule"><span>✦</span></div>
            {award.description ? (
                <div className="awards-reveal__intro-citation">{award.description}</div>
            ) : null}
        </div>
    )
}

function AwardIconSlot({ award }: { award: Award }) {
    return <div className="awards-reveal__award-icon"><AwardIconBody award={award} /></div>
}

// Overview of every award up for grabs tonight — each floating with its icon
// and name, evenly spread, before the ceremony goes through them one by one.
function OverviewCard({ awards }: { awards: Award[] }) {
    return (
        <div className="awards-reveal__overview">
            <div className="awards-reveal__overview-eyebrow">Tonight’s Categories</div>
            <div className="awards-reveal__overview-grid">
                {awards.map((a, i) => (
                    <div
                        key={a.id}
                        className="awards-reveal__overview-item"
                        style={{ animationDelay: ((i % 6) * 0.45).toFixed(2) + 's' }}
                    >
                        <AwardIconSlot award={a} />
                        <div className="awards-reveal__overview-name">{a.title}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// A circular face for a candidate: profile photo / album art, else initial.
function CandidateFace({ c, className }: { c: AwardCandidate; className: string }) {
    if (c.avatarUrl) return <img className={className} src={c.avatarUrl} alt="" />
    return <div className={className}>{(c.label || '?').charAt(0).toUpperCase()}</div>
}

// Row of member avatars for a performance / group candidate.
function SingerRow({ c }: { c: AwardCandidate }) {
    const singers = c.singers || []
    if (singers.length === 0) return null
    return (
        <div className="awards-reveal__members">
            <div className="awards-reveal__members-avatars">
                {singers.slice(0, 5).map((s, si) => (
                    <div key={si} className="awards-reveal__member-avatar"
                         style={{ background: s.color ? 'linear-gradient(135deg,' + s.color + ',' + s.color + 'aa)' : undefined }}>
                        {s.profilePicture
                            ? <img src={s.profilePicture} alt="" />
                            : (s.name || '?').charAt(0).toUpperCase()}
                    </div>
                ))}
            </div>
            <div className="awards-reveal__member-names">{singers.map(s => s.name).join(', ')}</div>
        </div>
    )
}

// ---- Finalist spotlight (one at a time, random order) --------------------

function FinalistCard({ award, finalist, awardIndex, total }: { award: Award; finalist: RevealFinalist; awardIndex: number; total: number }) {
    const c = finalist.candidate
    const isSinger = award.subjectType === 'singer'
    return (
        <div className="awards-reveal__finalist">
            <div className="awards-reveal__finalist-top">
                <AwardIconSlot award={award} />
                <div>
                    <div className="awards-reveal__finalist-badge">Finalist {finalist.order + 1} of {finalist.count}</div>
                    <div className="awards-reveal__award-title">{award.title}</div>
                    <div className="awards-reveal__finalist-sub">Award {awardIndex + 1} of {total}</div>
                </div>
            </div>

            {isSinger ? (
                <div className="awards-reveal__finalist-singer">
                    <CandidateFace c={c} className="awards-reveal__finalist-face" />
                    <div className="awards-reveal__finalist-name">{c.label}</div>
                    <SongMarquee songs={finalist.songs || []} />
                </div>
            ) : (
                <div className="awards-reveal__finalist-perf">
                    <CandidateFace c={c} className="awards-reveal__finalist-art" />
                    <div className="awards-reveal__finalist-track">{c.trackName || c.label}</div>
                    {/* The performers (names + pics) — not the original song artist. */}
                    <SingerRow c={c} />
                </div>
            )}
        </div>
    )
}

// Vertically scrolling list of a singer's performances.
function SongMarquee({ songs }: { songs: Array<{ trackName: string; trackArtist: string; artUrl: string | null }> }) {
    if (songs.length === 0) {
        return <div className="awards-reveal__songs-empty">Took the mic tonight</div>
    }
    // Duplicate the list so the upward scroll loops seamlessly.
    const loop = songs.length > 3 ? songs.concat(songs) : songs
    return (
        <div className="awards-reveal__songmarquee">
            <div className="awards-reveal__songmarquee-label">Songs they sang</div>
            <div className={'awards-reveal__songmarquee-mask' + (songs.length > 3 ? ' awards-reveal__songmarquee-mask--scroll' : '')}>
                <div className={'awards-reveal__songmarquee-track' + (songs.length > 3 ? ' awards-reveal__songmarquee-track--scroll' : '')}>
                    {loop.map((s, i) => (
                        <div key={i} className="awards-reveal__song">
                            {s.artUrl
                                ? <img className="awards-reveal__song-art" src={s.artUrl} alt="" />
                                : <div className="awards-reveal__song-art awards-reveal__song-art--ph">♪</div>}
                            <div className="awards-reveal__song-meta">
                                <div className="awards-reveal__song-title">{s.trackName}</div>
                                <div className="awards-reveal__song-artist">{s.trackArtist}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ---- Lineup: all finalists in a row --------------------------------------

function LineupCardItem({ c, highlight, isSinger }: { c: AwardCandidate; highlight?: boolean; isSinger: boolean }) {
    return (
        <div className={'awards-reveal__lineup-card' + (highlight ? ' awards-reveal__lineup-card--win' : '')}>
            <CandidateFace c={c} className="awards-reveal__lineup-face" />
            <div className="awards-reveal__lineup-name">{isSinger ? c.label : (c.trackName || c.label)}</div>
            {/* For a performance/group: the performers (names + pics), not the artist. */}
            {!isSinger && <SingerRow c={c} />}
        </div>
    )
}

// `faded` renders the identical lineup layout but with NO entrance animation and
// NO winner highlight — used as the winner-phase backdrop so the cards stay
// exactly where they were on the lineup page and simply fade behind the winner.
function LineupCard({ award, lineup, faded }: { award: Award; lineup: AwardCandidate[]; faded?: boolean }) {
    const isSinger = award.subjectType === 'singer'
    return (
        <div className="awards-reveal__lineupwrap">
            <AwardIconSlot award={award} />
            <div className="awards-reveal__award-title">{award.title}</div>
            <div className="awards-reveal__lineup-label">Your {lineup.length === 1 ? 'finalist' : 'finalists'}…</div>
            <div className="awards-reveal__lineup">
                {lineup.map((c, i) => (
                    faded
                        ? <LineupCardItem key={c.subjectKey} c={c} isSinger={isSinger} />
                        : (
                            <div key={c.subjectKey} className="awards-reveal__lineup-enter" style={{ animationDelay: (i * 0.18) + 's' }}>
                                <LineupCardItem c={c} isSinger={isSinger} />
                            </div>
                        )
                ))}
            </div>
        </div>
    )
}

// ---- Winner: finalists row, then the winner grows to full screen ---------

function WinnerReveal({ award, lineup, winners, stats, frozen }: {
    award: Award
    lineup: AwardCandidate[]
    winners: AwardCandidate[]
    stats?: { score: number; firstPlaceVotes: number; totalVotes: number }
    // frozen = render the winner in its final, fully-grown state with no entrance
    // animation and no finalist backdrop (used as the static layer the encore
    // build-up floats behind).
    frozen?: boolean
}) {
    const isSinger = award.subjectType === 'singer'
    if (winners.length === 0) {
        return (
            <div className="awards-reveal__winner">
                <div className="awards-reveal__winner-crest"><AwardIconSlot award={award} /></div>
                <div className="awards-reveal__winner-label">Award · {award.title}</div>
                <div className="awards-reveal__winner-card">
                    <div className="awards-reveal__winner-name" style={{ fontSize: 'clamp(28px,4vw,52px)' }}>No winner this round</div>
                    <div className="awards-reveal__winner-sub">No votes were cast</div>
                </div>
            </div>
        )
    }
    const winner = winners[0]
    const row = lineup.length > 0 ? lineup : [winner]
    return (
        <div className="awards-reveal__winnerstage">
            {/* The finalists stay EXACTLY where they were on the lineup page and
                simply fade back — no jump, no winner highlight (don't spoil it).
                Skipped when frozen (they've long since faded away). */}
            {!frozen && (
                <div className="awards-reveal__winner-backdrop">
                    <LineupCard award={award} lineup={row} faded />
                </div>
            )}

            {/* Winner card grows in over the fading finalists. */}
            <div className="awards-reveal__winneroverlay">
            <div className={'awards-reveal__winnerbig' + (frozen ? ' awards-reveal__winnerbig--frozen' : '')}>
                <div className="awards-reveal__winner-crest"><AwardIconSlot award={award} /></div>
                <div className="awards-reveal__winner-label">Winner · {award.title}</div>
                <div className="awards-reveal__winnerbig-face-wrap">
                    <CandidateFace c={winner} className="awards-reveal__winnerbig-face" />
                </div>
                <div className="awards-reveal__winnerbig-name">{isSinger ? winner.label : (winner.trackName || winner.label)}</div>
                {/* Singer winners need no subtitle; performance/group winners list
                    their performers (names + pics) below the song title. */}
                {!isSinger && <SingerRow c={winner} />}
                {stats && (
                    <div className="awards-reveal__winnerstats">
                        <div className="awards-reveal__winnerstat">
                            <div className="awards-reveal__winnerstat-num">{stats.score}</div>
                            <div className="awards-reveal__winnerstat-cap">total score</div>
                        </div>
                        <div className="awards-reveal__winnerstat">
                            <div className="awards-reveal__winnerstat-num">{stats.firstPlaceVotes}</div>
                            <div className="awards-reveal__winnerstat-cap">1st-place vote{stats.firstPlaceVotes === 1 ? '' : 's'}</div>
                        </div>
                        <div className="awards-reveal__winnerstat">
                            <div className="awards-reveal__winnerstat-num">{stats.totalVotes}</div>
                            <div className="awards-reveal__winnerstat-cap">total vote{stats.totalVotes === 1 ? '' : 's'}</div>
                        </div>
                    </div>
                )}
            </div>
            </div>
        </div>
    )
}

function FinaleCard({ summary }: { summary: Array<{ award: Award; winners: AwardCandidate[] }> }) {
    return (
        <div className="awards-reveal__finale">
            <div className="awards-reveal__finale-title">That's a Wrap!</div>
            <div className="awards-reveal__finale-grid">
                {summary.map(({ award, winners }) => {
                    const isSinger = award.subjectType === 'singer'
                    const w = winners[0]
                    return (
                        <div key={award.id} className="awards-reveal__finale-card">
                            <div className="awards-reveal__finale-card-head">
                                <FinaleAwardIcon award={award} />
                                <div className="awards-reveal__finale-card-title">{award.title}</div>
                            </div>
                            {!w ? (
                                <div className="awards-reveal__finale-card-winner awards-reveal__finale-card-winner--none">No winner</div>
                            ) : (
                                <div className="awards-reveal__finale-card-body">
                                    <CandidateFace
                                        c={w}
                                        className={'awards-reveal__finale-card-art' + (isSinger ? ' awards-reveal__finale-card-art--round' : '')}
                                    />
                                    <div className="awards-reveal__finale-card-meta">
                                        <div className="awards-reveal__finale-card-winner">{isSinger ? w.label : (w.trackName || w.label)}</div>
                                        {!isSinger && w.singers && w.singers.length
                                            ? <FinaleMembers singers={w.singers} />
                                            : null}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function FinaleAwardIcon({ award }: { award: Award }) {
    return <div className="awards-reveal__finale-card-icon"><AwardIconBody award={award} /></div>
}

// Compact performer row for a finale card: small overlapping avatars + names.
function FinaleMembers({ singers }: { singers: NonNullable<AwardCandidate['singers']> }) {
    return (
        <div className="awards-reveal__finale-members">
            <div className="awards-reveal__finale-members-avatars">
                {singers.slice(0, 4).map((s, i) => (
                    <div key={i} className="awards-reveal__finale-member-avatar"
                         style={{ background: s.color ? 'linear-gradient(135deg,' + s.color + ',' + s.color + 'aa)' : undefined }}>
                        {s.profilePicture
                            ? <img src={s.profilePicture} alt="" />
                            : (s.name || '?').charAt(0).toUpperCase()}
                    </div>
                ))}
            </div>
            <div className="awards-reveal__finale-member-names">{singers.map(s => s.name).join(', ')}</div>
        </div>
    )
}

// ---- Confetti ------------------------------------------------------------
function ConfettiBurst() {
    const pieces = useMemo(() => {
        const colors = ['#f4d35e', '#d4af37', '#8c6d1f', '#fce8a4', '#f5e6c5', '#b8902a']
        return Array.from({ length: 90 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            color: colors[i % colors.length],
            delay: Math.random() * 1.5,
            duration: 2.5 + Math.random() * 2,
            rot: Math.random() * 360
        }))
    }, [])
    return (
        <div className="awards-reveal__confetti">
            {pieces.map(p => (
                <span
                    key={p.id}
                    style={{
                        left: p.left + '%',
                        background: p.color,
                        animationDuration: p.duration + 's',
                        animationDelay: p.delay + 's',
                        transform: 'rotateZ(' + p.rot + 'deg)'
                    }}
                />
            ))}
        </div>
    )
}
