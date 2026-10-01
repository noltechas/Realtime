import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { Button, Card, CardHeader, Icon, IconButton, Meter, Toggle } from './ui'

// "Hear it as the artist": recorded performances (stage → main/performances.ts)
// and their voice-converted replays.

export function ArtistReplaysCard() {
    const { state, dispatch } = useApp()
    const [list, setList] = useState<PerformanceSummary[]>([])
    const [available, setAvailable] = useState<{ ok: boolean; reason?: string }>({ ok: true })
    const [playingId, setPlayingId] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        const api = window.electronAPI
        if (!api?.perfList) return
        api.perfList().then(r => { setList(r.performances); setAvailable({ ok: r.available, reason: r.reason }) }).catch(() => { })
        const h = api.onPerfUpdate(setList)
        return () => {
            api.offPerfUpdate(h)
            audioRef.current?.pause()
        }
    }, [])

    const play = async (p: PerformanceSummary) => {
        audioRef.current?.pause()
        if (playingId === p.id || !p.replay.file) { setPlayingId(null); return }
        const a = new Audio('file://' + p.replay.file.split('/').map(encodeURIComponent).join('/'))
        const sinkable = a as unknown as { setSinkId?: (id: string) => Promise<void> }
        if (state.mainOutputId && sinkable.setSinkId) await sinkable.setSinkId(state.mainOutputId).catch(() => { })
        a.onended = () => setPlayingId(null)
        audioRef.current = a
        setPlayingId(p.id)
        a.play().catch(() => setPlayingId(null))
    }

    return (
        <Card style={{ marginTop: 18 }}>
            <CardHeader
                icon="spark"
                label="Replays"
                title="Hear It As the Artist"
                desc="After a song, hear the guest's performance sung back in the original artist's voice"
            />
            <div className="adm-well" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Record performances</div>
                    <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', marginTop: 2 }}>
                        Saves each singer's plain mic during songs, on this Mac only (newest 15 kept).
                    </div>
                </div>
                <Toggle
                    on={state.recordPerformances}
                    onToggle={() => dispatch({ type: 'SET_RECORD_PERFORMANCES', payload: !state.recordPerformances })}
                    title="Record performances for artist replays"
                />
            </div>
            {!available.ok && (
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--adm-amber-bright)', marginBottom: 12 }}>
                    <Icon name="lock" size={14} style={{ marginTop: 1 }} /> {available.reason}
                </div>
            )}
            {list.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--adm-text-3)' }}>
                    {state.recordPerformances ? 'No performances yet. They show up here after each song.' : 'Turn on recording to make replays.'}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {list.map(p => {
                        const r = p.replay
                        const busy = r.status === 'queued' || r.status === 'converting'
                        return (
                            <div key={p.id} className="adm-row" style={{ background: 'var(--adm-well)', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 160 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.songName}</div>
                                    <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)' }}>
                                        {p.singers.join(', ')} · {new Date(p.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                    </div>
                                    {busy && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                            <Meter value={(r.pct ?? 0) / 100} progress />
                                            <span className="adm-mono" style={{ fontSize: 10.5, color: 'var(--adm-text-3)' }}>
                                                {r.status === 'queued' ? 'queued' : `${r.pct ?? 0}%`}
                                            </span>
                                        </div>
                                    )}
                                    {r.status === 'failed' && <div style={{ fontSize: 11.5, color: 'var(--adm-red)', marginTop: 4 }}>{r.error}</div>}
                                </div>
                                {r.status === 'ready' ? (
                                    <Button size="sm" variant={playingId === p.id ? 'secondary' : 'primary'} icon={playingId === p.id ? 'pause' : 'play'} onClick={() => play(p)}>
                                        {playingId === p.id ? 'Stop' : 'Play'}
                                    </Button>
                                ) : !busy && (
                                    <Button size="sm" variant="primary" icon="spark" disabled={!available.ok} onClick={() => window.electronAPI.perfReplay(p.id)}>
                                        {r.status === 'failed' ? 'Try again' : 'Make replay'}
                                    </Button>
                                )}
                                <IconButton icon="trash" size={26} danger title="Delete performance" disabled={r.status === 'converting'} onClick={() => window.electronAPI.perfDelete(p.id)} />
                            </div>
                        )
                    })}
                </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--adm-text-3)', marginTop: 12, lineHeight: 1.45 }}>
                Replays are AI voice conversion (Seed-VC) of a real artist's voice. They're just for fun here; please don't post them. A replay takes a few minutes per song.
            </div>
        </Card>
    )
}
