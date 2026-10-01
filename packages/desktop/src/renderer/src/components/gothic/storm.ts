// The gothic stage's shared clocks: the storm outside and the voices inside.
//
// Everything on a gothic screen answers the SAME lightning strike at the same
// instant: the WebGL storm draws the bolt, the windows flare, light shafts cross
// the floor, the watching eyes snap shut, and once in a while something is
// standing outside the glass. That only reads as one storm if there is exactly
// one clock, so it lives here at module scope and every consumer samples it.
//
// The clock is a pure function of time plus a little state (when the current
// strike began, when the next is due), so sampling it from a rAF, a useFrame and
// a React render all agree without any of them owning it.
//
// The second clock is the room's VOICE LEVEL: the combined RMS of every singer's
// mic engine (see audio/performanceRecorder's registry). Candles lean and flare
// on it, and a sustained belt calls down a strike of its own.

import { liveMicEngines } from '../../audio/performanceRecorder'

// ── Lightning ────────────────────────────────────────────────────────────────

/** A strike is a short train of flashes, the way real lightning re-strikes the
 *  same channel: a hard first return stroke, a weaker second, a faint third. */
const PULSES: Array<{ at: number; peak: number; decay: number }> = [
    { at: 0, peak: 1.0, decay: 110 },
    { at: 190, peak: 0.62, decay: 140 },
    { at: 420, peak: 0.28, decay: 220 },
]
const STRIKE_MS = 900

type Mood = 'idle' | 'performing'

interface StrikeState {
    start: number
    next: number
    seed: number
    /** Horizontal position of the bolt, 0..1 across the screen. */
    x: number
    /** Whether this strike reveals the figure outside the window. */
    figure: boolean
    /** Which window the figure stands in (consumers pick from their own list). */
    figureSlot: number
}

const state: StrikeState = {
    start: -1e9,
    next: 0,
    seed: 0.37,
    x: 0.3,
    figure: false,
    figureSlot: 0,
}

let mood: Mood = 'idle'
let strikeCount = 0

function gapFor(m: Mood): number {
    // Idle screens get weather; a performance gets the odd rumble. Lightning
    // that interrupts every chorus stops being atmosphere and becomes noise.
    return m === 'idle' ? 9000 + Math.random() * 13000 : 32000 + Math.random() * 30000
}

/** Set how stormy it is. The stage flips this when a song starts or ends. */
export function setStormMood(next: Mood): void {
    if (mood === next) return
    mood = next
    const now = performance.now()
    // Don't strike the instant a song starts, and don't leave an idle screen
    // waiting half a minute for its first bolt.
    state.next = now + (next === 'idle' ? 2800 + Math.random() * 2500 : 14000 + Math.random() * 9000)
}

function beginStrike(now: number): void {
    strikeCount += 1
    state.start = now
    state.seed = Math.random() * 100
    state.x = 0.12 + Math.random() * 0.76
    // The figure is rare on purpose. Every third strike or so on an idle wall,
    // never during a song (nobody should be startled mid-verse).
    state.figure = mood === 'idle' && strikeCount > 1 && Math.random() < 0.34
    state.figureSlot = Math.floor(Math.random() * 1000)
    state.next = now + gapFor(mood)
}

/** Call a strike right now (the count-in's final toll, a belted note). */
export function forceStrike(): void {
    const now = performance.now()
    if (now - state.start < STRIKE_MS + 1500) return
    beginStrike(now)
}

export interface StormSample {
    /** 0..1 overall brightness of the flash right now. */
    flash: number
    /** 0..1 visibility of the bolt itself (only during the first two pulses). */
    bolt: number
    /** Which pulse of the strike is lighting the room (-1 when dark). */
    pulse: number
    seed: number
    x: number
    figure: boolean
    figureSlot: number
    /** ms since the current strike began. */
    since: number
}

