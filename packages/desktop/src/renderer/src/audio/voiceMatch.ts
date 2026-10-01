// Singer matching: nudge a song part's effect chain toward the record for THIS
// singer, using two profiles measured by the same code
// (scripts/autogen/vocal_profile.py):
//   - the part's profile, from the record's separated vocal (meta.vocalProfile)
//   - the singer's profile, from their voice check (main/voices.ts)
//
// Adjustments are deliberately conservative — these are approximate
// measurements, and a wrong big move sounds worse than no move:
//   tone     6-band match EQ: half the record-vs-singer difference per band, ±6 dB
//   formant  a part pitched far from the singer's voice (a man taking a woman's
//            part an octave down, or vice versa) gets a formant nudge toward
//            the part's vocal size, ±2.5 semitones
//   pitch    autotune helps an unsteady singer more, a steady one less
//   level    mic gain evens out quiet / loud singers
//   range    a hint when the part sits outside the singer's comfortable range
//            (autotune snaps in any octave, so an octave down just works)

export interface MatchMeasurements {
    spectrum?: number[] | null
    levelDb?: number | null
    tuning?: { madCents?: number; flatnessCents?: number | null } | null
    range?: { lowMidi: number; medianMidi: number; highMidi: number } | null
}

// The parts of an effect chain matching touches (structural, so it works with
// both the full VoiceEffectsTypes chain and AppContext's VoiceEffects).
interface MatchableEffects {
    pitchCorrection?: { enabled: boolean; strength: number }
    micLevel?: number
    formant?: { enabled: boolean; shift: number }
    matchEq?: { enabled: boolean; gains: number[] }
}

const BAND_LABELS = ['sub', 'body', 'mids', 'presence', 'bite', 'air']

export interface VoiceMatchResult<T> {
    effects: T
    /** Human-readable list of what changed, for the Controls page. */
    notes: string[]
    rangeHint: string | null
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export function noteName(midi: number): string {
    return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const half = (v: number) => Math.round(v * 2) / 2
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/** Target measurements for a singer's part: their role, or any measured part as a fallback. */
export function partTarget(vocalProfile: any, roleIndices: number[] | undefined): MatchMeasurements | null {
    const parts: any[] = vocalProfile?.parts || []
    const measured = (p: any) => p && p.measurements
    const want = roleIndices && roleIndices.length > 0 ? roleIndices[0] : 0
    const own = parts.find(p => p.roleIndex === want && measured(p))
    if (own) return own.measurements
    // A part with no solo lines (it only sings in group sections) can't be
    // measured on its own; the song's other measured part is the next best
    // reference for tone, but not for range.
    const other = parts.find(measured)
    return other ? { ...other.measurements, range: null } : null
}

export function applyVoiceMatch<T extends MatchableEffects>(
    fx: T,
    singer: MatchMeasurements,
    part: MatchMeasurements | null,
): VoiceMatchResult<T> {
    const out: T = JSON.parse(JSON.stringify(fx))
    const notes: string[] = []

    // Tone: both spectra are dB relative to their own 500–1.5k band (index
    // 2), so that band is 0 by construction; the other five carry the shape.
    const m = out as MatchableEffects
    if (part?.spectrum && singer.spectrum && part.spectrum.length === 6 && singer.spectrum.length === 6) {
        const gains = part.spectrum.map((v, i) => half(clamp(0.5 * (v - singer.spectrum![i]), -6, 6)))
        if (gains.some(g => g !== 0)) {
            m.matchEq = { enabled: true, gains }
            const moved = gains.map((g, i) => ({ g, label: BAND_LABELS[i] })).filter(x => Math.abs(x.g) >= 1.5)
            notes.push(moved.length
                ? 'tone ' + moved.map(x => `${x.label} ${x.g > 0 ? '+' : ''}${x.g}`).join(', ') + ' dB'
                : 'tone: small trims')
        }
    }

    // Formant: when the part centers far from where the singer's voice sits,
    // they'll sing it in their own octave; nudging formants toward the part
    // brings the vocal size closer (a lighter timbre for a higher part).
    if (part?.range && singer.range) {
        const diff = part.range.medianMidi - singer.range.medianMidi
        if (Math.abs(diff) >= 7) {
            const shift = Math.sign(diff) * half(Math.min(2.5, 1 + (Math.abs(diff) - 7) * 0.25))
            m.formant = { enabled: true, shift }
            notes.push(`formant ${shift > 0 ? '+' : ''}${shift} st (${shift > 0 ? 'lighter' : 'deeper'} timbre for this part)`)
        }
    }

    // Pitch: how far the singer's sustained notes sit off pitch (cents).
    const mad = singer.tuning?.madCents
    if (typeof mad === 'number' && out.pitchCorrection) {
        const base = out.pitchCorrection.enabled ? out.pitchCorrection.strength : 0
        let next = base
        if (base < 15) {
            // A natural-sounding song: only a gentle assist for an unsteady singer.
            if (mad >= 22) next = 20
        } else {
            const extra = mad >= 30 ? 25 : mad >= 22 ? 15 : mad >= 15 ? 8 : mad <= 8 ? -10 : 0
            next = clamp(base + extra, 0, 100)
        }
        if (next !== base) {
            out.pitchCorrection = { ...out.pitchCorrection, enabled: next > 0, strength: next }
            notes.push(`autotune ${base} → ${next} (${mad >= 15 ? 'extra help holding notes' : 'singer is steady'})`)
        }
    }

    // Level: bring the singer's typical level toward -20 dBFS at the mic.
    if (typeof singer.levelDb === 'number') {
        const gainDb = clamp(-20 - singer.levelDb, -6, 9)
        if (Math.abs(gainDb) >= 1.5) {
            out.micLevel = clamp((out.micLevel ?? 1) * Math.pow(10, gainDb / 20), 0.25, 3)
            notes.push(`mic ${gainDb > 0 ? '+' : ''}${Math.round(gainDb)} dB`)
        }
    }

    // Range: only flag a part whose CENTER is past the highest / lowest note
    // the singer reached in their voice check — a short take rarely covers a
    // full range, so anything subtler would cry wolf.
    let rangeHint: string | null = null
    const pr = part?.range, sr = singer.range
    if (pr && sr) {
        if (pr.medianMidi > sr.highMidi) {
            rangeHint = `This part centers on ${noteName(pr.medianMidi)}, above the highest note in your voice check (${noteName(sr.highMidi)}) — try it an octave down.`
        } else if (pr.medianMidi < sr.lowMidi) {
            rangeHint = `This part centers on ${noteName(pr.medianMidi)}, below your lowest note (${noteName(sr.lowMidi)}) — try it an octave up.`
        }
    }
    return { effects: out, notes, rangeHint }
}
