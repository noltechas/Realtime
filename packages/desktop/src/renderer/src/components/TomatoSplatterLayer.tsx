import { useEffect, useRef } from 'react'

/**
 * TomatoSplatterLayer
 * -------------------
 * A full-screen <canvas> that lives on top of the stage. When a guest taps the
 * "tomato" reaction on the phone / companion site, that reaction arrives here
 * (content === TOMATO_EMOJI) and we launch a fully physical tomato-throw:
 *
 *   1. FLIGHT  — the tomato is lobbed in from below the screen along a real
 *                parabolic (quadratic-Bézier) arc, tumbling end over end with a
 *                fading motion-blur trail behind it. It grows as it nears the
 *                "glass" to sell the it's-coming-at-you depth.
 *   2. BURST   — on impact it stops dead, a thin shockwave ring snaps outward,
 *                an irregular splat stain pops in with an ease-out-back overshoot
 *                and a spray of juice droplets + pulp + seeds explodes outward
 *                under gravity.
 *   3. HOLD    — the stain sits at full opacity while a few drips ooze down the
 *                screen, lengthening with eased gravity and ending in a bulb.
 *   4. FADE    — the whole stain (drips included) dissolves away.
 *
 * Everything is drawn imperatively on one canvas in a single rAF loop. The loop
 * only runs while tomatoes are in flight / fading, then parks itself. Positions
 * are stored as 0..1 fractions of the canvas so the effect survives resizes.
 *
 * This is intentionally self-contained: it subscribes to window.electronAPI
 * .onReaction independently of the floating-bubble ReactionsOverlay (the IPC
 * channel supports multiple listeners). ReactionsOverlay skips the tomato so it
 * never double-renders as a plain floating emoji.
 */

export const TOMATO_EMOJI = '🍅'

// ---- tunables --------------------------------------------------------------
const FLIGHT_MIN = 620 // ms
const FLIGHT_VAR = 240
const BURST_MS = 170 // stain pops in over this window
const HOLD_MS = 1500 // stain sits at full opacity
const FADE_MS = 950 // stain dissolves over this window

// tomato + juice palette (vivid against the dark stage)
const SKIN_HOT = '#ff7b54'
const SKIN_MID = '#ec3a1c'
const SKIN_DEEP = '#9d1c0d'
const JUICE = ['#e23b1e', '#c8210f', '#d8311c', '#ff5b3a']
const SEED = '#f4e7a8'
const STAIN_RIM = '#6f1206'

// ---- geometry helpers ------------------------------------------------------
const TAU = Math.PI * 2
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeOutBack = (t: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

interface Vec { x: number; y: number }

// Smooth, stable, wobbly closed blob — vertices precomputed once so the shape
// doesn't shimmer frame to frame.
function makeBlob(baseR: number, points: number, irregularity: number): Vec[] {
    const verts: Vec[] = []
    for (let i = 0; i < points; i++) {
        const a = (i / points) * TAU
        const rr = baseR * (1 - irregularity + Math.random() * irregularity * 2)
        verts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr })
    }
    return verts
}

// Trace a closed Catmull-ish curve through the blob vertices using the
// midpoint-quadratic technique (control point = vertex, anchor = midpoint).
function traceBlob(ctx: CanvasRenderingContext2D, pts: Vec[]) {
    const n = pts.length
    ctx.beginPath()
    let mx = (pts[n - 1].x + pts[0].x) / 2
    let my = (pts[n - 1].y + pts[0].y) / 2
    ctx.moveTo(mx, my)
    for (let i = 0; i < n; i++) {
        const cur = pts[i]
        const nxt = pts[(i + 1) % n]
        const nmx = (cur.x + nxt.x) / 2
        const nmy = (cur.y + nxt.y) / 2
        ctx.quadraticCurveTo(cur.x, cur.y, nmx, nmy)
    }
    ctx.closePath()
}

