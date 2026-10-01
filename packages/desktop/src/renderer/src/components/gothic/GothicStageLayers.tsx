// The layers that ride along while a song plays on the gothic stage.
//
//   GothicLinePane    the leaded window behind the active lyric line: an iron
//                     framed body of smoked glass ending in two ogee points,
//                     each point capped with a small boss. Injected as the
//                     line's first child so it paints under the words.
//   GothicAtmosphere  the room around the performance: we are looking out
//                     through a great arch (stone spandrels in the top corners,
//                     where the song and singer plaques hang, and a column at
//                     each edge), with one watcher in the dark at the side,
//                     candles at the column bases and fog along the floor.
//
// Everything here YIELDS to the lyrics: one pair of eyes at most, far out at
// the edge, and nothing that moves in the middle of the screen.

import { useEffect, useMemo } from 'react'
import { GOTH, GOTH_TEX } from '../../styles/gothic'
import { GothicEyes, type EyeAnchor } from './GothicEyes'
import { GothicCandleCluster } from './GothicCandle'
import { GothicFog } from './GothicChapel'
import { retainStormBridge } from './storm'

// ── The pane ─────────────────────────────────────────────────────────────────

function Cap({ flip }: { flip?: boolean }) {
    // An ogee point: concave out of the frame, then convex into the tip.
    const d = 'M 40 0 C 27 0 25 15 16 29 C 10 38 5 44 0 50 C 5 56 10 62 16 71 C 25 85 27 100 40 100 Z'
    return (
        <svg className="goth-pane__cap" viewBox="0 0 40 100" preserveAspectRatio="none" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
            <defs>
                <linearGradient id="goth-cap-glass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1A1520" />
                    <stop offset="55%" stopColor="#0D0B11" />
                    <stop offset="100%" stopColor="#140E0F" />
                </linearGradient>
                <linearGradient id="goth-cap-iron" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6A6474" />
                    <stop offset="30%" stopColor="#24212A" />
                    <stop offset="100%" stopColor="#4E3C2A" />
                </linearGradient>
            </defs>
            <path d={d} fill="url(#goth-cap-glass)" />
            <path d="M 40 0 C 27 0 25 15 16 29 C 10 38 5 44 0 50 C 5 56 10 62 16 71 C 25 85 27 100 40 100" fill="none" stroke="#0C0B0F" strokeWidth="5" vectorEffect="non-scaling-stroke" />
            <path d="M 40 0 C 27 0 25 15 16 29 C 10 38 5 44 0 50 C 5 56 10 62 16 71 C 25 85 27 100 40 100" fill="none" stroke="url(#goth-cap-iron)" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
            {/* the boss at the tip */}
            <ellipse cx="2.5" cy="50" rx="4.2" ry="5" fill="#1C1A20" stroke="#0A090C" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <ellipse cx="2.5" cy="50" rx="1.8" ry="2.2" fill={GOTH.CANDLE} opacity="0.9" />
        </svg>
    )
}

export function GothicLinePane() {
    return (
        <span className="goth-pane" aria-hidden>
            <Cap />
            <span className="goth-pane__body" />
            <Cap flip />
        </span>
    )
}

/** Glass fill for a whole line (LRC songs with no syllable timing): one singer
 *  is one colour; a shared line runs its singers' glass across the window. */
export function gothLineFill(colors: string[]): string {
    const tone = (c: string, k: number) =>
        [`color-mix(in srgb, ${c}, white 30%)`, c, c, `color-mix(in srgb, ${c}, black 24%)`][k]
    if (colors.length <= 1) {
        const c = colors[0] || GOTH.CANDLE
        return `linear-gradient(180deg, ${tone(c, 0)} 0%, ${tone(c, 1)} 38%, ${tone(c, 2)} 74%, ${tone(c, 3)} 100%)`
    }
    // Panes side by side, hard edged: glass is cut, not blended.
    const n = colors.length
    const stops = colors
        .map((c, i) => `${c} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`)
        .join(', ')
    return `linear-gradient(90deg, ${stops})`
}

// ── The room ─────────────────────────────────────────────────────────────────

