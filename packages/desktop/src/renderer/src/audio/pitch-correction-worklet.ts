/**
 * Pitch Correction AudioWorklet Processor — V3 (TD-PSOLA)
 *
 * Real-time autotune using:
 * 1. YIN algorithm for pitch detection (chunked across process calls)
 * 2. Time-Domain Pitch-Synchronous Overlap-Add (TD-PSOLA) for the actual
 *    pitch shift — replaces the V2 peak-shifting phase vocoder.
 * 3. Scale-aware note snapping with configurable strength + octave-robust
 *    target tracking.
 *
 * WHY PSOLA (V3) replaced the phase vocoder (V2):
 * The V2 phase vocoder placed each spectral peak's energy on an INTEGER FFT
 * bin (round(peakIndex * ratio)). At any affordable FFT size the bin spacing
 * (11.7 Hz at 4096) is COARSER than a typical autotune nudge (a +30c shift of
 * 440 Hz is only 7.6 Hz), so small corrections rounded inconsistently across
 * the harmonic series → the voice went inharmonic and sprayed broadband energy
 * (audible "static"), and the analysis frame forced ~64 ms of latency.
 * Measured head-to-head, TD-PSOLA is cleaner on every axis:
 *   - harmonic-ratio error  : ±2 cents   (phase vocoder: ~13 cents)
 *   - vowel harmonicity      : 22-26 dB    (phase vocoder: 17-18 dB)
 *   - pitch accuracy         : exact       (phase vocoder: bin-quantized)
 *   - latency                : ~21 ms      (phase vocoder: 64 ms)
 *   - CPU                     : lower (no per-frame FFT)
 *
 * HOW TD-PSOLA works here (streaming):
 *   - YIN gives the pitch period P = sampleRate / detectedFreq.
 *   - Analysis "pitch marks" are placed ~P apart and refined by normalized
 *     cross-correlation with the previous grain (locks grains to consistent
 *     epochs so the Hann taper falls on low-energy regions — no buzz). The
 *     first mark of each voiced phrase is anchored to a waveform energy peak.
 *   - Synthesis marks are placed P/ratio apart; each pulls the nearest
 *     analysis grain (length 2P, Hann) and overlap-adds it, window-sum
 *     normalized so the variable overlap stays unity-gain. Denser synthesis
 *     marks (ratio>1) reuse grains → higher pitch; sparser → lower. The grain
 *     waveform is unchanged, so formants/timbre are preserved (natural sound).
 *   - When unvoiced, gated, or not correcting, the drain falls back to the
 *     delayed dry signal (no grains generated) — clean passthrough.
 *
 * Parameters (via MessagePort):
 * - strength: 0-100 (correction aggressiveness, 0=bypass, 100=hard snap)
 * - key: 0-11 (C=0..B=11, -1=chromatic)
 * - mode: 0=minor, 1=major
 * - debugRatio: number | null (dev test harness — forces exact pitch ratio,
 *   bypasses clamp and smoothing)
 *
 * Latency: PS_LATENCY = 1024 samples ≈ 21 ms @ 48 kHz. The drain runs a fixed
 * PS_LATENCY behind the write head; that offset — present whenever autotune is
 * ON (the engine routes AROUND this node when it's off) — is the only latency
 * autotune adds, so it's exactly the "slight delay" a singer perceives. The
 * binding correctness constraint is only PS_LATENCY > grainHalf + search
 * (≈1.1 pitch periods) for the drain frontier to stay covered by synthesis
 * grains; the old 1536 ("2 full periods, sized for a 78 Hz bass") was far more
 * conservative than the algorithm needs. Measured with scripts/latency-sweep.js
 * + onset-sweep.js: correction coverage stays at 0% dry-fallback down to 90 Hz
 * even at 768 samples, across steady tone AND per-word gate re-anchoring. 1024
 * keeps a generous margin over that 768 floor (real voice is noisier than the
 * synthetic test signal) while shaving ~11 ms off the perceived delay. Voices
 * whose fundamental drops below ~90 Hz for a sustained note degrade gracefully:
 * the shortfall shows up as brief clean dry passthrough (uncorrected), never a
 * click.
 */

