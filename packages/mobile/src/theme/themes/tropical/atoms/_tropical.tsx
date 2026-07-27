import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
  LinearGradient as SvgGradient,
} from 'react-native-svg'
import { hashKey } from '../../../helpers'

// ═══════════════════════════════════════════════════════════════════════════
//  TROPICAL — the tiki-workshop vocabulary
// ═══════════════════════════════════════════════════════════════════════════
// Every tropical atom is built from the pieces in this file, and the theme has
// one construction story: EVERYTHING IS A HANDMADE OBJECT. Signs are cut from
// real timber (procedural grain, routed grooves, beveled edges, warm varnish),
// they hang from ropes and actually swing, paint sits ON the wood (you can see
// grain through it), blooms and beads are dimensionally lit like the BOTC
// medallions (radial body + specular + rim light + contact shadow), and the
// island behind it all is a drawn scene — lush fronds, a hazy sun, living
// water — never a photo and never flat clip-art.
//
// House rules the atoms follow:
//   1. Wood carries structure, color carries meaning: lagoon = interactive,
//      sunset/guava = hot state, sunshine = rank/score. Cream paint is the
//      default "ink" on timber.
//   2. Content type is Quicksand; Florida Vibes signs the big painted moments;
//      The Last Trunks stamps short carved labels (it has NO ’ · … – — glyphs,
//      so it never touches user-authored text).
//   3. Objects are lit from the upper-left, always: gradient forms + a
//      specular + a contact shadow. No flat fills on anything meant to feel
//      physical.
//   4. Touch = spring. Hanging things swing; standing things sink.

// ── Palette ────────────────────────────────────────────────────────────────
export const INK = '#123A33' // deep palm — ink on sand/paper
export const INK_SOFT = '#2F6B5E'
export const MUTE = '#5E7D72'
export const FAINT = '#9DB5AB'

export const SAND = '#FFF6E3' // warm page base
export const SAND_DEEP = '#F6E4C4'
export const PAPER = '#FFF9EC' // polaroid / matte paper
export const CREAM = '#FFF2D2' // painted-cream lettering on wood

export const LAGOON = '#10B7B0'
export const LAGOON_DEEP = '#067F80'
export const AQUA = '#6FE0D8'
export const SKYBLUE = '#4FB8E8'
export const SEAFOAM = '#DFF7F0'

export const SUN = '#FFC53D'
export const MANGO = '#FF9838'
export const CORAL = '#FF6B4A'
export const GUAVA = '#F73D7C'
export const PALM = '#2FA96A'
export const PALM_DEEP = '#12704A'

// Timber tones
export const TEAK_LIT = '#C08A4A'
export const TEAK = '#9A6432'
export const TEAK_DK = '#74461C'
export const WALNUT_LIT = '#8A5A2E'
export const WALNUT = '#6B4020'
export const WALNUT_DK = '#4C2A12'
export const TIMBER_EDGE = 'rgba(43,22,6,0.55)' // cut-edge outline
export const GRAIN = '#3A200A' // grain stroke base
export const ROPE = '#D8B270'
export const ROPE_DK = '#8F6A32'

// Spot colors for per-item variety — every one takes cream paint on top.
export const ISLAND_SPOTS: readonly string[] = [LAGOON, CORAL, GUAVA, PALM, SKYBLUE, MANGO]

// ── Color math ─────────────────────────────────────────────────────────────

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return null
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Mix toward black by `amount` (0–1). */
export function shade(hex: string, amount: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  return toHex(rgb[0] * (1 - amount), rgb[1] * (1 - amount), rgb[2] * (1 - amount))
}

/** Mix toward white by `amount` (0–1). */
export function tint(hex: string, amount: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  return toHex(
    rgb[0] + (255 - rgb[0]) * amount,
    rgb[1] + (255 - rgb[1]) * amount,
    rgb[2] + (255 - rgb[2]) * amount,
  )
}

