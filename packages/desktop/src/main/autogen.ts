// Song auto-generation queue (main process).
//
// Runs scripts/generate-song.js — Spotify track → YouTube Music audio → local
// vocal separation → library import → headless Claude Code tuning pass — one
// track at a time, relays its JSON-lines progress to the renderer, mirrors it
// onto the guest's `karaoke_song_requests` row, and pushes the catalog when a
// song lands so guests can queue it right away.
//
// Lives in the main process (not AdminPage) so requests keep generating no
// matter which page the host is on.

import { app, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as readline from 'readline'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
    GenerationStatus, SongRequestRow,
    listOpenSongRequests, removeRealtimeChannel, subscribeToSongRequests, updateSongRequestGeneration,
} from './supabase'

export type AutogenStage =
    | 'queued' | 'resolving' | 'searching' | 'downloading' | 'separating'
    | 'importing' | 'analyzing' | 'tuning' | 'ready' | 'failed'

export interface AutogenJob {
    trackId: string
    name: string
    artist: string
    artUrl: string | null
    /** karaoke_song_requests rows waiting on this track (several guests can ask). */
    requestIds: string[]
    requestedBy: string | null
    /** Only re-run the Claude pass on a song that's already generated. */
    agentOnly?: boolean
    stage: AutogenStage
    /** 0-100 across the whole pipeline. */
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

export interface AutogenSettings {
    /** Start generating as soon as a guest requests a song we don't have. */
    autoGenerateRequests: boolean
}

export interface AutogenStatus {
    available: boolean
    unavailableReason?: string
    settings: AutogenSettings
    jobs: AutogenJob[]
}

export interface AutogenTrackInput {
    trackId: string
    name: string
    artist: string
    artUrl?: string | null
    requestId?: string | null
    /** Carry over every waiting request (retry). */
    requestIds?: string[]
    requestedBy?: string | null
    agentOnly?: boolean
}

interface AutogenHooks {
    /** A song just landed in the library (push catalog, notify windows). */
    onSongReady: (trackId: string) => Promise<void>
    /** Tracks the library already has — requests for these resolve immediately. */
    isInLibrary: (trackId: string) => boolean
}

const AUTOGEN_DIR = path.join(os.homedir(), '.realtime-karaoke', 'autogen')
const SETTINGS_PATH = path.join(AUTOGEN_DIR, 'settings.json')
const VENV_PYTHON = path.join(os.homedir(), '.realtime-karaoke', 'separator-venv', 'bin', 'python')
const FFMPEG_CANDIDATES = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg']
// Finished jobs linger in the panel this long so the host sees the outcome.
const FINISHED_JOB_TTL_MS = 30 * 60 * 1000

let hooks: AutogenHooks | null = null
let settings: AutogenSettings = loadSettings()
const jobs: AutogenJob[] = []
let running: { job: AutogenJob; child: ChildProcess; cancelled: boolean } | null = null
let sessionId: string | null = null
let requestChannel: RealtimeChannel | null = null

// Throttle request-row writes: stage changes go out immediately, progress at
// most every few seconds.
const lastRowWrite = new Map<string, { at: number; overall: number; status: GenerationStatus }>()

function loadSettings(): AutogenSettings {
    try {
        const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
        return { autoGenerateRequests: raw.autoGenerateRequests !== false }
    } catch {
        return { autoGenerateRequests: true }
    }
}

function saveSettings(): void {
    fs.mkdirSync(AUTOGEN_DIR, { recursive: true })
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

function scriptPath(): string {
    return path.join(app.getAppPath(), 'scripts', 'generate-song.js')
}

function repoRoot(): string {
    return path.resolve(app.getAppPath(), '..', '..')
}

function availability(): { available: boolean; reason?: string } {
    if (!fs.existsSync(scriptPath())) return { available: false, reason: 'generate-song.js not found' }
    if (!fs.existsSync(VENV_PYTHON)) {
        return { available: false, reason: 'Run packages/desktop/scripts/autogen/setup.sh to install the separation model' }
    }
    if (!FFMPEG_CANDIDATES.some(p => fs.existsSync(p))) return { available: false, reason: 'ffmpeg not installed (brew install ffmpeg)' }
    return { available: true }
}

export function getAutogenStatus(): AutogenStatus {
    const now = Date.now()
    for (let i = jobs.length - 1; i >= 0; i--) {
        const j = jobs[i]
        if (j.finishedAt && now - j.finishedAt > FINISHED_JOB_TTL_MS) jobs.splice(i, 1)
    }
    const a = availability()
    return { available: a.available, unavailableReason: a.reason, settings: { ...settings }, jobs: jobs.map(j => ({ ...j, requestIds: [...j.requestIds] })) }
}

function broadcast(): void {
    const status = getAutogenStatus()
    for (const w of BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed()) w.webContents.send('autogen:update', status)
    }
}

// generate-song.js stages → the coarser `generation_status` guests see.
function rowStatus(stage: AutogenStage): GenerationStatus {
    switch (stage) {
        case 'queued': return 'queued'
        case 'resolving': case 'searching': case 'downloading': return 'downloading'
        case 'separating': return 'separating'
        case 'importing': case 'analyzing': return 'importing'
        case 'tuning': return 'tuning'
        case 'ready': return 'ready'
        case 'failed': return 'failed'
    }
}

function syncRows(job: AutogenJob, force = false): void {
    if (job.requestIds.length === 0) return
    const status = rowStatus(job.stage)
    const prev = lastRowWrite.get(job.trackId)
    const now = Date.now()
    if (!force && prev && prev.status === status && (now - prev.at < 3000 || Math.abs(prev.overall - job.overall) < 3)) return
    lastRowWrite.set(job.trackId, { at: now, overall: job.overall, status })
    const terminal = status === 'ready' || status === 'failed'
    void updateSongRequestGeneration(job.requestIds, {
        generationStatus: status,
        progress: job.overall,
        error: status === 'failed' ? friendlyError(job) : null,
        markAdded: status === 'ready',
    }).finally(() => { if (terminal) lastRowWrite.delete(job.trackId) })
}

// What a guest sees when generation fails — no stack traces, no file paths.
function friendlyError(job: AutogenJob): string {
    switch (job.errorCode) {
        case 'no-match': return "Couldn't find an official recording of this song to work from."
        case 'download': return "Couldn't download this song right now — the host can retry."
        case 'setup': return 'Song generation is not set up on the host computer.'
        case 'cancelled': return 'The host cancelled this one.'
        default: return 'Something went wrong generating this song.'
    }
}

function findJob(trackId: string): AutogenJob | undefined {
    return jobs.find(j => j.trackId === trackId)
}

export function enqueueAutogen(input: AutogenTrackInput): AutogenJob {
    let job = findJob(input.trackId)
    if (job && (job.stage === 'failed' || job.stage === 'ready')) {
        // Re-request after a finished run: start fresh.
        jobs.splice(jobs.indexOf(job), 1)
        job = undefined
    }
    if (job) {
        if (input.requestId && !job.requestIds.includes(input.requestId)) {
            job.requestIds.push(input.requestId)
            syncRows(job, true)
        }
        broadcast()
        return job
    }
    job = {
        trackId: input.trackId,
        name: input.name,
        artist: input.artist,
        artUrl: input.artUrl ?? null,
        requestIds: [...(input.requestIds ?? []), ...(input.requestId ? [input.requestId] : [])]
            .filter((id, i, all) => all.indexOf(id) === i),
        requestedBy: input.requestedBy ?? null,
        agentOnly: !!input.agentOnly,
        stage: 'queued',
        overall: 0,
        createdAt: Date.now(),
    }
    jobs.push(job)
    syncRows(job, true)
    broadcast()
    pump()
    return job
}

export function cancelAutogen(trackId: string): void {
    const job = findJob(trackId)
    if (!job) return
    if (running && running.job === job) {
        running.cancelled = true
        // The orchestrator runs python + Claude Code as children; kill the group.
        try { if (running.child.pid) process.kill(-running.child.pid, 'SIGTERM') } catch { running.child.kill('SIGTERM') }
        return
    }
    if (job.stage === 'queued') {
        job.stage = 'failed'
        job.errorCode = 'cancelled'
        job.error = 'Cancelled'
        job.finishedAt = Date.now()
        syncRows(job, true)
        broadcast()
    }
}

export function retryAutogen(trackId: string): void {
    const job = findJob(trackId)
    if (!job || job.stage !== 'failed') return
    enqueueAutogen({
        trackId: job.trackId, name: job.name, artist: job.artist, artUrl: job.artUrl,
        requestIds: job.requestIds, requestedBy: job.requestedBy, agentOnly: job.agentOnly,
    })
}

export function dismissAutogen(trackId: string): void {
    const job = findJob(trackId)
    if (!job || !job.finishedAt) return
    jobs.splice(jobs.indexOf(job), 1)
    broadcast()
}

export function setAutogenSettings(next: Partial<AutogenSettings>): AutogenStatus {
    settings = { ...settings, ...next }
    saveSettings()
    if (next.autoGenerateRequests && sessionId) void catchUpRequests(sessionId)
    broadcast()
    return getAutogenStatus()
}

function pump(): void {
    if (running) return
    const next = jobs.find(j => j.stage === 'queued')
    if (!next) return
    const a = availability()
    if (!a.available) {
        next.stage = 'failed'
        next.errorCode = 'setup'
        next.error = a.reason
        next.finishedAt = Date.now()
        syncRows(next, true)
        broadcast()
        pump()
        return
    }
    start(next)
}

function start(job: AutogenJob): void {
    job.startedAt = Date.now()
    job.stage = 'resolving'
    const args = [scriptPath(), job.trackId, '--events', ...(job.agentOnly ? ['--agent-only'] : [])]
    const child = spawn(process.execPath, args, {
        cwd: repoRoot(),
        // process.execPath is Electron; run it as plain Node for the script.
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
    })
    running = { job, child, cancelled: false }
    broadcast()

    let stderrTail = ''
    child.stderr?.on('data', (d) => { stderrTail = (stderrTail + String(d)).slice(-4000) })
    const rl = readline.createInterface({ input: child.stdout! })
    rl.on('line', (line) => {
        let ev: any
        try { ev = JSON.parse(line) } catch { return }
        handleEvent(job, ev)
    })
    child.on('error', (err) => {
        job.error = err.message
    })
    child.on('close', (code) => {
        const wasCancelled = running?.cancelled
        running = null
        if (job.stage !== 'ready' && job.stage !== 'failed') {
            job.stage = 'failed'
            job.errorCode = wasCancelled ? 'cancelled' : (job.errorCode || 'internal')
            job.error = wasCancelled ? 'Cancelled' : (job.error || `Generator exited with code ${code}${stderrTail ? ` — ${stderrTail.trim().split('\n').pop()}` : ''}`)
            job.finishedAt = Date.now()
            syncRows(job, true)
        }
        broadcast()
        pump()
    })
}

function handleEvent(job: AutogenJob, ev: any): void {
    switch (ev.type) {
        case 'stage':
            job.stage = ev.stage as AutogenStage
            if (typeof ev.overall === 'number') job.overall = ev.overall
            if (ev.message) job.message = ev.message
            syncRows(job, true)
            break
        case 'progress':
            if (typeof ev.overall === 'number') job.overall = ev.overall
            syncRows(job)
            break
        case 'track':
            if (ev.name) job.name = ev.name
            if (ev.artist) job.artist = ev.artist
            break
        case 'done':
            job.stage = 'ready'
            job.overall = 100
            job.agent = ev.agent
            job.agentReason = ev.agentReason
            job.needsReview = ev.needsReview
            job.alreadyInLibrary = !!ev.alreadyInLibrary
            job.logPath = ev.logPath
            job.finishedAt = Date.now()
            // Push the catalog BEFORE flipping the request to ready, so the
            // guest who sees "ready" can find the song immediately.
            void (hooks?.onSongReady(job.trackId) ?? Promise.resolve())
                .catch((e) => console.error('[autogen] onSongReady failed:', e))
                .finally(() => { syncRows(job, true); broadcast() })
            break
        case 'error':
            job.stage = 'failed'
            job.errorCode = ev.code
            job.error = ev.message
            job.logPath = ev.logPath
            job.finishedAt = Date.now()
            syncRows(job, true)
            break
    }
    broadcast()
}

// ─── guest requests ──────────────────────────────────────────────────────────

function enqueueFromRequest(row: SongRequestRow): void {
    if (row.status !== 'pending' || !row.track_id) return
    if (hooks?.isInLibrary(row.track_id)) {
        // Already have it (imported by hand meanwhile) — just resolve the request.
        void updateSongRequestGeneration([row.id], { generationStatus: 'ready', progress: 100, error: null, markAdded: true })
        return
    }
    enqueueAutogen({
        trackId: row.track_id,
        name: row.track_name,
        artist: row.track_artist,
        artUrl: row.track_art_url,
        requestId: row.id,
        requestedBy: row.requested_by_name,
    })
}

// Requests made while the app was closed (or before auto-generation was
// switched on). A row stuck mid-pipeline from a previous run is restarted;
// a failed one is left for the host to retry, so a bad track can't loop.
async function catchUpRequests(sid: string): Promise<void> {
    if (!settings.autoGenerateRequests) return
    const rows = await listOpenSongRequests(sid)
    for (const row of rows) {
        if (row.generation_status === 'failed') continue
        enqueueFromRequest(row)
    }
}

export function setAutogenSession(nextSessionId: string | null): void {
    if (nextSessionId === sessionId) return
    if (requestChannel) {
        removeRealtimeChannel(requestChannel)
        requestChannel = null
    }
    sessionId = nextSessionId
    if (!sessionId) return
    const sid = sessionId
    requestChannel = subscribeToSongRequests(sid, (row) => {
        if (settings.autoGenerateRequests && sid === sessionId) enqueueFromRequest(row)
    })
    void catchUpRequests(sid)
}

export function initAutogen(h: AutogenHooks): void {
    hooks = h
}

// The generator runs detached (so cancel can kill its whole process group);
// don't leave it separating in the background after the app quits.
export function shutdownAutogen(): void {
    if (running?.child.pid) {
        try { process.kill(-running.child.pid, 'SIGTERM') } catch { /* already gone */ }
    }
}
