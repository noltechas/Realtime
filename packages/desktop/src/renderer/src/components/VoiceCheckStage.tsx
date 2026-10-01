import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import {
    VOICE_CHECK_SECONDS, VOICE_CHECK_STEPS, stepAt,
    type VoiceCheckResult, type VoiceCheckUpdate,
} from '../audio/voiceCheckScript'
import { noteName } from '../audio/voiceMatch'

// The stage side of a voice check, built as a strip-chart recorder.
//
// A roll of chart paper scrolls right to left under a fixed pen carriage, and
// the whole script is pre-printed on it: the 3-2-1 leader, each step's heading
// and the word to sing, the slide guides and the song's lyrics, laid out so
// each one reaches the pen at the moment it should be sung. The red pen traces
// the singer's pitch and the blue pen their level. An unseen examiner marks the
// chart up in marker as it runs (record notes ticked off on the slides, lowest
// and highest circled, a verdict on the held note). When the take ends the
// chart is shown whole and the result is rubber-stamped onto it.
//
// Driven by VoiceCheckUpdate messages from the host's VoiceCheckCard. Stage
// window only. Scrolling, pen motion and ink run in a rAF loop on refs; React
// only re-renders for the marks and phase changes.

const W = 1920, H = 1080
const PEN_X = 560
const V = 280                       // paper speed, px per second
const LEAD = 3                      // countdown seconds printed on the leader
const CH_TOP = 156, CH_BOT = 772    // pitch channel
const LV_TOP = 866, LV_BOT = 996    // level channel
const MIDI_LO = 36, MIDI_HI = 84    // C2 to C6
const T_FROM = -LEAD - 3, T_TO = VOICE_CHECK_SECONDS + 5
const PLATE_W = 84
const STEP_START = VOICE_CHECK_STEPS.map((_, i) => VOICE_CHECK_STEPS.slice(0, i).reduce((n, s) => n + s.seconds, 0))

// The paper and its inks are the whole palette.
const PAPER = '#F1EBDA'
const GRID = '#E5AE98'
const GRID_MAJOR = '#CF7C5F'
const PRINT = '#28231E'
const PRINT_TINT = '#E2D6BB'
const INK_RED = '#C3221A'
const INK_BLUE = '#1E47A4'
const MARKER = '#1A2134'
const STAMP_INK = '#B12E1D'

const OSWALD = "'Oswald', 'Arial Narrow', sans-serif"
const MARKER_FONT = "'Permanent Marker', 'Kalam', cursive"
const HAND = "'Kalam', 'Patrick Hand', cursive"
const SVG_NS = 'http://www.w3.org/2000/svg'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const yOf = (m: number) => CH_BOT - ((clamp(m, MIDI_LO - 0.6, MIDI_HI + 0.6) - MIDI_LO) / (MIDI_HI - MIDI_LO)) * (CH_BOT - CH_TOP)
// Level channel: the top 15% is the clipping zone, the rest is a sqrt curve
// so quiet singing still moves the pen.
function levelY(peak: number): number {
    const f = peak <= 0.92 ? 0.85 * Math.sqrt(Math.max(0, peak) / 0.92) : 0.85 + 0.15 * Math.min(1, (peak - 0.92) / 0.08)
    return LV_BOT - 4 - f * (LV_BOT - LV_TOP - 8)
}
const LOUD_Y = levelY(0.92), QUIET_Y = levelY(0.04)
// After the take the whole chart is compressed into the left of the screen and
// the stamp lands on the clean paper to its right.
const OV_RIGHT = 1150
const xOverview = (t: number) => 150 + (t + 0.4) * ((OV_RIGHT - 150) / (VOICE_CHECK_SECONDS + 0.8))
const STAMP_X = 1530
const f1 = (n: number) => n.toFixed(1)

