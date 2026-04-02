import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'

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
function MicMeter({ singer, active, effects, mainOutputId, theme }: { singer: { name: string; color: string; micDeviceId: string }; active: boolean; effects: any; mainOutputId: string; theme: any }) {
    const level = useSingerMic(singer.micDeviceId, active, effects, mainOutputId)
    const bars = 8
    const activeBars = Math.round(level * bars * 2.5)
    
    // Fallback for dark bars if background is bright
    const inactiveColor = theme.appBg === '#FFF8EE' || theme.appBg === '#faf4ed' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontFamily: theme.fontDisplay, fontWeight: 600, color: 'inherit', letterSpacing: 0.5 }}>
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
                            background: isActive ? singer.color : inactiveColor,
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
    const { state, dispatch } = useApp()
    const theme = useTheme()
    const containerRef = useRef<HTMLDivElement>(null)
    const [lineIdx, setLineIdx] = useState(-1)
    const [elapsed, setElapsed] = useState(0)
    const [showUI, setShowUI] = useState(true)
    const lyricsRef = useRef<HTMLDivElement>(null)
    const hideRef = useRef<NodeJS.Timeout | null>(null)

    // YouTube player sync
    const ytPlayerRef = useRef<any>(null)
    const ytReadyRef = useRef(false)
    const [ytReady, setYtReady] = useState(false)
    const [previewSlices, setPreviewSlices] = useState<number[]>([])

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
        if (track && track.duration_ms && ytId) {
            const durationSec = Math.floor(track.duration_ms / 1000)
            const margin = 10
            const maxStart = Math.max(0, durationSec - margin)
            const slices = Array.from({ length: 5 }, () => Math.floor(Math.random() * maxStart))
            setPreviewSlices(slices)
        } else {
            setPreviewSlices([])
        }
    }, [track?.id, ytId])

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
                        setYtReady(true)
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
            setYtReady(false)
        }
    }, [ytId])

    // Sync YouTube player play/pause and handle stage mode music video previews
    useEffect(() => {
        if (!ytReady || !ytPlayerRef.current) return

        if (state.stageMode === 'ready' && previewSlices.length > 0) {
            let sliceIdx = 0
            
            const playSlice = () => {
                if (!ytPlayerRef.current) return
                const startSec = previewSlices[sliceIdx % previewSlices.length]
                ytPlayerRef.current.seekTo(startSec, true)
                ytPlayerRef.current.playVideo()
                
                sliceIdx++
            }

            // Play immediately
            playSlice()
            
            // Then every 4 seconds
            const interval = setInterval(playSlice, 4000)
            return () => clearInterval(interval)
        } else {
            // standard playback sync
            const shouldPlay = state.stageMode === 'playing' && state.isPlaying
            if (shouldPlay) {
                ytPlayerRef.current.playVideo()
            } else {
                ytPlayerRef.current.pauseVideo()
            }
        }
    }, [state.stageMode, state.isPlaying, previewSlices, ytReady])

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
                    <div className="k-bg__yt-wrap" style={{ opacity: 1 }}>
                        <div id="yt-bg-player" />
                        <div className="k-bg__yt-mask" aria-hidden="true" />
                    </div>
                )}
                {state.stageMode === 'playing' && <div className="k-bg__scrim" />}
            </div>

            {/* Hidden SVG for Filters */}
            <svg style={{ position: 'fixed', pointerEvents: 'none', width: 0, height: 0 }}>
                <defs>
                    <filter id="urban-rough-filter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.04 0.15" numOctaves="3" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>
            </svg>

            {/* Song chip (top-left) */}
            <div className="k-song-chip" style={{ background: theme.appBg, ...theme.stickerLabel, position: 'absolute', opacity: 1 }}>
                {art && <img className="k-song-chip__art" src={art} alt="" />}
                <div className="k-song-chip__text">
                    <h3 style={{ fontFamily: theme.fontDisplay }}>{track.name}</h3>
                    <p style={{ color: theme.muted }}>{track.artists.map((a: any) => a.name).join(', ')}</p>
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
                                <div key={s.id} className="k-singer-tag" style={{ background: theme.appBg, ...theme.stickerLabel, position: 'relative', padding: '4px 12px' }}>
                                    <MicMeter singer={s} active={micActive} effects={singerEffects} mainOutputId={state.mainOutputId} theme={theme} />
                                </div>
                            )
                        } else {
                            return (
                                <div key={s.id} className="k-singer-tag" style={{ background: theme.appBg, ...theme.stickerLabel, position: 'relative', padding: '4px 12px' }}>
                                    <span style={{ color: 'inherit', fontFamily: theme.fontDisplay }}>{s.name}</span>
                                    <div className="k-singer-tag__dot" style={{ background: s.color }} />
                                </div>
                            )
                        }
                    })}
                </div>
            )}

            {/* Lyrics & Stage Centerpiece */}
            <div className="k-lyrics" ref={lyricsRef}>
                {state.stageMode === 'ready' ? (
                    <div className="anim-enter k-upnext" style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
                        <div style={{
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            gap: 40, 
                        }}>
                            <div style={{
                                background: theme.appBg,
                                ...theme.stickerLabel,
                                position: 'relative',
                                display: 'inline-block',
                                padding: '8px 24px',
                                fontSize: 13, fontWeight: 800, color: theme.mintGreen || theme.page?.color, letterSpacing: '0.2em', textTransform: 'uppercase',
                            }}>
                                Up Next
                            </div>
                            {/* Prominent album art */}
                            {art && (
                                <img
                                    src={art}
                                    alt=""
                                    style={{
                                        width: 340,
                                        height: 340,
                                        borderRadius: theme.radius,
                                        boxShadow: theme.shadow,
                                        border: theme.border,
                                        objectFit: 'cover',
                                    }}
                                />
                            )}
                            <div style={{ textAlign: 'center', ...theme.card, padding: '32px 48px' }}>
                                <h1 style={{ fontFamily: theme.fontDisplay, color: theme.page?.color as string || theme.black, fontSize: 42, fontWeight: 800, lineHeight: 1.15, marginBottom: 10, letterSpacing: '-0.5px' }}>
                                    {track.name}
                                </h1>
                                <p style={{ fontSize: 18, color: theme.muted, opacity: 0.8, marginBottom: 36, display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
                                    <span>{track.artists.map((a: any) => a.name).join(', ')}</span>
                                    {track.duration_ms && (
                                        <>
                                            <span style={{ opacity: 0.5 }}>•</span>
                                            <span>
                                                {Math.floor(track.duration_ms / 60000)}:
                                                {Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}
                                            </span>
                                        </>
                                    )}
                                </p>
                                {/* Large, prominent singer names */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
                                    {singers.map(s => {
                                        const roleStr = s.roleIndices && s.roleIndices.length > 0 && roles.length > 0
                                            ? s.roleIndices.map(idx => roles[idx]).filter(Boolean).join(' & ')
                                            : ''
                                        const displayText = roleStr ? `${s.name} - ${roleStr}` : s.name
                                        
                                        return (
                                            <div
                                                key={s.id}
                                                style={{
                                                    background: theme.appBg,
                                                    ...theme.stickerLabel,
                                                    position: 'relative',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '16px 36px',
                                                    color: s.color,
                                                    fontWeight: 700,
                                                    fontSize: 28,
                                                }}
                                            >
                                                {displayText}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
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
                                    let inlineStyle: React.CSSProperties = {
                                        fontFamily: theme.fontDisplay
                                    }

                                    if (isActiveGroup) {
                                        cls += ' k-line--now'

                                        if (theme.name === 'neo-brutal') {
                                            const singerColor = line.singerIndex !== undefined && singers[line.singerIndex] ? singers[line.singerIndex].color : 'white'
                                            inlineStyle.background = singerColor
                                            inlineStyle.color = 'black'
                                            inlineStyle.padding = '8px 24px'
                                            inlineStyle.border = '4px solid black'
                                            inlineStyle.boxShadow = '6px 6px 0px black'
                                            inlineStyle.borderRadius = '0px'
                                            inlineStyle.margin = '4px'

                                            if (line.singerIndices && line.singerIndices.length > 1) {
                                                const colors = line.singerIndices.map((idx: number) => singers[idx]?.color).filter(Boolean)
                                                if (colors.length > 1) {
                                                    inlineStyle.background = `linear-gradient(90deg, ${colors.join(', ')})`
                                                }
                                            }
                                        } else if (theme.name === 'sketch') {
                                            cls += ' k-line--sketch'
                                            inlineStyle.position = 'relative'
                                            if (line.singerIndices && line.singerIndices.length > 1) {
                                                const colors = line.singerIndices.map((idx: number) => singers[idx]?.color).filter(Boolean)
                                                if (colors.length > 1) {
                                                    inlineStyle.backgroundImage = `linear-gradient(90deg, ${colors.join(', ')})`
                                                    inlineStyle.WebkitBackgroundClip = 'text'
                                                    inlineStyle.WebkitTextFillColor = 'transparent'
                                                    inlineStyle.filter = `drop-shadow(2px 2px 0px rgba(0,0,0,0.15))`
                                                }
                                            } else if (line.singerIndex !== undefined && singers[line.singerIndex]) {
                                                const singer = singers[line.singerIndex]
                                                inlineStyle.color = singer.color
                                                inlineStyle.textShadow = `2px 2px 0px rgba(0,0,0,0.15)`
                                            }
                                        } else if (theme.name === 'cyberpunk') {
                                            cls += ' k-line--cyber'
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
                                                inlineStyle.textShadow = `0 0 10px ${singer.colorGlow}, 0 0 20px ${singer.colorGlow}, 0 0 40px ${singer.colorGlow}`
                                            }
                                        } else if (theme.name === 'urban') {
                                            const singerColor = line.singerIndex !== undefined && singers[line.singerIndex] ? singers[line.singerIndex].color : theme.accentA
                                            if (isActiveGroup) {
                                                cls += ' k-line--urban-active'
                                                // @ts-ignore (CSS variables)
                                                inlineStyle['--highlight-color'] = singerColor
                                                inlineStyle.color = theme.white // DARK_VOID
                                                inlineStyle.opacity = 1
                                            } else {
                                                inlineStyle.display = 'inline'
                                                inlineStyle.color = singerColor
                                                inlineStyle.opacity = 0.4
                                                inlineStyle.padding = '0.1em 0.3em'
                                            }
                                        } else {
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

                                    // content logic handled in styles for urban to keep crispness
                                    let content: React.ReactNode = displayWords

                                    if (theme.name === 'sketch' && isActiveGroup) {
                                        const seed = (line.originalIndex || 0) * 11 + (j * 7) + 1
                                        const r = (offset: number) => {
                                            const x = Math.sin(seed + offset) * 10000;
                                            return x - Math.floor(x);
                                        }
                                        // Random quadratic Bezier path mimicking a stroke
                                        const path = `M0,${5 + r(2) * 4} Q${20 + r(3) * 20},${2 + r(4) * 6} ${50 + r(5) * 20},${5 + r(6) * 4} T100,${4 + r(7) * 5}`
                                        const strokeW = 2 + r(8) * 2
                                        const highlightColor = line.singerIndex !== undefined && singers[line.singerIndex] ? singers[line.singerIndex].color : 'black'
                                        
                                        content = (
                                            <>
                                                <span style={{ position: 'relative', zIndex: 1 }}>{displayWords}</span>
                                                <svg
                                                    style={{ position: 'absolute', bottom: 6, left: 0, width: '100%', height: '14px', pointerEvents: 'none', zIndex: 0, overflow: 'visible' }}
                                                    viewBox="0 0 100 10"
                                                    preserveAspectRatio="none"
                                                >
                                                    <path d={path} stroke={highlightColor} strokeWidth={strokeW} fill="none" strokeLinecap="round" />
                                                </svg>
                                            </>
                                        )
                                    }

                                    return <div key={j} className={cls} style={inlineStyle}>{content}</div>
                                })}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