function ArcadeFrame({ video }: { video: boolean }) {
    // Spandrels: the stone above the great arch's springing, in each top
    // corner, with a moulded inner edge. Columns run down each side.
    const left = 'M -200 -200 L 820 -200 L 820 0 Q 300 18 168 300 Q 108 440 96 640 L 96 1300 L -200 1300 Z'
    const edge = 'M 820 0 Q 300 18 168 300 Q 108 440 96 640 L 96 1300'
    return (
        <svg
            viewBox="0 0 1920 1080"
            preserveAspectRatio="xMidYMid slice"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: video ? 0.82 : 0.94 }}
            aria-hidden
        >
            <defs>
                <linearGradient id="goth-arc-stone" x1="0" y1="0" x2="0.6" y2="1">
                    <stop offset="0%" stopColor="#1C1922" />
                    <stop offset="60%" stopColor="#141218" />
                    <stop offset="100%" stopColor="#201813" />
                </linearGradient>
                <pattern id="goth-arc-grain" patternUnits="userSpaceOnUse" width="240" height="240">
                    <image href={GOTH_TEX.grain} width="240" height="240" />
                </pattern>
                <pattern id="goth-arc-soot" patternUnits="userSpaceOnUse" width="520" height="520">
                    <image href={GOTH_TEX.soot} width="520" height="520" />
                </pattern>
            </defs>
            {[false, true].map((mirror) => (
                <g key={String(mirror)} transform={mirror ? 'translate(1920 0) scale(-1 1)' : undefined}>
                    <path d={left} fill="url(#goth-arc-stone)" />
                    <path d={left} fill="url(#goth-arc-soot)" />
                    <path d={left} fill="url(#goth-arc-grain)" opacity="0.5" />
                    {/* moulded edge: a dark roll, a moonlit fillet, a candle-warm lower lip */}
                    <path d={edge} fill="none" stroke="#08070A" strokeWidth="16" />
                    <path d={edge} fill="none" stroke="#2A2631" strokeWidth="9" />
                    <path d={edge} fill="none" stroke="rgba(175,195,234,0.24)" strokeWidth="1.6" transform="translate(-3 -2)" />
                    <path d={edge} fill="none" stroke="rgba(227,176,75,0.18)" strokeWidth="1.4" transform="translate(5 4)" />
                    {/* the column's capital, where the arch springs */}
                    <path d="M 40 600 L 150 600 L 136 628 L 54 628 Z" fill="#26222C" stroke="#0A090C" strokeWidth="2" />
                    <path d="M 46 604 L 144 604" stroke="rgba(175,195,234,0.25)" strokeWidth="1.4" />
                    {[0, 1, 2].map((k) => (
                        <path key={k} d={`M ${62 + k * 26} 628 q 8 14 0 26`} stroke="#0E0D11" strokeWidth="3" fill="none" />
                    ))}
                    {/* a crocket or two up the outer edge of the arch */}
                    {[[300, 60], [190, 230], [128, 420]].map(([x, y], k) => (
                        <path key={k} d={`M ${x} ${y} q 18 -10 26 4 q -12 -2 -14 12 Z`} fill="#24202A" stroke="#0A090C" strokeWidth="1.5" transform={`rotate(${-30 + k * 12} ${x} ${y})`} />
                    ))}
                </g>
            ))}
        </svg>
    )
}

export function GothicAtmosphere({ video }: { video: boolean }) {
    useEffect(() => retainStormBridge(), [])
    const eyes: EyeAnchor[] = useMemo(
        () => [
            { x: 3.2, y: 44, scale: 0.72 },
            { x: 96.8, y: 48, scale: 0.72 },
            { x: 4, y: 74, scale: 0.6 },
            { x: 96, y: 76, scale: 0.6 },
        ],
        [],
    )
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}>
            <ArcadeFrame video={video} />
            <GothicEyes
                anchors={eyes}
                maxOpen={1}
                target=".k-line--now .k-syl--now .k-syl__word|.k-line--now"
                size={64}
                rest={[14, 30]}
                stay={[6, 11]}
            />
            <GothicFog zIndex={2} strength={video ? 0.5 : 0.8} />
            <GothicCandleCluster seed={0.33} scale={0.6} waxes={['ivory', 'blood', 'ivory']} style={{ left: 8, bottom: -10 }} />
            <GothicCandleCluster seed={0.71} scale={0.6} flip waxes={['ivory', 'black', 'ivory']} style={{ right: 8, bottom: -10 }} />
        </div>
    )
}
