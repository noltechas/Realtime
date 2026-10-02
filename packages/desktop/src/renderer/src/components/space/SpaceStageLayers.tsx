// The layers that ride along while a song plays on the space stage.
//
//   SpaceLinePlate    the active lyric line's plate: a band of black glass
//                     with an engraved gold hairline along its top and foot,
//                     and at each end a short run of binary tick marks, like a
//                     line of the record cover's notation. Injected as the
//                     line's first child so it paints under the words.
//   SpaceAtmosphere   the frame around the performance: etched registration
//                     marks in the four corners, the way a telescope camera
//                     frames a field, and a line of telemetry at the foot.
//
// Everything here YIELDS to the lyrics: nothing moves in the middle of the
// screen except the words.

import { useEffect, useState } from 'react'
import { ETCH, SP } from '../../styles/space'
import { BinaryMarks, mono, useCosmos } from './SpaceParts'

/** The active line's plate. `seed` varies the notation at its ends. */
export function SpaceLinePlate({ seed }: { seed: number }) {
    const a = 37 + ((seed * 53) % 90)
    const b = 41 + ((seed * 29) % 86)
    return (
        <span className="sp-plate" aria-hidden>
            <span className="sp-plate__ticks sp-plate__ticks--l">
                <BinaryMarks n={a} bits={7} height={9} gap={3} color={ETCH.strong} />
            </span>
            <span className="sp-plate__ticks sp-plate__ticks--r">
                <BinaryMarks n={b} bits={7} height={9} gap={3} color={ETCH.strong} />
            </span>
        </span>
    )
}

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
    const r = pos === 'tl' ? 0 : pos === 'tr' ? 90 : pos === 'br' ? 180 : 270
    const place: React.CSSProperties = {
        position: 'absolute',
        ...(pos[0] === 't' ? { top: 14 } : { bottom: 14 }),
        ...(pos[1] === 'l' ? { left: 14 } : { right: 14 }),
        transform: `rotate(${r}deg)`,
    }
    return (
        <svg width={34} height={34} viewBox="0 0 34 34" style={place} aria-hidden>
            <path d="M 0 18 L 0 0 L 18 0" fill="none" stroke={ETCH.mid} strokeWidth={1} />
            <line x1={6} y1={6} x2={10} y2={6} stroke={ETCH.faint} strokeWidth={1} />
            <line x1={6} y1={6} x2={6} y2={10} stroke={ETCH.faint} strokeWidth={1} />
        </svg>
    )
}

export function SpaceAtmosphere({ video }: { video: boolean }) {
    useCosmos()
    // a mission clock at the foot, counting up from when the song began
    const [t0] = useState(() => performance.now())
    const [now, setNow] = useState(t0)
    useEffect(() => {
        const id = window.setInterval(() => setNow(performance.now()), 1000)
        return () => window.clearInterval(id)
    }, [])
    const secs = Math.floor((now - t0) / 1000)
    const met = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', opacity: video ? 0.75 : 1 }}>
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
            {/* one line of telemetry along the foot, clear of the corner QR */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, textAlign: 'center', ...mono(11, 'rgba(138,142,163,0.62)', { letterSpacing: '0.3em' }) }}>
                Sounds of Earth
                <span style={{ color: SP.GOLD, opacity: 0.75, margin: '0 18px' }}>MET {met}</span>
                RA 17h 13m  DEC +12 02
            </div>
        </div>
    )
}
