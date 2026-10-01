// The chapel wall: the room every gothic stage screen stands in.
//
// One composition, in a 1920×1080 design space that is fitted to the screen's
// HEIGHT and allowed to run off the sides (a 16:10 laptop loses a little stone
// at the edges, never the top of the rose window). Back to front:
//
//   1. the storm (WebGL), filling the whole screen behind everything
//   2. whatever might be standing outside, visible only by lightning
//   3. the glazing: pot-metal colour where the windows are stained, a faint
//      amber wash where they're plain, and the lead lines
//   4. the wall itself, with the window openings cut out of it, moulded
//      jambs, bar tracery, and masonry courses
//   5. light: a cold shaft of moonlight down from the rose, the lightning
//      throwing the windows' shapes across the floor
//   6. watching eyes, floor fog, and the candles in front of it all
//
// The wall is one static SVG with no animated or flash-driven attribute in it,
// so the browser paints it once. Everything that answers the storm lives in
// separate thin layers above or below it.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { GOTH, GOTH_TEX, lancetPath } from '../../styles/gothic'
import { GothicStorm } from './GothicStorm'
import { GothicEyes, type EyeAnchor } from './GothicEyes'
import { GothicCandle, GothicCandleCluster } from './GothicCandle'
import { retainStormBridge, sampleStorm } from './storm'

// ── Design-space geometry ────────────────────────────────────────────────────
const W = 1920
const H = 1080

interface Lancet {
    x0: number
    x1: number
    apex: number
    sill: number
}

function lancetGeom(l: Lancet) {
    const span = l.x1 - l.x0
    const rise = (span * Math.sqrt(3)) / 2
    const spring = l.apex + rise
    const cx = (l.x0 + l.x1) / 2
    return { span, rise, spring, cx }
}

/** Opening outline for a lancet in design space. */
function openingPath(l: Lancet, grow = 0): string {
    // Growing an equilateral arch outward keeps its arcs concentric: each arc's
    // centre stays on the opposite springing point and the radius gains `grow`.
    const { span, spring } = lancetGeom(l)
    const x0 = l.x0 - grow
    const x1 = l.x1 + grow
    const r = span + grow
    const cx = (l.x0 + l.x1) / 2
    // apex of the grown arch: on the centre line, at distance r from (l.x1, spring)
    const dx = l.x1 - cx
    const apexY = spring - Math.sqrt(r * r - dx * dx)
    return `M ${x0} ${l.sill + grow * 0.4} L ${x0} ${spring} A ${r} ${r} 0 0 1 ${cx} ${apexY} A ${r} ${r} 0 0 1 ${x1} ${spring} L ${x1} ${l.sill + grow * 0.4} Z`
}

/** Bar tracery for a two-light lancet: mullion, sub-arches, oculus, transom. */
function traceryPaths(l: Lancet): { bars: string[]; oculus: { cx: number; cy: number; r: number } } {
    const { cx, spring } = lancetGeom(l)
    const half = (l.x1 - l.x0) / 2
    const subRise = (half * Math.sqrt(3)) / 2
    const subApex = spring + (l.sill - spring) * 0.18
    const subSpring = subApex + subRise
    const sub = (a: number, b: number) => {
        const m = (a + b) / 2
        return `M ${a} ${subSpring} A ${half} ${half} 0 0 1 ${m} ${subApex} A ${half} ${half} 0 0 1 ${b} ${subSpring}`
    }
    const transom = l.sill - (l.sill - subSpring) * 0.38
    const ocR = Math.min(half * 0.46, (subApex - l.apex) * 0.34)
    const ocY = subApex - ocR * 1.25
    return {
        bars: [
            `M ${cx} ${subSpring - 6} L ${cx} ${l.sill}`,
            sub(l.x0, cx),
            sub(cx, l.x1),
            `M ${l.x0} ${transom} L ${l.x1} ${transom}`,
        ],
        oculus: { cx, cy: ocY, r: ocR },
    }
}

