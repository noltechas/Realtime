import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Image as SvgImage,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg'

// ── GOTHIC / "NOCTURNE": shared visual vocabulary ─────────────────────────
//
// The phone is a corner of the same cathedral the stage is: midnight, a storm
// outside, one candle's worth of warm light. Four materials and one light carry
// every atom, exactly as on the stage (packages/desktop/src/renderer/src/styles/
// gothic.ts):
//
//   1. STONE. Cold violet-black limestone. Every plaque is a carved tablet whose
//      corners are CUSPED, a concave quarter-round bitten out of each corner,
//      drawn as a measured SVG silhouette (see `Stone`). Its rim catches cold
//      moonlight along the top and warm candlelight along the bottom, because
//      those are the room's two lights. A moulded groove runs inside the rim.
//   2. IRON. Matte black, pewter catch-light. Rails, rules, the fence, the
//      lantern.
//   3. GLASS. Singer colours and album art are never paint: they are glazed into
//      windows (`GlassWindow`) and rose roundels (`Rose`), leaded and lit from
//      behind. When lightning strikes, every pane of glass on screen flares at
//      the same instant, because there is one storm (`useStorm`).
//   4. FLAME. The only warm light. Gold is never a metal in this theme; it is
//      always fire, so it flickers (`useFlicker`) and lights what is near it.
//
// Touch: stone doesn't bounce. A pressed plaque SINKS into the wall a couple of
// pixels and darkens, then settles back (`Press`), like a hidden switch.
//
// Ordinals are Roman numerals (`toRoman`). Copy never uses em dashes.

// ── palette ─────────────────────────────────────────────────────────────────
export const VOID = '#07060A'
export const CRYPT = '#0B0A0F'
export const STONE_DEEP = '#121017'
export const STONE = '#1B1822'
export const STONE_HI = '#28242F'
export const STONE_EDGE = '#3B3645'
export const STONE_LIGHT = '#6E6779'
export const IRON = '#0D0C10'
export const IRON_HI = '#4C4755'
export const BONE = '#E8DFCC'
export const BONE_DIM = '#B8AE9B'
export const PEWTER = '#968C9E'
export const ASH = '#5E5766'
export const CANDLE = '#E3B04B'
export const FLAME = '#F6D27E'
export const FLAME_CORE = '#FFF5DC'
export const EMBER = '#D46F22'
export const BLOOD = '#C3203A'
export const WAX = '#8C1223'
export const MOON = '#AFC3EA'
export const MOON_DIM = '#56678B'
export const SPECTRE = '#86D6AE'
// Pot-metal glass, for panes that aren't a singer's.
export const RUBY = '#B3132F'
export const SAPPHIRE = '#1F3FA8'
export const EMERALD = '#167A4E'
export const AMETHYST = '#5F2FAE'
export const AMBER = '#C9821A'
export const GLASS = [RUBY, SAPPHIRE, EMERALD, AMETHYST, AMBER]

// ── type ────────────────────────────────────────────────────────────────────
// Registered in App.tsx's useFonts map.
export const FRAKTUR = 'UnifrakturMaguntia_400Regular'
export const GOTHIC_600 = 'GrenzeGotisch_600SemiBold'
export const GOTHIC_700 = 'GrenzeGotisch_700Bold'
export const GOTHIC_800 = 'GrenzeGotisch_800ExtraBold'
export const SERIF = 'CormorantGaramond_600SemiBold'
export const SERIF_BOLD = 'CormorantGaramond_700Bold'
export const SERIF_ITALIC = 'CormorantGaramond_600SemiBold_Italic'

/** True Fraktur, for headline moments. ALWAYS title case: blackletter set in
 *  capitals is illegible, so this never sets textTransform. */
export function fraktur(size: number, color: string = BONE, extra?: TextStyle): TextStyle {
  return {
    fontFamily: FRAKTUR,
    fontSize: size,
    lineHeight: Math.round(size * 1.18),
    color,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 2,
    ...extra,
  }
}

/** Grenze Gotisch, the reading blackletter: titles, names, labels. */
export function gothic(size: number, color: string = BONE, weight: 600 | 700 | 800 = 700, extra?: TextStyle): TextStyle {
  return {
    fontFamily: weight === 600 ? GOTHIC_600 : weight === 800 ? GOTHIC_800 : GOTHIC_700,
    fontSize: size,
    color,
    ...extra,
  }
}

/** Cormorant Garamond: prose, metadata, small capitals. */
export function serif(size: number, color: string = BONE_DIM, variant: 'semibold' | 'bold' | 'italic' = 'semibold', extra?: TextStyle): TextStyle {
  return {
    fontFamily: variant === 'bold' ? SERIF_BOLD : variant === 'italic' ? SERIF_ITALIC : SERIF,
    fontSize: size,
    color,
    ...extra,
  }
}

/** Small capitals in Cormorant: tracked out, for labels and status notes. */
export function smallCaps(size: number, color: string = PEWTER, extra?: TextStyle): TextStyle {
  return {
    fontFamily: SERIF_BOLD,
    fontSize: size,
    color,
    letterSpacing: size * 0.22,
    textTransform: 'uppercase',
    ...extra,
  }
}

