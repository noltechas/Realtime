import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop, Text as SvgText, TextPath } from 'react-native-svg'

// ── SPACE / "GOLDEN RECORD": shared visual vocabulary ─────────────────────
//
// In 1977 the two Voyager probes left for interstellar space carrying a gold
// record of the sounds and music of Earth. The phone is a piece of that record
// and the deep space it sails through, the same as the stage (packages/desktop/
// src/renderer/src/styles/space.ts). Four materials carry every atom:
//
//   1. DEEP SPACE. One pre-rendered deep field (assets/space/deep-field.jpg,
//      from scripts/generate-space-assets.py) behind every screen: the dusty
//      Milky Way, a faint nebula, stars in their true colours. Live stars
//      twinkle over it.
//   2. GOLD. The record (`GoldenRecord`): satin anodized gold cut with fine
//      grooves, drawn from two images (the disc, and the lamp's bowtie sheen
//      kept still above it, so when a record turns only its label moves).
//      Images, not SVG grooves: a song list mounts a hundred of these.
//   3. ETCHED LINE. Ornament is hairline gold engraving in the cover's
//      language: binary tick marks (`BinaryMarks`), registration ticks in the
//      corners of every black-glass panel (`GlassPanel`), the probe itself.
//   4. STARLIGHT. Light is the eight-pointed star of a deep-field photograph
//      (`Star`). A singer's colour is the colour of their star.
//
// Type: Jost (geometric, in the tradition of Futura, the face on the Apollo 11
// plaque), light and widely tracked for display; IBM Plex Mono for every
// number, code and coordinate. Copy never uses em dashes.

// ── palette ─────────────────────────────────────────────────────────────────
export const VOID = '#020308'
export const VOID_2 = '#05060C'
export const GLASS = '#080A12'
export const GLASS_HI = '#10131D'
export const GOLD_SHADOW = '#4A3612'
export const GOLD_DEEP = '#9C7A33'
export const GOLD = '#E9C46A'
export const GOLD_HI = '#F6DE9A'
export const GOLD_SHEEN = '#FFF4D2'
export const STAR = '#ECE6D8'
export const STAR_DIM = '#B7B2A6'
export const DUST = '#8A8EA3'
export const DUST_DIM = '#5D6175'
export const STAR_BLUE = '#A9C3FF'
export const STAR_RED = '#FFB08A'
export const OIII = '#5FD6C8'
export const PALE_BLUE = '#8FB4FF'
export const INK = '#1A1206' // the dark engraved into gold

export const ETCH = {
  strong: 'rgba(233,196,106,0.62)',
  mid: 'rgba(233,196,106,0.36)',
  faint: 'rgba(233,196,106,0.18)',
}

// ── images ──────────────────────────────────────────────────────────────────
export const SKY_IMAGE = require('../../../../../assets/space/deep-field.jpg')
export const DISC_IMAGE = require('../../../../../assets/space/record-disc.png')
export const SHEEN_IMAGE = require('../../../../../assets/space/record-sheen.png')
export const STATIC_IMAGE = require('../../../../../assets/space/static.png')

// ── type ────────────────────────────────────────────────────────────────────
// Registered in App.tsx's useFonts map.
export const JOST_300 = 'Jost_300Light'
export const JOST_400 = 'Jost_400Regular'
export const JOST_500 = 'Jost_500Medium'
export const JOST_600 = 'Jost_600SemiBold'
export const MONO = 'IBMPlexMono_500Medium'
export const MONO_400 = 'IBMPlexMono_400Regular'

/** Jost display: widely tracked capitals. */
export function display(size: number, color: string = STAR, weight: 300 | 400 | 500 | 600 = 300, extra?: TextStyle): TextStyle {
  return {
    fontFamily: weight === 300 ? JOST_300 : weight === 400 ? JOST_400 : weight === 500 ? JOST_500 : JOST_600,
    fontSize: size,
    color,
    letterSpacing: size * 0.16,
    textTransform: 'uppercase',
    ...extra,
  }
}

/** Jost for reading: names, titles in lists, prose. */
export function body(size: number, color: string = STAR, weight: 400 | 500 | 600 = 400, extra?: TextStyle): TextStyle {
  return {
    fontFamily: weight === 400 ? JOST_400 : weight === 500 ? JOST_500 : JOST_600,
    fontSize: size,
    color,
    ...extra,
  }
}

