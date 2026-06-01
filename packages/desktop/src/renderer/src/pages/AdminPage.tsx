import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import { useApp, NEON_COLORS } from '../context/AppContext'
import { AdminAwardsTab } from '../awards/AdminAwardsTab'
import { useTheme } from '../context/ThemeContext'
import { VoiceEffects, DEFAULT_VOICE_EFFECTS, normalizeMicLevel } from '../audio/VoiceEffectsTypes'
import { VoiceEffectsEngine } from '../audio/VoiceEffectsEngine'
import { BUILT_IN_PRESETS, PRESET_CATEGORIES, VocalPreset } from '../audio/VocalPresets'
import { useAudioDevices } from '../hooks/useAudioDevices'

const SUPABASE_URL = 'https://hnnbxwitjkeijvoldfuv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubmJ4d2l0amtlaWp2b2xkZnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjcwMTQsImV4cCI6MjA5MDUwMzAxNH0.ENzZ2VLxszHr9StjFds06In7CyGkiyPvu6Jh1LUMMvA'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const KEY_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']


interface AdminGuest {
    id: string
    name: string
    profilePicture: string | null
}

interface SongRequest {
    id: string
    requestedByName: string
    requestedByProfilePicture: string | null
    trackId: string
    trackName: string
    trackArtist: string
    trackArtUrl: string | null
    trackAlbum: string | null
    trackDurationMs: number | null
    spotifyData: any | null
    status: 'pending' | 'added' | 'dismissed'
    createdAt: string
}

interface CatalogSong {
    trackId: string; name: string; artist: string; artUrl: string
    albumName: string; durationMs: number; instrumentalPath: string
    vocalsPath?: string
    youtubeUrl?: string
    voiceEffects?: VoiceEffects | VoiceEffects[]
    roles?: string[]
    lyrics?: any[]
    genres?: string[]
    spotifyData?: { key?: number; mode?: number; tempo?: number; releaseDate?: string; instrumentalness?: number; popularity?: number }
}

interface PendingSong {
    track: any
    configs: VoiceEffects[]
    roles: string[]
    lyrics: any[]
    activeRoleTab: number
    genres: string[]
    spotifyData?: {
        key?: number
        mode?: number
        tempo?: number
        releaseDate?: string
        instrumentalness?: number
        popularity?: number
    }
}

const GENRE_BUCKETS = ['Hip Hop', 'R&B', 'Pop', 'Rock', 'Indie', 'Electronic', 'Folk', 'Other'] as const

function bucketSpotifyGenres(rawTags: string[] | null | undefined): string[] {
    if (!rawTags || rawTags.length === 0) return []
    const rules: { bucket: string; matches: string[] }[] = [
        { bucket: 'Hip Hop', matches: ['hip hop', 'rap', 'trap', 'drill', 'grime'] },
        { bucket: 'R&B', matches: ['r&b', 'rnb', 'soul', 'neo soul', 'quiet storm', 'new jack swing'] },
        { bucket: 'Indie', matches: ['indie', 'dream pop', 'psychedelic', 'shoegaze', 'bedroom pop', 'art pop', 'lo-fi'] },
        { bucket: 'Electronic', matches: ['electronic', 'edm', 'house', 'techno', 'dance', 'synth-pop', 'synthpop', 'vaporwave', 'electropop', 'trance', 'drum and bass', 'dnb'] },
        { bucket: 'Rock', matches: ['rock', 'metal', 'punk', 'grunge', 'emo'] },
        { bucket: 'Folk', matches: ['country', 'folk', 'americana', 'bluegrass', 'singer-songwriter'] },
        { bucket: 'Pop', matches: ['pop'] }
    ]
    const result = new Set<string>()
    for (const raw of rawTags) {
        if (!raw) continue
        const tag = raw.toLowerCase()
        for (const rule of rules) {
            if (rule.matches.some(m => tag.includes(m))) { result.add(rule.bucket); break }
        }
    }
    return Array.from(result)
}

