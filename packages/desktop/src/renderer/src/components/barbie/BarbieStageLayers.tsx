// The layers that ride along while a song plays on the Barbie stage.
//
//   BarbieLineCloud   the active lyric line is written on a painted cloud, with
//                     the sun peeking over it (each line, from a different
//                     spot). The sun's glow is the room's voice: it blooms as
//                     people sing louder. Injected as the line's first child so
//                     it paints under the words.
//   BarbieAtmosphere  the frame around the performance: a bank of painted
//                     clouds drifting along the bottom of the screen, a few
//                     twinkles at the edges, and the glitter that bursts out
//                     on a belted note.
//
// Everything here YIELDS to the lyrics: nothing moves in the middle of the
// screen except the line itself.

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BARB } from '../../styles/barbie'
import { GlitterBurst, PaintedCloud, TwinkleField, rng, useSunshine, useSvgId } from './BarbieParts'
import { useSetScale } from './BarbieSky'

/** The painted cloud behind the active line. `seed` picks where the sun peeks.
 *
 *  One SVG silhouette, laid out from the line's measured box: a flat-bottomed
 *  body, a run of puffs along its top, a big crown puff beside the sun (it
 *  peeks out from behind it) and a smaller one across from it, and a soft
 *  shoulder at each end. Every puff is placed so it stays inside the box, and
 *  the whole union is clipped once and painted in layers the way the bank
 *  clouds are (PaintedCloud): a warm rim where the sun lights the tops, a pink
 *  shade crescent under each puff, a lit white body, one deeper stroke along
 *  the flat underside. One shape, one fill: no seams, shelves or cut puffs. */
export function BarbieLineCloud({ seed }: { seed: number }) {
    const sunX = useMemo(() => {
        const r = rng(seed * 0.618 + 0.11)
        // off-centre, alternately left and right, never dead middle
        const side = Math.floor(seed) % 2 === 0 ? 1 : -1
        return 50 + side * (16 + r() * 22)
    }, [seed])
    const ref = useRef<HTMLSpanElement>(null)
    const [box, setBox] = useState<{ w: number; h: number; fs: number } | null>(null)
    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        // offsetWidth/Height: layout size, untouched by the entry animation's scale
        const measure = () => {
            const w = el.offsetWidth
            const h = el.offsetHeight
            const fs = parseFloat(getComputedStyle(el).fontSize) || 60
            setBox((b) => (b && Math.abs(b.w - w) < 0.5 && Math.abs(b.h - h) < 0.5 && b.fs === fs ? b : { w, h, fs }))
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    return (
        <span ref={ref} className="barb-cloud" aria-hidden style={{ ['--barb-sun-x' as string]: `${sunX}%` } as React.CSSProperties}>
            <span className="barb-cloud__sun" style={{ left: `${sunX}%` }} />
            {box && box.w > 0 ? <CloudShape w={box.w} h={box.h} fs={box.fs} sunX={sunX / 100} seed={seed} /> : null}
        </span>
    )
}

interface Puff {
    cx: number
    cy: number
    r: number
}

function cloudLayout(w: number, h: number, fs: number, sunX: number, seed: number) {
    const r = rng(seed * 0.37 + 0.53)
    const top = 0.5 * fs // the body's top edge; puffs rise above it
    const bodyH = h - top
    const clampX = (x: number, rad: number) => Math.min(w - rad, Math.max(rad, x))
    const puffs: Puff[] = []
    // soft shoulders, so the cloud never ends in a pill's flat cap
    const endR = Math.min(0.82 * fs, bodyH * 0.5)
    puffs.push({ cx: endR, cy: top + bodyH * 0.42, r: endR })
    puffs.push({ cx: w - endR, cy: top + bodyH * 0.44, r: endR * 0.94 })
    // the run along the top: neighbours always overlap, sizes never repeat
    // (big and small alternate, so the top reads as billows, not a scallop)
    let x = endR * 1.4
    let big = r() < 0.5
    while (x < w - endR * 1.4) {
        const rad = fs * (big ? 0.82 + r() * 0.26 : 0.5 + r() * 0.18)
        puffs.push({ cx: clampX(x, rad), cy: top + rad * (big ? 0.2 : 0.34), r: rad })
        x += rad * (big ? 1.05 : 1.2) + r() * 0.2 * fs
        big = !big
    }
    // the crowns: one beside the sun (it peeks out from behind its shoulder),
    // one across the cloud from it
    // (each rises at most ~1em above the body, inside the line's top margin)
    const crownR = Math.min(1.18 * fs, bodyH * 1.05)
    puffs.push({ cx: clampX(sunX * w + 1.15 * fs, crownR), cy: top + 0.24 * fs, r: crownR })
    const otherR = crownR * 0.86
    puffs.push({ cx: clampX((1 - sunX) * w, otherR), cy: top + 0.24 * fs, r: otherR })
    return { top, bodyH, puffs }
}

function CloudShape({ w, h, fs, sunX, seed }: { w: number; h: number; fs: number; sunX: number; seed: number }) {
    const id = useSvgId('blinecloud')
    const { top, bodyH, puffs } = useMemo(() => cloudLayout(w, h, fs, sunX, seed), [w, h, fs, sunX, seed])
    const rx = Math.min(0.9 * fs, bodyH / 2)
    const inset = 0.28 * fs // the pink underside showing below the lit body
    return (
        <svg className="barb-cloud__shape" width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }} aria-hidden>
            <defs>
                <clipPath id={`${id}-shape`}>
                    {puffs.map((p, i) => (
                        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} />
                    ))}
                    <rect x={0} y={top} width={w} height={bodyH} rx={rx} />
                </clipPath>
                <radialGradient id={`${id}-sun`} gradientUnits="userSpaceOnUse" cx={sunX * w} cy={top} r={3.2 * fs} gradientTransform={`translate(${sunX * w} ${top}) scale(1 0.55) translate(${-sunX * w} ${-top})`}>
                    <stop offset="0" stopColor="#FFF1A8" stopOpacity="0.8" />
                    <stop offset="1" stopColor="#FFF1A8" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`${id}-glint`} x1="0" x2="1" y1="0" y2="0.3">
                    <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                    <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.85" />
                    <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
            </defs>
            <g clipPath={`url(#${id}-shape)`}>
                {/* 1. the warm rim the sun lights along the tops */}
                <rect x={-fs} y={-3 * fs} width={w + 2 * fs} height={h + 4 * fs} fill="#FFF0B0" />
                {/* 2. the shade side: every puff and the body, a touch lower */}
                {puffs.map((p, i) => (
                    <circle key={i} cx={p.cx} cy={p.cy + p.r * 0.07} r={p.r} fill={BARB.CLOUD_SHADE} />
                ))}
                <rect x={0} y={top + 0.06 * fs} width={w} height={bodyH} rx={rx} fill={BARB.CLOUD_SHADE} />
                {/* 3. the lit body, laid up and toward the sun */}
                {puffs.map((p, i) => (
                    <circle key={i} cx={p.cx - p.r * 0.08} cy={p.cy - p.r * 0.1} r={p.r * 0.87} fill={BARB.CLOUD} />
                ))}
                <rect x={0.22 * fs} y={top} width={w - 0.44 * fs} height={bodyH - inset} rx={Math.max(4, rx - 0.22 * fs)} fill={BARB.CLOUD} />
                {/* 4. the sun warming the tops beside it */}
                <rect x={0} y={-2 * fs} width={w} height={h + 2 * fs} fill={`url(#${id}-sun)`} />
                {/* 5. one deeper stroke of paint along the flat underside */}
                <rect x={0} y={h - 0.12 * fs} width={w} height={0.12 * fs} fill={BARB.CLOUD_DEEP} opacity="0.55" />
                {/* the sunshine glint sweeping across (the shared --barb-glint clock) */}
                <rect
                    x={-0.3 * w}
                    y={-2 * fs}
                    width={0.3 * w}
                    height={h + 3 * fs}
                    fill={`url(#${id}-glint)`}
                    style={{ transform: `translateX(calc(var(--barb-glint, 0) * ${(1.6 * w).toFixed(1)}px))` }}
                />
            </g>
        </svg>
    )
}

