import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { useAudioSyncContext } from '../context/AudioSyncContext'
import { getEngine } from '../audio/playback'
import { VoiceEffects } from '../audio/VoiceEffectsTypes'

function formatTime(ms: number): string {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// ---- Now Playing Controls ----
function NowPlaying() {
    const { state, dispatch } = useApp()
    const theme = useTheme()
    const audio = useAudioSyncContext()
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)

    const np = state.nowPlaying
    const track = np?.track
    const art = track?.album.images[0]?.url
    const singers = np?.singers || []

    const statusColor = track
        ? (state.stageMode === 'playing' ? theme.mintGreen : theme.softViolet)
        : theme.muted

    return (
        <div style={{ ...theme.card, padding: 24, marginBottom: 24 }}>
            {/* Header */}
            <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: statusColor,
                marginBottom: 16,
                fontFamily: theme.fontDisplay,
            }}>
                {!track ? '-- No Song Loaded' : state.stageMode === 'playing' ? '> Now Playing' : '-- Up Next'}
            </div>

            {!track ? (
                <div style={{
                    textAlign: 'center',
                    padding: '32px 20px',
                    color: theme.muted,
                    fontFamily: theme.fontBody,
                    fontSize: 14,
                }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={theme.faint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, opacity: 0.5 }}>
                        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                    <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16, color: theme.black, marginBottom: 6 }}>
                        No song loaded
                    </div>
                    <div style={{ color: theme.muted }}>
                        Add a song to the queue and it will appear here
                    </div>
                </div>
            ) : (
            <>
            {/* Track info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                {art ? (
                    <img src={art} alt="" style={{
                        width: 72,
                        height: 72,
                        borderRadius: theme.radius,
                        objectFit: 'cover',
                        border: theme.borderThin,
                        flexShrink: 0,
                    }} />
                ) : (
                    <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: theme.radius,
                        background: theme.creamDark,
                        border: theme.borderThin,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                        </svg>
                    </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: theme.fontDisplay,
                        fontWeight: 700,
                        fontSize: 18,
                        color: theme.black,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 4,
                    }}>
                        {track.name}
                    </div>
                    <div style={{
                        fontSize: 14,
                        color: theme.muted,
                        marginBottom: 8,
                        fontFamily: theme.fontBody,
                    }}>
                        {track.artists.map(a => a.name).join(', ')}
                    </div>
                    {singers.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {singers.map(s => (
                                <div key={s.id} style={{
                                    padding: '3px 10px',
                                    borderRadius: 40,
                                    border: `2px solid ${s.color}`,
                                    color: s.color,
                                    fontWeight: 700,
                                    fontSize: 11,
                                    fontFamily: theme.fontDisplay,
                                    background: `${s.color}18`,
                                }}>
                                    {s.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{
                    fontSize: 11,
                    color: theme.muted,
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 36,
                    fontFamily: theme.fontDisplay,
                    fontWeight: 600,
                }}>
                    {formatTime(audio.elapsed)}
                </span>
                <div
                    onClick={audio.handleSeek}
                    style={{
                        flex: 1,
                        height: 8,
                        background: theme.creamDark,
                        border: theme.borderThin,
                        borderRadius: 4,
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        background: theme.hotRed,
                        width: `${audio.duration ? (audio.elapsed / audio.duration) * 100 : 0}%`,
                        transition: 'width 0.15s linear',
                    }} />
                </div>
                <span style={{
                    fontSize: 11,
                    color: theme.muted,
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 36,
                    fontFamily: theme.fontDisplay,
                    fontWeight: 600,
                    textAlign: 'right',
                }}>
                    {formatTime(audio.duration)}
                </span>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {/* Previous */}
                <button
                    onClick={audio.handlePrev}
                    title="Previous"
                    disabled={state.history.length === 0}
                    onMouseEnter={() => setHoveredBtn('prev')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{
                        ...theme.iconBtn,
                        opacity: state.history.length > 0 ? 1 : 0.3,
                        cursor: state.history.length > 0 ? 'pointer' : 'default',
                        ...(hoveredBtn === 'prev' && state.history.length > 0 ? theme.iconBtnHover : {}),
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="3" height="16" /><polygon points="19 20 9 12 19 4" />
                    </svg>
                </button>

                {/* Restart */}
                <button
                    onClick={audio.handleRestart}
                    title="Restart"
                    onMouseEnter={() => setHoveredBtn('restart')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{
                        ...theme.iconBtn,
                        ...(hoveredBtn === 'restart' ? theme.iconBtnHover : {}),
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                </button>

                {/* Play / Pause */}
                <button
                    onClick={state.stageMode === 'ready' ? audio.handleStart : audio.handlePlayPause}
                    onMouseEnter={() => setHoveredBtn('play')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        border: theme.border,
                        background: state.stageMode === 'ready' ? theme.mintGreen : theme.hotRed,
                        color: '#FFFFFF',
                        cursor: audio.loaded ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: audio.loaded ? 1 : 0.4,
                        transition: 'transform 0.1s, box-shadow 0.1s',
                        boxShadow: hoveredBtn === 'play' ? theme.shadowLift : theme.shadow,
                        transform: hoveredBtn === 'play' ? 'translate(-1px,-1px)' : 'none',
                    }}
                >
                    {state.stageMode === 'ready' ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21" /></svg>
                    ) : audio.playing ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21" /></svg>
                    )}
                </button>

                {/* Skip */}
                <button
                    onClick={audio.handleSkip}
                    title="Skip"
                    onMouseEnter={() => setHoveredBtn('skip')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{
                        ...theme.iconBtn,
                        ...(hoveredBtn === 'skip' ? theme.iconBtnHover : {}),
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 4 15 12 5 20" /><rect x="17" y="4" width="3" height="16" />
                    </svg>
                </button>
            </div>

            {/* Vocal Effects & Autotune Toggles */}
            {track && state.voiceEffects && (() => {
                const fx = Array.isArray(state.voiceEffects) ? state.voiceEffects[0] : state.voiceEffects
                if (!fx) return null

                const effectsOn = fx.compressor.enabled || fx.eq.enabled || fx.reverb.enabled ||
                    fx.chorus.enabled || fx.delay.enabled || fx.distortion.enabled || fx.noiseGate.enabled
                const autotuneOn = fx.pitchCorrection.enabled

                const toggleAllEffects = () => {
                    const newEnabled = !effectsOn
                    const update = (e: VoiceEffects): VoiceEffects => ({
                        ...e,
                        compressor: { ...e.compressor, enabled: newEnabled },
                        eq: { ...e.eq, enabled: newEnabled },
                        reverb: { ...e.reverb, enabled: newEnabled },
                        chorus: { ...e.chorus, enabled: newEnabled },
                        delay: { ...e.delay, enabled: newEnabled },
                        distortion: { ...e.distortion, enabled: newEnabled },
                        noiseGate: { ...e.noiseGate, enabled: newEnabled },
                    })
                    const current = state.voiceEffects!
                    dispatch({
                        type: 'SET_VOICE_EFFECTS',
                        payload: Array.isArray(current) ? current.map(update) : update(current),
                    })
                }

                const toggleAutotune = () => {
                    const newEnabled = !autotuneOn
                    const update = (e: VoiceEffects): VoiceEffects => ({
                        ...e,
                        pitchCorrection: { ...e.pitchCorrection, enabled: newEnabled },
                    })
                    const current = state.voiceEffects!
                    dispatch({
                        type: 'SET_VOICE_EFFECTS',
                        payload: Array.isArray(current) ? current.map(update) : update(current),
                    })
                }

                const checkboxStyle = (checked: boolean): React.CSSProperties => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: theme.border,
                    background: checked ? `${theme.accentA}22` : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s, box-shadow 0.15s',
                    flex: 1,
                })

                const boxStyle = (checked: boolean): React.CSSProperties => ({
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: `2.5px solid ${checked ? theme.accentA : theme.muted}`,
                    background: checked ? theme.accentA : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.15s, border-color 0.15s',
                })

                return (
                    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                        <div style={checkboxStyle(effectsOn)} onClick={toggleAllEffects}>
                            <div style={boxStyle(effectsOn)}>
                                {effectsOn && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                            <span style={{
                                fontSize: 14,
                                fontWeight: 700,
                                fontFamily: theme.fontDisplay,
                                color: effectsOn ? theme.black : theme.muted,
                            }}>
                                Vocal FX
                            </span>
                        </div>
                        <div style={checkboxStyle(autotuneOn)} onClick={toggleAutotune}>
                            <div style={boxStyle(autotuneOn)}>
                                {autotuneOn && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                            <span style={{
                                fontSize: 14,
                                fontWeight: 700,
                                fontFamily: theme.fontDisplay,
                                color: autotuneOn ? theme.black : theme.muted,
                            }}>
                                Autotune
                            </span>
                        </div>
                    </div>
                )
            })()}

            {/* Loading indicator */}
            {!audio.loaded && np?.stemsPath?.instrumental && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <div
                        className="spinner"
                        style={{
                            width: 14,
                            height: 14,
                            border: `2px solid ${theme.spinnerBorder}`,
                            borderTopColor: theme.spinnerBorderTop,
                        }}
                    />
                    <span style={{ fontSize: 12, color: theme.muted, fontFamily: theme.fontBody }}>Loading audio...</span>
                </div>
            )}

            {/* Start hint */}
            {state.stageMode === 'ready' && audio.loaded && (
                <p style={{
                    textAlign: 'center',
                    marginTop: 12,
                    fontSize: 12,
                    color: theme.mintGreen,
                    fontFamily: theme.fontDisplay,
                    fontWeight: 700,
                    letterSpacing: '1px',
                }}>
                    Press play to start the performance
                </p>
            )}
            </>
            )}
        </div>
    )
}

