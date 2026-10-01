// The gothic stage's vocabulary. Every gothic screen is assembled from these
// parts and nothing else, so the idle wall, the up-next window, the lyric
// panel, the count-in and the phone are recognisably one building.
//
//   GothPlaque     a carved stone tablet with cusped corners and a moulded
//                  groove, lit by moonlight from above and candles from below
//   GothLancet     a pointed-arch window whose glass is a picture (album art),
//                  leaded into quarries and lit from behind
//   GothRose       a rose window, its petals glazed in whatever colours it is
//                  given (the singers' colours, on a singer's roundel)
//   GothIronRule   a wrought-iron divider with a quatrefoil boss
//   GothBell, GothHourglass, GothWaxSeal, GothParchment, GothFlameMeter
//
// Lighting convention, held everywhere: the MOON is above and to the left
// (cold catch-light on top edges), CANDLES are below (warm light on lower
// edges and under-surfaces). A surface lit any other way reads as a sticker.

import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { GOTH, GOTH_GRAIN, GOTH_SOOT, GOTH_GLASS, GOTH_VELLUM, gothCusp, lancetClip, lancetPath } from '../../styles/gothic'

// ── Plaque ───────────────────────────────────────────────────────────────────

type Tone = 'stone' | 'crypt' | 'iron'

const FACE: Record<Tone, string> = {
    stone: `linear-gradient(176deg, #2B2733 0%, ${GOTH.STONE} 38%, #15131B 78%, #1E1714 100%)`,
    crypt: `linear-gradient(176deg, #1A1720 0%, #100E14 50%, #0B0A0E 82%, #161009 100%)`,
    iron: `linear-gradient(180deg, #24212A 0%, #121116 40%, #0B0A0E 100%)`,
}

const EDGE: Record<Tone, string> = {
    stone: 'linear-gradient(180deg, rgba(196,210,238,0.55) 0%, #3B3645 18%, #1C1922 64%, rgba(227,176,75,0.6) 100%)',
    crypt: 'linear-gradient(180deg, rgba(175,195,234,0.42) 0%, #2C2834 22%, #141218 70%, rgba(227,176,75,0.48) 100%)',
    iron: 'linear-gradient(180deg, #6A6474 0%, #2A2730 30%, #0A090C 100%)',
}

/** The face texture stack. `off` shifts every layer so an inner layer inset by
 *  `off` px paints exactly the same pixels as the outer face would there. */
function faceLayers(tone: Tone, off: number): CSSProperties {
    const o = `${-off}px ${-off}px`
    const grow = `calc(100% + ${off * 2}px) calc(100% + ${off * 2}px)`
    return {
        backgroundImage: `${GOTH_GRAIN}, ${GOTH_SOOT}, ${FACE[tone]}`,
        backgroundSize: `240px 240px, 520px 520px, ${grow}`,
        backgroundPosition: `${o}, ${o}, ${o}`,
        backgroundRepeat: 'repeat, repeat, no-repeat',
    }
}

export interface GothPlaqueProps {
    children?: ReactNode
    /** Cusp radius in px. */
    cusp?: number
    tone?: Tone
    /** Draw the carved groove that follows the outline inside the edge. */
    moulding?: boolean
    /** A coloured light behind the plaque (a singer's glass, a flame). */
    glow?: string
    style?: CSSProperties
    contentStyle?: CSSProperties
    className?: string
}

export function GothPlaque({
    children,
    cusp = 14,
    tone = 'stone',
    moulding = true,
    glow,
    style,
    contentStyle,
    className,
}: GothPlaqueProps) {
    const shadow = [
        'drop-shadow(0 12px 22px rgba(0,0,0,0.75))',
        glow ? `drop-shadow(0 0 22px ${glow})` : 'drop-shadow(0 10px 18px rgba(227,150,60,0.16))',
    ].join(' ')
    const G = 7 // groove inset
    return (
        <div className={className} style={{ position: 'relative', isolation: 'isolate', filter: shadow, ...style }}>
            <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -1, background: EDGE[tone], ...gothCusp(cusp) }} />
            <div aria-hidden style={{ position: 'absolute', inset: 1.5, zIndex: -1, ...faceLayers(tone, 1.5), ...gothCusp(cusp, 1.5) }} />
            {moulding && (
                <>
                    {/* The groove: dark on its upper wall, catching candlelight on its lower lip. */}
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute', inset: G, zIndex: -1,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.6) 60%, rgba(227,176,75,0.45) 100%)',
                            ...gothCusp(cusp, G),
                        }}
                    />
                    <div aria-hidden style={{ position: 'absolute', inset: G + 1.6, zIndex: -1, ...faceLayers(tone, G + 1.6), ...gothCusp(cusp, G + 1.6) }} />
                </>
            )}
            <div style={{ position: 'relative', ...contentStyle }}>{children}</div>
        </div>
    )
}

