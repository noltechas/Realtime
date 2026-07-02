import { useEffect, useRef } from 'react'

/**
 * TomatoSplatterLayer
 * -------------------
 * A full-screen <canvas> that lives on top of the stage. When a guest taps the
 * "tomato" reaction on the phone / companion site, that reaction arrives here
 * (content === TOMATO_EMOJI) and we launch a fully physical tomato-throw:
 *
 *   1. FLIGHT — the tomato is lobbed in from below the screen along a real
 *               parabolic (quadratic-Bézier) arc, tumbling end over end with a
 *               ghosted motion-blur trail. The fruit itself is pre-rendered once
 *               into an offscreen sprite (gradient skin, rib creases, curled
 *               calyx, dual specular highlights, rim bounce-light) and blitted
 *               each frame, growing as it nears the "glass".
 *   2. SQUASH — on contact the body flattens against the screen for a few
 *               frames before letting go — the classic impact frame.
 *   3. BURST  — an impact flash + thin shockwave ring, and the stain pops in
 *               with an ease-out-back overshoot. The stain is a pre-rendered
 *               sprite: watery juice halo, directional tendrils ending in
 *               thrown droplets, dark-rimmed pulp mass, chunky flesh, embedded
 *               seeds and a wet sheen. A burst of juice streaks, tumbling pulp
 *               chunks, seeds and a fine mist flies out under gravity.
 *   4. HOLD   — the stain sits while gravity drips ooze down the glass,
 *               swaying slightly and ending in a glossy bulb.
 *   5. FADE   — the whole stain (drips included) dissolves away.
 *
 * Everything is drawn imperatively on one canvas in a single rAF loop. The loop
 * only runs while tomatoes are in flight / fading, then parks itself. Flight
 * positions are stored as 0..1 fractions of the canvas so throws survive
 * resizes; stains are resolved to px at impact.
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
const SQUASH_MS = 70 // impact flatten before the burst
const BURST_MS = 170 // stain pops in over this window
const HOLD_MS = 1800 // stain sits at full opacity
const FADE_MS = 950 // stain dissolves over this window

// palette — ripe tomato + juice (vivid against the dark stage)
const SKIN_HOT = '#ff7040'
const SKIN_MID = '#e8290c'
const SKIN_DEEP = '#8f130a'
const SKIN_EDGE = '#6d0e05'
const STAIN_RIM = '#5e0f04'
const STAIN_DARK = '#a81a09'
const STAIN_MID = '#c02411'
const STAIN_HOT = '#d93516'
const JUICE = ['#e0300f', '#c8210f', '#d8311c', '#ff5b3a']
const PULP = ['#c23a17', '#a51e0b', '#d0492b']
const SEED = '#f2e3a0'

// ---- geometry helpers ------------------------------------------------------
const TAU = Math.PI * 2
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
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
    const mx = (pts[n - 1].x + pts[0].x) / 2
    const my = (pts[n - 1].y + pts[0].y) / 2
    ctx.moveTo(mx, my)
    for (let i = 0; i < n; i++) {
        const cur = pts[i]
        const nxt = pts[(i + 1) % n]
        ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + nxt.x) / 2, (cur.y + nxt.y) / 2)
    }
    ctx.closePath()
}

// quadratic Bézier
const qb = (a: number, b: number, c: number, t: number) => {
    const mt = 1 - t
    return mt * mt * a + 2 * mt * t * b + t * t * c
}

// ---- data model ------------------------------------------------------------
interface Drip {
    ox: number // start x offset from impact centre (× baseR)
    oy: number // start y offset (× baseR, positive = below centre)
    w: number // width px
    maxLen: number // px
    delay: number // ms after burst before it starts running
    grow: number // ms to reach full length
    swayAmp: number // px of lateral wander as it runs
    swayFreq: number
}
type ParticleKind = 'juice' | 'seed' | 'pulp'
interface Particle {
    x: number; y: number; vx: number; vy: number // px, px/s
    r: number; life: number; maxLife: number
    color: string
    kind: ParticleKind
    rot: number; rotVel: number
    verts: Vec[] | null // pulp chunk outline
}
interface Tomato {
    // flight path as fractions of canvas (resize-robust)
    p0: Vec; p1: Vec; p2: Vec
    spin0: number; spinTurns: number
    rEnd: number // impact radius as fraction of canvas height
    flightDur: number
    born: number // performance.now() at spawn
    trail: Vec[] // recent px positions for the ghost trail
    ripeness: number // subtle per-fruit skin variation
    body: HTMLCanvasElement | null // pre-rendered fruit sprite
    stain: HTMLCanvasElement | null // pre-rendered splat sprite (built at impact)
    stainHalf: number // css-px half-extent of the stain sprite when drawn
    baseR: number // stain body radius px (resolved at impact)
    drips: Drip[]
    impactPx: Vec // resolved at impact, px
    particles: Particle[]
    burstAt: number // performance.now() at burst (0 until it lands)
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
    return {
        p0, p1, p2,
        spin0: rand(0, TAU),
        spinTurns: rand(1.6, 3.2) * (Math.random() < 0.5 ? -1 : 1),
        rEnd: rand(0.045, 0.06),
        flightDur: FLIGHT_MIN + Math.random() * FLIGHT_VAR,
        born: now,
        trail: [],
        ripeness: rand(-0.08, 0.08),
        body: null,
        stain: null,
        stainHalf: 0,
        baseR: 0,
        drips: [],
        impactPx: { x: 0, y: 0 },
        particles: [],
        burstAt: 0,
    }
}

function shiftColor(base: string, f: number): string {
    const n = parseInt(base.slice(1), 16)
    const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * (1 + f))))
    const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * (1 + f))))
    const b = Math.max(0, Math.min(255, Math.round((n & 255) * (1 + f))))
    return `rgb(${r},${g},${b})`
}

// ---- fruit sprite -----------------------------------------------------------
// Drawn in "r-units" (fruit radius = 1) centred on the origin. The box must
// contain the calyx curl: [-1.6, 1.6]².
const BODY_EXT = 1.6

function buildBodySprite(t: Tomato, rMaxPx: number, dpr: number): void {
    const k = Math.max(20, Math.min(140, rMaxPx * dpr * 1.25)) // px per r-unit
    const cv = document.createElement('canvas')
    cv.width = cv.height = Math.ceil(BODY_EXT * 2 * k)
    const c = cv.getContext('2d')
    if (!c) return
    c.scale(k, k)
    c.translate(BODY_EXT, BODY_EXT)
    c.lineJoin = 'round'
    c.lineCap = 'round'
    const f = t.ripeness

    // body — slightly oblate, gently lobed silhouette like a real beefsteak
    c.save()
    c.scale(1, 0.92)
    c.beginPath()
    const lobes = 6
    for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * TAU
        const rr = 1 + 0.022 * Math.cos(a * lobes + 0.7)
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr
        if (i === 0) c.moveTo(px, py)
        else c.lineTo(px, py)
    }
    c.closePath()
    const g = c.createRadialGradient(-0.38, -0.42, 0.08, 0, 0.05, 1.18)
    g.addColorStop(0, shiftColor(SKIN_HOT, f))
    g.addColorStop(0.42, shiftColor(SKIN_MID, f))
    g.addColorStop(0.8, shiftColor(SKIN_DEEP, f))
    g.addColorStop(1, shiftColor(SKIN_EDGE, f))
    c.fillStyle = g
    c.fill()

    // faint rib creases sweeping down from the shoulder
    c.strokeStyle = 'rgba(70,8,4,0.16)'
    c.lineWidth = 0.045
    for (const rx of [-0.55, -0.2, 0.18, 0.55]) {
        c.beginPath()
        c.moveTo(rx * 0.45, -0.82)
        c.quadraticCurveTo(rx * 1.25, -0.1, rx * 0.85, 0.78)
        c.stroke()
    }
    // bounce light along the lower-right limb so the sphere reads round
    c.beginPath()
    c.arc(0, 0, 0.93, TAU * 0.02, TAU * 0.24)
    c.strokeStyle = 'rgba(255,130,80,0.35)'
    c.lineWidth = 0.09
    c.stroke()
    c.restore()

    // shading pooled under the calyx
    const sg = c.createRadialGradient(0, -0.72, 0, 0, -0.72, 0.5)
    sg.addColorStop(0, 'rgba(60,10,4,0.35)')
    sg.addColorStop(1, 'rgba(60,10,4,0)')
    c.beginPath()
    c.arc(0, -0.72, 0.5, 0, TAU)
    c.fillStyle = sg
    c.fill()

    // calyx — five curled sepals + a cut stem stub
    const topY = -0.78
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2 + 0.3
        c.save()
        c.translate(0, topY)
        c.rotate(a)
        c.beginPath()
        c.moveTo(0, 0)
        c.bezierCurveTo(0.13, -0.1, 0.2, -0.3, 0.05, -0.48) // out
        c.bezierCurveTo(0.12, -0.32, -0.05, -0.12, -0.04, 0) // curl back
        c.closePath()
        const lg = c.createLinearGradient(0, 0, 0.05, -0.48)
        lg.addColorStop(0, '#2e6b22')
        lg.addColorStop(1, '#59a13e')
        c.fillStyle = lg
        c.fill()
        c.beginPath()
        c.moveTo(0.01, -0.04)
        c.quadraticCurveTo(0.1, -0.22, 0.04, -0.42)
        c.strokeStyle = 'rgba(20,50,12,0.5)'
        c.lineWidth = 0.02
        c.stroke()
        c.restore()
    }
    c.beginPath()
    c.arc(0, topY - 0.02, 0.08, 0, TAU)
    c.fillStyle = '#4a7a2f'
    c.fill()
    c.beginPath()
    c.arc(-0.015, topY - 0.035, 0.035, 0, TAU)
    c.fillStyle = '#79a854'
    c.fill()

    // dual speculars — one broad soft sheen, one hot glint
    c.beginPath()
    c.ellipse(-0.34, -0.38, 0.3, 0.17, -0.6, 0, TAU)
    c.fillStyle = 'rgba(255,225,205,0.4)'
    c.fill()
    c.beginPath()
    c.ellipse(-0.45, -0.3, 0.07, 0.045, -0.5, 0, TAU)
    c.fillStyle = 'rgba(255,255,255,0.85)'
    c.fill()

    t.body = cv
}

// ---- stain sprite -----------------------------------------------------------
// Built once at impact: everything static about the splat (halo, tendrils,
// pulp mass, chunks, seeds, sheen, spray) baked into one canvas. Drips animate
// live on top.

function drawTendril(c: CanvasRenderingContext2D, ang: number, inner: number, len: number, w: number, bow: number, color: string) {
    const cos = Math.cos(ang), sin = Math.sin(ang)
    const px = -sin, py = cos // perpendicular
    const bx = cos * inner, by = sin * inner
    const tx = cos * (inner + len), ty = sin * (inner + len)
    const mx = cos * (inner + len * 0.5) + px * bow
    const my = sin * (inner + len * 0.5) + py * bow
    c.beginPath()
    c.moveTo(bx + px * w, by + py * w)
    c.quadraticCurveTo(mx + px * w * 0.35, my + py * w * 0.35, tx, ty)
    c.quadraticCurveTo(mx - px * w * 0.35, my - py * w * 0.35, bx - px * w, by - py * w)
    c.closePath()
    c.fillStyle = color
    c.fill()
}

function buildStainSprite(t: Tomato, dpr: number): void {
    const R = t.baseR
    const half = R * 3.1
    const k = Math.min(dpr, 2)
    const cv = document.createElement('canvas')
    cv.width = cv.height = Math.ceil(half * 2 * k)
    const c = cv.getContext('2d')
    if (!c) return
    c.scale(k, k)
    c.translate(half, half)
    c.lineJoin = 'round'

    // 1 — watery juice halo, the thin film that spreads past the pulp
    const halo = makeBlob(R * 1.5, 15, 0.3)
    traceBlob(c, halo)
    const hg = c.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 1.75)
    hg.addColorStop(0, 'rgba(168,22,6,0.3)')
    hg.addColorStop(1, 'rgba(168,22,6,0.04)')
    c.fillStyle = hg
    c.fill()

    // 2 — directional tendrils: tapered spikes flung outward, longest few get
    //     detached droplets past the tip (the classic splat silhouette). They
    //     start well inside the mass so their bases merge with the pulp.
    const tendrils = 11 + Math.floor(Math.random() * 5)
    const baseAng = rand(0, TAU)
    for (let i = 0; i < tendrils; i++) {
        const ang = baseAng + (i / tendrils) * TAU + rand(-0.24, 0.24)
        const len = R * rand(0.55, 2.0)
        const w = R * rand(0.09, 0.2)
        const bow = R * rand(-0.2, 0.2)
        drawTendril(c, ang, R * 0.35, len + R * 0.15, w, bow, i % 3 === 0 ? STAIN_RIM : STAIN_DARK)
        if (len > R * 1.1) {
            const dropD = R * 0.5 + len + R * rand(0.12, 0.3)
            const dr = w * rand(0.7, 1.1)
            c.beginPath()
            c.ellipse(Math.cos(ang) * dropD, Math.sin(ang) * dropD, dr * 1.25, dr, ang, 0, TAU)
            c.fillStyle = STAIN_DARK
            c.fill()
            if (Math.random() < 0.5) {
                const d2 = dropD + R * rand(0.18, 0.34)
                c.beginPath()
                c.arc(Math.cos(ang) * d2, Math.sin(ang) * d2, dr * 0.45, 0, TAU)
                c.fillStyle = STAIN_MID
                c.fill()
            }
        }
    }

    // 3 — main pulp mass: an independently-jittered dark underlay (so the rim
    //     width varies organically instead of tracing a uniform outline), then
    //     the wet body on top
    const rim = makeBlob(R * 1.08, 14, 0.3)
    const body = makeBlob(R, 14, 0.32)
    c.save()
    c.shadowColor = 'rgba(0,0,0,0.4)'
    c.shadowBlur = R * 0.28
    c.shadowOffsetY = R * 0.08
    traceBlob(c, rim)
    c.fillStyle = STAIN_RIM
    c.fill()
    c.restore()
    traceBlob(c, body)
    const bg = c.createRadialGradient(-R * 0.1, -R * 0.1, 0, 0, 0, R * 1.1)
    bg.addColorStop(0, STAIN_HOT)
    bg.addColorStop(0.55, STAIN_MID)
    bg.addColorStop(1, STAIN_DARK)
    c.fillStyle = bg
    c.fill()

    // small satellite splats with their own rims
    const sats = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < sats; i++) {
        const a = rand(0, TAU)
        const d = R * rand(1.15, 1.8)
        const sr = R * rand(0.14, 0.32)
        const blob = makeBlob(sr, 8, 0.32)
        c.save()
        c.translate(Math.cos(a) * d, Math.sin(a) * d)
        c.rotate(rand(0, TAU))
        c.scale(rand(0.7, 1.25), rand(0.7, 1.25))
        c.save()
        c.scale(1.12, 1.12)
        traceBlob(c, blob)
        c.fillStyle = STAIN_RIM
        c.fill()
        c.restore()
        traceBlob(c, blob)
        c.fillStyle = shiftColor(STAIN_MID, rand(-0.15, 0.1))
        c.fill()
        c.restore()
    }

    // 4 — chunky flesh: irregular pulp pieces inside the main mass
    const chunks = 6 + Math.floor(Math.random() * 5)
    for (let i = 0; i < chunks; i++) {
        const a = rand(0, TAU)
        const d = R * rand(0, 0.72)
        const cr = R * rand(0.08, 0.2)
        c.save()
        c.translate(Math.cos(a) * d, Math.sin(a) * d)
        c.rotate(rand(0, TAU))
        c.beginPath()
        const n = 4 + Math.floor(Math.random() * 2)
        for (let v = 0; v < n; v++) {
            const va = (v / n) * TAU
            const vr = cr * rand(0.6, 1.3)
            if (v === 0) c.moveTo(Math.cos(va) * vr, Math.sin(va) * vr)
            else c.lineTo(Math.cos(va) * vr, Math.sin(va) * vr)
        }
        c.closePath()
        c.fillStyle = pick(PULP)
        c.fill()
        c.strokeStyle = 'rgba(70,8,4,0.35)'
        c.lineWidth = Math.max(0.5, cr * 0.12)
        c.stroke()
        c.restore()
    }

    // 5 — embedded seeds, each with a glint
    const seeds = 5 + Math.floor(Math.random() * 5)
    for (let i = 0; i < seeds; i++) {
        const a = rand(0, TAU)
        const d = R * rand(0.05, 0.8)
        const sr = Math.max(1.6, R * rand(0.035, 0.055))
        const rot = rand(0, TAU)
        c.save()
        c.translate(Math.cos(a) * d, Math.sin(a) * d)
        c.rotate(rot)
        c.beginPath()
        c.ellipse(0, 0, sr, sr * 0.62, 0, 0, TAU)
        c.fillStyle = SEED
        c.fill()
        c.strokeStyle = 'rgba(120,90,30,0.5)'
        c.lineWidth = 0.6
        c.stroke()
        c.beginPath()
        c.arc(-sr * 0.25, -sr * 0.15, sr * 0.18, 0, TAU)
        c.fillStyle = 'rgba(255,255,255,0.7)'
        c.fill()
        c.restore()
    }

    // 6 — wet sheen streaks catching the stage light
    c.beginPath()
    c.ellipse(-R * 0.22, -R * 0.26, R * 0.36, R * 0.16, -0.5, 0, TAU)
    c.fillStyle = 'rgba(255,160,130,0.22)'
    c.fill()
    c.beginPath()
    c.ellipse(R * 0.15, R * 0.1, R * 0.2, R * 0.07, 0.4, 0, TAU)
    c.fillStyle = 'rgba(255,180,150,0.13)'
    c.fill()

    // 7 — fine spray stuck to the glass, radially streaked
    const spray = 16 + Math.floor(Math.random() * 12)
    for (let i = 0; i < spray; i++) {
        const a = rand(0, TAU)
        const d = R * rand(1.2, 2.8)
        const sr = rand(1, 3.6)
        c.save()
        c.translate(Math.cos(a) * d, Math.sin(a) * d)
        c.rotate(a)
        c.globalAlpha = rand(0.45, 0.9)
        c.beginPath()
        c.ellipse(0, 0, sr * rand(1, 2.2), sr, 0, 0, TAU)
        c.fillStyle = shiftColor(STAIN_MID, rand(-0.2, 0.25))
        c.fill()
        c.restore()
    }

    t.stain = cv
    t.stainHalf = half
}

function buildDrips(baseR: number): Drip[] {
    const drips: Drip[] = []
    const dn = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < dn; i++) {
        drips.push({
            ox: rand(-0.75, 0.75),
            oy: rand(0.5, 0.85),
            w: rand(4, 9),
            maxLen: baseR * rand(0.8, 2.8),
            delay: rand(40, 320),
            grow: rand(700, 1400),
            swayAmp: rand(1.5, 5),
            swayFreq: rand(0.8, 1.6),
        })
    }
    return drips
}

function spawnParticles(t: Tomato): void {
    const { x, y } = t.impactPx
    const out: Particle[] = []
    // juice streaks
    const juice = 26 + Math.floor(Math.random() * 12)
    for (let i = 0; i < juice; i++) {
        const a = rand(0, TAU)
        const sp = rand(180, 680)
        out.push({
            x, y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - rand(40, 220), // bias upward off the splat
            r: rand(2.2, 6.5),
            maxLife: rand(0.38, 0.85), life: 0,
            color: pick(JUICE),
            kind: 'juice', rot: 0, rotVel: 0, verts: null,
        })
    }
    // tumbling pulp chunks
    const pulp = 7 + Math.floor(Math.random() * 5)
    for (let i = 0; i < pulp; i++) {
        const a = rand(0, TAU)
        const sp = rand(120, 420)
        const cr = rand(3, 7)
        const n = 4 + Math.floor(Math.random() * 2)
        const verts: Vec[] = []
        for (let v = 0; v < n; v++) {
            const va = (v / n) * TAU
            const vr = cr * rand(0.6, 1.3)
            verts.push({ x: Math.cos(va) * vr, y: Math.sin(va) * vr })
        }
        out.push({
            x, y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - rand(60, 240),
            r: cr,
            maxLife: rand(0.5, 0.95), life: 0,
            color: pick(PULP),
            kind: 'pulp', rot: rand(0, TAU), rotVel: rand(-9, 9), verts,
        })
    }
    // seeds
    const seeds = 4 + Math.floor(Math.random() * 4)
    for (let i = 0; i < seeds; i++) {
        const a = rand(0, TAU)
        const sp = rand(200, 560)
        out.push({
            x, y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - rand(60, 200),
            r: rand(2, 3.5),
            maxLife: rand(0.45, 0.8), life: 0,
            color: SEED,
            kind: 'seed', rot: 0, rotVel: 0, verts: null,
        })
    }
    for (const p of out) p.life = p.maxLife
    t.particles = out
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
            for (const t of tomatoesRef.current) t.body = null // rebuilt at new res
        }
        resize()
        window.addEventListener('resize', resize)

        const drawBody = (t: Tomato, x: number, y: number, r: number, rot: number, sx: number, sy: number, alpha: number) => {
            if (!t.body) buildBodySprite(t, t.rEnd * canvas.clientHeight, dpr)
            if (!t.body) return
            ctx.save()
            ctx.globalAlpha = alpha
            ctx.translate(x, y)
            ctx.rotate(rot)
            ctx.scale(sx, sy)
            ctx.drawImage(t.body, -BODY_EXT * r, -BODY_EXT * r, BODY_EXT * 2 * r, BODY_EXT * 2 * r)
            ctx.restore()
        }

        const drawDrips = (t: Tomato, sage: number, alpha: number) => {
            const cx = t.impactPx.x, cy = t.impactPx.y
            for (const d of t.drips) {
                const dt = sage - BURST_MS - d.delay
                if (dt <= 0) continue
                const p = Math.min(1, dt / d.grow)
                const len = d.maxLen * easeOutCubic(p)
                const ox = cx + d.ox * t.baseR
                const oy = cy + d.oy * t.baseR
                const sway = Math.sin(dt / 1000 * d.swayFreq * TAU) * d.swayAmp * p
                const halfTop = d.w / 2
                const halfBot = d.w * 0.3
                ctx.save()
                ctx.globalAlpha = alpha
                // tapering wet track with a slight wander
                ctx.beginPath()
                ctx.moveTo(ox - halfTop, oy)
                ctx.quadraticCurveTo(ox - halfTop * 0.7 + sway * 0.5, oy + len * 0.55, ox + sway - halfBot, oy + len)
                ctx.lineTo(ox + sway + halfBot, oy + len)
                ctx.quadraticCurveTo(ox + halfTop * 0.7 + sway * 0.5, oy + len * 0.55, ox + halfTop, oy)
                ctx.closePath()
                const g = ctx.createLinearGradient(0, oy, 0, oy + len)
                g.addColorStop(0, STAIN_RIM)
                g.addColorStop(1, STAIN_MID)
                ctx.fillStyle = g
                ctx.fill()
                // glossy bulb head
                const bx = ox + sway, by = oy + len
                const br = d.w * 0.62
                ctx.beginPath()
                ctx.arc(bx, by, br, 0, TAU)
                const bgr = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.35, 0, bx, by, br)
                bgr.addColorStop(0, STAIN_HOT)
                bgr.addColorStop(1, STAIN_DARK)
                ctx.fillStyle = bgr
                ctx.fill()
                ctx.beginPath()
                ctx.arc(bx - br * 0.3, by - br * 0.35, br * 0.22, 0, TAU)
                ctx.fillStyle = 'rgba(255,220,200,0.75)'
                ctx.fill()
                ctx.restore()
            }
        }

        const drawStain = (t: Tomato, sage: number) => {
            if (!t.stain) return
            let alpha = 0.94
            const fadeStart = BURST_MS + HOLD_MS
            if (sage > fadeStart) alpha = 0.94 * (1 - (sage - fadeStart) / FADE_MS)
            if (alpha <= 0) return
            const cx = t.impactPx.x, cy = t.impactPx.y

            // impact flash + thin shockwave ring, right at the burst
            if (sage < 140) {
                const fp = sage / 140
                const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, t.baseR * 1.6)
                fg.addColorStop(0, `rgba(255,190,150,${0.4 * (1 - fp)})`)
                fg.addColorStop(1, 'rgba(255,190,150,0)')
                ctx.beginPath()
                ctx.arc(cx, cy, t.baseR * 1.6, 0, TAU)
                ctx.fillStyle = fg
                ctx.fill()
            }
            if (sage < 300) {
                const rp = easeOutCubic(sage / 300)
                ctx.beginPath()
                ctx.arc(cx, cy, t.baseR * (0.4 + rp * 2.1), 0, TAU)
                ctx.strokeStyle = `rgba(255,150,120,${0.4 * (1 - rp)})`
                ctx.lineWidth = t.baseR * 0.1 * (1 - rp) + 1
                ctx.stroke()
            }

            drawDrips(t, sage, alpha)

            // the baked stain pops in with an overshoot
            const grow = sage >= BURST_MS ? 1 : easeOutBack(sage / BURST_MS)
            ctx.save()
            ctx.globalAlpha = alpha
            ctx.translate(cx, cy)
            ctx.scale(grow, grow)
            ctx.drawImage(t.stain, -t.stainHalf, -t.stainHalf, t.stainHalf * 2, t.stainHalf * 2)
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
                p.rot += p.rotVel * dt
                const lifeT = Math.max(0, p.life / p.maxLife)
                const rr = p.r * (0.4 + 0.6 * lifeT)
                ctx.save()
                ctx.globalAlpha = Math.min(1, lifeT * 1.4)
                ctx.translate(p.x, p.y)
                if (p.kind === 'seed') {
                    ctx.beginPath()
                    ctx.ellipse(0, 0, rr, rr * 0.6, Math.atan2(p.vy, p.vx), 0, TAU)
                    ctx.fillStyle = SEED
                    ctx.fill()
                } else if (p.kind === 'pulp' && p.verts) {
                    ctx.rotate(p.rot)
                    ctx.beginPath()
                    ctx.moveTo(p.verts[0].x, p.verts[0].y)
                    for (let i = 1; i < p.verts.length; i++) ctx.lineTo(p.verts[i].x, p.verts[i].y)
                    ctx.closePath()
                    ctx.fillStyle = p.color
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
                    const r = (t.rEnd * H) * (0.5 + 0.5 * u) // grows toward the glass
                    const rot = t.spin0 + t.spinTurns * TAU * u

                    // ghosted motion-blur trail — faded copies of the fruit itself
                    t.trail.push({ x, y })
                    if (t.trail.length > 6) t.trail.shift()
                    for (let i = 0; i < t.trail.length - 1; i++) {
                        const tp = t.trail[i]
                        const k = i / t.trail.length
                        drawBody(t, tp.x, tp.y, r * (0.72 + 0.28 * k), rot - t.spinTurns * 0.4 * (1 - k), 1, 1, 0.1 + 0.12 * k)
                    }
                    drawBody(t, x, y, r, rot, 1, 1, 1)
                } else if (age < t.flightDur + SQUASH_MS) {
                    // ---- SQUASH — the fruit flattens against the glass ----
                    if (t.impactPx.x === 0 && t.impactPx.y === 0) {
                        t.impactPx = { x: t.p2.x * W, y: t.p2.y * H }
                    }
                    const sq = (age - t.flightDur) / SQUASH_MS
                    const r = t.rEnd * H
                    const rot = t.spin0 + t.spinTurns * TAU
                    drawBody(t, t.impactPx.x, t.impactPx.y, r, rot, 1 + 0.55 * sq, 1 - 0.5 * sq, 1 - 0.25 * sq)
                } else {
                    // ---- BURST / HOLD / FADE ----
                    if (t.burstAt === 0) {
                        t.impactPx = { x: t.p2.x * W, y: t.p2.y * H }
                        t.baseR = t.rEnd * H * rand(1.35, 1.7)
                        buildStainSprite(t, dpr)
                        t.drips = buildDrips(t.baseR)
                        spawnParticles(t)
                        t.burstAt = now
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