// ── small helpers ───────────────────────────────────────────────────────────

const ROMAN: Array<[number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

/** Every ordinal in the theme is a Roman numeral, like a psalm or a chapter. */
export function toRoman(n: number): string {
  let v = Math.max(1, Math.floor(n))
  let out = ''
  for (const [k, s] of ROMAN) {
    while (v >= k) {
      out += s
      v -= k
    }
  }
  return out
}

/** Lehmer PRNG, for stable per-item speckle, cracks and wax. */
export function rng(seed: number): () => number {
  let state = Math.floor(Math.abs(seed)) % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
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

/** Arrival: rising out of the floor mist. */
export function useEnter(delay = 0, distance = 14) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const a = Animated.timing(v, {
      toValue: 1,
      duration: 620,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    })
    a.start()
    return () => a.stop()
  }, [v, delay])
  return {
    opacity: v,
    translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
  }
}

// ── The storm ───────────────────────────────────────────────────────────────
// ONE lightning clock for the whole app. Every pane of glass on screen binds
// its flare to this same native-driven value, so a strike lights the song
// cards, the stage art, the nave windows and the shafts across the floor in
// the same frame, and the watching eyes shut on it. The scheduler only runs
// while something on screen is listening.

const stormFlash = new Animated.Value(0)
let stormUsers = 0
let stormTimer: ReturnType<typeof setTimeout> | null = null
const strikeListeners = new Set<() => void>()

function scheduleStrike(first = false) {
  if (stormTimer) clearTimeout(stormTimer)
  stormTimer = setTimeout(strike, first ? 3500 + Math.random() * 3500 : 11000 + Math.random() * 17000)
}

function strike() {
  stormTimer = null
  // A real strike re-uses its channel: a hard first stroke, a weaker second,
  // a long fall back to dark.
  Animated.sequence([
    Animated.timing(stormFlash, { toValue: 1, duration: 40, useNativeDriver: true }),
    Animated.timing(stormFlash, { toValue: 0.16, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    Animated.timing(stormFlash, { toValue: 0.6, duration: 45, useNativeDriver: true }),
    Animated.timing(stormFlash, { toValue: 0, duration: 560, easing: Easing.out(Easing.quad), useNativeDriver: true }),
  ]).start()
  strikeListeners.forEach((fn) => fn())
  if (stormUsers > 0) scheduleStrike()
}

/** Subscribe to the storm. Returns the shared flash value (0..1, native). */
export function useStorm(onStrike?: () => void): Animated.Value {
  const cb = useRef(onStrike)
  cb.current = onStrike
  useEffect(() => {
    stormUsers += 1
    if (stormUsers === 1) scheduleStrike(true)
    const listener = () => cb.current?.()
    strikeListeners.add(listener)
    return () => {
      strikeListeners.delete(listener)
      stormUsers -= 1
      if (stormUsers <= 0) {
        stormUsers = 0
        if (stormTimer) clearTimeout(stormTimer)
        stormTimer = null
      }
    }
  }, [])
  return stormFlash
}

/** Candle flicker: a noisy random walk with the odd gutter, 0..1, native. A
 *  looping keyframe reads as a pulse by its second cycle; flame is noise. */
export function useFlicker(): Animated.Value {
  const v = useRef(new Animated.Value(0.85)).current
  useEffect(() => {
    let alive = true
    const step = () => {
      if (!alive) return
      const gutter = Math.random() < 0.05
      Animated.timing(v, {
        toValue: gutter ? 0.42 + Math.random() * 0.18 : 0.72 + Math.random() * 0.28,
        duration: gutter ? 90 : 70 + Math.random() * 170,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) step()
      })
    }
    step()
    return () => {
      alive = false
      v.stopAnimation()
    }
  }, [v])
  return v
}

/** Stone press: the plaque sinks into the wall and darkens, then settles. */
export function useSink(depth = 1) {
  const v = useRef(new Animated.Value(0)).current
  const onPressIn = () => {
    Animated.timing(v, { toValue: 1, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  }
  const onPressOut = () => {
    Animated.spring(v, { toValue: 0, stiffness: 330, damping: 16, mass: 0.6, useNativeDriver: true }).start()
  }
  // The transform array is ALWAYS present (values animate): a transform key that
  // flips to undefined crashes Fabric on press-out (see project notes).
  const transform = [
    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 1.8 * depth] }) },
    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1 - 0.022 * depth] }) },
  ]
  const shade = v.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] })
  return { v, transform, shade, onPressIn, onPressOut }
}

/** A Pressable whose child sinks like a stone switch. */
export function Press({
  children,
  style,
  outerStyle,
  depth = 1,
  radiusShade = 0,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /** Style for the Pressable itself (give it flex when the child must fill). */
  outerStyle?: StyleProp<ViewStyle>
  depth?: number
  /** Corner radius for the darkening overlay (0 keeps it square). */
  radiusShade?: number
}) {
  const { transform, shade, onPressIn, onPressOut } = useSink(depth)
  return (
    <Pressable {...rest} style={outerStyle} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform }]}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: shade, borderRadius: radiusShade }]}
        />
      </Animated.View>
    </Pressable>
  )
}