export function sampleStorm(now = performance.now()): StormSample {
    if (state.next === 0) state.next = now + 3200
    if (now >= state.next) beginStrike(now)
    const since = now - state.start
    let flash = 0
    let pulse = -1
    if (since >= 0 && since < STRIKE_MS) {
        for (let i = 0; i < PULSES.length; i++) {
            const p = PULSES[i]
            const t = since - p.at
            if (t < 0) continue
            // Near-instant rise, exponential fall.
            const v = t < 24 ? p.peak * (t / 24) : p.peak * Math.exp(-(t - 24) / p.decay)
            if (v > flash) {
                flash = v
                pulse = i
            }
        }
    }
    if (mood === 'performing') flash *= 0.55
    const bolt = pulse >= 0 && pulse < 2 ? Math.min(1, flash * 1.6) : 0
    return {
        flash,
        bolt,
        pulse: flash > 0.04 ? pulse : -1,
        seed: state.seed,
        x: state.x,
        figure: state.figure,
        figureSlot: state.figureSlot,
        since,
    }
}

// ── Voice level ──────────────────────────────────────────────────────────────

let voice = 0
let voicePeak = 0
let lastVoiceSample = 0
let beltSince = -1
let lastBeltStrike = 0
let scratch: Uint8Array<ArrayBuffer> | null = null

/** Smoothed 0..1 loudness of everyone singing, sampled at most ~30 times a
 *  second however many callers ask. */
export function sampleVoice(now = performance.now()): number {
    if (now - lastVoiceSample < 33) return voice
    lastVoiceSample = now
    let sum = 0
    let n = 0
    for (const engine of liveMicEngines()) {
        const an = engine.analyser
        if (!an) continue
        if (!scratch || scratch.length !== an.fftSize) scratch = new Uint8Array(an.fftSize)
        an.getByteTimeDomainData(scratch)
        let acc = 0
        for (let i = 0; i < scratch.length; i++) {
            const v = (scratch[i] - 128) / 128
            acc += v * v
        }
        sum += Math.sqrt(acc / scratch.length)
        n += 1
    }
    // Several mics add up, but a duet shouldn't read as twice as loud.
    const raw = n === 0 ? 0 : Math.min(1, (sum / Math.sqrt(n)) * 3.2)
    // Fast attack, slow release: a flame jumps at a shout and settles slowly.
    voice = raw > voice ? voice + (raw - voice) * 0.55 : voice + (raw - voice) * 0.08
    voicePeak = Math.max(voicePeak * 0.96, voice)

    // A sustained belt (well over the singer's running level for most of a
    // second) brings the storm down on cue. Long cooldown, so it stays special.
    if (voice > 0.62) {
        if (beltSince < 0) beltSince = now
        else if (now - beltSince > 750 && now - lastBeltStrike > 26000) {
            lastBeltStrike = now
            forceStrike()
        }
    } else {
        beltSince = -1
    }
    return voice
}

// ── The CSS bridge ───────────────────────────────────────────────────────────
// DOM consumers don't run their own loops: one rAF (reference counted, so it
// only runs while a gothic screen is mounted) writes the flash and the voice
// into custom properties on <html>, and CSS does the rest with calc(). Writes
// are skipped when nothing changed, so a dark, quiet room costs no style work.

let users = 0
let raf = 0
let lastFlash = -1
let lastVoice = -1

function tick(): void {
    const now = performance.now()
    const s = sampleStorm(now)
    const v = sampleVoice(now)
    const root = document.documentElement.style
    const f = Math.round(s.flash * 100) / 100
    if (f !== lastFlash) {
        lastFlash = f
        root.setProperty('--goth-flash', String(f))
    }
    const vv = Math.round(v * 50) / 50
    if (vv !== lastVoice) {
        lastVoice = vv
        root.setProperty('--goth-voice', String(vv))
    }
    raf = requestAnimationFrame(tick)
}

/** Start the shared bridge. Returns its release. */
export function retainStormBridge(): () => void {
    users += 1
    if (users === 1) raf = requestAnimationFrame(tick)
    return () => {
        users -= 1
        if (users <= 0) {
            users = 0
            cancelAnimationFrame(raf)
            lastFlash = -1
            lastVoice = -1
            document.documentElement.style.setProperty('--goth-flash', '0')
            document.documentElement.style.setProperty('--goth-voice', '0')
        }
    }
}
