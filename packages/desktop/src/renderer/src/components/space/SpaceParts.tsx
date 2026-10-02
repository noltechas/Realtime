// The space stage's vocabulary: the objects every screen is built from.
//
//   GoldenRecord   the record: satin gold, fine concentric grooves, a smooth
//                  run-out band with an etched inscription, and a label that
//                  holds anything (a QR code, a song's art). Its light is a
//                  fixed bowtie sheen, the way a record under one lamp looks;
//                  when it plays, the LABEL turns, not the light.
//   PulsarMap      the map engraved on the record's cover: lines radiating
//                  from one point to fourteen pulsars, each line carrying its
//                  pulsar's period in binary, and one long line to the centre
//                  of the galaxy. Drawn in, stroke by stroke.
//   StarGlint      the eight-pointed star of a deep-field photograph, in any
//                  colour (a singer's star).
//   BinaryMarks    a number in the cover's notation: | for 1, - for 0.
//   EtchedRule     a hairline rule with tick marks at its ends.
//   Voyager        the probe itself, as an engraving.
//   ToneArm        a record player's arm, for the needle drop.
//   SoundRings     concentric rings rolling out from a point.
//
// Copy rule for every string here: no em dashes, ever.

import { useEffect, useId, useMemo, type CSSProperties, type ReactNode } from 'react'
import { ETCH, SP, STAR_MASK, binaryDigits } from '../../styles/space'
import { retainCosmos } from './cosmos'

/** A React id that is safe inside an SVG url(#...) reference. */
export function useSvgId(prefix: string): string {
    return prefix + useId().replace(/[^a-zA-Z0-9_-]/g, '')
}

/** Keep the shared voice bridge running while this component is mounted. */
export function useCosmos(): void {
    useEffect(() => retainCosmos(), [])
}

