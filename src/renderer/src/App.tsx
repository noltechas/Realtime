import { HashRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { useKaraokeSession } from './hooks/useKaraokeSession'
import SearchPage from './pages/SearchPage'
import KaraokePage from './pages/KaraokePage'
import QueuePage from './pages/QueuePage'
import AdminPage from './pages/AdminPage'
import './styles/globals.css'
import './styles/karaoke.css'

function TitleBar() {
    const isStage = window.electronAPI?.isStageWindow ?? false
    // Main window uses native macOS traffic lights (titleBarStyle: hiddenInset); stage window uses custom
    return (
        <div className="titlebar">
            {isStage && (
                <div className="titlebar__traffic">
                    <button
                        className="titlebar__dot titlebar__dot--close"
                        onClick={() => window.electronAPI?.stageClose()}
                    />
                    <button
                        className="titlebar__dot titlebar__dot--min"
                        onClick={() => window.electronAPI?.stageMinimize()}
                    />
                    <button
                        className="titlebar__dot titlebar__dot--max"
                        onClick={() => window.electronAPI?.stageToggleFullscreen()}
                    />
                </div>
            )}
            {!isStage && <span className="titlebar__brand">Realtime Karaoke</span>}
        </div>
    )
}

function TopNav() {
    const location = useLocation()
    if (location.pathname === '/karaoke') return null

    const handleStageClick = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (window.electronAPI) {
            await window.electronAPI.openStage()
        }
    }

    return (
        <nav className="topnav">
            <NavLink to="/" className={({ isActive }) => `topnav__link ${isActive ? 'topnav__link--active' : ''}`} end>
                Songs
            </NavLink>
            <NavLink to="/queue" className={({ isActive }) => `topnav__link ${isActive ? 'topnav__link--active' : ''}`}>
                Queue
            </NavLink>
            <button onClick={handleStageClick} className="topnav__link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Stage
            </button>
            <NavLink to="/admin" className={({ isActive }) => `topnav__link ${isActive ? 'topnav__link--active' : ''}`}>
                Admin
            </NavLink>
        </nav>
    )
}

function AppContent() {
    const location = useLocation()
    const isKaraoke = location.pathname === '/karaoke'

    // Initialize karaoke session (runs in main window only, not stage)
    useKaraokeSession()

    return (
        <>
            {!isKaraoke && <TopNav />}
            <div className={isKaraoke ? '' : 'main'}>
                <Routes>
                    <Route path="/" element={<SearchPage />} />
                    <Route path="/queue" element={<QueuePage />} />
                    <Route path="/karaoke" element={<KaraokePage />} />
                    <Route path="/admin" element={<AdminPage />} />
                </Routes>
            </div>
        </>
    )
}

export default function App() {
    return (
        <AppProvider>
            <Router>
                <div className="app-shell">
                    <TitleBar />
                    <div className="mesh-bg" />
                    <AppContent />
                </div>
            </Router>
        </AppProvider>
    )
}
