// The pencil test's parts, as React components over the drawn sprites:
//
//   Mark          any drawn mark (ring, underline, arrow, check, scribble...)
//                 tinted to a pencil colour
//   PencilBox     a pencilled box around anything (nine-sliced, so its
//                 corners keep their overshoot at any size)
//   Tape          a strip of masking tape
//   TapedPhoto    a print taped to the sheet (album art, a QR code, a face)
//   Pencil        a real pencil lying on the desk
//   Ball          the bouncing ball: graphite drawing + the singer's colour
//   FormField     a printed field of the exposure sheet, filled in by hand
//
// Copy rule for every string here: no em dashes, ever.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { SK, skHash } from '../../styles/sketch'
import { ART, BALL, BOX_BORDER } from './parts'

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

/** Shantell Sans: lettering in ink. */
export function letter(size: number, color: string = SK.INK, weight = 800, extra?: CSSProperties): CSSProperties {
    return { fontFamily: SK.FONT_LETTER, fontWeight: weight, fontSize: size, color, lineHeight: 1.08, letterSpacing: '0.004em', ...extra }
}
/** Just Another Hand: the animator's pencil notes. */
export function note(size: number, color: string = SK.GRAPHITE, extra?: CSSProperties): CSSProperties {
    return { fontFamily: SK.FONT_NOTE, fontWeight: 400, fontSize: size, color, lineHeight: 0.92, letterSpacing: '0.03em', ...extra }
}
/** The exposure sheet's printed labels: a plain sans, small capitals. */
export function printed(size: number, color: string = SK.FORM, extra?: CSSProperties): CSSProperties {
    return { fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", fontWeight: 700, fontSize: size, color, letterSpacing: '0.16em', textTransform: 'uppercase', lineHeight: 1, ...extra }
}

/** Pencil grain over vector lines and lettering, so they read as pencil. */
export const GRAIN: CSSProperties = {
    WebkitMaskImage: `url(${ART.grain})`,
    WebkitMaskSize: '256px 256px',
    maskImage: `url(${ART.grain})`,
    maskSize: '256px 256px',
}

// ── Marks ────────────────────────────────────────────────────────────────────

/** A drawn mark, tinted. `src` is a white alpha mask from the generator. */
export function Mark({ src, color = SK.GRAPHITE, width, height, style, className }: { src: string; color?: string; width: number; height: number; style?: CSSProperties; className?: string }) {
    return (
        <span
            aria-hidden
            className={className}
            style={{
                display: 'block',
                width,
                height,
                background: color,
                WebkitMaskImage: `url(${src})`,
                WebkitMaskSize: '100% 100%',
                maskImage: `url(${src})`,
                maskSize: '100% 100%',
                pointerEvents: 'none',
                ...style,
            }}
        />
    )
}

/** A loop drawn around something: absolutely placed over its parent. */
export function Ring({ color = SK.RED, variant = 0, pad = 0.18, style }: { color?: string; variant?: number; pad?: number; style?: CSSProperties }) {
    return (
        <span
            aria-hidden
            style={{
                position: 'absolute',
                left: `${-pad * 100}%`,
                right: `${-pad * 100}%`,
                top: `${-pad * 120}%`,
                bottom: `${-pad * 120}%`,
                background: color,
                WebkitMaskImage: `url(${ART.ring[variant % ART.ring.length]})`,
                WebkitMaskSize: '100% 100%',
                pointerEvents: 'none',
                ...style,
            }}
        />
    )
}

/** A pencilled box around its children. The box's corners overshoot, the way
 *  a box drawn fast in four strokes does. */
export function PencilBox({
    children,
    color = SK.GRAPHITE,
    border = 18,
    style,
    contentStyle,
}: {
    children: ReactNode
    color?: string
    border?: number
    style?: CSSProperties
    contentStyle?: CSSProperties
}) {
    return (
        <div style={{ position: 'relative', ...style }}>
            <span
                aria-hidden
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: color,
                    // mask-box-image nine-slices the mask: corners stay put, edges stretch
                    WebkitMaskBoxImage: `url(${ART.box}) ${BOX_BORDER} / ${border}px stretch`,
                    pointerEvents: 'none',
                } as CSSProperties}
            />
            <div style={{ position: 'relative', padding: border * 0.9, ...contentStyle }}>{children}</div>
        </div>
    )
}

// ── Tape, prints, pencils ────────────────────────────────────────────────────

export function Tape({ width = 120, angle = 0, variant = 0, style }: { width?: number; angle?: number; variant?: number; style?: CSSProperties }) {
    return (
        <img
            src={ART.tape[variant % ART.tape.length]}
            alt=""
            draggable={false}
            style={{ position: 'absolute', width, height: width * (92 / 300), transform: `rotate(${angle}deg)`, pointerEvents: 'none', ...style }}
        />
    )
}

