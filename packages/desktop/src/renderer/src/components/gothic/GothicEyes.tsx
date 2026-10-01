// Something in the dark is watching the singer.
//
// Pairs of eyes open, one or two at a time, in the darkest parts of the
// screen. They look at whatever the room is looking at: the syllable being
// sung right now, or on the join screen, the QR code people are scanning. Their
// pupils dart (a saccade, not a smooth pan) each time the target moves, they
// blink at uneven intervals, and when lightning lights the room they snap shut,
// because things that live in the dark don't like the light. Then they're gone,
// and later they open somewhere else.
//
// Cost: one rAF loop for the whole component, writing transforms on refs. React
// renders the eyes once and never again; nothing here sets state per frame.

import { useEffect, useMemo, useRef } from 'react'
import { sampleStorm } from './storm'

export interface EyeAnchor {
    /** Position of the pair's centre, in % of the viewport. */
    x: number
    y: number
    /** Size multiplier (smaller reads as farther away). */
    scale?: number
}

type Species = 'ember' | 'spectre' | 'beast'

const SPECIES: Record<Species, { iris: string; core: string; glow: string; slit: boolean; gap: number }> = {
    // Amber, slit-pupilled. The classic thing in the rafters.
    beast: { iris: '#E9A23B', core: '#FFE2A0', glow: 'rgba(233,162,59,0.38)', slit: true, gap: 1.2 },
    // Pale and cold, with pinprick pupils. Something that used to be a person.
    spectre: { iris: '#BFD4F2', core: '#F4F8FF', glow: 'rgba(175,195,234,0.34)', slit: false, gap: 1.0 },
    // Small, close-set and red. Low down, by the floor.
    ember: { iris: '#D6283C', core: '#FF8A7A', glow: 'rgba(214,40,60,0.4)', slit: false, gap: 0.82 },
}

interface Pair {
    species: Species
    anchor: number
    // Lifecycle times in ms (performance.now clock)
    openAt: number
    closeAt: number
    nextBlink: number
    blinkStart: number
    flinchUntil: number
    // Animated state
    open: number
    look: [number, number]
    lookTarget: [number, number]
}

