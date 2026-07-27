import { useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { Button, Card, Chip, Icon, Led, Toggle } from './ui'

/**
 * Lobby Mode host controls.
 *
 * Lobby Mode is the "everyone pile in" stretch at the start of the night: the
 * stage holds its themed join screen (QR + session code) no matter what's in
 * the queue, and nothing is pulled out of the queue onto the deck. Guests stack
 * up songs and vote; ending the lobby hands the top song to the stage and the
 * night runs as normal.
 *
 * `LobbyModeCard` is the full control (Admin). `LobbyModeBanner` is the compact
 * status strip other host pages show so an empty deck never looks like a bug.
 */

/**
 * Flip Lobby Mode, keeping the companion queue honest.
 *
 * Turning it on hands a waiting (loaded-but-not-started) song back to the local
 * queue — see the SET_LOBBY_MODE reducer. That song's karaoke_queue row was
 * already retired to 'played' when it went on deck, so the companion and mobile
 * queues would silently lose it; we insert a fresh row (addedBy and all) and
 * stamp the new id back onto the item so it re-syncs from here on.
 */
function useLobbyToggle() {
    const { state, dispatch } = useApp()
    return useCallback((on: boolean) => {
        const returned = on && state.nowPlaying && !state.isPlaying ? state.nowPlaying : null
        dispatch({ type: 'SET_LOBBY_MODE', payload: on })

        if (!returned || !state.karaokeSessionId || !window.electronAPI?.pushLocalQueueItem) return
        const track = returned.track
        window.electronAPI.pushLocalQueueItem({
            trackId: track.id,
            trackName: track.name,
            trackArtist: track.artists.map(a => a.name).join(', '),
            trackArtUrl: track.album.images[0]?.url || null,
            trackDurationMs: track.duration_ms,
            addedByName: returned.addedBy ?? null,
            stageTheme: returned.stageTheme ?? null,
            isHidden: !!returned.isHidden,
            singerConfigs: returned.singers.map(s => {
                const cfg: Record<string, unknown> = { color: s.color, colorGlow: s.colorGlow, roleIndices: s.roleIndices }
                if (s.guestId) cfg.guestId = s.guestId
                else cfg.name = s.name
                return cfg
            }),
        }).then(result => {
            if (result && result.id) {
                dispatch({ type: 'SET_QUEUE_ITEM_REMOTE_ID', payload: { itemId: returned.id, remoteQueueId: result.id } })
            }
        }).catch(err => console.error('Failed to re-queue the on-deck song in Supabase:', err))
    }, [state.nowPlaying, state.isPlaying, state.karaokeSessionId, dispatch])
}

export function LobbyModeCard() {
    const { state, dispatch } = useApp()
    const setLobby = useLobbyToggle()
    const on = state.lobbyMode
    const queued = state.queue.length

    return (
        <Card
            style={{
                marginBottom: 18,
                position: 'relative',
                overflow: 'hidden',
                borderColor: on ? 'rgba(62,207,142,0.42)' : undefined,
                boxShadow: on
                    ? 'var(--adm-card-shadow), 0 0 34px -12px rgba(62,207,142,0.4)'
                    : undefined,
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
        >
            {/* Cool sweep while collecting, so an active lobby reads at a glance
                against the console's amber default. */}
            {on && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        background: 'radial-gradient(520px 150px at 6% 0%, rgba(62,207,142,0.12), transparent 72%)',
                    }}
                />
            )}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, position: 'relative' }}>
                <span
                    style={{
                        width: 38, height: 38, borderRadius: 'var(--adm-r-sm)', flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: on ? 'var(--adm-green-soft)' : 'var(--adm-well)',
                        border: `1px solid ${on ? 'rgba(62,207,142,0.4)' : 'var(--adm-line)'}`,
                        boxShadow: 'var(--adm-well-shadow)',
                        color: on ? 'var(--adm-green)' : 'var(--adm-text-3)',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <Icon name="qr" size={19} />
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <Led state={on ? 'on' : 'off'} />
                        <span className="adm-label" style={{ color: on ? 'var(--adm-green)' : 'var(--adm-text-3)' }}>
                            {on ? 'Collecting songs' : 'Lobby mode off'}
                        </span>
                        {on && queued > 0 && (
                            <Chip tone="green" style={{ fontSize: 10.5 }}>
                                {queued} queued
                            </Chip>
                        )}
                    </div>
                    <h2 className="adm-h1" style={{ fontSize: 19, marginBottom: 4 }}>Lobby Mode</h2>
                    <div className="adm-sub" style={{ maxWidth: 620 }}>
                        {on
                            ? 'The stage is holding the join screen. Nothing goes on deck — every song stays in the queue collecting votes until you start the show.'
                            : 'Hold the stage on the join screen so the room can scan in and stack up songs. Nothing goes on deck while it\'s on.'}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, paddingTop: 4 }}>
                    {on && (
                        <Button
                            variant="primary"
                            icon="play"
                            onClick={() => setLobby(false)}
                            title="End the lobby and put the top song on deck"
                        >
                            Start the Show
                        </Button>
                    )}
                    <Toggle
                        on={on}
                        onToggle={() => setLobby(!on)}
                        title={on ? 'Turn Lobby Mode off' : 'Turn Lobby Mode on'}
                    />
                </div>
            </div>

            {/* Sub-settings — only meaningful while the lobby is up. */}
            {on && (
                <div
                    className="adm-well"
                    style={{
                        marginTop: 16, padding: '13px 16px', position: 'relative',
                        display: 'flex', alignItems: 'center', gap: 14,
                    }}
                >
                    <span style={{ color: 'var(--adm-text-3)', flexShrink: 0 }}>
                        <Icon name="palette" size={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 13.5 }}>
                            Cycle the join screens
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--adm-text-2)', marginTop: 2 }}>
                            Crossfade to a random theme's join screen every 20 seconds
                        </div>
                    </div>
                    <Toggle
                        on={state.lobbyCycleThemes}
                        onToggle={() => dispatch({ type: 'SET_LOBBY_CYCLE_THEMES', payload: !state.lobbyCycleThemes })}
                        title={state.lobbyCycleThemes ? 'Stay on the session theme' : 'Cycle through every theme'}
                    />
                </div>
            )}
        </Card>
    )
}

export function LobbyModeBanner({ style }: { style?: React.CSSProperties }) {
    const { state } = useApp()
    const setLobby = useLobbyToggle()
    if (!state.lobbyMode) return null

    return (
        <div
            className="adm-card"
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 15px', marginBottom: 18,
                borderColor: 'rgba(62,207,142,0.4)',
                boxShadow: 'var(--adm-card-shadow), 0 0 26px -12px rgba(62,207,142,0.4)',
                ...style,
            }}
        >
            <Led state="on" />
            <span className="adm-label" style={{ color: 'var(--adm-green)', flexShrink: 0 }}>
                Lobby mode
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--adm-text-2)' }}>
                The stage is holding the join screen — nothing goes on deck while the room stacks up songs.
            </span>
            <Button
                size="sm"
                icon="play"
                onClick={() => setLobby(false)}
                title="End the lobby and put the top song on deck"
            >
                Start the Show
            </Button>
        </div>
    )
}
