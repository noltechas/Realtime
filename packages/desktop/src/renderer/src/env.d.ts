/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SPOTIFY_CLIENT_ID: string
    readonly VITE_SPOTIFY_CLIENT_SECRET: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

interface ElectronAPI {
    minimize: () => void
    maximize: () => void
    close: () => void
    isStageWindow: boolean
    openStage: () => Promise<{ success: boolean; existed: boolean }>
    closeStage: () => Promise<{ success: boolean }>
    onStageClosed: (callback: () => void) => void
    offStageClosed: (callback: any) => void
    stageMinimize: () => Promise<{ ok: boolean }>
    stageClose: () => Promise<{ ok: boolean }>
    stageToggleFullscreen: () => Promise<{ ok: boolean; fullscreen?: boolean }>
    sendStateAction: (action: any) => void
    onStateAction: (callback: (action: any) => void) => any
    offStateAction: (handler: any) => void
    requestInitState: () => void
    onInitStateRequest: (callback: () => void) => any
    offInitStateRequest: (handler: any) => void
    sendInitState: (state: any) => void
    onInitState: (callback: (state: any) => void) => any
    offInitState: (handler: any) => void
    sendPlaybackTime: (timeMs: number) => void
    onPlaybackTime: (callback: (timeMs: number) => void) => any
    offPlaybackTime: (handler: any) => void
    sendPlaybackSeek: (timeMs: number) => void
    onPlaybackSeek: (callback: (timeMs: number) => void) => any
    offPlaybackSeek: (handler: any) => void
    spotifySearch: (query: string, token: string) => Promise<any>
    spotifyTrack: (trackId: string, token: string) => Promise<any>
    spotifyAudioFeatures: (trackId: string, token: string) => Promise<any>
    spotifyAuth: (clientId: string, clientSecret: string) => Promise<any>
    spotifyArtists: (artistIds: string[], token: string) => Promise<any>
    fetchLyrics: (trackIdOrPayload: string | { trackId: string; trackName?: string; artistName?: string; albumName?: string; durationMs?: number }) => Promise<any>
    checkAudioCache: (trackId: string) => Promise<{ vocals?: string; instrumental?: string }>
    importAudio: (sourcePath: string, trackId: string, type: 'vocals' | 'instrumental', expectedDurationMs?: number) => Promise<{ path?: string; error?: string }>
    saveSongMeta: (meta: any) => Promise<{ success?: boolean; error?: string }>
    listCatalog: () => Promise<any[]>
    removeSong: (trackId: string) => Promise<{ success?: boolean; error?: string }>
    onAudioProgress: (callback: (event: any, data: { progress: number; message: string; stage?: string }) => void) => void
    offAudioProgress: (callback: any) => void
    setSystemVolume: (vol: number) => void
    getSystemVolume: () => Promise<number>
}

// Song auto-generation — mirrors the types in src/main/autogen.ts (the
// renderer project can't import main-process modules).
type AutogenStage =
    | 'queued' | 'resolving' | 'searching' | 'downloading' | 'separating'
    | 'importing' | 'analyzing' | 'tuning' | 'ready' | 'failed'

interface AutogenJob {
    trackId: string
    name: string
    artist: string
    artUrl: string | null
    requestIds: string[]
    requestedBy: string | null
    agentOnly?: boolean
    stage: AutogenStage
    overall: number
    message?: string
    error?: string
    errorCode?: string
    agent?: 'done' | 'skipped' | 'failed'
    agentReason?: string
    needsReview?: boolean
    alreadyInLibrary?: boolean
    logPath?: string
    createdAt: number
    startedAt?: number
    finishedAt?: number
}

interface AutogenSettings {
    autoGenerateRequests: boolean
}

interface AutogenStatus {
    available: boolean
    unavailableReason?: string
    settings: AutogenSettings
    jobs: AutogenJob[]
}

interface AutogenTrackInput {
    trackId: string
    name: string
    artist: string
    artUrl?: string | null
    requestId?: string | null
    requestIds?: string[]
    requestedBy?: string | null
    agentOnly?: boolean
}

// Singer voice profiles — mirrors src/main/voices.ts.
interface VoiceMeasurements {
    seconds: number
    spectrum?: number[] | null
    loudnessRangeDb?: number | null
    levelDb?: number | null
    tuning?: { madCents?: number; flatnessCents?: number | null; sustainedRatio?: number } | null
    range?: { lowMidi: number; medianMidi: number; highMidi: number } | null
}

interface VoiceProfile {
    key: string
    name: string
    guestId: string | null
    recordedAt: string
    micLabel: string | null
    measurements: VoiceMeasurements
}

// Recorded performances — mirrors src/main/performances.ts.
interface PerformanceSummary {
    id: string
    trackId: string
    songName: string
    artist: string
    createdAt: string
    singers: string[]
    replay: { status: 'none' | 'queued' | 'converting' | 'ready' | 'failed'; pct?: number; error?: string; file?: string }
}

interface ElectronAPI {
    sendVoiceCheck: (update: import('./audio/voiceCheckScript').VoiceCheckUpdate) => void
    onVoiceCheck: (callback: (update: import('./audio/voiceCheckScript').VoiceCheckUpdate) => void) => any
    offVoiceCheck: (handler: any) => void
    perfSave: (payload: { trackId: string; name: string; artist: string; singers: { name: string; guestId: string | null; roleIndices: number[]; sampleRate: number; timeMap: [number, number][]; wav: Uint8Array }[] }) => Promise<{ id: string }>
    perfList: () => Promise<{ performances: PerformanceSummary[]; available: boolean; reason?: string }>
    perfDelete: (id: string) => Promise<void>
    perfReplay: (id: string) => Promise<void>
    onPerfUpdate: (callback: (list: PerformanceSummary[]) => void) => any
    offPerfUpdate: (handler: any) => void
    voiceList: () => Promise<Record<string, VoiceProfile>>
    voiceAnalyze: (args: { wav: Uint8Array; name: string; guestId?: string | null; micLabel?: string | null }) => Promise<{ profile?: VoiceProfile; error?: string }>
    voiceDelete: (key: string) => Promise<void>
    onVoiceUpdated: (callback: (profiles: Record<string, VoiceProfile>) => void) => any
    offVoiceUpdated: (handler: any) => void
    getVocalProfile: (trackId: string) => Promise<any | null>
    autogenStatus: () => Promise<AutogenStatus>
    autogenEnqueue: (input: AutogenTrackInput) => Promise<AutogenStatus>
    autogenCancel: (trackId: string) => Promise<void>
    autogenRetry: (trackId: string) => Promise<void>
    autogenDismiss: (trackId: string) => Promise<void>
    autogenSetSettings: (next: Partial<AutogenSettings>) => Promise<AutogenStatus>
    onAutogenUpdate: (callback: (status: AutogenStatus) => void) => any
    offAutogenUpdate: (handler: any) => void
    onAutogenSongReady: (callback: (trackId: string) => void) => any
    offAutogenSongReady: (handler: any) => void
}

interface Window {
    electronAPI: ElectronAPI
}