// ── geometry ────────────────────────────────────────────────────────────────

/**
 * A cusped rectangle: a concave quarter-round notch bitten out of every corner.
 * For an inner outline inset by d, the notches stay centred on the OUTER corners
 * and grow to r + d, which is what keeps a rim an even width round the curve.
 */
export function cuspPath(w: number, h: number, r: number, d = 0, ox = 0, oy = 0): string {
  const R = r + d
  const a = Math.sqrt(Math.max(0, R * R - d * d))
  const x0 = ox + d
  const y0 = oy + d
  const x1 = ox + w - d
  const y1 = oy + h - d
  return [
    `M ${ox + a} ${y0}`,
    `L ${ox + w - a} ${y0}`,
    `A ${R} ${R} 0 0 0 ${x1} ${oy + a}`,
    `L ${x1} ${oy + h - a}`,
    `A ${R} ${R} 0 0 0 ${ox + w - a} ${y1}`,
    `L ${ox + a} ${y1}`,
    `A ${R} ${R} 0 0 0 ${x0} ${oy + h - a}`,
    `L ${x0} ${oy + a}`,
    `A ${R} ${R} 0 0 0 ${ox + a} ${y0}`,
    'Z',
  ].join(' ')
}

/**
 * A pointed arch over straight jambs in a w×h box. `radius` is the arc radius as
 * a fraction of the span: 1 is the true equilateral lancet (tall), 0.75 a
 * blunter drop arch that suits a short card. The arcs are centred on the
 * springing line, so the apex is a real point, not a rounded peak.
 */
export function archPath(w: number, h: number, inset = 0, radius = 1, ox = 0, oy = 0): string {
  const x0 = ox + inset
  const x1 = ox + w - inset
  const span = x1 - x0
  const r = span * radius
  const half = span / 2
  const rise = Math.sqrt(Math.max(0, r * r - (r - half) * (r - half)))
  const spring = oy + inset + rise
  const mid = ox + w / 2
  const bottom = oy + h - inset
  return `M ${x0} ${bottom} L ${x0} ${spring} A ${r} ${r} 0 0 1 ${mid} ${oy + inset} A ${r} ${r} 0 0 1 ${x1} ${spring} L ${x1} ${bottom} Z`
}

/** Height of an arch's head (apex to springing) for a span, as `archPath` draws it. */
export function archRise(span: number, radius = 1): number {
  const r = span * radius
  const half = span / 2
  return Math.sqrt(Math.max(0, r * r - (r - half) * (r - half)))
}

// ── Stone: the carved plaque ────────────────────────────────────────────────

export type StoneTone = 'stone' | 'crypt' | 'wax' | 'lit'

const FACES: Record<StoneTone, Array<[number, string]>> = {
  stone: [[0, '#2C2834'], [0.4, '#1C1923'], [0.82, '#15121A'], [1, '#1E1714']],
  crypt: [[0, '#1B1821'], [0.5, '#110F15'], [0.85, '#0C0B0F'], [1, '#17100B']],
  // Sealing wax: the primary button.
  wax: [[0, '#B21C33'], [0.5, '#8C1223'], [1, '#56081A']],
  // Stone washed in candlelight (the active state of a niche).
  lit: [[0, '#3A2B22'], [0.5, '#2A1E17'], [1, '#3B2614']],
}

const RIMS: Record<StoneTone, Array<[number, string, number]>> = {
  stone: [[0, '#C4D2EE', 0.55], [0.2, '#3B3645', 1], [0.7, '#1C1922', 1], [1, '#E3B04B', 0.62]],
  crypt: [[0, '#AFC3EA', 0.42], [0.22, '#2C2834', 1], [0.72, '#141218', 1], [1, '#E3B04B', 0.5]],
  wax: [[0, '#FF9AA6', 0.55], [0.3, '#6E0D1C', 1], [1, '#2E0309', 1]],
  lit: [[0, '#FFE2A6', 0.6], [0.3, '#5A3B22', 1], [1, '#FFB45A', 0.8]],
}

export interface StoneProps {
  children?: React.ReactNode
  tone?: StoneTone
  cusp?: number
  groove?: boolean
  /** Seed for the speckle and the odd crack. */
  seed?: string
  /** Soft coloured light pooled in the stone (a singer's glass, a flame). */
  glow?: string
  /** Cast a contact shadow onto the wall behind. */
  shadow?: boolean
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
}

function seedOf(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 2147483646 + 1
}

/**
 * A carved stone tablet with cusped corners. The silhouette is a measured SVG
 * (stretching a viewBox would warp the notches and the rim). The shadow is
 * drawn as geometry behind the stone rather than with shadow props, which iOS
 * would rasterise from the content's alpha on every list row.
 */
