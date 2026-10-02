// The Barbie stage's vocabulary: the painted objects every screen is built
// from. Everything is drawn flat, the way a scenic painter would: two tones and
// a highlight, never a blur, never a photograph.
//
//   PaintedSun     the disc and its sunburst; its halo swells with the voices
//   PaintedCloud   a cumulus in two flat tones with a warm sunlit rim
//   Twinkle / TwinkleField / GlitterBurst   four-point glitter
//   PoolWater      a painted pool, its ripples white brushstrokes that drift
//   Mountains      the desert range on the horizon, lit face and shadow face
//   BreezeWall     a Palm Springs wall with a breeze-block screen
//   Awning         a candy-striped awning with a scalloped valance
//   SkyBanner      a biplane towing a fluttering message across the sky
//   HeartShades, SunMeter, ArtSun, RetroTitle, GlossPill, DeckleCard
//
// Copy rule for every string here: no em dashes, ever.

import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { BARB, breezeBlock, retroType } from '../../styles/barbie'
import { onGlitterBurst, retainSunshine } from './sunshine'

// ── Utilities ────────────────────────────────────────────────────────────────

/** Seeded PRNG (mulberry32): the same seed always paints the same cloud. */
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

/** A React id that is safe inside an SVG url(#...) reference. */
export function useSvgId(prefix: string): string {
    return prefix + useId().replace(/[^a-zA-Z0-9_-]/g, '')
}

/** Keep the shared sunshine bridge running while this component is mounted. */
export function useSunshine(): void {
    useEffect(() => retainSunshine(), [])
}

// ── The sun ──────────────────────────────────────────────────────────────────

export function PaintedSun({
    size,
    rays = 'burst',
    spin = true,
    halo = true,
    className,
    style,
}: {
    size: number
    rays?: 'burst' | 'scallop' | 'none'
    spin?: boolean
    halo?: boolean
    className?: string
    style?: CSSProperties
}) {
    const id = useSvgId('bsun')
    const burst = useMemo(() => {
        const out: Array<{ d: string; fill: string }> = []
        const n = 16
        for (let i = 0; i < n * 2; i++) {
            const long = i % 2 === 0
            const a = (i / (n * 2)) * Math.PI * 2
            const w = long ? 0.105 : 0.075
            const r0 = 54
            const r1 = long ? 94 : 76
            const p = (ang: number, r: number) => `${(Math.cos(ang) * r).toFixed(2)} ${(Math.sin(ang) * r).toFixed(2)}`
            out.push({ d: `M ${p(a - w, r0)} L ${p(a, r1)} L ${p(a + w, r0)} Z`, fill: long ? BARB.SUN : BARB.PEACH })
        }
        return out
    }, [])
    return (
        <svg viewBox="-100 -100 200 200" width={size} height={size} className={className} style={{ overflow: 'visible', ...style }} aria-hidden>
            <defs>
                <radialGradient id={`${id}-halo`}>
                    <stop offset="30%" stopColor={BARB.SUN_HI} stopOpacity="0.85" />
                    <stop offset="62%" stopColor={BARB.SUN_HI} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={BARB.SUN_HI} stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${id}-disc`} cx="0.4" cy="0.36" r="0.7">
                    <stop offset="0%" stopColor={BARB.SUN_CORE} />
                    <stop offset="38%" stopColor={BARB.SUN_HI} />
                    <stop offset="76%" stopColor={BARB.SUN} />
                    <stop offset="100%" stopColor="#FFB42E" />
                </radialGradient>
            </defs>
            {halo && <circle r="100" fill={`url(#${id}-halo)`} className="barb-sun-halo" />}
            {rays !== 'none' && (
                <g className={spin ? 'barb-spin' : undefined}>
                    {rays === 'burst'
                        ? burst.map((r, i) => <path key={i} d={r.d} fill={r.fill} />)
                        : Array.from({ length: 18 }, (_, i) => {
                              const a = (i / 18) * Math.PI * 2
                              return <circle key={i} cx={Math.cos(a) * 58} cy={Math.sin(a) * 58} r="13" fill={i % 2 ? BARB.PEACH : BARB.SUN} />
                          })}
                </g>
            )}
            <circle r="56" fill={`url(#${id}-disc)`} />
            {/* the painter's highlight, a single flat crescent */}
            <path d="M -38 -18 A 42 42 0 0 1 -6 -42 A 50 50 0 0 0 -30 -8 Z" fill="#FFFFFF" opacity="0.55" />
            <circle r="55.2" fill="none" stroke="#F5A21C" strokeWidth="1.6" opacity="0.55" />
        </svg>
    )
}

// ── Clouds ───────────────────────────────────────────────────────────────────

interface Puff {
    cx: number
    cy: number
    r: number
}

function cloudPuffs(seed: number): Puff[] {
    const r = rng(seed + 0.17)
    const n = 5 + Math.floor(r() * 2)
    const out: Puff[] = []
    for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n
        // A cumulus piles up toward one side of centre, not dead middle.
        const env = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85 + r() * 0.3)), 0.75)
        const rad = 15 + 25 * env + r() * 6
        out.push({
            cx: 20 + t * 160 + (r() - 0.5) * 8,
            cy: 86 - rad * (0.6 + env * 0.3) + (r() - 0.5) * 4,
            r: rad,
        })
    }
    return out
}

