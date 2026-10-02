import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, ClipPath, Defs, G, Mask, Path, RadialGradient, Rect, Stop } from 'react-native-svg'

// ── BARBIE / "BARBIE LAND": shared visual vocabulary ──────────────────────
//
// A pink, sunny day on a painted movie set, the same town the stage shows
// (packages/desktop/src/renderer/src/styles/barbie.ts). Barbie Land is a little
// artificial and proud of it, so every atom is built from these materials:
//
//   1. PAINTED SKY. Flat gradients (pool blue, pink, peach) and cumulus clouds
//      in two flat tones with a warm sunlit rim (`Cloud`). Nothing is blurred.
//   2. THE SUN. A painted disc with a two-tone sunburst (`Sun`). Its glint is
//      the app's one clock (`useGlint`): every so often a band of sunlight
//      sweeps across every glossy surface on screen at the same moment.
//   3. PINK PLASTIC. Candy-bright gloss with a white rim and one crisp
//      specular (`Gloss`). Touching it SQUISHES it like a jelly button
//      (`Press`), then it springs back.
//   4. PALM SPRINGS. Candy-striped awnings with scalloped valances (`Awning`),
//      deckle-edged snapshots (`deckleRectPath`), a painted pool whose ripples
//      are white contour lines (`PoolWater`).
//   5. GLITTER. Light is always a four-point twinkle (`Twinkle`).
//
// The SCALLOP (an awning's valance, a cloud's puffs, the sun's rays, a
// snapshot's edge) is the structural signature: nothing ends in a plain line.
//
// Lettering is sign-painted Shrikhand: a white outline and a deep pink
// extrusion (`RetroText`). Yellowtail is the brush script; Poppins the rest.
// Copy never uses em dashes.

// ── palette ─────────────────────────────────────────────────────────────────
export const PLUM = '#4B0A35'
export const PLUM_SOFT = '#7A2A5E'
export const RASPBERRY = '#B0115E'
export const PINK = '#E0218A'
export const HOT = '#FF3FA4'
export const BUBBLE = '#FF5DB1'
export const CANDY = '#FFA6D5'
export const BLUSH = '#FFD3E8'
export const SHELL = '#FFF0F7'
export const WHITE = '#FFFFFF'
export const MUTED = '#A0567F'
export const SUN = '#FFD23F'
export const SUN_HI = '#FFF1A8'
export const SUN_CORE = '#FFFBE6'
export const SUN_DEEP = '#F5A21C'
export const PEACH = '#FFB38A'
export const CORAL = '#FF7A6B'
export const SKY_TOP = '#8FD8F2'
export const SKY_MID = '#C4E9F4'
export const SKY_PINK = '#FFC6DF'
export const SKY_PEACH = '#FFD9BC'
export const CLOUD_SHADE = '#F3CBE6'
export const CLOUD_DEEP = '#E3AEDB'
export const POOL = '#4FCFE6'
export const POOL_DEEP = '#1FA8CC'
export const POOL_LINE = '#E9FBFF'
export const HILL_FAR = '#E6B6E0'
export const HILL_NEAR = '#D497D2'
export const LILAC = '#C9A7F0'
export const AQUA = '#2FCFC0'
export const MINT = '#7EE3C4'

/** Pastel stripe pairs for awnings, walked by index so neighbours differ. */
export const STRIPES: Array<[string, string]> = [
  ['#FF8FC8', WHITE], // bubblegum
  ['#7FDDEB', WHITE], // pool
  ['#FFD764', WHITE], // sunshine
  ['#C9A7F0', WHITE], // lilac
  ['#FFB38A', WHITE], // peach
  ['#8EE6C9', WHITE], // mint
]

// ── type ────────────────────────────────────────────────────────────────────
// Registered in App.tsx's useFonts map.
export const DISPLAY = 'Shrikhand_400Regular'
export const SCRIPT = 'Yellowtail_400Regular'
export const BODY_500 = 'Poppins_500Medium'
export const BODY_600 = 'Poppins_600SemiBold'
export const BODY_700 = 'Poppins_700Bold'
export const BODY_800 = 'Poppins_800ExtraBold'

/** Shrikhand. It is a steep italic, so it gets a little right padding or iOS
 *  clips the last letter's overhang. */
export function display(size: number, color: string = PINK, extra?: TextStyle): TextStyle {
  return {
    fontFamily: DISPLAY,
    fontSize: size,
    lineHeight: Math.round(size * 1.3),
    color,
    paddingRight: Math.round(size * 0.12),
    ...extra,
  }
}

