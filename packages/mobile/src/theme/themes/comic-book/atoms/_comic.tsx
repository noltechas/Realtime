import React, { useRef } from 'react'
import { View, Text, type ViewStyle, type TextStyle } from 'react-native'
import Svg, { Polygon, Rect, Circle, Defs, Pattern, ClipPath } from 'react-native-svg'

// ── Comic-Book shared visual vocabulary ─────────────────────────────────────
// The building blocks every comic atom composes from: ink palette, hard "ink"
// offset shadows, Ben-Day halftone fills (cheap SVG pattern), and starburst /
// BOOM polygons. Keeping them here means the whole theme shares one consistent
// pop-art language instead of each atom re-inventing it.

export const INK = '#16161D'
export const PAGE = '#FFF7E6' // newsprint paper
export const PANEL = '#FFFFFF'
export const RED = '#FF1F4B'
export const YELLOW = '#FFD400'
export const BLUE = '#2FA8FF'

// Hard ink offset shadow — the printed-panel signature (no blur, full opacity,
// always inked black). `n` is the offset/elevation in px.
export function inkShadow(n = 4): ViewStyle {
  return {
    shadowColor: INK,
    shadowOffset: { width: n, height: n },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: n,
  }
}

// Slam-flush press — the panel slides into its own shadow.
export function slam(n = 3): ViewStyle {
  return { transform: [{ translateX: n }, { translateY: n }], shadowOpacity: 0, elevation: 0 }
}

// Build an N-spike star/burst polygon inside a 100×80 viewBox. `jitter` lets a
// burst's outer points vary length for the ragged BOOM look.
export function spikePoints(
  count: number,
  oRx: number,
  oRy: number,
  iRx: number,
  iRy: number,
  rotDeg = -90,
  jitter: number[] = [],
): string {
  const cx = 50
  const cy = 40
  const rot = (rotDeg * Math.PI) / 180
  const pts: string[] = []
  for (let i = 0; i < count * 2; i++) {
    const ang = rot + (Math.PI * i) / count
    const outer = i % 2 === 0
    const j = outer && jitter.length ? jitter[i % jitter.length] : 1
    const rx = (outer ? oRx : iRx) * j
    const ry = (outer ? oRy : iRy) * j
    pts.push(`${(cx + Math.cos(ang) * rx).toFixed(1)},${(cy + Math.sin(ang) * ry).toFixed(1)}`)
  }
  return pts.join(' ')
}

const BURST_POINTS: Record<string, string> = {
  burst: spikePoints(12, 48, 39, 27, 22),
  star: spikePoints(5, 47, 39, 19, 16),
  boom: spikePoints(10, 49, 40, 23, 18, -90, [1, 0.74, 1.06, 0.82, 1, 0.78, 1.04, 0.8, 1, 0.76]),
}

export type BurstKind = 'burst' | 'star' | 'boom'

// A starburst/explosion polygon that stretches to fill a width×height box.
// `halftone` prints a faint Ben-Day dot field clipped to the burst shape (the
// printed-comic texture) without spilling dots outside the points.
let _burstCounter = 0
export function Burst({
  width,
  height,
  fill,
  kind = 'burst',
  points,
  stroke = INK,
  strokeWidth = 2,
  halftone = false,
}: {
  width: number | string
  height: number | string
  fill: string
  kind?: BurstKind
  points?: string
  stroke?: string
  strokeWidth?: number
  halftone?: boolean
}) {
  const pts = points ?? BURST_POINTS[kind]
  const id = useRef(`bd${++_burstCounter}`).current
  return (
    <Svg width={width} height={height} viewBox="0 0 100 80" preserveAspectRatio="none">
      {halftone ? (
        <Defs>
          <Pattern id={`p${id}`} width={7} height={7} patternUnits="userSpaceOnUse">
            <Circle cx={3.5} cy={3.5} r={1.1} fill={INK} fillOpacity={0.22} />
          </Pattern>
          <ClipPath id={`c${id}`}>
            <Polygon points={pts} />
          </ClipPath>
        </Defs>
      ) : null}
      <Polygon
        points={pts}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {halftone ? <Rect x={0} y={0} width={100} height={80} fill={`url(#p${id})`} clipPath={`url(#c${id})`} /> : null}
    </Svg>
  )
}

