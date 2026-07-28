import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useAudioSyncContext } from '../context/AudioSyncContext'
import { getEngine } from '../audio/playback'
import { VoiceEffects } from '../audio/VoiceEffectsTypes'
import { useAudioDevices } from '../hooks/useAudioDevices'
import { VocalOffsetCalibrator } from '../components/VocalOffsetCalibrator'
import { ArtTile, Button, Card, Fader, Icon, Led, PageHeader, Select, Spinner } from '../components/ui'
import { LobbyModeBanner } from '../components/LobbyModeCard'

function formatTime(ms: number): string {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// ---- Now Playing / Transport ----
function NowPlaying() {
    const { state } = useApp()
    const audio = useAudioSyncContext()

    const np = state.nowPlaying
    const track = np?.track
    const art = track?.album.images[0]?.url
    const singers = np?.singers || []

    const status = !track ? 'idle' : state.stageMode === 'playing' ? 'playing' : 'ready'

    return (
        <Card style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Led state={status === 'playing' ? 'on' : status === 'ready' ? 'amber' : 'off'} />
                <span className="adm-label" style={{
                    color: status === 'playing' ? 'var(--adm-green)' : status === 'ready' ? 'var(--adm-amber-bright)' : undefined,
                }}>
                    {status === 'idle' ? 'No song loaded' : status === 'playing' ? 'Now playing' : 'Up next — ready'}
                </span>
            </div>

            {!track ? (
                <div style={{ textAlign: 'center', padding: '26px 20px', color: 'var(--adm-text-3)' }}>
                    <Icon name="music" size={34} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
                    <div style={{ fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 15, color: 'var(--adm-text)', marginBottom: 4 }}>
                        Nothing on deck
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--adm-text-2)' }}>
                        Add a song to the queue and it will appear here
                    </div>
                </div>
            ) : (
                <>
                    {/* Track info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                        <ArtTile src={art} size={70} radius={10} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontFamily: 'var(--adm-display)', fontWeight: 700, fontSize: 17,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3,
                            }}>
                                {track.name}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--adm-text-2)', marginBottom: 8 }}>
                                {track.artists.map(a => a.name).join(', ')}
                            </div>
                            {singers.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {singers.map(s => (
                                        <span key={s.id} style={{
                                            padding: '2px 10px', borderRadius: 99,
                                            border: `1px solid ${s.color}66`, color: s.color,
                                            fontWeight: 650, fontSize: 11, background: `${s.color}14`,
                                        }}>
                                            {s.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <span className="adm-mono" style={{ fontSize: 11.5, color: 'var(--adm-text-2)', minWidth: 38 }}>
                            {formatTime(audio.elapsed)}
                        </span>
                        <div
                            onClick={audio.handleSeek}
                            style={{
                                flex: 1, height: 16, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', position: 'relative',
                            }}
                        >
                            <div className="adm-meter" style={{ width: '100%', height: 7 }}>
                                <div
                                    className="adm-meter__fill adm-meter__fill--progress"
                                    style={{ width: `${audio.duration ? (audio.elapsed / audio.duration) * 100 : 0}%`, transition: 'width 0.15s linear' }}
                                />
                            </div>
                        </div>
                        <span className="adm-mono" style={{ fontSize: 11.5, color: 'var(--adm-text-2)', minWidth: 38, textAlign: 'right' }}>
                            {formatTime(audio.duration)}
                        </span>
                    </div>

                    {/* Transport */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                        <button
                            className="adm-iconbtn"
                            style={{ width: 38, height: 38, borderRadius: '50%' }}
                            onClick={audio.handlePrev}
                            title="Previous"
                            disabled={state.history.length === 0}
                        >
                            <Icon name="prev" size={14} />
                        </button>

                        <button
                            className="adm-iconbtn"
                            style={{ width: 38, height: 38, borderRadius: '50%' }}
                            onClick={audio.handleRestart}
                            title="Restart"
                        >
                            <Icon name="restart" size={14} />
                        </button>

                        {/* Play / Pause */}
                        <button
                            onClick={state.stageMode === 'ready' ? audio.handleStart : audio.handlePlayPause}
                            disabled={!audio.loaded}
                            title={state.stageMode === 'ready' ? 'Start performance' : audio.playing ? 'Pause' : 'Play'}
                            style={{
                                width: 58, height: 58, borderRadius: '50%', border: 'none', cursor: audio.loaded ? 'pointer' : 'default',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: state.stageMode === 'ready'
                                    ? 'linear-gradient(180deg, #55e3a5, var(--adm-green))'
                                    : 'linear-gradient(180deg, var(--adm-amber-bright), var(--adm-amber))',
                                color: '#12190f',
                                opacity: audio.loaded ? 1 : 0.4,
                                boxShadow: state.stageMode === 'ready'
                                    ? '0 1px 0 rgba(255,255,255,0.4) inset, 0 10px 26px -8px rgba(62,207,142,0.55)'
                                    : '0 1px 0 rgba(255,255,255,0.4) inset, 0 10px 26px -8px var(--adm-amber-glow)',
                                transition: 'transform 0.15s var(--adm-spring), box-shadow 0.2s ease',
                            }}
                            onMouseEnter={e => { if (audio.loaded) e.currentTarget.style.transform = 'scale(1.06)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                        >
                            {state.stageMode === 'ready' ? (
                                <Icon name="play" size={22} style={{ marginLeft: 3 }} />
                            ) : audio.playing ? (
                                <Icon name="pause" size={20} />
                            ) : (
                                <Icon name="play" size={22} style={{ marginLeft: 3 }} />
                            )}
                        </button>

                        <button
                            className="adm-iconbtn"
                            style={{ width: 38, height: 38, borderRadius: '50%' }}
                            onClick={audio.handleSkip}
                            title="Skip"
                        >
                            <Icon name="skip" size={14} />
                        </button>

                        {/* spacer to balance prev+restart on the left */}
                        <span style={{ width: 38 }} />
                    </div>

                    {/* Loading indicator */}
                    {!audio.loaded && np?.stemsPath?.instrumental && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                            <Spinner size={14} />
                            <span style={{ fontSize: 12, color: 'var(--adm-text-2)' }}>Loading audio…</span>
                        </div>
                    )}

                    {/* Start hint */}
                    {state.stageMode === 'ready' && audio.loaded && (
                        <p style={{
                            textAlign: 'center', marginTop: 14, fontSize: 12,
                            color: 'var(--adm-green)', fontWeight: 650, letterSpacing: '0.4px',
                        }}>
                            Press play to start the performance
                        </p>
                    )}
                </>
            )}
        </Card>
    )
}

// ---- Persistent Audio Mix Panel ----
function AudioMixPanel() {
    const { state, dispatch } = useApp()
    const { inputs: audioInputs, outputs: audioOutputs } = useAudioDevices()
    const [calibratorOpen, setCalibratorOpen] = useState(false)

    const np = state.nowPlaying
    const singers = np?.singers || []
    const voiceEffects = np?.voiceEffects || null
    const hasVocals = !!np?.stemsPath?.vocals
    const vocalOutputId = state.monitorDeviceIds.length > 0 ? state.monitorDeviceIds[0] : ''

    // Show all persisted mic slots, at least as many as current singers, plus
    // one empty row to add another. Every configured mic stays live during a
    // song whether or not a singer signed up on it (see OpenMics on the stage),
    // so the host needs a way to assign spares beyond the singer count.
    const MAX_SLOTS = 8
    const slotCount = Math.min(MAX_SLOTS, Math.max(singers.length, state.micSlots.length) + 1)

    useEffect(() => {
        if (singers.length > state.micSlots.length) {
            dispatch({ type: 'ENSURE_MIC_SLOTS', payload: singers.length })
        }
    }, [singers.length, state.micSlots.length, dispatch])

    const labelStyle: React.CSSProperties = {
        width: 104,
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 650,
        color: 'var(--adm-text-2)',
    }

    const rowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
    }

    // Map each in-use mic device to a label for the "already assigned" hint in
    // the pickers — a singer for the current song, or a spare open mic.
    const micUsageLabels = new Map<string, string>()
    for (const singer of singers) {
        if (singer.micDeviceId) {
            micUsageLabels.set(singer.micDeviceId, `${singer.name}'s Mic`)
        }
    }
    state.micSlots.forEach((slot, idx) => {
        if (!slot.micDeviceId || singers[idx]) return
        if (!micUsageLabels.has(slot.micDeviceId)) {
            micUsageLabels.set(slot.micDeviceId, `Open Mic ${idx + 1}`)
        }
    })

    return (
        <Card>
            <div className="adm-label" style={{ marginBottom: 18 }}>Audio Mix</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: slotCount > 0 ? 20 : 0 }}>
                {/* Track Volume */}
                <div style={rowStyle}>
                    <div style={{ ...labelStyle, color: 'var(--adm-text)' }}>Track Vol</div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon name="volume" size={14} style={{ color: 'var(--adm-text-3)' }} />
                        <Fader
                            min={0} max={1} step={0.01}
                            value={state.volume}
                            onChange={(vol) => {
                                getEngine().setVolume(vol)
                                dispatch({ type: 'SET_VOLUME', payload: vol })
                            }}
                            style={{ flex: 1 }}
                        />
                        <span className="adm-mono" style={{ fontSize: 10.5, color: 'var(--adm-text-3)', minWidth: 34, textAlign: 'right' }}>
                            {Math.round(state.volume * 100)}%
                        </span>
                    </div>
                </div>

                {/* Vocal Volume */}
                <div style={{ ...rowStyle, opacity: hasVocals ? 1 : 0.4 }}>
                    <div style={{ ...labelStyle, color: 'var(--adm-text)' }}>Vocal Vol</div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon name="mic" size={14} style={{ color: 'var(--adm-text-3)' }} />
                        <Fader
                            min={0} max={1} step={0.01}
                            value={state.vocalVolume ?? 1.0}
                            disabled={!hasVocals}
                            color="var(--adm-cyan)"
                            onChange={(vol) => {
                                getEngine().setVocalVolume(vol)
                                dispatch({ type: 'SET_VOCAL_VOLUME', payload: vol })
                            }}
                            style={{ flex: 1 }}
                        />
                        <span className="adm-mono" style={{ fontSize: 10.5, color: 'var(--adm-text-3)', minWidth: 34, textAlign: 'right' }}>
                            {Math.round((state.vocalVolume ?? 1.0) * 100)}%
                        </span>
                    </div>
                </div>

                {/* Track Output */}
                <div style={rowStyle}>
                    <div style={labelStyle}>Track Out</div>
                    <Select
                        value={state.mainOutputId}
                        onChange={(e) => {
                            dispatch({ type: 'SET_MAIN_OUTPUT', payload: e.target.value })
                            getEngine().setMainSinkId(e.target.value)
                        }}
                        style={{ flex: 1 }}
                    >
                        <option value="">System Default</option>
                        {audioOutputs.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Device ${d.deviceId.slice(0, 6)}`}</option>
                        ))}
                    </Select>
                </div>

                {/* Vocal Output */}
                <div style={{ ...rowStyle, opacity: hasVocals ? 1 : 0.4 }}>
                    <div style={labelStyle}>Vocal Out</div>
                    <Select
                        value={vocalOutputId}
                        disabled={!hasVocals}
                        onChange={(e) => {
                            getEngine().setVocalSinkId(e.target.value)
                            dispatch({ type: 'SET_MONITOR_DEVICES', payload: e.target.value ? [e.target.value] : [] })
                        }}
                        style={{ flex: 1 }}
                    >
                        <option value="">Off (Muted)</option>
                        {audioOutputs.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Device ${d.deviceId.slice(0, 6)}`}</option>
                        ))}
                    </Select>
                </div>

                {/* Vocal Offset */}
                <div style={{ ...rowStyle, opacity: hasVocals ? 1 : 0.4 }}>
                    <div style={labelStyle}>Vocal Offset</div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="adm-mono" style={{ fontSize: 10.5, color: 'var(--adm-text-3)' }}>0s</span>
                        <Fader
                            min={0} max={2000} step={1}
                            value={state.vocalOffsetMs}
                            disabled={!hasVocals}
                            color="var(--adm-green)"
                            onChange={(ms) => {
                                dispatch({ type: 'SET_VOCAL_OFFSET', payload: Math.round(ms) })
                            }}
                            style={{ flex: 1 }}
                        />
                        <span className="adm-mono" style={{ fontSize: 10.5, color: 'var(--adm-text-3)' }}>2s</span>
                    </div>
                    <span className="adm-mono" style={{
                        fontSize: 11.5, fontWeight: 600, minWidth: 58, textAlign: 'right',
                        color: state.vocalOffsetMs > 0 ? 'var(--adm-green)' : 'var(--adm-text-3)',
                    }}>
                        {state.vocalOffsetMs === 0 ? 'Off' : `−${(state.vocalOffsetMs / 1000).toFixed(3)}s`}
                    </span>
                    <Button size="sm" onClick={() => setCalibratorOpen(o => !o)} title="Tap-along calibration">
                        {calibratorOpen ? 'Close' : 'Calibrate'}
                    </Button>
                </div>

                {calibratorOpen && (
                    <VocalOffsetCalibrator onClose={() => setCalibratorOpen(false)} />
                )}
            </div>

            {/* Mic Slots */}
            {slotCount > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <hr className="adm-divider" />

                    {Array.from({ length: slotCount }, (_, i) => {
                        const singer = singers[i]
                        const slot = state.micSlots[i] || { micDeviceId: '', micLevel: 1.0 }
                        const isActive = !!singer
                        // A configured mic no singer is on: live all song long
                        // with the first singer's chain, so don't dim it like an
                        // empty slot. A device some singer already holds isn't a
                        // second mic — the stage opens each device once.
                        const isOpenMic = !isActive && !!slot.micDeviceId
                            && !singers.some(s => s.micDeviceId === slot.micDeviceId)
                        const slotOpacity = isActive || isOpenMic ? 1 : 0.45

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
                        } else if (isOpenMic) {
                            slotLabel = `Open Mic ${i + 1}`
                            labelColor = 'var(--adm-text)'
                        } else {
                            slotLabel = `Mic Slot ${i + 1}`
                            labelColor = 'var(--adm-text-3)'
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
                                    <div style={{ ...labelStyle, color: labelColor, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{
                                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                            background: isActive ? singer.color : isOpenMic ? 'var(--adm-cyan)' : 'var(--adm-text-3)',
                                            boxShadow: isActive ? `0 0 7px ${singer.color}` : isOpenMic ? '0 0 7px var(--adm-cyan)' : 'none',
                                        }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slotLabel}</span>
                                    </div>
                                    <Select
                                        value={micDeviceId}
                                        onChange={(e) => handleMicChange(e.target.value)}
                                        style={{ flex: 1 }}
                                    >
                                        <option value="">Off (No Mic)</option>
                                        {audioInputs.map(d => {
                                            const usedBy = micUsageLabels.get(d.deviceId)
                                            const suffix = usedBy && d.deviceId !== micDeviceId
                                                ? ` (${usedBy})`
                                                : ''
                                            return (
                                                <option key={d.deviceId} value={d.deviceId}>
                                                    {d.label || `Mic ${d.deviceId.slice(0, 6)}`}{suffix}
                                                </option>
                                            )
                                        })}
                                    </Select>
                                </div>

                                {/* Always show volume slider when a mic is selected */}
                                {micDeviceId && (
                                    <div style={rowStyle}>
                                        <div style={{ width: 104, flexShrink: 0 }} />
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Icon name="mic" size={13} style={{ color: isActive ? singer.color : isOpenMic ? 'var(--adm-cyan)' : 'var(--adm-text-3)' }} />
                                            <Fader
                                                min={0} max={1} step={0.01}
                                                value={micLevel}
                                                color={isActive ? singer.color : isOpenMic ? 'var(--adm-cyan)' : undefined}
                                                onChange={handleMicLevelChange}
                                                style={{ flex: 1 }}
                                            />
                                            <span className="adm-mono" style={{ fontSize: 10.5, color: 'var(--adm-text-3)', minWidth: 34, textAlign: 'right' }}>
                                                {Math.round(micLevel * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Show device name below — plus, for a spare mic,
                                    whose treatment it borrows */}
                                {micDeviceId && (isActive || isOpenMic) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{ width: 104, flexShrink: 0 }} />
                                        <span style={{ fontSize: 10.5, color: 'var(--adm-text-3)' }}>
                                            {deviceLabel}
                                            {isOpenMic && (
                                                <>
                                                    {deviceLabel ? ' — ' : ''}
                                                    live all song, {singers[0] ? `${singers[0].name}'s` : 'the first singer’s'} vocal FX
                                                </>
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </Card>
    )
}

export default function ControlsPage() {
    return (
        <div className="adm-page" style={{ maxWidth: 860 }}>
            <PageHeader label="Front of house" title="Controls" desc="Transport, outputs and mic levels for the live mix" />
            {/* Why the deck is empty, when that's on purpose */}
            <LobbyModeBanner />
            <NowPlaying />
            <AudioMixPanel />
        </div>
    )
}
