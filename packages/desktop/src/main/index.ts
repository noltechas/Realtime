import { app, shell, BrowserWindow, ipcMain, screen, powerMonitor } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { exec } from 'child_process'
import QRCode from 'qrcode'
import {
    createSession, pushCatalog, updateNowPlaying, updateIsPlaying,
    insertQueueItem, removeQueueItem, reorderQueue, closeSession,
    listGuests, updateGuest, removeGuest,
    listRecentSessions, getSession, deleteSession,
    fetchAndStoreTrendingGifs,
    bumpBonusPointsForRemaining, lockQueueItem, adjustQueueBonusPoints,
    ensureDefaultAwards, listAwards, listAwardVotes,
    createCustomAward, updateAward, deleteAward,
    castAwardVote, clearAwardVote, setAwardAdjustments,
    persistAwardResults, listAwardResults, unfinalizeAwards,
    broadcastRevealStep,
    CatalogItem
} from './supabase'

const COMPANION_BASE_URL = 'https://noltechas.github.io/Realtime'

// Resolves to {projectRoot}/build/icon.png in dev (out/main/index.js → ../../build/icon.png)
// and lines up with electron-builder's default icon lookup for future packaging.
const APP_ICON_PATH = join(__dirname, '../../build/icon.png')

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
        icon: APP_ICON_PATH,
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

    // ─── Renderer crash diagnostics ───────────────────────────────
    // When the renderer WebContents dies (blank screen), Electron fires
    // 'render-process-gone' with details. Log everything to the terminal.
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
        console.error('\n════════════════════════════════════════════════════════════')
        console.error('🔥 MAIN WINDOW RENDERER CRASHED')
        console.error('Reason:', details.reason)
        console.error('Exit code:', details.exitCode)
        console.error('Full details:', JSON.stringify(details, null, 2))
        console.error('════════════════════════════════════════════════════════════\n')
    })
    mainWindow.webContents.on('unresponsive', () => {
        console.error('⚠️  Main renderer became unresponsive')
    })
    mainWindow.webContents.on('responsive', () => {
        console.error('✓ Main renderer is responsive again')
    })
    // Console messages from the renderer stream into the main terminal too,
    // so the user sees JS errors even if they don't have DevTools open.
    mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
        const levels = ['log', 'warning', 'error']
        const tag = levels[level] || 'log'
        if (tag === 'error' || tag === 'warning') {
            console.log('[renderer ' + tag + '] ' + message + (sourceId ? ' (' + sourceId + ':' + line + ')' : ''))
        }
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
        icon: APP_ICON_PATH,
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

