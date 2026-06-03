import { useEffect, useRef } from 'react'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import { useApp, QueueItem, NEON_COLORS, MicFxOverride } from '../context/AppContext'
import { DEFAULT_VOICE_EFFECTS } from '../audio/VoiceEffectsTypes'
import type { KaraokeGuestRow } from '@karaoke/shared'

const SUPABASE_URL = 'https://hnnbxwitjkeijvoldfuv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubmJ4d2l0amtlaWp2b2xkZnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjcwMTQsImV4cCI6MjA5MDUwMzAxNH0.ENzZ2VLxszHr9StjFds06In7CyGkiyPvu6Jh1LUMMvA'

// Supabase Realtime sends *broadcast* frames as binary. The browser/Electron
// WebSocket defaults binaryType to 'blob', and realtime-js never sets it to
// 'arraybuffer', so its serializer (which only decodes ArrayBuffer binary
// frames) silently drops every broadcast — while text frames (channel joins,
// postgres_changes) still work. That's why queue/session sync worked but
// reactions never arrived. Force a WebSocket transport that uses ArrayBuffer.
class ArrayBufferWebSocket extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols)
        this.binaryType = 'arraybuffer'
    }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    realtime: { transport: ArrayBufferWebSocket as any }
})

interface CatalogSong {
    trackId: string
    name: string
    artist: string
    artUrl: string
    albumName: string
    durationMs: number
    instrumentalPath: string
    vocalsPath?: string
    youtubeUrl?: string
    voiceEffects?: any
    roles?: string[]
    lyrics?: any[]
    spotifyData?: any
}