/** `hex` at `a` opacity. */
export function alpha(hex: string, a: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return `rgba(18,58,51,${a})`
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`
}

// ── Elevation ──────────────────────────────────────────────────────────────
// Warm palm-shadow, straight down. Objects rest ON the island, they don't glow.

const LIFTS = [
  { h: 1, r: 3, o: 0.14, e: 1 },
  { h: 3, r: 6, o: 0.18, e: 3 },
  { h: 6, r: 12, o: 0.22, e: 6 },
  { h: 11, r: 20, o: 0.26, e: 10 },
  { h: 16, r: 30, o: 0.3, e: 14 },
]

export function lift(level: 1 | 2 | 3 | 4 = 2): ViewStyle {
  const l = LIFTS[level]
  return {
    shadowColor: '#0E2E29',
    shadowOffset: { width: 0, height: l.h },
    shadowOpacity: l.o,
    shadowRadius: l.r,
    elevation: l.e,
  }
}

/** Warm colored halo — torch glow, active-sign glow. */
export function glow(color: string, level: 1 | 2 | 3 | 4 = 2): ViewStyle {
  const l = LIFTS[level]
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: Math.round(l.h * 0.5) },
    shadowOpacity: 0.5,
    shadowRadius: l.r + 2,
    elevation: l.e,
  }
}

// ── Type — sized against real font metrics ─────────────────────────────────
// Quicksand cap 0.70em / Florida Vibes cap 0.57em (swashes overhang sideways) /
// The Last Trunks cap 0.84em unicase with a tiny cmap. The helpers below make
// `script(20)`, `sans(20)` and `tiki(20)` all land at the same APPARENT size,
// which is the difference between "themed" and "mis-set".

export const FONT = {
  script: 'FloridaVibes',
  tiki: 'TheLastTrunks',
  bold: 'Quicksand_700Bold',
  semi: 'Quicksand_600SemiBold',
  medium: 'Quicksand_500Medium',
} as const

/** Florida Vibes, optically matched to Quicksand `size`. Safe for user text. */
export function script(size: number, color: string = INK, extra?: TextStyle): TextStyle {
  const px = Math.round(size * 1.4)
  return {
    fontFamily: FONT.script,
    fontSize: px,
    lineHeight: Math.round(px * 1.04),
    paddingHorizontal: Math.ceil(px * 0.07), // room for overhanging swashes
    color,
    includeFontPadding: false,
    ...extra,
  }
}

/**
 * Make arbitrary text safe for The Last Trunks: its cmap has no ’ ' “ ” – — … · °
 * so song titles ("Don't Stop Believin'") would render tofu. Transliterate the
 * missing glyphs instead of trusting the face.
 */
export function tikiSafe(text: string): string {
  return text
    .replace(/[’'‘]/g, '')
    .replace(/[“”"]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[·•]/g, '-')
    .replace(/°/g, '')
}

/** The Last Trunks — condensed unicase block caps. Feed user text through tikiSafe. */
export function tiki(size: number, color: string = INK, extra?: TextStyle): TextStyle {
  const px = Math.round(size * 0.86)
  return {
    fontFamily: FONT.tiki,
    fontSize: px,
    lineHeight: Math.round(px * 1.16),
    letterSpacing: Math.max(0.8, px * 0.1),
    textTransform: 'uppercase',
    color,
    includeFontPadding: false,
    ...extra,
  }
}

/** Quicksand — every piece of content type. */
export function sans(
  size: number,
  w: 'medium' | 'semi' | 'bold' = 'semi',
  color: string = INK,
  extra?: TextStyle,
): TextStyle {
  return {
    fontFamily: FONT[w],
    fontSize: size,
    lineHeight: Math.round(size * 1.32),
    color,
    includeFontPadding: false,
    ...extra,
  }
}

/** Cream lettering painted onto timber — a brushed-paint drop under each stroke. */
export const PAINTED: TextStyle = {
  color: CREAM,
  textShadowColor: 'rgba(30,14,2,0.45)',
  textShadowOffset: { width: 0, height: 1.5 },
  textShadowRadius: 1.5,
}

/** Lettering carved INTO timber — dark groove with the lit lip beneath it. */
export const CARVED: TextStyle = {
  color: '#4A2A10',
  textShadowColor: 'rgba(255,230,185,0.5)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 0.5,
}

/** White halo for ink text sitting straight on the sky. */
export const HALO: TextStyle = {
  textShadowColor: 'rgba(255,255,255,0.8)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
}

// ── Motion ─────────────────────────────────────────────────────────────────

const SPRING_IN = { useNativeDriver: true, speed: 40, bounciness: 0 } as const
const SPRING_OUT = { useNativeDriver: true, speed: 14, bounciness: 9 } as const

export function usePressScale(scaleTo = 0.965) {
  const v = useRef(new Animated.Value(0)).current
  const onPressIn = useCallback(() => {
    Animated.spring(v, { toValue: 1, ...SPRING_IN }).start()
  }, [v])
  const onPressOut = useCallback(() => {
    Animated.spring(v, { toValue: 0, ...SPRING_OUT }).start()
  }, [v])
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] })
  return { scale, onPressIn, onPressOut, progress: v }
}

/** Entrance: fade + rise + a breath of scale, settled by a spring. */
export function useEnter(delay = 0, rise = 14) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const a = Animated.spring(v, {
      toValue: 1,
      delay,
      useNativeDriver: true,
      damping: 15,
      stiffness: 150,
      mass: 0.9,
    })
    a.start()
    return () => a.stop()
  }, [v, delay])
  return {
    opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
    translateY: v.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }),
    scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }),
  }
}

/** 0→1(→0) loop for ambient life. `reverse: false` = sawtooth (drift). */
export function useLoop(duration: number, delay = 0, reverse = true): Animated.Value {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const leg = (toValue: number) =>
      Animated.timing(v, {
        toValue,
        duration,
        easing: reverse ? Easing.inOut(Easing.sin) : Easing.linear,
        useNativeDriver: true,
      })
    const loop = reverse
      ? Animated.loop(Animated.sequence([leg(1), leg(0)]))
      : Animated.loop(leg(1))
    const t = setTimeout(() => loop.start(), delay)
    return () => {
      clearTimeout(t)
      loop.stop()
      if (!reverse) v.setValue(0)
    }
  }, [v, duration, delay, reverse])
  return v
}

/**
 * A hanging object's swing: a damped pendulum you can kick. Returns the rotate
 * transform (pivoted at the hang point via the translate sandwich) plus `kick`.
 * Also breathes a tiny idle sway so signs never hang dead still.
 */
export function useSwing(pivotOffset: number, idleAmplitudeDeg = 1.1, phase = 0) {
  const kickV = useRef(new Animated.Value(0)).current
  const idle = useLoop(3400 + phase * 260, phase * 300)

  const kick = useCallback(
    (strength = 1) => {
      kickV.setValue(strength)
      Animated.spring(kickV, {
        toValue: 0,
        useNativeDriver: true,
        friction: 3.2,
        tension: 52,
      }).start()
    },
    [kickV],
  )

  const kickRot = kickV.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-10deg', '0deg', '11deg'] })
  const idleRot = idle.interpolate({
    inputRange: [0, 1],
    outputRange: [`-${idleAmplitudeDeg}deg`, `${idleAmplitudeDeg}deg`],
  })

  const transform = [
    { translateY: -pivotOffset },
    { rotate: kickRot },
    { rotate: idleRot },
    { translateY: pivotOffset },
  ]
  return { transform, kick }
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export interface PressProps {
  onPress?: () => void
  onLongPress?: () => void
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  scaleTo?: number
  hitSlop?: number
  accessibilityLabel?: string
  children?: React.ReactNode | ((progress: Animated.Value) => React.ReactNode)
}

/** The theme's one touch primitive — everything responds with the same spring. */
export function Press({
  onPress,
  onLongPress,
  disabled,
  style,
  scaleTo = 0.965,
  hitSlop,
  accessibilityLabel,
  children,
}: PressProps) {
  const { scale, onPressIn, onPressOut, progress } = usePressScale(scaleTo)
  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      style={[style, { transform: [{ scale }] }]}
    >
      {typeof children === 'function' ? children(progress) : children}
    </AnimatedPressable>
  )
}

// ── Measurement ────────────────────────────────────────────────────────────

export function useSize(): [{ w: number; h: number } | null, (e: LayoutChangeEvent) => void] {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((prev) =>
      prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1
        ? prev
        : { w: Math.round(width), h: Math.round(height) },
    )
  }, [])
  return [size, onLayout]
}

let _uid = 0
export function useUid(prefix: string): string {
  return useRef(`${prefix}${++_uid}`).current
}

// ── TIMBER — the theme's structural material ───────────────────────────────
// A real plank, not a brown rectangle: varnished color ramp, procedurally
// seeded wavy grain (so no two planks repeat), an occasional knot, a lit top
// bevel + shaded bottom bevel, a cut-edge outline, and an optional routed
// groove border (the carved inset line every good sign shop routs near the
// edge). Painted planks show the grain through the paint.

export type TimberRamp = readonly [string, string, string]
export const RAMP_TEAK: TimberRamp = [TEAK_LIT, TEAK, TEAK_DK]
export const RAMP_WALNUT: TimberRamp = [WALNUT_LIT, WALNUT, WALNUT_DK]

function grainPaths(w: number, h: number, seed: number): Array<{ d: string; o: number; sw: number }> {
  const rows = Math.max(2, Math.round(h / 9))
  const out: Array<{ d: string; o: number; sw: number }> = []
  for (let i = 0; i < rows; i++) {
    const r1 = ((hashKey(`${seed}g${i}`) % 1000) / 1000) * 2 - 1
    const r2 = ((hashKey(`${seed}h${i}`) % 1000) / 1000) * 2 - 1
    const y = ((i + 0.55) / rows) * h
    const a = 1.4 + Math.abs(r1) * 2.6
    const d =
      `M0 ${(y + r2 * 2).toFixed(1)}` +
      ` C ${(w * 0.22).toFixed(0)} ${(y - a).toFixed(1)}, ${(w * 0.4).toFixed(0)} ${(y + a).toFixed(1)}, ${(w * 0.58).toFixed(0)} ${(y + r1 * a).toFixed(1)}` +
      ` S ${(w * 0.86).toFixed(0)} ${(y - r2 * a).toFixed(1)}, ${w} ${(y + r1 * 2).toFixed(1)}`
    out.push({ d, o: 0.06 + (hashKey(`${seed}o${i}`) % 4) * 0.022, sw: 0.8 + Math.abs(r2) * 0.7 })
  }
  return out
}

export function TimberDetail({
  w,
  h,
  radius,
  seed = 1,
  painted = false,
  groove = false,
  knot = true,
}: {
  w: number
  h: number
  radius: number
  seed?: number
  painted?: boolean
  groove?: boolean
  knot?: boolean
}) {
  const grain = useMemo(() => grainPaths(w, h, seed), [w, h, seed])
  const grainColor = painted ? 'rgba(20,10,2,1)' : GRAIN
  const grainScale = painted ? 0.75 : 1
  const kx = w * (0.22 + ((hashKey(`${seed}kx`) % 100) / 100) * 0.56)
  const ky = h * (0.3 + ((hashKey(`${seed}ky`) % 100) / 100) * 0.4)
  const showKnot = knot && w > 88 && h > 34

  return (
    <Svg pointerEvents="none" width={w} height={h} style={StyleSheet.absoluteFill}>
      {/* grain */}
      {grain.map((g, i) => (
        <Path key={i} d={g.d} stroke={grainColor} strokeWidth={g.sw} opacity={g.o * grainScale} fill="none" />
      ))}
      {/* one knot, seeded off-center */}
      {showKnot ? (
        <G opacity={painted ? 0.14 : 0.3}>
          <Ellipse cx={kx} cy={ky} rx={5.5} ry={3.4} stroke={GRAIN} strokeWidth={1.1} fill="none" />
          <Ellipse cx={kx} cy={ky} rx={2.4} ry={1.4} fill={GRAIN} opacity={0.7} />
          <Path
            d={`M${kx - 12} ${ky - 5.5} q 12 -4 24 0 M${kx - 12} ${ky + 5.5} q 12 4 24 0`}
            stroke={GRAIN}
            strokeWidth={0.9}
            fill="none"
            opacity={0.7}
          />
        </G>
      ) : null}
      {/* routed groove border — dark cut + lit lip below it */}
      {groove ? (
        <>
          <Rect
            x={5.5}
            y={5.5}
            width={w - 11}
            height={h - 11}
            rx={Math.max(radius - 5, 3)}
            stroke="rgba(43,22,6,0.5)"
            strokeWidth={1.8}
            fill="none"
          />
          <Rect
            x={5.5}
            y={6.8}
            width={w - 11}
            height={h - 11}
            rx={Math.max(radius - 5, 3)}
            stroke="rgba(255,228,180,0.30)"
            strokeWidth={1}
            fill="none"
          />
        </>
      ) : null}
      {/* beveled edges — light falls from the top */}
      <Path d={`M${radius * 0.7} 1.2 H${w - radius * 0.7}`} stroke="rgba(255,232,190,0.5)" strokeWidth={1.6} strokeLinecap="round" />
      <Path d={`M${radius * 0.7} ${h - 1.4} H${w - radius * 0.7}`} stroke="rgba(20,9,1,0.4)" strokeWidth={2} strokeLinecap="round" />
      <Path d={`M1.1 ${radius * 0.8} V${h - radius * 0.8}`} stroke="rgba(255,232,190,0.2)" strokeWidth={1.2} strokeLinecap="round" />
      <Path d={`M${w - 1.1} ${radius * 0.8} V${h - radius * 0.8}`} stroke="rgba(20,9,1,0.22)" strokeWidth={1.2} strokeLinecap="round" />
      {/* cut-edge outline */}
      <Rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={radius - 0.5} stroke={TIMBER_EDGE} strokeWidth={1.5} fill="none" />
    </Svg>
  )
}

export interface TimberProps {
  radius?: number
  /** Base wood. Ignored when `paint` is set. */
  ramp?: TimberRamp
  /** Paint the plank this color — grain still ghosts through. */
  paint?: string
  seed?: string | number
  groove?: boolean
  knot?: boolean
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

/**
 * A plank that sizes to whatever you put in it (or to the style you give it).
 * The gradient base paints immediately; the grain/bevel/groove detail overlays
 * as soon as one layout pass has measured the plank.
 */
export function Timber({
  radius = 16,
  ramp = RAMP_TEAK,
  paint,
  seed = 1,
  groove = false,
  knot = true,
  style,
  children,
}: TimberProps) {
  const [size, onLayout] = useSize()
  const colors: TimberRamp = paint ? [tint(paint, 0.24), paint, shade(paint, 0.26)] : ramp

  return (
    <View onLayout={onLayout} style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={[colors[0], colors[1], colors[2]]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {size ? (
        <TimberDetail
          w={size.w}
          h={size.h}
          radius={radius}
          seed={hashKey(seed)}
          painted={!!paint}
          groove={groove}
          knot={knot}
        />
      ) : null}
      {children}
    </View>
  )
}

// ── Rope ───────────────────────────────────────────────────────────────────

/** A short length of twisted rope between two points (SVG coords). */
export function RopeSeg({
  x1,
  y1,
  x2,
  y2,
  width = 3.4,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  width?: number
}) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const n = Math.max(3, Math.round(len / 4.2))
  const ticks = Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n
    const px = x1 + (x2 - x1) * t
    const py = y1 + (y2 - y1) * t
    // strand ticks run perpendicular-ish to the cord for the twisted look
    const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 58
    return { px, py, ang }
  })
  return (
    <G>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ROPE_DK} strokeWidth={width + 1.6} strokeLinecap="round" />
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ROPE} strokeWidth={width} strokeLinecap="round" />
      {ticks.map((t, i) => (
        <Line
          key={i}
          x1={t.px - 1.7}
          y1={t.py}
          x2={t.px + 1.7}
          y2={t.py}
          stroke={ROPE_DK}
          strokeWidth={1.1}
          strokeLinecap="round"
          transform={`rotate(${t.ang} ${t.px} ${t.py})`}
        />
      ))}
    </G>
  )
}

/** The knot where a cord meets the rail. */
export function RopeKnot({ cx, cy, r = 3.6 }: { cx: number; cy: number; r?: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={ROPE} stroke={ROPE_DK} strokeWidth={1.2} />
      <Path d={`M${cx - r * 0.7} ${cy} a ${r * 0.7} ${r * 0.55} 0 0 1 ${r * 1.4} 0`} stroke={ROPE_DK} strokeWidth={0.9} fill="none" />
    </G>
  )
}

// ── Bamboo rail — the tab bar's spine ──────────────────────────────────────
// A full-width cane rendered as a real cylinder: vertical shading, a running
// sheen, and raised node collars (dark seam + lit ridge) every hand-span.

export function BambooRail({ height = 21 }: { height?: number }) {
  const [size, onLayout] = useSize()
  return (
    <View onLayout={onLayout} style={{ height }}>
      <LinearGradient
        colors={['#EFD9A2', '#CDA85A', '#8F6A32']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {size ? (
        <Svg pointerEvents="none" width={size.w} height={height} style={StyleSheet.absoluteFill}>
          {/* running sheen along the top of the cylinder */}
          <Rect x={0} y={height * 0.16} width={size.w} height={2.2} rx={1.1} fill="rgba(255,248,222,0.55)" />
          {/* node collars */}
          {Array.from({ length: Math.max(2, Math.round(size.w / 76)) }).map((_, i, arr) => {
            const x = ((i + 0.5) / arr.length) * size.w
            return (
              <G key={i}>
                <Rect x={x - 2.4} y={0} width={4.8} height={height} fill="rgba(64,40,10,0.38)" />
                <Rect x={x - 3.9} y={0} width={1.5} height={height} fill="rgba(255,244,210,0.5)" />
                <Rect x={x + 2.4} y={0} width={1.2} height={height} fill="rgba(255,244,210,0.28)" />
              </G>
            )
          })}
          {/* cut edges */}
          <Rect x={0} y={0.5} width={size.w} height={1.2} fill="rgba(255,250,230,0.6)" />
          <Rect x={0} y={height - 2} width={size.w} height={2} fill="rgba(30,16,3,0.42)" />
        </Svg>
      ) : null}
    </View>
  )
}

// ── The island scene pieces ────────────────────────────────────────────────

/**
 * The sun — pure light, no cartoon rays: a hot core dissolving through two
 * warm falloffs, with a faint horizon-flare streak. Reads as haze, not sticker.
 */
export function SunGlow({ size = 260 }: { size?: number }) {
  const id = useUid('sun')
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`${id}a`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFDF4" />
          <Stop offset="0.16" stopColor="#FFF3C9" />
          <Stop offset="0.35" stopColor="#FFD97E" stopOpacity={0.85} />
          <Stop offset="0.62" stopColor="#FFB65C" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#FF9838" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}b`} cx="50%" cy="50%" r="50%">
          <Stop offset="0.3" stopColor="#FFFFFF" stopOpacity={0.85} />
          <Stop offset="1" stopColor="#FFF3C9" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={50} fill={`url(#${id}a)`} />
      <Circle cx={50} cy={50} r={17} fill={`url(#${id}b)`} />
      {/* horizon flare */}
      <Ellipse cx={50} cy={50} rx={44} ry={2.6} fill="#FFE9AE" opacity={0.28} />
    </Svg>
  )
}