/** IBM Plex Mono telemetry: numbers, codes, small labels. */
export function mono(size: number, color: string = DUST, extra?: TextStyle): TextStyle {
  return {
    fontFamily: MONO,
    fontSize: size,
    color,
    letterSpacing: size * 0.2,
    textTransform: 'uppercase',
    ...extra,
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** Seeded PRNG (mulberry32). */
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

let uid = 0
/** Stable, SVG-safe unique id (React's useId emits colons, which break url(#…)). */
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

/** A number in the record cover's binary notation, most significant first. */
export function binaryDigits(n: number, bits = 0): Array<0 | 1> {
  return Math.max(0, Math.floor(n))
    .toString(2)
    .padStart(bits, '0')
    .split('')
    .map((c) => (c === '1' ? 1 : 0))
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

/** Arrival: things fade up out of the dark, slow and unbouncy. */
export function useEnter(delay = 0, distance = 10) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: 700, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    a.start()
    return () => a.stop()
  }, [v, delay])
  return {
    opacity: v,
    translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
  }
}

/** A gentle press: the plate settles in a little, and springs back. */
export function Press({
  children,
  style,
  outerStyle,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /** Style for the Pressable itself (give it flex when the child must fill). */
  outerStyle?: StyleProp<ViewStyle>
}) {
  const v = useRef(new Animated.Value(0)).current
  const onPressIn = () => Animated.timing(v, { toValue: 1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  const onPressOut = () => Animated.spring(v, { toValue: 0, stiffness: 320, damping: 18, mass: 0.6, useNativeDriver: true }).start()
  // The transform array is ALWAYS present (values animate): a transform that
  // flips to undefined crashes Fabric on press-out (see project notes).
  const transform = [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.972] }) }]
  return (
    <Pressable {...rest} style={outerStyle} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform }]}>
        {children}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: GOLD, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 0.07] }) }]} />
      </Animated.View>
    </Pressable>
  )
}

// ── Starlight ───────────────────────────────────────────────────────────────

/** Spike paths for the eight-pointed star in a -50..50 box. */
const SPIKES = (() => {
  const spike = (a: number, len: number, w: number) => {
    const r = (a * Math.PI) / 180
    const x = Math.cos(r)
    const y = Math.sin(r)
    const px = -y * w
    const py = x * w
    return `M ${px.toFixed(2)} ${py.toFixed(2)} L ${(x * len).toFixed(2)} ${(y * len).toFixed(2)} L ${(-px).toFixed(2)} ${(-py).toFixed(2)} L ${(-x * len).toFixed(2)} ${(-y * len).toFixed(2)} Z`
  }
  return [spike(90, 50, 1.7), spike(30, 50, 1.7), spike(150, 50, 1.7), spike(0, 28, 1.2)]
})()

/** The eight-pointed deep-field star: six long spikes from a hexagonal
 *  mirror, two short ones from the struts, a hot white core. */
export function Star({ size, color = STAR, core = 1 }: { size: number; color?: string; core?: number }) {
  const id = useUid('sps')
  return (
    <Svg width={size} height={size} viewBox="-50 -50 100 100">
      <Defs>
        <RadialGradient id={id} cx="0" cy="0" r="24" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
          <Stop offset="0.25" stopColor={color} stopOpacity={0.95 * core} />
          <Stop offset="0.6" stopColor={color} stopOpacity={0.28 * core} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {SPIKES.map((d, i) => (
        <Path key={i} d={d} fill={color} opacity={0.9} />
      ))}
      <Circle r={24} fill={`url(#${id})`} />
      <Circle r={4.5} fill="#FFFFFF" />
    </Svg>
  )
}

/** A star that breathes: a slow, slight swell, now and then a brighter catch. */
export function Twinkle({ size, color = STAR, delay = 0, period = 4200, style }: { size: number; color?: string; delay?: number; period?: number; style?: StyleProp<ViewStyle> }) {
  const v = useLoop(period, delay)
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { width: size, height: size },
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.06] }) }],
        },
      ]}
    >
      <Star size={size} color={color} />
    </Animated.View>
  )
}

// ── Etched notation ─────────────────────────────────────────────────────────

/** A number in the cover's notation: | for 1, - for 0. */
export function BinaryMarks({ n, bits = 0, height = 10, gap = 3, color = ETCH.strong }: { n: number; bits?: number; height?: number; gap?: number; color?: string }) {
  const digits = binaryDigits(n, bits)
  const w = height * 0.62
  const total = digits.length * w + (digits.length - 1) * gap
  return (
    <Svg width={total} height={height}>
      {digits.map((d, i) => {
        const x = i * (w + gap) + w / 2
        return d === 1 ? (
          <Line key={i} x1={x} y1={0.8} x2={x} y2={height - 0.8} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
        ) : (
          <Line key={i} x1={x - w / 2 + 0.6} y1={height / 2} x2={x + w / 2 - 0.6} y2={height / 2} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
        )
      })}
    </Svg>
  )
}