/** Yellowtail, the 60s brush script, for the odd flourish. */
export function script(size: number, color: string = PINK, extra?: TextStyle): TextStyle {
  return {
    fontFamily: SCRIPT,
    fontSize: size,
    lineHeight: Math.round(size * 1.25),
    color,
    paddingRight: Math.round(size * 0.1),
    ...extra,
  }
}

/** Poppins: prose, metadata, names. */
export function body(size: number, color: string = PLUM, weight: 500 | 600 | 700 | 800 = 600, extra?: TextStyle): TextStyle {
  return {
    fontFamily: weight === 500 ? BODY_500 : weight === 700 ? BODY_700 : weight === 800 ? BODY_800 : BODY_600,
    fontSize: size,
    color,
    ...extra,
  }
}

/** Poppins capitals, tracked out, for little labels. */
export function caps(size: number, color: string = PINK, extra?: TextStyle): TextStyle {
  return {
    fontFamily: BODY_700,
    fontSize: size,
    color,
    letterSpacing: size * 0.16,
    textTransform: 'uppercase',
    ...extra,
  }
}

// ── small helpers ───────────────────────────────────────────────────────────

/** Seeded PRNG (mulberry32): the same seed always paints the same cloud. */
export function rng(seed: number): () => number {
  let a = Math.floor(seed * 2 ** 31) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stable, SVG-safe unique id (React's useId emits colons, which break url(#…)). */
let uid = 0
export function useUid(prefix: string): string {
  return useMemo(() => {
    uid += 1
    return `${prefix}${uid}`
  }, [prefix])
}

export function useMeasured(): [{ w: number; h: number } | null, (e: LayoutChangeEvent) => void] {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((prev) => (prev && Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5 ? prev : { w: width, h: height }))
  }
  return [size, onLayout]
}

/** `#RRGGBB` → `rgba(…, a)`. */
export function alpha(hex: string, a: number): string {
  const m = hex.replace('#', '')
  if (m.length < 6) return hex
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

/** Mix a hex colour toward another (t = 0 keeps `a`). */
export function mix(a: string, b: string, t: number): string {
  const pa = a.replace('#', '')
  const pb = b.replace('#', '')
  if (pa.length < 6 || pb.length < 6) return a
  const c = [0, 2, 4].map((i) => {
    const x = parseInt(pa.slice(i, i + 2), 16)
    const y = parseInt(pb.slice(i, i + 2), 16)
    return Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  })
  return `#${c.join('')}`
}

/** Relative luminance 0..1 of a hex colour, for picking legible ink. */
export function luma(hex: string): number {
  const m = hex.replace('#', '')
  if (m.length < 6) return 0.5
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(m.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

// ── motion ──────────────────────────────────────────────────────────────────

/** 0 → 1 → 0 sinusoidal loop (or 0 → 1 sawtooth). */
export function useLoop(durationMs: number, delayMs = 0, pingPong = true): Animated.Value {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = pingPong
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: durationMs / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(v, { toValue: 0, duration: durationMs / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        )
      : Animated.loop(Animated.timing(v, { toValue: 1, duration: durationMs, easing: Easing.linear, useNativeDriver: true }))
    const t = setTimeout(() => anim.start(), delayMs)
    return () => {
      clearTimeout(t)
      anim.stop()
    }
  }, [v, durationMs, delayMs, pingPong])
  return v
}

/** Arrival: things pop in with a little bounce, the way everything in Barbie
 *  Land is pleased to see you. */
export function useEnter(delay = 0) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const a = Animated.spring(v, { toValue: 1, delay, stiffness: 170, damping: 13, mass: 0.8, useNativeDriver: true })
    a.start()
    return () => a.stop()
  }, [v, delay])
  return {
    opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
    scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
  }
}

// ── The glint ───────────────────────────────────────────────────────────────
// ONE band of sunlight for the whole app. Every glossy surface binds its glint
// to this same native value, so when the light catches, the buttons, the song
// snapshots, the stage art and the tab bar all shine in the same frame, the way
// everything does when the sun comes out from behind a cloud. The scheduler only
// runs while something on screen is listening.

const glintValue = new Animated.Value(0)
let glintUsers = 0
let glintTimer: ReturnType<typeof setTimeout> | null = null

function scheduleGlint(first = false) {
  if (glintTimer) clearTimeout(glintTimer)
  glintTimer = setTimeout(sweep, first ? 1800 + Math.random() * 1500 : 6500 + Math.random() * 4500)
}

