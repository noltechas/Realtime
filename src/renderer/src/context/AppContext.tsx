import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, ReactNode } from 'react'

// ---- Types ----
export interface SpotifyTrack {
    id: string
    name: string
    artists: { name: string }[]
    album: {
        name: string
        images: { url: string; width: number; height: number }[]
    }
    duration_ms: number
    uri: string
}

export interface LyricLine {
    startTimeMs: number
    words: string
    singerIndices?: number[] // Array of assigned singers (for multi-colored choruses)
    roleIndex?: number   // Maps to the defined roles (Admin authored)
}

export interface Singer {
    id: number
    name: string
    color: string
    colorGlow: string
    micDeviceId: string
    vocalTrack: 'lead' | 'backing' | 'both'
    roleIndices?: number[]
    whitePersonCheck?: boolean
}

export interface MicSlotConfig {
    micDeviceId: string
    micLevel: number // 0.0 to 2.0, default 1.0
}

export interface ProcessingStatus {
    stage: 'idle' | 'downloading' | 'importing' | 'separating' | 'ready' | 'error'
    progress: number // 0-100
    message: string
}

export interface VoiceEffects {
    key: number; mode: number; tempo: number
    pitchCorrection: { enabled: boolean; strength: number }
    compressor: { enabled: boolean; threshold: number; ratio: number; attack: number; release: number }
    eq: { enabled: boolean; lowGain: number; midGain: number; highGain: number }
    chorus: { enabled: boolean; rate: number; depth: number; mix: number }
    delay: { enabled: boolean; time: number; feedback: number; mix: number }
    reverb: { enabled: boolean; decay: number; preDelay: number; mix: number }
}

export interface QueueItem {
    id: string
    track: SpotifyTrack
    lyrics: LyricLine[]
    roles: string[]
    singers: Singer[]
    voiceEffects: VoiceEffects | VoiceEffects[] | null
    stemsPath: { vocals?: string; instrumental?: string } | null
    songPath: string | null
    backgroundVideoPath: string | null
    monitorDeviceIds?: string[]
    addedBy?: string | null
    remoteQueueId?: string | null
}

export type StageMode = 'idle' | 'ready' | 'playing'

export interface AppState {
    // Auth
    spotifyToken: string | null
    // Current track
    currentTrack: SpotifyTrack | null
    lyrics: LyricLine[]
    roles: string[]
    // Singers
    singers: Singer[]
    singerCount: number
    queue: QueueItem[]
    nowPlaying: QueueItem | null
    history: QueueItem[]
    // Playback
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
    vocalVolume: number
    stageMode: StageMode
    // Processing
    processingStatus: ProcessingStatus
    // Stems paths
    stemsPath: {
        vocals?: string
        instrumental?: string
    } | null
    // Voice effects
    voiceEffects: VoiceEffects | VoiceEffects[] | null
    // Admin
    backgroundVideoPath: string | null
    // Audio paths
    songPath: string | null
    monitorDeviceIds: string[]
    mainOutputId: string
    vocalOffsetMs: number
    micSlots: MicSlotConfig[]
    // Spotify Auth
    spotifyClientId: string | null
    spotifyClientSecret: string | null
    // Edit flow: when editing a queue item in place
    editingQueueIndex: number | null
    // Karaoke session
    karaokeSessionId: string | null
    karaokeSessionCode: string | null
    karaokeQrDataUrl: string | null
}

export const NEON_COLORS = [
    { color: '#22d3ee', colorGlow: 'rgba(34, 211, 238, 0.3)' }, // Cyan
    { color: '#f472b6', colorGlow: 'rgba(244, 114, 182, 0.3)' }, // Pink
    { color: '#fbbf24', colorGlow: 'rgba(251, 191, 36, 0.3)' }, // Amber
    { color: '#a78bfa', colorGlow: 'rgba(167, 139, 250, 0.3)' }, // Violet
    { color: '#34d399', colorGlow: 'rgba(52, 211, 153, 0.3)' }, // Emerald
    { color: '#818cf8', colorGlow: 'rgba(129, 140, 248, 0.3)' }, // Indigo
    { color: '#ef4444', colorGlow: 'rgba(239, 68, 68, 0.3)' },  // Electric Red
    { color: '#f97316', colorGlow: 'rgba(249, 115, 22, 0.3)' },  // Neon Orange
    { color: '#84cc16', colorGlow: 'rgba(132, 204, 22, 0.3)' },  // Lime
    { color: '#14b8a6', colorGlow: 'rgba(20, 184, 166, 0.3)' },  // Teal
    { color: '#3b82f6', colorGlow: 'rgba(59, 130, 246, 0.3)' },  // Electric Blue
    { color: '#d946ef', colorGlow: 'rgba(217, 70, 239, 0.3)' }, // Neon Purple
    { color: '#e11d48', colorGlow: 'rgba(225, 29, 72, 0.3)' }   // Rose
]

