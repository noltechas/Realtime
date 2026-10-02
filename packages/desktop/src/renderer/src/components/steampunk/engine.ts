// The Vox Engine's one clock: the room's VOICE is its steam.
//
// One reference-counted rAF does everything that moves with the engine:
//
//   • samples every singer's mic (audio/performanceRecorder's registry) into a
//     smoothed 0..1 level, written to --vox on <html> for CSS;
//   • turns every registered gear by one master angle times its ratio, so a
//     whole train stays meshed; the engine idles slowly with nobody singing
//     and runs up to four times faster on a full-throated chorus;
//   • swings every registered gauge needle to the room's pressure, with the
//     slight tremble of a real Bourdon tube;
//   • when someone belts for a moment, BLOWS OFF STEAM: a one-shot event the
//     steam vents listen for (the count-in's "Full steam" fires one too).
//
// Everything writes transforms straight onto DOM nodes, so per-syllable
// renders never touch it and a quiet room costs almost nothing.

import { liveMicEngines } from '../../audio/performanceRecorder'

let voice = 0
let lastVoiceSample = 0
let beltSince = -1
let lastBurst = 0
let scratch: Uint8Array<ArrayBuffer> | null = null

type BurstListener = () => void
const burstListeners = new Set<BurstListener>()

/** Subscribe to steam blow-offs (a belted note, the count-in's "Full steam"). */
export function onBurst(fn: BurstListener): () => void {
    burstListeners.add(fn)
    return () => {
        burstListeners.delete(fn)
    }
}

export function burst(): void {
    const now = performance.now()
    if (now - lastBurst < 900) return
    lastBurst = now
    burstListeners.forEach((fn) => fn())
}

/** Smoothed 0..1 loudness of everyone singing (sampled at most ~30 Hz). */
export function sampleVox(now = performance.now()): number {
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
    // Pressure builds quickly and bleeds off slowly.
    voice = raw > voice ? voice + (raw - voice) * 0.4 : voice + (raw - voice) * 0.05
    if (voice > 0.6) {
        if (beltSince < 0) beltSince = now
        else if (now - beltSince > 700 && now - lastBurst > 9000) burst()
    } else {
        beltSince = -1
    }
    return voice
}

// ── Gears and needles ────────────────────────────────────────────────────────

interface GearReg { el: HTMLElement; phase: number; dir: number; ratio: number }
interface NeedleReg { el: HTMLElement; reading: () => number; shown: number }

const gears = new Set<GearReg>()
const needles = new Set<NeedleReg>()
let master = 0
let load = 1

/** Turn this element with the engine (its train's phase, direction, ratio). */
export function registerGear(el: HTMLElement, phase: number, dir: number, ratio: number): () => void {
    const g = { el, phase, dir, ratio }
    gears.add(g)
    el.style.transform = `rotate(${phase.toFixed(2)}deg)`
    return () => {
        gears.delete(g)
    }
}

/** Swing this needle (pointing to twelve at rest) to a 0..1 reading; with no
 *  reading it shows the room's voice. The dial runs from -135 to +135 degrees. */
export function registerNeedle(el: HTMLElement, reading?: () => number): () => void {
    const n = { el, reading: reading ?? (() => voice), shown: 0 }
    needles.add(n)
    return () => {
        needles.delete(n)
    }
}

/** How hard the engine may run (1 normally; low while the stage is paused). */
export function setEngineLoad(k: number): void {
    load = k
}

// ── The bridge ───────────────────────────────────────────────────────────────

let users = 0
let raf = 0
let lastT = 0
let lastV = -1

function tick(t: number): void {
    const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0
    lastT = t
    const v = sampleVox(t)
    // degrees per second for the train's first gear
    const speed = (7 + 26 * v) * load
    master += speed * dt
    gears.forEach((g) => {
        g.el.style.transform = `rotate(${(g.phase + g.dir * g.ratio * master).toFixed(2)}deg)`
    })
    const tremble = Math.sin(t * 0.031) * 0.006 + Math.sin(t * 0.017 + 1.3) * 0.004
    needles.forEach((n) => {
        const target = Math.max(0, Math.min(1, n.reading()))
        n.shown += (target - n.shown) * Math.min(1, dt * 5)
        const a = -135 + 270 * Math.max(0, Math.min(1.02, n.shown + tremble))
        n.el.style.transform = `rotate(${a.toFixed(2)}deg)`
    })
    const vq = Math.round(v * 50) / 50
    if (vq !== lastV) {
        lastV = vq
        document.documentElement.style.setProperty('--vox', String(vq))
    }
    raf = requestAnimationFrame(tick)
}

/** Run the engine while a steampunk screen is mounted. Returns its release. */
export function retainEngine(): () => void {
    users += 1
    if (users === 1) {
        lastT = 0
        raf = requestAnimationFrame(tick)
    }
    return () => {
        users -= 1
        if (users <= 0) {
            users = 0
            cancelAnimationFrame(raf)
            lastV = -1
            document.documentElement.style.setProperty('--vox', '0')
        }
    }
}
