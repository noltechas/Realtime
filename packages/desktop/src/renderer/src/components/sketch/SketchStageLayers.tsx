// Layers on the pencil-test stage while a song plays.
//
//   SketchBall   the bouncing ball over the lyrics: it lands on each syllable
//                as it's sung (exactly when the word is inked), and glides
//                down to the next line's first word as the line ends (no bounce
//                between lines). It rides the lyric scroll, because it reads
//                the words' positions every frame, and runs on its own smoothed
//                clock so uneven playback-time messages never make it judder.
//   SketchFrame  the sheet itself. With a music video, the video plays UNDER
//                the paper the way an animator traces live action on a light
//                table: grey, soft and faint through the sheet. Plus a pencil
//                on the desk and the drawing number in the corner.
import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react'
import { SK } from '../../styles/sketch'
import { ART } from './parts'
import { BallRig, hopAt, type RigHandle, type Target } from './ballRig'
import { Design, Mark, Pencil, note } from './PencilParts'

interface Anchor {
    eventMs: number
    perfAt: number
}

interface Spot {
    el: Element
    t: number
    tint: string | null
    line: number
}

/** Where the ball touches down on a word: over the start of its glyphs. A
 *  whole line (no syllable timing) is landed on at its first letters. */
function contact(el: Element, d: number): { x: number; y: number } {
    const r = el.getBoundingClientRect()
    if (el.classList.contains('k-line')) return { x: r.left + d * 1.6, y: r.top + r.height * 0.2 }
    return { x: r.left + Math.min(r.width * 0.5, Math.max(r.width * 0.32, 26)), y: r.top + r.height * 0.17 }
}

