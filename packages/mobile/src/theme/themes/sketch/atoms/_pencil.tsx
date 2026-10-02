import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { hashKey } from '../../../helpers'

// ── SKETCH: "FOLLOW THE BOUNCING BALL": the shared visual vocabulary ────────
//
// The phone is the animator's desk beside the light table: a sheet of
// animation bond, pencilled marks, references taped up, the exposure sheet.
// Every mark is a drawn sprite from scripts/generate-sketch-assets.py (pencil
// strokes with pressure, wobble and paper tooth); most are white masks tinted
// here with `tintColor`. Nothing is a vector line pretending to be a pencil.
//
//   Mark         any drawn mark (ring, underline, arrow, check, scribble...)
//   PencilBox    a pencilled box around anything, nine-sliced so its corners
//                keep their overshoot at any size
//   Tape, TapeStrip   masking tape (a scrap, or a strip of any length)
//   TapedPrint   a photo print taped to the sheet
//   Ball         the bouncing ball, its colour worked in with a singer's pencil
//   Press        a press: the sheet dips under the finger and springs back

// ── Palette ─────────────────────────────────────────────────────────────────
export const PAPER = '#EFEBE2'
export const SHEET = '#FAF8F2'
export const INK = '#1C1B1F'
export const GRAPHITE = '#3C3C41'
export const GRAPHITE_SOFT = '#76757A'
export const BLUE = '#4F8FD0'
export const BLUE_PALE = '#9DC1E6'
export const RED = '#CF4540'
export const FORM = '#4F8A84'
export const LACQUER = '#F2B51E'

// ── Type ────────────────────────────────────────────────────────────────────
export const LETTER = 'ShantellSans_800ExtraBold'
export const LETTER_B = 'ShantellSans_700Bold'
export const LETTER_M = 'ShantellSans_500Medium'
export const NOTE = 'JustAnotherHand_400Regular'

/** Shantell Sans: lettering in ink. */
export function letter(size: number, color: string = INK, extra?: TextStyle, face: string = LETTER): TextStyle {
  return { fontFamily: face, fontSize: size, color, lineHeight: Math.round(size * 1.22), ...extra }
}
/** Just Another Hand: the animator's pencil notes. */
export function note(size: number, color: string = GRAPHITE, extra?: TextStyle): TextStyle {
  return { fontFamily: NOTE, fontSize: size, color, lineHeight: Math.round(size * 1.0), letterSpacing: 0.3, ...extra }
}
/** The exposure sheet's printed labels: a plain sans in small capitals. */
export function printed(size: number, color: string = FORM, extra?: TextStyle): TextStyle {
  return { fontFamily: 'System', fontWeight: '700', fontSize: size, color, letterSpacing: size * 0.16, textTransform: 'uppercase', ...extra }
}

// ── Sprites ─────────────────────────────────────────────────────────────────
export const IMG = {
  paper: require('../../../../../assets/sketch/paper-tall.jpg'),
  ball: require('../../../../../assets/sketch/ball.png'),
  ballTone: require('../../../../../assets/sketch/ball-tone.png'),
  ballGhost: require('../../../../../assets/sketch/ball-ghost.png'),
  ballShadow: require('../../../../../assets/sketch/ball-shadow.png'),
  ring: [
    require('../../../../../assets/sketch/ring-0.png'),
    require('../../../../../assets/sketch/ring-1.png'),
    require('../../../../../assets/sketch/ring-2.png'),
  ],
  ringRound: require('../../../../../assets/sketch/ring-r.png'),
  underline: [
    require('../../../../../assets/sketch/underline-0.png'),
    require('../../../../../assets/sketch/underline-1.png'),
    require('../../../../../assets/sketch/underline-2.png'),
  ],
  under: [require('../../../../../assets/sketch/under-0.png'), require('../../../../../assets/sketch/under-1.png')],
  arrow: [require('../../../../../assets/sketch/arrow-0.png'), require('../../../../../assets/sketch/arrow-1.png')],
  check: require('../../../../../assets/sketch/check.png'),
  cross: require('../../../../../assets/sketch/cross.png'),
  scribble: require('../../../../../assets/sketch/scribble.png'),
  swatch: require('../../../../../assets/sketch/swatch.png'),
  note: require('../../../../../assets/sketch/note.png'),
  hatch: require('../../../../../assets/sketch/hatch.png'),
  holdLine: require('../../../../../assets/sketch/hold-line.png'),
  tape: [
    require('../../../../../assets/sketch/tape-0.png'),
    require('../../../../../assets/sketch/tape-1.png'),
    require('../../../../../assets/sketch/tape-2.png'),
  ],
  tapeLong: {
    l: require('../../../../../assets/sketch/tape-long-l.png'),
    m: require('../../../../../assets/sketch/tape-long-m.png'),
    r: require('../../../../../assets/sketch/tape-long-r.png'),
  },
  box: {
    tl: require('../../../../../assets/sketch/box-tl.png'),
    t: require('../../../../../assets/sketch/box-t.png'),
    tr: require('../../../../../assets/sketch/box-tr.png'),
    l: require('../../../../../assets/sketch/box-l.png'),
    r: require('../../../../../assets/sketch/box-r.png'),
    bl: require('../../../../../assets/sketch/box-bl.png'),
    b: require('../../../../../assets/sketch/box-b.png'),
    br: require('../../../../../assets/sketch/box-br.png'),
  },
  pencil: {
    hb: require('../../../../../assets/sketch/pencil-hb.png'),
    blue: require('../../../../../assets/sketch/pencil-blue.png'),
    red: require('../../../../../assets/sketch/pencil-red.png'),
  },
} as const

