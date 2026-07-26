import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import { mp3DurationMs } from './audio-duration'

const SONGS_DIR = path.join(os.homedir(), '.realtime-karaoke', 'songs')

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.ogg', '.opus', '.flac', '.aac', '.wma', '.webm']

// A stem whose measured audio length differs from the song's Spotify length by
// more than this is almost certainly a different song's audio (the historical
// "wrong music plays on stage" bug). Mirrors import-song.js.
const DURATION_TOLERANCE_MS = 5000

function getSongDir(trackId: string): string {
    return path.join(SONGS_DIR, trackId)
}

function findStemFile(dir: string, prefix: string): string | null {
    if (!fs.existsSync(dir)) return null
    const files = fs.readdirSync(dir)
    for (const file of files) {
        const ext = path.extname(file).toLowerCase()
        const name = path.basename(file, ext).toLowerCase()
        if (name === prefix && AUDIO_EXTENSIONS.includes(ext)) {
            return path.join(dir, file)
        }
    }
    return null
}

// ─── stem fingerprints ───────────────────────────────────────────────────────
// Each song's meta.json records what audio was VERIFIED to belong to it
// (sha256 + size + measured duration). The catalog refuses to serve a song
// whose on-disk stems no longer match, so wrong audio can never reach the
// stage even if a file is swapped behind the app's back.

export interface StemFingerprint {
    sha256: string
    bytes: number
    durMs: number | null
    source?: string
    mtimeMs?: number
}

function sha256File(file: string): string {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function fingerprintFile(file: string): StemFingerprint {
    const st = fs.statSync(file)
    const durMs = path.extname(file).toLowerCase() === '.mp3' ? mp3DurationMs(file) : null
    return { sha256: sha256File(file), bytes: st.size, durMs, source: path.basename(file), mtimeMs: st.mtimeMs }
}

// Scan the library for another song that already owns these exact bytes.
// Identical stems under two trackIds never legitimately happen.
function findFingerprintOwner(hash: string, ownTrackId: string): { trackId: string, name: string, kind: string } | null {
    if (!fs.existsSync(SONGS_DIR)) return null
    for (const d of fs.readdirSync(SONGS_DIR, { withFileTypes: true })) {
        if (!d.isDirectory() || d.name === ownTrackId) continue
        const metaPath = path.join(SONGS_DIR, d.name, 'meta.json')
        if (!fs.existsSync(metaPath)) continue
        let meta: SongMeta
        try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) } catch { continue }
        const stems = meta.stems || {}
        for (const kind of ['instrumental', 'vocals'] as const) {
            if (stems[kind]?.sha256 === hash) {
                return { trackId: d.name, name: `${meta.name} — ${meta.artist}`, kind }
            }
        }
    }
    return null
}

// Verify an on-disk stem against its recorded fingerprint. Cheap (one stat).
function stemVerification(file: string, fp: StemFingerprint | undefined, metaDurationMs: number): 'ok' | 'unverified' | 'mismatch' {
    if (!fp) return 'unverified'
    try {
        if (fs.statSync(file).size !== fp.bytes) return 'mismatch'
    } catch {
        return 'mismatch'
    }
    if (fp.durMs != null && metaDurationMs > 0 && Math.abs(fp.durMs - metaDurationMs) > DURATION_TOLERANCE_MS) {
        return 'mismatch'
    }
    return 'ok'
}


export interface VoiceEffects {
    // Musical context
    key: number
    mode: number
    tempo: number // BPM

    // Pitch Correction
    pitchCorrection: { enabled: boolean, strength: number }

    // Dynamics / Compressor
    compressor: { enabled: boolean, threshold: number, ratio: number, attack: number, release: number }

    // EQ (3-band)
    eq: { enabled: boolean, lowGain: number, midGain: number, highGain: number }

    // Modulation / Chorus
    chorus: { enabled: boolean, rate: number, depth: number, mix: number }

