import React from 'react'
import Svg, { Path, G, Ellipse, Circle } from 'react-native-svg'
import type { StageTabIconProps } from '../../../types'

// Zen stage tab icon. When the local guest is on stage, draws a sumi-ink
// brush-painted microphone — a single tapered stroke for the mic body, a
// short brush flick for the cord, and a sakura petal where the mic capsule
// would catch the light. When not on stage, the reaction screen icon is a
// hand-painted enso (incomplete brush circle) with a tiny stamen.
export function StageTabIcon({ color, size = 22, isUp }: StageTabIconProps) {
  if (isUp) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {/* Mic body — single fat brushstroke */}
        <Path
          d="M 12 3 Q 9 3 9 7 L 9 12 Q 9 16 12 16 Q 15 16 15 12 L 15 7 Q 15 3 12 3 Z"
          fill={color}
          stroke="#1a1814"
          strokeWidth={0.8}
        />
        {/* Stand */}
        <Path
          d="M 6 11 Q 6 18 12 19 Q 18 18 18 11"
          stroke={color}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
        />
        {/* Mic post */}
        <Path
          d="M 12 19 L 12 22 M 8 22 L 16 22"
          stroke={color}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
        />
        {/* Sakura petal accent on the capsule */}
        <G transform="translate(12 7)">
          <Ellipse cx={0} cy={0} rx={1.4} ry={2} fill="#F4B6C2" opacity={0.8} />
        </G>
      </Svg>
    )
  }
  // Off-stage: enso with a stamen — a meditative observer glyph
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 18 5 A 9 9 0 1 0 20 8"
        stroke={color}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx={12} cy={12} r={1.5} fill={color} />
    </Svg>
  )
}
