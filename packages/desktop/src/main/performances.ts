// Recorded performances + "Hear it as the artist" replays.
//
// The stage records each singer's dry mic during a song (renderer
// audio/performanceRecorder.ts) when the host turns recording on. Each
// performance is stored under ~/.realtime-karaoke/performances/<id>/ — one
// WAV per singer plus performance.json (song, singers, parts, sample → song
// time map). A replay converts every singer's voice to the artist of the part
// they sang with Seed-VC (scripts/autogen/artist_replay.py, run in its own
// venv) and mixes them over the instrumental into replay.mp3. Everything stays
// on this Mac; only the newest MAX_KEPT performances are kept.

import { app, BrowserWindow, ipcMain } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as readline from 'readline'

const ROOT = path.join(os.homedir(), '.realtime-karaoke', 'performances')
const SONGS_DIR = path.join(os.homedir(), '.realtime-karaoke', 'songs')
const VC_PYTHON = path.join(os.homedir(), '.realtime-karaoke', 'vc-venv', 'bin', 'python')
const SEED_VC = path.join(os.homedir(), '.realtime-karaoke', 'seed-vc')
const MAX_KEPT = 15

export interface PerformanceSummary {
    id: string
    trackId: string
    songName: string
    artist: string
    createdAt: string
    singers: string[]
    replay: { status: 'none' | 'queued' | 'converting' | 'ready' | 'failed'; pct?: number; error?: string; file?: string }
}

interface SavePayload {
    trackId: string
    name: string
    artist: string
    singers: { name: string; guestId: string | null; roleIndices: number[]; sampleRate: number; timeMap: [number, number][]; wav: Uint8Array }[]
}

const jobs = new Map<string, { status: 'queued' | 'converting' | 'failed'; pct: number; error?: string }>()
let running: ChildProcess | null = null

function worker(): string {
    return path.join(app.getAppPath(), 'scripts', 'autogen', 'artist_replay.py')
}

export function replaysAvailable(): { available: boolean; reason?: string } {
    if (!fs.existsSync(VC_PYTHON) || !fs.existsSync(SEED_VC)) {
        return { available: false, reason: 'Run packages/desktop/scripts/autogen/setup-vc.sh to install the voice converter' }
    }
    if (!fs.existsSync(worker())) return { available: false, reason: 'artist_replay.py not found' }
    return { available: true }
}

function summarize(id: string): PerformanceSummary | null {
    const dir = path.join(ROOT, id)
    try {
        const p = JSON.parse(fs.readFileSync(path.join(dir, 'performance.json'), 'utf-8'))
        const file = path.join(dir, 'replay.mp3')
        const job = jobs.get(id)
        const replay: PerformanceSummary['replay'] = job
            ? { status: job.status, pct: job.pct, error: job.error }
            : fs.existsSync(file) ? { status: 'ready', file } : { status: 'none' }
        return {
            id, trackId: p.trackId, songName: p.songName, artist: p.artist, createdAt: p.createdAt,
            singers: (p.singers || []).map((s: any) => s.name), replay,
        }
    } catch {
        return null
    }
}

export function listPerformances(): PerformanceSummary[] {
    if (!fs.existsSync(ROOT)) return []
    return fs.readdirSync(ROOT)
        .map(summarize)
        .filter((p): p is PerformanceSummary => !!p)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function broadcast(): void {
    const list = listPerformances()
    for (const w of BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed()) w.webContents.send('perf:update', list)
    }
}

function prune(): void {
    const all = listPerformances()
    for (const p of all.slice(MAX_KEPT)) {
        if (jobs.has(p.id)) continue
        fs.rmSync(path.join(ROOT, p.id), { recursive: true, force: true })
    }
}

function pump(): void {
    if (running) return
    const next = Array.from(jobs.entries()).find(([, j]) => j.status === 'queued')
    if (!next) return
    const [id, job] = next
    const p = summarize(id)
    const songDir = p ? path.join(SONGS_DIR, p.trackId) : ''
    if (!p || !fs.existsSync(songDir)) {
        jobs.set(id, { status: 'failed', pct: 0, error: 'The song is no longer in the library' })
        broadcast()
        pump()
        return
    }
    job.status = 'converting'
    broadcast()
    const child = spawn(VC_PYTHON, [worker(), 'replay', '--performance', path.join(ROOT, id), '--song-dir', songDir,
        '--out', path.join(ROOT, id, 'replay.mp3')], {
        env: { ...process.env, PATH: ['/opt/homebrew/bin', '/usr/local/bin', process.env.PATH || ''].join(':'), PYTHONUNBUFFERED: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
    })
    running = child
    let stdout = ''
    child.stdout?.on('data', d => { stdout += d })
    readline.createInterface({ input: child.stderr! }).on('line', line => {
        const m = line.match(/PROGRESS replay (\d+)/)
        if (m) { job.pct = Number(m[1]); broadcast() }
    })
    child.on('close', () => {
        running = null
        let out: any = null
        try { out = JSON.parse(stdout.trim().split('\n').pop() || '') } catch { /* fallthrough */ }
        if (out && out.ok) jobs.delete(id)
        else jobs.set(id, { status: 'failed', pct: job.pct, error: (out && out.error) || 'Conversion failed' })
        broadcast()
        pump()
    })
}

export function registerPerformanceHandlers(): void {
    ipcMain.handle('perf:save', (_e, payload: SavePayload) => {
        const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${payload.trackId}`
        const dir = path.join(ROOT, id)
        fs.mkdirSync(dir, { recursive: true })
        const singers = payload.singers.map((s, i) => {
            const file = `singer-${i}.wav`
            fs.writeFileSync(path.join(dir, file), Buffer.from(s.wav))
            return { name: s.name, guestId: s.guestId, roleIndices: s.roleIndices, sampleRate: s.sampleRate, timeMap: s.timeMap, file }
        })
        fs.writeFileSync(path.join(dir, 'performance.json'), JSON.stringify({
            id, trackId: payload.trackId, songName: payload.name, artist: payload.artist,
            createdAt: new Date().toISOString(), singers,
        }, null, 1))
        prune()
        broadcast()
        return { id }
    })
    ipcMain.handle('perf:list', () => ({ performances: listPerformances(), ...replaysAvailable() }))
    ipcMain.handle('perf:delete', (_e, id: string) => {
        if (jobs.get(id)?.status === 'converting') return
        jobs.delete(id)
        fs.rmSync(path.join(ROOT, path.basename(id)), { recursive: true, force: true })
        broadcast()
    })
    ipcMain.handle('perf:replay', (_e, id: string) => {
        if (!replaysAvailable().available || !summarize(id)) return
        jobs.set(id, { status: 'queued', pct: 0 })
        broadcast()
        pump()
    })
}

export function shutdownPerformances(): void {
    running?.kill('SIGTERM')
}