export function PaintedCloud({
    width,
    seed = 0.5,
    tone = 'day',
    flip = false,
    className,
    style,
}: {
    width: number
    seed?: number
    tone?: 'day' | 'blush'
    flip?: boolean
    className?: string
    style?: CSSProperties
}) {
    const id = useSvgId('bcloud')
    const puffs = useMemo(() => cloudPuffs(seed), [seed])
    const rim = tone === 'day' ? '#FFF3B8' : '#FFE1A6'
    const shade = tone === 'day' ? BARB.CLOUD_SHADE : '#F6B8DA'
    const deep = tone === 'day' ? BARB.CLOUD_DEEP : '#EE9DCB'
    const base = { x: 16, y: 64, w: 168, h: 26 }
    return (
        <svg viewBox="0 0 200 100" width={width} height={width / 2} className={className} style={{ overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined, ...style }} aria-hidden>
            <defs>
                <clipPath id={`${id}-shape`}>
                    {puffs.map((p, i) => <circle key={i} cx={p.cx} cy={p.cy} r={p.r} />)}
                    <rect x={base.x} y={base.y} width={base.w} height={base.h} rx="13" />
                </clipPath>
                {/* a painted cumulus has a flat underside */}
                <clipPath id={`${id}-flat`}>
                    <rect x="-20" y="-40" width="240" height="126" />
                </clipPath>
            </defs>
            <g clipPath={`url(#${id}-flat)`}>
                <g clipPath={`url(#${id}-shape)`}>
                    {/* 1. the warm rim the sun lights along the tops */}
                    <rect x="-20" y="-40" width="240" height="140" fill={rim} />
                    {/* 2. the shadow side: the whole lower body of the cloud */}
                    {puffs.map((p, i) => <circle key={i} cx={p.cx} cy={p.cy + p.r * 0.06} r={p.r} fill={shade} />)}
                    <rect x={base.x} y={base.y + 3} width={base.w} height={base.h} rx="13" fill={shade} />
                    {/* 3. the lit body, a stroke of white laid up and left, toward the sun */}
                    {puffs.map((p, i) => <circle key={i} cx={p.cx - p.r * 0.1} cy={p.cy - p.r * 0.13} r={p.r * 0.84} fill={BARB.CLOUD} />)}
                    {/* 4. the flat underside, one deeper stroke of paint */}
                    <rect x="-20" y="81" width="240" height="10" fill={deep} opacity="0.55" />
                </g>
            </g>
        </svg>
    )
}

// ── Glitter ──────────────────────────────────────────────────────────────────

export function TwinkleShape({ size, color = '#FFFFFF', style, className }: { size: number; color?: string; style?: CSSProperties; className?: string }) {
    return (
        <svg viewBox="-50 -50 100 100" width={size} height={size} style={{ overflow: 'visible', ...style }} className={className} aria-hidden>
            <path d="M0 -50 C 3 -12 12 -3 50 0 C 12 3 3 12 0 50 C -3 12 -12 3 -50 0 C -12 -3 -3 -12 0 -50 Z" fill={color} />
            <circle r="6" fill="#FFFFFF" />
        </svg>
    )
}

/** A field of twinkles that wink in and out, each on its own beat. */
export function TwinkleField({
    seed,
    count,
    box = { x: 0, y: 0, w: 100, h: 100 },
    size = [10, 28],
    colors = ['#FFFFFF', BARB.SUN_HI, BARB.CANDY],
    style,
}: {
    seed: number
    count: number
    box?: { x: number; y: number; w: number; h: number }
    size?: [number, number]
    colors?: string[]
    style?: CSSProperties
}) {
    const items = useMemo(() => {
        const r = rng(seed)
        return Array.from({ length: count }, () => ({
            x: box.x + r() * box.w,
            y: box.y + r() * box.h,
            s: size[0] + r() * (size[1] - size[0]),
            c: colors[Math.floor(r() * colors.length)],
            delay: -r() * 6,
            dur: 2.6 + r() * 3.4,
        }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seed, count])
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}>
            {items.map((t, i) => (
                <span
                    key={i}
                    className="barb-twinkle"
                    style={{ position: 'absolute', left: `${t.x}%`, top: `${t.y}%`, width: t.s, height: t.s, marginLeft: -t.s / 2, marginTop: -t.s / 2, animationDelay: `${t.delay}s`, animationDuration: `${t.dur}s` }}
                >
                    <TwinkleShape size={t.s} color={t.c} />
                </span>
            ))}
        </div>
    )
}

/** Glitter thrown on cue (a belt, "Sing!"): twinkles burst out of a point and
 *  fall. Listens to the shared sunshine bus. */
export function GlitterBurst({ x = 50, y = 45, spread = 1 }: { x?: number; y?: number; spread?: number }) {
    const [bursts, setBursts] = useState<Array<{ id: number; seed: number; strength: number }>>([])
    useEffect(
        () =>
            onGlitterBurst((strength) => {
                const id = performance.now()
                setBursts((b) => [...b.slice(-2), { id, seed: Math.random(), strength }])
                window.setTimeout(() => setBursts((b) => b.filter((q) => q.id !== id)), 1900)
            }),
        [],
    )
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {bursts.map((b) => {
                const r = rng(b.seed)
                const n = Math.round(22 + 16 * b.strength)
                return (
                    <div key={b.id} style={{ position: 'absolute', left: `${x}%`, top: `${y}%` }}>
                        {Array.from({ length: n }, (_, i) => {
                            const a = r() * Math.PI * 2
                            const d = (120 + r() * 320) * spread
                            const s = 10 + r() * 22
                            const c = [BARB.WHITE, BARB.SUN_HI, BARB.CANDY, BARB.SUN][Math.floor(r() * 4)]
                            return (
                                <span
                                    key={i}
                                    className="barb-glitter"
                                    style={{
                                        position: 'absolute',
                                        width: s,
                                        height: s,
                                        marginLeft: -s / 2,
                                        marginTop: -s / 2,
                                        ['--dx' as string]: `${Math.cos(a) * d}px`,
                                        ['--dy' as string]: `${Math.sin(a) * d * 0.7}px`,
                                        ['--rot' as string]: `${(r() - 0.5) * 220}deg`,
                                        animationDelay: `${r() * 0.12}s`,
                                        animationDuration: `${1.1 + r() * 0.6}s`,
                                    } as CSSProperties}
                                >
                                    <TwinkleShape size={s} color={c} />
                                </span>
                            )
                        })}
                    </div>
                )
            })}
        </div>
    )
}

// ── The pool ─────────────────────────────────────────────────────────────────