export function Stone({
  children,
  tone = 'stone',
  cusp = 12,
  groove = true,
  seed = 'stone',
  glow,
  shadow = true,
  style,
  contentStyle,
}: StoneProps) {
  const [size, onLayout] = useMeasured()
  const id = useUid('gst')
  const PAD = 6 // room around the stone for the shadow to fall into
  const specks = useMemo(() => {
    if (!size) return null
    const r = rng(seedOf(seed))
    const n = Math.min(46, Math.round((size.w * size.h) / 420))
    const out: Array<{ x: number; y: number; s: number; o: number; light: boolean }> = []
    for (let i = 0; i < n; i++) {
      out.push({ x: 4 + r() * (size.w - 8), y: 4 + r() * (size.h - 8), s: 0.5 + r() * 1.1, o: 0.12 + r() * 0.22, light: r() < 0.35 })
    }
    // One stone in three carries a hairline crack across a corner.
    let crack: string | null = null
    if (r() < 0.34 && size.w > 60) {
      const fromLeft = r() < 0.5
      let x = fromLeft ? cusp * 0.6 : size.w - cusp * 0.6
      let y = 2 + r() * 6
      const pts = [`M ${x} ${y}`]
      for (let k = 0; k < 4; k++) {
        x += (fromLeft ? 1 : -1) * (5 + r() * 9)
        y += 3 + r() * 7
        pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`)
      }
      crack = pts.join(' ')
    }
    return { out, crack }
  }, [size, seed, cusp])

  return (
    <View style={style} onLayout={onLayout}>
      {size ? (
        <Svg
          pointerEvents="none"
          width={size.w + PAD * 2}
          height={size.h + PAD * 2}
          style={{ position: 'absolute', left: -PAD, top: -PAD }}
        >
          <Defs>
            <SvgLinearGradient id={`${id}f`} x1="0" y1="0" x2="0.18" y2="1">
              {FACES[tone].map(([o, c]) => <Stop key={o} offset={o} stopColor={c} />)}
            </SvgLinearGradient>
            <SvgLinearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
              {RIMS[tone].map(([o, c, a]) => <Stop key={o} offset={o} stopColor={c} stopOpacity={a} />)}
            </SvgLinearGradient>
            {glow ? (
              <RadialGradient id={`${id}g`} cx="50%" cy="100%" rx="70%" ry="95%">
                <Stop offset="0" stopColor={glow} stopOpacity={0.34} />
                <Stop offset="1" stopColor={glow} stopOpacity={0} />
              </RadialGradient>
            ) : null}
          </Defs>
          {shadow ? (
            <G>
              <Path d={cuspPath(size.w, size.h, cusp, 0, PAD, PAD + 4)} fill="#000" opacity={0.22} />
              <Path d={cuspPath(size.w, size.h, cusp, 0, PAD, PAD + 2)} fill="#000" opacity={0.3} />
            </G>
          ) : null}
          <Path d={cuspPath(size.w, size.h, cusp, 0, PAD, PAD)} fill={`url(#${id}r)`} />
          <Path d={cuspPath(size.w, size.h, cusp, 1.3, PAD, PAD)} fill={`url(#${id}f)`} />
          {glow ? <Path d={cuspPath(size.w, size.h, cusp, 1.3, PAD, PAD)} fill={`url(#${id}g)`} /> : null}
          {specks?.out.map((p, i) => (
            <Circle key={i} cx={PAD + p.x} cy={PAD + p.y} r={p.s} fill={p.light ? '#B9B0C6' : '#000'} opacity={p.light ? p.o * 0.6 : p.o} />
          ))}
          {specks?.crack ? (
            <G transform={`translate(${PAD} ${PAD})`}>
              <Path d={specks.crack} stroke="#000" strokeOpacity={0.6} strokeWidth={1} fill="none" />
              <Path d={specks.crack} stroke="#B9B0C6" strokeOpacity={0.12} strokeWidth={0.6} fill="none" transform="translate(0.6 0.8)" />
            </G>
          ) : null}
          {groove ? (
            <G>
              <Path d={cuspPath(size.w, size.h, cusp, 5.5, PAD, PAD)} stroke="#000" strokeOpacity={0.62} strokeWidth={1.3} fill="none" />
              <Path d={cuspPath(size.w, size.h, cusp, 6.8, PAD, PAD)} stroke={tone === 'wax' ? '#FF8A9A' : '#E3B04B'} strokeOpacity={tone === 'wax' ? 0.25 : 0.16} strokeWidth={0.9} fill="none" />
            </G>
          ) : null}
        </Svg>
      ) : null}
      <View style={contentStyle}>{children}</View>
    </View>
  )
}

// ── Glass: a window with a picture glazed into it ───────────────────────────

/**
 * A pointed-arch window whose glass is a picture: the art is clipped to the
 * arch, leaded into diamond quarries, given the uneven sheen of old glass and a
 * backlit fall-off toward the jambs, and it flares with the shared lightning.
 */
export function GlassWindow({
  width,
  height,
  uri,
  radius = 1,
  quarry = 22,
  frame = 0,
  flash,
  fallback,
}: {
  width: number
  height: number
  uri?: string | null
  /** Arch radius as a fraction of the span (1 = equilateral). */
  radius?: number
  /** Quarry (diamond) size in px; 0 = no leading. */
  quarry?: number
  /** Stone surround thickness drawn around the glass. */
  frame?: number
  flash?: Animated.Value
  /** Rendered as the glass when there's no art. */
  fallback?: React.ReactNode
}) {
  const id = useUid('gwin')
  const gw = width - frame * 2
  const gh = height - frame
  const glassPath = archPath(width, height + frame, frame, radius)
  const leads = useMemo(() => {
    if (!quarry) return ''
    const out: string[] = []
    const step = quarry
    const span = width + height
    for (let k = -span; k < span; k += step) {
      out.push(`M ${k} 0 L ${k + height * 0.62} ${height}`)
      out.push(`M ${k + height * 0.62} 0 L ${k} ${height}`)
    }
    return out.join(' ')
  }, [quarry, width, height])
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <ClipPath id={`${id}c`}>
            <Path d={glassPath} />
          </ClipPath>
          <SvgLinearGradient id={`${id}st`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3A3544" />
            <Stop offset="0.6" stopColor="#1E1B24" />
            <Stop offset="1" stopColor="#2A1F18" />
          </SvgLinearGradient>
          <SvgLinearGradient id={`${id}sheen`} x1="0" y1="0" x2="1" y2="0.2">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.36" stopColor="#FFFFFF" stopOpacity={0.12} />
            <Stop offset="0.44" stopColor="#FFFFFF" stopOpacity={0.02} />
            <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity={0.08} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </SvgLinearGradient>
          <RadialGradient id={`${id}fall`} cx="50%" cy="46%" rx="64%" ry="62%">
            <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.62} />
          </RadialGradient>
        </Defs>
        {frame > 0 ? <Path d={archPath(width, height, 0, radius)} fill={`url(#${id}st)`} /> : null}
        <G clipPath={`url(#${id}c)`}>
          <Rect x={0} y={0} width={width} height={height} fill="#0B0A10" />
          {uri ? (
            <SvgImage href={{ uri }} x={frame} y={frame} width={gw} height={gh} preserveAspectRatio="xMidYMid slice" />
          ) : null}
          <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}sheen)`} />
          {/* Leads: dark, but thin and only part-opaque, so the picture still
              reads through the glazing instead of behind a fence. */}
          {quarry ? <Path d={leads} stroke="#060508" strokeOpacity={0.5} strokeWidth={1} fill="none" /> : null}
          <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}fall)`} />
        </G>
        <Path d={glassPath} stroke="#060508" strokeWidth={2.4} fill="none" />
        <Path d={glassPath} stroke="#AFC3EA" strokeOpacity={0.22} strokeWidth={0.8} fill="none" />
      </Svg>
      {!uri && fallback ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{fallback}</View>
      ) : null}
      {flash ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }) }]}>
          <Svg width={width} height={height}>
            <Path d={glassPath} fill="#D8E0FF" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  )
}