/** Drawn ball radius as a fraction of its sprite (generator manifest). */
export const BALL_FRAC = (2 * 92.4) / 240
/** Tape scrap aspect (300 x 92). */
const TAPE_AR = 92 / 300
/** Pencil sprite aspect (1044 x 102). */
const PENCIL_AR = 102 / 1044

// ── Helpers ─────────────────────────────────────────────────────────────────

export function useMeasured(): [{ w: number; h: number } | null, (e: LayoutChangeEvent) => void] {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((prev) => (prev && Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5 ? prev : { w: width, h: height }))
  }
  return [size, onLayout]
}

/** Stable small variation per item: -1..1. */
export function wobble(key: string | number | undefined, salt = 0): number {
  return ((hashKey(`${key ?? ''}:${salt}`) % 2001) / 1000) - 1
}

/** Entry: the sheet is laid down (a short drop and settle). */
export function useEnter(delay = 0, distance = 10) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, delay, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    a.start()
    return () => a.stop()
  }, [v, delay])
  return {
    opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
    translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
  }
}

/** A press: the paper dips under the finger and springs back. */
export function Press({
  children,
  style,
  outerStyle,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  outerStyle?: StyleProp<ViewStyle>
}) {
  const v = useRef(new Animated.Value(0)).current
  const onPressIn = () => Animated.timing(v, { toValue: 1, duration: 70, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  const onPressOut = () => Animated.spring(v, { toValue: 0, stiffness: 360, damping: 15, mass: 0.6, useNativeDriver: true }).start()
  // The transform array is ALWAYS present (values animate): a transform that
  // flips to undefined crashes Fabric on press-out (see project notes).
  const transform = [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]
  return (
    <Pressable {...rest} style={outerStyle} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform }]}>{children}</Animated.View>
    </Pressable>
  )
}

// ── Marks ───────────────────────────────────────────────────────────────────

/** A drawn mark tinted to a pencil colour. */
export function Mark({ src, color = GRAPHITE, width, height, style }: { src: ImageSourcePropType; color?: string; width: number; height: number; style?: StyleProp<any> }) {
  return <Image source={src} resizeMode="stretch" style={[{ width, height, tintColor: color }, style]} />
}

/** A loop drawn around its parent (absolutely placed, spilling past it). */
export function RingAround({ color = RED, variant = 0, padX = 10, padY = 8, style }: { color?: string; variant?: number; padX?: number; padY?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: -padX, right: -padX, top: -padY, bottom: -padY }, style]}>
      <Image source={IMG.ring[variant % IMG.ring.length]} resizeMode="stretch" style={{ width: '100%', height: '100%', tintColor: color }} />
    </View>
  )
}

