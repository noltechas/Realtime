import { useEffect, useRef } from 'react'

/**
 * FlowerLayer
 * -----------
 * The "applause" reaction: a single long-stemmed flower tossed onto the stage
 * per tap. Each bloom is thrown up from the front of the stage, tumbles gently
 * end-over-end (rotation pivots at the flower's CENTRE, so the stem never
 * "propellers"), floats down under a low terminal velocity, then settles onto
 * the floor — easing to a shallow lie so BOTH the bloom and the stem tip rest on
 * the bottom edge (nothing clips past it). It lies there ~10s, then fades.
 *
 * Cheap by design: one bloom per tap, a handful of canvas ops per flower, and a
 * single rAF loop that parks itself the moment the floor is clear.
 */

export const FLOWER_EMOJI = '💐'

// ---- tunables --------------------------------------------------------------
const PER_REACTION = 1
const MAX_FLOWERS = 24
const GRAVITY = 540 // px/s²
const TERMINAL_VY = 150 // px/s — slow, graceful descent
const REST_MS = 10000
const SETTLE_MS = 600
const FADE_MS = 1400
const FLOOR_PAD = 0.06 // tiny gap (× bloom radius) so contact points sit just on the edge

// flower geometry (× bloom radius r). drawRose draws the bloom at the local
// origin with the stem along +y; the layer translates up by BLOOM_UP_K so the
// rotation pivot sits at the flower's centre.
const STEM_LEN_K = 5.5
const BLOOM_UP_K = 2.5
// Resting orientation: the angle whose cosine balances the bloom (a ball) and
// the stem tip at the same height, so the flower lies shallow with both ends on
// the floor instead of the bloom resting while the stem juts up.
const REST_C = 1 / 6
const REST_A = Math.acos(REST_C) // ≈ 1.40 rad

const TAU = Math.PI * 2
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const nearestAngle = (target: number, from: number) => target + TAU * Math.round((from - target) / TAU)

// stem leaves — shared by the drawing and the floor-contact sampling so they
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
        { x: 0, y: -BLOOM_UP_K, r: 1.0 },
        { x: tipX, y: topY + sl - BLOOM_UP_K, r: 0.12 },
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
const STEM = '#2f7d33'
const STEM_DK = '#225f27'
const LEAF = '#3a9140'
const LEAF_DK = '#2c7232'

const PALETTES: Palette[] = [
    { mid: '#e23b54', dark: '#8f1228', light: '#ff8198', center: '#6e0f20' }, // red
    { mid: '#ff7eb0', dark: '#cf3a7e', light: '#ffc6df', center: '#a82a68' }, // pink
    { mid: '#ff9a5e', dark: '#d9521f', light: '#ffcca8', center: '#b53e15' }, // coral
    { mid: '#b79cf2', dark: '#7654cf', light: '#e0d2ff', center: '#5a3eb0' }, // lavender
    { mid: '#ffd35a', dark: '#e09a00', light: '#fff0a6', center: '#bd7d00' }, // golden
    { mid: '#fff3ec', dark: '#e3cdbb', light: '#ffffff', center: '#caa988' }, // cream
]

interface Flower {
    x: number; y: number
    vx: number; vy: number
    rot: number; rotVel: number
    size: number
    palette: Palette
    flutterPhase: number; flutterFreq: number; flutterAmp: number
    bend: number
    sm: SamplePt[]
    landed: boolean
    landAt: number
    landFromRot: number
    landRot: number
    tilt: number
    seed: number
}

