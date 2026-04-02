import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { exec } from 'child_process'
import QRCode from 'qrcode'
import {
    createSession, pushCatalog, updateNowPlaying,
    insertQueueItem, removeQueueItem, reorderQueue, closeSession,
    CatalogItem
} from './supabase'

const COMPANION_BASE_URL = 'https://noltechas.github.io/Realtime'

let mainWindow: BrowserWindow | null = null
let stageWindow: BrowserWindow | null = null

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        show: false,
        frame: false,
        titleBarStyle: 'hiddenInset',
        vibrancy: 'under-window',
        visualEffectState: 'active',
        backgroundColor: '#0a0a1a',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false // Allow file:// audio URLs from http://localhost in dev
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow?.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    // Window control IPC
    ipcMain.on('window:minimize', () => mainWindow?.minimize())
    ipcMain.on('window:maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow?.unmaximize()
        } else {
            mainWindow?.maximize()
        }
    })
    ipcMain.on('window:close', () => mainWindow?.close())
}

function createStageWindow(): BrowserWindow {
    const displays = screen.getAllDisplays()
    const externalDisplay = displays.find(d => d.bounds.x !== 0 || d.bounds.y !== 0)
    const targetDisplay = externalDisplay || screen.getPrimaryDisplay()

    stageWindow = new BrowserWindow({
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height,
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        show: false,
        frame: false,
        fullscreen: false,
        fullscreenable: true,
        backgroundColor: '#050508',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false,
            additionalArguments: ['--stage-window']
        }
    })

    stageWindow.on('ready-to-show', () => {
        stageWindow?.show()
        stageWindow?.setFullScreen(true)
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        stageWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#/karaoke')
    } else {
        stageWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/karaoke' })
    }

    stageWindow.on('closed', () => {
        stageWindow = null
        // Notify main window that stage was closed
        mainWindow?.webContents.send('stage:closed')
    })

    return stageWindow
}

// Stage window IPC handlers
ipcMain.handle('stage:open', () => {
    if (stageWindow) {
        stageWindow.focus()
        return { success: true, existed: true }
    }
    createStageWindow()
    return { success: true, existed: false }
})

ipcMain.handle('stage:close', () => {
    if (stageWindow) {
        stageWindow.close()
        stageWindow = null
        return { success: true }
    }
    return { success: false }
})

ipcMain.on('stage:minimize', () => stageWindow?.minimize())
ipcMain.on('stage:close', () => stageWindow?.close())

// Stage window controls (invoke from stage renderer so main process reliably receives)
ipcMain.handle('stage:request-close', () => {
    if (stageWindow) {
        stageWindow.close()
        stageWindow = null
    }
    return { ok: true }
})
ipcMain.handle('stage:request-minimize', () => {
    stageWindow?.minimize()
    return { ok: true }
})
ipcMain.handle('stage:request-toggle-fullscreen', (_event) => {
    const win = BrowserWindow.fromWebContents(_event.sender)
    if (win) {
        const next = !win.isFullScreen()
        win.setFullScreen(next)
        return { ok: true, fullscreen: next }
    }
    return { ok: false }
})

// State sync relay between windows
ipcMain.on('state:action', (event, action) => {
    if (mainWindow && mainWindow.webContents !== event.sender) {
        mainWindow.webContents.send('state:action', action)
    }
    if (stageWindow && stageWindow.webContents !== event.sender) {
        stageWindow.webContents.send('state:action', action)
    }
})

ipcMain.on('state:request-init', () => {
    if (mainWindow) {
        mainWindow.webContents.send('state:request-init')
    }
})

ipcMain.on('state:init-response', (_event, state) => {
    if (stageWindow) {
        stageWindow.webContents.send('state:init', state)
    }
})

// Playback time/seek relay to stage window
ipcMain.on('playback:time', (_event, timeMs) => {
    if (stageWindow) {
        stageWindow.webContents.send('playback:time', timeMs)
    }
})

ipcMain.on('playback:seek', (_event, timeMs) => {
    if (stageWindow) {
        stageWindow.webContents.send('playback:seek', timeMs)
    }
})

// ----- Spotify IPC Handlers -----
ipcMain.handle('spotify:search', async (_event, query: string, token: string) => {
    try {
        const res = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
            { headers: { Authorization: `Bearer ${token}` } }
        )
        return await res.json()
    } catch (error) {
        return { error: String(error) }
    }
})

ipcMain.handle('spotify:track', async (_event, trackId: string, token: string) => {
    try {
        const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        return await res.json()
    } catch (error) {
        return { error: String(error) }
    }
})

ipcMain.handle('spotify:audio-features', async (_event, trackId: string, token: string) => {
    try {
        const res = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        return await res.json()
    } catch (error) {
        return { error: String(error) }
    }
})

ipcMain.handle('spotify:auth', async (_event, clientId: string, clientSecret: string) => {
    try {
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        })
        return await res.json()
    } catch (error) {
        return { error: String(error) }
    }
})