const LANCETS_IDLE: Lancet[] = [
    { x0: 150, x1: 480, apex: 64, sill: 905 },
    { x0: 1440, x1: 1770, apex: 64, sill: 905 },
]
const LANCETS_UPNEXT: Lancet[] = [
    { x0: 120, x1: 420, apex: 90, sill: 930 },
    { x0: 1500, x1: 1800, apex: 90, sill: 930 },
]
const ROSE = { cx: 960, cy: 250, r: 158 }
// Where the moon hides: behind the rose window, or high and centred.
const MOON_ROSE: [number, number] = [0.535, 0.79]
const MOON_HIGH: [number, number] = [0.5, 0.9]

// Panes of colour around each lancet's border, alternating pot-metal glass.
const BORDER_GLASS = [GOTH.RUBY, GOTH.SAPPHIRE, GOTH.RUBY, GOTH.EMERALD, GOTH.RUBY, GOTH.SAPPHIRE, GOTH.AMETHYST]

function roseSpokes(n = 12) {
    const out: string[] = []
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2
        const r0 = 44
        const r1 = ROSE.r - 4
        out.push(`M ${ROSE.cx + Math.cos(a) * r0} ${ROSE.cy + Math.sin(a) * r0} L ${ROSE.cx + Math.cos(a) * r1} ${ROSE.cy + Math.sin(a) * r1}`)
    }
    return out
}

/** The cusped foils of the rose: a pointed arch bridging each pair of spokes. */
function roseFoils(n = 12, r = 112) {
    const out: string[] = []
    for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2
        const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2
        const am = (a0 + a1) / 2
        const p0 = [ROSE.cx + Math.cos(a0) * r, ROSE.cy + Math.sin(a0) * r]
        const p1 = [ROSE.cx + Math.cos(a1) * r, ROSE.cy + Math.sin(a1) * r]
        const tip = [ROSE.cx + Math.cos(am) * (r + 30), ROSE.cy + Math.sin(am) * (r + 30)]
        out.push(`M ${p0[0]} ${p0[1]} Q ${ROSE.cx + Math.cos(am - 0.12) * (r + 26)} ${ROSE.cy + Math.sin(am - 0.12) * (r + 26)} ${tip[0]} ${tip[1]} Q ${ROSE.cx + Math.cos(am + 0.12) * (r + 26)} ${ROSE.cy + Math.sin(am + 0.12) * (r + 26)} ${p1[0]} ${p1[1]}`)
    }
    return out
}

// ── The figure outside ───────────────────────────────────────────────────────

/** A hooded shape, standing outside one window. It is only there in the
 *  flash, and on the second flash it is closer. */
