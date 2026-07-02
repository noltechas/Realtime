import { useEffect, useRef } from 'react'

/**
 * FlowerLayer
 * -----------
 * The "applause" reaction: a single long-stemmed rose tossed onto the stage per
 * tap. Each rose is pre-rendered ONCE into an offscreen sprite (layered gradient
 * petals, spiral centre, sepals, tapered thorny stem, veined leaves) and blitted
 * with rotation every frame — detailed art at flat per-frame cost.
 *
 * Physics is a real simulation, not keyframes:
 *   toss    — ballistic launch with full gravity and a tumble
 *   descent — quadratic drag toward a terminal velocity, bloom-heavy
 *             aerodynamic righting (roses fall bloom-first) and a gentle sway
 *   impact  — a small plop-bounce when it comes in hot
 *   topple  — a damped rotational spring pivoting on the contact point, so the
 *             stem physically falls over and the rose lies FLAT on the floor,
 *             sliding out its remaining momentum under friction
 * A soft contact shadow fades in as the rose nears the floor. It rests ~10s,
 * then fades. A single rAF loop parks itself the moment the floor is clear.
 */

export const FLOWER_EMOJI = '💐'

// ---- tunables --------------------------------------------------------------
const PER_REACTION = 1
const MAX_FLOWERS = 24
const REST_MS = 10000
const FADE_MS = 1400
const FLOOR_PAD = 0.04 // tiny gap (× bloom radius) so contact points sit on the edge

const GRAVITY = 900 // px/s²
const APEX_MIN = 0.45 // launch apex as a fraction of stage height
const APEX_MAX = 0.8
const TERM_MIN = 0.19 // terminal velocity as a fraction of stage height /s
const TERM_MAX = 0.26
const ALIGN = 2.4 // rad/s² — bloom-heavy righting torque while falling
const ROT_DAMP_FALL = 1.2 // /s
const ROT_DAMP_RISE = 0.25
const RESTITUTION = 0.34 // impact plop-bounce
const MAX_BOUNCES = 1
const SETTLE_K = 32 // rad/s² — topple spring toward the flat pose
const SETTLE_DAMP = 7.4 // slightly underdamped → one natural wobble
const SLIDE_FRICTION = 2.6 // /s — landing slide decay
const SETTLED_ROT_EPS = 0.012
const SETTLED_VEL_EPS = 0.06

// flower geometry (× bloom radius r). The sprite draws the bloom at the local
// origin with the stem along +y; the layer translates up by BLOOM_UP_K so the
// rotation pivot sits at the flower's centre of mass (near the heavy bloom).
const STEM_LEN_K = 5.5
const BLOOM_UP_K = 2.5
// Resting orientation: the angle whose cosine balances the bloom (a ball) and
// the stem tip at the same height — the rose lies flat with both ends down.
const REST_C = 1 / 6
const REST_A = Math.acos(REST_C) // ≈ 1.40 rad — ~10° off horizontal

// sprite bounds in r-units around the bloom origin (must contain all the art)
const SPR_X0 = -2.2
const SPR_X1 = 2.2
const SPR_Y0 = -1.5
const SPR_Y1 = STEM_LEN_K + 1.2

const TAU = Math.PI * 2
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const nearestAngle = (target: number, from: number) => target + TAU * Math.round((from - target) / TAU)