// ── Lancet window ────────────────────────────────────────────────────────────

/** Diamond quarries of lead, the way plain glass was glazed. */
const QUARRY = (cell: number, w = 1.6) =>
    `repeating-linear-gradient(60deg, transparent 0 ${cell - w}px, rgba(6,5,8,0.9) ${cell - w}px ${cell}px), ` +
    `repeating-linear-gradient(-60deg, transparent 0 ${cell - w}px, rgba(6,5,8,0.9) ${cell - w}px ${cell}px)`

export function GothLancet({
    width,
    height,
    art,
    children,
    quarry = 34,
    style,
}: {
    width: number
    height: number
    /** The picture glazed into the window. */
    art?: string | null
    /** Rendered inside the glass instead of art (a sealed secret song). */
    children?: ReactNode
    quarry?: number
    style?: CSSProperties
}) {
    const frame = 22 // stone surround
    const gw = width - frame * 2
    const gh = height - frame
    const clip = useMemo(() => lancetClip(gw / gh), [gw, gh])
    const rings = [0, 7, 13]
    return (
        <div style={{ position: 'relative', width, height, ...style }}>
            {/* Light thrown forward through the glass onto the stone around it. */}
            {art && (
                <img
                    src={art}
                    alt=""
                    aria-hidden
                    style={{
                        position: 'absolute', left: '50%', top: '52%', width: width * 1.5, height: height * 1.25,
                        transform: 'translate(-50%, -50%)', objectFit: 'cover', filter: 'blur(48px) saturate(1.6)',
                        opacity: 'calc(0.22 + var(--goth-flash, 0) * 0.4)' as unknown as number, pointerEvents: 'none',
                    }}
                />
            )}
            {/* Stone surround: the moulded arch, three receding orders. */}
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                <defs>
                    <linearGradient id={`gl-st-${width}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3A3544" />
                        <stop offset="55%" stopColor="#1E1B24" />
                        <stop offset="100%" stopColor="#2A1F18" />
                    </linearGradient>
                </defs>
                <path d={lancetPath(width, height, 0)} fill={`url(#gl-st-${width})`} />
                {rings.map((r, i) => (
                    <path
                        key={r}
                        d={lancetPath(width, height + r, r)}
                        transform={`translate(0 ${-r * 0})`}
                        fill="none"
                        stroke={i % 2 === 0 ? 'rgba(175,195,234,0.28)' : 'rgba(0,0,0,0.7)'}
                        strokeWidth={i === 0 ? 1.5 : 2.5}
                    />
                ))}
            </svg>
            {/* The glass. */}
            <div
                style={{
                    position: 'absolute', left: frame, top: frame, width: gw, height: gh,
                    clipPath: clip, background: '#0B0A10', overflow: 'hidden',
                }}
            >
                {art ? (
                    <img
                        src={art}
                        alt=""
                        style={{
                            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                            filter: 'saturate(1.35) contrast(1.06) brightness(calc(1.02 + var(--goth-flash, 0) * 0.55))',
                        }}
                    />
                ) : null}
                {children}
                {/* Glass is never flat: streaks and seeds of uneven thickness. */}
                <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: GOTH_GLASS, backgroundSize: '180px 180px', mixBlendMode: 'overlay', opacity: 0.55 }} />
                {/* Lead quarries. */}
                <div aria-hidden style={{ position: 'absolute', inset: -2, backgroundImage: QUARRY(quarry), opacity: 0.62 }} />
                {/* Light falls off toward the jambs, as backlit glass does. */}
                <div aria-hidden style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 40px rgba(0,0,0,0.75), inset 0 -30px 50px rgba(0,0,0,0.4)' }} />
            </div>
            {/* The cusped inner arch: three little foils hanging in the head. */}
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <path d={lancetPath(width, height + frame, frame)} fill="none" stroke="#08070A" strokeWidth="5" />
                <path d={lancetPath(width, height + frame, frame)} fill="none" stroke="rgba(175,195,234,0.22)" strokeWidth="1" />
            </svg>
        </div>
    )
}

