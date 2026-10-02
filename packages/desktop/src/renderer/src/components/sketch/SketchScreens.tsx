// The pencil test's screens:
//
//   SketchIdle      a sheet on the light table: the title roughed in blue and
//                   inked syllable by syllable as the ball bounces across it
//                   (then the sheet flips and it starts again), the classic
//                   bouncing-ball spacing chart drawn along the foot, the join
//                   code taped to the sheet, pencils on the desk
//   SketchUpNext    the next song as a scene on the exposure sheet: its art
//                   taped up as reference, title, artist and cast filled in by
//                   hand, the ball waiting on the first letter. A secret song
//                   is a sheet turned face down.
//   SketchCountIn   the ball bounces over the count, inking each number
//   SketchBreak     the exposure sheet's "hold": a wavy line drawn out over
//                   the instrumental, the ball resting at its end
//   SketchPaused, SketchNoLyrics, SketchQrCard, SketchSongChip,
//   SketchSingerTag, SketchMicBody, SketchMeter
//
// Copy rule for every string here: no em dashes, ever.
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { SK, skHash } from '../../styles/sketch'
import { ART } from './parts'
import { BallRig, hopAt, type RigHandle, type Target } from './ballRig'
import { Ball, Design, FormField, GRAIN, Ghost, Mark, Pencil, Tally, TapedPhoto, Tape, letter, note, printed } from './PencilParts'

/** Title size that fits `text` in roughly `max` characters at `base` px. */
function fit(base: number, text: string, max: number, min = 0.5): number {
    const n = text.length
    return n <= max ? base : Math.max(base * min, (base * max) / n)
}

// ── The sheet ────────────────────────────────────────────────────────────────

/** The paper on the light table. With `multiply`, it lies over a video so the
 *  footage shows through faintly, like a reference traced on a light box. */
export function Sheet({ multiply = false }: { multiply?: boolean }) {
    return (
        <div
            aria-hidden
            style={{
                position: 'absolute',
                inset: 0,
                background: `${SK.PAPER} url(${ART.paper}) center / cover no-repeat`,
                mixBlendMode: multiply ? 'multiply' : undefined,
            }}
        />
    )
}

/** Printed exposure-sheet header: production, scene, sheet. */
function SheetHeader({ x, y, scene, sheet }: { x: number; y: number; scene: string; sheet: string }) {
    return (
        <div style={{ position: 'absolute', left: x, top: y, display: 'flex', gap: 22, alignItems: 'flex-end' }}>
            <FormField label="Production" width={290}>
                <span style={{ ...note(40, SK.GRAPHITE) }}>Karaoke night</span>
            </FormField>
            <FormField label="Scene" width={96}>
                <span style={{ ...note(40, SK.GRAPHITE) }}>{scene}</span>
            </FormField>
            <FormField label="Sheet" width={96}>
                <span style={{ ...note(40, SK.GRAPHITE) }}>{sheet}</span>
            </FormField>
        </div>
    )
}

// ── The bounce chart ─────────────────────────────────────────────────────────

/** The bouncing ball as every animator first draws it: a decaying bounce,
 *  each frame in its place along the arcs, the keys drawn up and numbered
 *  in circles, the in-betweens as light onion skins. */
