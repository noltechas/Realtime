import { VoiceEffects, DEFAULT_VOICE_EFFECTS } from './VoiceEffectsTypes'
import { PITCH_CORRECTION_PROCESSOR_CODE } from './pitch-correction-worklet'

export class VoiceEffectsEngine {
    private ctx: AudioContext
    private stream: MediaStream | null = null
    private source: MediaStreamAudioSourceNode | null = null

    // Chain nodes
    private inputGain: GainNode

    // Pitch correction (AudioWorklet)
    private pitchCorrectionNode: AudioWorkletNode | null = null
    private pitchCorrectionReady = false
    private pitchCorrectionBypass: GainNode

    private comp: DynamicsCompressorNode

    private eqLow: BiquadFilterNode
    private eqMid: BiquadFilterNode
    private eqHigh: BiquadFilterNode

    // Chorus block
    private chorusIn: GainNode
    private chorusDry: GainNode
    private chorusWet: GainNode
    private chorusDelay: DelayNode
    private chorusLFO: OscillatorNode
    private chorusDepth: GainNode

    // Delay block
    private delayIn: GainNode
    private delayDry: GainNode
    private delayWet: GainNode
    private delayNode: DelayNode
    private delayFeedback: GainNode

    // Reverb block
    private reverbIn: GainNode
    private reverbDry: GainNode
    private reverbWet: GainNode
    private reverbNode: ConvolverNode

    // Distortion block
    private distortionIn: GainNode
    private distortionDry: GainNode
    private distortionWet: GainNode
    private distortionShaper: WaveShaperNode

    // Noise Gate
    private gateGain: GainNode
    private gateAnalyser: AnalyserNode
    private gateRunning = false

    private masterGain: GainNode
    public analyser: AnalyserNode

    private currentReverbConfig = { decay: -1, preDelay: -1 }
    private lastAppliedFx: VoiceEffects | null = null

    // Recording & Playback
    private recorder: MediaRecorder | null = null
    private recordedChunks: Blob[] = []
    private playbackSource: AudioBufferSourceNode | null = null
    private _onPlaybackEnded: (() => void) | null = null