// ── Rose window ──────────────────────────────────────────────────────────────

/**
 * A rose window: `petals` lancet-tipped lights around a central oculus, with a
 * ring of small roundels. Colours are walked round the petals, so a single
 * singer glazes the whole window in their colour and a duet alternates panes.
 */
export function GothRose({
    size,
    colors,
    petals = 8,
    center,
    lit = 1,
    style,
}: {
    size: number
    colors: string[]
    petals?: number
    /** Painted in the oculus (a portrait, a sigil). */
    center?: ReactNode
    /** 0..1 how brightly it is lit from behind. */
    lit?: number
    style?: CSSProperties
}) {
    const c = size / 2
    const rOuter = c * 0.95
    const rInner = c * 0.36
    const palette = colors.length > 0 ? colors : [GOTH.RUBY, GOTH.SAPPHIRE]
    const petal = (i: number) => {
        const a0 = (i / petals) * Math.PI * 2 - Math.PI / 2
        const half = (Math.PI / petals) * 0.78
        const r0 = rInner * 1.12
        const r1 = rOuter * 0.86
        const p = (r: number, a: number) => `${(c + Math.cos(a) * r).toFixed(2)} ${(c + Math.sin(a) * r).toFixed(2)}`
        // Petal: straight sides out from the hub, closing in a pointed arch.
        const tipR = rOuter * 0.97
        return `M ${p(r0, a0 - half * 0.55)} L ${p(r1, a0 - half)} Q ${p(tipR, a0 - half * 0.45)} ${p(tipR, a0)} Q ${p(tipR, a0 + half * 0.45)} ${p(r1, a0 + half)} L ${p(r0, a0 + half * 0.55)} Z`
    }
    const id = useMemo(() => `gr${Math.random().toString(36).slice(2, 8)}`, [])
    return (
        <div style={{ position: 'relative', width: size, height: size, ...style }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                <defs>
                    <radialGradient id={`${id}-st`} cx="42%" cy="34%" r="70%">
                        <stop offset="0%" stopColor="#3D3847" />
                        <stop offset="70%" stopColor="#1D1A23" />
                        <stop offset="100%" stopColor="#121016" />
                    </radialGradient>
                    {palette.map((col, i) => (
                        <radialGradient key={i} id={`${id}-g${i}`} cx="50%" cy="50%" r="62%">
                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55 * lit} />
                            <stop offset="35%" stopColor={col} stopOpacity={0.95} />
                            <stop offset="100%" stopColor={col} stopOpacity={0.55} />
                        </radialGradient>
                    ))}
                </defs>
                {/* stone disc */}
                <circle cx={c} cy={c} r={c} fill={`url(#${id}-st)`} />
                <circle cx={c} cy={c} r={c - 1} fill="none" stroke="rgba(175,195,234,0.35)" strokeWidth="1.2" />
                <circle cx={c} cy={c} r={rOuter} fill="#07060A" />
                {/* petals of glass */}
                {Array.from({ length: petals }, (_, i) => (
                    <path key={i} d={petal(i)} fill={`url(#${id}-g${i % palette.length})`} stroke="#060508" strokeWidth={Math.max(1.4, size * 0.018)} strokeLinejoin="round" />
                ))}
                {/* small roundels between the petal tips */}
                {Array.from({ length: petals }, (_, i) => {
                    const a = ((i + 0.5) / petals) * Math.PI * 2 - Math.PI / 2
                    const r = rOuter * 0.84
                    return <circle key={i} cx={c + Math.cos(a) * r} cy={c + Math.sin(a) * r} r={size * 0.045} fill={`url(#${id}-g${(i + 1) % palette.length})`} stroke="#060508" strokeWidth={Math.max(1, size * 0.012)} />
                })}
                {/* hub */}
                <circle cx={c} cy={c} r={rInner} fill="#0A090D" stroke="#060508" strokeWidth={size * 0.02} />
                <circle cx={c} cy={c} r={rInner + size * 0.012} fill="none" stroke="rgba(175,195,234,0.3)" strokeWidth="1" />
            </svg>
            {center && (
                <div style={{ position: 'absolute', left: c - rInner + 2, top: c - rInner + 2, width: (rInner - 2) * 2, height: (rInner - 2) * 2, borderRadius: '50%', overflow: 'hidden' }}>
                    {center}
                </div>
            )}
        </div>
    )
}

// ── Iron rule ────────────────────────────────────────────────────────────────

