// The Liquid Glass stage's screens:
//
//   GlassIdle      a lock screen: the date, the time as a great slab of
//                  moulded glass refracting the flowing wallpaper, and below
//                  it glass widgets to join (the QR code, the session code),
//                  two round glass buttons in the corners
//   GlassUpNext    the next song like a now-playing card: its art floating
//                  over the wallpaper in its own colours, a glass label, the
//                  title and the singers in glass capsules. A surprise song is
//                  behind frosted glass.
//   GlassCountIn   the count as glass numerals over the wallpaper
//   GlassBreak, GlassPaused, GlassNoLyrics, GlassQrCard, GlassNowPlaying,
//   GlassSingerTag, GlassMicBody, GlassMeter
//
// Copy rule for every string here: no em dashes, ever.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { LG, sf } from '../../styles/liquid-glass'
import { textGlass } from './glassMaps'
import { GlassFilter, LiquidGlass, cssId } from './LiquidGlass'
import { GlassWallpaper, useArtPalette } from './GlassWallpaper'

// ── Scale ────────────────────────────────────────────────────────────────────
function useStageScale(): number {
    const [s, setS] = useState(() => window.innerHeight / 1080)
    useEffect(() => {
        const on = () => setS(window.innerHeight / 1080)
        window.addEventListener('resize', on)
        return () => window.removeEventListener('resize', on)
    }, [])
    return s
}

/** 1080p design pixels, scaled as one piece to the screen's height. (A
 *  transform is not a backdrop root, so glass inside still refracts.) */
export function Design({ children }: { children: ReactNode }) {
    const s = useStageScale()
    return (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(50% - 88.89vh)', width: '177.78vh' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${s})`, transformOrigin: '0 0' }}>{children}</div>
        </div>
    )
}

