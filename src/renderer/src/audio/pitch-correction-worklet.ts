/**
 * Pitch Correction AudioWorklet Processor
 *
 * Real-time autotune using:
 * 1. YIN algorithm for pitch detection (~12ms analysis windows)
 * 2. Dual-head crossfade pitch shifter (OLA-based, pitch-synchronous grains)
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

        // Dual-head crossfade OLA
        this._grainSize = 512;
        this._maxGrain = 2048;
        this._hanning = new Float32Array(this._maxGrain);
        this._computeHanning(this._grainSize);

        // Head A
        this._hAPos = 0;
        this._hAProg = 0;
        // Head B (offset by half grain)
        this._hBPos = 0;
        this._hBProg = 0;

        this._initialized = false;

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

    _readBuf(pos) {
        return this._buf[((pos | 0) % this._bufSize + this._bufSize) % this._bufSize];
    }

    _syncHeads() {
        const behind = 256;
        const target = (this._wPos - behind + this._bufSize) % this._bufSize;
        this._hAPos = target;
        this._hAProg = 0;
        this._hBPos = (target + (this._grainSize >> 1)) % this._bufSize;
        this._hBProg = this._grainSize >> 1;
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

        // Generate pitch-shifted output via dual-head crossfade
        const gs = this._grainSize;

        for (let i = 0; i < len; i++) {
            // Smooth ratio changes - speed tied to strength
            // High strength = fast retune (robotic), low = slow (natural)
            const rate = 0.003 + (this._strength / 100) * 0.047;
            this._smoothedRatio += (this._ratio - this._smoothedRatio) * rate;

            const sr = this._smoothedRatio;

            // Near unity ratio: pass through
            if (Math.abs(sr - 1.0) < 0.0005) {
                out[i] = this._readBuf(this._hAPos);
                this._hAPos = (this._hAPos + 1) % bLen;
                this._hBPos = (this._hBPos + 1) % bLen;
                this._hAProg = (this._hAProg + 1) % gs;
                this._hBProg = (this._hBProg + 1) % gs;
                continue;
            }

            // Read from both heads
            const sA = this._readBuf(this._hAPos);
            const sB = this._readBuf(this._hBPos);

            // Hanning windows
            const wA = this._hAProg < gs ? this._hanning[this._hAProg] : 0;
            const wB = this._hBProg < gs ? this._hanning[this._hBProg] : 0;

            // Normalized crossfade (sum of complementary Hanning = 1.0 when offset by half)
            const wSum = wA + wB;
            if (wSum > 0.001) {
                out[i] = (sA * wA + sB * wB) / wSum;
            } else {
                out[i] = sA * 0.5 + sB * 0.5;
            }

            // Advance heads
            this._hAPos = (this._hAPos + 1) % bLen;
            this._hBPos = (this._hBPos + 1) % bLen;
            this._hAProg++;
            this._hBProg++;

            // Head A grain boundary: jump to maintain pitch shift
            if (this._hAProg >= gs) {
                this._hAProg = 0;
                const jump = Math.round((sr - 1.0) * gs);
                this._hAPos = (this._hAPos + jump + bLen) % bLen;
            }

            // Head B grain boundary
            if (this._hBProg >= gs) {
                this._hBProg = 0;
                const jump = Math.round((sr - 1.0) * gs);
                this._hBPos = (this._hBPos + jump + bLen) % bLen;
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

        if (tauEst === -1) {
            // No pitch detected (unvoiced, silence, noise)
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
        this._detectedFreq = sampleRate / betterTau;

        // Adapt grain size to pitch period (2x period = best OLA quality)
        if (betterTau > 0) {
            const ideal = Math.round(betterTau * 2);
            const clamped = Math.max(128, Math.min(this._maxGrain, ideal));
            if (Math.abs(clamped - this._grainSize) > 32) {
                this._grainSize = clamped;
                this._computeHanning(clamped);
            }
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
