import React from 'react'
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
  Line,
} from 'react-native-svg'

// Retrowave primitives — small reusable pieces every atom can layer in.
// These don't read the theme tokens (they hardcode the canonical retrowave
// palette) so they can be dropped into arbitrary chrome compositions.

// ── SlattedSun ──────────────────────────────────────────────────────────────
// The canonical retrowave sun: a circular disc with a vertical
// yellow→orange→pink→purple gradient. The BOTTOM HALF is bisected by five
// horizontal cut-bands ("slats") that get DRAMATICALLY thicker the further
// down they sit — the lowest slat is the chunkiest (the widening lines
// effect that says "synthwave"). Slats are filled with the sky color so
// they read as the disc being "venetian-blinded" away. The top half stays
// a smooth gradient with a single curved highlight stripe.
//
// `slatColor` overrides the cutout color — atoms that draw the sun on a
// non-sky background (like a card body) need to pass their own bg here so
// the cuts knock through correctly.
export function SlattedSun({
  size,
  haloOpacity = 0.65,
  slatColor = '#0A0420',
  showHighlight = true,
}: {
  size: number
  haloOpacity?: number
  slatColor?: string
  /** If false, omits the curved white "glare" stripe near the top of the
   *  disc. The play button passes false because the highlight visually
   *  collides with the centered play triangle. */
  showHighlight?: boolean
}) {
  // Slat layout — measured in the 0-100 viewBox.
  // The widening progression is the heart of the look: each slat is roughly
  // 1.55× as tall as the one above it, all clustered in the lower 45% of
  // the disc with the chunkiest sitting on the disc's bottom edge.
  //
  //   y=55%  ▔▔ (thinnest — 1.2px in viewBox units)
  //   y=63%  ▔▔  1.8px
  //   y=72%  ▔▔▔  2.6px
  //   y=81%  ▔▔▔▔  4.0px
  //   y=91%  ▔▔▔▔▔▔  6.2px  (chunkiest, brushes the disc's bottom edge)
  const slats = [
    { y: 55, h: 1.2 },
    { y: 63, h: 1.8 },
    { y: 72, h: 2.6 },
    { y: 81, h: 4.0 },
    { y: 91, h: 6.2 },
  ]
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgLinearGradient id="rwSunBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFE45A" stopOpacity={1} />
          <Stop offset="35%" stopColor="#FF7A3B" stopOpacity={1} />
          <Stop offset="65%" stopColor="#FF2D95" stopOpacity={1} />
          <Stop offset="100%" stopColor="#B967FF" stopOpacity={1} />
        </SvgLinearGradient>
        {/* Clip path matching the sun's disc — every slat rectangle is
            constrained to live INSIDE this circle, so the cuts never poke
            out past the disc's edge. This was the main "geometry off" bug:
            the slat rects were full viewBox-width and extended into the
            backdrop instead of stopping at the rim. */}
        <ClipPath id="rwSunDisc">
          <Circle cx={50} cy={50} r={49} />
        </ClipPath>
      </Defs>
      {/* Sun body */}
      <Circle cx={50} cy={50} r={49} fill="url(#rwSunBody)" />
      {/* Slat cuts — clipped to the disc */}
      <G clipPath="url(#rwSunDisc)">
        {slats.map((s, i) => (
          <Rect
            key={i}
            x={0}
            y={s.y}
            width={100}
            height={s.h}
            fill={slatColor}
          />
        ))}
      </G>
      {/* Curved highlight stripe near the top */}
      {showHighlight ? (
        <Path
          d="M 28 30 Q 50 22 72 30"
          stroke="#FFFFFF"
          strokeWidth={0.7}
          fill="none"
          opacity={0.65}
        />
      ) : null}
    </Svg>
  )
}

// ── PerspectiveGrid ─────────────────────────────────────────────────────────
// The iconic retrowave wireframe floor: horizontal lines stacked from the
// horizon down toward the viewer (denser at top, sparser at bottom — pure
// 1-point perspective) + vertical lines fanning out from a vanishing point
// on the horizon. Renders inside a configurable rect at fixed proportions.
// Caller provides scroll offset (0–1) to make the grid creep forward.
export function PerspectiveGrid({
  width,
  height,
  scroll = 0,
  primaryColor = '#FF2D95',
  secondaryColor = '#00F0FF',
  opacity = 0.85,
}: {
  width: number
  height: number
  scroll?: number
  primaryColor?: string
  secondaryColor?: string
  opacity?: number
}) {
  const horizonY = 0
  // 12 horizontal "scanline" rows, easing-positioned so the bottom rows
  // are far apart and the top rows are packed tight.
  const rows = 12
  const horizontals = Array.from({ length: rows }, (_, i) => {
    const t = (i + scroll) / rows
    const cubed = t * t * t
    return cubed * height
  })
  // 11 vertical "fanout" lines from the vanishing point. They land at evenly
  // spaced X positions along the bottom edge.
  const verts = 11
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} opacity={opacity}>
      <Defs>
        <SvgLinearGradient id="rwGridFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={primaryColor} stopOpacity={0} />
          <Stop offset="20%" stopColor={secondaryColor} stopOpacity={0.55} />
          <Stop offset="100%" stopColor={primaryColor} stopOpacity={1} />
        </SvgLinearGradient>
      </Defs>
      {/* Vertical fanout lines */}
      {Array.from({ length: verts }).map((_, i) => {
        const x = (i / (verts - 1)) * width
        const vanishX = width / 2
        return (
          <Line
            key={`v-${i}`}
            x1={vanishX}
            y1={horizonY}
            x2={x}
            y2={height}
            stroke="url(#rwGridFade)"
            strokeWidth={1}
          />
        )
      })}
      {/* Horizontal rows */}
      {horizontals.map((y, i) => {
        if (y < 0 || y > height) return null
        const alpha = 0.3 + (y / height) * 0.6
        return (
          <Line
            key={`h-${i}`}
            x1={0}
            y1={y}
            x2={width}
            y2={y}
            stroke={i % 2 === 0 ? primaryColor : secondaryColor}
            strokeWidth={1}
            opacity={alpha}
          />
        )
      })}
    </Svg>
  )
}

