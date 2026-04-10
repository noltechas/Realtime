import { VoiceEffects, DEFAULT_VOICE_EFFECTS } from './VoiceEffectsTypes'
import { PITCH_CORRECTION_PROCESSOR_CODE } from './pitch-correction-worklet'

/**
 * EMERGENCY DIAGNOSTIC: set to `true` to disable the pitch correction
 * worklet entirely. The engine will use the bypass gain node instead.
 * When disabled, autotune does not work, but the rest of the voice
 * effects chain continues to function.
 *
 * We confirmed the blank-screen renderer crash was NOT the worklet —
 * it was `decodeAudioData` in Chromium 120's native MP3 decoder. With
 * vocal playback and recording now going through HTMLAudioElement +
 * MediaElementAudioSourceNode (which bypasses decodeAudioData), the
 * worklet is safe to re-enable.
 *
 * Toggle this back to `true` if you see the crash return — it'll let
 * you rule the worklet in or out again.
 */
const DISABLE_PITCH_CORRECTION_WORKLET = false

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
    private playbackAudio: HTMLAudioElement | null = null
    private playbackSourceNode: MediaElementAudioSourceNode | null = null
    private playbackBlobUrl: string | null = null
    private _onPlaybackEnded: (() => void) | null = null

    // Dev test harness (synthesized signals + downloaded vocal samples)
    // For vocal samples we deliberately use HTMLAudioElement +
    // MediaElementAudioSourceNode instead of decodeAudioData: the latter
    // has been observed to crash Electron 28 / Chromium 120 with SIGSEGV
    // on specific MP3 files, whereas the HTMLMediaElement pipeline (same
    // path AudioEngine.ts uses for song playback) is stable.
    private testSource: OscillatorNode | AudioBufferSourceNode | null = null
    private testSweepBuffer: AudioBuffer | null = null
    private testVowelBuffer: AudioBuffer | null = null
    // Vocal sample playback (HTMLAudioElement-based):
    private vocalAudio: HTMLAudioElement | null = null
    private vocalMediaSource: MediaElementAudioSourceNode | null = null
    private vocalLoopHandler: (() => void) | null = null
    // MediaElementAudioSourceNode can only be created ONCE per HTMLAudioElement,
    // and that node stays bound to the element for its lifetime. Cache both
    // together so re-selecting the same sample doesn't re-wire the graph.
    private vocalMediaCache: Map<string, {
        audio: HTMLAudioElement
        source: MediaElementAudioSourceNode
    }> = new Map()

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

        // Connection Graph (compressor BEFORE pitch correction so the shifter
        // sees a level-controlled signal with consistent dynamics — improves
        // peak tracking robustness and keeps the shifter from amplifying
        // quantization noise through makeup gain):
        //
        // input -> comp -> [pitchCorrection OR bypass] -> eqLow -> eqMid -> eqHigh -> distortionIn
        // distortionDry & distortionWet -> chorusIn
        // chorusDry & chorusWet -> delayIn
        // delayDry & delayWet -> reverbIn
        // reverbDry & reverbWet -> gateGain -> masterGain -> analyser -> destination

        // Initially route through bypass; initPitchCorrection() will reroute through the worklet
        this.inputGain.connect(this.comp)
        this.comp.connect(this.pitchCorrectionBypass)
        this.pitchCorrectionBypass.connect(this.eqLow)
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

        // Async: load pitch correction worklet (unless emergency-disabled)
        if (DISABLE_PITCH_CORRECTION_WORKLET) {
            console.warn(
                '[VoiceEffectsEngine] ⚠️ Pitch correction worklet DISABLED via ' +
                'DISABLE_PITCH_CORRECTION_WORKLET flag. Audio will flow through ' +
                'the bypass node (no autotune). Flip the flag to false in ' +
                'VoiceEffectsEngine.ts once the crash is resolved.'
            )
        } else {
            this.initPitchCorrection()
        }
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

            // Reroute: comp -> pitchCorrection -> eqLow (replacing bypass node)
            this.comp.disconnect(this.pitchCorrectionBypass)
            this.pitchCorrectionBypass.disconnect(this.eqLow)
            this.comp.connect(this.pitchCorrectionNode)
            this.pitchCorrectionNode.connect(this.eqLow)

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

    /**
     * Play back a recorded blob through the voice-effects chain.
     *
     * Uses HTMLAudioElement + MediaElementAudioSourceNode instead of
     * decodeAudioData + AudioBufferSourceNode because decodeAudioData
     * has been observed to crash Electron 28 / Chromium 120 with SIGSEGV
     * on certain media formats (specifically, WebM/Opus produced by
     * MediaRecorder on macOS has shown this behavior). HTMLAudioElement
     * uses a different Chromium decoder path that is crash-safe.
     *
     * NOTE: we also intentionally do NOT call setSinkId here. Switching
     * the audio output sink during an active signal chain has also been
     * a crash source.
     */
    public async playRecording(blob: Blob, _outputDeviceId?: string, onEnded?: () => void): Promise<void> {
        this.stopPlayback()
        try {
            if (this.ctx.state === 'suspended') {
                try { await this.ctx.resume() } catch (e) { console.warn('ctx.resume() failed:', e) }
            }
            if (this.ctx.state === 'closed') {
                if (onEnded) onEnded()
                throw new Error('Audio context is closed')
            }

            // Build a blob URL for the HTMLAudioElement. Revoke the previous
            // one if any.
            if (this.playbackBlobUrl) {
                try { URL.revokeObjectURL(this.playbackBlobUrl) } catch { /* ignore */ }
                this.playbackBlobUrl = null
            }
            const blobUrl = URL.createObjectURL(blob)
            this.playbackBlobUrl = blobUrl

            const audio = new Audio()
            audio.src = blobUrl
            audio.preload = 'auto'

            await new Promise<void>((resolve, reject) => {
                const cleanup = () => {
                    audio.removeEventListener('canplay', onReady)
                    audio.removeEventListener('canplaythrough', onReady)
                    audio.removeEventListener('error', onError)
                    if (timer) clearTimeout(timer)
                }
                const onReady = () => { cleanup(); resolve() }
                const onError = () => { cleanup(); reject(new Error('Recording blob failed to load')) }
                audio.addEventListener('canplay', onReady, { once: true })
                audio.addEventListener('canplaythrough', onReady, { once: true })
                audio.addEventListener('error', onError, { once: true })
                const timer = setTimeout(() => { cleanup(); reject(new Error('Recording load timed out')) }, 5000)
                audio.load()
            })

            if (this.source) {
                try { this.source.disconnect() } catch { /* ignore */ }
            }

            const mediaSource = this.ctx.createMediaElementSource(audio)
            mediaSource.connect(this.inputGain)

            try { this.analyser.connect(this.ctx.destination) } catch { /* ignore */ }

            this._onPlaybackEnded = onEnded || null
            audio.addEventListener('ended', () => {
                this.stopPlayback()
                if (this._onPlaybackEnded) this._onPlaybackEnded()
            }, { once: true })

            this.playbackAudio = audio
            this.playbackSourceNode = mediaSource

            await audio.play()
        } catch (err) {
            console.error('Playback failed:', err)
            if (this.playbackBlobUrl) {
                try { URL.revokeObjectURL(this.playbackBlobUrl) } catch { /* ignore */ }
                this.playbackBlobUrl = null
            }
            if (onEnded) onEnded()
            throw err
        }
    }

    public stopPlayback(): void {
        if (this.playbackAudio) {
            try { this.playbackAudio.pause() } catch { /* ignore */ }
            try { this.playbackAudio.src = '' } catch { /* ignore */ }
            this.playbackAudio = null
        }
        if (this.playbackSourceNode) {
            try { this.playbackSourceNode.disconnect() } catch { /* ignore */ }
            this.playbackSourceNode = null
        }
        if (this.playbackBlobUrl) {
            try { URL.revokeObjectURL(this.playbackBlobUrl) } catch { /* ignore */ }
            this.playbackBlobUrl = null
        }
        // Legacy buffer-source path (kept in case anything still uses it)
        if (this.playbackSource) {
            try { this.playbackSource.stop() } catch { /* ignore */ }
            try { this.playbackSource.disconnect() } catch { /* ignore */ }
            this.playbackSource = null
        }
        if (this.source && this.stream) {
            try { this.source.connect(this.inputGain) } catch { /* ignore */ }
        }
    }

    public get playing(): boolean {
        return this.playbackSource !== null || this.playbackAudio !== null
    }

    // ════════════════════════════════════════════════════════════════════
    // Dev Test Harness
    // ════════════════════════════════════════════════════════════════════
    // Plays a synthesized test signal (sine / sweep / vowel) through the
    // full voice-effects chain so the user can verify pitch-correction
    // quality without needing a microphone. Stays in the app as a
    // permanent dev/QA tool.

    public async startTestPreview(
        signalType: 'sine' | 'sweep' | 'vowel' | 'sample',
        options?: {
            sampleUrl?: string
            outputId?: string
            // For 'sample' signals, optionally play only a sub-segment of the
            // file on loop. Useful for vocal stems where we only want a
            // 10-15 second melodic phrase. Both are in seconds.
            loopStart?: number
            loopEnd?: number
        },
    ): Promise<boolean> {
        // NOTE: we deliberately DON'T call setSinkId here. Switching the
        // audio output sink via setSinkId has been observed to crash the
        // Electron renderer when combined with dynamic signal-chain changes.
        // The test will play out the system default audio output.
        if (this.ctx.state === 'suspended') {
            try { await this.ctx.resume() } catch (e) { console.warn('ctx.resume() failed:', e) }
        }

        // Wait for the pitch correction worklet to be ready (unless
        // emergency-disabled). The test harness is always entered via
        // user click, so the constructor has had plenty of time, but
        // if someone clicks very fast we need to give it a chance to
        // finish loading before we start feeding it audio. Poll up to 2s.
        if (!DISABLE_PITCH_CORRECTION_WORKLET) {
            const workletDeadline = Date.now() + 2000
            while (!this.pitchCorrectionReady && Date.now() < workletDeadline) {
                await new Promise(r => setTimeout(r, 50))
            }
            if (!this.pitchCorrectionReady) {
                console.warn('[VoiceEffectsEngine] Pitch correction worklet not ready after 2s — proceeding with bypass path')
            }
        }

        try {
            // Don't touch destination.channelCount here — Electron's default
            // is already correct and mutating it during a live graph has
            // been a crash source historically.

            // Stop any existing test source or mic
            this.stopTestPreview()
            if (this.source) {
                try { this.source.disconnect() } catch { /* ignore */ }
            }

            if (signalType === 'sine') {
                const osc = this.ctx.createOscillator()
                osc.type = 'sine'
                osc.frequency.value = 440
                osc.connect(this.inputGain)
                osc.start()
                this.testSource = osc
            } else if (signalType === 'sample') {
                // Vocal samples: HTMLAudioElement + MediaElementAudioSourceNode.
                // We do NOT use fetch + decodeAudioData + AudioBufferSourceNode
                // because decodeAudioData has been observed to crash the
                // Electron renderer (SIGSEGV / exit code 11) on specific MP3s.
                if (!options?.sampleUrl) {
                    console.error('startTestPreview: signalType=sample requires options.sampleUrl')
                    return false
                }
                const entry = await this.loadVocalSampleMedia(options.sampleUrl)
                const { audio, source } = entry

                // Clamp the segment window to the actual audio duration so
                // we never seek past the end of the file.
                const duration = isFinite(audio.duration) ? audio.duration : 60
                let loopStart = 0
                let loopEnd = duration
                if (options.loopStart !== undefined && options.loopStart >= 0) {
                    loopStart = Math.min(options.loopStart, Math.max(0, duration - 0.1))
                }
                if (options.loopEnd !== undefined && options.loopEnd > 0) {
                    loopEnd = Math.min(options.loopEnd, duration)
                    if (loopEnd <= loopStart) loopEnd = duration
                }

                // HTMLAudioElement has a `loop` property but it only loops
                // the whole file end-to-end. For segment looping we use a
                // timeupdate listener that jumps back to loopStart whenever
                // playback passes loopEnd.
                audio.loop = false
                audio.currentTime = loopStart
                const loopHandler = () => {
                    if (audio.currentTime >= loopEnd || audio.ended) {
                        audio.currentTime = loopStart
                        if (audio.paused) {
                            audio.play().catch(err => {
                                console.warn('Vocal sample loop restart failed:', err)
                            })
                        }
                    }
                }
                audio.addEventListener('timeupdate', loopHandler)

                // Connect to the effects graph. Each MediaElementAudioSourceNode
                // is cached per-audio-element, so reconnecting is safe: Web
                // Audio ignores redundant connect() calls between the same
                // source and destination.
                try {
                    source.connect(this.inputGain)
                } catch (connErr) {
                    console.warn('Vocal sample source.connect() threw:', connErr)
                }

                try {
                    await audio.play()
                } catch (playErr) {
                    console.error('HTMLAudioElement.play() failed:', playErr)
                    audio.removeEventListener('timeupdate', loopHandler)
                    try { source.disconnect(this.inputGain) } catch { /* ignore */ }
                    return false
                }

                this.vocalAudio = audio
                this.vocalMediaSource = source
                this.vocalLoopHandler = loopHandler
            } else {
                // 'sweep' | 'vowel' — synthesized buffers, safe to use
                // AudioBufferSourceNode because we build the AudioBuffer
                // in JS (no MP3 decoder involvement).
                let buf: AudioBuffer
                if (signalType === 'sweep') {
                    if (!this.testSweepBuffer) this.testSweepBuffer = this.generateSweepBuffer()
                    buf = this.testSweepBuffer
                } else {
                    if (!this.testVowelBuffer) this.testVowelBuffer = this.generateVowelBuffer()
                    buf = this.testVowelBuffer
                }
                const src = this.ctx.createBufferSource()
                src.buffer = buf
                src.loop = true
                src.connect(this.inputGain)
                try {
                    src.start(0)
                } catch (startErr) {
                    console.error('BufferSource.start() failed:', startErr)
                    try { src.disconnect() } catch { /* ignore */ }
                    return false
                }
                this.testSource = src
            }

            try { this.analyser.connect(this.ctx.destination) } catch { /* ignore */ }
            return true
        } catch (err) {
            console.error('Test preview start failed:', err)
            return false
        }
    }

    /**
     * Downmix a (possibly stereo) AudioBuffer to a new mono AudioBuffer by
     * averaging channels. Used to ensure the voice-effects chain always
     * receives a single-channel input, avoiding Electron crash paths where
     * implicit channel conversion through an AudioWorkletNode with
     * explicit channel settings misbehaves.
     */
    private toMonoBuffer(buf: AudioBuffer): AudioBuffer {
        if (buf.numberOfChannels === 1) return buf
        const mono = this.ctx.createBuffer(1, buf.length, buf.sampleRate)
        const out = mono.getChannelData(0)
        const nCh = buf.numberOfChannels
        for (let ch = 0; ch < nCh; ch++) {
            const data = buf.getChannelData(ch)
            for (let i = 0; i < buf.length; i++) {
                out[i] += data[i] / nCh
            }
        }
        return mono
    }

    /**
     * Load a vocal sample via HTMLAudioElement (NOT decodeAudioData).
     *
     * decodeAudioData has been observed to crash the Electron 28 / Chromium 120
     * renderer with SIGSEGV (exitCode 11) on specific MP3 files. The crash is
     * in Chromium's native MP3 decoder and happens before any JS catch can
     * intercept it. HTMLAudioElement uses a different decoding path in
     * Chromium (the same path AudioEngine.ts already uses for song playback
     * in this app) and does NOT trigger the crash.
     *
     * Returns an object containing the HTMLAudioElement and its bound
     * MediaElementAudioSourceNode. Both are cached so selecting the same
     * sample twice reuses the existing nodes.
     */
    private async loadVocalSampleMedia(
        url: string,
    ): Promise<{ audio: HTMLAudioElement; source: MediaElementAudioSourceNode }> {
        const cached = this.vocalMediaCache.get(url)
        if (cached) return cached

        console.log('[VoiceEffectsEngine] Loading vocal sample (HTMLAudioElement):', url)
        const audio = new Audio()
        audio.crossOrigin = 'anonymous'
        audio.preload = 'auto'
        audio.src = url

        // Wait until the element has enough buffered audio to start playback.
        // 'canplaythrough' is optimistic but fastest; if it never fires within
        // a reasonable timeout, fall back to 'canplay' or time out.
        await new Promise<void>((resolve, reject) => {
            const onReady = () => {
                cleanup()
                resolve()
            }
            const onError = () => {
                cleanup()
                reject(new Error('HTMLAudioElement failed to load: ' + url))
            }
            const cleanup = () => {
                audio.removeEventListener('canplay', onReady)
                audio.removeEventListener('canplaythrough', onReady)
                audio.removeEventListener('error', onError)
                if (timer) clearTimeout(timer)
            }
            audio.addEventListener('canplay', onReady, { once: true })
            audio.addEventListener('canplaythrough', onReady, { once: true })
            audio.addEventListener('error', onError, { once: true })
            // 5 second timeout
            const timer = setTimeout(() => {
                cleanup()
                reject(new Error('HTMLAudioElement load timed out: ' + url))
            }, 5000)
            audio.load()
        })

        console.log(
            '[VoiceEffectsEngine] HTMLAudioElement ready:',
            url,
            'duration=' + audio.duration.toFixed(2) + 's',
        )

        // createMediaElementSource can only be called ONCE per audio element.
        // The returned source stays bound to the element for its lifetime.
        const source = this.ctx.createMediaElementSource(audio)
        const entry = { audio, source }
        this.vocalMediaCache.set(url, entry)
        return entry
    }

    public stopTestPreview() {
        if (this.testSource) {
            try { (this.testSource as any).stop() } catch { /* ignore */ }
            try { this.testSource.disconnect() } catch { /* ignore */ }
            this.testSource = null
        }
        if (this.vocalAudio) {
            try { this.vocalAudio.pause() } catch { /* ignore */ }
            if (this.vocalLoopHandler) {
                try { this.vocalAudio.removeEventListener('timeupdate', this.vocalLoopHandler) } catch { /* ignore */ }
            }
            // IMPORTANT: do NOT call vocalMediaSource.disconnect() fully —
            // MediaElementAudioSourceNode stays bound to its audio element
            // and the cached pair must remain intact for next use. Instead
            // disconnect only from inputGain so the signal path breaks.
            if (this.vocalMediaSource) {
                try { this.vocalMediaSource.disconnect(this.inputGain) } catch { /* ignore */ }
            }
            this.vocalAudio = null
            this.vocalMediaSource = null
            this.vocalLoopHandler = null
        }
        try { this.analyser.disconnect(this.ctx.destination) } catch { /* ignore */ }
    }

    public get testing(): boolean {
        return this.testSource !== null
    }

    /**
     * Override the pitch-correction ratio in the worklet for deterministic
     * testing. Pass `null` to restore normal YIN + scale-snap behavior.
     * When set, the override bypasses smoothing and dead zone so the test
     * signal is shifted by exactly the requested ratio.
     */
    public setDebugRatioOverride(ratio: number | null) {
        if (this.pitchCorrectionReady && this.pitchCorrectionNode) {
            this.pitchCorrectionNode.port.postMessage({ type: 'debugRatio', ratio })
        }
    }

    /**
     * Build a looping 5-second linear frequency sweep from 220 Hz to 880 Hz.
     * Used for verifying continuous pitch-change behavior (no clicks / warbles).
     */
    private generateSweepBuffer(): AudioBuffer {
        const sr = this.ctx.sampleRate
        const dur = 5
        const len = Math.floor(sr * dur)
        const buf = this.ctx.createBuffer(1, len, sr)
        const data = buf.getChannelData(0)
        const f0 = 220
        const f1 = 880
        // Linear-frequency sweep (phase integral of linear freq = f0*t + (f1-f0)*t^2/(2*dur))
        let phase = 0
        for (let i = 0; i < len; i++) {
            const t = i / sr
            const f = f0 + (f1 - f0) * (t / dur)
            phase += (2 * Math.PI * f) / sr
            data[i] = 0.5 * Math.sin(phase)
        }
        return buf
    }

    /**
     * Build a 2-second looping synthesized "ah" vowel at 200 Hz F0 with
     * formant-shaped harmonic amplitudes (F1 ≈ 730, F2 ≈ 1090, F3 ≈ 2440 Hz)
     * and mild 5 Hz vibrato. This is the most important test signal: it
     * has a clear fundamental + rich harmonic structure and realistic vocal
     * spectrum, which exercises the phase vocoder's peak tracking and
     * reveals phasiness / underwater artifacts.
     */
    private generateVowelBuffer(): AudioBuffer {
        const sr = this.ctx.sampleRate
        const dur = 2
        const len = Math.floor(sr * dur)
        const buf = this.ctx.createBuffer(1, len, sr)
        const data = buf.getChannelData(0)

        const F0 = 200 // fundamental
        const nHarmonics = 20
        // Typical male "ah" formant frequencies and bandwidths (Hz)
        const formants = [730, 1090, 2440, 3400]
        const bandwidths = [80, 100, 150, 200]
        const formantGains = [1.0, 0.7, 0.35, 0.15]

        // Compute each harmonic's static amplitude via sum of Gaussians at formants
        const harmonicAmp = (f: number): number => {
            let amp = 0
            for (let fi = 0; fi < formants.length; fi++) {
                const diff = (f - formants[fi]) / bandwidths[fi]
                amp += formantGains[fi] * Math.exp(-diff * diff)
            }
            return amp
        }

        // Precompute amplitudes and a slight 1/n rolloff so lower harmonics
        // dominate (matches a glottal source spectrum)
        const amps = new Float32Array(nHarmonics + 1)
        let maxAmp = 0
        for (let h = 1; h <= nHarmonics; h++) {
            const f = h * F0
            amps[h] = harmonicAmp(f) / h
            if (amps[h] > maxAmp) maxAmp = amps[h]
        }
        for (let h = 1; h <= nHarmonics; h++) amps[h] /= maxAmp // normalize

        // Synthesize with 5 Hz vibrato (~2% depth), gentle attack/release
        // to make looping seamless
        const phases = new Float32Array(nHarmonics + 1)
        for (let i = 0; i < len; i++) {
            const t = i / sr
            const vibrato = 1 + 0.02 * Math.sin(2 * Math.PI * 5 * t)
            const f0Now = F0 * vibrato

            let s = 0
            for (let h = 1; h <= nHarmonics; h++) {
                const f = h * f0Now
                if (f > sr * 0.45) continue // avoid aliasing near Nyquist
                phases[h] += (2 * Math.PI * f) / sr
                s += amps[h] * Math.sin(phases[h])
            }

            // Envelope: tiny fade in/out at loop edges so the loop point
            // doesn't click
            let env = 0.45
            const fadeLen = Math.floor(sr * 0.02) // 20ms fade
            if (i < fadeLen) env *= i / fadeLen
            else if (i > len - fadeLen) env *= (len - i) / fadeLen
            data[i] = s * env
        }
        return buf
    }

    public destroy() {
        this.stopPlayback()
        this.stopLivePreview()
        this.stopTestPreview()
        this.stopNoiseGate()
        // Tear down any cached HTMLAudioElements + their media sources.
        for (const { audio, source } of this.vocalMediaCache.values()) {
            try { audio.pause() } catch { /* ignore */ }
            try { audio.src = '' } catch { /* ignore */ }
            try { source.disconnect() } catch { /* ignore */ }
        }
        this.vocalMediaCache.clear()
        if (this.pitchCorrectionNode) {
            try { this.pitchCorrectionNode.disconnect() } catch { /* ignore */ }
            this.pitchCorrectionNode = null
        }
        this.ctx.close()
    }
}
