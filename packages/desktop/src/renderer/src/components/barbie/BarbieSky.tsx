// The painted set: Barbie Land on a sunny morning, as a scenic painter would
// lay it out on a soundstage. Used behind the idle screen and the up-next.
//
// Back to front:
//   sky        flat painted gradient, pool blue to pink to peach
//   sunburst   faint two-tone rays turning slowly round the sun
//   sun        the painted disc (its halo swells with the room's voices)
//   clouds     two rows of painted cumulus drifting at different speeds
//   mountains  the desert range, a lit face and a shadow face per peak
//   deck       pink terrazzo, then the pool's white coping
//   pool       painted water, its ripples white strokes that drift
//   walls      (idle) breeze-block walls framing the deck at each side
//   plane      (idle) a biplane towing the join message across the sky
//
// Everything lives in ONE coordinate space: 1080 design pixels tall, scaled to
// the screen's height, and as wide as the screen is (so a 21:9 display gets
// more sky, not a stretched one). Content passed as children is centred in a
// 1920-wide box inside it.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BARB, BARB_PAINT, BARB_TEX } from '../../styles/barbie'
import { BreezeWall, Cabana, Mountains, PaintedCloud, PaintedSun, PoolLadder, PoolRing, PoolWater, SkyBanner, TwinkleField, rng, useSunshine } from './BarbieParts'
import { setSunMood } from './sunshine'

// ── Scale ────────────────────────────────────────────────────────────────────

export function useSetScale(): { s: number; W: number } {
    const read = () => {
        const s = window.innerHeight / 1080
        return { s, W: Math.ceil(window.innerWidth / s) }
    }
    const [v, setV] = useState(read)
    useEffect(() => {
        const on = () => setV(read())
        window.addEventListener('resize', on)
        return () => window.removeEventListener('resize', on)
    }, [])
    return v
}

// ── Terrazzo ─────────────────────────────────────────────────────────────────

const TERRAZZO = (() => {
    const r = rng(0.271)
    let chips = ''
    // mostly pale chips with a few in the town's colours, small and dense
    const cols = ['#FFFFFF', '#FFFFFF', '#FFE3F0', '#FFE3F0', '#F6A3CC', '#F27DB9', '#FFE7A0', '#D9C3F5']
    for (let i = 0; i < 260; i++) {
        const x = r() * 200
        const y = r() * 200
        const w = 0.8 + Math.pow(r(), 2.2) * 4.2
        const h = w * (0.45 + r() * 0.6)
        chips += `<ellipse cx='${x.toFixed(1)}' cy='${y.toFixed(1)}' rx='${w.toFixed(1)}' ry='${h.toFixed(1)}' transform='rotate(${Math.round(r() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})' fill='${cols[Math.floor(r() * cols.length)]}'/>`
    }
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>${chips}</svg>`)}")`
})()

// ── Clouds ───────────────────────────────────────────────────────────────────

interface DriftCloud {
    width: number
    top: number
    seed: number
    dur: number
    delay: number
    tone: 'day' | 'blush'
    flip: boolean
}

function makeClouds(seed: number, n: number, band: [number, number], size: [number, number], speed: [number, number], tone: 'day' | 'blush'): DriftCloud[] {
    const r = rng(seed)
    return Array.from({ length: n }, (_, i) => {
        const dur = speed[0] + r() * (speed[1] - speed[0])
        return {
            width: size[0] + r() * (size[1] - size[0]),
            top: band[0] + r() * (band[1] - band[0]),
            seed: r(),
            dur,
            // spread them across the sky from the first frame
            delay: -((i + r() * 0.6) / n) * dur,
            tone,
            flip: r() < 0.5,
        }
    })
}

function CloudRow({ clouds, span }: { clouds: DriftCloud[]; span: number }) {
    return (
        <>
            {clouds.map((c, i) => (
                <div
                    key={i}
                    className="barb-drift"
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: c.top,
                        animationDuration: `${c.dur}s`,
                        animationDelay: `${c.delay}s`,
                        ['--barb-from' as string]: `${-c.width - 40}px`,
                        ['--barb-to' as string]: `${span + 40}px`,
                    } as React.CSSProperties}
                >
                    <PaintedCloud width={c.width} seed={c.seed} tone={c.tone} flip={c.flip} />
                </div>
            ))}
        </>
    )
}

// ── The set ──────────────────────────────────────────────────────────────────

