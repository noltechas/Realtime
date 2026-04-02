import { useEffect, useRef } from 'react'
import { useApp, QueueItem, NEON_COLORS } from '../context/AppContext'
import { DEFAULT_VOICE_EFFECTS } from '../audio/VoiceEffectsTypes'

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
    voiceEffects?: any
    roles?: string[]
    lyrics?: any[]
    spotifyData?: any
}

export function useKaraokeSession() {
    const { state, dispatch } = useApp()
    const catalogRef = useRef<CatalogSong[]>([])

    // Load catalog for resolving remote additions
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        window.electronAPI?.listCatalog().then((songs) => {
            catalogRef.current = songs
        })
    }, [])

    // Create session on mount (main window only)
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!window.electronAPI?.createKaraokeSession) return

        window.electronAPI.createKaraokeSession().then((result) => {
            if (result.error || !result.sessionId) {
                console.error('Failed to create karaoke session:', result.error)
                return
            }
            dispatch({
                type: 'SET_KARAOKE_SESSION',
                payload: {
                    sessionId: result.sessionId!,
                    sessionCode: result.sessionCode!,
                    qrDataUrl: result.qrDataUrl!
                }
            })
        })

        return () => {
            window.electronAPI?.closeKaraokeSession()
        }
    }, [])

    // Listen for remote queue additions
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.karaokeSessionId) return

        const addHandler = window.electronAPI?.onRemoteQueueAdd((row: any) => {
            // Resolve local catalog entry for this track
            const catalogEntry = catalogRef.current.find(s => s.trackId === row.track_id)
            if (!catalogEntry) {
                console.warn('Remote queue addition for unknown track:', row.track_id)
                return
            }

            // Build singers from remote singer_configs
            const singerConfigs: any[] = row.singer_configs || []
            const singers = singerConfigs.map((sc: any, i: number) => ({
                id: i,
                name: sc.name || `Singer ${i + 1}`,
                color: sc.color || NEON_COLORS[i % NEON_COLORS.length].color,
                colorGlow: sc.colorGlow || NEON_COLORS[i % NEON_COLORS.length].colorGlow,
                micDeviceId: '',
                vocalTrack: i === 0 ? 'lead' as const : 'backing' as const,
                roleIndices: sc.roleIndices
            }))

            const item: QueueItem = {
                id: `${row.track_id}-${Date.now()}`,
                track: {
                    id: catalogEntry.trackId,
                    name: catalogEntry.name,
                    artists: [{ name: catalogEntry.artist }],
                    album: {
                        name: catalogEntry.albumName,
                        images: catalogEntry.artUrl ? [{ url: catalogEntry.artUrl, width: 300, height: 300 }] : []
                    },
                    duration_ms: catalogEntry.durationMs,
                    uri: ''
                },
                lyrics: catalogEntry.lyrics || [],
                roles: catalogEntry.roles || [],
                singers,
                voiceEffects: catalogEntry.voiceEffects || DEFAULT_VOICE_EFFECTS,
                stemsPath: {
                    instrumental: catalogEntry.instrumentalPath,
                    vocals: catalogEntry.vocalsPath
                },
                songPath: null,
                backgroundVideoPath: catalogEntry.youtubeUrl || null,
                addedBy: row.added_by_name || null,
                remoteQueueId: row.id
            }

            dispatch({ type: 'ENQUEUE_SONG', payload: item })
        })

        const removeHandler = window.electronAPI?.onRemoteQueueRemove((_row: any) => {
            // Remote removals are handled by the Electron app's own remove flow
        })

        return () => {
            if (addHandler) window.electronAPI?.offRemoteQueueAdd(addHandler)
            if (removeHandler) window.electronAPI?.offRemoteQueueRemove(removeHandler)
        }
    }, [state.karaokeSessionId, dispatch])

    // Sync now-playing changes to Supabase
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.karaokeSessionId) return

        if (state.nowPlaying) {
            window.electronAPI?.syncNowPlaying({
                trackId: state.nowPlaying.track.id,
                name: state.nowPlaying.track.name,
                artist: state.nowPlaying.track.artists.map(a => a.name).join(', '),
                artUrl: state.nowPlaying.track.album.images[0]?.url || null
            })
        } else {
            window.electronAPI?.syncNowPlaying(null)
        }
    }, [state.nowPlaying?.track?.id, state.karaokeSessionId])
}