/** A pencilled box around its children, nine-sliced from the drawn box. */
export function PencilBox({
  children,
  color = GRAPHITE,
  border = 13,
  style,
  contentStyle,
  fill,
}: {
  children?: React.ReactNode
  color?: string
  border?: number
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  /** paper inside the box (it hides what's under it) */
  fill?: string
}) {
  const [size, onLayout] = useMeasured()
  const B = border
  const fills = ((StyleSheet.flatten(contentStyle)?.flex as number | undefined) ?? 0) > 0
  const t = { tintColor: color }
  return (
    <View onLayout={onLayout} style={style}>
      {fill ? <View pointerEvents="none" style={{ position: 'absolute', left: B * 0.45, right: B * 0.45, top: B * 0.45, bottom: B * 0.45, backgroundColor: fill }} /> : null}
      {size ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image source={IMG.box.tl} style={[{ position: 'absolute', left: 0, top: 0, width: B, height: B }, t]} />
          <Image source={IMG.box.tr} style={[{ position: 'absolute', right: 0, top: 0, width: B, height: B }, t]} />
          <Image source={IMG.box.bl} style={[{ position: 'absolute', left: 0, bottom: 0, width: B, height: B }, t]} />
          <Image source={IMG.box.br} style={[{ position: 'absolute', right: 0, bottom: 0, width: B, height: B }, t]} />
          <Image source={IMG.box.t} resizeMode="stretch" style={[{ position: 'absolute', left: B, top: 0, width: Math.max(0, size.w - B * 2), height: B }, t]} />
          <Image source={IMG.box.b} resizeMode="stretch" style={[{ position: 'absolute', left: B, bottom: 0, width: Math.max(0, size.w - B * 2), height: B }, t]} />
          <Image source={IMG.box.l} resizeMode="stretch" style={[{ position: 'absolute', left: 0, top: B, width: B, height: Math.max(0, size.h - B * 2) }, t]} />
          <Image source={IMG.box.r} resizeMode="stretch" style={[{ position: 'absolute', right: 0, top: B, width: B, height: Math.max(0, size.h - B * 2) }, t]} />
        </View>
      ) : null}
      <View style={{ padding: B * 0.7, flex: fills ? 1 : undefined }}>
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  )
}

// ── Tape ────────────────────────────────────────────────────────────────────

export function Tape({ width = 70, angle = 0, variant = 0, style }: { width?: number; angle?: number; variant?: number; style?: StyleProp<any> }) {
  return (
    <Image
      source={IMG.tape[variant % IMG.tape.length]}
      resizeMode="stretch"
      style={[{ position: 'absolute', width, height: width * TAPE_AR, transform: [{ rotate: `${angle}deg` }] }, style]}
    />
  )
}

/** A strip of masking tape of any length: torn ends, creped middle. */
export function TapeStrip({ height = 46, style, children, contentStyle }: { height?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  const cap = height * (70 / 92)
  return (
    <View style={[{ height, flexDirection: 'row' }, style]}>
      <Image source={IMG.tapeLong.l} resizeMode="stretch" style={{ width: cap, height }} />
      <Image source={IMG.tapeLong.m} resizeMode="stretch" style={{ flex: 1, height }} />
      <Image source={IMG.tapeLong.r} resizeMode="stretch" style={{ width: cap, height }} />
      {children ? <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, contentStyle]}>{children}</View> : null}
    </View>
  )
}

// ── Prints ──────────────────────────────────────────────────────────────────

/** A photo print taped to the sheet: white border, the faintest shadow, tape
 *  across two corners. The shadow is a separate view under the print (iOS
 *  drops a shadow from a view that also clips). */
