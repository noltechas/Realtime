// The Barbie stage's shared clocks: the sun's GLINT and the room's VOICE.
//
// THE GLINT. Every so often the light catches everything at once, the way it
// does when the sun comes out from behind a cloud: a bright band sweeps across
// every glossy surface on the screen (titles, pills, the lyric cloud, the
// QR postcard, the WebGL sunshine) at the same instant. That only reads as one
// sun if there is one clock, so it lives here and everything samples it. A
// belted note or the count-in's "Sing!" calls a glint on cue.
//
// THE VOICE. The combined loudness of every singer's mic (audio/
// performanceRecorder's registry). The sun is the room's voice made visible:
// it swells and brightens as people sing, and a sustained belt throws a burst
// of glitter as well as the glint.
//
// One reference-counted rAF writes both into custom properties on <html>
// (--barb-glint 0..1 across a sweep, --barb-voice 0..1), skipping writes when
// nothing changed, so a quiet screen between glints costs no style work.

import { liveMicEngines } from '../../audio/performanceRecorder'

// ── Glint ────────────────────────────────────────────────────────────────────

const GLINT_MS = 1250

type Mood = 'idle' | 'performing'
let mood: Mood = 'idle'

const glint = { start: -1e9, next: 0 }

function gapFor(m: Mood): number {
    return m === 'idle' ? 6500 + Math.random() * 4500 : 11000 + Math.random() * 7000
}

/** The stage flips this when a song starts or ends: glints come less often
 *  while someone sings, so the light stays a treat rather than a strobe. */
export function setSunMood(next: Mood): void {
    if (mood === next) return
    mood = next
    glint.next = performance.now() + (next === 'idle' ? 1400 : 5000)
}

/** Catch the light right now (a belt, the count-in's last beat). */
export function forceGlint(): void {
    const now = performance.now()
    if (now - glint.start < GLINT_MS + 400) return
    glint.start = now
    glint.next = now + gapFor(mood)
}

/** 0..1 through the current sweep, or 0 between sweeps (the band rests off
 *  the left edge of every surface, so 0 is also "nothing visible"). */
export function sampleGlint(now = performance.now()): number {
    if (glint.next === 0) glint.next = now + 1600
    if (now >= glint.next) {
        glint.start = now
        glint.next = now + gapFor(mood)
    }
    const t = (now - glint.start) / GLINT_MS
    if (t < 0 || t >= 1) return 0
    // Ease in-out: the light gathers, crosses, and is gone.
    return t * t * (3 - 2 * t)
}

// ── Glitter bursts ───────────────────────────────────────────────────────────

type BurstListener = (strength: number) => void
const burstListeners = new Set<BurstListener>()

/** Subscribe to glitter bursts (belts, "Sing!"). Returns the unsubscribe. */
export function onGlitterBurst(fn: BurstListener): () => void {
    burstListeners.add(fn)
    return () => {
        burstListeners.delete(fn)
    }
}

export function burstGlitter(strength = 1): void {
    burstListeners.forEach((fn) => fn(strength))
}

// ── Voice level ──────────────────────────────────────────────────────────────

let voice = 0
let lastVoiceSample = 0
let beltSince = -1
let lastBelt = 0
let scratch: Uint8Array<ArrayBuffer> | null = null

/** Smoothed 0..1 loudness of everyone singing, sampled at most ~30 times a
 *  second however many callers ask. */
export function sampleSunVoice(now = performance.now()): number {
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
    // Quick to brighten, slow to fade: sunshine lingers.
    voice = raw > voice ? voice + (raw - voice) * 0.45 : voice + (raw - voice) * 0.06
    if (voice > 0.6) {
        if (beltSince < 0) beltSince = now
        else if (now - beltSince > 700 && now - lastBelt > 14000) {
            lastBelt = now
            forceGlint()
            burstGlitter(1)
        }
    } else {
        beltSince = -1
    }
    return voice
}

// ── The CSS bridge ───────────────────────────────────────────────────────────

let users = 0
let raf = 0
let lastGlint = -1
let lastVoice = -1

function tick(): void {
    const now = performance.now()
    const g = Math.round(sampleGlint(now) * 400) / 400
    const v = Math.round(sampleSunVoice(now) * 50) / 50
    const root = document.documentElement.style
    if (g !== lastGlint) {
        lastGlint = g
        root.setProperty('--barb-glint', String(g))
    }
    if (v !== lastVoice) {
        lastVoice = v
        root.setProperty('--barb-voice', String(v))
    }
    raf = requestAnimationFrame(tick)
}

/** Start the shared bridge while a Barbie screen is mounted. Returns its release. */
export function retainSunshine(): () => void {
    users += 1
    if (users === 1) raf = requestAnimationFrame(tick)
    return () => {
        users -= 1
        if (users <= 0) {
            users = 0
            cancelAnimationFrame(raf)
            lastGlint = -1
            lastVoice = -1
            document.documentElement.style.setProperty('--barb-glint', '0')
            document.documentElement.style.setProperty('--barb-voice', '0')
        }
    }
}
