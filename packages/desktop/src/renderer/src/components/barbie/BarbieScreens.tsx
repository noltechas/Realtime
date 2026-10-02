// The Barbie stage's screens, one sunny day in Barbie Land:
//
//   BarbieIdle       the town in the morning sun: "Hi Barbie!", the QR on a
//                    deckle-edged snapshot, and a biplane towing the party code
//   BarbieUpNext     the next song rises over the town like the sun (its art
//                    is the disc), and every singer gets their "Hi!"
//   BarbieCountIn    "Rise and shine": the sun climbs out of the pool to the
//                    first line, the beats land on it, "Sing!" throws glitter
//   BarbieBreak      catching some rays: a sun arcs across the interlude
//   BarbiePaused     "Hold that pose!" in heart-shaped sunglasses
//   BarbieNoLyrics, BarbieQrCard, BarbieSongChip, BarbieSingerTag, BarbieMicBody
//
// Copy rule for every string here: no em dashes, ever.

import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { BARB, barbHash, ringShadow } from '../../styles/barbie'
import {
    ArtSun,
    Awning,
    DeckleCard,
    GlitterBurst,
    GlossPill,
    HeartShades,
    PaintedCloud,
    PaintedSun,
    PoolWater,
    RetroTitle,
    TwinkleShape,
    barbText,
    useSunshine,
} from './BarbieParts'
import { BarbieSky, useSetScale } from './BarbieSky'
import { burstGlitter, forceGlint } from './sunshine'

/** A px outline ring for script lettering. */
const ringText = (color: string, r: number) => ringShadow(color, r, 16, 'px')

/** Shrink display type as a title gets longer, so any length sits on one line. */
const fit = (base: number, text: string, min: number, per = 1.15) => Math.max(min, Math.round(base - Math.max(0, (text || '').length - 16) * per))

/** The design box (1920 x 1080, scaled to the screen height, centred) for
 *  content that sits above the set rather than inside it. */
function DesignLayer({ children, z }: { children: ReactNode; z: number }) {
    const { s, W } = useSetScale()
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: z, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: 1080, transform: `scale(${s})`, transformOrigin: '0 0' }}>
                <div style={{ position: 'absolute', top: 0, left: (W - 1920) / 2, width: 1920, height: 1080 }}>{children}</div>
            </div>
        </div>
    )
}

/** A twinkle that winks on a loop at a fixed spot. */
function Wink({ x, y, size, delay = 0, color = '#FFFFFF' }: { x: number; y: number; size: number; delay?: number; color?: string }) {
    return (
        <span className="barb-twinkle" style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, animationDelay: `${delay}s`, animationDuration: '3.6s' }}>
            <TwinkleShape size={size} color={color} />
        </span>
    )
}

// ── Idle ─────────────────────────────────────────────────────────────────────

