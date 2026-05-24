import React, { useEffect, useMemo, useRef } from 'react'
import { FEATURED_SVGS, awardIconCdnUrl } from './icons/manifest'
import { Award, AwardCandidate, RevealStep } from './types'
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

// Sound effects loaded lazily — only on the stage window, only when needed.
function useStageSfx(phase: string | null) {
    const drumrollRef = useRef<HTMLAudioElement | null>(null)
    const stingRef = useRef<HTMLAudioElement | null>(null)
    const applauseRef = useRef<HTMLAudioElement | null>(null)
    const fanfareRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        if (!window.electronAPI?.isStageWindow) return
        if (!drumrollRef.current) {
            // Use Web Audio data URIs for sfx so we don't add new asset files.
            // Synthesized in browser via audio context.
            drumrollRef.current = playSynthAudio.lazy('drumroll')
            stingRef.current = playSynthAudio.lazy('sting')
            applauseRef.current = playSynthAudio.lazy('applause')
            fanfareRef.current = playSynthAudio.lazy('fanfare')
        }
    }, [])

    useEffect(() => {
        if (!window.electronAPI?.isStageWindow) return
        switch (phase) {
            case 'opening':
                playSynth('fanfare')
                break
            case 'drumroll':
                playSynth('drumroll')
                break
            case 'winner':
                playSynth('sting')
                playSynth('applause', 0.25)
                break
            case 'finale':
                playSynth('fanfare')
                break
        }
    }, [phase])
}

// Tiny synthesized SFX via WebAudio. Stage-only so we don't ship media files.
function playSynth(kind: 'fanfare' | 'drumroll' | 'sting' | 'applause', volume = 1) {
    try {
        const ctx = getAudioCtx()
        const t0 = ctx.currentTime
        const gain = ctx.createGain()
        gain.gain.value = volume * 0.4
        gain.connect(ctx.destination)
        if (kind === 'fanfare') {
            const notes = [392, 523, 659, 784]
            notes.forEach((f, i) => {
                const o = ctx.createOscillator()
                o.type = 'triangle'
                o.frequency.value = f
                const g = ctx.createGain()
                const at = t0 + i * 0.18
                g.gain.setValueAtTime(0.0001, at)
                g.gain.exponentialRampToValueAtTime(0.5, at + 0.02)
                g.gain.exponentialRampToValueAtTime(0.0001, at + 0.6)
                o.connect(g).connect(gain)
                o.start(at)
                o.stop(at + 0.65)
            })
        } else if (kind === 'drumroll') {
            for (let i = 0; i < 28; i++) {
                const at = t0 + i * 0.06
                const noise = ctx.createBufferSource()
                const buf = ctx.createBuffer(1, 0.04 * ctx.sampleRate, ctx.sampleRate)
                const ch = buf.getChannelData(0)
                for (let n = 0; n < ch.length; n++) ch[n] = (Math.random() * 2 - 1) * (1 - n / ch.length)
                noise.buffer = buf
                const g = ctx.createGain()
                g.gain.value = 0.4 + (i / 28) * 0.5
                noise.connect(g).connect(gain)
                noise.start(at)
            }
        } else if (kind === 'sting') {
            const f1 = ctx.createOscillator()
            f1.type = 'sawtooth'
            f1.frequency.setValueAtTime(110, t0)
            f1.frequency.exponentialRampToValueAtTime(880, t0 + 0.35)
            const g1 = ctx.createGain()
            g1.gain.setValueAtTime(0.0001, t0)
            g1.gain.exponentialRampToValueAtTime(0.7, t0 + 0.04)
            g1.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5)
            f1.connect(g1).connect(gain)
            f1.start(t0)
            f1.stop(t0 + 0.55)
        } else if (kind === 'applause') {
            const dur = 3.5
            const noise = ctx.createBufferSource()
            const buf = ctx.createBuffer(1, dur * ctx.sampleRate, ctx.sampleRate)
            const ch = buf.getChannelData(0)
            for (let n = 0; n < ch.length; n++) {
                const env = Math.min(1, n / (ctx.sampleRate * 0.3)) * Math.max(0, 1 - (n / ch.length))
                ch[n] = (Math.random() * 2 - 1) * env * 0.5
            }
            noise.buffer = buf
            const filt = ctx.createBiquadFilter()
            filt.type = 'bandpass'
            filt.frequency.value = 1200
            filt.Q.value = 0.6
            noise.connect(filt).connect(gain)
            noise.start(t0)
        }
    } catch (e) {
        // Silently ignore — audio may be blocked
    }
}

