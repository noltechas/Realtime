import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'

// ── STEAMPUNK / "THE VOX ENGINE": shared visual vocabulary ────────────────
//
// The phone is a panel of the same brass steam engine as the stage (packages/
// desktop/src/renderer/src/styles/steampunk.ts): gears that genuinely mesh and
// turn, porthole windows, pressure gauges, copper pipes, steam, deep green
// enamel plates in riveted brass frames, jewel lamps in a singer's colour, and
// the out-of-focus engine house behind it all with airships past its windows.
//
// Every metal part is a RENDERED sprite (scripts/generate-steampunk-assets.py:
// height maps lit as real brass, copper and steel, with bevels, polished wear,
// grime and verdigris). Compose atoms from these; never draw a gear or a rivet
// as a flat vector, which is exactly what made earlier versions look cheap.
//
// Type: Abril Fatface (the fat face of Victorian playbills and nameplates) for
// display and numerals; Old Standard TT for reading and engraved capitals.
// Copy never uses em dashes.

// ── palette ─────────────────────────────────────────────────────────────────
export const HOUSE = '#120D0A'
export const HOUSE_2 = '#1A1410'
export const ENAMEL = '#16231D'
export const ENAMEL_HI = '#22352C'
export const ENAMEL_LO = '#0C1511'
export const BRASS_LO = '#4A3312'
export const BRASS_DEEP = '#7E5A22'
export const BRASS = '#C9A15A'
export const BRASS_HI = '#E9C77F'
export const BRASS_SHEEN = '#FFF0C8'
export const COPPER = '#B4643A'
export const VERDIGRIS = '#5FA08A'
export const LAMP = '#F6C66B'
export const PARCHMENT = '#F1E4C6'
export const PARCHMENT_DIM = '#A8977A'
export const INK = '#2A1B0E'
export const RED = '#C9452F'

export const BRASS_STOPS = [BRASS_SHEEN, BRASS_HI, BRASS, BRASS_DEEP, '#9C7531'] as const
export const BRASS_LOCS = [0, 0.16, 0.5, 0.86, 1] as const
export const ENAMEL_STOPS = [ENAMEL_HI, ENAMEL, ENAMEL_LO] as const

// ── images ──────────────────────────────────────────────────────────────────
export const IMG = {
  foundry: require('../../../../../assets/steampunk/foundry-tall.jpg'),
  porthole: require('../../../../../assets/steampunk/porthole.png'),
  portholeGlass: require('../../../../../assets/steampunk/porthole-glass.png'),
  gaugeBezel: require('../../../../../assets/steampunk/gauge-bezel.png'),
  gaugeDial: require('../../../../../assets/steampunk/gauge-dial.png'),
  gaugeNeedle: require('../../../../../assets/steampunk/gauge-needle.png'),
  handwheel: require('../../../../../assets/steampunk/handwheel.png'),
  pipe: require('../../../../../assets/steampunk/pipe.png'),
  pipeCoupling: require('../../../../../assets/steampunk/pipe-coupling.png'),
  rivet: require('../../../../../assets/steampunk/rivet.png'),
  airship: require('../../../../../assets/steampunk/airship.png'),
  rack: require('../../../../../assets/steampunk/rack.png'),
  steam: [
    require('../../../../../assets/steampunk/steam-0.png'),
    require('../../../../../assets/steampunk/steam-1.png'),
    require('../../../../../assets/steampunk/steam-2.png'),
  ],
  frame: {
    tl: require('../../../../../assets/steampunk/frame-brass-tl.png'),
    t: require('../../../../../assets/steampunk/frame-brass-t.png'),
    tr: require('../../../../../assets/steampunk/frame-brass-tr.png'),
    l: require('../../../../../assets/steampunk/frame-brass-l.png'),
    r: require('../../../../../assets/steampunk/frame-brass-r.png'),
    bl: require('../../../../../assets/steampunk/frame-brass-bl.png'),
    b: require('../../../../../assets/steampunk/frame-brass-b.png'),
    br: require('../../../../../assets/steampunk/frame-brass-br.png'),
  },
}

