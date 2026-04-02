import { useEffect, useRef } from 'react'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import { useApp, QueueItem, NEON_COLORS } from '../context/AppContext'
import { DEFAULT_VOICE_EFFECTS } from '../audio/VoiceEffectsTypes'

const SUPABASE_URL = 'https://hnnbxwitjkeijvoldfuv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubmJ4d2l0amtlaWp2b2xkZnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjcwMTQsImV4cCI6MjA5MDUwMzAxNH0.ENzZ2VLxszHr9StjFds06In7CyGkiyPvu6Jh1LUMMvA'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
    const queueChannelRef = useRef<RealtimeChannel | null>(null)

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

    // Subscribe to Realtime queue changes directly from renderer (browser has WebSocket)
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.karaokeSessionId) return

        // Clean up previous subscription
        if (queueChannelRef.current) {
            supabase.removeChannel(queueChannelRef.current)
        }

        const channel = supabase
            .channel('renderer-queue-' + state.karaokeSessionId)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'karaoke_queue',
                    filter: 'session_id=eq.' + state.karaokeSessionId
                },
                (payload) => {
                    const row = payload.new as any
                    // Only process remote additions (ignore our own local inserts)
                    if (row.source !== 'remote') return

                    // Resolve local catalog entry for this track
                    const catalogEntry = catalogRef.current.find(s => s.trackId === row.track_id)
                    if (!catalogEntry) {
                        console.warn('[Karaoke] Remote queue addition for unknown track:', row.track_id)
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
                        stageTheme: row.stage_theme || null,
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

                    console.log('[Karaoke] Remote song added by', row.added_by_name, ':', catalogEntry.name)
                    dispatch({ type: 'ENQUEUE_SONG', payload: item })
                }
            )
            .subscribe((status) => {
                console.log('[Karaoke] Realtime subscription status:', status)
            })

        queueChannelRef.current = channel

        return () => {
            if (queueChannelRef.current) {
                supabase.removeChannel(queueChannelRef.current)
                queueChannelRef.current = null
            }
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

    // Sync theme changes to Supabase
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.karaokeSessionId) return
        
        supabase.from('karaoke_sessions')
            .update({ theme_name: state.themeName })
            .eq('id', state.karaokeSessionId)
            .then(res => {
                if (res.error) console.error('[Karaoke] Failed to sync theme:', res.error)
            })
    }, [state.themeName, state.karaokeSessionId])
}