interface BankCloud {
    left: number
    width: number
    seed: number
    lift: number
    tone: 'day' | 'blush'
    flip: boolean
}

function bank(seed: number, n: number, tone: 'day' | 'blush'): BankCloud[] {
    const r = rng(seed)
    return Array.from({ length: n }, (_, i) => ({
        left: (i / n) * 100 - 6 + r() * 4,
        width: 250 + r() * 170,
        seed: r(),
        lift: r() * 18,
        tone,
        flip: r() < 0.5,
    }))
}

export function BarbieAtmosphere({ video }: { video: boolean }) {
    useSunshine()
    const { s } = useSetScale()
    const back = useMemo(() => bank(0.37, 9, 'blush'), [])
    const front = useMemo(() => bank(0.81, 8, 'day'), [])
    // The bank stays below the lyric ladder: only the tops of the clouds show.
    // Over a music video it sits lower still, so it frames rather than covers.
    const drop = (video ? 150 : 120) * s
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}>
            <div className="barb-bank barb-bank--back" style={{ position: 'absolute', left: '-8%', right: '-8%', bottom: -drop, height: 260 * s }}>
                {back.map((c, i) => (
                    <PaintedCloud key={i} width={c.width * s} seed={c.seed} tone={c.tone} flip={c.flip} style={{ position: 'absolute', left: `${c.left}%`, bottom: c.lift * s }} />
                ))}
            </div>
            <div className="barb-bank barb-bank--front" style={{ position: 'absolute', left: '-8%', right: '-8%', bottom: -drop - 46 * s, height: 260 * s }}>
                {front.map((c, i) => (
                    <PaintedCloud key={i} width={c.width * 1.1 * s} seed={c.seed} tone={c.tone} flip={c.flip} style={{ position: 'absolute', left: `${c.left + 5}%`, bottom: c.lift * s }} />
                ))}
            </div>
            <TwinkleField seed={0.47} count={6} box={{ x: 1, y: 30, w: 8, h: 50 }} size={[16, 30]} colors={['#FFFFFF', BARB.SUN_HI]} />
            <TwinkleField seed={0.93} count={6} box={{ x: 91, y: 30, w: 8, h: 50 }} size={[16, 30]} colors={['#FFFFFF', BARB.CANDY]} />
            <GlitterBurst x={50} y={46} spread={1.6} />
        </div>
    )
}