// ── Rose window ─────────────────────────────────────────────────────────────

export function rosePetal(cx: number, cy: number, rIn: number, rOut: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => `${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`
  const am = (a0 + a1) / 2
  const span = a1 - a0
  const shoulder = rOut * 0.84
  // Straight sides out from the hub, closing in a POINTED arch at the rim: each
  // side's curve leaves its shoulder heading straight outward (its control
  // point sits out along the side), so the two meet at the tip at an angle, the
  // way a lancet's arcs do, instead of rounding over into a lozenge.
  return [
    `M ${p(rIn, a0 + span * 0.14)}`,
    `L ${p(shoulder, a0 + span * 0.06)}`,
    `Q ${p(rOut * 0.97, a0 + span * 0.06)} ${p(rOut, am)}`,
    `Q ${p(rOut * 0.97, a1 - span * 0.06)} ${p(shoulder, a1 - span * 0.06)}`,
    `L ${p(rIn, a1 - span * 0.14)}`,
    'Z',
  ].join(' ')
}

/** A leaded roundel of glass in one colour, lit from behind. */
export function GlassDot({ color, size = 14 }: { color: string; size?: number }) {
  const id = useUid('gdot')
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="38%" cy="34%" rx="70%" ry="70%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
          <Stop offset="0.35" stopColor={color} />
          <Stop offset="1" stopColor={mix(color, '#000000', 0.45)} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={`url(#${id})`} stroke="#060508" strokeWidth={1.6} />
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 0.4} fill="none" stroke="#AFC3EA" strokeOpacity={0.3} strokeWidth={0.6} />
    </Svg>
  )
}

/** A singer as a saint in a roundel: their photo (or initial) in the oculus of
 *  a small rose window glazed in their colour. */