let _audioCtx: AudioContext | null = null
function getAudioCtx(): AudioContext {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    return _audioCtx
}

// Bogus stub so the SFX hook compiles regardless of where it's referenced.
const playSynthAudio = { lazy: (_: string) => null as unknown as HTMLAudioElement }

// ---- Component -----------------------------------------------------------
interface Props {
    step: RevealStep | null
}

export function AwardsRevealAnimation({ step }: Props) {
    useStageSfx(step?.phase ?? null)

    if (!step || step.phase === 'idle' || step.phase === 'done') {
        return null
    }
    return (
        <div className="awards-reveal" role="dialog" aria-label="Awards reveal">
            <div className="awards-reveal__spotlight" />
            {step.phase === 'winner' && <ConfettiBurst key={step.startedAt} />}
            {step.phase === 'opening' && <OpeningCard total={step.totalAwards} />}
            {step.phase === 'nominees' && step.award && (
                <NomineesCard award={step.award} candidates={step.candidates || []} awardIndex={step.awardIndex} total={step.totalAwards} />
            )}
            {step.phase === 'drumroll' && step.award && <DrumrollCard award={step.award} />}
            {step.phase === 'winner' && step.award && (
                <WinnerCard award={step.award} winners={step.winners || []} voteCount={step.voteCount ?? 0} />
            )}
            {step.phase === 'finale' && <FinaleCard summary={step.finaleSummary || []} />}
        </div>
    )
}

// ---- Phase subcomponents -------------------------------------------------

function OpeningCard({ total }: { total: number }) {
    return (
        <div className="awards-reveal__opening">
            <div className="awards-reveal__opening-title">Tonight's Awards</div>
            <div className="awards-reveal__opening-sub">{total} categor{total === 1 ? 'y' : 'ies'} to reveal</div>
        </div>
    )
}

function AwardIconSlot({ award }: { award: Award }) {
    return <div className="awards-reveal__award-icon"><AwardIconBody award={award} /></div>
}

function CandidateAvatar({ c }: { c: AwardCandidate }) {
    const initial = (c.label || '?').charAt(0).toUpperCase()
    if (c.avatarUrl) {
        return <img src={c.avatarUrl} alt="" />
    }
    return <div className="awards-reveal__nominee-avatar">{initial}</div>
}