function sweep() {
  glintTimer = null
  glintValue.setValue(0)
  Animated.timing(glintValue, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start()
  if (glintUsers > 0) scheduleGlint()
}

/** Subscribe to the glint. Returns the shared sweep value (0..1, native). */
export function useGlint(): Animated.Value {
  useEffect(() => {
    glintUsers += 1
    if (glintUsers === 1) scheduleGlint(true)
    return () => {
      glintUsers -= 1
      if (glintUsers <= 0) {
        glintUsers = 0
        if (glintTimer) clearTimeout(glintTimer)
        glintTimer = null
      }
    }
  }, [])
  return glintValue
}

/** Catch the light right now (a tap on the sun, a new song). */
export function catchTheLight(): void {
  if (glintUsers > 0) sweep()
}

/** The glint band itself: lay it inside a clipped (overflow hidden) surface. */
export function Glint({ width, height, strength = 0.75 }: { width: number; height: number; strength?: number }) {
  const g = useGlint()
  const band = Math.max(40, width * 0.32)
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -height * 0.3,
        bottom: -height * 0.3,
        left: 0,
        width: band,
        transform: [
          { translateX: g.interpolate({ inputRange: [0, 1], outputRange: [-band * 1.4, width + band * 0.4] }) },
          { rotate: '18deg' },
        ],
      }}
    >
      <LinearGradient
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        colors={['rgba(255,255,255,0)', `rgba(255,255,255,${strength})`, 'rgba(255,255,255,0)']}
        style={{ flex: 1 }}
      />
    </Animated.View>
  )
}

/** Jelly press: squashes wide and short on touch, springs back with a wobble. */
export function useSquish(amount = 1) {
  const v = useRef(new Animated.Value(0)).current
  const onPressIn = () => {
    Animated.spring(v, { toValue: 1, stiffness: 520, damping: 22, mass: 0.6, useNativeDriver: true }).start()
  }
  const onPressOut = () => {
    Animated.spring(v, { toValue: 0, stiffness: 300, damping: 7, mass: 0.7, useNativeDriver: true }).start()
  }
  // The transform array is ALWAYS present (values animate): a transform that
  // flips to undefined crashes Fabric on press-out (see project notes).
  const transform = [
    { scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + 0.045 * amount] }) },
    { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1 - 0.075 * amount] }) },
  ]
  return { v, transform, onPressIn, onPressOut }
}

/** A Pressable whose child squishes like a jelly button. */
export function Press({
  children,
  style,
  outerStyle,
  amount = 1,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /** Style for the Pressable itself (give it flex when the child must fill). */
  outerStyle?: StyleProp<ViewStyle>
  amount?: number
}) {
  const { transform, onPressIn, onPressOut } = useSquish(amount)
  return (
    <Pressable {...rest} style={outerStyle} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform }]}>{children}</Animated.View>
    </Pressable>
  )
}

// ── Pink plastic ────────────────────────────────────────────────────────────

export type GlossTone = 'white' | 'pink' | 'sun' | 'aqua' | 'lilac' | 'blush'

const TONES: Record<GlossTone, { body: [string, string, string]; base: string }> = {
  white: { body: ['#FFFFFF', '#FFFFFF', '#FFF2F8'], base: 'rgba(255,150,205,0.22)' },
  blush: { body: ['#FFF4FA', '#FFE3F0', '#FFD3E8'], base: 'rgba(224,33,138,0.18)' },
  pink: { body: ['#FF79C1', '#E0218A', '#C4127A'], base: 'rgba(122,16,78,0.35)' },
  sun: { body: ['#FFF4B8', '#FFD23F', '#F2B21E'], base: 'rgba(180,110,0,0.28)' },
  aqua: { body: ['#A8F0F7', '#4FCFE6', '#24AACB'], base: 'rgba(12,110,150,0.28)' },
  lilac: { body: ['#EEE2FF', '#C9A7F0', '#A987DB'], base: 'rgba(90,50,150,0.25)' },
}

/**
 * Glossy candy plastic: a body gradient, a white rim, a darker lip along the
 * bottom, ONE hard-edged specular streak near the top (light on vinyl, not a
 * soft glow) and the shared glint. The shadow lives on an outer wrapper,
 * because iOS drops a view's shadow when that same view clips its children.
 */
