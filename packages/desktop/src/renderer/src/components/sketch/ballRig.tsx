// The bouncing ball's rig: one ball, its onion skins, and the arc and
// spacing chart an animator draws for each hop, all positioned in viewport
// pixels and driven imperatively (one rAF loop writes transforms, React never
// re-renders per frame).
//
// A hop is a true parabola in time: the ball keeps a constant speed across
// and falls under gravity, so the spacing ticks bunch up at the top of the
// arc, the way they do on a real spacing chart. It squashes on contact, holds
// a beat, stretches along its path in flight, and lands.
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { SK } from '../../styles/sketch'
import { ART } from './parts'
import { ballSprite, GRAIN } from './PencilParts'

export interface Hop {
    /** contact points (the bottom of the ball), viewport px */
    fx: number
    fy: number
    tx: number
    ty: number
    /** leaves `from` at `depart`, lands on `to` at `land` (ms) */
    depart: number
    land: number
    /** when it last landed on `from` (for the squash) */
    landedFrom: number
}

export interface RigFrame {
    now: number
    hop: Hop | null
    /** drawn diameter, px */
    d: number
    color: string
    visible: boolean
}

export interface RigHandle {
    draw: (f: RigFrame) => void
}

const GHOSTS = 3
const TICKS = 8

/** Squash on contact: 1 = round. Hits hard, springs back past round, settles. */
function squashAfter(t: number): number {
    if (t < 0 || t > 260) return 1
    return 1 - 0.3 * Math.exp(-t / 62) * Math.cos((t * Math.PI) / 125)
}

function hopHeight(h: Hop, d: number): number {
    const dx = Math.abs(h.tx - h.fx)
    const flight = h.land - h.depart
    // a lively hop, but never up into the line above
    const H = Math.min(1.1 * d, Math.max(0.6 * d, 0.3 * dx + 0.4 * d))
    return H * Math.min(1.12, Math.max(0.55, flight / 360))
}

function along(h: Hop, H: number, u: number): [number, number] {
    return [h.fx + (h.tx - h.fx) * u, h.fy + (h.ty - h.fy) * u - 4 * H * u * (1 - u)]
}