// ── Glyphs (drawn, never emoji) ─────────────────────────────────────────────
const glyph = (d: ReactNode, size: number, color: string, vb = 24): ReactNode => (
    <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {d}
    </svg>
)
export const Icon = {
    mic: (s = 26, c = LG.WHITE) => glyph(<><rect x="9" y="3" width="6" height="11" rx="3" fill={c} stroke="none" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" /></>, s, c),
    note: (s = 26, c = LG.WHITE) => glyph(<><path d="M9 18V5.5l11-2.5v12.5" /><circle cx="6.5" cy="18" r="2.5" fill={c} stroke="none" /><circle cx="17.5" cy="15.5" r="2.5" fill={c} stroke="none" /></>, s, c),
    pause: (s = 26, c = LG.WHITE) => glyph(<><rect x="6" y="5" width="4" height="14" rx="1.4" fill={c} stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1.4" fill={c} stroke="none" /></>, s, c),
    wave: (s = 26, c = LG.WHITE) => glyph(<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />, s, c),
    qr: (s = 26, c = LG.WHITE) => glyph(<><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><path d="M14 14h2v2M20 14v6h-6M17 18h0" /></>, s, c),
}

// ── Glass lettering ─────────────────────────────────────────────────────────

/** Text moulded in glass: each glyph refracts what's behind it, rounding over
 *  at its edges, frosted a touch and lit on its upper-left rims. */
export function GlassText({
    text,
    size,
    weight = 700,
    tint = 'rgba(255,255,255,0.16)',
    style,
    className,
}: {
    text: string
    size: number
    weight?: number
    tint?: string
    style?: CSSProperties
    className?: string
}) {
    const font = `${weight} ${size}px ${LG.FONT}`
    const g = useMemo(() => textGlass(text, font, { pad: Math.round(size * 0.12), bezel: Math.max(6, size * 0.07), refract: Math.max(8, size * 0.1) }), [text, font, size])
    const id = useMemo(() => cssId('t' + text + size + Math.random()), [text, size])
    const mask: CSSProperties = { WebkitMaskImage: `url(${g.mask})`, WebkitMaskSize: '100% 100%', maskImage: `url(${g.mask})`, maskSize: '100% 100%' }
    return (
        <div className={className} style={{ position: 'relative', width: g.w, height: g.h, ...style }}>
            <GlassFilter id={id} map={g} w={g.w} h={g.h} chroma={0.06} blur={1.1} saturate={1.5} />
            {/* a soft shadow under the glyphs gives them weight on bright wallpaper */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, ...mask, background: 'rgba(0,0,0,0.16)', transform: `translateY(${size * 0.02}px)`, filter: `blur(${size * 0.02}px)` }} />
            <div aria-hidden style={{ position: 'absolute', inset: 0, ...mask, backdropFilter: `url(#${id})`, WebkitBackdropFilter: `url(#${id})` }} />
            <div aria-hidden style={{ position: 'absolute', inset: 0, ...mask, background: tint }} />
            <img aria-hidden src={g.spec} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        </div>
    )
}

// ── Idle: the lock screen ───────────────────────────────────────────────────

function useClock(): Date {
    const [d, setD] = useState(() => new Date())
    useEffect(() => {
        const t = setInterval(() => setD(new Date()), 15000)
        return () => clearInterval(t)
    }, [])
    return d
}

export function GlassIdle({ qrUrl, sessionCode }: { qrUrl: string | null; sessionCode: string | null }) {
    const now = useClock()
    const time = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`
    const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    return (
        <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: '#0B1240' }}>
            <GlassWallpaper speed={0.18} />
            <Design>
                <div style={{ position: 'absolute', left: 0, right: 0, top: 118, textAlign: 'center', ...sf(36, 600, 'rgba(255,255,255,0.9)', { textShadow: '0 1px 12px rgba(0,0,0,0.2)' }) }}>{date}</div>
                <div className="lg-rise" style={{ position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', justifyContent: 'center' }}>
                    <GlassText text={time} size={330} weight={700} tint="rgba(255,255,255,0.26)" />
                </div>

                {/* the widgets */}
                <div className="lg-rise" style={{ position: 'absolute', left: 0, right: 0, top: 590, display: 'flex', justifyContent: 'center', gap: 34, animationDelay: '0.12s' }}>
                    <LiquidGlass radius={48} bezel={34} refract={24} blur={2.2} tint="rgba(255,255,255,0.08)" contentStyle={{ width: 330, height: 330, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 262, height: 262, borderRadius: 30, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}>
                            {qrUrl ? <img src={qrUrl} alt="QR" style={{ width: 230, height: 230, display: 'block' }} /> : null}
                        </div>
                    </LiquidGlass>
                    <LiquidGlass radius={48} bezel={34} refract={24} blur={2.2} tint="rgba(255,255,255,0.08)" contentStyle={{ width: 600, height: 330, padding: '36px 46px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(180deg, #FF5E8A, #FF2D55)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' }}>{Icon.mic(24)}</span>
                            <span style={{ ...sf(22, 600, LG.SOFT, { textTransform: 'uppercase', letterSpacing: '0.06em' }) }}>Karaoke</span>
                            <span style={{ ...sf(20, 500, LG.FAINT), marginLeft: 'auto' }}>now</span>
                        </div>
                        <div style={{ ...sf(54, 700), marginTop: 22 }}>Scan to join</div>
                        <div style={{ ...sf(26, 500, LG.SOFT), marginTop: 8 }}>then pick a song on your phone</div>
                        {sessionCode ? (
                            // Pinned to the widget's foot with a guaranteed gap above
                            // it (the column is sized so the code can't reach the
                            // line above: 36 + 40 + 22 + 59 + 8 + 29 + 24 + 56 < 330).
                            <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <span style={{ ...sf(22, 600, LG.FAINT) }}>or enter</span>
                                <LiquidGlass radius="capsule" bezel={20} refract={14} blur={1.2} tint="rgba(255,255,255,0.12)" shadow={false} contentStyle={{ padding: '10px 24px', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ ...LG.digits, fontSize: 36, lineHeight: 1, fontWeight: 700, color: LG.WHITE, letterSpacing: '0.12em' }}>{sessionCode}</span>
                                </LiquidGlass>
                            </div>
                        ) : null}
                    </LiquidGlass>
                </div>

                {/* the corner buttons, as on a lock screen */}
                {[
                    { left: 150, icon: Icon.mic(34) },
                    { left: 1920 - 150 - 104, icon: Icon.note(34) },
                ].map((b, i) => (
                    <div key={i} className="lg-rise" style={{ position: 'absolute', left: b.left, top: 930, animationDelay: `${0.2 + i * 0.06}s` }}>
                        <LiquidGlass radius="capsule" bezel={30} refract={18} blur={1.8} tint="rgba(255,255,255,0.1)" contentStyle={{ width: 104, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {b.icon}
                        </LiquidGlass>
                    </div>
                ))}
                <div style={{ position: 'absolute', left: 0, right: 0, top: 1000, textAlign: 'center', ...sf(22, 500, LG.FAINT) }}>Waiting for the first song</div>
            </Design>
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

function fit(base: number, text: string, max: number, min = 0.5): number {
    const n = text.length
    return n <= max ? base : Math.max(base * min, (base * max) / n)
}

export function GlassUpNext({ art, track, singers, np, roles, guestsMap, showVideo = false }: UpNextProps) {
    const hidden = !!np?.isHidden
    const palette = useArtPalette(hidden ? null : art)
    const title = hidden ? 'A surprise song' : track?.name || ''
    const artist = (track?.artists || []).map((a: any) => a.name).join(', ')
    const size = fit(92, title, 16, 0.6)
    // Portaled to <body>: this renders inside .k-lyrics, whose fade mask is a
    // backdrop root (glass inside it would refract nothing).
    return createPortal(
        <>
            {!showVideo && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
                    <GlassWallpaper colors={palette} speed={0.24} />
                </div>
            )}
            <div style={{ position: 'fixed', inset: 0, zIndex: 11, pointerEvents: 'none' }}>
                <Design>
                    <div className="lg-rise" style={{ position: 'absolute', left: 200, top: 196 }}>
                        <div style={{ position: 'relative', width: 540, height: 540, borderRadius: 44, overflow: 'hidden', boxShadow: '0 40px 90px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.25)' }}>
                            {art && !hidden ? <img src={art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${palette[2]}, ${palette[4]})` }} />}
                            <div style={{ position: 'absolute', inset: 0, borderRadius: 44, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), inset 0 0 0 1px rgba(255,255,255,0.12)' }} />
                        </div>
                        {hidden ? (
                            <LiquidGlass radius={44} bezel={60} refract={34} blur={14} tint="rgba(255,255,255,0.12)" style={{ position: 'absolute', inset: 0 }} contentStyle={{ width: 540, height: 540, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ ...sf(220, 700, 'rgba(255,255,255,0.9)') }}>?</span>
                            </LiquidGlass>
                        ) : null}
                    </div>
                    {/* 840 wide: ends at 1680, clear of the singer column down the right edge */}
                    <div className="lg-rise" style={{ position: 'absolute', left: 840, top: 260, width: 840, animationDelay: '0.1s' }}>
                        <LiquidGlass radius="capsule" bezel={20} refract={14} blur={1.2} tint="rgba(255,255,255,0.12)" style={{ display: 'inline-block' }} contentStyle={{ padding: '10px 26px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            {Icon.wave(24)}
                            <span style={{ ...sf(24, 600) }}>Up next</span>
                        </LiquidGlass>
                        {/* long titles wrap to two lines rather than run off the screen */}
                        <div style={{ ...sf(size, 700), lineHeight: 1.06, marginTop: 36, textShadow: '0 2px 24px rgba(0,0,0,0.25)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', paddingBottom: '0.08em' }}>{title}</div>
                        <div style={{ ...sf(42, 500, LG.SOFT), marginTop: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hidden ? 'Revealed when it plays' : artist}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 56 }}>
                            {singers.map((s: any, i: number) => {
                                const g = s.guestId ? guestsMap.get(s.guestId) : undefined
                                const nm: string = g?.name ?? s.name
                                const pic: string | null = g?.profile_picture ?? null
                                const roleStr = !hidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0 ? s.roleIndices.map((ri: number) => roles[ri]).filter(Boolean).join(' & ') : ''
                                return (
                                    <LiquidGlass key={s.id ?? i} radius="capsule" bezel={24} refract={16} blur={1.6} tint="rgba(255,255,255,0.1)" contentStyle={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 28px 10px 10px' }}>
                                        <Avatar picture={pic} name={nm} color={s.color} size={54} />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ ...sf(30, 650 as number) }}>{nm}</span>
                                            {roleStr ? <span style={{ ...sf(19, 500, LG.FAINT), marginTop: 2 }}>as {roleStr}</span> : null}
                                        </div>
                                    </LiquidGlass>
                                )
                            })}
                        </div>
                    </div>
                </Design>
            </div>
        </>,
        document.body,
    )
}

