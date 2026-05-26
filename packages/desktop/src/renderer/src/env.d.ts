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
    importAudio: (sourcePath: string, trackId: string, type: 'vocals' | 'instrumental') => Promise<{ path?: string; error?: string }>
    saveSongMeta: (meta: any) => Promise<{ success?: boolean; error?: string }>
    listCatalog: () => Promise<any[]>
    removeSong: (trackId: string) => Promise<{ success?: boolean; error?: string }>
    onAudioProgress: (callback: (event: any, data: { progress: number; message: string; stage?: string }) => void) => void
    offAudioProgress: (callback: any) => void
    setSystemVolume: (vol: number) => void
    getSystemVolume: () => Promise<number>
}

interface Window {
    electronAPI: ElectronAPI
}
