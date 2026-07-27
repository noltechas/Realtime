import { useState, useRef, useEffect, Component, ErrorInfo, ReactNode } from 'react'
import { HashRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { ThemeProvider, StageThemeProvider, useTheme } from './context/ThemeContext'
import { useKaraokeSession } from './hooks/useKaraokeSession'
import { AudioSyncProvider } from './context/AudioSyncContext'
import { Icon, IconName } from './components/ui'
import SearchPage from './pages/SearchPage'
import KaraokePage from './pages/KaraokePage'
import QueuePage from './pages/QueuePage'
import AdminPage from './pages/AdminPage'
import ControlsPage from './pages/ControlsPage'
import SessionPage from './pages/SessionPage'
import './styles/globals.css'
import './styles/admin.css'
import './styles/karaoke.css'

function TitleBar() {
    const isStage = window.electronAPI?.isStageWindow ?? false
    const { state } = useApp()

    if (isStage) return null

    return (
        <div className="titlebar adm-titlebar">
            <span
                className="titlebar__brand"
                style={{ color: 'var(--adm-text-3)', fontFamily: 'var(--adm-mono)' }}
            >
                {state.karaokeSessionName || 'Realtime Karaoke'}
            </span>
        </div>
    )
}

const NAV_ITEMS: Array<{ to: string; end?: boolean; label: string; icon: IconName }> = [
    { to: '/', end: true, label: 'Songs', icon: 'music' },
    { to: '/queue', label: 'Queue', icon: 'grip' },
    { to: '/controls', label: 'Controls', icon: 'sliders' },
    { to: '/admin', label: 'Admin', icon: 'waveform' },
]

function TopNav() {
    const location = useLocation()
    // Theme context is used only as DATA here (which stage theme is active and
    // how to change it) — the nav's own appearance is fixed.
    const { name, setThemeName, themeList } = useTheme()
    const [themeOpen, setThemeOpen] = useState(false)
    const themeRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
                setThemeOpen(false)
            }
        }
        if (themeOpen) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [themeOpen])

    if (location.pathname === '/karaoke') return null

    const activeThemeName = themeList.find(t => t.key === name)?.displayName ?? name

    const handleStageClick = async () => {
        if (window.electronAPI) {
            await window.electronAPI.openStage()
        }
    }

    return (
        <nav className="adm-topnav">
            {/* Pages */}
            {NAV_ITEMS.map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `adm-navlink${isActive ? ' adm-navlink--active' : ''}`}
                >
                    <Icon name={item.icon} size={14} />
                    {item.label}
                </NavLink>
            ))}

            {/* Right cluster */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Stage theme picker — affects only the stage / companion look */}
                <div ref={themeRef} style={{ position: 'relative' }}>
                    <button className="adm-navlink" onClick={() => setThemeOpen(o => !o)} title="Stage theme (does not affect this console)">
                        <Icon name="palette" size={14} />
                        <span style={{ color: 'var(--adm-text-3)', fontWeight: 500 }}>Stage theme</span>
                        <span>{activeThemeName}</span>
                        <Icon name="chevronDown" size={12} />
                    </button>
                    {themeOpen && (
                        <div className="adm-pop" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 190, zIndex: 1000, padding: '5px 0' }}>
                            {themeList.map(t => (
                                <button
                                    key={t.key}
                                    className={`adm-pop__item${t.key === name ? ' adm-pop__item--active' : ''}`}
                                    onClick={() => { setThemeName(t.key); setThemeOpen(false) }}
                                >
                                    <span style={{ width: 14, display: 'inline-flex' }}>
                                        {t.key === name && <Icon name="check" size={12} />}
                                    </span>
                                    {t.displayName}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button className="adm-btn adm-btn--primary adm-btn--sm" onClick={handleStageClick}>
                    <Icon name="monitor" size={13} />
                    Stage
                </button>
            </div>
        </nav>
    )
}

class StageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    private recoveryTimer: ReturnType<typeof setTimeout> | null = null

    state = { hasError: false }

    static getDerivedStateFromError(): { hasError: boolean } {
        return { hasError: true }
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('[Stage] Render crash — auto-recovering in 2s:', error, info.componentStack)
    }

    componentDidUpdate(_: unknown, prevState: { hasError: boolean }): void {
        if (this.state.hasError && !prevState.hasError) {
            this.recoveryTimer = setTimeout(() => this.setState({ hasError: false }), 2000)
        }
    }

    componentWillUnmount(): void {
        if (this.recoveryTimer) clearTimeout(this.recoveryTimer)
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div style={{
                    width: '100vw', height: '100vh', background: '#050508',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'system-ui', fontSize: 16 }}>
                        Reloading stage...
                    </p>
                </div>
            )
        }
        return this.props.children
    }
}

function StageKaraokePage() {
    const { state } = useApp()
    const stageTheme = state.nowPlaying?.stageTheme
    return (
        <StageErrorBoundary>
            <StageThemeProvider themeName={stageTheme}>
                <KaraokePage />
            </StageThemeProvider>
        </StageErrorBoundary>
    )
}

function AppContent() {
    const location = useLocation()
    const isKaraoke = location.pathname === '/karaoke'
    const { state } = useApp()

    useKaraokeSession()

    // Show session landing page when no active session (main window only)
    if (!state.karaokeSessionId && !window.electronAPI?.isStageWindow) {
        return (
            <div className="main adm-root">
                <SessionPage />
            </div>
        )
    }

    return (
        <AudioSyncProvider>
            {!isKaraoke && <TopNav />}
            <div className={isKaraoke ? '' : 'main adm-root'}>
                <Routes>
                    <Route path="/" element={<SearchPage />} />
                    <Route path="/queue" element={<QueuePage />} />
                    <Route path="/controls" element={<ControlsPage />} />
                    <Route path="/karaoke" element={<StageKaraokePage />} />
                    <Route path="/admin" element={<AdminPage />} />
                </Routes>
            </div>
        </AudioSyncProvider>
    )
}

export default function App() {
    return (
        <AppProvider>
            <ThemeProvider>
                <Router>
                    <div className="app-shell">
                        <TitleBar />
                        <AppContent />
                    </div>
                </Router>
            </ThemeProvider>
        </AppProvider>
    )
}