function rng(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function smooth(pts: [number, number][]): string {
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`
    for (let i = 1; i < pts.length - 1; i++) {
        const [x, y] = pts[i], [nx, ny] = pts[i + 1]
        d += ` Q${f1(x)} ${f1(y)} ${f1((x + nx) / 2)} ${f1((y + ny) / 2)}`
    }
    const l = pts[pts.length - 1]
    return `${d} L${f1(l[0])} ${f1(l[1])}`
}

// A loop drawn the way a hand draws one: starts upper left, runs past where it
// began and never quite closes.
function roughLoop(cx: number, cy: number, rx: number, ry: number, seed: number): string {
    const r = rng(seed)
    const a0 = -2.3 + r() * 0.5, sweep = Math.PI * 2 + 0.5 + r() * 0.35, p1 = r() * 6, p2 = r() * 6
    const pts: [number, number][] = []
    for (let i = 0; i <= 44; i++) {
        const f = i / 44, a = a0 + sweep * f
        const k = 1 + 0.05 * Math.sin(3 * a + p1) + 0.03 * Math.sin(5 * a + p2) + 0.12 * f
        pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
    }
    return smooth(pts)
}

function roughLine(x1: number, y1: number, x2: number, y2: number, seed: number, bow = 5): string {
    const r = rng(seed)
    const pts: [number, number][] = []
    for (let i = 0; i <= 8; i++) {
        const f = i / 8
        pts.push([x1 + (x2 - x1) * f + (r() - 0.5) * 2, y1 + (y2 - y1) * f + Math.sin(f * Math.PI) * bow + (r() - 0.5) * 2.4])
    }
    return smooth(pts)
}

// ── Ink ─────────────────────────────────────────────────────────────────────
// One pen's trace, written straight into the DOM in paper coordinates (the
// paper group scrolls, so committed ink never changes). Long traces are split
// into chunks so each frame only rewrites the newest one.

type InkPoint = [number, number] | null

class InkLine {
    pts: InkPoint[] = []
    private g: SVGGElement | null = null
    private cur: SVGPathElement | null = null
    private d = ''
    private n = 0
    private lastX = -Infinity
    private down = false

    constructor(private color: string, private width: number) { }

    attach(g: SVGGElement | null): void { this.g = g }

    reset(): void {
        this.pts = []
        this.cur = null
        this.d = ''
        this.n = 0
        this.lastX = -Infinity
        this.down = false
        this.g?.replaceChildren()
    }

    draw(x: number, y: number, penDown: boolean): void {
        if (!this.g) return
        if (!penDown) {
            if (this.down) {
                this.pts.push(null)
                this.down = false
                this.cur?.setAttribute('d', this.d)
            }
            return
        }
        if (!this.cur || this.n > 220) this.newChunk()
        if (!this.down) {
            this.d += ` M${f1(x)} ${f1(y)}`
            this.pts.push([x, y])
            this.lastX = x
            this.down = true
            this.n++
        } else if (x - this.lastX >= 3) {
            this.d += ` L${f1(x)} ${f1(y)}`
            this.pts.push([x, y])
            this.lastX = x
            this.n++
        }
        this.cur!.setAttribute('d', `${this.d} L${f1(x)} ${f1(y)}`)
    }

    private newChunk(): void {
        const el = document.createElementNS(SVG_NS, 'path')
        el.setAttribute('fill', 'none')
        el.setAttribute('stroke', this.color)
        el.setAttribute('stroke-width', String(this.width))
        el.setAttribute('stroke-linecap', 'round')
        el.setAttribute('stroke-linejoin', 'round')
        this.g!.appendChild(el)
        // Continue from the last committed point so chunks join seamlessly.
        const last = this.pts[this.pts.length - 1]
        this.d = this.down && last ? `M${f1(last[0])} ${f1(last[1])}` : ''
        this.cur = el
        this.n = 0
    }
}

function inkPath(pts: InkPoint[], x: (t: number) => number): string {
    let d = '', pen = false
    for (const p of pts) {
        if (!p) { pen = false; continue }
        d += `${pen ? ' L' : ' M'}${f1(x(p[0] / V))} ${f1(p[1])}`
        pen = true
    }
    return d
}

// ── Examiner marks ──────────────────────────────────────────────────────────

type Mark =
    | { kind: 'note'; t: number; y: number; text: string; anchor: 'start' | 'end'; size: number; rot: number; underline?: boolean }
    | { kind: 'loop'; t: number; y: number; label: string; seed: number }
    | { kind: 'tick'; t: number; y: number; text: string; below: boolean }
    | { kind: 'check'; t: number; y: number }

function Marks({ marks, x, scale, animate }: { marks: Mark[]; x: (t: number) => number; scale: number; animate: boolean }) {
    const draw = animate ? 'vcr-draw' : undefined
    const write = animate ? 'vcr-write' : undefined
    return (
        <g>
            {marks.map((m, i) => {
                const px = x(m.t)
                if (m.kind === 'loop') {
                    const rx = 62 * scale, ry = 34 * scale
                    const above = m.y - CH_TOP > 120
                    const ly = above ? m.y - ry - 16 * scale : m.y + ry + 46 * scale
                    return (
                        <g key={i}>
                            <path d={roughLoop(px, m.y, rx, ry, m.seed)} pathLength={1} className={draw} fill="none" stroke={MARKER} strokeWidth={5 * scale} strokeLinecap="round" />
                            <text x={px + rx * 0.55} y={ly} className={write} fill={MARKER} style={{ fontFamily: MARKER_FONT, fontSize: 42 * scale, animationDelay: '0.35s' }}>{m.label}</text>
                        </g>
                    )
                }
                if (m.kind === 'tick') {
                    const ty = m.below ? m.y + 34 * scale : m.y - 16 * scale
                    return (
                        <g key={i}>
                            <path d={roughLine(px - 18 * scale, m.y + (m.below ? 10 : -10) * scale, px + 18 * scale, m.y + (m.below ? 10 : -10) * scale, i * 31 + 7, 1.5)} pathLength={1} className={draw} fill="none" stroke={MARKER} strokeWidth={3.5 * scale} strokeLinecap="round" />
                            <text x={px} y={ty} textAnchor="middle" className={write} fill={MARKER} style={{ fontFamily: MARKER_FONT, fontSize: 26 * scale }}>{m.text}</text>
                        </g>
                    )
                }
                if (m.kind === 'check') {
                    const s = scale
                    const d = roughLine(px, m.y, px + 26 * s, m.y + 32 * s, 91, 2) + ' ' + roughLine(px + 26 * s, m.y + 32 * s, px + 86 * s, m.y - 52 * s, 92, -3).replace(/^M/, 'L')
                    return <path key={i} d={d} pathLength={1} className={draw} fill="none" stroke={MARKER} strokeWidth={8 * s} strokeLinecap="round" strokeLinejoin="round" />
                }
                const tx = m.anchor === 'start' ? px + 14 * scale : px - 14 * scale
                const fs = m.size * scale
                const est = m.text.length * fs * 0.5
                return (
                    <g key={i} transform={`rotate(${m.rot} ${f1(tx)} ${f1(m.y)})`}>
                        <text x={tx} y={m.y} textAnchor={m.anchor} className={write} fill={MARKER} style={{ fontFamily: MARKER_FONT, fontSize: fs }}>{m.text}</text>
                        {m.underline && (
                            <path d={roughLine(m.anchor === 'start' ? tx : tx - est, m.y + 12 * scale, m.anchor === 'start' ? tx + est : tx, m.y + 12 * scale, i * 17 + 3, 4)} pathLength={1} className={draw} fill="none" stroke={MARKER} strokeWidth={4 * scale} strokeLinecap="round" style={{ animationDelay: '0.45s' }} />
                        )}
                    </g>
                )
            })}
        </g>
    )
}

// ── Printed paper ───────────────────────────────────────────────────────────

const LYRIC_SIZE = 76
const SHORT_TITLE: Record<string, string> = { hold: 'HOLD', low: 'DOWN', high: 'UP', song: 'SONG' }

function StepTab({ x, n, title, glyph }: { x: number; n?: number; title: string; glyph?: 'play' | 'check' }) {
    return (
        <g>
            <line x1={x} x2={x} y1={52} y2={LV_BOT + 14} stroke={PRINT} strokeWidth={3} />
            <rect x={x} y={52} width={64} height={64} fill={PRINT} />
            {n != null && <text x={x + 32} y={101} textAnchor="middle" fill={PAPER} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 46 }}>{n}</text>}
            {glyph === 'play' && <path d={`M${x + 22} ${70} L${x + 46} ${84} L${x + 22} ${98} Z`} fill={PAPER} />}
            {glyph === 'check' && <path d={`M${x + 16} ${85} L${x + 28} ${97} L${x + 49} ${70}`} fill="none" stroke={PAPER} strokeWidth={6} strokeLinecap="square" />}
            <text x={x + 84} y={101} fill={PRINT} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 50, letterSpacing: 1 }}>{title.toUpperCase()}</text>
        </g>
    )
}

function Detail({ x, text }: { x: number; text: string }) {
    return <text x={x + 16} y={830} fill={PRINT} style={{ fontFamily: OSWALD, fontWeight: 400, fontSize: 36 }}>{text}</text>
}

// The word to sing, printed as hollow display type so the red trace stays
// readable where it crosses it.
function SingWord({ x, y, text, size = 250 }: { x: number; y: number; text: string; size?: number }) {
    return (
        <text x={x} y={y} fill={PRINT_TINT} stroke={PRINT} strokeWidth={3} strokeLinejoin="round"
            style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: size, letterSpacing: 6, paintOrder: 'stroke' }}>{text}</text>
    )
}

function Arrowhead({ x, y, angle }: { x: number; y: number; angle: number }) {
    return <path d="M0 0 L-26 -11 L-20 0 L-26 11 Z" transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(angle)})`} fill={PRINT} />
}

// A printed slide sign: a bold curved arrow with its caption, set beside the
// word. A pictogram, not a target line (everyone's range is different).
function SlideSign({ t, up, y, caption }: { t: number; up: boolean; y: number; caption: string }) {
    const x0 = t * V, w = 360, rise = up ? -150 : 150
    const x1 = x0 + w, y1 = y + rise
    const d = `M${x0} ${y} C${x0 + w * 0.55} ${y} ${x0 + w * 0.6} ${y1} ${x1 - 26} ${y1}`
    return (
        <g>
            <path d={d} fill="none" stroke={PRINT} strokeWidth={16} strokeLinecap="round" />
            <path d={d} fill="none" stroke={PRINT_TINT} strokeWidth={6} strokeLinecap="round" strokeDasharray="1 16" />
            <path d="M0 0 L-40 -24 L-30 0 L-40 24 Z" transform={`translate(${x1 + 6} ${y1})`} fill={PRINT} />
            <text x={x0} y={up ? y + 60 : y - 34} fill={PRINT} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 34, letterSpacing: 3 }}>{caption.toUpperCase()}</text>
        </g>
    )
}

