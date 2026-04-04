import { createClient, RealtimeChannel } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hnnbxwitjkeijvoldfuv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubmJ4d2l0amtlaWp2b2xkZnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjcwMTQsImV4cCI6MjA5MDUwMzAxNH0.ENzZ2VLxszHr9StjFds06In7CyGkiyPvu6Jh1LUMMvA'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(length = 6): string {
    let code = ''
    for (let i = 0; i < length; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    }
    return code
}

export interface SessionInfo {
    sessionId: string
    sessionCode: string
    sessionName: string | null
}

export async function createSession(name: string, themeName: string): Promise<SessionInfo> {
    const code = generateCode()
    const { data, error } = await supabase
        .from('karaoke_sessions')
        .insert({ code, is_active: true, name: name || null, theme_name: themeName || 'neo-brutal' })
        .select('id, code, name')
        .single()

    if (error) throw new Error(`Failed to create session: ${error.message}`)

    return {
        sessionId: data.id,
        sessionCode: data.code,
        sessionName: data.name
    }
}

const GIPHY_API_KEY = import.meta.env.MAIN_VITE_GIPHY_API_KEY || ''

interface TrendingGif {
    id: string
    title: string
    preview: string
    url: string
}

export async function fetchAndStoreTrendingGifs(sessionId: string): Promise<void> {
    try {
        const response = await fetch(
            `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=100&rating=pg`
        )
        if (!response.ok) throw new Error(`Giphy API error: ${response.status}`)
        const data = await response.json()

        const gifs: TrendingGif[] = (data.data || [])
            .map((g: any) => ({
                id: g.id,
                title: g.title || '',
                preview: g.images?.fixed_width_small?.url || '',
                url: g.images?.fixed_width?.url || ''
            }))
            .filter((g: TrendingGif) => g.preview && g.url)

        await supabase
            .from('karaoke_sessions')
            .update({ trending_gifs: gifs })
            .eq('id', sessionId)
    } catch (e) {
        console.error('Failed to fetch trending GIFs:', e)
    }
}

export interface RecentSession {
    id: string
    code: string
    name: string | null
    themeName: string | null
    createdAt: string
    guestCount: number
}

export async function listRecentSessions(): Promise<RecentSession[]> {
    const { data, error } = await supabase
        .from('karaoke_sessions')
        .select('id, code, name, theme_name, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Failed to list sessions:', error.message)
        return []
    }

    const sessions = await Promise.all((data || []).map(async (s: any) => {
        const { count } = await supabase
            .from('karaoke_guests')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', s.id)
        return {
            id: s.id,
            code: s.code,
            name: s.name,
            themeName: s.theme_name,
            createdAt: s.created_at,
            guestCount: count || 0,
        }
    }))
    return sessions
}

export async function getSession(sessionId: string): Promise<SessionInfo & { themeName: string | null }> {
    const { data, error } = await supabase
        .from('karaoke_sessions')
        .select('id, code, name, theme_name, is_active')
        .eq('id', sessionId)
        .single()

    if (error || !data) throw new Error('Session not found')
    if (!data.is_active) throw new Error('Session is no longer active')

    return {
        sessionId: data.id,
        sessionCode: data.code,
        sessionName: data.name,
        themeName: data.theme_name
    }
}

export interface CatalogItem {
    trackId: string
    name: string
    artist: string
    artUrl: string
    albumName: string
    durationMs: number
    roles?: string[]
    hasVocals: boolean
    spotifyData?: any
}

export async function pushCatalog(sessionId: string, songs: CatalogItem[]): Promise<void> {
    const CHUNK = 100
    for (let i = 0; i < songs.length; i += CHUNK) {
        const chunk = songs.slice(i, i + CHUNK).map(s => ({
            session_id: sessionId,
            track_id: s.trackId,
            name: s.name,
            artist: s.artist,
            art_url: s.artUrl,
            album_name: s.albumName,
            duration_ms: s.durationMs,
            roles: s.roles || [],
            has_vocals: s.hasVocals,
            spotify_data: s.spotifyData || null
        }))
        const { error } = await supabase
            .from('karaoke_catalog')
            .upsert(chunk, { onConflict: 'session_id,track_id' })
        if (error) console.error('Failed to push catalog chunk:', error.message)
    }
}

export interface QueueCallbacks {
    onInsert: (row: any) => void
    onDelete: (row: any) => void
    onUpdate: (row: any) => void
}

let queueChannel: RealtimeChannel | null = null
let sessionChannel: RealtimeChannel | null = null

