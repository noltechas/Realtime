// The gothic stage's screens. Each is one moment in the same building:
//
//   GothicIdle       the join wall: a rose window with the moon behind it, two
//                    lancets full of storm, the register pinned between two
//                    altar candles, and something watching the code
//   GothicUpNext     the song's art glazed into a lancet window, its singers
//                    as rose-window roundels in their own colours
//   GothicCountIn    the bell tolls the singer in (III, II, I) while a candle
//                    burns down to the first line
//   GothicBreak      an hourglass running out through the interlude
//   GothicPaused     a seal pressed into crimson wax
//   GothicNoLyrics, GothicQrCard, GothicSongChip, GothicSingerPlaque
//
// Copy rule for every string here: no em dashes, ever.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GOTH, gothHash } from '../../styles/gothic'
import { GothicChapel } from './GothicChapel'
import { GothicCandle } from './GothicCandle'
import { GothBell, GothHourglass, GothIronRule, GothLancet, GothParchment, GothPlaque, GothRose, GothWaxSeal, GothGlassDot } from './GothicParts'
import { forceStrike, retainStormBridge } from './storm'

// ── Type ─────────────────────────────────────────────────────────────────────

/** Fraktur, lit like carved bone with candlelight coming up from below. */
export const frakturLit: CSSProperties = {
    fontFamily: GOTH.FONT_FRAKTUR,
    fontWeight: 400,
    lineHeight: 1.04,
    backgroundImage: 'linear-gradient(180deg, #F7F1E4 0%, #E8DFCC 46%, #EDC27E 86%, #D98E3E 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    // Shadows as filters, not text-shadow: a text-shadow behind a transparent,
    // background-clipped fill shows THROUGH the letters.
    filter: 'drop-shadow(0 0.035em 0 rgba(0,0,0,0.9)) drop-shadow(0 0 0.32em rgba(227,176,75,0.24))',
}

/** Shrink display type as a title gets longer, so any length sits on one plate. */
const fit = (base: number, text: string, min: number, per = 1.1) => Math.max(min, Math.round(base - Math.max(0, (text || '').length - 16) * per))

