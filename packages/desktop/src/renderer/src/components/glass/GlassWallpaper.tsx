// What the glass floats over: a deep, slowly flowing mesh gradient in the
// song's own colours (pulled from its album art), the way a lock screen's
// wallpaper and Apple Music's player glow with the record you're on. Glass
// only looks like glass over something vivid, so this is never flat.
import { useEffect, useState } from 'react'
import { MeshGradient } from '@paper-design/shaders-react'

/** The idle palette: night blue into violet, magenta and a warm amber. */
export const IDLE_PALETTE = ['#0B1240', '#2453FF', '#7B2FF7', '#FF3D8B', '#FF9A3C']

const cache = new Map<string, string[]>()

function hsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255
    g /= 255
    b /= 255
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    const l = (mx + mn) / 2
    if (mx === mn) return [0, 0, l]
    const d = mx - mn
    const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    let h = 0
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    return [h * 60, s, l]
}

function hex(h: number, s: number, l: number): string {
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => {
        const k = (n + h / 30) % 12
        const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
        return Math.round(c * 255).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
}

/** Five colours from album art: its strongest hues, deepened and saturated so
 *  white lettering stays legible over them, and one dark anchor. */
export function useArtPalette(art: string | null | undefined): string[] {
    const [pal, setPal] = useState<string[]>(() => (art && cache.get(art)) || IDLE_PALETTE)
    useEffect(() => {
        if (!art) {
            setPal(IDLE_PALETTE)
            return
        }
        const hit = cache.get(art)
        if (hit) {
            setPal(hit)
            return
        }
        let dead = false
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            try {
                const c = document.createElement('canvas')
                c.width = 48
                c.height = 48
                const x = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
                x.drawImage(img, 0, 0, 48, 48)
                const d = x.getImageData(0, 0, 48, 48).data
                // hue buckets weighted by how colourful each pixel is
                const buckets = new Array(18).fill(0).map(() => ({ w: 0, s: 0, l: 0 }))
                for (let p = 0; p < d.length; p += 4) {
                    const [h, s, l] = hsl(d[p], d[p + 1], d[p + 2])
                    const wgt = s * (1 - Math.abs(l - 0.5) * 1.6)
                    if (wgt <= 0.02) continue
                    const b = buckets[Math.floor(h / 20) % 18]
                    b.w += wgt
                    b.s += s * wgt
                    b.l += l * wgt
                }
                const top = buckets
                    .map((b, i) => ({ ...b, h: i * 20 + 10 }))
                    .filter(b => b.w > 0)
                    .sort((a, b) => b.w - a.w)
                    .slice(0, 4)
                if (top.length === 0) throw new Error('grey')
                const cols = top.map(b => hex(b.h, Math.min(1, 0.55 + (b.s / b.w) * 0.5), Math.min(0.55, Math.max(0.36, b.l / b.w))))
                while (cols.length < 4) cols.push(hex(top[0].h + 40 * cols.length, 0.8, 0.45))
                const anchor = hex(top[0].h, 0.6, 0.1)
                const out = [anchor, ...cols]
                cache.set(art, out)
                if (!dead) setPal(out)
            } catch {
                if (!dead) setPal(IDLE_PALETTE)
            }
        }
        img.onerror = () => {
            if (!dead) setPal(IDLE_PALETTE)
        }
        img.src = art
        return () => {
            dead = true
        }
    }, [art])
    return pal
}

export function GlassWallpaper({ colors = IDLE_PALETTE, speed = 0.22, dim = 0.18 }: { colors?: string[]; speed?: number; dim?: number }) {
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: colors[0] }}>
            <MeshGradient colors={colors} distortion={0.85} swirl={0.35} speed={speed} grainMixer={0} grainOverlay={0.04} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            {/* keep white lettering readable: deepen the edges and the foot */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(ellipse 80% 70% at 50% 42%, rgba(0,0,0,0) 40%, rgba(0,0,0,${dim + 0.22}) 100%), linear-gradient(180deg, rgba(0,0,0,${dim * 0.6}) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,${dim + 0.1}) 100%)`,
                }}
            />
        </div>
    )
}

/** The playing stage's wallpaper: the song's own colours. */
export function GlassSongWallpaper({ art }: { art: string | null }) {
    const colors = useArtPalette(art)
    return <GlassWallpaper colors={colors} speed={0.2} dim={0.24} />
}