// The musical hold sign over a long sustain line: "hold this note".
function Fermata({ t0, t1, y }: { t0: number; t1: number; y: number }) {
    const x0 = t0 * V, x1 = t1 * V
    return (
        <g>
            <path d={`M${x0 - 44} ${y} A44 40 0 0 1 ${x0 + 44} ${y} L${x0 + 36} ${y} A36 30 0 0 0 ${x0 - 36} ${y} Z`} fill={PRINT} />
            <circle cx={x0} cy={y - 12} r={8} fill={PRINT} />
            <line x1={x0 + 70} x2={x1 - 20} y1={y - 12} y2={y - 12} stroke={PRINT} strokeWidth={5} strokeDasharray="18 12" strokeLinecap="round" />
            <Arrowhead x={x1} y={y - 12} angle={0} />
            <text x={x0 + 72} y={y - 34} fill={PRINT} style={{ fontFamily: OSWALD, fontWeight: 400, fontSize: 30, letterSpacing: 2 }}>KEEP IT STEADY</text>
        </g>
    )
}

function Lyrics() {
    const step = VOICE_CHECK_STEPS[3]
    const lines = step.lyrics || []
    const slot = step.seconds / lines.length
    return (
        <g>
            {lines.map((line, i) => {
                const x0 = (STEP_START[3] + i * slot) * V + 22, x1 = (STEP_START[3] + (i + 1) * slot) * V - 34
                const est = line.length * LYRIC_SIZE * 0.43
                return (
                    <g key={i}>
                        <text x={x0} y={470} fill={PRINT} {...(est > x1 - x0 ? { textLength: x1 - x0, lengthAdjust: 'spacingAndGlyphs' } : {})}
                            style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: LYRIC_SIZE }}>{line}</text>
                        {/* phrase mark: how long this line lasts */}
                        <path d={`M${x0 + 4} 500 Q${(x0 + x1) / 2} 536 ${x1} 500`} fill="none" stroke={PRINT} strokeWidth={3} />
                    </g>
                )
            })}
        </g>
    )
}

function PrintedPaper() {
    const x0 = T_FROM * V, x1 = T_TO * V
    const semis = []
    for (let m = MIDI_LO; m <= MIDI_HI; m++) {
        const c = m % 12 === 0
        semis.push(<line key={m} x1={x0} x2={x1} y1={yOf(m)} y2={yOf(m)} stroke={c ? GRID_MAJOR : GRID} strokeWidth={c ? 1.6 : 0.7} opacity={c ? 1 : 0.8} />)
    }
    const fives = []
    for (let t = 0; t <= VOICE_CHECK_SECONDS; t += 5) fives.push(<line key={t} x1={t * V} x2={t * V} y1={CH_TOP} y2={CH_BOT} stroke={GRID_MAJOR} strokeWidth={2.4} />)
    const ruler = []
    for (let t = 0; t <= VOICE_CHECK_SECONDS; t++) ruler.push(<text key={t} x={t * V + 6} y={CH_TOP - 10} fill={GRID_MAJOR} style={{ fontFamily: OSWALD, fontWeight: 400, fontSize: 19 }}>{t}</text>)
    const zoneLabels = []
    for (let t = -2; t < T_TO; t += 6) {
        zoneLabels.push(
            <g key={t}>
                <text x={t * V + 12} y={LV_TOP + 16} fill={GRID_MAJOR} style={{ fontFamily: OSWALD, fontWeight: 400, fontSize: 14, letterSpacing: 2 }}>TOO LOUD</text>
                <text x={t * V + 12} y={LV_BOT - 7} fill={GRID_MAJOR} style={{ fontFamily: OSWALD, fontWeight: 400, fontSize: 14, letterSpacing: 2 }}>TOO QUIET</text>
            </g>,
        )
    }
    const [hold, low, high] = VOICE_CHECK_STEPS
    return (
        <g>
            {/* sprocket strips */}
            <rect x={x0} y={0} width={x1 - x0} height={40} fill="url(#vcr-sprocket)" />
            <rect x={x0} y={H - 40} width={x1 - x0} height={40} fill="url(#vcr-sprocket)" />
            <line x1={x0} x2={x1} y1={44} y2={44} stroke={GRID} strokeWidth={1.2} />
            <line x1={x0} x2={x1} y1={H - 44} y2={H - 44} stroke={GRID} strokeWidth={1.2} />

            {/* pitch channel */}
            <rect x={x0} y={CH_TOP} width={x1 - x0} height={CH_BOT - CH_TOP} fill="url(#vcr-seconds)" />
            {semis}
            {fives}
            {ruler}

            {/* level channel */}
            <rect x={x0} y={LV_TOP} width={x1 - x0} height={LV_BOT - LV_TOP} fill="url(#vcr-seconds)" opacity={0.7} />
            <rect x={x0} y={LV_TOP} width={x1 - x0} height={LOUD_Y - LV_TOP} fill="url(#vcr-hatch)" />
            <rect x={x0} y={QUIET_Y} width={x1 - x0} height={LV_BOT - QUIET_Y} fill="url(#vcr-hatch)" />
            {[LV_TOP, LOUD_Y, QUIET_Y, LV_BOT].map(y => <line key={y} x1={x0} x2={x1} y1={y} y2={y} stroke={GRID_MAJOR} strokeWidth={1.3} />)}
            {zoneLabels}

            {/* leader: get ready, 3, 2, 1 */}
            <StepTab x={-LEAD * V} title="Get ready" glyph="play" />
            <Detail x={-LEAD * V} text="Sing whatever reaches the red pen." />
            {[3, 2, 1].map(k => (
                <text key={k} x={(-k + 0.5) * V} y={600} textAnchor="middle" fill="none" stroke={PRINT} strokeWidth={4}
                    style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 330 }}>{k}</text>
            ))}

            {/* the four steps */}
            {VOICE_CHECK_STEPS.map((s, i) => (
                <g key={s.key}>
                    <StepTab x={STEP_START[i] * V} n={i + 1} title={s.title} />
                    <Detail x={STEP_START[i] * V} text={s.detail} />
                </g>
            ))}
            <SingWord x={STEP_START[0] * V + 100} y={470} text={hold.sing} />
            <Fermata t0={STEP_START[0] + 3.0} t1={STEP_START[0] + 4.75} y={640} />
            <SingWord x={STEP_START[1] * V + 100} y={390} text={low.sing} size={200} />
            <SlideSign t={STEP_START[1] + 2.75} up={false} y={250} caption="as low as you can" />
            <SingWord x={STEP_START[2] * V + 100} y={752} text={high.sing} size={200} />
            <SlideSign t={STEP_START[2] + 2.75} up y={720} caption="as high as you can" />
            <Lyrics />

            {/* end of the take, then the perforation */}
            <StepTab x={VOICE_CHECK_SECONDS * V} title="Done" glyph="check" />
            <Detail x={VOICE_CHECK_SECONDS * V} text="Hold still while we measure." />
            <line x1={(VOICE_CHECK_SECONDS + 2.6) * V} x2={(VOICE_CHECK_SECONDS + 2.6) * V} y1={0} y2={H} stroke={PRINT} strokeWidth={2} strokeDasharray="4 9" opacity={0.6} />
            <text transform={`translate(${(VOICE_CHECK_SECONDS + 2.6) * V - 10} 300) rotate(-90)`} fill={PRINT} opacity={0.6} style={{ fontFamily: OSWALD, fontWeight: 400, fontSize: 18, letterSpacing: 4 }}>TEAR HERE</text>
        </g>
    )
}

