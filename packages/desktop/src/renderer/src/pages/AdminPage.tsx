import { useState, useCallback, useEffect, useRef, CSSProperties, ReactNode } from 'react'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import { useApp, NEON_COLORS } from '../context/AppContext'
import { AdminAwardsTab } from '../awards/AdminAwardsTab'
import { VoiceEffects, DEFAULT_VOICE_EFFECTS, normalizeMicLevel } from '../audio/VoiceEffectsTypes'
import { VoiceEffectsEngine } from '../audio/VoiceEffectsEngine'
import { BUILT_IN_PRESETS, PRESET_CATEGORIES, VocalPreset } from '../audio/VocalPresets'
import { useAudioDevices } from '../hooks/useAudioDevices'
import { resyncLyrics } from '../utils/resyncSyllables'
import { SyllableEditor } from '../components/SyllableEditor'
import { LobbyModeCard } from '../components/LobbyModeCard'
import {
    ArtTile, Avatar, Button, Card, CardHeader, Chip, EmptyState, FaderRow, Field,
    Icon, IconButton, Input, Led, Meter, PageHeader, SearchInput, Select, Spinner, Tabs, Toggle,
} from '../components/ui'

const SUPABASE_URL = 'https://hnnbxwitjkeijvoldfuv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubmJ4d2l0amtlaWp2b2xkZnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjcwMTQsImV4cCI6MjA5MDUwMzAxNH0.ENzZ2VLxszHr9StjFds06In7CyGkiyPvu6Jh1LUMMvA'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const KEY_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']


interface AdminGuest {
    id: string
    name: string
    profilePicture: string | null
    whitePersonCheck: boolean
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

/** Round preset pill with the artist's photo (or initial). Used in the FX
 *  editor and the Audition Booth. */
function PresetChip({ preset, active, imgUrl, onImgError, onClick }: {
    preset: VocalPreset
    active: boolean
    imgUrl: string | null
    onImgError: () => void
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            title={preset.description}
            style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 11px 3px 4px', borderRadius: 99,
                fontSize: 11, fontWeight: 600, fontFamily: 'var(--adm-body)',
                border: active ? '1px solid var(--adm-amber)' : '1px solid var(--adm-line)',
                background: active ? 'var(--adm-amber-soft)' : 'var(--adm-card-2)',
                color: active ? 'var(--adm-amber-bright)' : 'var(--adm-text-2)',
                cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: active ? '0 0 12px -4px var(--adm-amber-glow)' : 'none',
                transition: 'all 0.13s ease',
            }}
        >
            {imgUrl ? (
                <img
                    src={imgUrl}
                    alt={preset.name}
                    onError={onImgError}
                    style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.4)' }}
                />
            ) : (
                <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: active ? 'var(--adm-amber)' : 'var(--adm-text-3)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#0b0d12', fontWeight: 700,
                }}>
                    {preset.name.charAt(0)}
                </span>
            )}
            {preset.name}
        </button>
    )
}