export type Teeth = 10 | 14 | 18 | 24 | 32 | 44
export const GEAR_IMG: Record<Teeth, { src: ImageSourcePropType; shadow: ImageSourcePropType }> = {
  10: { src: require('../../../../../assets/steampunk/gear-10.png'), shadow: require('../../../../../assets/steampunk/gear-10-shadow.png') },
  14: { src: require('../../../../../assets/steampunk/gear-14.png'), shadow: require('../../../../../assets/steampunk/gear-14-shadow.png') },
  18: { src: require('../../../../../assets/steampunk/gear-18.png'), shadow: require('../../../../../assets/steampunk/gear-18-shadow.png') },
  24: { src: require('../../../../../assets/steampunk/gear-24.png'), shadow: require('../../../../../assets/steampunk/gear-24-shadow.png') },
  32: { src: require('../../../../../assets/steampunk/gear-32.png'), shadow: require('../../../../../assets/steampunk/gear-32-shadow.png') },
  44: { src: require('../../../../../assets/steampunk/gear-44.png'), shadow: require('../../../../../assets/steampunk/gear-44-shadow.png') },
}

// ── type ────────────────────────────────────────────────────────────────────
// Registered in App.tsx's useFonts map.
export const ABRIL = 'AbrilFatface_400Regular'
export const OLD = 'OldStandardTT_400Regular'
export const OLD_B = 'OldStandardTT_700Bold'
export const OLD_I = 'OldStandardTT_400Regular_Italic'

/** Abril Fatface: the nameplate's fat face. */
export function display(size: number, color: string = PARCHMENT, extra?: TextStyle): TextStyle {
  return { fontFamily: ABRIL, fontSize: size, color, letterSpacing: size * 0.01, ...extra }
}
/** Old Standard engraved capitals. */
export function caps(size: number, color: string = BRASS_HI, extra?: TextStyle): TextStyle {
  return { fontFamily: OLD_B, fontSize: size, color, letterSpacing: size * 0.22, textTransform: 'uppercase', ...extra }
}
export function body(size: number, color: string = PARCHMENT_DIM, extra?: TextStyle): TextStyle {
  return { fontFamily: OLD, fontSize: size, color, ...extra }
}
export function italic(size: number, color: string = PARCHMENT_DIM, extra?: TextStyle): TextStyle {
  return { fontFamily: OLD_I, fontSize: size, color, ...extra }
}
/** Lettering cast in brass: bright face, dark lip below. */
export const CAST: TextStyle = {
  color: BRASS_HI,
  textShadowColor: 'rgba(0,0,0,0.7)',
  textShadowOffset: { width: 0, height: 1.5 },
  textShadowRadius: 0.5,
}

// ── helpers ─────────────────────────────────────────────────────────────────

export function useMeasured(): [{ w: number; h: number } | null, (e: LayoutChangeEvent) => void] {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((prev) => (prev && Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5 ? prev : { w: width, h: height }))
  }
  return [size, onLayout]
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

/** Arrival: a part rises into place with a small mechanical settle. */
export function useEnter(delay = 0, distance = 14) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const a = Animated.spring(v, { toValue: 1, delay, stiffness: 160, damping: 17, mass: 0.9, useNativeDriver: true })
    a.start()
    return () => a.stop()
  }, [v, delay])
  return {
    opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
    translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
  }
}

/** A press: the plate seats into its mounting, and springs back. */
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
  const onPressIn = () => Animated.timing(v, { toValue: 1, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  const onPressOut = () => Animated.spring(v, { toValue: 0, stiffness: 340, damping: 16, mass: 0.6, useNativeDriver: true }).start()
  // The transform array is ALWAYS present (values animate): a transform that
  // flips to undefined crashes Fabric on press-out (see project notes).
  const transform = [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.965] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 1.5] }) }]
  return (
    <Pressable {...rest} style={outerStyle} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform }]}>{children}</Animated.View>
    </Pressable>
  )
}

// ── Gears ───────────────────────────────────────────────────────────────────
// Every gear was cut with the same tooth size, so two mesh when their centres
// sit a pitch-sum apart and their teeth are phased into each other's gaps.

/** Tooth size every gear was cut with, in (desktop) sprite pixels. */
export const MODULE = 13

export function gearGeometry(teeth: number): { pitch: number; size: number } {
  const pitch = (MODULE * teeth) / 2
  return { pitch, size: 2 * Math.ceil(pitch + 0.95 * MODULE + 6) }
}

export interface PlacedGear {
  teeth: Teeth
  x: number
  y: number
  phase: number
  dir: 1 | -1
  scale: number
}

export interface TrainLink {
  teeth: Teeth
  from?: number
  /** direction from that gear's centre to this one's, degrees clockwise from +x */
  deg: number
}

/** Lay out a meshing train: centres a pitch-sum apart, teeth in each other's
 *  gaps, directions alternating. `scale` is points per sprite pixel. */
