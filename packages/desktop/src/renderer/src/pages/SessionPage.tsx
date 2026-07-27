import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { THEMES, THEME_LIST } from '../context/ThemeContext'
import { Button, Card, Field, Icon, Input, IconButton, Spinner } from '../components/ui'

interface RecentSession {
    id: string
    code: string
    name: string | null
    themeName: string | null
    createdAt: string
    guestCount: number
}

/** Small swatch previewing a stage theme's own palette (colors only — the
 *  console chrome around it never changes). */
function ThemeSwatch({ themeKey }: { themeKey: string }) {
    const t = THEMES[themeKey]
    if (!t) return null
    const bg = t.appBg === 'transparent' ? (t.creamDark || '#111') : t.appBg
    return (
        <span style={{
            width: 40, height: 26, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
            background: bg, border: '1px solid var(--adm-line-strong)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3,
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.accentA }} />
            <span style={{ width: 5, height: 11, borderRadius: 2, background: t.accentB }} />
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.hotRed || t.accentA }} />
        </span>
    )
}

export default function SessionPage() {
    const { dispatch } = useApp()

    const [sessionName, setSessionName] = useState('')
    const [selectedTheme, setSelectedTheme] = useState('neo-brutal')
    const [creating, setCreating] = useState(false)
    const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
    const [loadingSessions, setLoadingSessions] = useState(true)
    const [resumingId, setResumingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        window.electronAPI?.listRecentSessions().then((sessions) => {
            setRecentSessions(sessions)
            setLoadingSessions(false)
        }).catch(() => setLoadingSessions(false))
    }, [])

    const handleCreate = async () => {
        if (creating) return
        setCreating(true)
        try {
            const result = await window.electronAPI.createKaraokeSession(sessionName.trim(), selectedTheme)
            if (result.error || !result.sessionId) {
                console.error('Failed to create session:', result.error)
                setCreating(false)
                return
            }
            dispatch({
                type: 'SET_KARAOKE_SESSION',
                payload: {
                    sessionId: result.sessionId!,
                    sessionCode: result.sessionCode!,
                    sessionName: result.sessionName || null,
                    qrDataUrl: result.qrDataUrl!
                }
            })
            dispatch({ type: 'SET_THEME_NAME', payload: selectedTheme })
        } catch (e) {
            console.error('Session creation failed:', e)
            setCreating(false)
        }
    }

    const handleResume = async (session: RecentSession) => {
        if (resumingId) return
        setResumingId(session.id)
        try {
            const result = await window.electronAPI.resumeKaraokeSession(session.id)
            if (result.error || !result.sessionId) {
                console.error('Failed to resume session:', result.error)
                setResumingId(null)
                return
            }
            dispatch({
                type: 'SET_KARAOKE_SESSION',
                payload: {
                    sessionId: result.sessionId!,
                    sessionCode: result.sessionCode!,
                    sessionName: result.sessionName || null,
                    qrDataUrl: result.qrDataUrl!
                }
            })
            if (result.themeName) {
                dispatch({ type: 'SET_THEME_NAME', payload: result.themeName })
            }
        } catch (e) {
            console.error('Session resume failed:', e)
            setResumingId(null)
        }
    }

    const handleDelete = async (session: RecentSession) => {
        if (deletingId) return
        setDeletingId(session.id)
        try {
            await window.electronAPI.deleteSession(session.id)
            setRecentSessions(prev => prev.filter(s => s.id !== session.id))
        } catch (e) {
            console.error('Session delete failed:', e)
        }
        setDeletingId(null)
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        if (diffHours < 1) return 'Just now'
        if (diffHours < 24) return diffHours + 'h ago'
        const diffDays = Math.floor(diffHours / 24)
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return diffDays + 'd ago'
        return d.toLocaleDateString()
    }

    return (
        <div className="adm-page adm-page--narrow" style={{ paddingTop: 56 }}>
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14,
                }}>
                    <span className="adm-led adm-led--amber" />
                    <span className="adm-label" style={{ color: 'var(--adm-amber)' }}>Host Console</span>
                    <span className="adm-led adm-led--amber" />
                </div>
                <h1 className="adm-h1" style={{ fontSize: 44, letterSpacing: '-1.4px' }}>
                    Realtime Karaoke
                </h1>
                <p className="adm-sub" style={{ marginTop: 8 }}>
                    Spin up a new session or pick up where you left off
                </p>
            </div>

            {/* New Session */}
            <Card style={{ marginBottom: 28 }}>
                <div className="adm-label" style={{ marginBottom: 18 }}>New Session</div>

                <Field label="Session name" style={{ marginBottom: 22 }}>
                    <Input
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="Friday Night Karaoke"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !creating) handleCreate() }}
                        style={{ padding: '11px 14px', fontSize: 14.5 }}
                    />
                </Field>

                <Field label="Starting stage theme" hint="How the big screen and companion app look — the console you're using now always stays the same." style={{ marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 2 }}>
                        {THEME_LIST.map(item => {
                            const selected = selectedTheme === item.key
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => setSelectedTheme(item.key)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '9px 11px', cursor: 'pointer', textAlign: 'left',
                                        borderRadius: 'var(--adm-r-sm)',
                                        border: selected ? '1px solid var(--adm-amber)' : '1px solid var(--adm-line)',
                                        background: selected ? 'var(--adm-amber-soft)' : 'var(--adm-well)',
                                        boxShadow: selected ? '0 0 14px -4px var(--adm-amber-glow)' : 'var(--adm-well-shadow)',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <ThemeSwatch themeKey={item.key} />
                                    <span style={{
                                        flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600,
                                        color: selected ? 'var(--adm-amber-bright)' : 'var(--adm-text-2)',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {item.displayName}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </Field>

                <Button variant="primary" size="lg" style={{ width: '100%' }} onClick={handleCreate} disabled={creating}>
                    {creating ? 'Creating…' : 'Start Session'}
                </Button>
            </Card>

            {/* Previous Sessions */}
            {(loadingSessions || recentSessions.length > 0) && (
                <div>
                    <div className="adm-label" style={{ marginBottom: 12 }}>Previous Sessions</div>

                    {loadingSessions ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                            <Spinner />
                        </div>
                    ) : (
                        <div className="adm-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340 }}>
                            {recentSessions.map((s) => {
                                const isResuming = resumingId === s.id
                                return (
                                    <div key={s.id} className="adm-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                                        <div style={{
                                            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: 'var(--adm-card-2)', border: '1px solid var(--adm-line)',
                                            color: 'var(--adm-text-3)',
                                        }}>
                                            <Icon name="clock" size={15} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontFamily: 'var(--adm-display)', fontWeight: 650, fontSize: 14,
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {s.name || s.code}
                                            </div>
                                            <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)', marginTop: 2 }}>
                                                <span className="adm-mono" style={{ letterSpacing: 1 }}>{s.code}</span>
                                                {' · '}{formatDate(s.createdAt)}{' · '}{s.guestCount} guest{s.guestCount !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <Button size="sm" onClick={() => handleResume(s)} disabled={!!resumingId}>
                                            {isResuming ? 'Resuming…' : 'Resume'}
                                        </Button>
                                        <IconButton
                                            icon="trash" danger title="Delete session"
                                            onClick={() => handleDelete(s)}
                                            disabled={!!deletingId}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
