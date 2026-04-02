import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, QueueItem, NEON_COLORS, MicSlotConfig } from '../context/AppContext'
import { getEngine } from '../audio/playback'
import { VoiceEffects } from '../audio/VoiceEffectsTypes'
import { DEFAULT_VOICE_EFFECTS, normalizeMicLevel } from '../audio/VoiceEffectsTypes'

function formatTime(ms: number): string {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// ---- Setup Panel (song config when adding/editing) ----
function SetupPanel() {
    const { state, dispatch } = useApp()
    const navigate = useNavigate()
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
    const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([])

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            setAudioDevices(devices.filter(d => d.kind === 'audioinput'))
            setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'))
        })
    }, [])

    const doesAnyRoleHaveOffensiveWord = (roleIndices: number[]) => {
        return state.lyrics.some(l =>
            roleIndices.includes(l.roleIndex!) && /nigg(?:a|er)s?/i.test(l.words)
        )
    }

    const track = state.currentTrack
    const art = track?.album.images[0]?.url
    const hasInstrumental = !!state.stemsPath?.instrumental
    const isEditing = state.editingQueueIndex !== null

    if (!track) return null

    const handleAddOrUpdate = () => {
        const originalId = isEditing && state.editingQueueIndex !== null && state.queue[state.editingQueueIndex]
            ? state.queue[state.editingQueueIndex].id
            : null
        const item: QueueItem = {
            id: originalId ?? `${track.id}-${Date.now()}`,
            track,
            lyrics: state.lyrics,
            roles: state.roles,
            singers: state.singers,
            voiceEffects: state.voiceEffects || DEFAULT_VOICE_EFFECTS,
            stemsPath: state.stemsPath,
            songPath: state.songPath,
            backgroundVideoPath: state.backgroundVideoPath,
            monitorDeviceIds: state.monitorDeviceIds
        }
        if (isEditing && originalId) {
            const index = state.queue.findIndex(q => q.id === originalId)
            if (index >= 0) {
                dispatch({ type: 'REPLACE_QUEUE_ITEM', payload: { index, item } })
            } else {
                dispatch({ type: 'ENQUEUE_SONG', payload: item })
                dispatch({ type: 'SET_EDITING_QUEUE_INDEX', payload: null })
            }
        } else {
            dispatch({ type: 'ENQUEUE_SONG', payload: item })
        }

        // Sync to Supabase if session is active
        if (state.karaokeSessionId && window.electronAPI?.pushLocalQueueItem) {
            window.electronAPI.pushLocalQueueItem({
                trackId: track.id,
                trackName: track.name,
                trackArtist: track.artists.map((a: { name: string }) => a.name).join(', '),
                trackArtUrl: track.album.images[0]?.url || null,
                trackDurationMs: track.duration_ms,
                singerConfigs: state.singers.map(s => ({
                    name: s.name, color: s.color, colorGlow: s.colorGlow, roleIndices: s.roleIndices
                })),
            }).catch(err => console.error('Failed to sync queue item to Supabase:', err))
        }
    }

    return (
        <div style={{ marginBottom: 36 }}>
            {/* Song Info */}
            <div style={{ marginBottom: 36, paddingTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    {art && (
                        <img src={art} alt=""
                            style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', boxShadow: '0 8px 30px rgba(0,0,0,0.35)' }}
                        />
                    )}
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.5px' }}>
                            {track.name}
                        </h1>
                        <p style={{ fontSize: 15, color: 'var(--white-muted)', marginTop: 2 }}>
                            {track.artists.map((a: { name: string }) => a.name).join(', ')}
                        </p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            {state.lyrics.length > 0 && (
                                <span className="tag tag--emerald">✓ {state.lyrics.length} lines synced</span>
                            )}
                            <span className="tag tag--violet">{track.album.name}</span>
                        </div>
                    </div>
                    <button className="btn btn--outline" onClick={() => navigate('/')} style={{ fontSize: 12 }}>
                        Change Song
                    </button>
                </div>
            </div>

            {/* Singer Count */}
            <section className="surface" style={{ padding: '22px 26px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(244,114,182,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎤</div>
                    <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>How many singers?</div>
                        <div style={{ fontSize: 11, color: 'var(--white-faint)' }}>Set up microphones for each singer</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {[0, 1, 2, 3, 4].map(n => (
                        <button
                            key={n}
                            className={`btn ${state.singerCount === n ? 'btn--selected' : 'btn--soft'}`}
                            onClick={() => dispatch({ type: 'SET_SINGER_COUNT', payload: n })}
                            style={{ flex: 1, fontSize: 14, padding: '12px 0' }}
                        >
                            {n === 0 ? 'None' : n}
                        </button>
                    ))}
                </div>
            </section>

            {/* Per-singer config */}
            {state.singers.map((singer, i) => (
                <section
                    key={singer.id}
                    className="surface anim-scale"
                    style={{ padding: '24px 28px', marginBottom: 12, border: `1px solid ${singer.color}`, position: 'relative', overflow: 'hidden' }}
                >
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 4, bottom: 0, background: singer.color }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: singer.color }} />
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'white' }}>Singer {i + 1}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: state.roles.length > 0 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 20 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--white-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Name</label>
                            <input
                                value={singer.name}
                                onChange={(e) => dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer: { name: e.target.value } } })}
                                style={{ width: '100%', padding: '12px 16px', fontSize: 14, background: 'var(--surface-2)', border: '1px solid var(--surface-3)', borderRadius: 12, color: 'white', outline: 'none', marginBottom: 12 }}
                                onFocus={e => (e.target.style.borderColor = singer.color)}
                                onBlur={e => (e.target.style.borderColor = 'var(--surface-3)')}
                            />
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--white-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Theme Color</label>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 4px' }}>
                                {NEON_COLORS.map((neon, cIdx) => (
                                    <div
                                        key={cIdx}
                                        onClick={() => dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer: { color: neon.color, colorGlow: neon.colorGlow } } })}
                                        style={{
                                            width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                                            background: neon.color,
                                            boxShadow: singer.color === neon.color ? `0 0 0 2px var(--surface-1), 0 0 0 4px ${neon.color}, 0 0 15px ${neon.colorGlow}` : 'none',
                                            transform: singer.color === neon.color ? 'scale(1.1)' : 'scale(1)',
                                            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                        }}
                                        title="Select theme color"
                                    />
                                ))}
                            </div>
                        </div>
                        {state.roles.length > 0 && (
                            <div>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--white-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Roles</label>
                                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                                    {state.roles.map((r, idx) => {
                                        const currentIndices = singer.roleIndices || []
                                        const isSelected = currentIndices.includes(idx)
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    const newIndices = isSelected
                                                        ? currentIndices.filter(ri => ri !== idx)
                                                        : [...currentIndices, idx]
                                                    dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer: { roleIndices: newIndices } } })
                                                }}
                                                style={{
                                                    flex: 1, minWidth: 100, padding: '12px 16px', fontSize: 14, borderRadius: 12,
                                                    background: isSelected ? 'rgba(129,140,248,0.1)' : 'var(--surface-2)',
                                                    color: isSelected ? 'white' : 'var(--white-muted)',
                                                    border: `1px solid ${isSelected ? 'var(--violet)' : 'var(--surface-3)'}`,
                                                    cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'
                                                }}
                                            >
                                                {r}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--white-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Microphone</label>
                            <select
                                value={singer.micDeviceId}
                                onChange={(e) => dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer: { micDeviceId: e.target.value } } })}
                                style={{ width: '100%', padding: '12px 16px', fontSize: 14, background: 'var(--surface-2)', border: '1px solid var(--surface-3)', borderRadius: 12, color: 'white', outline: 'none', cursor: 'pointer', appearance: 'none' }}
                            >
                                <option value="" disabled>Select mic...</option>
                                {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>)}
                            </select>
                        </div>
                        {singer.roleIndices && singer.roleIndices.length > 0 && doesAnyRoleHaveOffensiveWord(singer.roleIndices) && (
                            <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input
                                    type="checkbox"
                                    checked={singer.whitePersonCheck || false}
                                    onChange={(e) => dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer: { whitePersonCheck: e.target.checked } } })}
                                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: singer.color }}
                                />
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>White Singer</div>
                                    <div style={{ fontSize: 11, color: 'var(--white-faint)' }}>Sanitizes a certain word from lyrics for this singer</div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            ))}

            {/* Monitor Outputs */}
            {state.stemsPath?.vocals && (
                <section className="surface" style={{ padding: '22px 26px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(52,211,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎧</div>
                        <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Vocal Monitors</div>
                            <div style={{ fontSize: 11, color: 'var(--white-faint)' }}>Send vocal guide track to specific headsets</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {audioOutputs.map(d => {
                            const selected = state.monitorDeviceIds.includes(d.deviceId)
                            return (
                                <button
                                    key={d.deviceId}
                                    className={`btn ${selected ? 'btn--selected' : 'btn--soft'}`}
                                    onClick={() => {
                                        dispatch({
                                            type: 'SET_MONITOR_DEVICES',
                                            payload: selected
                                                ? state.monitorDeviceIds.filter(id => id !== d.deviceId)
                                                : [...state.monitorDeviceIds, d.deviceId]
                                        })
                                    }}
                                    style={{ fontSize: 12, padding: '8px 16px', borderRadius: 8, border: selected ? '1px solid var(--emerald)' : '1px solid transparent' }}
                                >
                                    {d.label || `Device ${d.deviceId.slice(0, 6)}`}
                                </button>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* Add / Update */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32, paddingBottom: 24 }}>
                <button
                    className="btn btn--fill"
                    disabled={!hasInstrumental}
                    style={{
                        fontSize: 18, padding: '18px 60px', borderRadius: 16,
                        opacity: hasInstrumental ? 1 : 0.5,
                        fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.3px'
                    }}
                    onClick={handleAddOrUpdate}
                >
                    {isEditing ? 'Update in Queue →' : 'Add to Queue →'}
                </button>
            </div>
        </div>
    )
}

// ---- Now Playing Controls ----
function NowPlaying() {
    const { state, dispatch } = useApp()
    const [elapsed, setElapsed] = useState(0)
    const [duration, setDuration] = useState(0)
    const [loaded, setLoaded] = useState(false)
    const [playing, setPlaying] = useState(false)
    const loadedPathRef = useRef<string | null>(null)

    const np = state.nowPlaying
    const track = np?.track
    const art = track?.album.images[0]?.url
    const singers = np?.singers || []
    const monitorDeviceIdsStr = (np?.monitorDeviceIds || []).join(',')

    // Initialize loadedPathRef from engine on mount to prevent destroying active playback
    useEffect(() => {
        const engine = getEngine()
        if (engine.isLoaded && np?.stemsPath?.instrumental) {
            engine.setVocalOffset(state.vocalOffsetMs)
            loadedPathRef.current = np.stemsPath.instrumental
            setLoaded(true)
            setDuration(engine.durationMs || track?.duration_ms || 0)
            setPlaying(engine.isPlaying)
            setElapsed(engine.currentTimeMs)
        }
    }, []) // Run once on mount

    // Load audio when stems change
    useEffect(() => {
        const stemsPath = np?.stemsPath
        const instrumentalPath = stemsPath?.instrumental
        const monitorDeviceIds = monitorDeviceIdsStr ? monitorDeviceIdsStr.split(',').filter(Boolean) : []

        if (!instrumentalPath) {
            getEngine().destroy()
            setLoaded(false)
            setElapsed(0)
            setDuration(0)
            setPlaying(false)
            loadedPathRef.current = null
            return
        }

        if (loadedPathRef.current === instrumentalPath) {
            const engine = getEngine()
            if (engine.isLoaded) {
                engine.setVocalOffset(state.vocalOffsetMs)
                setLoaded(true)
                setDuration(engine.durationMs || track?.duration_ms || 0)
                setPlaying(engine.isPlaying)
                setElapsed(engine.currentTimeMs)
            }
            engine.setOnTimeUpdate((timeMs) => {
                setElapsed(timeMs)
                window.electronAPI?.sendPlaybackTime(timeMs)
            })
            engine.setOnEnded(() => {
                setPlaying(false)
                dispatch({ type: 'NEXT_SONG' })
            })
            return
        }

        const engine = getEngine()
        engine.destroy()
        setLoaded(false)
        setElapsed(0)
        setPlaying(false)
        loadedPathRef.current = instrumentalPath

        engine.setOnTimeUpdate((timeMs) => {
            setElapsed(timeMs)
            window.electronAPI?.sendPlaybackTime(timeMs)
        })
        engine.setOnEnded(() => {
            setPlaying(false)
            dispatch({ type: 'NEXT_SONG' })
        })

        engine.load(stemsPath || {}, monitorDeviceIds).then(() => {
            engine.setVocalOffset(state.vocalOffsetMs)
            setDuration(engine.durationMs || track?.duration_ms || 0)
            setLoaded(true)
        }).catch(err => console.error('[Queue] Audio load failed:', err))
    }, [np?.stemsPath?.instrumental, np?.stemsPath?.vocals, monitorDeviceIdsStr, track?.duration_ms, state.vocalOffsetMs, dispatch])

    // Keep vocal offset in sync with state
    useEffect(() => {
        getEngine().setVocalOffset(state.vocalOffsetMs)
    }, [state.vocalOffsetMs])

    // Detach callbacks on unmount (engine stays alive)
    useEffect(() => {
        return () => {
            const engine = getEngine()
            engine.setOnTimeUpdate(() => { })
            engine.setOnEnded(() => { })
        }
    }, [])

    const handlePlayPause = useCallback(() => {
        if (!loaded) return
        const engine = getEngine()
        engine.setVocalOffset(state.vocalOffsetMs)
        if (playing) {
            engine.pause()
            setPlaying(false)
            dispatch({ type: 'SET_PLAYING', payload: false })
        } else {
            engine.play()
            setPlaying(true)
            dispatch({ type: 'SET_PLAYING', payload: true })
        }
    }, [loaded, playing, state.vocalOffsetMs, dispatch])

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration) return
        const engine = getEngine()
        const r = e.currentTarget.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
        const seekMs = ratio * duration
        engine.seek(seekMs)
        setElapsed(seekMs)
        window.electronAPI?.sendPlaybackSeek(seekMs)
    }, [duration])

    const handleRestart = useCallback(() => {
        const engine = getEngine()
        engine.setVocalOffset(state.vocalOffsetMs)
        engine.seek(0)
        setElapsed(0)
        window.electronAPI?.sendPlaybackSeek(0)
    }, [state.vocalOffsetMs])

    const handleSkip = useCallback(() => {
        const engine = getEngine()
        engine.pause()
        setPlaying(false)
        dispatch({ type: 'SET_PLAYING', payload: false })
        dispatch({ type: 'NEXT_SONG' })
    }, [dispatch])

    const handlePrev = useCallback(() => {
        const engine = getEngine()
        engine.pause()
        setPlaying(false)
        dispatch({ type: 'SET_PLAYING', payload: false })
        dispatch({ type: 'PREV_SONG' })
    }, [dispatch])

    const handleStart = useCallback(() => {
        dispatch({ type: 'SET_STAGE_MODE', payload: 'playing' })
        if (loaded) {
            const engine = getEngine()
            engine.setVocalOffset(state.vocalOffsetMs)
            engine.play()
            setPlaying(true)
            dispatch({ type: 'SET_PLAYING', payload: true })
        }
    }, [loaded, state.vocalOffsetMs, dispatch])

    if (!track) return null

    return (
        <div style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--white-ghost)',
            borderRadius: 20,
            padding: 24,
            marginBottom: 32,
        }}>
            {/* Header */}
            <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                color: state.stageMode === 'playing' ? 'var(--emerald)' : 'var(--violet)',
                marginBottom: 16, fontFamily: 'var(--font-display)',
            }}>
                {state.stageMode === 'playing' ? '♫ Now Playing' : '● Up Next'}
            </div>

            {/* Track info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                {art ? (
                    <img src={art} alt="" style={{
                        width: 72, height: 72, borderRadius: 14, objectFit: 'cover',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }} />
                ) : (
                    <div style={{
                        width: 72, height: 72, borderRadius: 14, background: 'var(--surface-2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                    }}>🎵</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4,
                    }}>
                        {track.name}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--white-muted)', marginBottom: 8 }}>
                        {track.artists.map(a => a.name).join(', ')}
                    </div>
                    {singers.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {singers.map(s => (
                                <div key={s.id} style={{
                                    padding: '3px 10px', borderRadius: 40,
                                    border: `1px solid ${s.color}`, color: s.color,
                                    fontWeight: 600, fontSize: 11, fontFamily: 'var(--font-display)',
                                }}>
                                    {s.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{
                    fontSize: 11, color: 'var(--white-faint)', fontVariantNumeric: 'tabular-nums',
                    minWidth: 36, fontFamily: 'var(--font-display)',
                }}>
                    {formatTime(elapsed)}
                </span>
                <div
                    onClick={handleSeek}
                    style={{
                        flex: 1, height: 6, background: 'rgba(255,255,255,0.08)',
                        borderRadius: 99, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    }}
                >
                    <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 99,
                        background: 'var(--grad-hero)',
                        width: `${duration ? (elapsed / duration) * 100 : 0}%`,
                        transition: 'width 0.15s linear',
                    }} />
                </div>
                <span style={{
                    fontSize: 11, color: 'var(--white-faint)', fontVariantNumeric: 'tabular-nums',
                    minWidth: 36, fontFamily: 'var(--font-display)', textAlign: 'right',
                }}>
                    {formatTime(duration)}
                </span>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                {/* Previous */}
                <button
                    onClick={handlePrev}
                    title="Previous"
                    disabled={state.history.length === 0}
                    style={{
                        width: 40, height: 40, borderRadius: '50%', border: 'none',
                        background: 'var(--surface-2)', color: 'var(--white-muted)',
                        cursor: state.history.length > 0 ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                        opacity: state.history.length > 0 ? 1 : 0.3,
                    }}
                    onMouseEnter={e => { if (state.history.length > 0) { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--white)' } }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--white-muted)' }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="3" height="16" /><polygon points="19 20 9 12 19 4" />
                    </svg>
                </button>

                {/* Restart */}
                <button
                    onClick={handleRestart}
                    title="Restart"
                    style={{
                        width: 40, height: 40, borderRadius: '50%', border: 'none',
                        background: 'var(--surface-2)', color: 'var(--white-muted)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--white)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--white-muted)' }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                </button>

                {/* Play / Pause */}
                <button
                    onClick={state.stageMode === 'ready' ? handleStart : handlePlayPause}
                    style={{
                        width: 52, height: 52, borderRadius: '50%', border: 'none',
                        background: state.stageMode === 'ready' ? 'var(--emerald)' : 'white',
                        color: 'var(--black)', cursor: loaded ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: loaded ? 1 : 0.4,
                        transition: 'all 0.15s', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}
                >
                    {state.stageMode === 'ready' ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21" /></svg>
                    ) : playing ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21" /></svg>
                    )}
                </button>

                {/* Skip */}
                <button
                    onClick={handleSkip}
                    title="Skip"
                    style={{
                        width: 40, height: 40, borderRadius: '50%', border: 'none',
                        background: 'var(--surface-2)', color: 'var(--white-muted)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--white)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--white-muted)' }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 4 15 12 5 20" /><rect x="17" y="4" width="3" height="16" />
                    </svg>
                </button>
            </div>

            {/* Loading indicator */}
            {!loaded && np?.stemsPath?.instrumental && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                    <span style={{ fontSize: 12, color: 'var(--white-faint)' }}>Loading audio...</span>
                </div>
            )}

            {/* Start hint when ready */}
            {state.stageMode === 'ready' && loaded && (
                <p style={{
                    textAlign: 'center', marginTop: 12, fontSize: 12,
                    color: 'var(--emerald)', fontFamily: 'var(--font-display)', fontWeight: 600,
                }}>
                    Press play to start the performance
                </p>
            )}

        </div>
    )
}

