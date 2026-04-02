/**
 * VocalEffects - Auto-applies vocal processing based on song characteristics
 *
 * Analyzes Spotify audio features (tempo, energy, key, valence) and applies
 * appropriate vocal effects: reverb, delay/echo, compression, EQ.
 */

export interface SongFeatures {
    tempo: number        // BPM
    energy: number       // 0-1
    key: number          // 0-11 pitch class
    valence: number      // 0-1 (mood)
    danceability: number // 0-1
    acousticness: number // 0-1
    liveness: number     // 0-1
}

export interface EffectPreset {
    reverbMix: number      // 0-1
    reverbDecay: number    // seconds
    delayTime: number      // seconds
    delayFeedback: number  // 0-1
    delayMix: number       // 0-1
    compThreshold: number  // dB
    compRatio: number
    eqLowGain: number     // dB
    eqMidGain: number     // dB
    eqHighGain: number    // dB
}

export class VocalEffects {
    private audioContext: AudioContext
    private inputNode: AudioNode
    private outputNode: AudioNode

    // Effect nodes
    private convolver: ConvolverNode | null = null
    private reverbGain: GainNode | null = null
    private dryGain: GainNode | null = null
    private delay: DelayNode | null = null
    private delayFeedback: GainNode | null = null
    private delayGain: GainNode | null = null
    private compressor: DynamicsCompressorNode | null = null
    private eqLow: BiquadFilterNode | null = null
    private eqMid: BiquadFilterNode | null = null
    private eqHigh: BiquadFilterNode | null = null

    constructor(audioContext: AudioContext, inputNode: AudioNode, outputNode: AudioNode) {
        this.audioContext = audioContext
        this.inputNode = inputNode
        this.outputNode = outputNode
    }

    /**
     * Auto-detect the best vocal effects based on Spotify audio features
     */
    static getPresetFromFeatures(features: SongFeatures): EffectPreset {
        const { tempo, energy, valence, acousticness, liveness } = features

        // Reverb: More reverb for ballads, less for upbeat
        const isSlowBallad = tempo < 100 && energy < 0.5
        const isHighEnergy = energy > 0.7 && tempo > 120
        const reverbMix = isSlowBallad ? 0.4 : isHighEnergy ? 0.15 : 0.25
        const reverbDecay = isSlowBallad ? 3.0 : isHighEnergy ? 1.2 : 2.0

        // Delay: Subtle echo for atmospheric tracks
        const delayTime = 60 / tempo / 2 // Half-beat delay
        const delayFeedback = energy > 0.6 ? 0.2 : 0.35
        const delayMix = acousticness > 0.5 ? 0.1 : 0.2

        // Compression: Tighter for energetic, looser for mellow
        const compThreshold = isHighEnergy ? -18 : -12
        const compRatio = isHighEnergy ? 4 : 2.5

        // EQ: Boost presence for bright songs, warmth for mellow
        const eqLowGain = valence > 0.5 ? 2 : 4     // More warmth for sad songs
        const eqMidGain = energy > 0.5 ? 3 : 1        // Presence boost for energetic
        const eqHighGain = valence > 0.5 ? 4 : 2      // Brightness for happy

        return {
            reverbMix,
            reverbDecay,
            delayTime,
            delayFeedback,
            delayMix,
            compThreshold,
            compRatio,
            eqLowGain,
            eqMidGain,
            eqHighGain
        }
    }

    /**
     * Create a reverb impulse response buffer
     */
    private createImpulseResponse(duration: number, decay: number): AudioBuffer {
        const length = this.audioContext.sampleRate * duration
        const buffer = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate)

        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel)
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
            }
        }

        return buffer
    }

    /**
     * Build the effects chain based on a preset
     */
    applyPreset(preset: EffectPreset) {
        // Disconnect existing chain
        this.disconnect()

        // EQ (3-band)
        this.eqLow = this.audioContext.createBiquadFilter()
        this.eqLow.type = 'lowshelf'
        this.eqLow.frequency.value = 250
        this.eqLow.gain.value = preset.eqLowGain

        this.eqMid = this.audioContext.createBiquadFilter()
        this.eqMid.type = 'peaking'
        this.eqMid.frequency.value = 2500
        this.eqMid.Q.value = 1.0
        this.eqMid.gain.value = preset.eqMidGain

        this.eqHigh = this.audioContext.createBiquadFilter()
        this.eqHigh.type = 'highshelf'
        this.eqHigh.frequency.value = 6000
        this.eqHigh.gain.value = preset.eqHighGain

        // Compressor
        this.compressor = this.audioContext.createDynamicsCompressor()
        this.compressor.threshold.value = preset.compThreshold
        this.compressor.ratio.value = preset.compRatio
        this.compressor.attack.value = 0.003
        this.compressor.release.value = 0.25

        // Reverb (convolution)
        this.convolver = this.audioContext.createConvolver()
        this.convolver.buffer = this.createImpulseResponse(preset.reverbDecay, 2.5)
        this.reverbGain = this.audioContext.createGain()
        this.reverbGain.gain.value = preset.reverbMix
        this.dryGain = this.audioContext.createGain()
        this.dryGain.gain.value = 1 - preset.reverbMix

        // Delay
        this.delay = this.audioContext.createDelay(2.0)
        this.delay.delayTime.value = preset.delayTime
        this.delayFeedback = this.audioContext.createGain()
        this.delayFeedback.gain.value = preset.delayFeedback
        this.delayGain = this.audioContext.createGain()
        this.delayGain.gain.value = preset.delayMix

        // Build chain: input → EQ → compressor → [reverb dry/wet] → [delay] → output
        this.inputNode.connect(this.eqLow)
        this.eqLow.connect(this.eqMid)
        this.eqMid.connect(this.eqHigh)
        this.eqHigh.connect(this.compressor)

        // Dry path
        this.compressor.connect(this.dryGain)
        this.dryGain.connect(this.outputNode)

        // Reverb wet path
        this.compressor.connect(this.convolver)
        this.convolver.connect(this.reverbGain)
        this.reverbGain.connect(this.outputNode)

        // Delay path
        this.compressor.connect(this.delay)
        this.delay.connect(this.delayFeedback)
        this.delayFeedback.connect(this.delay) // Feedback loop
        this.delay.connect(this.delayGain)
        this.delayGain.connect(this.outputNode)
    }

    disconnect() {
        try {
            this.inputNode.disconnect()
            this.eqLow?.disconnect()
            this.eqMid?.disconnect()
            this.eqHigh?.disconnect()
            this.compressor?.disconnect()
            this.convolver?.disconnect()
            this.reverbGain?.disconnect()
            this.dryGain?.disconnect()
            this.delay?.disconnect()
            this.delayFeedback?.disconnect()
            this.delayGain?.disconnect()
        } catch { /* ignore disconnection errors */ }
    }

    /**
     * Set individual effect parameters in real-time
     */
    setReverbMix(mix: number) {
        if (this.reverbGain) this.reverbGain.gain.value = mix
        if (this.dryGain) this.dryGain.gain.value = 1 - mix
    }

    setDelayMix(mix: number) {
        if (this.delayGain) this.delayGain.gain.value = mix
    }

    setCompression(threshold: number, ratio: number) {
        if (this.compressor) {
            this.compressor.threshold.value = threshold
            this.compressor.ratio.value = ratio
        }
    }
}