// ── Machine parts (fixed on screen) ─────────────────────────────────────────

function Screw({ x, y, a }: { x: number; y: number; a: number }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <circle r={8.5} fill="url(#vcr-screw)" stroke="#55595e" strokeWidth={1} />
            <line x1={-5.5} x2={5.5} transform={`rotate(${a})`} stroke="#33363a" strokeWidth={2.2} strokeLinecap="round" />
        </g>
    )
}

// Engraved aluminium scale plate on the left edge: note names for the pitch
// channel, LOUD / QUIET for the level channel.
function ScalePlate() {
    const ticks = []
    for (let m = MIDI_LO; m <= MIDI_HI; m++) {
        const c = m % 12 === 0
        ticks.push(<line key={m} x1={c ? 54 : 68} x2={PLATE_W} y1={yOf(m)} y2={yOf(m)} stroke="#4b5056" strokeWidth={c ? 2 : 1} />)
        if (c) {
            ticks.push(
                <g key={'l' + m}>
                    <text x={8} y={yOf(m) + 9} fill="#fbfbfb" opacity={0.7} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 25 }}>{noteName(m)}</text>
                    <text x={8} y={yOf(m) + 8} fill="#43474d" style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 25 }}>{noteName(m)}</text>
                </g>,
            )
        }
    }
    const engraved = (x: number, y: number, text: string, size: number, rot = 0) => (
        <g transform={`translate(${x} ${y}) rotate(${rot})`}>
            <text y={1} fill="#fbfbfb" opacity={0.7} textAnchor="middle" style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: size, letterSpacing: 3 }}>{text}</text>
            <text fill="#43474d" textAnchor="middle" style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: size, letterSpacing: 3 }}>{text}</text>
        </g>
    )
    return (
        <g>
            <rect x={PLATE_W} y={0} width={26} height={H} fill="url(#vcr-plate-shadow)" />
            <rect x={0} y={0} width={PLATE_W} height={H} fill="url(#vcr-alu)" />
            <image href={BRUSHED} x={0} y={0} width={PLATE_W} height={H} preserveAspectRatio="none" opacity={0.55} style={{ mixBlendMode: 'multiply' }} />
            <line x1={PLATE_W - 0.75} x2={PLATE_W - 0.75} y1={0} y2={H} stroke="#2e3135" strokeWidth={1.5} />
            <line x1={PLATE_W - 2.5} x2={PLATE_W - 2.5} y1={0} y2={H} stroke="#ffffff" strokeWidth={1} opacity={0.55} />
            {ticks}
            {engraved(30, (LV_TOP + LV_BOT) / 2 + 2, 'LEVEL', 16, -90)}
            {engraved(64, LOUD_Y - 4, 'LOUD', 11)}
            {engraved(64, LV_BOT - 6, 'QUIET', 11)}
            <Screw x={42} y={24} a={28} />
            <Screw x={42} y={H - 24} a={-61} />
            <Screw x={42} y={(CH_BOT + LV_TOP) / 2} a={75} />
        </g>
    )
}

// The singer's name on a strip of masking tape, top left.
function NameTape({ name }: { name: string }) {
    const r = rng(name.length * 977 + 13)
    const w = 450, h = 78
    const left: [number, number][] = [], right: [number, number][] = []
    for (let i = 0; i <= 6; i++) {
        left.push([(i % 2 ? 7 : 0) + r() * 4, (h * i) / 6])
        right.push([w - (i % 2 ? 0 : 7) - r() * 4, (h * i) / 6])
    }
    const poly = [...left, ...right.reverse()].map(p => p.map(f1).join(',')).join(' ')
    return (
        <g transform="translate(28 16) rotate(-2.2)">
            <polygon points={poly} transform="translate(4 5)" fill="#000" opacity={0.16} />
            <polygon points={poly} fill="#E7DBB2" opacity={0.95} />
            {[18, 34, 52, 66].map(y => <line key={y} x1={10} x2={w - 10} y1={y} y2={y + 1} stroke="#7a6640" strokeWidth={1} opacity={0.07} />)}
            <text x={26} y={58} fill={MARKER} {...(name.length > 12 ? { textLength: w - 52, lengthAdjust: 'spacingAndGlyphs' } : {})}
                style={{ fontFamily: MARKER_FONT, fontSize: 52 }}>{name}</text>
        </g>
    )
}

// The pen carriage: a steel rail at the pen line, a sled per pen, and the
// note counter in the head casting.
function Carriage({ pitchSled, levelSled, penUp, note }: {
    pitchSled: React.RefObject<SVGGElement>
    levelSled: React.RefObject<SVGGElement>
    penUp: boolean
    note: string
}) {
    const RX = PEN_X + 30
    const pen = (color: string, dark: string) => (
        <g className="vcr-pen" data-up={penUp ? '1' : '0'}>
            <path d={`M${PEN_X} 0 L${PEN_X + 15} -7 L${PEN_X + 15} 7 Z`} fill={dark} />
            <rect x={PEN_X + 14} y={-10} width={30} height={20} rx={3} fill={color} />
            <rect x={PEN_X + 16} y={-8} width={26} height={5} rx={2} fill="#ffffff" opacity={0.32} />
            <rect x={PEN_X + 36} y={-10} width={5} height={20} fill={dark} />
        </g>
    )
    const sled = (h: number) => (
        <g>
            <rect x={RX - 8} y={-h / 2 + 6} width={48} height={h} rx={7} fill="#000" opacity={0.2} />
            <rect x={RX - 14} y={-h / 2} width={46} height={h} rx={7} fill="url(#vcr-anod)" stroke="#121417" strokeWidth={1.5} />
            <line x1={RX - 9} x2={RX + 27} y1={-h / 2 + 2} y2={-h / 2 + 2} stroke="#ffffff" strokeWidth={1.2} opacity={0.35} />
            <Screw x={RX + 9} y={-h / 2 + 12} a={40} />
            <Screw x={RX + 9} y={h / 2 - 12} a={-20} />
        </g>
    )
    return (
        <g>
            {/* rail + cast shadow */}
            <rect x={RX + 14} y={0} width={20} height={H} fill="url(#vcr-rail-shadow)" />
            <rect x={RX} y={0} width={16} height={H} fill="url(#vcr-steel)" />
            <line x1={RX + 0.5} x2={RX + 0.5} y1={0} y2={H} stroke="#2a2d31" strokeWidth={1} />

            <g ref={levelSled}>
                {pen(INK_BLUE, '#122a63')}
                {sled(58)}
            </g>
            <g ref={pitchSled}>
                {pen(INK_RED, '#6e130d')}
                {!penUp && <circle cx={PEN_X} cy={0} r={4} fill={INK_RED} />}
                {sled(70)}
            </g>

            {/* head casting with the note counter */}
            <path d={`M${PEN_X - 30} 0 H${PEN_X + 236} V36 Q${PEN_X + 236} 50 ${PEN_X + 222} 50 H${PEN_X - 16} Q${PEN_X - 30} 50 ${PEN_X - 30} 36 Z`} transform="translate(5 6)" fill="#000" opacity={0.22} />
            <path d={`M${PEN_X - 30} 0 H${PEN_X + 236} V36 Q${PEN_X + 236} 50 ${PEN_X + 222} 50 H${PEN_X - 16} Q${PEN_X - 30} 50 ${PEN_X - 30} 36 Z`} fill="url(#vcr-anod)" stroke="#121417" strokeWidth={1.5} />
            <text x={PEN_X - 12} y={32} fill="#9aa0a7" style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 15, letterSpacing: 3 }}>NOTE</text>
            <rect x={PEN_X + 44} y={7} width={120} height={36} rx={4} fill="#0c0d0f" stroke="#5c6168" strokeWidth={2} />
            <clipPath id="vcr-counter"><rect x={PEN_X + 46} y={9} width={116} height={32} /></clipPath>
            <g clipPath="url(#vcr-counter)">
                <text key={note} x={PEN_X + 104} y={36} textAnchor="middle" className="vcr-roll" fill={PAPER} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 30, letterSpacing: 2 }}>{note}</text>
            </g>
            <rect x={PEN_X + 46} y={9} width={116} height={32} fill="url(#vcr-drum)" />
            <Screw x={PEN_X + 186} y={25} a={12} />
            <Screw x={PEN_X + 214} y={25} a={-48} />
        </g>
    )
}