export function Gloss({
  tone = 'white',
  radius = 999,
  rim = 2.5,
  shadow = true,
  glint = true,
  specular = true,
  style,
  contentStyle,
  children,
}: {
  tone?: GlossTone
  radius?: number
  rim?: number
  shadow?: boolean
  glint?: boolean
  specular?: boolean
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  children?: React.ReactNode
}) {
  const [size, onLayout] = useMeasured()
  const t = TONES[tone]
  return (
    <View style={[shadow ? styles.drop : null, { borderRadius: radius }, style]}>
      <View onLayout={onLayout} style={{ borderRadius: radius, overflow: 'hidden', borderWidth: rim, borderColor: WHITE, flexGrow: 1 }}>
        <LinearGradient colors={t.body} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        {/* the darker lip along the bottom, where the plastic curves under */}
        <LinearGradient colors={['rgba(0,0,0,0)', t.base]} locations={[0.62, 1]} style={StyleSheet.absoluteFill} />
        {specular && size ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 3,
              left: Math.min(radius * 0.55, size.w * 0.1) + 4,
              right: Math.min(radius * 0.55, size.w * 0.1) + 4,
              height: Math.max(4, Math.min(14, size.h * 0.24)),
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <LinearGradient colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.05)']} style={StyleSheet.absoluteFill} />
          </View>
        ) : null}
        {glint && size ? <Glint width={size.w} height={size.h} /> : null}
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  drop: {
    shadowColor: RASPBERRY,
    shadowOpacity: 0.24,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
})

/** The soft pink drop shadow, for callers that build their own surface. */
export const pinkDrop = styles.drop

// ── Sign-painted lettering ──────────────────────────────────────────────────

const RING8: Array<[number, number]> = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2
  return [Math.cos(a), Math.sin(a)]
})

/**
 * Shrikhand as sign-painted 3D lettering: the fill on top of a white outline,
 * on top of a deep pink extrusion. React Native has no text stroke, so the
 * outline is eight white copies of the line nudged round a ring, and the
 * extrusion is the lower half of that ring again in raspberry, dropped
 * further down. Use it for a handful of headings, not for lists (it is fifteen
 * Text nodes).
 */
export function RetroText({
  children,
  size,
  fill = PINK,
  outline = WHITE,
  depthColor = RASPBERRY,
  outlineW = 0.06,
  depth = 0.1,
  align = 'left',
  style,
}: {
  children: string
  size: number
  fill?: string
  outline?: string
  depthColor?: string
  outlineW?: number
  depth?: number
  align?: 'left' | 'center'
  style?: StyleProp<ViewStyle>
}) {
  const r = size * outlineW
  const d = size * depth
  const base = display(size, fill, { textAlign: align })
  const layer = (dx: number, dy: number, color: string, key: string) => (
    <Text key={key} numberOfLines={1} style={[base, { color, position: 'absolute', left: dx, right: -dx, top: dy }]} accessibilityElementsHidden importantForAccessibility="no">
      {children}
    </Text>
  )
  return (
    <View style={[{ paddingHorizontal: r, paddingTop: r, paddingBottom: d + r }, style]}>
      <View>
        {/* soft drop under everything */}
        <Text numberOfLines={1} style={[base, { position: 'absolute', left: 0, right: 0, top: d * 1.1, color: 'rgba(176,17,94,0.01)', textShadowColor: 'rgba(122,16,78,0.35)', textShadowRadius: size * 0.12, textShadowOffset: { width: 0, height: 0 } }]}>
          {children}
        </Text>
        {RING8.filter(([, y]) => y >= -0.01).map(([x, y], i) => layer(x * r + d * 0.3, y * r + d, depthColor, `d${i}`))}
        {RING8.map(([x, y], i) => layer(x * r, y * r, outline, `o${i}`))}
        <Text numberOfLines={1} style={base}>
          {children}
        </Text>
      </View>
    </View>
  )
}

// ── Geometry ────────────────────────────────────────────────────────────────

/**
 * A rectangle whose four edges are rows of little half-disc scallops bulging
 * outward: a deckle-edged snapshot, or a postage stamp. Each edge fits a whole
 * number of scallops, so the corners always meet cleanly.
 */
export function deckleRectPath(w: number, h: number, r: number, ox = 0, oy = 0): string {
  const nx = Math.max(2, Math.round((w - 2 * r) / (2 * r)))
  const ny = Math.max(2, Math.round((h - 2 * r) / (2 * r)))
  const sx = (w - 2 * r) / nx
  const sy = (h - 2 * r) / ny
  const x0 = ox + r
  const y0 = oy + r
  const x1 = ox + w - r
  const y1 = oy + h - r
  let d = `M ${x0} ${y0}`
  for (let i = 0; i < nx; i++) d += ` A ${sx / 2} ${r} 0 0 1 ${x0 + sx * (i + 1)} ${y0}`
  for (let i = 0; i < ny; i++) d += ` A ${r} ${sy / 2} 0 0 1 ${x1} ${y0 + sy * (i + 1)}`
  for (let i = 0; i < nx; i++) d += ` A ${sx / 2} ${r} 0 0 1 ${x1 - sx * (i + 1)} ${y1}`
  for (let i = 0; i < ny; i++) d += ` A ${r} ${sy / 2} 0 0 1 ${x0} ${y1 - sy * (i + 1)}`
  return d + ' Z'
}