// ── ScanlineOverlay ─────────────────────────────────────────────────────────
// Faint horizontal pixel-row pattern that gives any plate the CRT phosphor
// feel. Uses a tiled SVG via repeating stripes — caller provides the box
// size. Opacity is intentionally low so it never competes with content.
export function ScanlineOverlay({
  rowGap = 3,
  opacity = 0.18,
  color = '#000000',
  style,
}: {
  rowGap?: number
  opacity?: number
  color?: string
  style?: ViewStyle
}) {
  // Render as a vertical stack of 1px-thin dark rows over a transparent bg.
  // Native View math is cheaper than redrawing an SVG full of <Line>s.
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { opacity, overflow: 'hidden' },
        style,
      ]}
    >
      {Array.from({ length: 200 }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: i * rowGap,
            height: 1,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  )
}

// ── NeonText ────────────────────────────────────────────────────────────────
// Text with a chromatic-aberration fringe — a cyan ghost offset down-left and
// a magenta ghost offset up-right, both at lower opacity, behind a crisp
// white foreground. The illusion only works on a dark backdrop, but the whole
// theme renders dark so that's fine.
export function NeonText({
  children,
  style,
  fringe = 1.4,
  pinkColor = '#FF2D95',
  cyanColor = '#00F0FF',
  centerColor = '#FFFFFF',
}: {
  children: React.ReactNode
  style?: TextStyle
  fringe?: number
  pinkColor?: string
  cyanColor?: string
  centerColor?: string
}) {
  return (
    <View>
      {/* Cyan ghost — down-left */}
      <Text
        style={[
          style,
          {
            position: 'absolute',
            color: cyanColor,
            opacity: 0.85,
            transform: [{ translateX: -fringe }, { translateY: fringe }],
          },
        ]}
      >
        {children}
      </Text>
      {/* Magenta ghost — up-right */}
      <Text
        style={[
          style,
          {
            position: 'absolute',
            color: pinkColor,
            opacity: 0.85,
            transform: [{ translateX: fringe }, { translateY: -fringe }],
          },
        ]}
      >
        {children}
      </Text>
      {/* Crisp foreground */}
      <Text
        style={[
          style,
          {
            color: centerColor,
            textShadowColor: 'rgba(255,45,149,0.8)',
            textShadowRadius: 8,
            textShadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        {children}
      </Text>
    </View>
  )
}

// ── ChromeBevel ─────────────────────────────────────────────────────────────
// A horizontal chrome plate strip — gradient from a top highlight band down
// to a darker bottom band, with a thin center brushed-metal line. Sits as a
// background fill on the active GenreTab / TabBar pill so neon outlines pop
// against polished metal.
export function ChromeBevel({
  style,
  variant = 'silver',
}: {
  style?: ViewStyle
  variant?: 'silver' | 'gold' | 'pink' | 'cyan'
}) {
  const colors = (() => {
    if (variant === 'gold') return ['#FFE45A', '#FF9F3B', '#7A3C0A']
    if (variant === 'pink') return ['#FFB5DE', '#FF2D95', '#5A0838']
    if (variant === 'cyan') return ['#B5F5FF', '#00F0FF', '#003844']
    return ['#F5F5FF', '#A8A8C8', '#36365A']
  })()
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <SvgLinearGradient id={`chrome-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors[0]} stopOpacity={1} />
            <Stop offset="45%" stopColor={colors[1]} stopOpacity={1} />
            <Stop offset="55%" stopColor={colors[1]} stopOpacity={1} />
            <Stop offset="100%" stopColor={colors[2]} stopOpacity={1} />
          </SvgLinearGradient>
        </Defs>
        <Rect width={100} height={100} fill={`url(#chrome-${variant})`} />
        {/* Brushed-metal center line */}
        <Rect x={0} y={49.5} width={100} height={1} fill="#FFFFFF" opacity={0.65} />
        <Rect x={0} y={50.5} width={100} height={0.5} fill="#000000" opacity={0.3} />
      </Svg>
    </View>
  )
}

// ── Triangle silhouette ─────────────────────────────────────────────────────
// A pyramid mountain — used in backdrops to give the horizon a mountain
// silhouette. Solid dark fill on top of the sky gradient.
export function MountainSilhouette({
  width,
  height,
  fill = '#1A0A3A',
}: {
  width: number
  height: number
  fill?: string
}) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={`M 0 ${height} L ${width * 0.18} ${height * 0.55} L ${width * 0.32} ${height * 0.78} L ${width * 0.5} ${height * 0.35} L ${width * 0.68} ${height * 0.7} L ${width * 0.82} ${height * 0.5} L ${width} ${height} Z`}
        fill={fill}
      />
    </Svg>
  )
}
