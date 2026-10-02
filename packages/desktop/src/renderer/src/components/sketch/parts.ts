// The pencil test's drawn parts (from packages/mobile/scripts/generate-
// sketch-assets.py). Most are white alpha masks the stage tints: a singer's
// coloured pencil, carmine for corrections, blue for roughs, graphite.

import arrow0 from '../../assets/sketch/arrow-0.png'
import arrow1 from '../../assets/sketch/arrow-1.png'
import ball from '../../assets/sketch/ball.png'
import ballGhost from '../../assets/sketch/ball-ghost.png'
import ballShadow from '../../assets/sketch/ball-shadow.png'
import ballTone from '../../assets/sketch/ball-tone.png'
import box from '../../assets/sketch/box.png'
import check from '../../assets/sketch/check.png'
import cross from '../../assets/sketch/cross.png'
import grain from '../../assets/sketch/grain.png'
import hatch from '../../assets/sketch/hatch.png'
import holdLine from '../../assets/sketch/hold-line.png'
import note from '../../assets/sketch/note.png'
import paper from '../../assets/sketch/paper.jpg'
import pencilBlue from '../../assets/sketch/pencil-blue.png'
import pencilHb from '../../assets/sketch/pencil-hb.png'
import pencilRed from '../../assets/sketch/pencil-red.png'
import ring0 from '../../assets/sketch/ring-0.png'
import ring1 from '../../assets/sketch/ring-1.png'
import ring2 from '../../assets/sketch/ring-2.png'
import ringR from '../../assets/sketch/ring-r.png'
import scribble from '../../assets/sketch/scribble.png'
import swatch from '../../assets/sketch/swatch.png'
import tape0 from '../../assets/sketch/tape-0.png'
import tape1 from '../../assets/sketch/tape-1.png'
import tape2 from '../../assets/sketch/tape-2.png'
import underline0 from '../../assets/sketch/underline-0.png'
import underline1 from '../../assets/sketch/underline-1.png'
import underline2 from '../../assets/sketch/underline-2.png'

export const ART = {
    arrow: [arrow0, arrow1],
    ball,
    ballGhost,
    ballShadow,
    ballTone,
    box,
    check,
    cross,
    grain,
    hatch,
    holdLine,
    note,
    paper,
    pencil: { hb: pencilHb, blue: pencilBlue, red: pencilRed },
    ring: [ring0, ring1, ring2],
    ringRound: ringR,
    scribble,
    swatch,
    tape: [tape0, tape1, tape2],
    underline: [underline0, underline1, underline2],
}

/** The ball sprite is BALL.size px square with the drawn ball BALL.radius
 *  across from its centre (generator manifest). */
export const BALL = { size: 240, radius: 92.4 }

/** The pencilled box's nine-slice border, in sprite px. */
export const BOX_BORDER = 36