/** Seeded PRNG (mulberry32). */
export function rng(seed: number): () => number {
    let a = Math.floor(seed * 2 ** 31) >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// ── The record ───────────────────────────────────────────────────────────────

export interface GoldenRecordProps {
    size: number
    /** Label diameter as a fraction of the record's. */
    labelRatio?: number
    /** What's printed on the label. Centred, clipped to the label circle. */
    label?: ReactNode
    /** The label's paper: pale gold-white (for a QR code) or bare for art. */
    labelPaper?: 'cream' | 'none'
    /** Seconds per turn of the label (0 holds it still). */
    spin?: number
    /** Text engraved round the run-out band, between label and grooves. */
    inscription?: string
    className?: string
    style?: CSSProperties
}

export function GoldenRecord({ size, labelRatio = 0.42, label, labelPaper = 'cream', spin = 0, inscription, className, style }: GoldenRecordProps) {
    const id = useSvgId('sprec')
    const labelR = labelRatio * 100
    const runoutOuter = labelR + (inscription ? 9 : 3)
    // Grooves from the run-out out to the rim, with three narrow smooth gaps
    // between "tracks" the way a real record shows them.
    const grooves = useMemo(() => {
        const out: Array<{ r: number; dark: boolean }> = []
        const gaps = [0.3, 0.55, 0.78].map((f) => runoutOuter + (96 - runoutOuter) * f)
        let k = 0
        for (let r = runoutOuter + 0.6; r < 96; r += 0.72) {
            if (gaps.some((g) => Math.abs(r - g) < 0.9)) continue
            out.push({ r, dark: k % 2 === 0 })
            k++
        }
        return { lines: out, gaps }
    }, [runoutOuter])
    const labelPx = labelRatio * size
    const lift = Math.max(2, size * 0.02)
    return (
        <div className={className} style={{ position: 'relative', width: size, height: size, ...style }}>
            {/* the disc's shadow on the dark behind it */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: `0 ${lift * 6}px ${lift * 14}px rgba(0,0,0,0.75)` }} />
            {/* the gold disc: satin, slightly darker at the rim and at the hub */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 50% 50%, #7A5A22 0%, #A9853A ${labelR * 0.9}%, #D7B35E ${labelR + 8}%, #E9C46A 62%, #CFA853 84%, #8C6A2A 97%, #5A4318 100%)`,
                }}
            />
            <svg viewBox="-100 -100 200 200" width={size} height={size} style={{ position: 'absolute', inset: 0 }} aria-hidden>
                <defs>
                    <path id={`${id}-ring`} d={`M 0 ${-(labelR + 4.6)} A ${labelR + 4.6} ${labelR + 4.6} 0 1 1 -0.01 ${-(labelR + 4.6)}`} />
                </defs>
                {grooves.lines.map((g, i) => (
                    <circle key={i} r={g.r} fill="none" stroke={g.dark ? 'rgba(60,42,12,0.42)' : 'rgba(255,240,200,0.2)'} strokeWidth={0.32} />
                ))}
                {grooves.gaps.map((g, i) => (
                    <circle key={`g${i}`} r={g} fill="none" stroke="rgba(255,240,200,0.28)" strokeWidth={1.4} />
                ))}
                {/* the rim: a bright bevel on top, dark beneath */}
                <circle r={99.2} fill="none" stroke="rgba(255,240,200,0.55)" strokeWidth={0.8} />
                <circle r={97.4} fill="none" stroke="rgba(60,42,12,0.55)" strokeWidth={0.6} />
                {/* the run-out band: smooth gold, with the inscription cut into it */}
                <circle r={runoutOuter} fill="none" stroke="rgba(60,42,12,0.5)" strokeWidth={0.4} />
                {inscription ? (
                    <text style={{ fontFamily: SP.FONT_MONO, fontSize: 3.6, letterSpacing: 1.1, fill: 'rgba(60,42,12,0.78)' }}>
                        <textPath href={`#${id}-ring`} startOffset="0">
                            {inscription}
                        </textPath>
                    </text>
                ) : null}
            </svg>
            {/* The light: a fixed bowtie of brightness across the grooves (and a
                fainter dark pair across it), the way one lamp lights a record. */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background:
                        // the lamp's bowtie across the grooves, a hot core inside a broad sheen
                        'conic-gradient(from -30deg, rgba(255,246,214,0) 0deg, rgba(255,246,214,0.35) 16deg, rgba(255,250,232,0.9) 26deg, rgba(255,246,214,0.35) 36deg, rgba(255,246,214,0) 54deg, rgba(40,28,6,0) 80deg, rgba(40,28,6,0.36) 108deg, rgba(40,28,6,0) 136deg, rgba(255,246,214,0) 180deg, rgba(255,246,214,0.28) 196deg, rgba(255,250,232,0.7) 206deg, rgba(255,246,214,0.28) 216deg, rgba(255,246,214,0) 234deg, rgba(40,28,6,0) 260deg, rgba(40,28,6,0.36) 288deg, rgba(40,28,6,0) 316deg),' +
                        // and the key light from the upper left over the whole disc
                        'radial-gradient(circle at 30% 24%, rgba(255,246,214,0.32) 0%, rgba(255,246,214,0) 46%, rgba(40,28,6,0.3) 100%)',
                    WebkitMaskImage: `radial-gradient(circle, transparent ${labelR + 1}%, #000 ${labelR + 6}%, #000 95%, transparent 99%)`,
                    maskImage: `radial-gradient(circle, transparent ${labelR + 1}%, #000 ${labelR + 6}%, #000 95%, transparent 99%)`,
                }}
                className="sp-sheen"
            />
            {/* the label */}
            <div
                className={spin > 0 ? 'sp-spin' : undefined}
                style={{
                    position: 'absolute',
                    left: (size - labelPx) / 2,
                    top: (size - labelPx) / 2,
                    width: labelPx,
                    height: labelPx,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: labelPaper === 'cream' ? 'radial-gradient(circle at 42% 36%, #FFFBEF 0%, #F6EED9 60%, #E8DCC0 100%)' : SP.VOID,
                    boxShadow: 'inset 0 0 0 1px rgba(60,42,12,0.55), 0 0 0 1px rgba(255,240,200,0.35)',
                    animationDuration: spin > 0 ? `${spin}s` : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {label}
            </div>
            {/* the spindle hole, only when the label isn't busy with a code */}
            {labelPaper === 'none' ? (
                <div style={{ position: 'absolute', left: '50%', top: '50%', width: size * 0.028, height: size * 0.028, marginLeft: -size * 0.014, marginTop: -size * 0.014, borderRadius: '50%', background: '#020308', boxShadow: '0 0 0 1.5px rgba(255,240,200,0.55)' }} />
            ) : null}
        </div>
    )
}

