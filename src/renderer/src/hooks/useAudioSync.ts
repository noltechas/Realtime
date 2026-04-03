import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { getEngine } from '../audio/playback'

export interface AudioSyncState {
    elapsed: number
    duration: number
    loaded: boolean
    playing: boolean
    handlePlayPause: () => void
    handleSeek: (e: React.MouseEvent<HTMLDivElement>) => void
    handleRestart: () => void
    handleSkip: () => void
    handlePrev: () => void
    handleStart: () => void
}

export function useAudioSync(): AudioSyncState {
    const { state, dispatch } = useApp()
    const [elapsed, setElapsed] = useState(0)
    const [duration, setDuration] = useState(0)
    const [loaded, setLoaded] = useState(false)
    const [playing, setPlaying] = useState(false)
    const loadedPathRef = useRef<string | null>(null)
    const isStage = window.electronAPI?.isStageWindow ?? false

    const np = state.nowPlaying
    const track = np?.track
    const monitorDeviceIdsStr = (np?.monitorDeviceIds || []).join(',')

    // Initialize from engine on mount (in case engine is already loaded)
    useEffect(() => {
        if (isStage) return
        const engine = getEngine()
        if (engine.isLoaded && np?.stemsPath?.instrumental) {
            engine.setVocalOffset(state.vocalOffsetMs)
            loadedPathRef.current = np.stemsPath.instrumental
            setLoaded(true)
            setDuration(engine.durationMs || track?.duration_ms || 0)
            setPlaying(engine.isPlaying)
            setElapsed(engine.currentTimeMs)
        }
    }, [])

    // Load audio when stems change (main window only)
    useEffect(() => {
        if (isStage) return
        const stemsPath = np?.stemsPath
        const instrumentalPath = stemsPath?.instrumental
        const monitorDeviceIds = monitorDeviceIdsStr ? monitorDeviceIdsStr.split(',').filter(Boolean) : []

        if (!instrumentalPath) {
            getEngine().destroy()
            setLoaded(false)
            setElapsed(0)
            setDuration(0)
            setPlaying(false)
            loadedPathRef.current = null
            return
        }

        if (loadedPathRef.current === instrumentalPath) {
            const engine = getEngine()
            if (engine.isLoaded) {
                engine.setVocalOffset(state.vocalOffsetMs)
                setLoaded(true)
                setDuration(engine.durationMs || track?.duration_ms || 0)
                setPlaying(engine.isPlaying)
                setElapsed(engine.currentTimeMs)
            }
            engine.setOnTimeUpdate((timeMs) => {
                setElapsed(timeMs)
                window.electronAPI?.sendPlaybackTime(timeMs)
            })
            engine.setOnEnded(() => {
                setPlaying(false)
                dispatch({ type: 'NEXT_SONG' })
            })
            return
        }

        const engine = getEngine()
        engine.destroy()
        setLoaded(false)
        setElapsed(0)
        setPlaying(false)
        loadedPathRef.current = instrumentalPath

        engine.setOnTimeUpdate((timeMs) => {
            setElapsed(timeMs)
            window.electronAPI?.sendPlaybackTime(timeMs)
        })
        engine.setOnEnded(() => {
            setPlaying(false)
            dispatch({ type: 'NEXT_SONG' })
        })

        engine.load(stemsPath || {}, monitorDeviceIds).then(() => {
            engine.setVocalOffset(state.vocalOffsetMs)
            setDuration(engine.durationMs || track?.duration_ms || 0)
            setLoaded(true)
        }).catch(err => console.error('[AudioSync] Audio load failed:', err))
    }, [np?.stemsPath?.instrumental, np?.stemsPath?.vocals, monitorDeviceIdsStr, track?.duration_ms, state.vocalOffsetMs, dispatch])

    // Keep vocal offset in sync
    useEffect(() => {
        if (isStage) return
        getEngine().setVocalOffset(state.vocalOffsetMs)
    }, [state.vocalOffsetMs, isStage])

    // Handle remote play/pause commands from companion site
    useEffect(() => {
        if (isStage) return
        if (!state.remotePlayCommand) return
        const engine = getEngine()
        if (state.remotePlayCommand === 'play' && loaded && !playing) {
            engine.setVocalOffset(state.vocalOffsetMs)
            engine.play()
            setPlaying(true)
            dispatch({ type: 'SET_PLAYING', payload: true })
            dispatch({ type: 'SET_STAGE_MODE', payload: 'playing' })
        } else if (state.remotePlayCommand === 'pause' && playing) {
            engine.pause()
            setPlaying(false)
            dispatch({ type: 'SET_PLAYING', payload: false })
        }
        dispatch({ type: 'SET_REMOTE_PLAY_COMMAND', payload: null })
    }, [state.remotePlayCommand, loaded, playing, state.vocalOffsetMs, dispatch, isStage])

    // Don't detach callbacks on unmount -- this hook is always mounted
    // The engine callbacks persist across the app lifecycle

    const handlePlayPause = useCallback(() => {
        if (!loaded) return
        const engine = getEngine()
        engine.setVocalOffset(state.vocalOffsetMs)
        if (playing) {
            engine.pause()
            setPlaying(false)
            dispatch({ type: 'SET_PLAYING', payload: false })
        } else {
            engine.play()
            setPlaying(true)
            dispatch({ type: 'SET_PLAYING', payload: true })
        }
    }, [loaded, playing, state.vocalOffsetMs, dispatch])

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration) return
        const engine = getEngine()
        const r = e.currentTarget.getBoundingClientRect()
        const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
        const seekMs = ratio * duration
        engine.seek(seekMs)
        setElapsed(seekMs)
        window.electronAPI?.sendPlaybackSeek(seekMs)
    }, [duration])

    const handleRestart = useCallback(() => {
        const engine = getEngine()
        engine.setVocalOffset(state.vocalOffsetMs)
        engine.seek(0)
        setElapsed(0)
        window.electronAPI?.sendPlaybackSeek(0)
    }, [state.vocalOffsetMs])

    const handleSkip = useCallback(() => {
        const engine = getEngine()
        engine.pause()
        setPlaying(false)
        dispatch({ type: 'SET_PLAYING', payload: false })
        dispatch({ type: 'NEXT_SONG' })
    }, [dispatch])

    const handlePrev = useCallback(() => {
        const engine = getEngine()
        engine.pause()
        setPlaying(false)
        dispatch({ type: 'SET_PLAYING', payload: false })
        dispatch({ type: 'PREV_SONG' })
    }, [dispatch])

    const handleStart = useCallback(() => {
        dispatch({ type: 'SET_STAGE_MODE', payload: 'playing' })
        if (loaded) {
            const engine = getEngine()
            engine.setVocalOffset(state.vocalOffsetMs)
            engine.play()
            setPlaying(true)
            dispatch({ type: 'SET_PLAYING', payload: true })
        }
    }, [loaded, state.vocalOffsetMs, dispatch])

    return {
        elapsed,
        duration,
        loaded,
        playing,
        handlePlayPause,
        handleSeek,
        handleRestart,
        handleSkip,
        handlePrev,
        handleStart,
    }
}