export const BallRig = forwardRef<RigHandle, { z?: number }>(function BallRig({ z = 14 }, ref) {
    const root = useRef<HTMLDivElement>(null)
    const ball = useRef<HTMLDivElement>(null)
    const tone = useRef<HTMLSpanElement>(null)
    const ghosts = useRef<Array<HTMLSpanElement | null>>([])
    const arc = useRef<SVGPathElement>(null)
    const ticks = useRef<SVGPathElement>(null)
    const svg = useRef<SVGSVGElement>(null)
    const lastSize = useRef(0)
    const cur = useRef<Hop | null>(null)
    const prev = useRef<Hop | null>(null)

    useImperativeHandle(ref, () => ({
        draw({ now, hop, d, color, visible }: RigFrame) {
            const el = ball.current
            if (!el || !root.current) return
            root.current.style.opacity = visible && hop ? '1' : '0'
            if (!hop || !visible) return
            if (!cur.current || cur.current.land !== hop.land || cur.current.tx !== hop.tx) {
                if (cur.current && cur.current.land !== hop.land) prev.current = cur.current
                cur.current = hop
            }
            const S = ballSprite(d)
            if (Math.abs(S - lastSize.current) > 0.5) {
                lastSize.current = S
                el.style.width = el.style.height = `${S}px`
                ghosts.current.forEach(g => {
                    if (g) g.style.width = g.style.height = `${S}px`
                })
            }
            if (tone.current) tone.current.style.background = color
            const r = d / 2
            const H = hopHeight(hop, d)
            const flight = Math.max(1, hop.land - hop.depart)
            let x: number, y: number, q = 1, s = 1, th = 0
            let u = -1
            if (now < hop.depart) {
                // resting on `from`: the squash of landing, then a crouch before take-off
                x = hop.fx
                y = hop.fy
                q = squashAfter(now - hop.landedFrom)
                const toGo = hop.depart - now
                if (toGo < 90) q *= 1 - 0.1 * Math.sin((1 - toGo / 90) * Math.PI)
            } else if (now < hop.land) {
                u = (now - hop.depart) / flight
                ;[x, y] = along(hop, H, u)
                const vx = hop.tx - hop.fx
                const vy = hop.ty - hop.fy - 4 * H * (1 - 2 * u)
                th = Math.atan2(vy, vx)
                s = 1 + 0.2 * Math.min(1, Math.abs(vy) / (4 * H + 1))
            } else {
                x = hop.tx
                y = hop.ty
                q = squashAfter(now - hop.land)
            }
            const cy = y - r * q
            const deg = (th * 180) / Math.PI
            el.style.transform =
                `translate(${x - S / 2}px, ${cy - S / 2}px) ` +
                (u >= 0 ? `rotate(${deg}deg) scale(${s}, ${1 / s}) rotate(${-deg}deg)` : `scale(${1 / q}, ${q})`)

            // The arc to draw: this hop's (pencilled in just before it, there
            // while it flies), or the last one, being rubbed out after landing.
            const alphaOf = (h: Hop) =>
                now < h.depart ? Math.max(0, 1 - (h.depart - now) / 320) : now < h.land ? 1 : Math.max(0, 1 - (now - h.land) / 380)
            const p = prev.current
            const aCur = alphaOf(hop)
            const aPrev = p && Number.isFinite(p.land) ? alphaOf(p) : 0
            const src = aPrev > aCur && p ? p : hop
            const a = Math.max(aCur, aPrev)
            const Hs = src === hop ? H : hopHeight(src, d)

            // onion skins: where it was a moment ago on this arc
            const since = now - src.land
            ghosts.current.forEach((g, k) => {
                if (!g) return
                let gu = -1
                let fade = 1
                if (src === hop && u >= 0) gu = u - 0.15 * (k + 1)
                else if (since >= 0 && since < 320) {
                    gu = 1 - 0.15 * (k + 1)
                    fade = 1 - since / 320
                }
                if (gu < 0.02) {
                    g.style.opacity = '0'
                    return
                }
                const [gx, gy] = along(src, Hs, gu)
                g.style.opacity = String((0.62 - k * 0.16) * fade)
                g.style.transform = `translate(${gx - S / 2}px, ${gy - r - S / 2}px)`
            })

            if (svg.current) svg.current.style.opacity = String(a * 0.62)
            if (a > 0 && arc.current && ticks.current) {
                const top = (k: number): [number, number] => {
                    const [px, py] = along(src, Hs, k)
                    return [px, py - r]
                }
                let dPath = ''
                for (let i = 0; i <= 24; i++) {
                    const [px, py] = top(i / 24)
                    dPath += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1)
                }
                arc.current.setAttribute('d', dPath)
                let tPath = ''
                const L = Math.max(6, d * 0.2)
                for (let k = 1; k < TICKS; k++) {
                    const uu = k / TICKS
                    const [px, py] = top(uu)
                    const vx = src.tx - src.fx
                    const vy = src.ty - src.fy - 4 * Hs * (1 - 2 * uu)
                    const n = Math.hypot(vx, vy) || 1
                    const nx = -vy / n
                    const ny = vx / n
                    tPath += `M${(px - nx * L).toFixed(1)} ${(py - ny * L).toFixed(1)}L${(px + nx * L).toFixed(1)} ${(py + ny * L).toFixed(1)}`
                }
                ticks.current.setAttribute('d', tPath)
            }
        },
    }))

    return (
        <div ref={root} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: z, pointerEvents: 'none', opacity: 0, transition: 'opacity 0.3s' }}>
            <svg ref={svg} width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible', ...GRAIN }}>
                <path ref={arc} d="" fill="none" stroke={SK.BLUE} strokeWidth={2.2} strokeLinecap="round" />
                <path ref={ticks} d="" fill="none" stroke={SK.BLUE} strokeWidth={2} strokeLinecap="round" />
            </svg>
            {Array.from({ length: GHOSTS }, (_, k) => (
                <span
                    key={k}
                    ref={e => {
                        ghosts.current[k] = e
                    }}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        opacity: 0,
                        background: SK.BLUE,
                        WebkitMaskImage: `url(${ART.ballGhost})`,
                        WebkitMaskSize: '100% 100%',
                        willChange: 'transform, opacity',
                    }}
                />
            ))}
            <div ref={ball} style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '50% 50%', willChange: 'transform' }}>
                <img src={ART.ball} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                <span
                    ref={tone}
                    style={{ position: 'absolute', inset: 0, background: SK.RED, WebkitMaskImage: `url(${ART.ballTone})`, WebkitMaskSize: '100% 100%', mixBlendMode: 'multiply' }}
                />
            </div>
        </div>
    )
})

// ── Scheduling hops over a list of targets ───────────────────────────────────

export interface Target {
    x: number
    y: number
    /** when the ball should land here (ms) */
    t: number
}

/** The hop in progress at `now` over a list of timed landing spots. */
export function hopAt(targets: Target[], now: number): Hop | null {
    if (targets.length === 0) return null
    let k = -1
    for (let i = 0; i < targets.length; i++) {
        if (targets[i].t <= now) k = i
        else break
    }
    if (k < 0) {
        const a = targets[0]
        return { fx: a.x, fy: a.y, tx: a.x, ty: a.y, depart: Infinity, land: Infinity, landedFrom: -Infinity }
    }
    const a = targets[k]
    const b = targets[k + 1]
    if (!b) return { fx: a.x, fy: a.y, tx: a.x, ty: a.y, depart: Infinity, land: Infinity, landedFrom: a.t }
    const gap = b.t - a.t
    // never leaves before it has landed: a quick syllable gets a quick hop
    const flight = Math.min(gap, Math.min(540, Math.max(170, gap * 0.8)))
    return { fx: a.x, fy: a.y, tx: b.x, ty: b.y, depart: b.t - flight, land: b.t, landedFrom: a.t }
}
