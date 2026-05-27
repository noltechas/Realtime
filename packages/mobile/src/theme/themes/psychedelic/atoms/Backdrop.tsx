import React from 'react'
import { View, Animated, StyleSheet, Dimensions } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import { useOscillator } from '../_shared'

// Psychedelic Backdrop — soft, glowing, lava-lamp-style colored blobs.
//
// Implementation per the research:
// SVG `<Filter>` metaballs (feGaussianBlur + feColorMatrix) are too fragile
// across Android/iOS in react-native-svg 15.x and force JS-bridge animation
// on SVG attribute props. The proven cross-platform approach is plain RN
// `<View>`s with `borderRadius: 9999` plus native-driver transforms — every
// animated prop runs on the UI thread (60fps).
//
// Each blob is:
//   • a circular View tinted with one psychedelic accent color
//   • alpha-blended (low opacity) so overlapping blobs merge into a smooth
//     glow without needing a blur filter — the merge happens via standard
//     alpha compositing, which the GPU does for free
//   • driven by *only* native-driver transforms: scale (continuous breathing,
//     out-of-sync per blob) and translateX (small horizontal drift)
//
// NO translateY anywhere — per request, foreground elements grow/shrink only.
// The backdrop matches that rule (X-drift + scale, no Y motion).

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

interface BlobSpec {
  id: string
  color: string
  cx: number // 0..1 fraction of screen width — center X
  cy: number // 0..1 fraction of screen height — center Y
  radius: number // px
  opacity: number
  scalePeriod: number // ms for one breath cycle
  scaleMin: number
  scaleMax: number
  driftPeriod: number // ms for one full back-and-forth
  driftAmp: number // px horizontal travel each way
}

// 7 blobs covering the screen — overlapping radii so adjacent blobs always
// have alpha bleed into each other (no visible boundary). Periods all prime-
// ish and spread wide so nothing pulses in lockstep.
const BLOBS: BlobSpec[] = [
  { id: 'pink-top',   color: '#ff2d95', cx: 0.20, cy: 0.12, radius: 240, opacity: 0.55, scalePeriod: 8400,  scaleMin: 0.80, scaleMax: 1.18, driftPeriod: 11300, driftAmp: 55 },
  { id: 'tangerine',  color: '#ff8c2d', cx: 0.78, cy: 0.24, radius: 220, opacity: 0.50, scalePeriod: 7100,  scaleMin: 0.78, scaleMax: 1.24, driftPeriod: 13700, driftAmp: 65 },
  { id: 'lime-mid',   color: '#b6ff2d', cx: 0.42, cy: 0.42, radius: 260, opacity: 0.42, scalePeriod: 9500,  scaleMin: 0.82, scaleMax: 1.20, driftPeriod: 10100, driftAmp: 50 },
  { id: 'cyan',       color: '#2dd9ff', cx: 0.08, cy: 0.58, radius: 200, opacity: 0.40, scalePeriod: 11700, scaleMin: 0.88, scaleMax: 1.16, driftPeriod: 12700, driftAmp: 60 },
  { id: 'violet',     color: '#952dff', cx: 0.88, cy: 0.66, radius: 250, opacity: 0.50, scalePeriod: 6800,  scaleMin: 0.85, scaleMax: 1.22, driftPeriod: 11900, driftAmp: 45 },
  { id: 'magenta-br', color: '#ff2dff', cx: 0.50, cy: 0.82, radius: 230, opacity: 0.42, scalePeriod: 10300, scaleMin: 0.80, scaleMax: 1.18, driftPeriod: 9700,  driftAmp: 60 },
  { id: 'yellow-bot', color: '#ffd84d', cx: 0.18, cy: 0.95, radius: 200, opacity: 0.35, scalePeriod: 8900,  scaleMin: 0.85, scaleMax: 1.15, driftPeriod: 12100, driftAmp: 50 },
]

function GlowBlob({ spec }: { spec: BlobSpec }) {
  const scale = useOscillator(spec.scalePeriod)
  const drift = useOscillator(spec.driftPeriod)
  const scaleVal = scale.interpolate({
    inputRange: [0, 1],
    outputRange: [spec.scaleMin, spec.scaleMax],
  })
  const xVal = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-spec.driftAmp, spec.driftAmp],
  })
  const size = spec.radius * 2
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        left: spec.cx * SCREEN_W - spec.radius,
        top: spec.cy * SCREEN_H - spec.radius,
        borderRadius: spec.radius,
        backgroundColor: spec.color,
        opacity: spec.opacity,
        transform: [{ translateX: xVal }, { scale: scaleVal }],
      }}
    />
  )
}

export function Backdrop(): React.ReactElement {
  const { tokens } = useTheme()
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: tokens.appBg, overflow: 'hidden' },
      ]}
    >
      {BLOBS.map((spec) => (
        <GlowBlob key={spec.id} spec={spec} />
      ))}
    </View>
  )
}
