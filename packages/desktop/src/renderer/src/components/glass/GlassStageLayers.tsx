// The Liquid Glass stage while a song plays.
//
//   GlassLyrics   two moving panes over the lyrics:
//                 • the PLATTER, a wide capsule of glass under the line being
//                   sung. When the next line comes it slides and reshapes to
//                   it (a spring, the way a selection capsule glides between
//                   tabs), refracting the wallpaper at its rim.
//                 • the LENS, a droplet of glass under the word being sung,
//                   tinted in the singer's colour. It glides word to word,
//                   stretching along its path the faster it moves and settling
//                   with a wobble when it lands, like a glass slider thumb. It
//                   sits BEHIND the lettering (platter < lens < lyrics), so it
//                   never magnifies, clips or pushes into the words beside it.
//   GlassProgress the song's progress as a glass slider along the foot: a
//                 slim glass track, and a lens-thumb magnifying the fill.
//
// Both read the DOM every frame (word rectangles move with the lyric scroll)
// and write transforms imperatively; React doesn't re-render per frame.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type MutableRefObject, type RefObject } from 'react'
import { rectMap, type GlassMap } from './glassMaps'
import { GlassFilter, RIM_STYLE, cssId } from './LiquidGlass'
import { LG } from '../../styles/liquid-glass'

interface Anchor {
    eventMs: number
    perfAt: number
}

// ── A pane that moves and reshapes every frame ──────────────────────────────

interface MovingLook {
    bezel: number
    refract: number
    zoom: number
    chroma: number
    blur: number
    saturate: number
    shine: number
    tint: string
    shadow: string
}

interface MovingHandle {
    place: (x: number, y: number, w: number, h: number, sx: number, sy: number) => void
    tint: (css: string) => void
    show: (on: boolean) => void
}

/** Maps are cut for a size rounded to 8 px, and stretched to the exact size
 *  while the pane is between sizes. */
function quant(v: number): number {
    return Math.max(16, Math.round(v / 8) * 8)
}

const MovingGlass = forwardRef<MovingHandle, { look: MovingLook; z: number; id: string }>(function MovingGlass({ look, z, id }, ref) {
    const root = useRef<HTMLDivElement>(null)
    const img = useRef<SVGFEImageElement>(null)
    const spec = useRef<HTMLImageElement>(null)
    const tintEl = useRef<HTMLDivElement>(null)
    const [map, setMap] = useState<GlassMap | null>(null)
    const mapKey = useRef('')
    const size = useRef({ w: 0, h: 0 })
    useImperativeHandle(ref, () => ({
        place(x, y, w, h, sx, sy) {
            const el = root.current
            if (!el) return
            el.style.transform = `translate(${x}px, ${y}px) scale(${sx}, ${sy})`
            el.style.width = `${w}px`
            el.style.height = `${h}px`
            el.style.borderRadius = `${h / 2}px`
            size.current = { w, h }
            // follow the size: the map stretches to it until a fresh one is cut
            const fe = img.current
            if (fe) {
                fe.setAttribute('width', String(w))
                fe.setAttribute('height', String(h))
                const f = fe.parentElement
                if (f) {
                    f.setAttribute('width', String(w))
                    f.setAttribute('height', String(h))
                }
            }
            const qw = quant(w)
            const qh = quant(h)
            const key = `${qw}x${qh}`
            if (key !== mapKey.current) {
                mapKey.current = key
                setMap(rectMap(qw, qh, qh / 2, look.bezel, { refract: look.refract, zoom: look.zoom, shine: look.shine }))
            }
        },
        tint(css) {
            if (tintEl.current) tintEl.current.style.background = css
        },
        show(on) {
            if (root.current) root.current.style.visibility = on ? 'visible' : 'hidden'
        },
    }))
    const { w, h } = size.current
    return (
        <div
            ref={root}
            aria-hidden
            style={{ position: 'fixed', left: 0, top: 0, width: 0, height: 0, zIndex: z, pointerEvents: 'none', transformOrigin: '50% 50%', willChange: 'transform', visibility: 'hidden', boxShadow: look.shadow }}
        >
            {map ? <GlassFilter id={id} map={map} w={w || map.w} h={h || map.h} chroma={look.chroma} blur={look.blur} saturate={look.saturate} imageRef={img} /> : null}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', backdropFilter: map ? `url(#${id})` : 'blur(10px)', WebkitBackdropFilter: map ? `url(#${id})` : 'blur(10px)' }} />
            <div ref={tintEl} style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: look.tint }} />
            {map ? <img ref={spec} src={map.spec} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 'inherit' }} /> : null}
            <div style={RIM_STYLE} />
        </div>
    )
})