// ---- data model ------------------------------------------------------------
interface Lobe {
    dx: number; dy: number // offset from impact center, as fraction of baseR
    verts: Vec[]
    rot: number
    squash: number // y-axis squash for a spread-out splatter look
    light: number // -1 darker .. +1 lighter color jitter
}
interface Speckle { dx: number; dy: number; r: number; light: number }
interface SeedDot { dx: number; dy: number; r: number; rot: number }
interface Drip {
    angle: number // start point around the lobe (radians, lower hemisphere)
    startR: number // start distance from center (fraction of baseR)
    w: number // width px
    maxLen: number // px
    delay: number // ms after burst before it starts running
    grow: number // ms to reach full length
}
interface Particle {
    x: number; y: number; vx: number; vy: number // px, px/s
    r: number; life: number; maxLife: number
    color: string; seed: boolean
}
interface Splat {
    baseR: number // px
    lobes: Lobe[]
    speckles: Speckle[]
    seeds: SeedDot[]
    drips: Drip[]
}
interface Tomato {
    // flight path as fractions of canvas (resize-robust)
    p0: Vec; p1: Vec; p2: Vec
    spin0: number; spinTurns: number
    rEnd: number // impact radius as fraction of canvas height
    flightDur: number
    born: number // performance.now() at spawn
    trail: Vec[] // recent px positions for the motion blur
    splat: Splat
    impactPx: Vec // resolved at impact, px
    particles: Particle[]
    burstAt: number // performance.now() at impact (0 until it lands)
}

// Build the stain geometry up front so it's deterministic for this throw.
function buildSplat(baseR: number): Splat {
    const lobes: Lobe[] = []
    // main body
    lobes.push({ dx: 0, dy: 0, verts: makeBlob(baseR, 11, 0.22), rot: rand(0, TAU), squash: rand(0.82, 1.12), light: 0 })
    // satellite splotches flung off the main hit — kept mostly outside the main
    // mass so they read as lumpy edges / detached splats rather than internal
    // bubbles
    const sat = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < sat; i++) {
        const a = rand(0, TAU)
        const dist = rand(0.85, 1.6)
        lobes.push({
            dx: Math.cos(a) * dist,
            dy: Math.sin(a) * dist,
            verts: makeBlob(baseR * rand(0.2, 0.46), 8, 0.34),
            rot: rand(0, TAU),
            squash: rand(0.6, 1.3),
            light: rand(-0.25, 0.2),
        })
    }
    // fine spray that stuck to the glass
    const speckles: Speckle[] = []
    const spcount = 10 + Math.floor(Math.random() * 12)
    for (let i = 0; i < spcount; i++) {
        const a = rand(0, TAU)
        const dist = rand(0.7, 2.3)
        speckles.push({ dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, r: rand(1.5, 5), light: rand(-0.2, 0.3) })
    }
    // embedded seeds
    const seeds: SeedDot[] = []
    const sd = 5 + Math.floor(Math.random() * 5)
    for (let i = 0; i < sd; i++) {
        const a = rand(0, TAU)
        const dist = rand(0, 0.7)
        seeds.push({ dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, r: rand(2, 4), rot: rand(0, TAU) })
    }
    // gravity drips from the lower edge
    const drips: Drip[] = []
    const dn = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < dn; i++) {
        drips.push({
            angle: rand(Math.PI * 0.18, Math.PI * 0.82), // lower hemisphere (y down)
            startR: rand(0.55, 0.95),
            w: rand(4, 9),
            maxLen: baseR * rand(0.7, 2.4),
            delay: rand(40, 260),
            grow: rand(650, 1150),
        })
    }
    return { baseR, lobes, speckles, seeds, drips }
}

function spawnTomato(now: number): Tomato {
    // launch from below the screen, target a visible spot, arc up and over
    const x0 = rand(0.08, 0.92)
    const tx = rand(0.16, 0.84)
    const ty = rand(0.18, 0.72)
    const p0: Vec = { x: x0, y: 1.22 }
    const p2: Vec = { x: tx, y: ty }
    // control point well above the target so it reads as a real lob
    const p1: Vec = { x: (x0 + tx) / 2 + rand(-0.16, 0.16), y: Math.min(ty, p0.y) - rand(0.45, 0.85) }
    const rEnd = rand(0.045, 0.06)
    return {
        p0, p1, p2,
        spin0: rand(0, TAU),
        spinTurns: rand(1.6, 3.2) * (Math.random() < 0.5 ? -1 : 1),
        rEnd,
        flightDur: FLIGHT_MIN + Math.random() * FLIGHT_VAR,
        born: now,
        trail: [],
        splat: buildSplat(1), // baseR rescaled to px at impact
        impactPx: { x: 0, y: 0 },
        particles: [],
        burstAt: 0,
    }
}

