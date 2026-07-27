import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useMemo, ReactNode } from 'react'
import { UNIVERSAL_SINGER_COLORS, guestsById, type KaraokeGuestRow } from '@karaoke/shared'

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
    /** Stable session-scoped guest UUID when the singer is a known remote
     *  guest. The singer's display name and profile picture are resolved LIVE
     *  from the `karaoke_guests` record (see state.guests / useGuestsMap), so
     *  profile edits propagate. Singers with no guestId are admin/host- or
     *  name-only singers whose `name` is authoritative. Avatars are never
     *  stored on the singer — they live only on the canonical guest row. */
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

// A single singer's vocal-FX / autotune toggle override, set from the mobile
// companion's Stage tab. `undefined` field = no opinion (fall back to session
// flag, then default on).
export interface MicFxOverride {
    vocalFx?: boolean
    autotune?: boolean
}

// Stable key for the per-singer FX override map. Guest-linked singers key by
// their session-scoped guestId; name-only (admin/host) singers key by name.
// MUST match the mobile companion's `singerFxKey` exactly.
export function singerFxKey(args: { guestId?: string | null; name?: string | null }): string | null {
    if (args.guestId) return args.guestId
    if (args.name) return 'name:' + args.name
    return null
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
    // Per-song stage theme draft for the song being set up (null = inherit the
    // session theme / "Default"). Baked onto the QueueItem on add/update.
    stageTheme: string | null
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
    // Per-singer FX/autotune toggle overrides from the mobile companion,
    // keyed by singer key (guestId, or "name:<name>" for name-only singers).
    // Applied per-mic in KaraokePage so a guest's toggle only affects their
    // own mic. Absent key falls back to `sessionFx` (the companion website's
    // session-wide host toggle), then defaults on.
    micFxOverrides: Record<string, MicFxOverride>
    // Session-wide vocal FX / autotune flags (companion website host toggle).
    sessionFx: { vocalFx: boolean; autotune: boolean }
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
    // True while a freshly-set session is restoring its persisted now-playing
    // song from Supabase. Gates the auto-pop effect so it can't promote the
    // up-next song into the now-playing slot before the real now-playing song
    // (saved on the session row) has been restored — otherwise closing/reopening
    // the app skips both the playing song and the up-next song.
    hydratingNowPlaying: boolean
    themeName: string
    // ── Lobby Mode ──────────────────────────────────────────────────────────
    // The "collect songs before the show" mode. While it's on the stage holds
    // its themed join screen (QR + session code) no matter what's queued, and
    // NOTHING is pulled out of the queue into the on-deck slot: the host flips
    // it on at the start of the night, guests pile songs in, then flipping it
    // off hands the first song to the stage and everything runs as normal.
    lobbyMode: boolean
    // Randomly cycle the join screen through every theme's design (20s dwell,
    // crossfaded) while Lobby Mode is on. Ignored when lobbyMode is false.
    lobbyCycleThemes: boolean
    remotePlayCommand: 'play' | 'pause' | null
    remoteSkipCommand: boolean
    // Awards
    awards: Award[]
    awardResults: AwardResult[]
    awardsRevealStep: RevealStep | null
    // Live roster of session guests (canonical name + avatar source). Singers
    // reference guests by guestId; name/picture are resolved from here at
    // render time via useGuestsMap so profile edits propagate everywhere.
    guests: KaraokeGuestRow[]
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

// Persisted audio-device selections (main output, vocal monitor outputs, mic
// slots) so the app re-selects the same devices on the next launch. Device ids
// are stable per-origin in Electron, so a saved id matches the same physical
// device next time — selections that no longer enumerate are pruned at startup
// (see useAudioSync). Falls back to the empty defaults on any parse error.
interface AudioDevicePrefs {
    mainOutputId: string
    monitorDeviceIds: string[]
    micSlots: MicSlotConfig[]
}
function loadAudioDevicePrefs(): AudioDevicePrefs {
    const empty: AudioDevicePrefs = { mainOutputId: '', monitorDeviceIds: [], micSlots: [] }
    try {
        if (typeof localStorage === 'undefined') return empty
        const stored = localStorage.getItem('audioDevicePrefs')
        if (!stored) return empty
        const parsed = JSON.parse(stored)
        if (!parsed || typeof parsed !== 'object') return empty
        const mainOutputId = typeof parsed.mainOutputId === 'string' ? parsed.mainOutputId : ''
        const monitorDeviceIds = Array.isArray(parsed.monitorDeviceIds)
            ? parsed.monitorDeviceIds.filter((d: unknown): d is string => typeof d === 'string')
            : []
        const micSlots = Array.isArray(parsed.micSlots)
            ? parsed.micSlots.map((s: any): MicSlotConfig => ({
                micDeviceId: typeof s?.micDeviceId === 'string' ? s.micDeviceId : '',
                micLevel: typeof s?.micLevel === 'number' && Number.isFinite(s.micLevel) ? s.micLevel : 1.0,
            }))
            : []
        return { mainOutputId, monitorDeviceIds, micSlots }
    } catch {
        return empty
    }
}
const savedDevicePrefs = loadAudioDevicePrefs()

// Lobby Mode survives an app restart: a host who flipped it on to collect songs
// should still be collecting after a crash/reopen mid-night, not silently
// pushing the first song on deck. Both windows read the same store at startup;
// only the main window writes (see the persist effect in AppProvider).
interface LobbyPrefs {
    lobbyMode: boolean
    lobbyCycleThemes: boolean
}
function loadLobbyPrefs(): LobbyPrefs {
    const defaults: LobbyPrefs = { lobbyMode: false, lobbyCycleThemes: true }
    try {
        if (typeof localStorage === 'undefined') return defaults
        const stored = localStorage.getItem('lobbyPrefs')
        if (!stored) return defaults
        const parsed = JSON.parse(stored)
        if (!parsed || typeof parsed !== 'object') return defaults
        return {
            lobbyMode: parsed.lobbyMode === true,
            lobbyCycleThemes: parsed.lobbyCycleThemes !== false,
        }
    } catch {
        return defaults
    }
}
const savedLobbyPrefs = loadLobbyPrefs()

const initialState: AppState = {
    spotifyToken: null,
    currentTrack: null,
    lyrics: [],
    roles: [],
    stageTheme: null,
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
    micFxOverrides: {},
    sessionFx: { vocalFx: true, autotune: true },
    backgroundVideoPath: null,
    songPath: null,
    monitorDeviceIds: savedDevicePrefs.monitorDeviceIds,
    mainOutputId: savedDevicePrefs.mainOutputId,
    vocalOffsetMs: 165,
    vocalOffsetByDevice: loadVocalOffsetByDevice(),
    micSlots: savedDevicePrefs.micSlots,
    spotifyClientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID || null,
    spotifyClientSecret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || null,
    editingQueueIndex: null,
    karaokeSessionId: null,
    karaokeSessionCode: null,
    karaokeSessionName: null,
    karaokeQrDataUrl: null,
    hydratingNowPlaying: false,
    themeName: 'neo-brutal',
    lobbyMode: savedLobbyPrefs.lobbyMode,
    lobbyCycleThemes: savedLobbyPrefs.lobbyCycleThemes,
    remotePlayCommand: null,
    remoteSkipCommand: false,
    awards: [],
    awardResults: [],
    awardsRevealStep: null,
    guests: []
}

// ---- Actions ----
type Action =
    | { type: 'SET_TOKEN'; payload: string }
    | { type: 'SET_TRACK'; payload: SpotifyTrack }
    | { type: 'SET_LYRICS'; payload: LyricLine[] }
    | { type: 'SET_ROLES'; payload: string[] }
    | { type: 'SET_SINGER_COUNT'; payload: number }
    | { type: 'UPDATE_SINGER'; payload: { index: number; singer: Partial<Singer> } }
    | { type: 'ADD_SINGER'; payload: { name: string; guestId?: string; color?: string; colorGlow?: string } }
    | { type: 'REMOVE_SINGER'; payload: number }
    | { type: 'SET_STAGE_THEME'; payload: string | null }
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
    | { type: 'SET_MIC_FX_OVERRIDES'; payload: Record<string, MicFxOverride> }
    | { type: 'SET_SESSION_FX'; payload: { vocalFx: boolean; autotune: boolean } }
    | { type: 'SET_STAGE_MODE'; payload: StageMode }
    | { type: 'ENQUEUE_SONG'; payload: QueueItem }
    // NEXT_SONG / PREV_SONG carry an OPTIONAL precomputed result. The main
    // window (authoritative for playback) resolves the transition from its
    // live queue and attaches the result here before relaying, so the stage
    // window applies the identical nowPlaying/queue instead of independently
    // re-deriving it (see the dispatch wrapper in AppProvider).
    | { type: 'NEXT_SONG'; payload?: Partial<AppState> }
    | { type: 'PREV_SONG'; payload?: Partial<AppState> }
    // Restore the now-playing song persisted on the session row when resuming a
    // session. Payload is the resolved QueueItem, or null when there's nothing
    // to restore. Either way it clears the hydratingNowPlaying gate. Unlike
    // NEXT_SONG it does NOT pop the queue — the up-next song stays put.
    | { type: 'RESTORE_NOW_PLAYING'; payload: QueueItem | null }
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
    | { type: 'SET_LOBBY_MODE'; payload: boolean }
    | { type: 'SET_LOBBY_CYCLE_THEMES'; payload: boolean }
    | { type: 'SET_REMOTE_PLAY_COMMAND'; payload: 'play' | 'pause' | null }
    | { type: 'SET_REMOTE_SKIP_COMMAND'; payload: boolean }
    | { type: 'SET_AWARDS'; payload: Award[] }
    | { type: 'UPSERT_AWARD'; payload: Award }
    | { type: 'REMOVE_AWARD'; payload: string }
    | { type: 'SET_AWARD_RESULTS'; payload: AwardResult[] }
    | { type: 'SET_REVEAL_STEP'; payload: RevealStep | null }
    | { type: 'SET_GUESTS'; payload: KaraokeGuestRow[] }

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

// Resolve a NEXT_SONG transition into the set of state fields it changes.
// Pure + deterministic given `state`, so the main window can compute it once
// and broadcast the result for the stage window to apply verbatim.
function resolveNextSong(state: AppState): Partial<AppState> {
    // Save current mic assignments to persistent micSlots
    const savedSlots = saveMicSlots(state)

    const newHistory = state.nowPlaying
        ? [...state.history, state.nowPlaying]
        : state.history
    // Lobby Mode never puts a song on deck — finishing (or skipping) the
    // current song returns the stage to the join screen and leaves the queue
    // untouched, so guests keep piling songs in until the host ends the lobby.
    if (state.lobbyMode || state.queue.length === 0) {
        return { isPlaying: false, nowPlaying: null, stageMode: 'idle', history: newHistory, micSlots: savedSlots }
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

// Resolve a PREV_SONG transition. Returns null when there's no history to go
// back to (the reducer treats that as a no-op).
function resolvePrevSong(state: AppState): Partial<AppState> | null {
    if (state.history.length === 0) return null
    // Save current mic assignments to persistent micSlots
    const savedSlots = saveMicSlots(state)

    const prevItem = mergeMicSlotsIntoItem(state.history[state.history.length - 1], savedSlots)
    const newQueue = state.nowPlaying
        ? [state.nowPlaying, ...state.queue]
        : state.queue
    return {
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
                stageTheme: null,
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
        case 'ADD_SINGER': {
            // Append a singer — either a linked guest (guestId set; name/avatar
            // resolve live from the roster) or a custom name-only singer. Pick
            // the caller-supplied colour pair, else the first unused NEON colour.
            const { name, guestId, color, colorGlow } = action.payload
            const used = new Set(state.singers.map(s => s.color))
            const chosen = (color && colorGlow)
                ? { color, colorGlow }
                : (NEON_COLORS.find(c => !used.has(c.color)) ?? NEON_COLORS[state.singers.length % NEON_COLORS.length])
            const nextId = state.singers.reduce((m, s) => Math.max(m, s.id), -1) + 1
            const singer: Singer = {
                id: nextId,
                name: name || `Singer ${state.singers.length + 1}`,
                color: chosen.color,
                colorGlow: chosen.colorGlow,
                micDeviceId: '',
                vocalTrack: state.singers.length === 0 ? 'lead' : 'backing',
                roleIndices: [],
                ...(guestId ? { guestId } : {}),
            }
            const singers = [...state.singers, singer]
            return { ...state, singers, singerCount: singers.length }
        }
        case 'REMOVE_SINGER': {
            const singers = state.singers.filter(s => s.id !== action.payload)
            return { ...state, singers, singerCount: singers.length }
        }
        case 'SET_STAGE_THEME':
            return { ...state, stageTheme: action.payload }
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
        case 'SET_MIC_FX_OVERRIDES':
            return { ...state, micFxOverrides: action.payload }
        case 'SET_SESSION_FX':
            return { ...state, sessionFx: action.payload }
        case 'SET_STAGE_MODE':
            return { ...state, stageMode: action.payload }
        case 'ENQUEUE_SONG': {
            // INVARIANT: callers MUST supply payload.createdAt (QueuePage and
            // resolveRemoteRow both do). createdAt is the final tiebreaker in
            // sortQueueByScore, so a per-window `new Date()` fallback here
            // would make the main and stage windows order tied songs
            // differently and disagree on which song is "next". The fallback
            // below only exists to avoid an undefined timestamp.
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
            // Also stamp the id onto nowPlaying: the FIRST song dropped on an
            // empty queue auto-pops into the now-playing slot BEFORE its
            // companion INSERT resolves, so by the time this lands the item has
            // already left state.queue. Without this the now-playing item never
            // carries its row id and its queue row is never retired — leaving
            // the active song stuck in the companion/mobile queue.
            return {
                ...state,
                queue: state.queue.map(q => q.id === itemId ? { ...q, remoteQueueId } : q),
                nowPlaying: state.nowPlaying && state.nowPlaying.id === itemId
                    ? { ...state.nowPlaying, remoteQueueId }
                    : state.nowPlaying,
            }
        }
        case 'SET_EDITING_QUEUE_INDEX':
            return { ...state, editingQueueIndex: action.payload }
        case 'NEXT_SONG':
            // Prefer the authoritative result computed by the main window
            // (action.payload). Fall back to computing locally so the reducer
            // stays correct if invoked without a precomputed payload.
            return { ...state, ...(action.payload ?? resolveNextSong(state)) }
        case 'PREV_SONG': {
            const resolved = action.payload ?? resolvePrevSong(state)
            if (!resolved) return state
            return { ...state, ...resolved }
        }
        case 'RESTORE_NOW_PLAYING': {
            // Always lower the gate. With no song to restore (or a live song
            // already playing), only the flag changes — the auto-pop effect
            // then handles a genuinely empty now-playing slot.
            if (!action.payload || state.nowPlaying) {
                return { ...state, hydratingNowPlaying: false }
            }
            // Merge persisted mic slots into the restored singers so the saved
            // mic devices route correctly without re-selecting them.
            const item = mergeMicSlotsIntoItem(action.payload, state.micSlots)
            return {
                ...state,
                nowPlaying: item,
                stageMode: 'ready',
                isPlaying: false,
                currentTime: 0,
                processingStatus: { stage: 'idle', progress: 0, message: '' },
                micSlots: ensureSlots(state.micSlots, item.singers.length),
                hydratingNowPlaying: false
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
                karaokeQrDataUrl: action.payload.qrDataUrl,
                // Raise the gate atomically with the session id so the auto-pop
                // effect can't fire while the queue hydrates — it stays down
                // until RESTORE_NOW_PLAYING resolves the persisted now-playing.
                hydratingNowPlaying: true
            }
        case 'CLEAR_KARAOKE_SESSION':
            return { ...state, karaokeSessionId: null, karaokeSessionCode: null, karaokeSessionName: null, karaokeQrDataUrl: null }
        case 'SET_THEME_NAME':
            return { ...state, themeName: action.payload }
        case 'SET_LOBBY_MODE': {
            if (!action.payload) return { ...state, lobbyMode: false }
            // Turning Lobby Mode ON must leave nothing on deck. A song that's
            // merely waiting (loaded but not started) goes back into the queue
            // to compete for votes with everything else; a song that's actually
            // playing is left alone to finish — resolveNextSong then drops the
            // stage back to the lobby instead of pulling the next song up.
            // Locks come off across the board: with no next-up slot, nothing is
            // pinned (see the lock effect in useKaraokeSession, which also
            // clears the flag in Supabase for remote clients).
            const unlocked = state.queue.some(q => q.locked)
                ? state.queue.map(q => (q.locked ? { ...q, locked: false } : q))
                : state.queue
            const returned = state.nowPlaying && !state.isPlaying
                ? { ...state.nowPlaying, locked: false }
                : null
            if (returned) {
                return {
                    ...state,
                    lobbyMode: true,
                    queue: sortQueueByScore([...unlocked, returned]),
                    nowPlaying: null,
                    stageMode: 'idle',
                    currentTime: 0,
                }
            }
            return { ...state, lobbyMode: true, queue: sortQueueByScore(unlocked) }
        }
        case 'SET_LOBBY_CYCLE_THEMES':
            return { ...state, lobbyCycleThemes: action.payload }
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
        case 'SET_GUESTS':
            return { ...state, guests: action.payload }
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
    const isStageWindow = window.electronAPI?.isStageWindow ?? false

    useEffect(() => { stateRef.current = state }, [state])

    const dispatch = useCallback((action: Action) => {
        let outgoing: Action = action
        // The main window is the single source of truth for playback
        // transitions. Resolve NEXT_SONG / PREV_SONG against the live state
        // here and attach the result to the action, so the relayed action
        // carries an explicit nowPlaying/queue. Otherwise each window
        // re-derives the transition from its own queue and they can disagree
        // on tie-broken sort order — making the stage display one song while
        // the (audio-owning) main window plays another.
        if (
            !isRemoteRef.current &&
            !isStageWindow &&
            (action.type === 'NEXT_SONG' || action.type === 'PREV_SONG') &&
            !action.payload
        ) {
            const resolved = action.type === 'NEXT_SONG'
                ? resolveNextSong(stateRef.current)
                : resolvePrevSong(stateRef.current)
            if (!resolved) {
                // PREV_SONG with no history — nothing changes, don't relay.
                rawDispatch(action)
                return
            }
            outgoing = { type: action.type, payload: resolved } as Action
        }
        rawDispatch(outgoing)
        if (!isRemoteRef.current && outgoing.type !== 'INIT_STATE' && window.electronAPI) {
            window.electronAPI.sendStateAction(outgoing)
        }
    }, [isStageWindow])

    // Auto-pop queue when nothing is playing (main window only). Held off while
    // a resumed session is still restoring its persisted now-playing song, so
    // it can't promote the up-next song into the now-playing slot first and
    // skip both songs on app restart.
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (state.hydratingNowPlaying) return
        // Lobby Mode holds the queue closed — nothing goes on deck until the
        // host ends the lobby, at which point this fires and the top song
        // (highest voted) takes the stage.
        if (state.lobbyMode) return
        if (!state.nowPlaying && state.queue.length > 0) {
            dispatch({ type: 'NEXT_SONG' })
        }
    }, [state.nowPlaying, state.queue.length, state.hydratingNowPlaying, state.lobbyMode, dispatch])

    // Persist the Lobby Mode flags (main window only — the stage mirrors relayed
    // state and must never write its own, possibly pre-INIT, values back).
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        try {
            localStorage.setItem('lobbyPrefs', JSON.stringify({
                lobbyMode: state.lobbyMode,
                lobbyCycleThemes: state.lobbyCycleThemes,
            }))
        } catch { /* localStorage may be unavailable; ignore */ }
    }, [state.lobbyMode, state.lobbyCycleThemes])

    // Persist the per-device vocal offset map across app restarts.
    useEffect(() => {
        try {
            localStorage.setItem('vocalOffsetByDevice', JSON.stringify(state.vocalOffsetByDevice))
        } catch { /* localStorage may be unavailable; ignore */ }
    }, [state.vocalOffsetByDevice])

    // Persist audio-device selections (main output, vocal monitors, mic slots)
    // so they auto-select on the next launch. Main window only — device picking
    // lives there and the stage window just mirrors the relayed state, so we
    // don't want it writing (possibly pre-INIT) values back to the same store.
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        try {
            localStorage.setItem('audioDevicePrefs', JSON.stringify({
                mainOutputId: state.mainOutputId,
                monitorDeviceIds: state.monitorDeviceIds,
                micSlots: state.micSlots,
            }))
        } catch { /* localStorage may be unavailable; ignore */ }
    }, [state.mainOutputId, state.monitorDeviceIds, state.micSlots])

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

// Live guestId -> guest lookup, memoized off state.guests. Renderers use this
// to resolve a singer's current name + profile picture from the canonical
// guest record (so profile edits propagate). Works in both the main and stage
// windows: state.guests is kept in sync via the SET_GUESTS IPC relay.
export function useGuestsMap(): Map<string, KaraokeGuestRow> {
    const { state } = useApp()
    return useMemo(() => guestsById(state.guests), [state.guests])
}
