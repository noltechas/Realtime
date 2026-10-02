// The Vox Engine's parts, as React components over the rendered sprites:
//
//   Gear / GearTrain   meshing gears, turned by the engine clock
//   Porthole           a riveted brass porthole with its glass; anything
//                      inside it is seen through the window
//   Gauge              a pressure gauge whose needle reads the room's voice
//                      (or any 0..1 reading)
//   StationClock       a clock telling the real time
//   Plaque             a deep green enamel panel in a riveted brass frame
//   Pipe, SteamVent    copper pipe runs, and steam blowing off them
//   Airship            a dirigible drifting past the windows
//   JewelLamp          a glass jewel lamp in a brass bezel: a singer's colour
//
// Copy rule for every string here: no em dashes, ever.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ST } from '../../styles/steampunk'
import { ART, GEARS, gearGeometry, type PlacedGear } from './parts'
import { onBurst, registerGear, registerNeedle, retainEngine } from './engine'

/** Run the engine (gears, needles, --vox) while mounted. */
export function useEngine(): void {
    useEffect(() => retainEngine(), [])
}

// ── Scale ────────────────────────────────────────────────────────────────────
// Screens are drawn in 1080p design pixels and scaled as one piece to the
// screen's height, centred.
function useStageScale(): number {
    const [s, setS] = useState(() => window.innerHeight / 1080)
    useEffect(() => {
        const on = () => setS(window.innerHeight / 1080)
        window.addEventListener('resize', on)
        return () => window.removeEventListener('resize', on)
    }, [])
    return s
}

export function Design({ children }: { children: ReactNode }) {
    const s = useStageScale()
    return (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(50% - 88.89vh)', width: '177.78vh' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${s})`, transformOrigin: '0 0' }}>{children}</div>
        </div>
    )
}

// ── Type ─────────────────────────────────────────────────────────────────────

/** Abril Fatface: the nameplate's fat face. */
export function display(size: number, color: string = ST.PARCHMENT, extra?: CSSProperties): CSSProperties {
    return { fontFamily: ST.FONT_DISPLAY, fontWeight: 400, fontSize: size, color, lineHeight: 1.06, letterSpacing: '0.01em', ...extra }
}
/** Old Standard engraved capitals. */
export function caps(size: number, color: string = ST.BRASS_HI, extra?: CSSProperties): CSSProperties {
    return { fontFamily: ST.FONT_BODY, fontWeight: 700, fontSize: size, color, letterSpacing: '0.24em', textTransform: 'uppercase', ...extra }
}
export function body(size: number, color: string = ST.PARCHMENT_DIM, extra?: CSSProperties): CSSProperties {
    return { fontFamily: ST.FONT_BODY, fontWeight: 400, fontSize: size, color, ...extra }
}
/** Lettering cast in brass: raised, lit from above. */
export const BRASS_TEXT: CSSProperties = {
    backgroundImage: `linear-gradient(180deg, ${ST.BRASS_SHEEN} 0%, ${ST.BRASS_HI} 30%, ${ST.BRASS} 62%, ${ST.BRASS_DEEP} 100%)`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.55)) drop-shadow(0 0 1px rgba(0,0,0,0.6))',
}

// ── Gears ────────────────────────────────────────────────────────────────────

/** One gear and its shadow, centred on (x, y), turning with the engine. */
export function Gear({ g, shadow = 10, style }: { g: PlacedGear; shadow?: number; style?: CSSProperties }) {
    const { size } = gearGeometry(g.teeth)
    const S = size * g.scale
    const body = useRef<HTMLImageElement>(null)
    const shade = useRef<HTMLImageElement>(null)
    useEffect(() => {
        const offs: Array<() => void> = []
        if (body.current) offs.push(registerGear(body.current, g.phase, g.dir, g.ratio))
        if (shade.current) offs.push(registerGear(shade.current, g.phase, g.dir, g.ratio))
        return () => offs.forEach((f) => f())
    }, [g.phase, g.dir, g.ratio])
    const art = GEARS[g.teeth]
    const box: CSSProperties = { position: 'absolute', left: g.x - S / 2, top: g.y - S / 2, width: S, height: S, pointerEvents: 'none', ...style }
    return (
        <>
            {shadow > 0 && <img ref={shade} src={art.shadow} alt="" style={{ ...box, left: box.left as number + shadow * 0.6, top: box.top as number + shadow, opacity: 0.85 }} />}
            <img ref={body} src={art.src} alt="" style={box} />
        </>
    )
}

export function GearTrain({ gears, shadow = 10 }: { gears: PlacedGear[]; shadow?: number }) {
    return (
        <>
            {gears.map((g, i) => (
                <Gear key={i} g={g} shadow={shadow} />
            ))}
        </>
    )
}

// ── Porthole ─────────────────────────────────────────────────────────────────

/** The porthole's glass opening, as a fraction of its size (generator: the
 *  opening is 0.62 of the bezel's outer radius, which is S/2 - 4). */
const OPENING = 0.62 * (376 / 380)