    // Delay
    delay: { enabled: boolean, time: number, feedback: number, mix: number }

    // Reverb
    reverb: { enabled: boolean, decay: number, preDelay: number, mix: number }
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
    singerIndex?: number
    roleIndex?: number
}

export interface SongMeta {
    trackId: string
    name: string
    artist: string
    artUrl: string
    albumName: string
    durationMs: number
    youtubeUrl?: string
    roles?: string[]
    lyrics?: LyricLine[]
    voiceEffects?: VoiceEffects | VoiceEffects[]
    genres?: string[]
    spotifyData?: {               // Additional Spotify metadata
        key?: number              // Musical key (0-11)
        mode?: number             // Major (1) or Minor (0)
        tempo?: number            // BPM
        releaseDate?: string      // Album release date (YYYY-MM-DD)
        releaseYear?: number      // Year the song was released (parsed from releaseDate)
        instrumentalness?: number // 0-1, from Spotify audio features; lower = more vocals = better for karaoke
        popularity?: number       // 0-100, from Spotify track; fallback when audio-features returns 403
    }
    stems?: {                     // fingerprints of the audio verified to belong to this song
        instrumental?: StemFingerprint
        vocals?: StemFingerprint
    }
}

export function registerAudioHandlers() {
    ipcMain.handle('audio:check-cache', async (_event, trackId: string) => {
        const songDir = getSongDir(trackId)
        const vocals = findStemFile(songDir, 'vocals')
        const instrumental = findStemFile(songDir, 'instrumental')
        return { vocals: vocals || null, instrumental: instrumental || null }
    })

    ipcMain.handle('audio:import', async (_event, args: { sourcePath: string, trackId: string, type: 'vocals' | 'instrumental', expectedDurationMs?: number }) => {
        try {
            const sec = (ms: number) => (ms / 1000).toFixed(1) + 's'
            const srcName = path.basename(args.sourcePath)

            // The measured audio length must match the song. This is what makes
            // it impossible to attach a different song's stem to this track.
            const durMs = path.extname(args.sourcePath).toLowerCase() === '.mp3' ? mp3DurationMs(args.sourcePath) : null
            if (typeof args.expectedDurationMs === 'number' && args.expectedDurationMs > 0 && durMs != null) {
                const diff = Math.abs(durMs - args.expectedDurationMs)
                if (diff > DURATION_TOLERANCE_MS) {
                    return { error: `"${srcName}" is ${sec(durMs)} of audio but this song is ${sec(args.expectedDurationMs)} (off by ${sec(diff)}) — it looks like a different song's file. Import refused.` }
                }
            }

            // Refuse bytes that already belong to another song in the library.
            const hash = sha256File(args.sourcePath)
            const owner = findFingerprintOwner(hash, args.trackId)
            if (owner) {
                return { error: `"${srcName}" is byte-identical to the ${owner.kind} stem of "${owner.name}" — it's that song's audio, not this one's. Import refused.` }
            }

            const songDir = getSongDir(args.trackId)
            fs.mkdirSync(songDir, { recursive: true })
            const ext = path.extname(args.sourcePath) || '.wav'
            const destPath = path.join(songDir, `${args.type}${ext}`)
            const existing = findStemFile(songDir, args.type)
            if (existing && existing !== destPath) fs.unlinkSync(existing)
            fs.copyFileSync(args.sourcePath, destPath)

            // Record the verified fingerprint right away if the song already has
            // a meta.json (a fresh import writes it via audio:save-meta after).
            const metaPath = path.join(songDir, 'meta.json')
            if (fs.existsSync(metaPath)) {
                try {
                    const meta: SongMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
                    meta.stems = { ...(meta.stems || {}), [args.type]: { ...fingerprintFile(destPath), source: srcName } }
                    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
                } catch { /* save-meta will re-fingerprint */ }
            }
            return { path: destPath }
        } catch (error: any) {
            return { error: `Failed to import ${args.type}: ${error.message}` }
        }
    })

    ipcMain.handle('audio:save-meta', async (_event, meta: SongMeta) => {
        try {
            const songDir = getSongDir(meta.trackId)
            fs.mkdirSync(songDir, { recursive: true })

            // The main process owns the stems block — refresh it from what's
            // actually on disk so the fingerprints always describe real bytes.
            // Reuse the prior hash when the file is unchanged (stat-cheap).
            const metaPath = path.join(songDir, 'meta.json')
            let prevStems: SongMeta['stems'] = undefined
            try { prevStems = (JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as SongMeta).stems } catch { /* no prior meta */ }
            const stems: NonNullable<SongMeta['stems']> = {}
            for (const kind of ['instrumental', 'vocals'] as const) {
                const file = findStemFile(songDir, kind)
                if (!file) continue
                const prev = prevStems?.[kind]
                const st = fs.statSync(file)
                if (prev && prev.bytes === st.size && prev.mtimeMs != null && prev.mtimeMs === st.mtimeMs) {
                    stems[kind] = prev
                } else {
                    const fp = fingerprintFile(file)
                    const owner = findFingerprintOwner(fp.sha256, meta.trackId)
                    if (owner) {
                        // These bytes belong to a different song — never bless
                        // them. Keeping the stale fingerprint (when there is
                        // one) makes the catalog exclude this song until fixed.
                        console.error(`[audio:save-meta] refusing to fingerprint ${kind} of "${meta.name}" — file is byte-identical to the ${owner.kind} of "${owner.name}" [${owner.trackId}]`)
                        if (prev) stems[kind] = prev
                    } else {
                        stems[kind] = fp
                    }
                }
            }
            meta.stems = Object.keys(stems).length > 0 ? stems : undefined

            fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
            return { success: true }
        } catch (error: any) {
            return { error: error.message }
        }
    })

    ipcMain.handle('audio:list-catalog', async () => {
        try {
            if (!fs.existsSync(SONGS_DIR)) return []
            const dirs = fs.readdirSync(SONGS_DIR, { withFileTypes: true }).filter(d => d.isDirectory())
            const catalog: (SongMeta & { instrumentalPath: string, vocalsPath?: string })[] = []
            for (const dir of dirs) {
                const songDir = path.join(SONGS_DIR, dir.name)
                const metaPath = path.join(songDir, 'meta.json')
                const instrumental = findStemFile(songDir, 'instrumental')
                const vocals = findStemFile(songDir, 'vocals')
                if (fs.existsSync(metaPath) && instrumental) {
                    try {
                        const meta: SongMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
                        // A song whose on-disk audio no longer matches its
                        // verified fingerprint must never reach the stage.
                        // (Songs without fingerprints predate verification and
                        // are served as-is; scripts/fingerprint-library.js
                        // backfills them.)
                        const instCheck = stemVerification(instrumental, meta.stems?.instrumental, meta.durationMs)
                        const vocCheck = vocals ? stemVerification(vocals, meta.stems?.vocals, meta.durationMs) : 'ok'
                        if (instCheck === 'mismatch' || vocCheck === 'mismatch') {
                            console.error(`[audio:list-catalog] EXCLUDED "${meta.name} — ${meta.artist}" [${dir.name}]: ${instCheck === 'mismatch' ? 'instrumental' : 'vocals'} doesn't match its verified fingerprint. Re-import the stems or run scripts/fingerprint-library.js.`)
                            continue
                        }
                        catalog.push({ ...meta, instrumentalPath: instrumental, vocalsPath: vocals || undefined })
                    } catch { /* skip corrupted */ }
                }
            }
            return catalog
        } catch { return [] }
    })

    ipcMain.handle('audio:remove-song', async (_event, trackId: string) => {
        try {
            const songDir = getSongDir(trackId)
            if (fs.existsSync(songDir)) fs.rmSync(songDir, { recursive: true, force: true })
            return { success: true }
        } catch (error: any) {
            return { error: error.message }
        }
    })
}