export function Avatar({ picture, name, color, size }: { picture: string | null; name: string; color: string; size: number }) {
    return (
        <span style={{ position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: `linear-gradient(160deg, color-mix(in srgb, ${color} 70%, white), ${color})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 2px rgba(255,255,255,0.55), 0 4px 12px rgba(0,0,0,0.25)` }}>
            {picture ? <img src={picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ ...sf(size * 0.44, 700, LG.INK) }}>{(name || '?').slice(0, 1).toUpperCase()}</span>}
        </span>
    )
}

// ── Count-in: glass numerals ────────────────────────────────────────────────

export function GlassCountIn({
    remaining,
    count,
    className,
    innerRef,
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
    const mark = go ? 'Sing' : count <= 3 ? String(count) : ''
    const box = useRef<HTMLDivElement | null>(null)
    const over = useRef<HTMLDivElement>(null)
    // The in-flow box keeps the count's place in the lyrics; the glass itself is
    // portaled out of .k-lyrics (whose fade mask is a backdrop root) and kept
    // sitting exactly over that box as the lyrics scroll.
    useEffect(() => {
        let raf = 0
        const tick = () => {
            raf = requestAnimationFrame(tick)
            const r = box.current?.getBoundingClientRect()
            if (r && over.current) {
                over.current.style.top = `${r.top}px`
                over.current.style.height = `${r.height}px`
            }
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [])
    const setRef = (el: HTMLDivElement | null) => {
        box.current = el
        if (typeof innerRef === 'function') innerRef(el)
        else if (innerRef) (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    }
    const h = Math.round(window.innerHeight * (go ? 0.19 : 0.25))
    return (
        <div ref={setRef} className={className} style={{ width: '100%', height: '38vh', margin: '4vh 0 2vh' }}>
            {createPortal(
                // Numerals only: the now-playing chip up in the corner already
                // names the song, so a second title capsule here only crowded it.
                <div ref={over} className={className} style={{ position: 'fixed', left: 0, right: 0, top: 0, height: 0, zIndex: 12, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ height: h * 1.05, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {mark ? <GlassText key={mark} className="lg-pop" text={mark} size={h} weight={700} tint="rgba(255,255,255,0.34)" /> : null}
                    </div>
                </div>,
                document.body,
            )}
        </div>
    )
}

// ── Instrumental, paused, no lyrics ─────────────────────────────────────────

export function GlassBreak({ progress }: { progress: number }) {
    const p = Math.min(1, Math.max(0, progress))
    return (
        <LiquidGlass className="lg-rise" radius="capsule" bezel={26} refract={18} blur={1.6} tint="rgba(255,255,255,0.1)" contentStyle={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 34px 14px 24px' }}>
            {Icon.wave(30)}
            <span style={{ ...sf(28, 650 as number) }}>Instrumental</span>
            <div style={{ position: 'relative', width: 260, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p * 100}%`, borderRadius: 4, background: '#fff', transition: 'width 0.3s linear' }} />
            </div>
        </LiquidGlass>
    )
}

export function GlassPaused({ stageFont }: { stageFont: (px: number) => string }) {
    return (
        <LiquidGlass className="lg-rise" radius="capsule" bezel={26} refract={18} blur={1.8} tint="rgba(255,255,255,0.1)" contentStyle={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 34px 14px 26px' }}>
            {Icon.pause(30)}
            <span style={{ ...sf(0, 650 as number, LG.WHITE, { fontSize: stageFont(30) }) }}>Paused</span>
        </LiquidGlass>
    )
}

export function GlassNoLyrics({ stageFont }: { stageFont: (px: number) => string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LiquidGlass className="lg-rise" radius="capsule" bezel={28} refract={20} blur={2} tint="rgba(255,255,255,0.1)" contentStyle={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 40px 18px 30px' }}>
                {Icon.mic(32)}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ ...sf(0, 700, LG.WHITE, { fontSize: stageFont(34) }) }}>Sing it your way</span>
                    <span style={{ ...sf(20, 500, LG.SOFT), marginTop: 4 }}>No lyrics for this one</span>
                </div>
            </LiquidGlass>
        </div>
    )
}

// ── QR card, song chip, singer tags ─────────────────────────────────────────

export function GlassQrCard({ qr }: { qr: string }) {
    return (
        <LiquidGlass className="k-qr-card" radius={30} bezel={24} refract={16} blur={1.6} tint="rgba(255,255,255,0.1)" contentStyle={{ padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 120, height: 120, borderRadius: 18, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={qr} alt="QR" style={{ width: 104, height: 104, display: 'block' }} />
            </div>
            <span style={{ ...sf(15, 600, LG.SOFT) }}>Scan to join</span>
        </LiquidGlass>
    )
}

/** The song as a floating glass capsule, its art in a disc. */
export function GlassNowPlaying({ art, title, artist }: { art: string | null | undefined; title: string; artist: string }) {
    return (
        <LiquidGlass className="lg-rise" radius="capsule" bezel={26} refract={18} blur={1.8} tint="rgba(255,255,255,0.09)" style={{ maxWidth: 'min(40vw, 620px)' }} contentStyle={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 30px 9px 9px' }}>
            {art ? <img src={art} alt="" style={{ width: 58, height: 58, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 0 1.5px rgba(255,255,255,0.45)' }} /> : null}
            <div style={{ minWidth: 0 }}>
                <div style={{ ...sf(22, 650 as number, LG.WHITE, { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>{title}</div>
                <div style={{ ...sf(16, 500, LG.SOFT, { marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>{artist}</div>
            </div>
            <span className="lg-eq" aria-hidden style={{ display: 'inline-flex', gap: 3, alignItems: 'flex-end', height: 20, marginLeft: 6 }}>
                {[0, 1, 2, 3].map(i => (
                    <i key={i} style={{ display: 'block', width: 4, height: 20, borderRadius: 2, background: LG.WHITE, animationDelay: `${i * 0.13}s` }} />
                ))}
            </span>
        </LiquidGlass>
    )
}

export function GlassSingerTag({ children, index }: { children: ReactNode; color: string; index: number }) {
    return (
        <LiquidGlass className="lg-rise" radius="capsule" bezel={20} refract={14} blur={1.6} tint="rgba(255,255,255,0.09)" style={{ animationDelay: `${index * 0.07}s` }} contentStyle={{ display: 'flex', alignItems: 'center', padding: '6px 18px 6px 6px' }}>
            {children}
        </LiquidGlass>
    )
}

/** The mic level as four little bars, like a voice memo's meter. */
export function GlassMeter({ level, color }: { level: number; color: string }) {
    const v = Math.min(1, level * 2.6)
    return (
        <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', gap: 2.5, height: 22 }}>
            {[0.55, 1, 0.75, 0.45].map((k, i) => (
                <i key={i} style={{ display: 'block', width: 3.5, borderRadius: 2, height: 4 + 18 * Math.min(1, v * k * 1.4), background: color, transition: 'height 0.08s linear' }} />
            ))}
        </span>
    )
}

export function GlassMicBody({ name, picture, color, meter }: { name: string; picture: string | null; color: string; meter: ReactNode }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Avatar picture={picture} name={name} color={color} size={32} />
            <span style={{ ...sf(18, 600) }}>{name}</span>
            {meter}
        </span>
    )
}
