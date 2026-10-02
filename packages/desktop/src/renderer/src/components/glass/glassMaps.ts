// Refraction and highlight maps for Liquid Glass.
//
// Real glass doesn't blur what's behind it, it BENDS it. A pane of Liquid
// Glass is flat in the middle and rounds over at its rim like a thick lens,
// so near the edge the light is pulled inward and what's behind appears
// stretched around the curve. We reproduce that with an SVG displacement map
// fed to `backdrop-filter: url(#filter)` (Chromium, so Electron, supports SVG
// filters in backdrop-filter):
//
//   • the rim: within `bezel` px of the edge the surface is a quarter-circle
//     profile; displacement points inward along the edge normal and grows
//     toward the edge, so the backdrop wraps around the rim
//   • the body: an optional magnification (`zoom`) about the centre, for the
//     lens that rides over the word being sung
//
// Each map is encoded in R (x) and G (y) around 128 and comes with the
// feDisplacementMap `scale` that decodes it. A second map holds the specular
// highlight: light from the upper left catching the rounded rim.
//
// Maps are generated on a canvas once per size and cached.

export interface GlassMap {
    /** displacement map (data URL) */
    href: string
    /** specular highlight (white with alpha, data URL) */
    spec: string
    /** feDisplacementMap scale that decodes `href` */
    scale: number
    w: number
    h: number
}

export interface RectMapOptions {
    /** px the backdrop is pulled in at the very rim */
    refract?: number
    /** magnification of the body (1 = none) */
    zoom?: number
    /** how bright the rim highlight is, 0..1 */
    shine?: number
}

const cache = new Map<string, GlassMap>()
const LIGHT = { x: -0.55, y: -0.83 } // from the upper left

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return [c, c.getContext('2d') as CanvasRenderingContext2D]
}

/** Signed distance to a rounded rectangle (negative inside). */
function sdRoundRect(px: number, py: number, cx: number, cy: number, hx: number, hy: number, r: number): number {
    const qx = Math.abs(px - cx) - hx
    const qy = Math.abs(py - cy) - hy
    const ox = Math.max(qx, 0)
    const oy = Math.max(qy, 0)
    return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r
}

/** Maps for a rounded rectangle `w`×`h` with corner `radius` and a rim `bezel` px deep. */
export function rectMap(w: number, h: number, radius: number, bezel: number, opts: RectMapOptions = {}): GlassMap {
    w = Math.max(2, Math.round(w))
    h = Math.max(2, Math.round(h))
    const r = Math.min(radius, w / 2, h / 2)
    const b = Math.max(1, Math.min(bezel, Math.min(w, h) / 2))
    const refract = opts.refract ?? 18
    const zoom = opts.zoom ?? 1
    const shine = opts.shine ?? 1
    const key = `${w}x${h}:${r.toFixed(1)}:${b.toFixed(1)}:${refract}:${zoom}:${shine}`
    const hit = cache.get(key)
    if (hit) return hit

    const cx = w / 2
    const cy = h / 2
    const hx = w / 2 - r
    const hy = h / 2 - r
    const n = w * h
    const D = new Float32Array(n * 2)
    const S = new Float32Array(n)
    let M = 1
    const k = 1 - 1 / zoom
    for (let j = 0; j < h; j++) {
        const py = j + 0.5
        for (let i = 0; i < w; i++) {
            const px = i + 0.5
            const sd = sdRoundRect(px, py, cx, cy, hx, hy, r)
            if (sd >= 0) continue
            const d = -sd
            // outward normal from the distance field's gradient
            const gx = sdRoundRect(px + 0.5, py, cx, cy, hx, hy, r) - sdRoundRect(px - 0.5, py, cx, cy, hx, hy, r)
            const gy = sdRoundRect(px, py + 0.5, cx, cy, hx, hy, r) - sdRoundRect(px, py - 0.5, cx, cy, hx, hy, r)
            const gl = Math.hypot(gx, gy) || 1
            const nx = gx / gl
            const ny = gy / gl
            const t = Math.min(1, d / b)
            // the quarter-circle rim: steep at the edge, flat by the time it meets the body
            const m = refract * (1 - Math.sqrt(1 - (1 - t) * (1 - t)))
            let dx = -nx * m + (cx - px) * k
            let dy = -ny * m + (cy - py) * k
            const idx = j * w + i
            D[idx * 2] = dx
            D[idx * 2 + 1] = dy
            if (Math.abs(dx) > M) M = Math.abs(dx)
            if (Math.abs(dy) > M) M = Math.abs(dy)
            // highlight: the rim catching light from the upper left, a fainter
            // bounce on the far side, and a soft glow across the top of the body
            const rim = Math.pow(1 - t, 2.6)
            const facing = -(nx * LIGHT.x + ny * LIGHT.y)
            const lit = rim * (0.16 + 0.84 * Math.pow(Math.max(0, facing), 2.4)) + rim * 0.22 * Math.pow(Math.max(0, -facing), 3)
            const top = 0.05 * Math.max(0, 1 - py / (h * 0.55)) * t
            S[idx] = Math.min(1, (lit + top) * shine)
            dx = 0
            dy = 0
        }
    }
    const [c, x] = canvas(w, h)
    const [sc, sx] = canvas(w, h)
    const im = x.createImageData(w, h)
    const sm = sx.createImageData(w, h)
    for (let p = 0; p < n; p++) {
        im.data[p * 4] = 128 + (D[p * 2] / M) * 127
        im.data[p * 4 + 1] = 128 + (D[p * 2 + 1] / M) * 127
        im.data[p * 4 + 2] = 128
        im.data[p * 4 + 3] = 255
        sm.data[p * 4] = 255
        sm.data[p * 4 + 1] = 255
        sm.data[p * 4 + 2] = 255
        sm.data[p * 4 + 3] = Math.round(S[p] * 255)
    }
    x.putImageData(im, 0, 0)
    sx.putImageData(sm, 0, 0)
    const out = { href: c.toDataURL(), spec: sc.toDataURL(), scale: 2 * M, w, h }
    if (cache.size > 160) cache.clear()
    cache.set(key, out)
    return out
}

