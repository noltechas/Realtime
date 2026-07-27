import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAudioDevices } from '../hooks/useAudioDevices'
import { MetronomeScheduler, ScheduledRun } from '../audio/MetronomeScheduler'
import { Button, IconButton } from './ui'

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
        ? 'var(--adm-text-3)'
        : stdMs < 30 ? 'var(--adm-green)'
            : stdMs < 60 ? 'var(--adm-amber-bright)'
                : 'var(--adm-red)'

    const beatColor = (idx: number): string => {
        const tap = taps.find(t => t.beatIndex === idx)
        if (!tap) {
            const measuredActive = activeBeat - COUNT_IN_BEATS
            return idx === measuredActive ? 'var(--adm-amber)' : 'var(--adm-card-2)'
        }
        const a = Math.abs(tap.offsetMs)
        if (a < 30) return 'var(--adm-green)'
        if (a < 80) return 'var(--adm-amber-bright)'
        return 'var(--adm-red)'
    }

    const applyValue = (ms: number) => {
        const clamped = Math.max(0, Math.min(2000, Math.round(ms)))
        dispatch({ type: 'SET_VOCAL_OFFSET', payload: clamped })
    }

    const running = phase === 'count-in' || phase === 'measuring'
    const countInDisplay = activeBeat < 0 ? '' : ` ${COUNT_IN_BEATS - activeBeat}`

    return (
        <div className="adm-well" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div className="adm-label">Tap-along Calibration</div>
                <IconButton icon="x" size={26} aria-label="Close calibration" onClick={() => { stopRun(); onClose() }} />
            </div>

            <div style={{ fontSize: 12, color: 'var(--adm-text-2)' }}>
                Output:{' '}
                <span style={{ color: monitorId ? 'var(--adm-text)' : 'var(--adm-red)', fontWeight: 650 }}>
                    {monitorId ? monitorLabel : 'No Vocal Out device set'}
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="adm-label" style={{ width: 60 }}>Tempo</div>
                {TEMPO_OPTIONS.map(t => {
                    const selected = bpm === t
                    return (
                        <button
                            key={t}
                            onClick={() => setBpm(t)}
                            disabled={running}
                            className="adm-mono"
                            style={{
                                padding: '4px 12px', fontSize: 11.5, fontWeight: 600,
                                cursor: running ? 'default' : 'pointer',
                                borderRadius: 'var(--adm-r-sm)',
                                border: selected ? '1px solid var(--adm-amber)' : '1px solid var(--adm-line)',
                                background: selected ? 'var(--adm-amber-soft)' : 'var(--adm-card-2)',
                                color: selected ? 'var(--adm-amber-bright)' : 'var(--adm-text-2)',
                                opacity: running ? 0.5 : 1,
                                transition: 'all 0.14s ease',
                            }}
                        >
                            {t} BPM
                        </button>
                    )
                })}
            </div>

            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {Array.from({ length: MEASURED_BEATS }, (_, i) => (
                    <div
                        key={i}
                        style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            background: beatColor(i),
                            border: '1px solid rgba(0,0,0,0.4)',
                            boxShadow: '0 1px 0 rgba(255,255,255,0.07) inset',
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
                    borderRadius: 'var(--adm-r-sm)',
                    background: phase === 'measuring'
                        ? 'linear-gradient(180deg, var(--adm-amber-bright), var(--adm-amber))'
                        : 'var(--adm-card-2)',
                    border: phase === 'measuring' ? '1px solid var(--adm-amber)' : '1px solid var(--adm-line)',
                    boxShadow: phase === 'measuring' ? '0 0 24px -6px var(--adm-amber-glow)' : 'none',
                    cursor: phase === 'measuring' ? 'pointer' : 'default',
                    color: phase === 'measuring' ? '#191104' : 'var(--adm-text)',
                    fontFamily: 'var(--adm-display)',
                    fontWeight: 700,
                    letterSpacing: '0.6px',
                    userSelect: 'none',
                    minHeight: 22,
                    transition: 'all 0.15s ease',
                }}
            >
                {phase === 'idle' && (error ? error : 'Press Start, then tap Spacebar on each beat')}
                {phase === 'count-in' && `Get ready…${countInDisplay}`}
                {phase === 'measuring' && `TAP! (${taps.length}/${MEASURED_BEATS})`}
                {phase === 'done' && (stats.count > 0
                    ? `Measured: +${measuredMs}ms (±${stdMs}ms, ${stats.count} taps)`
                    : 'No valid taps')}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {(phase === 'idle' || phase === 'done') && (
                    <Button variant="primary" size="sm" onClick={startRun} disabled={!monitorId}>
                        {phase === 'done' ? 'Try Again' : 'Start'}
                    </Button>
                )}
                {running && (
                    <Button size="sm" onClick={stopRun}>Stop</Button>
                )}
                {phase === 'done' && stats.count > 0 && (
                    <>
                        <Button variant="live" size="sm" onClick={() => applyValue(stats.mean)}>
                            Apply ({measuredMs}ms)
                        </Button>
                        <Button size="sm" onClick={() => applyValue(state.vocalOffsetMs + stats.mean)}>
                            Add to current ({Math.max(0, Math.min(2000, Math.round(state.vocalOffsetMs + stats.mean)))}ms)
                        </Button>
                        <span className="adm-mono" style={{ fontSize: 10.5, fontWeight: 600, color: confidenceColor, letterSpacing: '0.5px' }}>
                            ±{stdMs}ms
                        </span>
                    </>
                )}
            </div>
        </div>
    )
}