// ── The pulsar map ───────────────────────────────────────────────────────────

export interface PulsarLine {
    angle: number
    length: number
    bits: Array<0 | 1>
}

/** Fourteen pulsars and the line to the galactic centre, from a seed. */
export function pulsarLines(seed: number, inner: number, outer: number): PulsarLine[] {
    const r = rng(seed)
    const out: PulsarLine[] = []
    for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * 360 + (r() - 0.5) * 18 + 6
        out.push({ angle, length: inner + (outer - inner) * (0.35 + r() * 0.65), bits: binaryDigits(Math.floor(300 + r() * 700), 10) })
    }
    return out
}

export function PulsarMap({
    size,
    inner,
    lines,
    galactic = true,
    draw = true,
    color = ETCH.mid,
    style,
}: {
    size: number
    /** where the lines start, as a radius in the map's own units (0..100) */
    inner: number
    lines: PulsarLine[]
    galactic?: boolean
    draw?: boolean
    color?: string
    style?: CSSProperties
}) {
    return (
        <svg viewBox="-100 -100 200 200" width={size} height={size} style={{ overflow: 'visible', ...style }} aria-hidden>
            {galactic ? (
                <line x1={inner} y1={0} x2={190} y2={0} stroke={color} strokeWidth={0.32} pathLength={1} className={draw ? 'sp-draw' : undefined} style={{ animationDelay: '0.1s' }} />
            ) : null}
            {lines.map((l, i) => {
                const a = (l.angle * Math.PI) / 180
                const cx = Math.cos(a)
                const cy = Math.sin(a)
                const x1 = cx * inner
                const y1 = cy * inner
                const x2 = cx * l.length
                const y2 = cy * l.length
                // the period, in binary, along the outer part of the line
                const n = l.bits.length
                const step = 2.3
                const start = l.length - n * step - 2
                return (
                    <g key={i} className={draw ? 'sp-fade' : undefined} style={{ animationDelay: `${0.2 + i * 0.07}s` }}>
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={0.28} pathLength={1} className={draw ? 'sp-draw' : undefined} style={{ animationDelay: `${0.15 + i * 0.07}s` }} />
                        {l.bits.map((b, k) => {
                            const d = start + k * step
                            const px = cx * d
                            const py = cy * d
                            if (b === 1) {
                                return <line key={k} x1={px - cy * 1.5} y1={py + cx * 1.5} x2={px + cy * 1.5} y2={py - cx * 1.5} stroke={color} strokeWidth={0.3} />
                            }
                            return <line key={k} x1={px - cx * 0.7 - cy * 1.5} y1={py - cy * 0.7 + cx * 1.5} x2={px + cx * 0.7 - cy * 1.5} y2={py + cy * 0.7 + cx * 1.5} stroke={color} strokeWidth={0.3} />
                        })}
                    </g>
                )
            })}
        </svg>
    )
}

// ── Starlight ────────────────────────────────────────────────────────────────

/** The eight-pointed deep-field star in any colour. */
export function StarGlint({ size, color = SP.STAR, className, style }: { size: number; color?: string; className?: string; style?: CSSProperties }) {
    return (
        <span
            aria-hidden
            className={className}
            style={{
                display: 'inline-block',
                width: size,
                height: size,
                background: `radial-gradient(circle, #FFFFFF 0%, ${color} 26%, ${color} 100%)`,
                WebkitMaskImage: STAR_MASK,
                maskImage: STAR_MASK,
                WebkitMaskSize: '100% 100%',
                maskSize: '100% 100%',
                filter: `drop-shadow(0 0 ${Math.max(2, size * 0.08)}px ${color})`,
                flexShrink: 0,
                ...style,
            }}
        />
    )
}

// ── Etched notation ──────────────────────────────────────────────────────────