export function SketchBall({
    lyricsRef,
    timeAnchorRef,
    lyrics,
    lineIdx,
    playing,
    fallbackColor,
}: {
    lyricsRef: RefObject<HTMLDivElement>
    timeAnchorRef: MutableRefObject<Anchor>
    lyrics: any[]
    lineIdx: number
    playing: boolean
    fallbackColor: string
}) {
    const rig = useRef<RigHandle>(null)
    const playingRef = useRef(playing)
    playingRef.current = playing

    useEffect(() => {
        let raf = 0
        let spots: Spot[] = []
        let builtFor = ''
        let d = 30
        // The ball's clock. The song time arrives over IPC in uneven steps, and
        // re-anchoring on each one nudged the ball back and forth by a few
        // pixels. Instead the clock runs on its own and is eased toward the
        // reported time; only a real jump (a seek) snaps it.
        let clock = NaN
        let lastPerf = 0
        const build = (container: HTMLElement) => {
            spots = []
            if (lineIdx < 0 || !lyrics[lineIdx]) return
            const line = lyrics[lineIdx]
            const start = line.startTimeMs
            let p = lineIdx - 1
            while (p >= 0 && lyrics[p].startTimeMs === start) p--
            let n = lineIdx + 1
            while (n < lyrics.length && lyrics[n].startTimeMs === start) n++
            const lineEl = container.querySelector(`[data-li="${lineIdx}"]`)
            if (!lineEl) return
            const words = (el: Element | null) => (el ? Array.from(el.querySelectorAll('.k-syl__word')) : [])
            const tintOf = (el: Element) => el.closest('[data-tint]')?.getAttribute('data-tint') ?? null
            // where it was: the last word of the line before
            if (p >= 0) {
                const pe = container.querySelector(`[data-li="${p}"]`)
                const pw = words(pe)
                const ps = lyrics[p].syllables as Array<{ startMs: number }> | undefined
                const el = pw[pw.length - 1] ?? pe
                if (el) spots.push({ el, t: ps && ps.length ? ps[ps.length - 1].startMs : lyrics[p].startTimeMs, tint: tintOf(el), line: p })
            }
            const syls = line.syllables as Array<{ startMs: number }> | undefined
            const cw = words(lineEl)
            if (syls && syls.length && cw.length === syls.length) {
                syls.forEach((s, k) => spots.push({ el: cw[k], t: s.startMs, tint: tintOf(cw[k]), line: lineIdx }))
            } else {
                spots.push({ el: cw[0] ?? lineEl, t: start, tint: tintOf(lineEl), line: lineIdx })
            }
            // where it's going: the WHOLE next line, and the first word of the
            // one after. The line index updates on the playback tick (up to a
            // quarter second late), so when a line ends the ball must already
            // know the words that follow, or it would sit on the next line's
            // first word and then jump mid-hop once the index catches up.
            const push = (li: number, all: boolean) => {
                if (li >= lyrics.length) return
                const le = container.querySelector(`[data-li="${li}"]`)
                const lw = words(le)
                const ls = lyrics[li].syllables as Array<{ startMs: number }> | undefined
                if (all && ls && ls.length && lw.length === ls.length) {
                    ls.forEach((sy, k) => spots.push({ el: lw[k], t: sy.startMs, tint: tintOf(lw[k]), line: li }))
                    return
                }
                const el = lw[0] ?? le
                if (el) spots.push({ el, t: ls && ls.length ? ls[0].startMs : lyrics[li].startTimeMs, tint: tintOf(el), line: li })
            }
            push(n, true)
            let n2 = n + 1
            while (n < lyrics.length && n2 < lyrics.length && lyrics[n2].startTimeMs === lyrics[n].startTimeMs) n2++
            push(n2, false)
            const fs = parseFloat(getComputedStyle(lineEl).fontSize) || 56
            d = Math.max(30, fs * 0.7)
        }
        const tick = () => {
            raf = requestAnimationFrame(tick)
            const container = lyricsRef.current
            const r = rig.current
            if (!container || !r) return
            const key = `${lineIdx}:${lyrics.length}`
            // the line's spans re-render on every syllable, so rebuild if ours left the DOM
            if (key !== builtFor || (spots[0] && !spots[0].el.isConnected)) {
                builtFor = key
                build(container)
            }
            // paused: hold at the last reported time (it still moves on a seek)
            const a = timeAnchorRef.current
            const perf = performance.now()
            const reported = playingRef.current ? a.eventMs + (perf - a.perfAt) : a.eventMs
            if (!playingRef.current || !Number.isFinite(clock) || Math.abs(reported - clock) > 240) clock = reported
            else {
                clock += perf - lastPerf // run on
                clock += (reported - clock) * 0.08 // and drift toward the song
            }
            lastPerf = perf
            const now = clock
            if (spots.length === 0) {
                r.draw({ now, hop: null, d, color: fallbackColor, visible: false })
                return
            }
            const targets: Target[] = spots.map(s => ({ ...contact(s.el, d), t: s.t, line: s.line }))
            const hop = hopAt(targets, now, d * 0.9)
            // the ball's colour: the singer of the word it's on (or heading for)
            let k = 0
            for (let i = 0; i < spots.length; i++) if (spots[i].t <= now) k = i
            const going = hop && now >= hop.depart ? Math.min(spots.length - 1, k + 1) : k
            const color = spots[going]?.tint || fallbackColor
            r.draw({ now, hop, d, color, visible: true })
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [lyricsRef, timeAnchorRef, lyrics, lineIdx, fallbackColor])

    return <BallRig ref={rig} z={14} />
}

export function SketchFrame({ video = false, drawing }: { video?: boolean; drawing: number }) {
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
            {/* the sheet over the video, thin enough to see the footage
                through it like a reference on the light table: the paper's
                grain over the picture, and a pale wash so the pencil lettering
                still reads */}
            {video && (
                <>
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: `${SK.PAPER} url(${ART.paper}) center / cover no-repeat`,
                            mixBlendMode: 'multiply',
                            opacity: 0.55,
                        }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: SK.PAPER, opacity: 0.5 }} />
                </>
            )}
            <Design>
                <>
                    <Pencil kind="hb" length={640} angle={-8} style={{ left: 1460, top: 1012 }} />
                    {drawing > 0 && (
                        <div style={{ position: 'absolute', right: 86, bottom: 128, display: 'flex', alignItems: 'center', gap: 30 }}>
                            <span style={{ ...note(30, SK.GRAPHITE_SOFT) }}>dwg</span>
                            <span style={{ position: 'relative', display: 'inline-block', padding: '0 6px' }}>
                                <span style={{ ...note(46, SK.GRAPHITE) }}>{drawing}</span>
                                <Mark src={ART.ringRound} color={SK.GRAPHITE} width={74} height={74} style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -37, marginTop: -40 }} />
                            </span>
                        </div>
                    )}
                </>
            </Design>
        </div>
    )
}