/**
 * Painted caustics, the way a California painter puts light on a pool: the
 * bright ridges of the water's light, drawn as wobbly white contour lines. A
 * warped wave field is sampled in perspective (features grow toward the near
 * edge) and its iso-line is traced with marching squares, which gives the
 * connected, irregular net of light a painted pool has: no two cells alike,
 * no repeating tile. Returns one path per stroke width band.
 */
function causticPaths(seed: number, width: number, height: number, level: number): Array<{ d: string; w: number }> {
    const r = rng(seed)
    const ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28]
    const step = 6
    const nx = Math.ceil(width / step) + 1
    const ny = Math.ceil(height / step) + 1
    // perspective: feature size grows from far (top) to near (bottom)
    const size = (y: number) => 15 + 62 * Math.pow(Math.max(0, y) / height, 1.1)
    const wy = new Float32Array(ny)
    let acc = 0
    for (let j = 0; j < ny; j++) {
        wy[j] = acc
        acc += step / size(j * step)
    }
    const field = new Float32Array(nx * ny)
    for (let j = 0; j < ny; j++) {
        const sz = size(j * step)
        for (let i = 0; i < nx; i++) {
            const x = (i * step) / sz
            const y = wy[j] * 1.9
            const f =
                Math.sin(x * 1.0 + 1.5 * Math.sin(y * 0.9 + ph[0])) +
                Math.sin(y * 1.2 + 1.3 * Math.sin(x * 0.75 + ph[1])) +
                0.55 * Math.sin((x - y) * 0.62 + ph[2] + 0.8 * Math.sin(x * 0.31 + ph[3]))
            field[j * nx + i] = f
        }
    }
    // marching squares, emitting a short segment per cell crossing
    const bands: string[][] = [[], [], []]
    const lerp = (a: number, b: number) => (level - a) / (b - a)
    for (let j = 0; j < ny - 1; j++) {
        const band = Math.min(2, Math.floor(((j * step) / height) * 3))
        const out = bands[band]
        for (let i = 0; i < nx - 1; i++) {
            const a = field[j * nx + i]
            const b = field[j * nx + i + 1]
            const c = field[(j + 1) * nx + i + 1]
            const d = field[(j + 1) * nx + i]
            const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0)
            if (idx === 0 || idx === 15) continue
            const x0 = i * step
            const y0 = j * step
            const top: [number, number] = [x0 + lerp(a, b) * step, y0]
            const right: [number, number] = [x0 + step, y0 + lerp(b, c) * step]
            const bottom: [number, number] = [x0 + lerp(d, c) * step, y0 + step]
            const left: [number, number] = [x0, y0 + lerp(a, d) * step]
            const seg = (p: [number, number], q: [number, number]) => out.push(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`)
            switch (idx) {
                case 1: case 14: seg(left, bottom); break
                case 2: case 13: seg(bottom, right); break
                case 3: case 12: seg(left, right); break
                case 4: case 11: seg(top, right); break
                case 6: case 9: seg(top, bottom); break
                case 7: case 8: seg(left, top); break
                case 5: seg(left, top); seg(bottom, right); break
                case 10: seg(top, right); seg(left, bottom); break
            }
        }
    }
    return bands.map((b, k) => ({ d: b.join(''), w: 1.4 + k * 1.3 }))
}

export function PoolWater({ width, height, seed = 0.4, style }: { width: number; height: number; seed?: number; style?: CSSProperties }) {
    const id = useSvgId('bpool')
    // Each layer is drawn a little wider than the pool and sways side to side,
    // so the light moves without a tile ever repeating.
    const pad = 90
    const a = useMemo(() => causticPaths(seed, width + pad * 2, height, 1.05), [seed, width, height])
    const b = useMemo(() => causticPaths(seed + 0.37, width + pad * 2, height, 0.95), [seed, width, height])
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', ...style }} aria-hidden>
            <defs>
                <linearGradient id={`${id}-w`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7BDDEE" />
                    <stop offset="22%" stopColor={BARB.POOL} />
                    <stop offset="100%" stopColor={BARB.POOL_DEEP} />
                </linearGradient>
            </defs>
            <rect width={width} height={height} fill={`url(#${id}-w)`} />
            <g transform={`translate(${-pad} 0)`}>
                <g className="barb-sway-b" opacity="0.6">
                    {b.map((p, k) => <path key={k} d={p.d} stroke="#BEEFFA" strokeWidth={p.w * 0.8} fill="none" strokeLinecap="round" />)}
                </g>
                <g className="barb-sway-a">
                    {a.map((p, k) => <path key={k} d={p.d} stroke={BARB.POOL_LINE} strokeWidth={p.w} fill="none" strokeLinecap="round" />)}
                </g>
            </g>
            {/* the white coping reflected along the far edge */}
            <rect width={width} height={Math.max(4, height * 0.035)} fill="#FFFFFF" opacity="0.5" />
        </svg>
    )
}

/** The pool's chrome ladder: two rails over the coping, rungs going under. */
export function PoolLadder({ height = 150, style }: { height?: number; style?: CSSProperties }) {
    const id = useSvgId('bladder')
    const rail = (x: number) => `M ${x} 64 L ${x} 34 Q ${x} 6 ${x + 26} 6 Q ${x + 46} 6 ${x + 46} 30 L ${x + 46} 38`
    return (
        <svg viewBox="0 0 150 160" width={(height * 150) / 160} height={height} style={{ overflow: 'visible', ...style }} aria-hidden>
            <defs>
                <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="45%" stopColor="#DDE8F4" />
                    <stop offset="70%" stopColor="#9FB3CC" />
                    <stop offset="100%" stopColor="#FFFFFF" />
                </linearGradient>
            </defs>
            {/* under the water: rungs and rails, wavering and pale */}
            <g opacity="0.55" className="barb-waver">
                {[0, 1].map((k) => (
                    <path key={k} d={`M ${30 + k * 74} 66 q -4 22 2 44 q 5 22 -2 44`} stroke="#E9FBFF" strokeWidth="5" fill="none" strokeLinecap="round" />
                ))}
                {[86, 118, 146].map((y) => (
                    <path key={y} d={`M 30 ${y} q 37 6 74 0`} stroke="#E9FBFF" strokeWidth="4" fill="none" strokeLinecap="round" />
                ))}
            </g>
            {/* the rails, over the coping */}
            {[0, 74].map((x) => (
                <g key={x}>
                    <path d={rail(x - 16)} stroke="rgba(31,120,160,0.35)" strokeWidth="9" fill="none" strokeLinecap="round" transform="translate(3 4)" />
                    <path d={rail(x - 16)} stroke={`url(#${id}-chrome)`} strokeWidth="8" fill="none" strokeLinecap="round" />
                    <path d={rail(x - 16)} stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9" transform="translate(-1.5 -1)" />
                </g>
            ))}
            {/* where the rails meet the water */}
            {[0, 74].map((x) => (
                <ellipse key={x} cx={x + 30} cy="66" rx="12" ry="3" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" />
            ))}
        </svg>
    )
}

/** A pink inner tube floating on the pool, bobbing. */
export function PoolRing({ width = 170, color = BARB.HOT, style, className }: { width?: number; color?: string; style?: CSSProperties; className?: string }) {
    const id = useSvgId('bring')
    return (
        <svg viewBox="-90 -40 180 80" width={width} height={(width * 80) / 180} style={{ overflow: 'visible', ...style }} className={className} aria-hidden>
            <defs>
                <linearGradient id={`${id}-tube`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFB3DA" />
                    <stop offset="45%" stopColor={color} />
                    <stop offset="100%" stopColor={BARB.RASPBERRY} />
                </linearGradient>
            </defs>
            {/* its shadow and waterline on the pool */}
            <ellipse cx="4" cy="16" rx="84" ry="22" fill="#127FAA" opacity="0.3" />
            <ellipse cx="0" cy="10" rx="86" ry="26" fill="none" stroke="#E9FBFF" strokeWidth="2.5" opacity="0.85" className="barb-ring-ripple" />
            {/* the tube */}
            <path d="M -78 0 A 78 26 0 1 0 78 0 A 78 26 0 1 0 -78 0 Z M -34 -2 A 34 10 0 1 1 34 -2 A 34 10 0 1 1 -34 -2 Z" fill={`url(#${id}-tube)`} fillRule="evenodd" />
            {/* the water showing through the hole */}
            <ellipse cx="0" cy="-2" rx="34" ry="10" fill="#2CB3D8" />
            <path d="M -30 -4 Q 0 -14 30 -4" stroke="#127FAA" strokeWidth="5" fill="none" opacity="0.5" />
            {/* white stripes painted round the tube */}
            {[-56, 0, 56].map((x) => (
                <path key={x} d={`M ${x - 9} ${x === 0 ? -26 : -18} q 8 6 18 0 l 0 ${x === 0 ? 14 : 30} q -9 6 -18 0 Z`} fill="#FFFFFF" opacity="0.92" transform={x === 0 ? 'translate(0 2)' : undefined} />
            ))}
            {/* the gloss */}
            <path d="M -62 -14 Q -30 -26 4 -25" stroke="#FFFFFF" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />
        </svg>
    )
}

/** A mid-century starburst wall clock: the sun, as Palm Springs drew it. */
export function StarburstClock({ size = 120, style }: { size?: number; style?: CSSProperties }) {
    const spokes = 12
    return (
        <svg viewBox="-60 -60 120 120" width={size} height={size} style={{ overflow: 'visible', ...style }} aria-hidden>
            <g style={{ filter: 'drop-shadow(2px 4px 0 rgba(176,17,94,0.25))' }}>
                {Array.from({ length: spokes }, (_, i) => {
                    const a = (i / spokes) * Math.PI * 2
                    const long = i % 3 === 0
                    const r1 = long ? 58 : 46
                    return (
                        <g key={i}>
                            <line x1={Math.cos(a) * 16} y1={Math.sin(a) * 16} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke="#E9B949" strokeWidth={long ? 3 : 2} strokeLinecap="round" />
                            <circle cx={Math.cos(a) * r1} cy={Math.sin(a) * r1} r={long ? 4.5 : 3} fill={long ? BARB.SUN : '#FFFFFF'} stroke="#E9B949" strokeWidth="1" />
                        </g>
                    )
                })}
                <circle r="20" fill={BARB.WHITE} stroke="#E9B949" strokeWidth="3" />
                <line x1="0" y1="0" x2="0" y2="-13" stroke={BARB.PLUM} strokeWidth="2.6" strokeLinecap="round" className="barb-clock-min" />
                <line x1="0" y1="0" x2="9" y2="3" stroke={BARB.PLUM} strokeWidth="3" strokeLinecap="round" />
                <circle r="2.6" fill={BARB.PINK} />
            </g>
        </svg>
    )
}

// ── The desert range ─────────────────────────────────────────────────────────

/**
 * The desert range on the horizon, painted: each range is one silhouette of
 * soft rounded ridges, and the faces turned away from the sun are a second
 * flat tone laid along the ridge lines.
 */
export function Mountains({ width, height, seed = 0.6, style }: { width: number; height: number; seed?: number; style?: CSSProperties }) {
    const ranges = useMemo(() => {
        const r = rng(seed)
        const mk = (n: number, top: number, spread: number) => {
            const peaks: Array<{ x: number; y: number }> = []
            for (let i = 0; i <= n; i++) peaks.push({ x: (i / n) * width + (r() - 0.5) * (width / n) * 0.5, y: top + r() * spread })
            // the outline: soft summits joined by sagging saddles
            let d = `M -40 ${height} L -40 ${peaks[0].y}`
            const shades: string[] = []
            for (let i = 0; i < peaks.length - 1; i++) {
                const a = peaks[i]
                const b = peaks[i + 1]
                const sx = (a.x + b.x) / 2 + (r() - 0.5) * 40
                const sy = Math.max(a.y, b.y) + (height - Math.max(a.y, b.y)) * (0.35 + r() * 0.3)
                d += ` Q ${a.x + (sx - a.x) * 0.35} ${a.y - 6} ${sx} ${sy}`
                d += ` Q ${sx + (b.x - sx) * 0.65} ${b.y - 6} ${b.x} ${b.y}`
                // the shadow face: from the summit down its sunless side
                shades.push(`M ${a.x} ${a.y} Q ${a.x + (sx - a.x) * 0.35} ${a.y - 6} ${sx} ${sy} L ${sx - 6} ${height} L ${a.x + 14} ${height} Q ${a.x + 26} ${(a.y + height) / 2} ${a.x} ${a.y} Z`)
            }
            d += ` L ${width + 40} ${height} Z`
            return { d, shades }
        }
        return [
            { lit: BARB.HILL_FAR, shade: '#DDA4D6', ...mk(5, height * 0.02, height * 0.32) },
            { lit: BARB.HILL_NEAR, shade: '#C384C6', ...mk(4, height * 0.36, height * 0.26) },
        ]
    }, [seed, width, height])
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible', ...style }} aria-hidden>
            {ranges.map((range, k) => (
                <g key={k}>
                    <path d={range.d} fill={range.lit} />
                    {range.shades.map((d, i) => <path key={i} d={d} fill={range.shade} opacity="0.85" />)}
                    {/* haze where the range meets the deck */}
                    <rect x="-40" y={height * 0.72} width={width + 80} height={height * 0.28} fill="#FFD9EA" opacity={k === 0 ? 0.45 : 0.3} />
                </g>
            ))}
        </svg>
    )
}

// ── Architecture ─────────────────────────────────────────────────────────────

const BREEZE = breezeBlock('#FFE3F0', '#F08DC2', '#D8649F', 64)

/** A Palm Springs wall: flat roof slab with a white fascia, a candy-pink body
 *  and a breeze-block screen, standing on the pool deck. `clock` hangs a
 *  starburst clock on the solid part of the wall. */
export function BreezeWall({ width, height, flip = false, clock = false, style }: { width: number; height: number; flip?: boolean; clock?: boolean; style?: CSSProperties }) {
    const screenW = width * (clock ? 0.46 : 0.56)
    return (
        <div aria-hidden style={{ position: 'absolute', width, height, transform: flip ? 'scaleX(-1)' : undefined, ...style }}>
            {/* the shadow it casts on the deck */}
            <div style={{ position: 'absolute', left: -20, right: -60, bottom: -18, height: 30, borderRadius: '50%', background: 'rgba(176,17,94,0.22)' }} />
            {/* body */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 30, bottom: 0, background: `linear-gradient(180deg, #FFB9DC 0%, ${BARB.CANDY} 55%, #F796C8 100%)` }} />
            {/* the breeze-block screen, pierced: we can see the sky through it */}
            <div
                style={{
                    position: 'absolute',
                    top: 58,
                    bottom: 26,
                    left: flip ? undefined : (width - screenW) * 0.62,
                    right: flip ? (width - screenW) * 0.62 : undefined,
                    width: screenW,
                    backgroundImage: BREEZE,
                    backgroundSize: '64px 64px',
                    boxShadow: 'inset 0 6px 0 rgba(176,17,94,0.18), 0 0 0 5px #FFE3F0',
                }}
            />
            {/* roof slab */}
            <div style={{ position: 'absolute', left: -26, right: -46, top: 0, height: 34, background: BARB.WHITE, boxShadow: '0 8px 0 rgba(176,17,94,0.18), inset 0 -5px 0 #FBE4F1' }} />
            {/* slim steel post at the open end */}
            <div style={{ position: 'absolute', right: -40, top: 34, bottom: 0, width: 8, background: 'linear-gradient(90deg, #FFFFFF, #F4D3E6)' }} />
            {clock && (
                // un-mirrored, so the clock's hands read the right way round
                <div style={{ position: 'absolute', right: 6, top: 70, transform: flip ? 'scaleX(-1)' : undefined }}>
                    <StarburstClock size={132} />
                </div>
            )}
        </div>
    )
}

