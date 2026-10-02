// The space stage's screens, one voyage:
//
//   SpaceIdle       the record adrift in deep space, its label the join code,
//                   the pulsar map radiating from it across the sky, Voyager
//                   far off, and the Pale Blue Dot in its sunbeam
//   SpaceUpNext     the next song as the record (its art is the label, turning),
//                   its singers as stars joined into one constellation
//   SpaceCountIn    the needle drop: the tonearm swings in over the count, the
//                   beats land, and on "Sing" the stylus touches down
//   SpaceBreak      interstellar cruise: Voyager sails on, the distance counts up
//   SpacePaused     holding position
//   SpaceNoLyrics, SpaceQrCard, SpaceSongChip, SpaceSingerTag, SpaceMicBody
//
// Copy rule for every string here: no em dashes, ever.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ETCH, SP } from '../../styles/space'
import { DeepField } from './DeepField'
import {
    BinaryMarks,
    EtchedRule,
    GoldenRecord,
    HydrogenDiagram,
    PulsarMap,
    SoundRings,
    StarGlint,
    StylusDiagram,
    ToneArm,
    Voyager,
    WaveformDiagram,
    display,
    mono,
    pulsarLines,
    useCosmos,
} from './SpaceParts'
import { flare } from './cosmos'

/** Shrink display type as a title gets longer, so any length sits on one line. */
const fit = (base: number, text: string, min: number, per = 1.4) => Math.max(min, Math.round(base - Math.max(0, (text || '').length - 14) * per))

// ── Scale ────────────────────────────────────────────────────────────────────
// Screens are drawn in 1080p design pixels and scaled as one piece to the
// screen's height, centred, so the composition holds on any display.

function useStageScale(): number {
    const [s, setS] = useState(() => window.innerHeight / 1080)
    useEffect(() => {
        const on = () => setS(window.innerHeight / 1080)
        window.addEventListener('resize', on)
        return () => window.removeEventListener('resize', on)
    }, [])
    return s
}

function Design({ children }: { children: ReactNode }) {
    const s = useStageScale()
    return (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(50% - 88.89vh)', width: '177.78vh' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${s})`, transformOrigin: '0 0' }}>{children}</div>
        </div>
    )
}

/** Black glass with an engraved gold hairline: the theme's one panel. */
export function GlassPlate({ children, radius = 16, style, contentStyle, className }: { children: ReactNode; radius?: number; style?: CSSProperties; contentStyle?: CSSProperties; className?: string }) {
    return (
        <div
            className={className}
            style={{
                position: 'relative',
                borderRadius: radius,
                background: 'linear-gradient(180deg, rgba(16,19,29,0.92) 0%, rgba(5,6,12,0.94) 100%)',
                border: `1px solid ${ETCH.mid}`,
                boxShadow: '0 18px 44px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,240,200,0.10)',
                ...style,
            }}
        >
            {/* registration ticks in the corners, the way an instrument plate is marked */}
            {[
                { left: 8, top: 8, r: 0 },
                { right: 8, top: 8, r: 90 },
                { right: 8, bottom: 8, r: 180 },
                { left: 8, bottom: 8, r: 270 },
            ].map((c, i) => (
                <svg key={i} width={10} height={10} viewBox="0 0 10 10" style={{ position: 'absolute', ...c, transform: `rotate(${c.r}deg)` } as CSSProperties} aria-hidden>
                    <path d="M 0 6 L 0 0 L 6 0" fill="none" stroke={ETCH.strong} strokeWidth={1} />
                </svg>
            ))}
            <div style={{ position: 'relative', ...contentStyle }}>{children}</div>
        </div>
    )
}

// ── Idle ─────────────────────────────────────────────────────────────────────