const initialState: AppState = {
    spotifyToken: null,
    currentTrack: null,
    lyrics: [],
    roles: [],
    singers: [],
    singerCount: 0,
    queue: [],
    nowPlaying: null,
    history: [],
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    vocalVolume: 1.0,
    stageMode: 'idle',
    processingStatus: { stage: 'idle', progress: 0, message: '' },
    stemsPath: null,
    voiceEffects: null,
    backgroundVideoPath: null,
    songPath: null,
    monitorDeviceIds: [],
    mainOutputId: '',
    vocalOffsetMs: 165,
    micSlots: [],
    spotifyClientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID || null,
    spotifyClientSecret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || null,
    editingQueueIndex: null,
    karaokeSessionId: null,
    karaokeSessionCode: null,
    karaokeQrDataUrl: null
}

// ---- Actions ----
type Action =
    | { type: 'SET_TOKEN'; payload: string }
    | { type: 'SET_TRACK'; payload: SpotifyTrack }
    | { type: 'SET_LYRICS'; payload: LyricLine[] }
    | { type: 'SET_ROLES'; payload: string[] }
    | { type: 'SET_SINGER_COUNT'; payload: number }
    | { type: 'UPDATE_SINGER'; payload: { index: number; singer: Partial<Singer> } }
    | { type: 'SET_PLAYING'; payload: boolean }
    | { type: 'SET_CURRENT_TIME'; payload: number }
    | { type: 'SET_DURATION'; payload: number }
    | { type: 'SET_VOLUME'; payload: number }
    | { type: 'SET_VOCAL_VOLUME'; payload: number }
    | { type: 'SET_PROCESSING'; payload: ProcessingStatus }
    | { type: 'SET_STEMS_PATH'; payload: { vocals?: string; instrumental?: string } }
    | { type: 'SET_SONG_PATH'; payload: string }
    | { type: 'SET_BACKGROUND_VIDEO'; payload: string | null }
    | { type: 'SET_MONITOR_DEVICES'; payload: string[] }
    | { type: 'SET_MAIN_OUTPUT'; payload: string }
    | { type: 'SET_VOCAL_OFFSET'; payload: number }
    | { type: 'SET_SPOTIFY_AUTH'; payload: { clientId: string; clientSecret: string } }
    | { type: 'SET_VOICE_EFFECTS'; payload: VoiceEffects | VoiceEffects[] | null }
    | { type: 'SET_STAGE_MODE'; payload: StageMode }
    | { type: 'ENQUEUE_SONG'; payload: QueueItem }
    | { type: 'NEXT_SONG' }
    | { type: 'PREV_SONG' }
    | { type: 'CLEAR_QUEUE' }
    | { type: 'REMOVE_FROM_QUEUE'; payload: number }
    | { type: 'REPLACE_QUEUE_ITEM'; payload: { index: number; item: QueueItem } }
    | { type: 'REORDER_QUEUE'; payload: QueueItem[] }
    | { type: 'SET_EDITING_QUEUE_INDEX'; payload: number | null }
    | { type: 'UPDATE_NOW_PLAYING_EFFECTS'; payload: { singerIndex: number; effects: VoiceEffects } }
    | { type: 'UPDATE_NOW_PLAYING_SINGER'; payload: { singerId: number; updates: Partial<Singer> } }
    | { type: 'SET_MIC_SLOT'; payload: { index: number; config: Partial<MicSlotConfig> } }
    | { type: 'ENSURE_MIC_SLOTS'; payload: number }
    | { type: 'INIT_STATE'; payload: AppState }
    | { type: 'RESET' }
    | { type: 'SET_KARAOKE_SESSION'; payload: { sessionId: string; sessionCode: string; qrDataUrl: string } }
    | { type: 'CLEAR_KARAOKE_SESSION' }

