import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useTheme, THEMES } from '../context/ThemeContext'
import type { Theme } from '../styles/theme'

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
    const activeTheme = useTheme()

    const [sessionName, setSessionName] = useState('')
    const [selectedTheme, setSelectedTheme] = useState('neo-brutal')
    const [creating, setCreating] = useState(false)
    const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
    const [loadingSessions, setLoadingSessions] = useState(true)
    const [resumingId, setResumingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [hoveredTheme, setHoveredTheme] = useState<string | null>(null)
    const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null)
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)

    // Use the selected theme for the whole page
    const t: Theme = THEMES[selectedTheme] ?? THEMES['neo-brutal']

    // Preload all theme fonts so buttons render in their actual typeface
    useEffect(() => {
        const imports: string[] = []
        for (const theme of Object.values(THEMES)) {
            if (theme.globalCss) {
                const matches = theme.globalCss.match(/@import url\([^)]+\);?/g)
                if (matches) imports.push(...matches)
            }
        }
        if (imports.length === 0) return
        const style = document.createElement('style')
        style.id = 'session-page-fonts'
        style.textContent = imports.join('\n')
        document.head.appendChild(style)
        return () => { style.remove() }
    }, [])

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
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: '100%',
            padding: '48px 24px 60px',
            background: t.appBg,
            transition: 'background 0.3s',
        }}>
            <h1 style={{
                fontFamily: t.fontDisplay,
                fontSize: 40,
                fontWeight: 800,
                color: t.black,
                marginBottom: 6,
                letterSpacing: '-0.5px',
                transition: 'color 0.3s, font-family 0.3s',
            }}>
                Realtime Karaoke
            </h1>
            <p style={{
                fontFamily: t.fontBody,
                fontSize: 14,
                color: t.muted,
                marginBottom: 48,
                transition: 'color 0.3s',
            }}>
                Create a new session or pick up where you left off
            </p>

            {/* Create New Session */}
            <div style={{
                ...t.card,
                padding: '32px 36px',
                width: '100%',
                maxWidth: 560,
                marginBottom: 36,
                border: t.border,
                transition: 'all 0.3s',
            }}>
                <h2 style={{
                    fontFamily: t.fontDisplay,
                    fontSize: 18,
                    fontWeight: 700,
                    color: t.black,
                    marginBottom: 24,
                    letterSpacing: '0.3px',
                }}>
                    New Session
                </h2>

                <label style={{
                    fontFamily: t.fontDisplay,
                    fontSize: 11,
                    fontWeight: 600,
                    color: t.muted,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 8,
                }}>
                    Session Name
                </label>
                <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Friday Night Karaoke"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !creating) handleCreate() }}
                    style={{
                        ...t.input,
                        width: '100%',
                        padding: '12px 16px',
                        marginBottom: 28,
                        fontFamily: t.fontBody,
                        fontSize: 15,
                        boxSizing: 'border-box',
                        transition: 'all 0.3s',
                    }}
                />

                <label style={{
                    fontFamily: t.fontDisplay,
                    fontSize: 11,
                    fontWeight: 600,
                    color: t.muted,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 12,
                }}>
                    Starting Theme
                </label>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    marginBottom: 28,
                }}>
                    {activeTheme.themeList.map((item) => {
                        const preview = THEMES[item.key]
                        if (!preview) return null
                        const isSelected = selectedTheme === item.key
                        const isHovered = hoveredTheme === item.key
                        // Some themes use transparent appBg (e.g. Urban uses a CSS gradient).
                        // Fall back to their creamDark or a dark color for the button swatch.
                        const btnBg = preview.appBg === 'transparent' ? (preview.creamDark || '#111111') : preview.appBg
                        return (
                            <button
                                key={item.key}
                                onClick={() => setSelectedTheme(item.key)}
                                onMouseEnter={() => setHoveredTheme(item.key)}
                                onMouseLeave={() => setHoveredTheme(null)}
                                style={{
                                    fontFamily: preview.fontDisplay,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: '12px 8px',
                                    borderRadius: t.radiusSmall,
                                    cursor: 'pointer',
                                    border: isSelected
                                        ? `2.5px solid ${preview.accentA}`
                                        : `1.5px solid ${isHovered ? preview.accentA : preview.muted}40`,
                                    background: btnBg,
                                    color: preview.black,
                                    transition: 'all 0.2s',
                                    letterSpacing: '0.3px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transform: isSelected ? 'scale(1.03)' : (isHovered ? 'scale(1.01)' : 'scale(1)'),
                                    boxShadow: isSelected ? `0 0 12px ${preview.accentA}50` : 'none',
                                }}
                            >
                                <span style={{
                                    display: 'block',
                                    marginBottom: 6,
                                    fontSize: 16,
                                }}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: preview.accentA,
                                        marginRight: 4,
                                    }} />
                                    <span style={{
                                        display: 'inline-block',
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: preview.accentB,
                                        marginRight: 4,
                                    }} />
                                    <span style={{
                                        display: 'inline-block',
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: preview.hotRed || preview.accentA,
                                    }} />
                                </span>
                                {item.displayName}
                            </button>
                        )
                    })}
                </div>

                <button
                    onClick={handleCreate}
                    disabled={creating}
                    onMouseEnter={() => setHoveredBtn('create')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    style={{
                        width: '100%',
                        fontFamily: t.fontDisplay,
                        fontSize: 15,
                        fontWeight: 700,
                        padding: '14px 0',
                        cursor: creating ? 'wait' : 'pointer',
                        opacity: creating ? 0.7 : 1,
                        letterSpacing: '0.5px',
                        border: 'none',
                        borderRadius: t.radius,
                        background: t.accentA,
                        color: '#1A1A1A',
                        transition: 'all 0.2s',
                        transform: hoveredBtn === 'create' && !creating ? 'translateY(-1px)' : 'none',
                        boxShadow: hoveredBtn === 'create' && !creating ? `0 4px 14px ${t.accentA}40` : 'none',
                    }}
                >
                    {creating ? 'Creating...' : 'Start Session'}
                </button>
            </div>

            {/* Resume Previous Session */}
            {(loadingSessions || recentSessions.length > 0) && (
                <div style={{
                    width: '100%',
                    maxWidth: 560,
                }}>
                    <h2 style={{
                        fontFamily: t.fontDisplay,
                        fontSize: 13,
                        fontWeight: 700,
                        color: t.muted,
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        marginBottom: 14,
                        transition: 'color 0.3s',
                    }}>
                        Previous Sessions
                    </h2>

                    {loadingSessions ? (
                        <p style={{ fontFamily: t.fontBody, fontSize: 13, color: t.muted }}>
                            Loading...
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                            {recentSessions.map((s) => {
                                const isHovered = hoveredSessionId === s.id
                                const isResuming = resumingId === s.id
                                const isDeleting = deletingId === s.id
                                return (
                                    <div
                                        key={s.id}
                                        onMouseEnter={() => setHoveredSessionId(s.id)}
                                        onMouseLeave={() => setHoveredSessionId(null)}
                                        style={{
                                            ...t.card,
                                            border: t.borderThin,
                                            padding: '14px 18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            transition: 'all 0.15s',
                                            ...(isHovered ? t.cardHover : {}),
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontFamily: t.fontDisplay,
                                                fontSize: 14,
                                                fontWeight: 700,
                                                color: t.black,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {s.name || s.code}
                                            </div>
                                            <div style={{
                                                fontFamily: t.fontBody,
                                                fontSize: 11,
                                                color: t.muted,
                                                marginTop: 3,
                                            }}>
                                                {s.code} &middot; {formatDate(s.createdAt)} &middot; {s.guestCount} guest{s.guestCount !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleResume(s)}
                                            disabled={!!resumingId}
                                            style={{
                                                ...t.btnSecondary,
                                                fontFamily: t.fontDisplay,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: '7px 18px',
                                                cursor: resumingId ? 'wait' : 'pointer',
                                                opacity: isResuming ? 0.7 : 1,
                                                flexShrink: 0,
                                                letterSpacing: '0.5px',
                                            }}
                                        >
                                            {isResuming ? 'Resuming...' : 'Resume'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(s)}
                                            disabled={!!deletingId}
                                            title="Delete session"
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: deletingId ? 'wait' : 'pointer',
                                                padding: '6px',
                                                borderRadius: t.radiusSmall,
                                                color: isDeleting ? t.muted : (isHovered ? t.hotRed : t.muted),
                                                opacity: isDeleting ? 0.5 : 0.6,
                                                transition: 'all 0.15s',
                                                flexShrink: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6' }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
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
