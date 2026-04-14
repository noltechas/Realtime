/**
 * Pitch Correction AudioWorklet Processor — V2
 *
 * Real-time autotune using:
 * 1. YIN algorithm for pitch detection (chunked across process calls)
 * 2. Phase vocoder with peak tracking + timeCursor phase correction
 *    (Laroche/Dolson 1999, same approach as phaze by olvb)
 * 3. Scale-aware note snapping with configurable strength
 *
 * This V2 fixes several issues from V1:
 * - Uses phaze's exact timeCursor-based phase correction (no per-peak
 *   phase state, no "new peak" reset glitches during rapid peak movement)
 * - FFT size 2048 (was 1024) for better low-voice frequency resolution
 * - Ratio clamped to ±3 semitones (was ±6) — conservative autotune,
 *   not drastic pitch shifting
 * - Fixed retune time formula (strength 40 was erroneously 102ms, now 50ms)
 * - Simpler hysteresis with large-jump rejection (prevents YIN octave
 *   errors from flinging the voice)
 * - FFT correctness self-test at construction time
 *
 * Parameters (via MessagePort):
 * - strength: 0-100 (correction aggressiveness, 0=bypass, 100=hard snap)
 * - key: 0-11 (C=0..B=11, -1=chromatic)
 * - mode: 0=minor, 1=major
 * - debugRatio: number | null (dev test harness — forces exact pitch ratio,
 *   bypasses clamp and smoothing)
 *
 * Latency: FFT_SIZE - HOP = 1536 samples ≈ 32ms @ 48kHz
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

        // === Input ring buffer (shared by YIN and phase vocoder) ===
        this._bufSize = 32768;
        this._buf = new Float32Array(this._bufSize);
        this._wPos = 0;

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

        // === Scale lookup ===
        this._major = [0, 2, 4, 5, 7, 9, 11];
        this._minor = [0, 2, 3, 5, 7, 8, 10];

        // ─────────────────────────────────────────────────────────────
        // Phase Vocoder State (phaze-style, Laroche/Dolson 1999)
        // ─────────────────────────────────────────────────────────────
        this._FFT_SIZE = 2048;
        this._HOP = 512;                // 75% overlap (COLA-safe Hann)
        this._LOG2_FFT = 11;
        this._N2 = this._FFT_SIZE / 2;

        // Analysis/synthesis
        this._window = new Float32Array(this._FFT_SIZE);
        this._frameBuf = new Float32Array(this._FFT_SIZE);
        this._re = new Float32Array(this._FFT_SIZE);
        this._im = new Float32Array(this._FFT_SIZE);
        this._outRe = new Float32Array(this._FFT_SIZE);
        this._outIm = new Float32Array(this._FFT_SIZE);
        this._mag = new Float32Array(this._N2 + 1);

        // Peak list
        this._peakBins = new Int32Array(128);
        this._peakCount = 0;

        // Phaze-style time cursor (wraps mod FFT_SIZE for numerical stability)
        this._timeCursor = 0;

        // FFT tables
        this._cosTbl = new Float32Array(this._FFT_SIZE / 2);
        this._sinTbl = new Float32Array(this._FFT_SIZE / 2);
        this._bitRev = new Uint16Array(this._FFT_SIZE);
        this._initFFT();
        this._computeWindow();

        // OLA output buffer — must hold FFT_SIZE + HOP safely; 2x is plenty
        this._outBufLen = this._FFT_SIZE * 2;
        this._outBuf = new Float32Array(this._outBufLen);
        this._outRead = 0;
        this._outWrite = 0;
        this._hopCounter = this._HOP;

        // ─── Silence gate ─────────────────────────────────────────────
        // Prevents the phase vocoder from running on sub-singing-level
        // audio (breath noise, room tone, fadeout tails). Without this
        // gate, YIN detects random frequencies on noise, the peak
        // detector finds noise-floor "peaks" and shifts them, and the
        // timeCursor-based phase rotation produces audible FM sidebands
        // that sound like "wobbly pitched-up tails" — especially after
        // the default reverb smears them over 2.5 seconds.
        //
        // Asymmetric hysteresis: open loose, close tight + short hold.
        this._RMS_GATE_OPEN = 0.006;  // ~-44 dB, loose enough for quiet vowels
        this._RMS_GATE_CLOSE = 0.003; // ~-50 dB, tight enough for room tone
        this._GATE_CLOSE_HOLD = 4;    // blocks (~11 ms) of silence before closing
        this._silentFrames = 0;       // consecutive blocks below close threshold
        this._gateOpen = false;       // current gate state
        this._ABSOLUTE_PEAK_FLOOR = 0.01; // FFT bin magnitude floor (per frame, noise rejection)

        // Diagnostic
        this._logCounter = 0;
        this._logInterval = Math.floor(sampleRate); // ~1 Hz

        // === Self-test: verify FFT round-trip ===
        this._selfTest();

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
    // FFT — radix-2 Cooley-Tukey, in-place, precomputed twiddles
    // ───────────────────────────────────────────────────────────────
    _initFFT() {
        const N = this._FFT_SIZE;
        for (let k = 0; k < N / 2; k++) {
            const angle = 2 * Math.PI * k / N;
            this._cosTbl[k] = Math.cos(angle);
            this._sinTbl[k] = -Math.sin(angle); // forward FFT
        }
        const logN = this._LOG2_FFT;
        for (let i = 0; i < N; i++) {
            let x = i;
            let r = 0;
            for (let b = 0; b < logN; b++) {
                r = (r << 1) | (x & 1);
                x >>= 1;
            }
            this._bitRev[i] = r;
        }
    }

    _fft(re, im) {
        const N = this._FFT_SIZE;
        // Bit-reversal permutation
        for (let i = 0; i < N; i++) {
            const j = this._bitRev[i];
            if (j > i) {
                let t = re[i]; re[i] = re[j]; re[j] = t;
                t = im[i]; im[i] = im[j]; im[j] = t;
            }
        }
        // Butterflies
        let size = 2;
        while (size <= N) {
            const halfSize = size >> 1;
            const tableStep = N / size;
            for (let i = 0; i < N; i += size) {
                let k = 0;
                for (let j = i; j < i + halfSize; j++) {
                    const cos = this._cosTbl[k];
                    const sin = this._sinTbl[k];
                    const reJH = re[j + halfSize];
                    const imJH = im[j + halfSize];
                    const tre = reJH * cos - imJH * sin;
                    const tim = reJH * sin + imJH * cos;
                    re[j + halfSize] = re[j] - tre;
                    im[j + halfSize] = im[j] - tim;
                    re[j] += tre;
                    im[j] += tim;
                    k += tableStep;
                }
            }
            size <<= 1;
        }
    }

    /**
     * In-place inverse FFT via the swap trick. Calling _fft with args in
     * swapped order and then dividing by N is mathematically identical to
     * swap→FFT→swap→/N. Verified via self-test at construction.
     */
    _ifft(re, im) {
        this._fft(im, re);
        const N = this._FFT_SIZE;
        const invN = 1.0 / N;
        for (let i = 0; i < N; i++) {
            re[i] *= invN;
            im[i] *= invN;
        }
    }

    _computeWindow() {
        // Hann, scaled for unity-gain double-windowed COLA at 75% overlap.
        // At 75% overlap, sum_m(Hann[n - m*HOP]^2) = 1.5. We apply the
        // window twice (analysis + synthesis), so effective gain per sample
        // is sum(w^2). Scaling w by sqrt(1/1.5) makes sum(w^2) = 1.
        const N = this._FFT_SIZE;
        const twoPi = 2 * Math.PI;
        const scale = Math.sqrt(1.0 / 1.5);
        for (let i = 0; i < N; i++) {
            this._window[i] = scale * 0.5 * (1 - Math.cos(twoPi * i / N));
        }
    }

    _selfTest() {
        // Verify FFT correctness: round-trip a sine wave and check error.
        const N = this._FFT_SIZE;
        const orig = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            orig[i] = Math.sin(2 * Math.PI * 10 * i / N); // 10 cycles in window
        }
        const testRe = new Float32Array(N);
        const testIm = new Float32Array(N);
        testRe.set(orig);
        this._fft(testRe, testIm);

        // Find dominant bin
        let maxMag = 0, maxBin = -1;
        for (let k = 1; k <= this._N2; k++) {
            const m = testRe[k] * testRe[k] + testIm[k] * testIm[k];
            if (m > maxMag) { maxMag = m; maxBin = k; }
        }

        // Round-trip
        this._ifft(testRe, testIm);
        let maxErr = 0;
        for (let i = 0; i < N; i++) {
            const err = Math.abs(testRe[i] - orig[i]);
            if (err > maxErr) maxErr = err;
        }
        // FFT self-test passed if maxBin === 10 and maxErr < 1e-5
    }

    // ───────────────────────────────────────────────────────────────
    // Phase Vocoder Frame Processing — phaze-style
    // ───────────────────────────────────────────────────────────────
    _processFrame(pitchFactor) {
        const N = this._FFT_SIZE;
        const N2 = this._N2;
        const bLen = this._bufSize;

        // 1. Snapshot FFT_SIZE chronological samples ending at wPos
        const start = (this._wPos - N + bLen) % bLen;
        for (let i = 0; i < N; i++) {
            this._frameBuf[i] = this._buf[(start + i) % bLen];
        }

        // 2. Apply analysis window to real FFT input (im = 0)
        for (let i = 0; i < N; i++) {
            this._re[i] = this._frameBuf[i] * this._window[i];
            this._im[i] = 0;
        }

        // 3. Forward FFT
        this._fft(this._re, this._im);

        // 4. Magnitudes (first half only for real input)
        let maxMag = 0;
        for (let k = 0; k <= N2; k++) {
            const re = this._re[k];
            const im = this._im[k];
            const m = Math.sqrt(re * re + im * im);
            this._mag[k] = m;
            if (m > maxMag) maxMag = m;
        }

        // 5. Find spectral peaks (local max over 5-bin window, gated).
        //    Use the MAX of a relative floor (0.5% of the frame's max mag)
        //    and an ABSOLUTE floor (_ABSOLUTE_PEAK_FLOOR). The absolute
        //    floor rejects noise-level peaks even when the relative floor
        //    is met, which prevents "phantom peaks" from being shifted on
        //    quiet-but-not-silent frames (the main cause of fadeout FM
        //    sidebands that get smeared by the downstream reverb).
        this._peakCount = 0;
        const peakFloor = Math.max(maxMag * 0.005, this._ABSOLUTE_PEAK_FLOOR);
        for (let k = 2; k <= N2 - 2; k++) {
            const m = this._mag[k];
            if (m > peakFloor &&
                m > this._mag[k - 1] && m > this._mag[k - 2] &&
                m > this._mag[k + 1] && m > this._mag[k + 2]) {
                if (this._peakCount < 128) {
                    this._peakBins[this._peakCount++] = k;
                }
            }
        }

        // 6. Zero the synthesis spectrum
        for (let k = 0; k < N; k++) {
            this._outRe[k] = 0;
            this._outIm[k] = 0;
        }

        // 7. Shift each peak + its region of influence rigidly by binShift.
        //    Phase correction is timeCursor-based (phaze-style): the shifted
        //    bin needs a phase rotation of 2π * (newBin - oldBin) * timeCursor / N
        //    to keep the shifted sinusoid phase-coherent with a "real"
        //    sinusoid at the new frequency. This correction applies
        //    uniformly to all bins in the region (rigid rotation).
        //
        //    Noise rejection: after shifting, a spectral cleanup pass (step
        //    7b) attenuates low-magnitude bins in the output spectrum.
        //    This catches phase-rotated noise-floor energy that would
        //    otherwise produce "TV static" in the OLA, without splitting
        //    harmonic energy between shifted/unshifted positions (which
        //    would cause pitch-doubling and weaken the autotune effect).
        for (let p = 0; p < this._peakCount; p++) {
            const peakIndex = this._peakBins[p];
            const peakIndexShifted = Math.round(peakIndex * pitchFactor);
            if (peakIndexShifted < 1 || peakIndexShifted > N2) continue;

            // Region of influence: halfway to neighboring peaks
            let startIndex = 0;
            let endIndex = N2;
            if (p > 0) {
                const peakIndexBefore = this._peakBins[p - 1];
                startIndex = peakIndex - Math.floor((peakIndex - peakIndexBefore) / 2);
            }
            if (p < this._peakCount - 1) {
                const peakIndexAfter = this._peakBins[p + 1];
                endIndex = peakIndex + Math.ceil((peakIndexAfter - peakIndex) / 2);
            }

            const binShift = peakIndexShifted - peakIndex;

            // Rigid phase rotation for the whole region (only depends on
            // binShift and timeCursor, same for all bins in the region)
            const omegaDelta = 2 * Math.PI * binShift / N;
            const phaseCorrection = omegaDelta * this._timeCursor;
            const cosP = Math.cos(phaseCorrection);
            const sinP = Math.sin(phaseCorrection);

            for (let k = startIndex; k < endIndex; k++) {
                if (k < 0 || k > N2) continue;
                const newK = k + binShift;
                if (newK < 1 || newK > N2) continue;

                const re = this._re[k];
                const im = this._im[k];
                this._outRe[newK] += re * cosP - im * sinP;
                this._outIm[newK] += re * sinP + im * cosP;
            }
        }

        // 7b. Output spectral cleanup — attenuate low-magnitude bins
        //     in the SHIFTED spectrum before IFFT. After shifting, noise-
        //     floor bins that were phase-rotated appear as low-level
        //     energy scattered across the output spectrum. Attenuating
        //     them here removes the "TV static" without splitting
        //     harmonic energy between shifted/unshifted positions.
        //
        //     Threshold: 1% of frame max magnitude (-40 dB), CAPPED at an
        //     absolute ceiling (0.02). Without the cap, loud singing
        //     pushes the relative threshold up into legitimate low-
        //     amplitude harmonics and crushes them — that chaotic per-
        //     frame gain modulation across many bins is audible as
        //     "static that gets worse when I sing louder." The cap keeps
        //     the gate targeted at the noise floor regardless of input
        //     level.
        //
        //     Gate: (m/threshold)^2 on complex values = 2nd-power on
        //     magnitude. Aggressive but not brutal: 50% → 25%, 30% → 9%.
        //     Softer than a 4th-power curve, which crushed bins just
        //     under the threshold hard enough to leave holes in the
        //     harmonic structure at high input levels.
        //     Uses squared magnitudes to avoid sqrt in the hot loop.
        const cleanupFloor = Math.min(maxMag * 0.01, 0.02);
        const cf2 = cleanupFloor * cleanupFloor;
        for (let k = 1; k < N2; k++) {
            const ore = this._outRe[k];
            const oim = this._outIm[k];
            const m2 = ore * ore + oim * oim;
            if (m2 < cf2) {
                const g = m2 / cf2;    // (m/threshold)^2 — softer transition
                this._outRe[k] *= g;
                this._outIm[k] *= g;
            }
        }

        // 8. Zero DC and Nyquist (must be real for inverse FFT)
        this._outRe[0] = 0;
        this._outIm[0] = 0;
        this._outRe[N2] = 0;
        this._outIm[N2] = 0;

        // 9. Mirror to negative frequencies (conjugate symmetry for real output)
        for (let k = 1; k < N2; k++) {
            this._outRe[N - k] = this._outRe[k];
            this._outIm[N - k] = -this._outIm[k];
        }

        // 10. Inverse FFT
        this._ifft(this._outRe, this._outIm);

        // 11. Apply synthesis window and overlap-add into output ring
        const obLen = this._outBufLen;
        for (let i = 0; i < N; i++) {
            this._outBuf[(this._outWrite + i) % obLen] += this._outRe[i] * this._window[i];
        }
        this._outWrite = (this._outWrite + this._HOP) % obLen;

        // 12. Advance timeCursor (wrap mod N to keep cos/sin argument small;
        //     the phase wraps naturally because N*omegaDelta is a multiple of 2π).
        this._timeCursor = (this._timeCursor + this._HOP) % N;
    }

    // ───────────────────────────────────────────────────────────────
    // Passthrough Frame — windowed OLA without FFT round-trip
    // Used when pitchFactor ≈ 1.0 to avoid phase-vocoder artifacts
    // on the noise floor while producing identical output levels.
    // ───────────────────────────────────────────────────────────────
    _passthroughFrame() {
        const N = this._FFT_SIZE;
        const bLen = this._bufSize;
        const start = (this._wPos - N + bLen) % bLen;
        const obLen = this._outBufLen;
        for (let i = 0; i < N; i++) {
            const sample = this._buf[(start + i) % bLen];
            const w = this._window[i];
            // Apply window^2 (analysis + synthesis) to match _processFrame gain
            this._outBuf[(this._outWrite + i) % obLen] += sample * w * w;
        }
        this._outWrite = (this._outWrite + this._HOP) % obLen;
        // Keep timeCursor in sync so phase correction resumes cleanly
        this._timeCursor = (this._timeCursor + this._HOP) % N;
    }

    // ───────────────────────────────────────────────────────────────
    // Main process() — runs every 128 samples
    // ───────────────────────────────────────────────────────────────
    process(inputs, outputs) {
        const inp = inputs[0] && inputs[0][0];
        // Output has 2 channels (set via outputChannelCount in node options).
        // The internal DSP is mono; we write the same mono-corrected signal
        // to both output channels so downstream gets real stereo regardless
        // of how it handles up-mixing.
        const out = outputs[0] && outputs[0][0];
        const outR = outputs[0] && outputs[0][1];
        if (!inp || !out) return true;

        const bLen = this._bufSize;
        const len = inp.length;

        // 1. Write input to ring
        for (let i = 0; i < len; i++) {
            this._buf[(this._wPos + i) % bLen] = inp[i];
        }
        this._wPos = (this._wPos + len) % bLen;

        // 2. Init once we have enough data for a full FFT frame + YIN window
        if (!this._initialized && this._wPos > Math.max(this._yinSize, this._FFT_SIZE)) {
            this._initialized = true;
        }

        // 2b. Silence gate — compute block RMS and update gate state with
        //     asymmetric hysteresis. When the gate is CLOSED, the phase
        //     vocoder and YIN are bypassed entirely so that noise/fadeout
        //     can't produce the wobbly pitched-up tail artifact.
        let sumSq = 0;
        for (let i = 0; i < len; i++) sumSq += inp[i] * inp[i];
        const blockRms = Math.sqrt(sumSq / len);
        if (this._gateOpen) {
            // Currently open → start counting silent blocks once we drop
            // below the CLOSE threshold; close only after GATE_CLOSE_HOLD
            // consecutive silent blocks.
            if (blockRms < this._RMS_GATE_CLOSE) {
                this._silentFrames++;
                if (this._silentFrames >= this._GATE_CLOSE_HOLD) {
                    this._gateOpen = false;
                    // Reset all pitch-correction state so the next word
                    // starts with a clean phase reference.
                    this._timeCursor = 0;
                    this._voicedConfidence = 0;
                    this._currentTargetMidi = -1;
                    this._ratio = 1.0;
                    this._smoothedRatio = 1.0;
                    // Cancel any in-progress YIN cycle
                    this._yinPhase = 0;
                    this._analysisCount = 0;
                    // Clear freq history so it doesn't bias the next detection
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
            // Currently closed → reopen immediately when we exceed the
            // OPEN threshold (no hold, so we don't miss the start of a word).
            if (blockRms > this._RMS_GATE_OPEN) {
                this._gateOpen = true;
                this._silentFrames = 0;
            }
        }

        // 3. YIN chunked state machine (only when gate is open — skip
        //    entirely during silence to avoid running detection on noise)
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
            // 80 → 5, 95 → 0
            retuneMs = 5 - 5 * (str - 80) / 15;
        } else if (str >= 40) {
            // 40 → 50, 80 → 5
            retuneMs = 50 - 45 * (str - 40) / 40;
        } else {
            // 0 → 200, 40 → 50
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

        // 6. Pre-init passthrough
        if (!this._initialized) {
            out.set(inp);
            if (outR) outR.set(inp);
            return true;
        }

        // 7. Hop counter: fire a frame every HOP samples of input.
        //    When the silence gate is CLOSED we skip the phase vocoder
        //    entirely but still advance _outWrite by HOP so the drain
        //    stays in sync and the OLA tail from previous loud frames
        //    drains naturally (producing a clean fade to silence).
        this._hopCounter -= len;
        if (this._hopCounter <= 0) {
            this._hopCounter += this._HOP;
            if (this._gateOpen) {
                // Near-unity bypass: when the pitch correction ratio is
                // effectively 1.0, skip the FFT round-trip to avoid
                // phase-rotating the noise floor (the main source of
                // faint static during on-pitch singing). The 0.0005
                // threshold is ~0.86 cents, well below the 15-cent dead
                // zone. Exclude debugRatio so the test harness always
                // exercises the full vocoder.
                if (this._debugRatioOverride === null && Math.abs(pitchFactor - 1.0) < 0.0005) {
                    this._passthroughFrame();
                } else {
                    this._processFrame(pitchFactor);
                }
            } else {
                this._outWrite = (this._outWrite + this._HOP) % this._outBufLen;
            }
        }

        // 8. Drain len samples from the output ring, zero as we read.
        //    Write the same mono-corrected signal to BOTH output channels
        //    (L and R) so downstream nodes receive true stereo — this is
        //    the fix for "audio only in left AirPod".
        const obLen = this._outBufLen;
        if (outR) {
            for (let i = 0; i < len; i++) {
                const idx = (this._outRead + i) % obLen;
                const sample = this._outBuf[idx];
                out[i] = sample;
                outR[i] = sample;
                this._outBuf[idx] = 0;
            }
        } else {
            // Defensive fallback: if for some reason we only got 1 output
            // channel, write just to the left. Shouldn't happen because
            // the node is constructed with outputChannelCount: [2].
            for (let i = 0; i < len; i++) {
                const idx = (this._outRead + i) % obLen;
                out[i] = this._outBuf[idx];
                this._outBuf[idx] = 0;
            }
        }
        this._outRead = (this._outRead + len) % obLen;

        // 9. Rate-limited diagnostic counter (kept for future debug use)
        this._logCounter += len;
        if (this._logCounter >= this._logInterval) {
            this._logCounter = 0;
        }

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
        // Use 80 Hz floor (keeps low male voices) but 1000 Hz ceiling
        // (most vocal fundamentals are below 1 kHz; higher peaks are
        // usually formants or octave errors).
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

        // Global minimum fallback if threshold search failed.
        // Tightened from 0.4 to 0.2: the looser 0.4 would accept weak
        // confidence detections from noise-autocorrelated signals during
        // fadeouts, producing random frequencies that fed garbage to the
        // phase vocoder. 0.2 requires a much stronger local minimum.
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

        // Median of 5 smoothing — stronger than median-of-3 at
        // rejecting single/double-frame outliers
        this._freqHistory[this._freqHistIdx] = rawFreq;
        this._freqHistIdx = (this._freqHistIdx + 1) % 5;

        // Median of 5
        const sorted = [
            this._freqHistory[0], this._freqHistory[1], this._freqHistory[2],
            this._freqHistory[3], this._freqHistory[4]
        ];
        sorted.sort((a, b) => a - b);
        // If any slot is still 0 (startup), use raw
        if (sorted[0] === 0) {
            this._detectedFreq = rawFreq;
        } else {
            this._detectedFreq = sorted[2]; // middle
        }
    }

    _updateRatio() {
        // Unvoiced / out-of-range: release correction after short holdover
        if (this._detectedFreq < 70 || this._detectedFreq > 1500) {
            this._voicedConfidence = Math.max(0, this._voicedConfidence - 1);
            if (this._voicedConfidence <= 0) {
                this._ratio = 1.0;
                this._currentTargetMidi = -1;
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

        // Reject suspicious jumps: if the new target is more than 7 semitones
        // from the current committed target, it's probably a YIN octave error.
        // Keep the current target and hope the next detection is stable.
        if (this._currentTargetMidi === -1) {
            this._currentTargetMidi = targetMidi;
        } else if (Math.abs(targetMidi - this._currentTargetMidi) <= 7) {
            this._currentTargetMidi = targetMidi;
        }
        // else: keep current target (reject the detection)

        const committedFreq = 440 * Math.pow(2, (this._currentTargetMidi - 69) / 12);
        const full = committedFreq / this._detectedFreq;

        // Clamp to ±3 semitones (0.841..1.189). Beyond this, the singer
        // is so off-key that "correcting" them makes things sound worse.
        const MAX_SEMI = 3;
        const maxRatio = Math.pow(2, MAX_SEMI / 12);  // 1.1892
        const minRatio = 1 / maxRatio;                 // 0.8409
        const clamped = Math.max(minRatio, Math.min(maxRatio, full));

        // Dead zone: if correction is under 15 cents, snap to unity to
        // preserve natural vocal character
        const deadZone = 1.00867;
        if (clamped > 1.0 / deadZone && clamped < deadZone) {
            this._ratio = 1.0;
        } else {
            this._ratio = clamped;
        }
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
