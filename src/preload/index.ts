import { contextBridge, ipcRenderer } from 'electron'

export type ElectronAPI = {
    // Window controls
    minimize: () => void
    maximize: () => void
    close: () => void
    // Stage window
    isStageWindow: boolean
    openStage: () => Promise<{ success: boolean, existed: boolean }>
    closeStage: () => Promise<{ success: boolean }>
    onStageClosed: (callback: () => void) => void
    offStageClosed: (callback: any) => void
    stageMinimize: () => void
    stageClose: () => void
    stageToggleFullscreen: () => Promise<{ ok: boolean; fullscreen?: boolean }>
    // State sync between windows
    sendStateAction: (action: any) => void
    onStateAction: (callback: (action: any) => void) => any
    offStateAction: (handler: any) => void
    requestInitState: () => void
    onInitStateRequest: (callback: () => void) => any
    offInitStateRequest: (handler: any) => void
    sendInitState: (state: any) => void
    onInitState: (callback: (state: any) => void) => any
    offInitState: (handler: any) => void
    // Playback time/seek sync
    sendPlaybackTime: (timeMs: number) => void
    onPlaybackTime: (callback: (timeMs: number) => void) => any
    offPlaybackTime: (handler: any) => void
    sendPlaybackSeek: (timeMs: number) => void
    onPlaybackSeek: (callback: (timeMs: number) => void) => any
    offPlaybackSeek: (handler: any) => void
    // Spotify
    spotifySearch: (query: string, token: string) => Promise<any>
    spotifyTrack: (trackId: string, token: string) => Promise<any>
    spotifyAudioFeatures: (trackId: string, token: string) => Promise<any>
    spotifyAuth: (clientId: string, clientSecret: string) => Promise<any>
    spotifyArtists: (artistIds: string[], token: string) => Promise<any>
    // Lyrics — pass trackId or { trackId, trackName, artistName, albumName?, durationMs } for best results
    fetchLyrics: (trackIdOrPayload: string | { trackId: string; trackName?: string; artistName?: string; albumName?: string; durationMs?: number }) => Promise<any>
    // Audio / Catalog
    checkAudioCache: (trackId: string) => Promise<{ vocals?: string, instrumental?: string }>
    importAudio: (sourcePath: string, trackId: string, type: 'vocals' | 'instrumental') => Promise<{ path?: string, error?: string }>
    saveSongMeta: (meta: { trackId: string, name: string, artist: string, artUrl: string, albumName: string, durationMs: number, roles?: string[], lyrics?: any[], voiceEffects?: any }) => Promise<{ success?: boolean, error?: string }>
    listCatalog: () => Promise<any[]>
    removeSong: (trackId: string) => Promise<{ success?: boolean, error?: string }>
    onAudioProgress: (callback: (event: any, data: { progress: number, message: string, stage?: string }) => void) => void
    offAudioProgress: (callback: any) => void
    // System Audio
    setSystemVolume: (vol: number) => void
    getSystemVolume: () => Promise<number>
    // Karaoke Session
    createKaraokeSession: (name: string, themeName: string) => Promise<{ sessionId?: string; sessionCode?: string; sessionName?: string; companionUrl?: string; qrDataUrl?: string; error?: string }>
    closeKaraokeSession: () => Promise<void>
    listRecentSessions: () => Promise<{ id: string; code: string; name: string | null; themeName: string | null; createdAt: string; guestCount: number }[]>
    resumeKaraokeSession: (sessionId: string) => Promise<{ sessionId?: string; sessionCode?: string; sessionName?: string; themeName?: string; companionUrl?: string; qrDataUrl?: string; error?: string }>
    syncNowPlaying: (info: { trackId: string; name: string; artist: string; artUrl: string | null; singerConfigs?: any[]; stageTheme?: string | null } | null) => Promise<void>
    syncIsPlaying: (isPlaying: boolean) => Promise<void>
    pushLocalQueueItem: (item: any) => Promise<{ id?: string; error?: string }>
    removeQueueItem: (id: string) => Promise<void>
    reorderQueue: (ids: string[]) => Promise<void>
    onRemoteQueueAdd: (callback: (row: any) => void) => any
    offRemoteQueueAdd: (handler: any) => void
    onRemoteQueueRemove: (callback: (row: any) => void) => any
    offRemoteQueueRemove: (handler: any) => void
    // Guest management
    listGuests: () => Promise<{ id: string; sessionId: string; name: string; profilePicture: string | null }[]>
    updateGuest: (id: string, fields: { name?: string; profilePicture?: string | null }) => Promise<void>
    removeGuest: (id: string) => Promise<void>
    // Reactions relay (main → stage)
    sendReaction: (reaction: any) => void
    onReaction: (callback: (reaction: any) => void) => any
    offReaction: (handler: any) => void
}

