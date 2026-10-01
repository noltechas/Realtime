// The guided voice check: exactly what the singer sings, step by step. Shared
// by the host's VoiceCheckCard (which records) and the stage's
// VoiceCheckStage (which shows the singer what to do), so both stay in sync.
//
// Each step feeds a specific measurement (scripts/autogen/vocal_profile.py):
//   hold   a steady sustained note → pitch steadiness + tone
//   low    a slide down to the floor → bottom of the range
//   high   a slide up to the ceiling → top of the range
//   song   ordinary singing of a melody everyone knows → tone + steadiness in
//          real phrases. "Twinkle, Twinkle, Little Star" is public domain.

export interface VoiceCheckStep {
    key: 'hold' | 'low' | 'high' | 'song'
    seconds: number
    title: string
    /** What to sing, verbatim. */
    sing: string
    detail: string
    lyrics?: string[]
}

export const VOICE_CHECK_STEPS: VoiceCheckStep[] = [
    { key: 'hold', seconds: 5, title: 'Hold a note', sing: 'Ahhh…', detail: 'Pick any comfortable note and hold it as steady as you can.' },
    { key: 'low', seconds: 6, title: 'Slide down', sing: 'Ahhh', detail: 'Start where it’s comfortable, then slide down as low as you can go.' },
    { key: 'high', seconds: 6, title: 'Slide up', sing: 'Ooooh', detail: 'Now slide up as high as you can. Falsetto counts.' },
    {
        key: 'song', seconds: 14, title: 'Sing this', sing: 'Twinkle, Twinkle, Little Star',
        detail: 'At your normal karaoke volume, any key you like.',
        lyrics: ['Twinkle, twinkle, little star,', 'How I wonder what you are!', 'Up above the world so high,', 'Like a diamond in the sky.'],
    },
]

export const VOICE_CHECK_SECONDS = VOICE_CHECK_STEPS.reduce((n, s) => n + s.seconds, 0)

/** Which step (and how far into it) a given elapsed time falls in. */
export function stepAt(elapsed: number): { index: number; stepElapsed: number } {
    let t = elapsed
    for (let i = 0; i < VOICE_CHECK_STEPS.length; i++) {
        if (t < VOICE_CHECK_STEPS[i].seconds) return { index: i, stepElapsed: t }
        t -= VOICE_CHECK_STEPS[i].seconds
    }
    const last = VOICE_CHECK_STEPS.length - 1
    return { index: last, stepElapsed: VOICE_CHECK_STEPS[last].seconds }
}

/** What the stage stamps on the chart once the take is measured. */
export interface VoiceCheckResult {
    lowMidi: number | null
    highMidi: number | null
    pitch: 'very-steady' | 'steady' | 'some-wander' | 'wanders' | null
    tone: 'bright' | 'warm' | 'balanced' | null
}

/** Live state the host streams to the stage while a voice check runs. */
export interface VoiceCheckUpdate {
    phase: 'countdown' | 'singing' | 'analyzing' | 'result' | 'error' | 'closed'
    name: string
    /** Seconds into the take (singing) or into the 3-2-1 lead-in (countdown). */
    elapsed: number
    level: number
    /** Current sung pitch as a fractional MIDI note, null when not singing. */
    midi: number | null
    lowMidi: number | null
    highMidi: number | null
    /** Pitch wobble over the last second, cents (hold step feedback). */
    wobbleCents: number | null
    result?: VoiceCheckResult
    error?: string
}

/**
 * Monophonic pitch for live feedback (YIN, threshold 0.15). Returns Hz or
 * null when there's no clear pitch. Runs on the latest ~43 ms of audio every
 * capture buffer; the stored profile is measured offline by pyin instead.
 */
export function detectPitch(buf: Float32Array, sampleRate: number): number | null {
    const n = Math.min(buf.length, 2048)
    const x = buf.subarray(buf.length - n)
    let energy = 0
    for (let i = 0; i < n; i++) energy += x[i] * x[i]
    if (Math.sqrt(energy / n) < 0.01) return null
    const half = n >> 1
    const minLag = Math.floor(sampleRate / 1100)
    const maxLag = Math.min(half - 1, Math.ceil(sampleRate / 60))
    const d = new Float32Array(maxLag + 1)
    for (let lag = 1; lag <= maxLag; lag++) {
        let s = 0
        for (let i = 0; i < half; i++) {
            const v = x[i] - x[i + lag]
            s += v * v
        }
        d[lag] = s
    }
    // Cumulative mean normalized difference, over every lag first…
    let running = 0
    for (let lag = 1; lag <= maxLag; lag++) {
        running += d[lag]
        d[lag] = running > 0 ? (d[lag] * lag) / running : 1
    }
    // …then the first dip under the threshold, walked down to its minimum.
    let l = -1
    for (let lag = minLag; lag <= maxLag; lag++) {
        if (d[lag] < 0.15) { l = lag; break }
    }
    if (l < 0) return null
    while (l + 1 <= maxLag && d[l + 1] < d[l]) l++
    const a = d[l - 1], b = d[l], c = l + 1 <= maxLag ? d[l + 1] : d[l]
    const denom = a - 2 * b + c
    const shift = denom !== 0 ? (a - c) / (2 * denom) : 0
    return sampleRate / (l + shift)
}

export function hzToMidi(hz: number): number {
    return 69 + 12 * Math.log2(hz / 440)
}

/**
 * Turns raw per-buffer pitch frames into what the guide shows: a median-of-3
 * smoothed note, the lowest/highest notes actually held (a frame only counts
 * when its neighbours agree within 2 semitones, so a one-frame octave error
 * can't set a record) and the wobble over the last second.
 */
export class PitchTracker {
    private recent: number[] = []
    private window: (number | null)[] = []
    lowMidi: number | null = null
    highMidi: number | null = null

    constructor(private framesPerSecond: number) { }

    push(midi: number | null, trackExtremes: boolean): number | null {
        let smoothed: number | null = null
        if (midi == null) {
            this.recent = []
        } else {
            this.recent.push(midi)
            if (this.recent.length > 3) this.recent.shift()
            if (this.recent.length < 3) {
                smoothed = midi
            } else {
                const sorted = [...this.recent].sort((a, b) => a - b)
                smoothed = sorted[1]
                if (trackExtremes && sorted[2] - sorted[0] < 2) {
                    if (this.lowMidi == null || smoothed < this.lowMidi) this.lowMidi = smoothed
                    if (this.highMidi == null || smoothed > this.highMidi) this.highMidi = smoothed
                }
            }
        }
        this.window.push(smoothed)
        while (this.window.length > this.framesPerSecond) this.window.shift()
        return smoothed
    }

    /** Pitch spread (std, cents) over the last second; null until most of it was voiced. */
    wobbleCents(): number | null {
        const voiced = this.window.filter((m): m is number => m != null)
        if (voiced.length < Math.max(3, this.framesPerSecond * 0.6)) return null
        const mean = voiced.reduce((a, b) => a + b, 0) / voiced.length
        const v = voiced.reduce((a, b) => a + (b - mean) * (b - mean), 0) / voiced.length
        return Math.sqrt(v) * 100
    }
}