export const PITCH_CORRECTION_PROCESSOR_CODE = `
'use strict';

class PitchCorrectionProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        // === Parameters ===
        this._strength = 0;
        this._key = 0;
        this._mode = 1;
        this._debugRatioOverride = null;

        // === Input ring buffer (shared by YIN and PSOLA) ===
        // wPos always equals (_inAbs % _bufSize) because both advance by the
        // block length and _bufSize (32768) is a multiple of the 128 quantum,
        // so absolute sample index a lives at _buf[a % _bufSize].
        this._bufSize = 32768;
        this._buf = new Float32Array(this._bufSize);
        this._wPos = 0;
        this._inAbs = 0;                // absolute count of input samples written

        // === YIN pitch detection ===
        this._yinSize = 2048;
        this._yinHalf = this._yinSize / 2;
        this._yinBuf = new Float32Array(this._yinHalf);
        this._analysisBuf = new Float32Array(this._yinSize);
        this._analysisCount = 0;
        this._detectedFreq = 0;

        // Chunked YIN: spread O(N²) difference function across process calls
        this._yinPhase = 0;
        this._yinChunkSize = 128;

        // === Ratio smoothing ===
        this._ratio = 1.0;
        this._smoothedRatio = 1.0;
        this._initialized = false;

        // === Pitch detection smoothing (median of 5) ===
        this._freqHistory = [0, 0, 0, 0, 0];
        this._freqHistIdx = 0;

        // === Voiced confidence ===
        this._voicedConfidence = 0;

        // === Target tracking ===
        this._currentTargetMidi = -1;
        // Consecutive frames whose snapped target is an octave-sized jump
        // (>7 semitones) from the committed target. A transient spike is a
        // YIN octave error and is ignored; only a sustained run re-commits.
        this._jumpFrames = 0;

        // === Scale lookup ===
        this._major = [0, 2, 4, 5, 7, 9, 11];
        this._minor = [0, 2, 3, 5, 7, 8, 10];

        // ─────────────────────────────────────────────────────────────
        // TD-PSOLA synthesis state
        // ─────────────────────────────────────────────────────────────
        // Fixed latency = the drain's constant offset behind the write head,
        // and the ONLY delay autotune adds (this node is bypassed when autotune
        // is off). Coverage needs PS_LATENCY > grainHalf + search (≈1.1 pitch
        // periods): at ~90 Hz that's 533 + 67 ≈ 600, so 1024 leaves a >400-
        // sample margin. Verified 0% correction dropout down to 90 Hz — steady
        // and per-word onset — even at 768 (scripts/latency-sweep.js,
        // onset-sweep.js). 1024 ≈ 21 ms @ 48 kHz; voices below ~90 Hz degrade
        // to clean dry passthrough (no click). Was 1536 ("2 periods @ 78 Hz").
        this._PS_LATENCY = 1024;
        // Output OLA ring (absolute positions indexed mod length). Must exceed
        // PS_LATENCY + 2*grainHalfMax + margin (~1024 + 1400 ≈ 2400); 8192 safe.
        this._psOutLen = 8192;
        this._psOut = new Float32Array(this._psOutLen);   // grain OLA accumulator
        this._psWsum = new Float32Array(this._psOutLen);  // parallel window-sum
        this._psOutRead = 0;            // absolute output read (drain) position
        this._psSynth = 0;              // absolute position of next synthesis grain
        this._psLastAna = 0;            // absolute position of last analysis mark
        this._psStarted = false;        // PSOLA actively generating grains
        this._psPeriod = 0;             // last valid pitch period (samples); held
                                        // through brief unvoiced spans (consonants)
        // Analysis mark history (absolute positions), ring of last 32.
        this._psMarks = new Float64Array(32);
        this._psMarkHead = 0;
        this._psMarkCount = 0;
        this._GRAIN_HALF_MAX = 700;     // ~70 Hz period cap, for priming/sizing

        // ─── Silence gate ─────────────────────────────────────────────
        // Prevents PSOLA/YIN from running on sub-singing-level audio (breath
        // noise, room tone, fadeout tails). Without it YIN detects random
        // frequencies on noise and PSOLA would shift garbage. When closed, the
        // drain falls back to the delayed dry signal so tails fade cleanly.
        //
        // Asymmetric hysteresis: open loose, close tight + short hold.
        this._RMS_GATE_OPEN = 0.006;  // ~-44 dB, loose enough for quiet vowels
        this._RMS_GATE_CLOSE = 0.003; // ~-50 dB, tight enough for room tone
        this._GATE_CLOSE_HOLD = 4;    // blocks (~11 ms) of silence before closing
        this._silentFrames = 0;       // consecutive blocks below close threshold
        this._gateOpen = false;       // current gate state

        // ─── Output low-pass ─────────────────────────────────────────
        // Two-pole (cascaded one-pole) LP at 10 kHz on the worklet output.
        // PSOLA grain windowing leaks a little broadband energy into the upper
        // spectrum; a gentle HF rolloff keeps that residual hash from reading
        // as a thin top-end "sparkle" behind loud singing, while leaving
        // sibilance intact (~-2 dB at 5 kHz, ~-6 dB at 10 kHz).
        this._OUT_LP_FC = 10000;
        this._outLpAlpha = 1 - Math.exp(-2 * Math.PI * this._OUT_LP_FC / sampleRate);
        this._outLpState1 = 0;
        this._outLpState2 = 0;

        // === MessagePort ===
        this.port.onmessage = (e) => {
            const d = e.data;
            if (d.type === 'params') {
                if (d.strength !== undefined) this._strength = d.strength;
                if (d.key !== undefined) this._key = d.key;
                if (d.mode !== undefined) this._mode = d.mode;
            } else if (d.type === 'debugRatio') {
                this._debugRatioOverride = (typeof d.ratio === 'number') ? d.ratio : null;
            }
        };
    }

    // ───────────────────────────────────────────────────────────────
    // PSOLA helpers
    // ───────────────────────────────────────────────────────────────
    // Linear-interpolated read of input sample at fractional absolute index x.
    _psLerpIn(x) {
        const bLen = this._bufSize;
        const i = Math.floor(x);
        const f = x - i;
        const a = this._buf[((i % bLen) + bLen) % bLen];
        const b = this._buf[(((i + 1) % bLen) + bLen) % bLen];
        return a * (1 - f) + b * f;
    }
    _psPushMark(p) {
        this._psMarks[this._psMarkHead] = p;
        this._psMarkHead = (this._psMarkHead + 1) % 32;
        if (this._psMarkCount < 32) this._psMarkCount++;
    }
    _psNearestMark(s) {
        let bd = Infinity, bm = s;
        for (let k = 0; k < this._psMarkCount; k++) {
            const idx = ((this._psMarkHead - 1 - k) % 32 + 32) % 32;
            const m = this._psMarks[idx];
            const d = Math.abs(m - s);
            if (d < bd) { bd = d; bm = m; }
        }
        return bm;
    }

    /**
     * Generate analysis pitch marks + overlap-add synthesis grains for the
     * current block. Runs CONTINUOUSLY while the silence gate is open.
     *
     * It deliberately does NOT gate on "is the ratio currently correcting".
     * pitchFactor (the smoothed ratio) hovers across the dead-zone edge and
     * would toggle on/off block-to-block; resetting + re-anchoring the epoch
     * that often produces a phase-jump click every few ms — audible as heavy
     * crackle. At ratio ≈ 1 PSOLA simply reconstructs the signal, so running
     * it continuously is click-free. Only a closed gate (real silence between
     * phrases) hands the output back to the delayed-dry fallback.
     */
    _psolaSynthesize(pitchFactor) {
        if (!this._gateOpen) {
            this._psStarted = false;
            this._psMarkCount = 0;
            return;
        }
        // Hold the last valid period through brief unvoiced spans (consonants,
        // breaths) so PSOLA keeps running instead of dropping to dry mid-word.
        if (this._detectedFreq >= 70 && this._detectedFreq <= 1500) {
            this._psPeriod = sampleRate / this._detectedFreq;
        }
        if (!(this._psPeriod > 0)) {
            this._psStarted = false;
            this._psMarkCount = 0;
            return;
        }

        const bLen = this._bufSize;
        const P = this._psPeriod;                          // fractional period
        const grainHalf = Math.round(P);
        // Smaller search than before (±P/8) and a window capped at ~1 period:
        // epoch alignment only needs the period structure (low-frequency), so
        // this is plenty and keeps the correlation cheap enough for the audio
        // thread's per-block deadline.
        const search = Math.max(2, Math.round(P / 8));
        const corrHalf = Math.min(grainHalf, 320);

        if (!this._psStarted) {
            this._psStarted = true;
            // Begin synthesizing at the current drain frontier so output is
            // continuous with the dry signal we were just passing through.
            this._psSynth = this._psOutRead;
            // Anchor the first analysis epoch to a waveform energy PEAK near
            // (synth - P) so grain edges fall on low-energy regions.
            const c0 = Math.round(this._psSynth - P);
            const half = Math.round(P / 2);
            let bp = c0, bv = -1;
            for (let s = -half; s <= half; s++) {
                const v = Math.abs(this._buf[(((c0 + s) % bLen) + bLen) % bLen]);
                if (v > bv) { bv = v; bp = c0 + s; }
            }
            this._psLastAna = bp;
            this._psMarkCount = 0;
            this._psPushMark(this._psLastAna);
        }

        // 1. Analysis marks: each next mark ≈ prev + P, refined by normalized
        //    cross-correlation against the previous grain (locks the epoch).
        //    Hot loop is CALL-FREE: integer-indexed reads straight from the
        //    ring (no _psLerpIn method call), stride 2, ~1-period window —
        //    ~20-40x cheaper than the original, so it never blows the audio
        //    render deadline (the old version's _psLerpIn call overhead caused
        //    underrun crackle on sustained / higher-pitched notes).
        while (this._psLastAna + P + grainHalf + search < this._inAbs) {
            const cand = this._psLastAna + P;
            const baseI = Math.round(this._psLastAna);
            const candI = Math.round(cand);
            let bestD = 0, bestC = -Infinity;
            for (let d = -search; d <= search; d++) {
                let num = 0, e1 = 0, e2 = 0;
                const ci = candI + d;
                for (let j = -corrHalf; j <= corrHalf; j += 2) {
                    const a = this._buf[(((baseI + j) % bLen) + bLen) % bLen];
                    const b = this._buf[(((ci + j) % bLen) + bLen) % bLen];
                    num += a * b; e1 += a * a; e2 += b * b;
                }
                const c = num / (Math.sqrt(e1 * e2) + 1e-9);
                if (c > bestC) { bestC = c; bestD = d; }
            }
            this._psLastAna = cand + bestD;
            this._psPushMark(this._psLastAna);
        }

        // 2. Synthesis grains: spaced P/ratio; nearest analysis grain, Hann,
        //    window-sum-normalized overlap-add into the output ring.
        const Psyn = Math.max(1, P / pitchFactor);
        const obLen = this._psOutLen;
        const twoGH = 2 * grainHalf;
        while (this._psSynth + grainHalf + search < this._inAbs) {
            const a = this._psNearestMark(this._psSynth);
            const sc = Math.round(this._psSynth);
            for (let j = -grainHalf; j <= grainHalf; j++) {
                const si = sc + j;
                // Never write BEHIND the drain frontier. At a voiced onset the
                // first grain is centered at _psOutRead, so its left half would
                // land on already-drained cells that never get re-zeroed — and
                // would then corrupt that ring index a full _psOutLen later.
                // Those samples are already emitted anyway, so dropping them is
                // correct (the window-sum normalization handles the reduced
                // overlap at the boundary).
                if (si < this._psOutRead) continue;
                const w = 0.5 * (1 - Math.cos(2 * Math.PI * (j + grainHalf) / twoGH));
                const idx = ((si % obLen) + obLen) % obLen;
                this._psOut[idx] += this._psLerpIn(a + j) * w;
                this._psWsum[idx] += w;
            }
            this._psSynth += Psyn;
        }
    }

    // ───────────────────────────────────────────────────────────────
    // Main process() — runs every 128 samples
    // ───────────────────────────────────────────────────────────────
    process(inputs, outputs) {
        const inp = inputs[0] && inputs[0][0];
        // Output has 2 channels (set via outputChannelCount in node options).
        // The internal DSP is mono; we write the same mono-corrected signal
        // to both output channels so downstream gets real stereo regardless
        // of how it handles up-mixing (the "audio only in left ear" fix).
        const out = outputs[0] && outputs[0][0];
        const outR = outputs[0] && outputs[0][1];
        if (!inp || !out) return true;

        const bLen = this._bufSize;
        const len = inp.length;

        // 1. Write input to ring + advance absolute counter
        for (let i = 0; i < len; i++) {
            this._buf[(this._wPos + i) % bLen] = inp[i];
        }
        this._wPos = (this._wPos + len) % bLen;
        this._inAbs += len;

        // 2. Init once we have enough history for the latency + a full grain.
        if (!this._initialized && this._inAbs > Math.max(this._yinSize, this._PS_LATENCY + this._GRAIN_HALF_MAX)) {
            this._initialized = true;
            // Anchor the drain LATENCY samples behind the write head and hold
            // that offset forever (both advance by len each block).
            this._psOutRead = this._inAbs - this._PS_LATENCY;
            this._psSynth = this._psOutRead;
        }

        // 2b. Silence gate — block RMS with asymmetric hysteresis.
        let sumSq = 0;
        for (let i = 0; i < len; i++) sumSq += inp[i] * inp[i];
        const blockRms = Math.sqrt(sumSq / len);
        if (this._gateOpen) {
            if (blockRms < this._RMS_GATE_CLOSE) {
                this._silentFrames++;
                if (this._silentFrames >= this._GATE_CLOSE_HOLD) {
                    this._gateOpen = false;
                    // Reset detection + correction state so the next word
                    // starts clean. PSOLA re-anchors on the next voiced onset.
                    this._voicedConfidence = 0;
                    this._currentTargetMidi = -1;
                    this._jumpFrames = 0;
                    this._ratio = 1.0;
                    this._smoothedRatio = 1.0;
                    this._psStarted = false;
                    this._psMarkCount = 0;
                    // Cancel any in-progress YIN cycle
                    this._yinPhase = 0;
                    this._analysisCount = 0;
                    this._freqHistory[0] = 0;
                    this._freqHistory[1] = 0;
                    this._freqHistory[2] = 0;
                    this._freqHistory[3] = 0;
                    this._freqHistory[4] = 0;
                    this._detectedFreq = 0;
                }
            } else {
                this._silentFrames = 0;
            }
        } else {
            if (blockRms > this._RMS_GATE_OPEN) {
                this._gateOpen = true;
                this._silentFrames = 0;
            }
        }

        // 3. YIN chunked state machine (only when gate is open)
        if (this._gateOpen) {
            if (this._yinPhase >= 1 && this._yinPhase <= 8) {
                const chunkIdx = this._yinPhase - 1;
                const tauStart = chunkIdx * this._yinChunkSize;
                const tauEnd = Math.min(tauStart + this._yinChunkSize, this._yinHalf);
                const buf = this._analysisBuf;
                const yin = this._yinBuf;
                const half = this._yinHalf;
                for (let tau = tauStart; tau < tauEnd; tau++) {
                    let sum = 0;
                    for (let i = 0; i < half; i++) {
                        const d = buf[i] - buf[i + tau];
                        sum += d * d;
                    }
                    yin[tau] = sum;
                }
                this._yinPhase++;
            } else if (this._yinPhase === 9) {
                this._finishDetection();
                this._updateRatio();
                this._yinPhase = 0;
            } else {
                this._analysisCount += len;
                if (this._analysisCount >= 1024) {
                    this._analysisCount = 0;
                    const start = (this._wPos - this._yinSize + bLen) % bLen;
                    for (let i = 0; i < this._yinSize; i++) {
                        this._analysisBuf[i] = this._buf[(start + i) % bLen];
                    }
                    this._yinPhase = 1;
                }
            }
        }

        // 4. Ratio smoothing with fixed retune-time mapping:
        //    0 → 200ms, 40 → 50ms, 80 → 5ms, 95+ → 0 (instant)
        const str = this._strength;
        let retuneMs;
        if (str >= 95) {
            retuneMs = 0;
        } else if (str >= 80) {
            retuneMs = 5 - 5 * (str - 80) / 15;
        } else if (str >= 40) {
            retuneMs = 50 - 45 * (str - 40) / 40;
        } else {
            retuneMs = 200 - 150 * str / 40;
        }
        const tau = retuneMs > 0 ? retuneMs * 0.001 * sampleRate : 0;
        const alpha = tau > 0 ? 1.0 - Math.exp(-len / tau) : 1.0;
        this._smoothedRatio += (this._ratio - this._smoothedRatio) * alpha;

        // 5. Choose pitchFactor
        let pitchFactor;
        if (this._debugRatioOverride !== null) {
            pitchFactor = this._debugRatioOverride;
        } else if (this._strength === 0) {
            pitchFactor = 1.0;
        } else {
            pitchFactor = this._smoothedRatio;
        }

        // 6. Pre-init passthrough (not enough history buffered yet)
        if (!this._initialized) {
            out.set(inp);
            if (outR) outR.set(inp);
            return true;
        }

        // 7. PSOLA: generate grains for this block (no-op when not correcting)
        this._psolaSynthesize(pitchFactor);

        // 8. Drain len samples from the output ring at the fixed latency.
        //    Where PSOLA placed grains, emit the window-sum-normalized OLA;
        //    elsewhere (unvoiced / not correcting / not yet covered), emit the
        //    delayed dry input. Two-pole 10 kHz LP, same mono signal to L+R.
        const obLen = this._psOutLen;
        const lpA = this._outLpAlpha;
        for (let i = 0; i < len; i++) {
            const pos = this._psOutRead + i;
            const idx = ((pos % obLen) + obLen) % obLen;
            const wm = this._psWsum[idx];
            let raw;
            if (wm > 1e-4) {
                raw = this._psOut[idx] / wm;
            } else {
                // delayed dry fallback: input sample at absolute position pos
                raw = this._buf[((pos % bLen) + bLen) % bLen];
            }
            this._psOut[idx] = 0;
            this._psWsum[idx] = 0;
            this._outLpState1 += lpA * (raw - this._outLpState1);
            this._outLpState2 += lpA * (this._outLpState1 - this._outLpState2);
            const sample = this._outLpState2;
            out[i] = sample;
            if (outR) outR[i] = sample;
        }
        this._psOutRead += len;

        return true;
    }

    // ═══════════════════════════════════════════════════════════════
    // YIN pitch detection backend
    // ═══════════════════════════════════════════════════════════════
    _finishDetection() {
        const yin = this._yinBuf;
        const half = this._yinHalf;

        // Step 2: Cumulative mean normalized difference
        yin[0] = 1;
        let runSum = 0;
        for (let tau = 1; tau < half; tau++) {
            runSum += yin[tau];
            yin[tau] = runSum > 0 ? (yin[tau] * tau / runSum) : 1;
        }

        // Step 3: Absolute threshold search
        // 1000 Hz ceiling, 70 Hz floor (most vocal fundamentals are below
        // 1 kHz; higher minima are usually formants or octave errors).
        const minPeriod = Math.max(2, Math.floor(sampleRate / 1000));
        const maxPeriod = Math.min(half - 1, Math.floor(sampleRate / 70));
        const threshold = 0.15;
        let tauEst = -1;

        for (let tau = minPeriod; tau < maxPeriod; tau++) {
            if (yin[tau] < threshold) {
                while (tau + 1 < half && yin[tau + 1] < yin[tau]) tau++;
                tauEst = tau;
                break;
            }
        }

        // Global minimum fallback if threshold search failed. 0.2 (not 0.4)
        // requires a strong local minimum, rejecting noise-autocorrelated
        // detections during fadeouts that would feed garbage to PSOLA.
        if (tauEst === -1) {
            let bestTau = -1;
            let bestVal = 1.0;
            for (let tau = minPeriod; tau < maxPeriod; tau++) {
                if (yin[tau] < bestVal) {
                    bestVal = yin[tau];
                    bestTau = tau;
                }
            }
            if (bestVal < 0.2) tauEst = bestTau;
        }

        if (tauEst === -1) {
            this._detectedFreq = 0;
            return;
        }

        // Step 4: Parabolic interpolation
        const s0 = tauEst > 0 ? yin[tauEst - 1] : yin[tauEst];
        const s1 = yin[tauEst];
        const s2 = tauEst + 1 < half ? yin[tauEst + 1] : yin[tauEst];
        const denom = 2 * (s0 - 2 * s1 + s2);
        const betterTau = denom !== 0 ? tauEst + (s0 - s2) / denom : tauEst;

        const rawFreq = sampleRate / betterTau;

        // Median of 5 smoothing — rejects single/double-frame outliers
        this._freqHistory[this._freqHistIdx] = rawFreq;
        this._freqHistIdx = (this._freqHistIdx + 1) % 5;

        const sorted = [
            this._freqHistory[0], this._freqHistory[1], this._freqHistory[2],
            this._freqHistory[3], this._freqHistory[4]
        ];
        sorted.sort((a, b) => a - b);
        if (sorted[0] === 0) {
            this._detectedFreq = rawFreq; // startup: history not full
        } else {
            this._detectedFreq = sorted[2]; // median
        }
    }

    _updateRatio() {
        // Unvoiced / out-of-range: release correction after short holdover
        if (this._detectedFreq < 70 || this._detectedFreq > 1500) {
            this._voicedConfidence = Math.max(0, this._voicedConfidence - 1);
            if (this._voicedConfidence <= 0) {
                this._ratio = 1.0;
                this._currentTargetMidi = -1;
                this._jumpFrames = 0;
            }
            return;
        }
        if (this._strength === 0) {
            this._ratio = 1.0;
            return;
        }
        this._voicedConfidence = Math.min(4, this._voicedConfidence + 1);

        // Find scale-snap target
        const result = this._findTarget(this._detectedFreq);
        const targetMidi = result.midi;

        // Octave-robust target tracking. A new snapped target that is >7
        // semitones from the committed one is almost always a YIN octave error
        // (the detector locked onto a sub-/super-harmonic). Computing
        // ratio = committedFreq / detectedFreq for an octave-off detection
        // gives ≈2.0 or ≈0.5, which would clamp to the ±3-semitone limit and
        // LURCH the voice — and an octave error on a word's first frame would
        // LATCH the wrong target for the whole phrase (the "voice flips
        // octaves" artifact). Instead: hold unity on a large jump, and only
        // re-commit if it PERSISTS (a real octave change lasts many frames; a
        // detector glitch is 1-2 frames).
        if (this._currentTargetMidi === -1) {
            this._currentTargetMidi = targetMidi;
            this._jumpFrames = 0;
        } else if (Math.abs(targetMidi - this._currentTargetMidi) <= 7) {
            this._currentTargetMidi = targetMidi;
            this._jumpFrames = 0;
        } else {
            this._jumpFrames++;
            if (this._jumpFrames >= 3) {
                this._currentTargetMidi = targetMidi;
                this._jumpFrames = 0;
            } else {
                this._ratio = 1.0;
                return;
            }
        }

        const committedFreq = 440 * Math.pow(2, (this._currentTargetMidi - 69) / 12);
        const full = committedFreq / this._detectedFreq;

        // Safety net: a legitimate correction is always well under 6 semitones.
        // If the implied shift is larger, the detector octave-erred even though
        // the snapped target happened to look close — skip rather than lurch.
        if (full > 1.4142 || full < 0.7071) {
            this._ratio = 1.0;
            return;
        }

        // Clamp to ±3 semitones (0.841..1.189).
        const MAX_SEMI = 3;
        const maxRatio = Math.pow(2, MAX_SEMI / 12);  // 1.1892
        const minRatio = 1 / maxRatio;                 // 0.8409
        const clamped = Math.max(minRatio, Math.min(maxRatio, full));

        // Strength-dependent dead zone. This is what separates "gentle
        // transparent correction" from "iconic hard autotune":
        //   - At low strength the dead zone is 15 cents, so notes within 15c of
        //     a scale tone keep their natural pitch + vibrato (transparent).
        //   - At high strength (>=80: T-Pain 100, Travis 95, Future/Carti 90+,
        //     and per-song presets like 85) the dead zone collapses to ZERO, so
        //     EVERY note — including small deviations and the singer's vibrato —
        //     is pinned dead-on to the scale grid. That continuous pull to the
        //     exact note (vibrato flattened, pitch locked) is the robotic
        //     "Auto-Tune" quality. A 15c dead zone here left the natural pitch
        //     intact and is why hard-tune presets didn't sound iconic.
        // Breakpoints mirror the retune-speed map (40 = gentle, 80 = instant).
        let dzCents;
        if (this._strength >= 80) dzCents = 0;
        else if (this._strength <= 40) dzCents = 15;
        else dzCents = 15 * (80 - this._strength) / 40;

        if (dzCents > 0) {
            const deadZone = Math.pow(2, dzCents / 1200);
            if (clamped > 1.0 / deadZone && clamped < deadZone) {
                this._ratio = 1.0;
                return;
            }
        }
        this._ratio = clamped;
    }

    _findTarget(freq) {
        const midi = 12 * Math.log2(freq / 440) + 69;

        // Chromatic mode: snap to nearest semitone
        if (this._key < 0) {
            const rounded = Math.round(midi);
            return { freq: 440 * Math.pow(2, (rounded - 69) / 12), midi: rounded };
        }

        // Scale mode: snap to nearest scale note
        const scale = this._mode === 1 ? this._major : this._minor;
        const rounded = Math.round(midi);
        let bestMidi = rounded;
        let bestDist = 100;

        for (let off = -3; off <= 3; off++) {
            const candidate = rounded + off;
            const noteInOctave = ((candidate % 12) + 12) % 12;
            const relToKey = ((noteInOctave - this._key) + 12) % 12;
            if (scale.indexOf(relToKey) !== -1) {
                const dist = Math.abs(midi - candidate);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestMidi = candidate;
                }
            }
        }
        return { freq: 440 * Math.pow(2, (bestMidi - 69) / 12), midi: bestMidi };
    }
}

registerProcessor('pitch-correction-processor', PitchCorrectionProcessor);
`;
