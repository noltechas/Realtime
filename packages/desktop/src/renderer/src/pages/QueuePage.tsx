import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, useGuestsMap, QueueItem, NEON_COLORS } from '../context/AppContext'
import { DEFAULT_VOICE_EFFECTS, normalizeMicLevel } from '../audio/VoiceEffectsTypes'
import { THEMES, THEME_LIST } from '../context/ThemeContext'
import type { KaraokeGuestRow } from '@karaoke/shared'
import { useAudioDevices } from '../hooks/useAudioDevices'
import { Avatar, ArtTile, Button, Card, CardHeader, Chip, EmptyState, Field, Icon, IconButton, Input, PageHeader, Select } from '../components/ui'
import { LobbyModeBanner } from '../components/LobbyModeCard'

function formatTime(ms: number): string {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// ---- Singer Avatar (live guest resolution) ----
// Resolves the live name + picture from the guest roster when a guestId is
// given; name-only singers fall back to their inline name's initial.
function SingerAvatar({ name, color, size = 26, guestId }: { name: string; color: string; size?: number; guestId?: string }) {
    const guests = useGuestsMap()
    const guest = guestId ? guests.get(guestId) : undefined
    const pic = guest?.profile_picture ?? null
    const displayName = guest?.name ?? name ?? ''
    return <Avatar name={displayName} src={pic} color={color} size={size} />
}

// ---- Setup Panel (song config when adding/editing) ----
function SetupPanel() {
    const { state, dispatch } = useApp()
    const navigate = useNavigate()
    const guestsMap = useGuestsMap()
    const { inputs: audioDevices, outputs: audioOutputs } = useAudioDevices()

    // Add-Singer picker state.
    const [pickerOpen, setPickerOpen] = useState(false)
    const [customName, setCustomName] = useState('')
    // Joined guests not already added to this song (linked by guestId).
    const addedGuestIds = new Set(state.singers.map(s => s.guestId).filter(Boolean) as string[])
    // A single person can accumulate several karaoke_guests rows — they rejoined
    // after their row was wiped, or joined from both phone and web — so the raw
    // roster lists the same name+avatar twice. Collapse rows that share a
    // normalized name + avatar (keeping the most recent), and drop any duplicate
    // of an identity that's already a singer, so the picker shows each guest once.
    const guestIdentity = (g: { name?: string | null; profile_picture?: string | null }) =>
        (g.name || '').trim().toLowerCase() + '|' + (g.profile_picture || '')
    const addedIdentities = new Set(
        state.singers
            .map(s => (s.guestId ? state.guests.find(g => g.id === s.guestId) : undefined))
            .filter((g): g is KaraokeGuestRow => !!g)
            .map(guestIdentity),
    )
    const availableGuests = (() => {
        const byIdentity = new Map<string, KaraokeGuestRow>()
        for (const g of state.guests) {
            if (addedGuestIds.has(g.id)) continue
            const key = guestIdentity(g)
            if (addedIdentities.has(key)) continue
            const existing = byIdentity.get(key)
            if (!existing || (g.created_at || '') > (existing.created_at || '')) byIdentity.set(key, g)
        }
        return Array.from(byIdentity.values())
    })()

    const addGuestSinger = (g: KaraokeGuestRow) => {
        // Carry the guest's saved colour through to a NEON pair when it matches
        // one (keeps stage colours on-palette); otherwise the reducer picks the
        // first free colour.
        const pair = NEON_COLORS.find(c => c.color.toLowerCase() === (g.default_color || '').toLowerCase())
        dispatch({ type: 'ADD_SINGER', payload: { name: g.name, guestId: g.id, color: pair?.color, colorGlow: pair?.colorGlow } })
        setPickerOpen(false)
    }
    const addCustomSinger = () => {
        const n = customName.trim()
        if (!n) return
        dispatch({ type: 'ADD_SINGER', payload: { name: n } })
        setCustomName('')
        setPickerOpen(false)
    }

    const track = state.currentTrack
    const art = track?.album.images[0]?.url
    const hasInstrumental = !!state.stemsPath?.instrumental
    const isEditing = state.editingQueueIndex !== null

    if (!track) return null

    const handleAddOrUpdate = () => {
        const originalItem = isEditing && state.editingQueueIndex !== null
            ? state.queue[state.editingQueueIndex]
            : null
        const originalId = originalItem?.id ?? null
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
            monitorDeviceIds: state.monitorDeviceIds,
            // Preserve fields that aren't set in the SetupPanel UI so edits don't drop them
            addedBy: originalItem?.addedBy ?? null,
            remoteQueueId: originalItem?.remoteQueueId ?? null,
            stageTheme: state.stageTheme ?? null,
            isHidden: originalItem?.isHidden ?? false,
            // Stamp createdAt at the dispatch site (not in the reducer) so the
            // same value is relayed to the stage window. Generating it in the
            // reducer made each window assign its own timestamp, which is the
            // tiebreaker in sortQueueByScore — diverging the queue order, and
            // thus which song each window treats as "next". Also preserves the
            // original timestamp across edits instead of resetting queue order.
            createdAt: originalItem?.createdAt ?? new Date().toISOString()
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
                // Persist the per-song stage theme to the queue row. Without this
                // the row's stage_theme stays null, and the source-agnostic UPDATE
                // handler in useKaraokeSession (fired by votes / lock-on-deck) then
                // clobbers the in-memory theme back to null via APPLY_REMOTE_EDIT,
                // so the stage falls back to the globally-selected theme.
                stageTheme: state.stageTheme ?? null,
                singerConfigs: state.singers.map(s => {
                    // Reference identity by guestId when the slot is a linked
                    // guest; otherwise store the inline name (admin/host- or
                    // name-only singer). Never store a base64 avatar — it is
                    // resolved live from karaoke_guests at render time.
                    // The "white person" / lyric-sanitization flag is no longer a
                    // per-song config value — it lives on the guest record and the
                    // host toggles it on the Admin screen (resolved live on stage).
                    var cfg: any = { color: s.color, colorGlow: s.colorGlow, roleIndices: s.roleIndices };
                    if (s.guestId) cfg.guestId = s.guestId; else cfg.name = s.name;
                    return cfg;
                }),
            }).then(result => {
                if (result && result.id) {
                    dispatch({ type: 'SET_QUEUE_ITEM_REMOTE_ID', payload: { itemId: item.id, remoteQueueId: result.id } })
                }
            }).catch(err => console.error('Failed to sync queue item to Supabase:', err))
        }
    }

    return (
        <div style={{ marginBottom: 40 }}>
            {/* Song header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
                <ArtTile src={art} size={82} radius={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="adm-label" style={{ color: 'var(--adm-amber)', marginBottom: 4 }}>
                        {isEditing ? 'Editing queued song' : 'Setting up'}
                    </div>
                    <h1 className="adm-h1" style={{ fontSize: 26 }}>{track.name}</h1>
                    <div className="adm-sub" style={{ marginTop: 2 }}>
                        {track.artists.map((a: { name: string }) => a.name).join(', ')}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {state.lyrics.length > 0 && (
                            <Chip tone="green"><Icon name="check" size={10} /> {state.lyrics.length} lines synced</Chip>
                        )}
                        <Chip>{track.album.name}</Chip>
                    </div>
                </div>
                <Button size="sm" onClick={() => navigate('/')}>Change Song</Button>
            </div>

            {/* Singers */}
            <Card style={{ marginBottom: 14 }}>
                <CardHeader
                    icon="mic"
                    label="Line-up"
                    title="Who's singing?"
                    desc="Add joined guests or a custom name, then set up each mic"
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {state.singers.map((singer, i) => (
                        <div
                            key={singer.id}
                            className="adm-well"
                            style={{
                                padding: '16px 18px', position: 'relative', overflow: 'hidden',
                                borderLeft: `3px solid ${singer.color}`,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <SingerAvatar name={singer.name || `${i + 1}`} color={singer.color} size={26} guestId={singer.guestId} />
                                <span style={{ fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 14 }}>
                                    {singer.guestId ? (guestsMap.get(singer.guestId)?.name ?? singer.name) : (singer.name || `Singer ${i + 1}`)}
                                </span>
                                <Chip tone={singer.guestId ? 'green' : undefined} style={{ fontSize: 10 }}>
                                    {singer.guestId ? 'Guest' : 'Custom'}
                                </Chip>
                                <div style={{ marginLeft: 'auto' }}>
                                    <IconButton icon="trash" danger title="Remove singer" onClick={() => dispatch({ type: 'REMOVE_SINGER', payload: singer.id })} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: state.roles.length > 0 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 18 }}>
                                <div>
                                    <Field label="Name" style={{ marginBottom: 14 }}>
                                        {singer.guestId ? (
                                            <div>
                                                <div className="adm-input" style={{ opacity: 0.75, cursor: 'default' }}>
                                                    {guestsMap.get(singer.guestId)?.name ?? singer.name}
                                                </div>
                                                <div style={{ fontSize: 10.5, color: 'var(--adm-text-3)', marginTop: 4 }}>Synced from their profile</div>
                                            </div>
                                        ) : (
                                            <Input
                                                value={singer.name}
                                                onChange={(e) => dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer: { name: e.target.value } } })}
                                            />
                                        )}
                                    </Field>
                                    <Field label="Stage color">
                                        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', paddingTop: 3 }}>
                                            {NEON_COLORS.map((neon, cIdx) => {
                                                const selected = singer.color === neon.color
                                                return (
                                                    <button
                                                        key={cIdx}
                                                        onClick={() => dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer: { color: neon.color, colorGlow: neon.colorGlow } } })}
                                                        title="Select stage color"
                                                        style={{
                                                            width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                                                            background: neon.color, padding: 0,
                                                            border: selected ? '2px solid #fff' : '2px solid rgba(0,0,0,0.4)',
                                                            boxShadow: selected ? `0 0 10px ${neon.colorGlow}` : '0 1px 3px rgba(0,0,0,0.4)',
                                                            transform: selected ? 'scale(1.18)' : 'scale(1)',
                                                            transition: 'all 0.15s var(--adm-spring)',
                                                        }}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </Field>
                                </div>

                                {state.roles.length > 0 && (
                                    <Field label="Roles">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                                                            display: 'flex', alignItems: 'center', gap: 8,
                                                            padding: '8px 12px', fontSize: 13, cursor: 'pointer', textAlign: 'left',
                                                            borderRadius: 'var(--adm-r-sm)',
                                                            fontWeight: isSelected ? 650 : 450,
                                                            border: isSelected ? `1px solid ${singer.color}` : '1px solid var(--adm-line)',
                                                            background: isSelected ? `${singer.color}1c` : 'var(--adm-card-2)',
                                                            color: isSelected ? 'var(--adm-text)' : 'var(--adm-text-2)',
                                                            transition: 'all 0.13s ease',
                                                            whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
                                                        }}
                                                    >
                                                        <span style={{
                                                            width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                                                            border: '1px solid rgba(255,255,255,0.25)',
                                                            background: isSelected ? singer.color : 'transparent',
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        }}>
                                                            {isSelected && <Icon name="check" size={9} style={{ color: '#0b0d12' }} />}
                                                        </span>
                                                        {r}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </Field>
                                )}

                                <Field label="Microphone">
                                    <Select
                                        value={singer.micDeviceId}
                                        onChange={(e) => dispatch({ type: 'UPDATE_SINGER', payload: { index: i, singer: { micDeviceId: e.target.value } } })}
                                    >
                                        <option value="" disabled>Select mic…</option>
                                        {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>)}
                                    </Select>
                                </Field>
                            </div>
                        </div>
                    ))}

                    {/* Add singer */}
                    {!pickerOpen ? (
                        <Button icon="plus" onClick={() => setPickerOpen(true)} style={{ alignSelf: 'flex-start' }}>
                            Add Singer
                        </Button>
                    ) : (
                        <div className="adm-well" style={{ padding: '16px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 13.5 }}>Add a singer</span>
                                <IconButton icon="x" title="Close" onClick={() => { setPickerOpen(false); setCustomName('') }} size={26} />
                            </div>

                            <div className="adm-label" style={{ marginBottom: 8 }}>Joined guests</div>
                            {availableGuests.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                    {availableGuests.map(g => (
                                        <button
                                            key={g.id}
                                            onClick={() => addGuestSinger(g)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px 5px 5px',
                                                background: 'var(--adm-card-2)', border: '1px solid var(--adm-line)',
                                                borderRadius: 99, cursor: 'pointer', color: 'var(--adm-text)',
                                                fontWeight: 600, fontSize: 13, fontFamily: 'var(--adm-body)',
                                                transition: 'all 0.14s ease',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,165,36,0.55)' }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--adm-line)' }}
                                        >
                                            <SingerAvatar name={g.name} color={g.default_color || 'var(--adm-amber)'} size={24} guestId={g.id} />
                                            {g.name}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ fontSize: 12.5, color: 'var(--adm-text-3)', marginBottom: 16 }}>
                                    {state.guests.length === 0 ? 'No one has joined yet — add a custom name below.' : 'Everyone who has joined is already added.'}
                                </div>
                            )}

                            <div className="adm-label" style={{ marginBottom: 8 }}>Or a custom name</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Input
                                    value={customName}
                                    onChange={e => setCustomName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') addCustomSinger() }}
                                    placeholder="e.g. Surprise guest"
                                    style={{ flex: 1 }}
                                />
                                <Button variant="primary" onClick={addCustomSinger} disabled={!customName.trim()}>Add</Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Monitor Outputs */}
            {state.stemsPath?.vocals && (
                <Card style={{ marginBottom: 14 }}>
                    <CardHeader
                        icon="headphones"
                        label="Monitors"
                        title="Vocal Monitors"
                        desc="Send the vocal guide track to specific headsets"
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {audioOutputs.map(d => {
                            const selected = state.monitorDeviceIds.includes(d.deviceId)
                            return (
                                <Chip
                                    key={d.deviceId}
                                    tone={selected ? 'green' : undefined}
                                    onClick={() => {
                                        dispatch({
                                            type: 'SET_MONITOR_DEVICES',
                                            payload: selected
                                                ? state.monitorDeviceIds.filter(id => id !== d.deviceId)
                                                : [...state.monitorDeviceIds, d.deviceId]
                                        })
                                    }}
                                    style={{ padding: '7px 14px', fontSize: 12.5 }}
                                >
                                    {selected && <Icon name="check" size={11} />}
                                    {d.label || `Device ${d.deviceId.slice(0, 6)}`}
                                </Chip>
                            )
                        })}
                    </div>
                </Card>
            )}

            {/* Stage Theme */}
            <Card style={{ marginBottom: 14 }}>
                <CardHeader
                    icon="palette"
                    label="Stage"
                    title="Stage Theme"
                    desc="How this song looks on the big screen"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                    {THEME_LIST.map(({ key, displayName }) => {
                        const t = THEMES[key]
                        const isDefault = key === 'neo-brutal'
                        const selected = (state.stageTheme ?? 'neo-brutal') === key
                        return (
                            <button
                                key={key}
                                onClick={() => dispatch({ type: 'SET_STAGE_THEME', payload: isDefault ? null : key })}
                                title={isDefault ? 'Default' : displayName}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    textAlign: 'left', cursor: 'pointer',
                                    padding: '8px 10px', borderRadius: 'var(--adm-r-sm)',
                                    border: selected ? '1px solid var(--adm-amber)' : '1px solid var(--adm-line)',
                                    background: selected ? 'var(--adm-amber-soft)' : 'var(--adm-well)',
                                    boxShadow: selected ? '0 0 12px -4px var(--adm-amber-glow)' : 'var(--adm-well-shadow)',
                                    transition: 'all 0.14s ease',
                                }}
                            >
                                {/* Mini "stage" preview of the theme's OWN colours — no text on
                                    it, so legibility never depends on a theme's contrast. */}
                                <span style={{
                                    width: 36, height: 26, borderRadius: 5, flexShrink: 0, overflow: 'hidden',
                                    background: t.appBg === 'transparent' ? (t.creamDark || '#111') : t.appBg,
                                    border: '1px solid var(--adm-line-strong)',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                                }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.accentA }} />
                                    <span style={{ width: 5, height: 10, borderRadius: 2, background: t.accentB }} />
                                </span>
                                <span style={{
                                    flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600,
                                    color: selected ? 'var(--adm-amber-bright)' : 'var(--adm-text-2)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {isDefault ? 'Default' : displayName}
                                </span>
                                {selected && <Icon name="check" size={13} style={{ color: 'var(--adm-amber-bright)' }} />}
                            </button>
                        )
                    })}
                </div>
            </Card>

            {/* Add / Update */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26 }}>
                <Button
                    variant="primary" size="lg"
                    icon={isEditing ? 'check' : 'plus'}
                    disabled={!hasInstrumental}
                    onClick={handleAddOrUpdate}
                    style={{ minWidth: 300 }}
                >
                    {isEditing ? 'Update in Queue' : 'Add to Queue'}
                </Button>
            </div>
        </div>
    )
}

