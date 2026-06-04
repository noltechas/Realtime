import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { getEngine } from '../audio/playback'
import { useAudioDevices, parseDeviceId } from './useAudioDevices'

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

    // True while the machine is asleep / screen is locked (from the main
    // process powerMonitor). Used to suppress auto-advance while the host is
    // away — see handleSongEnded.
    const idleRef = useRef(false)
    useEffect(() => {
        if (isStage) return
        const h = window.electronAPI?.onPowerIdle?.((idle: boolean) => {
            idleRef.current = idle
        })
        return () => {
            if (h) window.electronAPI?.offPowerIdle?.(h)
        }
    }, [isStage])

    // A song's audio reaching its end auto-advances the queue (which marks the
    // finished song 'played'). Suppress that when the host is away — system
    // asleep/locked or the window hidden — so an unattended sleep can't silently
    // consume the now-playing song. Just pause instead; the host advances
    // manually when they're back.
    const handleSongEnded = useCallback(() => {
        setPlaying(false)
        window.electronAPI?.sendPlaybackTime(0)
        if (idleRef.current || (typeof document !== 'undefined' && document.hidden)) return
        dispatch({ type: 'NEXT_SONG' })
    }, [dispatch])

    const np = state.nowPlaying
    const track = np?.track
    // Vocal monitor device is a session-wide preference: drive it from live
    // state.monitorDeviceIds (which the Controls page Vocal Out picker writes
    // to), not from np.monitorDeviceIds (which only captures a stale snapshot
    // taken when the queue item was first added). Without this, picking a
    // vocal out mid-session works for the current song but the next song
    // reverts to whatever device — if any — was selected at queue time.
    const monitorDeviceIdsStr = state.monitorDeviceIds.join(',')

    // Initialize from engine on mount (in case engine is already loaded)
    useEffect(() => {
        if (isStage) return
        const engine = getEngine()
        if (engine.isLoaded && np?.stemsPath?.instrumental) {
            engine.setVocalOffset(state.vocalOffsetMs)
            engine.setVolume(state.volume)
            engine.setVocalVolume(state.vocalVolume ?? 1.0)
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
                engine.setVolume(state.volume)
                engine.setVocalVolume(state.vocalVolume ?? 1.0)
                // Same song, but the Vocal Out picker may have changed —
                // re-route the existing vocal audio to the current sink.
                engine.setVocalSinkId(monitorDeviceIds[0] || '')
                setLoaded(true)
                setDuration(engine.durationMs || track?.duration_ms || 0)
                setPlaying(engine.isPlaying)
                setElapsed(engine.currentTimeMs)
            }
            engine.setOnTimeUpdate((timeMs) => {
                setElapsed(timeMs)
                window.electronAPI?.sendPlaybackTime(timeMs)
            })
            engine.setOnEnded(handleSongEnded)
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
            window.electronAPI?.sendPlaybackTime(0)
        })

        engine.load(stemsPath || {}, monitorDeviceIds).then(() => {
            engine.setVocalOffset(state.vocalOffsetMs)
            engine.setVolume(state.volume)
            engine.setVocalVolume(state.vocalVolume ?? 1.0)
            setDuration(engine.durationMs || track?.duration_ms || 0)
            setLoaded(true)
        }).catch(err => console.error('[AudioSync] Audio load failed:', err))
    }, [np?.stemsPath?.instrumental, np?.stemsPath?.vocals, monitorDeviceIdsStr, track?.duration_ms, state.vocalOffsetMs, dispatch])

    // Keep vocal offset in sync
    useEffect(() => {
        if (isStage) return
        getEngine().setVocalOffset(state.vocalOffsetMs)
    }, [state.vocalOffsetMs, isStage])

    // Apply the selected main (track) output device to the engine. load() only
    // routes the vocal monitor sink, so without this the restored/selected main
    // output wouldn't take effect on the instrumental track until the user
    // re-picked it. Empty string resets to the system default device.
    useEffect(() => {
        if (isStage) return
        getEngine().setMainSinkId(state.mainOutputId || '')
    }, [state.mainOutputId, isStage])

    // Prune persisted device selections that are no longer available, so the
    // app only auto-selects saved devices that are actually present this launch
    // ("if they're still available"). Clearing a selection also rewrites the
    // saved prefs, so we must NOT prune against a half-populated list: we gate
    // on labels being present, which only happens once media permission is
    // granted and the real, stable device ids are enumerated. Outputs and
    // inputs become ready independently, so each is pruned once via its own ref.
    const { inputs, outputs } = useAudioDevices()
    const outputsReady = outputs.some(o => !!o.label)
    const inputsReady = inputs.some(i => !!i.label)
    const prunedOutputsRef = useRef(false)
    const prunedInputsRef = useRef(false)
    useEffect(() => {
        if (isStage) return
        if (!prunedOutputsRef.current && outputsReady) {
            prunedOutputsRef.current = true
            const outIds = new Set(outputs.map(o => o.deviceId))
            if (state.mainOutputId && !outIds.has(state.mainOutputId)) {
                dispatch({ type: 'SET_MAIN_OUTPUT', payload: '' })
            }
            const availMonitors = state.monitorDeviceIds.filter(d => outIds.has(d))
            if (availMonitors.length !== state.monitorDeviceIds.length) {
                dispatch({ type: 'SET_MONITOR_DEVICES', payload: availMonitors })
            }
        }
        if (!prunedInputsRef.current && inputsReady) {
            prunedInputsRef.current = true
            // Match by real (hardware) device id so multi-channel `#ch=N` ids
            // survive the async channel-expansion step in useAudioDevices.
            const inRealIds = new Set(inputs.map(i => i.realDeviceId))
            state.micSlots.forEach((slot, i) => {
                if (!slot.micDeviceId) return
                const { realDeviceId } = parseDeviceId(slot.micDeviceId)
                if (!inRealIds.has(realDeviceId)) {
                    dispatch({ type: 'SET_MIC_SLOT', payload: { index: i, config: { micDeviceId: '' } } })
                }
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStage, outputsReady, inputsReady, dispatch])

    // When the vocal monitor device changes, restore the offset we last
    // measured/applied for that specific device. Depends only on the device
    // id so an update to the saved map (driven by SET_VOCAL_OFFSET) doesn't
    // re-fire this effect.
    const currentMonitorId = state.monitorDeviceIds[0] ?? ''
    useEffect(() => {
        if (isStage) return
        if (!currentMonitorId) return
        const saved = state.vocalOffsetByDevice[currentMonitorId]
        if (saved !== undefined && saved !== state.vocalOffsetMs) {
            dispatch({ type: 'SET_VOCAL_OFFSET', payload: saved })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMonitorId, isStage, dispatch])

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

    // Handle remote skip command from companion site
    useEffect(() => {
        if (isStage) return
        if (!state.remoteSkipCommand) return
        const engine = getEngine()
        engine.pause()
        setPlaying(false)
        dispatch({ type: 'SET_PLAYING', payload: false })
        dispatch({ type: 'NEXT_SONG' })
        window.electronAPI?.sendPlaybackTime(0)
        dispatch({ type: 'SET_REMOTE_SKIP_COMMAND', payload: false })
    }, [state.remoteSkipCommand, dispatch, isStage])

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
        window.electronAPI?.sendPlaybackTime(0)
    }, [dispatch])

    const handlePrev = useCallback(() => {
        const engine = getEngine()
        engine.pause()
        setPlaying(false)
        dispatch({ type: 'SET_PLAYING', payload: false })
        dispatch({ type: 'PREV_SONG' })
        window.electronAPI?.sendPlaybackTime(0)
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
