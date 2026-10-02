// The layers that ride along while a song plays on the Barbie stage.
//
//   BarbieLineCloud   the active lyric line is written on a painted cloud, with
//                     the sun peeking over it (each line, from a different
//                     spot). The sun's glow is the room's voice: it blooms as
//                     people sing louder. Injected as the line's first child so
//                     it paints under the words.
//   BarbieAtmosphere  the frame around the performance: a bank of painted
//                     clouds drifting along the bottom of the screen, a few
//                     twinkles at the edges, and the glitter that bursts out
//                     on a belted note.
//
// Everything here YIELDS to the lyrics: nothing moves in the middle of the
// screen except the line itself.

import { useMemo } from 'react'
import { BARB } from '../../styles/barbie'
import { GlitterBurst, PaintedCloud, TwinkleField, rng, useSunshine } from './BarbieParts'
import { useSetScale } from './BarbieSky'

/** The painted cloud behind the active line. `seed` picks where the sun peeks. */
export function BarbieLineCloud({ seed }: { seed: number }) {
    const sunX = useMemo(() => {
        const r = rng(seed * 0.618 + 0.11)
        // off-centre, alternately left and right, never dead middle
        const side = Math.floor(seed) % 2 === 0 ? 1 : -1
        return 50 + side * (16 + r() * 22)
    }, [seed])
    return (
        <span className="barb-cloud" aria-hidden style={{ ['--barb-sun-x' as string]: `${sunX}%` } as React.CSSProperties}>
            <span className="barb-cloud__sun" style={{ left: `${sunX}%` }} />
            <span className="barb-cloud__shape">
                <span className="barb-cloud__body barb-glint" />
            </span>
        </span>
    )
}

interface BankCloud {
    left: number
    width: number
    seed: number
    lift: number
    tone: 'day' | 'blush'
    flip: boolean
}

function bank(seed: number, n: number, tone: 'day' | 'blush'): BankCloud[] {
    const r = rng(seed)
    return Array.from({ length: n }, (_, i) => ({
        left: (i / n) * 100 - 6 + r() * 4,
        width: 250 + r() * 170,
        seed: r(),
        lift: r() * 18,
        tone,
        flip: r() < 0.5,
    }))
}

export function BarbieAtmosphere({ video }: { video: boolean }) {
    useSunshine()
    const { s } = useSetScale()
    const back = useMemo(() => bank(0.37, 9, 'blush'), [])
    const front = useMemo(() => bank(0.81, 8, 'day'), [])
    // The bank stays below the lyric ladder: only the tops of the clouds show.
    // Over a music video it sits lower still, so it frames rather than covers.
    const drop = (video ? 150 : 120) * s
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}>
            <div className="barb-bank barb-bank--back" style={{ position: 'absolute', left: '-8%', right: '-8%', bottom: -drop, height: 260 * s }}>
                {back.map((c, i) => (
                    <PaintedCloud key={i} width={c.width * s} seed={c.seed} tone={c.tone} flip={c.flip} style={{ position: 'absolute', left: `${c.left}%`, bottom: c.lift * s }} />
                ))}
            </div>
            <div className="barb-bank barb-bank--front" style={{ position: 'absolute', left: '-8%', right: '-8%', bottom: -drop - 46 * s, height: 260 * s }}>
                {front.map((c, i) => (
                    <PaintedCloud key={i} width={c.width * 1.1 * s} seed={c.seed} tone={c.tone} flip={c.flip} style={{ position: 'absolute', left: `${c.left + 5}%`, bottom: c.lift * s }} />
                ))}
            </div>
            <TwinkleField seed={0.47} count={6} box={{ x: 1, y: 30, w: 8, h: 50 }} size={[16, 30]} colors={['#FFFFFF', BARB.SUN_HI]} />
            <TwinkleField seed={0.93} count={6} box={{ x: 91, y: 30, w: 8, h: 50 }} size={[16, 30]} colors={['#FFFFFF', BARB.CANDY]} />
            <GlitterBurst x={50} y={46} spread={1.6} />
        </div>
    )
}
