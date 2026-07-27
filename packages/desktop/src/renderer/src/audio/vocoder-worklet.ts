/**
 * Vocoder AudioWorklet Processor — v19: full ground-up rebuild.
 *
 * History: v3-v18 never shipped a working vocoder. v3-v15 were 16-band
 * channel vocoders that all produced a "ringing buzz"; v16-v18 were
 * progressively stripped-down diagnostics, ending with v18 = a fixed
 * key/mode chord, ONE peaking EQ, amplitude-modulated by the broadband
 * voice envelope and pushed through tanh. With the default mix=100 that
 * replaced the dry voice with a faint pulsing drone — no vowels, no
 * consonants, barely any level — i.e. "the voice is completely inaudible".
 *
 * Post-mortem of the v3-v15 buzz (why this rebuild is different):
 *   1. The band filters used the RBJ "constant SKIRT gain" bandpass form
 *      (b0 = Q*alpha), whose PEAK gain equals Q (~+10 dB at Q 3). Summing
 *      16 such bands ran hot into...
 *   2. ...a tanh() "makeup" stage (x4 gain). tanh of a chord is an
 *      intermodulation-distortion generator: sum + difference tones of
 *      every harmonic pair = inharmonic "ringing buzz" at any level.
 *   3. Single 2nd-order sections (12 dB/oct skirts) leak far outside each
 *      band, so all 16 bands responded to the same energy (mud), and
 *   4. The carrier chord was fixed at the song key's root — a drone that
 *      ignores the melody — pinned to a low register where saw harmonics
 *      beat against each other.
 *
 * v19 design (researched against classic hardware — Moog 16 Channel /
 * VM Rackmode, MFOS 12-channel, Sennheiser-era channel vocoders — and
 * standard DSP practice):
 *
 *   ANALYSIS (voice = modulator)
 *     - 16 bands, log-spaced 120 Hz -> 7 kHz (concentrated where speech
 *       articulation lives, per the hardware band tables).
 *     - Each band: TWO cascaded RBJ "constant 0 dB peak gain" bandpass
 *       biquads (24 dB/oct skirts, unity gain at center). On the synthesis
 *       re-sum, every SECOND band is polarity-inverted: adjacent cascaded
 *       bands arrive at the crossover ~180 deg apart, so a straight sum
 *       notches at every band boundary (measured 17 dB ripple at Q 2.4)
 *       while the alternating sum is nearly flat (measured 1.4 dB ripple).
 *       Verified empirically in scripts/test-vocoder.js.
 *     - Per-band envelope follower: full-wave rectify -> one-pole with
 *       3 ms attack / 50 ms release ("articulation" per VM Rackmode).
 *     - A fixed high-tilt weight per band (sqrt(fc/800), clamped) stands in
 *       for the classic modulator pre-emphasis so F2/F3 vowel cues and
 *       consonants register clearly in the envelopes.
 *     - Per-block spectral contrast: each band envelope is scaled by
 *       (env/maxEnv)^0.25, dipping bands far below the dominant formant.
 *       Sharpens vowel identity ("mushy vocoder" fix) without changing
 *       the level of the dominant bands.
 *
 *   PITCH-TRACKED CARRIER (the fix for "drone ignores the melody")
 *     - The worklet runs its own YIN pitch detector (same algorithm as the
 *       autotune worklet, but on a 6:1-decimated ~8 kHz buffer — plenty for
 *       70-800 Hz fundamentals and ~40x cheaper). Median-of-3 + octave-jump
 *       rejection + snap to the song's key/mode scale (chromatic when
 *       key < 0), then a 25 ms portamento glide.
 *     - The carrier plays AT THE SUNG PITCH, so the vocoder follows the
 *       melody exactly like a talkbox/keyboard vocoder performance. The
 *       upstream autotune (pitch correction runs before this node) means
 *       the tracked pitch is already scale-stable for hard-tune presets.
 *     - voicing 'octaves' = root + sub-octave + octave (classic robot),
 *       'power' = + fifth + octave, 'triad' = + DIATONIC third + fifth
 *       within the key/mode scale (stacked-harmony talkbox sound).
 *     - Oscillators: polyBLEP saw blended with sine per 'brightness'
 *       (0 = soft hum, 100 = full buzzy saw — dense harmonics feed every
 *       band, which is what carrier research says intelligibility needs).
 *     - Unvoiced sounds (s/sh/t/f...): a spectral-balance detector (high-
 *       band vs low-band envelope energy, the same trick as the MFOS
 *       sibilance VCA) crossfades the carrier to white noise so consonants
 *       render as filterbank-shaped noise. This is core vocoder behavior,
 *       always on — without it there are no consonants at all.
 *
 *   SYNTHESIS
 *     - The carrier runs through an IDENTICAL 16-band filterbank.
 *     - Each carrier band is normalized by its own slow AGC envelope
 *       (~80 ms) and multiplied by the voice band envelope. Normalizing
 *       makes the OUTPUT spectral envelope equal the VOICE's spectral
 *       envelope regardless of where the carrier's harmonics happen to
 *       sit — this is what makes vowels track accurately at any register,
 *       and it self-corrects loudness: wet output tracks voice level.
 *     - No saturation stage in the signal path (see post-mortem #2). Only
 *       a hard safety ceiling at +/-1.2 that normal levels never touch.
 *
 *   SIBILANCE (the 'sibilance' 0-100 param)
 *     - Classic "hiss bypass" (VP-330 / VM Rackmode style): the dry voice
 *       highpassed at 5 kHz, gated by the unvoiced detector, mixed in on
 *       top. 0 = fully vocoded consonants (default), higher = crisper
 *       natural s/t/sh on top of the vocoded voice.
 *
 * Parameters (via MessagePort — contract unchanged from v18):
 *   { type: 'params',
 *     enabled:    boolean,
 *     mix:        number,  // 0-100 (% wet)
 *     brightness: number,  // 0-100 (0 = sine carrier, 100 = saw)
 *     sibilance:  number,  // 0-100 hiss-bypass level
 *     voicing:    'triad' | 'power' | 'octaves',
 *     key:        number,  // 0-11 (C=0..B=11), -1 = chromatic
 *     mode:       number   // 0 = minor, 1 = major
 *   }
 */