export function GothIronRule({ width = 360, color = GOTH.IRON_HI, style }: { width?: number; color?: string; style?: CSSProperties }) {
    const m = width / 2
    return (
        <svg width={width} height="22" viewBox={`0 0 ${width} 22`} style={{ display: 'block', overflow: 'visible', ...style }}>
            <defs>
                <linearGradient id={`gir-${width}`} x1="0" x2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0" />
                    <stop offset="22%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="78%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={`M 0 11 L ${m - 22} 11 M ${m + 22} 11 L ${width} 11`} stroke={`url(#gir-${width})`} strokeWidth="1.6" />
            {/* scroll terminals curling in toward the boss */}
            <path d={`M ${m - 22} 11 C ${m - 30} 3, ${m - 42} 6, ${m - 40} 11 C ${m - 38} 15, ${m - 32} 14, ${m - 33} 11`} fill="none" stroke={color} strokeWidth="1.5" />
            <path d={`M ${m + 22} 11 C ${m + 30} 3, ${m + 42} 6, ${m + 40} 11 C ${m + 38} 15, ${m + 32} 14, ${m + 33} 11`} fill="none" stroke={color} strokeWidth="1.5" />
            {/* quatrefoil boss */}
            {[0, 90, 180, 270].map((a) => (
                <circle key={a} cx={m + Math.cos((a * Math.PI) / 180) * 5.2} cy={11 + Math.sin((a * Math.PI) / 180) * 5.2} r="4.6" fill="none" stroke={color} strokeWidth="1.5" />
            ))}
            <circle cx={m} cy={11} r="2.4" fill={GOTH.CANDLE} opacity="0.9" />
        </svg>
    )
}

// ── Bell ─────────────────────────────────────────────────────────────────────

/** A bronze bell. Re-key it to make it toll (each mount swings once and rings
 *  out a shock ring). */
export function GothBell({ size = 70, tolling = false, style }: { size?: number; tolling?: boolean; style?: CSSProperties }) {
    return (
        <div style={{ position: 'relative', width: size, height: size * 1.15, ...style }}>
            {tolling && (
                <>
                    <span className="goth-toll-ring" style={{ position: 'absolute', left: '50%', top: '62%', width: size * 1.1, height: size * 1.1 }} />
                    <span className="goth-toll-ring goth-toll-ring--late" style={{ position: 'absolute', left: '50%', top: '62%', width: size * 1.1, height: size * 1.1 }} />
                </>
            )}
            <svg
                viewBox="0 0 100 115"
                width={size}
                height={size * 1.15}
                className={tolling ? 'goth-bell-swing' : undefined}
                style={{ position: 'relative', display: 'block', overflow: 'visible', transformOrigin: '50% 6%' }}
            >
                <defs>
                    <linearGradient id="goth-bronze" x1="0" x2="1">
                        <stop offset="0%" stopColor="#3A2A14" />
                        <stop offset="28%" stopColor="#9A7232" />
                        <stop offset="42%" stopColor="#E5C27A" />
                        <stop offset="58%" stopColor="#9A7232" />
                        <stop offset="100%" stopColor="#2B1E0C" />
                    </linearGradient>
                </defs>
                <path d="M44 4 h12 v10 h-12 Z" fill="#2B2730" />
                <path d="M50 12 C 30 12 24 30 23 52 C 22 70 18 86 6 96 L 94 96 C 82 86 78 70 77 52 C 76 30 70 12 50 12 Z" fill="url(#goth-bronze)" stroke="#1C1408" strokeWidth="2" />
                <path d="M8 96 Q 50 106 92 96 L 92 100 Q 50 111 8 100 Z" fill="#7A5A26" stroke="#1C1408" strokeWidth="1.5" />
                <path d="M30 40 Q 50 34 70 40" stroke="rgba(255,236,190,0.5)" strokeWidth="2" fill="none" />
                <circle cx="50" cy="104" r="7" fill="#2B2018" stroke="#120C06" strokeWidth="1.5" />
            </svg>
        </div>
    )
}

// ── Hourglass ────────────────────────────────────────────────────────────────