export default function AdminPage() {
    const { state, dispatch } = useApp()
    const theme = useTheme()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [catalog, setCatalog] = useState<CatalogSong[]>([])
    const [catalogFilter, setCatalogFilter] = useState('')
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [pending, setPending] = useState<PendingSong | null>(null)

    const [pendingAudioFile, setPendingAudioFile] = useState<{ name: string; path: string } | null>(null)
    const [pendingVocalsFile, setPendingVocalsFile] = useState<{ name: string; path: string } | null>(null)
    const [existingInstrumental, setExistingInstrumental] = useState(false)
    const [existingVocals, setExistingVocals] = useState(false)
    const [youtubeUrl, setYoutubeUrl] = useState('')

    const [fetchingLyrics, setFetchingLyrics] = useState(false)
    const [lyricsError, setLyricsError] = useState<string | null>(null)
    const [newRoleName, setNewRoleName] = useState('')

    const { inputs: mics, outputs: speakers } = useAudioDevices()
    const [selectedMic, setSelectedMic] = useState('')
    const [selectedSpeaker, setSelectedSpeaker] = useState('')
    const [isTesting, setIsTesting] = useState(false)
    const [testLevel, setTestLevel] = useState(0)
    const engineRef = useRef<VoiceEffectsEngine | null>(null)
    const animRef = useRef<number>(0)

    const [isRecording, setIsRecording] = useState(false)
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
    const [isPlayingSnippet, setIsPlayingSnippet] = useState(false)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const [snippetDuration, setSnippetDuration] = useState(0)
    const [playbackProgress, setPlaybackProgress] = useState(0)
    const [snippetError, setSnippetError] = useState<string | null>(null)
    const recordingTimerRef = useRef<number>(0)
    const playbackTimerRef = useRef<number>(0)

    const [activePresetIds, setActivePresetIds] = useState<(string | null)[]>([null])
    const [presetImages, setPresetImages] = useState<Record<string, string>>({})
    const [presetImageErrors, setPresetImageErrors] = useState<Set<string>>(new Set())

    const [adminTab, setAdminTab] = useState<'songs' | 'guests' | 'requests' | 'awards'>('songs')
    const [guests, setGuests] = useState<AdminGuest[]>([])
    const [songRequests, setSongRequests] = useState<SongRequest[]>([])
    const requestChannelRef = useRef<RealtimeChannel | null>(null)
    const [editingGuestId, setEditingGuestId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editPicture, setEditPicture] = useState('')
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
    const guestChannelRef = useRef<RealtimeChannel | null>(null)

    // ── Voice Audition Booth ──
    // Independent of the pending-song testing flow: lets the user audition artist
    // presets or the exact effects they've set on any song's role, against their
    // live mic OR a recorded snippet. Snippets replay through the live effect
    // chain, so changing preset mid-playback works as live A/B.
    const [auditionOpen, setAuditionOpen] = useState(true)
    const [auditionSource, setAuditionSource] = useState<'preset' | 'song'>('preset')
    const [auditionPresetId, setAuditionPresetId] = useState<string | null>(null)
    const [auditionSongTrackId, setAuditionSongTrackId] = useState<string | null>(null)
    const [auditionSongRoleIdx, setAuditionSongRoleIdx] = useState<number>(0)
    const [auditionSongQuery, setAuditionSongQuery] = useState('')
    // Autotune target scale: -1 = chromatic (snap to nearest semitone),
    // 0..11 = C..B with mode 1 (major) or 0 (minor). Song roles load their
    // stored key on selection; the user can still override.
    const [auditionKey, setAuditionKey] = useState<number>(-1)
    const [auditionMode, setAuditionMode] = useState<number>(1)
    const [auditionLive, setAuditionLive] = useState(false)
    const [auditionLevel, setAuditionLevel] = useState(0)
    const [auditionRecording, setAuditionRecording] = useState(false)
    const [auditionBlob, setAuditionBlob] = useState<Blob | null>(null)
    const [auditionRecDuration, setAuditionRecDuration] = useState(0)
    const [auditionSnipDuration, setAuditionSnipDuration] = useState(0)
    const [auditionPlaying, setAuditionPlaying] = useState(false)
    const [auditionPlayProgress, setAuditionPlayProgress] = useState(0)
    const [auditionError, setAuditionError] = useState<string | null>(null)
    const auditionAnimRef = useRef<number>(0)
    const auditionRecTimerRef = useRef<number>(0)
    const auditionPlayTimerRef = useRef<number>(0)
    const auditionCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const auditionSpectrumRef = useRef<Uint8Array | null>(null)

    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!state.spotifyClientId || !state.spotifyClientSecret) return
        let cancelled = false
        const refresh = () => {
            window.electronAPI.spotifyAuth(state.spotifyClientId!, state.spotifyClientSecret!).then((auth: any) => {
                if (cancelled) return
                if (auth?.access_token) dispatch({ type: 'SET_TOKEN', payload: auth.access_token })
            }).catch(() => { })
        }
        if (!state.spotifyToken) refresh()
        // Client-credentials tokens expire in 1h; refresh every 50min so the
        // companion site always has a working token.
        const id = window.setInterval(refresh, 50 * 60 * 1000)
        return () => { cancelled = true; window.clearInterval(id) }
    }, [state.spotifyClientId, state.spotifyClientSecret, dispatch])

    // Share the Spotify token with the companion site (via the session row) so
    // guests can search Spotify for songs we don't have in the catalog yet.
    useEffect(() => {
        const sessionId = state.karaokeSessionId
        const token = state.spotifyToken
        if (!sessionId || !token) return
        const expires = new Date(Date.now() + 55 * 60 * 1000).toISOString()
        supabase.from('karaoke_sessions')
            .update({ spotify_token: token, spotify_token_expires_at: expires })
            .eq('id', sessionId)
            .then(({ error }) => { if (error) console.warn('Failed to publish Spotify token:', error.message) })
    }, [state.karaokeSessionId, state.spotifyToken])

    useEffect(() => {
        const token = state.spotifyToken
        if (!token) return
        const artistIds = BUILT_IN_PRESETS.map(p => p.artistId).filter(Boolean) as string[]
        if (artistIds.length === 0) return
        setPresetImageErrors(new Set())
        window.electronAPI.spotifyArtists(artistIds, token).then((data: any) => {
            if (data?.artists) {
                const images: Record<string, string> = {}
                for (const artist of data.artists) {
                    if (artist?.id && artist?.images?.length) {
                        images[artist.id] = artist.images[artist.images.length - 1].url
                    }
                }
                setPresetImages(images)
            }
        }).catch(() => { })
    }, [state.spotifyToken])

    useEffect(() => {
        loadCatalog()
        dispatch({ type: 'ENSURE_MIC_SLOTS', payload: 4 })
    }, [])

    // Seed default mic/speaker selection once devices first become available.
    useEffect(() => {
        if (!selectedMic && mics.length) {
            setSelectedMic(mics[0].deviceId)
        }
    }, [mics, selectedMic])
    useEffect(() => {
        if (!selectedSpeaker && speakers.length) {
            const defaultOut = speakers.find(d => d.deviceId === 'default') || speakers[0]
            setSelectedSpeaker(defaultOut.deviceId)
        }
    }, [speakers, selectedSpeaker])

    useEffect(() => {
        engineRef.current = new VoiceEffectsEngine()
        return () => { engineRef.current?.destroy(); engineRef.current = null }
    }, [])

    // ── Voice Audition Booth handlers ──

    /** Resolve the currently-selected preset or song-role to a full VoiceEffects object. */
    const getAuditionEffects = (): VoiceEffects | null => {
        if (auditionSource === 'preset') {
            const p = BUILT_IN_PRESETS.find(pr => pr.id === auditionPresetId)
            if (!p) return null
            return {
                key: auditionKey, mode: auditionMode, tempo: 120, micLevel: 1.0,
                ...p.effects,
            }
        }
        const song = catalog.find(s => s.trackId === auditionSongTrackId)
        if (!song || !song.voiceEffects) return null
        const arr = Array.isArray(song.voiceEffects) ? song.voiceEffects : [song.voiceEffects]
        const fx = arr[auditionSongRoleIdx]
        if (!fx) return null
        return {
            // User's autotune key overrides the song's stored key — lets you
            // audition the same effect settings in whatever key you're singing.
            key: auditionKey,
            mode: auditionMode,
            tempo: fx.tempo ?? 120,
            micLevel: fx.micLevel ?? 1.0,
            pitchCorrection: fx.pitchCorrection,
            compressor: fx.compressor,
            eq: fx.eq,
            chorus: fx.chorus,
            delay: fx.delay,
            reverb: fx.reverb,
            distortion: fx.distortion,
            noiseGate: fx.noiseGate,
            vocoder: fx.vocoder,
            doubler: fx.doubler,
        }
    }

    const applyAuditionEffects = () => {
        const fx = getAuditionEffects()
        if (fx && engineRef.current) engineRef.current.apply(fx)
    }

    /** One-line parameter summary of currently-loaded effects. */
    const auditionFingerprint = (): string => {
        const fx = getAuditionEffects()
        if (!fx) return 'No effects loaded'
        const parts: string[] = []
        if (fx.pitchCorrection?.enabled) {
            const keyLabel = auditionKey < 0 ? 'chromatic' : `${KEY_NAMES[auditionKey]} ${auditionMode === 1 ? 'maj' : 'min'}`
            parts.push(`autotune ${fx.pitchCorrection.strength} · ${keyLabel}`)
        }
        if (fx.reverb?.enabled) parts.push(`reverb ${fx.reverb.decay.toFixed(1)}s/${fx.reverb.mix}%`)
        if (fx.delay?.enabled) parts.push(`delay ${fx.delay.time}ms/${fx.delay.mix}%`)
        if (fx.chorus?.enabled) parts.push(`chorus ${fx.chorus.mix}%`)
        if (fx.vocoder?.enabled) parts.push(`vocoder ${fx.vocoder.voicing}/${fx.vocoder.mix}%`)
        if (fx.doubler?.enabled) parts.push(`doubler ${fx.doubler.voices}v/${fx.doubler.mix}%`)
        if (fx.distortion?.enabled) parts.push(`drive ${fx.distortion.drive}/${fx.distortion.mix}`)
        if (fx.eq?.enabled) parts.push(`eq ${fx.eq.lowGain >= 0 ? '+' : ''}${fx.eq.lowGain}/${fx.eq.midGain >= 0 ? '+' : ''}${fx.eq.midGain}/${fx.eq.highGain >= 0 ? '+' : ''}${fx.eq.highGain}`)
        return parts.length ? parts.join(' · ') : 'all effects disabled'
    }

    const selectAuditionPreset = (presetId: string) => {
        setAuditionSource('preset')
        setAuditionPresetId(presetId)
    }

    const selectAuditionSongRole = (trackId: string, roleIdx: number) => {
        setAuditionSource('song')
        setAuditionSongTrackId(trackId)
        setAuditionSongRoleIdx(roleIdx)
        // Pre-load the song's stored key/mode so the autotune targets the right scale
        const song = catalog.find(s => s.trackId === trackId)
        if (song?.voiceEffects) {
            const arr = Array.isArray(song.voiceEffects) ? song.voiceEffects : [song.voiceEffects]
            const fx = arr[roleIdx]
            if (fx) {
                if (typeof fx.key === 'number') setAuditionKey(fx.key)
                if (typeof fx.mode === 'number') setAuditionMode(fx.mode)
            }
        }
    }

    /** Auto-apply current effects to engine when source/selection/key changes while active. */
    useEffect(() => {
        if (auditionLive || auditionPlaying) applyAuditionEffects()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auditionSource, auditionPresetId, auditionSongTrackId, auditionSongRoleIdx, auditionKey, auditionMode, auditionLive, auditionPlaying])

    const startAuditionVisualization = () => {
        if (!engineRef.current) return
        const analyser = engineRef.current.analyser
        const buf = new Uint8Array(analyser.frequencyBinCount)
        auditionSpectrumRef.current = buf
        const tick = () => {
            if (!engineRef.current || !auditionSpectrumRef.current) return
            analyser.getByteFrequencyData(auditionSpectrumRef.current)
            let sum = 0
            for (let i = 0; i < auditionSpectrumRef.current.length; i++) {
                const v = auditionSpectrumRef.current[i]
                sum += v * v
            }
            const rms = Math.sqrt(sum / auditionSpectrumRef.current.length) / 255
            setAuditionLevel(rms)
            const canvas = auditionCanvasRef.current
            if (canvas) {
                const ctx2d = canvas.getContext('2d')
                if (ctx2d) {
                    const W = canvas.width
                    const H = canvas.height
                    ctx2d.fillStyle = '#0a0a14'
                    ctx2d.fillRect(0, 0, W, H)
                    ctx2d.strokeStyle = 'rgba(255,255,255,0.08)'
                    ctx2d.lineWidth = 1
                    for (let g = 1; g < 4; g++) {
                        const y = (g / 4) * H
                        ctx2d.beginPath()
                        ctx2d.moveTo(0, y)
                        ctx2d.lineTo(W, y)
                        ctx2d.stroke()
                    }
                    const N = auditionSpectrumRef.current.length
                    const sr = engineRef.current.getAudioContext().sampleRate
                    const nyquist = sr / 2
                    const fMin = 80
                    const logMin = Math.log(fMin)
                    const logMax = Math.log(nyquist)
                    ctx2d.fillStyle = '#4ade80'
                    for (let i = 0; i < N; i++) {
                        const f = (i / N) * nyquist
                        if (f < fMin) continue
                        const x = ((Math.log(f) - logMin) / (logMax - logMin)) * W
                        const v = auditionSpectrumRef.current[i] / 255
                        const h = v * H
                        ctx2d.fillRect(x, H - h, Math.max(1, W / N), h)
                    }
                    ctx2d.fillStyle = 'rgba(255,255,255,0.5)'
                    ctx2d.font = '10px monospace'
                    const labelFreqs = [100, 250, 500, 1000, 2500, 5000, 10000]
                    for (const f of labelFreqs) {
                        if (f < fMin || f > nyquist) continue
                        const x = ((Math.log(f) - logMin) / (logMax - logMin)) * W
                        const lbl = f >= 1000 ? (f / 1000) + 'k' : String(f)
                        ctx2d.fillText(lbl, x + 2, H - 2)
                    }
                }
            }
            auditionAnimRef.current = requestAnimationFrame(tick)
        }
        auditionAnimRef.current = requestAnimationFrame(tick)
    }

    const toggleAuditionLive = async () => {
        if (!engineRef.current) return
        if (auditionLive) {
            if (auditionRecording) {
                await engineRef.current.stopRecording()
                setAuditionRecording(false)
                if (auditionRecTimerRef.current) clearInterval(auditionRecTimerRef.current)
            }
            engineRef.current.stopLivePreview()
            setAuditionLive(false)
            setAuditionLevel(0)
            if (auditionAnimRef.current) cancelAnimationFrame(auditionAnimRef.current)
            auditionAnimRef.current = 0
            return
        }
        if (!selectedMic) {
            setAuditionError('Select a microphone first.')
            return
        }
        // Stop the pending-song test preview if it's running so we don't double-stream
        if (isTesting) {
            if (isRecording) {
                await engineRef.current.stopRecording()
                setIsRecording(false)
                if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
            }
            engineRef.current.stopLivePreview()
            setIsTesting(false)
            setTestLevel(0)
            if (animRef.current) clearInterval(animRef.current)
        }
        setAuditionError(null)
        const success = await engineRef.current.startLivePreview(selectedMic, selectedSpeaker)
        if (!success) {
            setAuditionError('Failed to start mic preview. Check mic permissions.')
            return
        }
        setAuditionLive(true)
        applyAuditionEffects()
        startAuditionVisualization()
    }

    const toggleAuditionRec = async () => {
        if (!engineRef.current) return
        if (auditionRecording) {
            const blob = await engineRef.current.stopRecording()
            setAuditionRecording(false)
            if (auditionRecTimerRef.current) clearInterval(auditionRecTimerRef.current)
            if (blob) {
                setAuditionBlob(blob)
                setAuditionSnipDuration(auditionRecDuration)
            }
            return
        }
        if (!auditionLive) return
        if (auditionPlaying) stopAuditionSnip()
        const started = engineRef.current.startRecording()
        if (started) {
            setAuditionRecording(true)
            setAuditionBlob(null)
            setAuditionError(null)
            setAuditionRecDuration(0)
            setAuditionSnipDuration(0)
            const startTime = Date.now()
            auditionRecTimerRef.current = window.setInterval(() => {
                setAuditionRecDuration(Date.now() - startTime)
            }, 100)
        }
    }

    const playAuditionSnip = async () => {
        if (!engineRef.current || !auditionBlob) return
        setAuditionError(null)
        applyAuditionEffects()
        setAuditionPlaying(true)
        setAuditionPlayProgress(0)
        const startTime = Date.now()
        auditionPlayTimerRef.current = window.setInterval(() => {
            const elapsed = Date.now() - startTime
            setAuditionPlayProgress(Math.min(elapsed / auditionSnipDuration, 1))
        }, 50)
        try {
            await engineRef.current.playRecording(auditionBlob, selectedSpeaker, () => {
                setAuditionPlaying(false)
                setAuditionPlayProgress(0)
                if (auditionPlayTimerRef.current) clearInterval(auditionPlayTimerRef.current)
            })
        } catch (err) {
            console.error('Audition playback failed:', err)
            setAuditionPlaying(false)
            setAuditionPlayProgress(0)
            if (auditionPlayTimerRef.current) clearInterval(auditionPlayTimerRef.current)
            setAuditionError('Playback failed. Try recording again.')
        }
    }

    const stopAuditionSnip = () => {
        if (!engineRef.current) return
        engineRef.current.stopPlayback()
        setAuditionPlaying(false)
        setAuditionPlayProgress(0)
        if (auditionPlayTimerRef.current) clearInterval(auditionPlayTimerRef.current)
    }

    const clearAuditionSnip = () => {
        if (auditionPlaying) stopAuditionSnip()
        setAuditionBlob(null)
        setAuditionRecDuration(0)
        setAuditionSnipDuration(0)
        setAuditionPlayProgress(0)
        setAuditionError(null)
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (auditionAnimRef.current) cancelAnimationFrame(auditionAnimRef.current)
            if (auditionRecTimerRef.current) clearInterval(auditionRecTimerRef.current)
            if (auditionPlayTimerRef.current) clearInterval(auditionPlayTimerRef.current)
        }
    }, [])

    /** Swap the live stream to a new mic/speaker without requiring the user to manually stop+start. */
    useEffect(() => {
        if (!auditionLive || !engineRef.current || !selectedMic) return
        const eng = engineRef.current
        let cancelled = false
        ;(async () => {
            // Finalize any recording first so we don't leak a MediaRecorder on the old stream
            if (auditionRecording) {
                await eng.stopRecording()
                if (cancelled) return
                setAuditionRecording(false)
                if (auditionRecTimerRef.current) clearInterval(auditionRecTimerRef.current)
            }
            eng.stopLivePreview()
            if (auditionAnimRef.current) cancelAnimationFrame(auditionAnimRef.current)
            auditionAnimRef.current = 0
            setAuditionLevel(0)
            const ok = await eng.startLivePreview(selectedMic, selectedSpeaker)
            if (cancelled) return
            if (ok) {
                applyAuditionEffects()
                startAuditionVisualization()
            } else {
                setAuditionError('Failed to switch device.')
                setAuditionLive(false)
            }
        })()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMic, selectedSpeaker])

    // Guest realtime subscription
    useEffect(() => {
        const sessionId = state.karaokeSessionId
        if (!sessionId) { setGuests([]); return }

        let cancelled = false
        window.electronAPI.listGuests().then(list => {
            if (!cancelled) setGuests(list.map(g => ({ id: g.id, name: g.name, profilePicture: g.profilePicture })))
        })

        const channel = supabase
            .channel(`admin-guests-${sessionId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'karaoke_guests', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    const r = payload.new as any
                    setGuests(prev => {
                        if (prev.some(g => g.id === r.id)) return prev
                        return [...prev, { id: r.id, name: r.name, profilePicture: r.profile_picture }]
                    })
                })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'karaoke_guests', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    const r = payload.new as any
                    setGuests(prev => prev.map(g => g.id === r.id ? { ...g, name: r.name, profilePicture: r.profile_picture } : g))
                })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'karaoke_guests', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    const id = (payload.old as any).id
                    setGuests(prev => prev.filter(g => g.id !== id))
                })
            .subscribe()

        guestChannelRef.current = channel

        return () => {
            cancelled = true
            supabase.removeChannel(channel)
            guestChannelRef.current = null
        }
    }, [state.karaokeSessionId])

    // Song-request realtime subscription
    useEffect(() => {
        const sessionId = state.karaokeSessionId
        if (!sessionId) { setSongRequests([]); return }

        let cancelled = false
        const mapRow = (r: any): SongRequest => ({
            id: r.id,
            requestedByName: r.requested_by_name,
            requestedByProfilePicture: r.requested_by_profile_picture,
            trackId: r.track_id,
            trackName: r.track_name,
            trackArtist: r.track_artist,
            trackArtUrl: r.track_art_url,
            trackAlbum: r.track_album,
            trackDurationMs: r.track_duration_ms,
            spotifyData: r.spotify_data,
            status: r.status,
            createdAt: r.created_at,
        })

        supabase.from('karaoke_song_requests')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                if (!cancelled) setSongRequests((data || []).map(mapRow))
            })

        const channel = supabase
            .channel(`admin-requests-${sessionId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'karaoke_song_requests', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    const row = mapRow(payload.new as any)
                    setSongRequests(prev => prev.some(r => r.id === row.id) ? prev : [row, ...prev])
                })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'karaoke_song_requests', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    const row = mapRow(payload.new as any)
                    setSongRequests(prev => prev.map(r => r.id === row.id ? row : r))
                })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'karaoke_song_requests', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    const id = (payload.old as any).id
                    setSongRequests(prev => prev.filter(r => r.id !== id))
                })
            .subscribe()

        requestChannelRef.current = channel

        return () => {
            cancelled = true
            supabase.removeChannel(channel)
            requestChannelRef.current = null
        }
    }, [state.karaokeSessionId])

    const dismissSongRequest = async (id: string) => {
        const { error } = await supabase
            .from('karaoke_song_requests')
            .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
            .eq('id', id)
        if (error) console.warn('Dismiss request failed:', error.message)
    }

    // When a requested song lands in the catalog, mark the request resolved
    // so it doesn't keep showing up as pending.
    useEffect(() => {
        if (!state.karaokeSessionId) return
        const catalogIds = new Set(catalog.map(c => c.trackId))
        const newlyAdded = songRequests.filter(r => r.status === 'pending' && catalogIds.has(r.trackId))
        if (newlyAdded.length === 0) return
        const now = new Date().toISOString()
        supabase.from('karaoke_song_requests')
            .update({ status: 'added', resolved_at: now })
            .in('id', newlyAdded.map(r => r.id))
            .then(({ error }) => { if (error) console.warn('Auto-resolve request failed:', error.message) })
    }, [catalog, songRequests, state.karaokeSessionId])

    const openSongRequest = (req: SongRequest) => {
        const track = req.spotifyData && req.spotifyData.id ? req.spotifyData : {
            id: req.trackId,
            name: req.trackName,
            artists: req.trackArtist.split(',').map(n => ({ name: n.trim() })),
            album: {
                images: req.trackArtUrl ? [{ url: req.trackArtUrl }] : [],
                name: req.trackAlbum || ''
            },
            duration_ms: req.trackDurationMs || 0
        }
        setAdminTab('songs')
        setQuery(req.trackName + ' ' + req.trackArtist)
        setResults([track])
        selectTrack(track)
    }

    const pendingRequestCount = songRequests.filter(r => r.status === 'pending').length

    const startEditGuest = (guest: AdminGuest) => {
        setEditingGuestId(guest.id)
        setEditName(guest.name)
        setEditPicture(guest.profilePicture || '')
    }

    const saveEditGuest = async () => {
        if (!editingGuestId) return
        const updatedFields = { name: editName, profilePicture: editPicture || null }
        // Optimistic local update
        setGuests(prev => prev.map(g => g.id === editingGuestId ? { ...g, ...updatedFields } : g))
        setEditingGuestId(null)
        await window.electronAPI.updateGuest(editingGuestId, updatedFields)
    }

    const handleRemoveGuest = async (id: string) => {
        // Optimistic local removal
        setGuests(prev => prev.filter(g => g.id !== id))
        setConfirmRemoveId(null)
        await window.electronAPI.removeGuest(id)
    }

    const loadCatalog = async () => {
        if (window.electronAPI) {
            const cat = await window.electronAPI.listCatalog()
            setCatalog(cat)
        }
    }

    const handleEditCatalogSong = (song: CatalogSong) => {
        const mockTrack = {
            id: song.trackId,
            name: song.name,
            artists: [{ name: song.artist }],
            album: { images: [{ url: song.artUrl }], name: song.albumName },
            duration_ms: song.durationMs
        }
        const rawConfigs = Array.isArray(song.voiceEffects) ? song.voiceEffects : [song.voiceEffects || JSON.parse(JSON.stringify(DEFAULT_VOICE_EFFECTS))]
        const editConfigs = normalizeMicLevel(rawConfigs) as VoiceEffects[]
        // Merge stored Spotify data into configs that still have default key
        if (song.spotifyData && typeof song.spotifyData.key === 'number' && song.spotifyData.key !== -1) {
            for (const cfg of editConfigs) {
                if (cfg.key === -1) {
                    cfg.key = song.spotifyData.key
                    cfg.mode = song.spotifyData.mode ?? cfg.mode
                    cfg.tempo = song.spotifyData.tempo ?? cfg.tempo
                }
            }
        }
        setLyricsError(null)
        setPending({
            track: mockTrack,
            configs: editConfigs,
            roles: song.roles || [],
            lyrics: song.lyrics || [],
            activeRoleTab: 0,
            spotifyData: song.spotifyData,
            genres: Array.isArray(song.genres) ? song.genres : []
        })
        setActivePresetIds(new Array(Math.max(1, editConfigs.length)).fill(null))
        setExistingInstrumental(true)
        setExistingVocals(!!song.vocalsPath)
        setYoutubeUrl(song.youtubeUrl || '')
        setPendingAudioFile(null)
        setPendingVocalsFile(null)
    }

    const search = useCallback(async (q: string) => {
        if (!q.trim()) { setResults([]); return }
        setLoading(true)
        try {
            let token = state.spotifyToken
            if (!token && state.spotifyClientId && state.spotifyClientSecret) {
                const auth = await window.electronAPI.spotifyAuth(state.spotifyClientId, state.spotifyClientSecret)
                if (auth?.access_token) {
                    token = auth.access_token
                    dispatch({ type: 'SET_TOKEN', payload: token! })
                }
            }
            if (!token) { setLoading(false); return }
            const data = await window.electronAPI.spotifySearch(q, token)
            setResults(data?.tracks?.items || [])
        } catch (err) { console.error('Search error:', err) }
        setLoading(false)
    }, [state.spotifyToken, state.spotifyClientId, state.spotifyClientSecret, dispatch])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!query.trim()) { setResults([]); return }
        debounceRef.current = setTimeout(() => search(query), 350)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [query, search])

    const selectTrack = async (track: any) => {
        const defaultConfig: VoiceEffects = JSON.parse(JSON.stringify(DEFAULT_VOICE_EFFECTS))
        let spotifyData: { key?: number; mode?: number; tempo?: number; releaseDate?: string; instrumentalness?: number; popularity?: number } = {}

        const token = state.spotifyToken
        let fetchedGenres: string[] = []
        if (token) {
            const artistIds = (track.artists || []).map((a: any) => a?.id).filter(Boolean)
            const [audioFeatures, trackData, artistsData] = await Promise.all([
                window.electronAPI.spotifyAudioFeatures(track.id, token).catch((err: any) => { console.error('Audio features error:', err); return null }),
                window.electronAPI.spotifyTrack(track.id, token).catch((err: any) => { console.error('Track data error:', err); return null }),
                artistIds.length > 0
                    ? window.electronAPI.spotifyArtists(artistIds, token).catch((err: any) => { console.error('Artists error:', err); return null })
                    : Promise.resolve(null)
            ])
            if (audioFeatures && typeof audioFeatures.key === 'number') {
                defaultConfig.key = audioFeatures.key
                defaultConfig.mode = audioFeatures.mode
                defaultConfig.tempo = Math.round(audioFeatures.tempo)
                spotifyData.key = audioFeatures.key
                spotifyData.mode = audioFeatures.mode
                spotifyData.tempo = Math.round(audioFeatures.tempo)
            }
            if (audioFeatures && typeof audioFeatures.instrumentalness === 'number') {
                spotifyData.instrumentalness = audioFeatures.instrumentalness
            }
            if (trackData?.album?.release_date) { spotifyData.releaseDate = trackData.album.release_date }
            if (typeof trackData?.popularity === 'number') { spotifyData.popularity = trackData.popularity }
            if (artistsData?.artists) {
                const allTags: string[] = []
                for (const a of artistsData.artists) {
                    if (a?.genres) allTags.push(...a.genres)
                }
                fetchedGenres = bucketSpotifyGenres(allTags)
            }
        }

        if (isPlayingSnippet) stopSnippetPlayback()
        if (isTesting) toggleTesting()
        setRecordedBlob(null)
        setRecordingDuration(0)
        setSnippetDuration(0)

        let configs = [defaultConfig]
        let roles: string[] = []
        let lyrics: any[] = []
        let genres: string[] = fetchedGenres
        const activeRoleTab = 0

        const existing = catalog.find(c => c.trackId === track.id)
        if (existing) {
            if (existing.roles) roles = existing.roles
            if (existing.lyrics) lyrics = existing.lyrics
            if (existing.voiceEffects) {
                const raw = Array.isArray(existing.voiceEffects) ? existing.voiceEffects : [existing.voiceEffects]
                configs = (normalizeMicLevel(raw) as VoiceEffects[]).slice()
            }
            if (Array.isArray(existing.genres) && existing.genres.length > 0) genres = existing.genres
            while (configs.length < Math.max(1, roles.length)) configs.push(JSON.parse(JSON.stringify(configs[0])))
        }

        // Merge Spotify audio features into configs that still have default key
        if (typeof spotifyData.key === 'number' && spotifyData.key !== -1) {
            for (const cfg of configs) {
                if (cfg.key === -1) {
                    cfg.key = spotifyData.key
                    cfg.mode = spotifyData.mode ?? cfg.mode
                    cfg.tempo = spotifyData.tempo ?? cfg.tempo
                }
            }
        }

        setLyricsError(null)
        setPending({ track, configs, roles, lyrics, activeRoleTab, spotifyData, genres })
        setActivePresetIds(new Array(Math.max(1, configs.length)).fill(null))
        setNewRoleName('')
        setExistingInstrumental(!!existing)
        setExistingVocals(!!existing?.vocalsPath)
        setYoutubeUrl(existing?.youtubeUrl || '')
        setPendingAudioFile(null)
        setPendingVocalsFile(null)
    }

    const toggleTesting = async () => {
        if (!engineRef.current) return
        if (isTesting) {
            if (isRecording) {
                await engineRef.current.stopRecording()
                setIsRecording(false)
                if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
            }
            engineRef.current.stopLivePreview()
            setIsTesting(false)
            setTestLevel(0)
            if (animRef.current) clearInterval(animRef.current)
        } else {
            if (!selectedMic) return
            const success = await engineRef.current.startLivePreview(selectedMic, selectedSpeaker)
            if (success) {
                setIsTesting(true)
                if (pending) engineRef.current.apply(pending.configs[pending.activeRoleTab])
                const dataArray = new Uint8Array(engineRef.current.analyser.frequencyBinCount)
                animRef.current = window.setInterval(() => {
                    if (!engineRef.current) return
                    engineRef.current.analyser.getByteFrequencyData(dataArray)
                    let sum = 0
                    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i]
                    const rms = Math.sqrt(sum / dataArray.length) / 255
                    setTestLevel(rms)
                }, 50)
            }
        }
    }

    useEffect(() => {
        if ((isTesting || isPlayingSnippet) && pending && engineRef.current) {
            engineRef.current.apply(pending.configs[pending.activeRoleTab])
        }
    }, [pending?.configs, pending?.activeRoleTab, isTesting, isPlayingSnippet])

    const toggleRecording = async () => {
        if (!engineRef.current) return
        if (isRecording) {
            const blob = await engineRef.current.stopRecording()
            setIsRecording(false)
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
            if (blob) {
                setRecordedBlob(blob)
                setSnippetDuration(recordingDuration)
            }
        } else {
            if (!isTesting) return
            if (isPlayingSnippet) stopSnippetPlayback()
            const started = engineRef.current.startRecording()
            if (started) {
                setIsRecording(true)
                setRecordedBlob(null)
                setSnippetError(null)
                setRecordingDuration(0)
                setSnippetDuration(0)
                const startTime = Date.now()
                recordingTimerRef.current = window.setInterval(() => {
                    setRecordingDuration(Date.now() - startTime)
                }, 100)
            }
        }
    }

    const playSnippet = async () => {
        if (!engineRef.current || !recordedBlob) return
        setSnippetError(null)
        if (pending) engineRef.current.apply(pending.configs[pending.activeRoleTab])
        setIsPlayingSnippet(true)
        setPlaybackProgress(0)
        const startTime = Date.now()
        playbackTimerRef.current = window.setInterval(() => {
            const elapsed = Date.now() - startTime
            setPlaybackProgress(Math.min(elapsed / snippetDuration, 1))
        }, 50)
        try {
            await engineRef.current.playRecording(recordedBlob, selectedSpeaker, () => {
                setIsPlayingSnippet(false)
                setPlaybackProgress(0)
                if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)
            })
        } catch (err) {
            console.error('Snippet playback failed:', err)
            setIsPlayingSnippet(false)
            setPlaybackProgress(0)
            if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)
            setSnippetError('Playback failed. Try recording again.')
        }
    }

    const stopSnippetPlayback = () => {
        if (!engineRef.current) return
        engineRef.current.stopPlayback()
        setIsPlayingSnippet(false)
        setPlaybackProgress(0)
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)
    }

    const discardSnippet = () => {
        if (isPlayingSnippet) stopSnippetPlayback()
        setRecordedBlob(null)
        setRecordingDuration(0)
        setSnippetDuration(0)
        setPlaybackProgress(0)
        setSnippetError(null)
    }

    const updateActiveConfig = (updater: (draft: VoiceEffects) => void) => {
        setPending(prev => {
            if (!prev) return prev
            const next = { ...prev, configs: JSON.parse(JSON.stringify(prev.configs)) }
            updater(next.configs[next.activeRoleTab])
            return next
        })
        setActivePresetIds(prev => {
            const next = [...prev]
            const idx = pending?.activeRoleTab ?? 0
            while (next.length <= idx) next.push(null)
            next[idx] = null
            return next
        })
    }

    const applyPreset = (preset: VocalPreset) => {
        setPending(prev => {
            if (!prev) return prev
            const next = { ...prev, configs: JSON.parse(JSON.stringify(prev.configs)) }
            const draft = next.configs[next.activeRoleTab]
            // Preserve musical context (key/mode/tempo from Spotify data)
            const savedKey = draft.key
            const savedMode = draft.mode
            const savedTempo = draft.tempo
            draft.pitchCorrection = { ...preset.effects.pitchCorrection }
            draft.compressor = { ...preset.effects.compressor }
            draft.eq = { ...preset.effects.eq }
            draft.chorus = { ...preset.effects.chorus }
            draft.delay = { ...preset.effects.delay }
            draft.reverb = { ...preset.effects.reverb }
            draft.distortion = { ...preset.effects.distortion }
            draft.noiseGate = { ...preset.effects.noiseGate }
            // Vocoder is optional on presets (added after other effects);
            // skip the copy when absent so existing presets don't force-disable
            // a vocoder block the user already configured manually.
            if (preset.effects.vocoder) draft.vocoder = { ...preset.effects.vocoder }
            draft.micLevel = 1.0
            draft.key = savedKey
            draft.mode = savedMode
            draft.tempo = savedTempo
            return next
        })
        setActivePresetIds(prev => {
            const idx = pending?.activeRoleTab ?? 0
            const next = [...prev]
            while (next.length <= idx) next.push(null)
            next[idx] = preset.id
            return next
        })
    }

    const handleFetchLyrics = async () => {
        if (!pending) return
        const track = pending.track
        const trackId = track.id
        const trackName = track.name ?? track.title ?? 'unknown'
        const artistName = track.artists?.[0]?.name ?? track.artist ?? ''
        const albumName = track.album?.name ?? ''
        const durationMs = track.duration_ms ?? track.durationMs ?? 0
        setFetchingLyrics(true)
        setLyricsError(null)
        try {
            const data = await window.electronAPI.fetchLyrics({ trackId, trackName, artistName, albumName, durationMs })
            if (data && data.lines && data.lines.length > 0) {
                setPending(p => p ? { ...p, lyrics: data.lines.map((l: any) => ({
                    startTimeMs: typeof l.startTimeMs === 'string' ? parseInt(l.startTimeMs, 10) : l.startTimeMs,
                    endTimeMs: l.endTimeMs,
                    words: l.words,
                    syllables: Array.isArray(l.syllables) && l.syllables.length > 0 ? l.syllables : undefined,
                    roleIndex: 0,
                })) } : p)
                setLyricsError(null)
            } else {
                const errMsg = data?.message || (data?.error ? String(data.error) : null)
                setLyricsError(errMsg)
            }
        } catch (err) {
            setLyricsError(String(err))
        }
        setFetchingLyrics(false)
    }

    const handleAddRole = () => {
        if (!pending || !newRoleName.trim()) return
        setPending(p => {
            if (!p) return p
            const newRoles = [...p.roles, newRoleName.trim()]
            const newConfigs = [...p.configs]
            if (newRoles.length > newConfigs.length) {
                newConfigs.push(JSON.parse(JSON.stringify(p.configs[p.activeRoleTab])))
            }
            return { ...p, roles: newRoles, configs: newConfigs }
        })
        setActivePresetIds(prev => [...prev, null])
        setNewRoleName('')
    }

    const handleRemoveRole = (index: number) => {
        if (!pending) return
        setActivePresetIds(prev => {
            const next = prev.filter((_, i) => i !== index)
            return next.length === 0 ? [null] : next
        })
        setPending(p => {
            if (!p) return p
            const newRoles = p.roles.filter((_, i) => i !== index)
            const newConfigs = p.configs.filter((_, i) => i !== index)
            if (newConfigs.length === 0) newConfigs.push(JSON.parse(JSON.stringify(DEFAULT_VOICE_EFFECTS)))
            const newLyrics = p.lyrics.map(l => l.roleIndex === index ? { ...l, roleIndex: 0 } : l)
                .map(l => l.roleIndex > index ? { ...l, roleIndex: l.roleIndex - 1 } : l)
            return {
                ...p,
                roles: newRoles,
                configs: newConfigs,
                lyrics: newLyrics,
                activeRoleTab: Math.max(0, p.activeRoleTab >= index ? p.activeRoleTab - 1 : p.activeRoleTab)
            }
        })
    }

    const cycleLyricRole = (lineIndex: number) => {
        if (!pending || pending.roles.length === 0) return
        setPending(p => {
            if (!p) return p
            const newLyrics = [...p.lyrics]
            const currentRole = newLyrics[lineIndex].roleIndex ?? 0
            if (currentRole === -1) {
                newLyrics[lineIndex] = { ...newLyrics[lineIndex], roleIndex: 0 }
            } else if (currentRole === p.roles.length - 1) {
                newLyrics[lineIndex] = { ...newLyrics[lineIndex], roleIndex: -1 }
            } else {
                newLyrics[lineIndex] = { ...newLyrics[lineIndex], roleIndex: currentRole + 1 }
            }
            return { ...p, lyrics: newLyrics }
        })
    }

    const handleSplitLyric = (lineIndex: number) => {
        if (!pending) return
        setPending(p => {
            if (!p) return p
            const l = p.lyrics[lineIndex]
            if (!l) return p
            const parts = l.words.split(/(\([^)]+\))/).map((s: string) => s.trim()).filter(Boolean)
            if (parts.length <= 1) return p
            const newLyrics = [...p.lyrics]
            const newLines = parts.map((part: string, idx: number) => ({
                ...l,
                words: part,
                roleIndex: idx === 0 ? (l.roleIndex || 0) : ((l.roleIndex || 0) + idx) % Math.max(1, p.roles.length)
            }))
            newLyrics.splice(lineIndex, 1, ...newLines)
            return { ...p, lyrics: newLyrics }
        })
    }

    const pickAudioFile = (type: 'instrumental' | 'vocals') => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'audio/*'
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            const filePath = (file as any).path
            if (!filePath) return
            if (type === 'instrumental') {
                setPendingAudioFile({ name: file.name, path: filePath })
            } else {
                setPendingVocalsFile({ name: file.name, path: filePath })
            }
        }
        input.click()
    }

    const handleSave = async () => {
        if (!pending) return
        if (isPlayingSnippet) stopSnippetPlayback()
        if (isTesting) toggleTesting()
        setRecordedBlob(null)
        setRecordingDuration(0)
        setSnippetDuration(0)

        const needsAudio = !existingInstrumental && !pendingAudioFile
        if (needsAudio) return

        setUploading(true)
        const track = pending.track

        if (pendingAudioFile) {
            const importRes = await window.electronAPI.importAudio(pendingAudioFile.path, track.id, 'instrumental')
            if (importRes.error) { console.error('Import error:', importRes.error); setUploading(false); return }
        }

        if (pendingVocalsFile) {
            const importRes = await window.electronAPI.importAudio(pendingVocalsFile.path, track.id, 'vocals')
            if (importRes.error) { console.error('Vocals import error:', importRes.error) }
        }

        await window.electronAPI.saveSongMeta({
            trackId: track.id,
            name: track.name,
            artist: track.artists.map((a: any) => a.name).join(', '),
            artUrl: track.album?.images?.[0]?.url || '',
            albumName: track.album?.name || '',
            durationMs: track.duration_ms || 0,
            roles: pending.roles.length > 0 ? pending.roles : undefined,
            lyrics: pending.lyrics.length > 0 ? pending.lyrics : undefined,
            voiceEffects: pending.roles.length > 0 ? pending.configs : pending.configs[0],
            youtubeUrl: youtubeUrl.trim() || undefined,
            genres: pending.genres && pending.genres.length > 0 ? pending.genres : undefined,
            spotifyData: Object.keys(pending.spotifyData || {}).length > 0 ? pending.spotifyData : undefined
        })

        setUploading(false)
        setPending(null)
        setPendingAudioFile(null)
        setPendingVocalsFile(null)
        setExistingInstrumental(false)
        setExistingVocals(false)
        setYoutubeUrl('')
        setQuery('')
        setResults([])
        await loadCatalog()
    }

    const isInCatalog = (id: string) => catalog.some(s => s.trackId === id)

    // ── Inner helper components ─────────────────────────────────────────────
    const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={onClick}>
            <div style={{
                width: 36, height: 20, borderRadius: 10,
                background: on ? theme.mintGreen : theme.creamDark,
                border: theme.borderThin,
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
            }}>
                <div style={{
                    position: 'absolute',
                    top: 2,
                    left: on ? 18 : 2,
                    width: 12,
                    height: 12,
                    background: on ? theme.black : theme.muted,
                    borderRadius: '50%',
                    transition: 'left 0.15s',
                }} />
            </div>
            <span style={{
                fontFamily: theme.fontDisplay,
                fontWeight: 700,
                fontSize: 13,
                color: on ? theme.black : theme.muted,
            }}>
                {label}
            </span>
        </div>
    )

    const Slider = ({ label, val, min, max, unit, onChange }: { label: string; val: number; min: number; max: number; unit: string; onChange: (v: number) => void }) => (
        <div style={{ marginBottom: 12 }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                marginBottom: 4,
                color: theme.muted,
                fontFamily: theme.fontDisplay,
                fontWeight: 600,
            }}>
                <span>{label}</span>
                <span style={{ color: theme.black }}>{val}{unit}</span>
            </div>
            <input
                type="range"
                value={val}
                min={min}
                max={max}
                step={max - min > 10 ? 1 : 0.1}
                onChange={e => onChange(parseFloat(e.target.value))}
                style={{ width: '100%', height: 4, accentColor: theme.accentA }}
            />
        </div>
    )

    // Shared style helpers
    const sectionCard: React.CSSProperties = { ...theme.card, padding: '24px 28px' }
    const innerPanel: React.CSSProperties = {
        background: theme.creamDark,
        border: theme.borderThin,
        borderRadius: theme.radius,
        padding: 16,
    }
    const fxModule = (enabled: boolean): React.CSSProperties => ({
        background: theme.creamDark,
        border: theme.borderThin,
        borderRadius: theme.radius,
        padding: 16,
        opacity: enabled ? 1 : 0.5,
        boxShadow: enabled ? theme.shadowColor(theme.softViolet) : 'none',
        transition: 'opacity 0.2s, box-shadow 0.2s',
    })

    return (
        <div className="anim-enter" style={{ ...theme.page }}>
            {/* Page header */}
            <div style={{ marginBottom: 36, paddingTop: 16 }}>
                <h1 style={{
                    fontFamily: theme.fontDisplay,
                    fontSize: 42,
                    fontWeight: 900,
                    letterSpacing: '-1.5px',
                    marginBottom: 4,
                    color: theme.black,
                }}>
                    Admin
                </h1>
                <p style={{ color: theme.muted, fontSize: 14, fontFamily: theme.fontBody }}>
                    {adminTab === 'songs' && 'Add songs, sculpt effects rack, and manage the catalog'}
                    {adminTab === 'guests' && 'View and manage guests in the current session'}
                    {adminTab === 'requests' && 'Songs guests are asking you to add to the library'}
                    {adminTab === 'awards' && 'Review live vote tallies and reveal winners on the stage'}
                </p>
            </div>

            {/* Default Microphones */}
            <div style={{
                ...theme.card, border: theme.border, padding: '16px 20px', marginBottom: 24,
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            }}>
                <div style={{
                    fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 12,
                    color: theme.muted, letterSpacing: '1px', textTransform: 'uppercase',
                    flexShrink: 0,
                }}>
                    Default Mics
                </div>
                {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 160 }}>
                        <div style={{
                            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                            background: NEON_COLORS[i].color,
                            boxShadow: `0 0 6px ${NEON_COLORS[i].colorGlow}`,
                        }} />
                        <select
                            value={state.micSlots[i]?.micDeviceId || ''}
                            onChange={(e) => dispatch({
                                type: 'SET_MIC_SLOT',
                                payload: { index: i, config: { micDeviceId: e.target.value } }
                            })}
                            style={{
                                ...theme.select, flex: 1, minWidth: 0,
                                padding: '6px 8px', fontSize: 11,
                            }}
                        >
                            <option value="">Singer {i + 1} — None</option>
                            {mics.map(m => (
                                <option key={m.deviceId} value={m.deviceId}>
                                    {m.label || 'Mic ' + m.deviceId.slice(0, 6)}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>

            {/* Tab pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {(['songs', 'guests', 'requests', 'awards'] as const).map(tab => {
                    const label = tab === 'songs'
                        ? 'Songs'
                        : tab === 'guests'
                            ? `Guests${guests.length ? ` (${guests.length})` : ''}`
                            : tab === 'requests'
                                ? `Requests${pendingRequestCount ? ` (${pendingRequestCount})` : ''}`
                                : `Awards${state.awards.length ? ` (${state.awards.length})` : ''}`
                    return (
                        <button
                            key={tab}
                            onClick={() => setAdminTab(tab)}
                            style={{
                                padding: '8px 20px',
                                borderRadius: theme.radius,
                                fontSize: 14,
                                fontWeight: 700,
                                fontFamily: theme.fontDisplay,
                                cursor: 'pointer',
                                border: theme.border,
                                background: adminTab === tab ? theme.softViolet : theme.cream,
                                color: theme.black,
                                boxShadow: adminTab === tab ? theme.shadow : 'none',
                                transition: 'all 0.15s',
                            }}
                        >
                            {label}
                        </button>
                    )
                })}
            </div>

            {adminTab === 'songs' && <><div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>

                {/* ── Left Column: Search & Catalog ── */}
                {!pending && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, minWidth: 320 }}>

                        {/* Add Song / Search */}
                        <section style={sectionCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: theme.radiusSmall,
                                    background: `${theme.mintGreen}20`,
                                    border: `2px solid ${theme.mintGreen}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                                }}>🎵</div>
                                <div>
                                    <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 14, color: theme.black }}>Add Song</div>
                                    <div style={{ fontSize: 11, color: theme.faint, fontFamily: theme.fontBody }}>Search Spotify</div>
                                </div>
                            </div>

                            <input
                                placeholder="Search..."
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setLyricsError(null); setPending(null) }}
                                style={{ ...theme.input, width: '100%', padding: '10px 14px', fontSize: 14, marginBottom: results.length ? 16 : 0 }}
                            />

                            {loading && (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                                    <div className="spinner" style={{ border: `3px solid ${theme.spinnerBorder}`, borderTopColor: theme.spinnerBorderTop }} />
                                </div>
                            )}

                            {!pending && results.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
                                    {results.map((track: any) => {
                                        const art = track.album?.images?.[track.album.images.length - 1]?.url
                                        const inCat = isInCatalog(track.id)
                                        return (
                                            <div
                                                key={track.id}
                                                onClick={() => !inCat && selectTrack(track)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                    padding: '10px 14px',
                                                    borderRadius: theme.radius,
                                                    background: theme.creamDark,
                                                    border: theme.borderThin,
                                                    cursor: inCat ? 'default' : 'pointer',
                                                    transition: 'box-shadow 0.1s',
                                                }}
                                            >
                                                {art && <img src={art} alt="" style={{ width: 40, height: 40, borderRadius: theme.radiusSmall, objectFit: 'cover', border: theme.borderThin }} />}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 13, color: theme.black, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</div>
                                                    <div style={{ fontSize: 11, color: theme.faint, fontFamily: theme.fontBody }}>{track.artists?.map((a: any) => a.name).join(', ')}</div>
                                                </div>
                                                {inCat ? (
                                                    <span style={{
                                                        fontSize: 10, padding: '3px 8px', borderRadius: 4,
                                                        background: `${theme.mintGreen}20`,
                                                        border: `2px solid ${theme.mintGreen}`,
                                                        color: theme.mintGreen,
                                                        fontFamily: theme.fontDisplay, fontWeight: 700,
                                                    }}>✓ In Catalog</span>
                                                ) : (
                                                    <span style={{ fontSize: 11, color: theme.muted, fontFamily: theme.fontDisplay }}>Configure →</span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Catalog */}
                        <section style={sectionCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: theme.radiusSmall,
                                    background: `${theme.softViolet}20`,
                                    border: `2px solid ${theme.softViolet}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                                }}>📚</div>
                                <div>
                                    <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 14, color: theme.black }}>Song Catalog</div>
                                    <div style={{ fontSize: 11, color: theme.faint, fontFamily: theme.fontBody }}>{catalog.length} songs ready</div>
                                </div>
                            </div>

                            <input
                                placeholder="Filter songs..."
                                value={catalogFilter}
                                onChange={(e) => setCatalogFilter(e.target.value)}
                                style={{ ...theme.input, width: '100%', padding: '10px 14px', fontSize: 14, marginBottom: catalog.length ? 16 : 0 }}
                            />

                            {catalog.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px 0', color: theme.faint, fontSize: 13, fontFamily: theme.fontBody }}>
                                    No songs yet.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                                    {catalog.filter(song => {
                                        if (!catalogFilter) return true
                                        const q = catalogFilter.toLowerCase()
                                        return song.name.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q)
                                    }).map(song => {
                                        const hasSyllables = Array.isArray(song.lyrics) && song.lyrics.some((l: any) => Array.isArray(l?.syllables) && l.syllables.length > 0)
                                        return (
                                        <div key={song.trackId} style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '10px 14px',
                                            borderRadius: theme.radius,
                                            background: theme.creamDark,
                                            border: theme.borderThin,
                                        }}>
                                            {song.artUrl && <img src={song.artUrl} alt="" style={{ width: 40, height: 40, borderRadius: theme.radiusSmall, objectFit: 'cover', border: theme.borderThin }} />}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 13, color: theme.black }}>{song.name}</div>
                                                <div style={{ fontSize: 11, color: theme.faint, fontFamily: theme.fontBody }}>{song.artist}</div>
                                            </div>
                                            {hasSyllables && (
                                                <span
                                                    title="Word-level karaoke timing"
                                                    aria-label="Word-level karaoke timing"
                                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, color: theme.violet, flexShrink: 0, opacity: 0.85 }}
                                                >
                                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                        <line x1="3"  y1="12" x2="3"  y2="12" />
                                                        <line x1="7"  y1="9"  x2="7"  y2="15" />
                                                        <line x1="11" y1="5"  x2="11" y2="19" />
                                                        <line x1="15" y1="8"  x2="15" y2="16" />
                                                        <line x1="19" y1="11" x2="19" y2="13" />
                                                    </svg>
                                                </span>
                                            )}
                                            <button
                                                style={{ ...theme.iconBtn, width: 28, height: 28, fontSize: 12 }}
                                                onClick={() => handleEditCatalogSong(song)}
                                                title="Edit Song"
                                            >✎</button>
                                            <button
                                                style={{ ...theme.iconBtn, width: 28, height: 28, fontSize: 12, background: `${theme.hotRed}15`, color: theme.hotRed }}
                                                onClick={() => window.electronAPI.removeSong(song.trackId).then(loadCatalog)}
                                                title="Delete Song"
                                            >✕</button>
                                        </div>
                                    )})}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* ── Right Column: Effects Rack ── */}
                {pending && (
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <section style={{
                            ...theme.card,
                            padding: 24,
                            borderColor: theme.softViolet,
                            boxShadow: theme.shadowColor(theme.softViolet),
                            overflow: 'hidden',
                        }}>
                            {/* Track Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                {pending.track.album?.images?.[0]?.url && (
                                    <img src={pending.track.album.images[0].url} alt="" style={{ width: 52, height: 52, borderRadius: theme.radius, objectFit: 'cover', border: theme.border }} />
                                )}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16, color: theme.black }}>
                                        {pending.track.name}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {/* BPM */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...innerPanel, padding: '4px 10px' }}>
                                            <input
                                                type="number"
                                                value={pending.configs[pending.activeRoleTab]?.tempo || 120}
                                                onChange={e => updateActiveConfig(c => { c.tempo = parseInt(e.target.value) || 120 })}
                                                style={{ width: 50, fontSize: 13, background: 'transparent', border: 'none', color: theme.black, outline: 'none', fontFamily: theme.fontDisplay }}
                                            />
                                            <span style={{ fontSize: 11, color: theme.muted, fontWeight: 700, fontFamily: theme.fontDisplay }}>BPM</span>
                                        </div>
                                        {/* Key */}
                                        <select
                                            value={pending.configs[pending.activeRoleTab]?.key ?? -1}
                                            onChange={e => updateActiveConfig(c => { c.key = parseInt(e.target.value) })}
                                            style={{ padding: '6px 10px', fontSize: 13, ...theme.select }}
                                        >
                                            <option value={-1}>Unknown Key</option>
                                            {KEY_NAMES.map((k, i) => <option key={i} value={i}>{k}</option>)}
                                        </select>
                                        {/* Mode */}
                                        <select
                                            value={pending.configs[pending.activeRoleTab]?.mode ?? 1}
                                            onChange={e => updateActiveConfig(c => { c.mode = parseInt(e.target.value) })}
                                            style={{ padding: '6px 10px', fontSize: 13, ...theme.select }}
                                        >
                                            <option value={1}>Major</option>
                                            <option value={0}>Minor</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { if (isPlayingSnippet) stopSnippetPlayback(); if (isTesting) toggleTesting(); setRecordedBlob(null); setLyricsError(null); setPending(null) }}
                                    style={{ ...theme.btnSecondary, fontSize: 12, padding: '8px 16px' }}
                                >
                                    ✕ Close
                                </button>
                            </div>

                            {/* Genres */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 11, color: theme.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Genres</span>
                                {GENRE_BUCKETS.map(g => {
                                    const selected = (pending.genres || []).includes(g)
                                    return (
                                        <button
                                            key={g}
                                            onClick={() => setPending(p => {
                                                if (!p) return p
                                                const cur = p.genres || []
                                                const next = cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g]
                                                return { ...p, genres: next }
                                            })}
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: 999,
                                                fontSize: 11,
                                                fontFamily: theme.fontDisplay,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                background: selected ? theme.softViolet : 'transparent',
                                                color: selected ? theme.white : theme.muted,
                                                border: selected ? `1.5px solid ${theme.softViolet}` : theme.borderThin,
                                                transition: 'all 0.12s'
                                            }}
                                        >{g}</button>
                                    )
                                })}
                            </div>

                            {/* Roles & Lyrics */}
                            <div style={{ display: 'flex', gap: 24, marginBottom: 24, ...innerPanel }}>
                                {/* Roles */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div>
                                        <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 15, color: theme.black, marginBottom: 2 }}>Singer Roles</div>
                                        <div style={{ fontSize: 12, color: theme.muted, fontFamily: theme.fontBody }}>Define distinct vocal setups.</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {pending.roles.map((role, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setPending(p => p ? { ...p, activeRoleTab: idx } : p)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                    padding: '7px 12px', borderRadius: theme.radius,
                                                    fontSize: 13, cursor: 'pointer',
                                                    background: pending.activeRoleTab === idx ? theme.softViolet : theme.cream,
                                                    color: pending.activeRoleTab === idx ? theme.white : theme.black,
                                                    border: pending.activeRoleTab === idx ? `3px solid ${theme.black}` : theme.borderThin,
                                                    boxShadow: pending.activeRoleTab === idx ? theme.shadow : 'none',
                                                    fontFamily: theme.fontDisplay,
                                                    fontWeight: 700,
                                                    transition: 'all 0.1s',
                                                }}
                                            >
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: `hsl(${(idx * 137.5) % 360}, 70%, 45%)`, border: '1px solid rgba(0,0,0,0.3)' }} />
                                                {role}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveRole(idx) }}
                                                    style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer', padding: 0, marginLeft: 2 }}
                                                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                                                >✕</button>
                                            </div>
                                        ))}
                                        {pending.roles.length === 0 && (
                                            <div style={{ padding: '7px 14px', borderRadius: theme.radius, fontSize: 13, background: theme.cream, color: theme.faint, border: theme.borderThin, fontFamily: theme.fontDisplay }}>
                                                Default Voice (No Roles)
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                                        <input
                                            type="text"
                                            value={newRoleName}
                                            onChange={e => setNewRoleName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                                            placeholder="Add singer role..."
                                            style={{ flex: 1, ...theme.input, padding: '8px 12px', fontSize: 13 }}
                                        />
                                        <button
                                            onClick={handleAddRole}
                                            style={{ ...theme.btnOutline, padding: '8px 16px', fontSize: 13 }}
                                        >Add</button>
                                    </div>
                                </div>

                                {/* Lyrics */}
                                <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 15, color: theme.black }}>Lyrics Assignment</div>
                                            <div style={{ fontSize: 12, color: theme.muted, marginTop: 2, fontFamily: theme.fontBody }}>Click the color dot to assign a role.</div>
                                        </div>
                                        <button
                                            onClick={handleFetchLyrics}
                                            disabled={fetchingLyrics}
                                            style={{ ...theme.btnSecondary, fontSize: 12, padding: '6px 14px' }}
                                        >
                                            {fetchingLyrics ? 'Fetching...' : 'Fetch Lyrics'}
                                        </button>
                                    </div>

                                    <div style={{
                                        background: theme.cream,
                                        borderRadius: theme.radius,
                                        height: 400,
                                        overflowY: 'auto',
                                        border: theme.border,
                                        boxShadow: theme.shadow,
                                        position: 'relative',
                                    }}>
                                        {pending.lyrics.length > 0 ? (
                                            <div style={{ padding: '8px 0' }}>
                                                {pending.lyrics.map((line, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: 12, padding: '7px 14px',
                                                            background: idx % 2 === 0 ? `rgba(26,26,26,0.03)` : 'transparent',
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `rgba(26,26,26,0.06)`}
                                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? `rgba(26,26,26,0.03)` : 'transparent'}
                                                    >
                                                        <span style={{ fontSize: 10, color: theme.faint, width: 40, fontFamily: 'monospace', flexShrink: 0 }}>
                                                            {Math.floor(line.startTimeMs / 60000)}:{(Math.floor(line.startTimeMs / 1000) % 60).toString().padStart(2, '0')}
                                                        </span>
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); cycleLyricRole(idx) }}
                                                            title={pending.roles.length > 0 ? 'Click to reassign role' : 'Add roles first'}
                                                            style={{
                                                                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                                                                cursor: pending.roles.length > 0 ? 'pointer' : 'default',
                                                                background: pending.roles.length > 0
                                                                    ? (line.roleIndex === -1 ? 'linear-gradient(135deg, #FF3366, #33FFCC, #FFD700)' : `hsl(${((line.roleIndex || 0) * 137.5) % 360}, 70%, 45%)`)
                                                                    : theme.creamDark,
                                                                border: `2px solid ${theme.black}`,
                                                            }}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={line.words}
                                                            onChange={e => {
                                                                const newVal = e.target.value
                                                                setPending(p => p ? { ...p, lyrics: p.lyrics.map((l, i) => i === idx ? { ...l, words: newVal } : l) } : p)
                                                            }}
                                                            style={{
                                                                flex: 1, fontSize: 13, color: theme.black, background: 'transparent',
                                                                border: '1px solid transparent', padding: '3px 6px',
                                                                borderRadius: theme.radiusSmall, outline: 'none', fontFamily: theme.fontBody,
                                                                transition: 'border-color 0.15s',
                                                            }}
                                                            onFocus={e => e.target.style.borderColor = theme.accentA}
                                                            onBlur={e => e.target.style.borderColor = 'transparent'}
                                                        />
                                                        {line.words.split(/(\([^)]+\))/).filter((s: string) => s.trim()).length > 1 && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleSplitLyric(idx) }}
                                                                style={{
                                                                    fontSize: 10, padding: '2px 7px', borderRadius: theme.radiusSmall,
                                                                    background: `${theme.mintGreen}20`, color: theme.mintGreen,
                                                                    border: `2px solid ${theme.mintGreen}`,
                                                                    cursor: 'pointer', flexShrink: 0, fontFamily: theme.fontDisplay, fontWeight: 700,
                                                                }}
                                                                title="Split Parentheses"
                                                            >Split</button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setPending(p => p ? { ...p, lyrics: p.lyrics.filter((_, i) => i !== idx) } : p) }}
                                                            style={{ background: 'none', border: 'none', color: theme.faint, cursor: 'pointer', padding: 3, flexShrink: 0, opacity: 0.5, transition: 'opacity 0.15s' }}
                                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                                                            title="Delete Line"
                                                        >✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.faint }}>
                                                {fetchingLyrics ? (
                                                    <div className="spinner" style={{ width: 24, height: 24, marginBottom: 16, border: `3px solid ${theme.spinnerBorder}`, borderTopColor: theme.spinnerBorderTop }} />
                                                ) : (
                                                    <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
                                                )}
                                                <div style={{ fontSize: 14, fontFamily: theme.fontBody }}>
                                                    {fetchingLyrics ? 'Loading lyrics...' : (lyricsError || 'No lyrics generated for this track.')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Voice Testing */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, ...innerPanel }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                                        <select
                                            value={selectedMic}
                                            onChange={e => setSelectedMic(e.target.value)}
                                            style={{ flex: 1, minWidth: 0, padding: '8px 10px', fontSize: 12, ...theme.select }}
                                        >
                                            {mics.map(m => <option key={m.deviceId} value={m.deviceId}>🎤 {m.label || 'Mic'}</option>)}
                                        </select>
                                        <select
                                            value={selectedSpeaker}
                                            onChange={e => setSelectedSpeaker(e.target.value)}
                                            style={{ flex: 1, minWidth: 0, padding: '8px 10px', fontSize: 12, ...theme.select }}
                                        >
                                            {speakers.map(s => <option key={s.deviceId} value={s.deviceId}>🔊 {s.label || 'Speaker'}</option>)}
                                        </select>
                                    </div>
                                    <button
                                        onClick={toggleTesting}
                                        style={{
                                            fontSize: 12, padding: '8px 16px', whiteSpace: 'nowrap',
                                            ...(isTesting ? { ...theme.btnSecondary, color: theme.mintGreen } : theme.btnOutline),
                                        }}
                                    >
                                        {isTesting ? '● Live' : 'Test Live'}
                                    </button>
                                    {isTesting && (
                                        <button
                                            onClick={toggleRecording}
                                            style={{
                                                fontSize: 12, padding: '8px 16px', whiteSpace: 'nowrap',
                                                ...(isRecording
                                                    ? { ...theme.btnPrimary, background: theme.hotRed }
                                                    : theme.btnOutline),
                                            }}
                                        >
                                            {isRecording ? `■ Stop (${(recordingDuration / 1000).toFixed(1)}s)` : '● Record'}
                                        </button>
                                    )}
                                </div>

                                {/* Mic Level Bar */}
                                <div style={{ height: 8, borderRadius: 4, background: theme.creamDark, border: theme.borderThin, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (isTesting ? testLevel * 250 : 0))}%`,
                                        background: isRecording ? theme.hotRed : theme.mintGreen,
                                        transition: 'width 0.05s ease',
                                    }} />
                                </div>

                                {/* Recorded Snippet */}
                                {recordedBlob && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '10px 14px',
                                        borderRadius: theme.radius,
                                        background: theme.cream,
                                        border: theme.border,
                                        boxShadow: theme.shadow,
                                    }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: theme.radiusSmall,
                                            background: `${theme.softViolet}20`,
                                            border: `2px solid ${theme.softViolet}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 13, flexShrink: 0,
                                        }}>🎙️</div>
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 12, color: theme.black }}>
                                                    Snippet ({(snippetDuration / 1000).toFixed(1)}s)
                                                </span>
                                                <span style={{ fontSize: 10, color: snippetError ? theme.hotRed : theme.faint, fontFamily: theme.fontBody }}>
                                                    {snippetError || (isPlayingSnippet ? 'Playing with effects...' : 'Ready to preview')}
                                                </span>
                                            </div>
                                            <div style={{ height: 6, borderRadius: 3, background: theme.creamDark, border: theme.borderThin, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${playbackProgress * 100}%`,
                                                    background: theme.softViolet,
                                                    transition: isPlayingSnippet ? 'width 0.05s linear' : 'none',
                                                }} />
                                            </div>
                                        </div>
                                        {isPlayingSnippet ? (
                                            <button onClick={stopSnippetPlayback} style={{ ...theme.btnOutline, fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }}>■ Stop</button>
                                        ) : (
                                            <button onClick={playSnippet} style={{ ...theme.btnSecondary, fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }}>▶ Play</button>
                                        )}
                                        <button
                                            onClick={discardSnippet}
                                            style={{ background: 'none', border: 'none', color: theme.faint, cursor: 'pointer', padding: 4, opacity: 0.5, transition: 'opacity 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                                            title="Discard"
                                        >✕</button>
                                    </div>
                                )}
                            </div>

                            {/* Vocal Presets */}
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 13, color: theme.black }}>
                                        Vocal Presets
                                    </div>
                                    {activePresetIds[pending.activeRoleTab] && (
                                        <span style={{
                                            fontSize: 10, padding: '3px 10px', borderRadius: theme.radiusSmall,
                                            background: `${theme.softViolet}20`,
                                            border: `2px solid ${theme.softViolet}`,
                                            color: theme.softViolet,
                                            fontFamily: theme.fontDisplay, fontWeight: 700,
                                        }}>
                                            {BUILT_IN_PRESETS.find(p => p.id === activePresetIds[pending.activeRoleTab])?.name}
                                        </span>
                                    )}
                                </div>

                                {PRESET_CATEGORIES.map(cat => {
                                    const presets = BUILT_IN_PRESETS.filter(p => p.category === cat.key)
                                    if (presets.length === 0) return null
                                    return (
                                        <div key={cat.key} style={{ marginBottom: 8 }}>
                                            <div style={{
                                                fontSize: 9, color: theme.faint, textTransform: 'uppercase',
                                                letterSpacing: '1.5px', fontFamily: theme.fontDisplay, fontWeight: 700, marginBottom: 4,
                                            }}>
                                                {cat.label}
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {presets.map(preset => {
                                                    const isActive = activePresetIds[pending.activeRoleTab] === preset.id
                                                    const imgUrl = preset.artistId && !presetImageErrors.has(preset.artistId) ? presetImages[preset.artistId] : null
                                                    return (
                                                        <button
                                                            key={preset.id}
                                                            onClick={() => applyPreset(preset)}
                                                            title={preset.description}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: 5,
                                                                padding: '3px 10px 3px 4px',
                                                                borderRadius: 99,
                                                                fontSize: 10,
                                                                fontFamily: theme.fontDisplay, fontWeight: 700,
                                                                border: isActive ? `2px solid ${theme.softViolet}` : theme.borderThin,
                                                                background: isActive ? `${theme.softViolet}18` : theme.creamDark,
                                                                color: isActive ? theme.softViolet : theme.muted,
                                                                cursor: 'pointer', whiteSpace: 'nowrap',
                                                                boxShadow: isActive ? theme.shadowColor(theme.softViolet) : 'none',
                                                                transition: 'all 0.1s',
                                                            }}
                                                        >
                                                            {imgUrl ? (
                                                                <img
                                                                    src={imgUrl}
                                                                    alt={preset.name}
                                                                    onError={() => preset.artistId && setPresetImageErrors(prev => new Set(prev).add(preset.artistId!))}
                                                                    style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', border: isActive ? `2px solid ${theme.softViolet}` : theme.borderThin }}
                                                                />
                                                            ) : (
                                                                <div style={{
                                                                    width: 18, height: 18, borderRadius: '50%',
                                                                    background: isActive ? theme.softViolet : theme.faint,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 8, color: theme.white, fontWeight: 700,
                                                                }}>
                                                                    {preset.name.charAt(0)}
                                                                </div>
                                                            )}
                                                            {preset.name}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* FX Rack Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {/* Compressor */}
                                <div style={fxModule(pending.configs[pending.activeRoleTab].compressor.enabled)}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].compressor.enabled} label="Compressor" onClick={() => updateActiveConfig(c => { c.compressor.enabled = !c.compressor.enabled })} />
                                    <div style={{ marginTop: 14, pointerEvents: pending.configs[pending.activeRoleTab].compressor.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Threshold" val={pending.configs[pending.activeRoleTab].compressor.threshold} min={-60} max={0} unit="dB" onChange={v => updateActiveConfig(c => { c.compressor.threshold = v })} />
                                        <Slider label="Ratio" val={pending.configs[pending.activeRoleTab].compressor.ratio} min={1} max={20} unit=":1" onChange={v => updateActiveConfig(c => { c.compressor.ratio = v })} />
                                    </div>
                                </div>

                                {/* EQ */}
                                <div style={fxModule(pending.configs[pending.activeRoleTab].eq.enabled)}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].eq.enabled} label="Equalizer (3-Band)" onClick={() => updateActiveConfig(c => { c.eq.enabled = !c.eq.enabled })} />
                                    <div style={{ marginTop: 14, pointerEvents: pending.configs[pending.activeRoleTab].eq.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Low Shelf" val={pending.configs[pending.activeRoleTab].eq.lowGain} min={-24} max={24} unit="dB" onChange={v => updateActiveConfig(c => { c.eq.lowGain = v })} />
                                        <Slider label="Mid Peaking" val={pending.configs[pending.activeRoleTab].eq.midGain} min={-24} max={24} unit="dB" onChange={v => updateActiveConfig(c => { c.eq.midGain = v })} />
                                        <Slider label="High Shelf" val={pending.configs[pending.activeRoleTab].eq.highGain} min={-24} max={24} unit="dB" onChange={v => updateActiveConfig(c => { c.eq.highGain = v })} />
                                    </div>
                                </div>

                                {/* Chorus */}
                                <div style={fxModule(pending.configs[pending.activeRoleTab].chorus.enabled)}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].chorus.enabled} label="Chorus" onClick={() => updateActiveConfig(c => { c.chorus.enabled = !c.chorus.enabled })} />
                                    <div style={{ marginTop: 14, pointerEvents: pending.configs[pending.activeRoleTab].chorus.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Rate" val={pending.configs[pending.activeRoleTab].chorus.rate} min={0.1} max={10} unit="Hz" onChange={v => updateActiveConfig(c => { c.chorus.rate = v })} />
                                        <Slider label="Depth" val={pending.configs[pending.activeRoleTab].chorus.depth} min={0.1} max={1} unit="" onChange={v => updateActiveConfig(c => { c.chorus.depth = v })} />
                                        <Slider label="Mix" val={pending.configs[pending.activeRoleTab].chorus.mix} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { c.chorus.mix = v })} />
                                    </div>
                                </div>

                                {/* Pitch Correction */}
                                <div style={fxModule(pending.configs[pending.activeRoleTab]?.pitchCorrection.enabled ?? false)}>
                                    <Toggle on={pending.configs[pending.activeRoleTab]?.pitchCorrection.enabled ?? false} label="Pitch Correction" onClick={() => updateActiveConfig(c => { c.pitchCorrection.enabled = !c.pitchCorrection.enabled })} />
                                    <div style={{ marginTop: 14, pointerEvents: pending.configs[pending.activeRoleTab]?.pitchCorrection.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Strength (Snap)" val={pending.configs[pending.activeRoleTab]?.pitchCorrection.strength ?? 0} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { c.pitchCorrection.strength = v })} />
                                        <div style={{ fontSize: 10, color: theme.mintGreen, marginTop: 6, fontFamily: theme.fontDisplay, fontWeight: 700 }}>
                                            Target Key: {(pending.configs[pending.activeRoleTab]?.key ?? -1) >= 0 ? `${KEY_NAMES[pending.configs[pending.activeRoleTab].key]} ${pending.configs[pending.activeRoleTab].mode ? 'Major' : 'Minor'}` : 'Unknown Key'}
                                        </div>
                                    </div>
                                </div>

                                {/* Delay */}
                                <div style={fxModule(pending.configs[pending.activeRoleTab].delay.enabled)}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].delay.enabled} label="Delay" onClick={() => updateActiveConfig(c => { c.delay.enabled = !c.delay.enabled })} />
                                    <div style={{ marginTop: 14, pointerEvents: pending.configs[pending.activeRoleTab].delay.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Time" val={pending.configs[pending.activeRoleTab].delay.time} min={10} max={1000} unit="ms" onChange={v => updateActiveConfig(c => { c.delay.time = v })} />
                                        <Slider label="Feedback" val={pending.configs[pending.activeRoleTab].delay.feedback} min={0} max={90} unit="%" onChange={v => updateActiveConfig(c => { c.delay.feedback = v })} />
                                        <Slider label="Mix" val={pending.configs[pending.activeRoleTab].delay.mix} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { c.delay.mix = v })} />
                                    </div>
                                </div>

                                {/* Reverb */}
                                <div style={fxModule(pending.configs[pending.activeRoleTab].reverb.enabled)}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].reverb.enabled} label="Reverb" onClick={() => updateActiveConfig(c => { c.reverb.enabled = !c.reverb.enabled })} />
                                    <div style={{ marginTop: 14, pointerEvents: pending.configs[pending.activeRoleTab].reverb.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Decay" val={pending.configs[pending.activeRoleTab].reverb.decay} min={0.5} max={8.0} unit="s" onChange={v => updateActiveConfig(c => { c.reverb.decay = v })} />
                                        <Slider label="Mix" val={pending.configs[pending.activeRoleTab].reverb.mix} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { c.reverb.mix = v })} />
                                    </div>
                                </div>

                                {/* Distortion */}
                                <div style={fxModule(pending.configs[pending.activeRoleTab].distortion?.enabled ?? false)}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].distortion?.enabled ?? false} label="Distortion" onClick={() => updateActiveConfig(c => { if (!c.distortion) c.distortion = { enabled: false, drive: 0, mix: 0 }; c.distortion.enabled = !c.distortion.enabled })} />
                                    <div style={{ marginTop: 14, pointerEvents: pending.configs[pending.activeRoleTab].distortion?.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Drive" val={pending.configs[pending.activeRoleTab].distortion?.drive ?? 0} min={0} max={100} unit="" onChange={v => updateActiveConfig(c => { if (!c.distortion) c.distortion = { enabled: true, drive: 0, mix: 0 }; c.distortion.drive = v })} />
                                        <Slider label="Mix" val={pending.configs[pending.activeRoleTab].distortion?.mix ?? 0} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { if (!c.distortion) c.distortion = { enabled: true, drive: 0, mix: 0 }; c.distortion.mix = v })} />
                                    </div>
                                </div>

                                {/* Noise Gate */}
                                <div style={fxModule(pending.configs[pending.activeRoleTab].noiseGate?.enabled ?? false)}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].noiseGate?.enabled ?? false} label="Noise Gate" onClick={() => updateActiveConfig(c => { if (!c.noiseGate) c.noiseGate = { enabled: false, threshold: -50 }; c.noiseGate.enabled = !c.noiseGate.enabled })} />
                                    <div style={{ marginTop: 14, pointerEvents: pending.configs[pending.activeRoleTab].noiseGate?.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Threshold" val={pending.configs[pending.activeRoleTab].noiseGate?.threshold ?? -50} min={-100} max={0} unit="dB" onChange={v => updateActiveConfig(c => { if (!c.noiseGate) c.noiseGate = { enabled: true, threshold: -50 }; c.noiseGate.threshold = v })} />
                                    </div>
                                </div>

                                {/* Vocoder / Talkbox — channel vocoder that replaces the singer's
                                    sound source with a synth chord shaped by their vowels. Built
                                    from the role's key/mode (shared with pitch correction). */}
                                <div style={fxModule(pending.configs[pending.activeRoleTab].vocoder?.enabled ?? false)}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].vocoder?.enabled ?? false} label="Vocoder / Talkbox" onClick={() => updateActiveConfig(c => { if (!c.vocoder) c.vocoder = { enabled: false, mix: 100, brightness: 70, sibilance: 0, voicing: 'triad' }; c.vocoder.enabled = !c.vocoder.enabled })} />
                                    <div style={{ marginTop: 14, pointerEvents: pending.configs[pending.activeRoleTab].vocoder?.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Mix" val={pending.configs[pending.activeRoleTab].vocoder?.mix ?? 100} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { if (!c.vocoder) c.vocoder = { enabled: true, mix: 100, brightness: 70, sibilance: 0, voicing: 'triad' }; c.vocoder.mix = v })} />
                                        <Slider label="Brightness" val={pending.configs[pending.activeRoleTab].vocoder?.brightness ?? 70} min={0} max={100} unit="" onChange={v => updateActiveConfig(c => { if (!c.vocoder) c.vocoder = { enabled: true, mix: 100, brightness: 70, sibilance: 0, voicing: 'triad' }; c.vocoder.brightness = v })} />
                                        <Slider label="Sibilance" val={pending.configs[pending.activeRoleTab].vocoder?.sibilance ?? 0} min={0} max={100} unit="" onChange={v => updateActiveConfig(c => { if (!c.vocoder) c.vocoder = { enabled: true, mix: 100, brightness: 70, sibilance: 0, voicing: 'triad' }; c.vocoder.sibilance = v })} />

                                        {/* Voicing — chord shape the synth carrier plays */}
                                        <div style={{ marginTop: 4 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6, color: theme.muted, fontFamily: theme.fontDisplay, fontWeight: 600 }}>
                                                <span>Voicing</span>
                                                <span style={{ color: theme.black, textTransform: 'capitalize' }}>{pending.configs[pending.activeRoleTab].vocoder?.voicing ?? 'triad'}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {(['triad', 'power', 'octaves'] as const).map(v => {
                                                    const active = (pending.configs[pending.activeRoleTab].vocoder?.voicing ?? 'triad') === v
                                                    return (
                                                        <button
                                                            key={v}
                                                            onClick={() => updateActiveConfig(c => { if (!c.vocoder) c.vocoder = { enabled: true, mix: 100, brightness: 70, sibilance: 0, voicing: 'triad' }; c.vocoder.voicing = v })}
                                                            style={{
                                                                flex: 1,
                                                                padding: '8px 0',
                                                                fontFamily: theme.fontDisplay,
                                                                fontSize: 10,
                                                                fontWeight: 700,
                                                                border: theme.borderThin,
                                                                borderRadius: theme.radius,
                                                                background: active ? theme.softViolet : 'transparent',
                                                                color: active ? theme.black : theme.muted,
                                                                cursor: 'pointer',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.5px',
                                                                transition: 'background 0.15s, color 0.15s',
                                                            }}
                                                        >
                                                            {v}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Doubler / Thickener — stacks detuned, panned copies of the
                                    tuned voice on top of the lead for the wide "vocal stack"
                                    behind hard-autotune artists (Travis, T-Pain, Carti). */}
                                <div style={fxModule(pending.configs[pending.activeRoleTab].doubler?.enabled ?? false)}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].doubler?.enabled ?? false} label="Doubler / Thickener" onClick={() => updateActiveConfig(c => { if (!c.doubler) c.doubler = { enabled: false, voices: 2, detune: 12, delay: 22, width: 70, mix: 35 }; c.doubler.enabled = !c.doubler.enabled })} />
                                    <div style={{ marginTop: 14, pointerEvents: pending.configs[pending.activeRoleTab].doubler?.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Voices" val={pending.configs[pending.activeRoleTab].doubler?.voices ?? 2} min={2} max={4} unit="" onChange={v => updateActiveConfig(c => { if (!c.doubler) c.doubler = { enabled: true, voices: 2, detune: 12, delay: 22, width: 70, mix: 35 }; c.doubler.voices = Math.round(v) })} />
                                        <Slider label="Detune" val={pending.configs[pending.activeRoleTab].doubler?.detune ?? 12} min={0} max={30} unit="¢" onChange={v => updateActiveConfig(c => { if (!c.doubler) c.doubler = { enabled: true, voices: 2, detune: 12, delay: 22, width: 70, mix: 35 }; c.doubler.detune = v })} />
                                        <Slider label="Delay" val={pending.configs[pending.activeRoleTab].doubler?.delay ?? 22} min={8} max={40} unit="ms" onChange={v => updateActiveConfig(c => { if (!c.doubler) c.doubler = { enabled: true, voices: 2, detune: 12, delay: 22, width: 70, mix: 35 }; c.doubler.delay = v })} />
                                        <Slider label="Width" val={pending.configs[pending.activeRoleTab].doubler?.width ?? 70} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { if (!c.doubler) c.doubler = { enabled: true, voices: 2, detune: 12, delay: 22, width: 70, mix: 35 }; c.doubler.width = v })} />
                                        <Slider label="Mix" val={pending.configs[pending.activeRoleTab].doubler?.mix ?? 35} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { if (!c.doubler) c.doubler = { enabled: true, voices: 2, detune: 12, delay: 22, width: 70, mix: 35 }; c.doubler.mix = v })} />
                                    </div>
                                </div>
                            </div>

                            {/* File Upload Areas */}
                            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {/* Instrumental Upload */}
                                    <div
                                        onClick={() => pickAudioFile('instrumental')}
                                        style={{
                                            padding: 20, borderRadius: theme.radius, cursor: 'pointer', textAlign: 'center',
                                            border: `3px dashed ${existingInstrumental || pendingAudioFile ? theme.mintGreen : theme.muted}`,
                                            background: existingInstrumental || pendingAudioFile ? `${theme.mintGreen}10` : theme.creamDark,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <div style={{ fontSize: 24, marginBottom: 6 }}>🎵</div>
                                        {pendingAudioFile ? (
                                            <>
                                                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 13, color: theme.mintGreen }}>{pendingAudioFile.name}</div>
                                                <div style={{ fontSize: 11, color: theme.faint, marginTop: 4, fontFamily: theme.fontBody }}>Click to change</div>
                                            </>
                                        ) : existingInstrumental ? (
                                            <>
                                                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 13, color: theme.mintGreen }}>Instrumental uploaded</div>
                                                <div style={{ fontSize: 11, color: theme.faint, marginTop: 4, fontFamily: theme.fontBody }}>Click to replace</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 13, color: theme.black }}>
                                                    Upload Instrumental <span style={{ color: theme.hotRed, fontSize: 11 }}>(required)</span>
                                                </div>
                                                <div style={{ fontSize: 11, color: theme.faint, marginTop: 4, fontFamily: theme.fontBody }}>Click to select an audio file</div>
                                            </>
                                        )}
                                    </div>

                                    {/* Vocals Upload */}
                                    <div
                                        onClick={() => pickAudioFile('vocals')}
                                        style={{
                                            padding: 20, borderRadius: theme.radius, cursor: 'pointer', textAlign: 'center',
                                            border: `3px dashed ${existingVocals || pendingVocalsFile ? theme.mintGreen : theme.muted}`,
                                            background: existingVocals || pendingVocalsFile ? `${theme.mintGreen}10` : theme.creamDark,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <div style={{ fontSize: 24, marginBottom: 6 }}>🎤</div>
                                        {pendingVocalsFile ? (
                                            <>
                                                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 13, color: theme.mintGreen }}>{pendingVocalsFile.name}</div>
                                                <div style={{ fontSize: 11, color: theme.faint, marginTop: 4, fontFamily: theme.fontBody }}>Click to change</div>
                                            </>
                                        ) : existingVocals ? (
                                            <>
                                                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 13, color: theme.mintGreen }}>Vocals uploaded</div>
                                                <div style={{ fontSize: 11, color: theme.faint, marginTop: 4, fontFamily: theme.fontBody }}>Click to replace</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 13, color: theme.black }}>
                                                    Upload Vocals <span style={{ color: theme.faint, fontSize: 11 }}>(optional)</span>
                                                </div>
                                                <div style={{ fontSize: 11, color: theme.faint, marginTop: 4, fontFamily: theme.fontBody }}>Click to select an audio file</div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* YouTube URL */}
                                <div style={{
                                    padding: 16, borderRadius: theme.radius,
                                    border: youtubeUrl.trim() ? `3px solid ${theme.softViolet}` : theme.border,
                                    background: youtubeUrl.trim() ? `${theme.softViolet}10` : theme.creamDark,
                                    boxShadow: youtubeUrl.trim() ? theme.shadowColor(theme.softViolet) : 'none',
                                    transition: 'all 0.15s',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                        <span style={{ fontSize: 18 }}>🎬</span>
                                        <div>
                                            <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 13, color: theme.black }}>
                                                Background Video <span style={{ color: theme.faint, fontSize: 11 }}>(optional)</span>
                                            </div>
                                            <div style={{ fontSize: 11, color: theme.muted, fontFamily: theme.fontBody }}>Streams from YouTube behind lyrics on stage</div>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={youtubeUrl}
                                        onChange={e => setYoutubeUrl(e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        style={{ width: '100%', padding: '10px 12px', fontSize: 13, boxSizing: 'border-box', ...theme.input }}
                                    />
                                </div>
                            </div>

                            {/* Save */}
                            <button
                                disabled={uploading || (!existingInstrumental && !pendingAudioFile)}
                                onClick={handleSave}
                                style={{
                                    width: '100%', marginTop: 20, fontSize: 15, padding: '16px 0',
                                    opacity: uploading || (!existingInstrumental && !pendingAudioFile) ? 0.5 : 1,
                                    ...theme.btnPrimary,
                                }}
                                onMouseEnter={e => { if (!uploading && (existingInstrumental || pendingAudioFile)) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = theme.shadowLift } }}
                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = theme.shadow }}
                            >
                                {uploading ? 'Saving...' : 'Save Song'}
                            </button>
                        </section>
                    </div>
                )}
            </div>

            {/* Spotify API Keys */}
            <section style={{ ...sectionCard, marginTop: 20, maxWidth: 400 }}>
                <div style={{ fontSize: 11, fontFamily: theme.fontDisplay, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: theme.muted, marginBottom: 10 }}>
                    Spotify Keys
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input
                        type="password"
                        placeholder="Client ID"
                        value={state.spotifyClientId || ''}
                        onChange={(e) => dispatch({ type: 'SET_SPOTIFY_AUTH', payload: { clientId: e.target.value, clientSecret: state.spotifyClientSecret || '' } })}
                        style={{ ...theme.input, fontSize: 11, padding: '6px 10px' }}
                    />
                    <input
                        type="password"
                        placeholder="Client Secret"
                        value={state.spotifyClientSecret || ''}
                        onChange={(e) => dispatch({ type: 'SET_SPOTIFY_AUTH', payload: { clientId: state.spotifyClientId || '', clientSecret: e.target.value } })}
                        style={{ ...theme.input, fontSize: 11, padding: '6px 10px' }}
                    />
                </div>
            </section>

            </>}

            {/* ═══ Guests Tab ═══ */}
            {adminTab === 'guests' && (
                <div>
                    {!state.karaokeSessionId ? (
                        <section style={sectionCard}>
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>📡</div>
                                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16, color: theme.black, marginBottom: 6 }}>
                                    No Active Session
                                </div>
                                <div style={{ color: theme.muted, fontSize: 13, fontFamily: theme.fontBody }}>
                                    Start a karaoke session from the Search page to manage guests
                                </div>
                            </div>
                        </section>
                    ) : guests.length === 0 ? (
                        <section style={sectionCard}>
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
                                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16, color: theme.black, marginBottom: 6 }}>
                                    No Guests Yet
                                </div>
                                <div style={{ color: theme.muted, fontSize: 13, fontFamily: theme.fontBody }}>
                                    Guests will appear here when they join via the companion site
                                </div>
                            </div>
                        </section>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                            {guests.map(guest => {
                                const isEditing = editingGuestId === guest.id
                                const isConfirmingRemove = confirmRemoveId === guest.id
                                const initial = guest.name.charAt(0).toUpperCase()
                                const hue = guest.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360

                                return (
                                    <section key={guest.id} style={{ ...sectionCard, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            {/* Avatar */}
                                            {guest.profilePicture ? (
                                                <img
                                                    src={guest.profilePicture}
                                                    alt={guest.name}
                                                    style={{
                                                        width: 48, height: 48, borderRadius: '50%',
                                                        objectFit: 'cover', border: theme.border,
                                                        flexShrink: 0,
                                                    }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: 48, height: 48, borderRadius: '50%',
                                                    background: `hsl(${hue}, 65%, 55%)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontFamily: theme.fontDisplay, fontWeight: 800,
                                                    fontSize: 20, color: '#fff',
                                                    border: theme.border, flexShrink: 0,
                                                }}>
                                                    {initial}
                                                </div>
                                            )}

                                            {/* Name / Edit fields */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={e => setEditName(e.target.value)}
                                                            placeholder="Guest name"
                                                            style={{ ...theme.input, fontSize: 13, padding: '6px 10px' }}
                                                            autoFocus
                                                            onKeyDown={e => { if (e.key === 'Enter') saveEditGuest(); if (e.key === 'Escape') setEditingGuestId(null) }}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editPicture}
                                                            onChange={e => setEditPicture(e.target.value)}
                                                            placeholder="Profile picture URL (optional)"
                                                            style={{ ...theme.input, fontSize: 11, padding: '5px 10px' }}
                                                            onKeyDown={e => { if (e.key === 'Enter') saveEditGuest(); if (e.key === 'Escape') setEditingGuestId(null) }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        fontFamily: theme.fontDisplay, fontWeight: 700,
                                                        fontSize: 16, color: theme.black,
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {guest.name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {isEditing ? (
                                                <>
                                                    <button
                                                        onClick={saveEditGuest}
                                                        style={{
                                                            flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700,
                                                            fontFamily: theme.fontDisplay, cursor: 'pointer',
                                                            border: theme.border, borderRadius: theme.radius,
                                                            background: theme.softViolet, color: theme.black,
                                                            boxShadow: theme.shadow,
                                                        }}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingGuestId(null)}
                                                        style={{
                                                            flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700,
                                                            fontFamily: theme.fontDisplay, cursor: 'pointer',
                                                            border: theme.border, borderRadius: theme.radius,
                                                            background: theme.cream, color: theme.black,
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : isConfirmingRemove ? (
                                                <>
                                                    <button
                                                        onClick={() => handleRemoveGuest(guest.id)}
                                                        style={{
                                                            flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700,
                                                            fontFamily: theme.fontDisplay, cursor: 'pointer',
                                                            border: `2px solid #e55`,
                                                            borderRadius: theme.radius,
                                                            background: '#fee', color: '#c33',
                                                        }}
                                                    >
                                                        Confirm Remove
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmRemoveId(null)}
                                                        style={{
                                                            flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700,
                                                            fontFamily: theme.fontDisplay, cursor: 'pointer',
                                                            border: theme.border, borderRadius: theme.radius,
                                                            background: theme.cream, color: theme.black,
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => startEditGuest(guest)}
                                                        style={{
                                                            flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700,
                                                            fontFamily: theme.fontDisplay, cursor: 'pointer',
                                                            border: theme.border, borderRadius: theme.radius,
                                                            background: theme.cream, color: theme.black,
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = theme.softViolet }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = theme.cream }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmRemoveId(guest.id)}
                                                        style={{
                                                            flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 700,
                                                            fontFamily: theme.fontDisplay, cursor: 'pointer',
                                                            border: theme.border, borderRadius: theme.radius,
                                                            background: theme.cream, color: theme.black,
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#fee'; e.currentTarget.style.color = '#c33' }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = theme.cream; e.currentTarget.style.color = theme.black }}
                                                    >
                                                        Remove
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </section>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Requests Tab ═══ */}
            {adminTab === 'requests' && (
                <div>
                    {!state.karaokeSessionId ? (
                        <section style={sectionCard}>
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>📡</div>
                                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16, color: theme.black, marginBottom: 6 }}>
                                    No Active Session
                                </div>
                                <div style={{ color: theme.muted, fontSize: 13, fontFamily: theme.fontBody }}>
                                    Start a karaoke session from the Search page to receive song requests
                                </div>
                            </div>
                        </section>
                    ) : songRequests.length === 0 ? (
                        <section style={sectionCard}>
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
                                <div style={{ fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 16, color: theme.black, marginBottom: 6 }}>
                                    No Requests Yet
                                </div>
                                <div style={{ color: theme.muted, fontSize: 13, fontFamily: theme.fontBody }}>
                                    When a guest can&apos;t find a song, they can ask you to add it here
                                </div>
                            </div>
                        </section>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {songRequests.map(req => {
                                const isPending = req.status === 'pending'
                                const initial = req.requestedByName.charAt(0).toUpperCase()
                                const hue = req.requestedByName.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
                                const inCatalog = catalog.some(c => c.trackId === req.trackId)
                                const statusBadge = req.status === 'added'
                                    ? { label: 'Added', bg: '#dcfce7', fg: '#166534' }
                                    : req.status === 'dismissed'
                                        ? { label: 'Dismissed', bg: '#fee2e2', fg: '#991b1b' }
                                        : null
                                return (
                                    <section key={req.id} style={{
                                        ...sectionCard,
                                        opacity: isPending ? 1 : 0.65,
                                        display: 'flex', flexDirection: 'column', gap: 12,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            {req.trackArtUrl ? (
                                                <img src={req.trackArtUrl} alt="" style={{
                                                    width: 64, height: 64, borderRadius: theme.radiusSmall,
                                                    objectFit: 'cover', border: theme.border, flexShrink: 0,
                                                }} />
                                            ) : (
                                                <div style={{
                                                    width: 64, height: 64, borderRadius: theme.radiusSmall,
                                                    background: theme.cream, border: theme.border,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 28, flexShrink: 0,
                                                }}>🎵</div>
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontFamily: theme.fontDisplay, fontWeight: 800,
                                                    fontSize: 16, color: theme.black, lineHeight: 1.2,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {req.trackName}
                                                </div>
                                                <div style={{
                                                    fontSize: 13, color: theme.muted, marginTop: 2,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {req.trackArtist}
                                                </div>
                                                {req.trackAlbum && (
                                                    <div style={{
                                                        fontSize: 11, color: theme.faint, marginTop: 2,
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {req.trackAlbum}
                                                    </div>
                                                )}
                                            </div>
                                            {statusBadge && (
                                                <div style={{
                                                    padding: '4px 10px', borderRadius: 999, fontSize: 11,
                                                    fontFamily: theme.fontDisplay, fontWeight: 700,
                                                    background: statusBadge.bg, color: statusBadge.fg,
                                                    letterSpacing: '0.5px', textTransform: 'uppercase',
                                                    flexShrink: 0,
                                                }}>{statusBadge.label}</div>
                                            )}
                                        </div>

                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            paddingTop: 10, borderTop: `1px solid ${theme.softViolet}`,
                                        }}>
                                            {req.requestedByProfilePicture ? (
                                                <img src={req.requestedByProfilePicture} alt="" style={{
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    objectFit: 'cover', flexShrink: 0,
                                                }} />
                                            ) : (
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    background: `hsl(${hue}, 65%, 55%)`, color: '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontFamily: theme.fontDisplay, fontWeight: 800, fontSize: 13,
                                                    flexShrink: 0,
                                                }}>{initial}</div>
                                            )}
                                            <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: theme.muted, fontFamily: theme.fontBody }}>
                                                Requested by <span style={{ color: theme.black, fontWeight: 600 }}>{req.requestedByName}</span>
                                                <span style={{ color: theme.faint }}> · {new Date(req.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {isPending && (
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    onClick={() => openSongRequest(req)}
                                                    disabled={inCatalog}
                                                    title={inCatalog ? 'Already in catalog' : 'Open in Add Song flow'}
                                                    style={{
                                                        flex: 1, padding: '10px 14px', fontSize: 13, fontWeight: 700,
                                                        fontFamily: theme.fontDisplay,
                                                        cursor: inCatalog ? 'not-allowed' : 'pointer',
                                                        border: theme.border, borderRadius: theme.radius,
                                                        background: inCatalog ? theme.cream : theme.softViolet,
                                                        color: theme.black,
                                                        opacity: inCatalog ? 0.6 : 1,
                                                    }}
                                                >
                                                    {inCatalog ? 'Already in catalog' : 'Add to library'}
                                                </button>
                                                <button
                                                    onClick={() => dismissSongRequest(req.id)}
                                                    style={{
                                                        padding: '10px 14px', fontSize: 13, fontWeight: 700,
                                                        fontFamily: theme.fontDisplay, cursor: 'pointer',
                                                        border: theme.border, borderRadius: theme.radius,
                                                        background: theme.cream, color: theme.black,
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#fee'; e.currentTarget.style.color = '#c33' }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = theme.cream; e.currentTarget.style.color = theme.black }}
                                                >
                                                    Dismiss
                                                </button>
                                            </div>
                                        )}
                                    </section>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {adminTab === 'awards' && <AdminAwardsTab />}

            {/* ── Voice Audition Booth ── */}
            <div style={{ marginTop: 32, ...theme.card, border: theme.border, padding: '16px 20px' }}>
                <button
                    onClick={() => setAuditionOpen(o => !o)}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                        fontFamily: theme.fontDisplay, fontWeight: 700, fontSize: 13,
                        color: theme.black, letterSpacing: '0.5px', textTransform: 'uppercase',
                    }}
                >
                    <span>🎙️ Voice Audition Booth</span>
                    <span style={{ fontSize: 18, opacity: 0.6 }}>{auditionOpen ? '▾' : '▸'}</span>
                </button>

                {auditionOpen && (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5, fontFamily: theme.fontBody }}>
                            Hear your voice through any artist preset or the exact effects you've set on a song
                            in your library. Record a snippet, then A/B different presets by clicking them while
                            it replays.
                        </div>

                        {/* Input / Output devices */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ fontSize: 9, fontFamily: theme.fontDisplay, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                Devices
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select
                                    value={selectedMic}
                                    onChange={e => setSelectedMic(e.target.value)}
                                    style={{ flex: 1, minWidth: 0, padding: '8px 10px', fontSize: 12, ...theme.select }}
                                >
                                    {mics.length === 0 && <option value="">No microphones detected</option>}
                                    {mics.map(m => <option key={m.deviceId} value={m.deviceId}>🎤 {m.label || 'Mic'}</option>)}
                                </select>
                                <select
                                    value={selectedSpeaker}
                                    onChange={e => setSelectedSpeaker(e.target.value)}
                                    style={{ flex: 1, minWidth: 0, padding: '8px 10px', fontSize: 12, ...theme.select }}
                                >
                                    {speakers.length === 0 && <option value="">No output devices detected</option>}
                                    {speakers.map(s => <option key={s.deviceId} value={s.deviceId}>🔊 {s.label || 'Speaker'}</option>)}
                                </select>
                            </div>
                            {auditionLive && (
                                <div style={{ fontSize: 10, color: theme.faint, fontFamily: theme.fontBody }}>
                                    Changing a device will swap the live stream automatically.
                                </div>
                            )}
                        </div>

                        {/* Source tabs */}
                        <div style={{ display: 'flex', gap: 6 }}>
                            {([
                                { id: 'preset' as const, label: 'Artist Preset' },
                                { id: 'song' as const, label: 'Song Role' },
                            ]).map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setAuditionSource(opt.id)}
                                    style={{
                                        flex: 1, padding: '10px 14px', fontSize: 12, fontWeight: 700,
                                        fontFamily: theme.fontDisplay, cursor: 'pointer',
                                        border: auditionSource === opt.id ? `2px solid ${theme.softViolet}` : theme.borderThin,
                                        borderRadius: theme.radiusSmall,
                                        background: auditionSource === opt.id ? `${theme.softViolet}18` : theme.cream,
                                        color: auditionSource === opt.id ? theme.softViolet : theme.muted,
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Preset grid */}
                        {auditionSource === 'preset' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {PRESET_CATEGORIES.map(cat => {
                                    const presets = BUILT_IN_PRESETS.filter(p => p.category === cat.key)
                                    if (!presets.length) return null
                                    return (
                                        <div key={cat.key}>
                                            <div style={{
                                                fontSize: 9, color: theme.faint, textTransform: 'uppercase',
                                                letterSpacing: '1.5px', fontFamily: theme.fontDisplay, fontWeight: 700, marginBottom: 4,
                                            }}>
                                                {cat.label}
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {presets.map(preset => {
                                                    const isActive = auditionPresetId === preset.id
                                                    const imgUrl = preset.artistId && !presetImageErrors.has(preset.artistId) ? presetImages[preset.artistId] : null
                                                    return (
                                                        <button
                                                            key={preset.id}
                                                            onClick={() => selectAuditionPreset(preset.id)}
                                                            title={preset.description}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: 5,
                                                                padding: '3px 10px 3px 4px',
                                                                borderRadius: 99,
                                                                fontSize: 10,
                                                                fontFamily: theme.fontDisplay, fontWeight: 700,
                                                                border: isActive ? `2px solid ${theme.softViolet}` : theme.borderThin,
                                                                background: isActive ? `${theme.softViolet}18` : theme.creamDark,
                                                                color: isActive ? theme.softViolet : theme.muted,
                                                                cursor: 'pointer', whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {imgUrl ? (
                                                                <img
                                                                    src={imgUrl}
                                                                    alt={preset.name}
                                                                    onError={() => preset.artistId && setPresetImageErrors(prev => new Set(prev).add(preset.artistId!))}
                                                                    style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', border: isActive ? `2px solid ${theme.softViolet}` : theme.borderThin }}
                                                                />
                                                            ) : (
                                                                <div style={{
                                                                    width: 18, height: 18, borderRadius: '50%',
                                                                    background: isActive ? theme.softViolet : theme.faint,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 8, color: theme.white, fontWeight: 700,
                                                                }}>
                                                                    {preset.name.charAt(0)}
                                                                </div>
                                                            )}
                                                            {preset.name}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Song-role picker */}
                        {auditionSource === 'song' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <input
                                    type="text"
                                    value={auditionSongQuery}
                                    onChange={e => setAuditionSongQuery(e.target.value)}
                                    placeholder="Search by song, artist, or album…"
                                    style={{ ...theme.select, padding: '8px 12px', fontSize: 12 }}
                                />
                                <div style={{
                                    maxHeight: 280, overflowY: 'auto',
                                    border: theme.borderThin, borderRadius: theme.radiusSmall,
                                    background: theme.cream,
                                }}>
                                    {(() => {
                                        const q = auditionSongQuery.trim().toLowerCase()
                                        const matches = catalog.filter(s => {
                                            if (!s.voiceEffects) return false
                                            if (!q) return true
                                            return (s.name || '').toLowerCase().includes(q)
                                                || (s.artist || '').toLowerCase().includes(q)
                                                || (s.albumName || '').toLowerCase().includes(q)
                                        }).slice(0, 80)
                                        if (!matches.length) {
                                            return (
                                                <div style={{ padding: 16, fontSize: 11, color: theme.muted, fontFamily: theme.fontBody, textAlign: 'center' }}>
                                                    {q ? 'No matching songs.' : 'No songs with voice effects.'}
                                                </div>
                                            )
                                        }
                                        return matches.map(song => {
                                            const fxArr = Array.isArray(song.voiceEffects) ? song.voiceEffects : [song.voiceEffects!]
                                            const roleLabels = (song.roles && song.roles.length) ? song.roles : [song.artist || 'Main']
                                            const isSelectedSong = auditionSongTrackId === song.trackId
                                            return (
                                                <div key={song.trackId} style={{
                                                    padding: '10px 12px',
                                                    borderBottom: theme.borderThin,
                                                    background: isSelectedSong ? `${theme.softViolet}10` : 'transparent',
                                                }}>
                                                    <div style={{ fontSize: 12, fontFamily: theme.fontDisplay, fontWeight: 700, color: theme.black, marginBottom: 2 }}>
                                                        {song.name}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: theme.muted, fontFamily: theme.fontBody, marginBottom: 6 }}>
                                                        {song.artist}{song.albumName ? ` · ${song.albumName}` : ''}
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {roleLabels.map((roleName, idx) => {
                                                            if (!fxArr[idx]) return null
                                                            const isActiveChip = isSelectedSong && auditionSongRoleIdx === idx
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => selectAuditionSongRole(song.trackId, idx)}
                                                                    style={{
                                                                        padding: '4px 10px', fontSize: 10, fontWeight: 700,
                                                                        fontFamily: theme.fontDisplay, cursor: 'pointer',
                                                                        borderRadius: 99,
                                                                        border: isActiveChip ? `2px solid ${theme.softViolet}` : theme.borderThin,
                                                                        background: isActiveChip ? `${theme.softViolet}18` : theme.creamDark,
                                                                        color: isActiveChip ? theme.softViolet : theme.muted,
                                                                    }}
                                                                >
                                                                    {roleName}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Autotune key / mode */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ fontSize: 9, fontFamily: theme.fontDisplay, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                Autotune target scale
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select
                                    value={auditionKey}
                                    onChange={e => setAuditionKey(parseInt(e.target.value))}
                                    style={{ flex: 2, minWidth: 0, padding: '8px 10px', fontSize: 12, ...theme.select }}
                                >
                                    <option value={-1}>Chromatic (snap to any semitone)</option>
                                    {KEY_NAMES.map((k, i) => <option key={i} value={i}>Key of {k}</option>)}
                                </select>
                                <select
                                    value={auditionMode}
                                    onChange={e => setAuditionMode(parseInt(e.target.value))}
                                    disabled={auditionKey < 0}
                                    style={{
                                        flex: 1, minWidth: 0, padding: '8px 10px', fontSize: 12, ...theme.select,
                                        opacity: auditionKey < 0 ? 0.4 : 1,
                                        cursor: auditionKey < 0 ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    <option value={1}>Major</option>
                                    <option value={0}>Minor</option>
                                </select>
                            </div>
                            <div style={{ fontSize: 10, color: theme.faint, fontFamily: theme.fontBody }}>
                                <strong>Chromatic</strong> snaps every note to the nearest semitone — classic T-Pain, works regardless of what you're singing.
                                Picking a <strong>Key + Mode</strong> restricts snap targets to that scale's notes only (more musical, more natural-sounding for melodies).
                                Selecting a Song Role above will auto-load that song's stored key.
                            </div>
                        </div>

                        {/* Fingerprint strip */}
                        <div style={{
                            padding: '10px 14px',
                            background: theme.creamDark,
                            border: theme.borderThin,
                            borderRadius: theme.radiusSmall,
                            fontSize: 11, fontFamily: 'monospace',
                            color: theme.black,
                            lineHeight: 1.5,
                        }}>
                            <div style={{ fontSize: 9, fontFamily: theme.fontDisplay, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>
                                Currently loaded
                            </div>
                            {(() => {
                                const fx = getAuditionEffects()
                                if (!fx) {
                                    return <span style={{ color: theme.faint }}>Pick a preset or song role above.</span>
                                }
                                let label = ''
                                if (auditionSource === 'preset') {
                                    const p = BUILT_IN_PRESETS.find(pr => pr.id === auditionPresetId)
                                    label = p?.name || '(preset)'
                                } else {
                                    const song = catalog.find(s => s.trackId === auditionSongTrackId)
                                    const roles = (song?.roles && song.roles.length) ? song.roles : [song?.artist || 'Main']
                                    const roleName = roles[auditionSongRoleIdx] || 'Main'
                                    label = `${roleName} — ${song?.name || ''}`
                                }
                                return (
                                    <span>
                                        <span style={{ color: theme.softViolet, fontWeight: 700 }}>{label}</span>
                                        <span style={{ color: theme.muted }}> · {auditionFingerprint()}</span>
                                    </span>
                                )
                            })()}
                        </div>

                        {/* Transport row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <button
                                onClick={toggleAuditionLive}
                                disabled={!selectedMic}
                                style={{
                                    padding: '10px 18px', fontSize: 13, fontWeight: 800,
                                    fontFamily: theme.fontDisplay,
                                    cursor: selectedMic ? 'pointer' : 'not-allowed',
                                    opacity: selectedMic ? 1 : 0.4,
                                    border: `2px solid ${auditionLive ? '#e55' : theme.mintGreen}`,
                                    borderRadius: theme.radius,
                                    background: auditionLive ? '#fee' : `${theme.mintGreen}22`,
                                    color: auditionLive ? '#c33' : theme.black,
                                }}
                            >
                                {auditionLive ? '■ Stop live' : '● Go live'}
                            </button>

                            <button
                                onClick={toggleAuditionRec}
                                disabled={!auditionLive}
                                style={{
                                    padding: '10px 18px', fontSize: 13, fontWeight: 800,
                                    fontFamily: theme.fontDisplay,
                                    cursor: auditionLive ? 'pointer' : 'not-allowed',
                                    opacity: auditionLive ? 1 : 0.4,
                                    border: `2px solid ${auditionRecording ? '#e55' : theme.softViolet}`,
                                    borderRadius: theme.radius,
                                    background: auditionRecording ? '#fee' : `${theme.softViolet}22`,
                                    color: auditionRecording ? '#c33' : theme.black,
                                }}
                            >
                                {auditionRecording ? `■ Stop rec (${(auditionRecDuration / 1000).toFixed(1)}s)` : '● Record'}
                            </button>

                            {auditionBlob && !auditionPlaying && (
                                <button
                                    onClick={playAuditionSnip}
                                    style={{
                                        padding: '10px 18px', fontSize: 13, fontWeight: 800,
                                        fontFamily: theme.fontDisplay, cursor: 'pointer',
                                        border: `2px solid ${theme.softViolet}`,
                                        borderRadius: theme.radius,
                                        background: `${theme.softViolet}18`,
                                        color: theme.softViolet,
                                    }}
                                >
                                    ▶ Play snippet ({(auditionSnipDuration / 1000).toFixed(1)}s)
                                </button>
                            )}

                            {auditionPlaying && (
                                <button
                                    onClick={stopAuditionSnip}
                                    style={{
                                        padding: '10px 18px', fontSize: 13, fontWeight: 800,
                                        fontFamily: theme.fontDisplay, cursor: 'pointer',
                                        border: `2px solid #e55`,
                                        borderRadius: theme.radius,
                                        background: '#fee',
                                        color: '#c33',
                                    }}
                                >
                                    ■ Stop ({Math.floor(auditionPlayProgress * 100)}%)
                                </button>
                            )}

                            {auditionBlob && (
                                <button
                                    onClick={clearAuditionSnip}
                                    style={{
                                        padding: '10px 14px', fontSize: 11, fontWeight: 700,
                                        fontFamily: theme.fontDisplay, cursor: 'pointer',
                                        border: theme.borderThin,
                                        borderRadius: theme.radius,
                                        background: theme.cream,
                                        color: theme.muted,
                                    }}
                                >
                                    ✕ Clear
                                </button>
                            )}

                            {auditionError && (
                                <div style={{ fontSize: 11, color: '#c33', fontFamily: theme.fontBody }}>
                                    {auditionError}
                                </div>
                            )}
                        </div>

                        {/* VU meter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ fontSize: 9, fontFamily: theme.fontDisplay, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '1.5px', minWidth: 30 }}>
                                VU
                            </div>
                            <div style={{
                                flex: 1, height: 12, borderRadius: 6,
                                background: theme.creamDark,
                                border: theme.borderThin,
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    width: `${Math.min(100, auditionLevel * 250)}%`,
                                    height: '100%',
                                    background: auditionRecording ? '#e55' : theme.mintGreen,
                                    transition: 'width 50ms linear',
                                }} />
                            </div>
                            <div style={{ fontSize: 10, fontFamily: 'monospace', color: theme.muted, minWidth: 48, textAlign: 'right' }}>
                                {auditionLevel.toFixed(3)}
                            </div>
                        </div>

                        {/* Spectrum canvas */}
                        <div>
                            <div style={{ fontSize: 9, fontFamily: theme.fontDisplay, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>
                                Output spectrum
                            </div>
                            <canvas
                                ref={auditionCanvasRef}
                                width={760}
                                height={140}
                                style={{
                                    width: '100%', maxWidth: 760, height: 140,
                                    borderRadius: theme.radiusSmall, border: theme.border,
                                    background: '#0a0a14', display: 'block',
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
