// The space stage's one live signal: the room's VOICE.
//
// The combined loudness of every singer's mic (audio/performanceRecorder's
// registry). In this theme the voice is starlight: the bright stars in the
// deep field swell and their diffraction spikes reach further as people sing,
// the singer tags' stars do the same, and a sustained belt sends a FLARE (a
// one-shot burst of light from the brightest star) that consumers can listen
// for.
//
// One reference-counted rAF writes the level into --sp-voice on <html> (0..1),
// skipping writes when nothing changed, so a quiet room costs no style work.

import { liveMicEngines } from '../../audio/performanceRecorder'

let voice = 0
let lastSample = 0
let beltSince = -1
let lastFlare = 0
let scratch: Uint8Array<ArrayBuffer> | null = null

type FlareListener = () => void
const flareListeners = new Set<FlareListener>()

/** Subscribe to flares (a belted note, the count-in's needle drop). */
export function onFlare(fn: FlareListener): () => void {
    flareListeners.add(fn)
    return () => {
        flareListeners.delete(fn)
    }
}

export function flare(): void {
    const now = performance.now()
    if (now - lastFlare < 900) return
    lastFlare = now
    flareListeners.forEach((fn) => fn())
}

/** Smoothed 0..1 loudness of everyone singing, sampled at most ~30 times a
 *  second however many callers ask. */
export function sampleCosmosVoice(now = performance.now()): number {
    if (now - lastSample < 33) return voice
    lastSample = now
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
    // Starlight rises quickly and fades slowly.
    voice = raw > voice ? voice + (raw - voice) * 0.5 : voice + (raw - voice) * 0.07
    if (voice > 0.6) {
        if (beltSince < 0) beltSince = now
        else if (now - beltSince > 700 && now - lastFlare > 12000) flare()
    } else {
        beltSince = -1
    }
    return voice
}

// ── The CSS bridge ───────────────────────────────────────────────────────────

let users = 0
let raf = 0
let last = -1

function tick(): void {
    const v = Math.round(sampleCosmosVoice() * 50) / 50
    if (v !== last) {
        last = v
        document.documentElement.style.setProperty('--sp-voice', String(v))
    }
    raf = requestAnimationFrame(tick)
}

/** Start the shared bridge while a space screen is mounted. Returns its release. */
export function retainCosmos(): () => void {
    users += 1
    if (users === 1) raf = requestAnimationFrame(tick)
    return () => {
        users -= 1
        if (users <= 0) {
            users = 0
            cancelAnimationFrame(raf)
            last = -1
            document.documentElement.style.setProperty('--sp-voice', '0')
        }
    }
}
