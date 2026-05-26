import React from 'react'
import { View, type ViewStyle } from 'react-native'
import Svg, { Path, G } from 'react-native-svg'

// Sketch backdrop — fakes notebook paper without overpowering the screen:
//   1. Pale horizontal ruled lines spaced ~32px.
//   2. A single vertical "margin" rule in pale red on the left edge.
//   3. Four corner doodles in SVG (treble clef, eighth note, swirl, star) in
//      soft graphite so they read as decorative scribbles rather than buttons.
// Doodles are intentionally placed where most screens have empty space; tab
// bars and modals sit on top so the doodles never collide with content.
export function Backdrop() {
  const lineColor = 'rgba(45,45,45,0.07)'
  const marginColor = 'rgba(255,77,77,0.18)'
  const inkColor = 'rgba(45,45,45,0.15)'
  return (
    <View pointerEvents="none" style={fillStyle}>
      <RuledLines color={lineColor} />
      {/* Left margin rule — like the red line on schoolbook paper */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 56,
          width: 1,
          backgroundColor: marginColor,
        }}
      />
      {/* Corner doodles */}
      <View style={{ position: 'absolute', top: 80, right: 18 }}>
        <Doodle kind="treble" color={inkColor} size={72} />
      </View>
      <View style={{ position: 'absolute', top: 280, left: 14 }}>
        <Doodle kind="note" color={inkColor} size={42} />
      </View>
      <View style={{ position: 'absolute', bottom: 220, right: 28 }}>
        <Doodle kind="swirl" color={inkColor} size={56} />
      </View>
      <View style={{ position: 'absolute', bottom: 360, left: 24 }}>
        <Doodle kind="star" color={inkColor} size={36} />
      </View>
    </View>
  )
}

const fillStyle: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflow: 'hidden',
}

function RuledLines({ color }: { color: string }) {
  const spacing = 32
  const count = 40
  const lines: React.ReactElement[] = []
  for (let i = 0; i < count; i++) {
    lines.push(
      <View
        key={`l-${i}`}
        style={{
          position: 'absolute',
          top: i * spacing,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: color,
        }}
      />,
    )
  }
  return <View pointerEvents="none" style={fillStyle}>{lines}</View>
}

// Decorative SVG doodles — drawn as if with a single marker stroke. ViewBox
// is 100×100 so the SVG primitives share one coordinate space.
function Doodle({
  kind,
  color,
  size,
}: {
  kind: 'treble' | 'note' | 'swirl' | 'star'
  color: string
  size: number
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {kind === 'treble' ? (
        <Path
          d="M 50 8 C 36 18 36 36 50 46 C 64 56 64 72 50 80 C 36 88 30 72 42 64 C 56 56 70 40 56 24 C 48 14 60 12 64 22"
          stroke={color}
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
        />
      ) : kind === 'note' ? (
        <G>
          <Path
            d="M 18 78 Q 18 88 30 86 Q 42 84 42 74 Q 42 66 30 68 Q 18 70 18 78 Z"
            fill={color}
          />
          <Path
            d="M 42 74 L 42 18"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Path
            d="M 42 18 Q 62 26 58 42"
            stroke={color}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
        </G>
      ) : kind === 'swirl' ? (
        <Path
          d="M 14 50 C 14 30 30 14 50 14 C 70 14 86 30 86 50 C 86 64 72 78 58 78 C 48 78 38 70 38 60 C 38 54 46 48 52 52 C 56 54 56 60 52 62"
          stroke={color}
          strokeWidth={2.4}
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <Path
          d="M 50 10 L 60 38 L 90 40 L 66 58 L 76 88 L 50 70 L 24 88 L 34 58 L 10 40 L 40 38 Z"
          stroke={color}
          strokeWidth={2.4}
          fill="none"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  )
}
