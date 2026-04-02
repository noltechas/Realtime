import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const SONGS_DIR = path.join(os.homedir(), '.realtime-karaoke', 'songs')

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.ogg', '.opus', '.flac', '.aac', '.wma', '.webm']

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

export interface LyricLine {
    startTimeMs: number
    words: string
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
    spotifyData?: {               // Additional Spotify metadata
        key?: number              // Musical key (0-11)
        mode?: number             // Major (1) or Minor (0)
        tempo?: number            // BPM
        releaseDate?: string      // Album release date
        instrumentalness?: number // 0-1, from Spotify audio features; lower = more vocals = better for karaoke
        popularity?: number       // 0-100, from Spotify track; fallback when audio-features returns 403
    }
}

export function registerAudioHandlers() {
    ipcMain.handle('audio:check-cache', async (_event, trackId: string) => {
        const songDir = getSongDir(trackId)
        const vocals = findStemFile(songDir, 'vocals')
        const instrumental = findStemFile(songDir, 'instrumental')
        return { vocals: vocals || null, instrumental: instrumental || null }
    })

    ipcMain.handle('audio:import', async (_event, args: { sourcePath: string, trackId: string, type: 'vocals' | 'instrumental' }) => {
        try {
            const songDir = getSongDir(args.trackId)
            fs.mkdirSync(songDir, { recursive: true })
            const ext = path.extname(args.sourcePath) || '.wav'
            const destPath = path.join(songDir, `${args.type}${ext}`)
            const existing = findStemFile(songDir, args.type)
            if (existing && existing !== destPath) fs.unlinkSync(existing)
            fs.copyFileSync(args.sourcePath, destPath)
            return { path: destPath }
        } catch (error: any) {
            return { error: `Failed to import ${args.type}: ${error.message}` }
        }
    })

    ipcMain.handle('audio:save-meta', async (_event, meta: SongMeta) => {
        try {
            const songDir = getSongDir(meta.trackId)
            fs.mkdirSync(songDir, { recursive: true })
            fs.writeFileSync(path.join(songDir, 'meta.json'), JSON.stringify(meta, null, 2))
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
                        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
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
