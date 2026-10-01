// Candles, the only warm light in the building.
//
// A candle is drawn wax (a lit cylinder with seeded drips running down from a
// melted pool) and a flame built from four soft layers: a blue root, a gold
// body, a white core and a wide halo that lights the stone around it.
//
// The flicker is NOT a CSS keyframe loop. A looping animation reads as a
// pulse after the second cycle; real flame is noisy. One shared rAF (reference
// counted, so it only runs while candles are on screen) drives every candle
// with its own phase: three incommensurate sines plus a random gutter now and
// then, written into custom properties on the candle's element.
//
// The room's voice feeds it too (storm.ts sampleVoice): when somebody belts,
// every flame on the stage stretches, leans and dances, as if the note were a
// breath across the altar.

import { useEffect, useMemo, useRef } from 'react'
import { sampleVoice } from './storm'

interface Flame {
    el: HTMLElement
    phase: number
    speed: number
    gutter: number
    gutterUntil: number
}

const flames = new Set<Flame>()
let raf = 0

function loop() {
    const now = performance.now()
    const t = now / 1000
    const voice = sampleVoice(now)
    flames.forEach((f) => {
        const p = f.phase
        const s = f.speed
        let fl =
            0.82 +
            0.1 * Math.sin(t * 7.1 * s + p) +
            0.06 * Math.sin(t * 13.7 * s + p * 2.3) +
            0.05 * Math.sin(t * 2.3 * s + p * 4.1)
        // A gutter: the flame ducks for a moment, the way a draught catches it.
        if (now > f.gutterUntil && Math.random() < 0.0035) {
            f.gutterUntil = now + 160 + Math.random() * 260
            f.gutter = 0.55 + Math.random() * 0.25
        }
        if (now < f.gutterUntil) fl *= f.gutter
        const sway = 1.6 * Math.sin(t * 1.9 * s + p * 1.7) + 1.1 * Math.sin(t * 5.3 * s + p) + voice * 9 * Math.sin(t * 9.5 + p)
        const lift = 1 + voice * 0.85
        f.el.style.setProperty('--fl', fl.toFixed(3))
        f.el.style.setProperty('--sway', `${sway.toFixed(2)}deg`)
        f.el.style.setProperty('--lift', lift.toFixed(3))
    })
    raf = flames.size > 0 ? requestAnimationFrame(loop) : 0
}

function register(f: Flame): () => void {
    flames.add(f)
    if (!raf) raf = requestAnimationFrame(loop)
    return () => {
        flames.delete(f)
        if (flames.size === 0 && raf) {
            cancelAnimationFrame(raf)
            raf = 0
        }
    }
}

// Seeded PRNG so a candle's drips are the same on every render.
function rng(seed: number): () => number {
    let s = Math.floor(seed * 2147483646) % 2147483647
    if (s <= 0) s += 2147483646
    return () => {
        s = (s * 16807) % 2147483647
        return s / 2147483647
    }
}

const WAX: Record<'ivory' | 'blood' | 'black', { lit: string; mid: string; shade: string; drip: string }> = {
    ivory: { lit: '#F3E9D2', mid: '#D9CBAA', shade: '#7E6F57', drip: '#EBDDBE' },
    blood: { lit: '#C83A4B', mid: '#8E1426', shade: '#3C0710', drip: '#A51E31' },
    black: { lit: '#4A4452', mid: '#24202A', shade: '#09080B', drip: '#2E2935' },
}

export interface GothicCandleProps {
    /** Wax height in px (the flame adds about width × 1.6 above it). */
    height: number
    width: number
    wax?: keyof typeof WAX
    lit?: boolean
    seed?: number
    /** Multiplies the halo's reach (1 = a candle's worth of light). */
    glow?: number
    style?: React.CSSProperties
}