/**
 * A lush palm frond: a curved rib with tapered leaflets laid alternately along
 * it, in two greens so the leaf has depth. Static paths — sway the whole frond.
 */
export function Frond({
  length = 240,
  color = PALM,
  deep = PALM_DEEP,
  flip = false,
  opacity = 1,
}: {
  length?: number
  color?: string
  deep?: string
  flip?: boolean
  opacity?: number
}) {
  const leaflets = useMemo(() => {
    // Rib: quadratic from (4,10) drooping to (96,58) in a 100×70 box.
    const P0 = { x: 4, y: 8 }
    const P1 = { x: 62, y: 6 }
    const P2 = { x: 98, y: 58 }
    const pt = (t: number) => ({
      x: (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x,
      y: (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y,
    })
    const tan = (t: number) => {
      const dx = 2 * (1 - t) * (P1.x - P0.x) + 2 * t * (P2.x - P1.x)
      const dy = 2 * (1 - t) * (P1.y - P0.y) + 2 * t * (P2.y - P1.y)
      const m = Math.hypot(dx, dy)
      return { x: dx / m, y: dy / m }
    }
    const out: Array<{ d: string; dark: boolean }> = []
    const N = 16
    for (let i = 0; i < N; i++) {
      const t = 0.08 + (i / (N - 1)) * 0.88
      const p = pt(t)
      const tg = tan(t)
      const side = i % 2 === 0 ? 1 : -1
      // leaflet length tapers toward the tip
      const L = 26 * (1 - t * 0.55) * (0.8 + 0.2 * Math.sin(i * 2.1))
      const nx = -tg.y * side
      const ny = tg.x * side
      const tipX = p.x + nx * L + tg.x * L * 0.55
      const tipY = p.y + ny * L + tg.y * L * 0.55
      const w = 3.4 * (1 - t * 0.4)
      const d =
        `M${p.x.toFixed(1)} ${p.y.toFixed(1)}` +
        ` Q ${(p.x + nx * L * 0.5 + tg.x * L * 0.1).toFixed(1)} ${(p.y + ny * L * 0.5 + tg.y * L * 0.1).toFixed(1)}, ${tipX.toFixed(1)} ${tipY.toFixed(1)}` +
        ` Q ${(p.x + nx * L * 0.45 + tg.x * (L * 0.45 + w)).toFixed(1)} ${(p.y + ny * L * 0.45 + tg.y * (L * 0.45 + w)).toFixed(1)}, ${(p.x + tg.x * w * 1.6).toFixed(1)} ${(p.y + tg.y * w * 1.6).toFixed(1)} Z`
      out.push({ d, dark: i % 3 === 2 })
    }
    return out
  }, [])

  const w = length
  const h = length * 0.7
  return (
    <Svg
      width={w}
      height={h}
      viewBox="0 0 100 70"
      opacity={opacity}
      style={flip ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      {/* rib */}
      <Path d="M4 8 Q 62 6 98 58" stroke={deep} strokeWidth={1.7} fill="none" strokeLinecap="round" />
      {leaflets.map((l, i) => (
        <Path key={i} d={l.d} fill={l.dark ? deep : color} opacity={l.dark ? 0.9 : 0.95} />
      ))}
    </Svg>
  )
}

/** Clean split-leaf monstera. Decor for titles / empty states. */
export function Monstera({ size = 74, color = PALM, deep = PALM_DEEP, opacity = 1 }: { size?: number; color?: string; deep?: string; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <Path d="M50 97C16 80 6 46 22 22 30 10 44 4 52 4c10 0 22 8 26 20 8 24-4 56-28 73Z" fill={color} stroke={deep} strokeWidth={2} />
      <G stroke={deep} strokeWidth={3} strokeLinecap="round" opacity={0.6}>
        <Path d="M50 92 46 22" />
        <Path d="M48 74 26 62M48.5 58 28 44M50 43 33 31" />
        <Path d="M49 74 70 60M49 58 72 46M50 44 71 34" />
      </G>
    </Svg>
  )
}

/** A far-off island on the horizon: a sand bump with two leaning palms. */
export function DistantIsle({ width = 120, color = '#2E8C7E', opacity = 0.4 }: { width?: number; color?: string; opacity?: number }) {
  const h = width * 0.5
  return (
    <Svg width={width} height={h} viewBox="0 0 120 60" opacity={opacity}>
      <G fill={color}>
        <Path d="M6 56c14-12 34-18 54-18s42 6 54 18z" />
        {/* left palm, leaning right */}
        <Path d="M42 40c1-10 4-18 9-24l3 2c-5 6-7 13-8 22z" />
        <Path d="M53 17c-6-5-14-6-21-3 7 0 12 2 16 6-6-1-11 0-15 3 6-1 11 0 15 3-1-4 0-7 5-9z" />
        <Path d="M53 17c2-7 9-11 16-10-6 2-10 5-12 10 5-3 10-3 14-1-5 0-9 2-12 5 0-2-2-4-6-4z" />
        {/* right palm, smaller */}
        <Path d="M84 44c0-8 2-14 6-19l2.5 1.5c-4 5-5 11-6 17.5z" />
        <Path d="M92 26c-5-4-11-4-16-2 5 0 9 2 12 4-4 0-8 1-11 3 4-1 8 0 11 2-.5-3 .5-5 4-7z" />
        <Path d="M92 26c2-5 7-8 12-7-4 1-7 4-9 7 4-2 7-2 10-1-4 1-7 2-9 4 0-1-1-2-4-3z" />
      </G>
    </Svg>
  )
}

/** A soft drawn cloud — three lobes, flat base, barely-there. */
export function Cloud({ width = 90, opacity = 0.5 }: { width?: number; opacity?: number }) {
  const h = width * 0.38
  return (
    <Svg width={width} height={h} viewBox="0 0 100 38" opacity={opacity}>
      <Path
        d="M14 32a10 10 0 0 1 3-19.5A14 14 0 0 1 44 7a12 12 0 0 1 21 5.5A9.5 9.5 0 0 1 84 32Z"
        fill="#FFFFFF"
      />
      <Path d="M14 32h70" stroke="rgba(190,225,230,0.8)" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

/** One seamless wave band; spans 2× width so a full-width translate loops clean. */
export function WaveBand({
  width,
  height = 46,
  color = AQUA,
  opacity = 1,
  crest = 12,
}: {
  width: number
  height?: number
  color?: string
  opacity?: number
  crest?: number
}) {
  const d = useMemo(() => {
    const span = width / 2
    const half = span / 2
    let p = `M0 ${crest}`
    for (let i = 0; i < 4; i++) {
      p += ` q ${half / 2} ${-crest} ${half} 0 q ${half / 2} ${crest} ${half} 0`
    }
    return `${p} L ${width * 2} ${height} L 0 ${height} Z`
  }, [width, height, crest])

  return (
    <Svg width={width * 2} height={height} opacity={opacity}>
      <Path d={d} fill={color} />
    </Svg>
  )
}

/** A twinkling sparkle on the water. */
export function Twinkle({ size = 10, delay = 0 }: { size?: number; delay?: number }) {
  const v = useLoop(2100, delay)
  return (
    <Animated.View
      style={{
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.8] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 10 10">
        <Path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4Z" fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  )
}

// ── Dimensional objects (the BOTC treatment) ───────────────────────────────

/** A glossy lei bead — radial body, specular, rim light. */
export function Bead3D({ size = 34, color = LAGOON }: { size?: number; color?: string }) {
  const id = useUid('bead')
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`${id}b`} cx="33%" cy="27%" r="82%">
          <Stop offset="0" stopColor={tint(color, 0.62)} />
          <Stop offset="0.4" stopColor={color} />
          <Stop offset="1" stopColor={shade(color, 0.36)} />
        </RadialGradient>
        <RadialGradient id={`${id}s`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.92} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={47} fill={`url(#${id}b)`} />
      <Path d="M50 93a45 45 0 0 0 39-24" stroke={alpha(tint(color, 0.7), 0.8)} strokeWidth={3.2} strokeLinecap="round" fill="none" />
      <Ellipse cx={36} cy={30} rx={16} ry={10.5} fill={`url(#${id}s)`} transform="rotate(-28 36 30)" />
    </Svg>
  )
}

/**
 * A hibiscus bloom lit like an object: petals shaded from a hot heart, ruffled
 * edges, a curved stamen with pollen tips. `color` tints the petals.
 */
export function Hibiscus3D({ size = 40, color = GUAVA }: { size?: number; color?: string }) {
  const id = useUid('hib')
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <RadialGradient id={`${id}p`} cx="50%" cy="82%" r="85%">
          <Stop offset="0" stopColor={shade(color, 0.28)} />
          <Stop offset="0.45" stopColor={color} />
          <Stop offset="1" stopColor={tint(color, 0.4)} />
        </RadialGradient>
      </Defs>
      <G>
        {[0, 72, 144, 216, 288].map((a) => (
          <G key={a} transform={`rotate(${a} 40 40)`}>
            {/* ruffled petal: wavy outer edge, narrow throat */}
            <Path
              d="M40 38 C 33 30 30 21 33 12 C 35 8 38 6.5 40 9 C 42 6.5 45 8 47 12 C 50 21 47 30 40 38 Z"
              fill={`url(#${id}p)`}
              stroke={shade(color, 0.34)}
              strokeWidth={0.8}
            />
            <Path d="M40 34 C 38 27 37.5 20 39 13" stroke={shade(color, 0.3)} strokeWidth={0.9} opacity={0.55} fill="none" />
            <Path d="M40 34 C 42 27 42.5 20 41 13" stroke={tint(color, 0.5)} strokeWidth={0.7} opacity={0.5} fill="none" />
          </G>
        ))}
        {/* heart + stamen */}
        <Circle cx={40} cy={40} r={5.6} fill={shade(color, 0.42)} />
        <Path d="M40 40 C 44 34 47 29 52 26" stroke={SUN} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        {[
          [52, 25],
          [49.4, 23.4],
          [54.2, 27.8],
        ].map(([cx, cy], i) => (
          <Circle key={i} cx={cx} cy={cy} r={1.9} fill={SUN} stroke={MANGO} strokeWidth={0.7} />
        ))}
      </G>
    </Svg>
  )
}

/** A carved wooden medallion with a beveled rim — the queue's rank coin. */
export function WoodMedallion({
  size = 40,
  paint,
  children,
}: {
  size?: number
  /** Paint the face (rank #1 gets sunshine); default is bare teak. */
  paint?: string
  children?: React.ReactNode
}) {
  const id = useUid('med')
  const face = paint ?? TEAK
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tint(TEAK_LIT, 0.25)} />
            <Stop offset="0.5" stopColor={TEAK} />
            <Stop offset="1" stopColor={WALNUT_DK} />
          </SvgGradient>
          <RadialGradient id={`${id}face`} cx="38%" cy="30%" r="80%">
            <Stop offset="0" stopColor={tint(face, 0.3)} />
            <Stop offset="0.6" stopColor={face} />
            <Stop offset="1" stopColor={shade(face, 0.3)} />
          </RadialGradient>
        </Defs>
        {/* contact shadow */}
        <Ellipse cx={50} cy={95} rx={30} ry={4.4} fill="rgba(14,46,41,0.25)" />
        {/* beveled rim */}
        <Circle cx={50} cy={48} r={46} fill={`url(#${id}rim)`} stroke={TIMBER_EDGE} strokeWidth={2} />
        {/* face */}
        <Circle cx={50} cy={48} r={36} fill={`url(#${id}face)`} />
        {/* carved seam between rim and face */}
        <Circle cx={50} cy={48} r={36} fill="none" stroke="rgba(30,14,2,0.5)" strokeWidth={1.6} />
        <Circle cx={50} cy={49.6} r={36} fill="none" stroke="rgba(255,232,185,0.3)" strokeWidth={1} />
        {/* specular */}
        <Ellipse cx={36} cy={31} rx={14} ry={8} fill="rgba(255,248,225,0.4)" transform="rotate(-28 36 31)" />
      </Svg>
      <View style={{ marginTop: -size * 0.04 }}>{children}</View>
    </View>
  )
}

/** A chrome-ball karaoke mic, lit like the BOTC coins. */
export function Mic3D({ size = 132, accent = LAGOON }: { size?: number; accent?: string }) {
  const id = useUid('mic')
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`${id}h`} cx="34%" cy="26%" r="80%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.34" stopColor={tint(accent, 0.6)} />
          <Stop offset="0.78" stopColor={accent} />
          <Stop offset="1" stopColor={shade(accent, 0.42)} />
        </RadialGradient>
        <SvgGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F7FBFA" />
          <Stop offset="0.42" stopColor="#C6DEDA" />
          <Stop offset="1" stopColor="#70938F" />
        </SvgGradient>
        <RadialGradient id={`${id}g`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <ClipPath id={`${id}c`}>
          <Circle cx={44} cy={38} r={27} />
        </ClipPath>
      </Defs>

      <Ellipse cx={56} cy={95} rx={22} ry={4.4} fill="rgba(14,46,41,0.24)" />

      {/* handle */}
      <Path d="M58 58c9 6 14 15 15 27a5 5 0 0 1-5 5h-9a5 5 0 0 1-5-5c-1-9-4-16-9-21z" fill={`url(#${id}s)`} />
      <Path d="M60 62c7 6 11 14 12 24" stroke="rgba(255,255,255,0.6)" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d="M50 55c6 2 10 5 12 9l-7 5c-3-4-7-6-11-7z" fill={shade(accent, 0.22)} />

      {/* grille ball */}
      <Circle cx={44} cy={38} r={27} fill={`url(#${id}h)`} />
      <G clipPath={`url(#${id}c)`} opacity={0.2}>
        {[-24, -16, -8, 0, 8, 16, 24].map((o) => (
          <Rect key={`h${o}`} x={17} y={38 + o} width={54} height={1.5} fill="#04353A" />
        ))}
        {[-24, -16, -8, 0, 8, 16, 24].map((o) => (
          <Rect key={`v${o}`} x={44 + o} y={11} width={1.5} height={54} fill="#04353A" />
        ))}
      </G>
      <Circle cx={44} cy={38} r={27} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.6} />
      <Path d="M44 65a27 27 0 0 0 24-15" stroke={alpha(tint(accent, 0.75), 0.7)} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Ellipse cx={33} cy={26} rx={11} ry={7} fill={`url(#${id}g)`} transform="rotate(-30 33 26)" />
    </Svg>
  )
}

