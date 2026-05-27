import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, ReactNode } from 'react'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'

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

export interface Syllable {
    text: string
    startMs: number
    durMs: number
}

export interface LyricLine {
    startTimeMs: number
    endTimeMs?: number
    words: string
    syllables?: Syllable[]
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
    profilePicture?: string
    /** Stable session-scoped guest UUID when the singer is a known remote
     *  guest. Carried through the SingerConfig round-trip so mobile can
     *  match "is this me singing?" by id instead of by display name. */
    guestId?: string
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
    micLevel?: number
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
    stageTheme?: string | null
    isHidden?: boolean
    score?: number
    bonusPoints?: number
    locked?: boolean
    createdAt?: string
}

// Vote-weighted sort: locked items pinned to top, then by (score + bonus)
// desc, with insertion-order (createdAt asc) as the tiebreaker.
export function sortQueueByScore(queue: QueueItem[]): QueueItem[] {
    return [...queue].sort((a, b) => {
        const aLocked = a.locked ? 1 : 0
        const bLocked = b.locked ? 1 : 0
        if (aLocked !== bLocked) return bLocked - aLocked
        const aTotal = (a.score ?? 0) + (a.bonusPoints ?? 0)
        const bTotal = (b.score ?? 0) + (b.bonusPoints ?? 0)
        if (aTotal !== bTotal) return bTotal - aTotal
        const aTime = a.createdAt ? Date.parse(a.createdAt) : 0
        const bTime = b.createdAt ? Date.parse(b.createdAt) : 0
        return aTime - bTime
    })
}

export type StageMode = 'idle' | 'ready' | 'playing' | 'awards'

// Awards types re-exported from awards/types so AppState references don't pull
// the whole awards subsystem in.
import type { Award, AwardResult, RevealStep } from '../awards/types'
export type { Award, AwardResult, RevealStep }

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
    // Last-applied vocal offset per output device id. Persisted to
    // localStorage so a previously-measured offset (e.g. for AirPods) is
    // restored automatically when you switch back to that device.
    vocalOffsetByDevice: Record<string, number>
    micSlots: MicSlotConfig[]
    // Spotify Auth
    spotifyClientId: string | null
    spotifyClientSecret: string | null
    // Edit flow: when editing a queue item in place
    editingQueueIndex: number | null
    // Karaoke session
    karaokeSessionId: string | null
    karaokeSessionCode: string | null
    karaokeSessionName: string | null
    karaokeQrDataUrl: string | null
    themeName: string
    remotePlayCommand: 'play' | 'pause' | null
    remoteSkipCommand: boolean
    // Awards
    awards: Award[]
    awardResults: AwardResult[]
    awardsRevealStep: RevealStep | null
}

// Universal singer palette — re-exported from the shared package so desktop
// callers that already imported NEON_COLORS keep working. The actual values
// live in packages/shared/src/themes/singerColors.ts.
export const NEON_COLORS = UNIVERSAL_SINGER_COLORS