    constructor(ctx: AudioContext | null = null) {
        this.ctx = ctx || new AudioContext({ latencyHint: 'interactive' })

        // 1. Input
        this.inputGain = this.ctx.createGain()

        // 1b. Pitch correction bypass (used until worklet is loaded)
        this.pitchCorrectionBypass = this.ctx.createGain()

        // 2. Compressor
        this.comp = this.ctx.createDynamicsCompressor()

        // 3. EQ (Low shelf, Peaking, High shelf)
        this.eqLow = this.ctx.createBiquadFilter()
        this.eqLow.type = 'lowshelf'
        this.eqLow.frequency.value = 200

        this.eqMid = this.ctx.createBiquadFilter()
        this.eqMid.type = 'peaking'
        this.eqMid.frequency.value = 1500
        this.eqMid.Q.value = 1

        this.eqHigh = this.ctx.createBiquadFilter()
        this.eqHigh.type = 'highshelf'
        this.eqHigh.frequency.value = 5000

        // 4. Chorus (LFO -> Depth -> DelayTime)
        this.chorusIn = this.ctx.createGain()
        this.chorusDry = this.ctx.createGain()
        this.chorusWet = this.ctx.createGain()
        this.chorusDelay = this.ctx.createDelay()
        this.chorusLFO = this.ctx.createOscillator()
        this.chorusDepth = this.ctx.createGain()

        this.chorusLFO.type = 'sine'
        this.chorusLFO.start()
        this.chorusLFO.connect(this.chorusDepth)
        this.chorusDepth.connect(this.chorusDelay.delayTime)

        this.chorusIn.connect(this.chorusDry)
        this.chorusIn.connect(this.chorusDelay)
        this.chorusDelay.connect(this.chorusWet)

        // 5. Delay
        this.delayIn = this.ctx.createGain()
        this.delayDry = this.ctx.createGain()
        this.delayWet = this.ctx.createGain()
        this.delayNode = this.ctx.createDelay(5.0)
        this.delayFeedback = this.ctx.createGain()

        this.delayIn.connect(this.delayDry)
        this.delayIn.connect(this.delayNode)
        this.delayNode.connect(this.delayFeedback)
        this.delayFeedback.connect(this.delayNode)
        this.delayNode.connect(this.delayWet)

        // 6. Reverb
        this.reverbIn = this.ctx.createGain()
        this.reverbDry = this.ctx.createGain()
        this.reverbWet = this.ctx.createGain()
        this.reverbNode = this.ctx.createConvolver()

        this.reverbIn.connect(this.reverbDry)
        this.reverbIn.connect(this.reverbNode)
        this.reverbNode.connect(this.reverbWet)

        // 7. Distortion (WaveShaperNode with dry/wet mix)
        this.distortionIn = this.ctx.createGain()
        this.distortionDry = this.ctx.createGain()
        this.distortionWet = this.ctx.createGain()
        this.distortionShaper = this.ctx.createWaveShaper()
        this.distortionShaper.oversample = '4x'

        this.distortionIn.connect(this.distortionDry)
        this.distortionIn.connect(this.distortionShaper)
        this.distortionShaper.connect(this.distortionWet)

        // 8. Noise Gate (analyser-driven gain)
        this.gateGain = this.ctx.createGain()
        this.gateAnalyser = this.ctx.createAnalyser()
        this.gateAnalyser.fftSize = 256

        // 9. Output & Metering
        this.masterGain = this.ctx.createGain()
        this.masterGain.channelCount = 2
        this.masterGain.channelCountMode = 'explicit'
        this.masterGain.channelInterpretation = 'speakers'
        this.analyser = this.ctx.createAnalyser()
        this.analyser.fftSize = 256

        // Connection Graph:
        // input -> [pitchCorrection OR bypass] -> comp -> eqLow -> eqMid -> eqHigh -> distortionIn
        // distortionDry & distortionWet -> chorusIn
        // chorusDry & chorusWet -> delayIn
        // delayDry & delayWet -> reverbIn
        // reverbDry & reverbWet -> gateGain -> masterGain -> analyser -> destination

        // Initially route through bypass; initPitchCorrection() will reroute through the worklet
        this.inputGain.connect(this.pitchCorrectionBypass)
        this.pitchCorrectionBypass.connect(this.comp)
        this.comp.connect(this.eqLow)
        this.eqLow.connect(this.eqMid)
        this.eqMid.connect(this.eqHigh)
        this.eqHigh.connect(this.distortionIn)

        this.distortionDry.connect(this.chorusIn)
        this.distortionWet.connect(this.chorusIn)

        this.chorusDry.connect(this.delayIn)
        this.chorusWet.connect(this.delayIn)

        this.delayDry.connect(this.reverbIn)
        this.delayWet.connect(this.reverbIn)

        this.reverbDry.connect(this.gateGain)
        this.reverbWet.connect(this.gateGain)

        // Tap the signal before the gate for level detection
        this.inputGain.connect(this.gateAnalyser)

        this.gateGain.connect(this.masterGain)
        this.masterGain.connect(this.analyser)

        // Initialize with default params
        this.apply(DEFAULT_VOICE_EFFECTS)

        // Async: load pitch correction worklet
        this.initPitchCorrection()
    }

