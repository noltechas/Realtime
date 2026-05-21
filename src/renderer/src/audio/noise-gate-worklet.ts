/**
 * Noise Gate AudioWorklet Processor — smooth downward expander.
 *
 * Replaces the previous main-thread, requestAnimationFrame-driven binary
 * gate which clicked on threshold crossings and got starved during heavy
 * stage rendering. This runs on the audio thread, sees every sample, and
 * produces a continuous gain curve.
 *
 * Design:
 * - Per-sample peak envelope follower with separate attack/release coefs.
 * - Soft-knee downward expander around the threshold:
 *     envDb >= threshold + 6  → gain = 1.0          (full pass)
 *     envDb <= threshold - 6  → gain = floor (~-40 dB)
 *     ±6 dB knee              → quadratic interpolation
 *   Effective ratio ≈ 4:1 across the knee.
 * - Release-driven hysteresis prevents flutter near threshold.
 * - 2-channel pass-through. When `enabled === false`, output equals input.
 *
 * Parameters (via MessagePort):
 *   { type: 'params', enabled: boolean, threshold: number }   // threshold in dB
 */

export const NOISE_GATE_PROCESSOR_CODE = `
'use strict';

class NoiseGateProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        // Tunables
        this._enabled = false;
        this._threshold = -50;       // dB
        this._knee = 6;              // ± dB around threshold
        this._floorDb = -40;         // gain floor when fully closed
        this._floorLin = Math.pow(10, this._floorDb / 20);

        // Envelope follower coefficients — converted from time constants
        // via coef = exp(-1 / (timeConst * sampleRate))
        const attackMs = 5;
        const releaseMs = 50;
        this._attackCoef = Math.exp(-1 / (0.001 * attackMs * sampleRate));
        this._releaseCoef = Math.exp(-1 / (0.001 * releaseMs * sampleRate));

        // State
        this._env = 0;               // peak envelope (linear amplitude)
        this._gain = 1;              // current applied gain (linear)

        this.port.onmessage = (e) => {
            const d = e.data;
            if (d.type === 'params') {
                if (typeof d.enabled === 'boolean') this._enabled = d.enabled;
                if (typeof d.threshold === 'number') this._threshold = d.threshold;
            }
        };
    }

    /**
     * Map envelope-dB to gain via a soft-knee downward expander.
     *   above (thr + knee)  → 1
     *   below (thr - knee)  → floor
     *   in knee             → quadratic ease so dG/dDB is continuous at the
     *                         edges (prevents click on threshold approach).
     */
    _expanderGain(envDb) {
        const thr = this._threshold;
        const k = this._knee;
        if (envDb >= thr + k) return 1;
        if (envDb <= thr - k) return this._floorLin;
        // x = 0 at (thr - k), x = 1 at (thr + k)
        const x = (envDb - (thr - k)) / (2 * k);
        // Quadratic ease: gain in dB rises from floorDb (at x=0) to 0 (at x=1)
        // with zero derivative at both ends → click-free transitions.
        // Easing: y = x * x * (3 - 2 * x)  (smoothstep)
        const eased = x * x * (3 - 2 * x);
        const gainDb = this._floorDb + (0 - this._floorDb) * eased;
        return Math.pow(10, gainDb / 20);
    }

    process(inputs, outputs) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || input.length === 0 || !output || output.length === 0) {
            return true;
        }

        const nCh = Math.min(input.length, output.length);
        const len = input[0].length;

        if (!this._enabled) {
            // Pass-through. Also relax the envelope toward zero so re-enabling
            // doesn't open with a stale level.
            for (let ch = 0; ch < nCh; ch++) {
                const i = input[ch];
                const o = output[ch];
                for (let n = 0; n < len; n++) o[n] = i[n];
            }
            this._env *= this._releaseCoef;
            this._gain += (1 - this._gain) * (1 - this._releaseCoef);
            return true;
        }

        // Build a per-sample mono peak signal from the max abs across channels.
        // Update envelope and gain once per sample, apply to every channel.
        for (let n = 0; n < len; n++) {
            let peak = 0;
            for (let ch = 0; ch < nCh; ch++) {
                const a = Math.abs(input[ch][n]);
                if (a > peak) peak = a;
            }
            // Peak follower: instant attack on rise, exponential release.
            if (peak > this._env) {
                this._env = peak + (this._env - peak) * this._attackCoef;
            } else {
                this._env = peak + (this._env - peak) * this._releaseCoef;
            }

            const envDb = this._env > 1e-6 ? 20 * Math.log10(this._env) : -120;
            const targetGain = this._expanderGain(envDb);
            // One-pole smoothing on the gain itself with the same release
            // coef — keeps openings fast (attack coef on rise) and closures
            // gentle (release coef on fall).
            if (targetGain > this._gain) {
                this._gain = targetGain + (this._gain - targetGain) * this._attackCoef;
            } else {
                this._gain = targetGain + (this._gain - targetGain) * this._releaseCoef;
            }

            const g = this._gain;
            for (let ch = 0; ch < nCh; ch++) {
                output[ch][n] = input[ch][n] * g;
            }
        }
        return true;
    }
}

registerProcessor('noise-gate-processor', NoiseGateProcessor);
`;