// ── Rubber stamps ───────────────────────────────────────────────────────────

const PITCH_WORD: Record<NonNullable<VoiceCheckResult['pitch']>, string> = {
    'very-steady': 'VERY STEADY', steady: 'STEADY', 'some-wander': 'WANDERS A BIT', wanders: 'WANDERS',
}
const TONE_WORD: Record<NonNullable<VoiceCheckResult['tone']>, string> = { bright: 'BRIGHT', warm: 'WARM', balanced: 'BALANCED' }

function ResultStamp({ name, result }: { name: string; result: VoiceCheckResult }) {
    const rows: [string, string][] = [['NAME', name.toUpperCase()]]
    // The profile's range is the 5th to 95th percentile of the whole take, so
    // it's the comfortable span, not the extremes circled on the chart.
    if (result.lowMidi != null && result.highMidi != null) rows.push(['COMFORT', `${noteName(result.lowMidi)} TO ${noteName(result.highMidi)}`])
    if (result.pitch) rows.push(['PITCH', PITCH_WORD[result.pitch]])
    if (result.tone) rows.push(['TONE', TONE_WORD[result.tone]])
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    const h = 104 + rows.length * 62
    return (
        <g mask="url(#vcr-stamp-mask)" style={{ mixBlendMode: 'multiply' }}>
            <rect x={-320} y={-h / 2} width={640} height={h} rx={12} fill="none" stroke={STAMP_INK} strokeWidth={8} />
            <rect x={-305} y={-h / 2 + 15} width={610} height={h - 30} rx={6} fill="none" stroke={STAMP_INK} strokeWidth={3} />
            <rect x={-305} y={-h / 2 + 15} width={610} height={66} fill={STAMP_INK} />
            <text x={-282} y={-h / 2 + 66} fill={PAPER} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 46, letterSpacing: 5 }}>VOICE ON FILE</text>
            <text x={282} y={-h / 2 + 60} textAnchor="end" fill={PAPER} style={{ fontFamily: OSWALD, fontWeight: 400, fontSize: 22, letterSpacing: 3 }}>{date}</text>
            {rows.map(([label, value], i) => {
                const y = -h / 2 + 136 + i * 62
                return (
                    <g key={label}>
                        <text x={-280} y={y} fill={STAMP_INK} style={{ fontFamily: OSWALD, fontWeight: 400, fontSize: 25, letterSpacing: 4 }}>{label}</text>
                        <text x={-140} y={y + 2} fill={STAMP_INK} {...(value.length > 15 ? { textLength: 410, lengthAdjust: 'spacingAndGlyphs' } : {})}
                            style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 44, letterSpacing: 2 }}>{value}</text>
                        {i < rows.length - 1 && <line x1={-280} x2={280} y1={y + 22} y2={y + 22} stroke={STAMP_INK} strokeWidth={1.5} strokeDasharray="3 6" />}
                    </g>
                )
            })}
        </g>
    )
}

function RetakeStamp() {
    return (
        <g mask="url(#vcr-stamp-mask)" style={{ mixBlendMode: 'multiply' }}>
            <rect x={-260} y={-100} width={520} height={200} rx={12} fill="none" stroke={STAMP_INK} strokeWidth={9} />
            <rect x={-244} y={-84} width={488} height={168} rx={6} fill="none" stroke={STAMP_INK} strokeWidth={3} />
            <text x={0} y={52} textAnchor="middle" fill={STAMP_INK} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 128, letterSpacing: 12 }}>RETAKE</text>
        </g>
    )
}

function wrap(text: string, max: number): string[] {
    const out: string[] = []
    let line = ''
    for (const w of text.split(/\s+/)) {
        if (line && (line + ' ' + w).length > max) { out.push(line); line = w } else line = line ? line + ' ' + w : w
    }
    if (line) out.push(line)
    return out.slice(0, 3)
}

// ── The chart, seen whole after the take ────────────────────────────────────