function BounceChart({ x, y, w, h, d = 50 }: { x: number; y: number; w: number; h: number; d?: number }) {
    // three bounces, each lower and shorter; frames at even time steps
    const frames: Array<{ fx: number; fy: number; key: 'contact' | 'apex' | null; sq: number }> = []
    const bounces = [
        { len: 0.42, hgt: 1.0 },
        { len: 0.32, hgt: 0.58 },
        { len: 0.26, hgt: 0.32 },
    ]
    let x0 = 0
    let n = 1
    bounces.forEach((b, bi) => {
        const steps = bi === 0 ? 10 : bi === 1 ? 8 : 6
        for (let i = bi === 0 ? 0 : 1; i <= steps; i++) {
            const u = i / steps
            const fx = x0 + b.len * u
            const fy = 4 * u * (1 - u) * b.hgt
            const key = i === 0 || i === steps ? 'contact' : i === steps / 2 ? 'apex' : null
            frames.push({ fx, fy, key, sq: key === 'contact' ? 0.72 : 1 })
            n++
        }
        x0 += b.len
    })
    const total = x0
    const px = (fx: number) => (fx / total) * (w - d) + d / 2
    const py = (fy: number) => h - fy * (h - d)
    return (
        <div style={{ position: 'absolute', left: x, top: y, width: w, height: h + 70 }}>
            {/* the ground line, ruled */}
            <div style={{ position: 'absolute', left: -20, right: -30, top: h, height: 3, borderRadius: 2, background: SK.GRAPHITE, opacity: 0.7, ...GRAIN }} />
            {frames.map((f, i) => {
                const cx = px(f.fx)
                const cy = py(f.fy)
                const isKey = f.key !== null
                return (
                    <div key={i}>
                        {isKey ? (
                            <Ball
                                d={d}
                                color={SK.RED}
                                style={{
                                    position: 'absolute',
                                    left: cx - (d * 1.3) / 2,
                                    top: cy - d * 1.3 + (d * 1.3 - d) / 2,
                                    transform: f.key === 'contact' ? `scale(${1 / f.sq}, ${f.sq})` : undefined,
                                    transformOrigin: '50% 89%',
                                }}
                            />
                        ) : (
                            <Ghost d={d} color={SK.BLUE} style={{ position: 'absolute', left: cx - (d * 1.3) / 2, top: cy - d * 1.3 + (d * 1.3 - d) / 2, opacity: 0.55 }} />
                        )}
                        <span style={{ position: 'absolute', left: cx - 14, top: h + 14, width: 28, textAlign: 'center', ...note(26, isKey ? SK.RED : SK.GRAPHITE_SOFT) }}>{i + 1}</span>
                        {isKey && <Mark src={ART.ringRound} color={SK.RED} width={40} height={40} style={{ position: 'absolute', left: cx - 20, top: h + 6 }} />}
                    </div>
                )
            })}
            <span style={{ position: 'absolute', left: px(0.42) - 40, top: h + 50, ...note(30, SK.RED) }}>squash</span>
            <span style={{ position: 'absolute', left: px(0.21) + 26, top: py(1) - 10, ...note(30, SK.BLUE) }}>slow in, slow out</span>
            <Mark src={ART.arrow[1]} color={SK.BLUE} width={90} height={62} style={{ position: 'absolute', left: px(0.21) - 70, top: py(1) - 6, transform: 'scaleX(-1) rotate(10deg)' }} />
        </div>
    )
}

// ── Idle ─────────────────────────────────────────────────────────────────────

const IDLE_SYLLABLES = ['Fol', 'low ', 'the ', 'boun', 'cing ', 'ball']
const IDLE_STEP = 520
const IDLE_HOLD = 2200
const IDLE_BACK = 760
const IDLE_CYCLE = IDLE_STEP * (IDLE_SYLLABLES.length - 1) + IDLE_HOLD + IDLE_BACK