// ---- Persistent Audio Mix Panel (always visible) ----
function AudioMixPanel() {
    const { state, dispatch } = useApp()
    const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([])
    const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])

    const np = state.nowPlaying
    const singers = np?.singers || []
    const voiceEffects = np?.voiceEffects || null
    const hasSong = !!np
    const hasVocals = !!np?.stemsPath?.vocals
    const vocalOutputId = state.monitorDeviceIds.length > 0 ? state.monitorDeviceIds[0] : ''

    // Determine how many mic slots to show: max of current singers and persisted slots
    const slotCount = Math.max(singers.length, state.micSlots.length)

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'))
            setAudioInputs(devices.filter(d => d.kind === 'audioinput'))
        })
    }, [])

    // Ensure micSlots array is large enough for current singers
    useEffect(() => {
        if (singers.length > state.micSlots.length) {
            dispatch({ type: 'ENSURE_MIC_SLOTS', payload: singers.length })
        }
    }, [singers.length, state.micSlots.length, dispatch])

    // Don't show at all if we've never had any audio activity
    if (!hasSong && state.micSlots.length === 0) return null

    return (
        <div style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--white-ghost)',
            borderRadius: 20,
            padding: 24,
            marginBottom: 32,
        }}>
            <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                color: 'var(--white-muted)', marginBottom: 16, fontFamily: 'var(--font-display)',
            }}>
                Audio Mix
            </div>

            {/* Main Track Volume and Output */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: slotCount > 0 ? 16 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 80, fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--white)' }}>
                        Track Volume
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 14 }}>🔉</span>
                        <input
                            type="range"
                            min="0" max="1" step="0.01"
                            value={state.volume}
                            onChange={(e) => {
                                const vol = parseFloat(e.target.value)
                                getEngine().setVolume(vol)
                                dispatch({ type: 'SET_VOLUME', payload: vol })
                            }}
                            style={{ flex: 1, height: 4, accentColor: 'var(--violet)' }}
                        />
                        <span style={{ fontSize: 14 }}>🔊</span>
                    </div>
                </div>

                {/* Vocal Track Volume */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: hasVocals ? 1 : 0.4 }}>
                    <div style={{ width: 80, fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--white)' }}>
                        Vocal Volume
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 14 }}>🔉</span>
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
                            style={{ flex: 1, height: 4, accentColor: 'var(--amber)' }}
                        />
                        <span style={{ fontSize: 14 }}>🔊</span>
                    </div>
                </div>

                {/* Audio Output Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 80, fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--white-muted)' }}>
                        Track Output
                    </div>
                    <select
                        value={state.mainOutputId}
                        onChange={(e) => {
                            dispatch({ type: 'SET_MAIN_OUTPUT', payload: e.target.value })
                            getEngine().setMainSinkId(e.target.value)
                        }}
                        style={{
                            flex: 1, padding: '8px 12px', fontSize: 12, background: 'var(--surface-3)',
                            border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, color: 'white',
                            outline: 'none', cursor: 'pointer'
                        }}
                    >
                        <option value="">System Default</option>
                        {audioOutputs.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Device ${d.deviceId.slice(0, 6)}`}</option>
                        ))}
                    </select>
                </div>

                {/* Vocal Output Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: hasVocals ? 1 : 0.4 }}>
                    <div style={{ width: 80, fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--white-muted)' }}>
                        Vocal Output
                    </div>
                    <select
                        value={vocalOutputId}
                        disabled={!hasVocals}
                        onChange={(e) => {
                            getEngine().setVocalSinkId(e.target.value)
                            dispatch({ type: 'SET_MONITOR_DEVICES', payload: e.target.value ? [e.target.value] : [] })
                        }}
                        style={{
                            flex: 1, padding: '8px 12px', fontSize: 12, background: 'var(--surface-3)',
                            border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, color: 'white',
                            outline: 'none', cursor: 'pointer'
                        }}
                    >
                        <option value="">Off (Muted)</option>
                        {audioOutputs.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Device ${d.deviceId.slice(0, 6)}`}</option>
                        ))}
                    </select>
                </div>

                {/* Vocal Offset (Bluetooth latency compensation) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: hasVocals ? 1 : 0.4 }}>
                    <div style={{ width: 80, fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--white-muted)' }}>
                        Vocal Offset
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 11, color: 'var(--white-faint)', fontVariantNumeric: 'tabular-nums', minWidth: 28 }}>0s</span>
                        <input
                            type="range"
                            min="0" max="2000" step="1"
                            value={state.vocalOffsetMs}
                            disabled={!hasVocals}
                            onChange={(e) => {
                                const ms = parseInt(e.target.value, 10)
                                dispatch({ type: 'SET_VOCAL_OFFSET', payload: ms })
                            }}
                            style={{ flex: 1, height: 4, accentColor: 'var(--emerald)' }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--white-faint)', fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>2s</span>
                    </div>
                    <span style={{
                        fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600,
                        color: state.vocalOffsetMs > 0 ? 'var(--emerald)' : 'var(--white-faint)',
                        minWidth: 50, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                    }}>
                        {state.vocalOffsetMs === 0 ? 'Off' : `\u2212${(state.vocalOffsetMs / 1000).toFixed(3)}s`}
                    </span>
                </div>
            </div>

            {/* Singer/Mic Slots */}
            {slotCount > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {Array.from({ length: slotCount }, (_, i) => {
                        const singer = singers[i] // May be undefined if slot exceeds current song's singers
                        const slot = state.micSlots[i] || { micDeviceId: '', micLevel: 1.0 }
                        const isActive = !!singer
                        const slotOpacity = isActive ? 1 : 0.4

                        // Get voice effects for this singer (per-song, changes with each song)
                        let effects: VoiceEffects | null = null
                        if (isActive && voiceEffects) {
                            if (Array.isArray(voiceEffects)) {
                                const roleIndex = singer.roleIndices && singer.roleIndices.length > 0 ? singer.roleIndices[0] : 0
                                effects = voiceEffects[roleIndex] || voiceEffects[0] || null
                            } else {
                                effects = voiceEffects
                            }
                        }

                        const labelColor = isActive ? singer.color : 'var(--white-faint)'
                        const labelText = isActive ? `${singer.name} Mic` : `Mic Slot ${i + 1}`
                        const micDeviceId = slot.micDeviceId
                        const micLevel = slot.micLevel

                        const handleMicChange = (deviceId: string) => {
                            // Persist to micSlots
                            dispatch({ type: 'SET_MIC_SLOT', payload: { index: i, config: { micDeviceId: deviceId } } })
                            // Update current song's singer if active
                            if (isActive) {
                                dispatch({
                                    type: 'UPDATE_NOW_PLAYING_SINGER',
                                    payload: { singerId: singer.id, updates: { micDeviceId: deviceId } }
                                })
                            }
                        }

                        const handleMicLevelChange = (level: number) => {
                            // Persist to micSlots
                            dispatch({ type: 'SET_MIC_SLOT', payload: { index: i, config: { micLevel: level } } })
                            // Update current song's voice effects if active
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
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: slotOpacity, transition: 'opacity 0.3s' }}>
                                {/* Mic Input Selector */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ width: 80, fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, color: labelColor }}>
                                        {labelText}
                                    </div>
                                    <select
                                        value={micDeviceId}
                                        onChange={(e) => handleMicChange(e.target.value)}
                                        style={{
                                            flex: 1, padding: '6px 8px', fontSize: 12, background: 'var(--surface-3)',
                                            border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, color: 'white',
                                            outline: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        <option value="">Off (No Mic)</option>
                                        {audioInputs.map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Volume Slider */}
                                {micDeviceId && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 80 }} />
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ fontSize: 16, opacity: 0.8 }}>🎤</span>
                                            <input
                                                type="range"
                                                min="0" max="2" step="0.05"
                                                value={micLevel}
                                                onChange={(e) => handleMicLevelChange(parseFloat(e.target.value))}
                                                style={{ flex: 1, height: 4, accentColor: isActive ? singer.color : 'var(--white-faint)' }}
                                            />
                                            <span style={{ fontSize: 14, visibility: 'hidden' }}>🔊</span>
                                        </div>
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

// ---- Queue Page ----
export default function QueuePage() {
    const { state, dispatch } = useApp()
    const navigate = useNavigate()
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

    const handleDragStart = (index: number) => {
        setDraggedIndex(index)
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault()
        setDragOverIndex(index)
    }

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault()
        if (draggedIndex === null) return

        const newQueue = [...state.queue]
        const [removed] = newQueue.splice(draggedIndex, 1)
        newQueue.splice(dropIndex, 0, removed)

        dispatch({ type: 'REORDER_QUEUE', payload: newQueue })
        setDraggedIndex(null)
        setDragOverIndex(null)
    }

    const handleDragEnd = () => {
        setDraggedIndex(null)
        setDragOverIndex(null)
    }

    const removeSong = (index: number) => {
        dispatch({ type: 'REMOVE_FROM_QUEUE', payload: index })
    }

    const editSong = (item: QueueItem, index: number) => {
        dispatch({ type: 'SET_EDITING_QUEUE_INDEX', payload: index })
        dispatch({ type: 'SET_TRACK', payload: item.track })
        dispatch({ type: 'SET_LYRICS', payload: item.lyrics })
        dispatch({ type: 'SET_ROLES', payload: item.roles })
        dispatch({ type: 'SET_SINGER_COUNT', payload: item.singers.length })
        item.singers.forEach((singer, i) => {
            dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer } })
        })
        if (item.voiceEffects) {
            dispatch({ type: 'SET_VOICE_EFFECTS', payload: normalizeMicLevel(item.voiceEffects) })
        }
        if (item.stemsPath) {
            dispatch({ type: 'SET_STEMS_PATH', payload: item.stemsPath })
        }
        if (item.backgroundVideoPath) {
            dispatch({ type: 'SET_BACKGROUND_VIDEO', payload: item.backgroundVideoPath })
        }
        if (item.monitorDeviceIds) {
            dispatch({ type: 'SET_MONITOR_DEVICES', payload: item.monitorDeviceIds })
        }
        if (item.songPath) {
            dispatch({ type: 'SET_SONG_PATH', payload: item.songPath })
        }
    }

    const clearQueue = () => {
        if (confirm('Are you sure you want to clear the entire queue?')) {
            dispatch({ type: 'CLEAR_QUEUE' })
        }
    }

    function formatDuration(ms: number): string {
        const s = Math.floor(ms / 1000)
        return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
    }

    const totalDuration = state.queue.reduce((sum, item) => sum + item.track.duration_ms, 0)

    return (
        <div className="page anim-enter">
            {/* Setup panel when configuring a song */}
            {state.currentTrack && <SetupPanel />}
            {/* Now Playing */}
            <NowPlaying />
            {/* Audio Mix - persists across songs */}
            <AudioMixPanel />

            {/* Queue Hero */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{
                        fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
                        lineHeight: 1.1, letterSpacing: '-0.5px', marginBottom: 4,
                    }}>
                        Up Next
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--white-muted)' }}>
                        {state.queue.length} song{state.queue.length !== 1 ? 's' : ''} • {formatDuration(totalDuration)} total
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn--outline" onClick={() => navigate('/')}>
                        Add Songs
                    </button>
                    {state.queue.length > 0 && (
                        <button className="btn btn--ghost" onClick={clearQueue}>
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            {state.queue.length === 0 && !state.nowPlaying ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                        Queue is empty
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--white-muted)', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
                        Add songs from the catalog to get started
                    </p>
                    <button className="btn btn--fill" onClick={() => navigate('/')}>
                        Browse Songs
                    </button>
                </div>
            ) : state.queue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--white-faint)', fontSize: 14 }}>
                    No more songs in queue
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {state.queue.map((item, index) => {
                        const art = item.track.album.images[0]?.url
                        const isDragging = draggedIndex === index
                        const isDropTarget = dragOverIndex === index

                        return (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 14,
                                    padding: 14,
                                    background: isDropTarget ? 'var(--surface-2)' : 'var(--surface-1)',
                                    border: `1px solid ${isDropTarget ? 'var(--violet)' : 'var(--white-ghost)'}`,
                                    borderRadius: 14,
                                    opacity: isDragging ? 0.5 : 1,
                                    cursor: 'grab',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {/* Drag handle */}
                                <div style={{
                                    display: 'flex', flexDirection: 'column', gap: 3,
                                    padding: '0 4px', color: 'var(--white-faint)', cursor: 'grab',
                                }}>
                                    <div style={{ width: 14, height: 2, background: 'currentColor', borderRadius: 2 }} />
                                    <div style={{ width: 14, height: 2, background: 'currentColor', borderRadius: 2 }} />
                                    <div style={{ width: 14, height: 2, background: 'currentColor', borderRadius: 2 }} />
                                </div>

                                {/* Position */}
                                <div style={{
                                    fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
                                    color: 'var(--white-faint)', minWidth: 28, textAlign: 'center',
                                }}>
                                    {index + 1}
                                </div>

                                {/* Art */}
                                {art ? (
                                    <img src={art} alt="" style={{
                                        width: 48, height: 48, borderRadius: 8, objectFit: 'cover',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                    }} />
                                ) : (
                                    <div style={{
                                        width: 48, height: 48, borderRadius: 8, background: 'var(--surface-2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                                    }}>🎵</div>
                                )}

                                {/* Track info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                                        color: 'white', whiteSpace: 'nowrap', overflow: 'hidden',
                                        textOverflow: 'ellipsis', marginBottom: 2,
                                    }}>
                                        {item.track.name}
                                    </div>
                                    <div style={{
                                        fontSize: 12, color: 'var(--white-muted)',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {item.track.artists.map(a => a.name).join(', ')}
                                    </div>
                                    {item.addedBy && (
                                        <div style={{
                                            fontSize: 11,
                                            color: 'var(--pink)',
                                            fontFamily: 'var(--font-display)',
                                            fontWeight: 500,
                                            marginTop: 2,
                                        }}>
                                            Added by {item.addedBy}
                                        </div>
                                    )}
                                </div>

                                {/* Meta */}
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    {item.singers.length > 0 && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            padding: '3px 8px', background: 'rgba(129,140,248,0.1)',
                                            border: '1px solid rgba(129,140,248,0.2)', borderRadius: 99,
                                            fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--violet)',
                                        }}>
                                            <span>👥</span>{item.singers.length}
                                        </div>
                                    )}
                                    <div style={{
                                        fontSize: 11, color: 'var(--white-faint)',
                                        fontFamily: 'var(--font-display)', fontWeight: 500,
                                    }}>
                                        {formatDuration(item.track.duration_ms)}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                        onClick={() => editSong(item, index)}
                                        style={{
                                            padding: '6px 12px', background: 'var(--surface-2)',
                                            border: '1px solid var(--white-ghost)', borderRadius: 8,
                                            color: 'white', fontSize: 11, fontFamily: 'var(--font-display)',
                                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => removeSong(index)}
                                        style={{
                                            padding: 6, background: 'transparent',
                                            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
                                            color: 'var(--red)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
