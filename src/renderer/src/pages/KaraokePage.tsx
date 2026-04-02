import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useApp } from '../context/AppContext'

import { VoiceEffectsEngine } from '../audio/VoiceEffectsEngine'

function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/
    ]
    for (const p of patterns) {
        const m = url.match(p)
        if (m) return m[1]
    }
    return null
}

// ---- Singer Mic Processing Hook ----
function useSingerMic(deviceId: string, enabled: boolean, effects: any, mainOutputId: string) {
    const [level, setLevel] = useState(0)
    const animRef = useRef<number>(0)
    const engineRef = useRef<VoiceEffectsEngine | null>(null)

    // Re-apply effects smoothly when they change
    useEffect(() => {
        if (engineRef.current && effects) {
            engineRef.current.apply(effects)
        }
    }, [effects])

    useEffect(() => {
        if (!enabled || !deviceId) {
            setLevel(0)
            if (engineRef.current) {
                engineRef.current.destroy()
                engineRef.current = null
            }
            return
        }

        let cancelled = false
        const engine = new VoiceEffectsEngine()
        engineRef.current = engine
        if (effects) engine.apply(effects)

        const start = async () => {
            const success = await engine.startLivePreview(deviceId, mainOutputId)
            if (cancelled) { engine.destroy(); return }

            if (success) {
                const dataArray = new Uint8Array(engine.analyser.frequencyBinCount)
                let lastUpdate = 0
                const METER_INTERVAL = 66 // ~15fps — visually smooth for level meters
                const tick = (now: number) => {
                    if (cancelled) return
                    if (now - lastUpdate >= METER_INTERVAL) {
                        lastUpdate = now
                        engine.analyser.getByteFrequencyData(dataArray)
                        let sum = 0
                        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i]
                        const rms = Math.sqrt(sum / dataArray.length) / 255
                        setLevel(rms)
                    }
                    animRef.current = requestAnimationFrame(tick)
                }
                animRef.current = requestAnimationFrame(tick)
            }
        }
        start()

        return () => {
            cancelled = true
            cancelAnimationFrame(animRef.current)
            engine.destroy()
            engineRef.current = null
            setLevel(0)
        }
    }, [deviceId, enabled, mainOutputId]) // Recreate on output device change

    return level
}

// ---- Mic Meter Component ----
function MicMeter({ singer, active, effects, mainOutputId }: { singer: { name: string; color: string; micDeviceId: string }; active: boolean; effects: any; mainOutputId: string }) {
    const level = useSingerMic(singer.micDeviceId, active, effects, mainOutputId)
    const bars = 8
    const activeBars = Math.round(level * bars * 2.5)

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'white', letterSpacing: 0.5 }}>
                {singer.name}
            </span>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 2, height: 16,
            }}>
                {Array.from({ length: bars }, (_, i) => {
                    const isActive = i < activeBars
                    const h = 4 + (i / bars) * 12
                    return (
                        <div key={i} style={{
                            width: 3, height: h, borderRadius: 2,
                            background: isActive ? singer.color : 'rgba(255,255,255,0.08)',
                            transition: 'background 0.08s ease',
                            boxShadow: isActive ? `0 0 4px ${singer.color}` : 'none',
                        }} />
                    )
                })}
            </div>
        </div>
    )
}