export function meshTrain(first: { teeth: Teeth; x: number; y: number; phase?: number }, links: TrainLink[], scale: number): PlacedGear[] {
  const out: PlacedGear[] = [{ teeth: first.teeth, x: first.x, y: first.y, phase: first.phase ?? 0, dir: 1, scale }]
  links.forEach((l, i) => {
    const p = out[l.from ?? i]
    const d = (gearGeometry(p.teeth).pitch + gearGeometry(l.teeth).pitch) * scale
    const phi = (l.deg * Math.PI) / 180
    const a = (p.phase * Math.PI) / 180
    let pA = (((phi - a) * p.teeth) / (2 * Math.PI)) % 1
    if (pA < 0) pA += 1
    const b = phi + Math.PI - ((2 * Math.PI) / l.teeth) * (0.5 - pA)
    out.push({ teeth: l.teeth, x: p.x + Math.cos(phi) * d, y: p.y + Math.sin(phi) * d, phase: (b * 180) / Math.PI, dir: (p.dir * -1) as 1 | -1, scale })
  })
  return out
}

// The engine's one clock: teeth passed, counting up for hours, on the native
// driver. A gear with n teeth turns 360/n degrees per tooth, so every gear in
// every train stays meshed. TEETH is a common multiple of every tooth count,
// so when the count finally wraps, every gear is back exactly where it began.
const TEETH = 110880
const SECONDS_PER_TOOTH = 0.32
const master = new Animated.Value(0)
let running = false
function startEngine() {
  if (running) return
  running = true
  Animated.loop(Animated.timing(master, { toValue: TEETH, duration: TEETH * SECONDS_PER_TOOTH * 1000, easing: Easing.linear, useNativeDriver: true })).start()
}

/** A gear's rotation, turning with the engine. */
export function useGearRotation(g: { teeth: number; phase: number; dir: number }): Animated.AnimatedInterpolation<string> {
  useEffect(() => startEngine(), [])
  return useMemo(
    () =>
      master.interpolate({
        inputRange: [0, TEETH],
        outputRange: [`${g.phase}deg`, `${g.phase + (g.dir * TEETH * 360) / g.teeth}deg`],
      }),
    [g.phase, g.dir, g.teeth],
  )
}

/** One gear (and its shadow), centred on (x, y), turning with the engine. */
export function Gear({ g, shadow = 5, blur = 0, opacity = 1 }: { g: PlacedGear; shadow?: number; blur?: number; opacity?: number }) {
  const rot = useGearRotation(g)
  const S = gearGeometry(g.teeth).size * g.scale
  const art = GEAR_IMG[g.teeth]
  return (
    <>
      {shadow > 0 && (
        <Animated.Image
          source={art.shadow}
          blurRadius={blur}
          style={{ position: 'absolute', left: g.x - S / 2 + shadow * 0.6, top: g.y - S / 2 + shadow, width: S, height: S, opacity: 0.8 * opacity, transform: [{ rotate: rot }] }}
        />
      )}
      <Animated.Image source={art.src} blurRadius={blur} style={{ position: 'absolute', left: g.x - S / 2, top: g.y - S / 2, width: S, height: S, opacity, transform: [{ rotate: rot }] }} />
    </>
  )
}

export function GearTrain({ gears, shadow = 5, blur = 0, opacity = 1 }: { gears: PlacedGear[]; shadow?: number; blur?: number; opacity?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {gears.map((g, i) => (
        <Gear key={i} g={g} shadow={shadow} blur={blur} opacity={opacity} />
      ))}
    </View>
  )
}

// ── Porthole ────────────────────────────────────────────────────────────────

/** The porthole's glass opening, as a fraction of its size. */
export const OPENING = 0.62 * (376 / 380)