// Reaction relay to stage window
ipcMain.on('reaction:send', (_event, reaction) => {
    if (stageWindow) {
        stageWindow.webContents.send('reaction:receive', reaction)
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
        if (!res.ok) {
            console.warn(`Spotify audio-features returned ${res.status} for ${trackId}`)
            return null
        }
        return await res.json()
    } catch (error) {
        return null
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

import { parseLrc, parseYrc, hasSyllableTiming } from './lyrics/normalize'
import type { LyricLine } from './audio/manager'

const NETEASE_HEADERS = {
    'Referer': 'https://music.163.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'Cookie': 'appver=2.0.2; os=pc',
}

interface NetEaseSong {
    id: number
    name: string
    artists: { name: string }[]
    duration: number
}

function normalizeForMatch(s: string): string {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function scoreNeteaseHit(song: NetEaseSong, query: { trackName: string; artistName: string; durationMs: number }): number {
    const sTrack = normalizeForMatch(song.name)
    const sArtists = (song.artists || []).map(a => normalizeForMatch(a.name))
    const nTrack = normalizeForMatch(query.trackName)
    const nArtist = normalizeForMatch(query.artistName)
    let score = 0
    if (!sTrack || !nTrack) return -1
    if (sTrack === nTrack) score += 3
    else if (sTrack.includes(nTrack) || nTrack.includes(sTrack)) score += 1
    if (nArtist) {
        if (sArtists.some(a => a === nArtist)) score += 3
        else if (sArtists.some(a => a.includes(nArtist) || nArtist.includes(a))) score += 1
    }
    if (query.durationMs > 0 && song.duration > 0) {
        const delta = Math.abs(song.duration - query.durationMs)
        if (delta < 3000) score += 2
        else if (delta < 8000) score += 1
    }
    return score
}

/** Search NetEase + fetch YRC. Returns LyricLine[] with syllables if available, else null. */
async function fetchLyricsNetease(query: { trackName: string; artistName: string; albumName: string; durationMs: number }): Promise<LyricLine[] | null> {
    if (!query.trackName || !query.artistName) return null
    try {
        const q = `${query.trackName} ${query.artistName}`.trim()
        // The /api/search/get/web endpoint now returns EAPI-encrypted blobs.
        // POST /api/search/get with form body is the still-cleartext alternative.
        const sRes = await fetch('https://music.163.com/api/search/get', {
            method: 'POST',
            headers: { ...NETEASE_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `s=${encodeURIComponent(q)}&type=1&limit=8&offset=0`,
        })
        if (!sRes.ok) return null
        const sData = await sRes.json() as { result?: { songs?: NetEaseSong[] } }
        const songs = sData?.result?.songs || []
        if (songs.length === 0) return null
        let best: { id: number; score: number } | null = null
        for (const s of songs) {
            const score = scoreNeteaseHit(s, query)
            if (best === null || score > best.score) best = { id: s.id, score }
        }
        // Require at least artist OR track match plus one duration band — score >= 4
        if (!best || best.score < 4) return null
        const lyricUrl = `https://music.163.com/api/song/lyric?id=${best.id}&lv=-1&kv=-1&tv=-1&yv=-1`
        const lRes = await fetch(lyricUrl, { headers: NETEASE_HEADERS })
        if (!lRes.ok) return null
        const lData = await lRes.json() as { yrc?: { lyric?: string }; lrc?: { lyric?: string } }
        const yrcText = lData?.yrc?.lyric
        if (yrcText) {
            const lines = parseYrc(yrcText)
            if (hasSyllableTiming(lines)) return lines
        }
        return null
    } catch {
        return null
    }
}

/** Fetch lyrics from LRCLIB (free, no rate limit). Requires track metadata. */
async function fetchLyricsLrclib(trackName: string, artistName: string, albumName: string, durationMs: number): Promise<{ lines?: LyricLine[]; error?: boolean; message?: string }> {
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
        const lines = parseLrc(synced)
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

// In-process cache to avoid double-fetches when Admin retries during an import session.
const lyricsCache = new Map<string, { lines: LyricLine[]; source: string; ts: number }>()
const LYRICS_CACHE_TTL_MS = 10 * 60 * 1000

ipcMain.handle('lyrics:fetch', async (_event, payload: string | { trackId: string; trackName?: string; artistName?: string; albumName?: string; durationMs?: number }) => {
    const trackId = typeof payload === 'string' ? payload : payload.trackId
    const meta = typeof payload === 'object' ? payload : null

    const cached = lyricsCache.get(trackId)
    if (cached && Date.now() - cached.ts < LYRICS_CACHE_TTL_MS) {
        console.debug('[lyrics:fetch] cache hit', { trackId, source: cached.source, lineCount: cached.lines.length })
        return { lines: cached.lines, source: cached.source }
    }

    const remember = (lines: LyricLine[], source: string) => {
        lyricsCache.set(trackId, { lines, source, ts: Date.now() })
        return { lines, source }
    }

    // Tier 1: NetEase YRC (word-level for English/CJK)
    if (meta?.trackName && meta?.artistName) {
        const neteaseLines = await fetchLyricsNetease({
            trackName: meta.trackName,
            artistName: meta.artistName,
            albumName: meta.albumName || '',
            durationMs: meta.durationMs || 0,
        })
        if (neteaseLines && neteaseLines.length > 0) {
            console.debug('[lyrics:fetch] NetEase YRC success', { trackId, lineCount: neteaseLines.length, withSyllables: neteaseLines.filter(l => l.syllables).length })
            return remember(neteaseLines, 'netease-yrc')
        }
    }

    // Tier 2: Musixmatch RichSync — reserved (would slot here once an API key is wired up).

    // Tier 3: existing Spotify proxy (line-level)
    let spotifyResult: any = null
    try {
        spotifyResult = await fetchLyricsSpotify(trackId)
        if (spotifyResult?.lines?.length) {
            const lines: LyricLine[] = spotifyResult.lines.map((l: any) => ({
                startTimeMs: typeof l.startTimeMs === 'string' ? parseInt(l.startTimeMs, 10) : l.startTimeMs,
                words: l.words,
            }))
            console.debug('[lyrics:fetch] Spotify success', { trackId, lineCount: lines.length })
            return remember(lines, 'spotify')
        }
        if (spotifyResult?.error) {
            console.debug('[lyrics:fetch] Spotify failed, trying LRCLIB', { trackId, error: spotifyResult?.message || spotifyResult?.error })
        }
    } catch (error) {
        console.debug('[lyrics:fetch] Spotify fetch failed, trying LRCLIB', { trackId, error: String(error) })
        spotifyResult = { error: String(error) }
    }

    // Tier 4: LRCLIB synced (line-level)
    if (meta?.trackName && meta?.artistName && typeof meta.durationMs === 'number') {
        const lrclib = await fetchLyricsLrclib(
            meta.trackName,
            meta.artistName,
            meta.albumName || meta.trackName,
            meta.durationMs
        )
        if (lrclib.lines && lrclib.lines.length > 0) {
            console.debug('[lyrics:fetch] LRCLIB success', { trackId, lineCount: lrclib.lines.length })
            return remember(lrclib.lines, 'lrclib')
        }
        console.debug('[lyrics:fetch] LRCLIB no lyrics', { trackId, message: lrclib.message })
    }

    return spotifyResult ?? { error: 'Lyrics not found' }
})

import { registerAudioHandlers } from './audio/manager'

// ----- Karaoke Session State -----
let activeSession: { id: string; code: string } | null = null

// ----- Helper: push local catalog to Supabase -----
async function pushLocalCatalog(sessionId: string): Promise<void> {
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

    if (!fs.existsSync(SONGS_DIR)) return

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
                const offensiveRoleIndices: number[] = []
                if (meta.lyrics && meta.roles && meta.roles.length > 0) {
                    for (let ri = 0; ri < meta.roles.length; ri++) {
                        if (meta.lyrics.some((l: any) => l.roleIndex === ri && /nigg(?:a|er)s?/i.test(l.words))) {
                            offensiveRoleIndices.push(ri)
                        }
                    }
                }
                catalogItems.push({
                    trackId: meta.trackId,
                    name: meta.name,
                    artist: meta.artist,
                    artUrl: meta.artUrl,
                    albumName: meta.albumName,
                    durationMs: meta.durationMs,
                    roles: meta.roles || [],
                    hasVocals: !!vocals,
                    spotifyData: meta.spotifyData || null,
                    offensiveRoleIndices,
                    genres: Array.isArray(meta.genres) ? meta.genres : []
                })
            } catch { /* skip corrupted */ }
        }
    }
    if (catalogItems.length > 0) {
        await pushCatalog(sessionId, catalogItems)
    }
}

// ----- Helper: generate QR code for a session code -----
async function generateSessionQR(sessionCode: string): Promise<{ companionUrl: string; qrDataUrl: string }> {
    const companionUrl = `${COMPANION_BASE_URL}/?session=${sessionCode}`
    const qrDataUrl = await QRCode.toDataURL(companionUrl, {
        width: 256,
        margin: 2,
        color: { dark: '#1A1A1A', light: '#FFFFFF' }
    })
    return { companionUrl, qrDataUrl }
}

// ----- Karaoke Session IPC Handlers -----
ipcMain.handle('karaoke:create-session', async (_event, name: string, themeName: string) => {
    try {
        const session = await createSession(name, themeName)
        activeSession = { id: session.sessionId, code: session.sessionCode }

        const { companionUrl, qrDataUrl } = await generateSessionQR(session.sessionCode)

        try {
            await pushLocalCatalog(session.sessionId)
        } catch (e) {
            console.error('Failed to push catalog:', e)
        }

        // Fetch trending GIFs in background (don't block session creation)
        fetchAndStoreTrendingGifs(session.sessionId).catch(e =>
            console.error('Failed to fetch trending GIFs:', e)
        )

        // Seed default awards in background
        ensureDefaultAwards(session.sessionId).catch(e =>
            console.error('Failed to seed default awards:', e)
        )

        return {
            sessionId: session.sessionId,
            sessionCode: session.sessionCode,
            sessionName: session.sessionName,
            companionUrl,
            qrDataUrl
        }
    } catch (error: any) {
        console.error('Failed to create karaoke session:', error)
        return { error: error.message }
    }
})

ipcMain.handle('karaoke:list-recent-sessions', async () => {
    try {
        return await listRecentSessions()
    } catch (error: any) {
        console.error('Failed to list sessions:', error)
        return []
    }
})

ipcMain.handle('karaoke:resume-session', async (_event, sessionId: string) => {
    try {
        const session = await getSession(sessionId)
        activeSession = { id: session.sessionId, code: session.sessionCode }

        const { companionUrl, qrDataUrl } = await generateSessionQR(session.sessionCode)

        try {
            await pushLocalCatalog(session.sessionId)
        } catch (e) {
            console.error('Failed to push catalog on resume:', e)
        }

        // Refresh trending GIFs in background on resume
        fetchAndStoreTrendingGifs(session.sessionId).catch(e =>
            console.error('Failed to fetch trending GIFs on resume:', e)
        )

        // Seed default awards (idempotent — only inserts missing slugs)
        ensureDefaultAwards(session.sessionId).catch(e =>
            console.error('Failed to seed default awards on resume:', e)
        )

        return {
            sessionId: session.sessionId,
            sessionCode: session.sessionCode,
            sessionName: session.sessionName,
            themeName: session.themeName,
            companionUrl,
            qrDataUrl
        }
    } catch (error: any) {
        console.error('Failed to resume session:', error)
        return { error: error.message }
    }
})

ipcMain.handle('karaoke:delete-session', async (_event, sessionId: string) => {
    try {
        await deleteSession(sessionId)
    } catch (error: any) {
        console.error('Failed to delete session:', error)
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

ipcMain.handle('karaoke:sync-is-playing', async (_event, isPlaying: boolean) => {
    if (activeSession) {
        await updateIsPlaying(activeSession.id, isPlaying)
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

ipcMain.handle('karaoke:bump-bonus-points', async () => {
    if (!activeSession) return
    await bumpBonusPointsForRemaining(activeSession.id)
})

ipcMain.handle('karaoke:lock-queue-item', async (_event, queueRowId: string) => {
    if (!activeSession || !queueRowId) return
    await lockQueueItem(queueRowId)
})

ipcMain.handle('karaoke:adjust-queue-score', async (_event, queueRowId: string, delta: number) => {
    if (!activeSession || !queueRowId || !Number.isFinite(delta) || delta === 0) return
    await adjustQueueBonusPoints(queueRowId, delta)
})

// ----- Guest Management IPC Handlers -----

ipcMain.handle('karaoke:list-guests', async () => {
    if (!activeSession) return []
    return listGuests(activeSession.id)
})

ipcMain.handle('karaoke:update-guest', async (_event, id: string, fields: { name?: string; profilePicture?: string | null; whitePersonCheck?: boolean }) => {
    await updateGuest(id, fields)
})

ipcMain.handle('karaoke:remove-guest', async (_event, id: string) => {
    await removeGuest(id)
})

// ----- Awards IPC Handlers -----

ipcMain.handle('karaoke:ensure-default-awards', async () => {
    if (!activeSession) return
    await ensureDefaultAwards(activeSession.id)
})

ipcMain.handle('karaoke:list-awards', async () => {
    if (!activeSession) return []
    return listAwards(activeSession.id)
})

ipcMain.handle('karaoke:list-award-votes', async () => {
    if (!activeSession) return []
    return listAwardVotes(activeSession.id)
})

ipcMain.handle('karaoke:list-award-results', async () => {
    if (!activeSession) return []
    return listAwardResults(activeSession.id)
})

ipcMain.handle('karaoke:create-award', async (_event, input: { title: string; description: string; subjectType: 'performance' | 'singer' | 'group'; iconId: string | null; iconDataUrl: string | null; createdByGuestId: string }) => {
    if (!activeSession) return { error: 'No active session' }
    return createCustomAward({
        sessionId: activeSession.id,
        title: input.title,
        description: input.description,
        subjectType: input.subjectType,
        iconId: input.iconId,
        iconDataUrl: input.iconDataUrl,
        createdByGuestId: input.createdByGuestId
    })
})

ipcMain.handle('karaoke:update-award', async (_event, awardId: string, fields: { title?: string; description?: string; iconId?: string | null; iconDataUrl?: string | null }) => {
    return updateAward(awardId, fields)
})

ipcMain.handle('karaoke:delete-award', async (_event, awardId: string) => {
    return deleteAward(awardId)
})

ipcMain.handle('karaoke:cast-award-vote', async (_event, input: { awardId: string; voterGuestId: string; subjectQueueRowId: string | null; subjectGuestId: string | null }) => {
    return castAwardVote(input)
})

ipcMain.handle('karaoke:clear-award-vote', async (_event, awardId: string, voterGuestId: string) => {
    await clearAwardVote(awardId, voterGuestId)
})

ipcMain.handle('karaoke:set-award-adjustments', async (_event, awardId: string, adjustments: Record<string, number>) => {
    return setAwardAdjustments(awardId, adjustments)
})

ipcMain.handle('karaoke:persist-award-results', async (_event, results: any[]) => {
    await persistAwardResults(results)
})

ipcMain.handle('karaoke:unfinalize-awards', async (_event, awardIds: string[]) => {
    await unfinalizeAwards(awardIds)
})

ipcMain.handle('karaoke:broadcast-reveal-step', async (_event, step: unknown) => {
    if (!activeSession) return
    await broadcastRevealStep(activeSession.id, step)
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

    // BrowserWindow.icon is a no-op on macOS — the dock uses the bundle icon
    // (or whatever app.dock.setIcon overrides it with). Set it explicitly so
    // dev runs show our icon instead of the default Electron diamond.
    if (process.platform === 'darwin' && app.dock) {
        try { app.dock.setIcon(APP_ICON_PATH) } catch { /* icon optional */ }
    }

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    registerAudioHandlers()
    createWindow()

    // Tell the renderer when the machine goes to sleep or the screen locks, so
    // it can stop auto-advancing the queue while the host is away (otherwise a
    // song finishing during display sleep would silently mark itself played and
    // consume the now-playing entry). Resume/unlock clears the flag.
    const broadcastPowerIdle = (idle: boolean) => {
        for (const w of [mainWindow, stageWindow]) {
            if (w && !w.isDestroyed()) w.webContents.send('power:idle', idle)
        }
    }
    powerMonitor.on('suspend', () => broadcastPowerIdle(true))
    powerMonitor.on('lock-screen', () => broadcastPowerIdle(true))
    powerMonitor.on('resume', () => broadcastPowerIdle(false))
    powerMonitor.on('unlock-screen', () => broadcastPowerIdle(false))

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Sessions persist across app restarts for resume support.
// activeSession is only cleared in-memory; the DB row stays is_active=true.

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
