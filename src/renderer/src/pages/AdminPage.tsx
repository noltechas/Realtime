import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import { useApp, NEON_COLORS } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { VoiceEffects, DEFAULT_VOICE_EFFECTS, normalizeMicLevel } from '../audio/VoiceEffectsTypes'
import { VoiceEffectsEngine } from '../audio/VoiceEffectsEngine'
import { BUILT_IN_PRESETS, PRESET_CATEGORIES, VocalPreset } from '../audio/VocalPresets'

const SUPABASE_URL = 'https://hnnbxwitjkeijvoldfuv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubmJ4d2l0amtlaWp2b2xkZnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjcwMTQsImV4cCI6MjA5MDUwMzAxNH0.ENzZ2VLxszHr9StjFds06In7CyGkiyPvu6Jh1LUMMvA'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const KEY_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

interface AdminGuest {
    id: string
    name: string
    profilePicture: string | null
}

interface CatalogSong {
    trackId: string; name: string; artist: string; artUrl: string
    albumName: string; durationMs: number; instrumentalPath: string
    vocalsPath?: string
    youtubeUrl?: string
    voiceEffects?: VoiceEffects | VoiceEffects[]
    roles?: string[]
    lyrics?: any[]
    spotifyData?: { key?: number; mode?: number; tempo?: number; releaseDate?: string; instrumentalness?: number; popularity?: number }
}

interface PendingSong {
    track: any
    configs: VoiceEffects[]
    roles: string[]
    lyrics: any[]
    activeRoleTab: number
    spotifyData?: {
        key?: number
        mode?: number
        tempo?: number
        releaseDate?: string
        instrumentalness?: number
        popularity?: number
    }
}

export default function AdminPage() {
    const { state, dispatch } = useApp()
    const theme = useTheme()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [catalog, setCatalog] = useState<CatalogSong[]>([])
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

    const [mics, setMics] = useState<MediaDeviceInfo[]>([])
    const [selectedMic, setSelectedMic] = useState('')
    const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([])
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

    const [adminTab, setAdminTab] = useState<'songs' | 'guests'>('songs')
    const [guests, setGuests] = useState<AdminGuest[]>([])
    const [editingGuestId, setEditingGuestId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editPicture, setEditPicture] = useState('')
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
    const guestChannelRef = useRef<RealtimeChannel | null>(null)

    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (state.spotifyToken || !state.spotifyClientId || !state.spotifyClientSecret) return
        window.electronAPI.spotifyAuth(state.spotifyClientId, state.spotifyClientSecret).then((auth: any) => {
            if (auth?.access_token) dispatch({ type: 'SET_TOKEN', payload: auth.access_token })
        }).catch(() => { })
    }, [state.spotifyToken, state.spotifyClientId, state.spotifyClientSecret, dispatch])

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
        navigator.mediaDevices.enumerateDevices().then(devices => {
            const audioIns = devices.filter(d => d.kind === 'audioinput')
            const audioOuts = devices.filter(d => d.kind === 'audiooutput')
            setMics(audioIns)
            if (audioIns.length) setSelectedMic(audioIns[0].deviceId)
            setSpeakers(audioOuts)
            const defaultOut = audioOuts.find(d => d.deviceId === 'default') || audioOuts[0]
            if (defaultOut) setSelectedSpeaker(defaultOut.deviceId)
        })
    }, [])

    useEffect(() => {
        engineRef.current = new VoiceEffectsEngine()
        return () => { engineRef.current?.destroy(); engineRef.current = null }
    }, [])

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
        setLyricsError(null)
        setPending({
            track: mockTrack,
            configs: editConfigs,
            roles: song.roles || [],
            lyrics: song.lyrics || [],
            activeRoleTab: 0,
            spotifyData: song.spotifyData
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
        if (token) {
            const [audioFeatures, trackData] = await Promise.all([
                window.electronAPI.spotifyAudioFeatures(track.id, token).catch((err: any) => { console.error('Audio features error:', err); return null }),
                window.electronAPI.spotifyTrack(track.id, token).catch((err: any) => { console.error('Track data error:', err); return null })
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
        }

        if (isPlayingSnippet) stopSnippetPlayback()
        if (isTesting) toggleTesting()
        setRecordedBlob(null)
        setRecordingDuration(0)
        setSnippetDuration(0)

        let configs = [defaultConfig]
        let roles: string[] = []
        let lyrics: any[] = []
        const activeRoleTab = 0

        const existing = catalog.find(c => c.trackId === track.id)
        if (existing) {
            if (existing.roles) roles = existing.roles
            if (existing.lyrics) lyrics = existing.lyrics
            if (existing.voiceEffects) {
                const raw = Array.isArray(existing.voiceEffects) ? existing.voiceEffects : [existing.voiceEffects]
                configs = (normalizeMicLevel(raw) as VoiceEffects[]).slice()
            }
            while (configs.length < Math.max(1, roles.length)) configs.push(JSON.parse(JSON.stringify(configs[0])))
        }

        setLyricsError(null)
        setPending({ track, configs, roles, lyrics, activeRoleTab, spotifyData })
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
                setPending(p => p ? { ...p, lyrics: data.lines.map((l: any) => ({ startTimeMs: parseInt(l.startTimeMs), words: l.words, roleIndex: 0 })) } : p)
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
                    {adminTab === 'songs' ? 'Add songs, sculpt effects rack, and manage the catalog' : 'View and manage guests in the current session'}
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {(['songs', 'guests'] as const).map(tab => (
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
                        {tab === 'songs' ? 'Songs' : `Guests${guests.length ? ` (${guests.length})` : ''}`}
                    </button>
                ))}
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

                            {catalog.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px 0', color: theme.faint, fontSize: 13, fontFamily: theme.fontBody }}>
                                    No songs yet.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                                    {catalog.map(song => (
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
                                    ))}
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
        </div>
    )
}