/** A number in the record cover's binary notation: | for 1, - for 0. */
export function BinaryMarks({ n, bits = 0, height = 12, color = ETCH.strong, gap = 4, style }: { n: number; bits?: number; height?: number; color?: string; gap?: number; style?: CSSProperties }) {
    const digits = binaryDigits(n, bits)
    const w = height * 0.62
    const total = digits.length * w + (digits.length - 1) * gap
    return (
        <svg width={total} height={height} viewBox={`0 0 ${total} ${height}`} style={{ display: 'inline-block', overflow: 'visible', ...style }} aria-hidden>
            {digits.map((d, i) => {
                const x = i * (w + gap) + w / 2
                return d === 1 ? (
                    <line key={i} x1={x} y1={0} x2={x} y2={height} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
                ) : (
                    <line key={i} x1={x - w / 2} y1={height / 2} x2={x + w / 2} y2={height / 2} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
                )
            })}
        </svg>
    )
}

/** A hairline rule with tick marks at its ends, fading out at both tips. */
export function EtchedRule({ width, color = ETCH.mid, style }: { width: number; color?: string; style?: CSSProperties }) {
    const id = useSvgId('sprule')
    return (
        <svg width={width} height={10} viewBox={`0 0 ${width} 10`} style={{ display: 'block', overflow: 'visible', ...style }} aria-hidden>
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={color} stopOpacity={0} />
                    <stop offset="0.18" stopColor={color} />
                    <stop offset="0.82" stopColor={color} />
                    <stop offset="1" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <line x1={0} y1={5} x2={width} y2={5} stroke={`url(#${id})`} strokeWidth={1} />
            {[0.18, 0.82].map((f) => (
                <line key={f} x1={width * f} y1={1} x2={width * f} y2={9} stroke={color} strokeWidth={1} />
            ))}
            {[0.24, 0.27, 0.73, 0.76].map((f) => (
                <line key={f} x1={width * f} y1={3} x2={width * f} y2={7} stroke={color} strokeWidth={0.8} />
            ))}
        </svg>
    )
}

// ── The probe ────────────────────────────────────────────────────────────────

/** Voyager as an engraving: the big high-gain dish, the ten-sided bus, the
 *  long magnetometer boom, the RTG boom with its three power cylinders and the
 *  science boom with its scan platform. */
export function Voyager({ size = 160, color = ETCH.strong, style }: { size?: number; color?: string; style?: CSSProperties }) {
    const sw = 1.1
    return (
        <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} style={{ overflow: 'visible', ...style }} aria-hidden>
            <g fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">
                {/* magnetometer boom, very long and thin, off to the upper right */}
                <line x1={104} y1={64} x2={196} y2={12} strokeWidth={0.7} />
                {[0.2, 0.4, 0.6, 0.8].map((f) => (
                    <line key={f} x1={104 + 92 * f - 1.2} y1={64 - 52 * f - 2} x2={104 + 92 * f + 1.2} y2={64 - 52 * f + 2} strokeWidth={0.6} />
                ))}
                {/* RTG boom, down to the lower left, with three cylinders */}
                <line x1={84} y1={80} x2={30} y2={112} />
                {[0, 1, 2].map((k) => (
                    <rect key={k} x={36 + k * 9} y={97 - k * 5.3} width={8} height={7} transform={`rotate(-30 ${40 + k * 9} ${100 - k * 5.3})`} />
                ))}
                {/* science boom, down to the right, with the scan platform */}
                <line x1={108} y1={82} x2={156} y2={104} />
                <rect x={150} y={98} width={14} height={10} transform="rotate(24 157 103)" />
                <circle cx={166} cy={112} r={3} />
                {/* the bus */}
                <path d="M 86 70 L 94 66 L 104 66 L 112 70 L 114 78 L 110 85 L 100 88 L 90 87 L 84 81 Z" fill={SP.VOID} />
                {/* the high-gain dish, facing back toward home, with its feed */}
                <ellipse cx={99} cy={46} rx={40} ry={22} fill={SP.VOID} />
                <ellipse cx={99} cy={46} rx={30} ry={15.5} strokeWidth={0.6} />
                <ellipse cx={99} cy={46} rx={18} ry={9} strokeWidth={0.5} />
                <line x1={68} y1={50} x2={99} y2={28} strokeWidth={0.6} />
                <line x1={130} y1={50} x2={99} y2={28} strokeWidth={0.6} />
                <line x1={99} y1={62} x2={99} y2={28} strokeWidth={0.6} />
                <circle cx={99} cy={26} r={2.4} fill={SP.VOID} />
                <line x1={99} y1={66} x2={99} y2={68} />
            </g>
        </svg>
    )
}

