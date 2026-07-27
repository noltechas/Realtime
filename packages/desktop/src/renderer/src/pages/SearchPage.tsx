import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { VoiceEffects, normalizeMicLevel } from '../audio/VoiceEffectsTypes'
import { Button, EmptyState, Icon, PageHeader, SearchInput, Spinner } from '../components/ui'

interface CatalogSong {
    trackId: string
    name: string
    artist: string
    artUrl: string
    albumName: string
    durationMs: number
    instrumentalPath: string
    vocalsPath?: string
    youtubeUrl?: string
    voiceEffects?: VoiceEffects | VoiceEffects[]
    roles?: string[]
    lyrics?: any[]
    spotifyData?: {
        key?: number
        mode?: number
        tempo?: number
        releaseDate?: string
        instrumentalness?: number
        popularity?: number
    }
}

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function getKeyLabel(song: CatalogSong): string | null {
    const sd = song.spotifyData
    if (sd?.key !== undefined && sd?.mode !== undefined) {
        return `${KEY_NAMES[sd.key]} ${sd.mode === 1 ? 'Major' : 'Minor'}`
    }
    return null
}

function getTempoLabel(song: CatalogSong): string | null {
    if (song.spotifyData?.tempo) return `${song.spotifyData.tempo} BPM`
    return null
}

