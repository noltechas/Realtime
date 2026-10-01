import type { VoiceEffectsEngine } from './VoiceEffectsEngine'

// Records each singer's DRY mic during a song for "Hear it as the artist"
// replays (main/performances.ts converts them with Seed-VC). Lives on the
// stage, where the singers' mic engines run.
//
// Alignment: every playback-time tick logs (recordedSamples, songMs) per take,
// so the converter can lay the recording back onto the song timeline even
// across pauses and seeks.

const engines = new Map<string, VoiceEffectsEngine>()

export function registerMicEngine(deviceId: string, engine: VoiceEffectsEngine): void {
    engines.set(deviceId, engine)
}

export function unregisterMicEngine(deviceId: string, engine: VoiceEffectsEngine): void {
    if (engines.get(deviceId) === engine) engines.delete(deviceId)
}

/** Every live singer mic engine on the stage. Read-only: visuals that react to
 *  the room's voices (the gothic theme's candles) sample their analysers. */
export function liveMicEngines(): VoiceEffectsEngine[] {
    const out: VoiceEffectsEngine[] = []
    engines.forEach((engine) => out.push(engine))
    return out
}

export interface RecorderSinger {
    name: string
    guestId?: string
    roleIndices: number[]
    micDeviceId: string
}

interface Take {
    singer: RecorderSinger
    engine: VoiceEffectsEngine
    timeMap: [number, number][]
}

const MIN_SECONDS = 15

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

export class PerformanceRecorder {
    readonly queueItemId: string
    private takes: Take[] = []
    private pending: RecorderSinger[]
    private finished = false

    constructor(
        queueItemId: string,
        private song: { trackId: string; name: string; artist: string },
        singers: RecorderSinger[],
    ) {
        this.queueItemId = queueItemId
        this.pending = singers.filter(s => !!s.micDeviceId)
        this.attach()
    }

    // Mic engines start asynchronously; pick up any that have come up since.
    private attach(): void {
        this.pending = this.pending.filter(s => {
            const engine = engines.get(s.micDeviceId)
            if (!engine) return true
            engine.startDryTake()
            this.takes.push({ singer: s, engine, timeMap: [] })
            return false
        })
    }

    /** Called on every playback-time update while the song plays. */
    tick(songMs: number): void {
        if (this.finished) return
        if (this.pending.length) this.attach()
        for (const t of this.takes) {
            const last = t.timeMap[t.timeMap.length - 1]
            const n = t.engine.drySamples
            if (!last || last[0] !== n || last[1] !== songMs) t.timeMap.push([n, Math.round(songMs)])
        }
    }

    /** Stop and hand the takes to the main process. Short or empty performances are dropped. */
    async finish(): Promise<void> {
        if (this.finished) return
        this.finished = true
        const singers = []
        for (const t of this.takes) {
            const take = t.engine.stopDryTake()
            if (!take || take.samples.length < MIN_SECONDS * take.sampleRate || t.timeMap.length < 4) continue
            singers.push({
                name: t.singer.name,
                guestId: t.singer.guestId ?? null,
                roleIndices: t.singer.roleIndices,
                sampleRate: take.sampleRate,
                timeMap: t.timeMap,
                wav: encodeWav(take.samples, take.sampleRate),
            })
        }
        if (singers.length === 0) return
        await window.electronAPI?.perfSave({ ...this.song, singers })
    }
}