// ---- Hidden song placeholder (fixed design; song info stays secret) ----
function HiddenQueueItem({ addedBy }: { addedBy?: string | null }) {
    return (
        <>
            <div style={{
                width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'repeating-linear-gradient(135deg, var(--adm-card-2), var(--adm-card-2) 6px, var(--adm-well) 6px, var(--adm-well) 12px)',
                border: '1px solid var(--adm-line)', color: 'var(--adm-text-3)',
            }}>
                <Icon name="eyeOff" size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 14.5,
                    letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    Hidden Song
                </div>
                <div style={{ fontSize: 12, color: 'var(--adm-text-3)', marginTop: 2 }}>
                    Surprise pick — revealed on stage
                </div>
                {addedBy && (
                    <div style={{ fontSize: 11.5, color: 'var(--adm-amber-bright)', fontWeight: 600, marginTop: 2 }}>
                        Added by {addedBy}
                    </div>
                )}
            </div>
        </>
    )
}

// ---- Now Playing Banner (info only, no playback controls) ----
function NowPlayingBanner({ npOverride }: { npOverride?: QueueItem } = {}) {
    const { state } = useApp()
    const np = npOverride ?? state.nowPlaying
    if (!np) return null

    const track = np.track
    const art = track.album.images[0]?.url
    const singers = np.singers || []

    return (
        <div className="adm-card" style={{
            position: 'relative',
            padding: '18px 20px',
            marginBottom: 28,
            borderColor: 'rgba(245,165,36,0.4)',
            boxShadow: 'var(--adm-card-shadow), 0 0 34px -12px var(--adm-amber-glow)',
            overflow: 'hidden',
        }}>
            {/* warm sweep */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(420px 130px at 8% 0%, rgba(245,165,36,0.12), transparent 70%)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, position: 'relative' }}>
                <span className="adm-led adm-led--on" />
                <span className="adm-label" style={{ color: 'var(--adm-green)' }}>Now Playing</span>
                {np.addedBy && (
                    <span style={{ fontSize: 11.5, color: 'var(--adm-text-3)', marginLeft: 4 }}>· added by {np.addedBy}</span>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
                <ArtTile src={art} size={72} radius={10} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: 'var(--adm-display)', fontWeight: 700, fontSize: 20, lineHeight: 1.2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {track.name}
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--adm-text-2)', marginTop: 3 }}>
                        {track.artists.map(a => a.name).join(', ')}
                    </div>
                </div>
                {singers.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <div style={{ display: 'flex' }}>
                            {singers.map((s, idx) => (
                                <div key={s.id} style={{ marginLeft: idx > 0 ? -8 : 0, zIndex: singers.length - idx }}>
                                    <SingerAvatar name={s.name} color={s.color} size={34} guestId={s.guestId} />
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--adm-text-3)', textAlign: 'right', maxWidth: 280 }}>
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
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

    // Advance animation: when nowPlaying changes (queue advance or end-of-queue),
    // fly the previous now-playing banner up off-screen and FLIP-slide every
    // surviving queue card from its old position to its new one. Drag-drop
    // reorders are intentionally NOT animated here — they already have their
    // own visual feedback while dragging.
    const elementRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
    const prevPositionsRef = useRef<Map<string, DOMRect>>(new Map())
    const prevNpRef = useRef<QueueItem | null>(null)
    const [flyingNp, setFlyingNp] = useState<{ np: QueueItem; rect: DOMRect; key: number } | null>(null)

    useLayoutEffect(() => {
        const prevNp = prevNpRef.current
        const currentNp = state.nowPlaying
        const advanced = prevNp !== null && (currentNp === null || prevNp.track.id !== currentNp.track.id)

        if (advanced) {
            const oldRect = prevNp ? prevPositionsRef.current.get('np-' + prevNp.track.id) : undefined
            if (oldRect && prevNp) {
                setFlyingNp({ np: prevNp, rect: oldRect, key: Date.now() })
            }

            elementRefs.current.forEach((el, id) => {
                if (!el) return
                if (id.startsWith('np-')) return
                const prevRect = prevPositionsRef.current.get(id)
                if (!prevRect) return
                const newRect = el.getBoundingClientRect()
                const dy = prevRect.top - newRect.top
                if (Math.abs(dy) < 1) return
                el.animate(
                    [
                        { transform: 'translateY(' + dy + 'px)' },
                        { transform: 'translateY(0)' },
                    ],
                    { duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'none' },
                )
            })
        }

        const newPositions = new Map<string, DOMRect>()
        elementRefs.current.forEach((el, id) => {
            if (el) newPositions.set(id, el.getBoundingClientRect())
        })
        prevPositionsRef.current = newPositions
        prevNpRef.current = currentNp
    }, [state.nowPlaying, state.queue])

    useEffect(() => {
        if (!flyingNp) return
        const t = setTimeout(() => setFlyingNp(null), 700)
        return () => clearTimeout(t)
    }, [flyingNp])

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
        // Locked top-of-queue can't be the source or target of a drop.
        const sourceLocked = !!state.queue[draggedIndex]?.locked
        const targetLocked = !!state.queue[dropIndex]?.locked
        if (sourceLocked || targetLocked) {
            setDraggedIndex(null)
            setDragOverIndex(null)
            return
        }

        const newQueue = [...state.queue]
        const [removed] = newQueue.splice(draggedIndex, 1)
        newQueue.splice(dropIndex, 0, removed)

        // Mirror the score-gap scheme used by main/supabase.reorderQueue so the
        // local view matches what Supabase persists. Reset bonus_points so a
        // host override truly resets the playing field for the dragged item.
        const STEP = 1000
        const rescored = newQueue.map((q, i) => ({
            ...q,
            score: (newQueue.length - i) * STEP,
            bonusPoints: 0,
            locked: i === 0,
        }))

        dispatch({ type: 'REORDER_QUEUE', payload: rescored })
        setDraggedIndex(null)
        setDragOverIndex(null)

        if (state.karaokeSessionId && window.electronAPI?.reorderQueue) {
            const ids = rescored.map(q => q.remoteQueueId).filter(Boolean) as string[]
            if (ids.length > 0) {
                window.electronAPI.reorderQueue(ids)
                    .catch(err => console.error('Failed to sync queue order to Supabase:', err))
            }
        }
    }

    const handleDragEnd = () => {
        setDraggedIndex(null)
        setDragOverIndex(null)
    }

    const adjustScore = (item: QueueItem, delta: number) => {
        if (!item.remoteQueueId) return
        // Optimistic local bump so the row re-sorts immediately. Realtime
        // reconciles when the karaoke_queue UPDATE event arrives.
        dispatch({
            type: 'UPDATE_QUEUE_ITEM_SCORE',
            payload: {
                remoteQueueId: item.remoteQueueId,
                bonusPoints: (item.bonusPoints ?? 0) + delta,
            },
        })
        window.electronAPI?.adjustQueueScore?.(item.remoteQueueId, delta)
            .catch(err => console.error('Failed to adjust queue score:', err))
    }

    const removeSong = (index: number) => {
        const item = state.queue[index]
        if (item?.remoteQueueId && window.electronAPI?.removeQueueItem) {
            window.electronAPI.removeQueueItem(item.remoteQueueId)
                .catch(err => console.error('Failed to remove queue item from Supabase:', err))
        }
        dispatch({ type: 'REMOVE_FROM_QUEUE', payload: index })
    }

    const editSong = (item: QueueItem, index: number) => {
        dispatch({ type: 'SET_EDITING_QUEUE_INDEX', payload: index })
        dispatch({ type: 'SET_TRACK', payload: item.track })
        dispatch({ type: 'SET_LYRICS', payload: item.lyrics })
        dispatch({ type: 'SET_ROLES', payload: item.roles })
        dispatch({ type: 'SET_STAGE_THEME', payload: item.stageTheme ?? null })
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
            const remoteIds = state.queue
                .map(q => q.remoteQueueId)
                .filter(Boolean) as string[]
            dispatch({ type: 'CLEAR_QUEUE' })
            for (const id of remoteIds) {
                window.electronAPI?.removeQueueItem?.(id).catch(() => { })
            }
        }
    }

    const totalDuration = state.queue.reduce((sum, item) => sum + item.track.duration_ms, 0)

    return (
        <div className="adm-page">
            {/* Why nothing is on deck, when that's on purpose */}
            <LobbyModeBanner />

            {/* Setup panel when configuring a song */}
            {state.currentTrack && <SetupPanel />}

            {/* Now Playing Banner */}
            {state.nowPlaying && (
                <div
                    ref={(el) => {
                        const id = 'np-' + state.nowPlaying!.track.id
                        if (el) elementRefs.current.set(id, el)
                        else elementRefs.current.delete(id)
                    }}
                >
                    <NowPlayingBanner />
                </div>
            )}

            {/* Flying ghost of the previous now-playing banner (queue advance) */}
            {flyingNp && (
                <div
                    key={flyingNp.key}
                    ref={(el) => {
                        if (!el) return
                        el.animate(
                            [
                                { transform: 'translateY(0)', opacity: 1 },
                                { transform: 'translateY(-160%)', opacity: 0 },
                            ],
                            { duration: 600, easing: 'cubic-bezier(0.55, 0, 0.7, 0)', fill: 'forwards' },
                        )
                    }}
                    style={{
                        position: 'fixed',
                        left: flyingNp.rect.left,
                        top: flyingNp.rect.top,
                        width: flyingNp.rect.width,
                        zIndex: 1000,
                        pointerEvents: 'none',
                    }}
                >
                    <NowPlayingBanner npOverride={flyingNp.np} />
                </div>
            )}

            {/* Queue Header */}
            <PageHeader
                label="Running order"
                title="Up Next"
                desc={`${state.queue.length} song${state.queue.length !== 1 ? 's' : ''} · ${formatTime(totalDuration)} total`}
                actions={
                    <>
                        <Button icon="plus" onClick={() => navigate('/')}>Add Songs</Button>
                        {state.queue.length > 0 && (
                            <Button variant="danger" icon="trash" onClick={clearQueue}>Clear All</Button>
                        )}
                    </>
                }
            />

            {/* Queue List */}
            {state.queue.length === 0 && !state.nowPlaying ? (
                <EmptyState
                    icon="music"
                    title="Queue is empty"
                    desc="Add songs from the library to get the party started."
                    action={<Button variant="primary" size="lg" onClick={() => navigate('/')}>Browse Songs</Button>}
                />
            ) : state.queue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--adm-text-3)', fontSize: 13.5 }}>
                    No more songs in queue
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {state.queue.map((item, index) => {
                        const art = item.track.album.images[0]?.url
                        const isDragging = draggedIndex === index
                        const isDropTarget = dragOverIndex === index
                        const singers = item.singers || []
                        const isLocked = !!item.locked && index === 0
                        const total = (item.score ?? 0) + (item.bonusPoints ?? 0)

                        return (
                            <div
                                key={item.id}
                                ref={(el) => {
                                    if (el) elementRefs.current.set(item.id, el)
                                    else elementRefs.current.delete(item.id)
                                }}
                                draggable={!isLocked}
                                onDragStart={() => !isLocked && handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                                className="adm-card"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 13,
                                    padding: '13px 16px',
                                    borderColor: isLocked
                                        ? 'rgba(245,165,36,0.5)'
                                        : isDropTarget ? 'rgba(76,195,232,0.6)' : undefined,
                                    boxShadow: isDragging
                                        ? '0 22px 44px -10px rgba(0,0,0,0.8)'
                                        : isLocked
                                            ? 'var(--adm-card-shadow), 0 0 22px -10px var(--adm-amber-glow)'
                                            : undefined,
                                    opacity: isDragging ? 0.45 : 1,
                                    transform: isDragging ? 'scale(0.985)' : 'none',
                                    cursor: isLocked ? 'default' : 'grab',
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, border-color 0.15s ease',
                                }}
                            >
                                {/* Drag handle — hidden when locked */}
                                <span style={{ color: 'var(--adm-text-3)', visibility: isLocked ? 'hidden' : 'visible', cursor: isLocked ? 'default' : 'grab' }}>
                                    <Icon name="grip" size={16} />
                                </span>

                                {/* Position — replaced by lock badge when this is the Next-Up locked card */}
                                {isLocked ? (
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                        minWidth: 52, color: 'var(--adm-amber-bright)',
                                    }}>
                                        <Icon name="lock" size={16} />
                                        <span className="adm-label" style={{ color: 'var(--adm-amber-bright)', letterSpacing: '1px', fontSize: 8.5 }}>
                                            Next Up
                                        </span>
                                    </div>
                                ) : (
                                    <span className="adm-mono" style={{
                                        fontSize: 15, fontWeight: 600, color: 'var(--adm-text-3)',
                                        minWidth: 28, textAlign: 'center',
                                    }}>
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                )}

                                {/* Art + track info — or Hidden placeholder when isHidden */}
                                {item.isHidden ? (
                                    <HiddenQueueItem addedBy={item.addedBy} />
                                ) : (
                                    <>
                                        <ArtTile src={art} size={48} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 14.5,
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {item.track.name}
                                            </div>
                                            <div style={{
                                                fontSize: 12, color: 'var(--adm-text-2)', marginTop: 2,
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {item.track.artists.map(a => a.name).join(', ')}
                                            </div>
                                            {item.addedBy && (
                                                <div style={{ fontSize: 11, color: 'var(--adm-amber-bright)', fontWeight: 600, marginTop: 2 }}>
                                                    Added by {item.addedBy}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Singer avatars with names & roles (roles hidden when song is hidden) */}
                                {singers.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
                                        {singers.map((s) => {
                                            const roleNames = item.isHidden
                                                ? []
                                                : (s.roleIndices || []).map(ri => item.roles[ri]).filter(Boolean)
                                            return (
                                                <span key={s.id} style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                                    padding: '2px 9px 2px 2px', borderRadius: 99,
                                                    background: `${s.color}14`, border: `1px solid ${s.color}3a`,
                                                    fontSize: 11.5, fontWeight: 600, color: 'var(--adm-text)',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    <SingerAvatar name={s.name} color={s.color} size={20} guestId={s.guestId} />
                                                    {s.name || 'Singer'}
                                                    {roleNames.length > 0 && (
                                                        <span style={{ fontSize: 10, color: 'var(--adm-text-3)', fontWeight: 450 }}>
                                                            {roleNames.join(', ')}
                                                        </span>
                                                    )}
                                                </span>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Duration */}
                                <span className="adm-mono" style={{ fontSize: 11.5, color: 'var(--adm-text-3)' }}>
                                    {formatTime(item.track.duration_ms)}
                                </span>

                                {/* Score control: live total of (score + bonusPoints) flanked by
                                    − / + buttons so the host can hand-tune standing. The buttons
                                    bump bonus_points in Supabase (the trigger keeps score in sync
                                    with votes — touching score here would race with it). */}
                                <div
                                    title={`Score: ${item.score ?? 0}  |  Bonus: ${item.bonusPoints ?? 0}`}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                    <IconButton icon="minus" size={26} aria-label="Decrease score" onClick={() => adjustScore(item, -1)} />
                                    <span className="adm-mono" style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        minWidth: 38, height: 26, padding: '0 8px',
                                        borderRadius: 'var(--adm-r-sm)',
                                        border: '1px solid var(--adm-line)',
                                        background: 'var(--adm-well)',
                                        boxShadow: 'var(--adm-well-shadow)',
                                        fontSize: 12.5, fontWeight: 600,
                                        color: total > 0 ? 'var(--adm-green)' : total < 0 ? 'var(--adm-red)' : 'var(--adm-text-2)',
                                    }}>
                                        {total}
                                    </span>
                                    <IconButton icon="plus" size={26} aria-label="Increase score" onClick={() => adjustScore(item, 1)} />
                                </div>

                                {/* Actions — Edit is suppressed for hidden songs so the host can't reveal them */}
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {!item.isHidden && (
                                        <IconButton icon="pencil" title="Edit song setup" onClick={() => editSong(item, index)} />
                                    )}
                                    <IconButton icon="trash" danger title="Remove from queue" onClick={() => removeSong(index)} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