export function Porthole({ size, children, style, glass = true }: { size: number; children?: ReactNode; style?: CSSProperties; glass?: boolean }) {
    const o = (size * OPENING) / 2
    return (
        <div style={{ position: 'relative', width: size, height: size, filter: 'drop-shadow(0 18px 26px rgba(0,0,0,0.65))', ...style }}>
            <div style={{ position: 'absolute', left: size / 2 - o - 2, top: size / 2 - o - 2, width: o * 2 + 4, height: o * 2 + 4, borderRadius: '50%', overflow: 'hidden', background: '#0B0907' }}>{children}</div>
            <img src={ART.porthole} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            {glass && <img src={ART.portholeGlass} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />}
        </div>
    )
}

// ── Gauge ────────────────────────────────────────────────────────────────────

/** A pressure gauge. With no `reading` the needle reads the room's voice. */
export function Gauge({ size, reading, style }: { size: number; reading?: () => number; style?: CSSProperties }) {
    const needle = useRef<HTMLImageElement>(null)
    const readRef = useRef(reading)
    readRef.current = reading
    useEffect(() => {
        if (!needle.current) return
        return registerNeedle(needle.current, readRef.current ? () => readRef.current!() : undefined)
    }, [])
    const inset = size * (45 / 520)
    return (
        <div style={{ position: 'relative', width: size, height: size, filter: 'drop-shadow(0 14px 20px rgba(0,0,0,0.6))', ...style }}>
            <img src={ART.gaugeDial} alt="" style={{ position: 'absolute', left: inset, top: inset, width: size - inset * 2, height: size - inset * 2 }} />
            <img ref={needle} src={ART.gaugeNeedle} alt="" style={{ position: 'absolute', left: inset, top: inset, width: size - inset * 2, height: size - inset * 2, transform: 'rotate(-135deg)' }} />
            <div style={{ position: 'absolute', left: inset, top: inset, width: size - inset * 2, height: size - inset * 2, borderRadius: '50%', background: 'radial-gradient(ellipse 60% 40% at 34% 24%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 60%), radial-gradient(circle, rgba(0,0,0,0) 70%, rgba(0,0,0,0.28) 100%)', pointerEvents: 'none' }} />
            <img src={ART.gaugeBezel} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        </div>
    )
}

/** A small gauge for a singer's tag: the needle set from props each render. */
export function MiniGauge({ size, value }: { size: number; value: number }) {
    const inset = size * (45 / 520)
    const a = -135 + 270 * Math.max(0, Math.min(1, value))
    return (
        <span style={{ position: 'relative', display: 'inline-block', width: size, height: size, flexShrink: 0 }}>
            <img src={ART.gaugeDial} alt="" style={{ position: 'absolute', left: inset, top: inset, width: size - inset * 2, height: size - inset * 2 }} />
            <img src={ART.gaugeNeedle} alt="" style={{ position: 'absolute', left: inset, top: inset, width: size - inset * 2, height: size - inset * 2, transform: `rotate(${a.toFixed(1)}deg)`, transition: 'transform 90ms linear' }} />
            <img src={ART.gaugeBezel} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        </span>
    )
}

// ── Station clock ────────────────────────────────────────────────────────────

export function StationClock({ size, style }: { size: number; style?: CSSProperties }) {
    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 15000)
        return () => clearInterval(t)
    }, [])
    const m = now.getMinutes() + now.getSeconds() / 60
    const h = (now.getHours() % 12) + m / 60
    const inset = size * (40 / 520)
    const face: CSSProperties = { position: 'absolute', left: inset, top: inset, width: size - inset * 2, height: size - inset * 2 }
    return (
        <div style={{ position: 'relative', width: size, height: size, filter: 'drop-shadow(0 14px 20px rgba(0,0,0,0.6))', ...style }}>
            <img src={ART.clockDial} alt="" style={face} />
            <img src={ART.clockHour} alt="" style={{ ...face, transform: `rotate(${(h * 30).toFixed(1)}deg)`, transition: 'transform 1s ease' }} />
            <img src={ART.clockMinute} alt="" style={{ ...face, transform: `rotate(${(m * 6).toFixed(1)}deg)`, transition: 'transform 1s ease' }} />
            <div style={{ ...face, borderRadius: '50%', background: 'radial-gradient(ellipse 60% 40% at 34% 24%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 60%)' }} />
            <img src={ART.clockBezel} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        </div>
    )
}

// ── Plaque ───────────────────────────────────────────────────────────────────

/** Deep green enamel in a riveted brass frame (the frame is a nine-slice of
 *  the rendered frame-brass sprite, so its rivets repeat along any length). */
