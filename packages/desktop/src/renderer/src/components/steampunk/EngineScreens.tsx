// The Vox Engine's screens:
//
//   EngineIdle      the engine at rest in its engine house: the join code in a
//                   riveted porthole, a train of brass and copper gears turning
//                   behind it, a pressure gauge reading the room, the station
//                   clock, copper pipes venting steam, airships past the windows
//   EngineUpNext    the next song in the porthole, the gears running up, its
//                   singers "at the controls", each with a jewel lamp in their
//                   colour. A surprise song is behind smoked glass.
//   EngineCountIn   building pressure: the needle climbs over the count, and on
//                   "Full steam!" the engine blows off
//   EngineBreak     intermission: the engine ticks over
//   EnginePaused    the engine idling
//   EngineNoLyrics, EngineQrCard, EngineSongChip, EngineSingerTag,
//   EngineMicBody, EngineGaugeMeter
//
// Copy rule for every string here: no em dashes, ever.
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ST } from '../../styles/steampunk'
import { ART, meshTrain } from './parts'
import { burst } from './engine'
import {
    Airship,
    BRASS_TEXT,
    Gauge,
    GearTrain,
    JewelLamp,
    MiniGauge,
    Pipe,
    Plaque,
    Porthole,
    StationClock,
    SteamVent,
    body,
    caps,
    display,
    useEngine,
    Design,
} from './EngineParts'

/** Shrink display type as a title gets longer, so any length sits on one line. */
const fit = (base: number, text: string, min: number, per = 1.6) => Math.max(min, Math.round(base - Math.max(0, (text || '').length - 12) * per))

/** The engine house behind everything: the out-of-focus hall, airships
 *  drifting past its windows. */
export function EngineHouse({ dim = 1 }: { dim?: number }) {
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: ST.HOUSE }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${ART.foundry}")`, backgroundSize: 'cover', backgroundPosition: 'center', filter: `brightness(${dim})` }} />
            <Design>
                <div style={{ position: 'absolute', inset: 0, WebkitMaskImage: `url("${ART.foundryWindows}")`, maskImage: `url("${ART.foundryWindows}")`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }}>
                    <Airship y={230} width={300} duration={150} delay={20} opacity={0.5 * dim} />
                    <Airship y={470} width={150} duration={210} delay={130} opacity={0.4 * dim} />
                </div>
            </Design>
        </div>
    )
}

/** A parchment roundel for the inside of a porthole (the join code card). */
function Parchment({ children }: { children: ReactNode }) {
    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 45% 40%, #F4E7C8 0%, #E6D3A8 62%, #C9B280 100%)' }}>
            {children}
        </div>
    )
}

// ── Idle ─────────────────────────────────────────────────────────────────────

