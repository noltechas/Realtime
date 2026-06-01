import React, { useMemo } from 'react'
import { View, Pressable, type ViewStyle } from 'react-native'
import Svg, { Path, Rect, G, Line } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { hexToRgba, hashKey } from '../../../helpers'
import type { PlayButtonProps } from '../../../types'

const SIZE = 128
const CX = SIZE / 2
const CY = SIZE / 2
const R = 52

// Sketch play button — a play/pause control that actually looks DRAWN. Instead
// of a solid singer-color disc, it's a graphite circle gone over twice with a
// hand-wobbled stroke (the classic "sketched circle" overshoot), filled with
// paper white (or a highlighter-yellow wash while playing), with a little
// cross-hatch shading at the bottom. The glyph is outlined in graphite and
// washed with the singer's color like a colored-pencil fill, so identity reads
// without turning the whole thing into a flat colored blob. Tilts a touch and
// rests on a soft paper shadow; press settles it into the page.
export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const { tokens } = useTheme()
  const graphite = tokens.black
  const wash = hexToRgba(singerColor, 0.45) ?? 'rgba(0,0,0,0.15)'
  const washSoft = hexToRgba(singerColor, 0.22) ?? 'rgba(0,0,0,0.08)'
  const paper = isPlaying ? '#FEF9DA' : '#FDFBF7'

  // Two stable hand-drawn passes (seeded so the wobble doesn't change on every
  // render), the second slightly bigger/offset for the "drawn twice" look.
  const ring1 = useMemo(() => roughCircle(CX, CY, R, hashKey('sketch-play-1'), 1.07, 2.4), [])
  const ring2 = useMemo(() => roughCircle(CX + 1.2, CY - 0.8, R + 2.2, hashKey('sketch-play-2'), 1.04, 2.0), [])

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        wrapStyle,
        pressed
          ? { transform: [{ rotate: '2.5deg' }, { translateX: 3 }, { translateY: 4 }] as any, shadowOpacity: 0 }
          : null,
      ]}
    >
      <Svg width={SIZE} height={SIZE}>
        {/* paper fill (clipped roughly to the circle via a plain Circle-ish path) */}
        <Path d={ring2} fill={paper} stroke="none" />
        {/* faint inner wash so the whole key picks up a hint of singer color */}
        <Path d={ring2} fill={washSoft} stroke="none" />
        {/* cross-hatch shading in the lower-left, low opacity graphite */}
        <G opacity={0.16}>
          <Line x1={CX - 30} y1={CY + 28} x2={CX - 6} y2={CY + 40} stroke={graphite} strokeWidth={1.4} strokeLinecap="round" />
          <Line x1={CX - 34} y1={CY + 16} x2={CX + 4} y2={CY + 36} stroke={graphite} strokeWidth={1.4} strokeLinecap="round" />
          <Line x1={CX - 30} y1={CY + 4} x2={CX + 12} y2={CY + 30} stroke={graphite} strokeWidth={1.4} strokeLinecap="round" />
        </G>
        {/* the two hand-drawn ring passes */}
        <Path d={ring2} fill="none" stroke={graphite} strokeWidth={2} strokeOpacity={0.55} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={ring1} fill="none" stroke={graphite} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />

        {/* glyph: play triangle, or pause bars — graphite outline + crayon wash */}
        {isPlaying ? (
          <G>
            <Rect x={CX - 18} y={CY - 22} width={13} height={44} rx={2.5} fill={wash} stroke={graphite} strokeWidth={2.4} strokeLinejoin="round" />
            <Rect x={CX + 5} y={CY - 22} width={13} height={44} rx={2.5} fill={wash} stroke={graphite} strokeWidth={2.4} strokeLinejoin="round" />
          </G>
        ) : (
          <Path
            d={`M${CX - 14} ${CY - 22} L${CX + 24} ${CY + 1} L${CX - 14} ${CY + 24} Z`}
            fill={wash}
            stroke={graphite}
            strokeWidth={2.6}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </Svg>
    </Pressable>
  )
}

// Build a hand-drawn circle path: sample points around the circle with a small
// seeded radius wobble, going slightly past one full turn so the ends overlap
// like a pencil circle that wasn't closed cleanly. Deterministic per seed.
function roughCircle(cx: number, cy: number, r: number, seed: number, turns = 1.06, jitter = 2.2): string {
  const stepsPerTurn = 28
  const total = Math.round(stepsPerTurn * turns)
  let s = seed || 1
  const rnd = () => {
    s ^= s << 13
    s ^= s >> 17
    s ^= s << 5
    return ((s >>> 0) % 1000) / 1000
  }
  let d = ''
  for (let i = 0; i <= total; i++) {
    const a = (i / stepsPerTurn) * Math.PI * 2 - Math.PI / 2
    const rr = r + (rnd() * 2 - 1) * jitter
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr
    d += i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : ` L${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

const wrapStyle: ViewStyle = {
  width: SIZE,
  height: SIZE,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 3, height: 5 },
  shadowOpacity: 0.18,
  shadowRadius: 5,
  elevation: 5,
  transform: [{ rotate: '-2deg' }] as any,
}