// Deterministic per-flower randomness so the sprite is stable across rebuilds.
function mulberry32(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

// stem leaves — shared by the sprite art and the floor-contact sampling so they
// never disagree (frac: position along stem, ang: splay off the stem, len: ×r,
// sx: lateral offset as a fraction of the stem's bend control).
const LEAVES = [
    { frac: 0.36, ang: 0.85, len: 0.5, sx: 0.5 },
    { frac: 0.36, ang: Math.PI - 0.85, len: 0.42, sx: 0.5 },
    { frac: 0.55, ang: -0.7, len: 0.46, sx: 0.72 },
]

interface SamplePt { x: number; y: number; r: number } // pivot-frame point (×r) + radius (×r)

// Key contact points (bloom, stem tip, leaf tips) in the pivot frame, in r-units.
function buildSamples(bend: number): SamplePt[] {
    const ctrlX = bend * 1.4, topY = 0.5, sl = STEM_LEN_K, tipX = bend * 0.5
    const out: SamplePt[] = [
        { x: 0, y: -BLOOM_UP_K, r: 1.12 }, // petals overhang the nominal radius
        { x: tipX, y: topY + sl - BLOOM_UP_K, r: 0.1 },
    ]
    for (const lf of LEAVES) {
        const bx = ctrlX * lf.sx, by = topY + sl * lf.frac
        const tx = bx - lf.len * 1.4 * Math.sin(lf.ang)
        const ty = by + lf.len * 1.4 * Math.cos(lf.ang)
        out.push({ x: tx, y: ty - BLOOM_UP_K, r: 0.05 })
    }
    return out
}

// Lowest downward extent of the flower from its pivot at a given rotation (px).
function maxDown(rot: number, r: number, sm: SamplePt[]): number {
    const s = Math.sin(rot), c = Math.cos(rot)
    let m = -Infinity
    for (const p of sm) {
        const d = p.x * s + p.y * c + p.r
        if (d > m) m = d
    }
    return m * r
}

interface Palette { mid: string; dark: string; light: string; center: string }

const PALETTES: Palette[] = [
    { mid: '#d92746', dark: '#7a0e22', light: '#ff7d92', center: '#560a17' }, // classic red
    { mid: '#f0679c', dark: '#a92c66', light: '#ffc0d8', center: '#7c1e4a' }, // pink
    { mid: '#f28a52', dark: '#b04416', light: '#ffc9a4', center: '#833310' }, // coral
    { mid: '#a888e8', dark: '#5f41ad', light: '#ddcffb', center: '#463086' }, // lavender
    { mid: '#f2bb42', dark: '#b37c0a', light: '#ffe9a3', center: '#8a5f06' }, // golden
    { mid: '#f4e7d7', dark: '#c8a582', light: '#fffdf7', center: '#a08059' }, // cream
]

type FlowerState = 'air' | 'settle' | 'rest'

interface Flower {
    x: number; y: number
    vx: number; vy: number
    rot: number; rotVel: number
    size: number
    term: number // terminal velocity, px/s
    palette: Palette
    swayPhase: number; swayFreq: number; swayAmp: number
    bend: number
    sm: SamplePt[]
    state: FlowerState
    bounces: number
    landAt: number
    landRot: number
    tilt: number
    seed: number
    sprite: HTMLCanvasElement | null
}

function makeFlower(W: number, H: number): Flower {
    const fromLeft = Math.random() < 0.5
    const x0 = fromLeft ? rand(0.06, 0.26) : rand(0.74, 0.94)
    const bend = rand(-1, 1)
    return {
        x: x0 * W,
        y: 0,
        vx: (fromLeft ? 1 : -1) * rand(70, 210),
        vy: -Math.sqrt(2 * GRAVITY * H * rand(APEX_MIN, APEX_MAX)),
        rot: rand(0, TAU),
        rotVel: rand(-2.6, 2.6),
        size: 0,
        term: Math.max(140, H * rand(TERM_MIN, TERM_MAX)),
        palette: pick(PALETTES),
        swayPhase: rand(0, TAU),
        swayFreq: rand(1.2, 2.2),
        swayAmp: rand(30, 70),
        bend,
        sm: buildSamples(bend),
        state: 'air',
        bounces: 0,
        landAt: 0,
        landRot: 0,
        tilt: rand(-0.08, 0.08),
        seed: Math.floor(Math.random() * 1e9),
        sprite: null,
    }
}

// ---- sprite art -------------------------------------------------------------
// Everything below draws in "r-units" (bloom radius = 1) with the bloom centred
// at the origin and the stem running down +y, into an offscreen canvas.

function petal(
    ctx: CanvasRenderingContext2D, rng: () => number,
    ang: number, dist: number, w: number, l: number,
    cBase: string, cMid: string, cTip: string
) {
    const j = () => 1 + (rng() - 0.5) * 0.18 // organic edge jitter
    ctx.save()
    ctx.rotate(ang + (rng() - 0.5) * 0.09)
    ctx.translate(0, -dist)
    // dark base → lit tip, per-petal so the shading tracks the petal
    const g = ctx.createRadialGradient(0, l * 0.6, l * 0.06, 0, l * 0.6, l * 1.75)
    g.addColorStop(0, cBase)
    g.addColorStop(0.45, cMid)
    g.addColorStop(0.95, cTip)
    ctx.beginPath()
    ctx.moveTo(-w * 0.25, l * 0.45)
    ctx.bezierCurveTo(-w * 1.05, l * 0.25, -w * j(), -l * 0.45, -w * 0.28, -l * 0.92)
    ctx.quadraticCurveTo(0, -l * 1.02 * j(), w * 0.28, -l * 0.92)
    ctx.bezierCurveTo(w * j(), -l * 0.45, w * 1.05, l * 0.25, w * 0.25, l * 0.45)
    ctx.closePath()
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = 'rgba(20,0,8,0.22)'
    ctx.lineWidth = 0.012
    ctx.stroke()
    // light catching the curled outer edge of the petal
    ctx.beginPath()
    ctx.moveTo(-w * 0.28, -l * 0.9)
    ctx.quadraticCurveTo(0, -l * 1.0, w * 0.28, -l * 0.9)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 0.016
    ctx.stroke()
    ctx.restore()
}

function petalRing(
    ctx: CanvasRenderingContext2D, rng: () => number,
    count: number, off: number, dist: number, w: number, l: number,
    cBase: string, cMid: string, cTip: string
) {
    for (let i = 0; i < count; i++) {
        petal(ctx, rng, (i / count) * TAU + off, dist, w, l, cBase, cMid, cTip)
    }
}

function shadeDisc(ctx: CanvasRenderingContext2D, r: number, alpha: number) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
    g.addColorStop(0, `rgba(15,0,10,${alpha})`)
    g.addColorStop(1, 'rgba(15,0,10,0)')
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, TAU)
    ctx.fillStyle = g
    ctx.fill()
}

