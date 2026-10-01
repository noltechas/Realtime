// Singer voice profiles (voice check → singer matching).
//
// A singer records ~20 s into a karaoke mic on the host Mac; the Python
// worker (scripts/autogen/autogen.py voicecheck) measures range, pitch
// steadiness, tone and level with the same code that measures each part of a
// record (vocal_profile.py), and the profile is stored here, keyed by the
// singer's normalized name so it carries across parties (guest ids are
// per-session). The stage compares it with the song part's profile
// (meta.vocalProfile) to adjust that singer's mic chain — see
// renderer/src/audio/voiceMatch.ts.

import { app, BrowserWindow, ipcMain } from 'electron'
import { execFile } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

export interface VoiceMeasurements {
    seconds: number
    spectrum?: number[] | null
    loudnessRangeDb?: number | null
    levelDb?: number | null
    tuning?: { madCents?: number; flatnessCents?: number | null; sustainedRatio?: number } | null
    range?: { lowMidi: number; medianMidi: number; highMidi: number } | null
}

export interface VoiceProfile {
    key: string
    name: string
    guestId: string | null
    recordedAt: string
    micLabel: string | null
    measurements: VoiceMeasurements
}

const STORE = path.join(os.homedir(), '.realtime-karaoke', 'voices.json')
const SONGS_DIR = path.join(os.homedir(), '.realtime-karaoke', 'songs')
const VENV_PYTHON = path.join(os.homedir(), '.realtime-karaoke', 'separator-venv', 'bin', 'python')

export function voiceKey(name: string): string {
    return name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}

function load(): Record<string, VoiceProfile> {
    try {
        const raw = JSON.parse(fs.readFileSync(STORE, 'utf-8'))
        return raw && typeof raw.profiles === 'object' ? raw.profiles : {}
    } catch {
        return {}
    }
}

function save(profiles: Record<string, VoiceProfile>): void {
    fs.mkdirSync(path.dirname(STORE), { recursive: true })
    fs.writeFileSync(STORE, JSON.stringify({ version: 1, profiles }, null, 2))
}

function broadcast(): void {
    const profiles = load()
    for (const w of BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed()) w.webContents.send('voice:updated', profiles)
    }
}

function runVoiceCheck(wavPath: string): Promise<VoiceMeasurements> {
    const worker = path.join(app.getAppPath(), 'scripts', 'autogen', 'autogen.py')
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(VENV_PYTHON) || !fs.existsSync(worker)) {
            reject(new Error('Voice analysis needs the auto-generation setup (scripts/autogen/setup.sh)'))
            return
        }
        execFile(VENV_PYTHON, [worker, 'voicecheck', '--wav', wavPath], { timeout: 120000 }, (err, stdout) => {
            let out: any = null
            try { out = JSON.parse(String(stdout).trim().split('\n').pop() || '') } catch { /* fallthrough */ }
            if (out && out.ok) {
                delete out.ok
                resolve(out as VoiceMeasurements)
            } else {
                reject(new Error((out && out.error) || (err && err.message) || 'voice analysis failed'))
            }
        })
    })
}

export function registerVoiceHandlers(): void {
    ipcMain.handle('voice:list', () => load())

    ipcMain.handle('voice:analyze', async (_event, args: { wav: Uint8Array; name: string; guestId?: string | null; micLabel?: string | null }) => {
        const name = (args.name || '').trim()
        if (!name) return { error: 'A name is required' }
        const tmp = path.join(os.tmpdir(), `voicecheck-${Date.now()}.wav`)
        try {
            fs.writeFileSync(tmp, Buffer.from(args.wav))
            const measurements = await runVoiceCheck(tmp)
            if (!measurements.seconds || measurements.seconds < 4) {
                return { error: 'Not enough singing was picked up — sing closer to the mic, for at least 10 seconds.' }
            }
            const profiles = load()
            const key = voiceKey(name)
            profiles[key] = {
                key, name, guestId: args.guestId ?? null, recordedAt: new Date().toISOString(),
                micLabel: args.micLabel ?? null, measurements,
            }
            save(profiles)
            broadcast()
            return { profile: profiles[key] }
        } catch (e: any) {
            return { error: e.message || String(e) }
        } finally {
            fs.rmSync(tmp, { force: true })
        }
    })

    ipcMain.handle('voice:delete', (_event, key: string) => {
        const profiles = load()
        delete profiles[key]
        save(profiles)
        broadcast()
    })

    // The measured part profiles of one song (meta.vocalProfile), for matching.
    ipcMain.handle('audio:vocal-profile', (_event, trackId: string) => {
        if (!/^[A-Za-z0-9]{22}$/.test(trackId || '')) return null
        try {
            const meta = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, trackId, 'meta.json'), 'utf-8'))
            return meta.vocalProfile || null
        } catch {
            return null
        }
    })
}