function Watcher({ lancets }: { lancets: Lancet[] }) {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        let raf = 0
        const tick = () => {
            const el = ref.current
            if (el) {
                const s = sampleStorm()
                if (s.figure && s.pulse >= 0 && s.pulse < 2) {
                    const l = lancets[s.figureSlot % lancets.length]
                    const g = lancetGeom(l)
                    const near = s.pulse === 1
                    el.style.left = `${(g.cx / W) * 100}%`
                    el.style.opacity = String(Math.min(1, s.flash * 1.8))
                    el.style.transform = `translateX(-50%) scale(${near ? 1.32 : 1})`
                } else {
                    el.style.opacity = '0'
                }
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [lancets])
    const sill = lancets[0].sill
    return (
        <div
            ref={ref}
            aria-hidden
            style={{
                position: 'absolute', bottom: `${((H - sill) / H) * 100}%`, left: '25%', height: '34%', aspectRatio: '0.55',
                opacity: 0, transformOrigin: '50% 100%', zIndex: 1, pointerEvents: 'none',
            }}
        >
            <svg viewBox="0 0 110 200" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" style={{ display: 'block' }}>
                <path
                    d="M55 6 C 34 6 26 24 27 44 C 27.5 54 24 60 18 70 C 6 92 2 130 0 200 L 110 200 C 108 130 104 92 92 70 C 86 60 82.5 54 83 44 C 84 24 76 6 55 6 Z"
                    fill="#030204"
                />
                {/* the face is a deeper hollow inside the hood */}
                <ellipse cx="55" cy="46" rx="15" ry="19" fill="#000" />
            </svg>
        </div>
    )
}

// ── Wall ─────────────────────────────────────────────────────────────────────

function Wall({ lancets, rose }: { lancets: Lancet[]; rose: boolean }) {
    // Where the candles stand (cx, cy, radius), so the stone behind each is lit.
    const pools: Array<[number, number, number]> = rose
        ? [[120, 980, 380], [1800, 980, 380], [600, 700, 260], [1320, 700, 260]]
        : [[120, 990, 380], [1800, 990, 380]]
    const tracery = useMemo(() => lancets.map(traceryPaths), [lancets])
    const spokes = useMemo(() => roseSpokes(), [])
    const foils = useMemo(() => roseFoils(), [])
    const BIG = 6000
    // Ashlar courses: horizontal joints, and staggered vertical joints.
    const joints = useMemo(() => {
        const out: string[] = []
        const course = 74
        for (let row = 0, y = 20; y < H; row++, y += course) {
            out.push(`M -400 ${y} L ${W + 400} ${y}`)
            const offset = row % 2 === 0 ? 0 : 92
            for (let x = -400 + offset; x < W + 400; x += 184) out.push(`M ${x} ${y} L ${x} ${y + course}`)
        }
        return out.join(' ')
    }, [])
    const bar = (d: string, k: string, w = 13) => (
        <g key={k}>
            <path d={d} stroke="#08070A" strokeWidth={w + 4} fill="none" strokeLinecap="square" />
            <path d={d} stroke="#26222D" strokeWidth={w} fill="none" strokeLinecap="square" />
            <path d={d} stroke="rgba(175,195,234,0.24)" strokeWidth={1.6} fill="none" transform="translate(-2.5 -2.5)" />
        </g>
    )
    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 3 }}
            aria-hidden
        >
            <defs>
                <mask id="goth-wall-cut" maskUnits="userSpaceOnUse" x={-BIG} y={-BIG} width={BIG * 2 + W} height={BIG * 2 + H}>
                    <rect x={-BIG} y={-BIG} width={BIG * 2 + W} height={BIG * 2 + H} fill="#fff" />
                    {lancets.map((l, i) => <path key={i} d={openingPath(l)} fill="#000" />)}
                    {rose && <circle cx={ROSE.cx} cy={ROSE.cy} r={ROSE.r} fill="#000" />}
                </mask>
                <linearGradient id="goth-wall-light" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0B0A0F" />
                    <stop offset="40%" stopColor="#14121A" />
                    <stop offset="78%" stopColor="#18141A" />
                    <stop offset="100%" stopColor="#1E1512" />
                </linearGradient>
                {/* Candlelight pools: each light source throws its own warm oval
                    up the wall behind it. */}
                <radialGradient id="goth-pool" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(240,160,70,0.30)" />
                    <stop offset="35%" stopColor="rgba(227,140,60,0.12)" />
                    <stop offset="100%" stopColor="rgba(227,140,60,0)" />
                </radialGradient>
                <radialGradient id="goth-moonwash" cx="50%" cy="22%" r="60%">
                    <stop offset="0%" stopColor="rgba(150,170,215,0.10)" />
                    <stop offset="100%" stopColor="rgba(150,170,215,0)" />
                </radialGradient>
                <radialGradient id="goth-vignette" cx="50%" cy="52%" r="72%">
                    <stop offset="55%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
                </radialGradient>
                <pattern id="goth-grain" patternUnits="userSpaceOnUse" width="240" height="240">
                    <image href={GOTH_TEX.grain} width="240" height="240" />
                </pattern>
                <pattern id="goth-soot" patternUnits="userSpaceOnUse" width="520" height="520">
                    <image href={GOTH_TEX.soot} width="520" height="520" />
                </pattern>
            </defs>

            <g mask="url(#goth-wall-cut)">
                <rect x={-BIG} y={-BIG} width={BIG * 2 + W} height={BIG * 2 + H} fill="url(#goth-wall-light)" />
                <rect x={-BIG} y={-BIG} width={BIG * 2 + W} height={BIG * 2 + H} fill="url(#goth-soot)" />
                <rect x={-BIG} y={-BIG} width={BIG * 2 + W} height={BIG * 2 + H} fill="url(#goth-grain)" opacity="0.2" />
                {/* masonry: a dark joint with a lit lower lip */}
                <path d={joints} stroke="rgba(0,0,0,0.62)" strokeWidth="3" fill="none" />
                <path d={joints} stroke="rgba(190,175,170,0.07)" strokeWidth="1.2" fill="none" transform="translate(1.5 2)" />
                <rect x={-BIG} y={-BIG} width={BIG * 2 + W} height={BIG * 2 + H} fill="url(#goth-moonwash)" />
                {pools.map((p, i) => (
                    <ellipse key={i} cx={p[0]} cy={p[1]} rx={p[2]} ry={p[2] * 1.25} fill="url(#goth-pool)" />
                ))}
                <rect x={-BIG} y={-BIG} width={BIG * 2 + W} height={BIG * 2 + H} fill="url(#goth-vignette)" />

                {/* Moulded jambs: three receding orders around each opening. */}
                {lancets.map((l, i) => (
                    <g key={i}>
                        <path d={openingPath(l, 46)} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="5" />
                        <path d={openingPath(l, 44)} fill="none" stroke="rgba(175,195,234,0.14)" strokeWidth="1.5" />
                        <path d={openingPath(l, 26)} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="8" />
                        <path d={openingPath(l, 22)} fill="none" stroke="rgba(175,195,234,0.18)" strokeWidth="1.5" />
                        <path d={openingPath(l, 9)} fill="none" stroke="#0A090D" strokeWidth="14" />
                        <path d={openingPath(l, 3)} fill="none" stroke="rgba(227,176,75,0.12)" strokeWidth="1.2" />
                    </g>
                ))}
                {rose && (
                    <g>
                        {[44, 26, 9].map((g, k) => (
                            <circle key={g} cx={ROSE.cx} cy={ROSE.cy} r={ROSE.r + g} fill="none" stroke={k === 2 ? '#0A090D' : 'rgba(0,0,0,0.55)'} strokeWidth={k === 2 ? 14 : 6} />
                        ))}
                        <circle cx={ROSE.cx} cy={ROSE.cy} r={ROSE.r + 42} fill="none" stroke="rgba(175,195,234,0.13)" strokeWidth="1.5" />
                        <circle cx={ROSE.cx} cy={ROSE.cy} r={ROSE.r + 22} fill="none" stroke="rgba(175,195,234,0.17)" strokeWidth="1.5" />
                        {/* dog-tooth ornament round the outer order */}
                        {Array.from({ length: 48 }, (_, i) => {
                            const a = (i / 48) * Math.PI * 2
                            const r = ROSE.r + 34
                            const x = ROSE.cx + Math.cos(a) * r
                            const y = ROSE.cy + Math.sin(a) * r
                            return <path key={i} d={`M ${x} ${y - 4} L ${x + 4} ${y} L ${x} ${y + 4} L ${x - 4} ${y} Z`} fill="rgba(175,195,234,0.12)" transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} />
                        })}
                    </g>
                )}
                {/* A sill ledge under each window, lit from below by the candles. */}
                {lancets.map((l, i) => (
                    <g key={`s${i}`}>
                        <rect x={l.x0 - 70} y={l.sill + 6} width={l.x1 - l.x0 + 140} height="26" fill="#211C22" />
                        <rect x={l.x0 - 70} y={l.sill + 6} width={l.x1 - l.x0 + 140} height="2" fill="rgba(175,195,234,0.2)" />
                        <rect x={l.x0 - 70} y={l.sill + 30} width={l.x1 - l.x0 + 140} height="3" fill="rgba(227,176,75,0.28)" />
                    </g>
                ))}
            </g>

            {/* Tracery bars sit IN the openings, so they're drawn outside the mask. */}
            {lancets.map((l, i) => (
                <g key={`t${i}`}>
                    {tracery[i].bars.map((d, k) => bar(d, `${i}-${k}`))}
                    {(() => {
                        const o = tracery[i].oculus
                        return (
                            <g>
                                <circle cx={o.cx} cy={o.cy} r={o.r} stroke="#08070A" strokeWidth="17" fill="none" />
                                <circle cx={o.cx} cy={o.cy} r={o.r} stroke="#26222D" strokeWidth="13" fill="none" />
                                {/* quatrefoil cusping inside the oculus */}
                                {[0, 90, 180, 270].map((a) => (
                                    <circle
                                        key={a}
                                        cx={o.cx + Math.cos((a * Math.PI) / 180) * o.r * 0.42}
                                        cy={o.cy + Math.sin((a * Math.PI) / 180) * o.r * 0.42}
                                        r={o.r * 0.44}
                                        stroke="#1E1B24"
                                        strokeWidth="6"
                                        fill="none"
                                    />
                                ))}
                            </g>
                        )
                    })()}
                </g>
            ))}
            {rose && (
                <g>
                    {spokes.map((d, k) => bar(d, `sp${k}`, 10))}
                    {foils.map((d, k) => bar(d, `fo${k}`, 8))}
                    <circle cx={ROSE.cx} cy={ROSE.cy} r={44} stroke="#08070A" strokeWidth="16" fill="none" />
                    <circle cx={ROSE.cx} cy={ROSE.cy} r={44} stroke="#26222D" strokeWidth="12" fill="none" />
                    <circle cx={ROSE.cx} cy={ROSE.cy} r={ROSE.r - 3} stroke="#26222D" strokeWidth="9" fill="none" />
                </g>
            )}
        </svg>
    )
}