export function SingerRoundel({ color, picture, initial, size = 30 }: { color: string; picture?: string | null; initial: string; size?: number }) {
  const id = useUid('srnd')
  const c = size / 2
  const rOut = c - 0.5
  const rIn = c * 0.56
  const petals = 8
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`${id}g`} cx="50%" cy="50%" rx="60%" ry="60%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.6} />
            <Stop offset="0.4" stopColor={color} />
            <Stop offset="1" stopColor={mix(color, '#000000', 0.4)} />
          </RadialGradient>
          <ClipPath id={`${id}c`}>
            <Circle cx={c} cy={c} r={rIn - 1} />
          </ClipPath>
        </Defs>
        <Circle cx={c} cy={c} r={rOut} fill="#07060A" stroke="#3B3645" strokeWidth={1} />
        {Array.from({ length: petals }, (_, i) => {
          const a0 = (i / petals) * Math.PI * 2 - Math.PI / 2
          const a1 = ((i + 1) / petals) * Math.PI * 2 - Math.PI / 2
          return <Path key={i} d={rosePetal(c, c, rIn, rOut - 1, a0, a1)} fill={`url(#${id}g)`} stroke="#060508" strokeWidth={size > 40 ? 1.4 : 0.9} />
        })}
        <Circle cx={c} cy={c} r={rIn} fill="#0A090D" stroke="#060508" strokeWidth={1.4} />
        {picture ? (
          <SvgImage href={{ uri: picture }} x={c - rIn + 1} y={c - rIn + 1} width={(rIn - 1) * 2} height={(rIn - 1) * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}c)`} />
        ) : null}
      </Svg>
      {!picture ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Animated.Text style={fraktur(Math.round(size * 0.36), BONE, { lineHeight: Math.round(size * 0.44), textShadowRadius: 1 })}>
            {initial}
          </Animated.Text>
        </View>
      ) : null}
    </View>
  )
}

// ── Iron ────────────────────────────────────────────────────────────────────

/** A wrought-iron rule with scrolled terminals and a quatrefoil boss. */
export function IronRule({ width = 160, color = IRON_HI, lit = true }: { width?: number; color?: string; lit?: boolean }) {
  const m = width / 2
  const id = useUid('grule')
  return (
    <Svg width={width} height={16}>
      <Defs>
        <SvgLinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity={0} />
          <Stop offset="0.2" stopColor={color} stopOpacity={0.95} />
          <Stop offset="0.8" stopColor={color} stopOpacity={0.95} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>
      <Path d={`M 0 8 L ${m - 16} 8 M ${m + 16} 8 L ${width} 8`} stroke={`url(#${id})`} strokeWidth={1.4} />
      <Path d={`M ${m - 16} 8 C ${m - 22} 2, ${m - 31} 4, ${m - 29} 8 C ${m - 27.5} 11, ${m - 23} 10.5, ${m - 24} 8`} stroke={color} strokeWidth={1.3} fill="none" />
      <Path d={`M ${m + 16} 8 C ${m + 22} 2, ${m + 31} 4, ${m + 29} 8 C ${m + 27.5} 11, ${m + 23} 10.5, ${m + 24} 8`} stroke={color} strokeWidth={1.3} fill="none" />
      {[0, 90, 180, 270].map((a) => (
        <Circle key={a} cx={m + Math.cos((a * Math.PI) / 180) * 3.8} cy={8 + Math.sin((a * Math.PI) / 180) * 3.8} r={3.4} fill="none" stroke={color} strokeWidth={1.2} />
      ))}
      <Circle cx={m} cy={8} r={1.8} fill={lit ? CANDLE : color} />
    </Svg>
  )
}

// ── Flame & candle ──────────────────────────────────────────────────────────

/** A candle flame on its own: blue root, gold body, white core, and a halo.
 *  Driven by a flicker value; `lit` 0..1 can grow it in or snuff it out. */
export function Flame({ size = 18, flicker, lit, halo = 1 }: { size?: number; flicker: Animated.Value; lit?: Animated.Value | Animated.AnimatedInterpolation<number>; halo?: number }) {
  const id = useUid('gfl')
  const w = size * 0.62
  const h = size * 1.5
  const scaleY = lit ? Animated.multiply(flicker, lit) : flicker
  return (
    <View style={{ width: size * 3 * halo, height: h * 1.6, alignItems: 'center', justifyContent: 'flex-end' }} pointerEvents="none">
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 3 * halo,
          height: size * 3 * halo,
          bottom: -size * 0.6 * halo,
          opacity: Animated.multiply(flicker, lit ?? 1).interpolate({ inputRange: [0, 1], outputRange: [0, 0.95] }),
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={`${id}h`} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#FFC870" stopOpacity={0.55} />
              <Stop offset="0.35" stopColor="#E3963C" stopOpacity={0.2} />
              <Stop offset="1" stopColor="#C2501A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx="50%" cy="50%" r="50%" fill={`url(#${id}h)`} />
        </Svg>
      </Animated.View>
      <Animated.View style={{ width: w, height: h, transform: [{ translateY: h / 2 }, { scaleY }, { translateY: -h / 2 }] }}>
        <Svg width={w} height={h} viewBox="0 0 40 100">
          <Defs>
            <RadialGradient id={`${id}b`} cx="50%" cy="72%" rx="62%" ry="62%">
              <Stop offset="0" stopColor="#FFF6DE" />
              <Stop offset="0.3" stopColor="#FFD77A" />
              <Stop offset="0.62" stopColor="#F29A2E" />
              <Stop offset="0.9" stopColor="#C2501A" stopOpacity={0.5} />
              <Stop offset="1" stopColor="#8A2A0C" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Path d="M20 2 C 27 22 38 44 36 66 C 34.5 84 27 98 20 98 C 13 98 5.5 84 4 66 C 2 44 13 22 20 2 Z" fill={`url(#${id}b)`} />
          <Path d="M20 38 C 24 52 28 62 27 74 C 26 86 23 93 20 93 C 17 93 14 86 13 74 C 12 62 16 52 20 38 Z" fill="#FFF8E8" opacity={0.85} />
          <Ellipse cx="20" cy="93" rx="9" ry="6" fill="#4A6AD8" opacity={0.65} />
        </Svg>
      </Animated.View>
    </View>
  )
}

