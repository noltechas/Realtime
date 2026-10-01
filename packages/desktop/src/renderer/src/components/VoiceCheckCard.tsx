import { useEffect, useRef, useState } from 'react'
import { Button, Card, CardHeader, Icon, IconButton, Input, Meter, Select, Spinner } from './ui'
import type { AudioInputDevice } from '../hooks/useAudioDevices'
import { parseDeviceId } from '../hooks/useAudioDevices'
import { useVoiceProfiles } from '../hooks/useVoiceMatch'
import { noteName } from '../audio/voiceMatch'
import { createCaptureNode } from '../audio/captureWorklet'
import {
    PitchTracker, VOICE_CHECK_SECONDS, VOICE_CHECK_STEPS, detectPitch, hzToMidi, stepAt,
    type VoiceCheckResult, type VoiceCheckUpdate,
} from '../audio/voiceCheckScript'

// Voice check: a singer follows a guided ~30 s script (audio/voiceCheckScript.ts)
// into a karaoke mic while the stage shows them exactly what to sing
// (VoiceCheckStage.tsx, fed live pitch from here). The take is measured (range,
// pitch steadiness, tone, level) and saved under their name, so the stage can
// tune their mic to each song's part (audio/voiceMatch.ts).

const COUNTDOWN_SECONDS = 3
// Done early is allowed once the range steps (hold + both slides) are in.
const MIN_SECONDS = VOICE_CHECK_STEPS.slice(0, 3).reduce((n, s) => n + s.seconds, 0)
const RESULT_SHOWN_MS = 8000
const ERROR_SHOWN_MS = 6000

type Phase = 'idle' | 'countdown' | 'recording' | 'analyzing' | 'done' | 'error'

interface Live {
    elapsed: number
    level: number
    midi: number | null
    lowMidi: number | null
    highMidi: number | null
}

const NO_LIVE: Live = { elapsed: 0, level: 0, midi: null, lowMidi: null, highMidi: null }

// Raw mic capture, same constraints as VoiceEffectsEngine (no browser
// processing), one channel of a multi-channel interface when selected.
async function openMic(deviceId: string) {
    const { realDeviceId, channelIndex } = parseDeviceId(deviceId)
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            deviceId: { exact: realDeviceId },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            ...(channelIndex !== undefined ? { channelCount: { ideal: 2 } } : {}),
        },
    })
    return { stream, channelIndex }
}

function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
    const buf = new ArrayBuffer(44 + samples.length * 2)
    const v = new DataView(buf)
    const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
    str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE')
    str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
    v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
    str(36, 'data'); v.setUint32(40, samples.length * 2, true)
    for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true)
    return new Uint8Array(buf)
}

function summarize(m: VoiceMeasurements): VoiceCheckResult {
    const mad = m.tuning?.madCents
    const s = m.spectrum
    const air = s && s.length === 6 ? (s[4] + s[5]) / 2 : null
    return {
        lowMidi: m.range?.lowMidi ?? null,
        highMidi: m.range?.highMidi ?? null,
        pitch: typeof mad !== 'number' ? null : mad <= 10 ? 'very-steady' : mad <= 18 ? 'steady' : mad <= 26 ? 'some-wander' : 'wanders',
        tone: air == null ? null : air > -14 ? 'bright' : air < -24 ? 'warm' : 'balanced',
    }
}

const PITCH_TEXT = { 'very-steady': 'very steady pitch', steady: 'steady pitch', 'some-wander': 'some pitch wander', wanders: 'pitch wanders, autotune will help more' }
const TONE_TEXT = { bright: 'bright tone', warm: 'warm, dark tone', balanced: 'balanced tone' }

function describe(m: VoiceMeasurements): string[] {
    const r = summarize(m)
    const out: string[] = []
    if (r.lowMidi != null && r.highMidi != null) out.push(`comfortable range ${noteName(r.lowMidi)} to ${noteName(r.highMidi)}`)
    if (r.pitch) out.push(PITCH_TEXT[r.pitch])
    if (r.tone) out.push(TONE_TEXT[r.tone])
    return out
}