export function useKaraokeSession() {
    const { state, dispatch } = useApp()
    const catalogRef = useRef<CatalogSong[]>([])
    const queueChannelRef = useRef<RealtimeChannel | null>(null)
    const reactionChannelRef = useRef<RealtimeChannel | null>(null)
    const sessionChannelRef = useRef<RealtimeChannel | null>(null)
    const awardsChannelRef = useRef<RealtimeChannel | null>(null)
    const awardsRevealChannelRef = useRef<RealtimeChannel | null>(null)
    const isRemotePlayRef = useRef(false)
    const lastSeenSkipAtRef = useRef<string | null>(null)
    const reconcileTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Load catalog for resolving remote additions
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        window.electronAPI?.listCatalog().then((songs) => {
            catalogRef.current = songs
        })
    }, [])

    // Live guest roster. Singers reference guests by id, so the renderer needs
    // each guest's canonical name + avatar to resolve singers at render time
    // (so a profile edit propagates to every queued song, now-playing, stage,
    // and awards). Runs in BOTH windows: the stage window renders the singer
    // names/avatars on KaraokePage and must hold its own roster — relying on
    // the SET_GUESTS IPC relay alone left it empty when the relay/INIT raced,
    // so the stage showed the "Singer N" placeholders instead of real names.
    useEffect(() => {
        const sessionId = state.karaokeSessionId
        if (!sessionId) return

        const loadGuests = () => {
            supabase
                .from('karaoke_guests')
                .select('*')
                .eq('session_id', sessionId)
                .then(({ data, error }) => {
                    if (error) {
                        console.warn('[Karaoke] Failed to load guests:', error.message)
                        return
                    }
                    dispatch({ type: 'SET_GUESTS', payload: (data || []) as KaraokeGuestRow[] })
                })
        }
        loadGuests()

        const ch = supabase
            .channel('renderer-guests-' + sessionId + (window.electronAPI?.isStageWindow ? '-stage' : '-main'))
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'karaoke_guests', filter: 'session_id=eq.' + sessionId },
                () => loadGuests()
            )
            .subscribe()

        return () => { supabase.removeChannel(ch) }
    }, [state.karaokeSessionId, dispatch])

    // Session creation is now handled explicitly by SessionPage.
    // No auto-create on mount — this fixes the React StrictMode double-session bug.

    // Retroactive sync: push pre-existing local queue items to Supabase
    // when the session becomes available (fixes race where songs are added
    // before createKaraokeSession resolves)
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.karaokeSessionId) return
        if (state.queue.length === 0) return

        for (const item of state.queue) {
            if (item.remoteQueueId) continue
            window.electronAPI?.pushLocalQueueItem({
                trackId: item.track.id,
                trackName: item.track.name,
                trackArtist: item.track.artists.map(a => a.name).join(', '),
                trackArtUrl: item.track.album.images[0]?.url || null,
                trackDurationMs: item.track.duration_ms,
                singerConfigs: item.singers.map(s => ({
                    name: s.name, color: s.color, colorGlow: s.colorGlow, roleIndices: s.roleIndices
                })),
            }).catch(err => console.error('[Karaoke] Failed to retroactively sync queue item:', err))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.karaokeSessionId])

    // Helper: resolve a remote queue row into a local QueueItem
    function resolveRemoteRow(row: any): QueueItem | null {
        const catalogEntry = catalogRef.current.find(s => s.trackId === row.track_id)
        if (!catalogEntry) {
            console.warn('[Karaoke] Remote queue item for unknown track:', row.track_id)
            return null
        }

        const singerConfigs: any[] = row.singer_configs || []
        const singers = singerConfigs.map((sc: any, i: number) => ({
            id: i,
            name: sc.name || `Singer ${i + 1}`,
            color: sc.color || NEON_COLORS[i % NEON_COLORS.length].color,
            colorGlow: sc.colorGlow || NEON_COLORS[i % NEON_COLORS.length].colorGlow,
            micDeviceId: '',
            vocalTrack: i === 0 ? 'lead' as const : 'backing' as const,
            roleIndices: sc.roleIndices,
            whitePersonCheck: sc.whitePersonCheck || false,
            // Preserve the guestId carried by the mobile/website so the
            // round-trip back to now_playing_singer_configs lets remote
            // clients match by stable id (see syncNowPlaying below), and so
            // the desktop resolves this singer's live name + avatar from the
            // guest roster (state.guests) rather than any embedded snapshot.
            guestId: sc.guestId || undefined,
        }))

        return {
            id: `${row.track_id}-${row.id}`,
            stageTheme: row.stage_theme || null,
            isHidden: !!row.is_hidden,
            track: {
                id: catalogEntry.trackId,
                name: catalogEntry.name,
                artists: [{ name: catalogEntry.artist }],
                album: {
                    name: catalogEntry.albumName,
                    images: catalogEntry.artUrl ? [{ url: catalogEntry.artUrl, width: 300, height: 300 }] : []
                },
                duration_ms: catalogEntry.durationMs,
                uri: ''
            },
            lyrics: catalogEntry.lyrics || [],
            roles: catalogEntry.roles || [],
            singers,
            voiceEffects: catalogEntry.voiceEffects || DEFAULT_VOICE_EFFECTS,
            stemsPath: {
                instrumental: catalogEntry.instrumentalPath,
                vocals: catalogEntry.vocalsPath
            },
            songPath: null,
            backgroundVideoPath: catalogEntry.youtubeUrl || null,
            addedBy: row.added_by_name || null,
            remoteQueueId: row.id,
            score: row.score ?? 0,
            bonusPoints: row.bonus_points ?? 0,
            locked: !!row.locked,
            createdAt: row.created_at || new Date().toISOString()
        }
    }

    // Subscribe to Realtime queue changes + fetch existing queued items
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.karaokeSessionId) return

        // Clean up previous subscription
        if (queueChannelRef.current) {
            supabase.removeChannel(queueChannelRef.current)
        }

        // Fetch existing remote queue items that were added before we subscribed
        supabase
            .from('karaoke_queue')
            .select('*')
            .eq('session_id', state.karaokeSessionId)
            .eq('status', 'queued')
            .eq('source', 'remote')
            .order('position')
            .then(({ data, error }) => {
                if (error) {
                    console.error('[Karaoke] Failed to fetch existing queue:', error)
                    return
                }
                if (!data || data.length === 0) return

                for (const row of data) {
                    // Skip if already in local queue
                    if (state.queue.some(q => q.remoteQueueId === row.id)) continue

                    const item = resolveRemoteRow(row)
                    if (item) {
                        console.log('[Karaoke] Loaded existing remote queue item:', item.track.name)
                        dispatch({ type: 'ENQUEUE_SONG', payload: item })
                    }
                }
            })

        const channel = supabase
            .channel('renderer-queue-' + state.karaokeSessionId)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'karaoke_queue',
                    filter: 'session_id=eq.' + state.karaokeSessionId
                },
                (payload) => {
                    const row = payload.new as any
                    // Only process remote additions (ignore our own local inserts)
                    if (row.source !== 'remote') return

                    const item = resolveRemoteRow(row)
                    if (item) {
                        console.log('[Karaoke] Remote song added by', row.added_by_name, ':', item.track.name)
                        dispatch({ type: 'ENQUEUE_SONG', payload: item })
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'karaoke_queue',
                    filter: 'session_id=eq.' + state.karaokeSessionId
                },
                (payload) => {
                    const row = payload.new as any
                    if (!row?.id) return
                    // Score/bonus changes from companion votes — re-sort.
                    // Deliberately omit `locked` here: the desktop host is
                    // authoritative for lock state. A stale DB value (set
                    // before the host's lockQueueItem RPC completes) must
                    // never overwrite locally-locked top of queue.
                    dispatch({
                        type: 'UPDATE_QUEUE_ITEM_SCORE',
                        payload: {
                            remoteQueueId: row.id,
                            score: row.score ?? 0,
                            bonusPoints: row.bonus_points ?? 0,
                        }
                    })
                    // Edit-your-song from mobile / website: apply singer /
                    // theme / hidden changes so the host plays the updated
                    // config. The same UPDATE payload covers it — we just
                    // re-derive the local Singer objects from singer_configs.
                    const singerConfigs: any[] = Array.isArray(row.singer_configs)
                        ? row.singer_configs
                        : []
                    const singers = singerConfigs.map((sc: any, i: number) => ({
                        id: i,
                        name: sc.name || `Singer ${i + 1}`,
                        color: sc.color || NEON_COLORS[i % NEON_COLORS.length].color,
                        colorGlow: sc.colorGlow || NEON_COLORS[i % NEON_COLORS.length].colorGlow,
                        micDeviceId: '',
                        vocalTrack: i === 0 ? 'lead' as const : 'backing' as const,
                        roleIndices: sc.roleIndices,
                        whitePersonCheck: sc.whitePersonCheck || false,
                        guestId: sc.guestId || undefined,
                    }))
                    dispatch({
                        type: 'APPLY_REMOTE_EDIT',
                        payload: {
                            remoteQueueId: row.id,
                            singers,
                            stageTheme: row.stage_theme || null,
                            isHidden: !!row.is_hidden,
                        }
                    })
                }
            )
            .subscribe((status) => {
                console.log('[Karaoke] Realtime subscription status:', status)
            })

        queueChannelRef.current = channel

        return () => {
            if (queueChannelRef.current) {
                supabase.removeChannel(queueChannelRef.current)
                queueChannelRef.current = null
            }
        }
    }, [state.karaokeSessionId, dispatch])

    // Subscribe to broadcast reactions from companion site
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.karaokeSessionId) return

        if (reactionChannelRef.current) {
            supabase.removeChannel(reactionChannelRef.current)
        }

        // [REACT-DBG] temporary diagnostic — remove after debugging
        console.log('[REACT-DBG] desktop: subscribing reaction channel cr-' + state.karaokeSessionId)
        const channel = supabase
            .channel('cr-' + state.karaokeSessionId)
            .on('broadcast', { event: 'reaction' }, (payload) => {
                console.log('[REACT-DBG] desktop: broadcast RECEIVED', (payload as any)?.payload?.content)
                window.electronAPI?.sendReaction(payload.payload)
            })
            .on('broadcast', { event: '*' }, (payload) => {
                console.log('[REACT-DBG] desktop: ANY-broadcast event=', (payload as any)?.event, 'content=', (payload as any)?.payload?.content)
            })
            .subscribe((status) => {
                console.log('[REACT-DBG] desktop: reaction channel status =', status)
            })

        reactionChannelRef.current = channel

        return () => {
            if (reactionChannelRef.current) {
                supabase.removeChannel(reactionChannelRef.current)
                reactionChannelRef.current = null
            }
        }
    }, [state.karaokeSessionId])

    // Sync now-playing changes to Supabase.
    //
    // Keyed on the queue-item id (NOT track.id). Two distinct queue rows can
    // share a track_id — the classic case is the host queuing a song locally
    // while a guest queues the SAME song from the app. If this effect were keyed
    // on track.id, advancing from one copy to the other would not re-fire, so
    // now_playing_singer_configs would keep the first copy's singers forever:
    // the stage shows the wrong (or placeholder) singer and the guest never gets
    // flipped to their Stage tab because their guestId never reaches the session
    // row. Keying on the item id makes every advance publish the right config.
    const prevNowPlayingRowRef = useRef<{ rowId: string | null; trackId: string | null } | null>(null)

    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        const sessionId = state.karaokeSessionId
        if (!sessionId) return

        // Retire a single queue row from the companion-site queue. Prefer the
        // exact Supabase row id: marking played by track_id (as this used to do)
        // also retires sibling rows that merely share the track — which silently
        // consumes a guest's remote entry, dropping their singer config + guestId
        // before that entry ever plays. Fall back to track_id only when the row
        // id isn't wired up yet, and scope that fallback to source='local' so a
        // guest's remote row is still never collaterally retired.
        const markRowPlayed = (rowId: string | null | undefined, trackId: string | null) => {
            const base = supabase.from('karaoke_queue').update({ status: 'played' }).eq('status', 'queued')
            const query = rowId
                ? base.eq('id', rowId)
                : trackId
                    ? base.eq('session_id', sessionId).eq('track_id', trackId).eq('source', 'local')
                    : null
            if (!query) return
            query.then(res => {
                if (res.error) console.error('[Karaoke] Failed to mark queue row as played:', res.error)
            })
        }

        // Mark the PREVIOUS now-playing row as played when advancing to a
        // different queue item (defensive: the row was already retired when it
        // first became now-playing, but a transient failure there shouldn't
        // strand it in the companion queue).
        const prev = prevNowPlayingRowRef.current
        const currentRowId = state.nowPlaying?.remoteQueueId ?? null
        if (prev && (prev.rowId || prev.trackId) && prev.rowId !== currentRowId) {
            markRowPlayed(prev.rowId, prev.trackId)
        }

        if (state.nowPlaying) {
            prevNowPlayingRowRef.current = { rowId: currentRowId, trackId: state.nowPlaying.track.id }
            window.electronAPI?.syncNowPlaying({
                trackId: state.nowPlaying.track.id,
                name: state.nowPlaying.track.name,
                artist: state.nowPlaying.track.artists.map(a => a.name).join(', '),
                artUrl: state.nowPlaying.track.album.images[0]?.url || null,
                singerConfigs: state.nowPlaying.singers.map(s => ({
                    color: s.color, colorGlow: s.colorGlow, roleIndices: s.roleIndices,
                    // Reference identity by guestId so remote clients resolve the
                    // singer's LIVE name + avatar from karaoke_guests (a profile
                    // edit then propagates to the now-playing banner / stage tab
                    // without re-queueing). Only fall back to an inline name for
                    // admin/host- or name-only singers with no linked account.
                    // Never publish a base64 avatar here.
                    ...(s.guestId ? { guestId: s.guestId } : { name: s.name }),
                })),
                stageTheme: state.nowPlaying.stageTheme || null
            })
            // Retire this row from the companion queue now that it's playing —
            // by exact row id so a same-track sibling (e.g. a guest's remote
            // copy) is left intact to play later with its own singer config.
            markRowPlayed(currentRowId, state.nowPlaying.track.id)
        } else {
            prevNowPlayingRowRef.current = null
            window.electronAPI?.syncNowPlaying(null)
        }
    }, [state.nowPlaying?.id, state.karaokeSessionId])

    // When the host advances to a new song, bump bonus_points on every
    // remaining queued row so long-waiting songs eventually surface.
    // Edge-triggered on nowPlaying.track.id change.
    const advanceTriggerRef = useRef<string | null>(null)
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.karaokeSessionId) return
        const id = state.nowPlaying?.track?.id ?? null
        if (advanceTriggerRef.current === null) {
            advanceTriggerRef.current = id
            return
        }
        if (id === advanceTriggerRef.current) return
        advanceTriggerRef.current = id
        window.electronAPI?.bumpBonusPoints?.().catch(err =>
            console.warn('[Karaoke] bumpBonusPoints failed:', err))
    }, [state.nowPlaying?.track?.id, state.karaokeSessionId])

    // Whenever a new song settles into the Next-Up slot (position 0), lock it
    // in Supabase so the companion site reflects the guaranteed-next status.
    // Triggers on initial enqueue, after advance, after host drag-reorder, and
    // after the existing-queue fetch on session resume.
    const lockedRemoteIdRef = useRef<string | null>(null)
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.karaokeSessionId) return
        const top = state.queue[0]
        if (!top?.remoteQueueId) {
            lockedRemoteIdRef.current = null
            return
        }
        // Already pushed a lock for this row — don't spam Supabase.
        if (lockedRemoteIdRef.current === top.remoteQueueId) return
        lockedRemoteIdRef.current = top.remoteQueueId
        // Always update local state to locked (no-op if already true).
        if (!top.locked) {
            dispatch({ type: 'LOCK_NEXT_UP' })
        }
        // ALWAYS push to Supabase. NEXT_SONG and REORDER_QUEUE set locked
        // locally without persisting — if we only pushed when local was
        // unlocked, the DB would silently stay locked=false and a vote on
        // any song could overtake the next-up.
        console.log('[Karaoke] Locking next-up:', top.track.name, '(', top.remoteQueueId, ')')
        window.electronAPI?.lockQueueItem?.(top.remoteQueueId)
            .then(() => console.log('[Karaoke] Lock pushed to Supabase'))
            .catch(err => console.warn('[Karaoke] lockQueueItem failed:', err))
    }, [state.queue, state.karaokeSessionId, dispatch])

    // Sync theme changes to Supabase
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.karaokeSessionId) return

        supabase.from('karaoke_sessions')
            .update({ theme_name: state.themeName })
            .eq('id', state.karaokeSessionId)
            .then(res => {
                if (res.error) console.error('[Karaoke] Failed to sync theme:', res.error)
            })
    }, [state.themeName, state.karaokeSessionId])

    // Reconcile the remote queue with the host's local queue.
    // Any karaoke_queue row that's still status='queued' but isn't in the
    // host's local state (clearQueue, race, app-restart leftover, dropped
    // pushLocalQueueItem) gets marked played so the companion site reflects
    // the host's truth.
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        const sessionId = state.karaokeSessionId
        if (!sessionId) return

        if (reconcileTimerRef.current) clearTimeout(reconcileTimerRef.current)
        // Debounce so we don't race with pushLocalQueueItem setting
        // remoteQueueId or the companion's INSERT broadcast reaching us.
        reconcileTimerRef.current = setTimeout(() => {
            const liveIds = new Set(
                state.queue.map(q => q.remoteQueueId).filter(Boolean) as string[]
            )
            const liveTrackIds = new Set(state.queue.map(q => q.track.id))
            const nowPlayingId = state.nowPlaying?.track.id
            if (nowPlayingId) liveTrackIds.add(nowPlayingId)

            supabase.from('karaoke_queue')
                .select('id, track_id, source')
                .eq('session_id', sessionId)
                .eq('status', 'queued')
                .then(({ data, error }) => {
                    if (error) { console.warn('[Karaoke] Queue reconcile fetch failed:', error.message); return }
                    if (!data || data.length === 0) return
                    const orphans: string[] = []
                    for (const row of data) {
                        if (liveIds.has(row.id)) continue
                        // Fallback for rows whose remoteQueueId hasn't been
                        // wired up yet on the local side.
                        if (liveTrackIds.has(row.track_id)) continue
                        orphans.push(row.id)
                    }
                    if (orphans.length === 0) return
                    console.log(`[Karaoke] Marking ${orphans.length} orphaned queue row(s) as played`)
                    supabase.from('karaoke_queue')
                        .update({ status: 'played' })
                        .in('id', orphans)
                        .then(res => {
                            if (res.error) console.warn('[Karaoke] Failed to mark orphans played:', res.error.message)
                        })
                })
        }, 2500)

        return () => { if (reconcileTimerRef.current) clearTimeout(reconcileTimerRef.current) }
    }, [state.karaokeSessionId, state.queue, state.nowPlaying?.track?.id])

    // Subscribe to session changes (remote play/pause from companion)
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.karaokeSessionId) return

        if (sessionChannelRef.current) {
            supabase.removeChannel(sessionChannelRef.current)
        }

        // Prime the skip-request ref so reconnects / late subscribes don't
        // fire a stale skip from a previous skip request in the same session.
        // Also prime the FX toggles: a guest may have toggled their mic before
        // this window subscribed (or before a song loaded), and realtime only
        // delivers future UPDATEs — so we seed current values here.
        supabase.from('karaoke_sessions')
            .select('skip_requested_at, mic_fx_overrides, vocal_fx_enabled, autotune_enabled')
            .eq('id', state.karaokeSessionId)
            .single()
            .then(res => {
                if (res.error) return
                const d = res.data as any
                lastSeenSkipAtRef.current = d?.skip_requested_at ?? null
                dispatch({ type: 'SET_MIC_FX_OVERRIDES', payload: normalizeMicFxOverrides(d?.mic_fx_overrides) })
                dispatch({
                    type: 'SET_SESSION_FX',
                    payload: {
                        vocalFx: d?.vocal_fx_enabled !== false,
                        autotune: d?.autotune_enabled !== false,
                    },
                })
            })

        const channel = supabase
            .channel('renderer-session-' + state.karaokeSessionId)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'karaoke_sessions',
                    filter: 'id=eq.' + state.karaokeSessionId
                },
                (payload) => {
                    const d = payload.new as any
                    if (d.is_playing !== undefined && !isRemotePlayRef.current) {
                        dispatch({
                            type: 'SET_REMOTE_PLAY_COMMAND',
                            payload: d.is_playing ? 'play' : 'pause'
                        })
                    }
                    // Remote skip from companion (edge-triggered on timestamp change)
                    if (d.skip_requested_at && d.skip_requested_at !== lastSeenSkipAtRef.current) {
                        lastSeenSkipAtRef.current = d.skip_requested_at
                        dispatch({ type: 'SET_REMOTE_SKIP_COMMAND', payload: true })
                    }
                    // Remote vocal FX / autotune toggles. We store the raw flags
                    // and apply them per-mic at render time in KaraokePage — we
                    // must NOT mutate state.voiceEffects here (that closure would
                    // be stale, and it can't target a single singer's mic).
                    // Per-singer overrides come from the mobile companion;
                    // vocal_fx_enabled / autotune_enabled are the website's
                    // session-wide host toggle.
                    if (d.mic_fx_overrides !== undefined) {
                        dispatch({ type: 'SET_MIC_FX_OVERRIDES', payload: normalizeMicFxOverrides(d.mic_fx_overrides) })
                    }
                    if (d.vocal_fx_enabled !== undefined || d.autotune_enabled !== undefined) {
                        dispatch({
                            type: 'SET_SESSION_FX',
                            payload: {
                                vocalFx: d.vocal_fx_enabled !== false,
                                autotune: d.autotune_enabled !== false,
                            },
                        })
                    }
                }
            )
            .subscribe((status) => {
                console.log('[Karaoke] Session realtime status:', status)
            })

        sessionChannelRef.current = channel

        return () => {
            if (sessionChannelRef.current) {
                supabase.removeChannel(sessionChannelRef.current)
                sessionChannelRef.current = null
            }
        }
    }, [state.karaokeSessionId, dispatch])

    // Sync isPlaying to Supabase (with echo prevention)
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        if (!state.karaokeSessionId) return

        isRemotePlayRef.current = true
        window.electronAPI?.syncIsPlaying(state.isPlaying)
        const timer = setTimeout(() => { isRemotePlayRef.current = false }, 500)
        return () => clearTimeout(timer)
    }, [state.isPlaying, state.karaokeSessionId])

    // ---- Awards realtime + initial load ----------------------------------
    // Subscribe to karaoke_awards + karaoke_award_results for the active
    // session. Main window owns the initial fetch; stage window receives
    // updates via the state:action IPC relay.
    useEffect(() => {
        if (window.electronAPI?.isStageWindow) return
        const sessionId = state.karaokeSessionId
        if (!sessionId) return

        // Initial fetch (also seeds defaults if missing — main process did this
        // on session create, but the IPC call is idempotent so we don't worry).
        const loadAll = async () => {
            const [awards, results] = await Promise.all([
                window.electronAPI?.listAwards(),
                window.electronAPI?.listAwardResults()
            ])
            if (awards) dispatch({ type: 'SET_AWARDS', payload: awards.map(mapAwardRow) })
            if (results) dispatch({ type: 'SET_AWARD_RESULTS', payload: results.map(mapAwardResultRow) })
        }
        loadAll()

        if (awardsChannelRef.current) supabase.removeChannel(awardsChannelRef.current)

        const ch = supabase
            .channel('renderer-awards-' + sessionId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'karaoke_awards', filter: 'session_id=eq.' + sessionId }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const row = payload.new as any
                    dispatch({ type: 'UPSERT_AWARD', payload: mapAwardRow(row) })
                } else if (payload.eventType === 'DELETE') {
                    const row = payload.old as any
                    if (row?.id) dispatch({ type: 'REMOVE_AWARD', payload: row.id })
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'karaoke_award_results', filter: 'session_id=eq.' + sessionId }, () => {
                // Easiest path: refetch the whole results set when anything
                // changes. Results are small (one row per winner per award).
                window.electronAPI?.listAwardResults().then(r => {
                    dispatch({ type: 'SET_AWARD_RESULTS', payload: (r || []).map(mapAwardResultRow) })
                })
            })
            .subscribe()
        awardsChannelRef.current = ch

        return () => {
            if (awardsChannelRef.current) {
                supabase.removeChannel(awardsChannelRef.current)
                awardsChannelRef.current = null
            }
        }
    }, [state.karaokeSessionId, dispatch])

    // Awards reveal broadcast channel — both main AND stage need to receive
    // these. The stage window goes through state:action IPC for everything
    // else; for reveal-step we subscribe directly so the stage doesn't depend
    // on the main window staying responsive during the sequence.
    useEffect(() => {
        const sessionId = state.karaokeSessionId
        if (!sessionId) return

        if (awardsRevealChannelRef.current) supabase.removeChannel(awardsRevealChannelRef.current)

        const ch = supabase
            .channel('ar-' + sessionId)
            .on('broadcast', { event: 'reveal-step' }, (pl: any) => {
                const step = pl?.payload?.step ?? null
                dispatch({ type: 'SET_REVEAL_STEP', payload: step })
            })
            .subscribe()
        awardsRevealChannelRef.current = ch

        return () => {
            if (awardsRevealChannelRef.current) {
                supabase.removeChannel(awardsRevealChannelRef.current)
                awardsRevealChannelRef.current = null
            }
        }
    }, [state.karaokeSessionId, dispatch])
}