// ── The cover's other diagrams ───────────────────────────────────────────────
// Engraved instructions from the record's cover, redrawn as line art. They are
// set small and faint around the screens: they are the theme's ornament.

/** The record and its stylus, seen from above and from the side, with the
 *  turning time written round it in binary. */
export function StylusDiagram({ size = 200, color = ETCH.mid, style }: { size?: number; color?: string; style?: CSSProperties }) {
    const bits = binaryDigits(0b1011010110001, 13)
    return (
        <svg viewBox="0 0 200 200" width={size} height={size} style={{ overflow: 'visible', ...style }} aria-hidden>
            <g fill="none" stroke={color} strokeWidth={0.9} strokeLinecap="round">
                {/* top view: the record, its label, the stylus arm resting on it */}
                <circle cx={78} cy={78} r={56} />
                <circle cx={78} cy={78} r={18} />
                <circle cx={78} cy={78} r={2} />
                <path d="M 150 30 L 150 40 L 104 96" />
                <circle cx={150} cy={30} r={4} />
                {/* the turning time, in the cover's binary, round the edge */}
                {bits.map((b, i) => {
                    const a = -Math.PI * 0.95 + (i / bits.length) * Math.PI * 0.9
                    const r0 = 62
                    const x = 78 + Math.cos(a) * r0
                    const y = 78 + Math.sin(a) * r0
                    const tx = Math.cos(a)
                    const ty = Math.sin(a)
                    return b === 1 ? (
                        <line key={i} x1={x} y1={y} x2={x + tx * 5} y2={y + ty * 5} />
                    ) : (
                        <line key={i} x1={x + tx * 2.5 - ty * 2} y1={y + ty * 2.5 + tx * 2} x2={x + tx * 2.5 + ty * 2} y2={y + ty * 2.5 - tx * 2} />
                    )
                })}
                {/* side view below: the disc as a thin slab, the stylus on top */}
                <rect x={22} y={162} width={112} height={4} />
                <path d="M 150 140 L 150 150 L 112 160" />
                <line x1={78} y1={154} x2={78} y2={174} strokeDasharray="1.5 3" />
            </g>
        </svg>
    )
}

/** The hydrogen atom in its two lowest states, the unit every other diagram
 *  on the cover is measured in. */
export function HydrogenDiagram({ size = 160, color = ETCH.mid, style }: { size?: number; color?: string; style?: CSSProperties }) {
    return (
        <svg viewBox="0 0 160 70" width={size} height={(size * 70) / 160} style={{ overflow: 'visible', ...style }} aria-hidden>
            <g fill="none" stroke={color} strokeWidth={0.9} strokeLinecap="round">
                {[34, 126].map((cx, k) => (
                    <g key={cx}>
                        <circle cx={cx} cy={30} r={22} />
                        <circle cx={cx} cy={30} r={2} fill={color} />
                        <circle cx={cx + (k === 0 ? -22 : 22)} cy={30} r={2.4} />
                        {/* the spins: parallel on one side, opposed on the other */}
                        <line x1={cx} y1={22} x2={cx} y2={14} />
                        <line x1={cx + (k === 0 ? -22 : 22)} y1={k === 0 ? 22 : 38} x2={cx + (k === 0 ? -22 : 22)} y2={k === 0 ? 14 : 46} />
                    </g>
                ))}
                {/* the transition between them, and its unit: a single 1 */}
                <line x1={58} y1={30} x2={102} y2={30} />
                <line x1={80} y1={50} x2={80} y2={64} />
                <line x1={34} y1={58} x2={126} y2={58} strokeDasharray="1.5 3" />
            </g>
        </svg>
    )
}

/** The picture signal: the waveform that starts each frame, and the frame
 *  itself drawn as its scan lines. */