function drawLeaf(ctx: CanvasRenderingContext2D, rng: () => number, L: number) {
    // leaf-local frame: base at origin, tip at (0, L)
    const wj = 1 + (rng() - 0.5) * 0.2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(-0.4 * L * wj, 0.22 * L, -0.3 * L, 0.78 * L, 0, L)
    ctx.bezierCurveTo(0.3 * L, 0.78 * L, 0.4 * L * wj, 0.22 * L, 0, 0)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, 0, 0, L)
    g.addColorStop(0, '#26612b')
    g.addColorStop(0.55, '#3c8a41')
    g.addColorStop(1, '#57a854')
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = 'rgba(10,40,14,0.4)'
    ctx.lineWidth = 0.014
    ctx.stroke()
    // centre vein + side veins
    ctx.beginPath()
    ctx.moveTo(0, 0.04 * L)
    ctx.quadraticCurveTo(0.05 * L, 0.5 * L, 0, 0.96 * L)
    ctx.strokeStyle = 'rgba(16,64,22,0.8)'
    ctx.lineWidth = 0.02
    ctx.stroke()
    ctx.strokeStyle = 'rgba(16,64,22,0.35)'
    ctx.lineWidth = 0.012
    for (const t of [0.25, 0.45, 0.65]) {
        for (const s of [-1, 1]) {
            ctx.beginPath()
            ctx.moveTo(0.02 * L * s, t * L)
            ctx.quadraticCurveTo(0.12 * L * s, (t + 0.06) * L, 0.17 * L * s, (t + 0.14) * L)
            ctx.stroke()
        }
    }
}