// ── Tiki torch ─────────────────────────────────────────────────────────────

/** The licking flame — three nested teardrops that flicker on a spring-y loop. */
export function Flame({ size = 56, delay = 0 }: { size?: number; delay?: number }) {
  const a = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 420, delay, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 360, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [a, delay])

  const scaleY = a.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.16] })
  const scaleX = a.interpolate({ inputRange: [0, 1], outputRange: [1.05, 0.9] })
  const ty = a.interpolate({ inputRange: [0, 1], outputRange: [size * 0.04, -size * 0.05] })
  const rot = a.interpolate({ inputRange: [0, 1], outputRange: ['-2.4deg', '2.4deg'] })
  const w = size * 0.72

  return (
    <Animated.View style={{ width: w, height: size, transform: [{ translateY: ty }, { scaleX }, { scaleY }, { rotate: rot }] }}>
      <Svg width={w} height={size} viewBox="0 0 62 86">
        <Path d="M31 84 C 7 64 5 38 31 4 C 57 38 55 64 31 84 Z" fill={CORAL} />
        <Path d="M31 80 C 14 62 13 40 31 14 C 49 40 48 62 31 80 Z" fill="#FF8A3C" />
        <Path d="M31 76 C 21 62 21 44 31 24 C 41 44 41 62 31 76 Z" fill={SUN} />
        <Path d="M31 70 C 26 60 26 50 31 38 C 36 50 36 60 31 70 Z" fill="#FFEFC0" />
      </Svg>
    </Animated.View>
  )
}