// ---- Persistent Audio Mix Panel ----
function AudioMixPanel() {
    const { state, dispatch } = useApp()
    const theme = useTheme()
    const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([])
    const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])

    const np = state.nowPlaying
    const singers = np?.singers || []
    const voiceEffects = np?.voiceEffects || null
    const hasVocals = !!np?.stemsPath?.vocals
    const vocalOutputId = state.monitorDeviceIds.length > 0 ? state.monitorDeviceIds[0] : ''

    // Show all persisted mic slots, at least as many as current singers
    const slotCount = Math.max(singers.length, state.micSlots.length)

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'))
            setAudioInputs(devices.filter(d => d.kind === 'audioinput'))
        })
    }, [])

    useEffect(() => {
        if (singers.length > state.micSlots.length) {
            dispatch({ type: 'ENSURE_MIC_SLOTS', payload: singers.length })
        }
    }, [singers.length, state.micSlots.length, dispatch])

    const labelStyle: React.CSSProperties = {
        width: 96,
        fontSize: 12,
        fontFamily: theme.fontDisplay,
        fontWeight: 700,
        color: theme.muted,
        flexShrink: 0,
    }

    const rowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
    }

    // Build a map from mic device ID to singer name for the current song
    const micToSingerMap = new Map<string, string>()
    for (const singer of singers) {
        if (singer.micDeviceId) {
            micToSingerMap.set(singer.micDeviceId, singer.name)
        }
    }

    return (
        <div style={{ ...theme.card, padding: 24, marginBottom: 24 }}>
            {/* Section header */}
            <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: theme.muted,
                marginBottom: 20,
                fontFamily: theme.fontDisplay,
            }}>
                Audio Mix
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: slotCount > 0 ? 20 : 0 }}>
                {/* Track Volume */}
                <div style={rowStyle}>
                    <div style={{ ...labelStyle, color: theme.black }}>Track Vol</div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                        <input
                            type="range"
                            min="0" max="1" step="0.01"
                            value={state.volume}
                            onChange={(e) => {
                                const vol = parseFloat(e.target.value)
                                getEngine().setVolume(vol)
                                dispatch({ type: 'SET_VOLUME', payload: vol })
                            }}
                            style={{ flex: 1, height: 4, accentColor: theme.accentA }}
                        />
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                    </div>
                </div>

                {/* Vocal Volume */}
                <div style={{ ...rowStyle, opacity: hasVocals ? 1 : 0.4 }}>
                    <div style={{ ...labelStyle, color: theme.black }}>Vocal Vol</div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                        <input
                            type="range"
                            min="0" max="1" step="0.01"
                            value={state.vocalVolume ?? 1.0}
                            disabled={!hasVocals}
                            onChange={(e) => {
                                const vol = parseFloat(e.target.value)
                                getEngine().setVocalVolume(vol)
                                dispatch({ type: 'SET_VOCAL_VOLUME', payload: vol })
                            }}
                            style={{ flex: 1, height: 4, accentColor: theme.accentB }}
                        />
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                    </div>
                </div>

                {/* Track Output */}
                <div style={rowStyle}>
                    <div style={labelStyle}>Track Out</div>
                    <select
                        value={state.mainOutputId}
                        onChange={(e) => {
                            dispatch({ type: 'SET_MAIN_OUTPUT', payload: e.target.value })
                            getEngine().setMainSinkId(e.target.value)
                        }}
                        style={{ flex: 1, padding: '8px 12px', fontSize: 12, ...theme.select }}
                    >
                        <option value="">System Default</option>
                        {audioOutputs.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Device ${d.deviceId.slice(0, 6)}`}</option>
                        ))}
                    </select>
                </div>

                {/* Vocal Output */}
                <div style={{ ...rowStyle, opacity: hasVocals ? 1 : 0.4 }}>
                    <div style={labelStyle}>Vocal Out</div>
                    <select
                        value={vocalOutputId}
                        disabled={!hasVocals}
                        onChange={(e) => {
                            getEngine().setVocalSinkId(e.target.value)
                            dispatch({ type: 'SET_MONITOR_DEVICES', payload: e.target.value ? [e.target.value] : [] })
                        }}
                        style={{ flex: 1, padding: '8px 12px', fontSize: 12, ...theme.select }}
                    >
                        <option value="">Off (Muted)</option>
                        {audioOutputs.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Device ${d.deviceId.slice(0, 6)}`}</option>
                        ))}
                    </select>
                </div>

                {/* Vocal Offset */}
                <div style={{ ...rowStyle, opacity: hasVocals ? 1 : 0.4 }}>
                    <div style={labelStyle}>Vocal Offset</div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                            fontSize: 11,
                            color: theme.faint,
                            fontVariantNumeric: 'tabular-nums',
                            minWidth: 24,
                            fontFamily: theme.fontDisplay,
                        }}>0s</span>
                        <input
                            type="range"
                            min="0" max="2000" step="1"
                            value={state.vocalOffsetMs}
                            disabled={!hasVocals}
                            onChange={(e) => {
                                const ms = parseInt(e.target.value, 10)
                                dispatch({ type: 'SET_VOCAL_OFFSET', payload: ms })
                            }}
                            style={{ flex: 1, height: 4, accentColor: theme.accentC }}
                        />
                        <span style={{
                            fontSize: 11,
                            color: theme.faint,
                            fontVariantNumeric: 'tabular-nums',
                            minWidth: 24,
                            textAlign: 'right',
                            fontFamily: theme.fontDisplay,
                        }}>2s</span>
                    </div>
                    <span style={{
                        fontSize: 11,
                        fontFamily: theme.fontDisplay,
                        fontWeight: 700,
                        color: state.vocalOffsetMs > 0 ? theme.mintGreen : theme.faint,
                        minWidth: 50,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {state.vocalOffsetMs === 0 ? 'Off' : `\u2212${(state.vocalOffsetMs / 1000).toFixed(3)}s`}
                    </span>
                </div>
            </div>

            {/* Mic Slots */}
            {slotCount > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Divider */}
                    <div style={{ height: 2, background: theme.creamDark, border: theme.borderLight }} />

                    {Array.from({ length: slotCount }, (_, i) => {
                        const singer = singers[i]
                        const slot = state.micSlots[i] || { micDeviceId: '', micLevel: 1.0 }
                        const isActive = !!singer
                        const slotOpacity = isActive ? 1 : 0.4

                        let effects: VoiceEffects | null = null
                        if (isActive && voiceEffects) {
                            if (Array.isArray(voiceEffects)) {
                                const roleIndex = singer.roleIndices && singer.roleIndices.length > 0 ? singer.roleIndices[0] : 0
                                effects = voiceEffects[roleIndex] || voiceEffects[0] || null
                            } else {
                                effects = voiceEffects
                            }
                        }

                        const micDeviceId = slot.micDeviceId
                        const micLevel = slot.micLevel

                        // Find the input device label for this slot
                        const inputDevice = audioInputs.find(d => d.deviceId === micDeviceId)
                        const deviceLabel = inputDevice?.label || (micDeviceId ? `Mic ${micDeviceId.slice(0, 6)}` : '')

                        // Build the label: show device name + singer assignment if active
                        let slotLabel: string
                        let labelColor: string
                        if (isActive && micDeviceId) {
                            slotLabel = `${singer.name}'s Mic`
                            labelColor = singer.color
                        } else if (isActive) {
                            slotLabel = `${singer.name} Mic`
                            labelColor = singer.color
                        } else {
                            slotLabel = `Mic Slot ${i + 1}`
                            labelColor = theme.faint
                        }

                        const handleMicChange = (deviceId: string) => {
                            dispatch({ type: 'SET_MIC_SLOT', payload: { index: i, config: { micDeviceId: deviceId } } })
                            if (isActive) {
                                dispatch({
                                    type: 'UPDATE_NOW_PLAYING_SINGER',
                                    payload: { singerId: singer.id, updates: { micDeviceId: deviceId } }
                                })
                            }
                        }

                        const handleMicLevelChange = (level: number) => {
                            dispatch({ type: 'SET_MIC_SLOT', payload: { index: i, config: { micLevel: level } } })
                            if (isActive && effects) {
                                dispatch({
                                    type: 'UPDATE_NOW_PLAYING_EFFECTS',
                                    payload: {
                                        singerIndex: singer.roleIndices && singer.roleIndices.length > 0 ? singer.roleIndices[0] : 0,
                                        effects: { ...effects, micLevel: level }
                                    }
                                })
                            }
                        }

                        return (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                    opacity: slotOpacity,
                                    transition: 'opacity 0.3s',
                                }}
                            >
                                <div style={rowStyle}>
                                    <div style={{
                                        ...labelStyle,
                                        width: 96,
                                        color: labelColor,
                                        fontWeight: 700,
                                    }}>
                                        {slotLabel}
                                    </div>
                                    <select
                                        value={micDeviceId}
                                        onChange={(e) => handleMicChange(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '6px 8px',
                                            fontSize: 12,
                                            ...theme.select,
                                        }}
                                    >
                                        <option value="">Off (No Mic)</option>
                                        {audioInputs.map(d => {
                                            const assignedSinger = micToSingerMap.get(d.deviceId)
                                            const suffix = assignedSinger && d.deviceId !== micDeviceId
                                                ? ` (${assignedSinger}'s Mic)`
                                                : ''
                                            return (
                                                <option key={d.deviceId} value={d.deviceId}>
                                                    {d.label || `Mic ${d.deviceId.slice(0, 6)}`}{suffix}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>

                                {/* Always show volume slider when a mic is selected */}
                                {micDeviceId && (
                                    <div style={rowStyle}>
                                        <div style={{ width: 96, flexShrink: 0 }} />
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isActive ? singer.color : theme.faint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                                            </svg>
                                            <input
                                                type="range"
                                                min="0" max="1" step="0.01"
                                                value={micLevel}
                                                onChange={(e) => handleMicLevelChange(parseFloat(e.target.value))}
                                                style={{ flex: 1, height: 4, accentColor: isActive ? singer.color : theme.faint }}
                                            />
                                            {micDeviceId && (
                                                <span style={{
                                                    fontSize: 10,
                                                    color: theme.faint,
                                                    fontFamily: theme.fontDisplay,
                                                    fontWeight: 600,
                                                    minWidth: 36,
                                                    textAlign: 'right',
                                                }}>
                                                    {Math.round(micLevel * 100)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Show device name + singer assignment below */}
                                {micDeviceId && isActive && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 96, flexShrink: 0 }} />
                                        <span style={{
                                            fontSize: 10,
                                            color: theme.faint,
                                            fontFamily: theme.fontBody,
                                        }}>
                                            {deviceLabel}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default function ControlsPage() {
    const theme = useTheme()
    return (
        <div className="anim-enter" style={{ ...theme.page }}>
            <NowPlaying />
            <AudioMixPanel />
        </div>
    )
}