// ── Glazing ──────────────────────────────────────────────────────────────────

function Glazing({ lancets, rose }: { lancets: Lancet[]; rose: boolean }) {
    // Border panes: a band of colour just inside each opening, split into
    // segments of alternating glass.
    const band = (l: Lancet, i: number) => {
        const segs: ReactNode[] = []
        const { spring } = lancetGeom(l)
        const n = 9
        const top = spring + 30
        const step = (l.sill - top) / n
        for (let k = 0; k < n; k++) {
            const y = top + k * step
            const c = BORDER_GLASS[(k + i * 3) % BORDER_GLASS.length]
            segs.push(<rect key={`a${k}`} x={l.x0} y={y} width="26" height={step - 4} fill={c} />)
            segs.push(<rect key={`b${k}`} x={l.x1 - 26} y={y} width="26" height={step - 4} fill={BORDER_GLASS[(k + i * 3 + 2) % BORDER_GLASS.length]} />)
        }
        return segs
    }
    // Quatrefoil medallions down each light: four lobes of one glass round a
    // jewel of another, the way pictorial windows framed their scenes.
    const medallions = (l: Lancet, i: number) => {
        const { cx, spring } = lancetGeom(l)
        const half = (l.x1 - l.x0) / 2
        const ys = [spring + (l.sill - spring) * 0.42, spring + (l.sill - spring) * 0.76]
        const glass = [GOTH.SAPPHIRE, GOTH.RUBY, GOTH.EMERALD, GOTH.AMETHYST]
        return [cx - half / 2, cx + half / 2].flatMap((x, a) =>
            ys.map((y, b) => {
                const r = half * 0.17
                const k = (a * 2 + b + i) % 4
                return (
                    <g key={`${a}${b}`}>
                        {[0, 90, 180, 270].map((deg) => (
                            <circle key={deg} cx={x + Math.cos((deg * Math.PI) / 180) * r} cy={y + Math.sin((deg * Math.PI) / 180) * r} r={r} fill={glass[k]} />
                        ))}
                        <circle cx={x} cy={y} r={r * 0.7} fill={glass[(k + 1) % 4]} />
                    </g>
                )
            }),
        )
    }
    const svg = (children: ReactNode, style: React.CSSProperties) => (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', ...style }} aria-hidden>
            {children}
        </svg>
    )
    const panes = (
        <>
            {lancets.map((l, i) => (
                <g key={i}>
                    <path d={openingPath(l)} fill="rgba(201,130,26,0.16)" />
                    {band(l, i)}
                    {medallions(l, i)}
                </g>
            ))}
            {rose && (
                <g>
                    {Array.from({ length: 12 }, (_, i) => {
                        const a0 = (i / 12) * Math.PI * 2 - Math.PI / 2
                        const a1 = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2
                        const r0 = 44
                        const r1 = ROSE.r
                        const p = (r: number, a: number) => `${ROSE.cx + Math.cos(a) * r} ${ROSE.cy + Math.sin(a) * r}`
                        return (
                            <path
                                key={i}
                                d={`M ${p(r0, a0)} L ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`}
                                fill={i % 2 === 0 ? GOTH.RUBY : GOTH.SAPPHIRE}
                                opacity={0.9}
                            />
                        )
                    })}
                    <circle cx={ROSE.cx} cy={ROSE.cy} r={44} fill={GOTH.AMBER} />
                </g>
            )}
        </>
    )
    return (
        <>
            {/* Colour by MULTIPLY: glass only shows colour where light comes through
                it, so a dark sky leaves it dark and the flash sets it ablaze. */}
            {svg(panes, { zIndex: 2, mixBlendMode: 'multiply', opacity: 0.8 })}
            {/* And a faint SCREEN glow so the glass is never entirely dead, which
                rises hard with the lightning. */}
            {svg(panes, { zIndex: 2, mixBlendMode: 'screen', opacity: 'calc(0.17 + var(--goth-flash, 0) * 0.5)' as unknown as number })}
            {/* Lead lines across the plain quarries. */}
            {svg(
                <>
                    <defs>
                        <pattern id="goth-quarry" patternUnits="userSpaceOnUse" width="44" height="76">
                            <path d="M 0 0 L 22 38 L 0 76 M 44 0 L 22 38 L 44 76" stroke="#060508" strokeWidth="2.4" fill="none" />
                        </pattern>
                    </defs>
                    {lancets.map((l, i) => <path key={i} d={openingPath(l)} fill="url(#goth-quarry)" opacity="0.8" />)}
                    {lancets.map((l, i) => {
                        const { cx, spring } = lancetGeom(l)
                        const half = (l.x1 - l.x0) / 2
                        const r = half * 0.17
                        return [cx - half / 2, cx + half / 2].flatMap((x, a) =>
                            [spring + (l.sill - spring) * 0.42, spring + (l.sill - spring) * 0.76].map((y, b) => (
                                <g key={`${i}${a}${b}`} fill="none" stroke="#060508" strokeWidth="3.2">
                                    {[0, 90, 180, 270].map((deg) => (
                                        <circle key={deg} cx={x + Math.cos((deg * Math.PI) / 180) * r} cy={y + Math.sin((deg * Math.PI) / 180) * r} r={r} />
                                    ))}
                                    <circle cx={x} cy={y} r={r * 0.7} />
                                </g>
                            )),
                        )
                    })}
                </>,
                { zIndex: 2 },
            )}
        </>
    )
}