export function GothHourglass({ progress, size = 30 }: { progress: number; size?: number }) {
    const p = Math.max(0, Math.min(1, progress))
    const top = 1 - p
    const h = size * 1.6
    return (
        <svg viewBox="0 0 40 64" width={size} height={h} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
                <clipPath id="goth-hg-top"><path d="M8 8 C 8 22 18 28 20 32 C 22 28 32 22 32 8 Z" /></clipPath>
                <clipPath id="goth-hg-bot"><path d="M20 32 C 18 36 8 42 8 56 L 32 56 C 32 42 22 36 20 32 Z" /></clipPath>
            </defs>
            {/* glass */}
            <path d="M8 8 C 8 22 18 28 20 32 C 18 36 8 42 8 56 L 32 56 C 32 42 22 36 20 32 C 22 28 32 22 32 8 Z" fill="rgba(175,195,234,0.10)" stroke="rgba(175,195,234,0.45)" strokeWidth="1.2" />
            {/* sand above, sinking */}
            <g clipPath="url(#goth-hg-top)">
                <rect x="0" y={8 + (1 - top) * 24} width="40" height="30" fill={GOTH.CANDLE} opacity="0.95" />
            </g>
            {/* sand below, rising as a mound */}
            <g clipPath="url(#goth-hg-bot)">
                <path d={`M 4 56 L 4 ${56 - p * 14} Q 20 ${56 - p * 26} 36 ${56 - p * 14} L 36 56 Z`} fill={GOTH.CANDLE} opacity="0.95" />
            </g>
            {p < 0.995 && <rect x="19.4" y="31" width="1.2" height={24 - p * 18} fill={GOTH.FLAME} className="goth-sand-stream" />}
            {/* iron frame */}
            <rect x="3" y="2" width="34" height="6" rx="1.5" fill="#2A2630" stroke="#0C0B0E" />
            <rect x="3" y="56" width="34" height="6" rx="1.5" fill="#2A2630" stroke="#0C0B0E" />
            <rect x="4" y="8" width="2.4" height="48" fill="#1C1A20" />
            <rect x="33.6" y="8" width="2.4" height="48" fill="#1C1A20" />
        </svg>
    )
}

// ── Wax seal ─────────────────────────────────────────────────────────────────

/** A pressed seal in crimson wax: irregular puddle, embossed ring and sigil. */
export function GothWaxSeal({ size = 64, sigil = 'hourglass', style, className }: { size?: number; sigil?: 'hourglass' | 'skull' | 'cross'; style?: CSSProperties; className?: string }) {
    // The puddle's edge: a circle with a seeded wobble, like wax that ran.
    const blob = useMemo(() => {
        const pts: string[] = []
        const n = 22
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2
            const r = 46 + Math.sin(i * 2.7) * 2.6 + Math.cos(i * 5.3) * 1.8
            pts.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`)
        }
        return pts.join(' ')
    }, [])
    return (
        <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ display: 'block', overflow: 'visible', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))', ...style }}>
            <defs>
                <radialGradient id="goth-wax" cx="38%" cy="32%" r="70%">
                    <stop offset="0%" stopColor="#E0445A" />
                    <stop offset="45%" stopColor={GOTH.WAX} />
                    <stop offset="100%" stopColor="#3E0610" />
                </radialGradient>
            </defs>
            <polygon points={blob} fill="url(#goth-wax)" />
            <circle cx="50" cy="50" r="33" fill="none" stroke="#4A0812" strokeWidth="3" />
            <circle cx="50" cy="50" r="31" fill="none" stroke="rgba(255,150,160,0.35)" strokeWidth="1.2" />
            {sigil === 'hourglass' && (
                <g fill="none" stroke="#4A0812" strokeWidth="3.4" strokeLinejoin="round">
                    <path d="M38 32 H62 M38 68 H62 M40 32 C 40 44 50 46 50 50 C 50 54 40 56 40 68 M60 32 C 60 44 50 46 50 50 C 50 54 60 56 60 68" />
                </g>
            )}
            {sigil === 'cross' && <path d="M50 30 V70 M38 44 H62" stroke="#4A0812" strokeWidth="5" strokeLinecap="round" />}
            {sigil === 'skull' && (
                <g fill="#4A0812">
                    <path d="M50 30 C 37 30 32 39 33 48 C 33.5 53 36 55 37 57 L 37 63 L 63 63 L 63 57 C 64 55 66.5 53 67 48 C 68 39 63 30 50 30 Z" />
                    <circle cx="43.5" cy="47" r="4.6" fill="#B01A30" />
                    <circle cx="56.5" cy="47" r="4.6" fill="#B01A30" />
                    <path d="M50 52 L 47.5 57 H 52.5 Z" fill="#B01A30" />
                </g>
            )}
            {/* highlight: wax is glossy where it pooled thick */}
            <path d="M28 34 Q 36 22 52 21" stroke="rgba(255,210,214,0.55)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
    )
}

// ── Parchment ────────────────────────────────────────────────────────────────

/** A vellum leaf, its edges darkened and singed, held by iron nails. */
export function GothParchment({ children, style, nails = true }: { children: ReactNode; style?: CSSProperties; nails?: boolean }) {
    const nail = (pos: CSSProperties) => (
        <span
            aria-hidden
            style={{
                position: 'absolute', width: 11, height: 11, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #8B8594 0%, #3A3640 45%, #0C0B0F 100%)',
                boxShadow: '0 2px 3px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(60,32,14,0.5)',
                ...pos,
            }}
        />
    )
    return (
        <div
            style={{
                position: 'relative',
                backgroundColor: '#D9C9A3',
                backgroundImage: `${GOTH_VELLUM}, radial-gradient(ellipse 80% 70% at 45% 40%, #EADDBA 0%, #D6C397 55%, #A88B5C 88%, #6E5130 100%)`,
                backgroundSize: '300px 300px, 100% 100%',
                boxShadow: 'inset 0 0 22px rgba(70,40,14,0.75), inset 0 0 3px rgba(40,20,6,0.9), 0 18px 34px rgba(0,0,0,0.7)',
                // A leaf is never cut square.
                clipPath: 'polygon(1.5% 0.8%, 22% 0, 48% 1.2%, 76% 0.2%, 99% 1.4%, 100% 24%, 98.8% 52%, 100% 79%, 98.6% 99%, 71% 100%, 44% 98.8%, 19% 100%, 0.4% 98.6%, 1.2% 74%, 0 47%, 1% 21%)',
                ...style,
            }}
        >
            {nails && (
                <>
                    {nail({ top: 8, left: 9 })}
                    {nail({ top: 8, right: 9 })}
                    {nail({ bottom: 8, left: 9 })}
                    {nail({ bottom: 8, right: 9 })}
                </>
            )}
            {children}
        </div>
    )
}