// ---- Main Component (Display Only) ----
export default function KaraokePage() {
    const { state } = useApp()
    const [lineIdx, setLineIdx] = useState(-1)
    const [elapsed, setElapsed] = useState(0)
    const [showUI, setShowUI] = useState(true)
    const lyricsRef = useRef<HTMLDivElement>(null)
    const hideRef = useRef<NodeJS.Timeout | null>(null)

    // YouTube player sync
    const ytPlayerRef = useRef<any>(null)
    const ytReadyRef = useRef(false)

    const np = state.nowPlaying
    const track = np?.track || null
    const lyrics = np?.lyrics || []
    const singers = np?.singers || []
    const roles = np?.roles || []
    const voiceEffects = np?.voiceEffects || null
    const art = track?.album.images[0]?.url
    const ytId = np?.backgroundVideoPath ? extractYouTubeId(np.backgroundVideoPath) : null

    // Receive time updates from main window via IPC
    useEffect(() => {
        if (!window.electronAPI) return
        const timeHandler = window.electronAPI.onPlaybackTime((timeMs: number) => {
            setElapsed(timeMs)
        })
        const seekHandler = window.electronAPI.onPlaybackSeek((timeMs: number) => {
            setElapsed(timeMs)
            if (ytReadyRef.current && ytPlayerRef.current) {
                ytPlayerRef.current.seekTo(timeMs / 1000, true)
            }
        })
        return () => {
            window.electronAPI.offPlaybackTime(timeHandler)
            window.electronAPI.offPlaybackSeek(seekHandler)
        }
    }, [])

    // Reset elapsed when track changes
    useEffect(() => {
        setElapsed(0)
        setLineIdx(-1)
    }, [track?.id])

    // Load YouTube IFrame API and create player
    useEffect(() => {
        if (!ytId) {
            ytPlayerRef.current?.destroy()
            ytPlayerRef.current = null
            ytReadyRef.current = false
            return
        }

        const createPlayer = () => {
            if (ytPlayerRef.current) {
                ytPlayerRef.current.destroy()
                ytPlayerRef.current = null
            }
            ytReadyRef.current = false

            ytPlayerRef.current = new (window as any).YT.Player('yt-bg-player', {
                videoId: ytId,
                playerVars: {
                    autoplay: 0,
                    mute: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    rel: 0,
                    playsinline: 1,
                    iv_load_policy: 3,
                    cc_load_policy: 0,
                    enablejsapi: 1,
                },
                events: {
                    onReady: () => {
                        ytReadyRef.current = true
                        if (state.stageMode === 'playing' && state.isPlaying) {
                            ytPlayerRef.current?.playVideo()
                        }
                    },
                }
            })
        }

        if ((window as any).YT?.Player) {
            createPlayer()
        } else {
            if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
                const tag = document.createElement('script')
                tag.src = 'https://www.youtube.com/iframe_api'
                document.head.appendChild(tag)
            }
            ; (window as any).onYouTubeIframeAPIReady = createPlayer
        }

        return () => {
            ytPlayerRef.current?.destroy()
            ytPlayerRef.current = null
            ytReadyRef.current = false
        }
    }, [ytId])

    // Sync YouTube player play/pause with stage mode
    useEffect(() => {
        const shouldPlay = state.stageMode === 'playing' && state.isPlaying
        if (!ytReadyRef.current || !ytPlayerRef.current) return
        if (shouldPlay) {
            ytPlayerRef.current.playVideo()
        } else {
            ytPlayerRef.current.pauseVideo()
        }
    }, [state.stageMode, state.isPlaying])

    // Auto-hide UI
    const handleMouse = useCallback(() => {
        setShowUI(true)
        if (hideRef.current) clearTimeout(hideRef.current)
        hideRef.current = setTimeout(() => setShowUI(false), 3000)
    }, [])

    // Track active lyric line
    useEffect(() => {
        if (!lyrics.length) return
        let idx = -1
        for (let i = 0; i < lyrics.length; i++) {
            if (elapsed >= lyrics[i].startTimeMs) idx = i; else break
        }
        if (idx !== lineIdx) {
            setLineIdx(idx)
        }
    }, [elapsed, lyrics, lineIdx])

    // Scroll active lyric into view
    useEffect(() => {
        if (lineIdx < 0 || !lyricsRef.current) return
        const container = lyricsRef.current
        const lines = container.querySelectorAll('.k-line')
        const target = lines[lineIdx] as HTMLElement | undefined
        if (target) {
            const scrollTo = target.offsetTop - container.clientHeight / 2 + target.offsetHeight / 2
            container.scrollTo({ top: scrollTo, behavior: 'smooth' })
        }
    }, [lineIdx])

    // Singer colors and Grouping
    const groupedLyrics = useMemo(() => {
        const coloredLines = lyrics.map((l: any, i: number) => {
            let singerIndex: number | undefined = i % Math.max(1, singers.length)
            let singerIndices: number[] = []

            if (roles && roles.length > 0 && l.roleIndex !== undefined) {
                if (l.roleIndex === -1) {
                    singerIndices = singers.map((_, idx) => idx)
                } else {
                    // Find ALL singers whose roleIndices include this lyric's role
                    const matchedIndices = singers
                        .map((s: any, idx: number) => (s.roleIndices && s.roleIndices.includes(l.roleIndex)) ? idx : -1)
                        .filter((idx: number) => idx >= 0)
                    if (matchedIndices.length > 0) {
                        singerIndex = matchedIndices[0]
                        singerIndices = matchedIndices
                    } else {
                        singerIndex = undefined
                    }
                }
            } else {
                if (singerIndex !== undefined) singerIndices = [singerIndex]
            }

            return { ...l, singerIndex, singerIndices, originalIndex: i }
        })

        if (coloredLines.length === 0) return []

        const groups: any[][] = []
        let currentGroup = [coloredLines[0]]

        for (let i = 1; i < coloredLines.length; i++) {
            if (coloredLines[i].startTimeMs === currentGroup[0].startTimeMs) {
                currentGroup.push(coloredLines[i])
            } else {
                groups.push(currentGroup)
                currentGroup = [coloredLines[i]]
            }
        }
        groups.push(currentGroup)
        return groups
    }, [lyrics, singers, roles])

    // Empty state — waiting for songs (TitleBar in App handles window controls)
    if (!track) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--black)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎤</div>
                    <p style={{ color: 'var(--white-muted)', marginBottom: 20 }}>Waiting for songs...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="karaoke-stage" onMouseMove={handleMouse} style={{ cursor: showUI ? 'default' : 'none' }}>
            {/* Background */}
            <div className="k-bg">
                {art && <img className="k-bg__img" src={art} alt="" />}
                {ytId && (
                    <div className="k-bg__yt-wrap" style={{ opacity: state.stageMode === 'playing' ? 1 : 0 }}>
                        <div id="yt-bg-player" />
                        <div className="k-bg__yt-mask" aria-hidden="true" />
                    </div>
                )}
                <div className="k-bg__scrim" />
            </div>

            {/* Song chip (top-left) */}
            <div className="k-song-chip" style={{ opacity: showUI ? 1 : 0 }}>
                {art && <img className="k-song-chip__art" src={art} alt="" />}
                <div className="k-song-chip__text">
                    <h3>{track.name}</h3>
                    <p>{track.artists.map((a: any) => a.name).join(', ')}</p>
                </div>
            </div>

            {/* Singer tags (top-right) */}
            {singers.length > 0 && (
                <div className="k-singers" style={{ opacity: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
                    {singers.map((s: any) => {
                        if (s.micDeviceId) {
                            // Enable mic + effects when ready (Up Next) or playing — singer can warm up before song starts
                            const micActive = state.stageMode === 'playing' || state.stageMode === 'ready'
                            let singerEffects = micActive ? voiceEffects : null
                            if (singerEffects && Array.isArray(singerEffects)) {
                                const index = s.roleIndices && s.roleIndices.length > 0 ? s.roleIndices[0] : 0
                                singerEffects = singerEffects[index] || singerEffects[0]
                            }
                            return (
                                <div key={s.id} className="k-singer-tag">
                                    <MicMeter singer={s} active={micActive} effects={singerEffects} mainOutputId={state.mainOutputId} />
                                </div>
                            )
                        } else {
                            return (
                                <div key={s.id} className="k-singer-tag">
                                    <span>{s.name}</span>
                                    <div className="k-singer-tag__dot" style={{ background: s.color }} />
                                </div>
                            )
                        }
                    })}
                </div>
            )}

            {/* Lyrics */}
            <div className="k-lyrics" ref={lyricsRef}>
                {state.stageMode === 'ready' ? (
                    <div className="anim-enter k-upnext" style={{ textAlign: 'center', width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
                        <div style={{
                            fontSize: 12, fontWeight: 700, color: 'var(--emerald)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 32,
                            textShadow: '0 0 24px rgba(52, 211, 153, 0.5)'
                        }}>
                            Up Next
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
                            {/* Prominent album art */}
                            {art && (
                                <img
                                    src={art}
                                    alt=""
                                    style={{
                                        width: 340,
                                        height: 340,
                                        borderRadius: 28,
                                        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
                                        objectFit: 'cover',
                                    }}
                                />
                            )}
                            <div style={{ textAlign: 'center' }}>
                                <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, marginBottom: 10, letterSpacing: '-0.5px', color: 'white' }}>
                                    {track.name}
                                </h1>
                                <p style={{ fontSize: 18, color: 'var(--white-muted)', marginBottom: 36 }}>
                                    {track.artists.map((a: any) => a.name).join(', ')}
                                </p>
                                {/* Large, prominent singer names */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
                                    {singers.map(s => (
                                        <div
                                            key={s.id}
                                            style={{
                                                padding: '20px 40px',
                                                borderRadius: 16,
                                                background: `linear-gradient(135deg, ${s.color}22, ${s.color}08)`,
                                                border: `2px solid ${s.color}`,
                                                color: s.color,
                                                fontWeight: 700,
                                                fontSize: 40,
                                                letterSpacing: '0.02em',
                                                textShadow: `0 0 30px ${s.color}66`,
                                                boxShadow: `0 8px 32px ${s.color}22`,
                                            }}
                                        >
                                            {s.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <p style={{ color: 'var(--white-faint)', fontSize: 14, marginTop: 40 }}>
                            Waiting for host to start... Mic is live — warm up your voice!
                        </p>
                    </div>
                ) : groupedLyrics.length === 0 ? (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--white-faint)' }}>
                            No lyrics available
                        </p>
                    </div>
                ) : (
                    groupedLyrics.map((group: any[], i: number) => {
                        const isActiveGroup = lineIdx >= 0 && group.some(l => l.originalIndex === lineIdx)
                        const isPastGroup = lineIdx >= 0 && group[group.length - 1].originalIndex < lineIdx

                        return (
                            <div key={i} style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                                {group.map((line: any, j: number) => {
                                    let cls = 'k-line k-line--lg'
                                    let inlineStyle: React.CSSProperties = {}

                                    if (isActiveGroup) {
                                        cls += ' k-line--now'
                                        if (line.singerIndices && line.singerIndices.length > 1) {
                                            const colors = line.singerIndices.map((idx: number) => singers[idx]?.color).filter(Boolean)
                                            if (colors.length > 1) {
                                                inlineStyle.backgroundImage = `linear-gradient(90deg, ${colors.join(', ')})`
                                                inlineStyle.WebkitBackgroundClip = 'text'
                                                inlineStyle.WebkitTextFillColor = 'transparent'
                                                inlineStyle.filter = `drop-shadow(0 0 15px ${colors[0]}) drop-shadow(0 0 15px ${colors[colors.length - 1]})`
                                            }
                                        } else if (line.singerIndex !== undefined && singers[line.singerIndex]) {
                                            const singer = singers[line.singerIndex]
                                            inlineStyle.color = singer.color
                                            inlineStyle.textShadow = `0 0 40px ${singer.colorGlow}, 0 2px 20px ${singer.colorGlow}`
                                        }
                                    } else if (isPastGroup) {
                                        cls += ' k-line--past'
                                    } else {
                                        cls += ' k-line--future'
                                        if (line.singerIndices && line.singerIndices.length > 1) {
                                            const colors = line.singerIndices.map((idx: number) => singers[idx]?.color).filter(Boolean)
                                            if (colors.length > 1) {
                                                inlineStyle.backgroundImage = `linear-gradient(90deg, ${colors.join(', ')})`
                                                inlineStyle.WebkitBackgroundClip = 'text'
                                                inlineStyle.WebkitTextFillColor = 'transparent'
                                                inlineStyle.opacity = 0.5
                                            }
                                        } else if (line.singerIndex !== undefined && singers[line.singerIndex]) {
                                            inlineStyle.color = singers[line.singerIndex].color
                                            inlineStyle.opacity = 0.4
                                        }
                                    }

                                    let displayWords = line.words;
                                    const needsSanitation = line.singerIndices?.some((idx: number) => singers[idx]?.whitePersonCheck) ||
                                        (line.singerIndex !== undefined && singers[line.singerIndex]?.whitePersonCheck);

                                    if (needsSanitation) {
                                        displayWords = displayWords.replace(/nigg(?:a|er)s?/gi, (match: string) => {
                                            const isPlural = match.toLowerCase().endsWith('s');
                                            const isUpper = match[0] === match[0].toUpperCase();
                                            let replacement = isPlural ? 'fellas' : 'fella';
                                            if (isUpper) replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
                                            return replacement;
                                        });
                                    }

                                    return <div key={j} className={cls} style={inlineStyle}>{displayWords}</div>
                                })}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