export function WaveformDiagram({ size = 200, color = ETCH.mid, style }: { size?: number; color?: string; style?: CSSProperties }) {
    return (
        <svg viewBox="0 0 200 120" width={size} height={(size * 120) / 200} style={{ overflow: 'visible', ...style }} aria-hidden>
            <g fill="none" stroke={color} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round">
                <path d="M 6 40 L 22 40 L 22 14 L 30 14 L 30 40 L 44 40 L 50 30 L 56 36 L 62 24 L 68 38 L 74 28 L 80 34 L 88 22 L 94 40 L 110 40 L 110 14 L 118 14 L 118 40 L 136 40 L 142 28 L 150 36 L 158 26 L 166 38 L 176 30 L 194 40" />
                <rect x={44} y={58} width={112} height={56} />
                {Array.from({ length: 9 }, (_, i) => (
                    <line key={i} x1={48} y1={64 + i * 6} x2={152} y2={66 + i * 6} strokeWidth={0.6} />
                ))}
            </g>
        </svg>
    )
}

// ── Playback ─────────────────────────────────────────────────────────────────

/** A tonearm pivoting at its base; `angle` 0 is at rest, ~25 is on the record. */
export function ToneArm({ length, angle, style }: { length: number; angle: number; style?: CSSProperties }) {
    const L = 100
    return (
        <svg
            viewBox="-14 -14 40 128"
            width={(length * 40) / 128}
            height={length}
            style={{ overflow: 'visible', transformOrigin: `${(14 / 40) * 100}% ${(14 / 128) * 100}%`, transform: `rotate(${angle}deg)`, transition: 'transform 0.5s cubic-bezier(0.3, 0.7, 0.3, 1)', ...style }}
            aria-hidden
        >
            {/* counterweight and pivot */}
            <rect x={-6} y={-13} width={12} height={8} rx={2} fill="#2A2C36" stroke="rgba(255,240,200,0.35)" strokeWidth={0.8} />
            <circle r={8} fill="#1A1C24" stroke="rgba(255,240,200,0.45)" strokeWidth={1} />
            <circle r={3} fill={SP.GOLD} />
            {/* the arm, with its gentle S */}
            <path d={`M 0 0 L 0 ${L * 0.62} Q 0 ${L * 0.8} 8 ${L * 0.9}`} fill="none" stroke="#C9CCD6" strokeWidth={3} strokeLinecap="round" />
            <path d={`M -0.8 0 L -0.8 ${L * 0.62}`} fill="none" stroke="#FFFFFF" strokeWidth={0.9} opacity={0.6} />
            {/* headshell and stylus */}
            <path d={`M 4 ${L * 0.88} L 16 ${L * 0.92} L 13 ${L * 1.0} L 2 ${L * 0.97} Z`} fill="#2A2C36" stroke="rgba(255,240,200,0.45)" strokeWidth={0.8} />
            <line x1={10} y1={L * 0.99} x2={10} y2={L * 1.04} stroke={SP.GOLD_HI} strokeWidth={1.2} />
        </svg>
    )
}

/** Concentric rings rolling out from the centre, each fading as it goes. */
export function SoundRings({ size, count = 4, color = SP.GOLD_HI, play = true }: { size: number; count?: number; color?: string; play?: boolean }) {
    return (
        <div aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, pointerEvents: 'none' }}>
            {Array.from({ length: count }, (_, i) => (
                <span
                    key={i}
                    className={play ? 'sp-ring' : undefined}
                    style={{
                        position: 'absolute',
                        left: -size / 2,
                        top: -size / 2,
                        width: size,
                        height: size,
                        borderRadius: '50%',
                        border: `1.5px solid ${color}`,
                        animationDelay: `${i * 0.22}s`,
                        opacity: 0,
                    }}
                />
            ))}
        </div>
    )
}

/** Monospace telemetry text. */
export const mono = (size: number, color: string = SP.DUST, extra?: CSSProperties): CSSProperties => ({
    fontFamily: SP.FONT_MONO,
    fontSize: size,
    fontWeight: 500,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color,
    ...extra,
})

/** Jost display text: light, widely tracked capitals. */
export const display = (size: number, color: string = SP.STAR, weight = 300, extra?: CSSProperties): CSSProperties => ({
    fontFamily: SP.FONT_DISPLAY,
    fontSize: size,
    fontWeight: weight,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color,
    lineHeight: 1.1,
    ...extra,
})