// ── Flame meter ──────────────────────────────────────────────────────────────

/** A singer's level as a small votive flame: it stands taller the louder they
 *  sing, and sits low and blue when they're quiet. */
export function GothFlameMeter({ level, color }: { level: number; color: string }) {
    const v = Math.max(0, Math.min(1, level * 2.6))
    return (
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-end', justifyContent: 'center', width: 16, height: 26 }}>
            <span
                aria-hidden
                style={{
                    position: 'absolute', bottom: 2, left: '50%', width: 34, height: 34, transform: 'translate(-50%, 30%)',
                    background: `radial-gradient(circle, ${color}55 0%, transparent 65%)`, opacity: 0.35 + v * 0.65,
                    transition: 'opacity 90ms linear',
                }}
            />
            <svg viewBox="0 0 20 34" width="14" height="24" style={{ position: 'relative', transformOrigin: '50% 100%', transform: `scaleY(${0.32 + v * 0.75}) scaleX(${0.8 + v * 0.25})`, transition: 'transform 90ms linear' }}>
                <path d="M10 1 C 14 9 19 16 18 23 C 17 29 14 33 10 33 C 6 33 3 29 2 23 C 1 16 6 9 10 1 Z" fill={v > 0.12 ? '#F29A2E' : '#3E5FB8'} />
                <path d="M10 12 C 12 17 14 21 13.5 25 C 13 29 11.5 31 10 31 C 8.5 31 7 29 6.5 25 C 6 21 8 17 10 12 Z" fill="#FFF3D2" opacity={0.4 + v * 0.6} />
            </svg>
            <span aria-hidden style={{ position: 'absolute', bottom: 0, left: 3, right: 3, height: 3, borderRadius: 2, background: color, boxShadow: `0 0 6px ${color}` }} />
        </span>
    )
}

/** A small round of stained glass in one colour, leaded and lit. */
export function GothGlassDot({ color, size = 14 }: { color: string; size?: number }) {
    return (
        <span
            aria-hidden
            style={{
                display: 'inline-block', width: size, height: size, borderRadius: '50%', flexShrink: 0,
                background: `radial-gradient(circle at 38% 34%, #FFFFFF 0%, ${color} 34%, color-mix(in srgb, ${color}, #000 45%) 100%)`,
                boxShadow: `0 0 0 2px #060508, 0 0 0 3px rgba(175,195,234,0.25), 0 0 12px ${color}`,
            }}
        />
    )
}
