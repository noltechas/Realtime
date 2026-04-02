import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, QueueItem, NEON_COLORS } from '../context/AppContext'
import { DEFAULT_VOICE_EFFECTS, normalizeMicLevel } from '../audio/VoiceEffectsTypes'
import { useTheme } from '../context/ThemeContext'

function formatTime(ms: number): string {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// ---- SVG Icons (thick-stroked, monochrome, no emojis) ----
const IconMic = ({ size = 14, color = '#1A1A1A' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
)

const IconHeadphones = ({ size = 14, color = '#1A1A1A' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
)

const IconMusic = ({ size = 14, color = '#1A1A1A' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
)

const IconCheck = ({ size = 12, color = '#1A1A1A' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

const IconTrash = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
)

const IconGrip = () => (
    <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" opacity="0.3">
        <circle cx="3" cy="3" r="1.5" /><circle cx="9" cy="3" r="1.5" />
        <circle cx="3" cy="9" r="1.5" /><circle cx="9" cy="9" r="1.5" />
        <circle cx="3" cy="15" r="1.5" /><circle cx="9" cy="15" r="1.5" />
    </svg>
)

// ---- Singer Avatar (colored initial circle) ----
function SingerAvatar({ name, color, size = 26 }: { name: string; color: string; size?: number }) {
    const theme = useTheme()
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: color, border: theme.borderThin,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: theme.fontDisplay, fontWeight: 700,
            fontSize: size * 0.42, color: theme.black,
            flexShrink: 0,
        }}>
            {name.charAt(0).toUpperCase()}
        </div>
    )
}

// ---- Setup Panel (song config when adding/editing) ----
function SetupPanel() {
    const { state, dispatch } = useApp()
    const navigate = useNavigate()
    const theme = useTheme()
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
                            style={{
                                width: 80, height: 80, borderRadius: 6, objectFit: 'cover',
                                border: theme.border, boxShadow: theme.shadow,
                            }}
                        />
                    )}
                    <div style={{ flex: 1 }}>
                        <h1 style={{
                            fontFamily: theme.fontDisplay, fontSize: 28, fontWeight: 700,
                            lineHeight: 1.2, letterSpacing: '-0.5px', color: theme.black,
                        }}>
                            {track.name}
                        </h1>
                        <p style={{ fontSize: 15, color: theme.black, opacity: 0.5, marginTop: 2 }}>
                            {track.artists.map((a: { name: string }) => a.name).join(', ')}
                        </p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            {state.lyrics.length > 0 && (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '3px 10px', fontSize: 11, fontWeight: 700,
                                    fontFamily: theme.fontDisplay, color: theme.black,
                                    background: theme.mintGreen, border: theme.borderThin, borderRadius: theme.radiusSmall,
                                }}>
                                    <IconCheck size={10} /> {state.lyrics.length} lines synced
                                </span>
                            )}
                            <span style={{
                                padding: '3px 10px', fontSize: 11, fontWeight: 700,
                                fontFamily: theme.fontDisplay, color: theme.black,
                                background: theme.softViolet, border: theme.borderThin, borderRadius: theme.radiusSmall,
                            }}>
                                {track.album.name}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            ...theme.btnOutline, fontSize: 12, padding: '8px 16px',
                            color: theme.black, borderColor: theme.black,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = theme.creamDark }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                        Change Song
                    </button>
                </div>
            </div>

            {/* Singer Count */}
            <section style={{ ...theme.card, padding: '22px 26px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: `${theme.softViolet}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <IconMic size={14} />
                    </div>
                    <div>
                        <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 14, color: theme.black }}>How many singers?</div>
                        <div style={{ fontSize: 11, color: theme.black, opacity: 0.4 }}>Set up microphones for each singer</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {[0, 1, 2, 3, 4].map(n => (
                        <button
                            key={n}
                            onClick={() => dispatch({ type: 'SET_SINGER_COUNT', payload: n })}
                            style={{
                                flex: 1, fontSize: 14, padding: '12px 0',
                                fontFamily: theme.fontDisplay, fontWeight: 700,
                                background: state.singerCount === n ? theme.vividYellow : theme.creamDark,
                                border: state.singerCount === n ? theme.border : theme.borderThin,
                                borderRadius: 6, cursor: 'pointer',
                                boxShadow: state.singerCount === n ? theme.shadowPressed : 'none',
                                color: theme.black,
                                transition: 'all 0.1s',
                            }}
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
                    style={{
                        ...theme.card,
                        border: `3px solid ${singer.color}`,
                        boxShadow: theme.shadowColor(singer.color),
                        padding: '24px 28px', marginBottom: 12,
                        position: 'relative', overflow: 'hidden',
                    }}
                >
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 6, bottom: 0, background: singer.color }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                        <SingerAvatar name={singer.name || `${i + 1}`} color={singer.color} size={24} />
                        <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 15, color: theme.black }}>
                            Singer {i + 1}
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: state.roles.length > 0 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 20 }}>
                        <div>
                            <label style={{
                                display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                                color: theme.black, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase',
                            }}>Name</label>
                            <input
                                value={singer.name}
                                onChange={(e) => dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer: { name: e.target.value } } })}
                                style={{
                                    ...theme.input,
                                    width: '100%', padding: '12px 16px', fontSize: 14, marginBottom: 12,
                                }}
                                onFocus={e => (e.target.style.borderColor = singer.color)}
                                onBlur={e => (e.target.style.borderColor = '#1A1A1A')}
                            />
                            <label style={{
                                display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                                color: theme.black, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase',
                            }}>Theme Color</label>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 4px' }}>
                                {NEON_COLORS.map((neon, cIdx) => (
                                    <div
                                        key={cIdx}
                                        onClick={() => dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer: { color: neon.color, colorGlow: neon.colorGlow } } })}
                                        style={{
                                            width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                                            background: neon.color, border: theme.borderThin,
                                            boxShadow: singer.color === neon.color ? `0 0 0 3px ${neon.color}` : 'none',
                                            transform: singer.color === neon.color ? 'scale(1.15)' : 'scale(1)',
                                            transition: 'all 0.15s',
                                        }}
                                        title="Select theme color"
                                    />
                                ))}
                            </div>
                        </div>
                        {state.roles.length > 0 && (
                            <div>
                                <label style={{
                                    display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                                    color: theme.black, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase',
                                }}>Roles</label>
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
                                                    flex: 1, minWidth: 100, padding: '12px 16px', fontSize: 14, borderRadius: 6,
                                                    background: isSelected ? theme.softViolet : theme.creamDark,
                                                    color: theme.black,
                                                    border: isSelected ? theme.border : theme.borderThin,
                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                    fontWeight: isSelected ? 700 : 400,
                                                    whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
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
                            <label style={{
                                display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                                color: theme.black, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase',
                            }}>Microphone</label>
                            <select
                                value={singer.micDeviceId}
                                onChange={(e) => dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer: { micDeviceId: e.target.value } } })}
                                style={{
                                    ...theme.select,
                                    width: '100%', padding: '12px 16px', fontSize: 14,
                                }}
                            >
                                <option value="" disabled>Select mic...</option>
                                {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>)}
                            </select>
                        </div>
                        {singer.roleIndices && singer.roleIndices.length > 0 && doesAnyRoleHaveOffensiveWord(singer.roleIndices) && (
                            <div style={{
                                gridColumn: '1 / -1', background: theme.creamDark,
                                padding: '12px 16px', borderRadius: 6, border: theme.borderThin,
                                display: 'flex', alignItems: 'center', gap: 12,
                            }}>
                                <input
                                    type="checkbox"
                                    checked={singer.whitePersonCheck || false}
                                    onChange={(e) => dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer: { whitePersonCheck: e.target.checked } } })}
                                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: singer.color }}
                                />
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: theme.black }}>White Singer</div>
                                    <div style={{ fontSize: 11, color: theme.black, opacity: 0.5 }}>Sanitizes a certain word from lyrics for this singer</div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            ))}

            {/* Monitor Outputs */}
            {state.stemsPath?.vocals && (
                <section style={{ ...theme.card, padding: '22px 26px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: `${theme.mintGreen}33`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <IconHeadphones size={14} />
                        </div>
                        <div>
                            <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 14, color: theme.black }}>Vocal Monitors</div>
                            <div style={{ fontSize: 11, color: theme.black, opacity: 0.4 }}>Send vocal guide track to specific headsets</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {audioOutputs.map(d => {
                            const selected = state.monitorDeviceIds.includes(d.deviceId)
                            return (
                                <button
                                    key={d.deviceId}
                                    onClick={() => {
                                        dispatch({
                                            type: 'SET_MONITOR_DEVICES',
                                            payload: selected
                                                ? state.monitorDeviceIds.filter(id => id !== d.deviceId)
                                                : [...state.monitorDeviceIds, d.deviceId]
                                        })
                                    }}
                                    style={{
                                        fontSize: 12, padding: '8px 16px', borderRadius: 6,
                                        fontFamily: theme.fontDisplay, fontWeight: 600,
                                        background: selected ? theme.mintGreen : theme.creamDark,
                                        border: selected ? theme.border : theme.borderThin,
                                        color: theme.black, cursor: 'pointer',
                                        boxShadow: selected ? theme.shadowPressed : 'none',
                                        transition: 'all 0.1s',
                                    }}
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
                    disabled={!hasInstrumental}
                    style={{
                        ...theme.btnPrimary,
                        fontSize: 18, padding: '18px 60px',
                        opacity: hasInstrumental ? 1 : 0.5,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                    }}
                    onClick={handleAddOrUpdate}
                    onMouseEnter={e => {
                        if (hasInstrumental) {
                            e.currentTarget.style.transform = 'translate(-2px, -2px)'
                            e.currentTarget.style.boxShadow = theme.shadowLift
                        }
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translate(0, 0)'
                        e.currentTarget.style.boxShadow = theme.shadow
                    }}
                    onMouseDown={e => {
                        if (hasInstrumental) {
                            e.currentTarget.style.transform = 'translate(2px, 2px)'
                            e.currentTarget.style.boxShadow = theme.shadowPressed
                        }
                    }}
                    onMouseUp={e => {
                        if (hasInstrumental) {
                            e.currentTarget.style.transform = 'translate(-2px, -2px)'
                            e.currentTarget.style.boxShadow = theme.shadowLift
                        }
                    }}
                >
                    {isEditing ? 'UPDATE IN QUEUE' : 'ADD TO QUEUE'}
                </button>
            </div>
        </div>
    )
}

// ---- Now Playing Banner (info only, no playback controls) ----
function NowPlayingBanner() {
    const { state } = useApp()
    const theme = useTheme()
    const np = state.nowPlaying
    if (!np) return null

    const track = np.track
    const art = track.album.images[0]?.url
    const singers = np.singers || []

    return (
        <div style={{
            position: 'relative',
            background: theme.vividYellow,
            border: theme.border,
            boxShadow: theme.shadow,
            borderRadius: theme.radius,
            padding: '20px 24px',
            marginBottom: 32,
            transform: 'rotate(-0.5deg)',
        }}>
            {/* Sticker label */}
            <div style={{
                ...theme.stickerLabel,
                top: -12, left: 20,
                background: theme.hotRed,
                color: theme.white,
                transform: 'rotate(-2deg)',
            }}>
                NOW PLAYING
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingTop: 8 }}>
                {art ? (
                    <img src={art} alt="" style={{
                        width: 80, height: 80, borderRadius: 6, objectFit: 'cover',
                        border: theme.border,
                    }} />
                ) : (
                    <div style={{
                        width: 80, height: 80, borderRadius: 6, border: theme.border,
                        background: theme.cream,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <IconMusic size={32} />
                    </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 22,
                        color: theme.white, lineHeight: 1.2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {track.name}
                    </div>
                    <div style={{
                        fontFamily: theme.fontBody, fontSize: 14,
                        color: theme.white, opacity: 0.8, marginTop: 2,
                    }}>
                        {track.artists.map(a => a.name).join(', ')}
                    </div>
                    {np.addedBy && (
                        <div style={{
                            fontSize: 11, fontFamily: theme.fontDisplay, fontWeight: 600,
                            color: theme.hotRed, marginTop: 4,
                        }}>
                            Added by {np.addedBy}
                        </div>
                    )}
                </div>
                {singers.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex' }}>
                            {singers.map((s, idx) => (
                                <div key={s.id} style={{ marginLeft: idx > 0 ? -8 : 0, zIndex: singers.length - idx }}>
                                    <SingerAvatar name={s.name} color={s.color} size={36} />
                                </div>
                            ))}
                        </div>
                        <div style={{
                            fontSize: 10, fontFamily: theme.fontDisplay, fontWeight: 700,
                            color: theme.white, opacity: 0.8, textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }}>
                            {singers.map(s => {
                                const roleNames = (s.roleIndices || []).map(ri => np.roles[ri]).filter(Boolean)
                                return s.name + (roleNames.length > 0 ? ' (' + roleNames.join(', ') + ')' : '')
                            }).join(' / ')}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ---- Queue Page ----
export default function QueuePage() {
    const { state, dispatch } = useApp()
    const navigate = useNavigate()
    const theme = useTheme()
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

    const totalDuration = state.queue.reduce((sum, item) => sum + item.track.duration_ms, 0)

    return (
        <div style={theme.page}>
            {/* Setup panel when configuring a song */}
            {state.currentTrack && <SetupPanel />}

            {/* Now Playing Banner */}
            <NowPlayingBanner />

            {/* Queue Header */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{
                        fontFamily: theme.fontDisplay, fontSize: 32, fontWeight: 700,
                        lineHeight: 1.1, letterSpacing: '-1px', color: theme.black, marginBottom: 4,
                    }}>
                        UP NEXT
                    </h2>
                    <p style={{ fontSize: 13, color: theme.black, opacity: 0.5, fontFamily: theme.fontBody }}>
                        {state.queue.length} song{state.queue.length !== 1 ? 's' : ''} &mdash; {formatTime(totalDuration)} total
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{ ...theme.btnSecondary, fontSize: 13, padding: '10px 20px' }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translate(-2px, -2px)'
                            e.currentTarget.style.boxShadow = theme.shadowLift
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translate(0, 0)'
                            e.currentTarget.style.boxShadow = theme.shadow
                        }}
                    >
                        Add Songs
                    </button>
                    {state.queue.length > 0 && (
                        <button
                            onClick={clearQueue}
                            style={{ ...theme.btnOutline, fontSize: 13, padding: '10px 20px' }}
                            onMouseEnter={e => { e.currentTarget.style.background = theme.hotRed; e.currentTarget.style.color = theme.white }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.hotRed }}
                        >
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Queue List */}
            {state.queue.length === 0 && !state.nowPlaying ? (
                /* Empty state */
                <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <div style={{ marginBottom: 20 }}>
                        <IconMusic size={48} />
                    </div>
                    <h2 style={{
                        fontFamily: theme.fontDisplay, fontSize: 24, fontWeight: 700,
                        color: theme.black, marginBottom: 8,
                    }}>
                        QUEUE IS EMPTY
                    </h2>
                    <p style={{
                        fontSize: 14, color: theme.black, opacity: 0.5,
                        marginBottom: 28, maxWidth: 360, margin: '0 auto 28px',
                        fontFamily: theme.fontBody,
                    }}>
                        Add songs from the catalog to get the party started
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        style={{ ...theme.btnPrimary, fontSize: 16, padding: '16px 48px' }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translate(-2px, -2px)'
                            e.currentTarget.style.boxShadow = theme.shadowLift
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translate(0, 0)'
                            e.currentTarget.style.boxShadow = theme.shadow
                        }}
                    >
                        BROWSE SONGS
                    </button>
                </div>
            ) : state.queue.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '40px 20px',
                    color: theme.black, opacity: 0.4, fontSize: 14,
                    fontFamily: theme.fontBody,
                }}>
                    No more songs in queue
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {state.queue.map((item, index) => {
                        const art = item.track.album.images[0]?.url
                        const isDragging = draggedIndex === index
                        const isDropTarget = dragOverIndex === index
                        const singers = item.singers || []

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
                                    padding: 16,
                                    background: isDropTarget ? theme.creamDark : theme.white,
                                    border: isDropTarget ? `3px solid ${theme.softViolet}` : theme.border,
                                    borderRadius: theme.radius,
                                    boxShadow: isDragging ? '8px 8px 0px ' + theme.black : theme.shadow,
                                    opacity: isDragging ? 0.4 : 1,
                                    transform: isDragging ? 'rotate(2deg) scale(0.98)' : 'none',
                                    cursor: 'grab',
                                    transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.15s',
                                }}
                                onMouseEnter={e => {
                                    if (!isDragging) {
                                        e.currentTarget.style.transform = 'translate(-1px, -1px)'
                                        e.currentTarget.style.boxShadow = '5px 5px 0px ' + theme.black
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isDragging) {
                                        e.currentTarget.style.transform = 'none'
                                        e.currentTarget.style.boxShadow = theme.shadow
                                    }
                                }}
                            >
                                {/* Drag handle */}
                                <div style={{ padding: '0 4px', cursor: 'grab' }}>
                                    <IconGrip />
                                </div>

                                {/* Position */}
                                <div style={{
                                    fontFamily: theme.fontDisplay, fontSize: 18, fontWeight: 700,
                                    color: theme.black, opacity: 0.2, minWidth: 28, textAlign: 'center',
                                }}>
                                    {index + 1}
                                </div>

                                {/* Art */}
                                {art ? (
                                    <img src={art} alt="" style={{
                                        width: 48, height: 48, borderRadius: theme.radiusSmall,
                                        objectFit: 'cover', border: theme.borderThin,
                                    }} />
                                ) : (
                                    <div style={{
                                        width: 48, height: 48, borderRadius: theme.radiusSmall,
                                        border: theme.borderThin, background: theme.creamDark,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <IconMusic size={20} />
                                    </div>
                                )}

                                {/* Track info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 15,
                                        color: theme.black,
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        marginBottom: 2,
                                    }}>
                                        {item.track.name}
                                    </div>
                                    <div style={{
                                        fontSize: 12, color: theme.black, opacity: 0.5,
                                        fontFamily: theme.fontBody,
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {item.track.artists.map(a => a.name).join(', ')}
                                    </div>
                                    {item.addedBy && (
                                        <div style={{
                                            fontSize: 11, fontFamily: theme.fontDisplay,
                                            fontWeight: 600, color: theme.hotRed, marginTop: 2,
                                        }}>
                                            Added by {item.addedBy}
                                        </div>
                                    )}
                                </div>

                                {/* Singer avatars with names & roles */}
                                {singers.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                        {singers.map((s) => {
                                            const roleNames = (s.roleIndices || []).map(ri => item.roles[ri]).filter(Boolean)
                                            return (
                                                <div key={s.id} style={{
                                                    display: 'flex', alignItems: 'center', gap: 4,
                                                    padding: '2px 8px 2px 2px', borderRadius: 99,
                                                    background: `${s.color}15`, border: `1px solid ${s.color}30`,
                                                    fontSize: 11, fontFamily: theme.fontDisplay, fontWeight: 600,
                                                    color: theme.black,
                                                }}>
                                                    <SingerAvatar name={s.name} color={s.color} size={20} />
                                                    <span>{s.name || 'Singer'}</span>
                                                    {roleNames.length > 0 && (
                                                        <span style={{ fontSize: 9, opacity: 0.5, fontWeight: 400 }}>
                                                            {roleNames.join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Duration */}
                                <div style={{
                                    fontSize: 12, fontFamily: theme.fontDisplay, fontWeight: 500,
                                    color: theme.black, opacity: 0.4,
                                }}>
                                    {formatTime(item.track.duration_ms)}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                        onClick={() => editSong(item, index)}
                                        style={{
                                            padding: '6px 14px', borderRadius: 6,
                                            background: theme.creamDark, border: theme.borderThin,
                                            color: theme.black, fontSize: 11,
                                            fontFamily: theme.fontDisplay, fontWeight: 700,
                                            cursor: 'pointer', transition: 'all 0.1s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = theme.vividYellow }}
                                        onMouseLeave={e => { e.currentTarget.style.background = theme.creamDark }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => removeSong(index)}
                                        style={{
                                            padding: 6, borderRadius: 6,
                                            background: 'transparent',
                                            border: `2px solid ${theme.hotRed}`,
                                            cursor: 'pointer', transition: 'all 0.1s',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = theme.hotRed; (e.currentTarget.firstChild as SVGElement).style.stroke = theme.white }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; (e.currentTarget.firstChild as SVGElement).style.stroke = theme.hotRed }}
                                    >
                                        <IconTrash />
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
