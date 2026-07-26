/**
 * Pure-TS MP3 duration reader (no ffprobe/ffmpeg dependency) — port of
 * scripts/lib/audio-duration.js. Reads the Xing/Info (VBR) frame count when
 * present — exact — and falls back to a CBR estimate from the first frame's
 * bitrate. Returns duration in milliseconds, or null when the file can't be
 * parsed (e.g. a non-MP3 container).
 *
 * Used by the audio IPC handlers to confirm an imported stem actually belongs
 * to the track (the #1 source of "wrong song plays" was importing a different
 * song's stem file).
 */
import * as fs from 'fs'

// Bitrate tables (kbps), indexed by the 4-bit bitrate field.
const BITRATE: Record<number, Record<number, number[]>> = {
    // MPEG1
    1: { 1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],   // Layer I
         2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],      // Layer II
         3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0] },     // Layer III
    // MPEG2 / MPEG2.5
    2: { 1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],      // Layer I
         2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],           // Layer II
         3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0] },         // Layer III
}
// Sample rates (Hz), indexed by the 2-bit field, per MPEG version id.
const SAMPLE_RATE: Record<number, number[]> = {
    3: [44100, 48000, 32000],  // MPEG1
    2: [22050, 24000, 16000],  // MPEG2
    0: [11025, 12000, 8000],   // MPEG2.5
}
// Samples per frame, by [mpegGroup][layer]. mpegGroup: 1 = MPEG1, 2 = MPEG2/2.5.
const SAMPLES_PER_FRAME: Record<number, Record<number, number>> = {
    1: { 1: 384, 2: 1152, 3: 1152 },
    2: { 1: 384, 2: 1152, 3: 576 },
}

export function mp3DurationMs(file: string): number | null {
    let buf: Buffer
    try { buf = fs.readFileSync(file) } catch { return null }
    let i = 0
    // Skip an ID3v2 tag if present (syncsafe size).
    if (buf.length > 10 && buf.subarray(0, 3).toString('latin1') === 'ID3') {
        const sz = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f)
        i = 10 + sz
    }
    // Scan for the first valid MPEG-audio frame sync.
    for (; i < buf.length - 4; i++) {
        if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) continue
        const verBits = (buf[i + 1] >> 3) & 3   // 3=MPEG1, 2=MPEG2, 0=MPEG2.5 (1=reserved)
        const layerBits = (buf[i + 1] >> 1) & 3  // 3=LayerI, 2=LayerII, 1=LayerIII
        if (verBits === 1 || layerBits === 0) continue
        const layer = ({ 3: 1, 2: 2, 1: 3 } as Record<number, number>)[layerBits]
        const mpegGroup = verBits === 3 ? 1 : 2
        const brI = (buf[i + 2] >> 4) & 0xf
        const srI = (buf[i + 2] >> 2) & 3
        const pad = (buf[i + 2] >> 1) & 1
        if (brI === 0 || brI === 15 || srI === 3) continue
        const br = BITRATE[mpegGroup][layer][brI] * 1000
        const sr = SAMPLE_RATE[verBits][srI]
        if (!br || !sr) continue
        const spf = SAMPLES_PER_FRAME[mpegGroup][layer]
        const coef = mpegGroup === 1 ? 144 : (layer === 1 ? 12 : 72)
        const frameLen = Math.floor(coef * br / sr) + pad
        if (frameLen < 4) continue

        // Channel mode → side-info length → Xing/Info offset within the frame.
        const chMode = (buf[i + 3] >> 6) & 3
        const mono = chMode === 3
        const sideInfo = mpegGroup === 1 ? (mono ? 17 : 32) : (mono ? 9 : 17)
        const xoff = i + 4 + sideInfo
        const tag = buf.subarray(xoff, xoff + 4).toString('latin1')
        if (tag === 'Xing' || tag === 'Info') {
            const flags = buf.readUInt32BE(xoff + 4)
            if (flags & 1) {
                const frames = buf.readUInt32BE(xoff + 8)
                if (frames > 0) return Math.round(frames * spf / sr * 1000)
            }
        }
        // CBR fallback: remaining audio bytes / bitrate.
        const audioBytes = buf.length - i
        return Math.round(audioBytes * 8 / br * 1000)
    }
    return null
}