// Hydrate the vocal-offset-by-device map from localStorage at startup.
// Falls back to {} on any parse / storage error.
function loadVocalOffsetByDevice(): Record<string, number> {
    try {
        if (typeof localStorage === 'undefined') return {}
        const stored = localStorage.getItem('vocalOffsetByDevice')
        if (!stored) return {}
        const parsed = JSON.parse(stored)
        if (!parsed || typeof parsed !== 'object') return {}
        const result: Record<string, number> = {}
        for (const [k, v] of Object.entries(parsed)) {
            if (typeof k === 'string' && typeof v === 'number' && Number.isFinite(v)) {
                result[k] = v
            }
        }
        return result
    } catch {
        return {}
    }
}

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
    vocalOffsetByDevice: loadVocalOffsetByDevice(),
    micSlots: [],
    spotifyClientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID || null,
    spotifyClientSecret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || null,
    editingQueueIndex: null,
    karaokeSessionId: null,
    karaokeSessionCode: null,
    karaokeSessionName: null,
    karaokeQrDataUrl: null,
    themeName: 'neo-brutal',
    remotePlayCommand: null,
    remoteSkipCommand: false,
    awards: [],
    awardResults: [],
    awardsRevealStep: null
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
    | { type: 'SET_QUEUE_ITEM_REMOTE_ID'; payload: { itemId: string; remoteQueueId: string } }
    | { type: 'REORDER_QUEUE'; payload: QueueItem[] }
    | { type: 'UPDATE_QUEUE_ITEM_SCORE'; payload: { remoteQueueId: string; score?: number; bonusPoints?: number; locked?: boolean } }
    | { type: 'APPLY_REMOTE_EDIT'; payload: { remoteQueueId: string; singers: Singer[]; stageTheme: string | null; isHidden: boolean } }
    | { type: 'LOCK_NEXT_UP' }
    | { type: 'BUMP_BONUS_POINTS' }
    | { type: 'SET_EDITING_QUEUE_INDEX'; payload: number | null }
    | { type: 'UPDATE_NOW_PLAYING_EFFECTS'; payload: { singerIndex: number; effects: VoiceEffects } }
    | { type: 'UPDATE_NOW_PLAYING_SINGER'; payload: { singerId: number; updates: Partial<Singer> } }
    | { type: 'SET_MIC_SLOT'; payload: { index: number; config: Partial<MicSlotConfig> } }
    | { type: 'ENSURE_MIC_SLOTS'; payload: number }
    | { type: 'INIT_STATE'; payload: AppState }
    | { type: 'RESET' }
    | { type: 'SET_KARAOKE_SESSION'; payload: { sessionId: string; sessionCode: string; qrDataUrl: string; sessionName: string | null } }
    | { type: 'CLEAR_KARAOKE_SESSION' }
    | { type: 'SET_THEME_NAME'; payload: string }
    | { type: 'SET_REMOTE_PLAY_COMMAND'; payload: 'play' | 'pause' | null }
    | { type: 'SET_REMOTE_SKIP_COMMAND'; payload: boolean }
    | { type: 'SET_AWARDS'; payload: Award[] }
    | { type: 'UPSERT_AWARD'; payload: Award }
    | { type: 'REMOVE_AWARD'; payload: string }
    | { type: 'SET_AWARD_RESULTS'; payload: AwardResult[] }
    | { type: 'SET_REVEAL_STEP'; payload: RevealStep | null }

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
        case 'SET_VOCAL_OFFSET': {
            // Always update the live offset. If a vocal monitor device is
            // currently selected, also remember this value for that device
            // so it auto-restores next time the same device is picked.
            const deviceId = state.monitorDeviceIds[0] || ''
            const newOffsetByDevice = (deviceId && state.vocalOffsetByDevice[deviceId] !== action.payload)
                ? { ...state.vocalOffsetByDevice, [deviceId]: action.payload }
                : state.vocalOffsetByDevice
            return {
                ...state,
                vocalOffsetMs: action.payload,
                vocalOffsetByDevice: newOffsetByDevice,
            }
        }
        case 'SET_SPOTIFY_AUTH':
            return { ...state, spotifyClientId: action.payload.clientId, spotifyClientSecret: action.payload.clientSecret }
        case 'SET_VOICE_EFFECTS':
            return { ...state, voiceEffects: action.payload }
        case 'SET_STAGE_MODE':
            return { ...state, stageMode: action.payload }
        case 'ENQUEUE_SONG': {
            const incoming: QueueItem = {
                ...action.payload,
                score: action.payload.score ?? 0,
                bonusPoints: action.payload.bonusPoints ?? 0,
                locked: action.payload.locked ?? false,
                createdAt: action.payload.createdAt ?? new Date().toISOString(),
            }
            return {
                ...state,
                queue: sortQueueByScore([...state.queue, incoming]),
                currentTrack: null
            }
        }
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
        case 'SET_QUEUE_ITEM_REMOTE_ID': {
            const { itemId, remoteQueueId } = action.payload
            return {
                ...state,
                queue: state.queue.map(q => q.id === itemId ? { ...q, remoteQueueId } : q)
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
            const sorted = sortQueueByScore(state.queue)
            const nextItem = mergeMicSlotsIntoItem(sorted[0], savedSlots)
            // Award +1 bonus point to every remaining song so long-waiting tracks
            // eventually surface, then re-sort and lock the new position-0.
            const remaining = sorted.slice(1).map(item => ({
                ...item,
                bonusPoints: (item.bonusPoints ?? 0) + 1
            }))
            const resorted = sortQueueByScore(remaining)
            if (resorted.length > 0) {
                resorted[0] = { ...resorted[0], locked: true }
            }
            return {
                ...state,
                queue: resorted,
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
        case 'UPDATE_QUEUE_ITEM_SCORE': {
            const { remoteQueueId, score, bonusPoints, locked } = action.payload
            const updated = state.queue.map(q => {
                if (q.remoteQueueId !== remoteQueueId) return q
                return {
                    ...q,
                    score: score !== undefined ? score : q.score,
                    bonusPoints: bonusPoints !== undefined ? bonusPoints : q.bonusPoints,
                    locked: locked !== undefined ? locked : q.locked,
                }
            })
            return { ...state, queue: sortQueueByScore(updated) }
        }
        case 'APPLY_REMOTE_EDIT': {
            // Guest edited their queued song (via mobile or website). Update
            // singer config / stage theme / hidden flag without touching
            // score, bonus, locked, or any catalog-derived fields. Sort isn't
            // affected — score didn't change, so we skip sortQueueByScore.
            const { remoteQueueId, singers, stageTheme, isHidden } = action.payload
            const updated = state.queue.map(q =>
                q.remoteQueueId === remoteQueueId
                    ? { ...q, singers, stageTheme, isHidden }
                    : q
            )
            return { ...state, queue: updated }
        }
        case 'LOCK_NEXT_UP': {
            if (state.queue.length === 0) return state
            if (state.queue[0].locked) return state
            const newQueue = [...state.queue]
            newQueue[0] = { ...newQueue[0], locked: true }
            return { ...state, queue: newQueue }
        }
        case 'BUMP_BONUS_POINTS': {
            const bumped = state.queue.map(q => ({
                ...q,
                bonusPoints: (q.bonusPoints ?? 0) + 1
            }))
            return { ...state, queue: sortQueueByScore(bumped) }
        }
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
                karaokeSessionName: action.payload.sessionName,
                karaokeQrDataUrl: action.payload.qrDataUrl
            }
        case 'CLEAR_KARAOKE_SESSION':
            return { ...state, karaokeSessionId: null, karaokeSessionCode: null, karaokeSessionName: null, karaokeQrDataUrl: null }
        case 'SET_THEME_NAME':
            return { ...state, themeName: action.payload }
        case 'SET_REMOTE_PLAY_COMMAND':
            return { ...state, remotePlayCommand: action.payload }
        case 'SET_REMOTE_SKIP_COMMAND':
            return { ...state, remoteSkipCommand: action.payload }
        case 'SET_AWARDS':
            return { ...state, awards: action.payload }
        case 'UPSERT_AWARD': {
            const exists = state.awards.some(a => a.id === action.payload.id)
            const awards = exists
                ? state.awards.map(a => a.id === action.payload.id ? action.payload : a)
                : [...state.awards, action.payload]
            return { ...state, awards }
        }
        case 'REMOVE_AWARD':
            return { ...state, awards: state.awards.filter(a => a.id !== action.payload) }
        case 'SET_AWARD_RESULTS':
            return { ...state, awardResults: action.payload }
        case 'SET_REVEAL_STEP': {
            const step = action.payload
            const stageMode: StageMode = step && step.phase !== 'done' && step.phase !== 'idle'
                ? 'awards'
                : (state.stageMode === 'awards' ? 'idle' : state.stageMode)
            return { ...state, awardsRevealStep: step, stageMode }
        }
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

    // Persist the per-device vocal offset map across app restarts.
    useEffect(() => {
        try {
            localStorage.setItem('vocalOffsetByDevice', JSON.stringify(state.vocalOffsetByDevice))
        } catch { /* localStorage may be unavailable; ignore */ }
    }, [state.vocalOffsetByDevice])

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
