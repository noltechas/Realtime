// Self-contained metronome for the Vocal Offset calibration tool.
//
// Owns its own AudioContext so it never passes through the live mic effects
// chain, and routes via `setSinkId` to the vocal-monitor device so the clicks
// you hear are coming out of the same physical output you're calibrating.

export interface ScheduledRun {
    // Absolute times (in ctx.currentTime seconds) for every beat, count-in first
    // then measured beats. Length = countInBeats + measuredBeats.
    beatTimes: number[]
    beatIntervalMs: number
    countInBeats: number
    measuredBeats: number
}

interface ScheduledNode {
    osc: OscillatorNode
    gain: GainNode
}

export class MetronomeScheduler {
    private ctx: AudioContext | null = null
    private sinkId: string = ''
    private scheduled: ScheduledNode[] = []

    async prepare(sinkId: string): Promise<void> {
        if (!this.ctx || this.sinkId !== sinkId) {
            try { await this.ctx?.close() } catch { /* noop */ }
            this.ctx = new AudioContext({ latencyHint: 'interactive' })
            this.sinkId = sinkId
            if (sinkId && typeof (this.ctx as unknown as { setSinkId?: (id: string) => Promise<void> }).setSinkId === 'function') {
                try {
                    await (this.ctx as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(sinkId)
                } catch (e) {
                    console.warn('MetronomeScheduler: setSinkId failed', e)
                }
            }
        }
        if (this.ctx.state === 'suspended') await this.ctx.resume()
    }

    // Schedule a calibration run. Count-in beats fire at reduced volume so the
    // user hears the tempo without being unsure when measurement starts;
    // measured beats fire at full volume.
    scheduleRun(bpm: number, countInBeats: number, measuredBeats: number): ScheduledRun {
        if (!this.ctx) throw new Error('MetronomeScheduler not prepared')
        const ctx = this.ctx
        const intervalSec = 60 / bpm
        const lead = 0.15 // 150ms scheduling lead so the first click is on-time
        const startedAt = ctx.currentTime + lead
        const total = countInBeats + measuredBeats
        const beatTimes: number[] = []
        for (let i = 0; i < total; i++) beatTimes.push(startedAt + i * intervalSec)

        for (let i = 0; i < total; i++) {
            const isCountIn = i < countInBeats
            this.scheduleClick(beatTimes[i], isCountIn ? 0.35 : 1.0, isCountIn ? 700 : 1000)
        }

        return { beatTimes, beatIntervalMs: intervalSec * 1000, countInBeats, measuredBeats }
    }

    private scheduleClick(when: number, level: number, freq: number) {
        if (!this.ctx) return
        const ctx = this.ctx
        const osc = ctx.createOscillator()
        const env = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, when)
        env.gain.setValueAtTime(0.0001, when)
        env.gain.linearRampToValueAtTime(level * 0.6, when + 0.005)
        env.gain.exponentialRampToValueAtTime(0.0001, when + 0.05)
        osc.connect(env)
        env.connect(ctx.destination)
        osc.start(when)
        osc.stop(when + 0.08)
        this.scheduled.push({ osc, gain: env })
        osc.onended = () => {
            try { osc.disconnect() } catch { /* noop */ }
            try { env.disconnect() } catch { /* noop */ }
        }
    }

    cancelAll(): void {
        const now = this.ctx?.currentTime ?? 0
        for (const { osc, gain } of this.scheduled) {
            try {
                gain.gain.cancelScheduledValues(now)
                gain.gain.setValueAtTime(0, now)
            } catch { /* noop */ }
            try { osc.stop(now) } catch { /* noop */ }
        }
        this.scheduled = []
    }

    // ctx.currentTime — the audio clock the scheduler used to place the clicks.
    // Tap timestamps captured with this method are directly comparable to the
    // beatTimes returned from scheduleRun().
    now(): number {
        return this.ctx?.currentTime ?? 0
    }

    async destroy(): Promise<void> {
        this.cancelAll()
        try { await this.ctx?.close() } catch { /* noop */ }
        this.ctx = null
    }
}