export const VOCODER_PROCESSOR_CODE = `
'use strict';

var NUM_BANDS = 16;
var F_LO = 120;
var F_HI = 7000;
var STAGE_Q = 2.4;         // per-biquad Q; two cascaded stages per band
var ENV_ATK_MS = 3;        // modulator envelope attack
var ENV_REL_MS = 50;       // modulator envelope release
var CAR_ENV_MS = 80;       // carrier AGC follower (both directions)
var CAR_NORM_FLOOR = 0.01; // max carrier normalization = 1/0.01 = +40 dB
var BAND_CLIP = 4;         // normalized carrier band hard bound (safety)
var GLIDE_MS = 25;         // portamento between detected notes
var MAKEUP = 0.72;         // calibrated in scripts/test-vocoder.js (wet ~= dry level)
var CONTRAST = 0.25;       // spectral-contrast exponent (0 = off)

class VocoderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        try { console.log('[Vocoder Worklet] v19: pitch-tracked 16-band channel vocoder'); } catch (e) {}

        // ── Parameters ──────────────────────────────────────────────────
        this._enabled = false;
        this._mix = 0;
        this._brightness = 0.7;
        this._sibilance = 0;
        this._voicing = 'triad';
        this._key = -1;
        this._mode = 1;

        this._major = [0, 2, 4, 5, 7, 9, 11];
        this._minor = [0, 2, 3, 5, 7, 8, 10];

        // Mix smoothing (10 ms one-pole) so slider drags / toggles don't zipper.
        this._mixSmooth = 0;
        this._mixSmoothCoef = Math.exp(-1 / (0.010 * sampleRate));

        // ── Filterbank coefficients (shared by analysis + synthesis) ────
        // RBJ cookbook bandpass, "constant 0 dB peak gain" form:
        //   b0 = alpha/a0, b1 = 0, b2 = -alpha/a0  (unity at fc — NOT the
        //   constant-skirt form whose peak gain = Q; see post-mortem #1).
        this._centers = new Float32Array(NUM_BANDS);
        this._fbB0 = new Float32Array(NUM_BANDS);
        this._fbA1 = new Float32Array(NUM_BANDS);
        this._fbA2 = new Float32Array(NUM_BANDS);
        this._envWeight = new Float32Array(NUM_BANDS);
        // Alternate-band polarity for the synthesis re-sum (see header).
        this._bandSign = new Float32Array(NUM_BANDS);
        var ratio = Math.pow(F_HI / F_LO, 1 / (NUM_BANDS - 1));
        for (var b = 0; b < NUM_BANDS; b++) {
            var fc = F_LO * Math.pow(ratio, b);
            this._centers[b] = fc;
            var w0 = 2 * Math.PI * fc / sampleRate;
            var alpha = Math.sin(w0) / (2 * STAGE_Q);
            var a0 = 1 + alpha;
            this._fbB0[b] = alpha / a0;
            this._fbA1[b] = (-2 * Math.cos(w0)) / a0;
            this._fbA2[b] = (1 - alpha) / a0;
            // Fixed pre-emphasis tilt applied to the band ENVELOPES (not the
            // audio): boosts consonant/F2/F3 articulation like the classic
            // modulator highpass, without touching the audible path.
            var wgt = Math.sqrt(fc / 800);
            this._envWeight[b] = Math.min(2.2, Math.max(0.6, wgt));
            this._bandSign[b] = (b & 1) ? -1 : 1;
        }

        // Filter state: [stage1, stage2] x [modulator, carrier] per band.
        // DF2T per biquad needs 2 state vars; b1 = 0 lets us fold the math.
        this._modS1a = new Float32Array(NUM_BANDS); this._modS1b = new Float32Array(NUM_BANDS);
        this._modS2a = new Float32Array(NUM_BANDS); this._modS2b = new Float32Array(NUM_BANDS);
        this._carS1a = new Float32Array(NUM_BANDS); this._carS1b = new Float32Array(NUM_BANDS);
        this._carS2a = new Float32Array(NUM_BANDS); this._carS2b = new Float32Array(NUM_BANDS);

        // Envelopes.
        this._envMod = new Float32Array(NUM_BANDS);
        this._envCar = new Float32Array(NUM_BANDS);
        this._bandGain = new Float32Array(NUM_BANDS); // per-block contrast-weighted env
        this._envAtk = Math.exp(-1 / (0.001 * ENV_ATK_MS * sampleRate));
        this._envRel = Math.exp(-1 / (0.001 * ENV_REL_MS * sampleRate));
        this._envCarCoef = Math.exp(-1 / (0.001 * CAR_ENV_MS * sampleRate));

        // Indices for the voiced/unvoiced spectral-balance detector.
        // low = bands with fc <= ~1050 Hz (vowel energy), high = fc >= ~3100
        // (sibilant energy). The 1-3 kHz middle stays neutral.
        this._loEnd = 0; this._hiStart = NUM_BANDS;
        for (var b2 = 0; b2 < NUM_BANDS; b2++) {
            if (this._centers[b2] <= 1100) this._loEnd = b2 + 1;
            if (this._centers[b2] >= 3000 && this._hiStart === NUM_BANDS) this._hiStart = b2;
        }
        this._noiseAmt = 0; // smoothed 0..1 unvoiced blend
        this._noiseAtk = Math.exp(-1 / (0.005 * sampleRate));
        this._noiseRel = Math.exp(-1 / (0.015 * sampleRate));

        // ── Pitch tracker (decimated YIN) ───────────────────────────────
        this._dsFactor = Math.max(1, Math.round(sampleRate / 8000));
        this._dsRate = sampleRate / this._dsFactor;
        this._dsPhase = 0;
        // Anti-alias one-pole ~3 kHz before decimation (enough for a pitch
        // tracker that only needs energy below ~1 kHz to be clean).
        this._dsLpCoef = 1 - Math.exp(-2 * Math.PI * 3000 / sampleRate);
        this._dsLpState = 0;
        this._YIN_WIN = 512;                       // 64 ms at 8 kHz
        this._dsBuf = new Float32Array(1024);      // ring, power of two
        this._dsWrite = 0;
        this._dsSinceYin = 0;
        this._YIN_HOP = 128;                       // detect every ~16 ms
        this._yinDiff = new Float32Array(256);
        this._yinWork = new Float32Array(this._YIN_WIN);
        this._freqHist = new Float32Array(3);
        this._freqHistIdx = 0;
        this._committedMidi = -1;
        this._jumpFrames = 0;
        this._glideMidi = 57;                      // A3 until first detection
        this._targetMidi = 57;
        this._voiced = false;

        // ── Carrier oscillators (up to 4 voices + shared sub) ───────────
        this._MAX_OSCS = 5;
        this._oscPhase = new Float32Array(this._MAX_OSCS);
        this._oscFreq = new Float32Array(this._MAX_OSCS);
        this._oscLevel = new Float32Array(this._MAX_OSCS);
        this._numOscs = 0;
        this._semisBuf = new Int8Array(4); // chord intervals scratch (no per-block alloc)
        for (var i = 0; i < this._MAX_OSCS; i++) this._oscPhase[i] = (i * 0.37) % 1;

        // White-noise carrier for unvoiced frames (deterministic LCG).
        this._rng = 22222;

        // ── Sibilance hiss bypass: 2 cascaded RBJ highpass @ 5 kHz ──────
        var hw0 = 2 * Math.PI * 5000 / sampleRate;
        var halpha = Math.sin(hw0) / (2 * 0.707);
        var hcos = Math.cos(hw0);
        var ha0 = 1 + halpha;
        this._hpB0 = (1 + hcos) / 2 / ha0;
        this._hpB1 = -(1 + hcos) / ha0;
        this._hpB2 = (1 + hcos) / 2 / ha0;
        this._hpA1 = (-2 * hcos) / ha0;
        this._hpA2 = (1 - halpha) / ha0;
        this._hp1x1 = 0; this._hp1x2 = 0; this._hp1y1 = 0; this._hp1y2 = 0;
        this._hp2x1 = 0; this._hp2x2 = 0; this._hp2y1 = 0; this._hp2y2 = 0;

        this._bypassBlocks = 1000; // start "long bypassed" => clean state on first enable

        // ── Param dispatch from main thread ──────────────────────────────
        this.port.onmessage = (e) => {
            var d = e.data;
            if (!d || d.type !== 'params') return;
            if (typeof d.enabled    === 'boolean') this._enabled    = d.enabled;
            if (typeof d.mix        === 'number')  this._mix        = Math.max(0, Math.min(1, d.mix / 100));
            if (typeof d.brightness === 'number')  this._brightness = Math.max(0, Math.min(1, d.brightness / 100));
            if (typeof d.sibilance  === 'number')  this._sibilance  = Math.max(0, Math.min(1, d.sibilance / 100));
            if (typeof d.voicing    === 'string')  this._voicing    = d.voicing;
            if (typeof d.key        === 'number')  this._key        = d.key;
            if (typeof d.mode       === 'number')  this._mode       = d.mode;
        };
    }

    /** Zero all audio state (called when re-activating after a long bypass). */
    _resetState() {
        this._modS1a.fill(0); this._modS1b.fill(0); this._modS2a.fill(0); this._modS2b.fill(0);
        this._carS1a.fill(0); this._carS1b.fill(0); this._carS2a.fill(0); this._carS2b.fill(0);
        this._envMod.fill(0); this._envCar.fill(0);
        this._noiseAmt = 0;
        this._dsLpState = 0; this._dsBuf.fill(0); this._dsSinceYin = 0;
        this._freqHist[0] = 0; this._freqHist[1] = 0; this._freqHist[2] = 0;
        this._committedMidi = -1; this._jumpFrames = 0; this._voiced = false;
        this._hp1x1 = 0; this._hp1x2 = 0; this._hp1y1 = 0; this._hp1y2 = 0;
        this._hp2x1 = 0; this._hp2x2 = 0; this._hp2y1 = 0; this._hp2y2 = 0;
    }

    /** Snap a MIDI note to the key/mode scale (nearest in-scale note). */
    _snapMidi(midi) {
        var rounded = Math.round(midi);
        if (this._key < 0 || this._key > 11) return rounded;
        var scale = this._mode === 1 ? this._major : this._minor;
        var best = rounded, bestDist = 100;
        for (var off = -3; off <= 3; off++) {
            var cand = rounded + off;
            var rel = (((cand % 12) + 12) % 12 - this._key + 12) % 12;
            if (scale.indexOf(rel) !== -1) {
                var dist = Math.abs(midi - cand);
                if (dist < bestDist) { bestDist = dist; best = cand; }
            }
        }
        return best;
    }

    /**
     * Chord intervals (in semitones above the root) for the current voicing,
     * written into the preallocated _semisBuf (no per-block allocation on
     * the audio thread). 'triad' uses the DIATONIC third/fifth within the
     * key/mode scale so the stacked harmony always stays in key as the
     * melody moves. Chromatic mode (key < 0) falls back to the mode's
     * fixed third. Returns the interval count.
     */
    _chordSemis(rootMidi) {
        var out = this._semisBuf;
        if (this._voicing === 'octaves') { out[0] = 0; out[1] = 12; return 2; }
        if (this._voicing === 'power') { out[0] = 0; out[1] = 7; out[2] = 12; return 3; }
        var third = this._mode === 1 ? 4 : 3;
        var fifth = 7;
        if (this._key >= 0 && this._key <= 11) {
            var scale = this._mode === 1 ? this._major : this._minor;
            var rel = (((rootMidi % 12) + 12) % 12 - this._key + 12) % 12;
            var deg = scale.indexOf(rel);
            if (deg !== -1) {
                var t = scale[(deg + 2) % 7] - rel; if (t <= 0) t += 12;
                var f = scale[(deg + 4) % 7] - rel; if (f <= 0) f += 12;
                third = t; fifth = f;
            }
        }
        out[0] = 0; out[1] = third; out[2] = fifth;
        return 3;
    }

    /** Rebuild oscillator freq/level tables from the (glided) root. */
    _updateVoices() {
        var semiCount = this._chordSemis(Math.round(this._targetMidi));
        var semis = this._semisBuf;
        var rootFreq = 440 * Math.pow(2, (this._glideMidi - 69) / 12);
        var n = 0;
        // Sub-octave first: fills the low bands with fundamental support.
        this._oscFreq[n] = rootFreq * 0.5; this._oscLevel[n] = 0.5; n++;
        for (var i = 0; i < semiCount && n < this._MAX_OSCS; i++) {
            this._oscFreq[n] = rootFreq * Math.pow(2, semis[i] / 12);
            this._oscLevel[n] = i === 0 ? 1.0 : 0.62;
            n++;
        }
        this._numOscs = n;
        // Normalize so the summed carrier peaks near +/-0.9.
        var sum = 0;
        for (var j = 0; j < n; j++) sum += this._oscLevel[j];
        var norm = 0.9 / sum;
        for (var k = 0; k < n; k++) this._oscLevel[k] *= norm;
    }

    /** PolyBLEP residual for a saw at phase t with step dt (Valimaki 2007). */
    _polyBlep(t, dt) {
        if (t < dt) { var x = t / dt; return x + x - x * x - 1; }
        if (t > 1 - dt) { var y = (t - 1) / dt; return y * y + y + y + 1; }
        return 0;
    }

    /**
     * YIN on the decimated ring buffer (CMND + threshold + parabolic
     * interpolation — same algorithm as the autotune worklet). Returns a
     * frequency in Hz or 0 when no confident pitch is found.
     */
    _detectPitch() {
        var W = this._YIN_WIN;
        var half = 256;
        var buf = this._yinWork;
        var mask = this._dsBuf.length - 1;
        var start = (this._dsWrite - W) & mask;
        var energy = 0;
        for (var i = 0; i < W; i++) {
            var v = this._dsBuf[(start + i) & mask];
            buf[i] = v;
            energy += v * v;
        }
        // Silence gate: don't chase noise-floor autocorrelations.
        if (energy / W < 1e-6) return 0;

        var diff = this._yinDiff;
        var minTau = Math.max(2, Math.floor(this._dsRate / 800));   // <= 800 Hz
        var maxTau = Math.min(half - 1, Math.floor(this._dsRate / 65)); // >= 65 Hz
        for (var tau = 1; tau <= maxTau; tau++) {
            var sum = 0;
            for (var j = 0; j < half; j++) {
                var d = buf[j] - buf[j + tau];
                sum += d * d;
            }
            diff[tau] = sum;
        }
        // Cumulative mean normalized difference.
        diff[0] = 1;
        var runSum = 0;
        for (var t2 = 1; t2 <= maxTau; t2++) {
            runSum += diff[t2];
            diff[t2] = runSum > 0 ? (diff[t2] * t2 / runSum) : 1;
        }
        var tauEst = -1;
        for (var t3 = minTau; t3 <= maxTau; t3++) {
            if (diff[t3] < 0.15) {
                while (t3 + 1 <= maxTau && diff[t3 + 1] < diff[t3]) t3++;
                tauEst = t3;
                break;
            }
        }
        if (tauEst === -1) {
            var bestV = 1.0, bestT = -1;
            for (var t4 = minTau; t4 <= maxTau; t4++) {
                if (diff[t4] < bestV) { bestV = diff[t4]; bestT = t4; }
            }
            if (bestV < 0.2) tauEst = bestT;
        }
        if (tauEst === -1) return 0;
        var s0 = diff[tauEst - 1 >= 0 ? tauEst - 1 : tauEst];
        var s1 = diff[tauEst];
        var s2 = diff[tauEst + 1 <= maxTau ? tauEst + 1 : tauEst];
        var denom = 2 * (s0 - 2 * s1 + s2);
        var better = denom !== 0 ? tauEst + (s0 - s2) / denom : tauEst;
        return this._dsRate / better;
    }

    /** Median-of-3 + octave-jump rejection + scale snap => committed target. */
    _updateTarget(rawFreq) {
        if (rawFreq < 65 || rawFreq > 900) { this._voiced = false; return; }
        this._freqHist[this._freqHistIdx] = rawFreq;
        this._freqHistIdx = (this._freqHistIdx + 1) % 3;
        var a = this._freqHist[0], b = this._freqHist[1], c = this._freqHist[2];
        var med;
        if (a === 0 || b === 0 || c === 0) {
            med = rawFreq; // history not full yet
        } else {
            med = Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
        }
        var midi = 12 * Math.log2(med / 440) + 69;
        if (midi < 36) midi = 36;
        if (midi > 84) midi = 84;
        var snapped = this._snapMidi(midi);
        if (this._committedMidi === -1 || Math.abs(snapped - this._committedMidi) <= 9) {
            this._committedMidi = snapped;
            this._jumpFrames = 0;
        } else {
            // Big jumps are usually YIN octave errors; only commit if they
            // persist (a real octave change lasts many frames).
            this._jumpFrames++;
            if (this._jumpFrames >= 2) {
                this._committedMidi = snapped;
                this._jumpFrames = 0;
            }
        }
        this._targetMidi = this._committedMidi;
        this._voiced = true;
    }

    process(inputs, outputs) {
        var input = inputs[0];
        var output = outputs[0];
        if (!output || output.length === 0) return true;
        var numOutCh = output.length;
        if (!input || input.length === 0 || !input[0]) {
            return true; // outputs are pre-zeroed
        }
        var inp = input[0];
        var len = inp.length;

        var targetMix = this._enabled ? this._mix : 0;

        // Fast bypass when fully off and the smoothed mix has drained.
        // The node is permanently spliced into the voice chain, so this
        // path MUST be a bit-exact unity passthrough.
        if (targetMix < 0.001 && this._mixSmooth < 0.001) {
            for (var ch = 0; ch < numOutCh; ch++) {
                var o = output[ch];
                for (var n0 = 0; n0 < len; n0++) o[n0] = inp[n0];
            }
            this._mixSmooth = 0;
            if (this._bypassBlocks < 100000) this._bypassBlocks++;
            return true;
        }

        // Re-activating after a long bypass: start from silence, not from
        // stale filter/envelope state.
        if (this._bypassBlocks > 20) this._resetState();
        this._bypassBlocks = 0;

        var TWO_PI = 2 * Math.PI;
        var NB = NUM_BANDS;
        var envAtk = this._envAtk, envRel = this._envRel, carCoef = this._envCarCoef;
        var fbB0 = this._fbB0, fbA1 = this._fbA1, fbA2 = this._fbA2;
        var modS1a = this._modS1a, modS1b = this._modS1b, modS2a = this._modS2a, modS2b = this._modS2b;
        var carS1a = this._carS1a, carS1b = this._carS1b, carS2a = this._carS2a, carS2b = this._carS2b;
        var envMod = this._envMod, envCar = this._envCar, envWeight = this._envWeight;
        var bandGain = this._bandGain, bandSign = this._bandSign;

        // ── Block-rate: pitch glide + oscillator tables ──────────────────
        var glideAlpha = 1 - Math.exp(-len / (0.001 * GLIDE_MS * sampleRate));
        if (this._voiced) {
            this._glideMidi += (this._targetMidi - this._glideMidi) * glideAlpha;
        }
        this._updateVoices();

        // ── Block-rate: spectral contrast weights from current envelopes ─
        var maxEnv = 1e-9;
        for (var mb = 0; mb < NB; mb++) {
            var wgtd = envMod[mb] * envWeight[mb];
            if (wgtd > maxEnv) maxEnv = wgtd;
        }
        for (var gb = 0; gb < NB; gb++) {
            var e = envMod[gb] * envWeight[gb];
            bandGain[gb] = e * Math.pow(e / maxEnv, CONTRAST);
        }

        // ── Block-rate: voiced/unvoiced spectral balance ─────────────────
        var loSum = 1e-9, hiSum = 0;
        for (var lb = 0; lb < this._loEnd; lb++) loSum += envMod[lb] * envWeight[lb];
        for (var hb = this._hiStart; hb < NB; hb++) hiSum += envMod[hb] * envWeight[hb];
        var balance = hiSum / (hiSum + loSum);
        var noiseTarget = (balance - 0.35) / 0.3;
        if (noiseTarget < 0) noiseTarget = 0;
        if (noiseTarget > 1) noiseTarget = 1;
        // When YIN finds no pitch but there IS signal, lean toward noise.
        if (!this._voiced && maxEnv > 0.004 && noiseTarget < 0.5) noiseTarget = 0.5;

        var sawAmt = this._brightness;
        var sinAmt = 1 - sawAmt;
        var numOscs = this._numOscs;
        var oscPhase = this._oscPhase, oscFreq = this._oscFreq, oscLevel = this._oscLevel;
        var sibGain = this._sibilance * 1.5;
        var invSR = 1 / sampleRate;
        var rng = this._rng;
        var noiseAmt = this._noiseAmt;
        var noiseAtk = this._noiseAtk, noiseRel = this._noiseRel;

        for (var n = 0; n < len; n++) {
            var m = inp[n];

            // 1. Decimated pitch-tracker feed (one-pole AA LP, keep every
            //    _dsFactor-th sample).
            this._dsLpState += this._dsLpCoef * (m - this._dsLpState);
            if (++this._dsPhase >= this._dsFactor) {
                this._dsPhase = 0;
                this._dsBuf[this._dsWrite] = this._dsLpState;
                this._dsWrite = (this._dsWrite + 1) & (this._dsBuf.length - 1);
                if (++this._dsSinceYin >= this._YIN_HOP) {
                    this._dsSinceYin = 0;
                    this._updateTarget(this._detectPitch());
                }
            }

            // 2. Unvoiced blend smoothing (per sample, asymmetric).
            var nCoef = noiseTarget > noiseAmt ? noiseAtk : noiseRel;
            noiseAmt = noiseTarget + (noiseAmt - noiseTarget) * nCoef;

            // 3. Carrier: chord oscillators x-faded with white noise.
            var osc = 0;
            for (var v = 0; v < numOscs; v++) {
                var ph = oscPhase[v];
                var dt = oscFreq[v] * invSR;
                var saw = (2 * ph - 1) - this._polyBlep(ph, dt);
                var sine = Math.sin(TWO_PI * ph);
                osc += (saw * sawAmt + sine * sinAmt) * oscLevel[v];
                ph += dt;
                if (ph >= 1) ph -= 1;
                oscPhase[v] = ph;
            }
            rng = (rng * 1664525 + 1013904223) >>> 0;
            var noise = rng * 4.656612875245797e-10 - 1; // [-1, 1)
            var carrier = osc * (1 - noiseAmt) + noise * 0.7 * noiseAmt;

            // 4. Per-band: analyze voice, filter carrier, normalize, sum.
            var wet = 0;
            for (var bq = 0; bq < NB; bq++) {
                var b0 = fbB0[bq], a1 = fbA1[bq], a2 = fbA2[bq];

                // Modulator band (2 cascaded DF2T biquads, b1=0, b2=-b0).
                var s1a = modS1a[bq], s1b = modS1b[bq];
                var y1 = b0 * m + s1a;
                modS1a[bq] = -a1 * y1 + s1b;
                modS1b[bq] = -b0 * m - a2 * y1;
                var s2a = modS2a[bq], s2b = modS2b[bq];
                var y2 = b0 * y1 + s2a;
                modS2a[bq] = -a1 * y2 + s2b;
                modS2b[bq] = -b0 * y1 - a2 * y2;

                // Envelope follower (fast attack, slower release).
                var rect = y2 >= 0 ? y2 : -y2;
                var envPrev = envMod[bq];
                var coef = rect > envPrev ? envAtk : envRel;
                var env = rect + (envPrev - rect) * coef;
                envMod[bq] = env;

                // Carrier band (identical filters, own state).
                var c1a = carS1a[bq], c1b = carS1b[bq];
                var cy1 = b0 * carrier + c1a;
                carS1a[bq] = -a1 * cy1 + c1b;
                carS1b[bq] = -b0 * carrier - a2 * cy1;
                var c2a = carS2a[bq], c2b = carS2b[bq];
                var cy2 = b0 * cy1 + c2a;
                carS2a[bq] = -a1 * cy2 + c2b;
                carS2b[bq] = -b0 * cy1 - a2 * cy2;

                // Carrier AGC: normalize this band's carrier level so the
                // output spectral envelope equals the VOICE's envelope.
                var crect = cy2 >= 0 ? cy2 : -cy2;
                var cenv = crect + (envCar[bq] - crect) * carCoef;
                envCar[bq] = cenv;
                var cb = cy2 / (cenv + CAR_NORM_FLOOR);
                if (cb > BAND_CLIP) cb = BAND_CLIP;
                else if (cb < -BAND_CLIP) cb = -BAND_CLIP;

                wet += cb * bandGain[bq] * bandSign[bq];
            }
            wet *= MAKEUP;

            // 5. Sibilance hiss bypass: dry voice HP'd at 5 kHz, gated by
            //    the unvoiced detector. (Two cascaded RBJ highpass biquads.)
            if (sibGain > 0.001) {
                var h1 = this._hpB0 * m + this._hpB1 * this._hp1x1 + this._hpB2 * this._hp1x2
                       - this._hpA1 * this._hp1y1 - this._hpA2 * this._hp1y2;
                this._hp1x2 = this._hp1x1; this._hp1x1 = m;
                this._hp1y2 = this._hp1y1; this._hp1y1 = h1;
                var h2 = this._hpB0 * h1 + this._hpB1 * this._hp2x1 + this._hpB2 * this._hp2x2
                       - this._hpA1 * this._hp2y1 - this._hpA2 * this._hp2y2;
                this._hp2x2 = this._hp2x1; this._hp2x1 = h1;
                this._hp2y2 = this._hp2y1; this._hp2y1 = h2;
                wet += h2 * sibGain * (0.3 + 0.7 * noiseAmt);
            }

            // 6. Dry/wet crossfade (smoothed) + hard safety ceiling.
            this._mixSmooth = targetMix + (this._mixSmooth - targetMix) * this._mixSmoothCoef;
            var wetMix = this._mixSmooth;
            var outSample = m * (1 - wetMix) + wet * wetMix;
            if (outSample > 1.2) outSample = 1.2;
            else if (outSample < -1.2) outSample = -1.2;

            for (var oc = 0; oc < numOutCh; oc++) output[oc][n] = outSample;
        }

        this._rng = rng;
        this._noiseAmt = noiseAmt;
        return true;
    }
}

registerProcessor('vocoder-processor', VocoderProcessor);
`;
