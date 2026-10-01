import { useEffect, useRef, useState } from 'react'
import { Button, Card, CardHeader, Icon, IconButton, Input, Meter, Select, Spinner } from './ui'
import type { AudioInputDevice } from '../hooks/useAudioDevices'
import { parseDeviceId } from '../hooks/useAudioDevices'
import { useVoiceProfiles } from '../hooks/useVoiceMatch'
import { noteName } from '../audio/voiceMatch'

// Voice check: a singer sings ~20 s into a karaoke mic; the take is measured
// (range, pitch steadiness, tone, level) and saved under their name, so the
// stage can tune their mic to each song's part (audio/voiceMatch.ts).

const TAKE_SECONDS = 20
const MIN_SECONDS = 8

type Phase = 'idle' | 'recording' | 'analyzing' | 'done' | 'error'

// Raw mic capture — same constraints as VoiceEffectsEngine (no browser
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

function describe(m: VoiceMeasurements): string[] {
    const out: string[] = []
    if (m.range) out.push(`range ${noteName(m.range.lowMidi)}–${noteName(m.range.highMidi)}`)
    const mad = m.tuning?.madCents
    if (typeof mad === 'number') out.push(mad <= 10 ? 'very steady pitch' : mad <= 18 ? 'steady pitch' : mad <= 26 ? 'some pitch wander' : 'pitch wanders — autotune will help more')
    const s = m.spectrum
    if (s && s.length === 6) {
        const air = (s[4] + s[5]) / 2
        out.push(air > -14 ? 'bright tone' : air < -24 ? 'warm / dark tone' : 'balanced tone')
    }
    return out
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
    const [level, setLevel] = useState(0)
    const [elapsed, setElapsed] = useState(0)
    const [message, setMessage] = useState('')
    // Live take controls: cancel discards it, done keeps it (>= MIN_SECONDS).
    const cancelRef = useRef<(() => void) | null>(null)
    const doneRef = useRef<(() => void) | null>(null)

    useEffect(() => { if (!micId && defaultMicId) setMicId(defaultMicId) }, [defaultMicId, micId])
    useEffect(() => () => cancelRef.current?.(), [])

    const guestId = guests.find(g => g.name.trim().toLowerCase() === name.trim().toLowerCase())?.id ?? null

    const start = async () => {
        if (!name.trim() || !micId) return
        setMessage('')
        let mic
        try {
            mic = await openMic(micId)
        } catch (e: any) {
            setPhase('error')
            setMessage(`Couldn't open that mic: ${e?.message || e}`)
            return
        }
        const ctx = new AudioContext()
        const src = ctx.createMediaStreamSource(mic.stream)
        const proc = ctx.createScriptProcessor(4096, 2, 1)
        const chunks: Float32Array[] = []
        const startedAt = performance.now()
        let finished = false
        const finish = async (keep: boolean) => {
            if (finished) return
            finished = true
            cancelRef.current = null
            doneRef.current = null
            proc.disconnect(); src.disconnect()
            mic.stream.getTracks().forEach(t => t.stop())
            const sampleRate = ctx.sampleRate
            void ctx.close()
            setLevel(0)
            if (!keep) { setPhase('idle'); return }
            const total = chunks.reduce((n, c) => n + c.length, 0)
            const samples = new Float32Array(total)
            let o = 0
            for (const c of chunks) { samples.set(c, o); o += c.length }
            setPhase('analyzing')
            const res = await window.electronAPI.voiceAnalyze({
                wav: encodeWav(samples, sampleRate),
                name: name.trim(),
                guestId,
                micLabel: mics.find(m => m.deviceId === micId)?.label ?? null,
            })
            if (res.error || !res.profile) {
                setPhase('error')
                setMessage(res.error || 'Analysis failed')
            } else {
                setPhase('done')
                setMessage(`Saved ${res.profile.name}: ${describe(res.profile.measurements).join(' · ')}`)
                setName('')
            }
        }
        proc.onaudioprocess = (ev) => {
            const inp = ev.inputBuffer
            const ch = mic.channelIndex !== undefined && mic.channelIndex < inp.numberOfChannels ? mic.channelIndex : 0
            const data = new Float32Array(inp.getChannelData(ch))
            chunks.push(data)
            let peak = 0
            for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]))
            setLevel(peak)
            const secs = (performance.now() - startedAt) / 1000
            setElapsed(secs)
            if (secs >= TAKE_SECONDS) void finish(true)
        }
        src.connect(proc)
        proc.connect(ctx.destination)  // ScriptProcessor only runs while connected; it outputs silence
        cancelRef.current = () => void finish(false)
        doneRef.current = () => void finish(true)
        setElapsed(0)
        setPhase('recording')
    }

    const list = Object.values(profiles).sort((a, b) => a.name.localeCompare(b.name))

    return (
        <Card style={{ marginBottom: 18 }}>
            <CardHeader
                icon="mic"
                label="Voices"
                title="Voice Check"
                desc="Each singer sings for 20 seconds once; the stage then tunes their mic to every song's part"
            />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <Input
                    list="voice-check-guests"
                    placeholder="Singer's name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={phase === 'recording' || phase === 'analyzing'}
                    style={{ flex: '1 1 160px', minWidth: 140 }}
                />
                <datalist id="voice-check-guests">
                    {guests.map(g => <option key={g.id} value={g.name} />)}
                </datalist>
                <Select
                    value={micId}
                    onChange={(e) => setMicId(e.target.value)}
                    disabled={phase === 'recording' || phase === 'analyzing'}
                    style={{ flex: '1 1 180px', minWidth: 160 }}
                >
                    <option value="">Choose a mic…</option>
                    {mics.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label || 'Mic ' + m.deviceId.slice(0, 6)}</option>)}
                </Select>
                {phase === 'recording' ? (
                    <>
                        <Button
                            variant="primary"
                            icon="check"
                            disabled={elapsed < MIN_SECONDS}
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

            {phase === 'recording' && (
                <div className="adm-well" style={{ marginTop: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--adm-text-2)' }}>
                        Sing any song you know well, at full karaoke volume. Somewhere in there, slide down to your lowest comfortable note and up to your highest.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Meter value={Math.min(1, level * 1.4)} />
                        <span className="adm-mono" style={{ fontSize: 11, color: 'var(--adm-text-3)', minWidth: 44, textAlign: 'right' }}>
                            {Math.max(0, TAKE_SECONDS - elapsed).toFixed(0)}s
                        </span>
                    </div>
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