/** A hairline rule with ticks, fading out at both ends. */
export function EtchedRule({ width, color = ETCH.mid }: { width: number; color?: string }) {
  return (
    <View style={{ width, height: 9, justifyContent: 'center' }}>
      <LinearGradient
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        colors={['rgba(233,196,106,0)', color, color, 'rgba(233,196,106,0)']}
        locations={[0, 0.18, 0.82, 1]}
        style={{ height: 1 }}
      />
      <Svg width={width} height={9} style={StyleSheet.absoluteFill}>
        {[0.18, 0.82].map((f) => (
          <Line key={f} x1={width * f} y1={1} x2={width * f} y2={8} stroke={color} strokeWidth={1} />
        ))}
        {[0.24, 0.27, 0.73, 0.76].map((f) => (
          <Line key={f} x1={width * f} y1={2.5} x2={width * f} y2={6.5} stroke={color} strokeWidth={0.8} />
        ))}
      </Svg>
    </View>
  )
}

/** Registration ticks in the four corners of a plate. */
export function CornerTicks({ inset = 6, size = 8, color = ETCH.strong }: { inset?: number; size?: number; color?: string }) {
  const corner = (rot: number, pos: ViewStyle, k: number) => (
    <Svg key={k} width={size} height={size} style={[{ position: 'absolute', transform: [{ rotate: `${rot}deg` }] }, pos]}>
      <Path d={`M 0.5 ${size * 0.62} L 0.5 0.5 L ${size * 0.62} 0.5`} stroke={color} strokeWidth={1} fill="none" />
    </Svg>
  )
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {corner(0, { left: inset, top: inset }, 0)}
      {corner(90, { right: inset, top: inset }, 1)}
      {corner(180, { right: inset, bottom: inset }, 2)}
      {corner(270, { left: inset, bottom: inset }, 3)}
    </View>
  )
}

/**
 * Black glass with an engraved gold hairline and registration ticks: the
 * theme's one panel. The shadow is on an outer wrapper, because iOS drops a
 * view's shadow when that same view clips its children.
 */
export function GlassPanel({
  children,
  radius = 14,
  edge = ETCH.mid,
  ticks = true,
  lit = false,
  style,
  contentStyle,
}: {
  children?: React.ReactNode
  radius?: number
  /** the hairline colour (a singer's, for their own row) */
  edge?: string
  ticks?: boolean
  /** a lit plate: the gold hairline brighter and a faint warm wash */
  lit?: boolean
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.drop, { borderRadius: radius }, style]}>
      <View style={{ flexGrow: 1, borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: lit ? ETCH.strong : edge }}>
        <LinearGradient colors={lit ? ['rgba(36,30,18,0.96)', 'rgba(10,9,12,0.97)'] : ['rgba(16,19,29,0.94)', 'rgba(5,6,12,0.96)']} style={StyleSheet.absoluteFill} />
        {/* the hairline's catch of light along the top edge */}
        <View pointerEvents="none" style={{ position: 'absolute', left: radius * 0.6, right: radius * 0.6, top: 0, height: 1, backgroundColor: 'rgba(255,240,200,0.12)' }} />
        {ticks ? <CornerTicks /> : null}
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  drop: {
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
})

// ── The record ──────────────────────────────────────────────────────────────

/**
 * The golden record. The disc and its sheen are images (cheap enough for a
 * list of a hundred); the label is whatever you put in it, clipped to a circle
 * and turning when `spin` is on. The light stays still, because a record
 * turning under one lamp keeps its highlight in place.
 */