function makeFlower(W: number): Flower {
    const fromLeft = Math.random() < 0.5
    const x0 = fromLeft ? rand(0.06, 0.26) : rand(0.74, 0.94)
    const bend = rand(-1, 1)
    return {
        x: x0 * W,
        y: 0,
        vx: (fromLeft ? 1 : -1) * rand(70, 200),
        vy: -rand(620, 850),
        rot: rand(0, TAU),
        rotVel: rand(-1.8, 1.8),
        size: 0,
        palette: pick(PALETTES),
        flutterPhase: rand(0, TAU),
        flutterFreq: rand(1.4, 2.4),
        flutterAmp: rand(50, 110),
        bend,
        sm: buildSamples(bend),
        landed: false,
        landAt: 0,
        landFromRot: 0,
        landRot: 0,
        tilt: rand(-0.1, 0.1),
        seed: Math.random() * 1000,
    }
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
                for (const f of flowersRef.current) { f.x *= sx; f.y *= sy; f.size *= sy }
            }
            prevW = w; prevH = h
            canvas.width = Math.floor(w * dpr)
            canvas.height = Math.floor(h * dpr)
        }
        resize()
        window.addEventListener('resize', resize)

        const drawPetal = (angle: number, dist: number, w: number, l: number, fill: string, tip: string) => {
            ctx.save()
            ctx.rotate(angle)
            ctx.translate(0, -dist)
            ctx.beginPath(); ctx.ellipse(0, 0, w, l, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill()
            ctx.beginPath(); ctx.ellipse(0, -l * 0.3, w * 0.66, l * 0.5, 0, 0, TAU); ctx.fillStyle = tip; ctx.fill()
            ctx.restore()
        }
        const drawRing = (count: number, dist: number, w: number, l: number, fill: string, tip: string, off: number, jit: number, seed: number) => {
            for (let i = 0; i < count; i++) drawPetal((i / count) * TAU + off + Math.sin(seed + i) * jit, dist, w, l, fill, tip)
        }
        const drawLeaf = (x: number, y: number, ang: number, len: number) => {
            ctx.save()
            ctx.translate(x, y); ctx.rotate(ang)
            ctx.beginPath(); ctx.ellipse(0, len * 0.5, len * 0.34, len, 0, 0, TAU); ctx.fillStyle = LEAF; ctx.fill()
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len * 1.4); ctx.strokeStyle = LEAF_DK; ctx.lineWidth = Math.max(1, len * 0.06); ctx.stroke()
            ctx.restore()
        }

        const drawRose = (r: number, p: Palette, seed: number, bend: number) => {
            const stemLen = r * STEM_LEN_K
            const topY = r * 0.5
            const ctrlX = bend * r * 1.4
            const tipX = bend * r * 0.5
            ctx.beginPath(); ctx.moveTo(0, topY); ctx.quadraticCurveTo(ctrlX, topY + stemLen * 0.5, tipX, topY + stemLen)
            ctx.strokeStyle = STEM; ctx.lineWidth = r * 0.17; ctx.lineCap = 'round'; ctx.stroke()
            ctx.beginPath(); ctx.moveTo(0, topY); ctx.quadraticCurveTo(ctrlX, topY + stemLen * 0.5, tipX, topY + stemLen)
            ctx.strokeStyle = STEM_DK; ctx.lineWidth = r * 0.07; ctx.stroke()
            for (const lf of LEAVES) drawLeaf(ctrlX * lf.sx, topY + stemLen * lf.frac, lf.ang, r * lf.len)
            ctx.beginPath(); ctx.ellipse(0, topY * 0.7, r * 0.34, r * 0.5, 0, 0, TAU); ctx.fillStyle = STEM; ctx.fill()
            drawRing(8, r * 0.5, r * 0.4, r * 0.5, p.mid, p.light, 0, 0.06, seed)
            drawRing(7, r * 0.38, r * 0.34, r * 0.43, p.mid, p.light, Math.PI / 7, 0.06, seed + 3)
            drawRing(5, r * 0.26, r * 0.3, r * 0.34, p.light, p.light, Math.PI / 9, 0.05, seed + 7)
            ctx.beginPath(); ctx.arc(0, 0, r * 0.24, 0, TAU); ctx.fillStyle = p.dark; ctx.fill()
            ctx.beginPath(); ctx.arc(-r * 0.05, -r * 0.05, r * 0.11, 0, TAU); ctx.fillStyle = p.center; ctx.fill()
            ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.32, r * 0.32, r * 0.18, -0.6, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fill()
        }

        const drawFlower = (f: Flower, alpha: number) => {
            ctx.save()
            ctx.globalAlpha = alpha
            ctx.translate(f.x, f.y)
            ctx.rotate(f.rot)
            ctx.translate(0, -BLOOM_UP_K * f.size)
            drawRose(f.size, f.palette, f.seed, f.bend)
            ctx.restore()
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
                if (!f.landed) {
                    f.vy += GRAVITY * dt
                    if (f.vy > TERMINAL_VY) f.vy = TERMINAL_VY
                    f.flutterPhase += f.flutterFreq * dt
                    if (f.vy > 0) f.vx += Math.sin(f.flutterPhase) * f.flutterAmp * dt
                    f.vx -= f.vx * 0.55 * dt
                    f.x += f.vx * dt
                    f.y += f.vy * dt
                    f.rotVel -= f.rotVel * 1.1 * dt // damp the tumble so it floats, no propeller
                    f.rot += f.rotVel * dt
                    if (f.vy > 0 && f.y >= floorY) {
                        f.y = floorY
                        f.landed = true
                        f.landAt = now
                        f.landFromRot = f.rot
                        // Settle to the NEAREST shallow-lie pose (both ends down),
                        // the short way — never a multi-turn flip.
                        const cA = nearestAngle(REST_A + f.tilt, f.rot)
                        const cB = nearestAngle(-REST_A + f.tilt, f.rot)
                        f.landRot = Math.abs(cA - f.rot) <= Math.abs(cB - f.rot) ? cA : cB
                        f.vx = 0; f.vy = 0
                    }
                } else {
                    const since = now - f.landAt
                    if (since < SETTLE_MS) {
                        const t = since / SETTLE_MS
                        const wob = Math.sin(since / 65) * 0.06 * (1 - t)
                        f.rot = f.landFromRot + (f.landRot - f.landFromRot) * easeOutCubic(t) + wob
                    } else {
                        f.rot = f.landRot
                    }
                    // ride the floor as it lays flat (lowest point stays on the edge)
                    f.y = H - maxDown(f.rot, f.size, f.sm) - f.size * FLOOR_PAD
                }

                let alpha = 1
                if (f.landed) {
                    const restElapsed = now - f.landAt
                    if (restElapsed > REST_MS) alpha = Math.max(0, 1 - (restElapsed - REST_MS) / FADE_MS)
                }
                if (alpha > 0) drawFlower(f, alpha)
            }

            flowersRef.current = flowersRef.current.filter(f => !f.landed || now - f.landAt < REST_MS + FADE_MS)

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
                const f = makeFlower(W)
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
