import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Line, Path, RadialGradient, Defs, Stop, G } from 'react-native-svg'
import { hashKey } from '../../../helpers'

// ── Steampunk shared vocabulary ─────────────────────────────────────────────
// Design language: a Victorian PRECISION INSTRUMENT — machined, not decorated.
// Near-black iron panels carry thin brass hairlines and small machined screws;
// polished brass is reserved for the single active element on screen; copper
// and gas-lamp amber mark "live" states only. Gears appear in exactly three
// places (backdrop whisper, Stage tab icon, the Play Button hero) so they stay
// special. Everything else earns its steampunk-ness through material and
// restraint: engraved double rules, gauge dials, enamel indicator lamps.

// ── Palette ──────────────────────────────────────────────────────────────────
export const IRON_DEEP = '#120C07' // backdrop base / screen floor
export const IRON_PANEL = '#221711' // card / plate face
export const IRON_WELL = '#0D0805' // recessed wells (inputs, art fallback)
export const BRASS = '#C8973E' // machined brass
export const BRASS_BRIGHT = '#ECCB82' // polished highlight
export const BRASS_DEEP = '#7E571E' // shadowed brass
export const BRASS_INK = '#241505' // engraved lettering ON brass
export const COPPER = '#DD7A42' // live needles / vented states
export const AMBER = '#E8A93B' // gas-lamp light
export const PARCH = '#EFE0BE' // primary text
export const PARCH_DIM = '#B49B72' // secondary text
export const VERDIGRIS = '#74A791' // confirmed / positive
export const OXBLOOD = '#B34A38' // negative / danger
export const HAIRLINE = 'rgba(200,151,62,0.45)' // brass hairline borders
export const HAIRLINE_SOFT = 'rgba(200,151,62,0.22)'
export const ETCH = 'rgba(232,169,59,0.10)' // inner engraved rule

// Machined brass face — vertical polish. Spread into <LinearGradient colors>.
export const BRASS_FACE: [string, string, string] = [BRASS_BRIGHT, BRASS, BRASS_DEEP]

// Standard dark depth shadow — the theme signals depth with shadow, and
// reserves amber glow for genuinely lit elements.
export const DEPTH_SHADOW: ViewStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.45,
  shadowRadius: 10,
  elevation: 6,
}

export const AMBER_GLOW = (opacity = 0.5, radius = 10): ViewStyle => ({
  shadowColor: AMBER,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: opacity,
  shadowRadius: radius,
})

// ── Motion primitives ────────────────────────────────────────────────────────
// Steampunk motion is mechanical and unhurried: linear rotations, sinusoidal
// filament breathing, self-scheduled steam wisps.

// Monotonic 0→1 linear loop — gear rotations.
export function useLinearLoop(durationMs = 8000): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [value, durationMs])
  return value
}

// 0→1→0 sinusoidal oscillation — gas-lamp filament breathing.
export function useOscillator(durationMs = 3200): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: durationMs / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: durationMs / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [value, durationMs])
  return value
}

// One-shot 0→1 bursts on a self-rescheduled cadence — steam wisps.
export function useDelayedBursts(
  intervalMs: number,
  durationMs: number,
  delayMs = 0,
): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      value.setValue(0)
      Animated.timing(value, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (cancelled) return
        setTimeout(tick, intervalMs)
      })
    }
    const handle = setTimeout(tick, delayMs)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [value, intervalMs, durationMs, delayMs])
  return value
}

// ── Machined screw ───────────────────────────────────────────────────────────
// A flat-head screw with a slot line — quieter and more "machined" than the
// old domed rivets. The slot angle comes from the seed so a plate's four
// screws never line up like a printed pattern.
export const Screw = React.memo(function Screw({
  size = 7,
  angle = 40,
}: {
  size?: number
  angle?: number
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Defs>
        <RadialGradient id="screw-face" cx="35%" cy="30%" rx="70%" ry="70%">
          <Stop offset="0%" stopColor={BRASS_BRIGHT} stopOpacity={1} />
          <Stop offset="60%" stopColor={BRASS} stopOpacity={1} />
          <Stop offset="100%" stopColor={BRASS_DEEP} stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <Circle cx={5} cy={5} r={4.3} fill="url(#screw-face)" stroke="rgba(0,0,0,0.6)" strokeWidth={0.6} />
      <Line
        x1={2.4}
        y1={5}
        x2={7.6}
        y2={5}
        stroke="#3A2810"
        strokeWidth={1.1}
        strokeLinecap="round"
        transform={`rotate(${angle} 5 5)`}
      />
    </Svg>
  )
})

// Four corner screws for a plate. Slot angles derive from the seed.
export function CornerScrews({
  seed = 0,
  inset = 6,
  size = 7,
}: {
  seed?: string | number
  inset?: number
  size?: number
}) {
  const h = hashKey(seed)
  const angles = [h % 180, (h >> 3) % 180, (h >> 6) % 180, (h >> 9) % 180]
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', top: inset, left: inset }}>
        <Screw size={size} angle={angles[0]} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', top: inset, right: inset }}>
        <Screw size={size} angle={angles[1]} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: inset, left: inset }}>
        <Screw size={size} angle={angles[2]} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: inset, right: inset }}>
        <Screw size={size} angle={angles[3]} />
      </View>
    </>
  )
}