// ── Springs ─────────────────────────────────────────────────────────────────

class Spring {
    x: number
    v = 0
    constructor(x: number, private k: number, private c: number) {
        this.x = x
    }
    step(target: number, dt: number) {
        const a = (target - this.x) * this.k - this.v * this.c
        this.v += a * dt
        this.x += this.v * dt
        return this.x
    }
    snap(x: number) {
        this.x = x
        this.v = 0
    }
}

// ── The platter and the lens ────────────────────────────────────────────────

const PLATTER: MovingLook = {
    bezel: 30,
    refract: 26,
    zoom: 1,
    chroma: 0.05,
    blur: 1.4,
    saturate: 1.5,
    shine: 0.9,
    tint: 'rgba(14,16,30,0.16)',
    shadow: '0 18px 44px rgba(0,0,0,0.26), 0 3px 10px rgba(0,0,0,0.14)',
}
const LENS: MovingLook = {
    bezel: 16,
    refract: 14,
    zoom: 1,
    chroma: 0.05,
    blur: 0.8,
    saturate: 1.4,
    shine: 1,
    tint: 'rgba(255,255,255,0.16)',
    shadow: '0 6px 16px rgba(0,0,0,0.22), 0 1px 4px rgba(0,0,0,0.14)',
}

export function GlassLyrics({
    lyricsRef,
    timeAnchorRef,
    lineIdx,
    playing,
}: {
    lyricsRef: RefObject<HTMLDivElement>
    timeAnchorRef: MutableRefObject<Anchor>
    lineIdx: number
    playing: boolean
}) {
    const platter = useRef<MovingHandle>(null)
    const lens = useRef<MovingHandle>(null)
    const ids = useRef({ p: cssId('platter' + Math.random()), l: cssId('lens' + Math.random()) })
    const playingRef = useRef(playing)
    playingRef.current = playing

    useEffect(() => {
        let raf = 0
        let last = performance.now()
        const P = { x: new Spring(0, 160, 24), y: new Spring(0, 160, 24), w: new Spring(0, 160, 24), h: new Spring(0, 160, 24) }
        const L = { x: new Spring(0, 300, 21), y: new Spring(0, 300, 21), w: new Spring(0, 280, 22), h: new Spring(0, 280, 22) }
        let pOn = false
        let lOn = false
        let lastTint = ''
        const tick = () => {
            raf = requestAnimationFrame(tick)
            const now = performance.now()
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const box = lyricsRef.current
            const p = platter.current
            const l = lens.current
            if (!box || !p || !l) return
            const line = lineIdx >= 0 ? box.querySelector(`[data-li="${lineIdx}"]`) : null
            if (!line) {
                if (pOn) p.show((pOn = false))
                if (lOn) l.show((lOn = false))
                return
            }
            const r = line.getBoundingClientRect()
            if (!pOn) {
                P.x.snap(r.left)
                P.y.snap(r.top)
                P.w.snap(r.width)
                P.h.snap(r.height)
            }
            const px = P.x.step(r.left, dt)
            const py = P.y.step(r.top, dt)
            const pw = P.w.step(r.width, dt)
            const ph = P.h.step(r.height, dt)
            p.place(px, py, Math.max(40, pw), Math.max(30, ph), 1, 1)
            if (!pOn) p.show((pOn = true))

            // the lens rides the syllable being sung
            const word = line.querySelector('.k-syl--now .k-syl__word') as HTMLElement | null
            if (!word) {
                if (lOn) l.show((lOn = false))
                return
            }
            const wr = word.getBoundingClientRect()
            const fs = parseFloat(getComputedStyle(word).fontSize) || 60
            // a pill hugging the word: its ends reach only into the gaps either
            // side (a space is ~0.25em), never under the next word's letters
            const tw = wr.width + fs * 0.24
            const th = fs * 1.1
            const tx = wr.left - fs * 0.12
            const ty = wr.top + (wr.height - th) / 2
            if (!lOn) {
                L.x.snap(tx)
                L.y.snap(ty)
                L.w.snap(tw)
                L.h.snap(th)
            }
            const lx = L.x.step(tx, dt)
            const ly = L.y.step(ty, dt)
            const lw = L.w.step(tw, dt)
            const lh = L.h.step(th, dt)
            // stretched along its path by its speed, settling back as it lands
            const sp = Math.min(1, Math.abs(L.x.v) / 2600)
            const sx = 1 + sp * 0.14
            const sy = 1 - sp * 0.1
            l.place(lx, ly, Math.max(24, lw), Math.max(24, lh), sx, sy)
            const tint = (word.closest('[data-tint]') as HTMLElement | null)?.dataset.tint
            const css = tint ? `color-mix(in srgb, ${tint} 42%, transparent)` : LENS.tint
            if (css !== lastTint) {
                lastTint = css
                l.tint(css)
            }
            if (!lOn) l.show((lOn = true))
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [lyricsRef, lineIdx])

    return (
        <>
            <MovingGlass ref={platter} look={PLATTER} z={6} id={ids.current.p} />
            {/* z 7: above the platter (6), below the lyrics (.k-lyrics is 10) */}
            <MovingGlass ref={lens} look={LENS} z={7} id={ids.current.l} />
        </>
    )
}

// ── Progress ────────────────────────────────────────────────────────────────

function clock(ms: number): string {
    const s = Math.max(0, Math.floor(ms / 1000))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function GlassProgress({ timeAnchorRef, playing, durationMs }: { timeAnchorRef: MutableRefObject<Anchor>; playing: boolean; durationMs: number }) {
    const thumb = useRef<MovingHandle>(null)
    const fill = useRef<HTMLDivElement>(null)
    const track = useRef<HTMLDivElement>(null)
    const left = useRef<HTMLSpanElement>(null)
    const right = useRef<HTMLSpanElement>(null)
    const id = useRef(cssId('thumb' + Math.random()))
    const playingRef = useRef(playing)
    playingRef.current = playing
    useEffect(() => {
        let raf = 0
        let shown = false
        const tick = () => {
            raf = requestAnimationFrame(tick)
            const a = timeAnchorRef.current
            const now = playingRef.current ? a.eventMs + (performance.now() - a.perfAt) : a.eventMs
            const f = durationMs > 0 ? Math.min(1, Math.max(0, now / durationMs)) : 0
            const tr = track.current?.getBoundingClientRect()
            if (!tr || !thumb.current) return
            if (fill.current) fill.current.style.width = `${f * 100}%`
            const tw = 54
            const th = 32
            thumb.current.place(tr.left + f * tr.width - tw / 2, tr.top + tr.height / 2 - th / 2, tw, th, 1, 1)
            if (!shown) thumb.current.show((shown = true))
            if (left.current) left.current.textContent = clock(now)
            if (right.current) right.current.textContent = '-' + clock(durationMs - now)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [timeAnchorRef, durationMs])
    return (
        <>
            <div aria-hidden style={{ position: 'absolute', left: '50%', bottom: 46, transform: 'translateX(-50%)', width: 'min(56vw, 1080px)', zIndex: 12, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 22 }}>
                <span ref={left} style={{ ...LG.digits, fontSize: 17, color: 'rgba(255,255,255,0.78)', minWidth: 56, textAlign: 'right' }} />
                <div ref={track} style={{ position: 'relative', flex: 1, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.16)', boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.12)' }}>
                    <div ref={fill} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0, borderRadius: 5, background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.82))' }} />
                </div>
                <span ref={right} style={{ ...LG.digits, fontSize: 17, color: 'rgba(255,255,255,0.78)', minWidth: 64 }} />
            </div>
            <MovingGlass ref={thumb} look={{ ...LENS, zoom: 1.35, bezel: 12, refract: 10 }} z={13} id={id.current} />
        </>
    )
}