export function GothicCandle({ height, width, wax = 'ivory', lit = true, seed = 0.31, glow = 1, style }: GothicCandleProps) {
    const ref = useRef<HTMLDivElement>(null)
    const W = WAX[wax]

    useEffect(() => {
        if (!lit || !ref.current) return
        const r = rng(seed + 0.17)
        return register({ el: ref.current, phase: r() * 20, speed: 0.85 + r() * 0.3, gutter: 1, gutterUntil: 0 })
    }, [lit, seed])

    // Drips: a few runs down from the rim, each a rounded tongue of wax.
    const drips = useMemo(() => {
        const r = rng(seed)
        const n = 2 + Math.floor(r() * 3)
        const out: string[] = []
        for (let i = 0; i < n; i++) {
            const x = 8 + r() * 84
            const w = 4 + r() * 6
            const len = 10 + r() * Math.min(70, ((height / width) * 100) * 0.45)
            const bulb = w * 0.65
            out.push(
                `M ${x - w / 2} 8 L ${x - w / 2} ${8 + len - bulb} Q ${x - w / 2} ${8 + len + bulb * 0.6} ${x} ${8 + len + bulb * 0.4} Q ${x + w / 2} ${8 + len + bulb * 0.6} ${x + w / 2} ${8 + len - bulb} L ${x + w / 2} 8 Z`,
            )
        }
        return out
    }, [seed, height])

    // The rim isn't level: a melted candle burns down unevenly.
    const rim = useMemo(() => {
        const r = rng(seed + 0.5)
        const a = 4 + r() * 5
        const b = 4 + r() * 5
        return `M 0 ${a} Q 25 ${a - 3 - r() * 3} 50 7 Q 75 ${b - 3 - r() * 3} 100 ${b}`
    }, [seed])

    const flameH = width * 1.75
    const vbH = Math.max(40, (height / width) * 100)
    const id = useMemo(() => `gc${Math.floor(seed * 1e6)}${wax}`, [seed, wax])

    return (
        <div
            ref={ref}
            aria-hidden
            style={{
                position: 'relative',
                width,
                height: height + flameH,
                ['--fl' as string]: '0.85',
                ['--sway' as string]: '0deg',
                ['--lift' as string]: '1',
                ...style,
            }}
        >
            {lit && (
                <>
                    {/* Halo: the light the candle throws on the room. */}
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: flameH * 0.55,
                            width: width * 9 * glow,
                            height: width * 9 * glow,
                            transform: 'translate(-50%, -50%) scale(calc(0.86 + var(--fl) * 0.18))',
                            opacity: 'calc(0.45 + var(--fl) * 0.45)' as unknown as number,
                            background:
                                'radial-gradient(circle, rgba(255,196,96,0.34) 0%, rgba(227,150,60,0.16) 26%, rgba(200,110,40,0.05) 52%, transparent 70%)',
                            pointerEvents: 'none',
                            mixBlendMode: 'screen',
                        }}
                    />
                    {/* The flame, pivoting on the wick. */}
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            bottom: height - 4,
                            width: width * 0.62,
                            height: flameH,
                            marginLeft: -(width * 0.62) / 2,
                            transformOrigin: '50% 100%',
                            transform: 'rotate(var(--sway)) scale(calc(0.9 + var(--fl) * 0.14), calc(var(--fl) * var(--lift)))',
                        }}
                    >
                        <svg viewBox="0 0 40 100" width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
                            <defs>
                                <radialGradient id={`${id}-body`} cx="50%" cy="72%" r="62%">
                                    <stop offset="0%" stopColor="#FFF6DE" />
                                    <stop offset="30%" stopColor="#FFD77A" />
                                    <stop offset="62%" stopColor="#F29A2E" />
                                    <stop offset="88%" stopColor="#C2501A" stopOpacity="0.55" />
                                    <stop offset="100%" stopColor="#8A2A0C" stopOpacity="0" />
                                </radialGradient>
                                <radialGradient id={`${id}-root`} cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#7FA6FF" stopOpacity="0.9" />
                                    <stop offset="100%" stopColor="#2A3FA0" stopOpacity="0" />
                                </radialGradient>
                            </defs>
                            {/* outer body */}
                            <path d="M20 2 C 27 22 38 44 36 66 C 34.5 84 27 98 20 98 C 13 98 5.5 84 4 66 C 2 44 13 22 20 2 Z" fill={`url(#${id}-body)`} />
                            {/* white core */}
                            <path d="M20 36 C 24 50 28 62 27 74 C 26 86 23 93 20 93 C 17 93 14 86 13 74 C 12 62 16 50 20 36 Z" fill="#FFF8E8" opacity="0.85" />
                            {/* blue root at the wick */}
                            <ellipse cx="20" cy="93" rx="9" ry="6" fill={`url(#${id}-root)`} />
                        </svg>
                    </div>
                </>
            )}

            {/* Wax */}
            <svg
                viewBox={`0 0 100 ${vbH}`}
                width={width}
                height={height}
                preserveAspectRatio="none"
                style={{ position: 'absolute', left: 0, bottom: 0, display: 'block', overflow: 'visible' }}
            >
                <defs>
                    <linearGradient id={`${id}-cyl`} x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor={W.shade} />
                        <stop offset="22%" stopColor={W.mid} />
                        <stop offset="40%" stopColor={W.lit} />
                        <stop offset="64%" stopColor={W.mid} />
                        <stop offset="100%" stopColor={W.shade} />
                    </linearGradient>
                    <linearGradient id={`${id}-warm`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#FFB45A" stopOpacity={lit ? 0.5 : 0} />
                        <stop offset="35%" stopColor="#FFB45A" stopOpacity={lit ? 0.12 : 0} />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
                    </linearGradient>
                    <radialGradient id={`${id}-pool`} cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor={lit ? '#FFE7AE' : W.mid} />
                        <stop offset="100%" stopColor={W.mid} />
                    </radialGradient>
                </defs>
                <rect x="0" y="7" width="100" height={vbH - 7} fill={`url(#${id}-cyl)`} />
                {drips.map((d, i) => (
                    <path key={i} d={d} fill={W.drip} opacity="0.9" />
                ))}
                <rect x="0" y="7" width="100" height={vbH - 7} fill={`url(#${id}-warm)`} />
                <path d={`${rim} L 100 14 Q 50 20 0 14 Z`} fill={`url(#${id}-pool)`} />
                {/* wick */}
                <path d="M50 9 Q 51.5 3 49.5 -2" stroke="#1A120C" strokeWidth="3.2" fill="none" strokeLinecap="round" />
            </svg>
        </div>
    )
}

/** A cluster of candles on a ledge, burned down to different heights. */
export function GothicCandleCluster({
    scale = 1,
    seed = 0.4,
    flip = false,
    waxes = ['ivory', 'ivory', 'blood', 'ivory', 'black'],
    style,
}: {
    scale?: number
    seed?: number
    flip?: boolean
    waxes?: Array<keyof typeof WAX>
    style?: React.CSSProperties
}) {
    const r = useMemo(() => rng(seed), [seed])
    const items = useMemo(
        () =>
            waxes.map((w, i) => ({
                wax: w,
                h: (70 + r() * 150) * scale,
                w: (24 + r() * 20) * scale,
                dx: i * 30 * scale + r() * 10,
                seed: seed + i * 0.113,
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [seed, scale, waxes.join(',')],
    )
    return (
        <div aria-hidden style={{ position: 'absolute', display: 'flex', alignItems: 'flex-end', gap: 8 * scale, flexDirection: flip ? 'row-reverse' : 'row', ...style }}>
            {items.map((c, i) => (
                <GothicCandle key={i} height={c.h} width={c.w} wax={c.wax} seed={c.seed} glow={0.9} />
            ))}
        </div>
    )
}