export function Plaque({ children, border = 22, style, contentStyle, className }: { children: ReactNode; border?: number; style?: CSSProperties; contentStyle?: CSSProperties; className?: string }) {
    return (
        <div
            className={className}
            style={{
                position: 'relative',
                borderStyle: 'solid',
                borderColor: 'transparent',
                borderWidth: border,
                borderImage: `url("${ART.frameBrass}") 48 round`,
                background: `linear-gradient(180deg, ${ST.ENAMEL_HI} 0%, ${ST.ENAMEL} 45%, ${ST.ENAMEL_LO} 100%) padding-box`,
                boxShadow: '0 16px 34px rgba(0,0,0,0.6)',
                ...style,
            }}
        >
            <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,236,200,0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', ...contentStyle }}>{children}</div>
        </div>
    )
}

// ── Pipes and steam ──────────────────────────────────────────────────────────

/** A copper pipe run with brass couplings every so often. */
export function Pipe({ x, y, length, d = 46, vertical = false, every = 300, style }: { x: number; y: number; length: number; d?: number; vertical?: boolean; every?: number; style?: CSSProperties }) {
    const couplings = Math.max(0, Math.floor(length / every))
    const cw = d * (54 / 60)
    const ch = d * (86 / 60)
    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y - d / 2,
                width: length,
                height: d,
                transformOrigin: `0 ${d / 2}px`,
                transform: vertical ? 'rotate(90deg)' : undefined,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.55))',
                ...style,
            }}
        >
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${ART.pipe}")`, backgroundSize: `auto ${d * (68 / 60)}px`, backgroundPosition: `0 ${-d * (4 / 60)}px`, backgroundRepeat: 'repeat-x' }} />
            {Array.from({ length: couplings }, (_, i) => (
                <img key={i} src={ART.pipeCoupling} alt="" style={{ position: 'absolute', left: (i + 0.5) * (length / couplings) - cw / 2, top: d / 2 - ch / 2, width: cw, height: ch }} />
            ))}
        </div>
    )
}

/** Steam blowing off a vent: a few puffs rising and spreading on a loop, and a
 *  big blast whenever the engine blows off (a belted note, "Full steam"). */
export function SteamVent({ x, y, scale = 1, period = 7, delay = 0, angle = 0 }: { x: number; y: number; scale?: number; period?: number; delay?: number; angle?: number }) {
    const [blast, setBlast] = useState(0)
    useEffect(() => onBurst(() => setBlast((b) => b + 1)), [])
    return (
        <div aria-hidden style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, transform: `rotate(${angle}deg)`, pointerEvents: 'none' }}>
            {[0, 1, 2].map((i) => (
                <img
                    key={i}
                    src={ART.steam[i % 3]}
                    alt=""
                    className="st-puff"
                    style={{ position: 'absolute', left: -60 * scale, top: -60 * scale, width: 120 * scale, height: 120 * scale, animationDuration: `${period}s`, animationDelay: `${delay + (i * period) / 3}s` }}
                />
            ))}
            {blast > 0 &&
                [0, 1, 2, 3].map((i) => (
                    <img
                        key={`${blast}-${i}`}
                        src={ART.steam[(i + blast) % 3]}
                        alt=""
                        className="st-blast"
                        style={{ position: 'absolute', left: -90 * scale, top: -90 * scale, width: 180 * scale, height: 180 * scale, animationDelay: `${i * 0.09}s` }}
                    />
                ))}
        </div>
    )
}

/** A dirigible crossing slowly, small and hazed by distance. */
export function Airship({ y, width, duration, delay = 0, opacity = 0.6 }: { y: number; width: number; duration: number; delay?: number; opacity?: number }) {
    return (
        <img
            src={ART.airship}
            alt=""
            className="st-airship"
            style={{
                position: 'absolute',
                top: y,
                left: 0,
                width,
                opacity,
                filter: 'blur(1.4px) sepia(0.3) brightness(0.85)',
                animationDuration: `${duration}s`,
                animationDelay: `${-delay}s`,
            }}
        />
    )
}

// ── Jewel lamp ───────────────────────────────────────────────────────────────

/** A cut-glass jewel lamp in a brass bezel, lit in a singer's colour. */
export function JewelLamp({ color, size = 28, lit = true }: { color: string; size?: number; lit?: boolean }) {
    return (
        <span
            style={{
                position: 'relative',
                display: 'inline-block',
                width: size,
                height: size,
                borderRadius: '50%',
                flexShrink: 0,
                background: `radial-gradient(circle at 36% 30%, ${ST.BRASS_SHEEN} 0%, ${ST.BRASS_HI} 26%, ${ST.BRASS} 55%, ${ST.BRASS_LO} 100%)`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
            }}
        >
            <span
                style={{
                    position: 'absolute',
                    inset: size * 0.16,
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 38% 34%, #FFFFFF 0%, color-mix(in srgb, ${color}, #FFFFFF 45%) 18%, ${color} 52%, color-mix(in srgb, ${color}, #000000 55%) 100%)`,
                    boxShadow: lit ? `0 0 ${size * 0.5}px color-mix(in srgb, ${color}, transparent 30%), inset 0 -2px 3px rgba(0,0,0,0.4)` : 'inset 0 -2px 3px rgba(0,0,0,0.5)',
                    opacity: lit ? 1 : 0.55,
                }}
            />
        </span>
    )
}