/** The bottom edge of an awning valance: a row of scallops hanging down. */
export function valancePath(w: number, top: number, h: number, r: number, ox = 0): string {
  const n = Math.max(1, Math.round(w / (2 * r)))
  const s = w / n
  let d = `M ${ox} ${top} L ${ox + w} ${top} L ${ox + w} ${top + h}`
  for (let i = 0; i < n; i++) d += ` A ${s / 2} ${r} 0 0 1 ${ox + w - s * (i + 1)} ${top + h}`
  return d + ' Z'
}

// ── The sun ─────────────────────────────────────────────────────────────────

/** Painted sun: a halo, a ring of rays (long sun-yellow and short peach), the
 *  disc with a single painter's highlight. `spin` turns the rays slowly. */
export function Sun({ size, spin = true, halo = true, rays = 'burst', ring }: { size: number; spin?: boolean; halo?: boolean; rays?: 'burst' | 'scallop' | 'none'; ring?: string }) {
  const id = useUid('bsun')
  const turn = useLoop(70000, 0, false)
  const burst = useMemo(() => {
    const out: Array<{ d: string; fill: string }> = []
    const n = 16
    for (let i = 0; i < n * 2; i++) {
      const long = i % 2 === 0
      const a = (i / (n * 2)) * Math.PI * 2
      const w = long ? 0.105 : 0.075
      const r0 = 54
      const r1 = long ? 94 : 76
      const p = (ang: number, r: number) => `${(Math.cos(ang) * r).toFixed(2)} ${(Math.sin(ang) * r).toFixed(2)}`
      out.push({ d: `M ${p(a - w, r0)} L ${p(a, r1)} L ${p(a + w, r0)} Z`, fill: long ? SUN : PEACH })
    }
    return out
  }, [])
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {halo ? (
        <Svg width={size} height={size} viewBox="-100 -100 200 200" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={`${id}h`} cx="50%" cy="50%" r="50%">
              <Stop offset="0.3" stopColor={SUN_HI} stopOpacity={0.85} />
              <Stop offset="0.62" stopColor={SUN_HI} stopOpacity={0.28} />
              <Stop offset="1" stopColor={SUN_HI} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle r={100} fill={`url(#${id}h)`} />
        </Svg>
      ) : null}
      {rays !== 'none' ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ rotate: spin ? turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) : '0deg' }] },
          ]}
        >
          <Svg width={size} height={size} viewBox="-100 -100 200 200">
            {rays === 'burst'
              ? burst.map((r, i) => <Path key={i} d={r.d} fill={r.fill} />)
              : Array.from({ length: 18 }, (_, i) => {
                  const a = (i / 18) * Math.PI * 2
                  return <Circle key={i} cx={Math.cos(a) * 58} cy={Math.sin(a) * 58} r={13} fill={ring ?? (i % 2 ? PEACH : SUN)} />
                })}
          </Svg>
        </Animated.View>
      ) : null}
      <Svg width={size} height={size} viewBox="-100 -100 200 200" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`${id}d`} cx="40%" cy="36%" r="70%">
            <Stop offset="0" stopColor={SUN_CORE} />
            <Stop offset="0.38" stopColor={SUN_HI} />
            <Stop offset="0.76" stopColor={SUN} />
            <Stop offset="1" stopColor="#FFB42E" />
          </RadialGradient>
        </Defs>
        <Circle r={56} fill={`url(#${id}d)`} />
        <Path d="M -38 -18 A 42 42 0 0 1 -6 -42 A 50 50 0 0 0 -30 -8 Z" fill={WHITE} opacity={0.55} />
        <Circle r={55.2} fill="none" stroke={SUN_DEEP} strokeWidth={1.6} opacity={0.55} />
      </Svg>
    </View>
  )
}

// ── Clouds ──────────────────────────────────────────────────────────────────

interface Puff {
  cx: number
  cy: number
  r: number
}

function cloudPuffs(seed: number): Puff[] {
  const r = rng(seed + 0.17)
  const n = 5 + Math.floor(r() * 2)
  const out: Puff[] = []
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const env = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85 + r() * 0.3)), 0.75)
    const rad = 15 + 25 * env + r() * 6
    out.push({ cx: 20 + t * 160 + (r() - 0.5) * 8, cy: 86 - rad * (0.6 + env * 0.3) + (r() - 0.5) * 4, r: rad })
  }
  return out
}