export function subscribeToQueue(sessionId: string, callbacks: QueueCallbacks): void {
    if (queueChannel) {
        supabase.removeChannel(queueChannel)
    }

    queueChannel = supabase
        .channel(`queue-${sessionId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'karaoke_queue', filter: `session_id=eq.${sessionId}` },
            (payload) => callbacks.onInsert(payload.new)
        )
        .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'karaoke_queue', filter: `session_id=eq.${sessionId}` },
            (payload) => callbacks.onDelete(payload.old)
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'karaoke_queue', filter: `session_id=eq.${sessionId}` },
            (payload) => callbacks.onUpdate(payload.new)
        )
        .subscribe()
}

export async function updateNowPlaying(sessionId: string, info: {
    trackId: string; name: string; artist: string; artUrl: string | null;
    singerConfigs?: any[];
    stageTheme?: string | null;
} | null): Promise<void> {
    const { error } = await supabase
        .from('karaoke_sessions')
        .update({
            now_playing_track_id: info?.trackId || null,
            now_playing_name: info?.name || null,
            now_playing_artist: info?.artist || null,
            now_playing_art_url: info?.artUrl || null,
            is_playing: false,
            now_playing_singer_configs: info?.singerConfigs ?? null,
            now_playing_stage_theme: info?.stageTheme ?? null,
            updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
    if (error) console.error('Failed to update now playing:', error.message)
}

export async function updateIsPlaying(sessionId: string, isPlaying: boolean): Promise<void> {
    const { error } = await supabase
        .from('karaoke_sessions')
        .update({ is_playing: isPlaying, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
    if (error) console.error('Failed to update is_playing:', error.message)
}

export async function insertQueueItem(sessionId: string, item: {
    trackId: string
    trackName: string
    trackArtist: string
    trackArtUrl: string | null
    trackDurationMs: number
    singerConfigs: any[]
    addedByName?: string | null
    source: 'local' | 'remote'
    stageTheme?: string | null
}): Promise<{ id: string }> {
    // Get next position
    const { data: maxRow } = await supabase
        .from('karaoke_queue')
        .select('position')
        .eq('session_id', sessionId)
        .order('position', { ascending: false })
        .limit(1)
        .single()

    const nextPosition = (maxRow?.position ?? -1) + 1

    const { data, error } = await supabase
        .from('karaoke_queue')
        .insert({
            session_id: sessionId,
            track_id: item.trackId,
            track_name: item.trackName,
            track_artist: item.trackArtist,
            track_art_url: item.trackArtUrl,
            track_duration_ms: item.trackDurationMs,
            singer_configs: item.singerConfigs,
            added_by_name: item.addedByName || null,
            source: item.source,
            stage_theme: item.stageTheme || null,
            position: nextPosition,
            status: 'queued'
        })
        .select('id')
        .single()

    if (error) throw new Error(`Failed to insert queue item: ${error.message}`)
    return { id: data.id }
}

export async function removeQueueItem(queueRowId: string): Promise<void> {
    const { error } = await supabase
        .from('karaoke_queue')
        .delete()
        .eq('id', queueRowId)
    if (error) console.error('Failed to remove queue item:', error.message)
}

export async function reorderQueue(sessionId: string, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
        await supabase
            .from('karaoke_queue')
            .update({ position: i })
            .eq('id', orderedIds[i])
    }
}

export interface Guest {
    id: string
    sessionId: string
    name: string
    profilePicture: string | null
}

export async function listGuests(sessionId: string): Promise<Guest[]> {
    const { data, error } = await supabase
        .from('karaoke_guests')
        .select('id, session_id, name, profile_picture')
        .eq('session_id', sessionId)
    if (error) {
        console.error('Failed to list guests:', error.message)
        return []
    }
    return (data || []).map((r: any) => ({
        id: r.id,
        sessionId: r.session_id,
        name: r.name,
        profilePicture: r.profile_picture
    }))
}

export async function updateGuest(id: string, fields: { name?: string; profilePicture?: string | null }): Promise<void> {
    const update: any = {}
    if (fields.name !== undefined) update.name = fields.name
    if (fields.profilePicture !== undefined) update.profile_picture = fields.profilePicture
    const { error } = await supabase
        .from('karaoke_guests')
        .update(update)
        .eq('id', id)
    if (error) console.error('Failed to update guest:', error.message)
}

export async function removeGuest(id: string): Promise<void> {
    const { error } = await supabase
        .from('karaoke_guests')
        .delete()
        .eq('id', id)
    if (error) console.error('Failed to remove guest:', error.message)
}

export async function closeSession(sessionId: string): Promise<void> {
    if (queueChannel) {
        supabase.removeChannel(queueChannel)
        queueChannel = null
    }
    if (sessionChannel) {
        supabase.removeChannel(sessionChannel)
        sessionChannel = null
    }

    await supabase
        .from('karaoke_sessions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
}

export async function deleteSession(sessionId: string): Promise<void> {
    // Delete dependents first (queue, guests, catalog), then session
    await supabase.from('karaoke_queue').delete().eq('session_id', sessionId)
    await supabase.from('karaoke_guests').delete().eq('session_id', sessionId)
    await supabase.from('karaoke_catalog').delete().eq('session_id', sessionId)
    const { error } = await supabase.from('karaoke_sessions').delete().eq('id', sessionId)
    if (error) console.error('Failed to delete session:', error.message)
}