function NomineesCard({ award, candidates, awardIndex, total }: { award: Award; candidates: AwardCandidate[]; awardIndex: number; total: number }) {
    const isPerf = award.subjectType === 'performance' || award.subjectType === 'group'
    return (
        <div className="awards-reveal__nominees">
            <AwardIconSlot award={award} />
            <div>
                <div className="awards-reveal__nominees-label">Award {awardIndex + 1} of {total}</div>
                <div className="awards-reveal__award-title">{award.title}</div>
            </div>
            {candidates.length > 0 ? (
                <>
                    <div className="awards-reveal__nominees-label">Nominees</div>
                    {isPerf ? (
                        <div className="awards-reveal__nominees-list awards-reveal__nominees-list--rich">
                            {candidates.slice(0, 5).map((c, i) => (
                                <PerformanceNomineeRow key={c.subjectKey} c={c} index={i} />
                            ))}
                            {candidates.length > 5 && (
                                <div className="awards-reveal__nominee">+{candidates.length - 5} more</div>
                            )}
                        </div>
                    ) : (
                        <div className="awards-reveal__nominees-list">
                            {candidates.slice(0, 8).map((c, i) => (
                                <div key={c.subjectKey} className="awards-reveal__nominee" style={{ animationDelay: (i * 0.08) + 's' }}>
                                    <CandidateAvatar c={c} />
                                    <span>{c.label}</span>
                                </div>
                            ))}
                            {candidates.length > 8 && (
                                <div className="awards-reveal__nominee">+{candidates.length - 8} more</div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="awards-reveal__nominees-label" style={{ opacity: 0.6 }}>No candidates</div>
            )}
        </div>
    )
}

function PerformanceNomineeRow({ c, index }: { c: AwardCandidate; index: number }) {
    const initial = (c.label || '?').charAt(0).toUpperCase()
    const singers = c.singers || []
    return (
        <div className="awards-reveal__nominee--rich" style={{ animationDelay: (index * 0.1) + 's' }}>
            {c.avatarUrl
                ? <img className="awards-reveal__nominee-art" src={c.avatarUrl} alt="" />
                : <div className="awards-reveal__nominee-art" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22 }}>{initial}</div>}
            <div className="awards-reveal__nominee-meta">
                <div className="awards-reveal__nominee-track">{c.label}</div>
                {singers.length > 0 && (
                    <div className="awards-reveal__nominee-singers">
                        <div className="awards-reveal__nominee-singers-avatars">
                            {singers.slice(0, 4).map((s, si) => (
                                <div key={si} className="awards-reveal__nominee-singer-avatar"
                                     style={{ background: s.color ? 'linear-gradient(135deg,' + s.color + ',' + s.color + 'aa)' : undefined }}>
                                    {s.profilePicture
                                        ? <img src={s.profilePicture} alt="" />
                                        : (s.name || '?').charAt(0).toUpperCase()}
                                </div>
                            ))}
                        </div>
                        <div className="awards-reveal__nominee-singer-names">{singers.map(s => s.name).join(', ')}</div>
                    </div>
                )}
            </div>
        </div>
    )
}

function DrumrollCard({ award }: { award: Award }) {
    return (
        <div className="awards-reveal__drumroll">
            <AwardIconSlot award={award} />
            <div className="awards-reveal__award-title">{award.title}</div>
            <div className="awards-reveal__drumroll-text">And the winner is…</div>
            <div className="awards-reveal__drumroll-dots">
                <span /><span /><span /><span /><span />
            </div>
        </div>
    )
}

function WinnerAvatar({ c }: { c: AwardCandidate }) {
    if (c.avatarUrl) return <img className="awards-reveal__winner-avatar" src={c.avatarUrl} alt="" />
    return <div className="awards-reveal__winner-avatar">{(c.label || '?').charAt(0).toUpperCase()}</div>
}

function WinnerCard({ award, winners, voteCount }: { award: Award; winners: AwardCandidate[]; voteCount: number }) {
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
    return (
        <div className="awards-reveal__winner">
            <div className="awards-reveal__winner-crest"><AwardIconSlot award={award} /></div>
            <div className="awards-reveal__winner-label">Winner · {award.title}</div>
            <div className="awards-reveal__winner-card">
                <div className="awards-reveal__winner-avatars">
                    {winners.flatMap((w, wi) => {
                        if (w.singers && w.singers.length > 1) {
                            return w.singers.map((s, si) => (
                                <div key={`${wi}-${si}`} className="awards-reveal__winner-avatar">
                                    {s.profilePicture
                                        ? <img src={s.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : (s.name || '?').charAt(0).toUpperCase()}
                                </div>
                            ))
                        }
                        return [<WinnerAvatar key={wi} c={w} />]
                    })}
                </div>
                <div className="awards-reveal__winner-name">
                    {winners.length === 1 ? winners[0].label : winners.map(w => w.label).join(' · ')}
                </div>
                {winners.length === 1 && winners[0].subtitle && (
                    <div className="awards-reveal__winner-sub">{winners[0].subtitle}</div>
                )}
                {winners.length > 1 && (
                    <div className="awards-reveal__winner-sub">Tied with {voteCount} vote{voteCount === 1 ? '' : 's'} each</div>
                )}
                {winners.length === 1 && (
                    <div className="awards-reveal__winner-votes">{voteCount} vote{voteCount === 1 ? '' : 's'}</div>
                )}
            </div>
        </div>
    )
}

function FinaleCard({ summary }: { summary: Array<{ award: Award; winners: AwardCandidate[] }> }) {
    return (
        <div className="awards-reveal__finale">
            <div className="awards-reveal__finale-title">That's a Wrap!</div>
            <div className="awards-reveal__finale-grid">
                {summary.map(({ award, winners }) => (
                    <div key={award.id} className="awards-reveal__finale-card">
                        <FinaleAwardIcon award={award} />
                        <div className="awards-reveal__finale-card-title">{award.title}</div>
                        <div className="awards-reveal__finale-card-winner">
                            {winners.length === 0 ? 'No winner' : winners.map(w => w.label).join(' · ')}
                        </div>
                        {winners.length === 1 && winners[0].subtitle && (
                            <div className="awards-reveal__finale-card-sub">{winners[0].subtitle}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function FinaleAwardIcon({ award }: { award: Award }) {
    return <div className="awards-reveal__finale-card-icon"><AwardIconBody award={award} /></div>
}

// ---- Confetti ------------------------------------------------------------
function ConfettiBurst() {
    const pieces = useMemo(() => {
        const colors = ['#fde68a', '#f59e0b', '#ec4899', '#a78bfa', '#22d3ee', '#34d399']
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
