import React from 'react'
import { View } from 'react-native'
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg'
import type { ThemeTokens } from '@karaoke/shared'
import { hexToRgba } from '../../theme/helpers'
import { AvatarPicker } from '../../components/AvatarPicker'

// The profile hero: the user's portrait, staged like a performer standing in a
// pool of their own singer colour. It exists because a bare circular avatar
// floating in the middle of a screen reads as unplaced — the staging is what
// gives the page a centre of gravity.
//
// Every decision here is driven by theme *flags*, never a theme name, so all
// twelve themes get a treatment that matches their own vocabulary:
//   • `cornerStyle: 'sharp'` (cyberpunk / urban / retrowave / space) → a square
//     HUD reticle of corner brackets, which matches the square portrait the
//     AvatarPicker already draws for those themes. Concentric circles around a
//     square plate would look like a mistake.
//   • `cardShape: 'blob'` (sketch) → the same rings, but dashed, so they read as
//     compass circles pencilled onto the page.
//   • everything else → solid concentric halo rings.
//   • `isDark` → a radial spill of coloured light behind the portrait plus a lit
//     pool of it on the floor. On a light background that spill is just mud, so
//     light themes get the rings alone.
//
// This layer draws no shadow of its own. The portrait's shadow belongs to the
// AvatarPicker, which renders it on a wrapper view specifically so the photo clip
// can't suppress it (see the note there) — a hard ink plate on the offset themes,
// a soft drop on the rest. Adding a second shadow here would double it up.

const AVATAR = 124
const STAGE_W = 340
const STAGE_H = 196
const CX = STAGE_W / 2
const CY = 92
const R = AVATAR / 2

// The light spill is drawn in its own oversized layer so its outer edge — where
// alpha reaches 0 — is never clipped by the stage box. A clipped gradient shows
// up as a straight seam across the glow.
const SPILL_PAD = 46
const SPILL_H = STAGE_H + SPILL_PAD * 2
const SPILL_R = Math.min(CY + SPILL_PAD, CX)

interface PortraitSpotlightProps {
  tokens: ThemeTokens
  picture: string | null
  initial: string
  /** The user's singer colour — everything in the staging is lit with it. */
  color: string
  onChange: (next: string | null) => void
}

export function PortraitSpotlight({
  tokens,
  picture,
  initial,
  color,
  onChange,
}: PortraitSpotlightProps) {
  const lit = tokens.isDark
  const sharp = tokens.cornerStyle === 'sharp'
  const sketched = tokens.cardShape === 'blob'
  const tint = (alpha: number) => hexToRgba(color, alpha) ?? color
  const ink = hexToRgba(tokens.black, 0.14) ?? 'rgba(0,0,0,0.14)'

  // Rings sit outside the portrait edge; the reticle brackets hug it a little
  // tighter because a square frame reads as further away at the same radius.
  const ringInner = R + 12
  const ringOuter = R + 30
  const frame = R + 13
  const frameArm = 15

  return (
    <View style={{ width: STAGE_W, height: STAGE_H, alignSelf: 'center' }}>
      {lit ? (
        <Svg
          pointerEvents="none"
          width={STAGE_W}
          height={SPILL_H}
          style={{ position: 'absolute', top: -SPILL_PAD, left: 0 }}
        >
          <Defs>
            <RadialGradient id="ps-spill" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <Stop offset="45%" stopColor={color} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle
            cx={CX}
            cy={CY + SPILL_PAD}
            r={SPILL_R}
            fill="url(#ps-spill)"
          />
        </Svg>
      ) : null}

      <Svg
        pointerEvents="none"
        width={STAGE_W}
        height={STAGE_H}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Defs>
          <RadialGradient id="ps-pool" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <Stop offset="55%" stopColor={color} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* The floor — a pool of the portrait's own light, dark themes only. On a
            pale background this would read as a coloured smear, and there the
            AvatarPicker's shadow already supplies the ground contact. */}
        {lit ? (
          <Ellipse cx={CX} cy={168} rx={90} ry={14} fill="url(#ps-pool)" />
        ) : null}

        {sharp ? (
          <>
            {/* HUD reticle — an engraved square frame plus four corner brackets
                in the singer colour. */}
            <Path
              d={rectPath(CX, CY, frame + 14)}
              stroke={lit ? tint(0.14) : ink}
              strokeWidth={1}
              fill="none"
            />
            {cornerBrackets(CX, CY, frame, frameArm).map((d, i) => (
              <Path
                key={i}
                d={d}
                stroke={color}
                strokeWidth={2}
                strokeOpacity={lit ? 0.9 : 0.75}
                fill="none"
              />
            ))}
          </>
        ) : (
          <>
            <Circle
              cx={CX}
              cy={CY}
              r={ringInner}
              stroke={color}
              strokeWidth={sketched ? 1.6 : 1.5}
              strokeOpacity={lit ? 0.38 : 0.5}
              strokeDasharray={sketched ? '7,5' : undefined}
              fill="none"
            />
            <Circle
              cx={CX}
              cy={CY}
              r={ringOuter}
              stroke={color}
              strokeWidth={1}
              strokeOpacity={lit ? 0.16 : 0.24}
              strokeDasharray={sketched ? '4,7' : undefined}
              fill="none"
            />
          </>
        )}
      </Svg>

      <View style={{ marginTop: CY - R, alignItems: 'center' }}>
        <AvatarPicker
          picture={picture}
          initial={initial}
          ringColor={color}
          onChange={onChange}
          size={AVATAR}
        />
      </View>
    </View>
  )
}

// A square centred on (cx, cy) with the given half-extent, as path data.
function rectPath(cx: number, cy: number, half: number): string {
  const l = cx - half
  const r = cx + half
  const t = cy - half
  const b = cy + half
  return `M ${l} ${t} L ${r} ${t} L ${r} ${b} L ${l} ${b} Z`
}

// Four L-shaped ticks at the corners of that square — the reticle itself.
function cornerBrackets(
  cx: number,
  cy: number,
  half: number,
  arm: number,
): string[] {
  const l = cx - half
  const r = cx + half
  const t = cy - half
  const b = cy + half
  return [
    `M ${l} ${t + arm} L ${l} ${t} L ${l + arm} ${t}`,
    `M ${r - arm} ${t} L ${r} ${t} L ${r} ${t + arm}`,
    `M ${r} ${b - arm} L ${r} ${b} L ${r - arm} ${b}`,
    `M ${l + arm} ${b} L ${l} ${b} L ${l} ${b - arm}`,
  ]
}
