// The engine's rendered parts (from packages/mobile/scripts/generate-
// steampunk-assets.py) and the geometry that makes its gears mesh.
//
// Every gear is cut with the same tooth size (MODULE, in sprite pixels), so
// any two of them mesh when their centres sit exactly the sum of their pitch
// radii apart and their teeth are phased into each other's gaps. `meshTrain`
// lays a train out that way; the engine clock (engine.ts) then turns every
// gear by the same master angle times its ratio, in alternating directions,
// so the teeth stay engaged however fast the engine runs.

import gear10 from '../../assets/steampunk/gear-10.png'
import gear10s from '../../assets/steampunk/gear-10-shadow.png'
import gear14 from '../../assets/steampunk/gear-14.png'
import gear14s from '../../assets/steampunk/gear-14-shadow.png'
import gear18 from '../../assets/steampunk/gear-18.png'
import gear18s from '../../assets/steampunk/gear-18-shadow.png'
import gear24 from '../../assets/steampunk/gear-24.png'
import gear24s from '../../assets/steampunk/gear-24-shadow.png'
import gear32 from '../../assets/steampunk/gear-32.png'
import gear32s from '../../assets/steampunk/gear-32-shadow.png'
import gear44 from '../../assets/steampunk/gear-44.png'
import gear44s from '../../assets/steampunk/gear-44-shadow.png'
import porthole from '../../assets/steampunk/porthole.png'
import portholeGlass from '../../assets/steampunk/porthole-glass.png'
import gaugeBezel from '../../assets/steampunk/gauge-bezel.png'
import gaugeDial from '../../assets/steampunk/gauge-dial.png'
import gaugeNeedle from '../../assets/steampunk/gauge-needle.png'
import clockBezel from '../../assets/steampunk/clock-bezel.png'
import clockDial from '../../assets/steampunk/clock-dial.png'
import clockHour from '../../assets/steampunk/clock-hour.png'
import clockMinute from '../../assets/steampunk/clock-minute.png'
import handwheel from '../../assets/steampunk/handwheel.png'
import frameBrass from '../../assets/steampunk/frame-brass.png'
import pipe from '../../assets/steampunk/pipe.png'
import pipeCoupling from '../../assets/steampunk/pipe-coupling.png'
import rivet from '../../assets/steampunk/rivet.png'
import steam0 from '../../assets/steampunk/steam-0.png'
import steam1 from '../../assets/steampunk/steam-1.png'
import steam2 from '../../assets/steampunk/steam-2.png'
import airship from '../../assets/steampunk/airship.png'
import foundry from '../../assets/steampunk/foundry.jpg'
import foundryWindows from '../../assets/steampunk/foundry-windows.png'

export const ART = {
    porthole, portholeGlass, gaugeBezel, gaugeDial, gaugeNeedle, clockBezel, clockDial, clockHour, clockMinute,
    handwheel, frameBrass, pipe, pipeCoupling, rivet, steam: [steam0, steam1, steam2], airship, foundry, foundryWindows,
}

/** Tooth size every gear was cut with, in sprite pixels (generator MODULE). */
export const MODULE = 13

export type Teeth = 10 | 14 | 18 | 24 | 32 | 44

export const GEARS: Record<Teeth, { src: string; shadow: string }> = {
    10: { src: gear10, shadow: gear10s },
    14: { src: gear14, shadow: gear14s },
    18: { src: gear18, shadow: gear18s },
    24: { src: gear24, shadow: gear24s },
    32: { src: gear32, shadow: gear32s },
    44: { src: gear44, shadow: gear44s },
}

/** Pitch radius and sprite size of a gear, in sprite pixels. */
export function gearGeometry(teeth: number): { pitch: number; size: number } {
    const pitch = (MODULE * teeth) / 2
    const outer = pitch + 0.95 * MODULE
    return { pitch, size: 2 * Math.ceil(outer + 6) }
}

export interface PlacedGear {
    teeth: Teeth
    /** centre, in the caller's pixels */
    x: number
    y: number
    /** rotation at rest, degrees */
    phase: number
    /** turning direction and speed relative to the train's first gear */
    dir: 1 | -1
    ratio: number
    /** caller pixels per sprite pixel */
    scale: number
}

export interface TrainLink {
    teeth: Teeth
    /** the gear this one meshes with (index into the train; default: the previous) */
    from?: number
    /** direction from that gear's centre to this one's, degrees clockwise from +x */
    deg: number
}

/** Lay out a train of meshing gears: centres a pitch-sum apart, teeth phased
 *  into each other's gaps, directions alternating. */
export function meshTrain(first: { teeth: Teeth; x: number; y: number; phase?: number }, links: TrainLink[], scale: number): PlacedGear[] {
    const out: PlacedGear[] = [{ teeth: first.teeth, x: first.x, y: first.y, phase: first.phase ?? 0, dir: 1, ratio: 1, scale }]
    links.forEach((l, i) => {
        const p = out[l.from ?? i]
        const rpA = gearGeometry(p.teeth).pitch
        const rpB = gearGeometry(l.teeth).pitch
        const phi = (l.deg * Math.PI) / 180
        const d = (rpA + rpB) * scale
        const x = p.x + Math.cos(phi) * d
        const y = p.y + Math.sin(phi) * d
        // A has a tooth at angle (phase + k * 360/nA); its phase where the gears
        // touch, in teeth, must leave B a gap there (they always sum to half a tooth).
        const a = (p.phase * Math.PI) / 180
        let pA = (((phi - a) * p.teeth) / (2 * Math.PI)) % 1
        if (pA < 0) pA += 1
        const b = phi + Math.PI - ((2 * Math.PI) / l.teeth) * (0.5 - pA)
        out.push({ teeth: l.teeth, x, y, phase: (b * 180) / Math.PI, dir: (p.dir * -1) as 1 | -1, ratio: (p.ratio * p.teeth) / l.teeth, scale })
    })
    return out
}