export interface TextGlass extends GlassMap {
    /** the glyphs' alpha, to mask the glass to their shape (data URL) */
    mask: string
}

/** Glass in the shape of some text: its glyphs are the panes, each rounding
 *  over at its edges like a moulded letter (the way a lock-screen clock is).
 *  `font` is a CSS font shorthand; the box is the text's own measure plus `pad`. */
export function textGlass(text: string, font: string, opts: { pad?: number; bezel?: number; refract?: number; shine?: number } = {}): TextGlass {
    const pad = opts.pad ?? 24
    const bezel = opts.bezel ?? 14
    const refract = opts.refract ?? 26
    const shine = opts.shine ?? 1
    const key = `T:${text}:${font}:${pad}:${bezel}:${refract}:${shine}`
    const hit = cache.get(key) as TextGlass | undefined
    if (hit) return hit

    const [, mx] = canvas(4, 4)
    mx.font = font
    const met = mx.measureText(text)
    const asc = Math.ceil(met.actualBoundingBoxAscent)
    const desc = Math.ceil(met.actualBoundingBoxDescent)
    const w = Math.ceil(met.width) + pad * 2
    const h = asc + desc + pad * 2
    // the glyphs
    const [mc, m2] = canvas(w, h)
    m2.font = font
    m2.fillStyle = '#fff'
    m2.textBaseline = 'alphabetic'
    m2.fillText(text, pad, pad + asc)
    const A = m2.getImageData(0, 0, w, h).data
    // a height field: the glyphs, rounded over at their edges
    const [, hx] = canvas(w, h)
    hx.filter = `blur(${bezel * 0.55}px)`
    hx.drawImage(mc, 0, 0)
    const Hd = hx.getImageData(0, 0, w, h).data
    const n = w * h
    const H = new Float32Array(n)
    for (let p = 0; p < n; p++) H[p] = Hd[p * 4 + 3] / 255
    const D = new Float32Array(n * 2)
    const S = new Float32Array(n)
    let M = 1
    for (let j = 1; j < h - 1; j++) {
        for (let i = 1; i < w - 1; i++) {
            const p = j * w + i
            if (A[p * 4 + 3] < 2) continue
            const gx = (H[p + 1] - H[p - 1]) * 0.5
            const gy = (H[p + w] - H[p - w]) * 0.5
            // the slope is steepest at the glyph's edge: pull the backdrop in there
            const dx = gx * refract * 3
            const dy = gy * refract * 3
            D[p * 2] = dx
            D[p * 2 + 1] = dy
            if (Math.abs(dx) > M) M = Math.abs(dx)
            if (Math.abs(dy) > M) M = Math.abs(dy)
            const gl = Math.hypot(gx, gy)
            const slope = Math.min(1, gl * 6)
            const facing = gl > 1e-4 ? (gx * LIGHT.x + gy * LIGHT.y) / gl : 0
            S[p] = Math.min(1, slope * (0.18 + 0.82 * Math.pow(Math.max(0, facing), 2)) * shine + slope * 0.2 * Math.pow(Math.max(0, -facing), 3))
        }
    }
    const [c, x] = canvas(w, h)
    const [sc, sx] = canvas(w, h)
    const im = x.createImageData(w, h)
    const sm = sx.createImageData(w, h)
    for (let p = 0; p < n; p++) {
        im.data[p * 4] = 128 + (D[p * 2] / M) * 127
        im.data[p * 4 + 1] = 128 + (D[p * 2 + 1] / M) * 127
        im.data[p * 4 + 2] = 128
        im.data[p * 4 + 3] = 255
        sm.data[p * 4] = 255
        sm.data[p * 4 + 1] = 255
        sm.data[p * 4 + 2] = 255
        sm.data[p * 4 + 3] = Math.round(S[p] * 255)
    }
    x.putImageData(im, 0, 0)
    sx.putImageData(sm, 0, 0)
    const out: TextGlass = { href: c.toDataURL(), spec: sc.toDataURL(), mask: mc.toDataURL(), scale: 2 * M, w, h }
    cache.set(key, out)
    return out
}