function drawStem(ctx: CanvasRenderingContext2D, bend: number) {
    const topY = 0.5, sl = STEM_LEN_K
    const ctrlX = bend * 1.4, tipX = bend * 0.5
    // sample the quadratic and rib both sides for a tapered ribbon
    const N = 14
    const left: Array<[number, number]> = []
    const right: Array<[number, number]> = []
    for (let i = 0; i <= N; i++) {
        const t = i / N
        const mt = 1 - t
        const x = mt * mt * 0 + 2 * mt * t * ctrlX + t * t * tipX
        const y = topY + mt * mt * 0 + 2 * mt * t * (sl * 0.55) + t * t * sl
        // derivative → unit normal
        const dx = 2 * mt * (ctrlX - 0) + 2 * t * (tipX - ctrlX)
        const dy = 2 * mt * (sl * 0.55) + 2 * t * (sl - sl * 0.55)
        const dl = Math.hypot(dx, dy) || 1
        const nx = -dy / dl, ny = dx / dl
        const w = 0.09 - 0.05 * t // taper toward the cut end
        left.push([x + nx * w, y + ny * w])
        right.push([x - nx * w, y - ny * w])
    }
    ctx.beginPath()
    ctx.moveTo(left[0][0], left[0][1])
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1])
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1])
    ctx.closePath()
    const g = ctx.createLinearGradient(0, topY, tipX, topY + sl)
    g.addColorStop(0, '#4c9a4e')
    g.addColorStop(1, '#2a6b2f')
    ctx.fillStyle = g
    ctx.fill()
    // shaded edge + a thin highlight so the stem reads as round
    ctx.beginPath()
    ctx.moveTo(right[0][0], right[0][1])
    for (let i = 1; i < right.length; i++) ctx.lineTo(right[i][0], right[i][1])
    ctx.strokeStyle = 'rgba(10,45,15,0.5)'
    ctx.lineWidth = 0.022
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(left[2][0], left[2][1])
    for (let i = 3; i < left.length - 2; i++) ctx.lineTo(left[i][0], left[i][1])
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'
    ctx.lineWidth = 0.02
    ctx.stroke()
    // thorns — alternate sides, curved back toward the bloom
    for (const [t, side] of [[0.3, 1], [0.62, -1]] as Array<[number, number]>) {
        const mt = 1 - t
        const x = 2 * mt * t * ctrlX + t * t * tipX
        const y = topY + 2 * mt * t * (sl * 0.55) + t * t * sl
        const dx = 2 * mt * ctrlX + 2 * t * (tipX - ctrlX)
        const dy = 2 * mt * (sl * 0.55) + 2 * t * (sl * 0.45)
        const dl = Math.hypot(dx, dy) || 1
        const nx = (-dy / dl) * side, ny = (dx / dl) * side
        const tx = dx / dl, ty = dy / dl
        ctx.beginPath()
        ctx.moveTo(x + nx * 0.05, y + ny * 0.05)
        ctx.quadraticCurveTo(x + nx * 0.17 - tx * 0.02, y + ny * 0.17 - ty * 0.02, x + nx * 0.16 - tx * 0.1, y + ny * 0.16 - ty * 0.1)
        ctx.quadraticCurveTo(x + nx * 0.04 - tx * 0.06, y + ny * 0.04 - ty * 0.06, x - tx * 0.07, y - ty * 0.07)
        ctx.closePath()
        ctx.fillStyle = '#39702f'
        ctx.fill()
    }
}