// ── Light ────────────────────────────────────────────────────────────────────

function Light({ lancets, rose }: { lancets: Lancet[]; rose: boolean }) {
    const motes = useMemo(
        () =>
            Array.from({ length: 22 }, (_, i) => ({
                x: 38 + Math.random() * 24,
                y: 30 + Math.random() * 62,
                s: 1.4 + Math.random() * 2.4,
                d: 14 + Math.random() * 22,
                delay: -Math.random() * 30,
                o: 0.25 + Math.random() * 0.5,
                k: i,
            })),
        [],
    )
    return (
        <>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 4, mixBlendMode: 'screen', pointerEvents: 'none' }} aria-hidden>
                <defs>
                    <linearGradient id="goth-moonshaft" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(175,195,234,0.13)" />
                        <stop offset="60%" stopColor="rgba(175,195,234,0.045)" />
                        <stop offset="100%" stopColor="rgba(175,195,234,0)" />
                    </linearGradient>
                    <linearGradient id="goth-flashshaft" x1="0" y1="0" x2="0.4" y2="1">
                        <stop offset="0%" stopColor="rgba(205,215,255,0.5)" />
                        <stop offset="100%" stopColor="rgba(205,215,255,0)" />
                    </linearGradient>
                </defs>
                {rose && (
                    <path
                        d={`M ${ROSE.cx - 120} ${ROSE.cy + 90} L ${ROSE.cx + 120} ${ROSE.cy + 90} L ${ROSE.cx + 470} ${H + 40} L ${ROSE.cx - 470} ${H + 40} Z`}
                        fill="url(#goth-moonshaft)"
                        style={{ opacity: 'calc(1 + var(--goth-flash, 0) * 2)' as unknown as number }}
                    />
                )}
                {/* The lightning throws each window's light across the floor. */}
                <g style={{ opacity: 'var(--goth-flash, 0)' as unknown as number }}>
                    {lancets.map((l, i) => {
                        const toward = l.x0 < W / 2 ? 1 : -1
                        const { spring } = lancetGeom(l)
                        const throwX = 520 * toward
                        return (
                            <path
                                key={i}
                                d={`M ${l.x0} ${spring} L ${l.x1} ${spring} L ${l.x1 + throwX} ${H + 60} L ${l.x0 + throwX} ${H + 60} Z`}
                                fill="url(#goth-flashshaft)"
                            />
                        )
                    })}
                    <rect x={-3000} y={-3000} width={8000} height={8000} fill="rgba(150,165,220,0.09)" />
                </g>
            </svg>
            {rose && (
                <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
                    {motes.map((m) => (
                        <span
                            key={m.k}
                            className="goth-mote"
                            style={{
                                left: `${m.x}%`, top: `${m.y}%`, width: m.s, height: m.s, opacity: m.o,
                                animationDuration: `${m.d}s`, animationDelay: `${m.delay}s`,
                            }}
                        />
                    ))}
                </div>
            )}
        </>
    )
}

