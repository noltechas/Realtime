// Liquid Glass panes for the stage.
//
//   LiquidGlass   a pane of glass of any size: it refracts what's behind it
//                 (the rim bends the backdrop around its curve, the body can
//                 magnify), splits colour faintly at the edge, catches the
//                 light on its rim, and carries content on top
//   GlassFilter   the SVG filter one pane uses (exported for panes that move
//                 and resize every frame, see GlassStageLayers)
//
// THE ONE RULE: nothing between a pane and the content it refracts may be a
// "backdrop root". In Chromium that is any ancestor with `isolation:
// isolate`, `opacity` < 1, `filter`, `mask`, `clip-path`, `mix-blend-mode`
// or its own `backdrop-filter`; any of those and the pane refracts nothing
// (it renders black). Animate a pane's own transform, never its parents'
// opacity.
//
// Copy rule for every string here: no em dashes, ever.
import { forwardRef, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { rectMap, type GlassMap } from './glassMaps'

export interface GlassLook {
    /** corner radius in px, or 'capsule' (half the height) */
    radius?: number | 'capsule'
    /** depth of the rounded rim, px */
    bezel?: number
    /** how far the rim pulls the backdrop in, px */
    refract?: number
    /** magnification of the body (1 = none) */
    zoom?: number
    /** frosting (Gaussian blur on the refracted backdrop), px */
    blur?: number
    saturate?: number
    /** colour split at the rim, 0..0.15 */
    chroma?: number
    /** a wash over the pane: legibility, or a tint */
    tint?: string
    /** rim highlight strength, 0..1 */
    shine?: number
    /** drop shadow under the pane */
    shadow?: string | false
}

export function cssId(raw: string): string {
    return 'lg' + raw.replace(/[^a-zA-Z0-9_-]/g, '')
}

/** The SVG filter for one pane: displace (three times, one per channel, for
 *  the colour split), recombine, frost, saturate. */
export function GlassFilter({
    id,
    map,
    w,
    h,
    chroma = 0.05,
    blur = 0.5,
    saturate = 1.4,
    imageRef,
}: {
    id: string
    map: GlassMap
    w: number
    h: number
    chroma?: number
    blur?: number
    saturate?: number
    imageRef?: React.Ref<SVGFEImageElement>
}) {
    const s = map.scale
    return (
        <svg aria-hidden width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
            <filter id={id} x="0" y="0" width={w} height={h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feImage ref={imageRef} href={map.href} x="0" y="0" width={w} height={h} preserveAspectRatio="none" result="map" />
                {chroma > 0 ? (
                    <>
                        <feDisplacementMap in="SourceGraphic" in2="map" scale={s} xChannelSelector="R" yChannelSelector="G" result="dr" />
                        <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r" />
                        <feDisplacementMap in="SourceGraphic" in2="map" scale={s * (1 - chroma)} xChannelSelector="R" yChannelSelector="G" result="dg" />
                        <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g" />
                        <feDisplacementMap in="SourceGraphic" in2="map" scale={s * (1 - 2 * chroma)} xChannelSelector="R" yChannelSelector="G" result="db" />
                        <feColorMatrix in="db" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b" />
                        <feComposite in="r" in2="g" operator="arithmetic" k2="1" k3="1" result="rg" />
                        <feComposite in="rg" in2="b" operator="arithmetic" k2="1" k3="1" result="rgb" />
                    </>
                ) : (
                    <feDisplacementMap in="SourceGraphic" in2="map" scale={s} xChannelSelector="R" yChannelSelector="G" result="rgb" />
                )}
                <feGaussianBlur in="rgb" stdDeviation={blur} result="soft" />
                <feColorMatrix in="soft" type="saturate" values={String(saturate)} />
            </filter>
        </svg>
    )
}

/** The rim: a hairline catching the light, bright where it faces the light
 *  (upper left), faint on the far side, plus the soft inner edge. */
export const RIM_STYLE: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    boxShadow:
        'inset 0 1px 0.5px rgba(255,255,255,0.55), inset 0 -1px 1px rgba(255,255,255,0.14), inset 0 0 0 0.5px rgba(255,255,255,0.18), inset 0 10px 24px -14px rgba(255,255,255,0.35)',
}

export const LiquidGlass = forwardRef<HTMLDivElement, GlassLook & { style?: CSSProperties; contentStyle?: CSSProperties; className?: string; children?: ReactNode }>(
    function LiquidGlass(
        {
            radius = 'capsule',
            bezel = 22,
            refract = 20,
            zoom = 1,
            blur = 0.6,
            saturate = 1.45,
            chroma = 0.05,
            tint = 'rgba(255,255,255,0.06)',
            shine = 1,
            shadow = '0 14px 36px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)',
            style,
            contentStyle,
            className,
            children,
        },
        outer,
    ) {
        const own = useRef<HTMLDivElement>(null)
        const [size, setSize] = useState<{ w: number; h: number } | null>(null)
        const raw = useId()
        const id = cssId(raw)
        useLayoutEffect(() => {
            const el = own.current
            if (!el) return
            const measure = () => {
                const w = Math.round(el.offsetWidth)
                const h = Math.round(el.offsetHeight)
                setSize(p => (p && p.w === w && p.h === h ? p : { w, h }))
            }
            measure()
            const ro = new ResizeObserver(measure)
            ro.observe(el)
            return () => ro.disconnect()
        }, [])
        const R = size ? (radius === 'capsule' ? size.h / 2 : radius) : radius === 'capsule' ? 999 : radius
        const map = useMemo(() => (size && size.w > 2 && size.h > 2 ? rectMap(size.w, size.h, R, bezel, { refract, zoom, shine }) : null), [size, R, bezel, refract, zoom, shine])
        return (
            <div
                ref={el => {
                    ;(own as React.MutableRefObject<HTMLDivElement | null>).current = el
                    if (typeof outer === 'function') outer(el)
                    else if (outer) (outer as React.MutableRefObject<HTMLDivElement | null>).current = el
                }}
                className={className}
                style={{ position: 'relative', borderRadius: R, boxShadow: shadow || undefined, ...style }}
            >
                {map && size ? <GlassFilter id={id} map={map} w={size.w} h={size.h} chroma={chroma} blur={blur} saturate={saturate} /> : null}
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 'inherit',
                        // until it's measured, plain frosted glass
                        backdropFilter: map ? `url(#${id})` : `blur(${Math.max(8, blur * 10)}px) saturate(${saturate})`,
                        WebkitBackdropFilter: map ? `url(#${id})` : `blur(${Math.max(8, blur * 10)}px) saturate(${saturate})`,
                    }}
                />
                {tint ? <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: tint, pointerEvents: 'none' }} /> : null}
                {map ? <img aria-hidden src={map.spec} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 'inherit', pointerEvents: 'none' }} /> : null}
                <div aria-hidden style={RIM_STYLE} />
                <div style={{ position: 'relative', ...contentStyle }}>{children}</div>
            </div>
        )
    },
)