const api: ElectronAPI = {
    // Window controls
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    // Stage window
    isStageWindow: process.argv.includes('--stage-window'),
    openStage: () => ipcRenderer.invoke('stage:open'),
    closeStage: () => ipcRenderer.invoke('stage:close'),
    onStageClosed: (callback) => ipcRenderer.on('stage:closed', callback),
    offStageClosed: (callback) => ipcRenderer.removeListener('stage:closed', callback),
    stageMinimize: () => ipcRenderer.invoke('stage:request-minimize'),
    stageClose: () => ipcRenderer.invoke('stage:request-close'),
    stageToggleFullscreen: () => ipcRenderer.invoke('stage:request-toggle-fullscreen'),
    // State sync between windows
    sendStateAction: (action) => ipcRenderer.send('state:action', action),
    onStateAction: (callback) => {
        const handler = (_e: any, action: any) => callback(action)
        ipcRenderer.on('state:action', handler)
        return handler
    },
    offStateAction: (handler) => ipcRenderer.removeListener('state:action', handler),
    requestInitState: () => ipcRenderer.send('state:request-init'),
    onInitStateRequest: (callback) => {
        const handler = () => callback()
        ipcRenderer.on('state:request-init', handler)
        return handler
    },
    offInitStateRequest: (handler) => ipcRenderer.removeListener('state:request-init', handler),
    sendInitState: (state) => ipcRenderer.send('state:init-response', state),
    onInitState: (callback) => {
        const handler = (_e: any, state: any) => callback(state)
        ipcRenderer.on('state:init', handler)
        return handler
    },
    offInitState: (handler) => ipcRenderer.removeListener('state:init', handler),
    // Playback time/seek sync
    sendPlaybackTime: (timeMs) => ipcRenderer.send('playback:time', timeMs),
    onPlaybackTime: (callback) => {
        const handler = (_e: any, timeMs: number) => callback(timeMs)
        ipcRenderer.on('playback:time', handler)
        return handler
    },
    offPlaybackTime: (handler) => ipcRenderer.removeListener('playback:time', handler),
    sendPlaybackSeek: (timeMs) => ipcRenderer.send('playback:seek', timeMs),
    onPlaybackSeek: (callback) => {
        const handler = (_e: any, timeMs: number) => callback(timeMs)
        ipcRenderer.on('playback:seek', handler)
        return handler
    },
    offPlaybackSeek: (handler) => ipcRenderer.removeListener('playback:seek', handler),
    // Spotify
    spotifySearch: (query, token) => ipcRenderer.invoke('spotify:search', query, token),
    spotifyTrack: (trackId, token) => ipcRenderer.invoke('spotify:track', trackId, token),
    spotifyAudioFeatures: (trackId, token) => ipcRenderer.invoke('spotify:audio-features', trackId, token),
    spotifyAuth: (clientId, clientSecret) => ipcRenderer.invoke('spotify:auth', clientId, clientSecret),
    spotifyArtists: (artistIds, token) => ipcRenderer.invoke('spotify:artists', artistIds, token),
    // Lyrics
    fetchLyrics: (trackIdOrPayload) => ipcRenderer.invoke('lyrics:fetch', trackIdOrPayload),
    // Audio / Catalog
    checkAudioCache: (trackId) => ipcRenderer.invoke('audio:check-cache', trackId),
    importAudio: (sourcePath, trackId, type) => ipcRenderer.invoke('audio:import', { sourcePath, trackId, type }),
    saveSongMeta: (meta) => ipcRenderer.invoke('audio:save-meta', meta),
    listCatalog: () => ipcRenderer.invoke('audio:list-catalog'),
    removeSong: (trackId) => ipcRenderer.invoke('audio:remove-song', trackId),
    onAudioProgress: (callback) => ipcRenderer.on('audio:progress', callback),
    offAudioProgress: (callback) => ipcRenderer.removeListener('audio:progress', callback),
    // System Audio
    setSystemVolume: (vol) => ipcRenderer.send('audio:set-system-volume', vol),
    getSystemVolume: () => ipcRenderer.invoke('audio:get-system-volume'),
    // Karaoke Session
    createKaraokeSession: (name, themeName) => ipcRenderer.invoke('karaoke:create-session', name, themeName),
    closeKaraokeSession: () => ipcRenderer.invoke('karaoke:close-session'),
    listRecentSessions: () => ipcRenderer.invoke('karaoke:list-recent-sessions'),
    resumeKaraokeSession: (sessionId) => ipcRenderer.invoke('karaoke:resume-session', sessionId),
    syncNowPlaying: (info) => ipcRenderer.invoke('karaoke:sync-now-playing', info),
    syncIsPlaying: (isPlaying) => ipcRenderer.invoke('karaoke:sync-is-playing', isPlaying),
    pushLocalQueueItem: (item) => ipcRenderer.invoke('karaoke:push-local-queue-item', item),
    removeQueueItem: (id) => ipcRenderer.invoke('karaoke:remove-queue-item', id),
    reorderQueue: (ids) => ipcRenderer.invoke('karaoke:reorder-queue', ids),
    onRemoteQueueAdd: (callback) => {
        const handler = (_e: any, row: any) => callback(row)
        ipcRenderer.on('karaoke:remote-queue-add', handler)
        return handler
    },
    offRemoteQueueAdd: (handler) => ipcRenderer.removeListener('karaoke:remote-queue-add', handler),
    onRemoteQueueRemove: (callback) => {
        const handler = (_e: any, row: any) => callback(row)
        ipcRenderer.on('karaoke:remote-queue-remove', handler)
        return handler
    },
    offRemoteQueueRemove: (handler) => ipcRenderer.removeListener('karaoke:remote-queue-remove', handler),
    // Guest management
    listGuests: () => ipcRenderer.invoke('karaoke:list-guests'),
    updateGuest: (id, fields) => ipcRenderer.invoke('karaoke:update-guest', id, fields),
    removeGuest: (id) => ipcRenderer.invoke('karaoke:remove-guest', id),
    // Reactions relay (main → stage)
    sendReaction: (reaction) => ipcRenderer.send('reaction:send', reaction),
    onReaction: (callback) => {
        const handler = (_e: any, reaction: any) => callback(reaction)
        ipcRenderer.on('reaction:receive', handler)
        return handler
    },
    offReaction: (handler) => ipcRenderer.removeListener('reaction:receive', handler)
}

contextBridge.exposeInMainWorld('electronAPI', api)