/** A bamboo tiki torch: woven bowl, cylindrical cane, flickering flame + glow. */
export function TikiTorch({ height = 150, flame = 52 }: { height?: number; flame?: number }) {
  const glowPulse = useLoop(1300)
  const poleH = height - flame * 0.55
  return (
    <View style={{ width: 64, height, alignItems: 'center' }}>
      {/* warm breathing glow behind the flame */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -flame * 0.32,
          width: flame * 2.5,
          height: flame * 2.5,
          borderRadius: flame * 1.25,
          backgroundColor: 'rgba(255,168,58,0.3)',
          opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
          transform: [{ scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }],
        }}
      />
      <Flame size={flame} />
      <View style={{ marginTop: -6 }}>
        <Svg width={64} height={poleH} viewBox={`0 0 64 ${poleH}`}>
          <Defs>
            <SvgGradient id="ttbowl" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={WALNUT_LIT} />
              <Stop offset="1" stopColor={WALNUT_DK} />
            </SvgGradient>
            <SvgGradient id="ttpole" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#8F6A32" />
              <Stop offset="0.3" stopColor="#E7CE93" />
              <Stop offset="0.55" stopColor="#CDA85A" />
              <Stop offset="1" stopColor="#8F6A32" />
            </SvgGradient>
          </Defs>
          {/* woven bowl with weave seams */}
          <Path d="M12 18 q 20 26 40 0 q -7 -17 -20 -17 q -13 0 -20 17 Z" fill="url(#ttbowl)" stroke="#2E1808" strokeWidth={2} />
          <Path d="M13 17 q 19 11 38 0 M16 24 q 16 9 32 0" stroke="#2E1808" strokeWidth={1.8} fill="none" opacity={0.7} />
          <Path d="M14 14 q 18 -7 36 0" stroke="rgba(255,226,170,0.35)" strokeWidth={1.6} fill="none" />
          {/* cylindrical bamboo pole */}
          <Rect x={24} y={26} width={16} height={poleH - 26} fill="url(#ttpole)" stroke="rgba(43,22,6,0.5)" strokeWidth={1.2} />
          {[0.32, 0.62, 0.88].map((p, i) => (
            <G key={i}>
              <Rect x={22.6} y={poleH * p} width={18.8} height={4.4} rx={2.2} fill="#8F6A32" stroke="rgba(43,22,6,0.5)" strokeWidth={1} />
              <Rect x={22.6} y={poleH * p + 0.8} width={18.8} height={1.2} rx={0.6} fill="rgba(255,244,210,0.45)" />
            </G>
          ))}
          {/* rope lash under the bowl */}
          <RopeSeg x1={22} y1={30} x2={42} y2={30} width={3} />
        </Svg>
      </View>
    </View>
  )
}

// ── Signature flourish ─────────────────────────────────────────────────────

/** The wavy rule that signs script titles. Procedural, so it never distorts. */
export function WaveRule({
  width = 96,
  color = LAGOON,
  thickness = 3.2,
  opacity = 1,
}: {
  width?: number
  color?: string
  thickness?: number
  opacity?: number
}) {
  const { d, h } = useMemo(() => {
    const hump = 15
    const amp = 4.6
    const n = Math.max(2, Math.round((width - thickness) / hump))
    const step = (width - thickness) / n
    const y = amp + thickness / 2
    let path = `M${thickness / 2} ${y}`
    for (let i = 0; i < n; i++) {
      path += ` q ${step / 2} ${i % 2 === 0 ? -amp : amp} ${step} 0`
    }
    return { d: path, h: amp * 2 + thickness }
  }, [width, thickness])

  return (
    <Svg width={width} height={h} opacity={opacity}>
      <Path d={d} stroke={color} strokeWidth={thickness} strokeLinecap="round" fill="none" />
    </Svg>
  )
}