ipcMain.handle('spotify:artists', async (_event, artistIds: string[], token: string) => {
    try {
        const res = await fetch(
            `https://api.spotify.com/v1/artists?ids=${artistIds.join(',')}`,
            { headers: { Authorization: `Bearer ${token}` } }
        )
        return await res.json()
    } catch (error) {
        return { error: 'network', message: String(error) }
    }
})

/** Parse LRC format (e.g. "[00:17.12] Line text") into { startTimeMs, words } */
function parseLrcToLines(syncedLyrics: string): { startTimeMs: number; words: string }[] {
    if (!syncedLyrics || typeof syncedLyrics !== 'string') return []
    const lines: { startTimeMs: number; words: string }[] = []
    const lrcLineRe = /\[(\d+):(\d+)(?:\.(\d+))?\]\s*(.*)/g
    let m: RegExpExecArray | null
    while ((m = lrcLineRe.exec(syncedLyrics)) !== null) {
        const min = parseInt(m[1], 10)
        const sec = parseInt(m[2], 10)
        const centi = m[3] ? parseInt(m[3].padEnd(2, '0').slice(0, 2), 10) : 0
        const words = (m[4] || '').trim()
        if (words) lines.push({ startTimeMs: min * 60000 + sec * 1000 + centi * 10, words })
    }
    return lines.sort((a, b) => a.startTimeMs - b.startTimeMs)
}

/** Fetch lyrics from LRCLIB (free, no rate limit). Requires track metadata. */
async function fetchLyricsLrclib(trackName: string, artistName: string, albumName: string, durationMs: number): Promise<{ lines?: { startTimeMs: number; words: string }[]; error?: boolean; message?: string }> {
    const durationSec = Math.round(durationMs / 1000)
    const params = new URLSearchParams({
        track_name: trackName,
        artist_name: artistName,
        album_name: albumName || trackName,
        duration: String(durationSec)
    })
    try {
        const res = await fetch(`https://lrclib.net/api/get?${params}`, {
            headers: { 'User-Agent': 'Realtime-Karaoke/1.0 (https://github.com)' }
        })
        const data = await res.json()
        if (res.status === 404 || data?.code === 404) {
            return { error: true, message: data?.message || 'Lyrics not found' }
        }
        if (!res.ok) return { error: true, message: data?.message || `HTTP ${res.status}` }
        const synced = data?.syncedLyrics
        if (!synced) return { error: true, message: 'No synced lyrics available' }
        const lines = parseLrcToLines(synced)
        if (lines.length === 0) return { error: true, message: 'Could not parse lyrics' }
        return { lines }
    } catch (e) {
        return { error: true, message: String(e) }
    }
}

/** Fetch lyrics from Spotify proxy (rate limited, shared) */
async function fetchLyricsSpotify(trackId: string): Promise<any> {
    const res = await fetch(`https://spotify-lyrics-api-pi.vercel.app/?trackid=${trackId}`)
    return res.json()
}

ipcMain.handle('lyrics:fetch', async (_event, payload: string | { trackId: string; trackName?: string; artistName?: string; albumName?: string; durationMs?: number }) => {
    const trackId = typeof payload === 'string' ? payload : payload.trackId
    const meta = typeof payload === 'object' ? payload : null
    let spotifyResult: any = null

    // Try Spotify proxy first (original API)
    try {
        spotifyResult = await fetchLyricsSpotify(trackId)
        if (spotifyResult?.lines?.length) {
            console.debug('[lyrics:fetch] Spotify success', { trackId, lineCount: spotifyResult.lines.length })
            return spotifyResult
        }
        if (spotifyResult?.error) {
            console.debug('[lyrics:fetch] Spotify failed, trying LRCLIB', { trackId, error: spotifyResult?.message || spotifyResult?.error })
        }
    } catch (error) {
        console.debug('[lyrics:fetch] Spotify fetch failed, trying LRCLIB', { trackId, error: String(error) })
        spotifyResult = { error: String(error) }
    }

    // Fall back to LRCLIB when we have metadata
    if (meta?.trackName && meta?.artistName && typeof meta.durationMs === 'number') {
        const lrclib = await fetchLyricsLrclib(
            meta.trackName,
            meta.artistName,
            meta.albumName || meta.trackName,
            meta.durationMs
        )
        if (lrclib.lines && lrclib.lines.length > 0) {
            console.debug('[lyrics:fetch] LRCLIB success', { trackId, lineCount: lrclib.lines.length })
            return { lines: lrclib.lines }
        }
        console.debug('[lyrics:fetch] LRCLIB no lyrics', { trackId, message: lrclib.message })
    }

    return spotifyResult ?? { error: 'Lyrics not found' }
})

import { registerAudioHandlers } from './audio/manager'

// ----- Karaoke Session State -----
let activeSession: { id: string; code: string } | null = null