export function TapedPrint({
  uri,
  size,
  seed,
  border,
  tape = 'corners',
  children,
  style,
}: {
  uri?: string | null
  size: number
  seed?: string | number
  border?: number
  tape?: 'corners' | 'top' | 'none'
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const b = border ?? Math.max(3, Math.round(size * 0.05))
  const rot = wobble(seed, 1) * 2.6
  const tw = Math.max(34, size * 0.46)
  return (
    <View style={[{ width: size, height: size, transform: [{ rotate: `${rot}deg` }] }, style]}>
      <View style={[StyleSheet.absoluteFill, styles.printShadow, { backgroundColor: '#FBFAF6' }]} />
      <View style={[StyleSheet.absoluteFill, { padding: b }]}>
        <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#D9D4C8' }}>
          {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
          {children}
        </View>
      </View>
      {tape === 'corners' ? (
        <>
          <Tape width={tw} variant={hashKey(`${seed}a`) % 3} angle={-40 + wobble(seed, 2) * 6} style={{ left: -tw * 0.3, top: -tw * 0.02 }} />
          <Tape width={tw} variant={hashKey(`${seed}b`) % 3} angle={-38 + wobble(seed, 3) * 6} style={{ right: -tw * 0.3, bottom: -tw * 0.02 }} />
        </>
      ) : tape === 'top' ? (
        <Tape width={tw * 1.2} variant={hashKey(`${seed}a`) % 3} angle={wobble(seed, 4) * 5} style={{ left: size / 2 - tw * 0.6, top: -tw * 0.18 }} />
      ) : null}
    </View>
  )
}

export function Pencil({ kind = 'hb', length = 300, angle = 0, style }: { kind?: 'hb' | 'blue' | 'red'; length?: number; angle?: number; style?: StyleProp<any> }) {
  return (
    <Image
      source={IMG.pencil[kind]}
      resizeMode="stretch"
      style={[{ position: 'absolute', width: length, height: length * PENCIL_AR, transform: [{ rotate: `${angle}deg` }] }, style]}
    />
  )
}

// ── The ball ────────────────────────────────────────────────────────────────

/** Sprite size for a ball drawn `d` across. */
export function ballSprite(d: number): number {
  return d / BALL_FRAC
}

/** The ball, drawn `d` across, its colour worked in with `color` pencil. */
export function Ball({ d, color = RED, style }: { d: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const S = ballSprite(d)
  return (
    <View pointerEvents="none" style={[{ width: S, height: S }, style]}>
      <Image source={IMG.ball} style={{ position: 'absolute', width: S, height: S }} />
      <Image source={IMG.ballTone} style={{ position: 'absolute', width: S, height: S, tintColor: color, opacity: 0.9 }} />
      {/* small, the hatching closes up: work a second layer in so it keeps its colour */}
      {d < 60 ? <Image source={IMG.ballTone} style={{ position: 'absolute', width: S, height: S, tintColor: color, opacity: 0.55, transform: [{ rotate: '70deg' }] }} /> : null}
    </View>
  )
}

/** An onion skin: one light lap of pencil where the ball was a frame ago. */
export function Ghost({ d, color = BLUE, opacity = 0.5, style }: { d: number; color?: string; opacity?: number; style?: StyleProp<any> }) {
  const S = ballSprite(d)
  return <Image source={IMG.ballGhost} style={[{ width: S, height: S, tintColor: color, opacity }, style]} />
}

/** A ball waiting its turn: small hops on the spot, squashing on contact.
 *  One native-driven loop; up decelerates, down accelerates, as under gravity. */
export function useWaitingBounce(period = 1100, height = 12, squash = 1) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.5, duration: period * 0.42, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: period * 0.42, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 1.08, duration: period * 0.06, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 1.16, duration: period * 0.1, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [v, period])
  // 0 → 0.5 up, 0.5 → 1 down, 1 → 1.08 squash, 1.08 → 1.16 recover
  const translateY = v.interpolate({ inputRange: [0, 0.5, 1, 1.16], outputRange: [0, -height, 0, 0] })
  const k = (x: number) => 1 + (x - 1) * squash
  const scaleY = v.interpolate({ inputRange: [0, 0.12, 0.5, 0.9, 1, 1.08, 1.16], outputRange: [0.9, 1.05, 1, 1.04, 1, 0.8, 0.9].map(k) })
  const scaleX = v.interpolate({ inputRange: [0, 0.12, 0.5, 0.9, 1, 1.08, 1.16], outputRange: [1.08, 0.97, 1, 0.97, 1, 1.18, 1.08].map(k) })
  return { translateY, scaleX, scaleY }
}

/** A ball sitting on whatever is under it, bouncing in place. Place it with
 *  `left`/`bottom` at its contact point. */
export function WaitingBall({ d, color = RED, height = 12, period = 1100, style }: { d: number; color?: string; height?: number; period?: number; style?: StyleProp<ViewStyle> }) {
  const { translateY, scaleX, scaleY } = useWaitingBounce(period, height)
  const S = ballSprite(d)
  // squash about the contact point: shift so the ball's bottom stays put
  const pad = (S - d) / 2
  return (
    <View pointerEvents="none" style={[{ width: S, height: S, marginBottom: -pad }, style]}>
      <Animated.View style={{ width: S, height: S, transform: [{ translateY }, { translateY: S / 2 - pad }, { scaleX }, { scaleY }, { translateY: -(S / 2 - pad) }] }}>
        <Ball d={d} color={color} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  printShadow: {
    shadowColor: '#2A2218',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
})