// quadratic Bézier
const qb = (a: number, b: number, c: number, t: number) => {
    const mt = 1 - t
    return mt * mt * a + 2 * mt * t * b + t * t * c
}

function colorJitter(base: string, light: number): string {
    // nudge a hex color lighter (+) / darker (-) cheaply via rgb scaling
    const n = parseInt(base.slice(1), 16)
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
    const f = 1 + light
    r = Math.max(0, Math.min(255, Math.round(r * f)))
    g = Math.max(0, Math.min(255, Math.round(g * f)))
    b = Math.max(0, Math.min(255, Math.round(b * f)))
    return `rgb(${r},${g},${b})`
}

export default function TomatoSplatterLayer() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const tomatoesRef = useRef<Tomato[]>([])
    const rafRef = useRef<number | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let dpr = Math.min(window.devicePixelRatio || 1, 2)
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.floor(canvas.clientWidth * dpr)
            canvas.height = Math.floor(canvas.clientHeight * dpr)
        }
        resize()
        window.addEventListener('resize', resize)

        const drawTomatoBody = (cx: number, cy: number, r: number, rot: number) => {
            ctx.save()
            ctx.translate(cx, cy)
            ctx.rotate(rot)
            ctx.scale(1, 0.94) // tomatoes sit slightly wider than tall
            // soft contact shadow under the fruit
            ctx.beginPath()
            ctx.arc(0, 0, r, 0, TAU)
            const g = ctx.createRadialGradient(-r * 0.32, -r * 0.34, r * 0.12, 0, 0, r)
            g.addColorStop(0, SKIN_HOT)
            g.addColorStop(0.5, SKIN_MID)
            g.addColorStop(1, SKIN_DEEP)
            ctx.fillStyle = g
            ctx.shadowColor = 'rgba(0,0,0,0.45)'
            ctx.shadowBlur = r * 0.4
            ctx.shadowOffsetY = r * 0.18
            ctx.fill()
            ctx.shadowColor = 'transparent'
            // glossy highlight
            ctx.beginPath()
            ctx.ellipse(-r * 0.3, -r * 0.36, r * 0.28, r * 0.16, -0.6, 0, TAU)
            ctx.fillStyle = 'rgba(255,228,210,0.55)'
            ctx.fill()
            // green calyx / star on top
            ctx.fillStyle = '#3f8a2e'
            const leaves = 5
            const topY = -r * 0.84
            for (let i = 0; i < leaves; i++) {
                const a = (i / leaves) * TAU - Math.PI / 2 + rot * 0.0
                ctx.save()
                ctx.translate(0, topY)
                ctx.rotate(a)
                ctx.beginPath()
                ctx.moveTo(0, 0)
                ctx.quadraticCurveTo(r * 0.1, -r * 0.06, r * 0.04, -r * 0.34)
                ctx.quadraticCurveTo(-r * 0.05, -r * 0.06, 0, 0)
                ctx.fill()
                ctx.restore()
            }
            ctx.beginPath()
            ctx.arc(0, topY, r * 0.09, 0, TAU)
            ctx.fillStyle = '#2f6b22'
            ctx.fill()
            ctx.restore()
        }

        const drawStain = (t: Tomato, age: number) => {
            const s = t.splat
            const cx = t.impactPx.x
            const cy = t.impactPx.y
            // overall opacity envelope: pop-in handled by scale; fade at the end
            let alpha = 0.92
            const fadeStart = BURST_MS + HOLD_MS
            if (age > fadeStart) alpha = 0.92 * (1 - (age - fadeStart) / FADE_MS)
            if (alpha <= 0) return
            // grow factor for the pop-in (overshoot)
            const grow = age >= BURST_MS ? 1 : easeOutBack(age / BURST_MS)

            ctx.save()
            ctx.globalAlpha = alpha

            // shockwave ring at the very start of the burst
            if (age < 280) {
                const rp = easeOutCubic(age / 280)
                ctx.beginPath()
                ctx.arc(cx, cy, s.baseR * (0.4 + rp * 1.9), 0, TAU)
                ctx.strokeStyle = `rgba(255,150,120,${0.5 * (1 - rp)})`
                ctx.lineWidth = s.baseR * 0.12 * (1 - rp) + 1
                ctx.stroke()
            }

            // drips run first so the lobes overlap their tops cleanly
            for (const d of s.drips) {
                const dt = age - BURST_MS - d.delay
                if (dt <= 0) continue
                const len = d.maxLen * easeOutCubic(Math.min(1, dt / d.grow))
                const ox = cx + Math.cos(d.angle) * s.baseR * d.startR
                const oy = cy + Math.sin(d.angle) * s.baseR * d.startR
                const halfTop = d.w / 2
                const halfBot = d.w * 0.32
                ctx.beginPath()
                ctx.moveTo(ox - halfTop, oy)
                ctx.lineTo(ox - halfBot, oy + len)
                ctx.lineTo(ox + halfBot, oy + len)
                ctx.lineTo(ox + halfTop, oy)
                ctx.closePath()
                ctx.fillStyle = STAIN_RIM
                ctx.fill()
                // bulb head
                ctx.beginPath()
                ctx.arc(ox, oy + len, d.w * 0.62, 0, TAU)
                ctx.fillStyle = colorJitter(SKIN_MID, -0.2)
                ctx.fill()
            }

            // satellite + main lobes — dark rim then body then sheen
            s.lobes.forEach((lobe, li) => {
                const lx = cx + lobe.dx * s.baseR * grow
                const ly = cy + lobe.dy * s.baseR * grow
                ctx.save()
                ctx.translate(lx, ly)
                ctx.rotate(lobe.rot)
                ctx.scale(grow, grow * lobe.squash)
                // dark rim (slightly larger underlay). The main mass casts a soft
                // shadow so the stain reads as wet-on-glass with real depth.
                ctx.save()
                if (li === 0) {
                    ctx.shadowColor = 'rgba(0,0,0,0.5)'
                    ctx.shadowBlur = s.baseR * 0.32
                    ctx.shadowOffsetY = s.baseR * 0.1
                }
                ctx.scale(1.08, 1.08)
                traceBlob(ctx, lobe.verts)
                ctx.fillStyle = STAIN_RIM
                ctx.fill()
                ctx.restore()
                // body
                traceBlob(ctx, lobe.verts)
                ctx.fillStyle = colorJitter('#cf2a16', lobe.light)
                ctx.fill()
                ctx.restore()
            })

            // wet sheen + seeds on the main body (no grow scaling so they read crisp)
            if (grow > 0.6) {
                ctx.save()
                ctx.translate(cx, cy)
                // sheen
                ctx.beginPath()
                ctx.ellipse(-s.baseR * 0.2, -s.baseR * 0.22, s.baseR * 0.34, s.baseR * 0.2, -0.5, 0, TAU)
                ctx.fillStyle = 'rgba(255,150,125,0.28)'
                ctx.fill()
                // seeds
                for (const sd of s.seeds) {
                    ctx.save()
                    ctx.translate(sd.dx * s.baseR, sd.dy * s.baseR)
                    ctx.rotate(sd.rot)
                    ctx.beginPath()
                    ctx.ellipse(0, 0, sd.r, sd.r * 0.62, 0, 0, TAU)
                    ctx.fillStyle = SEED
                    ctx.fill()
                    ctx.restore()
                }
                ctx.restore()
            }

            // stuck spray speckles
            for (const sp of s.speckles) {
                ctx.beginPath()
                ctx.arc(cx + sp.dx * s.baseR, cy + sp.dy * s.baseR, sp.r * grow, 0, TAU)
                ctx.fillStyle = colorJitter('#cf2a16', sp.light)
                ctx.fill()
            }

            ctx.restore()
        }

        const drawParticles = (t: Tomato, dt: number) => {
            for (const p of t.particles) {
                if (p.life <= 0) continue
                p.life -= dt
                p.vy += 1500 * dt // gravity
                p.vx *= 0.99
                p.x += p.vx * dt
                p.y += p.vy * dt
                const lifeT = Math.max(0, p.life / p.maxLife)
                const rr = p.r * (0.4 + 0.6 * lifeT)
                ctx.save()
                ctx.globalAlpha = Math.min(1, lifeT * 1.4)
                ctx.translate(p.x, p.y)
                if (p.seed) {
                    ctx.beginPath()
                    ctx.ellipse(0, 0, rr, rr * 0.6, Math.atan2(p.vy, p.vx), 0, TAU)
                    ctx.fillStyle = SEED
                    ctx.fill()
                } else {
                    // stretch droplet along its velocity for a thrown-juice streak
                    const ang = Math.atan2(p.vy, p.vx)
                    const speed = Math.hypot(p.vx, p.vy)
                    const stretch = 1 + Math.min(1.8, speed / 700)
                    ctx.rotate(ang)
                    ctx.beginPath()
                    ctx.ellipse(0, 0, rr * stretch, rr, 0, 0, TAU)
                    ctx.fillStyle = p.color
                    ctx.fill()
                }
                ctx.restore()
            }
        }

        let lastTs = 0
        const frame = (now: number) => {
            const W = canvas.clientWidth
            const H = canvas.clientHeight
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, W, H)

            const list = tomatoesRef.current
            const dt = lastTs ? Math.min(0.05, (now - lastTs) / 1000) : 0
            lastTs = now

            for (const t of list) {
                const age = now - t.born
                if (age < t.flightDur) {
                    // ---- FLIGHT ----
                    const u = age / t.flightDur
                    const x = qb(t.p0.x, t.p1.x, t.p2.x, u) * W
                    const y = qb(t.p0.y, t.p1.y, t.p2.y, u) * H
                    const r = (t.rEnd * H) * (0.5 + 0.5 * u) // grows toward impact
                    const rot = t.spin0 + t.spinTurns * TAU * u

                    // motion-blur trail
                    t.trail.push({ x, y })
                    if (t.trail.length > 7) t.trail.shift()
                    for (let i = 0; i < t.trail.length - 1; i++) {
                        const tp = t.trail[i]
                        const a = (i / t.trail.length) * 0.4
                        ctx.save()
                        ctx.globalAlpha = a
                        ctx.beginPath()
                        ctx.arc(tp.x, tp.y, r * (0.5 + 0.5 * (i / t.trail.length)), 0, TAU)
                        ctx.fillStyle = SKIN_MID
                        ctx.fill()
                        ctx.restore()
                    }
                    drawTomatoBody(x, y, r, rot)
                } else {
                    // ---- IMPACT / BURST / HOLD / FADE ----
                    if (t.burstAt === 0) {
                        // resolve impact px + scale the splat to px, spawn particles
                        t.impactPx = { x: t.p2.x * W, y: t.p2.y * H }
                        t.splat.baseR = t.rEnd * H * rand(1.35, 1.7)
                        t.burstAt = now
                        const count = 24 + Math.floor(Math.random() * 14)
                        for (let i = 0; i < count; i++) {
                            const a = rand(0, TAU)
                            const sp = rand(160, 640)
                            const seed = Math.random() < 0.16
                            t.particles.push({
                                x: t.impactPx.x,
                                y: t.impactPx.y,
                                vx: Math.cos(a) * sp,
                                vy: Math.sin(a) * sp - rand(40, 220), // bias upward off the splat
                                r: seed ? rand(2, 3.5) : rand(2.5, 7),
                                maxLife: rand(0.38, 0.85),
                                life: 0,
                                color: JUICE[Math.floor(Math.random() * JUICE.length)],
                                seed,
                            })
                        }
                        for (const p of t.particles) p.life = p.maxLife
                    }
                    const sage = now - t.burstAt
                    drawStain(t, sage)
                    drawParticles(t, dt)
                }
            }

            // reap finished tomatoes
            tomatoesRef.current = list.filter(t => {
                if (t.burstAt === 0) return true
                const sage = now - t.burstAt
                return sage < BURST_MS + HOLD_MS + FADE_MS
            })

            if (tomatoesRef.current.length > 0) {
                rafRef.current = requestAnimationFrame(frame)
            } else {
                rafRef.current = null
                lastTs = 0
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
                ctx.clearRect(0, 0, W, H)
            }
        }

        const ensureLoop = () => {
            if (rafRef.current == null) {
                lastTs = 0
                rafRef.current = requestAnimationFrame(frame)
            }
        }

        if (!window.electronAPI?.onReaction) {
            window.removeEventListener('resize', resize)
            return
        }
        const handler = window.electronAPI.onReaction((reaction: { content?: string }) => {
            if (!reaction || reaction.content !== TOMATO_EMOJI) return
            // cap concurrent throws so a spam of boos can't tank the framerate
            if (tomatoesRef.current.length >= 14) tomatoesRef.current.shift()
            tomatoesRef.current.push(spawnTomato(performance.now()))
            ensureLoop()
        })

        return () => {
            window.removeEventListener('resize', resize)
            window.electronAPI?.offReaction(handler)
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="k-tomato-layer"
            aria-hidden="true"
        />
    )
}
