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
function MicMeter({ singer, active, effects, mainOutputId, theme }: { singer: { name: string; color: string; micDeviceId: string; profilePicture?: string }; active: boolean; effects: any; mainOutputId: string; theme: any }) {
    const level = useSingerMic(singer.micDeviceId, active, effects, mainOutputId)
    const bars = 8
    const activeBars = Math.round(level * bars * 2.5)

    // Fallback for dark bars if background is bright
    const inactiveColor = theme.appBg === '#FFF8EE' || theme.appBg === '#faf4ed' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {singer.profilePicture && (
                <img src={singer.profilePicture} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            )}
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

// ---- Reactions Overlay (floats above video, behind lyrics) ----
interface ReactionData {
    id: string
    reactionType: 'emoji' | 'text' | 'meme' | 'photo'
    content: string
    senderName: string
    senderProfilePicture?: string | null
    x: number // offset from the anchored edge (%)
    side: 'left' | 'right'
}

function ReactionsOverlay() {
    const [reactions, setReactions] = useState<ReactionData[]>([])

    useEffect(() => {
        if (!window.electronAPI?.onReaction) return

        const handler = window.electronAPI.onReaction((reaction: any) => {
            const side = Math.random() < 0.5 ? 'left' as const : 'right' as const
            const r: ReactionData = {
                ...reaction,
                side,
                x: 2 + Math.random() * 18 // 2%-20% offset from the anchored edge
            }
            setReactions(prev => {
                const next = [...prev, r]
                return next.length > 15 ? next.slice(-15) : next
            })
            const duration = reaction.reactionType === 'text' ? 7000 : 4500
            setTimeout(() => {
                setReactions(prev => prev.filter(item => item.id !== r.id))
            }, duration)
        })

        return () => {
            window.electronAPI?.offReaction(handler)
        }
    }, [])

    if (reactions.length === 0) return null

    const renderAvatar = (r: ReactionData) => (
        r.senderProfilePicture ? (
            <img className="reaction-bubble__avatar" src={r.senderProfilePicture} alt="" />
        ) : (
            <div className="reaction-bubble__avatar-initial">
                {(r.senderName || '?').charAt(0).toUpperCase()}
            </div>
        )
    )

    return (
        <div className="k-reactions-overlay">
            {reactions.map(r => {
                const pos = r.side === 'left'
                    ? { left: r.x + '%' } as React.CSSProperties
                    : { right: r.x + '%' } as React.CSSProperties

                if (r.reactionType === 'text') {
                    const isRight = r.side === 'right'
                    return (
                        <div key={r.id}
                            className={'reaction-bubble reaction-bubble--text' + (isRight ? ' reaction-bubble--right' : '')}
                            style={pos}
                        >
                            {isRight ? (
                                <>
                                    <div className="reaction-bubble__text-wrap reaction-bubble__text-wrap--right">
                                        <div className="reaction-bubble__text">{r.content}</div>
                                        <span className="reaction-bubble__text-name">{r.senderName}</span>
                                    </div>
                                    {renderAvatar(r)}
                                </>
                            ) : (
                                <>
                                    {renderAvatar(r)}
                                    <div className="reaction-bubble__text-wrap">
                                        <div className="reaction-bubble__text">{r.content}</div>
                                        <span className="reaction-bubble__text-name">{r.senderName}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )
                }
                return (
                    <div key={r.id} className="reaction-bubble" style={pos}>
                        {r.reactionType === 'emoji' && (
                            <span className="reaction-bubble__emoji">{r.content}</span>
                        )}
                        {(r.reactionType === 'meme' || r.reactionType === 'photo') && (
                            <img className="reaction-bubble__image" src={r.content} alt="" />
                        )}
                        {renderAvatar(r)}
                        <span className="reaction-bubble__name">{r.senderName}</span>
                    </div>
                )
            })}
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
    const audioTimeMsRef = useRef(0)
    const [ytReady, setYtReady] = useState(false)
    const [previewSlices, setPreviewSlices] = useState<number[]>([])

    // Crossfade: remember previous album art to avoid black flash on transition
    const [prevArt, setPrevArt] = useState<string | null>(null)
    const [artLoaded, setArtLoaded] = useState(false)

    const np = state.nowPlaying
    const track = np?.track || null
    const lyrics = np?.lyrics || []
    const singers = np?.singers || []
    const roles = np?.roles || []
    const voiceEffects = np?.voiceEffects || null
    const art = track?.album.images[0]?.url
    const ytId = np?.backgroundVideoPath ? extractYouTubeId(np.backgroundVideoPath) : null

    // When art changes, keep old art visible until new one loads
    useEffect(() => {
        if (!art) return
        setArtLoaded(false)
        const img = new Image()
        img.onload = () => {
            setArtLoaded(true)
            setPrevArt(art)
        }
        img.src = art
    }, [art])

    // Receive time updates from main window via IPC
    useEffect(() => {
        if (!window.electronAPI) return
        const timeHandler = window.electronAPI.onPlaybackTime((timeMs: number) => {
            setElapsed(timeMs)
            audioTimeMsRef.current = timeMs
        })
        const seekHandler = window.electronAPI.onPlaybackSeek((timeMs: number) => {
            setElapsed(timeMs)
            audioTimeMsRef.current = timeMs
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
        audioTimeMsRef.current = 0
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
                            ytPlayerRef.current?.seekTo(audioTimeMsRef.current / 1000, true)
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
            // standard playback sync — seek to current audio position before playing
            const shouldPlay = state.stageMode === 'playing' && state.isPlaying
            if (shouldPlay) {
                const currentSec = audioTimeMsRef.current / 1000
                ytPlayerRef.current.seekTo(currentSec, true)
                ytPlayerRef.current.playVideo()
            } else {
                ytPlayerRef.current.pauseVideo()
            }
        }
    }, [state.stageMode, state.isPlaying, previewSlices, ytReady])

    // Periodic drift correction: re-sync YouTube video if it drifts from audio
    useEffect(() => {
        if (!ytReady || !ytPlayerRef.current) return
        if (state.stageMode !== 'playing' || !state.isPlaying) return

        const DRIFT_CHECK_INTERVAL = 3000
        const DRIFT_THRESHOLD = 1.5

        const interval = setInterval(() => {
            if (!ytPlayerRef.current || !ytReadyRef.current) return
            const videoSec = ytPlayerRef.current.getCurrentTime()
            const audioSec = audioTimeMsRef.current / 1000
            if (Math.abs(videoSec - audioSec) > DRIFT_THRESHOLD) {
                ytPlayerRef.current.seekTo(audioSec, true)
            }
        }, DRIFT_CHECK_INTERVAL)

        return () => clearInterval(interval)
    }, [state.stageMode, state.isPlaying, ytReady])

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

    // Empty state — themed waiting screen with QR code
    if (!track) {
        const qrUrl = state.karaokeQrDataUrl
        const sessionCode = state.karaokeSessionCode

        // ---- Neo-Brutal idle ----
        if (theme.name === 'neo-brutal') {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                    background: '#FFF8EE', position: 'relative', overflow: 'hidden',
                }}>
                    {/* Decorative offset blocks */}
                    <div style={{ position: 'absolute', top: 60, left: 80, width: 120, height: 120, background: '#FFD60A', border: '3px solid #1A1A1A', boxShadow: '6px 6px 0 #1A1A1A', borderRadius: 0, transform: 'rotate(-8deg)' }} />
                    <div style={{ position: 'absolute', bottom: 80, right: 100, width: 90, height: 90, background: '#B388FF', border: '3px solid #1A1A1A', boxShadow: '6px 6px 0 #1A1A1A', borderRadius: 0, transform: 'rotate(12deg)' }} />
                    <div style={{ position: 'absolute', top: 140, right: 200, width: 60, height: 60, background: '#00E676', border: '3px solid #1A1A1A', boxShadow: '4px 4px 0 #1A1A1A', borderRadius: 0, transform: 'rotate(-3deg)' }} />
                    <div style={{ position: 'absolute', bottom: 160, left: 180, width: 70, height: 70, background: '#FF3B30', border: '3px solid #1A1A1A', boxShadow: '5px 5px 0 #1A1A1A', borderRadius: 0, transform: 'rotate(6deg)' }} />

                    <div style={{ textAlign: 'center', zIndex: 1 }}>
                        <h1 style={{
                            fontFamily: 'Space Grotesk, sans-serif', fontSize: 72, fontWeight: 800, color: '#1A1A1A',
                            lineHeight: 1.1, marginBottom: 16,
                            textShadow: 'none',
                        }}>
                            Add a Song!
                        </h1>
                        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 20, color: '#1A1A1A', opacity: 0.6, marginBottom: 48 }}>
                            Scan to join the queue
                        </p>
                        {qrUrl && (
                            <div style={{
                                display: 'inline-block', padding: 20,
                                background: 'white', border: '4px solid #1A1A1A', boxShadow: '8px 8px 0 #1A1A1A',
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 220, height: 220, display: 'block' }} />
                            </div>
                        )}
                        {sessionCode && (
                            <p style={{
                                fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, fontWeight: 800, color: '#1A1A1A',
                                letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 24,
                            }}>
                                {sessionCode}
                            </p>
                        )}
                    </div>
                </div>
            )
        }

        // ---- Cyberpunk idle ----
        if (theme.name === 'cyberpunk') {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                    background: '#060610', position: 'relative', overflow: 'hidden',
                }}>
                    {/* Dot grid background */}
                    <div style={{
                        position: 'absolute', inset: 0, opacity: 0.15,
                        backgroundImage: 'radial-gradient(circle, #00ff88 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }} />
                    {/* Scanline overlay */}
                    <div style={{
                        position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
                        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.3) 2px, rgba(0,255,136,0.3) 4px)',
                    }} />

                    <div style={{ textAlign: 'center', zIndex: 1 }}>
                        <p style={{
                            fontFamily: 'Share Tech Mono, monospace', fontSize: 16, color: '#00ff88', opacity: 0.5,
                            letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 12,
                        }}>
                            {'>'} system.queue.status
                        </p>
                        <h1 style={{
                            fontFamily: 'Share Tech Mono, monospace', fontSize: 56, fontWeight: 400, color: '#00ff88',
                            lineHeight: 1.2, marginBottom: 8,
                            textShadow: '0 0 20px rgba(0,255,136,0.6), 0 0 60px rgba(0,255,136,0.3)',
                        }}>
                            // AWAITING INPUT
                        </h1>
                        <p style={{
                            fontFamily: 'Share Tech Mono, monospace', fontSize: 14, color: '#00e5ff', opacity: 0.4,
                            marginBottom: 48,
                        }}>
                            scan_qr_code() to enqueue track
                        </p>
                        {qrUrl && (
                            <div style={{
                                display: 'inline-block', padding: 12,
                                border: '1px solid #00ff88',
                                boxShadow: '0 0 15px rgba(0,255,136,0.3), inset 0 0 15px rgba(0,255,136,0.1)',
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, display: 'block' }} />
                            </div>
                        )}
                        {sessionCode && (
                            <p style={{
                                fontFamily: 'Share Tech Mono, monospace', fontSize: 22, color: '#00ff88',
                                letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 20,
                                textShadow: '0 0 10px rgba(0,255,136,0.5)',
                            }}>
                                [{sessionCode}]
                            </p>
                        )}
                    </div>
                </div>
            )
        }

        // ---- Sketch (Hand-Drawn) idle ----
        if (theme.name === 'sketch') {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                    background: '#fdfbf7', position: 'relative', overflow: 'hidden',
                }}>
                    {/* Dot paper background */}
                    <div style={{
                        position: 'absolute', inset: 0, opacity: 0.3,
                        backgroundImage: 'radial-gradient(circle, #2d2d2d 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                    }} />

                    {/* Hand-drawn doodle decorations */}
                    <svg style={{ position: 'absolute', top: 80, left: 100, width: 60, height: 60, opacity: 0.2 }} viewBox="0 0 60 60">
                        <path d="M30 5 L35 20 L50 20 L38 30 L42 45 L30 36 L18 45 L22 30 L10 20 L25 20 Z" fill="none" stroke="#2d2d2d" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                    <svg style={{ position: 'absolute', bottom: 100, right: 120, width: 50, height: 50, opacity: 0.15 }} viewBox="0 0 50 50">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="#ff4d4d" strokeWidth="2.5" strokeDasharray="4 3" />
                    </svg>
                    <svg style={{ position: 'absolute', top: 160, right: 180, width: 40, height: 40, opacity: 0.2 }} viewBox="0 0 40 40">
                        <path d="M5 35 Q10 5 20 20 Q30 35 35 8" fill="none" stroke="#2d5da1" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <svg style={{ position: 'absolute', bottom: 140, left: 200, width: 45, height: 30, opacity: 0.2 }} viewBox="0 0 45 30">
                        <path d="M5 15 Q12 2 22 15 Q32 28 40 12" fill="none" stroke="#ff4d4d" strokeWidth="2" strokeLinecap="round" />
                    </svg>

                    <div style={{ textAlign: 'center', zIndex: 1 }}>
                        <h1 style={{
                            fontFamily: 'Kalam, cursive', fontSize: 68, fontWeight: 700, color: '#2d2d2d',
                            lineHeight: 1.2, marginBottom: 8,
                            transform: 'rotate(-1.5deg)',
                        }}>
                            Add a song!
                        </h1>
                        <p style={{
                            fontFamily: 'Patrick Hand, cursive', fontSize: 22, color: '#2d2d2d', opacity: theme.name === 'sketch' ? 0.9 : 0.5,
                            marginBottom: 44, transform: 'rotate(0.5deg)',
                        }}>
                            Scan this to pick your tune
                        </p>
                        {qrUrl && (
                            <div style={{
                                display: 'inline-block', padding: 16,
                                background: 'white', border: '3px solid #2d2d2d',
                                borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
                                boxShadow: '4px 4px 0 rgba(0,0,0,0.12)',
                                transform: 'rotate(1deg)',
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, display: 'block', borderRadius: 4 }} />
                            </div>
                        )}
                        {sessionCode && (
                            <p style={{
                                fontFamily: 'Kalam, cursive', fontSize: 26, fontWeight: 700, color: '#2d5da1',
                                letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 20,
                                transform: 'rotate(-0.8deg)',
                            }}>
                                {sessionCode}
                            </p>
                        )}
                    </div>
                </div>
            )
        }

        // ---- Deep Sea idle ----
        if (theme.name === 'deep-sea') {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                    background: 'linear-gradient(180deg, #020612 0%, #040918 30%, #071840 70%, #0a1a3a 100%)',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Caustic light refraction */}
                    <div style={{
                        position: 'absolute', inset: 0, opacity: 0.05,
                        background: 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(0,255,200,0.4) 0deg, transparent 30deg, rgba(180,77,255,0.3) 60deg, transparent 90deg)',
                        backgroundSize: '180px 180px',
                        filter: 'blur(30px)',
                        animation: 'dsCausticDrift 25s linear infinite',
                    }} />

                    {/* Jellyfish SVG — top left, drifting */}
                    <svg style={{ position: 'absolute', top: 80, left: 100, width: 90, height: 120, opacity: 0.2, animation: 'dsBubbleRise 22s ease-in-out infinite alternate' }} viewBox="0 0 60 80">
                        <ellipse cx="30" cy="22" rx="22" ry="18" fill="none" stroke="rgba(180,77,255,0.7)" strokeWidth="1.5" />
                        <ellipse cx="30" cy="22" rx="22" ry="18" fill="rgba(180,77,255,0.08)" />
                        <path d="M12 34 Q14 50 10 70" fill="none" stroke="rgba(180,77,255,0.4)" strokeWidth="1.2" strokeLinecap="round" />
                        <path d="M22 36 Q24 55 20 75" fill="none" stroke="rgba(180,77,255,0.35)" strokeWidth="1" strokeLinecap="round" />
                        <path d="M30 38 Q30 58 28 78" fill="none" stroke="rgba(180,77,255,0.4)" strokeWidth="1.2" strokeLinecap="round" />
                        <path d="M38 36 Q36 55 40 75" fill="none" stroke="rgba(180,77,255,0.35)" strokeWidth="1" strokeLinecap="round" />
                        <path d="M48 34 Q46 50 50 70" fill="none" stroke="rgba(180,77,255,0.4)" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>

                    {/* Jellyfish SVG — bottom right, different color */}
                    <svg style={{ position: 'absolute', bottom: 100, right: 120, width: 70, height: 95, opacity: 0.15, animation: 'dsBubbleRise 28s ease-in-out infinite alternate-reverse' }} viewBox="0 0 60 80">
                        <ellipse cx="30" cy="22" rx="20" ry="16" fill="none" stroke="rgba(0,255,200,0.6)" strokeWidth="1.5" />
                        <ellipse cx="30" cy="22" rx="20" ry="16" fill="rgba(0,255,200,0.06)" />
                        <path d="M14 32 Q16 48 12 68" fill="none" stroke="rgba(0,255,200,0.35)" strokeWidth="1" strokeLinecap="round" />
                        <path d="M24 34 Q26 52 22 72" fill="none" stroke="rgba(0,255,200,0.3)" strokeWidth="1" strokeLinecap="round" />
                        <path d="M36 34 Q34 52 38 72" fill="none" stroke="rgba(0,255,200,0.3)" strokeWidth="1" strokeLinecap="round" />
                        <path d="M46 32 Q44 48 48 68" fill="none" stroke="rgba(0,255,200,0.35)" strokeWidth="1" strokeLinecap="round" />
                    </svg>

                    {/* Small jellyfish — top right */}
                    <svg style={{ position: 'absolute', top: 200, right: 220, width: 45, height: 60, opacity: 0.12, animation: 'dsBubbleRise 18s ease-in-out infinite alternate' }} viewBox="0 0 60 80">
                        <ellipse cx="30" cy="22" rx="18" ry="14" fill="none" stroke="rgba(255,107,138,0.5)" strokeWidth="1.5" />
                        <ellipse cx="30" cy="22" rx="18" ry="14" fill="rgba(255,107,138,0.06)" />
                        <path d="M16 30 Q18 45 14 62" fill="none" stroke="rgba(255,107,138,0.3)" strokeWidth="1" strokeLinecap="round" />
                        <path d="M30 32 Q30 48 28 65" fill="none" stroke="rgba(255,107,138,0.3)" strokeWidth="1" strokeLinecap="round" />
                        <path d="M44 30 Q42 45 46 62" fill="none" stroke="rgba(255,107,138,0.3)" strokeWidth="1" strokeLinecap="round" />
                    </svg>

                    {/* Bubble clusters */}
                    <svg style={{ position: 'absolute', bottom: 60, left: 200, width: 40, height: 80, opacity: 0.15, animation: 'dsBubbleRise 15s linear infinite' }} viewBox="0 0 40 80">
                        <circle cx="20" cy="60" r="8" fill="none" stroke="rgba(0,255,200,0.4)" strokeWidth="1" />
                        <circle cx="12" cy="40" r="5" fill="none" stroke="rgba(0,255,200,0.3)" strokeWidth="0.8" />
                        <circle cx="28" cy="25" r="3.5" fill="none" stroke="rgba(0,255,200,0.25)" strokeWidth="0.8" />
                        <circle cx="18" cy="10" r="2" fill="none" stroke="rgba(0,255,200,0.2)" strokeWidth="0.6" />
                    </svg>
                    <svg style={{ position: 'absolute', bottom: 40, right: 300, width: 35, height: 70, opacity: 0.12, animation: 'dsBubbleRise 20s linear infinite' }} viewBox="0 0 40 80">
                        <circle cx="22" cy="65" r="7" fill="none" stroke="rgba(180,77,255,0.35)" strokeWidth="1" />
                        <circle cx="15" cy="45" r="4.5" fill="none" stroke="rgba(180,77,255,0.3)" strokeWidth="0.8" />
                        <circle cx="25" cy="28" r="3" fill="none" stroke="rgba(180,77,255,0.25)" strokeWidth="0.8" />
                    </svg>

                    {/* Ambient light rays from above */}
                    <div style={{
                        position: 'absolute', top: 0, left: '20%', width: '15%', height: '60%',
                        background: 'linear-gradient(180deg, rgba(0,255,200,0.04) 0%, transparent 100%)',
                        transform: 'skewX(-8deg)', transformOrigin: 'top',
                    }} />
                    <div style={{
                        position: 'absolute', top: 0, right: '25%', width: '10%', height: '50%',
                        background: 'linear-gradient(180deg, rgba(180,77,255,0.03) 0%, transparent 100%)',
                        transform: 'skewX(5deg)', transformOrigin: 'top',
                    }} />

                    <div style={{ textAlign: 'center', zIndex: 1 }}>
                        <p style={{
                            fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#00ffc8', opacity: 0.4,
                            letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 10,
                        }}>
                            ~ now surfacing ~
                        </p>
                        <h1 style={{
                            fontFamily: 'Quicksand, sans-serif', fontSize: 68, fontWeight: 700, color: '#e0fff8',
                            lineHeight: 1.1, marginBottom: 8,
                            textShadow: '0 0 30px rgba(0,255,200,0.5), 0 0 60px rgba(0,255,200,0.25), 0 0 100px rgba(180,77,255,0.15)',
                        }}>
                            Add a Song
                        </h1>
                        <p style={{
                            fontFamily: 'Nunito, sans-serif', fontSize: 20, color: '#8ecfc2',
                            marginBottom: 44,
                        }}>
                            Scan to dive into the queue
                        </p>
                        {qrUrl && (
                            <div style={{
                                display: 'inline-block', padding: 16, position: 'relative',
                                border: '1px solid rgba(0,255,200,0.25)',
                                borderRadius: 16,
                                boxShadow: '0 0 25px rgba(0,255,200,0.15), 0 0 50px rgba(180,77,255,0.08), inset 0 0 30px rgba(0,255,200,0.03)',
                                background: 'rgba(4,9,24,0.7)',
                                backdropFilter: 'blur(12px)',
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 210, height: 210, display: 'block', borderRadius: 8 }} />
                            </div>
                        )}
                        {sessionCode && (
                            <p style={{
                                fontFamily: 'Quicksand, sans-serif', fontSize: 26, fontWeight: 700, color: '#00ffc8',
                                letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 24,
                                textShadow: '0 0 15px rgba(0,255,200,0.5), 0 0 30px rgba(0,255,200,0.2)',
                            }}>
                                {sessionCode}
                            </p>
                        )}
                    </div>
                </div>
            )
        }

        // ---- Psychedelic idle ----
        if (theme.name === 'psychedelic') {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                    background: 'radial-gradient(ellipse at 50% 50%, #2a1248 0%, #1a0a2e 50%, #0f0620 100%)',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Lava lamp blobs */}
                    <div style={{
                        position: 'absolute', inset: '-20%', opacity: 0.5,
                        background: 'radial-gradient(ellipse 300px 300px at 25% 35%, rgba(255,45,149,0.2) 0%, transparent 70%), radial-gradient(ellipse 250px 350px at 70% 55%, rgba(182,255,45,0.15) 0%, transparent 70%), radial-gradient(ellipse 350px 250px at 50% 75%, rgba(255,140,45,0.15) 0%, transparent 70%)',
                        filter: 'blur(60px)',
                        animation: 'psyBlobMorph 20s ease-in-out infinite alternate',
                    }} />
                    {/* Second blob layer */}
                    <div style={{
                        position: 'absolute', inset: '-10%', opacity: 0.4,
                        background: 'radial-gradient(ellipse 280px 280px at 60% 25%, rgba(45,217,255,0.15) 0%, transparent 70%), radial-gradient(ellipse 320px 200px at 35% 70%, rgba(255,45,255,0.12) 0%, transparent 70%)',
                        filter: 'blur(50px)',
                        animation: 'psyBlobMorph2 28s ease-in-out infinite alternate',
                    }} />

                    {/* Spinning mandala ring — top left */}
                    <svg style={{ position: 'absolute', top: 60, left: 80, width: 140, height: 140, opacity: 0.12, animation: 'psyHueShift 12s linear infinite' }} viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,45,149,0.6)" strokeWidth="1" strokeDasharray="8 6" style={{ transformOrigin: '50px 50px', animation: 'dsCausticDrift 30s linear infinite' }} />
                        <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(182,255,45,0.5)" strokeWidth="1" strokeDasharray="5 8" style={{ transformOrigin: '50px 50px', animation: 'dsCausticDrift 22s linear infinite reverse' }} />
                        <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(255,140,45,0.5)" strokeWidth="1" strokeDasharray="4 5" style={{ transformOrigin: '50px 50px', animation: 'dsCausticDrift 18s linear infinite' }} />
                        <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(45,217,255,0.5)" strokeWidth="1.5" />
                    </svg>

                    {/* Peace sign — bottom right */}
                    <svg style={{ position: 'absolute', bottom: 80, right: 100, width: 100, height: 100, opacity: 0.12, animation: 'psyWobble 8s ease-in-out infinite' }} viewBox="0 0 60 60">
                        <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(182,255,45,0.6)" strokeWidth="2" />
                        <line x1="30" y1="4" x2="30" y2="56" stroke="rgba(182,255,45,0.6)" strokeWidth="2" />
                        <line x1="30" y1="30" x2="12" y2="50" stroke="rgba(182,255,45,0.6)" strokeWidth="2" strokeLinecap="round" />
                        <line x1="30" y1="30" x2="48" y2="50" stroke="rgba(182,255,45,0.6)" strokeWidth="2" strokeLinecap="round" />
                    </svg>

                    {/* Smaller peace sign — top right */}
                    <svg style={{ position: 'absolute', top: 180, right: 200, width: 55, height: 55, opacity: 0.08, animation: 'psyWobble 6s ease-in-out infinite reverse' }} viewBox="0 0 60 60">
                        <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,45,149,0.6)" strokeWidth="2" />
                        <line x1="30" y1="4" x2="30" y2="56" stroke="rgba(255,45,149,0.6)" strokeWidth="2" />
                        <line x1="30" y1="30" x2="12" y2="50" stroke="rgba(255,45,149,0.6)" strokeWidth="2" strokeLinecap="round" />
                        <line x1="30" y1="30" x2="48" y2="50" stroke="rgba(255,45,149,0.6)" strokeWidth="2" strokeLinecap="round" />
                    </svg>

                    {/* Spinning mandala ring — bottom left */}
                    <svg style={{ position: 'absolute', bottom: 120, left: 160, width: 90, height: 90, opacity: 0.1, animation: 'psyHueShift 16s linear infinite' }} viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,140,45,0.5)" strokeWidth="1" strokeDasharray="6 4" style={{ transformOrigin: '50px 50px', animation: 'dsCausticDrift 20s linear infinite reverse' }} />
                        <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,45,255,0.4)" strokeWidth="1" strokeDasharray="3 6" style={{ transformOrigin: '50px 50px', animation: 'dsCausticDrift 15s linear infinite' }} />
                        <circle cx="50" cy="50" r="16" fill="none" stroke="rgba(182,255,45,0.4)" strokeWidth="1.5" />
                    </svg>

                    {/* Decorative flower — center right */}
                    <svg style={{ position: 'absolute', top: '40%', right: 60, width: 70, height: 70, opacity: 0.1, animation: 'dsCausticDrift 24s linear infinite' }} viewBox="0 0 60 60">
                        {[0, 60, 120, 180, 240, 300].map(angle => (
                            <ellipse key={angle} cx="30" cy="14" rx="8" ry="14" fill="none" stroke="rgba(255,45,149,0.5)" strokeWidth="1" transform={`rotate(${angle} 30 30)`} />
                        ))}
                        <circle cx="30" cy="30" r="6" fill="rgba(255,140,45,0.15)" stroke="rgba(255,140,45,0.4)" strokeWidth="1" />
                    </svg>

                    <div style={{ textAlign: 'center', zIndex: 1 }}>
                        <p style={{
                            fontFamily: 'Spicy Rice, cursive', fontSize: 16, color: '#ff2d95', opacity: 0.5,
                            letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8,
                        }}>
                            ~ far out ~
                        </p>
                        <h1 style={{
                            fontFamily: 'Chicle, cursive', fontSize: 72, color: '#f5ecff',
                            lineHeight: 1.1, marginBottom: 8,
                            textShadow: '0 0 30px rgba(255,45,149,0.5), 0 0 60px rgba(182,255,45,0.25), 0 0 100px rgba(255,140,45,0.15)',
                            animation: 'psyWobble 6s ease-in-out infinite',
                        }}>
                            Add a Song
                        </h1>
                        <p style={{
                            fontFamily: 'Spicy Rice, cursive', fontSize: 22, color: '#c8a8e8',
                            marginBottom: 44,
                        }}>
                            Scan to join the groove
                        </p>
                        {qrUrl && (
                            <div style={{
                                display: 'inline-block', padding: 16, position: 'relative',
                                border: '2px solid rgba(255,45,149,0.3)',
                                borderRadius: 20,
                                boxShadow: '0 0 25px rgba(255,45,149,0.18), 0 0 50px rgba(182,255,45,0.1), inset 0 0 30px rgba(255,45,149,0.04)',
                                background: 'rgba(26,10,46,0.65)',
                                backdropFilter: 'blur(12px)',
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 210, height: 210, display: 'block', borderRadius: 10 }} />
                            </div>
                        )}
                        {sessionCode && (
                            <p style={{
                                fontFamily: 'Chicle, cursive', fontSize: 28, color: '#ff2d95',
                                letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 24,
                                textShadow: '0 0 15px rgba(255,45,149,0.5), 0 0 30px rgba(182,255,45,0.2)',
                            }}>
                                {sessionCode}
                            </p>
                        )}
                    </div>
                </div>
            )
        }

        // ---- Zen (Japanese Garden) idle ----
        if (theme.name === 'zen') {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                    background: 'linear-gradient(180deg, #0e0c09 0%, #1a1814 30%, #1f1b15 60%, #15120e 100%)',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Ink wash background overlay */}
                    <div style={{
                        position: 'absolute', inset: '-20%', opacity: 0.05,
                        background: 'radial-gradient(ellipse 60% 50% at 25% 30%, rgba(201,168,76,0.5) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 70% 60%, rgba(139,107,74,0.4) 0%, transparent 70%)',
                        filter: 'blur(40px)', animation: 'zenInkDrift 30s ease-in-out infinite',
                    }} />

                    {/* Mountain silhouettes — back layer */}
                    <svg style={{ position: 'absolute', bottom: '18%', left: 0, width: '100%', height: '45%', opacity: 0.08 }} viewBox="0 0 1200 400" preserveAspectRatio="none">
                        <path d="M0 400 L0 280 Q150 120 300 220 Q450 100 600 180 Q750 60 900 200 Q1050 130 1200 250 L1200 400 Z" fill="#B8A898" />
                    </svg>
                    {/* Mountain silhouettes — mid layer */}
                    <svg style={{ position: 'absolute', bottom: '15%', left: 0, width: '100%', height: '40%', opacity: 0.05 }} viewBox="0 0 1200 400" preserveAspectRatio="none">
                        <path d="M0 400 L0 320 Q200 180 400 280 Q550 150 700 240 Q850 170 1000 260 Q1100 200 1200 300 L1200 400 Z" fill="#8B7B6B" />
                    </svg>

                    {/* Drifting mist — layer 1 (slow) */}
                    <div style={{
                        position: 'absolute', top: '35%', left: '-100%', width: '300%', height: 80,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(240,230,211,0.03) 20%, rgba(240,230,211,0.05) 50%, rgba(240,230,211,0.03) 80%, transparent 100%)',
                        animation: 'zenMistDrift 35s linear infinite', filter: 'blur(8px)',
                    }} />
                    {/* Drifting mist — layer 2 (faster) */}
                    <div style={{
                        position: 'absolute', top: '50%', left: '-100%', width: '300%', height: 60,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(240,230,211,0.02) 30%, rgba(240,230,211,0.04) 50%, rgba(240,230,211,0.02) 70%, transparent 100%)',
                        animation: 'zenMistDrift 25s linear infinite reverse', filter: 'blur(12px)',
                    }} />
                    {/* Drifting mist — layer 3 (subtle) */}
                    <div style={{
                        position: 'absolute', top: '65%', left: '-100%', width: '300%', height: 50,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.02) 25%, rgba(201,168,76,0.03) 50%, rgba(201,168,76,0.02) 75%, transparent 100%)',
                        animation: 'zenMistDrift 45s linear infinite', filter: 'blur(15px)',
                    }} />

                    {/* Bamboo stalks — left */}
                    <svg style={{ position: 'absolute', left: 40, top: 0, height: '100%', width: 60, opacity: 0.12 }} viewBox="0 0 60 800">
                        {/* Main stalk */}
                        <line x1="20" y1="0" x2="20" y2="800" stroke="#7BA05B" strokeWidth="3" />
                        <line x1="20" y1="150" x2="20" y2="155" stroke="#5A7A3E" strokeWidth="5" />
                        <line x1="20" y1="350" x2="20" y2="355" stroke="#5A7A3E" strokeWidth="5" />
                        <line x1="20" y1="550" x2="20" y2="555" stroke="#5A7A3E" strokeWidth="5" />
                        {/* Leaves */}
                        <ellipse cx="35" cy="140" rx="18" ry="4" fill="#7BA05B" opacity="0.7" style={{ transformOrigin: '20px 140px', animation: 'zenBambooSway 6s ease-in-out infinite' }} />
                        <ellipse cx="5" cy="340" rx="16" ry="3.5" fill="#7BA05B" opacity="0.6" style={{ transformOrigin: '20px 340px', animation: 'zenBambooSway 7s ease-in-out infinite reverse' }} />
                        <ellipse cx="38" cy="540" rx="15" ry="3" fill="#7BA05B" opacity="0.5" style={{ transformOrigin: '20px 540px', animation: 'zenBambooSway 8s ease-in-out infinite' }} />
                        {/* Second stalk */}
                        <line x1="45" y1="100" x2="45" y2="800" stroke="#7BA05B" strokeWidth="2" opacity="0.6" />
                        <ellipse cx="55" cy="280" rx="12" ry="3" fill="#7BA05B" opacity="0.4" style={{ transformOrigin: '45px 280px', animation: 'zenBambooSway 9s ease-in-out infinite' }} />
                    </svg>

                    {/* Bamboo stalks — right */}
                    <svg style={{ position: 'absolute', right: 40, top: 0, height: '100%', width: 60, opacity: 0.12 }} viewBox="0 0 60 800">
                        <line x1="40" y1="50" x2="40" y2="800" stroke="#7BA05B" strokeWidth="3" />
                        <line x1="40" y1="200" x2="40" y2="205" stroke="#5A7A3E" strokeWidth="5" />
                        <line x1="40" y1="450" x2="40" y2="455" stroke="#5A7A3E" strokeWidth="5" />
                        <line x1="40" y1="650" x2="40" y2="655" stroke="#5A7A3E" strokeWidth="5" />
                        <ellipse cx="25" cy="190" rx="17" ry="3.5" fill="#7BA05B" opacity="0.7" style={{ transformOrigin: '40px 190px', animation: 'zenBambooSway 7s ease-in-out infinite' }} />
                        <ellipse cx="52" cy="440" rx="14" ry="3" fill="#7BA05B" opacity="0.5" style={{ transformOrigin: '40px 440px', animation: 'zenBambooSway 8s ease-in-out infinite reverse' }} />
                        <line x1="15" y1="0" x2="15" y2="800" stroke="#7BA05B" strokeWidth="2" opacity="0.5" />
                        <ellipse cx="5" cy="350" rx="12" ry="2.5" fill="#7BA05B" opacity="0.35" style={{ transformOrigin: '15px 350px', animation: 'zenBambooSway 10s ease-in-out infinite' }} />
                    </svg>

                    {/* Torii Gate — SVG */}
                    <svg style={{ position: 'absolute', bottom: '22%', left: '50%', transform: 'translateX(-50%)', width: 320, height: 260, opacity: 0.25 }} viewBox="0 0 320 260">
                        {/* Top beam (kasagi) — curved */}
                        <path d="M20 30 Q160 5 300 30" stroke="#D4442A" strokeWidth="10" fill="none" strokeLinecap="round" />
                        {/* Second beam (nuki) */}
                        <line x1="45" y1="55" x2="275" y2="55" stroke="#D4442A" strokeWidth="6" />
                        {/* Left pillar */}
                        <line x1="60" y1="30" x2="60" y2="260" stroke="#D4442A" strokeWidth="8" />
                        {/* Right pillar */}
                        <line x1="260" y1="30" x2="260" y2="260" stroke="#D4442A" strokeWidth="8" />
                        {/* Pillar caps */}
                        <circle cx="60" cy="25" r="6" fill="#D4442A" />
                        <circle cx="260" cy="25" r="6" fill="#D4442A" />
                    </svg>

                    {/* Reflection pool — mirrored torii below */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, width: '100%', height: '18%',
                        background: 'linear-gradient(180deg, transparent 0%, rgba(201,168,76,0.02) 100%)',
                        overflow: 'hidden',
                    }}>
                        <svg style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) scaleY(-1)', width: 320, height: 260, opacity: 0.06, filter: 'blur(4px)' }} viewBox="0 0 320 260">
                            <path d="M20 30 Q160 5 300 30" stroke="#D4442A" strokeWidth="10" fill="none" strokeLinecap="round" />
                            <line x1="45" y1="55" x2="275" y2="55" stroke="#D4442A" strokeWidth="6" />
                            <line x1="60" y1="30" x2="60" y2="260" stroke="#D4442A" strokeWidth="8" />
                            <line x1="260" y1="30" x2="260" y2="260" stroke="#D4442A" strokeWidth="8" />
                        </svg>
                    </div>

                    {/* Enso circle — brush stroke drawing itself */}
                    <svg style={{ position: 'absolute', top: '8%', right: '12%', width: 120, height: 120, opacity: 0.1 }} viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" fill="none" stroke="#C9A84C" strokeWidth="4" strokeLinecap="round"
                            strokeDasharray="240" strokeDashoffset="240"
                            style={{ animation: 'zenEnsoDraw 6s ease-in-out infinite alternate' }}
                        />
                        {/* Brush drip at end of stroke */}
                        <circle cx="88" cy="50" r="2" fill="#C9A84C" opacity="0.5" />
                    </svg>

                    {/* Cherry blossom petals — scattered SVGs */}
                    {[
                        { x: '15%', y: '12%', size: 14, delay: 0, dur: 18, opacity: 0.15 },
                        { x: '75%', y: '20%', size: 10, delay: 4, dur: 22, opacity: 0.12 },
                        { x: '30%', y: '8%', size: 12, delay: 8, dur: 20, opacity: 0.1 },
                        { x: '60%', y: '15%', size: 8, delay: 12, dur: 24, opacity: 0.13 },
                        { x: '85%', y: '5%', size: 11, delay: 2, dur: 19, opacity: 0.11 },
                        { x: '45%', y: '25%', size: 9, delay: 6, dur: 21, opacity: 0.14 },
                    ].map((p, i) => (
                        <svg key={`petal-${i}`} style={{
                            position: 'absolute', left: p.x, top: p.y, width: p.size, height: p.size, opacity: p.opacity,
                            animation: `zenPetalFall ${p.dur}s linear ${p.delay}s infinite`,
                        }} viewBox="0 0 10 10">
                            <ellipse cx="5" cy="5" rx="4" ry="2.5" fill="#E8A0BF" transform="rotate(30 5 5)" />
                        </svg>
                    ))}

                    {/* Incense smoke wisps */}
                    <div style={{
                        position: 'absolute', bottom: '25%', left: '48%', width: 2, height: 200,
                        background: 'linear-gradient(180deg, transparent 0%, rgba(240,230,211,0.06) 30%, rgba(240,230,211,0.03) 70%, transparent 100%)',
                        animation: 'zenSmoke 12s ease-in-out infinite', filter: 'blur(3px)',
                    }} />
                    <div style={{
                        position: 'absolute', bottom: '25%', left: '52%', width: 1.5, height: 150,
                        background: 'linear-gradient(180deg, transparent 0%, rgba(201,168,76,0.04) 40%, rgba(201,168,76,0.02) 70%, transparent 100%)',
                        animation: 'zenSmoke 15s ease-in-out 3s infinite', filter: 'blur(4px)',
                    }} />

                    {/* Content */}
                    <div style={{ textAlign: 'center', zIndex: 2 }}>
                        <h1 style={{
                            fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 72, color: '#F0E6D3',
                            fontWeight: 500, fontStyle: 'italic', lineHeight: 1.1, marginBottom: 8,
                            textShadow: '0 0 30px rgba(201,168,76,0.25), 0 0 60px rgba(201,168,76,0.1)',
                            letterSpacing: '0.05em',
                        }}>
                            Find Your Song
                        </h1>
                        <p style={{
                            fontFamily: "'Zen Kaku Gothic New', sans-serif", fontSize: 16, color: '#B8A898',
                            letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 48,
                        }}>
                            Scan to begin
                        </p>
                        {qrUrl && (
                            <div style={{
                                display: 'inline-block', padding: 14,
                                border: '1px solid rgba(201,168,76,0.3)',
                                borderImage: 'linear-gradient(135deg, transparent 0%, rgba(201,168,76,0.5) 15%, transparent 25%, transparent 50%, rgba(201,168,76,0.4) 60%, transparent 70%, transparent 85%, rgba(201,168,76,0.5) 95%, transparent 100%) 1',
                                background: 'rgba(26,24,20,0.7)',
                                backdropFilter: 'blur(12px)',
                                borderRadius: 8,
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 210, height: 210, display: 'block', borderRadius: 4 }} />
                            </div>
                        )}
                        {sessionCode && (
                            <p style={{
                                fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, fontWeight: 600,
                                color: '#C9A84C', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 20,
                                textShadow: '0 0 15px rgba(201,168,76,0.3)',
                            }}>
                                {sessionCode}
                            </p>
                        )}
                    </div>
                </div>
            )
        }

        // ---- Space (Cosmic) idle ----
        if (theme.name === 'space') {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                    background: 'linear-gradient(180deg, #04040A 0%, #08080F 40%, #0A0A18 100%)',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Nebula cloud overlay */}
                    <div style={{
                        position: 'absolute', inset: '-20%', opacity: 0.05,
                        background: 'radial-gradient(ellipse 55% 45% at 20% 35%, rgba(224,64,251,0.6) 0%, transparent 70%), radial-gradient(ellipse 45% 55% at 75% 55%, rgba(64,224,208,0.5) 0%, transparent 70%)',
                        filter: 'blur(50px)', animation: 'spaceNebulaDrift 35s ease-in-out infinite',
                    }} />

                    {/* Starfield — scattered dots */}
                    {[
                        { x: '5%', y: '8%', s: 2, o: 0.7 }, { x: '12%', y: '22%', s: 1.5, o: 0.4 },
                        { x: '20%', y: '5%', s: 1, o: 0.6 }, { x: '28%', y: '35%', s: 2, o: 0.3 },
                        { x: '35%', y: '12%', s: 1.5, o: 0.5 }, { x: '42%', y: '28%', s: 1, o: 0.7 },
                        { x: '55%', y: '8%', s: 2, o: 0.4 }, { x: '62%', y: '18%', s: 1.5, o: 0.6 },
                        { x: '70%', y: '32%', s: 1, o: 0.5 }, { x: '78%', y: '6%', s: 2, o: 0.3 },
                        { x: '85%', y: '25%', s: 1.5, o: 0.7 }, { x: '92%', y: '15%', s: 1, o: 0.4 },
                        { x: '8%', y: '70%', s: 1.5, o: 0.5 }, { x: '18%', y: '85%', s: 2, o: 0.3 },
                        { x: '75%', y: '75%', s: 1, o: 0.6 }, { x: '88%', y: '65%', s: 1.5, o: 0.4 },
                        { x: '50%', y: '90%', s: 2, o: 0.35 }, { x: '30%', y: '60%', s: 1, o: 0.5 },
                    ].map((star, i) => (
                        <div key={`star-${i}`} style={{
                            position: 'absolute', left: star.x, top: star.y,
                            width: star.s, height: star.s, borderRadius: '50%',
                            background: i % 5 === 0 ? 'rgba(224,64,251,0.8)' : i % 7 === 0 ? 'rgba(64,224,208,0.7)' : 'rgba(232,230,240,0.8)',
                            opacity: star.o,
                            animation: `spaceTwinkle${i % 2 === 0 ? '' : '2'} ${3 + (i % 4)}s ease-in-out ${(i * 0.7) % 4}s infinite`,
                        }} />
                    ))}

                    {/* Warp star trails — radial lines from center */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }} viewBox="0 0 1200 800">
                        {Array.from({ length: 16 }).map((_, i) => {
                            const angle = (i / 16) * Math.PI * 2
                            const cx = 600, cy = 400
                            const innerR = 80, outerR = 600
                            const x1 = cx + Math.cos(angle) * innerR
                            const y1 = cy + Math.sin(angle) * innerR
                            const x2 = cx + Math.cos(angle) * outerR
                            const y2 = cy + Math.sin(angle) * outerR
                            return <line key={`warp-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(232,230,240,0.5)" strokeWidth={0.8 + (i % 3) * 0.4} />
                        })}
                    </svg>

                    {/* Planet (Saturn-like) silhouette — lower right */}
                    <svg style={{ position: 'absolute', bottom: '10%', right: '15%', width: 220, height: 180, opacity: 0.15 }} viewBox="0 0 220 180">
                        {/* Planet body */}
                        <circle cx="110" cy="95" r="55" fill="#0A0A18" stroke="rgba(224,64,251,0.3)" strokeWidth="1.5" />
                        {/* Edge glow */}
                        <circle cx="110" cy="95" r="55" fill="none" stroke="rgba(64,224,208,0.15)" strokeWidth="3" />
                        {/* Ring — elliptical arc */}
                        <ellipse cx="110" cy="95" rx="95" ry="20" fill="none" stroke="rgba(255,183,64,0.25)" strokeWidth="2" strokeDasharray="4 3" />
                        <ellipse cx="110" cy="95" rx="85" ry="16" fill="none" stroke="rgba(224,64,251,0.15)" strokeWidth="1" />
                    </svg>

                    {/* Orbiting particles around planet */}
                    {[0, 1, 2].map(i => (
                        <div key={`orbit-${i}`} style={{
                            position: 'absolute', bottom: `calc(10% + 85px)`, right: `calc(15% + 100px)`,
                            width: 4, height: 4, borderRadius: '50%',
                            background: i === 0 ? '#E040FB' : i === 1 ? '#40E0D0' : '#FFB740',
                            opacity: 0.6,
                            animation: `spaceOrbit ${4 + i * 1.5}s linear ${i * 1.2}s infinite`,
                        }} />
                    ))}

                    {/* Distant galaxy — top left */}
                    <svg style={{ position: 'absolute', top: '12%', left: '10%', width: 60, height: 60, opacity: 0.06 }} viewBox="0 0 60 60">
                        <ellipse cx="30" cy="30" rx="25" ry="8" fill="none" stroke="rgba(224,64,251,0.5)" strokeWidth="0.8" transform="rotate(-30 30 30)" />
                        <ellipse cx="30" cy="30" rx="18" ry="6" fill="none" stroke="rgba(64,224,208,0.4)" strokeWidth="0.6" transform="rotate(-30 30 30)" />
                        <circle cx="30" cy="30" r="3" fill="rgba(232,230,240,0.3)" />
                    </svg>

                    {/* Distant galaxy — bottom left */}
                    <svg style={{ position: 'absolute', bottom: '20%', left: '20%', width: 45, height: 45, opacity: 0.04 }} viewBox="0 0 60 60">
                        <ellipse cx="30" cy="30" rx="22" ry="7" fill="none" stroke="rgba(255,183,64,0.5)" strokeWidth="0.7" transform="rotate(20 30 30)" />
                        <ellipse cx="30" cy="30" rx="15" ry="5" fill="none" stroke="rgba(224,64,251,0.3)" strokeWidth="0.5" transform="rotate(20 30 30)" />
                        <circle cx="30" cy="30" r="2.5" fill="rgba(232,230,240,0.25)" />
                    </svg>

                    {/* Shooting star */}
                    <div style={{
                        position: 'absolute', top: '15%', left: '25%', width: 80, height: 1,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(232,230,240,0.6) 40%, rgba(64,224,208,0.4) 100%)',
                        transform: 'rotate(-25deg)',
                        animation: 'spaceShootingStar 12s linear infinite',
                        borderRadius: 1,
                    }} />
                    <div style={{
                        position: 'absolute', top: '40%', right: '20%', width: 60, height: 1,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(232,230,240,0.5) 40%, rgba(224,64,251,0.3) 100%)',
                        transform: 'rotate(-30deg)',
                        animation: 'spaceShootingStar 18s linear 6s infinite',
                        borderRadius: 1,
                    }} />

                    {/* Content */}
                    <div style={{ textAlign: 'center', zIndex: 2 }}>
                        <h1 style={{
                            fontFamily: "'Orbitron', sans-serif", fontSize: 64, color: '#E8E6F0',
                            fontWeight: 700, lineHeight: 1.1, marginBottom: 8,
                            textShadow: '0 0 30px rgba(224,64,251,0.35), 0 0 60px rgba(64,224,208,0.15), 0 0 100px rgba(224,64,251,0.1)',
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>
                            Launch a Song
                        </h1>
                        <p style={{
                            fontFamily: "'Exo 2', sans-serif", fontSize: 16, color: '#9896A8',
                            letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 48,
                        }}>
                            Scan to queue from orbit
                        </p>
                        {qrUrl && (
                            <div style={{
                                display: 'inline-block', padding: 14,
                                border: '1px solid rgba(64,224,208,0.3)',
                                boxShadow: '0 0 20px rgba(64,224,208,0.1), 0 0 40px rgba(224,64,251,0.05), inset 0 0 20px rgba(64,224,208,0.03)',
                                background: 'rgba(8,8,15,0.75)',
                                backdropFilter: 'blur(12px)',
                                borderRadius: 6,
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 210, height: 210, display: 'block', borderRadius: 3 }} />
                            </div>
                        )}
                        {sessionCode && (
                            <p style={{
                                fontFamily: "'Orbitron', sans-serif", fontSize: 24, fontWeight: 600,
                                color: '#E040FB', letterSpacing: '0.35em', textTransform: 'uppercase', marginTop: 20,
                                textShadow: '0 0 15px rgba(224,64,251,0.4), 0 0 30px rgba(224,64,251,0.15)',
                            }}>
                                {sessionCode}
                            </p>
                        )}
                    </div>
                </div>
            )
        }

        // ---- Steampunk (Victorian Industrial) idle ----
        if (theme.name === 'steampunk') {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                    background: 'linear-gradient(180deg, #0e0b09 0%, #14110F 35%, #1a1510 65%, #100d0a 100%)',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Warm vignette */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(ellipse at center, rgba(200,151,62,0.03) 0%, transparent 50%, rgba(0,0,0,0.4) 100%)',
                    }} />

                    {/* Large gear — top right, spinning clockwise */}
                    <svg style={{ position: 'absolute', top: -60, right: -40, width: 280, height: 280, opacity: 0.08, animation: 'steamGearSpin 30s linear infinite' }} viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="60" fill="none" stroke="#C8973E" strokeWidth="3" />
                        <circle cx="100" cy="100" r="25" fill="none" stroke="#C8973E" strokeWidth="2" />
                        <circle cx="100" cy="100" r="8" fill="rgba(200,151,62,0.3)" />
                        {Array.from({ length: 12 }).map((_, i) => {
                            const angle = (i / 12) * Math.PI * 2
                            const x1 = 100 + Math.cos(angle) * 60
                            const y1 = 100 + Math.sin(angle) * 60
                            const x2 = 100 + Math.cos(angle) * 78
                            const y2 = 100 + Math.sin(angle) * 78
                            return <line key={`gt-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C8973E" strokeWidth="10" strokeLinecap="round" />
                        })}
                    </svg>

                    {/* Medium gear — bottom left, counter-clockwise (interlocking ratio) */}
                    <svg style={{ position: 'absolute', bottom: -30, left: -20, width: 200, height: 200, opacity: 0.06, animation: 'steamGearSpinReverse 20s linear infinite' }} viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="50" fill="none" stroke="#E07040" strokeWidth="2.5" />
                        <circle cx="100" cy="100" r="20" fill="none" stroke="#E07040" strokeWidth="1.5" />
                        <circle cx="100" cy="100" r="6" fill="rgba(224,112,64,0.3)" />
                        {Array.from({ length: 8 }).map((_, i) => {
                            const angle = (i / 8) * Math.PI * 2
                            const x1 = 100 + Math.cos(angle) * 50
                            const y1 = 100 + Math.sin(angle) * 50
                            const x2 = 100 + Math.cos(angle) * 65
                            const y2 = 100 + Math.sin(angle) * 65
                            return <line key={`gb-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E07040" strokeWidth="8" strokeLinecap="round" />
                        })}
                    </svg>

                    {/* Small gear — mid left, clockwise */}
                    <svg style={{ position: 'absolute', top: '40%', left: 60, width: 100, height: 100, opacity: 0.05, animation: 'steamGearSpin 15s linear infinite' }} viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="45" fill="none" stroke="#5A9E8F" strokeWidth="2" />
                        <circle cx="100" cy="100" r="15" fill="none" stroke="#5A9E8F" strokeWidth="1.5" />
                        {Array.from({ length: 6 }).map((_, i) => {
                            const angle = (i / 6) * Math.PI * 2
                            const x1 = 100 + Math.cos(angle) * 45
                            const y1 = 100 + Math.sin(angle) * 45
                            const x2 = 100 + Math.cos(angle) * 58
                            const y2 = 100 + Math.sin(angle) * 58
                            return <line key={`gs-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5A9E8F" strokeWidth="7" strokeLinecap="round" />
                        })}
                    </svg>

                    {/* Steam pipe network — horizontal pipes with joints */}
                    <svg style={{ position: 'absolute', bottom: '25%', left: 0, width: '100%', height: 4, opacity: 0.1 }} preserveAspectRatio="none">
                        <line x1="0" y1="2" x2="100%" y2="2" stroke="#C8973E" strokeWidth="3" />
                    </svg>
                    {[80, 250, 450, 650, 850].map((x, i) => (
                        <div key={`joint-${i}`} style={{
                            position: 'absolute', bottom: 'calc(25% - 4px)', left: x, width: 10, height: 10,
                            borderRadius: '50%', border: '1.5px solid rgba(200,151,62,0.15)',
                            background: 'rgba(200,151,62,0.06)',
                        }} />
                    ))}

                    {/* Vertical pipe */}
                    <div style={{ position: 'absolute', top: 0, right: '22%', width: 3, height: '25%', background: 'rgba(200,151,62,0.08)' }} />
                    <div style={{ position: 'absolute', top: 0, right: 'calc(22% - 3px)', width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(200,151,62,0.12)', background: 'rgba(200,151,62,0.04)', marginTop: 'calc(25% - 4px)' }} />

                    {/* Pressure gauge — SVG */}
                    <svg style={{ position: 'absolute', top: '15%', right: '10%', width: 80, height: 80, opacity: 0.12 }} viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#C8973E" strokeWidth="2" />
                        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(200,151,62,0.3)" strokeWidth="0.5" />
                        {/* Tick marks */}
                        {Array.from({ length: 8 }).map((_, i) => {
                            const angle = (i / 8) * Math.PI * 2 - Math.PI / 2
                            const x1 = 50 + Math.cos(angle) * 35
                            const y1 = 50 + Math.sin(angle) * 35
                            const x2 = 50 + Math.cos(angle) * 40
                            const y2 = 50 + Math.sin(angle) * 40
                            return <line key={`tick-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C8973E" strokeWidth="1.5" />
                        })}
                        {/* Needle */}
                        <line x1="50" y1="50" x2="50" y2="15" stroke="#E07040" strokeWidth="1.5" strokeLinecap="round" style={{ transformOrigin: '50px 50px', animation: 'steamNeedle 4s ease-in-out infinite' }} />
                        <circle cx="50" cy="50" r="4" fill="#C8973E" />
                    </svg>

                    {/* Steam puffs rising from pipe joints */}
                    {[
                        { x: 83, delay: 0 }, { x: 253, delay: 3 }, { x: 453, delay: 7 }, { x: 853, delay: 5 },
                    ].map((p, i) => (
                        <div key={`puff-${i}`} style={{
                            position: 'absolute', bottom: 'calc(25% + 8px)', left: p.x,
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'rgba(212,206,192,0.15)',
                            filter: 'blur(2px)',
                            animation: `steamPuff 8s ease-out ${p.delay}s infinite`,
                        }} />
                    ))}

                    {/* Victorian scrollwork corners */}
                    <svg style={{ position: 'absolute', top: 20, left: 20, width: 80, height: 80, opacity: 0.1 }} viewBox="0 0 80 80">
                        <path d="M5 5 Q5 25 15 18 Q28 8 22 22 Q16 36 28 28 Q40 20 34 34" fill="none" stroke="#C8973E" strokeWidth="1.2" strokeLinecap="round" />
                        <circle cx="8" cy="8" r="2" fill="rgba(200,151,62,0.4)" />
                    </svg>
                    <svg style={{ position: 'absolute', bottom: 20, right: 20, width: 80, height: 80, opacity: 0.1, transform: 'rotate(180deg)' }} viewBox="0 0 80 80">
                        <path d="M5 5 Q5 25 15 18 Q28 8 22 22 Q16 36 28 28 Q40 20 34 34" fill="none" stroke="#C8973E" strokeWidth="1.2" strokeLinecap="round" />
                        <circle cx="8" cy="8" r="2" fill="rgba(200,151,62,0.4)" />
                    </svg>

                    {/* Gaslight lantern — top center */}
                    <svg style={{ position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)', width: 30, height: 50, opacity: 0.15 }} viewBox="0 0 30 50">
                        {/* Hook */}
                        <line x1="15" y1="0" x2="15" y2="10" stroke="#C8973E" strokeWidth="1.5" />
                        {/* Lantern body */}
                        <rect x="8" y="10" width="14" height="20" rx="2" fill="none" stroke="#C8973E" strokeWidth="1.5" />
                        {/* Flame glow */}
                        <ellipse cx="15" cy="22" rx="3" ry="5" fill="rgba(232,184,76,0.4)" style={{ animation: 'steamFlicker 3s ease-in-out infinite' }} />
                        {/* Bottom cap */}
                        <line x1="6" y1="30" x2="24" y2="30" stroke="#C8973E" strokeWidth="1.5" />
                        <line x1="10" y1="30" x2="10" y2="34" stroke="#C8973E" strokeWidth="1" />
                        <line x1="20" y1="30" x2="20" y2="34" stroke="#C8973E" strokeWidth="1" />
                    </svg>

                    {/* Content */}
                    <div style={{ textAlign: 'center', zIndex: 2 }}>
                        <h1 style={{
                            fontFamily: "'Cinzel Decorative', serif", fontSize: 52, color: '#E8DCC8',
                            fontWeight: 400, lineHeight: 1.2, marginBottom: 8,
                            textShadow: '0 0 20px rgba(200,151,62,0.35), 0 0 50px rgba(200,151,62,0.12), 0 0 80px rgba(224,112,64,0.06)',
                            letterSpacing: '0.06em',
                        }}>
                            Queue a Tune
                        </h1>
                        <p style={{
                            fontFamily: "'Spectral', serif", fontSize: 16, color: '#A89878',
                            letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 48,
                            fontStyle: 'italic',
                        }}>
                            Scan to power the engine
                        </p>
                        {qrUrl && (
                            <div style={{
                                display: 'inline-block', padding: 14,
                                border: '2px solid rgba(200,151,62,0.3)',
                                borderImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 14px, rgba(200,151,62,0.4) 14px, rgba(200,151,62,0.4) 18px, transparent 18px, transparent 32px) 1',
                                background: 'rgba(20,17,15,0.8)',
                                backdropFilter: 'blur(12px)',
                                borderRadius: 4,
                            }}>
                                <img src={qrUrl} alt="QR" style={{ width: 210, height: 210, display: 'block', borderRadius: 2 }} />
                            </div>
                        )}
                        {sessionCode && (
                            <p style={{
                                fontFamily: "'Cinzel', serif", fontSize: 26, fontWeight: 600,
                                color: '#C8973E', letterSpacing: '0.35em', textTransform: 'uppercase', marginTop: 20,
                                textShadow: '0 0 15px rgba(200,151,62,0.3)',
                            }}>
                                {sessionCode}
                            </p>
                        )}
                    </div>
                </div>
            )
        }

        // ---- Urban (Hip Hop) idle ----
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
                background: '#050505', position: 'relative', overflow: 'hidden',
            }}>
                {/* Spotlight vignette */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 50%, rgba(0,0,0,0.8) 100%)',
                }} />
                {/* Grunge texture */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, mixBlendMode: 'overlay' as const }}>
                    <filter id="idle-noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" /></filter>
                    <rect width="100%" height="100%" filter="url(#idle-noise)" />
                </svg>

                {/* Diagonal accent slashes */}
                <div style={{
                    position: 'absolute', top: 0, right: 0, width: 300, height: '100%',
                    background: 'linear-gradient(135deg, transparent 40%, rgba(212,255,0,0.04) 40%, rgba(212,255,0,0.04) 42%, transparent 42%)',
                }} />
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, width: 250, height: '100%',
                    background: 'linear-gradient(135deg, transparent 55%, rgba(255,30,30,0.03) 55%, rgba(255,30,30,0.03) 57%, transparent 57%)',
                }} />

                <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <h1 style={{
                        fontFamily: 'Permanent Marker, cursive', fontSize: 76, color: '#FFFFFF',
                        lineHeight: 1.1, marginBottom: 4,
                        textShadow: '3px 3px 0 rgba(0,0,0,0.8)',
                    }}>
                        DROP A TRACK
                    </h1>
                    <p style={{
                        fontFamily: 'Oswald, sans-serif', fontSize: 18, color: '#B0B0B0',
                        letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 48,
                    }}>
                        Scan to add your song
                    </p>
                    {qrUrl && (
                        <div style={{
                            display: 'inline-block', padding: 12,
                            border: '2px solid #D4FF00',
                            clipPath: 'polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%)',
                            background: 'rgba(0,0,0,0.6)',
                        }}>
                            <img src={qrUrl} alt="QR" style={{ width: 210, height: 210, display: 'block' }} />
                        </div>
                    )}
                    {sessionCode && (
                        <p style={{
                            fontFamily: 'Oswald, sans-serif', fontSize: 26, fontWeight: 600, color: '#D4FF00',
                            letterSpacing: '0.35em', textTransform: 'uppercase', marginTop: 20,
                            textShadow: '0 0 10px rgba(212,255,0,0.3)',
                        }}>
                            {sessionCode}
                        </p>
                    )}
                </div>
            </div>
        )
    }

    const qrOverlay = state.karaokeQrDataUrl ? (
        <div style={{
            position: 'fixed', top: 'calc(100vh - 150px)', left: 80, zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
            <div style={{
                ...theme.stickerLabel,
                background: theme.name === 'neo-brutal' || theme.name === 'sketch' ? theme.appBg : 'rgba(0,0,0,0.8)',
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                backdropFilter: 'blur(16px)',
                ...(theme.name === 'space' ? {
                    background: 'rgba(8,8,15,0.85)',
                    border: '1px solid rgba(64,224,208,0.25)',
                    boxShadow: '0 0 15px rgba(64,224,208,0.1), 0 0 30px rgba(224,64,251,0.05), inset 0 0 20px rgba(64,224,208,0.03)',
                    borderRadius: 6,
                } : theme.name === 'steampunk' ? {
                    background: 'rgba(20,17,15,0.88)',
                    border: '1px solid rgba(200,151,62,0.3)',
                    boxShadow: '0 0 12px rgba(200,151,62,0.1), inset 0 0 15px rgba(200,151,62,0.03)',
                    borderRadius: 3,
                } : {}),
            }}>
                <img src={state.karaokeQrDataUrl} alt="QR" style={{
                    width: 80, height: 80,
                    borderRadius: theme.radiusSmall,
                    display: 'block',
                    ...(theme.name === 'space' ? { boxShadow: '0 0 10px rgba(64,224,208,0.15)' } : theme.name === 'steampunk' ? { boxShadow: '0 0 8px rgba(200,151,62,0.15)' } : {}),
                }} />
                <span style={{
                    fontFamily: theme.fontDisplay,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: theme.accentA,
                    textAlign: 'center',
                    display: 'block',
                    width: '100%',
                    ...(theme.name === 'space' ? {
                        color: '#40E0D0',
                        textShadow: '0 0 8px rgba(64,224,208,0.5)',
                    } : theme.name === 'steampunk' ? {
                        color: '#C8973E',
                        textShadow: '0 0 8px rgba(200,151,62,0.4)',
                    } : {}),
                }}>
                    Join
                </span>
            </div>
        </div>
    ) : null

    return (
        <>
        <div className="karaoke-stage" onMouseMove={handleMouse} style={{ cursor: showUI ? 'default' : 'none' }}>
            {/* Background with crossfade */}
            <div className="k-bg">
                {/* Previous art stays visible until new art loads */}
                {prevArt && prevArt !== art && !artLoaded && (
                    <img className="k-bg__img k-bg__img--prev" src={prevArt} alt="" style={{ opacity: 1 }} />
                )}
                {art && <img className="k-bg__img" src={art} alt="" style={{ opacity: artLoaded || !prevArt ? 1 : 0 }} />}
                {ytId && (
                    <div className="k-bg__yt-wrap" style={{ opacity: 1 }}>
                        <div id="yt-bg-player" />
                        <div className="k-bg__yt-mask" aria-hidden="true" />
                    </div>
                )}
                <div className="k-bg__scrim" style={{ opacity: state.stageMode === 'playing' ? 1 : 0 }} />
            </div>

            {/* Reactions overlay — above video, behind lyrics */}
            <ReactionsOverlay />

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
            <div className="k-song-chip" style={{
                background: theme.appBg, ...theme.stickerLabel, position: 'absolute', opacity: 1,
                ...(theme.name === 'space' ? {
                    background: 'rgba(8,8,15,0.85)',
                    border: '1px solid rgba(64,224,208,0.2)',
                    boxShadow: '0 0 12px rgba(64,224,208,0.08), 0 0 25px rgba(224,64,251,0.04)',
                    borderRadius: 8,
                    backdropFilter: 'blur(16px)',
                    color: '#E8E6F0',
                } : theme.name === 'steampunk' ? {
                    background: 'rgba(20,17,15,0.88)',
                    border: '1px solid rgba(200,151,62,0.25)',
                    boxShadow: '0 0 10px rgba(200,151,62,0.08), inset 0 0 12px rgba(200,151,62,0.03)',
                    borderRadius: 3,
                    backdropFilter: 'blur(16px)',
                    color: '#E8DCC8',
                } : {}),
            }}>
                {art && <img className="k-song-chip__art" src={art} alt="" style={
                    theme.name === 'space' ? { boxShadow: '0 0 15px rgba(224,64,251,0.2), 0 6px 20px rgba(0,0,0,0.5)', borderRadius: 8, border: '1px solid rgba(224,64,251,0.15)' } : theme.name === 'steampunk' ? { boxShadow: '0 0 10px rgba(200,151,62,0.15), 0 6px 20px rgba(0,0,0,0.5)', borderRadius: 3, border: '1px solid rgba(200,151,62,0.2)' } : {}
                } />}
                <div className="k-song-chip__text">
                    <h3 style={{ fontFamily: theme.fontDisplay, ...(theme.name === 'space' ? { color: '#E8E6F0', textShadow: '0 0 10px rgba(64,224,208,0.3)' } : theme.name === 'steampunk' ? { color: '#E8DCC8', textShadow: '0 0 10px rgba(200,151,62,0.25)' } : {}) }}>{track.name}</h3>
                    <p style={{ color: theme.muted, ...(theme.name === 'space' ? { color: '#9896A8' } : theme.name === 'steampunk' ? { color: '#A89878' } : {}) }}>{track.artists.map((a: any) => a.name).join(', ')}</p>
                </div>
            </div>

            {/* Singer tags (top-right) */}
            {singers.length > 0 && (
                <div className="k-singers" style={{ opacity: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
                    {singers.map((s: any) => {
                        const spaceSingerStyle = theme.name === 'space' ? {
                            background: 'rgba(8,8,15,0.85)',
                            border: '1px solid ' + (s.color ? s.color.replace(')', ',0.3)').replace('rgb(', 'rgba(') : 'rgba(64,224,208,0.2)'),
                            boxShadow: '0 0 10px ' + (s.color ? s.color.replace(')', ',0.1)').replace('rgb(', 'rgba(') : 'rgba(64,224,208,0.08)'),
                            borderRadius: 6,
                            backdropFilter: 'blur(16px)',
                            color: '#E8E6F0',
                        } as React.CSSProperties : theme.name === 'steampunk' ? {
                            background: 'rgba(20,17,15,0.88)',
                            border: '1px solid rgba(200,151,62,0.25)',
                            boxShadow: '0 0 8px rgba(200,151,62,0.1)',
                            borderRadius: 3,
                            backdropFilter: 'blur(16px)',
                            color: '#E8DCC8',
                        } as React.CSSProperties : {}
                        if (s.micDeviceId) {
                            // Enable mic + effects when ready (Up Next) or playing — singer can warm up before song starts
                            const micActive = state.stageMode === 'playing' || state.stageMode === 'ready'
                            let singerEffects = micActive ? voiceEffects : null
                            if (singerEffects && Array.isArray(singerEffects)) {
                                const index = s.roleIndices && s.roleIndices.length > 0 ? s.roleIndices[0] : 0
                                singerEffects = singerEffects[index] || singerEffects[0]
                            }
                            return (
                                <div key={s.id} className="k-singer-tag" style={{ background: theme.appBg, ...theme.stickerLabel, position: 'relative', padding: '4px 12px', ...spaceSingerStyle }}>
                                    <MicMeter singer={s} active={micActive} effects={singerEffects} mainOutputId={state.mainOutputId} theme={theme} />
                                </div>
                            )
                        } else {
                            return (
                                <div key={s.id} className="k-singer-tag" style={{ background: theme.appBg, ...theme.stickerLabel, position: 'relative', padding: '4px 12px', ...spaceSingerStyle }}>
                                    <span style={{ color: 'inherit', fontFamily: theme.fontDisplay }}>{s.name}</span>
                                    <div className="k-singer-tag__dot" style={{ background: s.color, ...(theme.name === 'space' ? { boxShadow: '0 0 6px ' + s.color } : {}) }} />
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
                                <p style={{ fontSize: 18, color: theme.muted, opacity: theme.name === 'sketch' ? 1 : 0.8, marginBottom: 36, display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
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
                                                    gap: 12,
                                                    padding: '16px 36px',
                                                    color: s.color,
                                                    fontWeight: 700,
                                                    fontSize: 28,
                                                }}
                                            >
                                                {s.profilePicture && (
                                                    <img src={s.profilePicture} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                                                )}
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
                                                // Multi-singer gradient applied to inner span, not outer div
                                                // (background-clip:text on parent breaks when content is in child elements)
                                                inlineStyle.filter = `drop-shadow(2px 2px 0px rgba(0,0,0,0.15))`
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
                                        } else if (theme.name === 'deep-sea') {
                                            cls += ' k-line--deep-sea'
                                            if (line.singerIndices && line.singerIndices.length > 1) {
                                                const colors = line.singerIndices.map((idx: number) => singers[idx]?.color).filter(Boolean)
                                                if (colors.length > 1) {
                                                    inlineStyle.backgroundImage = `linear-gradient(90deg, ${colors.join(', ')})`
                                                    inlineStyle.WebkitBackgroundClip = 'text'
                                                    inlineStyle.WebkitTextFillColor = 'transparent'
                                                    inlineStyle.filter = `drop-shadow(0 0 20px ${colors[0]}) drop-shadow(0 0 20px ${colors[colors.length - 1]})`
                                                }
                                            } else if (line.singerIndex !== undefined && singers[line.singerIndex]) {
                                                const singer = singers[line.singerIndex]
                                                inlineStyle.color = singer.color
                                                inlineStyle.textShadow = `0 0 12px ${singer.colorGlow}, 0 0 30px ${singer.colorGlow}, 0 0 60px ${singer.colorGlow}, 0 0 100px ${singer.colorGlow}`
                                            }
                                        } else if (theme.name === 'psychedelic') {
                                            cls += ' k-line--psychedelic'
                                            if (line.singerIndices && line.singerIndices.length > 1) {
                                                const colors = line.singerIndices.map((idx: number) => singers[idx]?.color).filter(Boolean)
                                                if (colors.length > 1) {
                                                    inlineStyle.backgroundImage = `linear-gradient(90deg, ${colors.join(', ')})`
                                                    inlineStyle.WebkitBackgroundClip = 'text'
                                                    inlineStyle.WebkitTextFillColor = 'transparent'
                                                    inlineStyle.filter = `drop-shadow(0 0 20px ${colors[0]}) drop-shadow(0 0 20px ${colors[colors.length - 1]})`
                                                }
                                            } else if (line.singerIndex !== undefined && singers[line.singerIndex]) {
                                                const singer = singers[line.singerIndex]
                                                inlineStyle.color = singer.color
                                                inlineStyle.textShadow = `0 0 10px ${singer.colorGlow}, 0 0 30px ${singer.colorGlow}, 0 0 60px ${singer.colorGlow}`
                                            }
                                        } else if (theme.name === 'zen') {
                                            cls += ' k-line--zen'
                                            if (line.singerIndices && line.singerIndices.length > 1) {
                                                const colors = line.singerIndices.map((idx: number) => singers[idx]?.color).filter(Boolean)
                                                if (colors.length > 1) {
                                                    inlineStyle.backgroundImage = `linear-gradient(90deg, ${colors.join(', ')})`
                                                    inlineStyle.WebkitBackgroundClip = 'text'
                                                    inlineStyle.WebkitTextFillColor = 'transparent'
                                                    inlineStyle.filter = `drop-shadow(0 0 12px ${colors[0]}) drop-shadow(0 0 12px ${colors[colors.length - 1]})`
                                                }
                                            } else if (line.singerIndex !== undefined && singers[line.singerIndex]) {
                                                const singer = singers[line.singerIndex]
                                                inlineStyle.color = singer.color
                                                inlineStyle.textShadow = `0 0 8px ${singer.colorGlow}, 0 0 20px ${singer.colorGlow}, 0 0 45px ${singer.colorGlow}`
                                            }
                                        } else if (theme.name === 'space') {
                                            cls += ' k-line--space'
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
                                                inlineStyle.textShadow = `0 0 6px ${singer.colorGlow}, 0 0 18px ${singer.colorGlow}, 0 0 50px ${singer.colorGlow}, 0 0 80px ${singer.colorGlow}`
                                            }
                                        } else if (theme.name === 'steampunk') {
                                            cls += ' k-line--steampunk'
                                            if (line.singerIndices && line.singerIndices.length > 1) {
                                                const colors = line.singerIndices.map((idx: number) => singers[idx]?.color).filter(Boolean)
                                                if (colors.length > 1) {
                                                    inlineStyle.backgroundImage = `linear-gradient(90deg, ${colors.join(', ')})`
                                                    inlineStyle.WebkitBackgroundClip = 'text'
                                                    inlineStyle.WebkitTextFillColor = 'transparent'
                                                    inlineStyle.filter = `drop-shadow(0 0 10px ${colors[0]}) drop-shadow(0 0 10px ${colors[colors.length - 1]})`
                                                }
                                            } else if (line.singerIndex !== undefined && singers[line.singerIndex]) {
                                                const singer = singers[line.singerIndex]
                                                inlineStyle.color = singer.color
                                                inlineStyle.textShadow = `0 0 8px ${singer.colorGlow}, 0 0 20px ${singer.colorGlow}, 0 0 40px rgba(200,151,62,0.15)`
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
                                        const multiColors = line.singerIndices && line.singerIndices.length > 1
                                            ? line.singerIndices.map((idx: number) => singers[idx]?.color).filter(Boolean)
                                            : []
                                        const highlightColor = line.singerIndex !== undefined && singers[line.singerIndex] ? singers[line.singerIndex].color : 'black'
                                        const gradientId = multiColors.length > 1 ? `sketch-grad-${line.originalIndex}-${j}` : null

                                        // For multi-singer lines, apply gradient to the span text (not parent div)
                                        const spanStyle: React.CSSProperties = { position: 'relative', zIndex: 1 }
                                        if (multiColors.length > 1) {
                                            spanStyle.backgroundImage = `linear-gradient(90deg, ${multiColors.join(', ')})`
                                            spanStyle.WebkitBackgroundClip = 'text'
                                            spanStyle.WebkitTextFillColor = 'transparent'
                                        }

                                        content = (
                                            <>
                                                <span style={spanStyle}>{displayWords}</span>
                                                <svg
                                                    style={{ position: 'absolute', bottom: 6, left: 0, width: '100%', height: '14px', pointerEvents: 'none', zIndex: 0, overflow: 'visible' }}
                                                    viewBox="0 0 100 10"
                                                    preserveAspectRatio="none"
                                                >
                                                    {gradientId && (
                                                        <defs>
                                                            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                                                                {multiColors.map((c: string, ci: number) => (
                                                                    <stop key={ci} offset={`${(ci / (multiColors.length - 1)) * 100}%`} stopColor={c} />
                                                                ))}
                                                            </linearGradient>
                                                        </defs>
                                                    )}
                                                    <path d={path} stroke={gradientId ? `url(#${gradientId})` : highlightColor} strokeWidth={strokeW} fill="none" strokeLinecap="round" />
                                                </svg>
                                            </>
                                        )
                                    }

                                    if (theme.name === 'psychedelic' && isActiveGroup) {
                                        const words = displayWords.split(/(\s+)/)
                                        const lineSeed = (line.originalIndex || 0) * 13 + j * 7
                                        content = words.map((word: string, wi: number) => {
                                            if (/^\s+$/.test(word)) return word
                                            const hash = Math.sin(lineSeed + wi * 97 + 0.5) * 10000
                                            const delay = (hash - Math.floor(hash)) * 3
                                            const dur = 2.5 + (Math.sin(lineSeed + wi * 53) * 10000 % 1) * 1.5
                                            return <span key={wi} className="psy-word" style={{ animationDelay: `${delay.toFixed(2)}s`, animationDuration: `${dur.toFixed(2)}s` }}>{word}</span>
                                        })
                                    }

                                    if (theme.name === 'zen' && isActiveGroup) {
                                        const seed = (line.originalIndex || 0) * 11 + (j * 7) + 1
                                        const r = (offset: number) => {
                                            const x = Math.sin(seed + offset) * 10000;
                                            return x - Math.floor(x);
                                        }
                                        // Brush-stroke path — more fluid/calligraphic than sketch's squiggle
                                        const y1 = 4 + r(2) * 3
                                        const y2 = 3 + r(3) * 2
                                        const y3 = 5 + r(4) * 2
                                        const path = `M2,${y1} C${20 + r(5) * 15},${y2} ${60 + r(6) * 20},${y3} 98,${4 + r(7) * 3}`
                                        const strokeW = 1.5 + r(8) * 1.5
                                        const multiColors = line.singerIndices && line.singerIndices.length > 1
                                            ? line.singerIndices.map((idx: number) => singers[idx]?.color).filter(Boolean)
                                            : []
                                        const brushColor = line.singerIndex !== undefined && singers[line.singerIndex] ? singers[line.singerIndex].color : '#C9A84C'
                                        const gradientId = multiColors.length > 1 ? `zen-grad-${line.originalIndex}-${j}` : null

                                        content = (
                                            <>
                                                <span style={{ position: 'relative', zIndex: 1 }}>{displayWords}</span>
                                                <svg
                                                    style={{ position: 'absolute', bottom: 4, left: '5%', width: '90%', height: '10px', pointerEvents: 'none', zIndex: 0, overflow: 'visible' }}
                                                    viewBox="0 0 100 10"
                                                    preserveAspectRatio="none"
                                                >
                                                    {gradientId && (
                                                        <defs>
                                                            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                                                                {multiColors.map((c: string, ci: number) => (
                                                                    <stop key={ci} offset={`${(ci / (multiColors.length - 1)) * 100}%`} stopColor={c} />
                                                                ))}
                                                            </linearGradient>
                                                        </defs>
                                                    )}
                                                    <path
                                                        d={path}
                                                        stroke={gradientId ? `url(#${gradientId})` : brushColor}
                                                        strokeWidth={strokeW}
                                                        fill="none"
                                                        strokeLinecap="round"
                                                        strokeDasharray="100"
                                                        strokeDashoffset="100"
                                                        className="zen-brush-stroke"
                                                        opacity="0.6"
                                                    />
                                                </svg>
                                            </>
                                        )
                                    }

                                    if (theme.name === 'space' && isActiveGroup) {
                                        const words = displayWords.split(/(\s+)/)
                                        const lineSeed = (line.originalIndex || 0) * 17 + j * 11
                                        content = words.map((word: string, wi: number) => {
                                            if (/^\s+$/.test(word)) return word
                                            const hash = Math.sin(lineSeed + wi * 83 + 0.5) * 10000
                                            const delay = (hash - Math.floor(hash)) * 2.5
                                            const dur = 2 + (Math.sin(lineSeed + wi * 47) * 10000 % 1) * 1.5
                                            return <span key={wi} className="space-flare-word" style={{ animationDelay: `${delay.toFixed(2)}s`, animationDuration: `${dur.toFixed(2)}s` }}>{word}</span>
                                        })
                                    }

                                    return <div key={j} className={cls} style={inlineStyle}>{content}</div>
                                })}
                            </div>
                        )
                    })
                )}
            </div>

        </div>
        {qrOverlay}
        </>
    )
}