/**
 * A painted cumulus, the same construction as the stage's: a warm sunlit rim
 * along the tops, the lit body laid up and left toward the sun, the shadow
 * side in lilac pink and one deeper stroke along its flat underside.
 */
export function Cloud({ width, seed = 0.5, tone = 'day', flip = false }: { width: number; seed?: number; tone?: 'day' | 'blush'; flip?: boolean }) {
  const id = useUid('bcl')
  const puffs = useMemo(() => cloudPuffs(seed), [seed])
  const rim = tone === 'day' ? '#FFF3B8' : '#FFE1A6'
  const shade = tone === 'day' ? CLOUD_SHADE : '#F6B8DA'
  const deep = tone === 'day' ? CLOUD_DEEP : '#EE9DCB'
  const base = { x: 16, y: 64, w: 168, h: 26 }
  return (
    <Svg width={width} height={width / 2} viewBox="0 0 200 100" style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Defs>
        {/* A MASK, not a clipPath: iOS combines a clipPath's overlapping
            children even-odd, which cancels every place two puffs overlap and
            leaves the cloud checkered. A mask paints, so overlaps just union.
            The black band at the foot gives the cumulus its flat underside. */}
        <Mask id={`${id}m`} maskUnits="userSpaceOnUse" x={-20} y={-40} width={240} height={140}>
          {puffs.map((p, i) => (
            <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#FFFFFF" />
          ))}
          <Rect x={base.x} y={base.y} width={base.w} height={base.h} rx={13} fill="#FFFFFF" />
          <Rect x={-20} y={86} width={240} height={20} fill="#000000" />
        </Mask>
      </Defs>
      <G mask={`url(#${id}m)`}>
        <Rect x={-20} y={-40} width={240} height={140} fill={rim} />
        {puffs.map((p, i) => (
          <Circle key={`s${i}`} cx={p.cx} cy={p.cy + p.r * 0.06} r={p.r} fill={shade} />
        ))}
        <Rect x={base.x} y={base.y + 3} width={base.w} height={base.h} rx={13} fill={shade} />
        {puffs.map((p, i) => (
          <Circle key={`l${i}`} cx={p.cx - p.r * 0.1} cy={p.cy - p.r * 0.13} r={p.r * 0.84} fill={WHITE} />
        ))}
        <Rect x={-20} y={81} width={240} height={10} fill={deep} opacity={0.55} />
      </G>
    </Svg>
  )
}

// ── Glitter ─────────────────────────────────────────────────────────────────

export const TWINKLE_PATH = 'M0 -50 C 3 -12 12 -3 50 0 C 12 3 3 12 0 50 C -3 12 -12 3 -50 0 C -12 -3 -3 -12 0 -50 Z'

/** A four-point twinkle that winks on its own loop. */
export function Twinkle({ size, color = WHITE, delay = 0, period = 3600, style }: { size: number; color?: string; delay?: number; period?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period * 0.12, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 2, duration: period * 0.14, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(period * 0.74),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    )
    const t = setTimeout(() => anim.start(), delay)
    return () => {
      clearTimeout(t)
      anim.stop()
    }
  }, [v, delay, period])
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { width: size, height: size },
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
          transform: [
            { scale: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0.15] }) },
            { rotate: v.interpolate({ inputRange: [0, 2], outputRange: ['0deg', '70deg'] }) },
          ],
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="-50 -50 100 100">
        <Path d={TWINKLE_PATH} fill={color} />
        <Circle r={7} fill={WHITE} />
      </Svg>
    </Animated.View>
  )
}

/** A static twinkle (no loop), for stickers and accents. */
export function TwinkleShape({ size, color = WHITE }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="-50 -50 100 100">
      <Path d={TWINKLE_PATH} fill={color} />
      <Circle r={7} fill={WHITE} />
    </Svg>
  )
}

// ── The pool ────────────────────────────────────────────────────────────────

/**
 * Painted caustics: the bright ridges of the water's light drawn as wobbly
 * white contour lines (marching squares over a warped wave field, sampled in
 * perspective so the cells grow toward the near edge). The same construction
 * as the stage's pool.
 */