// Normalize the `mic_fx_overrides` jsonb (DB snake_case: { vocal_fx, autotune })
// into our camelCase MicFxOverride map. Tolerates null / malformed entries.
function normalizeMicFxOverrides(raw: unknown): Record<string, MicFxOverride> {
    const out: Record<string, MicFxOverride> = {}
    if (!raw || typeof raw !== 'object') return out
    for (const [key, v] of Object.entries(raw as Record<string, any>)) {
        if (!v || typeof v !== 'object') continue
        const entry: MicFxOverride = {}
        if (typeof v.vocal_fx === 'boolean') entry.vocalFx = v.vocal_fx
        if (typeof v.autotune === 'boolean') entry.autotune = v.autotune
        out[key] = entry
    }
    return out
}

// ---- Row mappers (DB snake_case -> typed objects) --------------------------
function mapAwardRow(r: any): import('../awards/types').Award {
    return {
        id: r.id,
        sessionId: r.sessionId ?? r.session_id,
        slug: r.slug ?? null,
        title: r.title,
        subjectType: r.subjectType ?? r.subject_type,
        iconId: r.iconId ?? r.icon_id ?? null,
        iconDataUrl: r.iconDataUrl ?? r.icon_data_url ?? null,
        isDefault: !!(r.isDefault ?? r.is_default),
        createdByGuestId: r.createdByGuestId ?? r.created_by_guest_id ?? null,
        finalizedAt: r.finalizedAt ?? r.finalized_at ?? null,
        createdAt: r.createdAt ?? r.created_at,
        updatedAt: r.updatedAt ?? r.updated_at,
        scoreAdjustments: r.scoreAdjustments ?? r.score_adjustments ?? {}
    }
}

function mapAwardResultRow(r: any): import('../awards/types').AwardResult {
    return {
        id: r.id,
        awardId: r.awardId ?? r.award_id,
        sessionId: r.sessionId ?? r.session_id,
        sessionCode: r.sessionCode ?? r.session_code,
        rank: r.rank ?? 1,
        winnerLabel: r.winnerLabel ?? r.winner_label,
        winnerSubtitle: r.winnerSubtitle ?? r.winner_subtitle ?? null,
        winnerAvatarUrl: r.winnerAvatarUrl ?? r.winner_avatar_url ?? null,
        winnerMeta: r.winnerMeta ?? r.winner_meta ?? null,
        voteCount: r.voteCount ?? r.vote_count ?? 0,
        createdAt: r.createdAt ?? r.created_at
    }
}