// Helper: extract mic assignments from current nowPlaying into micSlots
function saveMicSlots(state: AppState): MicSlotConfig[] {
    const slots = [...state.micSlots]
    if (state.nowPlaying) {
        const singers = state.nowPlaying.singers
        const effects = state.nowPlaying.voiceEffects
        for (let i = 0; i < singers.length; i++) {
            const micLevel = getMicLevelFromEffects(effects, i)
            while (slots.length <= i) {
                slots.push({ micDeviceId: '', micLevel: 1.0 })
            }
            slots[i] = { micDeviceId: singers[i].micDeviceId, micLevel }
        }
    }
    return slots
}

// Helper: get micLevel from voice effects for a singer index
function getMicLevelFromEffects(effects: VoiceEffects | VoiceEffects[] | null, singerIndex: number): number {
    if (!effects) return 1.0
    if (Array.isArray(effects)) {
        const fx = effects[singerIndex] || effects[0]
        return fx?.micLevel ?? 1.0
    }
    return effects.micLevel ?? 1.0
}

// Helper: merge persisted mic slots into a queue item's singers (mic device only, not voice effects)
function mergeMicSlotsIntoItem(item: QueueItem, slots: MicSlotConfig[]): QueueItem {
    const mergedSingers = item.singers.map((singer, i) => {
        if (i < slots.length && slots[i].micDeviceId) {
            return { ...singer, micDeviceId: slots[i].micDeviceId }
        }
        return singer
    })
    // Also merge micLevel into voice effects
    let mergedEffects = item.voiceEffects
    if (mergedEffects && slots.length > 0) {
        if (Array.isArray(mergedEffects)) {
            mergedEffects = mergedEffects.map((fx, i) => {
                if (i < slots.length) {
                    return { ...fx, micLevel: slots[i].micLevel }
                }
                return fx
            })
        } else {
            // Single effect object — apply first slot's micLevel
            mergedEffects = { ...mergedEffects, micLevel: slots[0]?.micLevel ?? 1.0 }
        }
    }
    return { ...item, singers: mergedSingers, voiceEffects: mergedEffects }
}