/** A print taped to the sheet: a white border, the lightest shadow, two
 *  pieces of tape across opposite corners. */
export function TapedPhoto({
    src,
    size,
    angle = 0,
    seed = 'photo',
    border = 10,
    children,
    style,
}: {
    src?: string | null
    size: number
    angle?: number
    seed?: string
    border?: number
    children?: ReactNode
    style?: CSSProperties
}) {
    const h = (k: number) => skHash(seed, k)
    const tw = Math.max(70, size * 0.42)
    return (
        <div style={{ position: 'relative', width: size, height: size, transform: `rotate(${angle}deg)`, ...style }}>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: '#FBFAF6',
                    padding: border,
                    boxShadow: '0 1px 1px rgba(40,34,24,0.22), 0 6px 14px rgba(40,34,24,0.16)',
                }}
            >
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#D9D4C8' }}>
                    {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
                    {children}
                </div>
            </div>
            <Tape width={tw} variant={Math.floor(h(1) * 3)} angle={-38 + h(2) * 10} style={{ left: -tw * 0.32, top: -tw * 0.08 }} />
            <Tape width={tw} variant={Math.floor(h(3) * 3)} angle={-40 + h(4) * 12} style={{ right: -tw * 0.32, bottom: -tw * 0.06 }} />
        </div>
    )
}

export function Pencil({ kind = 'hb', length = 520, angle = 0, style }: { kind?: 'hb' | 'blue' | 'red'; length?: number; angle?: number; style?: CSSProperties }) {
    return (
        <img
            src={ART.pencil[kind]}
            alt=""
            draggable={false}
            style={{ position: 'absolute', width: length, height: length * (102 / 1044), transform: `rotate(${angle}deg)`, transformOrigin: '50% 50%', pointerEvents: 'none', ...style }}
        />
    )
}

// ── The ball ─────────────────────────────────────────────────────────────────

/** Sprite size for a ball drawn `d` px across. */
export function ballSprite(d: number): number {
    return (d * BALL.size) / (2 * BALL.radius)
}

/** The ball, drawn `d` across, its colour worked in with `color` pencil. */
export function Ball({ d, color = SK.RED, style, className }: { d: number; color?: string; style?: CSSProperties; className?: string }) {
    const S = ballSprite(d)
    return (
        <div aria-hidden className={className} style={{ position: 'relative', width: S, height: S, pointerEvents: 'none', ...style }}>
            <img src={ART.ball} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            <span
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: color,
                    WebkitMaskImage: `url(${ART.ballTone})`,
                    WebkitMaskSize: '100% 100%',
                    mixBlendMode: 'multiply',
                }}
            />
        </div>
    )
}

/** An onion skin of the ball: one light lap of pencil. */
export function Ghost({ d, color = SK.BLUE, style }: { d: number; color?: string; style?: CSSProperties }) {
    const S = ballSprite(d)
    return <Mark src={ART.ballGhost} color={color} width={S} height={S} style={style} />
}

// ── The exposure sheet ───────────────────────────────────────────────────────

/** A printed field of the exposure sheet with its label, filled in by hand. */
export function FormField({ label, children, width, style }: { label: string; children: ReactNode; width?: number | string; style?: CSSProperties }) {
    return (
        <div style={{ position: 'relative', width, borderBottom: `1.5px solid ${SK.FORM}`, paddingTop: 4, ...style }}>
            <div style={{ ...printed(11, SK.FORM, { marginBottom: 6 }) }}>{label}</div>
            <div style={{ minHeight: 10 }}>{children}</div>
        </div>
    )
}

/** Tally marks for a level 0..1: up to four strokes and the fifth across. */
export function Tally({ level, color = SK.GRAPHITE, h = 26 }: { level: number; color?: string; h?: number }) {
    const n = Math.max(0, Math.min(5, Math.round(level * 5)))
    const w = h * 0.95
    return (
        <span aria-hidden style={{ position: 'relative', display: 'inline-block', width: w, height: h, ...GRAIN }}>
            {[0, 1, 2, 3].map(i => (
                <span
                    key={i}
                    style={{
                        position: 'absolute',
                        left: 2 + i * (w / 4.3),
                        top: 1 + (i % 2) * 1.5,
                        width: 2.6,
                        height: h - 3 - (i % 2) * 2,
                        borderRadius: 2,
                        background: color,
                        transform: `rotate(${(i - 1.5) * 2.2}deg)`,
                        opacity: i < n ? 1 : 0.13,
                        transition: 'opacity 0.12s',
                    }}
                />
            ))}
            <span
                style={{
                    position: 'absolute',
                    left: -2,
                    top: h * 0.46,
                    width: w + 4,
                    height: 2.6,
                    borderRadius: 2,
                    background: color,
                    transform: 'rotate(-24deg)',
                    opacity: n >= 5 ? 1 : 0,
                    transition: 'opacity 0.12s',
                }}
            />
        </span>
    )
}