export function causticPaths(seed: number, width: number, height: number, level: number, scale = 1): Array<{ d: string; w: number }> {
  const r = rng(seed)
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28]
  const step = 5
  const nx = Math.ceil(width / step) + 1
  const ny = Math.ceil(height / step) + 1
  const size = (y: number) => (12 + 44 * Math.pow(Math.max(0, y) / height, 1.1)) * scale
  const wy = new Float32Array(ny)
  let acc = 0
  for (let j = 0; j < ny; j++) {
    wy[j] = acc
    acc += step / size(j * step)
  }
  const field = new Float32Array(nx * ny)
  for (let j = 0; j < ny; j++) {
    const sz = size(j * step)
    for (let i = 0; i < nx; i++) {
      const x = (i * step) / sz
      const y = wy[j] * 1.9
      field[j * nx + i] =
        Math.sin(x + 1.5 * Math.sin(y * 0.9 + ph[0])) +
        Math.sin(y * 1.2 + 1.3 * Math.sin(x * 0.75 + ph[1])) +
        0.55 * Math.sin((x - y) * 0.62 + ph[2] + 0.8 * Math.sin(x * 0.31 + ph[3]))
    }
  }
  const bands: string[][] = [[], [], []]
  const lerp = (a: number, b: number) => (level - a) / (b - a)
  for (let j = 0; j < ny - 1; j++) {
    const out = bands[Math.min(2, Math.floor(((j * step) / height) * 3))]
    for (let i = 0; i < nx - 1; i++) {
      const a = field[j * nx + i]
      const b = field[j * nx + i + 1]
      const c = field[(j + 1) * nx + i + 1]
      const d = field[(j + 1) * nx + i]
      const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0)
      if (idx === 0 || idx === 15) continue
      const x0 = i * step
      const y0 = j * step
      const top: [number, number] = [x0 + lerp(a, b) * step, y0]
      const right: [number, number] = [x0 + step, y0 + lerp(b, c) * step]
      const bottom: [number, number] = [x0 + lerp(d, c) * step, y0 + step]
      const left: [number, number] = [x0, y0 + lerp(a, d) * step]
      const seg = (p: [number, number], q: [number, number]) => out.push(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`)
      switch (idx) {
        case 1: case 14: seg(left, bottom); break
        case 2: case 13: seg(bottom, right); break
        case 3: case 12: seg(left, right); break
        case 4: case 11: seg(top, right); break
        case 6: case 9: seg(top, bottom); break
        case 7: case 8: seg(left, top); break
        case 5: seg(left, top); seg(bottom, right); break
        case 10: seg(top, right); seg(left, bottom); break
      }
    }
  }
  return bands.map((b, k) => ({ d: b.join(''), w: 1.1 + k * 0.9 }))
}

/** Painted pool water whose light lines sway slowly. */
export function PoolWater({ width, height, seed = 0.4, scale = 1 }: { width: number; height: number; seed?: number; scale?: number }) {
  const pad = 40
  const a = useMemo(() => causticPaths(seed, width + pad * 2, height, 1.05, scale), [seed, width, height, scale])
  const b = useMemo(() => causticPaths(seed + 0.37, width + pad * 2, height, 0.95, scale), [seed, width, height, scale])
  const swayA = useLoop(9000)
  const swayB = useLoop(13000, 1600)
  return (
    <View style={{ width, height, overflow: 'hidden' }} pointerEvents="none">
      <LinearGradient colors={['#7BDDEE', POOL, POOL_DEEP]} locations={[0, 0.25, 1]} style={StyleSheet.absoluteFill} />
      <Animated.View style={{ position: 'absolute', left: -pad, top: 0, opacity: 0.6, transform: [{ translateX: swayB.interpolate({ inputRange: [0, 1], outputRange: [16, -16] }) }] }}>
        <Svg width={width + pad * 2} height={height}>
          {b.map((p, k) => (
            <Path key={k} d={p.d} stroke="#BEEFFA" strokeWidth={p.w * 0.8} fill="none" strokeLinecap="round" />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: -pad, top: 0, transform: [{ translateX: swayA.interpolate({ inputRange: [0, 1], outputRange: [-16, 16] }) }] }}>
        <Svg width={width + pad * 2} height={height}>
          {a.map((p, k) => (
            <Path key={k} d={p.d} stroke={POOL_LINE} strokeWidth={p.w} fill="none" strokeLinecap="round" />
          ))}
        </Svg>
      </Animated.View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.5)' }} />
    </View>
  )
}

// ── Awnings ─────────────────────────────────────────────────────────────────

/**
 * A candy-striped awning seen from the front: the canopy (stripes narrowing a
 * touch toward the wall, shaded as they recede), a white piping at the fold,
 * and the valance hanging below in the same stripes, ending in scallops.
 * `drop` (0..1) is how far the valance is let down: a selected genre's awning
 * is unrolled, the rest are furled up short.
 */
export function Awning({
  width,
  canopy = 16,
  valance = 10,
  scallop = 6,
  stripes = STRIPES[0],
  stripeW = 9,
}: {
  width: number
  canopy?: number
  valance?: number
  scallop?: number
  stripes?: [string, string]
  stripeW?: number
}) {
  const id = useUid('baw')
  const h = canopy + 3 + valance + scallop
  const n = Math.ceil(width / stripeW) + 1
  const inset = Math.min(5, width * 0.04)
  const canopyPath = `M ${inset} 0 L ${width - inset} 0 L ${width} ${canopy} L 0 ${canopy} Z`
  return (
    <Svg width={width} height={h}>
      <Defs>
        <ClipPath id={`${id}c`}>
          <Path d={canopyPath} />
        </ClipPath>
        <ClipPath id={`${id}v`}>
          <Path d={valancePath(width, canopy + 3, valance, scallop)} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id}c)`}>
        <Rect x={0} y={0} width={width} height={canopy} fill={stripes[1]} />
        {Array.from({ length: n }, (_, i) =>
          i % 2 === 0 ? (
            // stripes fan out a little from the wall to the fold
            <Path key={i} d={`M ${i * stripeW * 0.92 + inset * 0.6} 0 L ${(i + 1) * stripeW * 0.92 + inset * 0.6} 0 L ${(i + 1) * stripeW} ${canopy} L ${i * stripeW} ${canopy} Z`} fill={stripes[0]} />
          ) : null,
        )}
        <Rect x={0} y={0} width={width} height={canopy} fill="rgba(122,16,78,0.16)" opacity={0.9} />
        <Rect x={0} y={canopy * 0.55} width={width} height={canopy * 0.45} fill="rgba(255,255,255,0.12)" />
      </G>
      {/* the white piping at the fold */}
      <Rect x={0} y={canopy} width={width} height={3} fill={WHITE} />
      <G clipPath={`url(#${id}v)`}>
        <Rect x={0} y={canopy + 3} width={width} height={valance + scallop} fill={stripes[1]} />
        {Array.from({ length: n }, (_, i) => (i % 2 === 0 ? <Rect key={i} x={i * stripeW} y={canopy + 3} width={stripeW} height={valance + scallop} fill={stripes[0]} /> : null))}
        <Rect x={0} y={canopy + 3 + valance * 0.6} width={width} height={valance + scallop} fill="rgba(122,16,78,0.08)" />
      </G>
    </Svg>
  )
}