// ── Instrument plate ─────────────────────────────────────────────────────────
// The theme's standard panel: iron face, brass hairline, an engraved inner
// rule, and a whisper of glass light along the top. Optional corner screws
// for load-bearing panels (cards, rows, the tab bar).
export function Plaque({
  children,
  style,
  radius = 12,
  screws = false,
  seed = 0,
  bg = IRON_PANEL,
}: {
  children?: React.ReactNode
  style?: ViewStyle | ViewStyle[]
  radius?: number
  screws?: boolean
  seed?: string | number
  bg?: string
}) {
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: HAIRLINE,
          overflow: 'hidden',
        },
        DEPTH_SHADOW,
        ...(Array.isArray(style) ? style : style ? [style] : []),
      ]}
    >
      {/* engraved inner rule */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { margin: 3, borderRadius: Math.max(2, radius - 3), borderWidth: 1, borderColor: ETCH },
        ]}
      />
      {/* glass light along the top edge */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(236,203,130,0.07)', 'rgba(236,203,130,0)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 26 }}
      />
      {children}
      {screws ? <CornerScrews seed={seed} /> : null}
    </View>
  )
}

// ── Gear ─────────────────────────────────────────────────────────────────────
// A machined cog: unified toothed silhouette, four spoke holes, polished hub.
// Tones are presets so every gear in the theme shares one material language.
export type GearTone = 'brass' | 'copper' | 'iron' | 'verdigris'

const GEAR_TONES: Record<GearTone, { hi: string; body: string; edge: string; hub: string }> = {
  brass: { hi: BRASS_BRIGHT, body: BRASS, edge: '#6E4C16', hub: '#2A1C0C' },
  copper: { hi: '#F2A66E', body: COPPER, edge: '#8A431E', hub: '#331708' },
  iron: { hi: '#584225', body: '#332514', edge: '#160E07', hub: '#0E0904' },
  verdigris: { hi: '#A4CCBB', body: VERDIGRIS, edge: '#3A5A4D', hub: '#16241E' },
}

export const Gear = React.memo(function Gear({
  size,
  teeth = 12,
  tone = 'brass',
  opacity = 1,
}: {
  size: number
  teeth?: number
  tone?: GearTone
  opacity?: number
}) {
  const c = GEAR_TONES[tone]
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 1
  const innerR = outerR * 0.8
  const hubR = outerR * 0.24
  const spokeOrbit = outerR * 0.52
  const spokeR = outerR * 0.12
  const gradId = `gear-${tone}-${size}-${teeth}`

  let toothPath = ''
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2 - Math.PI / teeth / 2
    const a1 = a0 + Math.PI / teeth / 2
    const a2 = a1 + (Math.PI / teeth) * 0.5
    const a3 = a2 + Math.PI / teeth / 2
    const p = (a: number, r: number) => `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`
    toothPath += `${i === 0 ? 'M' : 'L'} ${p(a0, innerR)} L ${p(a1, outerR)} L ${p(a2, outerR)} L ${p(a3, innerR)} `
  }
  toothPath += 'Z'

  const spokes = [0, 1, 2, 3].map((i) => {
    const a = (i / 4) * Math.PI * 2 - Math.PI / 4
    return { x: cx + Math.cos(a) * spokeOrbit, y: cy + Math.sin(a) * spokeOrbit }
  })

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} opacity={opacity}>
      <Defs>
        <RadialGradient id={gradId} cx="35%" cy="30%" rx="72%" ry="72%">
          <Stop offset="0%" stopColor={c.hi} stopOpacity={1} />
          <Stop offset="55%" stopColor={c.body} stopOpacity={1} />
          <Stop offset="100%" stopColor={c.edge} stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <Path d={toothPath} fill={`url(#${gradId})`} stroke={c.edge} strokeWidth={1} />
      <Circle cx={cx} cy={cy} r={innerR * 0.8} fill="none" stroke={c.edge} strokeWidth={1.1} opacity={0.75} />
      {spokes.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={spokeR} fill={c.hub} />
      ))}
      <Circle cx={cx} cy={cy} r={hubR} fill={c.hub} />
      <Circle cx={cx - hubR * 0.28} cy={cy - hubR * 0.28} r={hubR * 0.4} fill={c.hi} opacity={0.55} />
    </Svg>
  )
})