export function EngineIdle({ qrUrl, sessionCode }: { qrUrl: string | null; sessionCode: string | null }) {
    useEngine()
    const gears = useMemo(
        () =>
            meshTrain(
                { teeth: 44, x: 690, y: 600, phase: 3 },
                [
                    { teeth: 24, deg: -38 },
                    { teeth: 32, deg: 8 },
                    { teeth: 18, deg: 84 },
                    { teeth: 14, from: 0, deg: 146 },
                ],
                1,
            ),
        [],
    )
    const P = { x: 960, y: 470, size: 560 }
    return (
        <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: ST.HOUSE }}>
            <EngineHouse />
            <Design>
                <GearTrain gears={gears} />

                {/* the pipework, and the steam it blows off */}
                <Pipe x={-20} y={990} length={1960} d={50} every={330} />
                <Pipe x={250} y={500} length={490} d={34} vertical every={240} />
                <SteamVent x={1240} y={958} scale={1.2} period={6.5} />
                <SteamVent x={120} y={958} scale={0.9} period={8} delay={2.4} />
                <SteamVent x={1770} y={958} scale={1} period={7.4} delay={4.1} />

                {/* the pressure gauge reads the room; the clock tells the time */}
                <div style={{ position: 'absolute', left: 250 - 160, top: 360 - 160 }}>
                    <Gauge size={320} />
                </div>
                <div className="st-rise" style={{ position: 'absolute', left: 250 - 120, top: 535, width: 240, display: 'flex', justifyContent: 'center' }}>
                    <Plaque border={12} contentStyle={{ padding: '4px 14px' }}>
                        <span style={{ ...caps(13, ST.BRASS_HI, { letterSpacing: '0.3em' }) }}>Room pressure</span>
                    </Plaque>
                </div>
                <div style={{ position: 'absolute', left: 1720 - 150, top: 740 - 150 }}>
                    <StationClock size={300} />
                </div>

                {/* the porthole, the join code inside it */}
                <div className="st-rise" style={{ position: 'absolute', left: P.x - P.size / 2, top: P.y - P.size / 2, animationDelay: '0.1s' }}>
                    <Porthole size={P.size}>
                        <Parchment>
                            <span style={{ ...caps(14, ST.INK, { letterSpacing: '0.32em', marginBottom: 8 }) }}>Scan to join</span>
                            {qrUrl ? <img src={qrUrl} alt="QR" style={{ width: 214, height: 214, display: 'block', mixBlendMode: 'multiply' }} /> : <div style={{ width: 214, height: 214 }} />}
                            <span style={{ ...body(16, ST.INK, { fontStyle: 'italic', marginTop: 8 }) }}>and sing to drive the engine</span>
                        </Parchment>
                    </Porthole>
                </div>

                {/* the maker's plate */}
                <div className="st-rise" style={{ position: 'absolute', left: 0, right: 0, top: 26, display: 'flex', justifyContent: 'center' }}>
                    <Plaque border={22} contentStyle={{ padding: '10px 54px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ ...caps(14, ST.BRASS_HI, { letterSpacing: '0.42em', marginRight: '-0.42em', whiteSpace: 'nowrap' }) }}>Hargreave &amp; Sons present</span>
                        <span style={{ ...display(64, ST.BRASS_HI, { marginTop: 2 }), ...BRASS_TEXT }}>The Vox Engine</span>
                    </Plaque>
                </div>

                {sessionCode && (
                    <div className="st-rise" style={{ position: 'absolute', left: 0, right: 0, top: P.y + P.size / 2 + 6, display: 'flex', justifyContent: 'center', animationDelay: '0.25s' }}>
                        <Plaque border={16} contentStyle={{ padding: '6px 30px 8px', display: 'flex', alignItems: 'baseline', gap: 16 }}>
                            <span style={{ ...caps(14, ST.BRASS_HI, { letterSpacing: '0.32em' }) }}>Engine No.</span>
                            <span style={{ ...display(44, ST.BRASS_HI, { letterSpacing: '0.12em' }), ...BRASS_TEXT }}>{sessionCode}</span>
                        </Plaque>
                    </div>
                )}
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

export function EngineUpNext({ art, track, singers, np, roles, guestsMap, showVideo = false }: UpNextProps) {
    useEngine()
    const hidden = !!np?.isHidden
    const title = hidden ? 'Sealed Orders' : track?.name || ''
    const artist = (track?.artists || []).map((a: any) => a.name).join(', ')
    const titleSize = fit(70, title, 40)
    const gears = useMemo(
        () =>
            meshTrain(
                { teeth: 32, x: 700, y: 470, phase: 7 },
                [
                    { teeth: 24, deg: -30 },
                    { teeth: 14, deg: 20 },
                    { teeth: 18, from: 0, deg: 150 },
                    { teeth: 10, from: 2, deg: 70 },
                ],
                1,
            ),
        [],
    )
    const P = { x: 960, y: 372, size: 500 }
    // Portaled to <body>: this renders inside .k-lyrics, whose fade mask would
    // otherwise eat the top and bottom of a full-screen layer.
    return createPortal(
        <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', opacity: showVideo ? 0 : 1, transition: 'opacity 0.8s ease' }}>
                <EngineHouse dim={0.78} />
            </div>
            {showVideo && <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 70% at 50% 45%, rgba(18,13,10,0.5), rgba(18,13,10,0.86))' }} />}
            <div style={{ position: 'fixed', inset: 0, zIndex: 11, pointerEvents: 'none' }}>
                <Design>
                    <GearTrain gears={gears} />
                    <SteamVent x={1330} y={560} scale={1} period={6} />
                    <div className="st-rise" style={{ position: 'absolute', left: 0, right: 0, top: 36, display: 'flex', justifyContent: 'center' }}>
                        <Plaque border={14} contentStyle={{ padding: '4px 28px' }}>
                            <span style={{ ...caps(15, ST.BRASS_HI, { letterSpacing: '0.42em', marginRight: '-0.42em', whiteSpace: 'nowrap' }) }}>Next on the engine</span>
                        </Plaque>
                    </div>
                    <div className="st-rise" style={{ position: 'absolute', left: P.x - P.size / 2, top: P.y - P.size / 2, animationDelay: '0.1s' }}>
                        <Porthole size={P.size}>
                            {hidden ? (
                                <div className="st-smoked" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ ...display(150, 'rgba(241,228,198,0.22)') }}>?</span>
                                </div>
                            ) : art ? (
                                <img src={art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'sepia(0.18) contrast(1.04)' }} />
                            ) : (
                                <Parchment>
                                    <span style={{ ...display(110, ST.INK) }}>&#9835;</span>
                                </Parchment>
                            )}
                        </Porthole>
                    </div>
                    <div className="st-rise" style={{ position: 'absolute', left: 0, right: 0, top: P.y + P.size / 2 + 18, display: 'flex', justifyContent: 'center', animationDelay: '0.2s' }}>
                        <Plaque border={22} style={{ maxWidth: 1500 }} contentStyle={{ padding: '10px 56px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h1 style={{ ...display(titleSize, ST.PARCHMENT, { margin: 0, whiteSpace: 'nowrap', textShadow: '0 2px 0 rgba(0,0,0,0.6)' }) }}>{title}</h1>
                            <div style={{ ...body(23, ST.PARCHMENT_DIM, { fontStyle: 'italic', marginTop: 6 }) }}>
                                {hidden ? 'opened when it plays' : artist ? `by ${artist}` : ''}
                            </div>
                        </Plaque>
                    </div>
                    <div className="st-rise" style={{ position: 'absolute', left: 0, right: 0, top: 902, display: 'flex', flexDirection: 'column', alignItems: 'center', animationDelay: '0.35s' }}>
                        <span style={{ ...caps(14, ST.BRASS_HI, { letterSpacing: '0.42em', marginRight: '-0.42em', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }) }}>At the controls</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1600 }}>
                            {singers.map((s: any, i: number) => {
                                const g = s.guestId ? guestsMap.get(s.guestId) : undefined
                                const nm: string = g?.name ?? s.name
                                const roleStr = !hidden && s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                                    ? s.roleIndices.map((ri: number) => roles[ri]).filter(Boolean).join(' & ')
                                    : ''
                                return (
                                    <div key={s.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <JewelLamp color={s.color} size={38} />
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <span style={{ ...display(40, ST.PARCHMENT, { textShadow: '0 2px 4px rgba(0,0,0,0.9)' }) }}>{nm}</span>
                                            {roleStr && <span style={{ ...caps(12, ST.PARCHMENT_DIM, { marginTop: 2, letterSpacing: '0.2em' }) }}>{roleStr}</span>}
                                        </div>
                                    </div>
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

// ── Count-in: building pressure ──────────────────────────────────────────────

export function EngineCountIn({
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
    useEngine()
    const fired = useRef(false)
    const go = remaining <= 0
    useEffect(() => {
        if (go && !fired.current) {
            fired.current = true
            burst()
        }
    }, [go])
    // the needle climbs with the count and pins in the red on "Full steam"
    const level = useRef(0)
    level.current = go ? 0.97 : 0.08 + Math.min(1, barPct / 100) * 0.7
    let center: ReactNode
    if (go) center = <div key="go" className="st-stamp" style={{ ...display(0, ST.LAMP, { fontSize: stageFont(56), textShadow: '0 0 18px rgba(246,198,107,0.5), 0 3px 0 rgba(0,0,0,0.6)' }) }}>Full steam!</div>
    else if (count <= 3) center = <div key={count} className="st-stamp" style={{ ...display(0, ST.PARCHMENT, { fontSize: stageFont(104), lineHeight: 1, textShadow: '0 3px 0 rgba(0,0,0,0.6)' }) }}>{count}</div>
    else center = <div style={{ ...display(0, ST.PARCHMENT, { fontSize: stageFont(30), maxWidth: 460, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>{trackName}</div>
    return (
        <div ref={innerRef} className={className} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '10vh 0 5vh' }}>
            <div className="st-rise">
                <Plaque border={22} contentStyle={{ display: 'flex', alignItems: 'center', gap: 30, padding: '14px 46px 14px 16px' }}>
                    <Gauge size={230} reading={() => level.current} />
                    <div style={{ minWidth: 320, textAlign: 'center' }}>
                        <div style={{ ...caps(14, ST.BRASS_HI, { marginBottom: 10, letterSpacing: '0.34em' }) }}>{go ? 'All together now' : 'Building pressure'}</div>
                        {center}
                    </div>
                </Plaque>
            </div>
        </div>
    )
}

// ── Interlude ────────────────────────────────────────────────────────────────

export function EngineBreak({ progress }: { progress: number }) {
    useEngine()
    const p = Math.min(1, Math.max(0, progress))
    const gears = useMemo(() => meshTrain({ teeth: 14, x: 38, y: 38 }, [{ teeth: 10, deg: 20 }], 0.36), [])
    return (
        <div className="st-rise">
            <Plaque border={16} contentStyle={{ display: 'flex', alignItems: 'center', gap: 18, padding: '8px 32px 8px 8px' }}>
                <div style={{ position: 'relative', width: 100, height: 76 }}>
                    <GearTrain gears={gears} shadow={4} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 260 }}>
                    <span style={{ ...display(30, ST.PARCHMENT) }}>Intermission</span>
                    <span style={{ ...body(16, ST.PARCHMENT_DIM, { fontStyle: 'italic', marginTop: 2 }) }}>the engine ticks over</span>
                    <div style={{ position: 'relative', height: 12, marginTop: 8 }}>
                        <div style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 4, borderRadius: 2, background: 'linear-gradient(180deg, #0B0806, #2A2018)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.9)' }} />
                        <div style={{ position: 'absolute', left: 0, top: 4, height: 4, borderRadius: 2, width: `${p * 100}%`, background: `linear-gradient(180deg, ${ST.BRASS_SHEEN}, ${ST.BRASS} 55%, ${ST.BRASS_DEEP})` }} />
                        <div style={{ position: 'absolute', top: 0, left: `calc(${p * 100}% - 6px)`, width: 12, height: 12, borderRadius: '50%', background: `radial-gradient(circle at 38% 32%, ${ST.BRASS_SHEEN}, ${ST.BRASS} 55%, ${ST.BRASS_LO})`, boxShadow: '0 1px 3px rgba(0,0,0,0.7)' }} />
                    </div>
                </div>
            </Plaque>
        </div>
    )
}

// ── Paused ───────────────────────────────────────────────────────────────────

export function EnginePaused({ stageFont }: { stageFont: (px: number) => string }) {
    return (
        <div className="st-rise">
            <Plaque border={18} contentStyle={{ display: 'flex', alignItems: 'center', gap: 18, padding: '8px 36px 8px 10px' }}>
                <MiniGauge size={72} value={0.03} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ ...display(0, ST.PARCHMENT, { fontSize: stageFont(32) }) }}>Engine Idling</span>
                    <span style={{ ...caps(12, ST.BRASS_HI, { marginTop: 4, letterSpacing: '0.3em' }) }}>Paused</span>
                </div>
            </Plaque>
        </div>
    )
}

// ── No lyrics ────────────────────────────────────────────────────────────────

export function EngineNoLyrics({ stageFont }: { stageFont: (px: number) => string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center' }} className="st-rise">
            <Plaque border={20} contentStyle={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 50px 16px' }}>
                <span style={{ ...caps(13, ST.BRASS_HI, { letterSpacing: '0.36em', marginBottom: 8 }) }}>No words on the drum</span>
                <span style={{ ...display(0, ST.PARCHMENT, { fontSize: stageFont(36) }) }}>Sing It from Memory</span>
            </Plaque>
        </div>
    )
}

// ── QR card ──────────────────────────────────────────────────────────────────

/** A small porthole in the corner with the join code inside. */
export function EngineQrCard({ qr }: { qr: string }) {
    return (
        <div className="k-qr-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Porthole size={196}>
                <Parchment>
                    <img src={qr} alt="QR" style={{ width: 92, height: 92, display: 'block', mixBlendMode: 'multiply' }} />
                </Parchment>
            </Porthole>
            <div style={{ marginTop: -10 }}>
                <Plaque border={9} contentStyle={{ padding: '1px 12px' }}>
                    <span style={{ ...caps(10, ST.BRASS_HI, { letterSpacing: '0.3em' }) }}>Join</span>
                </Plaque>
            </div>
        </div>
    )
}

// ── Song chip / singer tags ──────────────────────────────────────────────────

export function EngineSongChip({ art, title, artist }: { art: string | null | undefined; title: string; artist: string }) {
    return (
        <Plaque border={14} style={{ maxWidth: 'min(38vw, 560px)' }} contentStyle={{ display: 'flex', alignItems: 'center', gap: 12, padding: '3px 22px 3px 4px' }}>
            {art ? (
                <Porthole size={66}>
                    <img src={art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </Porthole>
            ) : null}
            <div style={{ minWidth: 0 }}>
                <div style={{ ...display(21, ST.PARCHMENT, { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>{title}</div>
                <div style={{ ...body(14, ST.PARCHMENT_DIM, { fontStyle: 'italic', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>{artist}</div>
            </div>
        </Plaque>
    )
}

export function EngineSingerTag({ children, index }: { children: ReactNode; color: string; index: number }) {
    return (
        <div className="st-rise" style={{ animationDelay: `${index * 0.08}s` }}>
            <Plaque border={11} contentStyle={{ display: 'flex', alignItems: 'center', padding: '2px 16px 2px 4px' }}>
                {children}
            </Plaque>
        </div>
    )
}

/** The mic level as a little pressure gauge. */
export function EngineGaugeMeter({ level }: { level: number; color: string }) {
    return <MiniGauge size={36} value={Math.min(1, level * 2.6)} />
}

/** Name + jewel lamp + gauge, the steampunk MicMeter body. */
export function EngineMicBody({ name, picture, color, meter }: { name: string; picture: string | null; color: string; meter: ReactNode }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            {meter ?? <JewelLamp color={color} size={26} />}
            {picture ? <img src={picture} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', boxShadow: `0 0 0 2px ${ST.BRASS}, 0 0 0 3px ${ST.BRASS_LO}` }} /> : null}
            {meter ? <JewelLamp color={color} size={18} /> : null}
            <span style={{ ...display(20, ST.PARCHMENT) }}>{name}</span>
        </span>
    )
}

