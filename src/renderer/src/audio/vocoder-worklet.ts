/**
 * Vocoder AudioWorklet Processor — v7 (DIAGNOSTIC: broadband, no per-band).
 *
 * After v3/v4/v5/v6, the user reported every full vocoder version produced
 * the same harsh buzz, while v6 passthrough was clean. That means the bug
 * is in some part of the per-band DSP I kept rewriting. Rather than keep
 * iterating on the full design, this is a scientific isolation: the
 * SIMPLEST POSSIBLE vocoder, with NO per-band processing at all.
 *
 * Signal flow:
 *
 *   modulator (voice) ── |x| ── 1-pole LPF (30 ms) ── env (single value) ──┐
 *                                                                            │
 *   carrier (saw+sine chord, key+mode+voicing driven) ─────────────── × ── makeup ── tanh ──┐
 *                                                                                            │
 *   modulator (voice, dry) ──────────────────────────────────────────────────────────────── mix ── output
 *
 * Expected sonic result of v7 (NOT a talkbox — diagnostic only):
 *   - A synth chord at the song's key/mode that gets louder when you speak
 *     and softer when you stop. Like a side-chained chord.
 *   - NO vowel character (a/e/i/o all sound the same — broadband envelope)
 *   - Clean tonal output (NOT buzz/static)
 *
 * If v7 sounds buzzy → the bug is in the carrier generation or env*carrier
 *   multiplication. We'll need to change the carrier (sine instead of saw,
 *   different register, etc).
 * If v7 sounds clean → the bug was specifically in the per-band BPF stage.
 *   v8 will add per-band processing carefully, with knowledge of what works.
 *
 * Parameters (via MessagePort, all optional):
 *   { type: 'params',
 *     enabled:    boolean,
 *     mix:        number,  // 0-100 (% wet)
 *     brightness: number,  // 0-100 (0 = pure sine, 100 = pure saw)
 *     sibilance:  number,  // accepted but unused in v7
 *     voicing:    'triad' | 'power' | 'octaves',
 *     key:        number,  // 0-11 (C=0..B=11), -1 = chromatic → defaults to C
 *     mode:       number   // 0 = minor, 1 = major
 *   }
 */

