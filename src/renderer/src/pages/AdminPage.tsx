import { useState, useCallback, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { VoiceEffects, DEFAULT_VOICE_EFFECTS, normalizeMicLevel } from '../audio/VoiceEffectsTypes'
import { VoiceEffectsEngine } from '../audio/VoiceEffectsEngine'
import { BUILT_IN_PRESETS, PRESET_CATEGORIES, VocalPreset } from '../audio/VocalPresets'

const KEY_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

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
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [catalog, setCatalog] = useState<CatalogSong[]>([])
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [pending, setPending] = useState<PendingSong | null>(null)

    // File upload state
    const [pendingAudioFile, setPendingAudioFile] = useState<{ name: string; path: string } | null>(null)
    const [pendingVocalsFile, setPendingVocalsFile] = useState<{ name: string; path: string } | null>(null)
    const [existingInstrumental, setExistingInstrumental] = useState(false)
    const [existingVocals, setExistingVocals] = useState(false)
    const [youtubeUrl, setYoutubeUrl] = useState('')

    // Lyrics & Roles state
    const [fetchingLyrics, setFetchingLyrics] = useState(false)
    const [lyricsError, setLyricsError] = useState<string | null>(null)
    const [newRoleName, setNewRoleName] = useState('')

    // Live Testing
    const [mics, setMics] = useState<MediaDeviceInfo[]>([])
    const [selectedMic, setSelectedMic] = useState('')
    const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([])
    const [selectedSpeaker, setSelectedSpeaker] = useState('')
    const [isTesting, setIsTesting] = useState(false)
    const [testLevel, setTestLevel] = useState(0)
    const engineRef = useRef<VoiceEffectsEngine | null>(null)
    const animRef = useRef<number>(0)

    // Snippet Recording
    const [isRecording, setIsRecording] = useState(false)
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
    const [isPlayingSnippet, setIsPlayingSnippet] = useState(false)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const [snippetDuration, setSnippetDuration] = useState(0)
    const [playbackProgress, setPlaybackProgress] = useState(0)
    const [snippetError, setSnippetError] = useState<string | null>(null)
    const recordingTimerRef = useRef<number>(0)
    const playbackTimerRef = useRef<number>(0)

    // Vocal Presets — tracked per role index
    const [activePresetIds, setActivePresetIds] = useState<(string | null)[]>([null])
    const [presetImages, setPresetImages] = useState<Record<string, string>>({})
    const [presetImageErrors, setPresetImageErrors] = useState<Set<string>>(new Set())

    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    // Ensure we have a Spotify token when credentials exist (so preset images can load)
    useEffect(() => {
        if (state.spotifyToken || !state.spotifyClientId || !state.spotifyClientSecret) return
        window.electronAPI.spotifyAuth(state.spotifyClientId, state.spotifyClientSecret).then((auth: any) => {
            if (auth?.access_token) dispatch({ type: 'SET_TOKEN', payload: auth.access_token })
        }).catch(() => { })
    }, [state.spotifyToken, state.spotifyClientId, state.spotifyClientSecret, dispatch])

    // Fetch artist images for presets when Spotify token is available
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
        // Init engine for testing
        engineRef.current = new VoiceEffectsEngine()
        return () => { engineRef.current?.destroy(); engineRef.current = null }
    }, [])

    const loadCatalog = async () => {
        if (window.electronAPI) {
            const cat = await window.electronAPI.listCatalog()
            setCatalog(cat)
        }
    }

    const handleEditCatalogSong = (song: CatalogSong) => {
        // Mock a Spotify track object enough to make the editor work
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
            // Fetch audio features and track data in parallel, each with own error handling
            const [audioFeatures, trackData] = await Promise.all([
                window.electronAPI.spotifyAudioFeatures(track.id, token).catch((err: any) => {
                    console.error('Audio features error:', err)
                    return null
                }),
                window.electronAPI.spotifyTrack(track.id, token).catch((err: any) => {
                    console.error('Track data error:', err)
                    return null
                })
            ])

            console.log('Audio features response:', audioFeatures)
            console.log('Track data response:', trackData)

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
            if (trackData?.album?.release_date) {
                spotifyData.releaseDate = trackData.album.release_date
            }
            if (typeof trackData?.popularity === 'number') {
                spotifyData.popularity = trackData.popularity
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
        let activeRoleTab = 0

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

                // Start drawing meter
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

    // Call engine apply whenever config changes while testing or playing snippet
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
            draft.pitchCorrection = { ...preset.effects.pitchCorrection }
            draft.compressor = { ...preset.effects.compressor }
            draft.eq = { ...preset.effects.eq }
            draft.chorus = { ...preset.effects.chorus }
            draft.delay = { ...preset.effects.delay }
            draft.reverb = { ...preset.effects.reverb }
            draft.distortion = { ...preset.effects.distortion }
            draft.noiseGate = { ...preset.effects.noiseGate }
            draft.micLevel = 1.0
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
            const data = await window.electronAPI.fetchLyrics({
                trackId,
                trackName,
                artistName,
                albumName,
                durationMs
            })
            if (data && data.lines && data.lines.length > 0) {
                setPending(p => p ? { ...p, lyrics: data.lines.map((l: any) => ({ startTimeMs: parseInt(l.startTimeMs), words: l.words, roleIndex: 0 })) } : p)
                setLyricsError(null)
                console.debug('[Admin] Lyrics fetched successfully', { trackId, trackName, lineCount: data.lines.length })
            } else {
                const errMsg = data?.message || (data?.error ? String(data.error) : null)
                setLyricsError(errMsg)
                console.debug('[Admin] No lyrics generated for this track', {
                    trackId,
                    trackName,
                    hasData: !!data,
                    hasLines: !!(data?.lines),
                    lineCount: data?.lines?.length ?? 0,
                    apiError: data?.error,
                    rawKeys: data ? Object.keys(data) : []
                })
            }
        } catch (err) {
            setLyricsError(String(err))
            console.error('[Admin] Error fetching lyrics', { trackId, trackName, err })
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

            // Cycle: 0 -> 1 -> ... -> r.length - 1 -> -1 (ALL) -> 0
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

            // Split by parentheses, preserving them
            const parts = l.words.split(/(\([^)]+\))/).map((s: string) => s.trim()).filter(Boolean)
            if (parts.length <= 1) return p

            const newLyrics = [...p.lyrics]
            const newLines = parts.map((part: string, idx: number) => ({
                ...l,
                words: part,
                // Automatically assign roles incrementally for convenience, but keep original role for first split
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
        if (needsAudio) return // Can't save without an instrumental

        setUploading(true)
        const track = pending.track

        // Import new audio file if selected
        if (pendingAudioFile) {
            const importRes = await window.electronAPI.importAudio(pendingAudioFile.path, track.id, 'instrumental')
            if (importRes.error) {
                console.error('Import error:', importRes.error)
                setUploading(false)
                return
            }
        }

        if (pendingVocalsFile) {
            const importRes = await window.electronAPI.importAudio(pendingVocalsFile.path, track.id, 'vocals')
            if (importRes.error) {
                console.error('Vocals import error:', importRes.error)
            }
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

    // Helper components for the rack UI
    const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={onClick}>
            <div style={{ width: 32, height: 18, borderRadius: 10, background: on ? 'var(--emerald)' : 'var(--surface-3)', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 14, height: 14, background: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, opacity: on ? 1 : 0.6 }}>{label}</span>
        </div>
    )

    const Slider = ({ label, val, min, max, unit, onChange }: { label: string; val: number; min: number; max: number; unit: string; onChange: (v: number) => void }) => (

        <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, opacity: 0.8 }}>
                <span>{label}</span>
                <span>{val}{unit}</span>
            </div>
            <input type="range" value={val} min={min} max={max} step={max - min > 10 ? 1 : 0.1}
                onChange={e => onChange(parseFloat(e.target.value))}
                style={{ width: '100%', height: 4, accentColor: 'var(--violet)' }} />
        </div>
    )

    return (
        <div className="page anim-enter">
            <div style={{ marginBottom: 36, paddingTop: 16 }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.8px', marginBottom: 6 }}>
                    Admin
                </h1>
                <p style={{ color: 'var(--white-muted)', fontSize: 14 }}>
                    Add songs, sculpt effects rack, and manage the catalog
                </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                {/* Left Column: Search & Catalog */}
                {!pending && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, minWidth: 320 }}>
                        <section className="surface" style={{ padding: '24px 28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎵</div>
                                <div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Add Song</div>
                                    <div style={{ fontSize: 11, color: 'var(--white-faint)' }}>Search Spotify</div>
                                </div>
                            </div>
                            <input className="field" placeholder="Search..." value={query} onChange={(e) => { setQuery(e.target.value); setLyricsError(null); setPending(null) }} style={{ fontSize: 14, marginBottom: results.length ? 16 : 0 }} />
                            {loading && <div className="spinner" style={{ margin: '16px auto' }} />}
                            {!pending && results.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
                                    {results.map((track: any) => {
                                        const art = track.album?.images?.[track.album.images.length - 1]?.url
                                        const inCat = isInCatalog(track.id)
                                        return (
                                            <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)', cursor: inCat ? 'default' : 'pointer' }} onClick={() => !inCat && selectTrack(track)}>
                                                {art && <img src={art} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--white-faint)' }}>{track.artists?.map((a: any) => a.name).join(', ')}</div>
                                                </div>
                                                {inCat ? <span className="tag tag--emerald" style={{ fontSize: 10 }}>✓ In Catalog</span> : <span style={{ fontSize: 11, color: 'var(--white-muted)' }}>Configure →</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </section>

                        {/* Catalog */}
                        <section className="surface" style={{ padding: '24px 28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(129,140,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📚</div>
                                <div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Song Catalog</div>
                                    <div style={{ fontSize: 11, color: 'var(--white-faint)' }}>{catalog.length} songs ready</div>
                                </div>
                            </div>
                            {catalog.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--white-faint)', fontSize: 13 }}>No songs yet.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                                    {catalog.map(song => (
                                        <div key={song.trackId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)' }}>
                                            {song.artUrl && <img src={song.artUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>{song.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--white-faint)' }}>{song.artist}</div>
                                            </div>
                                            <button className="btn btn--icon" style={{ width: 28, height: 28, fontSize: 12 }} onClick={() => handleEditCatalogSong(song)} title="Edit Song">✎</button>
                                            <button className="btn btn--icon" style={{ width: 28, height: 28, fontSize: 12 }} onClick={() => window.electronAPI.removeSong(song.trackId).then(loadCatalog)} title="Delete Song">✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* Right Column: Effects Rack */}
                {pending && (
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <section className="surface" style={{ padding: 24, border: '1px solid var(--violet)', boxShadow: '0 0 20px rgba(129,140,248,0.1)', overflow: 'hidden' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                {pending.track.album?.images?.[0]?.url && <img src={pending.track.album.images[0].url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{pending.track.name}</div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-1)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--surface-3)' }}>
                                            <input
                                                type="number"
                                                value={pending.configs[pending.activeRoleTab]?.tempo || 120}
                                                onChange={e => updateActiveConfig(c => { c.tempo = parseInt(e.target.value) || 120 })}
                                                style={{ width: 50, fontSize: 13, background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
                                            />
                                            <span style={{ fontSize: 11, color: 'var(--white-muted)', fontWeight: 600 }}>BPM</span>
                                        </div>

                                        <select
                                            value={pending.configs[pending.activeRoleTab]?.key ?? -1}
                                            onChange={e => updateActiveConfig(c => { c.key = parseInt(e.target.value) })}
                                            style={{ padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--surface-3)', background: 'var(--surface-1)', color: 'white', cursor: 'pointer' }}
                                        >
                                            <option value={-1}>Unknown Key</option>
                                            {KEY_NAMES.map((k, i) => <option key={i} value={i}>{k}</option>)}
                                        </select>

                                        <select
                                            value={pending.configs[pending.activeRoleTab]?.mode ?? 1}
                                            onChange={e => updateActiveConfig(c => { c.mode = parseInt(e.target.value) })}
                                            style={{ padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid var(--surface-3)', background: 'var(--surface-1)', color: 'white', cursor: 'pointer' }}
                                        >
                                            <option value={1}>Major</option>
                                            <option value={0}>Minor</option>
                                        </select>
                                    </div>
                                </div>
                                <button className="btn btn--soft" style={{ fontSize: 12, padding: '8px 16px' }} onClick={() => { if (isPlayingSnippet) stopSnippetPlayback(); if (isTesting) toggleTesting(); setRecordedBlob(null); setLyricsError(null); setPending(null) }}>✕ Close Editor</button>
                            </div>

                            {/* Singer Roles & Lyrics Management */}
                            <div style={{ display: 'flex', gap: 24, marginBottom: 24, padding: 20, background: 'var(--surface-1)', borderRadius: 12 }}>

                                {/* Roles List */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Singer Roles</div>
                                        <div style={{ fontSize: 12, color: 'var(--white-muted)' }}>Define distinct vocal setups for this song.</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {pending.roles.map((role, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                                                background: pending.activeRoleTab === idx ? 'var(--violet)' : 'var(--surface-3)',
                                                color: pending.activeRoleTab === idx ? 'white' : 'var(--white-muted)',
                                                transition: 'all 0.2s',
                                                boxShadow: pending.activeRoleTab === idx ? '0 4px 12px rgba(129,140,248,0.2)' : 'none'
                                            }} onClick={() => setPending(p => p ? { ...p, activeRoleTab: idx } : p)}>
                                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: `hsl(${(idx * 137.5) % 360}, 70%, 50%)`, boxShadow: '0 0 6px rgba(255,255,255,0.2)' }} />
                                                <span style={{ fontWeight: pending.activeRoleTab === idx ? 600 : 500 }}>{role}</span>
                                                <button onClick={(e) => { e.stopPropagation(); handleRemoveRole(idx) }} style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer', marginLeft: 4, padding: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>✕</button>
                                            </div>
                                        ))}
                                        {(pending.roles.length === 0) && (
                                            <div style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, background: 'var(--surface-3)', color: 'var(--white-faint)', opacity: 0.8 }}>
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
                                            placeholder="Add singer role (e.g. Lead, Backup)"
                                            style={{ flex: 1, padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--surface-3)', background: 'var(--surface-2)', color: 'white' }}
                                        />
                                        <button className="btn btn--outline" style={{ fontSize: 13, padding: '8px 16px' }} onClick={handleAddRole}>Add</button>
                                    </div>
                                </div>

                                {/* Lyrics Assign */}
                                <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>Lyrics Assignment</div>
                                            <div style={{ fontSize: 12, color: 'var(--white-muted)', marginTop: 2 }}>Click the color dot to assign a role. Edit or delete text directly.</div>
                                        </div>
                                        <button className="btn btn--soft" style={{ fontSize: 12, padding: '6px 12px' }} onClick={handleFetchLyrics} disabled={fetchingLyrics}>
                                            {fetchingLyrics ? 'Fetching...' : 'Fetch Lyrics'}
                                        </button>
                                    </div>

                                    <div style={{ background: 'var(--surface-2)', borderRadius: 10, height: 400, overflowY: 'auto', border: '1px solid var(--surface-3)', position: 'relative' }}>
                                        {pending.lyrics.length > 0 ? (
                                            <div style={{ padding: '12px 0' }}>
                                                {pending.lyrics.map((line, idx) => (
                                                    <div key={idx} style={{
                                                        display: 'flex', alignItems: 'center', gap: 14, padding: '8px 16px',
                                                        background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                                        transition: 'background 0.2s',
                                                    }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'}>
                                                        {/* Timestamp */}
                                                        <span style={{ fontSize: 11, color: 'var(--white-faint)', width: 44, fontFamily: 'monospace', opacity: 0.7, flexShrink: 0 }}>
                                                            {Math.floor(line.startTimeMs / 60000)}:{(Math.floor(line.startTimeMs / 1000) % 60).toString().padStart(2, '0')}
                                                        </span>

                                                        {/* Role Dot */}
                                                        <div
                                                            style={{
                                                                width: 16, height: 16, borderRadius: '50%', flexShrink: 0, cursor: pending.roles.length > 0 ? 'pointer' : 'default',
                                                                background: pending.roles.length > 0
                                                                    ? (line.roleIndex === -1
                                                                        ? 'linear-gradient(135deg, #FF3366, #33FFCC, #FFD700)'
                                                                        : `hsl(${((line.roleIndex || 0) * 137.5) % 360}, 70%, 50%)`)
                                                                    : 'var(--surface-3)',
                                                                boxShadow: pending.roles.length > 0 ? 'inset 0 0 0 2px rgba(0,0,0,0.2)' : 'none'
                                                            }}
                                                            onClick={(e) => { e.stopPropagation(); cycleLyricRole(idx) }}
                                                            title={pending.roles.length > 0 ? 'Click to reassign role' : 'Add roles first to assign'}
                                                        />

                                                        {/* Editable Text */}
                                                        <input
                                                            type="text"
                                                            value={line.words}
                                                            onChange={e => {
                                                                const newVal = e.target.value;
                                                                setPending(p => p ? { ...p, lyrics: p.lyrics.map((l, i) => i === idx ? { ...l, words: newVal } : l) } : p)
                                                            }}
                                                            style={{
                                                                flex: 1, fontSize: 13, color: 'var(--white)', background: 'transparent', border: '1px solid transparent',
                                                                padding: '4px 8px', borderRadius: 6, transition: 'all 0.2s', outline: 'none'
                                                            }}
                                                            onFocus={e => e.target.style.background = 'rgba(0,0,0,0.2)'}
                                                            onBlur={e => e.target.style.background = 'transparent'}
                                                        />

                                                        {/* Split Button (if splittable) */}
                                                        {line.words.split(/(\([^)]+\))/).filter((s: string) => s.trim()).length > 1 && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleSplitLyric(idx)
                                                                }}
                                                                className="tag tag--emerald"
                                                                style={{
                                                                    border: 'none', cursor: 'pointer', padding: '2px 8px', flexShrink: 0, opacity: 0.8, transition: 'opacity 0.2s', fontSize: 10
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                                onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
                                                                title="Split Parentheses"
                                                            >
                                                                Split
                                                            </button>
                                                        )}

                                                        {/* Delete Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setPending(p => p ? { ...p, lyrics: p.lyrics.filter((_, i) => i !== idx) } : p)
                                                            }}
                                                            style={{
                                                                background: 'none', border: 'none', color: 'var(--white-faint)', cursor: 'pointer',
                                                                padding: 4, flexShrink: 0, opacity: 0.5, transition: 'opacity 0.2s'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                                                            title="Delete Line"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--white-faint)' }}>
                                                {fetchingLyrics ? (
                                                    <div className="spinner" style={{ width: 24, height: 24, marginBottom: 16 }} />
                                                ) : (
                                                    <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
                                                )}
                                                <div style={{ fontSize: 14 }}>{fetchingLyrics ? 'Loading lyrics...' : (lyricsError || 'No lyrics generated for this track.')}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Voice Testing & Snippet Recorder */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, padding: 16, borderRadius: 12, background: 'var(--surface-1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                                        <select className="field" style={{ flex: 1, minWidth: 0, margin: 0, padding: '8px 12px', fontSize: 12 }} value={selectedMic} onChange={e => setSelectedMic(e.target.value)}>
                                            {mics.map(m => <option key={m.deviceId} value={m.deviceId}>🎤 {m.label || 'Mic'}</option>)}
                                        </select>
                                        <select className="field" style={{ flex: 1, minWidth: 0, margin: 0, padding: '8px 12px', fontSize: 12 }} value={selectedSpeaker} onChange={e => setSelectedSpeaker(e.target.value)}>
                                            {speakers.map(s => <option key={s.deviceId} value={s.deviceId}>🔊 {s.label || 'Speaker'}</option>)}
                                        </select>
                                    </div>
                                    <button className={`btn ${isTesting ? 'btn--selected' : 'btn--outline'}`} onClick={toggleTesting} style={{ fontSize: 12, padding: '8px 16px', color: isTesting ? 'var(--emerald)' : '', whiteSpace: 'nowrap' }}>
                                        {isTesting ? '● Live' : 'Test Live'}
                                    </button>
                                    {isTesting && (
                                        <button
                                            className={`btn ${isRecording ? 'btn--selected' : 'btn--outline'}`}
                                            onClick={toggleRecording}
                                            style={{
                                                fontSize: 12, padding: '8px 16px', whiteSpace: 'nowrap',
                                                color: isRecording ? '#ef4444' : '',
                                                borderColor: isRecording ? '#ef4444' : '',
                                            }}
                                        >
                                            {isRecording ? `■ Stop (${(recordingDuration / 1000).toFixed(1)}s)` : '● Record'}
                                        </button>
                                    )}
                                </div>

                                {/* Mic Level Indicator */}
                                <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, bottom: 0,
                                        width: `${Math.min(100, (isTesting ? testLevel * 250 : 0))}%`,
                                        background: isRecording ? '#ef4444' : 'var(--emerald)',
                                        transition: 'width 0.05s ease',
                                        boxShadow: testLevel > 0.05 ? `0 0 8px ${isRecording ? '#ef4444' : 'var(--emerald)'}` : 'none'
                                    }} />
                                </div>

                                {/* Recorded Snippet Playback */}
                                {recordedBlob && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                                        borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--surface-3)',
                                    }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 8,
                                            background: isPlayingSnippet ? 'rgba(167,139,250,0.15)' : 'rgba(129,140,248,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0,
                                        }}>
                                            🎙️
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12 }}>
                                                    Snippet ({(snippetDuration / 1000).toFixed(1)}s)
                                                </span>
                                                <span style={{ fontSize: 10, color: snippetError ? '#f87171' : 'var(--white-faint)' }}>
                                                    {snippetError || (isPlayingSnippet ? 'Playing with effects...' : 'Ready to preview')}
                                                </span>
                                            </div>
                                            {/* Playback Progress Bar */}
                                            <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden', position: 'relative' }}>
                                                <div style={{
                                                    position: 'absolute', top: 0, left: 0, bottom: 0,
                                                    width: `${playbackProgress * 100}%`,
                                                    background: 'var(--violet)',
                                                    transition: isPlayingSnippet ? 'width 0.05s linear' : 'none',
                                                    boxShadow: isPlayingSnippet ? '0 0 6px var(--violet)' : 'none',
                                                }} />
                                            </div>
                                        </div>
                                        {isPlayingSnippet ? (
                                            <button className="btn btn--outline" onClick={stopSnippetPlayback} style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap' }}>
                                                ■ Stop
                                            </button>
                                        ) : (
                                            <button className="btn btn--outline" onClick={playSnippet} style={{ fontSize: 11, padding: '6px 12px', whiteSpace: 'nowrap', color: 'var(--violet)', borderColor: 'var(--violet)' }}>
                                                ▶ Play with Effects
                                            </button>
                                        )}
                                        <button
                                            onClick={discardSnippet}
                                            style={{
                                                background: 'none', border: 'none', color: 'var(--white-faint)',
                                                cursor: 'pointer', padding: 4, fontSize: 12, opacity: 0.5, transition: 'opacity 0.2s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                                            title="Discard recording"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Vocal Presets */}
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--white-soft)' }}>
                                        Vocal Presets
                                    </div>
                                    {activePresetIds[pending.activeRoleTab] && (
                                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(167,139,250,0.15)', color: 'var(--violet)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
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
                                                fontSize: 9, color: 'var(--white-faint)', textTransform: 'uppercase',
                                                letterSpacing: '1px', fontFamily: 'var(--font-display)', fontWeight: 600,
                                                marginBottom: 4,
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
                                                                padding: '3px 8px 3px 3px', borderRadius: 99, fontSize: 10,
                                                                fontFamily: 'var(--font-display)', fontWeight: 600,
                                                                border: isActive
                                                                    ? '1px solid var(--violet)'
                                                                    : '1px solid var(--surface-3)',
                                                                background: isActive
                                                                    ? 'rgba(167, 139, 250, 0.12)'
                                                                    : 'var(--surface-2)',
                                                                color: isActive
                                                                    ? 'var(--violet)'
                                                                    : 'var(--white-muted)',
                                                                cursor: 'pointer', whiteSpace: 'nowrap',
                                                                transition: 'all 0.2s',
                                                                boxShadow: isActive ? '0 0 12px rgba(167,139,250,0.15)' : 'none',
                                                            }}
                                                        >
                                                            {imgUrl ? (
                                                                <img
                                                                    src={imgUrl}
                                                                    alt={preset.name}
                                                                    onError={() => preset.artistId && setPresetImageErrors(prev => new Set(prev).add(preset.artistId!))}
                                                                    style={{
                                                                        width: 20, height: 20, borderRadius: '50%',
                                                                        objectFit: 'cover',
                                                                        border: isActive ? '1.5px solid var(--violet)' : '1.5px solid var(--surface-3)',
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div style={{
                                                                    width: 20, height: 20, borderRadius: '50%',
                                                                    background: isActive ? 'var(--violet)' : 'var(--surface-3)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 9, color: isActive ? 'white' : 'var(--white-faint)',
                                                                    fontWeight: 700,
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

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                {/* Compressor */}
                                <div style={{ background: 'var(--surface-1)', padding: 16, borderRadius: 12, opacity: pending.configs[pending.activeRoleTab].compressor.enabled ? 1 : 0.5 }}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].compressor.enabled} label="Compressor" onClick={() => updateActiveConfig(c => { c.compressor.enabled = !c.compressor.enabled })} />
                                    <div style={{ marginTop: 16, pointerEvents: pending.configs[pending.activeRoleTab].compressor.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Threshold" val={pending.configs[pending.activeRoleTab].compressor.threshold} min={-60} max={0} unit="dB" onChange={v => updateActiveConfig(c => { c.compressor.threshold = v })} />
                                        <Slider label="Ratio" val={pending.configs[pending.activeRoleTab].compressor.ratio} min={1} max={20} unit=":1" onChange={v => updateActiveConfig(c => { c.compressor.ratio = v })} />
                                    </div>
                                </div>

                                {/* EQ */}
                                <div style={{ background: 'var(--surface-1)', padding: 16, borderRadius: 12, opacity: pending.configs[pending.activeRoleTab].eq.enabled ? 1 : 0.5 }}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].eq.enabled} label="Equalizer (3-Band)" onClick={() => updateActiveConfig(c => { c.eq.enabled = !c.eq.enabled })} />
                                    <div style={{ marginTop: 16, pointerEvents: pending.configs[pending.activeRoleTab].eq.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Low Shelf" val={pending.configs[pending.activeRoleTab].eq.lowGain} min={-24} max={24} unit="dB" onChange={v => updateActiveConfig(c => { c.eq.lowGain = v })} />
                                        <Slider label="Mid Peaking" val={pending.configs[pending.activeRoleTab].eq.midGain} min={-24} max={24} unit="dB" onChange={v => updateActiveConfig(c => { c.eq.midGain = v })} />
                                        <Slider label="High Shelf" val={pending.configs[pending.activeRoleTab].eq.highGain} min={-24} max={24} unit="dB" onChange={v => updateActiveConfig(c => { c.eq.highGain = v })} />
                                    </div>
                                </div>

                                {/* Chorus */}
                                <div style={{ background: 'var(--surface-1)', padding: 16, borderRadius: 12, opacity: pending.configs[pending.activeRoleTab].chorus.enabled ? 1 : 0.5 }}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].chorus.enabled} label="Chorus" onClick={() => updateActiveConfig(c => { c.chorus.enabled = !c.chorus.enabled })} />
                                    <div style={{ marginTop: 16, pointerEvents: pending.configs[pending.activeRoleTab].chorus.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Rate" val={pending.configs[pending.activeRoleTab].chorus.rate} min={0.1} max={10} unit="Hz" onChange={v => updateActiveConfig(c => { c.chorus.rate = v })} />
                                        <Slider label="Depth" val={pending.configs[pending.activeRoleTab].chorus.depth} min={0.1} max={1} unit="" onChange={v => updateActiveConfig(c => { c.chorus.depth = v })} />
                                        <Slider label="Mix" val={pending.configs[pending.activeRoleTab].chorus.mix} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { c.chorus.mix = v })} />
                                    </div>
                                </div>

                                {/* Pitch Correction */}
                                <div style={{ background: 'var(--surface-1)', padding: 16, borderRadius: 12, opacity: pending.configs[pending.activeRoleTab]?.pitchCorrection.enabled ? 1 : 0.5 }}>
                                    <Toggle on={pending.configs[pending.activeRoleTab]?.pitchCorrection.enabled ?? false} label="Pitch Correction" onClick={() => updateActiveConfig(c => { c.pitchCorrection.enabled = !c.pitchCorrection.enabled })} />
                                    <div style={{ marginTop: 16, pointerEvents: pending.configs[pending.activeRoleTab]?.pitchCorrection.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Strength (Snap)" val={pending.configs[pending.activeRoleTab]?.pitchCorrection.strength ?? 0} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { c.pitchCorrection.strength = v })} />
                                        <div style={{ fontSize: 10, color: 'var(--emerald)', marginTop: 8 }}>Target Key: {(pending.configs[pending.activeRoleTab]?.key ?? -1) >= 0 ? `${KEY_NAMES[pending.configs[pending.activeRoleTab].key]} ${pending.configs[pending.activeRoleTab].mode ? 'Major' : 'Minor'}` : 'Unknown Key'}</div>
                                    </div>
                                </div>

                                {/* Delay */}
                                <div style={{ background: 'var(--surface-1)', padding: 16, borderRadius: 12, opacity: pending.configs[pending.activeRoleTab].delay.enabled ? 1 : 0.5 }}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].delay.enabled} label="Delay" onClick={() => updateActiveConfig(c => { c.delay.enabled = !c.delay.enabled })} />
                                    <div style={{ marginTop: 16, pointerEvents: pending.configs[pending.activeRoleTab].delay.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Time" val={pending.configs[pending.activeRoleTab].delay.time} min={10} max={1000} unit="ms" onChange={v => updateActiveConfig(c => { c.delay.time = v })} />
                                        <Slider label="Feedback" val={pending.configs[pending.activeRoleTab].delay.feedback} min={0} max={90} unit="%" onChange={v => updateActiveConfig(c => { c.delay.feedback = v })} />
                                        <Slider label="Mix" val={pending.configs[pending.activeRoleTab].delay.mix} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { c.delay.mix = v })} />
                                    </div>
                                </div>

                                {/* Reverb */}
                                <div style={{ background: 'var(--surface-1)', padding: 16, borderRadius: 12, opacity: pending.configs[pending.activeRoleTab].reverb.enabled ? 1 : 0.5 }}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].reverb.enabled} label="Reverb" onClick={() => updateActiveConfig(c => { c.reverb.enabled = !c.reverb.enabled })} />
                                    <div style={{ marginTop: 16, pointerEvents: pending.configs[pending.activeRoleTab].reverb.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Decay" val={pending.configs[pending.activeRoleTab].reverb.decay} min={0.5} max={8.0} unit="s" onChange={v => updateActiveConfig(c => { c.reverb.decay = v })} />
                                        <Slider label="Mix" val={pending.configs[pending.activeRoleTab].reverb.mix} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { c.reverb.mix = v })} />
                                    </div>
                                </div>

                                {/* Distortion */}
                                <div style={{ background: 'var(--surface-1)', padding: 16, borderRadius: 12, opacity: pending.configs[pending.activeRoleTab].distortion?.enabled ? 1 : 0.5 }}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].distortion?.enabled ?? false} label="Distortion" onClick={() => updateActiveConfig(c => { if (!c.distortion) c.distortion = { enabled: false, drive: 0, mix: 0 }; c.distortion.enabled = !c.distortion.enabled })} />
                                    <div style={{ marginTop: 16, pointerEvents: pending.configs[pending.activeRoleTab].distortion?.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Drive" val={pending.configs[pending.activeRoleTab].distortion?.drive ?? 0} min={0} max={100} unit="" onChange={v => updateActiveConfig(c => { if (!c.distortion) c.distortion = { enabled: true, drive: 0, mix: 0 }; c.distortion.drive = v })} />
                                        <Slider label="Mix" val={pending.configs[pending.activeRoleTab].distortion?.mix ?? 0} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { if (!c.distortion) c.distortion = { enabled: true, drive: 0, mix: 0 }; c.distortion.mix = v })} />
                                    </div>
                                </div>

                                {/* Noise Gate */}
                                <div style={{ background: 'var(--surface-1)', padding: 16, borderRadius: 12, opacity: pending.configs[pending.activeRoleTab].noiseGate?.enabled ? 1 : 0.5 }}>
                                    <Toggle on={pending.configs[pending.activeRoleTab].noiseGate?.enabled ?? false} label="Noise Gate" onClick={() => updateActiveConfig(c => { if (!c.noiseGate) c.noiseGate = { enabled: false, threshold: -50 }; c.noiseGate.enabled = !c.noiseGate.enabled })} />
                                    <div style={{ marginTop: 16, pointerEvents: pending.configs[pending.activeRoleTab].noiseGate?.enabled ? 'auto' : 'none' }}>
                                        <Slider label="Threshold" val={pending.configs[pending.activeRoleTab].noiseGate?.threshold ?? -50} min={-100} max={0} unit="dB" onChange={v => updateActiveConfig(c => { if (!c.noiseGate) c.noiseGate = { enabled: true, threshold: -50 }; c.noiseGate.threshold = v })} />
                                    </div>
                                </div>
                            </div>

                            {/* File Upload Areas */}
                            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {/* Audio File Upload */}
                                    <div
                                        onClick={() => pickAudioFile('instrumental')}
                                        style={{
                                            padding: 20, borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                                            border: `2px dashed ${existingInstrumental || pendingAudioFile ? 'var(--emerald)' : 'var(--surface-3)'}`,
                                            background: existingInstrumental || pendingAudioFile ? 'rgba(34,197,94,0.05)' : 'var(--surface-1)',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ fontSize: 24, marginBottom: 6 }}>🎵</div>
                                        {pendingAudioFile ? (
                                            <>
                                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--emerald)' }}>
                                                    {pendingAudioFile.name}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--white-faint)', marginTop: 4 }}>Click to change</div>
                                            </>
                                        ) : existingInstrumental ? (
                                            <>
                                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--emerald)' }}>
                                                    Instrumental uploaded
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--white-faint)', marginTop: 4 }}>Click to replace</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
                                                    Upload Instrumental <span style={{ color: 'var(--pink)', fontSize: 11 }}>(required)</span>
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--white-faint)', marginTop: 4 }}>Click to select an audio file</div>
                                            </>
                                        )}
                                    </div>

                                    {/* Vocals Array Upload */}
                                    <div
                                        onClick={() => pickAudioFile('vocals')}
                                        style={{
                                            padding: 20, borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                                            border: `2px dashed ${existingVocals || pendingVocalsFile ? 'var(--emerald)' : 'var(--surface-3)'}`,
                                            background: existingVocals || pendingVocalsFile ? 'rgba(34,197,94,0.05)' : 'var(--surface-1)',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ fontSize: 24, marginBottom: 6 }}>🎤</div>
                                        {pendingVocalsFile ? (
                                            <>
                                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--emerald)' }}>
                                                    {pendingVocalsFile.name}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--white-faint)', marginTop: 4 }}>Click to change</div>
                                            </>
                                        ) : existingVocals ? (
                                            <>
                                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--emerald)' }}>
                                                    Vocals uploaded
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--white-faint)', marginTop: 4 }}>Click to replace</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
                                                    Upload Vocals <span style={{ color: 'var(--white-faint)', fontSize: 11 }}>(optional)</span>
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--white-faint)', marginTop: 4 }}>Click to select an audio file</div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* YouTube Background Video */}
                                <div style={{
                                    padding: 16, borderRadius: 12,
                                    border: `1px solid ${youtubeUrl.trim() ? 'var(--violet)' : 'var(--surface-3)'}`,
                                    background: youtubeUrl.trim() ? 'rgba(129,140,248,0.05)' : 'var(--surface-1)',
                                    transition: 'all 0.2s',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                        <span style={{ fontSize: 18 }}>🎬</span>
                                        <div>
                                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>
                                                Background Video <span style={{ color: 'var(--white-faint)', fontSize: 11 }}>(optional)</span>
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--white-muted)' }}>Streams from YouTube behind lyrics on stage</div>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={youtubeUrl}
                                        onChange={e => setYoutubeUrl(e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        style={{
                                            width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8,
                                            border: `1px solid ${youtubeUrl.trim() ? 'var(--violet)' : 'var(--surface-3)'}`,
                                            background: 'var(--surface-2)', color: 'white', outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Save Button */}
                            <button
                                className="btn btn--fill"
                                disabled={uploading || (!existingInstrumental && !pendingAudioFile)}
                                onClick={handleSave}
                                style={{ width: '100%', marginTop: 16, fontSize: 14, padding: '16px 0', opacity: uploading || (!existingInstrumental && !pendingAudioFile) ? 0.5 : 1, fontWeight: 700 }}
                            >
                                {uploading ? 'Saving...' : 'Save Song'}
                            </button>
                        </section>
                    </div>
                )}
            </div>

            {/* API Keys Minimal */}
            <section className="surface" style={{ padding: '16px 20px', marginTop: 20, maxWidth: 400 }}>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 8 }}>Spotify Keys</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input className="field" type="password" placeholder="Client ID" value={state.spotifyClientId || ''} onChange={(e) => dispatch({ type: 'SET_SPOTIFY_AUTH', payload: { clientId: e.target.value, clientSecret: state.spotifyClientSecret || '' } })} style={{ fontSize: 11, padding: '6px 10px', height: 28 }} />
                    <input className="field" type="password" placeholder="Client Secret" value={state.spotifyClientSecret || ''} onChange={(e) => dispatch({ type: 'SET_SPOTIFY_AUTH', payload: { clientId: state.spotifyClientId || '', clientSecret: e.target.value } })} style={{ fontSize: 11, padding: '6px 10px', height: 28 }} />
                </div>
            </section>
        </div>
    )
}
