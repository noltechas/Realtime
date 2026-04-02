#!/usr/bin/env node
/**
 * Backfill Spotify data for songs missing it.
 * Tries audio-features (instrumentalness) first; if 403 (Spotify has restricted that endpoint),
 * falls back to track endpoint (popularity). Both are used for sorting.
 *
 * Loads credentials from .env (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, or
 * VITE_SPOTIFY_CLIENT_ID, VITE_SPOTIFY_CLIENT_SECRET) or from environment.
 *
 * Usage: npm run backfill-popularity
 */

const fs = require('fs')
const path = require('path')
const os = require('os')

// Load .env from project root
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env')
    if (!fs.existsSync(envPath)) return
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq <= 0) continue
        const key = trimmed.slice(0, eq).trim()
        let val = trimmed.slice(eq + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = val
    }
}

loadEnv()

const SONGS_DIR = path.join(os.homedir(), '.realtime-karaoke', 'songs')

async function getSpotifyToken(clientId, clientSecret) {
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    })
    const data = await res.json()
    if (data.error) throw new Error(`Spotify auth failed: ${data.error_description || data.error}`)
    return data.access_token
}

// Extract raw Spotify track ID from various formats (URI, URL, or plain ID)
function extractTrackId(trackId) {
    if (!trackId || typeof trackId !== 'string') return null
    const s = trackId.trim()
    const uriMatch = s.match(/spotify:track:([a-zA-Z0-9]+)/)
    if (uriMatch) return uriMatch[1]
    const urlMatch = s.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/)
    if (urlMatch) return urlMatch[1]
    return s.length === 22 && /^[a-zA-Z0-9]+$/.test(s) ? s : s
}

async function searchTrack(name, artist, token) {
    const q = `track:${name} artist:${artist}`.replace(/[^\w\s:()-]/g, ' ').replace(/\s+/g, ' ').trim()
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    const tracks = data.tracks?.items || []
    if (tracks.length === 0) return null
    return tracks[0].id
}

async function fetchTrack(trackId, token) {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    return res
}

async function fetchSpotifyData(trackId, token, fallbackMeta = null) {
    let id = extractTrackId(trackId)
    if (!id) return { error: 'Invalid track ID format', raw: trackId }

    // 1. Try audio-features (instrumentalness) - often returns 403 now (Spotify restricted)
    let res = await fetch(`https://api.spotify.com/v1/audio-features/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    let data = await res.json()

    // If 404 and we have name+artist, try searching Spotify
    if (data.error && res.status === 404 && fallbackMeta?.name && fallbackMeta?.artist) {
        await sleep(100)
        const searchId = await searchTrack(fallbackMeta.name, fallbackMeta.artist, token)
        if (searchId) {
            id = searchId
            res = await fetch(`https://api.spotify.com/v1/audio-features/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            data = await res.json()
        }
    }

    // 2. If audio-features succeeded, return it
    if (!data.error && typeof data.instrumentalness === 'number') {
        return { ...data, _resolvedId: id }
    }

    // 3. Fallback: use track endpoint (popularity) - works when audio-features returns 403
    if (data.error && (res.status === 403 || res.status === 404)) {
        const trackRes = await fetchTrack(id, token)
        const trackData = await trackRes.json()
        if (!trackData.error && typeof trackData.popularity === 'number') {
            return { instrumentalness: null, popularity: trackData.popularity, _resolvedId: id, _fromTrack: true }
        }
    }

    if (data.error) {
        const err = data.error
        const msg = typeof err === 'object' ? err.message : (data.error_description || err)
        return { error: typeof err === 'object' ? err.status || 'error' : err, message: msg, status: res.status }
    }
    return { error: 'No usable data' }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
    const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.VITE_SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || process.env.VITE_SPOTIFY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        console.error('Error: Spotify credentials not found.')
        console.error('Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET (or VITE_* variants) to .env, or pass as env vars.')
        process.exit(1)
    }

    if (!fs.existsSync(SONGS_DIR)) {
        console.log('No songs directory found at', SONGS_DIR)
        process.exit(0)
    }

    const dirs = fs.readdirSync(SONGS_DIR, { withFileTypes: true }).filter(d => d.isDirectory())
    const needsBackfill = []

    for (const dir of dirs) {
        const metaPath = path.join(SONGS_DIR, dir.name, 'meta.json')
        if (!fs.existsSync(metaPath)) continue
        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
            const hasInstrumentalness = typeof meta.spotifyData?.instrumentalness === 'number'
            const hasPopularity = typeof meta.spotifyData?.popularity === 'number'
            if (!hasInstrumentalness && !hasPopularity) {
                needsBackfill.push({ dir: dir.name, metaPath, meta })
            }
        } catch (err) {
            console.warn('Skipping', dir.name, ':', err.message)
        }
    }

    if (needsBackfill.length === 0) {
        console.log('All songs already have instrumentalness or popularity. Nothing to do.')
        process.exit(0)
    }

    console.log(`Found ${needsBackfill.length} song(s) missing Spotify data. Fetching...`)

    let token
    try {
        token = await getSpotifyToken(clientId, clientSecret)
    } catch (err) {
        console.error('Failed to get Spotify token:', err.message)
        process.exit(1)
    }

    let updated = 0
    let failed = 0

    const verbose = process.env.DEBUG || process.argv.includes('--verbose')
    for (const { dir, metaPath, meta } of needsBackfill) {
        const result = await fetchSpotifyData(meta.trackId, token, { name: meta.name, artist: meta.artist })
        if (result.error) {
            const errMsg = `${result.error}${result.message ? ': ' + result.message : ''}${result.status ? ' (HTTP ' + result.status + ')' : ''}`
            console.warn(`  Skipped ${meta.name || dir}: ${errMsg} [trackId: ${meta.trackId}]`)
            if (verbose) console.warn('    Raw response:', JSON.stringify(result).slice(0, 200))
            failed++
        } else {
            meta.spotifyData = meta.spotifyData || {}
            if (typeof result.instrumentalness === 'number') {
                meta.spotifyData.instrumentalness = result.instrumentalness
                if (typeof result.key === 'number') meta.spotifyData.key = result.key
                if (typeof result.mode === 'number') meta.spotifyData.mode = result.mode
                if (typeof result.tempo === 'number') meta.spotifyData.tempo = Math.round(result.tempo)
                const vocalness = (1 - result.instrumentalness).toFixed(2)
                console.log(`  Updated ${meta.name || dir}: instrumentalness ${result.instrumentalness.toFixed(2)} (vocalness ${vocalness})`)
            } else if (typeof result.popularity === 'number') {
                meta.spotifyData.popularity = result.popularity
                console.log(`  Updated ${meta.name || dir}: popularity ${result.popularity} (audio-features unavailable, using track)`)
            }
            if (result._resolvedId && result._resolvedId !== meta.trackId) {
                meta.trackId = result._resolvedId
            }
            fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
            updated++
        }
        await sleep(200) // Rate limit: ~5 requests/sec to stay under Spotify limits
    }

    console.log(`\nDone. Updated ${updated}, skipped ${failed}.`)
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