// A square starburst badge with content (a number / glyph) centered on top.
export function BurstBadge({
  size,
  fill,
  kind = 'burst',
  points,
  rotate = 0,
  children,
  style,
}: {
  size: number
  fill: string
  kind?: BurstKind
  points?: string
  rotate?: number
  children?: React.ReactNode
  style?: ViewStyle
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        },
        rotate ? { transform: [{ rotate: `${rotate}deg` }] } : null,
        style,
      ]}
    >
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Burst width={size} height={size} fill={fill} kind={kind} points={points} strokeWidth={2} halftone />
      </View>
      {children}
    </View>
  )
}

// Ben-Day halftone fill — a cheap SVG dot pattern that tiles to fill its
// parent. Used inside art wells, panels and the page backdrop for the printed
// pop-art texture. Each instance gets a unique pattern id so multiple halftones
// can coexist on screen.
let _htCounter = 0
export function Halftone({
  color = INK,
  opacity = 0.12,
  dot = 2,
  gap = 7,
  style,
}: {
  color?: string
  opacity?: number
  dot?: number
  gap?: number
  style?: ViewStyle
}) {
  const id = useRef(`ht${++_htCounter}`).current
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse">
            <Circle cx={gap / 2} cy={gap / 2} r={dot / 2} fill={color} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  )
}

// Comic title-logo lettering — fat display text with a hard INK outline, the way
// a comic masthead/logo reads. React Native `textShadow` only renders ONE shadow,
// so a true outline is faked by stacking the same string in the outline color at
// the 8 compass offsets behind a solid top copy (plus an offset drop shadow on the
// top copy for the printed-logo depth). Caller passes the display `fontFamily` so
// this stays decoupled from the token bundle. Used by SongCard's cover logo; any
// atom that needs the "knocked-out logo" look can reuse it.
const OUTLINE_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

export function ComicOutlineText({
  children,
  fontFamily,
  fontSize,
  lineHeight,
  color = PANEL,
  outline = INK,
  outlineWidth = 1.6,
  letterSpacing = 0.3,
  numberOfLines,
  align = 'left',
  dropShadow = true,
  style,
}: {
  children: string
  fontFamily: string
  fontSize: number
  lineHeight?: number
  color?: string
  outline?: string
  outlineWidth?: number
  letterSpacing?: number
  numberOfLines?: number
  align?: TextStyle['textAlign']
  dropShadow?: boolean
  style?: ViewStyle
}) {
  const base: TextStyle = {
    fontFamily,
    fontSize,
    lineHeight: lineHeight ?? fontSize,
    letterSpacing,
    textAlign: align,
    textTransform: 'uppercase',
    // Match metrics across copies so the outline registers exactly behind the
    // top text on Android (no-op on iOS).
    includeFontPadding: false,
  }

  return (
    <View style={[{ width: '100%', position: 'relative' }, style]}>
      {/* Outline copies — same text, INK, nudged to the 8 compass points. */}
      {OUTLINE_OFFSETS.map(([dx, dy], i) => (
        <Text
          key={i}
          numberOfLines={numberOfLines}
          style={[
            base,
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              color: outline,
              transform: [
                { translateX: dx * outlineWidth },
                { translateY: dy * outlineWidth },
              ],
            },
          ]}
        >
          {children}
        </Text>
      ))}
      {/* Solid knocked-out top copy with an offset ink drop shadow. */}
      <Text
        numberOfLines={numberOfLines}
        style={[
          base,
          { color },
          dropShadow
            ? {
                textShadowColor: outline,
                textShadowOffset: { width: outlineWidth, height: outlineWidth },
                textShadowRadius: 0,
              }
            : null,
        ]}
      >
        {children}
      </Text>
    </View>
  )
}

// Small triangular speech-bubble tail (ink-outlined). Positioned by the caller.
export function SpeechTail({
  size = 12,
  color = PANEL,
  style,
}: {
  size?: number
  color?: string
  style?: ViewStyle
}) {
  return (
    <View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          backgroundColor: color,
          borderRightWidth: 2.5,
          borderBottomWidth: 2.5,
          borderColor: INK,
          transform: [{ rotate: '52deg' }, { skewX: '-8deg' }],
        },
        style,
      ]}
    />
  )
}