/** One FX-rack module: toggle header + parameter faders, dimmed when off. */
function FxModule({ label, enabled, onToggle, children }: {
    label: string; enabled: boolean; onToggle: () => void; children: ReactNode
}) {
    return (
        <div
            className="adm-well"
            style={{
                padding: 14,
                borderColor: enabled ? 'rgba(245,165,36,0.35)' : undefined,
                boxShadow: enabled ? 'var(--adm-well-shadow), 0 0 16px -8px var(--adm-amber-glow)' : undefined,
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={onToggle}>
                <Toggle on={enabled} onToggle={onToggle} />
                <span style={{
                    fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 13,
                    color: enabled ? 'var(--adm-text)' : 'var(--adm-text-3)',
                }}>
                    {label}
                </span>
            </div>
            <div style={{ marginTop: 12, pointerEvents: enabled ? 'auto' : 'none', opacity: enabled ? 1 : 0.45, transition: 'opacity 0.2s ease' }}>
                {children}
            </div>
        </div>
    )
}

export default function AdminPage() {
    const { state, dispatch } = useApp()
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

    // Per-syllable lyric editor: index of the line whose editor is expanded (one at a
    // time), and the instrumental path used for tap-to-time playback.
    const [editingSyllableLineIdx, setEditingSyllableLineIdx] = useState<number | null>(null)
    const [pendingInstrumentalPath, setPendingInstrumentalPath] = useState<string | null>(null)

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

    // Spotify token fetch/refresh + publish-to-session now live in
    // useKaraokeSession (the app-root session hook) so the token stays fresh on
    // EVERY page, not just while this Admin tab is mounted. Otherwise the
    // companion site / mobile lost song-request search the moment the host left
    // this tab during a live session. `state.spotifyToken` is still populated
    // globally, so the preset-image fetch below keeps working unchanged.

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
                    ctx2d.fillStyle = '#0a0c11'
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
                    ctx2d.fillStyle = '#3ecf8e'
                    for (let i = 0; i < N; i++) {
                        const f = (i / N) * nyquist
                        if (f < fMin) continue
                        const x = ((Math.log(f) - logMin) / (logMax - logMin)) * W
                        const v = auditionSpectrumRef.current[i] / 255
                        const h = v * H
                        ctx2d.fillRect(x, H - h, Math.max(1, W / N), h)
                    }
                    ctx2d.fillStyle = 'rgba(255,255,255,0.5)'
                    ctx2d.font = '10px IBM Plex Mono, monospace'
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
            if (!cancelled) setGuests(list.map(g => ({ id: g.id, name: g.name, profilePicture: g.profilePicture, whitePersonCheck: g.whitePersonCheck })))
        })

        const channel = supabase
            .channel(`admin-guests-${sessionId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'karaoke_guests', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    const r = payload.new as any
                    setGuests(prev => {
                        if (prev.some(g => g.id === r.id)) return prev
                        return [...prev, { id: r.id, name: r.name, profilePicture: r.profile_picture, whitePersonCheck: r.white_person_check !== false }]
                    })
                })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'karaoke_guests', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    const r = payload.new as any
                    setGuests(prev => prev.map(g => g.id === r.id ? { ...g, name: r.name, profilePicture: r.profile_picture, whitePersonCheck: r.white_person_check !== false } : g))
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

    // Per-guest "white person" toggle. ON (default) = their n-word lyric lines
    // are sanitized to "fella(s)" on stage; OFF = the host has cleared them to
    // sing it. Resolved live on the stage, so this re-censors their current
    // song immediately.
    const toggleGuestWhiteCheck = async (id: string, next: boolean) => {
        setGuests(prev => prev.map(g => g.id === id ? { ...g, whitePersonCheck: next } : g))
        await window.electronAPI.updateGuest(id, { whitePersonCheck: next })
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
        let spotifyData: { key?: number; mode?: number; tempo?: number; releaseDate?: string; releaseYear?: number; instrumentalness?: number; popularity?: number } = {}

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
            if (trackData?.album?.release_date) {
                spotifyData.releaseDate = trackData.album.release_date
                const yr = parseInt(String(trackData.album.release_date).slice(0, 4), 10)
                if (Number.isFinite(yr) && yr > 1900) spotifyData.releaseYear = yr
            }
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
        setPendingInstrumentalPath(existing?.instrumentalPath || null)
        setEditingSyllableLineIdx(null)
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
                setPendingInstrumentalPath(filePath)
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

        // Per-syllable lyrics are edited via the line's `words` field; reflow the
        // syllable timing to match so the stage renderer (which shows syllables[])
        // doesn't display stale text (e.g. censored "****" after words say "shit").
        const syncedLyrics = pending.lyrics.length > 0 ? resyncLyrics(pending.lyrics) : pending.lyrics

        if (pendingAudioFile) {
            const importRes = await window.electronAPI.importAudio(pendingAudioFile.path, track.id, 'instrumental', track.duration_ms || 0)
            if (importRes.error) { console.error('Import error:', importRes.error); alert(importRes.error); setUploading(false); return }
        }

        if (pendingVocalsFile) {
            const importRes = await window.electronAPI.importAudio(pendingVocalsFile.path, track.id, 'vocals', track.duration_ms || 0)
            if (importRes.error) { console.error('Vocals import error:', importRes.error); alert(importRes.error); setUploading(false); return }
        }

        await window.electronAPI.saveSongMeta({
            trackId: track.id,
            name: track.name,
            artist: track.artists.map((a: any) => a.name).join(', '),
            artUrl: track.album?.images?.[0]?.url || '',
            albumName: track.album?.name || '',
            durationMs: track.duration_ms || 0,
            roles: pending.roles.length > 0 ? pending.roles : undefined,
            lyrics: syncedLyrics.length > 0 ? syncedLyrics : undefined,
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
        setPendingInstrumentalPath(null)
        setEditingSyllableLineIdx(null)
        setYoutubeUrl('')
        setQuery('')
        setResults([])
        await loadCatalog()
    }

    const isInCatalog = (id: string) => catalog.some(s => s.trackId === id)

    const roleDotColor = (idx: number) => `hsl(${(idx * 137.5) % 360}, 70%, 55%)`

    const activeCfg = pending?.configs[pending.activeRoleTab]

    return (
        <div className="adm-page">
            <PageHeader
                label="Backstage"
                title="Admin"
                desc={
                    adminTab === 'songs' ? 'Import songs, sculpt the FX rack, and manage the catalog'
                        : adminTab === 'guests' ? 'View and manage guests in the current session'
                            : adminTab === 'requests' ? 'Songs guests are asking you to add to the library'
                                : 'Review live vote tallies and reveal winners on the stage'
                }
            />

            {/* Lobby Mode — sits above the tabs so it's reachable from every
                Admin view, and an active lobby is impossible to miss. */}
            <LobbyModeCard />

            {/* Default Microphones */}
            <Card pad={false} style={{ padding: '13px 18px', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <span className="adm-label" style={{ flexShrink: 0 }}>Default Mics</span>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 165 }}>
                            <span style={{
                                width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                                background: NEON_COLORS[i].color,
                                boxShadow: `0 0 6px ${NEON_COLORS[i].colorGlow}`,
                            }} />
                            <Select
                                value={state.micSlots[i]?.micDeviceId || ''}
                                onChange={(e) => dispatch({
                                    type: 'SET_MIC_SLOT',
                                    payload: { index: i, config: { micDeviceId: e.target.value } }
                                })}
                                style={{ flex: 1, minWidth: 0, padding: '5px 26px 5px 9px', fontSize: 11.5 }}
                            >
                                <option value="">Singer {i + 1} — None</option>
                                {mics.map(m => (
                                    <option key={m.deviceId} value={m.deviceId}>
                                        {m.label || 'Mic ' + m.deviceId.slice(0, 6)}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Tabs */}
            <div style={{ marginBottom: 20 }}>
                <Tabs
                    tabs={[
                        { id: 'songs' as const, label: 'Songs', icon: 'music' },
                        { id: 'guests' as const, label: 'Guests', icon: 'users', count: guests.length },
                        { id: 'requests' as const, label: 'Requests', icon: 'inbox', count: pendingRequestCount },
                        { id: 'awards' as const, label: 'Awards', icon: 'trophy', count: state.awards.length },
                    ]}
                    active={adminTab}
                    onChange={setAdminTab}
                />
            </div>

            {/* ═══ Songs Tab ═══ */}
            {adminTab === 'songs' && (
                <>
                    {!pending && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                            {/* Add Song / Search */}
                            <Card>
                                <CardHeader icon="search" label="Import" title="Add Song" desc="Search Spotify for the track to import" />

                                <SearchInput
                                    placeholder="Search Spotify…"
                                    value={query}
                                    onChange={(e) => { setQuery(e.target.value); setLyricsError(null); setPending(null) }}
                                    style={{ marginBottom: results.length || loading ? 14 : 0 }}
                                />

                                {loading && (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
                                        <Spinner />
                                    </div>
                                )}

                                {results.length > 0 && (
                                    <div className="adm-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400 }}>
                                        {results.map((track: any) => {
                                            const art = track.album?.images?.[track.album.images.length - 1]?.url
                                            const inCat = isInCatalog(track.id)
                                            return (
                                                <div
                                                    key={track.id}
                                                    onClick={() => !inCat && selectTrack(track)}
                                                    className={`adm-row${inCat ? '' : ' adm-row--hover'}`}
                                                    style={{ cursor: inCat ? 'default' : 'pointer', background: 'var(--adm-well)' }}
                                                >
                                                    <ArtTile src={art} size={40} radius={6} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</div>
                                                        <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)' }}>{track.artists?.map((a: any) => a.name).join(', ')}</div>
                                                    </div>
                                                    {inCat ? (
                                                        <Chip tone="green" style={{ fontSize: 10.5 }}><Icon name="check" size={10} /> In Catalog</Chip>
                                                    ) : (
                                                        <span style={{ fontSize: 11.5, color: 'var(--adm-text-3)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                            Configure <Icon name="chevronRight" size={12} />
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </Card>

                            {/* Catalog */}
                            <Card>
                                <CardHeader icon="music" label="Library" title="Song Catalog" desc={`${catalog.length} song${catalog.length === 1 ? '' : 's'} ready`} />

                                <SearchInput
                                    placeholder="Filter songs…"
                                    value={catalogFilter}
                                    onChange={(e) => setCatalogFilter(e.target.value)}
                                    style={{ marginBottom: catalog.length ? 14 : 0 }}
                                />

                                {catalog.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--adm-text-3)', fontSize: 13 }}>
                                        No songs yet.
                                    </div>
                                ) : (
                                    <div className="adm-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400 }}>
                                        {catalog.filter(song => {
                                            if (!catalogFilter) return true
                                            const q = catalogFilter.toLowerCase()
                                            return song.name.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q)
                                        }).map(song => {
                                            const hasSyllables = Array.isArray(song.lyrics) && song.lyrics.some((l: any) => Array.isArray(l?.syllables) && l.syllables.length > 0)
                                            return (
                                                <div key={song.trackId} className="adm-row" style={{ background: 'var(--adm-well)' }}>
                                                    <ArtTile src={song.artUrl} size={40} radius={6} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.name}</div>
                                                        <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)' }}>{song.artist}</div>
                                                    </div>
                                                    {hasSyllables && (
                                                        <span
                                                            title="Word-level karaoke timing"
                                                            aria-label="Word-level karaoke timing"
                                                            style={{ display: 'inline-flex', color: 'var(--adm-cyan)', flexShrink: 0 }}
                                                        >
                                                            <Icon name="waveform" size={14} />
                                                        </span>
                                                    )}
                                                    <IconButton icon="pencil" size={28} title="Edit Song" onClick={() => handleEditCatalogSong(song)} />
                                                    <IconButton icon="trash" size={28} danger title="Delete Song" onClick={() => window.electronAPI.removeSong(song.trackId).then(loadCatalog)} />
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* ── Pending song editor ── */}
                    {pending && activeCfg && (
                        <Card style={{ borderColor: 'rgba(245,165,36,0.3)' }}>
                            {/* Track Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                                <ArtTile src={pending.track.album?.images?.[0]?.url} size={54} radius={10} />
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ fontFamily: 'var(--adm-display)', fontWeight: 700, fontSize: 17 }}>
                                        {pending.track.name}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                        {/* BPM */}
                                        <div className="adm-well" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}>
                                            <input
                                                type="number"
                                                className="adm-mono"
                                                value={activeCfg.tempo || 120}
                                                onChange={e => updateActiveConfig(c => { c.tempo = parseInt(e.target.value) || 120 })}
                                                style={{ width: 52, fontSize: 13, background: 'transparent', border: 'none', color: 'var(--adm-text)', outline: 'none' }}
                                            />
                                            <span className="adm-label" style={{ fontSize: 9 }}>BPM</span>
                                        </div>
                                        {/* Key */}
                                        <Select
                                            value={activeCfg.key ?? -1}
                                            onChange={e => updateActiveConfig(c => { c.key = parseInt(e.target.value) })}
                                            style={{ width: 'auto' }}
                                        >
                                            <option value={-1}>Unknown Key</option>
                                            {KEY_NAMES.map((k, i) => <option key={i} value={i}>{k}</option>)}
                                        </Select>
                                        {/* Mode */}
                                        <Select
                                            value={activeCfg.mode ?? 1}
                                            onChange={e => updateActiveConfig(c => { c.mode = parseInt(e.target.value) })}
                                            style={{ width: 'auto' }}
                                        >
                                            <option value={1}>Major</option>
                                            <option value={0}>Minor</option>
                                        </Select>
                                    </div>
                                </div>
                                <Button
                                    icon="x" size="sm"
                                    onClick={() => { if (isPlayingSnippet) stopSnippetPlayback(); if (isTesting) toggleTesting(); setRecordedBlob(null); setLyricsError(null); setPending(null); setEditingSyllableLineIdx(null); setPendingInstrumentalPath(null) }}
                                >
                                    Close
                                </Button>
                            </div>

                            {/* Genres */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                                <span className="adm-label">Genres</span>
                                {GENRE_BUCKETS.map(g => {
                                    const selected = (pending.genres || []).includes(g)
                                    return (
                                        <Chip
                                            key={g}
                                            tone={selected ? 'amber' : undefined}
                                            onClick={() => setPending(p => {
                                                if (!p) return p
                                                const cur = p.genres || []
                                                const next = cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g]
                                                return { ...p, genres: next }
                                            })}
                                        >
                                            {g}
                                        </Chip>
                                    )
                                })}
                            </div>

                            {/* Roles & Lyrics */}
                            <div className="adm-well" style={{ display: 'flex', gap: 22, marginBottom: 18, padding: 16, flexWrap: 'wrap' }}>
                                {/* Roles */}
                                <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div>
                                        <div style={{ fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 14 }}>Singer Roles</div>
                                        <div style={{ fontSize: 12, color: 'var(--adm-text-2)' }}>Define distinct vocal setups.</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {pending.roles.map((role, idx) => {
                                            const active = pending.activeRoleTab === idx
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => setPending(p => p ? { ...p, activeRoleTab: idx } : p)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                        padding: '6px 12px', borderRadius: 'var(--adm-r-sm)',
                                                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                                        border: active ? '1px solid var(--adm-amber)' : '1px solid var(--adm-line)',
                                                        background: active ? 'var(--adm-amber-soft)' : 'var(--adm-card-2)',
                                                        color: active ? 'var(--adm-amber-bright)' : 'var(--adm-text-2)',
                                                        boxShadow: active ? '0 0 12px -4px var(--adm-amber-glow)' : 'none',
                                                        transition: 'all 0.13s ease',
                                                    }}
                                                >
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: roleDotColor(idx), boxShadow: `0 0 5px ${roleDotColor(idx)}` }} />
                                                    {role}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveRole(idx) }}
                                                        title="Remove role"
                                                        style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer', padding: 0, marginLeft: 2, display: 'inline-flex' }}
                                                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                        onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                                                    >
                                                        <Icon name="x" size={11} />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                        {pending.roles.length === 0 && (
                                            <div style={{
                                                padding: '6px 12px', borderRadius: 'var(--adm-r-sm)', fontSize: 12.5,
                                                background: 'var(--adm-card-2)', color: 'var(--adm-text-3)', border: '1px dashed var(--adm-line-strong)',
                                            }}>
                                                Default Voice (No Roles)
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                                        <Input
                                            value={newRoleName}
                                            onChange={e => setNewRoleName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                                            placeholder="Add singer role…"
                                            style={{ flex: 1 }}
                                        />
                                        <Button onClick={handleAddRole}>Add</Button>
                                    </div>
                                </div>

                                {/* Lyrics */}
                                <div style={{ flex: 1.6, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 14 }}>Lyrics Assignment</div>
                                            <div style={{ fontSize: 12, color: 'var(--adm-text-2)' }}>Click the color dot to assign a role.</div>
                                        </div>
                                        <Button size="sm" onClick={handleFetchLyrics} disabled={fetchingLyrics}>
                                            {fetchingLyrics ? 'Fetching…' : 'Fetch Lyrics'}
                                        </Button>
                                    </div>

                                    <div className="adm-scroll" style={{
                                        background: 'var(--adm-card)',
                                        borderRadius: 'var(--adm-r)',
                                        height: 400,
                                        border: '1px solid var(--adm-line)',
                                        position: 'relative',
                                    }}>
                                        {pending.lyrics.length > 0 ? (
                                            <div style={{ padding: '6px 0' }}>
                                                {pending.lyrics.map((line, idx) => (
                                                    <div key={idx}>
                                                        <div
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: 10, padding: '5px 12px',
                                                                background: idx % 2 === 0 ? 'rgba(159,172,202,0.03)' : 'transparent',
                                                            }}
                                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(159,172,202,0.07)'}
                                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? 'rgba(159,172,202,0.03)' : 'transparent'}
                                                        >
                                                            <span className="adm-mono" style={{ fontSize: 10, color: 'var(--adm-text-3)', width: 38, flexShrink: 0 }}>
                                                                {Math.floor(line.startTimeMs / 60000)}:{(Math.floor(line.startTimeMs / 1000) % 60).toString().padStart(2, '0')}
                                                            </span>
                                                            <div
                                                                onClick={(e) => { e.stopPropagation(); cycleLyricRole(idx) }}
                                                                title={pending.roles.length > 0 ? 'Click to reassign role' : 'Add roles first'}
                                                                style={{
                                                                    width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
                                                                    cursor: pending.roles.length > 0 ? 'pointer' : 'default',
                                                                    background: pending.roles.length > 0
                                                                        ? (line.roleIndex === -1 ? 'linear-gradient(135deg, #FF3366, #33FFCC, #FFD700)' : roleDotColor(line.roleIndex || 0))
                                                                        : 'var(--adm-card-2)',
                                                                    border: '1px solid rgba(0,0,0,0.5)',
                                                                    boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset',
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
                                                                    flex: 1, fontSize: 13, color: 'var(--adm-text)', background: 'transparent',
                                                                    border: '1px solid transparent', padding: '2px 6px',
                                                                    borderRadius: 5, outline: 'none', fontFamily: 'var(--adm-body)',
                                                                    transition: 'border-color 0.15s, background 0.15s',
                                                                }}
                                                                onFocus={e => { e.target.style.borderColor = 'rgba(245,165,36,0.5)'; e.target.style.background = 'var(--adm-well)' }}
                                                                onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent' }}
                                                            />
                                                            {Array.isArray(line.syllables) && line.syllables.length > 0 && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setEditingSyllableLineIdx(cur => cur === idx ? null : idx) }}
                                                                    title="Edit per-syllable text & timing"
                                                                    style={{
                                                                        flexShrink: 0, display: 'inline-flex', alignItems: 'flex-end', gap: 1.5,
                                                                        height: 18, padding: '2px 5px', cursor: 'pointer',
                                                                        background: editingSyllableLineIdx === idx ? 'var(--adm-amber-soft)' : 'transparent',
                                                                        border: editingSyllableLineIdx === idx ? '1px solid var(--adm-amber)' : '1px solid transparent',
                                                                        borderRadius: 5,
                                                                    }}
                                                                >
                                                                    {[5, 10, 7, 4].map((h, i) => (
                                                                        <span key={i} style={{ width: 2, height: h, borderRadius: 1, background: 'var(--adm-amber)' }} />
                                                                    ))}
                                                                </button>
                                                            )}
                                                            {line.words.split(/(\([^)]+\))/).filter((s: string) => s.trim()).length > 1 && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleSplitLyric(idx) }}
                                                                    title="Split Parentheses"
                                                                    style={{
                                                                        fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 99,
                                                                        background: 'var(--adm-green-soft)', color: 'var(--adm-green)',
                                                                        border: '1px solid rgba(62,207,142,0.4)',
                                                                        cursor: 'pointer', flexShrink: 0,
                                                                    }}
                                                                >Split</button>
                                                            )}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setPending(p => p ? { ...p, lyrics: p.lyrics.filter((_, i) => i !== idx) } : p) }}
                                                                title="Delete Line"
                                                                style={{
                                                                    background: 'none', border: 'none', color: 'var(--adm-text-3)',
                                                                    cursor: 'pointer', padding: 3, flexShrink: 0, opacity: 0.55,
                                                                    transition: 'opacity 0.15s', display: 'inline-flex',
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                                onMouseLeave={e => e.currentTarget.style.opacity = '0.55'}
                                                            >
                                                                <Icon name="x" size={11} />
                                                            </button>
                                                        </div>
                                                        {editingSyllableLineIdx === idx && Array.isArray(line.syllables) && line.syllables.length > 0 && (
                                                            <SyllableEditor
                                                                line={line}
                                                                nextLineStartMs={pending.lyrics[idx + 1]?.startTimeMs}
                                                                instrumentalPath={pendingInstrumentalPath}
                                                                onChange={({ syllables, words }) => setPending(p => p ? { ...p, lyrics: p.lyrics.map((l, i) => i === idx ? { ...l, syllables, words } : l) } : p)}
                                                                onClose={() => setEditingSyllableLineIdx(null)}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--adm-text-3)', gap: 12 }}>
                                                {fetchingLyrics ? <Spinner size={22} /> : <Icon name="waveform" size={28} />}
                                                <div style={{ fontSize: 13 }}>
                                                    {fetchingLyrics ? 'Loading lyrics…' : (lyricsError || 'No lyrics generated for this track.')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Voice Testing */}
                            <div className="adm-well" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18, padding: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <Select
                                        value={selectedMic}
                                        onChange={e => setSelectedMic(e.target.value)}
                                        style={{ flex: 1, minWidth: 140 }}
                                    >
                                        {mics.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label || 'Mic'}</option>)}
                                    </Select>
                                    <Select
                                        value={selectedSpeaker}
                                        onChange={e => setSelectedSpeaker(e.target.value)}
                                        style={{ flex: 1, minWidth: 140 }}
                                    >
                                        {speakers.map(s => <option key={s.deviceId} value={s.deviceId}>{s.label || 'Speaker'}</option>)}
                                    </Select>
                                    <Button
                                        variant={isTesting ? 'live' : 'secondary'}
                                        size="sm"
                                        onClick={toggleTesting}
                                    >
                                        {isTesting ? <><Led state="on" /> Live</> : 'Test Live'}
                                    </Button>
                                    {isTesting && (
                                        <Button
                                            variant={isRecording ? 'danger' : 'secondary'}
                                            size="sm"
                                            onClick={toggleRecording}
                                        >
                                            {isRecording ? <><Led state="rec" /> Stop ({(recordingDuration / 1000).toFixed(1)}s)</> : 'Record'}
                                        </Button>
                                    )}
                                </div>

                                {/* Mic Level Bar */}
                                <Meter value={isTesting ? testLevel * 2.5 : 0} />

                                {/* Recorded Snippet */}
                                {recordedBlob && (
                                    <div className="adm-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                                        <span style={{ color: 'var(--adm-amber-bright)' }}><Icon name="mic" size={16} /></span>
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: 650, fontSize: 12 }}>
                                                    Snippet ({(snippetDuration / 1000).toFixed(1)}s)
                                                </span>
                                                <span style={{ fontSize: 10.5, color: snippetError ? 'var(--adm-red)' : 'var(--adm-text-3)' }}>
                                                    {snippetError || (isPlayingSnippet ? 'Playing with effects…' : 'Ready to preview')}
                                                </span>
                                            </div>
                                            <Meter value={playbackProgress} progress style={{ height: 6 }} />
                                        </div>
                                        {isPlayingSnippet ? (
                                            <Button size="sm" onClick={stopSnippetPlayback}>Stop</Button>
                                        ) : (
                                            <Button size="sm" icon="play" onClick={playSnippet}>Play</Button>
                                        )}
                                        <IconButton icon="x" size={26} title="Discard" onClick={discardSnippet} />
                                    </div>
                                )}
                            </div>

                            {/* Vocal Presets */}
                            <div style={{ marginBottom: 18 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <span className="adm-label">Vocal Presets</span>
                                    {activePresetIds[pending.activeRoleTab] && (
                                        <Chip tone="amber" style={{ fontSize: 10.5 }}>
                                            {BUILT_IN_PRESETS.find(p => p.id === activePresetIds[pending.activeRoleTab])?.name}
                                        </Chip>
                                    )}
                                </div>

                                {PRESET_CATEGORIES.map(cat => {
                                    const presets = BUILT_IN_PRESETS.filter(p => p.category === cat.key)
                                    if (presets.length === 0) return null
                                    return (
                                        <div key={cat.key} style={{ marginBottom: 8 }}>
                                            <div className="adm-label" style={{ fontSize: 9, marginBottom: 5 }}>{cat.label}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {presets.map(preset => (
                                                    <PresetChip
                                                        key={preset.id}
                                                        preset={preset}
                                                        active={activePresetIds[pending.activeRoleTab] === preset.id}
                                                        imgUrl={preset.artistId && !presetImageErrors.has(preset.artistId) ? presetImages[preset.artistId] || null : null}
                                                        onImgError={() => preset.artistId && setPresetImageErrors(prev => new Set(prev).add(preset.artistId!))}
                                                        onClick={() => applyPreset(preset)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* FX Rack Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                                {/* Compressor */}
                                <FxModule label="Compressor" enabled={activeCfg.compressor.enabled} onToggle={() => updateActiveConfig(c => { c.compressor.enabled = !c.compressor.enabled })}>
                                    <FaderRow label="Threshold" value={activeCfg.compressor.threshold} min={-60} max={0} unit="dB" onChange={v => updateActiveConfig(c => { c.compressor.threshold = v })} />
                                    <FaderRow label="Ratio" value={activeCfg.compressor.ratio} min={1} max={20} unit=":1" onChange={v => updateActiveConfig(c => { c.compressor.ratio = v })} />
                                </FxModule>

                                {/* EQ */}
                                <FxModule label="Equalizer (3-Band)" enabled={activeCfg.eq.enabled} onToggle={() => updateActiveConfig(c => { c.eq.enabled = !c.eq.enabled })}>
                                    <FaderRow label="Low Shelf" value={activeCfg.eq.lowGain} min={-24} max={24} unit="dB" onChange={v => updateActiveConfig(c => { c.eq.lowGain = v })} />
                                    <FaderRow label="Mid Peaking" value={activeCfg.eq.midGain} min={-24} max={24} unit="dB" onChange={v => updateActiveConfig(c => { c.eq.midGain = v })} />
                                    <FaderRow label="High Shelf" value={activeCfg.eq.highGain} min={-24} max={24} unit="dB" onChange={v => updateActiveConfig(c => { c.eq.highGain = v })} />
                                </FxModule>

                                {/* Chorus */}
                                <FxModule label="Chorus" enabled={activeCfg.chorus.enabled} onToggle={() => updateActiveConfig(c => { c.chorus.enabled = !c.chorus.enabled })}>
                                    <FaderRow label="Rate" value={activeCfg.chorus.rate} min={0.1} max={10} unit="Hz" onChange={v => updateActiveConfig(c => { c.chorus.rate = v })} />
                                    <FaderRow label="Depth" value={activeCfg.chorus.depth} min={0.1} max={1} unit="" onChange={v => updateActiveConfig(c => { c.chorus.depth = v })} />
                                    <FaderRow label="Mix" value={activeCfg.chorus.mix} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { c.chorus.mix = v })} />
                                </FxModule>

                                {/* Pitch Correction */}
                                <FxModule label="Pitch Correction" enabled={activeCfg.pitchCorrection.enabled ?? false} onToggle={() => updateActiveConfig(c => { c.pitchCorrection.enabled = !c.pitchCorrection.enabled })}>
                                    <FaderRow label="Strength (Snap)" value={activeCfg.pitchCorrection.strength ?? 0} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { c.pitchCorrection.strength = v })} />
                                    <div style={{ fontSize: 10.5, color: 'var(--adm-green)', marginTop: 4, fontWeight: 650 }}>
                                        Target Key: {(activeCfg.key ?? -1) >= 0 ? `${KEY_NAMES[activeCfg.key]} ${activeCfg.mode ? 'Major' : 'Minor'}` : 'Unknown Key'}
                                    </div>
                                </FxModule>

                                {/* Delay */}
                                <FxModule label="Delay" enabled={activeCfg.delay.enabled} onToggle={() => updateActiveConfig(c => { c.delay.enabled = !c.delay.enabled })}>
                                    <FaderRow label="Time" value={activeCfg.delay.time} min={10} max={1000} unit="ms" onChange={v => updateActiveConfig(c => { c.delay.time = v })} />
                                    <FaderRow label="Feedback" value={activeCfg.delay.feedback} min={0} max={90} unit="%" onChange={v => updateActiveConfig(c => { c.delay.feedback = v })} />
                                    <FaderRow label="Mix" value={activeCfg.delay.mix} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { c.delay.mix = v })} />
                                </FxModule>

                                {/* Reverb */}
                                <FxModule label="Reverb" enabled={activeCfg.reverb.enabled} onToggle={() => updateActiveConfig(c => { c.reverb.enabled = !c.reverb.enabled })}>
                                    <FaderRow label="Decay" value={activeCfg.reverb.decay} min={0.5} max={8.0} unit="s" onChange={v => updateActiveConfig(c => { c.reverb.decay = v })} />
                                    <FaderRow label="Mix" value={activeCfg.reverb.mix} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { c.reverb.mix = v })} />
                                </FxModule>

                                {/* Distortion */}
                                <FxModule label="Distortion" enabled={activeCfg.distortion?.enabled ?? false} onToggle={() => updateActiveConfig(c => { if (!c.distortion) c.distortion = { enabled: false, drive: 0, mix: 0 }; c.distortion.enabled = !c.distortion.enabled })}>
                                    <FaderRow label="Drive" value={activeCfg.distortion?.drive ?? 0} min={0} max={100} unit="" onChange={v => updateActiveConfig(c => { if (!c.distortion) c.distortion = { enabled: true, drive: 0, mix: 0 }; c.distortion.drive = v })} />
                                    <FaderRow label="Mix" value={activeCfg.distortion?.mix ?? 0} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { if (!c.distortion) c.distortion = { enabled: true, drive: 0, mix: 0 }; c.distortion.mix = v })} />
                                </FxModule>

                                {/* Noise Gate */}
                                <FxModule label="Noise Gate" enabled={activeCfg.noiseGate?.enabled ?? false} onToggle={() => updateActiveConfig(c => { if (!c.noiseGate) c.noiseGate = { enabled: false, threshold: -50 }; c.noiseGate.enabled = !c.noiseGate.enabled })}>
                                    <FaderRow label="Threshold" value={activeCfg.noiseGate?.threshold ?? -50} min={-100} max={0} unit="dB" onChange={v => updateActiveConfig(c => { if (!c.noiseGate) c.noiseGate = { enabled: true, threshold: -50 }; c.noiseGate.threshold = v })} />
                                </FxModule>

                                {/* Vocoder / Talkbox — pitch-tracked channel vocoder: a synth
                                    carrier FOLLOWS the sung melody (snapped to the role's
                                    key/mode scale, shared with pitch correction) and is shaped
                                    by the singer's vowels. Voicing stacks diatonic harmonies
                                    on the tracked note. */}
                                <FxModule label="Vocoder / Talkbox" enabled={activeCfg.vocoder?.enabled ?? false} onToggle={() => updateActiveConfig(c => { if (!c.vocoder) c.vocoder = { enabled: false, mix: 100, brightness: 70, sibilance: 0, voicing: 'triad' }; c.vocoder.enabled = !c.vocoder.enabled })}>
                                    <FaderRow label="Mix" value={activeCfg.vocoder?.mix ?? 100} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { if (!c.vocoder) c.vocoder = { enabled: true, mix: 100, brightness: 70, sibilance: 0, voicing: 'triad' }; c.vocoder.mix = v })} />
                                    <FaderRow label="Brightness" value={activeCfg.vocoder?.brightness ?? 70} min={0} max={100} unit="" onChange={v => updateActiveConfig(c => { if (!c.vocoder) c.vocoder = { enabled: true, mix: 100, brightness: 70, sibilance: 0, voicing: 'triad' }; c.vocoder.brightness = v })} />
                                    <FaderRow label="Sibilance" value={activeCfg.vocoder?.sibilance ?? 0} min={0} max={100} unit="" onChange={v => updateActiveConfig(c => { if (!c.vocoder) c.vocoder = { enabled: true, mix: 100, brightness: 70, sibilance: 0, voicing: 'triad' }; c.vocoder.sibilance = v })} />

                                    {/* Voicing — chord shape the synth carrier plays */}
                                    <div style={{ marginTop: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 6, color: 'var(--adm-text-2)', fontWeight: 600 }}>
                                            <span>Voicing</span>
                                            <span style={{ color: 'var(--adm-text)', textTransform: 'capitalize' }}>{activeCfg.vocoder?.voicing ?? 'triad'}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {(['triad', 'power', 'octaves'] as const).map(v => {
                                                const active = (activeCfg.vocoder?.voicing ?? 'triad') === v
                                                return (
                                                    <button
                                                        key={v}
                                                        onClick={() => updateActiveConfig(c => { if (!c.vocoder) c.vocoder = { enabled: true, mix: 100, brightness: 70, sibilance: 0, voicing: 'triad' }; c.vocoder.voicing = v })}
                                                        className="adm-label"
                                                        style={{
                                                            flex: 1, padding: '7px 0', cursor: 'pointer',
                                                            border: active ? '1px solid var(--adm-amber)' : '1px solid var(--adm-line)',
                                                            borderRadius: 'var(--adm-r-sm)',
                                                            background: active ? 'var(--adm-amber-soft)' : 'transparent',
                                                            color: active ? 'var(--adm-amber-bright)' : 'var(--adm-text-3)',
                                                            transition: 'all 0.14s ease',
                                                        }}
                                                    >
                                                        {v}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </FxModule>

                                {/* Doubler / Thickener — stacks detuned, panned copies of the
                                    tuned voice on top of the lead for the wide "vocal stack"
                                    behind hard-autotune artists (Travis, T-Pain, Carti). */}
                                <FxModule label="Doubler / Thickener" enabled={activeCfg.doubler?.enabled ?? false} onToggle={() => updateActiveConfig(c => { if (!c.doubler) c.doubler = { enabled: false, voices: 2, detune: 12, delay: 22, width: 70, mix: 35 }; c.doubler.enabled = !c.doubler.enabled })}>
                                    <FaderRow label="Voices" value={activeCfg.doubler?.voices ?? 2} min={2} max={4} unit="" onChange={v => updateActiveConfig(c => { if (!c.doubler) c.doubler = { enabled: true, voices: 2, detune: 12, delay: 22, width: 70, mix: 35 }; c.doubler.voices = Math.round(v) })} />
                                    <FaderRow label="Detune" value={activeCfg.doubler?.detune ?? 12} min={0} max={30} unit="¢" onChange={v => updateActiveConfig(c => { if (!c.doubler) c.doubler = { enabled: true, voices: 2, detune: 12, delay: 22, width: 70, mix: 35 }; c.doubler.detune = v })} />
                                    <FaderRow label="Delay" value={activeCfg.doubler?.delay ?? 22} min={8} max={40} unit="ms" onChange={v => updateActiveConfig(c => { if (!c.doubler) c.doubler = { enabled: true, voices: 2, detune: 12, delay: 22, width: 70, mix: 35 }; c.doubler.delay = v })} />
                                    <FaderRow label="Width" value={activeCfg.doubler?.width ?? 70} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { if (!c.doubler) c.doubler = { enabled: true, voices: 2, detune: 12, delay: 22, width: 70, mix: 35 }; c.doubler.width = v })} />
                                    <FaderRow label="Mix" value={activeCfg.doubler?.mix ?? 35} min={0} max={100} unit="%" onChange={v => updateActiveConfig(c => { if (!c.doubler) c.doubler = { enabled: true, voices: 2, detune: 12, delay: 22, width: 70, mix: 35 }; c.doubler.mix = v })} />
                                </FxModule>
                            </div>

                            {/* File Upload Areas */}
                            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {/* Instrumental Upload */}
                                    <div
                                        onClick={() => pickAudioFile('instrumental')}
                                        className={`adm-drop${existingInstrumental || pendingAudioFile ? ' adm-drop--filled' : ''}`}
                                    >
                                        <div style={{
                                            display: 'inline-flex', marginBottom: 8,
                                            color: existingInstrumental || pendingAudioFile ? 'var(--adm-green)' : 'var(--adm-text-3)',
                                        }}>
                                            <Icon name="upload" size={20} />
                                        </div>
                                        {pendingAudioFile ? (
                                            <>
                                                <div style={{ fontWeight: 650, fontSize: 13, color: 'var(--adm-green)' }}>{pendingAudioFile.name}</div>
                                                <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', marginTop: 4 }}>Click to change</div>
                                            </>
                                        ) : existingInstrumental ? (
                                            <>
                                                <div style={{ fontWeight: 650, fontSize: 13, color: 'var(--adm-green)' }}>Instrumental uploaded</div>
                                                <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', marginTop: 4 }}>Click to replace</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontWeight: 650, fontSize: 13 }}>
                                                    Upload Instrumental <span style={{ color: 'var(--adm-red)', fontSize: 11 }}>(required)</span>
                                                </div>
                                                <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', marginTop: 4 }}>Click to select an audio file</div>
                                            </>
                                        )}
                                    </div>

                                    {/* Vocals Upload */}
                                    <div
                                        onClick={() => pickAudioFile('vocals')}
                                        className={`adm-drop${existingVocals || pendingVocalsFile ? ' adm-drop--filled' : ''}`}
                                    >
                                        <div style={{
                                            display: 'inline-flex', marginBottom: 8,
                                            color: existingVocals || pendingVocalsFile ? 'var(--adm-green)' : 'var(--adm-text-3)',
                                        }}>
                                            <Icon name="mic" size={20} />
                                        </div>
                                        {pendingVocalsFile ? (
                                            <>
                                                <div style={{ fontWeight: 650, fontSize: 13, color: 'var(--adm-green)' }}>{pendingVocalsFile.name}</div>
                                                <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', marginTop: 4 }}>Click to change</div>
                                            </>
                                        ) : existingVocals ? (
                                            <>
                                                <div style={{ fontWeight: 650, fontSize: 13, color: 'var(--adm-green)' }}>Vocals uploaded</div>
                                                <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', marginTop: 4 }}>Click to replace</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontWeight: 650, fontSize: 13 }}>
                                                    Upload Vocals <span style={{ color: 'var(--adm-text-3)', fontSize: 11 }}>(optional)</span>
                                                </div>
                                                <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', marginTop: 4 }}>Click to select an audio file</div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* YouTube URL */}
                                <div className="adm-well" style={{
                                    padding: 14,
                                    borderColor: youtubeUrl.trim() ? 'rgba(76,195,232,0.5)' : undefined,
                                    boxShadow: youtubeUrl.trim() ? 'var(--adm-well-shadow), 0 0 14px -6px rgba(76,195,232,0.4)' : undefined,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                        <span style={{ color: youtubeUrl.trim() ? 'var(--adm-cyan)' : 'var(--adm-text-3)' }}>
                                            <Icon name="video" size={17} />
                                        </span>
                                        <div>
                                            <div style={{ fontWeight: 650, fontSize: 13 }}>
                                                Background Video <span style={{ color: 'var(--adm-text-3)', fontSize: 11 }}>(optional)</span>
                                            </div>
                                            <div style={{ fontSize: 11.5, color: 'var(--adm-text-2)' }}>Streams from YouTube behind lyrics on stage</div>
                                        </div>
                                    </div>
                                    <Input
                                        type="text"
                                        value={youtubeUrl}
                                        onChange={e => setYoutubeUrl(e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=…"
                                    />
                                </div>
                            </div>

                            {/* Save */}
                            <Button
                                variant="primary" size="lg"
                                disabled={uploading || (!existingInstrumental && !pendingAudioFile)}
                                onClick={handleSave}
                                style={{ width: '100%', marginTop: 18 }}
                            >
                                {uploading ? 'Saving…' : 'Save Song'}
                            </Button>
                        </Card>
                    )}

                    {/* Spotify API Keys */}
                    <Card style={{ marginTop: 16, maxWidth: 430 }}>
                        <div className="adm-label" style={{ marginBottom: 10 }}>Spotify Keys</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <Input
                                type="password"
                                placeholder="Client ID"
                                value={state.spotifyClientId || ''}
                                onChange={(e) => dispatch({ type: 'SET_SPOTIFY_AUTH', payload: { clientId: e.target.value, clientSecret: state.spotifyClientSecret || '' } })}
                                style={{ fontSize: 11.5, padding: '6px 10px' }}
                            />
                            <Input
                                type="password"
                                placeholder="Client Secret"
                                value={state.spotifyClientSecret || ''}
                                onChange={(e) => dispatch({ type: 'SET_SPOTIFY_AUTH', payload: { clientId: state.spotifyClientId || '', clientSecret: e.target.value } })}
                                style={{ fontSize: 11.5, padding: '6px 10px' }}
                            />
                        </div>
                    </Card>
                </>
            )}

            {/* ═══ Guests Tab ═══ */}
            {adminTab === 'guests' && (
                <div>
                    {!state.karaokeSessionId ? (
                        <Card>
                            <EmptyState
                                icon="radio"
                                title="No Active Session"
                                desc="Start a karaoke session to manage guests"
                            />
                        </Card>
                    ) : guests.length === 0 ? (
                        <Card>
                            <EmptyState
                                icon="users"
                                title="No Guests Yet"
                                desc="Guests will appear here when they join via the companion site"
                            />
                        </Card>
                    ) : (
                        <div className="adm-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                            {guests.map(guest => {
                                const isEditing = editingGuestId === guest.id
                                const isConfirmingRemove = confirmRemoveId === guest.id

                                return (
                                    <Card key={guest.id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <Avatar name={guest.name} src={guest.profilePicture} size={46} />

                                            {/* Name / Edit fields */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        <Input
                                                            type="text"
                                                            value={editName}
                                                            onChange={e => setEditName(e.target.value)}
                                                            placeholder="Guest name"
                                                            autoFocus
                                                            onKeyDown={e => { if (e.key === 'Enter') saveEditGuest(); if (e.key === 'Escape') setEditingGuestId(null) }}
                                                        />
                                                        <Input
                                                            type="text"
                                                            value={editPicture}
                                                            onChange={e => setEditPicture(e.target.value)}
                                                            placeholder="Profile picture URL (optional)"
                                                            style={{ fontSize: 11.5, padding: '5px 10px' }}
                                                            onKeyDown={e => { if (e.key === 'Enter') saveEditGuest(); if (e.key === 'Escape') setEditingGuestId(null) }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 15.5,
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {guest.name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* White-singer (lyric sanitization) toggle */}
                                        <div className="adm-well" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px' }}>
                                            <Toggle
                                                on={guest.whitePersonCheck}
                                                onToggle={() => toggleGuestWhiteCheck(guest.id, !guest.whitePersonCheck)}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 12.5, fontWeight: 650 }}>White singer</div>
                                                <div style={{ fontSize: 11, color: 'var(--adm-text-3)' }}>
                                                    {guest.whitePersonCheck
                                                        ? 'On — the n-word is sanitized to “fella(s)” in their lyrics'
                                                        : 'Off — their lyrics are shown uncensored'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {isEditing ? (
                                                <>
                                                    <Button variant="primary" size="sm" style={{ flex: 1 }} onClick={saveEditGuest}>Save</Button>
                                                    <Button size="sm" style={{ flex: 1 }} onClick={() => setEditingGuestId(null)}>Cancel</Button>
                                                </>
                                            ) : isConfirmingRemove ? (
                                                <>
                                                    <Button variant="danger" size="sm" style={{ flex: 1 }} onClick={() => handleRemoveGuest(guest.id)}>Confirm Remove</Button>
                                                    <Button size="sm" style={{ flex: 1 }} onClick={() => setConfirmRemoveId(null)}>Cancel</Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button size="sm" icon="pencil" style={{ flex: 1 }} onClick={() => startEditGuest(guest)}>Edit</Button>
                                                    <Button variant="danger" size="sm" icon="trash" style={{ flex: 1 }} onClick={() => setConfirmRemoveId(guest.id)}>Remove</Button>
                                                </>
                                            )}
                                        </div>
                                    </Card>
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
                        <Card>
                            <EmptyState
                                icon="radio"
                                title="No Active Session"
                                desc="Start a karaoke session to receive song requests"
                            />
                        </Card>
                    ) : songRequests.length === 0 ? (
                        <Card>
                            <EmptyState
                                icon="inbox"
                                title="No Requests Yet"
                                desc="When a guest can't find a song, they can ask you to add it here"
                            />
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {songRequests.map(req => {
                                const isPendingReq = req.status === 'pending'
                                const inCatalog = catalog.some(c => c.trackId === req.trackId)
                                const statusBadge = req.status === 'added'
                                    ? { label: 'Added', tone: 'green' as const }
                                    : req.status === 'dismissed'
                                        ? { label: 'Dismissed', tone: 'red' as const }
                                        : null
                                return (
                                    <Card key={req.id} style={{
                                        opacity: isPendingReq ? 1 : 0.6,
                                        display: 'flex', flexDirection: 'column', gap: 12,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <ArtTile src={req.trackArtUrl} size={60} radius={9} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontFamily: 'var(--adm-display)', fontWeight: 700, fontSize: 15.5, lineHeight: 1.2,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {req.trackName}
                                                </div>
                                                <div style={{
                                                    fontSize: 13, color: 'var(--adm-text-2)', marginTop: 2,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {req.trackArtist}
                                                </div>
                                                {req.trackAlbum && (
                                                    <div style={{
                                                        fontSize: 11.5, color: 'var(--adm-text-3)', marginTop: 2,
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {req.trackAlbum}
                                                    </div>
                                                )}
                                            </div>
                                            {statusBadge && (
                                                <Chip tone={statusBadge.tone}>{statusBadge.label}</Chip>
                                            )}
                                        </div>

                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            paddingTop: 10, borderTop: '1px solid var(--adm-line-faint)',
                                        }}>
                                            <Avatar name={req.requestedByName} src={req.requestedByProfilePicture} size={26} />
                                            <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--adm-text-2)' }}>
                                                Requested by <span style={{ color: 'var(--adm-text)', fontWeight: 600 }}>{req.requestedByName}</span>
                                                <span style={{ color: 'var(--adm-text-3)' }}> · {new Date(req.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {isPendingReq && (
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <Button
                                                    variant="primary"
                                                    style={{ flex: 1 }}
                                                    onClick={() => openSongRequest(req)}
                                                    disabled={inCatalog}
                                                    title={inCatalog ? 'Already in catalog' : 'Open in Add Song flow'}
                                                >
                                                    {inCatalog ? 'Already in catalog' : 'Add to library'}
                                                </Button>
                                                <Button variant="danger" onClick={() => dismissSongRequest(req.id)}>Dismiss</Button>
                                            </div>
                                        )}
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {adminTab === 'awards' && <AdminAwardsTab />}

            {/* ── Voice Audition Booth ── */}
            <Card style={{ marginTop: 28 }}>
                <button
                    onClick={() => setAuditionOpen(o => !o)}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                        color: 'var(--adm-text)',
                    }}
                >
                    <span style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--adm-amber-soft)', color: 'var(--adm-amber-bright)',
                        border: '1px solid rgba(245,165,36,0.28)',
                    }}>
                        <Icon name="mic" size={15} />
                    </span>
                    <span style={{ fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 14.5, flex: 1, textAlign: 'left' }}>
                        Voice Audition Booth
                    </span>
                    {auditionLive && <Chip tone="green" style={{ marginRight: 8 }}><Led state="on" /> Live</Chip>}
                    <span style={{ color: 'var(--adm-text-3)', transform: auditionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                        <Icon name="chevronDown" size={16} />
                    </span>
                </button>

                {auditionOpen && (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ fontSize: 12, color: 'var(--adm-text-2)', lineHeight: 1.5 }}>
                            Hear your voice through any artist preset or the exact effects you've set on a song
                            in your library. Record a snippet, then A/B different presets by clicking them while
                            it replays.
                        </div>

                        {/* Input / Output devices */}
                        <Field label="Devices" hint={auditionLive ? 'Changing a device will swap the live stream automatically.' : undefined}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Select
                                    value={selectedMic}
                                    onChange={e => setSelectedMic(e.target.value)}
                                    style={{ flex: 1, minWidth: 0 }}
                                >
                                    {mics.length === 0 && <option value="">No microphones detected</option>}
                                    {mics.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label || 'Mic'}</option>)}
                                </Select>
                                <Select
                                    value={selectedSpeaker}
                                    onChange={e => setSelectedSpeaker(e.target.value)}
                                    style={{ flex: 1, minWidth: 0 }}
                                >
                                    {speakers.length === 0 && <option value="">No output devices detected</option>}
                                    {speakers.map(s => <option key={s.deviceId} value={s.deviceId}>{s.label || 'Speaker'}</option>)}
                                </Select>
                            </div>
                        </Field>

                        {/* Source tabs */}
                        <Tabs
                            tabs={[
                                { id: 'preset' as const, label: 'Artist Preset', icon: 'spark' },
                                { id: 'song' as const, label: 'Song Role', icon: 'music' },
                            ]}
                            active={auditionSource}
                            onChange={setAuditionSource}
                        />

                        {/* Preset grid */}
                        {auditionSource === 'preset' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {PRESET_CATEGORIES.map(cat => {
                                    const presets = BUILT_IN_PRESETS.filter(p => p.category === cat.key)
                                    if (!presets.length) return null
                                    return (
                                        <div key={cat.key}>
                                            <div className="adm-label" style={{ fontSize: 9, marginBottom: 5 }}>{cat.label}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {presets.map(preset => (
                                                    <PresetChip
                                                        key={preset.id}
                                                        preset={preset}
                                                        active={auditionPresetId === preset.id && auditionSource === 'preset'}
                                                        imgUrl={preset.artistId && !presetImageErrors.has(preset.artistId) ? presetImages[preset.artistId] || null : null}
                                                        onImgError={() => preset.artistId && setPresetImageErrors(prev => new Set(prev).add(preset.artistId!))}
                                                        onClick={() => selectAuditionPreset(preset.id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Song-role picker */}
                        {auditionSource === 'song' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <SearchInput
                                    value={auditionSongQuery}
                                    onChange={e => setAuditionSongQuery(e.target.value)}
                                    placeholder="Search by song, artist, or album…"
                                />
                                <div className="adm-scroll adm-well" style={{ maxHeight: 280 }}>
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
                                                <div style={{ padding: 16, fontSize: 12, color: 'var(--adm-text-2)', textAlign: 'center' }}>
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
                                                    borderBottom: '1px solid var(--adm-line-faint)',
                                                    background: isSelectedSong ? 'var(--adm-amber-soft)' : 'transparent',
                                                }}>
                                                    <div style={{ fontSize: 12.5, fontWeight: 650, marginBottom: 2 }}>
                                                        {song.name}
                                                    </div>
                                                    <div style={{ fontSize: 10.5, color: 'var(--adm-text-3)', marginBottom: 6 }}>
                                                        {song.artist}{song.albumName ? ` · ${song.albumName}` : ''}
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {roleLabels.map((roleName, idx) => {
                                                            if (!fxArr[idx]) return null
                                                            const isActiveChip = isSelectedSong && auditionSongRoleIdx === idx
                                                            return (
                                                                <Chip
                                                                    key={idx}
                                                                    tone={isActiveChip ? 'amber' : undefined}
                                                                    onClick={() => selectAuditionSongRole(song.trackId, idx)}
                                                                    style={{ fontSize: 10.5 }}
                                                                >
                                                                    {roleName}
                                                                </Chip>
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
                        <Field
                            label="Autotune target scale"
                            hint={<><strong>Chromatic</strong> snaps every note to the nearest semitone — classic T-Pain, works regardless of what you're singing. Picking a <strong>Key + Mode</strong> restricts snap targets to that scale's notes only (more musical, more natural-sounding for melodies). Selecting a Song Role above will auto-load that song's stored key.</>}
                        >
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Select
                                    value={auditionKey}
                                    onChange={e => setAuditionKey(parseInt(e.target.value))}
                                    style={{ flex: 2, minWidth: 0 }}
                                >
                                    <option value={-1}>Chromatic (snap to any semitone)</option>
                                    {KEY_NAMES.map((k, i) => <option key={i} value={i}>Key of {k}</option>)}
                                </Select>
                                <Select
                                    value={auditionMode}
                                    onChange={e => setAuditionMode(parseInt(e.target.value))}
                                    disabled={auditionKey < 0}
                                    style={{ flex: 1, minWidth: 0 }}
                                >
                                    <option value={1}>Major</option>
                                    <option value={0}>Minor</option>
                                </Select>
                            </div>
                        </Field>

                        {/* Fingerprint strip */}
                        <div className="adm-well adm-mono" style={{ padding: '10px 14px', fontSize: 11, lineHeight: 1.5 }}>
                            <div className="adm-label" style={{ fontSize: 9, marginBottom: 4 }}>Currently loaded</div>
                            {(() => {
                                const fx = getAuditionEffects()
                                if (!fx) {
                                    return <span style={{ color: 'var(--adm-text-3)' }}>Pick a preset or song role above.</span>
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
                                        <span style={{ color: 'var(--adm-amber-bright)', fontWeight: 600 }}>{label}</span>
                                        <span style={{ color: 'var(--adm-text-2)' }}> · {auditionFingerprint()}</span>
                                    </span>
                                )
                            })()}
                        </div>

                        {/* Transport row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <Button
                                variant={auditionLive ? 'danger' : 'live'}
                                onClick={toggleAuditionLive}
                                disabled={!selectedMic}
                            >
                                {auditionLive ? 'Stop live' : <><Led state="on" /> Go live</>}
                            </Button>

                            <Button
                                variant={auditionRecording ? 'danger' : 'secondary'}
                                onClick={toggleAuditionRec}
                                disabled={!auditionLive}
                            >
                                {auditionRecording ? <><Led state="rec" /> Stop rec ({(auditionRecDuration / 1000).toFixed(1)}s)</> : 'Record'}
                            </Button>

                            {auditionBlob && !auditionPlaying && (
                                <Button variant="primary" icon="play" onClick={playAuditionSnip}>
                                    Play snippet ({(auditionSnipDuration / 1000).toFixed(1)}s)
                                </Button>
                            )}

                            {auditionPlaying && (
                                <Button variant="danger" onClick={stopAuditionSnip}>
                                    Stop ({Math.floor(auditionPlayProgress * 100)}%)
                                </Button>
                            )}

                            {auditionBlob && (
                                <Button variant="ghost" size="sm" icon="x" onClick={clearAuditionSnip}>
                                    Clear
                                </Button>
                            )}

                            {auditionError && (
                                <span style={{ fontSize: 12, color: 'var(--adm-red)' }}>{auditionError}</span>
                            )}
                        </div>

                        {/* VU meter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="adm-label" style={{ minWidth: 26 }}>VU</span>
                            <Meter value={auditionLevel * 2.5} style={{ height: 12 }} />
                            <span className="adm-mono" style={{ fontSize: 10.5, color: 'var(--adm-text-2)', minWidth: 48, textAlign: 'right' }}>
                                {auditionLevel.toFixed(3)}
                            </span>
                        </div>

                        {/* Spectrum canvas */}
                        <div>
                            <div className="adm-label" style={{ marginBottom: 6 }}>Output spectrum</div>
                            <canvas
                                ref={auditionCanvasRef}
                                width={760}
                                height={140}
                                style={{
                                    width: '100%', maxWidth: 760, height: 140,
                                    borderRadius: 'var(--adm-r-sm)', border: '1px solid var(--adm-line)',
                                    background: '#0a0c11', display: 'block',
                                    boxShadow: 'var(--adm-well-shadow)',
                                } as CSSProperties}
                            />
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}