export function BarbieIdle({ qrUrl, sessionCode }: { qrUrl: string | null; sessionCode: string | null }) {
    const banner = useMemo(
        () => ['Scan to sing!', sessionCode ? `Party code ${sessionCode}` : 'Grab the mic!', 'Hi Barbie!', 'Come on in, the music is fine'],
        [sessionCode],
    )
    return (
        <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: BARB.SKY_PINK }}>
            <BarbieSky variant="idle" bannerMessages={banner}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="barb-rise" style={{ ...barbText.script(76, BARB.PINK), transform: 'rotate(-6deg)', marginBottom: -26, marginLeft: -420, position: 'relative', zIndex: 1, textShadow: ringText(BARB.WHITE, 3.5) + ', 0 6px 0 rgba(176,17,94,0.25)' }}>
                        the mic is open
                    </div>
                    <RetroTitle as="h1" text="Hi Barbie!" size={178} className="barb-rise" style={{ animationDelay: '0.08s', padding: '0 0.12em' }} />
                    {qrUrl && (
                        <div className="barb-rise" style={{ animationDelay: '0.18s', marginTop: 14, position: 'relative' }}>
                            <div className="barb-bob" style={{ ['--barb-tilt' as string]: '-2.5deg' } as CSSProperties}>
                                <DeckleCard r={11} cardStyle={{ padding: '26px 26px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <img src={qrUrl} alt="QR" style={{ width: 232, height: 232, display: 'block' }} />
                                    <div style={{ fontFamily: BARB.FONT_DISPLAY, fontSize: 34, color: BARB.PINK, marginTop: 8, lineHeight: 1 }}>Scan to sing</div>
                                </DeckleCard>
                            </div>
                            <Wink x={-14} y={20} size={46} delay={0.2} color={BARB.SUN_HI} />
                            <Wink x={300} y={-6} size={34} delay={1.4} />
                            <Wink x={318} y={290} size={40} delay={2.3} color={BARB.CANDY} />
                        </div>
                    )}
                    {sessionCode && (
                        <div className="barb-rise" style={{ animationDelay: '0.28s', marginTop: 26 }}>
                            <GlossPill tone="pink" style={{ padding: '10px 36px 12px 30px', display: 'flex', alignItems: 'center', gap: 28 }}>
                                <span style={{ ...barbText.caps(17, BARB.WHITE), opacity: 0.92, whiteSpace: 'nowrap' }}>Party code</span>
                                <span style={{ fontFamily: BARB.FONT_DISPLAY, fontSize: 46, color: BARB.WHITE, letterSpacing: '0.12em', marginRight: '-0.12em', lineHeight: 1.1, textShadow: `0 3px 0 ${BARB.RASPBERRY}` }}>{sessionCode}</span>
                            </GlossPill>
                        </div>
                    )}
                </div>
            </BarbieSky>
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

/** A singer's badge: their picture in a scalloped rosette of their colour,
 *  the same scallop as the sun's rays. */
function SingerSun({ color, size, picture, initial }: { color: string; size: number; picture: string | null; initial: string }) {
    const n = 18
    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg viewBox="-100 -100 200 200" width={size} height={size} style={{ position: 'absolute', inset: 0, overflow: 'visible', filter: 'drop-shadow(0 8px 10px rgba(176,17,94,0.3))' }} aria-hidden>
                <g className="barb-spin">
                    {Array.from({ length: n }, (_, i) => {
                        const a = (i / n) * Math.PI * 2
                        return <circle key={i} cx={Math.cos(a) * 82} cy={Math.sin(a) * 82} r="19" fill={color} />
                    })}
                </g>
                <circle r="84" fill={color} />
                <circle r="72" fill="#FFFFFF" />
            </svg>
            <div
                style={{
                    position: 'absolute',
                    left: size * 0.16,
                    top: size * 0.16,
                    width: size * 0.68,
                    height: size * 0.68,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: `radial-gradient(circle at 40% 35%, color-mix(in srgb, ${color}, white 45%), ${color})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {picture ? (
                    <img src={picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                    <span style={{ fontFamily: BARB.FONT_DISPLAY, fontSize: size * 0.34, color: BARB.WHITE, textShadow: `0 3px 0 color-mix(in srgb, ${color}, #4B0A35 45%)` }}>{initial}</span>
                )}
            </div>
        </div>
    )
}

/** "Hi, name!": the speech bubble everybody in town gets. */
function HiBubble({ name, color, tilt }: { name: string; color: string; tilt: number }) {
    return (
        <div style={{ position: 'relative', transform: `rotate(${tilt}deg)`, filter: 'drop-shadow(0 6px 8px rgba(176,17,94,0.25))' }}>
            <div style={{ background: BARB.WHITE, borderRadius: 999, padding: '6px 20px 8px', border: `3px solid ${color}`, whiteSpace: 'nowrap', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ fontFamily: BARB.FONT_DISPLAY, fontSize: 30, color: BARB.PINK, lineHeight: 1.1 }}>Hi {name}!</span>
            </div>
            {/* tail, pointing down at their badge */}
            <svg width="26" height="16" viewBox="0 0 26 16" style={{ position: 'absolute', left: '50%', marginLeft: -13, bottom: -12 }} aria-hidden>
                <path d="M 0 0 L 13 14 L 26 0 Z" fill={color} />
                <path d="M 4 0 L 13 9 L 22 0 Z" fill="#FFFFFF" />
            </svg>
        </div>
    )
}

export function BarbieUpNext({ art, track, singers, np, roles, guestsMap, showVideo = false }: UpNextProps) {
    useSunshine()
    const hidden = !!np?.isHidden
    const title = hidden ? 'Surprise Song' : track?.name || ''
    const artist = (track?.artists || []).map((a: any) => a.name).join(', ')
    const dur = track?.duration_ms
        ? `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`
        : ''
    // The sun comes out the moment the song is announced.
    useEffect(() => {
        const id = window.setTimeout(() => forceGlint(), 900)
        return () => window.clearTimeout(id)
    }, [track?.id])
    const titleSize = fit(96, title, 50, 1.4)
    const { W } = useSetScale()
    // Portaled to <body>: this renders inside .k-lyrics, whose fade mask would
    // otherwise eat the top and bottom of a full-screen layer.
    return createPortal(
        <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
                <BarbieSky variant="upnext" showVideo={showVideo} />
            </div>
            <DesignLayer z={11}>
                {/* the awning across the top of the screen, full bleed */}
                <div style={{ position: 'absolute', top: 0, left: -(W - 1920) / 2, width: W }}>
                    <Awning width={W} canopy={46} valance={56} scallop={26} valanceColor={BARB.PINK}>
                        <span style={{ fontFamily: BARB.FONT_DISPLAY, fontSize: 40, color: BARB.WHITE, textShadow: `0 3px 0 ${BARB.RASPBERRY}`, letterSpacing: '0.02em' }}>Up next</span>
                    </Awning>
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 188, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div key={track?.id || title} className="barb-sunrise" style={{ position: 'relative' }}>
                        <ArtSun art={art} size={300} hidden={hidden} />
                        {hidden && (
                            // A surprise is the sun behind a cloud.
                            <div style={{ position: 'absolute', left: -150, top: 120, width: 600 }}>
                                <PaintedCloud width={600} seed={0.58} />
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 96 }}>
                                    <span style={{ ...barbText.script(58, BARB.PINK) }}>it's a surprise!</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <RetroTitle as="h1" text={title} size={titleSize} className="barb-rise" style={{ animationDelay: '0.5s', marginTop: hidden ? 70 : 48, maxWidth: 1500, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'visible' }} />
                    {!hidden && (
                        <div className="barb-rise" style={{ animationDelay: '0.6s', marginTop: 10 }}>
                            <GlossPill tone="white" style={{ padding: '6px 28px 8px', display: 'flex', alignItems: 'baseline', gap: 14 }}>
                                <span style={{ ...barbText.body(28, BARB.PLUM, 700) }}>{artist}</span>
                                {dur && <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: BARB.CANDY, alignSelf: 'center' }} />}
                                {dur && <span style={{ ...barbText.body(22, BARB.MUTED, 600) }}>{dur}</span>}
                            </GlossPill>
                        </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 44, marginTop: 30, maxWidth: 1500 }}>
                        {singers.map((s: any, i: number) => {
                            const roleStr = !hidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                                ? s.roleIndices.map((ri: number) => roles[ri]).filter(Boolean).join(' & ')
                                : ''
                            const g = s.guestId ? guestsMap.get(s.guestId) : undefined
                            const nm: string = g?.name ?? s.name
                            const pic: string | null = g?.profile_picture ?? null
                            const tilt = (barbHash(nm || String(i)) - 0.5) * 9
                            return (
                                <div key={s.id} className="barb-pop-in" style={{ animationDelay: `${0.75 + i * 0.12}s`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                                    <HiBubble name={nm} color={s.color} tilt={tilt} />
                                    <SingerSun color={s.color} size={128} picture={pic} initial={(nm || '?').charAt(0).toUpperCase()} />
                                    {roleStr && (
                                        <span style={{ ...barbText.caps(14, BARB.PLUM), background: 'rgba(255,255,255,0.9)', padding: '4px 12px', borderRadius: 999 }}>{roleStr}</span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </DesignLayer>
        </>,
        document.body,
    )
}

// ── Count-in: rise and shine ─────────────────────────────────────────────────

export function BarbieCountIn({
    remaining,
    count,
    barPct,
    trackName,
    className,
    innerRef,
    stageFont,
}: {
    remaining: number
    count: number
    barPct: number
    trackName: string
    className: string
    innerRef: React.Ref<HTMLDivElement>
    stageFont: (px: number) => string
}) {
    useSunshine()
    const fired = useRef(false)
    useEffect(() => {
        if (remaining <= 0 && !fired.current) {
            fired.current = true
            forceGlint()
            burstGlitter(1.3)
        }
    }, [remaining])

    const W = 640
    const H = 250
    const sea = 74
    // The sun climbs out of the water, and is fully up by the last three
    // beats, so they land on the whole disc.
    const p = Math.min(1, barPct / 100)
    const firstStart = p < 1 ? remaining / Math.max(0.0001, 1 - p) : 0
    const sunP = p >= 1 ? 1 : Math.min(1, (firstStart - remaining) / Math.max(1, firstStart - 3200))
    const sunSize = 168
    // from just under the waterline (only its rays showing) to high in the sky
    const sunFrom = H - sea - 18
    const sunTo = (H - sea) / 2 - sunSize / 2 + 8
    const sunTop = sunFrom + (sunTo - sunFrom) * sunP
    const go = remaining <= 0
    let numeral: ReactNode = null
    if (go) numeral = null
    else if (count <= 3) numeral = <RetroTitle key={count} text={String(count)} size={92} className="barb-beat" outlineW={0.06} depth={0.08} />

    return (
        <div ref={innerRef} className={className} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
            <div className="barb-pop-in" style={{ position: 'relative' }}>
                <div style={{ filter: 'drop-shadow(0 18px 28px rgba(176,17,94,0.35))' }}>
                    <div
                        style={{
                            position: 'relative',
                            width: W,
                            height: H,
                            // a 60s television screen: corners rounder than a rectangle's
                            borderRadius: '46px / 40px',
                            border: `7px solid ${BARB.WHITE}`,
                            overflow: 'hidden',
                            background: `linear-gradient(180deg, ${BARB.SKY_TOP} 0%, ${BARB.SKY_PINK} 62%, ${BARB.SKY_PEACH} 100%)`,
                            boxShadow: `0 0 0 4px ${BARB.CANDY}, inset 0 0 0 2px rgba(176,17,94,0.12)`,
                        }}
                    >
                        <div style={{ position: 'absolute', left: W / 2 - sunSize / 2, top: sunTop, transition: 'top 0.25s linear' }}>
                            <PaintedSun size={sunSize} rays="burst" />
                            {numeral && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 6 }}>{numeral}</div>}
                        </div>
                        <PaintedCloud width={200} seed={0.21} style={{ position: 'absolute', left: -30, top: 18 }} />
                        <PaintedCloud width={170} seed={0.77} flip style={{ position: 'absolute', right: -22, top: 64 }} tone="blush" />
                        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: sea }}>
                            <div style={{ height: 8, background: BARB.WHITE }} />
                            <PoolWater width={W} height={sea - 8} seed={0.52} />
                        </div>
                        {!go && count > 3 && (
                            <div style={{ position: 'absolute', left: 0, right: 0, top: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <span style={{ ...barbText.script(46, BARB.WHITE), textShadow: `0 3px 0 ${BARB.PINK}` }}>rise and shine</span>
                            </div>
                        )}
                        {go && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: sea - 10 }}>
                                <RetroTitle text="Sing!" size={110} className="barb-beat" />
                            </div>
                        )}
                    </div>
                </div>
                {!go && count > 3 && (
                    <div style={{ marginTop: 14, textAlign: 'center' }}>
                        <span style={{ fontFamily: BARB.FONT_DISPLAY, fontSize: stageFont(30), color: BARB.WHITE, textShadow: `0 3px 0 ${BARB.PINK}, 0 6px 16px rgba(122,16,78,0.45)`, maxWidth: W, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trackName}</span>
                    </div>
                )}
                <GlitterBurst x={50} y={45} spread={1.2} />
            </div>
        </div>
    )
}

// ── Interlude ────────────────────────────────────────────────────────────────

export function BarbieBreak({ progress }: { progress: number }) {
    useSunshine()
    const p = Math.min(1, Math.max(0, progress))
    // The sun's day, sunrise to sunset, along a dotted arc.
    const a = Math.PI * (1 - p)
    const cx = 34 + Math.cos(a) * 26
    const cy = 34 - Math.sin(a) * 22
    return (
        <div className="barb-pop-in">
            <GlossPill tone="white" style={{ padding: '8px 28px 8px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <svg width="68" height="42" viewBox="0 0 68 42" aria-hidden style={{ overflow: 'visible' }}>
                    <path d="M 8 34 A 26 22 0 0 1 60 34" fill="none" stroke={BARB.CANDY} strokeWidth="2.4" strokeDasharray="1 5" strokeLinecap="round" />
                    <line x1="2" y1="36" x2="66" y2="36" stroke={BARB.POOL} strokeWidth="3" strokeLinecap="round" />
                    <circle cx={cx} cy={cy} r="8" fill={BARB.SUN} stroke="#FFFFFF" strokeWidth="2" />
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontFamily: BARB.FONT_DISPLAY, fontSize: 28, color: BARB.PINK, lineHeight: 1.1 }}>Catch some rays</span>
                    <span style={{ ...barbText.caps(11, BARB.MUTED), marginTop: 2 }}>instrumental</span>
                </div>
            </GlossPill>
        </div>
    )
}

// ── Paused ───────────────────────────────────────────────────────────────────

export function BarbiePaused({ stageFont }: { stageFont: (px: number) => string }) {
    return (
        <div className="barb-pop-in">
            <GlossPill tone="pink" style={{ padding: '12px 36px 14px 22px', display: 'flex', alignItems: 'center', gap: 18 }}>
                <HeartShades width={86} frame={BARB.WHITE} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontFamily: BARB.FONT_DISPLAY, fontSize: stageFont(42), color: BARB.WHITE, lineHeight: 1.1, textShadow: `0 3px 0 ${BARB.RASPBERRY}` }}>Hold that pose!</span>
                    <span style={{ ...barbText.caps(13, BARB.BLUSH), marginTop: 2 }}>paused</span>
                </div>
            </GlossPill>
        </div>
    )
}

// ── No lyrics ────────────────────────────────────────────────────────────────

export function BarbieNoLyrics({ stageFont }: { stageFont: (px: number) => string }) {
    useSunshine()
    return (
        <div style={{ display: 'flex', justifyContent: 'center' }} className="barb-pop-in">
            <div style={{ position: 'relative', width: 760 }}>
                <PaintedSun size={190} style={{ position: 'absolute', right: 70, top: -44 }} />
                <PaintedCloud width={760} seed={0.36} style={{ position: 'relative', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 120 }}>
                    <span style={{ fontFamily: BARB.FONT_DISPLAY, fontSize: stageFont(40), color: BARB.PINK, lineHeight: 1.1 }}>No lyrics for this one</span>
                    <span style={{ ...barbText.script(36, BARB.PLUM_SOFT), marginTop: 4 }}>sing it your way</span>
                </div>
            </div>
        </div>
    )
}

// ── QR card ──────────────────────────────────────────────────────────────────

/** A postcard from the party, tucked in the corner. */
export function BarbieQrCard({ qr }: { qr: string }) {
    return (
        <div className="k-qr-card" style={{ position: 'relative', transform: 'rotate(-3deg)' }}>
            <DeckleCard r={5} cardStyle={{ padding: '10px 12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ ...barbText.script(21, BARB.PINK), marginBottom: 4, paddingRight: 22 }}>join the party</div>
                <img src={qr} alt="QR" style={{ width: 88, height: 88, display: 'block' }} />
            </DeckleCard>
            {/* the stamp: a little sun */}
            <div style={{ position: 'absolute', right: -16, top: -16, transform: 'rotate(9deg)' }}>
                <DeckleCard r={3} color={BARB.CANDY} cardStyle={{ padding: 5 }}>
                    <div style={{ width: 30, height: 30, background: BARB.SKY_MID, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PaintedSun size={34} rays="burst" spin={false} halo={false} />
                    </div>
                </DeckleCard>
            </div>
        </div>
    )
}

// ── Song chip / singer tags ──────────────────────────────────────────────────

export function BarbieSongChip({ art, title, artist }: { art: string | null | undefined; title: string; artist: string }) {
    useSunshine()
    return (
        <GlossPill tone="white" style={{ padding: '6px 22px 6px 6px', maxWidth: 'min(38vw, 520px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {art && (
                    <div style={{ position: 'relative', width: 50, height: 50, flexShrink: 0 }}>
                        <div style={{ position: 'absolute', left: -9, top: -9 }}>
                            <PaintedSun size={68} rays="scallop" halo={false} />
                        </div>
                        <img src={art} alt="" style={{ position: 'absolute', inset: 4, width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 0 2px #FFFFFF' }} />
                    </div>
                )}
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: BARB.FONT_DISPLAY, fontSize: 20, color: BARB.PINK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{title}</div>
                    <div style={{ ...barbText.body(13, BARB.MUTED, 600), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist}</div>
                </div>
            </div>
        </GlossPill>
    )
}

export function BarbieSingerTag({ children, color, index }: { children: ReactNode; color: string; index: number }) {
    return (
        <div className="barb-pop-in" style={{ animationDelay: `${index * 0.08}s` }}>
            <GlossPill tone="white" style={{ padding: '4px 16px 4px 6px', boxShadow: `0 0 0 3px ${color}, 0 8px 20px rgba(176,17,94,0.26), inset 0 -3px 0 ${BARB.BLUSH}` }}>
                {children}
            </GlossPill>
        </div>
    )
}

/** Name + picture + a sun that shines with their voice: the Barbie MicMeter body. */
export function BarbieMicBody({ name, picture, color, meter }: { name: string; picture: string | null; color: string; meter: ReactNode }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {picture ? (
                <img src={picture} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', boxShadow: `0 0 0 2px #FFFFFF, 0 0 0 4px ${color}` }} />
            ) : (
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: color, boxShadow: '0 0 0 2px #FFFFFF', display: 'inline-block', marginLeft: 4 }} />
            )}
            <span style={{ fontFamily: BARB.FONT_DISPLAY, fontSize: 18, color: BARB.PLUM, lineHeight: 1.2 }}>{name}</span>
            {meter}
        </span>
    )
}
