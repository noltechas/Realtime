import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'

interface RecentSession {
    id: string
    code: string
    name: string | null
    themeName: string | null
    createdAt: string
    guestCount: number
}

export default function SessionPage() {
    const { dispatch } = useApp()
    const theme = useTheme()

    const [sessionName, setSessionName] = useState('')
    const [selectedTheme, setSelectedTheme] = useState('neo-brutal')
    const [creating, setCreating] = useState(false)
    const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
    const [loadingSessions, setLoadingSessions] = useState(true)
    const [resumingId, setResumingId] = useState<string | null>(null)
    const [hoveredTheme, setHoveredTheme] = useState<string | null>(null)
    const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null)

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
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100%',
            padding: '40px 24px',
            background: theme.appBg,
        }}>
            <h1 style={{
                fontFamily: theme.fontDisplay,
                fontSize: 36,
                fontWeight: 800,
                color: theme.black,
                marginBottom: 8,
                letterSpacing: '-0.5px',
            }}>
                Realtime Karaoke
            </h1>
            <p style={{
                fontFamily: theme.fontBody,
                fontSize: 14,
                color: theme.muted,
                marginBottom: 40,
            }}>
                Create a new session or pick up where you left off
            </p>

            {/* Create New Session */}
            <div style={{
                ...theme.card,
                padding: '28px 32px',
                width: '100%',
                maxWidth: 540,
                marginBottom: 28,
                border: theme.border,
            }}>
                <h2 style={{
                    fontFamily: theme.fontDisplay,
                    fontSize: 16,
                    fontWeight: 700,
                    color: theme.black,
                    marginBottom: 18,
                    letterSpacing: '0.3px',
                }}>
                    New Session
                </h2>

                <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Friday Night Karaoke"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !creating) handleCreate() }}
                    style={{
                        ...theme.input,
                        width: '100%',
                        marginBottom: 16,
                        fontFamily: theme.fontBody,
                        fontSize: 14,
                        boxSizing: 'border-box',
                    }}
                />

                <label style={{
                    fontFamily: theme.fontDisplay,
                    fontSize: 11,
                    fontWeight: 600,
                    color: theme.muted,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 10,
                }}>
                    Starting Theme
                </label>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    marginBottom: 20,
                }}>
                    {theme.themeList.map((t) => {
                        const isSelected = selectedTheme === t.key
                        const isHovered = hoveredTheme === t.key
                        return (
                            <button
                                key={t.key}
                                onClick={() => setSelectedTheme(t.key)}
                                onMouseEnter={() => setHoveredTheme(t.key)}
                                onMouseLeave={() => setHoveredTheme(null)}
                                style={{
                                    fontFamily: theme.fontDisplay,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '8px 6px',
                                    borderRadius: theme.radiusSmall,
                                    cursor: 'pointer',
                                    border: isSelected ? `2px solid ${theme.accentA}` : theme.borderThin,
                                    background: isSelected ? theme.accentA : (isHovered ? theme.navLinkHoverBg : 'transparent'),
                                    color: isSelected ? '#1A1A1A' : theme.black,
                                    transition: 'all 0.15s',
                                    letterSpacing: '0.3px',
                                }}
                            >
                                {t.displayName}
                            </button>
                        )
                    })}
                </div>

                <button
                    onClick={handleCreate}
                    disabled={creating}
                    style={{
                        ...theme.btnPrimary,
                        width: '100%',
                        fontFamily: theme.fontDisplay,
                        fontSize: 14,
                        fontWeight: 700,
                        padding: '12px 0',
                        cursor: creating ? 'wait' : 'pointer',
                        opacity: creating ? 0.7 : 1,
                        letterSpacing: '0.5px',
                    }}
                >
                    {creating ? 'Creating...' : 'Start Session'}
                </button>
            </div>

            {/* Resume Previous Session */}
            {(loadingSessions || recentSessions.length > 0) && (
                <div style={{
                    width: '100%',
                    maxWidth: 540,
                }}>
                    <h2 style={{
                        fontFamily: theme.fontDisplay,
                        fontSize: 14,
                        fontWeight: 700,
                        color: theme.muted,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        marginBottom: 12,
                    }}>
                        Previous Sessions
                    </h2>

                    {loadingSessions ? (
                        <p style={{ fontFamily: theme.fontBody, fontSize: 13, color: theme.muted }}>
                            Loading...
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                            {recentSessions.map((s) => {
                                const isHovered = hoveredSessionId === s.id
                                const isResuming = resumingId === s.id
                                return (
                                    <div
                                        key={s.id}
                                        onMouseEnter={() => setHoveredSessionId(s.id)}
                                        onMouseLeave={() => setHoveredSessionId(null)}
                                        style={{
                                            ...theme.card,
                                            border: theme.borderThin,
                                            padding: '14px 18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.12s',
                                            ...(isHovered ? theme.cardHover : {}),
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontFamily: theme.fontDisplay,
                                                fontSize: 14,
                                                fontWeight: 700,
                                                color: theme.black,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {s.name || s.code}
                                            </div>
                                            <div style={{
                                                fontFamily: theme.fontBody,
                                                fontSize: 11,
                                                color: theme.muted,
                                                marginTop: 2,
                                            }}>
                                                {s.code} &middot; {formatDate(s.createdAt)} &middot; {s.guestCount} guest{s.guestCount !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleResume(s)}
                                            disabled={!!resumingId}
                                            style={{
                                                ...theme.btnSecondary,
                                                fontFamily: theme.fontDisplay,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: '6px 16px',
                                                cursor: resumingId ? 'wait' : 'pointer',
                                                opacity: isResuming ? 0.7 : 1,
                                                marginLeft: 12,
                                                flexShrink: 0,
                                                letterSpacing: '0.5px',
                                            }}
                                        >
                                            {isResuming ? 'Resuming...' : 'Resume'}
                                        </button>
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