// ── Scale ────────────────────────────────────────────────────────────────────
// The chapel screens are drawn in 1080p design pixels and scaled as one piece
// to the screen's height, so an object and its light stay where they belong
// relative to the windows on any display.

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
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${s})`, transformOrigin: '0 0' }}>
            {children}
        </div>
    )
}

// ── Idle: the join wall ──────────────────────────────────────────────────────

export function GothicIdle({ qrUrl, sessionCode }: { qrUrl: string | null; sessionCode: string | null }) {
    return (
        <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: GOTH.VOID }}>
            <GothicChapel variant="idle" eyesTarget="[data-goth-watch]">
                <Design>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 466, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h1 className="goth-rise" style={{ ...frakturLit, fontSize: 104, margin: 0, padding: '0 0.1em', letterSpacing: '0.005em' }}>
                            Join the Choir
                        </h1>
                        <GothIronRule width={460} style={{ margin: '6px 0 4px' }} />
                        <p className="goth-rise" style={{ animationDelay: '0.12s', fontFamily: GOTH.FONT_SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 30, letterSpacing: '0.08em', color: GOTH.BONE_DIM, margin: '0 0 22px', textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>
                            Scan to raise your voice
                        </p>
                        {qrUrl && (
                            <div className="goth-rise" style={{ animationDelay: '0.2s' }}>
                                <GothParchment style={{ padding: '22px 24px 12px' }}>
                                    <img data-goth-watch src={qrUrl} alt="QR" style={{ width: 196, height: 196, display: 'block', mixBlendMode: 'multiply' }} />
                                    <div style={{ fontFamily: GOTH.FONT_FRAKTUR, fontSize: 30, color: '#3A220E', textAlign: 'center', marginTop: 6, lineHeight: 1 }}>
                                        Sign the Register
                                    </div>
                                </GothParchment>
                            </div>
                        )}
                        {sessionCode && (
                            <div className="goth-rise" style={{ animationDelay: '0.28s', marginTop: 20 }}>
                                <GothPlaque cusp={11} tone="crypt" contentStyle={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '10px 30px 12px' }}>
                                    <span style={{ fontFamily: GOTH.FONT_FRAKTUR, fontSize: 30, color: GOTH.CANDLE, textShadow: '0 0 12px rgba(227,176,75,0.35)' }}>Chapel</span>
                                    <span style={{ fontFamily: GOTH.FONT_SERIF, fontWeight: 700, fontSize: 38, letterSpacing: '0.3em', marginRight: '-0.3em', color: GOTH.BONE, textShadow: '0 0 18px rgba(227,176,75,0.3)' }}>
                                        {sessionCode}
                                    </span>
                                </GothPlaque>
                            </div>
                        )}
                    </div>
                </Design>
            </GothicChapel>
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

export function GothicUpNext({ art, track, singers, np, roles, guestsMap, showVideo = false }: UpNextProps) {
    const hidden = !!np?.isHidden
    const title = hidden ? 'A Sealed Hymn' : track?.name || ''
    const dur = track?.duration_ms
        ? `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`
        : ''
    const titleSize = fit(70, title, 36)
    // Portaled to <body>: this renders inside .k-lyrics, whose fade mask would
    // otherwise eat the top and bottom of a full-screen layer.
    return createPortal(
        <>
            {/* The chapel is fixed behind the lyric layer, the way every theme's
                up-next backdrop paints between the art (z 0) and the chrome. */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
                <GothicChapel variant="upnext" showVideo={showVideo} eyesTarget="[data-goth-watch]" />
            </div>
            <div style={{ position: 'fixed', inset: 0, zIndex: 11, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(50% - 88.89vh)', width: '177.78vh' }}>
                    <Design>
                        <div style={{ position: 'absolute', left: 0, right: 0, top: 46, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="goth-rise" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                                <GothIronRule width={200} style={{ transform: 'scaleX(-1)' }} />
                                <span style={{ ...frakturLit, fontSize: 58 }}>Up Next</span>
                                <GothIronRule width={200} />
                            </div>
                            <div className="goth-rise" data-goth-watch style={{ animationDelay: '0.08s', marginTop: 10 }}>
                                <GothLancet width={384} height={520} art={hidden ? null : art} quarry={48}>
                                    {hidden && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: 'radial-gradient(ellipse at 50% 60%, #2A0B14 0%, #0B0709 75%)' }}>
                                            <GothWaxSeal size={130} sigil="skull" className="goth-seal-press" />
                                        </div>
                                    )}
                                </GothLancet>
                            </div>
                            <h1 className="goth-rise" style={{ animationDelay: '0.16s', fontFamily: GOTH.FONT_GOTHIC, fontWeight: 700, fontSize: titleSize, lineHeight: 1.08, color: GOTH.BONE, margin: '18px 0 0', maxWidth: 1080, textAlign: 'center', textShadow: '0 3px 0 rgba(0,0,0,0.85), 0 0 34px rgba(227,176,75,0.22)' }}>
                                {title}
                            </h1>
                            {!hidden && (
                                <p className="goth-rise" style={{ animationDelay: '0.2s', fontFamily: GOTH.FONT_SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 28, color: GOTH.BONE_DIM, margin: '6px 0 0', letterSpacing: '0.04em', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                                    {(track?.artists || []).map((a: any) => a.name).join(', ')}
                                    {dur ? <span style={{ color: GOTH.PEWTER, fontStyle: 'normal' }}>{'   '}{dur}</span> : null}
                                </p>
                            )}
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 34, marginTop: 26, maxWidth: 1180 }}>
                                {singers.map((s: any, i: number) => {
                                    const roleStr = !hidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                                        ? s.roleIndices.map((ri: number) => roles[ri]).filter(Boolean).join(' & ')
                                        : ''
                                    const g = s.guestId ? guestsMap.get(s.guestId) : undefined
                                    const nm = g?.name ?? s.name
                                    const pic = g?.profile_picture ?? null
                                    return (
                                        <div key={s.id} className="goth-rise" style={{ animationDelay: `${0.26 + i * 0.07}s`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                            <GothRose
                                                size={122}
                                                colors={[s.color, `color-mix(in srgb, ${s.color}, #000 35%)`]}
                                                petals={8}
                                                center={pic ? (
                                                    <img src={pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                ) : (
                                                    <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontFamily: GOTH.FONT_FRAKTUR, fontSize: 30, color: GOTH.BONE, background: `radial-gradient(circle, color-mix(in srgb, ${s.color}, #000 40%), #0A090D)` }}>
                                                        {(nm || '?').charAt(0)}
                                                    </span>
                                                )}
                                                style={{ filter: `drop-shadow(0 0 18px color-mix(in srgb, ${s.color}, transparent 55%)) drop-shadow(0 10px 16px rgba(0,0,0,0.8))` }}
                                            />
                                            <span style={{ fontFamily: GOTH.FONT_GOTHIC, fontWeight: 700, fontSize: 36, color: GOTH.BONE, lineHeight: 1, textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>{nm}</span>
                                            {roleStr && (
                                                <span style={{ fontFamily: GOTH.FONT_SERIF, fontWeight: 700, fontSize: 15, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOTH.PEWTER }}>{roleStr}</span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </Design>
                </div>
            </div>
        </>,
        document.body,
    )
}

// ── Count-in: the bell tolls ─────────────────────────────────────────────────

export function GothicCountIn({
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
    const struck = useRef(false)
    useEffect(() => retainStormBridge(), [])
    // The first line lands with a lightning strike: once per song.
    useEffect(() => {
        if (remaining <= 0 && !struck.current) {
            struck.current = true
            forceStrike()
        }
    }, [remaining])

    const numerals = ['I', 'II', 'III']
    let center: ReactNode
    if (remaining <= 0) {
        center = (
            <div key="go" className="goth-toll-in" style={{ ...frakturLit, fontSize: stageFont(78), marginTop: 2 }}>
                Sing
            </div>
        )
    } else if (count <= 3) {
        center = (
            // Roman capitals, not blackletter: a Fraktur "II" reads as "ll".
            <div key={count} className="goth-toll-in" style={{ fontFamily: GOTH.FONT_SERIF, fontWeight: 700, fontSize: stageFont(86), lineHeight: 1.0, color: GOTH.BONE, letterSpacing: '0.1em', marginRight: '-0.1em', textShadow: '0 4px 0 rgba(0,0,0,0.85), 0 0 30px rgba(227,176,75,0.35)', marginTop: 2 }}>
                {numerals[count - 1]}
            </div>
        )
    } else {
        center = (
            <div style={{ fontFamily: GOTH.FONT_GOTHIC, fontWeight: 700, fontSize: stageFont(30), color: GOTH.BONE, maxWidth: 560, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 8, textShadow: '0 2px 0 rgba(0,0,0,0.8)' }}>
                {trackName}
            </div>
        )
    }
    const burnt = Math.min(1, barPct / 100)
    return (
        <div ref={innerRef} className={className} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '11vh 0 5vh' }}>
            <div className="goth-plaque-in">
                <GothPlaque cusp={20} tone="stone" contentStyle={{ display: 'flex', alignItems: 'flex-end', gap: 30, padding: '24px 40px 26px' }}>
                    {/* The candle burns down to the first line. */}
                    <div style={{ width: 34, height: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <GothicCandle height={Math.max(14, 92 * (1 - burnt * 0.86))} width={26} wax="ivory" seed={0.58} glow={1.2} />
                    </div>
                    <div style={{ minWidth: 340, textAlign: 'center', alignSelf: 'center' }}>
                        <div style={{ fontFamily: GOTH.FONT_FRAKTUR, fontSize: stageFont(26), color: GOTH.CANDLE, lineHeight: 1, textShadow: '0 0 14px rgba(227,176,75,0.4)' }}>Prelude</div>
                        {center}
                    </div>
                    <div style={{ width: 70, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <GothBell key={remaining <= 0 ? 'go' : count <= 3 ? count : 'wait'} size={62} tolling={count <= 3 || remaining <= 0} />
                    </div>
                </GothPlaque>
            </div>
        </div>
    )
}

// ── Interlude ────────────────────────────────────────────────────────────────

export function GothicBreak({ progress }: { progress: number }) {
    useEffect(() => retainStormBridge(), [])
    return (
        <div className="goth-plaque-in">
            <GothPlaque cusp={14} tone="crypt" contentStyle={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 30px 12px 22px' }}>
                <GothHourglass progress={progress} size={26} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontFamily: GOTH.FONT_FRAKTUR, fontSize: 30, color: GOTH.BONE, lineHeight: 1 }}>Interlude</span>
                    <span style={{ fontFamily: GOTH.FONT_SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 15, color: GOTH.PEWTER, letterSpacing: '0.06em', marginTop: 3 }}>the dead are listening</span>
                </div>
            </GothPlaque>
        </div>
    )
}

// ── Paused ───────────────────────────────────────────────────────────────────

export function GothicPaused({ stageFont }: { stageFont: (px: number) => string }) {
    return (
        <div className="goth-plaque-in">
            <GothPlaque cusp={16} tone="crypt" contentStyle={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 34px 14px 18px' }}>
                <GothWaxSeal size={66} sigil="hourglass" className="goth-seal-press" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ ...frakturLit, fontSize: stageFont(44) }}>Paused</span>
                    <span style={{ fontFamily: GOTH.FONT_SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: stageFont(15), color: GOTH.PEWTER, letterSpacing: '0.08em' }}>silence in the nave</span>
                </div>
            </GothPlaque>
        </div>
    )
}

// ── No lyrics ────────────────────────────────────────────────────────────────

export function GothicNoLyrics({ stageFont }: { stageFont: (px: number) => string }) {
    return (
        <div style={{ textAlign: 'center' }} className="goth-plaque-in">
            <GothPlaque cusp={18} tone="stone" style={{ display: 'inline-block' }} contentStyle={{ display: 'flex', alignItems: 'center', gap: 22, padding: '20px 40px 22px' }}>
                <GothicCandle height={56} width={20} wax="blood" seed={0.92} />
                <div style={{ textAlign: 'left' }}>
                    <div style={{ ...frakturLit, fontSize: stageFont(40) }}>No Hymnal for This One</div>
                    <div style={{ fontFamily: GOTH.FONT_SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: stageFont(19), color: GOTH.BONE_DIM, marginTop: 2 }}>Sing it from the soul</div>
                </div>
            </GothPlaque>
        </div>
    )
}

// ── QR card ──────────────────────────────────────────────────────────────────

/** A notice nailed up by the door: small enough to stay out of the lyrics. */
export function GothicQrCard({ qr }: { qr: string }) {
    return (
        <div className="k-qr-card" style={{ position: 'relative', transform: 'rotate(-1.4deg)' }}>
            <GothParchment style={{ padding: '14px 12px 6px' }} nails={false}>
                <span aria-hidden style={{ position: 'absolute', top: 5, left: '50%', marginLeft: -5, width: 10, height: 10, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #8B8594 0%, #3A3640 45%, #0C0B0F 100%)', boxShadow: '0 2px 3px rgba(0,0,0,0.7)' }} />
                <img src={qr} alt="QR" style={{ width: 84, height: 84, display: 'block', mixBlendMode: 'multiply', marginTop: 4 }} />
                <div style={{ fontFamily: GOTH.FONT_FRAKTUR, fontSize: 19, color: '#3A220E', textAlign: 'center', lineHeight: 1.1, marginTop: 2 }}>Join</div>
            </GothParchment>
        </div>
    )
}

// ── Song chip / singer plaque ────────────────────────────────────────────────

export function GothicSongChip({ art, title, artist }: { art: string | null | undefined; title: string; artist: string }) {
    return (
        <GothPlaque cusp={10} tone="crypt" moulding={false} contentStyle={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 18px 7px 8px', maxWidth: 'min(38vw, 520px)' }}>
            {art && (
                <div style={{ width: 40, height: 52, flexShrink: 0, position: 'relative' }}>
                    <GothLancet width={40} height={52} art={art} quarry={12} />
                </div>
            )}
            <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: GOTH.FONT_GOTHIC, fontWeight: 700, fontSize: 19, color: GOTH.BONE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.15 }}>{title}</div>
                <div style={{ fontFamily: GOTH.FONT_SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 14, color: GOTH.PEWTER, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist}</div>
            </div>
        </GothPlaque>
    )
}

export function GothicSingerPlaque({ children, color, index }: { children: ReactNode; color: string; index: number }) {
    return (
        <GothPlaque
            cusp={9}
            tone="crypt"
            moulding={false}
            glow={`color-mix(in srgb, ${color}, transparent 70%)`}
            className="goth-plaque-in"
            style={{ animationDelay: `${index * 0.07}s` }}
            contentStyle={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 14px 5px 10px' }}
        >
            {children}
        </GothPlaque>
    )
}

/** Name + glass + flame, the gothic MicMeter body. */
export function GothicMicBody({ name, picture, color, meter }: { name: string; picture: string | null; color: string; meter: ReactNode }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            {picture ? (
                <img src={picture} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', boxShadow: `0 0 0 2px #060508, 0 0 0 3.5px ${color}, 0 0 10px ${color}` }} />
            ) : (
                <GothGlassDot color={color} size={13} />
            )}
            <span style={{ fontFamily: GOTH.FONT_GOTHIC, fontWeight: 700, fontSize: 17, color: GOTH.BONE, letterSpacing: '0.01em' }}>{name}</span>
            {meter}
        </span>
    )
}

/** A stable small rotation per notice, so pinned-up notices don't sit on a grid. */
export const gothTilt = (key: string) => (gothHash(key) - 0.5) * 2.4
