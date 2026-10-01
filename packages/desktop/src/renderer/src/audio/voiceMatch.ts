// Singer matching: nudge a song part's effect chain toward the record for THIS
// singer, using two profiles measured by the same code
// (scripts/autogen/vocal_profile.py):
//   - the part's profile, from the record's separated vocal (meta.vocalProfile)
//   - the singer's profile, from their voice check (main/voices.ts)
//
// Adjustments are deliberately conservative — these are approximate
// measurements, and a wrong big move sounds worse than no move:
//   tone     EQ nudged toward the record's balance (40% of the difference, ±4 dB)
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
    eq?: { enabled: boolean; lowGain: number; midGain: number; highGain: number }
    pitchCorrection?: { enabled: boolean; strength: number }
    micLevel?: number
}

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

    // Tone: both spectra are dB relative to their own 500–1.5k band.
    if (part?.spectrum && singer.spectrum && part.spectrum.length === 6 && singer.spectrum.length === 6) {
        const d = part.spectrum.map((v, i) => v - singer.spectrum![i])
        const nudge = (x: number) => half(clamp(0.4 * x, -4, 4))
        const low = nudge(mean([d[0], d[1]]))
        const mid = nudge(d[3])
        const high = nudge(mean([d[4], d[5]]))
        if (low || mid || high) {
            out.eq = {
                ...(out.eq || { lowGain: 0, midGain: 0, highGain: 0 }),
                enabled: true,
                lowGain: clamp((out.eq?.lowGain ?? 0) + low, -12, 12),
                midGain: clamp((out.eq?.midGain ?? 0) + mid, -12, 12),
                highGain: clamp((out.eq?.highGain ?? 0) + high, -12, 12),
            }
            const fmt = (label: string, v: number) => (v ? `${label} ${v > 0 ? '+' : ''}${v} dB` : null)
            notes.push('tone ' + [fmt('low', low), fmt('presence', mid), fmt('air', high)].filter(Boolean).join(', '))
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