export function SpaceIdle({ qrUrl, sessionCode }: { qrUrl: string | null; sessionCode: string | null }) {
    useCosmos()
    // Lines that would run up into the title stop just past the record.
    const lines = useMemo(
        () =>
            pulsarLines(0.137, 34, 74).map((l) => {
                const up = Math.sin((l.angle * Math.PI) / 180) < -0.45
                return up ? { ...l, length: Math.min(l.length, 37) } : l
            }),
        [],
    )
    const R = 560
    const cx = 960
    const cy = 515
    return (
        <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: SP.VOID }}>
            <DeepField mode="idle" />
            <Design>
                {/* the pulsar map radiates from the record across the sky */}
                <div style={{ position: 'absolute', left: cx - 900, top: cy - 900 }}>
                    <PulsarMap size={1800} inner={R / 18 + 1.5} lines={lines} color="rgba(233,196,106,0.3)" />
                </div>

                {/* the cover's other diagrams, engraved small and faint in the corners */}
                <div className="sp-fade" style={{ position: 'absolute', left: 92, top: 70, animationDelay: '0.6s' }}>
                    <StylusDiagram size={200} color="rgba(233,196,106,0.4)" />
                </div>
                <div className="sp-fade" style={{ position: 'absolute', left: 100, bottom: 96, animationDelay: '0.9s' }}>
                    <HydrogenDiagram size={190} color="rgba(233,196,106,0.4)" />
                </div>
                <div className="sp-fade" style={{ position: 'absolute', right: 96, bottom: 84, animationDelay: '1.1s' }}>
                    <WaveformDiagram size={210} color="rgba(233,196,106,0.36)" />
                </div>

                {/* Voyager, far off, still sailing */}
                <div className="sp-voyage" style={{ position: 'absolute', left: 1460, top: 96 }}>
                    <Voyager size={170} color="rgba(233,196,106,0.7)" />
                </div>

                <div className="sp-rise" style={{ position: 'absolute', left: 0, right: 0, top: 58, textAlign: 'center' }}>
                    <div style={{ ...mono(15, SP.GOLD, { letterSpacing: '0.5em', marginRight: '-0.5em' }) }}>Sounds of Earth</div>
                    <h1 style={{ ...display(68, SP.STAR, 300, { letterSpacing: '0.34em', marginRight: '-0.34em', margin: '10px 0 0' }) }}>Add your voice</h1>
                </div>

                <div className="sp-rise" style={{ position: 'absolute', left: cx - R / 2, top: cy - R / 2, animationDelay: '0.15s' }}>
                    <div className="sp-float">
                        <GoldenRecord
                            size={R}
                            labelRatio={0.5}
                            inscription="SCAN THE LABEL TO SING  /  SOUNDS OF EARTH  /  SCAN THE LABEL TO SING  /  SOUNDS OF EARTH  /  "
                            label={qrUrl ? <img src={qrUrl} alt="QR" style={{ width: R * 0.5 * 0.68, height: R * 0.5 * 0.68, display: 'block', mixBlendMode: 'multiply' }} /> : null}
                        />
                    </div>
                </div>

                {sessionCode && (
                    <div className="sp-rise" style={{ position: 'absolute', left: 0, right: 0, top: cy + R / 2 + 34, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, animationDelay: '0.3s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                            <EtchedRule width={150} />
                            <span style={{ ...mono(15, SP.DUST, { letterSpacing: '0.4em' }) }}>Session</span>
                            <span style={{ ...display(46, SP.GOLD_HI, 500, { letterSpacing: '0.42em', marginRight: '-0.42em' }) }}>{sessionCode}</span>
                            <EtchedRule width={150} />
                        </div>
                        {/* the code once more, in the record's own notation */}
                        <div style={{ display: 'flex', gap: 26 }}>
                            {sessionCode.split('').map((ch, i) => (
                                <BinaryMarks key={i} n={ch.charCodeAt(0)} bits={7} height={11} gap={3} color="rgba(233,196,106,0.55)" />
                            ))}
                        </div>
                    </div>
                )}
            </Design>
        </div>
    )
}

// ── Up next ──────────────────────────────────────────────────────────────────

interface UpNextProps {
    art: string | null
    track: any
    singers: any[]
    np: any
    roles: string[]
    guestsMap: Map<string, any>
    showVideo?: boolean
}

