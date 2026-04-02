export interface VoiceEffects {
    // Musical context
    key: number
    mode: number
    tempo: number // BPM
    micLevel: number // 0.0 to 2.0 (1.0 is default)

    // Pitch Correction
    pitchCorrection: {
        enabled: boolean
        strength: number // 0-100
    }

    // Dynamics / Compressor
    compressor: {
        enabled: boolean
        threshold: number // -100 to 0 dB
        ratio: number // 1 to 20
        attack: number // 0 to 1 sec
        release: number // 0 to 1 sec
    }

    // EQ (3-band)
    eq: {
        enabled: boolean
        lowGain: number // -24 to +24 dB
        midGain: number // -24 to +24 dB
        highGain: number // -24 to +24 dB
    }

    // Modulation / Chorus
    chorus: {
        enabled: boolean
        rate: number // 0 to 20 Hz
        depth: number // 0 to 1
        mix: number // 0-100%
    }

    // Delay
    delay: {
        enabled: boolean
        time: number // 0 to 2000 ms
        feedback: number // 0-100%
        mix: number // 0-100%
    }

    // Reverb
    reverb: {
        enabled: boolean
        decay: number // 0.1 to 10 seconds
        preDelay: number // 0 to 100 ms
        mix: number // 0-100%
    }

    // Distortion / Saturation
    distortion: {
        enabled: boolean
        drive: number // 0 to 100
        mix: number // 0-100%
    }

    // Noise Gate
    noiseGate: {
        enabled: boolean
        threshold: number // -100 to 0 dB
    }
}

/** Normalize micLevel: treat 0.5 as legacy default, use 1.0 (full volume) */
export function normalizeMicLevel(effects: VoiceEffects | VoiceEffects[] | null): VoiceEffects | VoiceEffects[] | null {
    if (!effects) return effects
    if (Array.isArray(effects)) {
        return effects.map(e => ({ ...e, micLevel: e.micLevel === 0.5 ? 1.0 : (e.micLevel ?? 1.0) }))
    }
    return { ...effects, micLevel: effects.micLevel === 0.5 ? 1.0 : (effects.micLevel ?? 1.0) }
}

export const DEFAULT_VOICE_EFFECTS: VoiceEffects = {
    key: -1, mode: 1, tempo: 120, micLevel: 1.0,
    pitchCorrection: { enabled: true, strength: 40 },
    compressor: { enabled: true, threshold: -24, ratio: 4, attack: 0.01, release: 0.1 },
    eq: { enabled: true, lowGain: 0, midGain: 2, highGain: 4 },
    chorus: { enabled: false, rate: 1.5, depth: 0.2, mix: 30 },
    delay: { enabled: false, time: 250, feedback: 25, mix: 20 },
    reverb: { enabled: true, decay: 2.5, preDelay: 20, mix: 35 },
    distortion: { enabled: false, drive: 0, mix: 0 },
    noiseGate: { enabled: false, threshold: -50 }
}