// ── Fog ──────────────────────────────────────────────────────────────────────

export function GothicFog({ zIndex = 6, strength = 1 }: { zIndex?: number; strength?: number }) {
    return (
        <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '34%', zIndex, pointerEvents: 'none', overflow: 'hidden', opacity: strength }}>
            <div className="goth-fog goth-fog--a" />
            <div className="goth-fog goth-fog--b" />
            <div className="goth-fog goth-fog--c" />
        </div>
    )
}

// ── The chapel ───────────────────────────────────────────────────────────────

export type ChapelVariant = 'idle' | 'upnext'

export interface GothicChapelProps {
    variant: ChapelVariant
    /** A music video plays behind: drop the storm and the wall to a scrim so the
     *  clip shows, keeping candles and the watchers as the frame. */
    showVideo?: boolean
    eyesTarget?: string
    children?: ReactNode
}

export function GothicChapel({ variant, showVideo = false, eyesTarget, children }: GothicChapelProps) {
    const lancets = variant === 'idle' ? LANCETS_IDLE : LANCETS_UPNEXT
    const rose = variant === 'idle'
    useEffect(() => retainStormBridge(), [])

    // Keep the scene mounted while it fades out, then drop it.
    const [sceneMounted, setSceneMounted] = useState(!showVideo)
    useEffect(() => {
        if (!showVideo) {
            setSceneMounted(true)
            return
        }
        const t = window.setTimeout(() => setSceneMounted(false), 900)
        return () => window.clearTimeout(t)
    }, [showVideo])

    const eyes: EyeAnchor[] = useMemo(
        () =>
            variant === 'idle'
                ? [
                      { x: 31, y: 16, scale: 0.8 },
                      { x: 69, y: 18, scale: 0.75 },
                      { x: 4.5, y: 70, scale: 0.7 },
                      { x: 95.5, y: 74, scale: 0.7 },
                      { x: 33, y: 62, scale: 0.95 },
                      { x: 67, y: 58, scale: 0.9 },
                  ]
                : [
                      { x: 27, y: 14, scale: 0.8 },
                      { x: 73, y: 16, scale: 0.8 },
                      { x: 4, y: 64, scale: 0.7 },
                      { x: 96, y: 68, scale: 0.7 },
                      { x: 30, y: 80, scale: 0.9 },
                      { x: 70, y: 78, scale: 0.85 },
                  ],
        [variant],
    )

    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', isolation: 'isolate' }}>
            {/* The chapel itself (storm, glazing, wall, light). When a music video
                comes on it FADES away to a scrim rather than cutting, and once it
                has gone the storm is unmounted so it isn't rendering under a
                video. */}
            {sceneMounted ? (
                <div className="goth-scene-in" style={{ position: 'absolute', inset: 0, opacity: showVideo ? 0 : 1, transition: 'opacity 0.85s ease' }}>
                    <div style={{ position: 'absolute', inset: 0, background: GOTH.VOID }} />
                    <GothicStorm moon={rose ? MOON_ROSE : MOON_HIGH} />
                    {/* The design box: full height, 16:9, centred, free to overflow
                        sideways. Centred with calc, NOT a transform: a transform would
                        make it a stacking context, and the glazing could then only blend
                        with what is inside the box. It has to multiply against the storm. */}
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(50% - 88.89vh)', width: '177.78vh' }}>
                        <Watcher lancets={lancets} />
                        <Glazing lancets={lancets} rose={rose} />
                        <Wall lancets={lancets} rose={rose} />
                        <Light lancets={lancets} rose={rose} />
                    </div>
                </div>
            ) : null}
            <div
                aria-hidden
                style={{
                    position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
                    opacity: showVideo ? 1 : 0, transition: 'opacity 0.85s ease',
                    background: 'radial-gradient(ellipse 60% 70% at 50% 46%, rgba(7,6,10,0.42) 0%, rgba(7,6,10,0.72) 70%, rgba(7,6,10,0.9) 100%)',
                }}
            />
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(50% - 88.89vh)', width: '177.78vh' }}>
                <GothicEyes anchors={eyes} maxOpen={2} target={eyesTarget} size={84} zIndex={5} />
                <GothicFog />
                {/* Foreground candles: a cluster on the floor at each side, and a pair
                    of tall pricket candles flanking the centre. */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none' }}>
                    <GothicCandleCluster seed={0.21} scale={1.05} style={{ left: '2%', bottom: -14 }} />
                    <GothicCandleCluster seed={0.63} scale={1.0} flip style={{ right: '2%', bottom: -14 }} waxes={['ivory', 'black', 'ivory', 'blood', 'ivory']} />
                    {variant === 'idle' && (
                        <>
                            <Pricket side="left" />
                            <Pricket side="right" />
                        </>
                    )}
                </div>
                <div style={{ position: 'absolute', inset: 0, zIndex: 7 }}>{children}</div>
            </div>
        </div>
    )
}