function Overview({ pitch, level, marks, phase, name, result, error, matching }: {
    pitch: InkPoint[]; level: InkPoint[]; marks: Mark[]
    phase: VoiceCheckUpdate['phase']; name: string
    result?: VoiceCheckResult; error?: string; matching: boolean
}) {
    const sec = xOverview(1) - xOverview(0)
    const semis = []
    for (let m = MIDI_LO; m <= MIDI_HI; m++) {
        const c = m % 12 === 0
        semis.push(<line key={m} x1={PLATE_W} x2={W} y1={yOf(m)} y2={yOf(m)} stroke={c ? GRID_MAJOR : GRID} strokeWidth={c ? 1.6 : 0.7} opacity={c ? 1 : 0.8} />)
    }
    const fives = []
    for (let t = 0; t <= VOICE_CHECK_SECONDS; t += 5) fives.push(<line key={t} x1={xOverview(t)} x2={xOverview(t)} y1={CH_TOP} y2={CH_BOT} stroke={GRID_MAJOR} strokeWidth={2.4} />)
    const stamped = phase === 'result' || phase === 'error'
    return (
        <g className="vcr-overview">
            <g className={stamped ? 'vcr-shake' : undefined}>
                <defs>
                    <pattern id="vcr-seconds-ov" x={xOverview(0)} width={sec} height={10} patternUnits="userSpaceOnUse">
                        <line x1={0.5} x2={0.5} y1={0} y2={10} stroke={GRID} strokeWidth={1} />
                    </pattern>
                </defs>
                <rect x={0} y={0} width={W} height={40} fill="url(#vcr-sprocket)" />
                <rect x={0} y={H - 40} width={W} height={40} fill="url(#vcr-sprocket)" />
                <rect x={PLATE_W} y={CH_TOP} width={W - PLATE_W} height={CH_BOT - CH_TOP} fill="url(#vcr-seconds-ov)" />
                {semis}
                {fives}
                <rect x={PLATE_W} y={LV_TOP} width={W - PLATE_W} height={LV_BOT - LV_TOP} fill="url(#vcr-seconds-ov)" opacity={0.7} />
                <rect x={PLATE_W} y={LV_TOP} width={W - PLATE_W} height={LOUD_Y - LV_TOP} fill="url(#vcr-hatch)" />
                <rect x={PLATE_W} y={QUIET_Y} width={W - PLATE_W} height={LV_BOT - QUIET_Y} fill="url(#vcr-hatch)" />
                {[LV_TOP, LOUD_Y, QUIET_Y, LV_BOT].map(y => <line key={y} x1={PLATE_W} x2={W} y1={y} y2={y} stroke={GRID_MAJOR} strokeWidth={1.3} />)}
                {VOICE_CHECK_STEPS.map((s, i) => {
                    const x = xOverview(STEP_START[i])
                    return (
                        <g key={s.key}>
                            <line x1={x} x2={x} y1={110} y2={LV_BOT + 14} stroke={PRINT} strokeWidth={2.5} />
                            <rect x={x} y={110} width={38} height={38} fill={PRINT} />
                            <text x={x + 19} y={140} textAnchor="middle" fill={PAPER} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 27 }}>{i + 1}</text>
                            <text x={x + 47} y={140} fill={PRINT} style={{ fontFamily: OSWALD, fontWeight: 700, fontSize: 24, letterSpacing: 1 }}>{SHORT_TITLE[s.key]}</text>
                        </g>
                    )
                })}
                <line x1={xOverview(VOICE_CHECK_SECONDS)} x2={xOverview(VOICE_CHECK_SECONDS)} y1={110} y2={LV_BOT + 14} stroke={PRINT} strokeWidth={2.5} />
                <path d={inkPath(level, xOverview)} fill="none" stroke={INK_BLUE} strokeWidth={2.5} strokeLinejoin="round" />
                <path d={inkPath(pitch, xOverview)} fill="none" stroke={INK_RED} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                <Marks marks={marks.filter(m => m.kind !== 'tick')} x={xOverview} scale={0.62} animate={false} />
                <line x1={OV_RIGHT + 36} x2={OV_RIGHT + 36} y1={0} y2={H} stroke={PRINT} strokeWidth={2} strokeDasharray="4 9" opacity={0.6} />

                {phase === 'analyzing' && (
                    <g transform={`translate(${STAMP_X - 40} 470) rotate(-5)`}>
                        <text x={0} y={0} textAnchor="middle" fill={MARKER} className="vcr-write" style={{ fontFamily: MARKER_FONT, fontSize: 84 }}>measuring</text>
                        {[0, 1, 2].map(i => <circle key={i} cx={232 + i * 30} cy={-6} r={8} fill={MARKER} className="vcr-dot" style={{ animationDelay: `${0.6 + i * 0.25}s` }} />)}
                    </g>
                )}
                {phase === 'result' && result && (
                    <>
                        <g transform={`translate(${STAMP_X} 430) rotate(-6)`}><g className="vcr-slam"><ResultStamp name={name} result={result} /></g></g>
                        {(matching ? ['Your mic now tunes itself', 'to every song.'] : [`Nice singing, ${name}!`]).map((line, i) => (
                            <text key={i} x={STAMP_X} y={760 + i * 56} textAnchor="middle" fill={MARKER} transform={`rotate(-2.5 ${STAMP_X} ${760 + i * 56})`} className="vcr-write"
                                style={{ fontFamily: HAND, fontWeight: 700, fontSize: 46, animationDelay: `${0.9 + i * 0.35}s` }}>{line}</text>
                        ))}
                    </>
                )}
                {phase === 'error' && (
                    <>
                        <g transform={`translate(${STAMP_X} 420) rotate(-7)`}><g className="vcr-slam"><RetakeStamp /></g></g>
                        {wrap(error || 'Something went wrong.', 28).map((line, i) => (
                            <text key={i} x={STAMP_X} y={640 + i * 54} textAnchor="middle" fill={MARKER} transform={`rotate(-2.5 ${STAMP_X} ${640 + i * 54})`} className="vcr-write"
                                style={{ fontFamily: HAND, fontWeight: 700, fontSize: 42, animationDelay: `${0.9 + i * 0.3}s` }}>{line}</text>
                        ))}
                    </>
                )}
            </g>
        </g>
    )
}

// ── Static textures (rasterized once as images, not live SVG filters) ───────