/** A pool cabana: the same pink wall, with a candy-striped awning over a
 *  shaded doorway hung with a striped curtain. */
export function Cabana({ width, height, style }: { width: number; height: number; style?: CSSProperties }) {
    const door = { left: width * 0.3, width: width * 0.42 }
    return (
        <div aria-hidden style={{ position: 'absolute', width, height, ...style }}>
            <div style={{ position: 'absolute', left: -20, right: -60, bottom: -18, height: 30, borderRadius: '50%', background: 'rgba(176,17,94,0.22)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 30, bottom: 0, background: `linear-gradient(180deg, #FFB9DC 0%, ${BARB.CANDY} 55%, #F796C8 100%)` }} />
            {/* the doorway in shade, its curtain tied back */}
            <div style={{ position: 'absolute', left: door.left, width: door.width, top: 104, bottom: 0, background: 'linear-gradient(180deg, #B4407F, #D5639F)', boxShadow: 'inset 0 10px 14px rgba(90,10,60,0.35)' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '34%', background: `repeating-linear-gradient(90deg, ${BARB.WHITE} 0 9px, #FFE3F0 9px 18px)`, clipPath: 'polygon(0 0, 100% 0, 46% 62%, 30% 100%, 0 100%)' }} />
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '34%', background: `repeating-linear-gradient(90deg, ${BARB.WHITE} 0 9px, #FFE3F0 9px 18px)`, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 70% 100%, 54% 62%)' }} />
            </div>
            {/* roof slab */}
            <div style={{ position: 'absolute', left: -26, right: -46, top: 0, height: 34, background: BARB.WHITE, boxShadow: '0 8px 0 rgba(176,17,94,0.18), inset 0 -5px 0 #FBE4F1' }} />
            {/* the awning, hung from the slab across the doorway */}
            <div style={{ position: 'absolute', left: door.left - 46, width: door.width + 92, top: 34 }}>
                <Awning width={door.width + 92} canopy={30} valance={18} scallop={14} />
            </div>
            <div style={{ position: 'absolute', right: -40, top: 34, bottom: 0, width: 8, background: 'linear-gradient(90deg, #FFFFFF, #F4D3E6)' }} />
        </div>
    )
}

/** A candy-striped awning: the canopy, then a scalloped valance with piping.
 *  The valance carries an optional label. */
export function Awning({
    width,
    canopy = 54,
    valance = 46,
    scallop = 23,
    stripes = [BARB.PINK, BARB.WHITE],
    valanceColor,
    children,
    style,
}: {
    width: number | string
    canopy?: number
    valance?: number
    scallop?: number
    stripes?: [string, string]
    /** A solid valance (so a label on it can be read); striped when omitted. */
    valanceColor?: string
    children?: ReactNode
    style?: CSSProperties
}) {
    const [a, b] = stripes
    const stripe = `repeating-linear-gradient(90deg, ${a} 0 ${scallop}px, ${b} ${scallop}px ${scallop * 2}px)`
    return (
        <div aria-hidden={!children} style={{ position: 'relative', width, filter: 'drop-shadow(0 10px 10px rgba(176,17,94,0.22))', ...style }}>
            {/* canopy: the stripes run back toward the wall, shaded as they go */}
            <div style={{ height: canopy, backgroundImage: `linear-gradient(180deg, rgba(122,16,78,0.28), rgba(122,16,78,0) 70%), ${stripe}` }} />
            {/* piping at the fold */}
            <div style={{ height: 6, background: BARB.WHITE, boxShadow: '0 2px 0 rgba(176,17,94,0.2)' }} />
            {/* valance */}
            <div
                style={{
                    position: 'relative',
                    height: valance + scallop,
                    backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0) 40%), ${valanceColor ? `linear-gradient(${valanceColor}, ${valanceColor})` : stripe}`,
                    WebkitMaskImage: `linear-gradient(#000, #000), radial-gradient(circle ${scallop}px at ${scallop}px 0, #000 calc(100% - 0.7px), transparent 100%)`,
                    maskImage: `linear-gradient(#000, #000), radial-gradient(circle ${scallop}px at ${scallop}px 0, #000 calc(100% - 0.7px), transparent 100%)`,
                    WebkitMaskSize: `100% ${valance}px, ${scallop * 2}px ${scallop}px`,
                    maskSize: `100% ${valance}px, ${scallop * 2}px ${scallop}px`,
                    WebkitMaskPosition: `0 0, 0 ${valance}px`,
                    maskPosition: `0 0, 0 ${valance}px`,
                    WebkitMaskRepeat: 'no-repeat, repeat-x',
                    maskRepeat: 'no-repeat, repeat-x',
                }}
            />
            {children && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: canopy + 6, height: valance, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
            )}
        </div>
    )
}