    /**
     * Load the pitch correction AudioWorklet processor and insert it into the signal chain.
     * Until this completes, pitch correction is bypassed (signal routes through bypass gain node).
     */
    private async initPitchCorrection() {
        try {
            const blob = new Blob([PITCH_CORRECTION_PROCESSOR_CODE], { type: 'application/javascript' })
            const url = URL.createObjectURL(blob)
            await this.ctx.audioWorklet.addModule(url)
            URL.revokeObjectURL(url)

            this.pitchCorrectionNode = new AudioWorkletNode(this.ctx, 'pitch-correction-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                channelCount: 1,
            })

            // Reroute: inputGain -> pitchCorrection -> comp (replacing bypass)
            this.inputGain.disconnect(this.pitchCorrectionBypass)
            this.pitchCorrectionBypass.disconnect(this.comp)
            this.inputGain.connect(this.pitchCorrectionNode)
            this.pitchCorrectionNode.connect(this.comp)

            this.pitchCorrectionReady = true
            console.log('Pitch correction worklet loaded')

            // Re-send params that were applied before the worklet was ready
            if (this.lastAppliedFx) {
                this.pitchCorrectionNode.port.postMessage({
                    type: 'params',
                    strength: this.lastAppliedFx.pitchCorrection?.enabled ? this.lastAppliedFx.pitchCorrection.strength : 0,
                    key: this.lastAppliedFx.key ?? -1,
                    mode: this.lastAppliedFx.mode ?? 1,
                })
            }
        } catch (err) {
            console.warn('Pitch correction worklet failed to load, using bypass:', err)
            // Bypass remains connected, pitch correction just won't work
        }
    }

    private reverbGenId = 0
    private generateReverbIRAsync(durationMs: number, decayRate: number): void {
        const genId = ++this.reverbGenId
        const sec = durationMs / 1000
        const length = Math.floor(this.ctx.sampleRate * sec)
        const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate)
        const left = impulse.getChannelData(0)
        const right = impulse.getChannelData(1)
        const CHUNK = 16384 // Process in chunks to avoid blocking the main thread
        let offset = 0
        const processChunk = () => {
            if (genId !== this.reverbGenId) return // A newer generation superseded this one
            const end = Math.min(offset + CHUNK, length)
            for (let i = offset; i < end; i++) {
                const n = Math.pow(1 - i / length, decayRate)
                left[i] = (Math.random() * 2 - 1) * n
                right[i] = (Math.random() * 2 - 1) * n
            }
            offset = end
            if (offset < length) {
                setTimeout(processChunk, 0) // Yield to the audio thread
            } else if (genId === this.reverbGenId) {
                this.reverbNode.buffer = impulse
            }
        }
        processChunk()
    }

    public apply(fx: VoiceEffects) {
        const t = this.ctx.currentTime
        this.lastAppliedFx = fx

        // Pitch Correction (via AudioWorklet message port)
        if (this.pitchCorrectionReady && this.pitchCorrectionNode) {
            this.pitchCorrectionNode.port.postMessage({
                type: 'params',
                strength: fx.pitchCorrection?.enabled ? fx.pitchCorrection.strength : 0,
                key: fx.key ?? -1,
                mode: fx.mode ?? 1,
            })
        }

        // Compressor
        if (fx.compressor.enabled) {
            this.comp.threshold.setTargetAtTime(fx.compressor.threshold, t, 0.05)
            this.comp.ratio.setTargetAtTime(fx.compressor.ratio, t, 0.05)
            this.comp.attack.setTargetAtTime(fx.compressor.attack, t, 0.05)
            this.comp.release.setTargetAtTime(fx.compressor.release, t, 0.05)
        } else {
            // Bypass dummy values
            this.comp.threshold.setTargetAtTime(0, t, 0.05)
            this.comp.ratio.setTargetAtTime(1, t, 0.05)
        }

        // EQ
        this.eqLow.gain.setTargetAtTime(fx.eq.enabled ? fx.eq.lowGain : 0, t, 0.05)
        this.eqMid.gain.setTargetAtTime(fx.eq.enabled ? fx.eq.midGain : 0, t, 0.05)
        this.eqHigh.gain.setTargetAtTime(fx.eq.enabled ? fx.eq.highGain : 0, t, 0.05)

        // Chorus
        if (fx.chorus.enabled) {
            this.chorusLFO.frequency.setTargetAtTime(fx.chorus.rate, t, 0.05)
            this.chorusDepth.gain.setTargetAtTime(fx.chorus.depth * 0.01, t, 0.05) // depth scaled to delay ms
            this.chorusDelay.delayTime.setTargetAtTime(0.02, t, 0.05) // base 20ms
            this.chorusDry.gain.setTargetAtTime(1 - (fx.chorus.mix / 100), t, 0.05)
            this.chorusWet.gain.setTargetAtTime(fx.chorus.mix / 100, t, 0.05)
        } else {
            this.chorusDry.gain.setTargetAtTime(1, t, 0.05)
            this.chorusWet.gain.setTargetAtTime(0, t, 0.05)
        }

        // Delay (sync to tempo if possible, or direct ms)
        if (fx.delay.enabled) {
            this.delayNode.delayTime.setTargetAtTime(fx.delay.time / 1000, t, 0.05)
            this.delayFeedback.gain.setTargetAtTime(fx.delay.feedback / 100, t, 0.05)
            this.delayDry.gain.setTargetAtTime(1 - (fx.delay.mix / 100), t, 0.05)
            this.delayWet.gain.setTargetAtTime(fx.delay.mix / 100, t, 0.05)
        } else {
            this.delayFeedback.gain.setTargetAtTime(0, t, 0.05)
            this.delayDry.gain.setTargetAtTime(1, t, 0.05)
            this.delayWet.gain.setTargetAtTime(0, t, 0.05)
        }

        // Reverb
        if (fx.reverb.enabled) {
            const currentDecay = fx.reverb.decay
            const currentPre = fx.reverb.preDelay
            // Regenerate IR if decay changed significantly (expensive, only do if changed)
            if (Math.abs(currentDecay - this.currentReverbConfig.decay) > 0.1 || currentPre !== this.currentReverbConfig.preDelay) {
                this.currentReverbConfig = { decay: currentDecay, preDelay: currentPre }
                this.generateReverbIRAsync(currentDecay * 1000, 3.0)
            }
            this.reverbDry.gain.setTargetAtTime(1 - (fx.reverb.mix / 100), t, 0.05)
            this.reverbWet.gain.setTargetAtTime(fx.reverb.mix / 100, t, 0.05)
        } else {
            this.reverbDry.gain.setTargetAtTime(1, t, 0.05)
            this.reverbWet.gain.setTargetAtTime(0, t, 0.05)
        }

        // Distortion
        if (fx.distortion?.enabled) {
            this.distortionShaper.curve = this.makeDistortionCurve(fx.distortion.drive)
            this.distortionDry.gain.setTargetAtTime(1 - (fx.distortion.mix / 100), t, 0.05)
            this.distortionWet.gain.setTargetAtTime(fx.distortion.mix / 100, t, 0.05)
        } else {
            this.distortionDry.gain.setTargetAtTime(1, t, 0.05)
            this.distortionWet.gain.setTargetAtTime(0, t, 0.05)
        }

        // Noise Gate
        if (fx.noiseGate?.enabled) {
            this.startNoiseGate(fx.noiseGate.threshold)
        } else {
            this.stopNoiseGate()
            this.gateGain.gain.setTargetAtTime(1, t, 0.05)
        }

        // Apply mic level to master gain
        this.masterGain.gain.setTargetAtTime(fx.micLevel !== undefined ? fx.micLevel : 1.0, t, 0.05)
    }

    private makeDistortionCurve(drive: number) {
        const samples = 44100
        const curve = new Float32Array(samples)
        // drive 0-100 maps to a soft-clip amount
        const amount = Math.max(0.01, drive * 2)
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1
            curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x))
        }
        return curve
    }

    private currentGateThreshold = -50
    private startNoiseGate(threshold: number) {
        this.currentGateThreshold = threshold
        if (this.gateRunning) return // already running
        this.gateRunning = true
        const dataArray = new Uint8Array(this.gateAnalyser.frequencyBinCount)
        let lastGateTime = 0
        const GATE_INTERVAL = 33 // ~30Hz — sufficient for smooth gating with setTargetAtTime smoothing
        const gateTick = (now: number) => {
            if (!this.gateRunning) return
            if (now - lastGateTime >= GATE_INTERVAL) {
                lastGateTime = now
                this.gateAnalyser.getByteFrequencyData(dataArray)
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i]
                const rms = Math.sqrt(sum / dataArray.length) / 255
                const db = rms > 0.0001 ? 20 * Math.log10(rms) : -100
                const t = this.ctx.currentTime
                if (db < this.currentGateThreshold) {
                    this.gateGain.gain.setTargetAtTime(0, t, 0.01)
                } else {
                    this.gateGain.gain.setTargetAtTime(1, t, 0.01)
                }
            }
            requestAnimationFrame(gateTick)
        }
        requestAnimationFrame(gateTick)
    }

    private stopNoiseGate() {
        this.gateRunning = false
    }

    public async startLivePreview(deviceId: string, outputId?: string) {
        if (this.ctx.state === 'suspended') await this.ctx.resume()
        try {
            if (outputId && typeof (this.ctx as any).setSinkId === 'function') {
                try {
                    await (this.ctx as any).setSinkId(outputId)
                } catch (e) {
                    console.warn('Failed to set audio string:', e)
                }
            }
            // Force stereo output — mic streams are mono and some devices
            // report mono channel count after setSinkId, causing audio to
            // play only in the left ear.
            this.ctx.destination.channelCount = 2
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: deviceId },
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            })
            this.source = this.ctx.createMediaStreamSource(this.stream)
            this.source.connect(this.inputGain)

            // Connect to output speakers for testing
            this.analyser.connect(this.ctx.destination)
            return true
        } catch (err) {
            console.error('Mic preview error:', err)
            return false
        }
    }

    public stopLivePreview() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop())
            this.stream = null
        }
        if (this.source) {
            this.source.disconnect()
            this.source = null
        }
        try { this.analyser.disconnect(this.ctx.destination) } catch { }
    }

    public getAudioContext() { return this.ctx }
    public getMasterNode() { return this.masterGain }

    public startRecording(): boolean {
        if (!this.stream) return false
        this.recordedChunks = []
        this.recorder = new MediaRecorder(this.stream)
        this.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.recordedChunks.push(e.data)
        }
        this.recorder.start()
        return true
    }

    public stopRecording(): Promise<Blob | null> {
        return new Promise((resolve) => {
            if (!this.recorder || this.recorder.state === 'inactive') {
                resolve(null)
                return
            }
            this.recorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: this.recorder?.mimeType || 'audio/webm' })
                this.recorder = null
                resolve(blob)
            }
            this.recorder.stop()
        })
    }

    public get recording(): boolean {
        return this.recorder?.state === 'recording'
    }

    public async playRecording(blob: Blob, outputDeviceId?: string, onEnded?: () => void): Promise<void> {
        this.stopPlayback()
        try {
            if (this.ctx.state === 'suspended') await this.ctx.resume()
            if (this.ctx.state === 'closed') {
                if (onEnded) onEnded()
                throw new Error('Audio context is closed')
            }

            if (outputDeviceId && typeof (this.ctx as any).setSinkId === 'function') {
                try { await (this.ctx as any).setSinkId(outputDeviceId) } catch {}
            }

            const arrayBuffer = await blob.arrayBuffer()
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer)

            if (this.source) this.source.disconnect()

            this.playbackSource = this.ctx.createBufferSource()
            this.playbackSource.buffer = audioBuffer
            this.playbackSource.connect(this.inputGain)

            try { this.analyser.connect(this.ctx.destination) } catch {}

            this._onPlaybackEnded = onEnded || null
            this.playbackSource.onended = () => {
                this.playbackSource = null
                if (this.source && this.stream) {
                    try { this.source.connect(this.inputGain) } catch {}
                }
                if (this._onPlaybackEnded) this._onPlaybackEnded()
            }

            this.playbackSource.start()
        } catch (err) {
            console.error('Playback failed:', err)
            if (onEnded) onEnded()
            throw err
        }
    }

    public stopPlayback(): void {
        if (this.playbackSource) {
            try { this.playbackSource.stop() } catch {}
            try { this.playbackSource.disconnect() } catch {}
            this.playbackSource = null
        }
        if (this.source && this.stream) {
            try { this.source.connect(this.inputGain) } catch {}
        }
    }

    public get playing(): boolean {
        return this.playbackSource !== null
    }

    public destroy() {
        this.stopPlayback()
        this.stopLivePreview()
        this.stopNoiseGate()
        if (this.pitchCorrectionNode) {
            try { this.pitchCorrectionNode.disconnect() } catch { /* ignore */ }
            this.pitchCorrectionNode = null
        }
        this.ctx.close()
    }
}