export function BarbieSky({
    variant,
    showVideo = false,
    bannerMessages,
    children,
}: {
    variant: 'idle' | 'upnext'
    /** The up-next's video preview is on screen: the painted set steps back. */
    showVideo?: boolean
    bannerMessages?: string[]
    children?: ReactNode
}) {
    useSunshine()
    useEffect(() => {
        setSunMood('idle')
    }, [])
    const { s, W } = useSetScale()
    const idle = variant === 'idle'
    const far = useMemo(() => makeClouds(idle ? 0.12 : 0.44, Math.max(4, Math.round(W / 420)), [40, 300], [200, 320], [150, 210], 'blush'), [idle, W])
    const near = useMemo(() => makeClouds(idle ? 0.67 : 0.83, Math.max(3, Math.round(W / 640)), [150, 470], [320, 520], [95, 140], 'day'), [idle, W])
    const sun = idle ? { x: W * 0.5 + 640, y: 230, size: 330 } : { x: W * 0.5, y: 360, size: 0 }
    const horizon = idle ? 760 : 800
    const set = (
        <>
            {/* sky */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(180deg, ${BARB.SKY_TOP} 0%, ${BARB.SKY_MID} 30%, ${BARB.SKY_PINK} 56%, ${BARB.SKY_PEACH} 70%, ${BARB.SKY_PEACH} 100%)`,
                }}
            />
            {/* long brush drags through the painted sky */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${BARB_TEX.brush}")`, backgroundSize: '1200px 600px', opacity: 0.28, mixBlendMode: 'soft-light' }} />
            {/* the sunburst, two tones of light turning about the sun */}
            <div
                style={{
                    position: 'absolute',
                    left: sun.x - 1800,
                    top: sun.y - 1800,
                    width: 3600,
                    height: 3600,
                    WebkitMaskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.55) 22%, transparent 56%)',
                    maskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,0.55) 22%, transparent 56%)',
                    opacity: 0.85,
                }}
            >
                <div
                    className="barb-spin-slow"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.34) 0deg 7.5deg, rgba(255,255,255,0) 7.5deg 15deg)',
                    }}
                />
            </div>
            {idle && (
                <div style={{ position: 'absolute', left: sun.x - sun.size / 2, top: sun.y - sun.size / 2 }}>
                    <PaintedSun size={sun.size} rays="burst" />
                </div>
            )}
            <CloudRow clouds={far} span={W} />
            {/* the desert range on the horizon */}
            <div style={{ position: 'absolute', left: 0, top: horizon - 170, width: W, height: 170 }}>
                <Mountains width={W} height={170} seed={idle ? 0.61 : 0.29} />
            </div>
            <CloudRow clouds={near} span={W} />
            {/* the pink terrazzo deck */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    width: W,
                    top: horizon,
                    height: 1080 - horizon,
                    backgroundColor: '#FFBFDD',
                    backgroundImage: `linear-gradient(180deg, rgba(176,17,94,0.18), rgba(176,17,94,0) 30%), ${TERRAZZO}`,
                    backgroundSize: '100% 100%, 200px 200px',
                }}
            />
            {/* the pool: white coping, then painted water */}
            <div style={{ position: 'absolute', left: 0, width: W, top: horizon + 62, height: 18, background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 60%, #F2D4E5 100%)', boxShadow: '0 5px 0 rgba(31,168,204,0.45)' }} />
            <div style={{ position: 'absolute', left: 0, top: horizon + 80, width: W, height: 1080 - horizon - 80, overflow: 'hidden' }}>
                <PoolWater width={W} height={1080 - horizon - 80} seed={idle ? 0.4 : 0.73} />
                <TwinkleField seed={idle ? 0.9 : 0.15} count={Math.round(W / 140)} box={{ x: 2, y: 20, w: 96, h: 70 }} size={[12, 26]} colors={['#FFFFFF', '#FFFFFF', BARB.SUN_HI]} />
                {idle && <PoolRing width={210} className="barb-float" style={{ position: 'absolute', left: W * 0.5 + 420, top: 84 }} />}
            </div>
            {idle && <PoolLadder height={196} style={{ position: "absolute", left: W * 0.5 - 640, top: horizon + 4 }} />}
            {/* glitter in the sky near the sun */}
            <TwinkleField seed={idle ? 0.33 : 0.52} count={14} box={{ x: (sun.x / W) * 100 - 22, y: 4, w: 44, h: 46 }} size={[14, 34]} />
            {idle && (
                <>
                    <Cabana width={440} height={300} style={{ left: -40, top: horizon + 62 - 300 }} />
                    <BreezeWall width={460} height={300} flip clock style={{ right: -40, top: horizon + 62 - 300 }} />
                </>
            )}
            {/* paint tooth over the whole backdrop */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: BARB_PAINT, backgroundSize: '260px 260px', opacity: 0.35, mixBlendMode: 'overlay', pointerEvents: 'none' }} />
        </>
    )
    return (
        <div aria-hidden={!children} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: showVideo ? 'transparent' : BARB.SKY_PINK }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: 1080, transform: `scale(${s})`, transformOrigin: '0 0' }}>
                <div className={showVideo ? undefined : 'barb-scene-in'} style={{ position: 'absolute', inset: 0, opacity: showVideo ? 0 : 1, transition: 'opacity 0.7s ease' }}>
                    {set}
                </div>
                {showVideo && (
                    // With the clip playing behind, a pink scrim keeps the lettering readable.
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(224,33,138,0.35) 0%, rgba(224,33,138,0) 30%, rgba(224,33,138,0) 52%, rgba(122,16,78,0.6) 100%)' }} />
                )}
                {idle && bannerMessages && bannerMessages.length > 0 && (
                    <SkyBanner messages={bannerMessages} top={34} period={32} style={{ ['--barb-span' as string]: `${W}px` } as React.CSSProperties} />
                )}
                <div style={{ position: 'absolute', top: 0, left: (W - 1920) / 2, width: 1920, height: 1080 }}>{children}</div>
            </div>
        </div>
    )
}