// ── The plane and its banner ─────────────────────────────────────────────────

function Biplane({ size = 150 }: { size?: number }) {
    return (
        <svg viewBox="0 0 150 80" width={size} height={(size * 80) / 150} style={{ overflow: 'visible' }} aria-hidden>
            {/* lower wing */}
            <path d="M 34 52 L 104 52 Q 110 56 104 60 L 34 60 Q 28 56 34 52 Z" fill="#F796C8" />
            {/* fuselage, nose to the left (it flies right to left) */}
            <path d="M 14 40 Q 16 28 40 28 L 112 32 L 138 22 L 142 26 L 132 42 Q 120 50 40 50 Q 16 50 14 40 Z" fill={BARB.PINK} />
            <path d="M 40 30 L 112 33 L 112 37 L 40 36 Z" fill="#FFFFFF" opacity="0.45" />
            {/* tail fin */}
            <path d="M 126 30 L 138 6 L 146 8 L 140 34 Z" fill={BARB.BUBBLE} />
            {/* cockpit and pilot's scarf */}
            <path d="M 62 28 Q 70 14 82 28 Z" fill="#BDF1FB" stroke="#FFFFFF" strokeWidth="1.5" />
            <path d="M 80 24 Q 92 18 104 22 Q 96 26 84 27 Z" fill={BARB.SUN} className="barb-scarf" />
            {/* struts and upper wing */}
            <path d="M 48 26 L 52 52 M 92 27 L 88 52" stroke="#FFFFFF" strokeWidth="2.5" />
            <path d="M 30 16 L 108 16 Q 116 21 108 26 L 30 26 Q 22 21 30 16 Z" fill={BARB.WHITE} />
            <path d="M 30 16 L 108 16 Q 112 18 112 20 L 26 20 Q 26 18 30 16 Z" fill="#FFE3F0" />
            {/* wheels */}
            <path d="M 46 50 L 42 66 M 60 50 L 64 66" stroke={BARB.PLUM_SOFT} strokeWidth="2" />
            <circle cx="42" cy="67" r="5" fill={BARB.PLUM} />
            <circle cx="64" cy="67" r="5" fill={BARB.PLUM} />
            {/* propeller, a painted blur */}
            <ellipse cx="11" cy="40" rx="3" ry="20" fill="#FFFFFF" opacity="0.6" className="barb-prop" />
            <circle cx="12" cy="40" r="4" fill={BARB.SUN} />
        </svg>
    )
}