const svgUri = (s: string) => `data:image/svg+xml;utf8,${encodeURIComponent(s)}`
const PAPER_GRAIN = svgUri(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="17" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.33  0 0 0 0 0.2  0 0 0 0.5 -0.1"/></filter><rect width="300" height="300" filter="url(#n)"/></svg>',
)
const BRUSHED = svgUri(
    '<svg xmlns="http://www.w3.org/2000/svg" width="84" height="1080"><filter id="b"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.004" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.32  0 0 0 0 0.35  0 0 0 0.9 -0.2"/></filter><rect width="84" height="1080" filter="url(#b)"/></svg>',
)

const KEYFRAMES = `
.vcr-root text { letter-spacing: normal; text-transform: none; text-shadow: none; }
.vcr-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: vcr-draw 0.55s ease-out forwards; }
@keyframes vcr-draw { to { stroke-dashoffset: 0; } }
.vcr-write { animation: vcr-write 0.7s cubic-bezier(.3,.6,.4,1) both; }
@keyframes vcr-write { from { clip-path: inset(-20% 100% -20% 0); } to { clip-path: inset(-20% -2% -20% 0); } }
.vcr-pen { transition: transform 0.12s ease-out; }
.vcr-pen[data-up="1"] { transform: translate(-1px, -7px); }
.vcr-roll { animation: vcr-roll 0.16s ease-out both; }
@keyframes vcr-roll { from { transform: translateY(-26px); } to { transform: none; } }
.vcr-live { transition: opacity 0.5s ease, transform 0.9s cubic-bezier(.5,0,.2,1); transform-origin: ${PEN_X}px 540px; }
.vcr-live[data-out="1"] { opacity: 0; transform: scale(0.94); }
.vcr-overview { animation: vcr-ov-in 0.9s 0.35s cubic-bezier(.2,.7,.2,1) both; transform-origin: 960px 540px; }
@keyframes vcr-ov-in { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: none; } }
.vcr-slam { animation: vcr-slam 0.62s cubic-bezier(.3,.4,.3,1) both; }
@keyframes vcr-slam { 0% { transform: scale(1.75); opacity: 0; } 45% { transform: scale(1.18); opacity: 0; } 62% { transform: scale(0.96); opacity: 1; } 80% { transform: scale(1.012); } 100% { transform: scale(1); opacity: 1; } }
.vcr-shake { animation: vcr-shake 0.26s 0.38s linear both; }
@keyframes vcr-shake { 0%, 100% { transform: none; } 25% { transform: translate(4px, 3px); } 50% { transform: translate(-3px, -1px); } 75% { transform: translate(1px, 2px); } }
.vcr-dot { animation: vcr-dot 1.4s ease-in-out infinite both; }
@keyframes vcr-dot { 0%, 15% { opacity: 0; } 30%, 70% { opacity: 1; } 100% { opacity: 0; } }
`

// ── Driver ──────────────────────────────────────────────────────────────────

interface Track {
    hold: number[]; wobble: number[]
    low: number | null; lowT: number; high: number | null; highT: number
    tickLow: number; tickHigh: number; tickAt: number
    quietSince: number | null; loudRun: number
    warned: Set<string>; closed: Set<number>
}
const newTrack = (): Track => ({
    hold: [], wobble: [], low: null, lowT: 0, high: null, highT: 0,
    tickLow: Infinity, tickHigh: -Infinity, tickAt: -9, quietSince: null, loudRun: 0,
    warned: new Set(), closed: new Set(),
})

interface View {
    phase: VoiceCheckUpdate['phase']
    name: string
    midi: number | null
    marks: Mark[]
    result?: VoiceCheckResult
    error?: string
}

export function VoiceCheckStage() {
    const { state } = useApp()
    const [view, setView] = useState<View | null>(null)
    const [checkId, setCheckId] = useState(0)

    const clock = useRef({ t: -LEAD, at: 0, running: false })
    const live = useRef<{ midi: number | null; level: number }>({ midi: null, level: 0 })
    const pen = useRef({ y: yOf(57), ly: LV_BOT - 4 })
    const pitchInk = useRef(new InkLine(INK_RED, 4.5))
    const levelInk = useRef(new InkLine(INK_BLUE, 2.5))
    const marks = useRef<Mark[]>([])
    const track = useRef<Track>(newTrack())
    const phaseRef = useRef<VoiceCheckUpdate['phase'] | null>(null)
    const lastMsgAt = useRef(0)

    const paperG = useRef<SVGGElement>(null)
    const pitchInkG = useRef<SVGGElement>(null)
    const levelInkG = useRef<SVGGElement>(null)
    const pitchSled = useRef<SVGGElement>(null)
    const levelSled = useRef<SVGGElement>(null)

    useEffect(() => {
        const api = window.electronAPI
        if (!api?.isStageWindow || !api.onVoiceCheck) return

        const closeStep = (s: number) => {
            const k = track.current
            if (k.closed.has(s)) return
            k.closed.add(s)
            if (s === 0) {
                let text = 'didn’t hear a note'
                let y = (CH_TOP + CH_BOT) / 2
                if (k.hold.length >= 6) {
                    const w = k.wobble.length ? k.wobble.reduce((a, b) => a + b, 0) / k.wobble.length : 30
                    text = w <= 12 ? 'rock steady!' : w <= 24 ? 'nice and steady' : 'a bit wobbly'
                    const sorted = [...k.hold].sort((a, b) => a - b)
                    y = yOf(sorted[sorted.length >> 1]) - 64
                }
                marks.current.push({ kind: 'note', t: STEP_START[1] - 0.2, y: clamp(y, CH_TOP + 64, CH_BOT - 30), text, anchor: 'end', size: 48, rot: -4, underline: true })
            } else if (s === 1 && k.low != null) {
                marks.current.push({ kind: 'loop', t: k.lowT, y: yOf(k.low), label: `lowest ${noteName(Math.round(k.low))}`, seed: 11 })
            } else if (s === 2 && k.high != null) {
                marks.current.push({ kind: 'loop', t: k.highT, y: yOf(k.high), label: `highest ${noteName(Math.round(k.high))}`, seed: 23 })
            } else if (s === 3) {
                marks.current.push({ kind: 'check', t: VOICE_CHECK_SECONDS - 1.1, y: CH_TOP + 120 })
            }
        }

        const onSinging = (u: VoiceCheckUpdate) => {
            const k = track.current
            const t = u.elapsed
            const { index, stepElapsed } = stepAt(t)
            if (index === 0 && u.midi != null) {
                k.hold.push(u.midi)
                if (u.wobbleCents != null) k.wobble.push(u.wobbleCents)
            }
            if (u.lowMidi != null && (k.low == null || u.lowMidi < k.low - 0.01)) { k.low = u.lowMidi; k.lowT = t }
            if (u.highMidi != null && (k.high == null || u.highMidi > k.high + 0.01)) { k.high = u.highMidi; k.highT = t }
            // While sliding, tick off each new record a semitone further on.
            if (index === 1 && k.low != null) {
                if (k.tickLow === Infinity) k.tickLow = k.low
                else if (k.low <= k.tickLow - 1 && t - k.tickAt > 0.45) {
                    marks.current.push({ kind: 'tick', t, y: yOf(k.low), text: noteName(Math.round(k.low)), below: true })
                    k.tickLow = k.low
                    k.tickAt = t
                }
            }
            if (index === 2 && k.high != null) {
                if (k.tickHigh === -Infinity) k.tickHigh = k.high
                else if (k.high >= k.tickHigh + 1 && t - k.tickAt > 0.45) {
                    marks.current.push({ kind: 'tick', t, y: yOf(k.high), text: noteName(Math.round(k.high)), below: false })
                    k.tickHigh = k.high
                    k.tickAt = t
                }
            }
            for (let s = 0; s < index; s++) closeStep(s)
            // Level notes, at most one of each per step, written in the zone they're about.
            if (u.level < 0.035) { if (k.quietSince == null) k.quietSince = t } else k.quietSince = null
            if (k.quietSince != null && t - k.quietSince > 2 && stepElapsed > 1.5 && !k.warned.has('q' + index)) {
                k.warned.add('q' + index)
                marks.current.push({ kind: 'note', t, y: LV_BOT - 26, text: 'louder!', anchor: 'start', size: 40, rot: -3 })
            }
            k.loudRun = u.level > 0.95 ? k.loudRun + 1 : 0
            if (k.loudRun >= 3 && !k.warned.has('l' + index)) {
                k.warned.add('l' + index)
                marks.current.push({ kind: 'note', t, y: LV_TOP + 34, text: 'too loud, back off a bit', anchor: 'start', size: 36, rot: -2 })
            }
        }

        const reset = () => {
            pitchInk.current.reset()
            levelInk.current.reset()
            marks.current = []
            track.current = newTrack()
            pen.current = { y: yOf(57), ly: LV_BOT - 4 }
            setCheckId(n => n + 1)
        }

        const h = api.onVoiceCheck(u => {
            lastMsgAt.current = performance.now()
            if (u.phase === 'closed') {
                phaseRef.current = null
                clock.current.running = false
                setView(null)
                return
            }
            if (u.phase === 'countdown' && phaseRef.current !== 'countdown') reset()
            phaseRef.current = u.phase
            const running = u.phase === 'countdown' || u.phase === 'singing'
            if (running) clock.current = { t: u.phase === 'countdown' ? u.elapsed - LEAD : u.elapsed, at: performance.now(), running: true }
            else clock.current.running = false
            live.current = { midi: running ? u.midi : null, level: running ? u.level : 0 }
            if (u.phase === 'singing') onSinging(u)
            if (!running) {
                const reached = stepAt(clock.current.t).index
                for (let s = 0; s <= reached; s++) closeStep(s)
            }
            setView({ phase: u.phase, name: u.name, midi: u.midi, marks: marks.current.slice(), result: u.result, error: u.error })
        })
        // If the host goes quiet (closed mid-check), don't strand the chart on
        // screen. The host heartbeats while it analyzes.
        const watchdog = setInterval(() => {
            if (lastMsgAt.current && performance.now() - lastMsgAt.current > 15000) {
                lastMsgAt.current = 0
                phaseRef.current = null
                setView(null)
            }
        }, 2000)
        return () => { api.offVoiceCheck(h); clearInterval(watchdog) }
    }, [])

    const active = view != null
    useEffect(() => {
        if (!active) return
        pitchInk.current.attach(pitchInkG.current)
        levelInk.current.attach(levelInkG.current)
        let raf = 0, prev = performance.now()
        let lastPaper = '', lastPitch = '', lastLevel = ''
        let penWasDown = false
        const frame = (now: number) => {
            const dt = Math.min(0.05, (now - prev) / 1000)
            prev = now
            const c = clock.current
            const t = c.running ? Math.min(c.t + (now - c.at) / 1000, c.t + 0.3) : c.t
            const p = pen.current, lv = live.current
            if (lv.midi != null) {
                // After a gap the pen drops straight onto the new note rather
                // than smearing ink across from the old one.
                p.y = penWasDown ? p.y + (yOf(lv.midi) - p.y) * (1 - Math.exp(-dt * 16)) : yOf(lv.midi)
            }
            penWasDown = c.running && lv.midi != null
            p.ly += (levelY(lv.level) - p.ly) * (1 - Math.exp(-dt * 22))
            const x = t * V
            pitchInk.current.draw(x, p.y, c.running && lv.midi != null)
            levelInk.current.draw(x, p.ly, c.running)
            const paper = `translate(${f1(PEN_X - x)} 0)`, pitch = `translate(0 ${f1(p.y)})`, level = `translate(0 ${f1(p.ly)})`
            if (paper !== lastPaper) { paperG.current?.setAttribute('transform', paper); lastPaper = paper }
            if (pitch !== lastPitch) { pitchSled.current?.setAttribute('transform', pitch); lastPitch = pitch }
            if (level !== lastLevel) { levelSled.current?.setAttribute('transform', level); lastLevel = level }
            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)
        return () => cancelAnimationFrame(raf)
    }, [active, checkId])

    const printed = useMemo(() => <PrintedPaper />, [])
    if (!view) return null

    const overview = view.phase === 'analyzing' || view.phase === 'result' || view.phase === 'error'
    const note = view.midi != null ? noteName(Math.round(view.midi)) : '- -'

    return (
        <div className="vcr-root" style={{
            position: 'fixed', inset: 0, zIndex: 9000, overflow: 'hidden',
            backgroundColor: PAPER, backgroundImage: `url("${PAPER_GRAIN}")`,
            fontFamily: OSWALD, letterSpacing: 'normal', textTransform: 'none',
        }}>
            <style>{KEYFRAMES}</style>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
                <defs>
                    <pattern id="vcr-seconds" width={V} height={10} patternUnits="userSpaceOnUse">
                        <line x1={0.6} x2={0.6} y1={0} y2={10} stroke={GRID_MAJOR} strokeWidth={1.3} />
                        {[1, 2, 3].map(k => <line key={k} x1={(k * V) / 4} x2={(k * V) / 4} y1={0} y2={10} stroke={GRID} strokeWidth={0.8} />)}
                    </pattern>
                    <pattern id="vcr-hatch" width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <line x1={0} y1={0} x2={0} y2={12} stroke={GRID_MAJOR} strokeWidth={1.6} opacity={0.5} />
                    </pattern>
                    <pattern id="vcr-sprocket" width={56} height={40} patternUnits="userSpaceOnUse">
                        <rect x={17} y={13} width={22} height={14} rx={4} fill="#1c1916" />
                        <rect x={17} y={25} width={22} height={2} rx={1} fill="#ffffff" opacity={0.25} />
                    </pattern>
                    <linearGradient id="vcr-alu" x1="0" x2="1">
                        <stop offset="0" stopColor="#b9bec4" /><stop offset="0.45" stopColor="#dde1e5" /><stop offset="1" stopColor="#a9aeb5" />
                    </linearGradient>
                    <linearGradient id="vcr-plate-shadow" x1="0" x2="1">
                        <stop offset="0" stopColor="#3b2a17" stopOpacity="0.34" /><stop offset="1" stopColor="#3b2a17" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="vcr-steel" x1="0" x2="1">
                        <stop offset="0" stopColor="#5f6469" /><stop offset="0.35" stopColor="#eef1f3" /><stop offset="0.6" stopColor="#a3a9af" /><stop offset="1" stopColor="#474b50" />
                    </linearGradient>
                    <linearGradient id="vcr-rail-shadow" x1="0" x2="1">
                        <stop offset="0" stopColor="#3b2a17" stopOpacity="0.3" /><stop offset="1" stopColor="#3b2a17" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="vcr-anod" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="#4a4f56" /><stop offset="0.5" stopColor="#30343a" /><stop offset="1" stopColor="#1e2125" />
                    </linearGradient>
                    <radialGradient id="vcr-screw" cx="0.35" cy="0.3" r="0.8">
                        <stop offset="0" stopColor="#f4f6f7" /><stop offset="0.6" stopColor="#a5abb1" /><stop offset="1" stopColor="#5d6268" />
                    </radialGradient>
                    <linearGradient id="vcr-drum" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="#000" stopOpacity="0.85" /><stop offset="0.3" stopColor="#000" stopOpacity="0" />
                        <stop offset="0.7" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.85" />
                    </linearGradient>
                    <linearGradient id="vcr-roll-edge" x1="0" x2="1">
                        <stop offset="0" stopColor="#4a3519" stopOpacity="0" /><stop offset="1" stopColor="#4a3519" stopOpacity="0.4" />
                    </linearGradient>
                    <filter id="vcr-speckle" x="0" y="0" width="1" height="1">
                        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9" />
                        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -16 6.6" />
                    </filter>
                    <filter id="vcr-blotch" x="0" y="0" width="1" height="1">
                        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3" />
                        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.25" />
                    </filter>
                    <mask id="vcr-stamp-mask" maskUnits="userSpaceOnUse" x={-420} y={-300} width={840} height={600}>
                        <rect x={-420} y={-300} width={840} height={600} fill="#fff" />
                        <rect x={-420} y={-300} width={840} height={600} filter="url(#vcr-speckle)" />
                        <rect x={-420} y={-300} width={840} height={600} filter="url(#vcr-blotch)" />
                    </mask>
                </defs>

                <g className="vcr-live" data-out={overview ? '1' : '0'}>
                    <g ref={paperG}>
                        {printed}
                        <g ref={levelInkG} />
                        <g ref={pitchInkG} />
                        <Marks marks={view.marks} x={t => t * V} scale={1} animate />
                    </g>
                    <Carriage pitchSled={pitchSled} levelSled={levelSled} penUp={view.midi == null || (view.phase !== 'singing' && view.phase !== 'countdown')} note={note} />
                </g>

                {overview && (
                    <Overview
                        pitch={pitchInk.current.pts} level={levelInk.current.pts} marks={view.marks}
                        phase={view.phase} name={view.name} result={view.result} error={view.error} matching={state.voiceMatch}
                    />
                )}

                {/* paper curling onto the supply roll, right edge */}
                <rect x={W - 70} y={0} width={70} height={H} fill="url(#vcr-roll-edge)" />
                <line x1={W - 68} x2={W - 68} y1={0} y2={H} stroke="#ffffff" strokeWidth={1.2} opacity={0.35} />
                <ScalePlate />
                <NameTape name={view.name} />
            </svg>
        </div>
    )
}
