// TEMPORARY visual harness for Lobby Mode (deleted after verification).
// Stubs the stage window so LobbyStage's CSS injection + data-theme handling run
// in a plain browser, then renders one theme's join screen per ?theme= param.
const stub: any = {
    isStageWindow: true,
    sendStateAction: () => { },
    onStateAction: () => ({}),
    offStateAction: () => { },
    onInitState: () => ({}),
    offInitState: () => { },
    requestInitState: () => { },
    onInitStateRequest: () => ({}),
    offInitStateRequest: () => { },
    sendInitState: () => { },
    onStageNotice: () => ({}),
    offStageNotice: () => { },
    onPlaybackTime: () => ({}),
    offPlaybackTime: () => { },
    onPlaybackSeek: () => ({}),
    offPlaybackSeek: () => { },
}
;(window as any).electronAPI = stub

import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProvider, useApp } from './context/AppContext'
import { THEMES } from './context/ThemeContext'
import { LobbyStage, LobbyNoticeCard } from './pages/KaraokePage'
import './styles/globals.css'
import './styles/karaoke.css'

const params = new URLSearchParams(location.search)
const themeKey = params.get('theme') || 'neo-brutal'
const cycle = params.get('cycle') === '1'
const dwell = Number(params.get('dwell') || 0)
const withNotice = params.get('notice') !== '0'

// Fake QR: a deterministic checkerboard so layout/size issues are obvious.
const QR = (() => {
    let cells = ''
    for (let y = 0; y < 21; y++) {
        for (let x = 0; x < 21; x++) {
            if ((x * 7 + y * 13 + x * y) % 3 === 0) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`
        }
    }
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" shape-rendering="crispEdges"><rect width="21" height="21" fill="#fff"/><g fill="#000">${cells}</g></svg>`
    )
})()

const NOTICE = {
    id: 'demo',
    kind: 'queued' as const,
    title: 'Sicko Mode',
    artist: 'Travis Scott, Drake',
    artUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff3b6b"/><stop offset="1" stop-color="#2b1a5e"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/><circle cx="50" cy="50" r="16" fill="#111"/><circle cx="50" cy="50" r="4" fill="#eee"/></svg>'
    ),
    byName: 'Chas',
    byPicture: null,
    singers: [
        { name: 'Chas', color: '#00E676' },
        { name: 'Jordan', color: '#FF3B6B' },
    ],
}

function Harness() {
    const { state } = useApp()
    const theme = THEMES[themeKey] ?? THEMES['neo-brutal']

    // Exercise the real notice pipeline too: drop a song into the queue after
    // the warm-up window so LobbyNotices' queue diff has to catch it.
    return (
        <>
            <LobbyStage
                cycle={cycle}
                theme={theme}
                qrUrl={QR}
                sessionCode="PARTY"
                notices={false}
            />
            {withNotice && (
                <div style={{
                    position: 'fixed', left: 0, right: 0, bottom: 40, zIndex: 9998,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                    pointerEvents: 'none',
                }}>
                    <LobbyNoticeCard notice={NOTICE} theme={THEMES[state.themeName] ? theme : theme} guests={new Map()} />
                </div>
            )}
        </>
    )
}

if (dwell > 0) (window as any).__lobbyDwell = dwell

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AppProvider>
            <Harness />
        </AppProvider>
    </React.StrictMode>
)
