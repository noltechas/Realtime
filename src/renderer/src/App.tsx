import { useState, useRef, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { useKaraokeSession } from './hooks/useKaraokeSession'
import { AudioSyncProvider } from './context/AudioSyncContext'
import SearchPage from './pages/SearchPage'
import KaraokePage from './pages/KaraokePage'
import QueuePage from './pages/QueuePage'
import AdminPage from './pages/AdminPage'
import ControlsPage from './pages/ControlsPage'
import './styles/globals.css'
import './styles/karaoke.css'

function TitleBar() {
    const isStage = window.electronAPI?.isStageWindow ?? false
    const { titlebarBg, titlebarText, fontDisplay } = useTheme()

    if (isStage) return null

    return (
        <div className="titlebar" style={{ background: titlebarBg }}>
            {!isStage && (
                <span className="titlebar__brand" style={{ color: titlebarText, fontFamily: fontDisplay }}>
                    Realtime Karaoke
                </span>
            )}
        </div>
    )
}

function TopNav() {
    const location = useLocation()
    const { navBg, navBorderBottom, navLink, navLinkActive, navLinkHoverBg, fontDisplay, name, setThemeName, themeList, border, card, radius } = useTheme()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [dropdownOpen])

    if (location.pathname === '/karaoke') return null

    const handleStageClick = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (window.electronAPI) {
            await window.electronAPI.openStage()
        }
    }

    const linkBase: React.CSSProperties = {
        fontFamily: fontDisplay,
        fontWeight: 600,
        fontSize: 13,
        color: navLink,
        textDecoration: 'none',
        padding: '6px 14px',
        borderRadius: radius,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        transition: 'background 0.1s, color 0.1s',
        letterSpacing: '0.3px',
    }

    return (
        <nav className="topnav" style={{ background: navBg, borderBottom: navBorderBottom }}>
            <NavLink
                to="/"
                end
                style={({ isActive }) => ({ ...linkBase, color: isActive ? navLinkActive : navLink })}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = navLinkHoverBg }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
                Songs
            </NavLink>
            <NavLink
                to="/queue"
                style={({ isActive }) => ({ ...linkBase, color: isActive ? navLinkActive : navLink })}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = navLinkHoverBg }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
                Queue
            </NavLink>
            <NavLink
                to="/controls"
                style={({ isActive }) => ({ ...linkBase, color: isActive ? navLinkActive : navLink })}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = navLinkHoverBg }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
                Controls
            </NavLink>
            <button
                onClick={handleStageClick}
                style={linkBase}
                onMouseEnter={e => { e.currentTarget.style.background = navLinkHoverBg }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
                Stage
            </button>
            <NavLink
                to="/admin"
                style={({ isActive }) => ({ ...linkBase, color: isActive ? navLinkActive : navLink })}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = navLinkHoverBg }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
                Admin
            </NavLink>

            {/* Theme dropdown */}
            <div ref={dropdownRef} style={{ marginLeft: 'auto', position: 'relative' }}>
                <button
                    onClick={() => setDropdownOpen(o => !o)}
                    style={{
                        fontFamily: fontDisplay,
                        fontWeight: 700,
                        fontSize: 10,
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        padding: '5px 12px',
                        borderRadius: radius,
                        cursor: 'pointer',
                        background: 'none',
                        color: navLink,
                        border,
                        transition: 'all 0.1s',
                    }}
                >
                    Change Theme
                </button>
                {dropdownOpen && (
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        minWidth: 160,
                        ...card,
                        padding: '4px 0',
                        zIndex: 1000,
                        border,
                    }}>
                        {themeList.map(t => (
                            <button
                                key={t.key}
                                onClick={() => { setThemeName(t.key); setDropdownOpen(false) }}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    fontFamily: fontDisplay,
                                    fontWeight: 600,
                                    fontSize: 12,
                                    letterSpacing: '0.5px',
                                    padding: '8px 16px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: navLink,
                                    cursor: 'pointer',
                                    transition: 'background 0.1s, color 0.1s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = navLinkHoverBg
                                    e.currentTarget.style.color = navLinkActive
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent'
                                    e.currentTarget.style.color = navLink
                                }}
                            >
                                {t.displayName}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </nav>
    )
}

function AppContent() {
    const location = useLocation()
    const isKaraoke = location.pathname === '/karaoke'
    const { appBg } = useTheme()

    useKaraokeSession()

    return (
        <AudioSyncProvider>
            {!isKaraoke && <TopNav />}
            <div
                className={isKaraoke ? '' : 'main'}
                style={isKaraoke ? {} : { background: appBg }}
            >
                <Routes>
                    <Route path="/" element={<SearchPage />} />
                    <Route path="/queue" element={<QueuePage />} />
                    <Route path="/controls" element={<ControlsPage />} />
                    <Route path="/karaoke" element={<KaraokePage />} />
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