// Streams the guide's state to the stage window (main relays it).
function stage(u: Partial<VoiceCheckUpdate> & Pick<VoiceCheckUpdate, 'phase' | 'name'>): void {
    window.electronAPI?.sendVoiceCheck?.({
        elapsed: 0, level: 0, midi: null, lowMidi: null, highMidi: null, wobbleCents: null, ...u,
    })
}

export function VoiceCheckCard({ guests, mics, defaultMicId }: {
    guests: { id: string; name: string }[]
    mics: AudioInputDevice[]
    defaultMicId: string
}) {
    const profiles = useVoiceProfiles()
    const [name, setName] = useState('')
    const [micId, setMicId] = useState(defaultMicId)
    const [phase, setPhase] = useState<Phase>('idle')
    const [live, setLive] = useState<Live>(NO_LIVE)
    const [message, setMessage] = useState('')
    // Live take controls: cancel discards it, done keeps it (>= MIN_SECONDS).
    const cancelRef = useRef<(() => void) | null>(null)
    const doneRef = useRef<(() => void) | null>(null)
    // Pending "close the stage guide" after a result/error; a new check cancels it.
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => { if (!micId && defaultMicId) setMicId(defaultMicId) }, [defaultMicId, micId])
    useEffect(() => () => {
        cancelRef.current?.()
        if (closeTimer.current) { clearTimeout(closeTimer.current); stage({ phase: 'closed', name: '' }) }
    }, [])

    const guestId = guests.find(g => g.name.trim().toLowerCase() === name.trim().toLowerCase())?.id ?? null

    const start = async () => {
        const who = guests.find(g => g.id === guestId)?.name ?? name.trim()
        if (!who || !micId) return
        setMessage('')
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
        let mic
        try {
            mic = await openMic(micId)
        } catch (e: any) {
            setPhase('error')
            setMessage(`Couldn't open that mic: ${e?.message || e}`)
            return
        }
        const ctx = new AudioContext()
        void ctx.resume()
        const src = ctx.createMediaStreamSource(mic.stream)
        let cap: AudioWorkletNode | null = null
        const tracker = new PitchTracker(Math.round(ctx.sampleRate / 4096))
        const chunks: Float32Array[] = []
        let countdownAt = performance.now()
        let singingAt = 0
        let finished = false
        const closeLater = (ms: number) => {
            closeTimer.current = setTimeout(() => { closeTimer.current = null; stage({ phase: 'closed', name: who }) }, ms)
        }
        const finish = async (keep: boolean) => {
            if (finished) return
            finished = true
            cancelRef.current = null
            doneRef.current = null
            if (cap) { cap.port.onmessage = null; cap.disconnect() }
            src.disconnect()
            mic.stream.getTracks().forEach(t => t.stop())
            const sampleRate = ctx.sampleRate
            void ctx.close()
            setLive(NO_LIVE)
            if (!keep || chunks.length === 0) { setPhase('idle'); stage({ phase: 'closed', name: who }); return }
            const total = chunks.reduce((n, c) => n + c.length, 0)
            const samples = new Float32Array(total)
            let o = 0
            for (const c of chunks) { samples.set(c, o); o += c.length }
            setPhase('analyzing')
            const analyzing = { phase: 'analyzing' as const, name: who, elapsed: VOICE_CHECK_SECONDS }
            stage(analyzing)
            // Heartbeat so the stage knows the host is still working (it hides a
            // guide that goes quiet).
            const beat = setInterval(() => stage(analyzing), 2000)
            let res: Awaited<ReturnType<typeof window.electronAPI.voiceAnalyze>>
            try {
                res = await window.electronAPI.voiceAnalyze({
                    wav: encodeWav(samples, sampleRate),
                    name: who,
                    guestId,
                    micLabel: mics.find(m => m.deviceId === micId)?.label ?? null,
                })
            } catch (e: any) {
                res = { error: e?.message || String(e) }
            } finally {
                clearInterval(beat)
            }
            if (res.error || !res.profile) {
                setPhase('error')
                setMessage(res.error || 'Analysis failed')
                stage({ phase: 'error', name: who, error: res.error || 'Analysis failed' })
                closeLater(ERROR_SHOWN_MS)
            } else {
                setPhase('done')
                setMessage(`Saved ${res.profile.name}: ${describe(res.profile.measurements).join(' · ')}`)
                setName('')
                stage({ phase: 'result', name: who, result: summarize(res.profile.measurements) })
                closeLater(RESULT_SHOWN_MS)
            }
        }
        const onChunk = (data: Float32Array) => {
            if (finished) return
            let peak = 0
            for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]))
            const now = performance.now()
            if (!singingAt && (now - countdownAt) / 1000 >= COUNTDOWN_SECONDS) {
                singingAt = now
                setPhase('recording')
            }
            const singing = singingAt > 0
            if (singing) chunks.push(data)
            const hz = detectPitch(data, ctx.sampleRate)
            const midi = tracker.push(hz == null ? null : hzToMidi(hz), singing)
            const elapsed = singing ? (now - singingAt) / 1000 : (now - countdownAt) / 1000
            const next: Live = { elapsed, level: peak, midi, lowMidi: tracker.lowMidi, highMidi: tracker.highMidi }
            setLive(next)
            stage({
                phase: singing ? 'singing' : 'countdown', name: who, ...next,
                wobbleCents: singing && stepAt(elapsed).index === 0 ? tracker.wobbleCents() : null,
            })
            if (singing && elapsed >= VOICE_CHECK_SECONDS) void finish(true)
        }
        try {
            cap = await createCaptureNode(ctx, onChunk, { channel: mic.channelIndex ?? 0, chunk: 4096 })
        } catch (e: any) {
            mic.stream.getTracks().forEach(t => t.stop())
            void ctx.close()
            setPhase('error')
            setMessage(`Couldn't start recording: ${e?.message || e}`)
            return
        }
        src.connect(cap)
        countdownAt = performance.now()
        cancelRef.current = () => void finish(false)
        doneRef.current = () => void finish(true)
        setLive(NO_LIVE)
        setPhase('countdown')
        stage({ phase: 'countdown', name: who })
    }

    const taking = phase === 'countdown' || phase === 'recording'
    const { index: stepIndex, stepElapsed } = stepAt(live.elapsed)
    const step = VOICE_CHECK_STEPS[stepIndex]
    const lyricIdx = step.lyrics ? Math.min(step.lyrics.length - 1, Math.floor(stepElapsed / (step.seconds / step.lyrics.length))) : -1

    const list = Object.values(profiles).sort((a, b) => a.name.localeCompare(b.name))

    return (
        <Card style={{ marginBottom: 18 }}>
            <CardHeader
                icon="mic"
                label="Voices"
                title="Voice Check"
                desc={`Each singer does a guided ${VOICE_CHECK_SECONDS}-second check once, following the stage screen; their mic then tunes itself to every song's part`}
            />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <Input
                    list="voice-check-guests"
                    placeholder="Singer's name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={taking || phase === 'analyzing'}
                    style={{ flex: '1 1 160px', minWidth: 140 }}
                />
                <datalist id="voice-check-guests">
                    {guests.map(g => <option key={g.id} value={g.name} />)}
                </datalist>
                <Select
                    value={micId}
                    onChange={(e) => setMicId(e.target.value)}
                    disabled={taking || phase === 'analyzing'}
                    style={{ flex: '1 1 180px', minWidth: 160 }}
                >
                    <option value="">Choose a mic…</option>
                    {mics.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label || 'Mic ' + m.deviceId.slice(0, 6)}</option>)}
                </Select>
                {taking ? (
                    <>
                        <Button
                            variant="primary"
                            icon="check"
                            disabled={phase !== 'recording' || live.elapsed < MIN_SECONDS}
                            onClick={() => doneRef.current?.()}
                        >
                            Done
                        </Button>
                        <IconButton icon="x" title="Cancel" onClick={() => cancelRef.current?.()} />
                    </>
                ) : (
                    <Button
                        variant="primary"
                        icon="mic"
                        disabled={!name.trim() || !micId || phase === 'analyzing'}
                        onClick={start}
                    >
                        {list.some(p => p.name.trim().toLowerCase() === name.trim().toLowerCase()) ? 'Redo voice check' : 'Start voice check'}
                    </Button>
                )}
            </div>

            {phase === 'countdown' && (
                <div className="adm-well" style={{ marginTop: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                        Starting in {Math.max(1, Math.ceil(COUNTDOWN_SECONDS - live.elapsed))}. First, hold any comfortable note on “{VOICE_CHECK_STEPS[0].sing}”
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Meter value={Math.min(1, live.level * 1.4)} />
                        <span style={{ fontSize: 11, color: 'var(--adm-text-3)' }}>mic check</span>
                    </div>
                </div>
            )}
            {phase === 'recording' && (
                <div className="adm-well" style={{ marginTop: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                        <span className="adm-mono" style={{ fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--adm-cyan)' }}>
                            Step {stepIndex + 1}/{VOICE_CHECK_STEPS.length} · {step.title}
                        </span>
                        <span className="adm-mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--adm-text-3)' }}>
                            {Math.max(0, Math.ceil(step.seconds - stepElapsed))}s
                        </span>
                    </div>
                    {step.lyrics ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {step.lyrics.map((l, i) => (
                                <div key={i} style={{ fontSize: 13, fontWeight: i === lyricIdx ? 700 : 400, color: i === lyricIdx ? 'var(--adm-text)' : 'var(--adm-text-3)' }}>{l}</div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--adm-text-2)' }}>
                            Sing <b style={{ color: 'var(--adm-text)' }}>“{step.sing}”</b>. {step.detail}
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Meter value={Math.min(1, live.level * 1.4)} />
                        <span className="adm-mono" style={{ fontSize: 11, color: 'var(--adm-text-3)', minWidth: 150, textAlign: 'right' }}>
                            {live.midi != null ? noteName(Math.round(live.midi)) : '-'}
                            {live.lowMidi != null && live.highMidi != null ? ` · ${noteName(Math.round(live.lowMidi))} to ${noteName(Math.round(live.highMidi))}` : ''}
                        </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--adm-text-3)' }}>The stage screen is showing {name.trim() || 'the singer'} what to sing.</div>
                </div>
            )}
            {phase === 'analyzing' && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--adm-text-2)' }}>
                    <Spinner size={14} /> Measuring range, pitch and tone…
                </div>
            )}
            {(phase === 'done' || phase === 'error') && message && (
                <div style={{ marginTop: 12, fontSize: 12.5, color: phase === 'error' ? 'var(--adm-red)' : 'var(--adm-green)' }}>{message}</div>
            )}

            {list.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 14 }}>
                    {list.map(p => (
                        <div key={p.key} className="adm-row" style={{ background: 'var(--adm-well)' }}>
                            <Icon name="mic" size={14} style={{ color: 'var(--adm-cyan)' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--adm-text-3)' }}>
                                    {describe(p.measurements).join(' · ')} · {new Date(p.recordedAt).toLocaleDateString()}
                                </div>
                            </div>
                            <IconButton icon="trash" size={26} danger title="Delete voice profile" onClick={() => window.electronAPI.voiceDelete(p.key)} />
                        </div>
                    ))}
                </div>
            )}
        </Card>
    )
}