/** A biplane towing a banner across the sky, one message per pass. The banner
 *  is an SVG path whose wave is animated, and the lettering rides it on a
 *  textPath, so the words flutter with the cloth. */
export function SkyBanner({ messages, top = 120, period = 30, style }: { messages: string[]; top?: number; period?: number; style?: CSSProperties }) {
    const id = useSvgId('bbanner')
    const [k, setK] = useState(0)
    const msg = messages.length ? messages[k % messages.length] : ''
    const W = Math.max(380, 44 + msg.length * 25)
    const H = 64
    const wave = (ph: number) => {
        // top edge, then bottom edge back, a travelling ripple of three bumps
        const amp = 6
        const pts = (y: number, dir: number) => {
            let d = ''
            const n = 6
            for (let i = 0; i <= n; i++) {
                const x = dir > 0 ? (i / n) * W : W - (i / n) * W
                const yy = y + Math.sin((x / W) * Math.PI * 3 + ph) * amp * (0.35 + 0.65 * (x / W))
                d += `${i === 0 ? (dir > 0 ? 'M' : 'L') : 'L'} ${x.toFixed(1)} ${yy.toFixed(1)} `
            }
            return d
        }
        return `${pts(0, 1)}${pts(H, -1)}Z`
    }
    const mid = (ph: number) => {
        let d = ''
        const n = 12
        for (let i = 0; i <= n; i++) {
            const x = (i / n) * W
            const yy = H * 0.66 + Math.sin((x / W) * Math.PI * 3 + ph) * 6 * (0.35 + 0.65 * (x / W))
            d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yy.toFixed(1)} `
        }
        return d
    }
    const phases = [0, 2.1, 4.2, 6.283]
    return (
        <div
            aria-hidden
            className="barb-fly"
            onAnimationIteration={() => setK((v) => v + 1)}
            style={{ position: 'absolute', top, left: 0, display: 'flex', alignItems: 'center', animationDuration: `${period}s`, ...style }}
        >
            <Biplane size={150} />
            {/* tow line */}
            <svg width="70" height="20" style={{ overflow: 'visible', marginLeft: -6, marginTop: 6 }}>
                <path d="M 0 4 Q 35 16 70 10" stroke={BARB.PLUM_SOFT} strokeWidth="1.5" fill="none" />
            </svg>
            <svg width={W} height={H + 16} viewBox={`0 -8 ${W} ${H + 16}`} style={{ overflow: 'visible', marginTop: 12 }}>
                <path d={wave(0)} fill={BARB.WHITE} stroke={BARB.BLUSH} strokeWidth="2">
                    <animate attributeName="d" dur="1.6s" repeatCount="indefinite" values={phases.map(wave).join(';')} />
                </path>
                <path id={`${id}-mid`} d={mid(0)} fill="none">
                    <animate attributeName="d" dur="1.6s" repeatCount="indefinite" values={phases.map(mid).join(';')} />
                </path>
                <text style={{ fontFamily: BARB.FONT_DISPLAY, fontSize: 36, fill: BARB.PINK }}>
                    <textPath href={`#${id}-mid`} startOffset="50%" textAnchor="middle">{msg}</textPath>
                </text>
                {/* the pole at the leading edge */}
                <rect x="-4" y="-6" width="4" height={H + 12} rx="2" fill={BARB.PLUM_SOFT} />
            </svg>
        </div>
    )
}