export function GoldenRecord({
  size,
  labelRatio = 0.6,
  children,
  labelColor = VOID,
  spin = false,
  periodMs = 9000,
  inscription,
  inscriptionAngle = 0,
  style,
}: {
  size: number
  labelRatio?: number
  children?: React.ReactNode
  labelColor?: string
  spin?: boolean
  periodMs?: number
  /** text engraved round the run-out band (big records only: it's SVG) */
  inscription?: string
  /** where the inscription starts, in degrees clockwise from twelve o'clock */
  inscriptionAngle?: number
  style?: StyleProp<ViewStyle>
}) {
  const turn = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!spin) return
    turn.setValue(0)
    const loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration: periodMs, easing: Easing.linear, useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [spin, periodMs, turn])
  const label = size * labelRatio
  const id = useUid('sprec')
  const rr = labelRatio * 50 + 3.4
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image source={DISC_IMAGE} style={{ position: 'absolute', width: size, height: size }} />
      {inscription ? (
        <Svg width={size} height={size} viewBox="-50 -50 100 100" style={StyleSheet.absoluteFill}>
          <Defs>
            <Path id={`${id}r`} d={`M 0 ${-rr} A ${rr} ${rr} 0 1 1 -0.01 ${-rr}`} />
          </Defs>
          <SvgText fill="rgba(60,42,12,0.8)" fontSize={2.6} fontFamily={MONO} letterSpacing={0.7} transform={`rotate(${inscriptionAngle})`}>
            <TextPath href={`#${id}r`}>{inscription}</TextPath>
          </SvgText>
        </Svg>
      ) : null}
      <Image source={SHEEN_IMAGE} style={{ position: 'absolute', width: size, height: size, opacity: 0.85 }} />
      <Animated.View
        style={{
          position: 'absolute',
          left: (size - label) / 2,
          top: (size - label) / 2,
          width: label,
          height: label,
          borderRadius: label / 2,
          overflow: 'hidden',
          backgroundColor: labelColor,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: Math.max(1, size * 0.006),
          borderColor: 'rgba(60,42,12,0.6)',
          transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
        }}
      >
        {children}
      </Animated.View>
    </View>
  )
}

/** Album art as a record's label, with the spindle hole punched through it.
 *  Under the art is the record's own gilt label (an engraved ring and a star),
 *  so a cover that's still loading, or a song with none, shows the bare
 *  golden record rather than a black hole. */
export function ArtLabel({ uri, size }: { uri: string | null | undefined; size: number }) {
  return (
    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient colors={['#DDBB66', '#B8913F', '#8A6A2B']} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', width: size * 0.78, height: size * 0.78, borderRadius: size, borderWidth: 1, borderColor: 'rgba(60,42,12,0.4)' }} />
      <View style={{ position: 'absolute', width: size * 0.5, height: size * 0.5, borderRadius: size, borderWidth: 1, borderColor: 'rgba(60,42,12,0.28)' }} />
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} /> : null}
      <View style={{ position: 'absolute', width: Math.max(4, size * 0.08), height: Math.max(4, size * 0.08), borderRadius: 99, backgroundColor: VOID, borderWidth: 1, borderColor: 'rgba(255,240,200,0.5)' }} />
    </View>
  )
}

/** Radio static on a label: a signal that can't be read yet. The tile is
 *  drawn at twice the label's size and jittered a few points each frame of a
 *  fast loop, so the grain crawls without ever showing an edge. */
export function StaticLabel() {
  const v = useLoop(320, 0, false)
  return (
    <View style={{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: VOID }}>
      <Animated.Image
        source={STATIC_IMAGE}
        resizeMode="cover"
        style={{
          position: 'absolute',
          left: '-50%',
          top: '-50%',
          width: '200%',
          height: '200%',
          opacity: 0.9,
          transform: [
            { translateX: v.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -9, 6, -4, 11, 0] }) },
            { translateY: v.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, 7, -10, 5, -6, 0] }) },
          ],
        }}
      />
    </View>
  )
}

// ── The probe ───────────────────────────────────────────────────────────────

/** Voyager as an engraving: the big dish, the bus, the long magnetometer
 *  boom, the RTG boom with its three cylinders, the science boom. */
export function Voyager({ size = 120, color = ETCH.strong }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200}>
      <G fill="none" stroke={color} strokeWidth={1.2} strokeLinejoin="round" strokeLinecap="round">
        <Line x1={104} y1={64} x2={196} y2={12} strokeWidth={0.8} />
        <Line x1={84} y1={80} x2={30} y2={112} />
        <Path d="M 37 102 l 7 -4 l 4 7 l -7 4 Z M 46 97 l 7 -4 l 4 7 l -7 4 Z M 55 92 l 7 -4 l 4 7 l -7 4 Z" />
        <Line x1={108} y1={82} x2={156} y2={104} />
        <Path d="M 150 100 l 12 5 l -4 9 l -12 -5 Z" />
        <Path d="M 86 70 L 94 66 L 104 66 L 112 70 L 114 78 L 110 85 L 100 88 L 90 87 L 84 81 Z" fill={VOID} />
        <Path d="M 59 46 A 40 22 0 1 0 139 46 A 40 22 0 1 0 59 46 Z" fill={VOID} />
        <Path d="M 69 46 A 30 15.5 0 1 0 129 46 A 30 15.5 0 1 0 69 46 Z" strokeWidth={0.6} />
        <Line x1={68} y1={50} x2={99} y2={28} strokeWidth={0.6} />
        <Line x1={130} y1={50} x2={99} y2={28} strokeWidth={0.6} />
        <Circle cx={99} cy={26} r={2.4} fill={VOID} />
      </G>
    </Svg>
  )
}