const WAXES: Record<'ivory' | 'blood' | 'black', [string, string, string, string]> = {
  ivory: ['#7E6F57', '#D9CBAA', '#F3E9D2', '#EBDDBE'],
  blood: ['#3C0710', '#8E1426', '#C83A4B', '#A51E31'],
  black: ['#09080B', '#24202A', '#4A4452', '#2E2935'],
}

/** A candle: lit cylinder of wax with seeded drips, a melted pool, a wick. */
export function CandleWax({ width, height, wax = 'ivory', seed = 3, lit = true }: { width: number; height: number; wax?: keyof typeof WAXES; seed?: number; lit?: boolean }) {
  const id = useUid('gwax')
  const [shade, mid, light, drip] = WAXES[wax]
  const drips = useMemo(() => {
    const r = rng(seed * 7919 + 13)
    const n = 2 + Math.floor(r() * 2)
    return Array.from({ length: n }, () => {
      const x = width * (0.12 + r() * 0.76)
      const dw = width * (0.12 + r() * 0.12)
      const len = height * (0.15 + r() * 0.38)
      return `M ${x - dw / 2} 3 L ${x - dw / 2} ${3 + len - dw * 0.6} Q ${x - dw / 2} ${3 + len + dw * 0.5} ${x} ${3 + len + dw * 0.4} Q ${x + dw / 2} ${3 + len + dw * 0.5} ${x + dw / 2} ${3 + len - dw * 0.6} L ${x + dw / 2} 3 Z`
    })
  }, [seed, width, height])
  return (
    <Svg width={width} height={height + 4} style={{ overflow: 'visible' }}>
      <Defs>
        <SvgLinearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={shade} />
          <Stop offset="0.22" stopColor={mid} />
          <Stop offset="0.4" stopColor={light} />
          <Stop offset="0.66" stopColor={mid} />
          <Stop offset="1" stopColor={shade} />
        </SvgLinearGradient>
        <SvgLinearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFB45A" stopOpacity={lit ? 0.45 : 0} />
          <Stop offset="0.35" stopColor="#FFB45A" stopOpacity={lit ? 0.1 : 0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.5} />
        </SvgLinearGradient>
      </Defs>
      <Rect x={0} y={3} width={width} height={height} fill={`url(#${id}c)`} />
      {drips.map((d, i) => <Path key={i} d={d} fill={drip} opacity={0.9} />)}
      <Rect x={0} y={3} width={width} height={height} fill={`url(#${id}w)`} />
      <Ellipse cx={width / 2} cy={4} rx={width / 2} ry={Math.max(1.6, width * 0.14)} fill={lit ? '#FFE3A6' : mid} />
      <Path d={`M ${width / 2} 4 q 1 -3 -0.6 -6`} stroke="#1A120C" strokeWidth={Math.max(1.2, width * 0.08)} fill="none" strokeLinecap="round" />
    </Svg>
  )
}

/** A whole lit candle: wax with its flickering flame standing on the wick. */
export function Candle({ width = 12, height = 30, wax = 'ivory', seed = 1, halo = 1 }: { width?: number; height?: number; wax?: keyof typeof WAXES; seed?: number; halo?: number }) {
  const flicker = useFlicker()
  const flameSize = width * 0.95
  return (
    <View style={{ alignItems: 'center', width: Math.max(width, flameSize * 3 * halo) }} pointerEvents="none">
      <View style={{ marginBottom: -flameSize * 0.42 }}>
        <Flame size={flameSize} flicker={flicker} halo={halo} />
      </View>
      <CandleWax width={width} height={height} wax={wax} seed={seed} />
    </View>
  )
}

// ── Wax seal ────────────────────────────────────────────────────────────────