// ----- Karaoke Session IPC Handlers -----
ipcMain.handle('karaoke:create-session', async () => {
    try {
        // Create session in Supabase
        const session = await createSession()
        activeSession = { id: session.sessionId, code: session.sessionCode }

        // Build companion URL using GitHub Pages
        const companionUrl = `${COMPANION_BASE_URL}/?session=${session.sessionCode}`

        // Generate QR code
        const qrDataUrl = await QRCode.toDataURL(companionUrl, {
            width: 256,
            margin: 1,
            color: { dark: '#f4f0fb', light: '#00000000' }
        })

        // Push catalog to Supabase
        try {
            const SONGS_DIR = path.join(os.homedir(), '.realtime-karaoke', 'songs')
            const AUDIO_EXTS = ['.mp3', '.m4a', '.wav', '.ogg', '.opus', '.flac', '.aac', '.wma', '.webm']

            function findStem(dir: string, prefix: string): string | null {
                if (!fs.existsSync(dir)) return null
                for (const file of fs.readdirSync(dir)) {
                    const ext = path.extname(file).toLowerCase()
                    if (path.basename(file, ext).toLowerCase() === prefix && AUDIO_EXTS.includes(ext)) {
                        return path.join(dir, file)
                    }
                }
                return null
            }

            if (fs.existsSync(SONGS_DIR)) {
                const dirs = fs.readdirSync(SONGS_DIR, { withFileTypes: true }).filter(d => d.isDirectory())
                const catalogItems: CatalogItem[] = []
                for (const dir of dirs) {
                    const songDir = path.join(SONGS_DIR, dir.name)
                    const metaPath = path.join(songDir, 'meta.json')
                    const instrumental = findStem(songDir, 'instrumental')
                    const vocals = findStem(songDir, 'vocals')
                    if (fs.existsSync(metaPath) && instrumental) {
                        try {
                            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
                            catalogItems.push({
                                trackId: meta.trackId,
                                name: meta.name,
                                artist: meta.artist,
                                artUrl: meta.artUrl,
                                albumName: meta.albumName,
                                durationMs: meta.durationMs,
                                roles: meta.roles || [],
                                hasVocals: !!vocals,
                                spotifyData: meta.spotifyData || null
                            })
                        } catch { /* skip corrupted */ }
                    }
                }
                if (catalogItems.length > 0) {
                    await pushCatalog(session.sessionId, catalogItems)
                }
            }
        } catch (e) {
            console.error('Failed to push catalog:', e)
        }

        // Realtime subscription is handled in the renderer process (useKaraokeSession hook)
        // since the browser environment has native WebSocket support

        return {
            sessionId: session.sessionId,
            sessionCode: session.sessionCode,
            companionUrl,
            qrDataUrl
        }
    } catch (error: any) {
        console.error('Failed to create karaoke session:', error)
        return { error: error.message }
    }
})

ipcMain.handle('karaoke:close-session', async () => {
    if (activeSession) {
        await closeSession(activeSession.id)
        activeSession = null
    }
})

ipcMain.handle('karaoke:sync-now-playing', async (_event, info) => {
    if (activeSession) {
        await updateNowPlaying(activeSession.id, info)
    }
})

ipcMain.handle('karaoke:push-local-queue-item', async (_event, item) => {
    if (!activeSession) return { error: 'No active session' }
    try {
        const result = await insertQueueItem(activeSession.id, { ...item, source: 'local' })
        return result
    } catch (error: any) {
        return { error: error.message }
    }
})

ipcMain.handle('karaoke:remove-queue-item', async (_event, queueRowId: string) => {
    if (!activeSession) return
    await removeQueueItem(queueRowId)
})

ipcMain.handle('karaoke:reorder-queue', async (_event, orderedIds: string[]) => {
    if (!activeSession) return
    await reorderQueue(activeSession.id, orderedIds)
})

// ----- System Volume IPC Handlers -----
ipcMain.on('audio:set-system-volume', (_event, vol: number) => {
    // vol is 0.0 to 1.0
    const v = Math.max(0, Math.min(100, Math.round(vol * 100)))
    exec(`osascript -e "set volume output volume ${v}"`, (err) => {
        if (err) console.error('Failed to set system volume', err)
    })
})

ipcMain.handle('audio:get-system-volume', async () => {
    return new Promise((resolve) => {
        exec('osascript -e "output volume of (get volume settings)"', (err, stdout) => {
            if (err) {
                console.error('Failed to get system volume', err)
                resolve(1) // default to max if error
            } else {
                const v = parseInt(stdout.trim(), 10)
                resolve(isNaN(v) ? 1 : v / 100)
            }
        })
    })
})

// ----- App Lifecycle -----
app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.realtime-karaoke')

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    registerAudioHandlers()
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('before-quit', async () => {
    if (activeSession) {
        try { await closeSession(activeSession.id) } catch { /* best effort */ }
        activeSession = null
    }
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