export function SketchIdle({ qrUrl, sessionCode }: { qrUrl: string | null; sessionCode: string | null }) {
    const rig = useRef<RigHandle>(null)
    const syl = useRef<Array<HTMLSpanElement | null>>([])
    useEffect(() => {
        let raf = 0
        const t0 = performance.now() + 900
        const tick = () => {
            raf = requestAnimationFrame(tick)
            const els = syl.current
            if (!rig.current || els.some(e => !e)) return
            const t = performance.now() - t0
            const c = Math.floor(t / IDLE_CYCLE)
            const at = (k: number, cycle: number): Target => {
                const r = (els[k] as HTMLSpanElement).getBoundingClientRect()
                return { x: r.left + r.width * 0.42, y: r.top + r.height * 0.2, t: cycle * IDLE_CYCLE + k * IDLE_STEP }
            }
            const targets: Target[] = IDLE_SYLLABLES.map((_, k) => at(k, c))
            targets.push(at(0, c + 1))
            const hop = hopAt(targets, t)
            const d = ((els[3] as HTMLSpanElement).getBoundingClientRect().height || 160) * 0.3
            rig.current.draw({ now: t, hop, d, color: SK.RED, visible: t > -600 })
            // inked once the ball has landed on it this time round; a fresh
            // sheet (all roughs again) as the ball heads back to the start
            const local = t - c * IDLE_CYCLE
            els.forEach((e, k) => {
                const inked = t >= 0 && local >= k * IDLE_STEP && local < IDLE_CYCLE - IDLE_BACK * 0.6
                const want = inked ? 'sk-ink' : 'sk-rough'
                if (e && e.dataset.state !== want) {
                    e.dataset.state = want
                    e.className = 'sk-idle-syl ' + want
                }
            })
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [])

    return (
        <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: SK.PAPER }}>
            <Sheet />
            <Design>
                <SheetHeader x={110} y={96} scene="01" sheet="1" />
                <div className="sk-in" style={{ position: 'absolute', right: 170, top: 104, transform: 'rotate(3deg)' }}>
                    <span style={{ position: 'relative', display: 'inline-block', padding: '0 14px', ...note(52, SK.RED) }}>
                        pencil test
                        <Mark src={ART.ring[2]} color={SK.RED} width={300} height={104} style={{ position: 'absolute', left: -30, top: -18 }} />
                    </span>
                </div>

                {/* the title: lettering guidelines in blue, then the words */}
                <div style={{ position: 'absolute', left: 130, top: 300, width: 1150 }}>
                    <div aria-hidden style={{ position: 'absolute', left: -30, right: -20, top: 108, height: 170, ...GRAIN }}>
                        {[0, 0.27, 0.86].map((f, i) => (
                            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${f * 100}%`, height: 2, background: SK.BLUE, opacity: i === 1 ? 0.35 : 0.55 }} />
                        ))}
                    </div>
                    <div style={{ position: 'relative', transform: 'rotate(-1.2deg)', transformOrigin: '0 50%' }}>
                        <div style={{ ...letter(84, SK.INK, 700), whiteSpace: 'nowrap' }}>
                            {IDLE_SYLLABLES.slice(0, 3).map((s, k) => (
                                <span key={k} ref={e => { syl.current[k] = e }} className="sk-idle-syl sk-rough">{s}</span>
                            ))}
                        </div>
                        <div style={{ ...letter(168, SK.INK, 800, { marginTop: 4, letterSpacing: '-0.01em' }), whiteSpace: 'nowrap' }}>
                            {IDLE_SYLLABLES.slice(3).map((s, k) => (
                                <span key={k} ref={e => { syl.current[k + 3] = e }} className="sk-idle-syl sk-rough">{s}</span>
                            ))}
                        </div>
                    </div>
                    <div style={{ position: 'absolute', left: 500, top: 330, display: 'flex', alignItems: 'flex-start', gap: 8, transform: 'rotate(-2deg)' }}>
                        <Mark src={ART.arrow[0]} color={SK.GRAPHITE} width={130} height={62} style={{ transform: 'scaleY(-1) rotate(-16deg)', marginTop: -26 }} />
                        <span style={{ ...note(46, SK.GRAPHITE) }}>sing each word as the ball lands on it</span>
                    </div>
                </div>

                {/* the join code, taped to the sheet */}
                <div className="sk-in" style={{ position: 'absolute', left: 1370, top: 250, animationDelay: '0.2s' }}>
                    <div style={{ position: 'relative', width: 400, transform: 'rotate(2.4deg)' }}>
                        <div style={{ background: '#FDFCF8', padding: '26px 30px 22px', boxShadow: '0 1px 1px rgba(40,34,24,0.22), 0 10px 22px rgba(40,34,24,0.16)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ ...letter(40, SK.INK, 800) }}>Scan to join</span>
                            {qrUrl ? <img src={qrUrl} alt="QR" style={{ width: 300, height: 300, display: 'block', marginTop: 14, mixBlendMode: 'multiply' }} /> : <div style={{ width: 300, height: 300 }} />}
                            <span style={{ ...note(32, SK.GRAPHITE_SOFT, { marginTop: 10 }) }}>then pick a song on your phone</span>
                        </div>
                        <Tape width={170} variant={0} angle={-6} style={{ left: 115, top: -30 }} />
                        <Tape width={120} variant={2} angle={38} style={{ right: -38, bottom: 18 }} />
                    </div>
                    {sessionCode && (
                        <div style={{ position: 'relative', marginTop: 60, marginLeft: 40, transform: 'rotate(-2deg)' }}>
                            <span style={{ ...note(34, SK.GRAPHITE) }}>or enter the code</span>
                            <div style={{ position: 'relative', display: 'inline-block', marginLeft: 22 }}>
                                <span style={{ ...letter(56, SK.INK, 800, { letterSpacing: '0.08em' }) }}>{sessionCode}</span>
                                <Mark src={ART.ring[0]} color={SK.RED} width={300} height={130} style={{ position: 'absolute', left: -36, top: -32 }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* the reference every animator draws first */}
                <BounceChart x={150} y={706} w={1080} h={210} />

                <Pencil kind="hb" length={600} angle={-14} style={{ left: 1310, top: 950 }} />
                <Pencil kind="blue" length={520} angle={72} style={{ left: -240, top: 360 }} />
            </Design>
            <BallRig ref={rig} z={5} />
        </div>
    )
}

// ── Up next ──────────────────────────────────────────────────────────────────

interface UpNextProps {
    art: string | null
    track: any
    singers: any[]
    np: any
    roles: string[]
    guestsMap: Map<string, any>
    showVideo?: boolean
}

export function SketchUpNext({ art, track, singers, np, roles, guestsMap, showVideo = false }: UpNextProps) {
    const hidden = !!np?.isHidden
    const title = hidden ? 'A secret scene' : track?.name || ''
    const artist = (track?.artists || []).map((a: any) => a.name).join(', ')
    const titleSize = fit(96, title, 18, 0.45)
    const seed = String(track?.id || title)
    // Portaled to <body>: this renders inside .k-lyrics, whose fade mask would
    // otherwise eat the top and bottom of a full-screen layer.
    return createPortal(
        <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
                <Sheet multiply={showVideo} />
            </div>
            <div style={{ position: 'fixed', inset: 0, zIndex: 11, pointerEvents: 'none' }}>
                <Design>
                    <SheetHeader x={110} y={96} scene="next" sheet="1" />
                    <div className="sk-in" style={{ position: 'absolute', left: 0, right: 0, top: 96, display: 'flex', justifyContent: 'center' }}>
                        <span style={{ position: 'relative', display: 'inline-block', transform: 'rotate(-3deg)', ...letter(70, SK.RED, 800) }}>
                            Up next!
                            <Mark src={ART.underline[2]} color={SK.RED} width={300} height={36} style={{ position: 'absolute', left: -10, bottom: -26 }} />
                        </span>
                    </div>

                    {/* the reference, taped up */}
                    <div className="sk-in" style={{ position: 'absolute', left: 190, top: 300, animationDelay: '0.08s' }}>
                        <TapedPhoto src={hidden ? null : art} size={500} angle={-3} seed={seed} border={14}>
                            {hidden || !art ? (
                                <div style={{ position: 'absolute', inset: 0, background: '#F3EFE6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    {hidden ? (
                                        <>
                                            <Mark src={ART.scribble} color={SK.GRAPHITE} width={330} height={86} style={{ opacity: 0.85 }} />
                                            <span style={{ ...letter(170, SK.RED, 800, { marginTop: -10 }) }}>?</span>
                                            <span style={{ ...note(40, SK.GRAPHITE) }}>no peeking</span>
                                        </>
                                    ) : (
                                        <Mark src={ART.note} color={SK.GRAPHITE} width={150} height={212} />
                                    )}
                                </div>
                            ) : null}
                        </TapedPhoto>
                        <span style={{ position: 'absolute', left: 300, top: -54, ...note(36, SK.GRAPHITE_SOFT, { transform: 'rotate(-3deg)', whiteSpace: 'nowrap' }) }}>{hidden ? 'face down until it plays' : 'reference'}</span>
                    </div>

                    {/* the scene, filled in on the exposure sheet */}
                    <div className="sk-in" style={{ position: 'absolute', left: 820, top: 300, width: 940, animationDelay: '0.16s' }}>
                        <FormField label="Scene" style={{ paddingBottom: 14 }}>
                            <span style={{ position: 'relative', display: 'inline-block', ...letter(titleSize, SK.INK, 800), whiteSpace: 'nowrap', maxWidth: 940, overflow: 'visible' }}>
                                <span className="sk-wait" style={{ position: 'absolute', left: titleSize * 0.2, top: titleSize * 0.17, width: 0, height: 0 }}>
                                    <Ball d={titleSize * 0.36} color={singers[0]?.color || SK.RED} style={{ position: 'absolute', left: -(titleSize * 0.36 * 1.3) / 2, top: -(titleSize * 0.36 * 1.3) * 0.89 }} />
                                </span>
                                {title}
                            </span>
                        </FormField>
                        <FormField label="Artist" style={{ marginTop: 26, paddingBottom: 8 }}>
                            <span style={{ ...note(54, SK.GRAPHITE) }}>{hidden ? 'revealed when it plays' : artist}</span>
                        </FormField>
                        <FormField label="Cast" style={{ marginTop: 26, paddingBottom: 12 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 40px', alignItems: 'center' }}>
                                {singers.map((s: any, i: number) => {
                                    const g = s.guestId ? guestsMap.get(s.guestId) : undefined
                                    const nm: string = g?.name ?? s.name
                                    const roleStr = !hidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                                        ? s.roleIndices.map((ri: number) => roles[ri]).filter(Boolean).join(' & ')
                                        : ''
                                    return (
                                        <div key={s.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <Mark src={ART.swatch} color={s.color} width={50} height={50} style={{ transform: `rotate(${skHash(nm) * 60}deg)` }} />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ ...letter(44, SK.INK, 800) }}>{nm}</span>
                                                {roleStr && <span style={{ ...note(28, SK.GRAPHITE_SOFT) }}>as {roleStr}</span>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </FormField>
                    </div>

                    <Pencil kind="red" length={560} angle={-6} style={{ left: 1290, top: 960 }} />
                </Design>
            </div>
        </>,
        document.body,
    )
}

// ── Count-in: the ball bounces over the count ────────────────────────────────

const COUNT_SLOT = 190

export function SketchCountIn({
    remaining,
    count,
    barPct,
    trackName,
    className,
    innerRef,
    stageFont,
}: {
    remaining: number
    count: number
    barPct: number
    trackName: string
    art: string | null
    className: string
    innerRef: React.Ref<HTMLDivElement>
    stageFont: (px: number) => string
}) {
    const go = remaining <= 0
    // which mark the ball is on: before the count, 3, 2, 1, then "Sing!"
    const at = go ? 3 : count <= 3 ? 3 - count : -1
    const marks = ['3', '2', '1']
    const d = 40
    const ballX = (i: number) => (i < 0 ? -110 : i * COUNT_SLOT + COUNT_SLOT / 2)
    return (
        <div ref={innerRef} className={className} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '9vh 0 5vh' }}>
            <div className="sk-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ ...printed(13, SK.FORM, { marginBottom: 10 }) }}>Count in</span>
                <span style={{ ...letter(0, SK.GRAPHITE, 700, { fontSize: stageFont(34), maxWidth: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>{trackName}</span>
                <div style={{ position: 'relative', width: COUNT_SLOT * 4, height: 210, marginTop: 30 }}>
                    {[...marks, 'Sing!'].map((m, i) => {
                        const inked = at >= i
                        return (
                            <span
                                key={i}
                                className={inked ? 'sk-ink-in' : undefined}
                                style={{
                                    position: 'absolute',
                                    left: i * COUNT_SLOT,
                                    width: i === 3 ? COUNT_SLOT * 1.5 : COUNT_SLOT,
                                    top: 60,
                                    textAlign: i === 3 ? 'left' : 'center',
                                    ...letter(i === 3 ? 96 : 120, inked ? (i === 3 ? SK.RED : SK.INK) : SK.BLUE, 800),
                                    ...(inked ? {} : { ...GRAIN, opacity: 0.85 }),
                                }}
                            >
                                {m}
                            </span>
                        )
                    })}
                    {/* the ball: across at a steady speed, up and down under gravity */}
                    <div style={{ position: 'absolute', left: 0, top: 70, transform: `translateX(${ballX(at)}px)`, transition: 'transform 0.44s linear' }}>
                        <div key={at} className={at >= 0 ? 'sk-hop' : 'sk-wait'} style={{ position: 'absolute', left: 0, top: 0 }}>
                            <Ball d={d} color={SK.RED} style={{ position: 'absolute', left: -(d * 1.3) / 2, top: -(d * 1.3) * 0.89 }} />
                        </div>
                    </div>
                    <Mark
                        src={ART.underline[0]}
                        color={SK.RED}
                        width={COUNT_SLOT * 3.6}
                        height={40}
                        style={{ position: 'absolute', left: 20, top: 196, clipPath: `inset(0 ${100 - Math.min(100, Math.max(0, barPct))}% 0 0)`, transition: 'clip-path 0.3s linear', opacity: 0.8 }}
                    />
                </div>
            </div>
        </div>
    )
}

// ── Instrumental: hold ───────────────────────────────────────────────────────

export function SketchBreak({ progress }: { progress: number }) {
    const p = Math.min(1, Math.max(0, progress))
    const W = 460
    const d = 30
    return (
        <div className="sk-in" style={{ position: 'relative', transform: 'rotate(-1.2deg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 30, padding: '16px 34px 14px 30px', background: `linear-gradient(180deg, ${SK.SHEET}, #F3F0E7)`, boxShadow: '0 1px 1px rgba(40,34,24,0.2), 0 10px 24px rgba(40,34,24,0.18)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ ...letter(40, SK.INK, 800) }}>Instrumental</span>
                <span style={{ ...note(30, SK.GRAPHITE_SOFT, { marginTop: 2 }) }}>hold for the music</span>
            </div>
            <div style={{ position: 'relative', width: W, height: 64 }}>
                <span style={{ position: 'absolute', left: 0, top: -6, ...note(34, SK.RED) }}>hold</span>
                <Mark src={ART.holdLine} color={SK.GRAPHITE} width={W} height={W * (70 / 900)} style={{ position: 'absolute', left: 0, top: 30, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`, transition: 'clip-path 0.3s linear' }} />
                <div style={{ position: 'absolute', left: p * W, top: 30 + W * (35 / 900), transition: 'left 0.3s linear' }}>
                    <div className="sk-wait" style={{ position: 'absolute', left: 0, top: 0 }}>
                        <Ball d={d} color={SK.RED} style={{ position: 'absolute', left: -(d * 1.3) / 2, top: -(d * 1.3) * 0.89 }} />
                    </div>
                </div>
            </div>
            </div>
            <Tape width={120} variant={0} angle={-4} style={{ left: 'calc(50% - 60px)', top: -20 }} />
        </div>
    )
}

// ── Paused ───────────────────────────────────────────────────────────────────

export function SketchPaused({ stageFont }: { stageFont: (px: number) => string }) {
    return (
        <div className="sk-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', padding: '12px 64px', transform: 'rotate(-2deg)' }}>
                <img src={ART.tape[1]} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                <span style={{ position: 'relative', ...letter(0, SK.INK, 800, { fontSize: stageFont(36) }) }}>Paused</span>
            </div>
            <span style={{ ...note(32, SK.RED, { marginTop: 8 }) }}>holding this frame</span>
        </div>
    )
}

// ── No lyrics ────────────────────────────────────────────────────────────────

export function SketchNoLyrics({ stageFont }: { stageFont: (px: number) => string }) {
    return (
        <div className="sk-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <Mark src={ART.note} color={SK.GRAPHITE} width={84} height={119} style={{ transform: 'rotate(-8deg)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ ...note(34, SK.BLUE) }}>no lyrics on this sheet</span>
                <span style={{ ...letter(0, SK.INK, 800, { fontSize: stageFont(46) }) }}>Sing it from memory</span>
            </div>
        </div>
    )
}

// ── QR card ──────────────────────────────────────────────────────────────────

/** The join code on a card taped to the corner of the sheet. */
export function SketchQrCard({ qr }: { qr: string }) {
    return (
        <div className="k-qr-card" style={{ position: 'relative', transform: 'rotate(-3deg)' }}>
            <div style={{ background: '#FDFCF8', padding: '10px 10px 6px', boxShadow: '0 1px 1px rgba(40,34,24,0.22), 0 6px 14px rgba(40,34,24,0.16)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img src={qr} alt="QR" style={{ width: 104, height: 104, display: 'block', mixBlendMode: 'multiply' }} />
                <span style={{ ...note(26, SK.GRAPHITE, { marginTop: 4 }) }}>join</span>
            </div>
            <Tape width={86} variant={1} angle={4} style={{ left: 22, top: -16 }} />
        </div>
    )
}

// ── Song chip / singer tags ──────────────────────────────────────────────────

export function SketchSongChip({ art, title, artist }: { art: string | null | undefined; title: string; artist: string }) {
    return (
        <div className="sk-in" style={{ display: 'flex', alignItems: 'center', gap: 16, maxWidth: 'min(40vw, 600px)' }}>
            {art ? (
                <div style={{ position: 'relative', flexShrink: 0, transform: 'rotate(-3deg)' }}>
                    <div style={{ background: '#FBFAF6', padding: 5, boxShadow: '0 1px 1px rgba(40,34,24,0.22), 0 4px 10px rgba(40,34,24,0.14)' }}>
                        <img src={art} alt="" style={{ width: 66, height: 66, objectFit: 'cover', display: 'block' }} />
                    </div>
                    <Tape width={58} variant={2} angle={-30} style={{ left: -18, top: -6 }} />
                </div>
            ) : null}
            <div style={{ minWidth: 0 }}>
                <div style={{ ...letter(26, SK.INK, 800, { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>{title}</div>
                <div style={{ ...note(28, SK.GRAPHITE_SOFT, { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>{artist}</div>
            </div>
        </div>
    )
}

export function SketchSingerTag({ children, index }: { children: ReactNode; color: string; index: number }) {
    return (
        <div className="sk-in" style={{ animationDelay: `${index * 0.08}s`, padding: '2px 4px' }}>
            {children}
        </div>
    )
}

/** The mic level as tally marks in the singer's pencil. */
export function SketchMeter({ level, color }: { level: number; color: string }) {
    return <Tally level={Math.min(1, level * 2.6)} color={color} h={24} />
}

/** Name, a swatch of their pencil and the tally: the sketch MicMeter body. */
export function SketchMicBody({ name, picture, color, meter }: { name: string; picture: string | null; color: string; meter: ReactNode }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            {meter}
            {picture ? (
                <span style={{ position: 'relative', display: 'inline-block', width: 32, height: 32 }}>
                    <img src={picture} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', filter: 'grayscale(0.2)' }} />
                    <Mark src={ART.ringRound} color={SK.GRAPHITE} width={44} height={44} style={{ position: 'absolute', left: -6, top: -6 }} />
                </span>
            ) : (
                <Mark src={ART.swatch} color={color} width={28} height={28} />
            )}
            <span style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ ...letter(24, SK.INK, 800) }}>{name}</span>
                <Mark src={ART.underline[1]} color={color} width={Math.max(50, name.length * 13)} height={12} style={{ position: 'absolute', left: -2, bottom: -7, opacity: 0.9 }} />
            </span>
        </span>
    )
}