// Helper: ensure slots array has at least minCount entries
function ensureSlots(slots: MicSlotConfig[], minCount: number): MicSlotConfig[] {
    if (slots.length >= minCount) return slots
    const result = [...slots]
    while (result.length < minCount) {
        result.push({ micDeviceId: '', micLevel: 1.0 })
    }
    return result
}

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_TOKEN':
            return { ...state, spotifyToken: action.payload }
        case 'SET_TRACK':
            return {
                ...state,
                currentTrack: action.payload,
                lyrics: [],
                roles: [],
                processingStatus: initialState.processingStatus,
                songPath: null,
                stemsPath: null,
                monitorDeviceIds: []
            }
        case 'SET_LYRICS':
            return { ...state, lyrics: action.payload }
        case 'SET_ROLES':
            return { ...state, roles: action.payload }
        case 'SET_SINGER_COUNT': {
            const count = action.payload
            const singers: Singer[] = []
            for (let i = 0; i < count; i++) {
                singers.push({
                    id: i,
                    name: `Singer ${i + 1}`,
                    ...NEON_COLORS[i % NEON_COLORS.length],
                    micDeviceId: '',
                    vocalTrack: i === 0 ? 'lead' : 'backing'
                })
            }
            return { ...state, singerCount: count, singers }
        }
        case 'UPDATE_SINGER':
            return {
                ...state,
                singers: state.singers.map((s, i) =>
                    i === action.payload.index ? { ...s, ...action.payload.singer } : s
                )
            }
        case 'SET_PLAYING':
            return { ...state, isPlaying: action.payload }
        case 'SET_CURRENT_TIME':
            return { ...state, currentTime: action.payload }
        case 'SET_DURATION':
            return { ...state, duration: action.payload }
        case 'SET_VOLUME':
            return { ...state, volume: action.payload }
        case 'SET_VOCAL_VOLUME':
            return { ...state, vocalVolume: action.payload }
        case 'SET_PROCESSING':
            return { ...state, processingStatus: action.payload }
        case 'SET_STEMS_PATH':
            return { ...state, stemsPath: action.payload }
        case 'SET_SONG_PATH':
            return { ...state, songPath: action.payload }
        case 'SET_BACKGROUND_VIDEO':
            return { ...state, backgroundVideoPath: action.payload }
        case 'SET_MONITOR_DEVICES':
            return { ...state, monitorDeviceIds: action.payload }
        case 'SET_MAIN_OUTPUT':
            return { ...state, mainOutputId: action.payload }
        case 'SET_VOCAL_OFFSET':
            return { ...state, vocalOffsetMs: action.payload }
        case 'SET_SPOTIFY_AUTH':
            return { ...state, spotifyClientId: action.payload.clientId, spotifyClientSecret: action.payload.clientSecret }
        case 'SET_VOICE_EFFECTS':
            return { ...state, voiceEffects: action.payload }
        case 'SET_STAGE_MODE':
            return { ...state, stageMode: action.payload }
        case 'ENQUEUE_SONG':
            return { ...state, queue: [...state.queue, action.payload], currentTrack: null }
        case 'REPLACE_QUEUE_ITEM': {
            const { index, item } = action.payload
            const newQueue = [...state.queue]
            newQueue[index] = item
            return {
                ...state,
                queue: newQueue,
                currentTrack: null,
                editingQueueIndex: null
            }
        }
        case 'SET_EDITING_QUEUE_INDEX':
            return { ...state, editingQueueIndex: action.payload }
        case 'NEXT_SONG': {
            // Save current mic assignments to persistent micSlots
            const savedSlots = saveMicSlots(state)

            const newHistory = state.nowPlaying
                ? [...state.history, state.nowPlaying]
                : state.history
            if (state.queue.length === 0) {
                return { ...state, isPlaying: false, nowPlaying: null, stageMode: 'idle', history: newHistory, micSlots: savedSlots }
            }
            const nextItem = mergeMicSlotsIntoItem(state.queue[0], savedSlots)
            return {
                ...state,
                queue: state.queue.slice(1),
                nowPlaying: nextItem,
                history: newHistory,
                isPlaying: false,
                currentTime: 0,
                stageMode: 'ready',
                processingStatus: { stage: 'idle', progress: 0, message: '' },
                micSlots: ensureSlots(savedSlots, nextItem.singers.length)
            }
        }
        case 'PREV_SONG': {
            if (state.history.length === 0) return state
            // Save current mic assignments to persistent micSlots
            const savedSlots = saveMicSlots(state)

            const prevItem = mergeMicSlotsIntoItem(state.history[state.history.length - 1], savedSlots)
            const newQueue = state.nowPlaying
                ? [state.nowPlaying, ...state.queue]
                : state.queue
            return {
                ...state,
                nowPlaying: prevItem,
                queue: newQueue,
                history: state.history.slice(0, -1),
                isPlaying: false,
                currentTime: 0,
                stageMode: 'ready',
                processingStatus: { stage: 'idle', progress: 0, message: '' },
                micSlots: ensureSlots(savedSlots, prevItem.singers.length)
            }
        }
        case 'CLEAR_QUEUE':
            return { ...state, queue: [] }
        case 'REMOVE_FROM_QUEUE': {
            const index = action.payload
            let newEditing = state.editingQueueIndex
            if (newEditing === index) newEditing = null
            else if (newEditing !== null && newEditing > index) newEditing = newEditing - 1
            return {
                ...state,
                queue: state.queue.filter((_, i) => i !== index),
                editingQueueIndex: newEditing
            }
        }
        case 'REORDER_QUEUE':
            return { ...state, queue: action.payload, editingQueueIndex: null }
        case 'UPDATE_NOW_PLAYING_EFFECTS': {
            if (!state.nowPlaying) return state
            const currentEffects = state.nowPlaying.voiceEffects
            let newEffects: VoiceEffects[]
            if (Array.isArray(currentEffects)) {
                newEffects = [...currentEffects]
            } else if (currentEffects) {
                // Duplicate the single effect for all roles if it was uniform before
                const numRoles = Math.max(state.nowPlaying.singers.length, 1) // Just ensuring we have an array large enough
                newEffects = Array(numRoles).fill(currentEffects)
            } else {
                return state
            }

            // Ensure array has the index
            if (action.payload.singerIndex >= newEffects.length) {
                // If index is out of bounds, duplicate the last element until it reaches the index
                const lastEffect = newEffects[newEffects.length - 1]
                while (newEffects.length <= action.payload.singerIndex) {
                    newEffects.push(lastEffect)
                }
            }
            newEffects[action.payload.singerIndex] = action.payload.effects
            return {
                ...state,
                nowPlaying: {
                    ...state.nowPlaying,
                    voiceEffects: newEffects
                }
            }
        }
        case 'UPDATE_NOW_PLAYING_SINGER': {
            if (!state.nowPlaying) return state
            return {
                ...state,
                nowPlaying: {
                    ...state.nowPlaying,
                    singers: state.nowPlaying.singers.map(s =>
                        s.id === action.payload.singerId ? { ...s, ...action.payload.updates } : s
                    )
                }
            }
        }
        case 'SET_MIC_SLOT': {
            const { index, config } = action.payload
            const slots = [...state.micSlots]
            while (slots.length <= index) {
                slots.push({ micDeviceId: '', micLevel: 1.0 })
            }
            slots[index] = { ...slots[index], ...config }
            return { ...state, micSlots: slots }
        }
        case 'ENSURE_MIC_SLOTS': {
            const minCount = action.payload
            if (state.micSlots.length >= minCount) return state
            const slots = [...state.micSlots]
            while (slots.length < minCount) {
                slots.push({ micDeviceId: '', micLevel: 1.0 })
            }
            return { ...state, micSlots: slots }
        }
        case 'INIT_STATE':
            return { ...initialState, ...action.payload, editingQueueIndex: action.payload.editingQueueIndex ?? null }
        case 'RESET':
            return initialState
        case 'SET_KARAOKE_SESSION':
            return {
                ...state,
                karaokeSessionId: action.payload.sessionId,
                karaokeSessionCode: action.payload.sessionCode,
                karaokeQrDataUrl: action.payload.qrDataUrl
            }
        case 'CLEAR_KARAOKE_SESSION':
            return { ...state, karaokeSessionId: null, karaokeSessionCode: null, karaokeQrDataUrl: null }
        default:
            return state
    }
}