export function WaxSeal({ size = 60, sigil = 'hourglass', children }: { size?: number; sigil?: 'hourglass' | 'skull' | 'cross' | 'none'; children?: React.ReactNode }) {
  const id = useUid('gseal')
  const blob = useMemo(() => {
    const pts: string[] = []
    const n = 22
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const r = 46 + Math.sin(i * 2.7) * 2.6 + Math.cos(i * 5.3) * 1.8
      pts.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`)
    }
    return `M ${pts.join(' L ')} Z`
  }, [])
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={id} cx="38%" cy="32%" rx="70%" ry="70%">
            <Stop offset="0" stopColor="#E0445A" />
            <Stop offset="0.45" stopColor={WAX} />
            <Stop offset="1" stopColor="#3E0610" />
          </RadialGradient>
        </Defs>
        <Path d={blob} fill="#000" opacity={0.35} transform="translate(0 3)" />
        <Path d={blob} fill={`url(#${id})`} />
        <Circle cx={50} cy={50} r={33} fill="none" stroke="#4A0812" strokeWidth={3} />
        <Circle cx={50} cy={50} r={31} fill="none" stroke="#FF96A2" strokeOpacity={0.35} strokeWidth={1.2} />
        {sigil === 'hourglass' ? (
          <Path d="M38 32 H62 M38 68 H62 M40 32 C 40 44 50 46 50 50 C 50 54 40 56 40 68 M60 32 C 60 44 50 46 50 50 C 50 54 60 56 60 68" stroke="#4A0812" strokeWidth={3.4} fill="none" strokeLinejoin="round" />
        ) : null}
        {sigil === 'cross' ? <Path d="M50 30 V70 M38 44 H62" stroke="#4A0812" strokeWidth={5} strokeLinecap="round" /> : null}
        {sigil === 'skull' ? (
          <G>
            <Path d="M50 30 C 37 30 32 39 33 48 C 33.5 53 36 55 37 57 L 37 63 L 63 63 L 63 57 C 64 55 66.5 53 67 48 C 68 39 63 30 50 30 Z" fill="#4A0812" />
            <Circle cx={43.5} cy={47} r={4.6} fill="#B01A30" />
            <Circle cx={56.5} cy={47} r={4.6} fill="#B01A30" />
            <Path d="M50 52 L 47.5 57 H 52.5 Z" fill="#B01A30" />
          </G>
        ) : null}
        <Path d="M28 34 Q 36 22 52 21" stroke="#FFD2D6" strokeOpacity={0.55} strokeWidth={3} fill="none" strokeLinecap="round" />
      </Svg>
      {children ? <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View> : null}
    </View>
  )
}

// ── Watching eyes ───────────────────────────────────────────────────────────

/** A pair of eyes in the dark. They open slowly, blink at uneven intervals,
 *  look around, and shut the instant lightning lights the room. */
export function Watcher({ size = 34, color = '#E9A23B', rest = [14000, 30000], stay = [4500, 8000] }: { size?: number; color?: string; rest?: [number, number]; stay?: [number, number] }) {
  const open = useRef(new Animated.Value(0)).current
  const look = useRef(new Animated.Value(0)).current
  const alive = useRef(true)
  const flinch = () => {
    open.stopAnimation()
    Animated.timing(open, { toValue: 0, duration: 70, useNativeDriver: true }).start()
  }
  useStorm(flinch)
  useEffect(() => {
    alive.current = true
    let t: ReturnType<typeof setTimeout>
    const between = (a: number, b: number) => a + Math.random() * (b - a)
    const cycle = () => {
      if (!alive.current) return
      Animated.sequence([
        Animated.timing(open, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(between(1200, 2200)),
        Animated.timing(open, { toValue: 0.05, duration: 70, useNativeDriver: true }),
        Animated.timing(open, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.delay(between(stay[0], stay[1]) - 2400),
        Animated.timing(open, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start()
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(look, { toValue: Math.random() < 0.5 ? 1 : -1, duration: 160, useNativeDriver: true }),
        Animated.delay(between(900, 1800)),
        Animated.timing(look, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start()
      t = setTimeout(cycle, between(rest[0], rest[1]) + stay[1])
    }
    t = setTimeout(cycle, between(rest[0] * 0.3, rest[0]))
    return () => {
      alive.current = false
      clearTimeout(t)
      open.stopAnimation()
      look.stopAnimation()
    }
  }, [open, look, rest, stay])
  const eye = (k: number) => (
    <Animated.View key={k} style={{ width: size * 0.4, height: size * 0.2, transform: [{ scaleY: open.interpolate({ inputRange: [0, 1], outputRange: [0.02, 1] }) }] }}>
      <Svg width={size * 0.4} height={size * 0.2} viewBox="0 0 40 20">
        <Path d={k === 0 ? 'M1 11 Q 18 -2 39 8 Q 22 22 1 11 Z' : 'M1 8 Q 22 -2 39 11 Q 18 22 1 8 Z'} fill={color} />
      </Svg>
      <Animated.View
        style={{
          position: 'absolute',
          top: size * 0.02,
          left: size * 0.18 - size * 0.025,
          width: size * 0.05,
          height: size * 0.16,
          borderRadius: size * 0.03,
          backgroundColor: '#050203',
          transform: [{ translateX: look.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.07, size * 0.07] }) }],
        }}
      />
    </Animated.View>
  )
  return (
    <Animated.View pointerEvents="none" style={{ flexDirection: 'row', gap: size * 0.14, opacity: open }}>
      <View style={{ position: 'absolute', left: -size * 0.4, top: -size * 0.45, width: size * 1.8, height: size * 1.1, opacity: 0.55 }}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="gwatch" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={color} stopOpacity={0.4} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#gwatch)" />
        </Svg>
      </View>
      {eye(0)}
      {eye(1)}
    </Animated.View>
  )
}