function drawRoseSprite(ctx: CanvasRenderingContext2D, p: Palette, rng: () => number, bend: number) {
    const topY = 0.5, sl = STEM_LEN_K
    const ctrlX = bend * 1.4

    drawStem(ctx, bend)

    for (const lf of LEAVES) {
        ctx.save()
        ctx.translate(ctrlX * lf.sx, topY + sl * lf.frac)
        ctx.rotate(lf.ang)
        // short stalk into the leaf
        ctx.beginPath()
        ctx.moveTo(0, -0.06)
        ctx.lineTo(0, 0.06)
        ctx.strokeStyle = '#2a6b2f'
        ctx.lineWidth = 0.035
        ctx.stroke()
        drawLeaf(ctx, rng, lf.len * 1.4)
        ctx.restore()
    }

    // sepals fan out from under the bloom; drawn first so petals overlap them
    for (const a of [-0.95, -0.45, 0, 0.45, 0.95]) {
        ctx.save()
        ctx.translate(0, 0.32)
        ctx.rotate(a + (rng() - 0.5) * 0.15)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.quadraticCurveTo(-0.09, 0.35, 0, 0.72)
        ctx.quadraticCurveTo(0.09, 0.35, 0, 0)
        ctx.closePath()
        const sg = ctx.createLinearGradient(0, 0, 0, 0.72)
        sg.addColorStop(0, '#356f36')
        sg.addColorStop(1, '#549e50')
        ctx.fillStyle = sg
        ctx.fill()
        ctx.restore()
    }
    // calyx — the little green cup the bloom sits in
    ctx.beginPath()
    ctx.ellipse(0, 0.42, 0.2, 0.3, 0, 0, TAU)
    const cg = ctx.createLinearGradient(0, 0.12, 0, 0.72)
    cg.addColorStop(0, '#3f8342')
    cg.addColorStop(1, '#255c2a')
    ctx.fillStyle = cg
    ctx.fill()

    // ---- the bloom: layered petal rings with occlusion between layers -------
    ctx.beginPath()
    ctx.arc(0, 0, 0.9, 0, TAU)
    ctx.fillStyle = p.dark
    ctx.fill()

    petalRing(ctx, rng, 7, rng() * TAU, 0.52, 0.46, 0.62, p.dark, p.mid, p.light)
    shadeDisc(ctx, 0.58, 0.28)
    petalRing(ctx, rng, 6, rng() * TAU, 0.34, 0.37, 0.5, p.dark, p.mid, p.light)
    shadeDisc(ctx, 0.4, 0.3)
    petalRing(ctx, rng, 5, rng() * TAU, 0.2, 0.27, 0.34, p.center, p.mid, p.light)
    shadeDisc(ctx, 0.24, 0.34)

    // spiral heart — nested wrapped petals catching the light
    ctx.beginPath()
    ctx.arc(0, 0, 0.21, 0, TAU)
    ctx.fillStyle = p.dark
    ctx.fill()
    for (let i = 0; i < 4; i++) {
        const R = 0.185 - i * 0.038
        const a0 = rng() * TAU
        const span = 3.4 + rng() * 1.2
        const ox = (rng() - 0.5) * 0.03, oy = (rng() - 0.5) * 0.03
        ctx.beginPath()
        ctx.arc(ox, oy, R, a0, a0 + span)
        ctx.strokeStyle = p.mid
        ctx.lineWidth = R * 0.7
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(ox, oy, R + R * 0.28, a0 + 0.3, a0 + span - 0.3)
        ctx.strokeStyle = p.light
        ctx.lineWidth = R * 0.22
        ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(0, 0, 0.05, 0, TAU)
    ctx.fillStyle = p.center
    ctx.fill()

    // one soft key-light across the face of the bloom
    const hg = ctx.createRadialGradient(-0.32, -0.32, 0, -0.32, -0.32, 0.95)
    hg.addColorStop(0, 'rgba(255,255,255,0.16)')
    hg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.beginPath()
    ctx.arc(0, 0, 1.05, 0, TAU)
    ctx.fillStyle = hg
    ctx.fill()
}

function buildSprite(f: Flower, dpr: number): void {
    const k = Math.max(24, Math.min(110, f.size * dpr * 1.2)) // px per r-unit
    const cv = document.createElement('canvas')
    cv.width = Math.ceil((SPR_X1 - SPR_X0) * k)
    cv.height = Math.ceil((SPR_Y1 - SPR_Y0) * k)
    const c = cv.getContext('2d')
    if (!c) return
    c.scale(k, k)
    c.translate(-SPR_X0, -SPR_Y0)
    c.lineJoin = 'round'
    c.lineCap = 'round'
    drawRoseSprite(c, f.palette, mulberry32(f.seed), f.bend)
    f.sprite = cv
}

export default function FlowerLayer() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const flowersRef = useRef<Flower[]>([])
    const rafRef = useRef<number | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let dpr = Math.min(window.devicePixelRatio || 1, 2)
        let prevW = canvas.clientWidth
        let prevH = canvas.clientHeight
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            const w = canvas.clientWidth, h = canvas.clientHeight
            if (w && h && prevW && prevH && (w !== prevW || h !== prevH)) {
                const sx = w / prevW, sy = h / prevH
                for (const f of flowersRef.current) {
                    f.x *= sx; f.y *= sy; f.size *= sy; f.term *= sy
                    f.sprite = null // resolution changed — lazily rebuilt on next draw
                }
            }
            prevW = w; prevH = h
            canvas.width = Math.floor(w * dpr)
            canvas.height = Math.floor(h * dpr)
        }
        resize()
        window.addEventListener('resize', resize)

        const drawShadow = (f: Flower, H: number, alpha: number) => {
            const bottom = f.y + maxDown(f.rot, f.size, f.sm)
            const dist = Math.max(0, H - bottom)
            const range = H * 0.35
            if (dist >= range) return
            const prox = 1 - dist / range
            // wider + flatter as the rose lies down
            const sw = f.size * (1.6 + 3.0 * Math.abs(Math.sin(f.rot))) * (0.6 + 0.4 * prox)
            const sh = Math.max(2, sw * 0.14)
            const cx = f.x + Math.sin(f.rot) * f.size * 0.5
            ctx.save()
            ctx.globalAlpha = alpha
            ctx.translate(cx, H)
            ctx.scale(sw, sh)
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
            g.addColorStop(0, `rgba(0,0,0,${0.3 * prox})`)
            g.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.beginPath()
            ctx.arc(0, 0, 1, 0, TAU)
            ctx.fillStyle = g
            ctx.fill()
            ctx.restore()
        }

        const drawFlower = (f: Flower, alpha: number) => {
            if (!f.sprite) buildSprite(f, dpr)
            if (!f.sprite) return
            ctx.save()
            ctx.globalAlpha = alpha
            ctx.translate(f.x, f.y)
            ctx.rotate(f.rot)
            ctx.translate(0, -BLOOM_UP_K * f.size)
            ctx.drawImage(
                f.sprite,
                SPR_X0 * f.size, SPR_Y0 * f.size,
                (SPR_X1 - SPR_X0) * f.size, (SPR_Y1 - SPR_Y0) * f.size
            )
            ctx.restore()
        }

        const alphaOf = (f: Flower, now: number): number => {
            if (f.state === 'air') return 1
            const restElapsed = now - f.landAt
            if (restElapsed <= REST_MS) return 1
            return Math.max(0, 1 - (restElapsed - REST_MS) / FADE_MS)
        }

        const beginSettle = (f: Flower, now: number) => {
            f.state = 'settle'
            f.landAt = now
            // topple the short way to the nearest flat pose (both ends down)
            const cA = nearestAngle(REST_A + f.tilt, f.rot)
            const cB = nearestAngle(-REST_A + f.tilt, f.rot)
            f.landRot = Math.abs(cA - f.rot) <= Math.abs(cB - f.rot) ? cA : cB
            f.vx *= 0.5 // impact scrubs speed; the rest slides out under friction
            f.vy = 0
        }

        let lastTs = 0
        const frame = (now: number) => {
            const W = canvas.clientWidth, H = canvas.clientHeight
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, W, H)
            const dt = lastTs ? Math.min(0.05, (now - lastTs) / 1000) : 0
            lastTs = now

            for (const f of flowersRef.current) {
                const floorY = H - maxDown(f.rot, f.size, f.sm) - f.size * FLOOR_PAD
                if (f.state === 'air') {
                    // gravity with quadratic drag → asymptotic terminal velocity
                    f.vy += GRAVITY * dt
                    if (f.vy > 0) {
                        f.vy -= GRAVITY * (f.vy / f.term) * (f.vy / f.term) * dt
                    }
                    if (f.vy > 0) {
                        // descent: gentle leaf-like sway…
                        f.swayPhase += f.swayFreq * dt
                        f.vx += Math.sin(f.swayPhase) * f.swayAmp * dt
                        f.rotVel += Math.sin(f.swayPhase * 0.9 + 1.7) * 0.9 * dt
                        // …and the heavy bloom pendulums toward pointing down
                        f.rotVel += ALIGN * Math.sin(f.rot) * dt
                        f.rotVel -= f.rotVel * ROT_DAMP_FALL * dt
                    } else {
                        f.rotVel -= f.rotVel * ROT_DAMP_RISE * dt
                    }
                    f.vx -= f.vx * 0.45 * dt
                    f.x += f.vx * dt
                    f.y += f.vy * dt
                    f.rot += f.rotVel * dt

                    if (f.vy > 0 && f.y >= floorY) {
                        f.y = floorY
                        if (f.bounces < MAX_BOUNCES && f.vy > f.term * 0.72) {
                            // came in hot — a small plop-bounce off the bloom
                            f.bounces++
                            f.vy = -f.vy * RESTITUTION
                            f.vx *= 0.65
                            f.rotVel = f.rotVel * 0.5 + rand(-1.2, 1.2)
                        } else {
                            beginSettle(f, now)
                        }
                    }
                } else if (f.state === 'settle') {
                    // gravity topples the stem over — damped rotational spring
                    // pivoting on the contact point, riding the floor as it lays flat
                    const acc = SETTLE_K * (f.landRot - f.rot) - SETTLE_DAMP * f.rotVel
                    f.rotVel += acc * dt
                    f.rot += f.rotVel * dt
                    f.vx -= f.vx * SLIDE_FRICTION * dt
                    f.x += f.vx * dt
                    f.y = H - maxDown(f.rot, f.size, f.sm) - f.size * FLOOR_PAD
                    if (Math.abs(f.landRot - f.rot) < SETTLED_ROT_EPS && Math.abs(f.rotVel) < SETTLED_VEL_EPS) {
                        f.rot = f.landRot
                        f.rotVel = 0
                        f.vx = 0
                        f.y = H - maxDown(f.rot, f.size, f.sm) - f.size * FLOOR_PAD
                        f.state = 'rest'
                    }
                }

                const alpha = alphaOf(f, now)
                if (alpha > 0) drawShadow(f, H, alpha)
            }
            for (const f of flowersRef.current) {
                const alpha = alphaOf(f, now)
                if (alpha > 0) drawFlower(f, alpha)
            }

            flowersRef.current = flowersRef.current.filter(
                f => f.state === 'air' || now - f.landAt < REST_MS + FADE_MS
            )

            if (flowersRef.current.length > 0) {
                rafRef.current = requestAnimationFrame(frame)
            } else {
                rafRef.current = null
                lastTs = 0
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
                ctx.clearRect(0, 0, W, H)
            }
        }

        const ensureLoop = () => {
            if (rafRef.current == null) { lastTs = 0; rafRef.current = requestAnimationFrame(frame) }
        }

        if (!window.electronAPI?.onReaction) {
            window.removeEventListener('resize', resize)
            return
        }
        const handler = window.electronAPI.onReaction((reaction: { content?: string }) => {
            if (!reaction || reaction.content !== FLOWER_EMOJI) return
            const W = canvas.clientWidth, H = canvas.clientHeight
            for (let i = 0; i < PER_REACTION; i++) {
                const f = makeFlower(W, H)
                f.size = H * rand(0.03, 0.042)
                f.y = H + f.size * 2 // start just below the bottom edge
                flowersRef.current.push(f)
            }
            if (flowersRef.current.length > MAX_FLOWERS) {
                flowersRef.current = flowersRef.current.slice(-MAX_FLOWERS)
            }
            ensureLoop()
        })

        return () => {
            window.removeEventListener('resize', resize)
            window.electronAPI?.offReaction(handler)
            if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
    }, [])

    return <canvas ref={canvasRef} className="k-flower-layer" aria-hidden="true" />
}