export default function SearchPage() {
    const { dispatch } = useApp()
    const navigate = useNavigate()
    const [catalog, setCatalog] = useState<CatalogSong[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    useEffect(() => {
        loadCatalog()
    }, [])

    const loadCatalog = async () => {
        setLoading(true)
        if (window.electronAPI) {
            const songs = await window.electronAPI.listCatalog()

            const shuffled = [...songs]
                .map(value => ({ value, sort: Math.random() }))
                .sort((a, b) => a.sort - b.sort)
                .map(({ value }) => value)

            setCatalog(shuffled)
        }
        setLoading(false)
    }

    const selectSong = async (song: CatalogSong) => {
        dispatch({ type: 'SET_EDITING_QUEUE_INDEX', payload: null })
        dispatch({
            type: 'SET_TRACK', payload: {
                id: song.trackId,
                name: song.name,
                artists: [{ name: song.artist }],
                album: {
                    name: song.albumName,
                    images: song.artUrl ? [{ url: song.artUrl, width: 640, height: 640 }] : []
                },
                duration_ms: song.durationMs,
                uri: `spotify:track:${song.trackId}`
            }
        })

        dispatch({ type: 'SET_STEMS_PATH', payload: { instrumental: song.instrumentalPath, vocals: song.vocalsPath } })

        if (song.voiceEffects) {
            dispatch({ type: 'SET_VOICE_EFFECTS', payload: normalizeMicLevel(song.voiceEffects) })
        }

        if (song.roles) {
            dispatch({ type: 'SET_ROLES', payload: song.roles })
        }

        dispatch({ type: 'SET_BACKGROUND_VIDEO', payload: song.youtubeUrl || null })

        if (song.lyrics && song.lyrics.length > 0) {
            dispatch({ type: 'SET_LYRICS', payload: song.lyrics })
        } else {
            try {
                let lyricsData: any
                if (window.electronAPI) {
                    lyricsData = await window.electronAPI.fetchLyrics({
                        trackId: song.trackId,
                        trackName: song.name,
                        artistName: song.artist,
                        albumName: song.albumName,
                        durationMs: song.durationMs
                    })
                } else {
                    const res = await fetch(`https://spotify-lyrics-api-pi.vercel.app/?trackid=${song.trackId}`)
                    lyricsData = await res.json()
                }
                if (lyricsData && !lyricsData.error && lyricsData.lines) {
                    const parsed = lyricsData.lines.map((l: any) => {
                        let ms = 0
                        if (l.startTimeMs && l.startTimeMs !== '0') {
                            ms = parseInt(l.startTimeMs, 10)
                        } else if (l.timeTag) {
                            const match = l.timeTag.match(/(\d+):(\d+)\.(\d+)/)
                            if (match) {
                                ms = parseInt(match[1], 10) * 60000 + parseInt(match[2], 10) * 1000 + parseInt(match[3], 10) * 10
                            }
                        }
                        return { startTimeMs: ms, words: l.words || '' }
                    }).filter((l: any) => l.words.trim() !== '')

                    console.log('[Catalog] Parsed', parsed.length, 'lyrics. First 3:', parsed.slice(0, 3))
                    dispatch({ type: 'SET_LYRICS', payload: parsed })
                }
            } catch (err) { console.error('Lyrics fetch error:', err) }
        }

        navigate('/queue')
    }

    function formatDuration(ms: number): string {
        const s = Math.floor(ms / 1000)
        return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
    }

    const filteredCatalog = catalog.filter(song => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return song.name.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q)
    })

    return (
        <div className="adm-page">
            <PageHeader
                label="Library"
                title="Pick a Song"
                desc={`${catalog.length} track${catalog.length === 1 ? '' : 's'} ready to sing`}
            />

            {/* Session join module + search */}
            <div style={{ marginBottom: 28 }}>
                <SearchInput
                    placeholder="Search songs or artists…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', maxWidth: 480 }}
                />
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Spinner size={24} />
                </div>
            ) : catalog.length === 0 ? (
                <EmptyState
                    icon="music"
                    title="No songs in the library"
                    desc="Import songs with instrumentals on the Admin page to build the catalog."
                    action={<Button variant="primary" onClick={() => navigate('/admin')}>Go to Admin</Button>}
                />
            ) : (
                <div className="adm-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
                    {filteredCatalog.map(song => {
                        const isHovered = hoveredId === song.trackId
                        const tempo = getTempoLabel(song)
                        const keyLabel = getKeyLabel(song)
                        const roleCount = song.roles?.length ?? 0
                        const lyricsCount = song.lyrics?.length ?? 0

                        const details: string[] = []
                        if (tempo) details.push(tempo)
                        if (keyLabel) details.push(keyLabel)
                        if (roleCount > 0) details.push(`${roleCount} ${roleCount === 1 ? 'role' : 'roles'}`)
                        if (lyricsCount > 0) details.push(`${lyricsCount} lines`)
                        if (song.voiceEffects) details.push('FX')

                        return (
                            <button
                                key={song.trackId}
                                onClick={() => selectSong(song)}
                                onMouseEnter={() => setHoveredId(song.trackId)}
                                onMouseLeave={() => setHoveredId(null)}
                                className="adm-card"
                                style={{
                                    padding: 0, cursor: 'pointer', textAlign: 'left', overflow: 'hidden',
                                    transform: isHovered ? 'translateY(-3px)' : 'none',
                                    borderColor: isHovered ? 'rgba(245,165,36,0.45)' : undefined,
                                    boxShadow: isHovered
                                        ? '0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 34px -12px rgba(0,0,0,0.7), 0 0 22px -8px var(--adm-amber-glow)'
                                        : undefined,
                                    transition: 'transform 0.18s var(--adm-spring), box-shadow 0.2s ease, border-color 0.15s ease',
                                }}
                            >
                                <div style={{ position: 'relative' }}>
                                    {song.artUrl ? (
                                        <img
                                            src={song.artUrl}
                                            alt=""
                                            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '100%', aspectRatio: '1', background: 'var(--adm-card-2)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--adm-text-3)',
                                        }}>
                                            <Icon name="music" size={42} />
                                        </div>
                                    )}
                                    {/* Hover play scrim */}
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'linear-gradient(180deg, rgba(10,12,17,0.1), rgba(10,12,17,0.55))',
                                        opacity: isHovered ? 1 : 0,
                                        transition: 'opacity 0.18s ease',
                                    }}>
                                        <span style={{
                                            width: 46, height: 46, borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'linear-gradient(180deg, var(--adm-amber-bright), var(--adm-amber))',
                                            color: '#191104',
                                            boxShadow: '0 8px 24px -6px var(--adm-amber-glow)',
                                            transform: isHovered ? 'scale(1)' : 'scale(0.8)',
                                            transition: 'transform 0.2s var(--adm-spring)',
                                        }}>
                                            <Icon name="play" size={18} style={{ marginLeft: 2 }} />
                                        </span>
                                    </div>
                                    {/* Duration tag */}
                                    <span className="adm-mono" style={{
                                        position: 'absolute', right: 8, bottom: 8,
                                        fontSize: 10.5, padding: '2px 7px', borderRadius: 5,
                                        background: 'rgba(10,12,17,0.75)', color: 'var(--adm-text-2)',
                                        border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)',
                                    }}>
                                        {formatDuration(song.durationMs)}
                                    </span>
                                </div>
                                <div style={{ padding: '11px 13px 13px' }}>
                                    <div style={{
                                        fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 13.5,
                                        color: 'var(--adm-text)',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                        {song.name}
                                    </div>
                                    <div style={{
                                        fontSize: 12, marginTop: 2,
                                        color: isHovered ? 'var(--adm-amber-bright)' : 'var(--adm-text-2)',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        transition: 'color 0.15s ease',
                                    }}>
                                        {isHovered && details.length > 0 ? details.join(' · ') : song.artist}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                    {filteredCatalog.length === 0 && searchQuery && (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <EmptyState icon="search" title="No matches" desc={<>Nothing in the library matches &ldquo;{searchQuery}&rdquo;.</>} />
                        </div>
                    )}
                </div>
            )}

        </div>
    )
}
