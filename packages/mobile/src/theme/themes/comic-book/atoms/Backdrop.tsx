import React from 'react'
import { View } from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { Halftone, INK } from './_comic'

// Comic-Book backdrop — the printed comic PAGE behind all content: a Ben-Day
// halftone dot field across the whole screen (the signature pop-art newsprint
// texture) plus a faint radial speed-line burst sweeping out of the top-left,
// like the action lines behind a comic panel. Both are static, non-interactive
// and cheap (one SVG pattern + a handful of lines).

// Pre-compute speed lines radiating from a focal point near the top-left.
const FOCUS_X = 60
const FOCUS_Y = 90
const SPEED_LINES = Array.from({ length: 22 }, (_, i) => {
  const ang = (i / 22) * Math.PI * 2
  const len = 1600
  return { x2: FOCUS_X + Math.cos(ang) * len, y2: FOCUS_Y + Math.sin(ang) * len }
})

export function Backdrop() {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
    >
      {/* Faint action speed-lines bursting from the upper-left */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.05 }}>
        <Svg width="100%" height="100%">
          {SPEED_LINES.map((l, i) => (
            <Line
              key={i}
              x1={FOCUS_X}
              y1={FOCUS_Y}
              x2={l.x2}
              y2={l.y2}
              stroke={INK}
              strokeWidth={i % 2 === 0 ? 9 : 4}
            />
          ))}
        </Svg>
      </View>
      {/* Ben-Day halftone newsprint texture over the whole page */}
      <Halftone color={INK} opacity={0.09} dot={2.6} gap={9} />
    </View>
  )
}