export const VOCODER_PROCESSOR_CODE = `
'use strict';

class VocoderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        try { console.log('[Vocoder Worklet] v18: v12 + ONE F1 peaking EQ, continuous coeff updates'); } catch (e) {}

        // ── Parameters ──────────────────────────────────────────────────
        this._enabled = false;
        this._mix = 0;
        this._brightness = 0.5;
        this._sibilance = 0;
        this._voicing = 'triad';
        this._key = 0;
        this._mode = 1;

        // Mix smoothing (10 ms one-pole) so slider drags don't zipper.
        this._mixSmooth = 0;
        this._mixSmoothCoef = Math.exp(-1 / (0.001 * 10 * sampleRate));

        // ── Single broadband envelope follower (kept for bypass-fast-path) ──
        this._env = 0;
        this._envCoef = Math.exp(-1 / (0.001 * 30 * sampleRate));

        // ── Per-band analysis (channel vocoder) ──────────────────────────
        // The voice is split into bands, an envelope is followed per band,
        // and the same band-split of the carrier is multiplied by each
        // band's envelope. Summed across bands, the output has the carrier's
        // harmonic content shaped by the voice's spectral envelope — i.e.
        // the carrier chord "says" the voice's vowels.
        //
        // IMPORTANT: _numBands MUST precede every Float32Array(this._numBands)
        // below. An earlier version allocated _carEnergy before _numBands and
        // produced NaN-corrupted output.
        // 6 bands placed near voice formant regions (not log-spaced):
        //   chord-fundamental support (400 Hz)
        //   F1 region (700 Hz — open vowels "ah", "aw")
        //   F1-F2 transition (1100 Hz)
        //   F2 region (1700 Hz — front vowels "ee", "i")
        //   F3 region (2500 Hz)
        //   sibilance/brilliance (4000 Hz)
        // v3-v15 used 16 log-spaced bands which created tonal clusters at
        // band centers that summed into a "ringing buzz" character that
        // the user reported regardless of Q, envelope style, or makeup gain.
        this._numBands = 6;
        this._bandFreqs = new Float32Array([400, 700, 1100, 1700, 2500, 4000]);
        // Q=1.4 → each band's bandwidth = fc/1.4 ≈ 71% of fc, so adjacent
        // bands overlap heavily and there are no notches between them.
        // Wider/smoother than v15's Q=3, less resonant ringing.
        this._bandQ = 1.4;

        // Biquad BPF coefficients per band (cookbook constant-skirt-gain).
        this._b0 = new Float32Array(this._numBands);
        this._b2 = new Float32Array(this._numBands);
        this._a1 = new Float32Array(this._numBands);
        this._a2 = new Float32Array(this._numBands);
        this._computeFilterCoeffs();

        // Modulator BPF state (DF1: x[n-1], x[n-2], y[n-1], y[n-2]).
        this._modX1 = new Float32Array(this._numBands);
        this._modX2 = new Float32Array(this._numBands);
        this._modY1 = new Float32Array(this._numBands);
        this._modY2 = new Float32Array(this._numBands);

        // Carrier BPF state.
        this._carX1 = new Float32Array(this._numBands);
        this._carX2 = new Float32Array(this._numBands);
        this._carY1 = new Float32Array(this._numBands);
        this._carY2 = new Float32Array(this._numBands);

        // Per-band envelope follower: |x| through 30 ms LPF (sub-audio).
        this._envPerBand = new Float32Array(this._numBands);
        this._envBandCoef = Math.exp(-1 / (0.001 * 30 * sampleRate));

        // ── Peaking EQ on the broadband carrier ───────────────────────
        // v17 changes algorithm. Instead of slicing the carrier into bands
        // and re-summing (which produced "ringing buzz" no matter how we
        // tuned it), we keep the carrier whole and pass it through a
        // cascade of 6 peaking biquad EQs. Each EQ's gain is driven by
        // that band's voice envelope, but ONLY AS CUTS (0 → -6 dB). So
        // bands the voice has no energy in get cut on the carrier;
        // bands voice has energy in pass through. The carrier's spectrum
        // is shaped by the voice's spectral envelope — talkbox-like —
        // without ever slicing/resumming the carrier itself.
        //
        // Cuts-only is critical: cascaded peaking EQs with boosts compound
        // (cascade dB = sum of dB), so 6 × +6 dB = +36 dB peaks that would
        // tanh-saturate. Cuts only means the cascade output ≤ carrier.
        this._eqPeakQ = 1.4;
        this._eqMaxCutDb = 6;
        this._eqUpdateInterval = 32;
        this._eqUpdateCounter = 0;
        // Pre-compute trig values per band (fc doesn't change).
        this._eqSinW = new Float32Array(this._numBands);
        this._eqCosW = new Float32Array(this._numBands);
        // Dynamic coefficients per band (updated when gains change).
        this._eqB0 = new Float32Array(this._numBands);
        this._eqB1 = new Float32Array(this._numBands);
        this._eqB2 = new Float32Array(this._numBands);
        this._eqA1 = new Float32Array(this._numBands);
        this._eqA2 = new Float32Array(this._numBands);
        // Per-band peaking EQ filter state (the cascade is applied in series).
        this._eqX1 = new Float32Array(this._numBands);
        this._eqX2 = new Float32Array(this._numBands);
        this._eqY1 = new Float32Array(this._numBands);
        this._eqY2 = new Float32Array(this._numBands);
        for (let b = 0; b < this._numBands; b++) {
            const w0 = 2 * Math.PI * this._bandFreqs[b] / sampleRate;
            this._eqSinW[b] = Math.sin(w0);
            this._eqCosW[b] = Math.cos(w0);
            // Initialize all EQs to 0 dB (unity).
            this._setEqGain(b, 0);
        }

        // ── Carrier oscillators ──
        // Up to 4 voices for the chord. PolyBLEP-corrected saw blended with
        // a sine via 'brightness' (0 = pure sine, 1 = pure saw).
        this._MAX_OSCS = 4;
        this._oscPhases = new Float32Array(this._MAX_OSCS);
        this._oscFreqs  = new Float32Array(this._MAX_OSCS);
        this._numOscs = 0;
        // Spread initial phases so the chord doesn't open with all voices
        // crossing zero simultaneously (would sound like one note tripled).
        for (let i = 0; i < this._MAX_OSCS; i++) {
            this._oscPhases[i] = i * 0.31;
        }
        this._updateChord();

        // ── Param dispatch from main thread ──
        this.port.onmessage = (e) => {
            const d = e.data;
            if (!d || d.type !== 'params') return;
            if (typeof d.enabled    === 'boolean') this._enabled    = d.enabled;
            if (typeof d.mix        === 'number')  this._mix        = Math.max(0, Math.min(1, d.mix / 100));
            if (typeof d.brightness === 'number')  this._brightness = Math.max(0, Math.min(1, d.brightness / 100));
            if (typeof d.sibilance  === 'number')  this._sibilance  = Math.max(0, Math.min(1, d.sibilance / 100));
            if (typeof d.voicing    === 'string')  this._voicing    = d.voicing;
            if (typeof d.key        === 'number')  this._key        = d.key;
            if (typeof d.mode       === 'number')  this._mode       = d.mode;
            this._updateChord();
        };
    }

    /**
     * Build chord notes from { key, mode, voicing }. Root at MIDI 48 (C3)
     * plus the key offset, so D minor (key 2, mode 0) chord starts at D3.
     */
    _updateChord() {
        const key = (this._key >= 0 && this._key <= 11) ? this._key : 0;
        // Root at MIDI 60 (C4) + key offset. v3-v11 used MIDI 48 (C3) but
        // at C3 register a saw chord's harmonics beat heavily — D3=147Hz's
        // 3rd harmonic at 441Hz collides with A3=220Hz's 2nd at 440Hz,
        // and D4=294's fundamental collides with D3's 2nd at 294. That
        // beat-frequency density was the source of the harsh buzz across
        // v3-v8. C4-register chord (D minor at D4-D5) keeps harmonics
        // spaced further apart and sounds clean even with saw content.
        const rootMidi = 60 + key;
        const third = (this._mode === 0) ? 3 : 4;
        const fifth = 7;
        const octave = 12;

        let semis;
        if (this._voicing === 'octaves') {
            semis = [0, octave];
        } else if (this._voicing === 'power') {
            semis = [0, fifth, octave];
        } else {
            semis = [0, third, fifth, octave];
        }

        this._numOscs = semis.length;
        for (let i = 0; i < this._numOscs; i++) {
            const midi = rootMidi + semis[i];
            this._oscFreqs[i] = 440 * Math.pow(2, (midi - 69) / 12);
        }
    }

    /**
     * PolyBLEP correction for a sawtooth at phase t with step dt.
     * Smooths the discontinuity at phase wrap so the saw is band-limited.
     * Välimäki & Huovilainen 2007.
     */
    _polyBlep(t, dt) {
        if (t < dt) {
            const x = t / dt;
            return x + x - x * x - 1;
        } else if (t > 1 - dt) {
            const x = (t - 1) / dt;
            return x * x + x + x + 1;
        }
        return 0;
    }

    /**
     * Set the peaking biquad EQ gain (in dB) for band b. Recomputes the
     * filter coefficients in place. fc and Q are fixed per band; only the
     * gain varies based on the per-band voice envelope.
     * Cookbook formulas (Audio EQ Cookbook by R. Bristow-Johnson).
     */
    _setEqGain(b, gainDb) {
        const A = Math.pow(10, gainDb / 40);
        const sinW = this._eqSinW[b];
        const cosW = this._eqCosW[b];
        const alpha = sinW / (2 * this._eqPeakQ);
        const a0 = 1 + alpha / A;
        this._eqB0[b] = (1 + alpha * A) / a0;
        this._eqB1[b] = (-2 * cosW) / a0;
        this._eqB2[b] = (1 - alpha * A) / a0;
        this._eqA1[b] = (-2 * cosW) / a0;
        this._eqA2[b] = (1 - alpha / A) / a0;
    }

    /** Cookbook biquad bandpass (constant skirt gain, peak gain = Q): one set per band. */
    _computeFilterCoeffs() {
        for (let b = 0; b < this._numBands; b++) {
            const w0 = 2 * Math.PI * this._bandFreqs[b] / sampleRate;
            const alpha = Math.sin(w0) / (2 * this._bandQ);
            const cosw0 = Math.cos(w0);
            const a0 = 1 + alpha;
            this._b0[b] = (this._bandQ * alpha) / a0;
            this._b2[b] = (-this._bandQ * alpha) / a0;
            this._a1[b] = (-2 * cosw0) / a0;
            this._a2[b] = (1 - alpha) / a0;
        }
    }

    process(inputs, outputs) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || input.length === 0 || !output || output.length === 0) {
            return true;
        }

        const numInCh = input.length;
        const numOutCh = output.length;
        const len = input[0].length;

        const targetMix = this._enabled ? this._mix : 0;

        // Fast bypass when fully off and smoothed mix has drained.
        if (targetMix < 0.001 && this._mixSmooth < 0.001) {
            for (let ch = 0; ch < numOutCh; ch++) {
                const i = input[Math.min(ch, numInCh - 1)];
                const o = output[ch];
                for (let n = 0; n < len; n++) o[n] = i ? i[n] : 0;
            }
            this._env *= this._envCoef;  // relax envelope so re-enable starts clean
            return true;
        }

        const TWO_PI = 2 * Math.PI;

        // ════════════════════════════════════════════════════════════════
        // v18: v12 broadband vocoder + ONE peaking EQ at F1, gain driven
        // continuously by voice envelope in the F1 band.
        //
        // Why this design:
        //   - v12 (broadband chord × voice envelope) was confirmed clean.
        //   - v13-v17 (multi-band processing) all produced same buzz.
        //   - The buzz was likely from biquad coefficient updates done at
        //     32-sample intervals → 1500 Hz update rate → audible artifact.
        //   - v18 uses ONE EQ with coefficients recomputed EVERY sample
        //     (smooth, continuous), and gain that varies slowly with voice
        //     envelope (5 Hz BW from the |x|+LPF follower).
        // ════════════════════════════════════════════════════════════════
        const sawAmt = this._brightness;
        const sinAmt = 1 - sawAmt;
        // Use the band at index 1 (700 Hz, F1 region) for both BPF analysis
        // and peaking EQ application. Q for the BPF analysis is _bandQ;
        // for the peaking EQ, _eqPeakQ.
        const F1_IDX = 1;
        const b0_bpf = this._b0[F1_IDX];
        const b2_bpf = this._b2[F1_IDX];
        const a1_bpf = this._a1[F1_IDX];
        const a2_bpf = this._a2[F1_IDX];
        const sinW = this._eqSinW[F1_IDX];
        const cosW = this._eqCosW[F1_IDX];
        const alpha = sinW / (2 * this._eqPeakQ);
        const NEG_2_COSW = -2 * cosW;

        for (let n = 0; n < len; n++) {
            // 1. Downmix modulator to mono
            let modSample = 0;
            for (let ch = 0; ch < numInCh; ch++) modSample += input[ch][n];
            modSample /= numInCh;

            // 2. F1-band BPF on the modulator (control signal only)
            const mx2 = this._modX2[F1_IDX];
            const my1 = this._modY1[F1_IDX];
            const my2 = this._modY2[F1_IDX];
            const modBandF1 = b0_bpf * modSample + b2_bpf * mx2 - a1_bpf * my1 - a2_bpf * my2;
            this._modX2[F1_IDX] = this._modX1[F1_IDX];
            this._modX1[F1_IDX] = modSample;
            this._modY2[F1_IDX] = my1;
            this._modY1[F1_IDX] = modBandF1;

            const rectF1 = modBandF1 >= 0 ? modBandF1 : -modBandF1;
            const envF1 = rectF1 + (this._envPerBand[F1_IDX] - rectF1) * this._envBandCoef;
            this._envPerBand[F1_IDX] = envF1;

            // 3. Broadband envelope (for output amplitude, same as v12)
            const rectBroad = modSample >= 0 ? modSample : -modSample;
            this._env = rectBroad + (this._env - rectBroad) * this._envCoef;

            // 4. Compute peaking-EQ coefficients EVERY SAMPLE.
            // gainDb = envF1 × 60 → envF1 of 0.1 → +6 dB boost. Clamped at +12 dB.
            let gainDb = envF1 * 60;
            if (gainDb > 12) gainDb = 12;
            const A = Math.pow(10, gainDb / 40);
            const a0_eq = 1 + alpha / A;
            const eqB0 = (1 + alpha * A) / a0_eq;
            const eqB1 = NEG_2_COSW / a0_eq;
            const eqB2 = (1 - alpha * A) / a0_eq;
            const eqA1 = NEG_2_COSW / a0_eq;
            const eqA2 = (1 - alpha / A) / a0_eq;

            // 5. Generate chord (broadband, same as v12)
            let chord = 0;
            for (let i = 0; i < this._numOscs; i++) {
                const phase = this._oscPhases[i];
                const dt = this._oscFreqs[i] / sampleRate;
                const naive = 2 * phase - 1;
                const saw = naive - this._polyBlep(phase, dt);
                const sine = Math.sin(TWO_PI * phase);
                chord += saw * sawAmt + sine * sinAmt;
                let ph = phase + dt;
                if (ph >= 1) ph -= 1;
                this._oscPhases[i] = ph;
            }
            chord /= this._numOscs;

            // 6. Apply ONE peaking EQ to chord
            const eqX1 = this._eqX1[F1_IDX];
            const eqX2 = this._eqX2[F1_IDX];
            const eqY1 = this._eqY1[F1_IDX];
            const eqY2 = this._eqY2[F1_IDX];
            const eqd = eqB0 * chord + eqB1 * eqX1 + eqB2 * eqX2 - eqA1 * eqY1 - eqA2 * eqY2;
            this._eqX2[F1_IDX] = eqX1;
            this._eqX1[F1_IDX] = chord;
            this._eqY2[F1_IDX] = eqY1;
            this._eqY1[F1_IDX] = eqd;

            // 7. Multiply by broadband env (chord pulses with voice, v12 style)
            let vocoded = eqd * this._env * 4.0;
            vocoded = Math.tanh(vocoded);

            // 8. Crossfade dry/wet
            this._mixSmooth = targetMix + (this._mixSmooth - targetMix) * this._mixSmoothCoef;
            const wet = this._mixSmooth;
            const dry = 1 - wet;
            const outSample = modSample * dry + vocoded * wet;

            for (let ch = 0; ch < numOutCh; ch++) {
                output[ch][n] = outSample;
            }
        }
        return true;
    }
}

registerProcessor('vocoder-processor', VocoderProcessor);
`;