/** A riveted brass porthole; children are seen through its glass. */
export function Porthole({ size, children, glass = true, style }: { size: number; children?: React.ReactNode; glass?: boolean; style?: StyleProp<ViewStyle> }) {
  const o = (size * OPENING) / 2
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={{ position: 'absolute', left: size / 2 - o - 1, top: size / 2 - o - 1, width: o * 2 + 2, height: o * 2 + 2, borderRadius: o + 1, overflow: 'hidden', backgroundColor: '#0B0907', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
      <Image source={IMG.porthole} style={{ position: 'absolute', width: size, height: size }} />
      {glass ? <Image source={IMG.portholeGlass} style={{ position: 'absolute', width: size, height: size }} /> : null}
    </View>
  )
}

// ── Gauge ───────────────────────────────────────────────────────────────────

/** A pressure gauge; `value` (0..1, or an animated 0..1) sets the needle. */
export function Gauge({ size, value }: { size: number; value: number | Animated.Value | Animated.AnimatedInterpolation<number> }) {
  const inset = size * (45 / 520)
  const face = { position: 'absolute' as const, left: inset, top: inset, width: size - inset * 2, height: size - inset * 2 }
  const rotate =
    typeof value === 'number'
      ? `${-135 + 270 * Math.max(0, Math.min(1, value))}deg`
      : (value as Animated.Value).interpolate({ inputRange: [0, 1], outputRange: ['-135deg', '135deg'], extrapolate: 'clamp' })
  return (
    <View style={{ width: size, height: size }}>
      <Image source={IMG.gaugeDial} style={face} />
      <Animated.Image source={IMG.gaugeNeedle} style={[face, { transform: [{ rotate }] }]} />
      <Image source={IMG.gaugeBezel} style={{ position: 'absolute', width: size, height: size }} />
    </View>
  )
}

// ── Plaque: enamel in a riveted brass frame ─────────────────────────────────

function Edge({ src, horizontal, length, thick }: { src: ImageSourcePropType; horizontal: boolean; length: number; thick: number }) {
  // one rivet per span; as many spans as fit, stretched a hair to land exactly
  const span = thick * 1.75
  const n = Math.max(1, Math.round(length / span))
  return (
    <View style={{ flexDirection: horizontal ? 'row' : 'column', width: horizontal ? length : thick, height: horizontal ? thick : length }}>
      {Array.from({ length: n }, (_, i) => (
        <Image key={i} source={src} resizeMode="stretch" style={horizontal ? { width: length / n, height: thick } : { width: thick, height: length / n }} />
      ))}
    </View>
  )
}

/**
 * Deep green enamel in a riveted brass frame (the rendered frame, in nine
 * pieces so its rivets repeat along any length). `tint` replaces the enamel
 * (a lit plate, a singer's own).
 */
export function Plaque({
  children,
  border = 12,
  style,
  contentStyle,
  enamel = ENAMEL_STOPS as unknown as string[],
  shadow = true,
}: {
  children?: React.ReactNode
  border?: number
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  enamel?: string[]
  shadow?: boolean
}) {
  const [size, onLayout] = useMeasured()
  const B = border
  // a plate whose content fills it (a tile, a toggle) lets the frame's band grow too
  const fills = ((StyleSheet.flatten(contentStyle)?.flex as number | undefined) ?? 0) > 0
  return (
    <View onLayout={onLayout} style={[shadow ? styles.drop : null, style]}>
      <LinearGradient colors={enamel as [string, string, ...string[]]} style={{ position: 'absolute', left: B * 0.45, right: B * 0.45, top: B * 0.45, bottom: B * 0.45 }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: B * 0.45, right: B * 0.45, top: B * 0.45, height: 3, backgroundColor: 'rgba(0,0,0,0.35)' }} />
      {size ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image source={IMG.frame.tl} style={{ position: 'absolute', left: 0, top: 0, width: B, height: B }} />
          <Image source={IMG.frame.tr} style={{ position: 'absolute', right: 0, top: 0, width: B, height: B }} />
          <Image source={IMG.frame.bl} style={{ position: 'absolute', left: 0, bottom: 0, width: B, height: B }} />
          <Image source={IMG.frame.br} style={{ position: 'absolute', right: 0, bottom: 0, width: B, height: B }} />
          <View style={{ position: 'absolute', left: B, top: 0 }}>
            <Edge src={IMG.frame.t} horizontal length={Math.max(0, size.w - B * 2)} thick={B} />
          </View>
          <View style={{ position: 'absolute', left: B, bottom: 0 }}>
            <Edge src={IMG.frame.b} horizontal length={Math.max(0, size.w - B * 2)} thick={B} />
          </View>
          <View style={{ position: 'absolute', left: 0, top: B }}>
            <Edge src={IMG.frame.l} horizontal={false} length={Math.max(0, size.h - B * 2)} thick={B} />
          </View>
          <View style={{ position: 'absolute', right: 0, top: B }}>
            <Edge src={IMG.frame.r} horizontal={false} length={Math.max(0, size.h - B * 2)} thick={B} />
          </View>
        </View>
      ) : null}
      {/* the frame keeps its band; contentStyle pads inside it */}
      <View style={{ padding: B, flex: fills ? 1 : undefined }}>
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  drop: {
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
})

/** A polished brass plate (a button face), lit from above. */
export function BrassPlate({ children, radius = 5, style, contentStyle }: { children?: React.ReactNode; radius?: number; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.drop, { borderRadius: radius }, style]}>
      <View style={{ borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: BRASS_LO }}>
        <LinearGradient colors={BRASS_STOPS as unknown as [string, string, ...string[]]} locations={BRASS_LOCS as unknown as [number, number, ...number[]]} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: 6, right: 6, top: 1, height: 1, backgroundColor: 'rgba(255,248,226,0.85)' }} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: 'rgba(74,51,18,0.35)' }} />
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  )
}