// ── Small objects ────────────────────────────────────────────────────────────

/** Heart-shaped sunglasses, the pose-striking kind. */
export function HeartShades({ width = 74, frame = BARB.PINK }: { width?: number; frame?: string }) {
    const heart = 'M 0 -6 C -4 -16 -22 -14 -20 0 C -18 10 -6 16 0 22 C 6 16 18 10 20 0 C 22 -14 4 -16 0 -6 Z'
    return (
        <svg viewBox="-52 -22 104 50" width={width} height={(width * 50) / 104} aria-hidden style={{ overflow: 'visible' }}>
            <path d="M -8 -2 Q 0 -8 8 -2" stroke={frame} strokeWidth="4" fill="none" strokeLinecap="round" />
            {[-26, 26].map((x) => (
                <g key={x} transform={`translate(${x} 0)`}>
                    <path d={heart} fill={frame} transform="scale(1.18)" />
                    <path d={heart} fill="#5A1446" />
                    <path d="M -14 -4 C -12 -10 -6 -10 -4 -6" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
                </g>
            ))}
            <path d="M -50 -4 L -46 -8 M 50 -4 L 46 -8" stroke={frame} strokeWidth="4" strokeLinecap="round" />
        </svg>
    )
}

/** The mic level as a little sun in the singer's colour: its rays reach out as
 *  they sing louder. */
export function SunMeter({ level, color, size = 26 }: { level: number; color: string; size?: number }) {
    const l = Math.min(1, level * 2.6)
    return (
        <svg viewBox="-20 -20 40 40" width={size} height={size} aria-hidden style={{ overflow: 'visible', flexShrink: 0 }}>
            <circle r={12 + l * 6} fill={color} opacity={0.18 + l * 0.25} />
            {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2
                const r0 = 9.5
                const r1 = r0 + 2.5 + l * 7.5 * (i % 2 ? 0.75 : 1)
                return (
                    <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke={color} strokeWidth="2.6" strokeLinecap="round" />
                )
            })}
            <circle r="7.5" fill={color} stroke="#FFFFFF" strokeWidth="2" />
            <path d="M -4 -2 A 4.5 4.5 0 0 1 0 -5" stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.85" />
        </svg>
    )
}

/** The up-next song, presented as the sun: its art is the disc, ringed by a
 *  scalloped sunburst that turns slowly. */
export function ArtSun({ art, size, hidden = false, className, style }: { art: string | null; size: number; hidden?: boolean; className?: string; style?: CSSProperties }) {
    const ring = size * 1.5
    return (
        <div className={className} style={{ position: 'relative', width: size, height: size, ...style }}>
            <div style={{ position: 'absolute', left: (size - ring) / 2, top: (size - ring) / 2, width: ring, height: ring }}>
                <PaintedSun size={ring} rays="burst" />
            </div>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: `radial-gradient(circle at 40% 36%, ${BARB.SUN_CORE}, ${BARB.SUN} 70%, #FFB42E)`,
                    boxShadow: `0 0 0 ${size * 0.035}px ${BARB.WHITE}, 0 0 0 ${size * 0.06}px ${BARB.SUN}, 0 ${size * 0.05}px ${size * 0.12}px rgba(176,17,94,0.35)`,
                }}
            >
                {art && !hidden && <img src={art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                {/* the painter's highlight on the disc */}
                <div className="barb-glint" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(ellipse 46% 30% at 32% 22%, rgba(255,255,255,0.45), transparent 70%)' }} />
            </div>
        </div>
    )
}

