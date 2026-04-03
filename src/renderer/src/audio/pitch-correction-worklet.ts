/**
 * Pitch Correction AudioWorklet Processor
 *
 * Real-time autotune using:
 * 1. YIN algorithm for pitch detection (~12ms analysis windows)
 * 2. Dual-head OLA pitch shifter with drift management
 * 3. Scale-aware note snapping with configurable strength
 *
 * Parameters (via MessagePort):
 * - strength: 0-100 (correction aggressiveness, 0=bypass, 100=hard snap like T-Pain)
 * - key: 0-11 (C=0..B=11, -1=chromatic)
 * - mode: 0=minor, 1=major
 */

// This code runs as an AudioWorkletProcessor string blob.
// It's exported as a string constant to be loaded via Blob URL.

export const PITCH_CORRECTION_PROCESSOR_CODE = `
'use strict';

class PitchCorrectionProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        // === Parameters ===
        this._strength = 0;
        this._key = 0;
        this._mode = 1;

        // === Input ring buffer ===
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
        this._detectedPeriod = 0;

        // Chunked YIN: spread the O(N²) difference function across multiple
        // process() calls to prevent audio thread overruns.
        this._yinPhase = 0;        // 0=idle, 1-8=diff chunks, 9=finalize
        this._yinChunkSize = 128;  // tau values per chunk (1024/8 = 128)

        // === Pitch shift state ===
        this._ratio = 1.0;
        this._smoothedRatio = 1.0;

        // Dual-head crossfade OLA (fixed grain size for stable COLA)
        this._grainSize = 512;
        this._hanning = new Float32Array(512);
        this._computeHanning(512);

        // Latency: how far behind wPos the heads should nominally sit (4x grain)
        this._latency = 2048;

        // Head A (fractional position for interpolated reads)
        this._hAPos = 0;
        this._hAProg = 0;
        // Head B (offset by half grain)
        this._hBPos = 0;
        this._hBProg = 0;

        this._initialized = false;

        // === Pitch detection smoothing (median of 3) ===
        this._freqHistory = [0, 0, 0];
        this._freqHistIdx = 0;

        // === Voiced confidence (holdover during breaths/consonants) ===
        this._voicedConfidence = 0;

        // === Note-change hysteresis ===
        this._currentTargetMidi = -1;
        this._pendingTargetMidi = -1;
        this._pendingTargetCount = 0;

        // === Scale lookup ===
        this._major = [0, 2, 4, 5, 7, 9, 11];
        this._minor = [0, 2, 3, 5, 7, 8, 10];

        // === MessagePort ===
        this.port.onmessage = (e) => {
            const d = e.data;
            if (d.type === 'params') {
                if (d.strength !== undefined) this._strength = d.strength;
                if (d.key !== undefined) this._key = d.key;
                if (d.mode !== undefined) this._mode = d.mode;
            }
        };
    }

    _computeHanning(size) {
        const twoPi = 2 * Math.PI;
        for (let i = 0; i < size; i++) {
            this._hanning[i] = 0.5 * (1 - Math.cos(twoPi * i / size));
        }
    }

    _readBufLerp(pos) {
        const bLen = this._bufSize;
        const wrapped = ((pos % bLen) + bLen) % bLen;
        const i0 = Math.floor(wrapped);
        const i1 = (i0 + 1) % bLen;
        const frac = wrapped - i0;
        return this._buf[i0] * (1 - frac) + this._buf[i1] * frac;
    }

    _syncHeads() {
        const bLen = this._bufSize;
        const half = this._grainSize >> 1;
        const target = (this._wPos - this._latency + bLen) % bLen;
        // Head B at target with prog=half (Hanning peak=1): its first output
        // is buf[target], matching the direct bypass read position exactly.
        // Head A at target-half with prog=0 (Hanning=0): doesn't contribute
        // initially, then fades in smoothly. This eliminates clicks when
        // transitioning between bypass and OLA.
        this._hAPos = (target - half + bLen) % bLen;
        this._hAProg = 0;
        this._hBPos = target;
        this._hBProg = half;
    }

    // Two-tier drift correction: soft nudge in warning zone, hard reset only
    // if critically close. Do NOT nudge toward unshifted position — that
    // fights the pitch correction.
    _safePos(headPos) {
        const bLen = this._bufSize;
        const dist = (this._wPos - headPos + bLen) % bLen;
        const nominal = (this._wPos - this._latency + bLen) % bLen;

        // Critical zone: hard reset (about to collide with write head)
        if (dist < 256 || dist > bLen - 256) {
            return nominal;
        }

        // Warning zone: soft nudge 30% toward nominal (click-free at grain boundary)
        if (dist < 768 || dist > bLen - 768) {
            const toNominal = (nominal - headPos + bLen) % bLen;
            const nudge = toNominal < bLen / 2
                ? toNominal * 0.3
                : -(bLen - toNominal) * 0.3;
            return ((headPos + nudge) % bLen + bLen) % bLen;
        }

        return headPos;
    }

    process(inputs, outputs) {
        const inp = inputs[0] && inputs[0][0];
        const out = outputs[0] && outputs[0][0];
        if (!inp || !out) return true;

        const bLen = this._bufSize;
        const len = inp.length;

        // Write input to ring buffer
        for (let i = 0; i < len; i++) {
            this._buf[(this._wPos + i) % bLen] = inp[i];
        }
        this._wPos = (this._wPos + len) % bLen;

        // Initialize heads once we have enough data
        if (!this._initialized && this._wPos > this._yinSize) {
            this._syncHeads();
            this._initialized = true;
        }

        // Chunked pitch detection: the YIN difference function is O(N²) with
        // N=1024, far too heavy for a single process() call. We spread it
        // across 8 calls (~128 tau values each = ~131K ops instead of ~1M).
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
            // Phase 0: idle — count samples until next detection cycle
            this._analysisCount += len;
            if (this._analysisCount >= 1024) {
                this._analysisCount = 0;
                // Extract analysis window from ring buffer (snapshot for chunked processing)
                const start = (this._wPos - this._yinSize + this._bufSize) % this._bufSize;
                for (let i = 0; i < this._yinSize; i++) {
                    this._analysisBuf[i] = this._buf[(start + i) % this._bufSize];
                }
                this._yinPhase = 1;
            }
        }

        // Bypass if no correction needed
        if (this._strength === 0 || !this._initialized) {
            out.set(inp);
            this._syncHeads();
            return true;
        }

        // Block-rate ratio smoothing with musically meaningful retune speed.
        // Maps strength to retune time matching professional autotune behavior:
        //   strength 0→200ms (gentle), 40→50ms (natural), 80→5ms (heavy), 95+→instant
        const str = this._strength;
        let retuneMs;
        if (str >= 95) {
            retuneMs = 0;
        } else if (str >= 80) {
            retuneMs = 5 * (95 - str) / 15;
        } else {
            retuneMs = 5 + (80 - str) * 2.4375;
        }
        const tau = retuneMs > 0 ? retuneMs * 0.001 * sampleRate : 0;
        const alpha = tau > 0 ? 1.0 - Math.exp(-len / tau) : 1.0;
        this._smoothedRatio += (this._ratio - this._smoothedRatio) * alpha;
        const sr = this._smoothedRatio;

        // When no pitch correction is active (sr ≈ 1.0), bypass the dual-head
        // OLA entirely and read directly from the ring buffer. The OLA blends
        // audio from two time positions 256 samples apart, which creates a
        // comb-filter / phasing artifact even at ratio 1.0. Direct read is
        // artifact-free.
        if (Math.abs(sr - 1.0) < 0.001) {
            const readStart = (this._wPos - this._latency - len + bLen) % bLen;
            for (let i = 0; i < len; i++) {
                out[i] = this._buf[(readStart + i) % bLen];
            }
            this._syncHeads();
            return true;
        }

        // Generate pitch-shifted output via dual-head OLA crossfade.
        // Heads read at 1.0 speed within grains (preserving original signal),
        // with pitch-shift jumps at grain boundaries. Drift management prevents
        // read heads from colliding with the write head.
        const gs = this._grainSize;

        for (let i = 0; i < len; i++) {

            // Read from both heads with linear interpolation
            const sA = this._readBufLerp(this._hAPos);
            const sB = this._readBufLerp(this._hBPos);

            // Hanning windows
            const wA = this._hAProg < gs ? this._hanning[this._hAProg] : 0;
            const wB = this._hBProg < gs ? this._hanning[this._hBProg] : 0;

            // Normalized crossfade
            const wSum = wA + wB;
            if (wSum > 0.001) {
                out[i] = (sA * wA + sB * wB) / wSum;
            } else {
                out[i] = sA * 0.5 + sB * 0.5;
            }

            // Advance heads at 1.0 speed within grains (preserves original
            // signal perfectly — no resampling artifacts)
            this._hAPos = (this._hAPos + 1) % bLen;
            this._hBPos = (this._hBPos + 1) % bLen;
            this._hAProg++;
            this._hBProg++;

            // Head A grain boundary: apply pitch-shift jump + drift management.
            // Jump creates pitch shift: positive = skip forward (pitch up),
            // negative = skip backward (pitch down). Click-free because
            // Hanning weight = 0 at grain boundaries.
            if (this._hAProg >= gs) {
                this._hAProg = 0;
                const jump = (sr - 1.0) * gs;
                this._hAPos = (this._hAPos + jump + bLen) % bLen;
                this._hAPos = this._safePos(this._hAPos);
            }

            // Head B grain boundary
            if (this._hBProg >= gs) {
                this._hBProg = 0;
                const jump = (sr - 1.0) * gs;
                this._hBPos = (this._hBPos + jump + bLen) % bLen;
                this._hBPos = this._safePos(this._hBPos);
            }
        }

        return true;
    }

    // Finalize YIN detection after all difference-function chunks are computed.
    // Steps 2-4 of YIN are all O(N) and run in a single process() call.
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
        const minPeriod = Math.max(2, Math.floor(sampleRate / 2000));
        const maxPeriod = Math.min(half - 1, Math.floor(sampleRate / 60));
        const threshold = 0.15;
        let tauEst = -1;

        for (let tau = minPeriod; tau < maxPeriod; tau++) {
            if (yin[tau] < threshold) {
                // Find local minimum
                while (tau + 1 < half && yin[tau + 1] < yin[tau]) tau++;
                tauEst = tau;
                break;
            }
        }

        // Global minimum fallback: if threshold search failed, use best tau if good enough
        if (tauEst === -1) {
            let bestTau = -1;
            let bestVal = 1.0;
            for (let tau = minPeriod; tau < maxPeriod; tau++) {
                if (yin[tau] < bestVal) {
                    bestVal = yin[tau];
                    bestTau = tau;
                }
            }
            if (bestVal < 0.5) {
                tauEst = bestTau;
            }
        }

        if (tauEst === -1) {
            // Truly unvoiced / silence / noise
            this._detectedFreq = 0;
            return;
        }

        // Step 4: Parabolic interpolation for sub-sample accuracy
        const s0 = tauEst > 0 ? yin[tauEst - 1] : yin[tauEst];
        const s1 = yin[tauEst];
        const s2 = tauEst + 1 < half ? yin[tauEst + 1] : yin[tauEst];
        const denom = 2 * (s0 - 2 * s1 + s2);
        const betterTau = denom !== 0 ? tauEst + (s0 - s2) / denom : tauEst;

        this._detectedPeriod = betterTau;
        const rawFreq = sampleRate / betterTau;

        // Median filter: smooth over last 3 detections to reject single-frame errors
        this._freqHistory[this._freqHistIdx] = rawFreq;
        this._freqHistIdx = (this._freqHistIdx + 1) % 3;

        const a = this._freqHistory[0], b = this._freqHistory[1], c = this._freqHistory[2];
        // If any history slot is 0 (onset), use raw value directly
        if (a === 0 || b === 0 || c === 0) {
            this._detectedFreq = rawFreq;
        } else {
            // Median of 3
            this._detectedFreq = a + b + c - Math.max(a, b, c) - Math.min(a, b, c);
        }
    }

    _updateRatio() {
        // --- Voiced confidence: hold last correction during breaths/consonants ---
        if (this._detectedFreq < 60 || this._detectedFreq > 2000) {
            this._voicedConfidence = Math.max(0, this._voicedConfidence - 1);
            if (this._voicedConfidence <= 0) {
                // Sustained silence: release correction
                this._ratio = 1.0;
                this._currentTargetMidi = -1;
            }
            // Otherwise keep last ratio (holdover during brief gaps)
            return;
        }
        if (this._strength === 0) {
            this._ratio = 1.0;
            return;
        }
        // Build up voiced confidence (max 4 = ~48ms of stable pitch)
        this._voicedConfidence = Math.min(4, this._voicedConfidence + 1);

        // --- Find target with note-change hysteresis ---
        const result = this._findTarget(this._detectedFreq);
        const targetFreq = result.freq;
        const targetMidi = result.midi;

        // Hysteresis: require 2 consecutive frames agreeing on a NEW note
        // before switching target. Prevents jitter during transitions.
        if (this._currentTargetMidi === -1) {
            // First detection: accept immediately
            this._currentTargetMidi = targetMidi;
        } else if (targetMidi !== this._currentTargetMidi) {
            if (targetMidi === this._pendingTargetMidi) {
                this._pendingTargetCount++;
                if (this._pendingTargetCount >= 2) {
                    // Stable new note: switch target
                    this._currentTargetMidi = targetMidi;
                    this._pendingTargetMidi = -1;
                    this._pendingTargetCount = 0;
                }
            } else {
                // Different pending note: restart count
                this._pendingTargetMidi = targetMidi;
                this._pendingTargetCount = 1;
            }
        } else {
            // Same as current target: clear any pending
            this._pendingTargetMidi = -1;
            this._pendingTargetCount = 0;
        }

        // Use the committed target (not the raw detection)
        const committedFreq = 440 * Math.pow(2, (this._currentTargetMidi - 69) / 12);
        const full = committedFreq / this._detectedFreq;

        // Clamp to ±6 semitones (~0.707 to ~1.414)
        const clamped = Math.max(0.707, Math.min(1.414, full));

        // --- Dead zone: if correction < 15 cents, don't process ---
        // Preserves natural vocal character when already near the target.
        // 15 cents ≈ ratio of 1.0087
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

        // Scale mode: snap to nearest note in key
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