/** A rendered dome rivet. */
export function Rivet({ size = 7, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return <Image source={IMG.rivet} style={[{ width: size, height: size }, style as object]} />
}

// ── Pipe and steam ──────────────────────────────────────────────────────────

/** A run of copper pipe (horizontal), with brass couplings. */
export function Pipe({ length, d = 18, every = 120, style }: { length: number; d?: number; every?: number; style?: StyleProp<ViewStyle> }) {
  const tile = d * (200 / 68) * (68 / 60)
  const n = Math.ceil(length / tile)
  const couplings = Math.max(0, Math.floor(length / every))
  return (
    <View pointerEvents="none" style={[{ width: length, height: d, overflow: 'visible' }, style]}>
      <View style={{ flexDirection: 'row', width: length, height: d, overflow: 'hidden' }}>
        {Array.from({ length: n }, (_, i) => (
          <Image key={i} source={IMG.pipe} resizeMode="stretch" style={{ width: tile, height: d * (68 / 60), marginTop: -d * (4 / 60) }} />
        ))}
      </View>
      {Array.from({ length: couplings }, (_, i) => (
        <Image key={i} source={IMG.pipeCoupling} style={{ position: 'absolute', left: (i + 0.5) * (length / couplings) - (d * 0.9) / 2, top: d / 2 - (d * 1.43) / 2, width: d * 0.9, height: d * 1.43 }} />
      ))}
    </View>
  )
}

/** Steam blowing off a vent, rising and spreading on a loop. */
export function SteamPuffs({ x, y, size = 60, period = 6500, delay = 0, rise = 120 }: { x: number; y: number; size?: number; period?: number; delay?: number; rise?: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }}>
      {[0, 1, 2].map((i) => (
        <Puff key={i} src={IMG.steam[i]} size={size} period={period} delay={delay + (i * period) / 3} rise={rise} />
      ))}
    </View>
  )
}

function Puff({ src, size, period, delay, rise }: { src: ImageSourcePropType; size: number; period: number; delay: number; rise: number }) {
  const v = useLoop(period, delay, false)
  return (
    <Animated.Image
      source={src}
      style={{
        position: 'absolute',
        left: -size / 2,
        top: -size / 2,
        width: size,
        height: size,
        opacity: v.interpolate({ inputRange: [0, 0.14, 1], outputRange: [0, 0.75, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] }) },
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.2] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.2] }) },
        ],
      }}
    />
  )
}

// ── Jewel lamp ──────────────────────────────────────────────────────────────

/** A cut-glass jewel lamp in a brass bezel, lit in a singer's colour. */
export function JewelLamp({ color, size = 22, lit = true, glow }: { color: string; size?: number; lit?: boolean; glow?: boolean }) {
  const id = useMemo(() => `jl${Math.round(Math.random() * 1e9)}`, [])
  const deep = mix(color, '#000000', 0.55)
  const pale = mix(color, '#FFFFFF', 0.5)
  return (
    <View style={{ width: size, height: size }}>
      {(glow ?? lit) ? <View style={{ position: 'absolute', left: -size * 0.35, top: -size * 0.35, width: size * 1.7, height: size * 1.7, borderRadius: size, backgroundColor: color, opacity: 0.22 }} /> : null}
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <RadialGradient id={`${id}b`} cx="0.36" cy="0.3" r="0.75">
            <Stop offset="0" stopColor={BRASS_SHEEN} />
            <Stop offset="0.3" stopColor={BRASS_HI} />
            <Stop offset="0.62" stopColor={BRASS} />
            <Stop offset="1" stopColor={BRASS_LO} />
          </RadialGradient>
          <RadialGradient id={`${id}j`} cx="0.38" cy="0.34" r="0.7">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.2" stopColor={pale} />
            <Stop offset="0.55" stopColor={color} />
            <Stop offset="1" stopColor={deep} />
          </RadialGradient>
        </Defs>
        <Circle cx={20} cy={20} r={19.5} fill={`url(#${id}b)`} />
        <Circle cx={20} cy={20} r={13} fill={`url(#${id}j)`} opacity={lit ? 1 : 0.5} />
        <Circle cx={15.5} cy={14.5} r={3} fill="#FFFFFF" opacity={0.7} />
      </Svg>
    </View>
  )
}
