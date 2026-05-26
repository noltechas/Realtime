import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { useAudioDevices } from '../hooks/useAudioDevices'
import { MetronomeScheduler, ScheduledRun } from '../audio/MetronomeScheduler'

interface Props {
    onClose: () => void
}

const TEMPO_OPTIONS = [80, 100, 120] as const
const COUNT_IN_BEATS = 4
const MEASURED_BEATS = 16
const WARMUP_TAPS_TO_DROP = 2
const TAP_DEDUP_MS = 100

type Phase = 'idle' | 'count-in' | 'measuring' | 'done'

interface TapResult {
    beatIndex: number // index into measured beats (0..MEASURED_BEATS-1)
    offsetMs: number  // tap - beat; positive = late
}

export function VocalOffsetCalibrator({ onClose }: Props) {
    const { state, dispatch } = useApp()
    const theme = useTheme()
    const { outputs } = useAudioDevices()

    const [bpm, setBpm] = useState<number>(100)
    const [phase, setPhase] = useState<Phase>('idle')
    const [taps, setTaps] = useState<TapResult[]>([])
    const [activeBeat, setActiveBeat] = useState<number>(-1)
    const [error, setError] = useState<string | null>(null)

    const schedulerRef = useRef<MetronomeScheduler | null>(null)
    const runRef = useRef<ScheduledRun | null>(null)
    const tapsRef = useRef<TapResult[]>([])
    const lastTapAtRef = useRef<number>(0)
    const beatTimersRef = useRef<number[]>([])
    const finishTimerRef = useRef<number | null>(null)
    const deviceAtStartRef = useRef<string>('')
    const phaseRef = useRef<Phase>('idle')

    useEffect(() => { phaseRef.current = phase }, [phase])

    const monitorId = state.monitorDeviceIds[0] ?? ''
    const monitorLabel = useMemo(() => {
        if (!monitorId) return ''
        const dev = outputs.find(d => d.deviceId === monitorId)
        return dev?.label || `Device ${monitorId.slice(0, 6)}`
    }, [monitorId, outputs])

    const cancelRun = useCallback(() => {
        for (const t of beatTimersRef.current) window.clearTimeout(t)
        beatTimersRef.current = []
        if (finishTimerRef.current !== null) {
            window.clearTimeout(finishTimerRef.current)
            finishTimerRef.current = null
        }
        schedulerRef.current?.cancelAll()
    }, [])

    useEffect(() => {
        return () => {
            cancelRun()
            schedulerRef.current?.destroy()
            schedulerRef.current = null
        }
    }, [cancelRun])

    // Cancel an in-flight run if the user changes the vocal output device
    useEffect(() => {
        if ((phase === 'count-in' || phase === 'measuring') && monitorId !== deviceAtStartRef.current) {
            cancelRun()
            setPhase('idle')
            setActiveBeat(-1)
            setError('Vocal Out device changed — run cancelled.')
        }
    }, [monitorId, phase, cancelRun])

    const handleTap = useCallback(() => {
        if (phaseRef.current !== 'measuring') return
        const sched = schedulerRef.current
        const run = runRef.current
        if (!sched || !run) return
        const tapAt = sched.now()
        const nowMs = performance.now()
        if (nowMs - lastTapAtRef.current < TAP_DEDUP_MS) return
        lastTapAtRef.current = nowMs

        // Match to nearest measured beat (skip the count-in beats)
        let bestIdx = -1
        let bestAbs = Infinity
        const measuredStart = run.countInBeats
        for (let i = measuredStart; i < run.beatTimes.length; i++) {
            const d = Math.abs(tapAt - run.beatTimes[i])
            if (d < bestAbs) { bestAbs = d; bestIdx = i }
        }
        if (bestIdx < 0) return
        const offsetMs = (tapAt - run.beatTimes[bestIdx]) * 1000
        if (Math.abs(offsetMs) > run.beatIntervalMs / 2) return
        const measuredBeatIndex = bestIdx - measuredStart
        // Only keep the latest tap per beat (in case of rapid double-tap that
        // slipped past dedup)
        const next = tapsRef.current.filter(t => t.beatIndex !== measuredBeatIndex)
        next.push({ beatIndex: measuredBeatIndex, offsetMs })
        tapsRef.current = next
        setTaps(next.slice())
    }, [])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code !== 'Space') return
            const tag = (e.target as HTMLElement | null)?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
            if (phaseRef.current !== 'measuring') return
            e.preventDefault()
            handleTap()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [handleTap])

    const startRun = async () => {
        if (!monitorId) {
            setError('Pick a Vocal Out device first.')
            return
        }
        setError(null)
        cancelRun()
        tapsRef.current = []
        setTaps([])
        setActiveBeat(-1)

        if (!schedulerRef.current) schedulerRef.current = new MetronomeScheduler()
        const sched = schedulerRef.current
        try {
            await sched.prepare(monitorId)
        } catch {
            setError('Could not initialize metronome audio.')
            return
        }
        deviceAtStartRef.current = monitorId
        const run = sched.scheduleRun(bpm, COUNT_IN_BEATS, MEASURED_BEATS)
        runRef.current = run
        setPhase('count-in')

        const nowCtx = sched.now()
        for (let i = 0; i < run.beatTimes.length; i++) {
            const delayMs = Math.max(0, (run.beatTimes[i] - nowCtx) * 1000)
            const idx = i
            const t = window.setTimeout(() => {
                setActiveBeat(idx)
                if (idx === run.countInBeats) setPhase('measuring')
            }, delayMs)
            beatTimersRef.current.push(t)
        }
        const finishDelayMs = Math.max(
            0,
            (run.beatTimes[run.beatTimes.length - 1] - nowCtx) * 1000 + run.beatIntervalMs,
        )
        finishTimerRef.current = window.setTimeout(() => {
            setPhase('done')
            setActiveBeat(-1)
        }, finishDelayMs)
    }

    const stopRun = () => {
        cancelRun()
        setPhase('idle')
        setActiveBeat(-1)
    }

    const stats = useMemo(() => {
        const valid = taps.filter(t => t.beatIndex >= WARMUP_TAPS_TO_DROP)
        if (valid.length === 0) return { mean: 0, std: 0, count: 0 }
        const mean = valid.reduce((s, t) => s + t.offsetMs, 0) / valid.length
        const variance = valid.reduce((s, t) => s + (t.offsetMs - mean) ** 2, 0) / valid.length
        return { mean, std: Math.sqrt(variance), count: valid.length }
    }, [taps])

    const measuredMs = Math.round(stats.mean)
    const stdMs = Math.round(stats.std)
    const confidenceColor = stats.count === 0
        ? theme.faint
        : stdMs < 30 ? theme.mintGreen
            : stdMs < 60 ? theme.accentB
                : theme.hotRed

    const beatColor = (idx: number): string => {
        const tap = taps.find(t => t.beatIndex === idx)
        if (!tap) {
            const measuredActive = activeBeat - COUNT_IN_BEATS
            return idx === measuredActive ? theme.accentA : theme.creamDark
        }
        const a = Math.abs(tap.offsetMs)
        if (a < 30) return theme.mintGreen
        if (a < 80) return theme.accentB
        return theme.hotRed
    }

    const applyValue = (ms: number) => {
        const clamped = Math.max(0, Math.min(2000, Math.round(ms)))
        dispatch({ type: 'SET_VOCAL_OFFSET', payload: clamped })
    }

    const running = phase === 'count-in' || phase === 'measuring'
    const countInDisplay = activeBeat < 0 ? '' : ` ${COUNT_IN_BEATS - activeBeat}`

    return (
        <div style={{
            marginTop: 12,
            padding: 16,
            background: theme.creamDark,
            border: theme.borderLight,
            borderRadius: theme.radiusSmall,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: theme.black,
                    fontFamily: theme.fontDisplay,
                }}>
                    Tap-along Calibration
                </div>
                <button
                    onClick={() => { stopRun(); onClose() }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: theme.muted,
                        fontSize: 18,
                        cursor: 'pointer',
                        lineHeight: 1,
                        padding: '0 4px',
                    }}
                    aria-label="Close calibration"
                >×</button>
            </div>

            <div style={{ fontSize: 11, color: theme.muted, fontFamily: theme.fontBody }}>
                Output:{' '}
                <span style={{ color: monitorId ? theme.black : theme.hotRed, fontWeight: 700 }}>
                    {monitorId ? monitorLabel : 'No Vocal Out device set'}
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                    fontSize: 11,
                    fontFamily: theme.fontDisplay,
                    fontWeight: 700,
                    color: theme.muted,
                    width: 60,
                }}>Tempo</div>
                {TEMPO_OPTIONS.map(t => {
                    const selected = bpm === t
                    return (
                        <button
                            key={t}
                            onClick={() => setBpm(t)}
                            disabled={running}
                            style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                fontFamily: theme.fontDisplay,
                                fontWeight: 700,
                                cursor: running ? 'default' : 'pointer',
                                borderRadius: theme.radiusSmall,
                                border: selected ? `2px solid ${theme.black}` : theme.borderThin,
                                background: selected ? theme.accentA : theme.cream,
                                color: theme.black,
                                opacity: running ? 0.5 : 1,
                            }}
                        >
                            {t} BPM
                        </button>
                    )
                })}
            </div>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Array.from({ length: MEASURED_BEATS }, (_, i) => (
                    <div
                        key={i}
                        style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            background: beatColor(i),
                            border: theme.borderThin,
                            transition: 'background 0.1s',
                        }}
                    />
                ))}
            </div>

            <div
                role="button"
                onClick={handleTap}
                style={{
                    padding: 18,
                    textAlign: 'center',
                    background: phase === 'measuring' ? theme.accentA : theme.cream,
                    border: theme.border,
                    borderRadius: theme.radiusSmall,
                    cursor: phase === 'measuring' ? 'pointer' : 'default',
                    color: theme.black,
                    fontFamily: theme.fontDisplay,
                    fontWeight: 700,
                    letterSpacing: '1px',
                    userSelect: 'none',
                    minHeight: 22,
                }}
            >
                {phase === 'idle' && (error ? error : 'Press Start, then tap Spacebar on each beat')}
                {phase === 'count-in' && `Get ready...${countInDisplay}`}
                {phase === 'measuring' && `TAP! (${taps.length}/${MEASURED_BEATS})`}
                {phase === 'done' && (stats.count > 0
                    ? `Measured: +${measuredMs}ms (±${stdMs}ms, ${stats.count} taps)`
                    : 'No valid taps')}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {(phase === 'idle' || phase === 'done') && (
                    <button
                        onClick={startRun}
                        disabled={!monitorId}
                        style={{
                            ...theme.btnPrimary,
                            fontSize: 12,
                            padding: '8px 16px',
                            opacity: monitorId ? 1 : 0.5,
                            cursor: monitorId ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {phase === 'done' ? 'Try Again' : 'Start'}
                    </button>
                )}
                {running && (
                    <button
                        onClick={stopRun}
                        style={{ ...theme.btnOutline, fontSize: 12, padding: '8px 16px' }}
                    >
                        Stop
                    </button>
                )}
                {phase === 'done' && stats.count > 0 && (
                    <>
                        <button
                            onClick={() => applyValue(stats.mean)}
                            style={{
                                ...theme.btnPrimary,
                                fontSize: 12,
                                padding: '8px 16px',
                                background: theme.mintGreen,
                            }}
                        >
                            Apply ({measuredMs}ms)
                        </button>
                        <button
                            onClick={() => applyValue(state.vocalOffsetMs + stats.mean)}
                            style={{ ...theme.btnOutline, fontSize: 12, padding: '8px 16px' }}
                        >
                            Add to current ({Math.max(0, Math.min(2000, Math.round(state.vocalOffsetMs + stats.mean)))}ms)
                        </button>
                        <span style={{
                            fontSize: 10,
                            color: confidenceColor,
                            fontFamily: theme.fontDisplay,
                            fontWeight: 700,
                            letterSpacing: '1px',
                        }}>
                            ±{stdMs}ms
                        </span>
                    </>
                )}
            </div>
        </div>
    )
}