export function SpaceUpNext({ art, track, singers, np, roles, guestsMap, showVideo = false }: UpNextProps) {
    useCosmos()
    const hidden = !!np?.isHidden
    const title = hidden ? 'Unknown signal' : track?.name || ''
    const artist = (track?.artists || []).map((a: any) => a.name).join(', ')
    const dur = track?.duration_ms
        ? `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`
        : ''
    const titleSize = fit(70, title, 38)
    const R = 460
    const inscription = hidden ? 'SIGNAL ENCRYPTED  /  '.repeat(5) : `${artist.toUpperCase()}  /  `.repeat(Math.max(2, Math.ceil(60 / Math.max(8, artist.length + 4))))
    // the constellation: singers spaced along a gently arched line
    const n = singers.length
    const span = Math.min(1180, Math.max(260, n * 260))
    const pts = singers.map((_, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1)
        return { x: 960 - span / 2 + t * span, y: 908 - Math.sin(t * Math.PI) * 26 + (i % 2 ? 14 : 0) }
    })
    // Portaled to <body>: this renders inside .k-lyrics, whose fade mask would
    // otherwise eat the top and bottom of a full-screen layer.
    return createPortal(
        <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', opacity: showVideo ? 0 : 1, transition: 'opacity 0.8s ease' }}>
                <DeepField mode="upnext" art={hidden ? null : art} />
            </div>
            {showVideo && <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 70% at 50% 45%, rgba(2,3,8,0.55), rgba(2,3,8,0.85))' }} />}
            <div style={{ position: 'fixed', inset: 0, zIndex: 11, pointerEvents: 'none' }}>
                <Design>
                    <div className="sp-rise" style={{ position: 'absolute', left: 0, right: 0, top: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                        <EtchedRule width={220} />
                        <span style={{ ...mono(16, SP.GOLD, { letterSpacing: '0.5em', marginRight: '-0.5em' }) }}>Next transmission</span>
                        <EtchedRule width={220} />
                    </div>
                    <div className="sp-rise" style={{ position: 'absolute', left: 960 - R / 2, top: 108, animationDelay: '0.1s' }}>
                        <GoldenRecord
                            size={R}
                            labelRatio={0.62}
                            labelPaper="none"
                            spin={hidden ? 0 : 16}
                            inscription={inscription}
                            label={
                                hidden ? (
                                    <div className="sp-static" style={{ width: '100%', height: '100%' }} />
                                ) : art ? (
                                    <img src={art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                ) : (
                                    <StarGlint size={120} color={SP.GOLD_HI} />
                                )
                            }
                        />
                    </div>
                    <div className="sp-rise" style={{ position: 'absolute', left: 0, right: 0, top: 612, textAlign: 'center', animationDelay: '0.2s' }}>
                        <h1 style={{ ...display(titleSize, SP.STAR, 300, { letterSpacing: '0.16em', margin: 0, whiteSpace: 'nowrap', textShadow: '0 2px 18px rgba(0,0,0,0.9)' }) }}>{title}</h1>
                        {!hidden && (
                            <div style={{ ...mono(17, SP.DUST, { marginTop: 14, letterSpacing: '0.32em' }) }}>
                                {artist}
                                {dur ? <span style={{ color: SP.GOLD, marginLeft: 22 }}>{dur}</span> : null}
                            </div>
                        )}
                    </div>
                    {/* the singers, as one constellation */}
                    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} aria-hidden>
                        {pts.length > 1 ? (
                            <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="rgba(233,196,106,0.58)" strokeWidth={1.6} strokeDasharray="3 7" strokeLinecap="round" className="sp-fade" style={{ animationDelay: '0.5s' }} />
                        ) : null}
                    </svg>
                    {singers.map((s: any, i: number) => {
                        const roleStr = !hidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                            ? s.roleIndices.map((ri: number) => roles[ri]).filter(Boolean).join(' & ')
                            : ''
                        const g = s.guestId ? guestsMap.get(s.guestId) : undefined
                        const nm: string = g?.name ?? s.name
                        const pic: string | null = g?.profile_picture ?? null
                        return (
                            <div key={s.id} className="sp-rise" style={{ position: 'absolute', left: pts[i].x - 160, width: 320, top: pts[i].y - 46, display: 'flex', flexDirection: 'column', alignItems: 'center', animationDelay: `${0.4 + i * 0.12}s` }}>
                                <div style={{ position: 'relative', width: 92, height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <StarGlint size={92} color={s.color} className="sp-twinkle" style={{ position: 'absolute', inset: 0 }} />
                                    {pic ? <img src={pic} alt="" style={{ position: 'relative', width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', boxShadow: `0 0 0 2px ${SP.VOID}, 0 0 0 3px ${s.color}` }} /> : null}
                                </div>
                                <div style={{ ...display(30, SP.STAR, 500, { letterSpacing: '0.12em', marginTop: 2, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }) }}>{nm}</div>
                                {roleStr && <div style={{ ...mono(12.5, SP.GOLD, { marginTop: 6 }) }}>{roleStr}</div>}
                            </div>
                        )
                    })}
                </Design>
            </div>
        </>,
        document.body,
    )
}

// ── Count-in: the needle drop ────────────────────────────────────────────────

export function SpaceCountIn({
    remaining,
    count,
    barPct,
    trackName,
    art,
    className,
    innerRef,
    stageFont,
}: {
    remaining: number
    count: number
    barPct: number
    trackName: string
    art: string | null
    className: string
    innerRef: React.Ref<HTMLDivElement>
    stageFont: (px: number) => string
}) {
    useCosmos()
    const fired = useRef(false)
    const go = remaining <= 0
    useEffect(() => {
        if (go && !fired.current) {
            fired.current = true
            flare()
        }
    }, [go])
    // The arm swings in across the count and is over the lead-in groove for
    // the last three beats; on "Sing" it drops onto the record.
    const p = Math.min(1, barPct / 100)
    const angle = go ? 30 : 4 + Math.min(1, p * 1.15) * 22
    const R = 196
    let center: ReactNode
    if (go) center = <div key="go" className="sp-beat" style={{ ...display(0, SP.GOLD_HI, 300, { fontSize: stageFont(84), letterSpacing: '0.3em', marginRight: '-0.3em' }) }}>Sing</div>
    else if (count <= 3) center = <div key={count} className="sp-beat" style={{ ...display(0, SP.STAR, 200, { fontSize: stageFont(104), letterSpacing: 0, lineHeight: 1 }) }}>{count}</div>
    else center = <div style={{ ...display(0, SP.STAR, 400, { fontSize: stageFont(28), letterSpacing: '0.14em', maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>{trackName}</div>
    return (
        <div ref={innerRef} className={className} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
            <div className="sp-rise">
                <GlassPlate radius={22} contentStyle={{ display: 'flex', alignItems: 'center', gap: 34, padding: '24px 42px 24px 26px' }}>
                    <div style={{ position: 'relative', width: R + 70, height: R }}>
                        <GoldenRecord
                            size={R}
                            labelRatio={0.5}
                            labelPaper="none"
                            spin={go ? 1.8 : 5}
                            label={art ? <img src={art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <StarGlint size={64} color={SP.GOLD_HI} />}
                        />
                        <div style={{ position: 'absolute', left: R + 18, top: -6 }}>
                            <ToneArm length={R * 0.92} angle={angle} />
                        </div>
                        {go && <SoundRings size={R} count={4} />}
                    </div>
                    <div style={{ minWidth: 300, textAlign: 'center' }}>
                        <div style={{ ...mono(13, SP.GOLD, { marginBottom: 8 }) }}>{go ? 'Transmitting' : 'Needle drop'}</div>
                        {center}
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                            <BinaryMarks n={go ? 0 : Math.max(0, count)} bits={4} height={10} color="rgba(233,196,106,0.5)" />
                        </div>
                    </div>
                </GlassPlate>
            </div>
        </div>
    )
}

// ── Interlude ────────────────────────────────────────────────────────────────

export function SpaceBreak({ progress }: { progress: number }) {
    const p = Math.min(1, Math.max(0, progress))
    // Voyager 1's distance in astronomical units, near enough, ticking on.
    const au = (166.4 + p * 0.3).toFixed(2)
    return (
        <div className="sp-rise">
            <GlassPlate radius={999} contentStyle={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 30px 8px 18px' }}>
                <div style={{ position: 'relative', width: 120, height: 34 }}>
                    <svg width={120} height={34} viewBox="0 0 120 34" style={{ position: 'absolute', inset: 0 }} aria-hidden>
                        <path d="M 4 28 Q 60 2 116 22" fill="none" stroke="rgba(233,196,106,0.4)" strokeWidth={1} strokeDasharray="2 4" />
                        <circle cx={4} cy={28} r={2.2} fill="#8FB4FF" />
                    </svg>
                    <div style={{ position: 'absolute', left: 4 + p * 100 - 16, top: 2 + Math.sin(p * Math.PI) * -6, transform: 'rotate(-12deg)' }}>
                        <Voyager size={34} color={SP.GOLD_HI} />
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ ...display(20, SP.STAR, 400, { letterSpacing: '0.24em' }) }}>Interstellar cruise</span>
                    <span style={{ ...mono(12, SP.GOLD, { marginTop: 3, letterSpacing: '0.24em' }) }}>{au} AU from home</span>
                </div>
            </GlassPlate>
        </div>
    )
}

// ── Paused ───────────────────────────────────────────────────────────────────

export function SpacePaused({ stageFont }: { stageFont: (px: number) => string }) {
    return (
        <div className="sp-rise">
            <GlassPlate radius={999} contentStyle={{ display: 'flex', alignItems: 'center', gap: 18, padding: '10px 34px 10px 14px' }}>
                <GoldenRecord size={58} labelRatio={0.44} labelPaper="none" label={<StarGlint size={22} color={SP.GOLD_HI} />} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ ...display(0, SP.STAR, 400, { fontSize: stageFont(30), letterSpacing: '0.3em' }) }}>Paused</span>
                    <span style={{ ...mono(12, SP.GOLD, { marginTop: 2 }) }}>Holding position</span>
                </div>
            </GlassPlate>
        </div>
    )
}

// ── No lyrics ────────────────────────────────────────────────────────────────

export function SpaceNoLyrics({ stageFont }: { stageFont: (px: number) => string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center' }} className="sp-rise">
            <GlassPlate radius={20} contentStyle={{ display: 'flex', alignItems: 'center', gap: 22, padding: '22px 40px 22px 26px' }}>
                <StarGlint size={64} color={SP.GOLD_HI} className="sp-twinkle" />
                <div>
                    <div style={{ ...display(0, SP.STAR, 400, { fontSize: stageFont(30), letterSpacing: '0.24em' }) }}>No lyrics received</div>
                    <div style={{ ...mono(14, SP.GOLD, { marginTop: 8 }) }}>Sing it to the stars</div>
                </div>
            </GlassPlate>
        </div>
    )
}

// ── QR card ──────────────────────────────────────────────────────────────────

/** A small record in the corner, its label the join code. */
export function SpaceQrCard({ qr }: { qr: string }) {
    const R = 150
    return (
        <div className="k-qr-card" style={{ position: 'relative' }}>
            <GoldenRecord size={R} labelRatio={0.66} inscription="SCAN TO JOIN  /  SCAN TO JOIN  /  SCAN TO JOIN  /  " label={<img src={qr} alt="QR" style={{ width: R * 0.66 * 0.7, height: R * 0.66 * 0.7, display: 'block', mixBlendMode: 'multiply' }} />} />
        </div>
    )
}

// ── Song chip / singer tags ──────────────────────────────────────────────────

export function SpaceSongChip({ art, title, artist }: { art: string | null | undefined; title: string; artist: string }) {
    return (
        <GlassPlate radius={999} style={{ maxWidth: 'min(38vw, 540px)' }} contentStyle={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 24px 6px 6px' }}>
            {art && <GoldenRecord size={52} labelRatio={0.66} labelPaper="none" spin={8} label={<img src={art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />} />}
            <div style={{ minWidth: 0 }}>
                <div style={{ ...display(17, SP.STAR, 500, { letterSpacing: '0.1em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>{title}</div>
                <div style={{ ...mono(11.5, SP.DUST, { letterSpacing: '0.18em', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>{artist}</div>
            </div>
        </GlassPlate>
    )
}

export function SpaceSingerTag({ children, index }: { children: ReactNode; color: string; index: number }) {
    return (
        <div className="sp-rise" style={{ animationDelay: `${index * 0.08}s` }}>
            <GlassPlate radius={999} contentStyle={{ display: 'flex', alignItems: 'center', padding: '4px 18px 4px 6px' }}>
                {children}
            </GlassPlate>
        </div>
    )
}

/** The mic level as the singer's star: it grows and its spikes reach out as
 *  they sing louder. */
export function SpaceStarMeter({ level, color }: { level: number; color: string }) {
    const l = Math.min(1, level * 2.6)
    return (
        <span style={{ position: 'relative', width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <StarGlint size={30} color={color} style={{ transform: `scale(${0.55 + l * 0.75})`, opacity: 0.55 + l * 0.45, transition: 'transform 0.08s linear, opacity 0.08s linear' }} />
        </span>
    )
}

/** Name + picture + star, the space MicMeter body. */
export function SpaceMicBody({ name, picture, color, meter }: { name: string; picture: string | null; color: string; meter: ReactNode }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            {meter ?? <StarGlint size={26} color={color} />}
            {picture ? <img src={picture} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', boxShadow: `0 0 0 1.5px ${color}` }} /> : null}
            <span style={{ ...display(16, SP.STAR, 500, { letterSpacing: '0.1em' }) }}>{name}</span>
        </span>
    )
}