// ── Singers ─────────────────────────────────────────────────────────────────

/** A singer as a little sun badge: their picture (or initial) in a white rim,
 *  ringed with scallops of their own colour. */
export function SingerSun({ color, picture, initial, size = 24 }: { color: string; picture?: string | null; initial: string; size?: number }) {
  const inner = size * 0.7
  const n = size >= 40 ? 16 : 12
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="-50 -50 100 100" style={StyleSheet.absoluteFill}>
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2
          return <Circle key={i} cx={Math.cos(a) * 40} cy={Math.sin(a) * 40} r={11} fill={color} />
        })}
        <Circle r={42} fill={color} />
        <Circle r={36} fill={WHITE} />
      </Svg>
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden', backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        {picture ? (
          <AvatarImage uri={picture} size={inner} />
        ) : (
          <Text style={display(inner * 0.5, luma(color) > 0.45 ? PLUM : WHITE, { lineHeight: inner * 0.62, paddingRight: 0 })}>{initial}</Text>
        )}
      </View>
    </View>
  )
}

function AvatarImage({ uri, size }: { uri: string; size: number }) {
  return <Image source={{ uri }} style={{ width: size, height: size }} />
}

/** A queue position as a sun: a scalloped yellow badge with the number on it. */
export function SunBadge({ n, size = 40, lit = false }: { n: number; size?: number; lit?: boolean }) {
  const s = String(n)
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="-50 -50 100 100" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2
          return <Circle key={i} cx={Math.cos(a) * 38} cy={Math.sin(a) * 38} r={12} fill={lit ? SUN : i % 2 ? '#FFE48A' : SUN} />
        })}
        <Circle r={40} fill={lit ? '#FFE48A' : SUN} />
        <Circle r={33} fill={lit ? SUN_HI : '#FFE48A'} />
        <Path d="M -22 -10 A 25 25 0 0 1 -4 -26" stroke={WHITE} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.75} />
      </Svg>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={display(s.length > 2 ? size * 0.3 : size * 0.4, lit ? PINK : PLUM, { lineHeight: size * 0.52, paddingRight: 0, textAlign: 'center', maxWidth: size * 0.7 })}
      >
        {s}
      </Text>
    </View>
  )
}