// ---- Context ----
interface AppContextValue {
    state: AppState
    dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, rawDispatch] = useReducer(reducer, initialState)
    const stateRef = useRef(state)
    const isRemoteRef = useRef(false)

    useEffect(() => { stateRef.current = state }, [state])

    const dispatch = useCallback((action: Action) => {
        rawDispatch(action)
        if (!isRemoteRef.current && action.type !== 'INIT_STATE' && window.electronAPI) {
            window.electronAPI.sendStateAction(action)
        }
    }, [])

    // Auto-pop queue when nothing is playing (main window only)
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.nowPlaying && state.queue.length > 0) {
            dispatch({ type: 'NEXT_SONG' })
        }
    }, [state.nowPlaying, state.queue.length, dispatch])

    useEffect(() => {
        if (!window.electronAPI) return

        const actionHandler = window.electronAPI.onStateAction((action: any) => {
            isRemoteRef.current = true
            rawDispatch(action)
            isRemoteRef.current = false
        })

        let initHandler: any
        let requestHandler: any

        if (window.electronAPI.isStageWindow) {
            initHandler = window.electronAPI.onInitState((fullState: any) => {
                isRemoteRef.current = true
                rawDispatch({ type: 'INIT_STATE', payload: fullState })
                isRemoteRef.current = false
            })
            window.electronAPI.requestInitState()
        } else {
            requestHandler = window.electronAPI.onInitStateRequest(() => {
                window.electronAPI.sendInitState(stateRef.current)
            })
        }

        return () => {
            window.electronAPI.offStateAction(actionHandler)
            if (initHandler) window.electronAPI.offInitState(initHandler)
            if (requestHandler) window.electronAPI.offInitStateRequest(requestHandler)
        }
    }, [])

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const context = useContext(AppContext)
    if (!context) throw new Error('useApp must be used within AppProvider')
    return context
}