interface Props {
    anchors: EyeAnchor[]
    /** How many pairs may be open at once. */
    maxOpen?: number
    /** What the eyes watch: selectors separated by '|', the first that matches wins. */
    target?: string
    /** Base pixel width of one pair at scale 1. */
    size?: number
    /** Seconds between appearances (min, max). */
    rest?: [number, number]
    /** Seconds a pair stays open (min, max). */
    stay?: [number, number]
    zIndex?: number
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

export function GothicEyes({
    anchors,
    maxOpen = 2,
    target,
    size = 74,
    rest = [5, 13],
    stay = [7, 14],
    zIndex = 4,
}: Props) {
    const slots = Math.max(1, Math.min(maxOpen, anchors.length))
    const pairEls = useRef<Array<HTMLDivElement | null>>([])
    const lidEls = useRef<Array<Array<HTMLDivElement | null>>>([])
    const pupilEls = useRef<Array<Array<SVGGElement | null>>>([])
    const haloEls = useRef<Array<HTMLDivElement | null>>([])
    const rootEl = useRef<HTMLDivElement>(null)

    // Each slot is assigned a species up front so its SVG never re-renders.
    const species = useMemo<Species[]>(() => {
        const order: Species[] = ['beast', 'spectre', 'ember']
        const start = Math.floor(Math.random() * order.length)
        return Array.from({ length: slots }, (_, i) => order[(start + i) % order.length])
    }, [slots])

    useEffect(() => {
        let raf = 0
        const now0 = performance.now()
        const pairs: Pair[] = species.map((sp, i) => ({
            species: sp,
            anchor: -1,
            openAt: now0 + rand(rest[0], rest[1]) * 1000 * (0.4 + i * 0.7),
            closeAt: 0,
            nextBlink: 0,
            blinkStart: -1e9,
            flinchUntil: 0,
            open: 0,
            look: [0, 0],
            lookTarget: [0, 0],
        }))
        const busy = new Set<number>()
        let targetPt: [number, number] | null = null
        let lastTargetPoll = 0

        const pickAnchor = (): number => {
            const free = anchors.map((_, i) => i).filter((i) => !busy.has(i))
            if (free.length === 0) return -1
            return free[Math.floor(Math.random() * free.length)]
        }

        const place = (i: number, a: number) => {
            const el = pairEls.current[i]
            const an = anchors[a]
            if (!el || !an) return
            const s = an.scale ?? 1
            el.style.left = `${an.x}%`
            el.style.top = `${an.y}%`
            el.style.width = `${size * s}px`
            el.style.height = `${size * s * 0.36}px`
            el.style.marginLeft = `${(-size * s) / 2}px`
            el.style.marginTop = `${(-size * s * 0.36) / 2}px`
        }

        const frame = () => {
            const now = performance.now()
            const storm = sampleStorm(now)

            if (target && now - lastTargetPoll > 120) {
                lastTargetPoll = now
                let el: Element | null = null
                for (const sel of target.split('|')) {
                    el = document.querySelector(sel.trim())
                    if (el) break
                }
                if (el) {
                    const r = el.getBoundingClientRect()
                    targetPt = r.width > 0 ? [r.left + r.width / 2, r.top + r.height / 2] : null
                } else {
                    targetPt = null
                }
            }

            // Anchors are in % of this layer, which may be a letterboxed 16:9
            // box rather than the viewport, so aim from the layer's real rect.
            const box = rootEl.current?.getBoundingClientRect()
            const bx = box?.left ?? 0
            const by = box?.top ?? 0
            const vw = box?.width ?? window.innerWidth
            const vh = box?.height ?? window.innerHeight

            pairs.forEach((p, i) => {
                const el = pairEls.current[i]
                if (!el) return

                // ── lifecycle ──
                if (p.anchor < 0 && now >= p.openAt) {
                    const a = pickAnchor()
                    if (a >= 0) {
                        p.anchor = a
                        busy.add(a)
                        place(i, a)
                        p.closeAt = now + rand(stay[0], stay[1]) * 1000
                        p.nextBlink = now + rand(1400, 3200)
                        p.look = [rand(-0.4, 0.4), rand(-0.2, 0.2)]
                    } else {
                        p.openAt = now + 2000
                    }
                }
                const live = p.anchor >= 0
                if (live && now >= p.closeAt && p.open < 0.02) {
                    busy.delete(p.anchor)
                    p.anchor = -1
                    p.openAt = now + rand(rest[0], rest[1]) * 1000
                }

                // Lightning: snap shut, and maybe don't come back this time.
                if (live && storm.flash > 0.22 && p.flinchUntil < now) {
                    p.flinchUntil = now + 900
                    if (Math.random() < 0.45) p.closeAt = now
                }

                const wantOpen = live && now < p.closeAt && now >= p.flinchUntil ? 1 : 0
                // Opening is slow and deliberate; closing (or flinching) is fast.
                const rate = wantOpen > p.open ? 0.035 : 0.28
                p.open += (wantOpen - p.open) * rate

                // Blink: a 150ms squeeze, at uneven intervals, sometimes doubled.
                let lid = 1
                if (live && wantOpen) {
                    if (now >= p.nextBlink) {
                        p.blinkStart = now
                        p.nextBlink = now + (Math.random() < 0.18 ? 260 : rand(2200, 5600))
                    }
                    const b = (now - p.blinkStart) / 150
                    if (b >= 0 && b < 1) lid = 0.06 + 0.94 * Math.abs(b * 2 - 1)
                }

                // ── gaze ──
                if (live) {
                    const an = anchors[p.anchor]
                    if (targetPt && an) {
                        const cx = bx + (an.x / 100) * vw
                        const cy = by + (an.y / 100) * vh
                        const dx = targetPt[0] - cx
                        const dy = targetPt[1] - cy
                        const d = Math.max(1, Math.hypot(dx, dy))
                        // Unit direction, with a little extra squint for far targets.
                        const reach = Math.min(1, d / 420)
                        p.lookTarget = [(dx / d) * reach, (dy / d) * reach * 0.8]
                    } else if (Math.random() < 0.006) {
                        p.lookTarget = [rand(-0.8, 0.8), rand(-0.4, 0.4)]
                    }
                    // Saccade: covers most of the distance within a few frames.
                    p.look[0] += (p.lookTarget[0] - p.look[0]) * 0.32
                    p.look[1] += (p.lookTarget[1] - p.look[1]) * 0.32
                }

                // ── paint ──
                const o = p.open
                el.style.opacity = String(Math.min(1, o * 1.15))
                const lids = lidEls.current[i] || []
                for (const l of lids) if (l) l.style.transform = `scaleY(${Math.max(0.02, o * lid)})`
                const pupils = pupilEls.current[i] || []
                // Pupils widen in the dark and pinch when light hits.
                const dil = SPECIES[p.species].slit ? 1 + (1 - Math.min(1, storm.flash * 3)) * 0.5 : 1
                for (const pu of pupils) {
                    if (pu) pu.setAttribute('transform', `translate(${(p.look[0] * 7).toFixed(2)} ${(p.look[1] * 4).toFixed(2)}) scale(${dil.toFixed(3)} 1)`)
                }
                const halo = haloEls.current[i]
                if (halo) halo.style.opacity = String(o * lid * 0.9)
            })

            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)
        return () => cancelAnimationFrame(raf)
        // anchors are expected to be stable per screen
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [species, target, size])

    return (
        <div ref={rootEl} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex, overflow: 'hidden' }}>
            {species.map((sp, i) => {
                const S = SPECIES[sp]
                lidEls.current[i] = lidEls.current[i] || []
                pupilEls.current[i] = pupilEls.current[i] || []
                const eye = (k: number) => (
                    <div
                        key={k}
                        ref={(el) => { lidEls.current[i][k] = el }}
                        style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', left: k === 0 ? `${10 - (S.gap - 1) * 10}%` : `${50 + (S.gap - 1) * 10}%`, transform: 'scaleY(0.02)', transformOrigin: '50% 50%' }}
                    >
                        <svg viewBox="0 0 60 26" width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
                            <defs>
                                <radialGradient id={`goth-iris-${sp}`} cx="50%" cy="46%" r="55%">
                                    <stop offset="0%" stopColor={S.core} />
                                    <stop offset="45%" stopColor={S.iris} />
                                    <stop offset="100%" stopColor="#1A0806" />
                                </radialGradient>
                                <clipPath id={`goth-lid-${sp}-${i}-${k}`}>
                                    <path d={k === 0 ? 'M2 15 Q26 -3 58 11 Q34 30 2 15 Z' : 'M2 11 Q34 -3 58 15 Q26 30 2 11 Z'} />
                                </clipPath>
                            </defs>
                            <g clipPath={`url(#goth-lid-${sp}-${i}-${k})`}>
                                <rect x="0" y="-4" width="60" height="34" fill={`url(#goth-iris-${sp})`} />
                                <g ref={(el) => { pupilEls.current[i][k] = el }}>
                                    {S.slit ? (
                                        <ellipse cx="30" cy="13" rx="2.1" ry="10" fill="#050203" />
                                    ) : (
                                        <circle cx="30" cy="13" r={sp === 'spectre' ? 2.2 : 4.2} fill="#050203" />
                                    )}
                                    <circle cx="26.5" cy="9.5" r="1.4" fill="#FFFFFF" opacity="0.75" />
                                </g>
                            </g>
                        </svg>
                    </div>
                )
                return (
                    <div key={i} ref={(el) => { pairEls.current[i] = el }} style={{ position: 'absolute', left: '-20%', top: '-20%', opacity: 0, willChange: 'opacity' }}>
                        <div
                            ref={(el) => { haloEls.current[i] = el }}
                            style={{ position: 'absolute', inset: '-160% -30%', opacity: 0, background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${S.glow} 0%, transparent 70%)` }}
                        />
                        {eye(0)}
                        {eye(1)}
                    </div>
                )
            })}
        </div>
    )
}