// ── Gauge dial ───────────────────────────────────────────────────────────────
// A static instrument dial. `value` (0..1) positions the copper needle across
// a 240° sweep; the last 30% of the arc is the red zone. Fully SVG — no
// animation — so it can be sprinkled cheaply as a data ornament.
export function GaugeDial({ size = 16, value = 0.4 }: { size?: number; value?: number }) {
  const v = Math.min(1, Math.max(0, value))
  const needleDeg = -120 + v * 240
  const pt = (deg: number, r: number): [number, number] => {
    const rad = (deg * Math.PI) / 180
    return [50 + Math.sin(rad) * r, 50 - Math.cos(rad) * r]
  }
  const [rx1, ry1] = pt(48, 34)
  const [rx2, ry2] = pt(120, 34)
  const ticks = [0, 1, 2, 3, 4].map((i) => {
    const deg = -120 + i * 60
    const [x1, y1] = pt(deg, 33)
    const [x2, y2] = pt(deg, 40)
    return { x1, y1, x2, y2 }
  })
  const [nx, ny] = pt(needleDeg, 30)
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={46} fill={IRON_WELL} stroke={BRASS} strokeWidth={6} />
      <Path d={`M ${rx1} ${ry1} A 34 34 0 0 1 ${rx2} ${ry2}`} fill="none" stroke={OXBLOOD} strokeWidth={7} strokeLinecap="round" />
      {ticks.map((t, i) => (
        <Line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={BRASS} strokeWidth={4} />
      ))}
      <Line x1={50} y1={50} x2={nx} y2={ny} stroke={COPPER} strokeWidth={7} strokeLinecap="round" />
      <Circle cx={50} cy={50} r={8} fill={BRASS} />
    </Svg>
  )
}

// ── Corner brackets ──────────────────────────────────────────────────────────
// Brass L-brackets that "mount" album art to its plate — the theme's signature
// framing detail. Rendered as an absolute overlay on a square-ish container.
export function CornerBrackets({
  length = 14,
  thickness = 2,
  inset = -1,
  color = BRASS,
}: {
  length?: number
  thickness?: number
  inset?: number
  color?: string
}) {
  const bar = (extra: ViewStyle): React.ReactElement => (
    <View pointerEvents="none" style={{ position: 'absolute', backgroundColor: color, borderRadius: 1, ...extra }} />
  )
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* top-left */}
      {bar({ top: inset, left: inset, width: length, height: thickness })}
      {bar({ top: inset, left: inset, width: thickness, height: length })}
      {/* top-right */}
      {bar({ top: inset, right: inset, width: length, height: thickness })}
      {bar({ top: inset, right: inset, width: thickness, height: length })}
      {/* bottom-left */}
      {bar({ bottom: inset, left: inset, width: length, height: thickness })}
      {bar({ bottom: inset, left: inset, width: thickness, height: length })}
      {/* bottom-right */}
      {bar({ bottom: inset, right: inset, width: length, height: thickness })}
      {bar({ bottom: inset, right: inset, width: thickness, height: length })}
    </View>
  )
}

// ── Engraved rule ────────────────────────────────────────────────────────────
// A thin double rule with a diamond stud at center — Victorian print furniture
// used as a section divider inside plates.
export function EngravedRule({ width = '100%' as ViewStyle['width'] }) {
  return (
    <View style={{ width, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ height: 1, alignSelf: 'stretch', backgroundColor: HAIRLINE_SOFT }} />
      <View
        style={{
          position: 'absolute',
          width: 5,
          height: 5,
          backgroundColor: BRASS,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  )
}

// ── Steam wisp ───────────────────────────────────────────────────────────────
// One soft steam puff rising from (x, baseY). Used by the backdrop only.
export function SteamWisp({
  x,
  baseY,
  interval,
  duration,
  delay,
  maxOpacity = 0.18,
}: {
  x: number
  baseY: number
  interval: number
  duration: number
  delay: number
  maxOpacity?: number
}) {
  const puff = useDelayedBursts(interval, duration, delay)
  const translateY = puff.interpolate({ inputRange: [0, 1], outputRange: [0, -240] })
  const translateX = puff.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 10, -8] })
  const scale = puff.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 2.3] })
  const opacity = puff.interpolate({
    inputRange: [0, 0.15, 0.7, 1],
    outputRange: [0, maxOpacity, maxOpacity * 0.5, 0],
  })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - 50,
        top: baseY - 50,
        width: 100,
        height: 100,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      <Svg width={100} height={100}>
        <Defs>
          <RadialGradient id="wisp" cx="50%" cy="50%" rx="55%" ry="55%">
            <Stop offset="0%" stopColor="#E8DDC5" stopOpacity={0.6} />
            <Stop offset="60%" stopColor="#C9B89A" stopOpacity={0.25} />
            <Stop offset="100%" stopColor="#A89878" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={48} fill="url(#wisp)" />
      </Svg>
    </Animated.View>
  )
}

// Riveted iron seam — a hairline wall joint with evenly spaced bolt dots.
// Backdrop furniture.
export function IronSeam({ y, boltEvery = 96 }: { y: number; boltEvery?: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: y, left: 0, right: 0, height: 8 }}>
      <View style={{ position: 'absolute', top: 3.5, left: 0, right: 0, height: 1, backgroundColor: 'rgba(200,151,62,0.10)' }} />
      <Svg width="100%" height={8}>
        <G>
          {Array.from({ length: 12 }).map((_, i) => (
            <Circle key={i} cx={i * boltEvery + 24} cy={4} r={1.6} fill="rgba(200,151,62,0.18)" />
          ))}
        </G>
      </Svg>
    </View>
  )
}
