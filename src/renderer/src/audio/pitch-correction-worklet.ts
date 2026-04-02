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
        this._bufSize = 8192;
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

        // === Pitch shift state ===
        this._ratio = 1.0;
        this._smoothedRatio = 1.0;

        // Dual-head crossfade OLA (fixed grain size for stable COLA)
        this._grainSize = 1024;
        this._hanning = new Float32Array(1024);
        this._computeHanning(1024);

        // Latency: how far behind wPos the heads should nominally sit (2x grain)
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
        const target = (this._wPos - this._latency + bLen) % bLen;
        this._hAPos = target;
        this._hAProg = 0;
        this._hBPos = (target + (this._grainSize >> 1)) % bLen;
        this._hBProg = this._grainSize >> 1;
    }

    // Soft re-centering: nudge head toward ideal position at grain boundaries.
    // Hard-snap only if dangerously close to write head.
    _safePos(headPos) {
        const bLen = this._bufSize;
        const target = (this._wPos - this._latency + bLen) % bLen;
        let dist = (this._wPos - headPos + bLen) % bLen;

        // Emergency hard snap if about to collide with write head
        if (dist < 128 || dist > bLen - 128) {
            return target;
        }

        // Gradual nudge: move 25% toward target each grain boundary
        let drift = target - headPos;
        // Wrap to shortest signed path
        if (drift > bLen / 2) drift -= bLen;
        if (drift < -bLen / 2) drift += bLen;
        const nudge = drift * 0.25;
        return ((headPos + nudge) % bLen + bLen) % bLen;
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

        // Run pitch detection periodically (~every 512 samples = ~12ms)
        this._analysisCount += len;
        if (this._analysisCount >= 512) {
            this._analysisCount = 0;
            this._detectPitch();
            this._updateRatio();
        }

        // Bypass if no correction needed
        if (this._strength === 0 || !this._initialized) {
            out.set(inp);
            this._syncHeads();
            return true;
        }

        // Generate pitch-shifted output via dual-head OLA crossfade
        // Heads read at 1.0 speed within grains. Pitch shift comes from
        // the jump at grain boundaries: jump = (ratio - 1) * grainSize.
        // Drift management snaps heads back to safe zone at boundaries
        // (where Hanning weight = 0, so snapping is click-free).
        const gs = this._grainSize;

        for (let i = 0; i < len; i++) {
            // Smooth ratio changes - speed tied to strength
            // High strength = fast retune (robotic), low = slow (natural)
            const rate = 0.003 + (this._strength / 100) * 0.047;
            this._smoothedRatio += (this._ratio - this._smoothedRatio) * rate;

            const sr = this._smoothedRatio;

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

            // Advance heads at 1.0 speed within grains
            this._hAPos = (this._hAPos + 1) % bLen;
            this._hBPos = (this._hBPos + 1) % bLen;
            this._hAProg++;
            this._hBProg++;

            // Head A grain boundary: apply pitch-shift jump + drift management
            if (this._hAProg >= gs) {
                this._hAProg = 0;
                // Jump creates pitch shift: positive = skip forward (pitch up),
                // negative = skip backward (pitch down)
                const jump = (sr - 1.0) * gs;
                this._hAPos = (this._hAPos + jump + bLen) % bLen;
                // Snap back if drifted into unsafe zone (click-free: Hanning = 0 here)
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

    _detectPitch() {
        // Extract analysis window from ring buffer
        const start = (this._wPos - this._yinSize + this._bufSize) % this._bufSize;
        for (let i = 0; i < this._yinSize; i++) {
            this._analysisBuf[i] = this._buf[(start + i) % this._bufSize];
        }

        const buf = this._analysisBuf;
        const yin = this._yinBuf;
        const half = this._yinHalf;

        // Step 1: Difference function
        for (let tau = 0; tau < half; tau++) {
            let sum = 0;
            for (let i = 0; i < half; i++) {
                const d = buf[i] - buf[i + tau];
                sum += d * d;
            }
            yin[tau] = sum;
        }

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
        const threshold = 0.3;
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
        if (this._detectedFreq < 60 || this._detectedFreq > 2000 || this._strength === 0) {
            this._ratio = 1.0;
            return;
        }

        const target = this._findTarget(this._detectedFreq);
        const full = target / this._detectedFreq;

        // Clamp to ±6 semitones (~0.707 to ~1.414)
        const clamped = Math.max(0.707, Math.min(1.414, full));

        // Apply strength weighting
        this._ratio = 1.0 + (clamped - 1.0) * (this._strength / 100);
    }

    _findTarget(freq) {
        const midi = 12 * Math.log2(freq / 440) + 69;

        // Chromatic mode: snap to nearest semitone
        if (this._key < 0) {
            const rounded = Math.round(midi);
            return 440 * Math.pow(2, (rounded - 69) / 12);
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

        return 440 * Math.pow(2, (bestMidi - 69) / 12);
    }
}

registerProcessor('pitch-correction-processor', PitchCorrectionProcessor);
`;