/** Sign-painted lettering with the shared glint running through its fill. */
export function RetroTitle({
    text,
    size,
    fill = BARB.PINK,
    depthColor = BARB.RASPBERRY,
    outline = BARB.WHITE,
    outlineW = 0.055,
    depth = 0.1,
    as: Tag = 'div',
    className,
    style,
}: {
    text: string
    size: number
    fill?: string
    depthColor?: string
    outline?: string
    outlineW?: number
    depth?: number
    as?: 'div' | 'h1' | 'h2' | 'span'
    className?: string
    style?: CSSProperties
}) {
    return (
        <Tag
            className={'barb-title' + (className ? ' ' + className : '')}
            data-text={text}
            style={{ ...retroType({ fill, depthColor, outline, outlineW, depth }), fontSize: size, lineHeight: 1.12, margin: 0, position: 'relative', ...style }}
        >
            {text}
        </Tag>
    )
}

/** Glossy plastic: a pill with a white rim, one crisp specular, and the glint. */
export function GlossPill({
    children,
    tone = 'white',
    radius = 999,
    className,
    style,
}: {
    children: ReactNode
    tone?: 'white' | 'pink' | 'sun'
    radius?: number
    className?: string
    style?: CSSProperties
}) {
    const bg =
        tone === 'pink'
            ? `linear-gradient(180deg, ${BARB.BUBBLE} 0%, ${BARB.PINK} 60%, #C4127A 100%)`
            : tone === 'sun'
              ? `linear-gradient(180deg, ${BARB.SUN_HI} 0%, ${BARB.SUN} 62%, #F2B21E 100%)`
              : `linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 55%, ${BARB.SHELL} 100%)`
    const base = tone === 'pink' ? 'rgba(122,16,78,0.3)' : tone === 'sun' ? 'rgba(180,110,0,0.24)' : BARB.BLUSH
    return (
        <div
            className={'barb-glint' + (className ? ' ' + className : '')}
            style={{
                position: 'relative',
                borderRadius: radius,
                background: bg,
                border: `3px solid ${BARB.WHITE}`,
                boxShadow: `0 10px 24px rgba(176,17,94,0.26), inset 0 -4px 0 ${base}, inset 0 3px 0 rgba(255,255,255,0.6)`,
                overflow: 'hidden',
                ...style,
            }}
        >
            {/* the specular: a single hard-edged streak, like light on vinyl */}
            <span aria-hidden style={{ position: 'absolute', left: '9%', right: '9%', top: 3, height: '26%', minHeight: 5, borderRadius: 999, background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0))', pointerEvents: 'none' }} />
            {/* display: contents, so the pill's own flex layout (from `style`)
                lays out the children directly */}
            <div style={{ display: 'contents' }}>{children}</div>
        </div>
    )
}

/** A white card with a scalloped (deckle) edge all round, like a vintage
 *  snapshot or a postage stamp. The edge is a mask, so the drop shadow lives
 *  on the wrapper as a filter. */
export function DeckleCard({ children, r = 9, color = BARB.WHITE, className, style, cardStyle }: { children: ReactNode; r?: number; color?: string; className?: string; style?: CSSProperties; cardStyle?: CSSProperties }) {
    const d = r * 2
    const layers = [
        'linear-gradient(#000, #000)',
        `radial-gradient(circle ${r}px at ${r}px ${r}px, #000 calc(100% - 0.7px), transparent 100%)`,
        `radial-gradient(circle ${r}px at ${r}px ${r}px, #000 calc(100% - 0.7px), transparent 100%)`,
        `radial-gradient(circle ${r}px at ${r}px ${r}px, #000 calc(100% - 0.7px), transparent 100%)`,
        `radial-gradient(circle ${r}px at ${r}px ${r}px, #000 calc(100% - 0.7px), transparent 100%)`,
    ].join(', ')
    const sizes = `calc(100% - ${d}px) calc(100% - ${d}px), ${d}px ${d}px, ${d}px ${d}px, ${d}px ${d}px, ${d}px ${d}px`
    const pos = `${r}px ${r}px, ${r}px 0, ${r}px 100%, 0 ${r}px, 100% ${r}px`
    const rep = 'no-repeat, repeat-x, repeat-x, repeat-y, repeat-y'
    return (
        <div className={className} style={{ filter: 'drop-shadow(0 12px 18px rgba(176,17,94,0.3))', ...style }}>
            <div
                style={{
                    position: 'relative',
                    background: color,
                    WebkitMaskImage: layers,
                    maskImage: layers,
                    WebkitMaskSize: sizes,
                    maskSize: sizes,
                    WebkitMaskPosition: pos,
                    maskPosition: pos,
                    WebkitMaskRepeat: rep,
                    maskRepeat: rep,
                    ...cardStyle,
                }}
            >
                {children}
            </div>
        </div>
    )
}

/** The theme's text helpers, shared by the screens. */
export const barbText = {
    script: (size: number, color: string = BARB.WHITE): CSSProperties => ({
        fontFamily: BARB.FONT_SCRIPT,
        fontSize: size,
        color,
        lineHeight: 1,
        fontWeight: 400,
    }),
    body: (size: number, color: string = BARB.PLUM, weight = 600): CSSProperties => ({
        fontFamily: BARB.FONT_BODY,
        fontSize: size,
        color,
        fontWeight: weight,
    }),
    caps: (size: number, color: string = BARB.PINK): CSSProperties => ({
        fontFamily: BARB.FONT_BODY,
        fontSize: size,
        color,
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
    }),
}
