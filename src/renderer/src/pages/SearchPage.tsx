import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

import { VoiceEffects, normalizeMicLevel } from '../audio/VoiceEffectsTypes'

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
        instrumentalness?: number  // 0-1; lower = more vocals = better for karaoke
        popularity?: number        // 0-100; fallback when audio-features unavailable
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

function getReleaseYear(song: CatalogSong): string | null {
    if (song.spotifyData?.releaseDate) return song.spotifyData.releaseDate.split('-')[0]
    return null
}

export default function SearchPage() {
    const { state, dispatch } = useApp()
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

            // Sort: vocalness (1 - instrumentalness) first, then popularity (when audio-features returns 403), then name
            const sortScore = (s: CatalogSong) => {
                if (typeof s.spotifyData?.instrumentalness === 'number') return 2 + (1 - s.spotifyData.instrumentalness) // 2-3 range
                if (typeof s.spotifyData?.popularity === 'number') return 1 + s.spotifyData.popularity / 100 // 1-2 range
                return -1
            }
            const sorted = [...songs].sort((a: CatalogSong, b: CatalogSong) => {
                const scoreA = sortScore(a)
                const scoreB = sortScore(b)
                if (scoreB !== scoreA) return scoreB - scoreA
                return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
            })

            setCatalog(sorted)
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
        <div className="page anim-enter">
            {/* Hero */}
            <div style={{ marginBottom: 40, paddingTop: 16 }}>
                <h1 style={{
                    fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 700,
                    lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 8,
                    background: 'var(--grad-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>
                    Pick a Song
                </h1>
                <p style={{ fontSize: 15, color: 'var(--white-muted)', maxWidth: 480, marginBottom: 24 }}>
                    Choose from the catalog to start your karaoke session
                </p>

                {/* QR Code Session Card */}
                {state.karaokeQrDataUrl && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 20,
                        padding: '16px 20px', marginBottom: 24,
                        background: 'var(--surface-1)',
                        border: '1px solid var(--white-ghost)',
                        borderRadius: 16,
                        maxWidth: 480,
                    }}>
                        <img src={state.karaokeQrDataUrl} alt="QR Code"
                            style={{ width: 96, height: 96, borderRadius: 8 }} />
                        <div>
                            <div style={{
                                fontFamily: 'var(--font-display)', fontWeight: 700,
                                fontSize: 28, letterSpacing: '4px', color: 'white',
                            }}>
                                {state.karaokeSessionCode}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--white-muted)', marginTop: 4 }}>
                                Scan to add songs from your phone
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div style={{ position: 'relative', maxWidth: 480 }}>
                    <div style={{
                        position: 'absolute', left: 16, top: 0, bottom: 0,
                        display: 'flex', alignItems: 'center', pointerEvents: 'none', color: 'var(--white-muted)'
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search songs or artists..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            background: 'var(--surface-1)',
                            border: '1px solid var(--white-ghost)',
                            borderRadius: '99px',
                            padding: '12px 16px 12px 48px',
                            fontSize: 15,
                            color: 'white',
                            outline: 'none',
                            fontFamily: 'inherit',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--violet)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--white-ghost)'}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <div className="spinner" />
                </div>
            ) : catalog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                        No songs available
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--white-muted)', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
                        An admin needs to add songs with instrumentals first. Go to the Admin page to set up the catalog.
                    </p>
                    <button className="btn btn--fill" onClick={() => navigate('/admin')}>
                        Go to Admin
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                    {filteredCatalog.map(song => {
                        const isHovered = hoveredId === song.trackId
                        const tempo = getTempoLabel(song)
                        const keyLabel = getKeyLabel(song)
                        const roleCount = song.roles?.length ?? 0
                        const lyricsCount = song.lyrics?.length ?? 0

                        // Build the detail line shown on hover
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
                                style={{
                                    background: 'var(--surface-1)',
                                    border: `1px solid ${isHovered ? 'rgba(167, 139, 250, 0.4)' : 'rgba(255,255,255,0.04)'}`,
                                    borderRadius: 16,
                                    padding: 0,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    overflow: 'hidden',
                                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                                    boxShadow: isHovered
                                        ? '0 8px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(167,139,250,0.12)'
                                        : '0 2px 8px rgba(0,0,0,0.15)',
                                }}
                            >
                                {song.artUrl ? (
                                    <img src={song.artUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                                ) : (
                                    <div style={{ width: '100%', aspectRatio: '1', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🎵</div>
                                )}
                                <div style={{ padding: '12px 14px' }}>
                                    <div style={{
                                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'white',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}>
                                        {song.name}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--white-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {isHovered && details.length > 0
                                            ? details.join(' \u00B7 ')
                                            : song.artist
                                        }
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--white-faint)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {isHovered
                                            ? `${song.artist} \u00B7 ${formatDuration(song.durationMs)}`
                                            : formatDuration(song.durationMs)
                                        }
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                    {filteredCatalog.length === 0 && searchQuery && (
                        <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: 'var(--white-muted)' }}>
                            No songs found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