/** A tall altar candle on a wrought-iron pricket stand. */
function Pricket({ side }: { side: 'left' | 'right' }) {
    return (
        <div style={{ position: 'absolute', bottom: 0, [side]: '30.5%', display: 'flex', flexDirection: 'column', alignItems: 'center' } as React.CSSProperties}>
            <GothicCandle height={150} width={30} wax="ivory" seed={side === 'left' ? 0.48 : 0.77} glow={1.4} />
            <svg width="90" height="250" viewBox="0 0 90 250" style={{ display: 'block', marginTop: -2 }}>
                <defs>
                    <linearGradient id={`goth-pr-${side}`} x1="0" x2="1">
                        <stop offset="0%" stopColor="#0B0A0E" />
                        <stop offset="45%" stopColor="#4A4552" />
                        <stop offset="100%" stopColor="#0B0A0E" />
                    </linearGradient>
                </defs>
                {/* drip pan */}
                <path d="M 10 6 Q 45 20 80 6 L 74 14 Q 45 26 16 14 Z" fill={`url(#goth-pr-${side})`} stroke="#060508" />
                <path d="M 16 10 Q 45 17 74 10" stroke="rgba(227,176,75,0.55)" strokeWidth="1.5" fill="none" />
                {/* shaft with knops */}
                <rect x="41" y="18" width="8" height="220" fill={`url(#goth-pr-${side})`} />
                {[70, 140].map((y) => (
                    <ellipse key={y} cx="45" cy={y} rx="11" ry="6" fill={`url(#goth-pr-${side})`} stroke="#060508" />
                ))}
                {/* scrolled feet */}
                <path d="M 45 220 C 30 222 18 232 12 246 M 45 220 C 60 222 72 232 78 246" stroke="#2C2832" strokeWidth="5" fill="none" strokeLinecap="round" />
                <path d="M 45 220 C 30 222 18 232 12 246 M 45 220 C 60 222 72 232 78 246" stroke="rgba(227,176,75,0.3)" strokeWidth="1" fill="none" transform="translate(0 -2)" />
            </svg>
        </div>
    )
}
