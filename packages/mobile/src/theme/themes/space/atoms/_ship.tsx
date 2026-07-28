import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  AppState,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native'
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg'

// ── SPACE / "FLIGHT DECK" — shared visual vocabulary ────────────────────────
//
// The design premise: the phone is a panel on a spacecraft's flight deck. Not
// "space as decoration" — the UI is machined hardware you could put a wrench to.
// Three ideas carry the whole theme, and every atom composes them:
//
//   1. CHAMFERED PANELS. Every surface is a milled plate whose corners are cut
//      at 45°, drawn as a real SVG silhouette (see `MachinedPanel`) rather than
//      faked with borderRadius. The cut is ASYMMETRIC — top-left and
//      bottom-right only — so panels have a reading direction. This is the
//      theme's structural signature and the reason it doesn't read as
//      "generic sci-fi with corner brackets".
//
//   2. ONE LIVE LIGHT PER ELEMENT. Structure is desaturated steel; the only
//      saturated pixels are lamps. Each panel carries a 2px `systemBar` down
//      its left edge in its status tone, which is how state is communicated
//      (ice = nominal, amber = attention, violet = drive, red = critical,
//      steel = inert). No element gets two lamp colors.
//
//   3. PHYSICAL PRESS. Nothing fades on touch. Panels tilt away from the
//      finger on a perspective transform and settle on a spring, so buttons
//      read as keys with travel. All of it runs on the native driver.
//
// Deliberately absent, because the previous space theme leaned on them and they
// are what makes sci-fi UI look like a sticker pack: magenta, HUD corner
// brackets, dashed orbit rings, orbiting satellite dots, and scan lines on
// every surface.

// ── palette ─────────────────────────────────────────────────────────────────
// Mirrors the SPACE_MOBILE token overrides in theme/tokens.ts. Atoms import
// from here so a colour is named by its role in the ship, not its hue.

export const VOID = '#04060B' // deepest hull shadow / app background
export const HULL = '#0B1119' // panel base
export const HULL_HI = '#131C27' // raised panel
export const HULL_WELL = '#070C13' // recessed wells (art bays, inputs)
export const STEEL = '#2A3644' // machined edge
export const STEEL_HI = '#5A6B7D' // polished chamfer highlight
export const STEEL_LIGHT = '#A9BDD0' // brightest milled edge catch

export const ICE = '#5BE9FF' // live / nominal systems lamp
export const ICE_DEEP = '#2BA9C4' // shadowed side of an ice gradient
export const AMBER = '#FFB43D' // caution / attention
export const VIOLET = '#8B5CFF' // drive plasma
export const NOMINAL = '#52FFB8' // go / confirmed
export const CRITICAL = '#FF5A4A' // master caution

export const TEXT = '#DCE6F2' // instrument white
export const TEXT_DIM = '#7B8A9C' // secondary
export const TEXT_FAINT = '#4E5C6D' // engraved / tertiary

// Telemetry face. Every number the user reads as an instrument value —
// durations, scores, positions, channel codes — is set in this, never in the
// display face. Registered in App.tsx's useFonts map.
export const MONO = 'ShareTechMono_400Regular'

// Hairlines. Ice at low alpha reads as "this edge is powered".
export const EDGE = 'rgba(91,233,255,0.22)'
export const EDGE_SOFT = 'rgba(91,233,255,0.12)'
export const EDGE_STEEL = 'rgba(140,168,192,0.16)'
export const MILLED = 'rgba(169,189,208,0.30)' // top-edge light catch

export type Tone = 'ice' | 'amber' | 'violet' | 'nominal' | 'critical' | 'steel'

export const TONES: Record<Tone, string> = {
  ice: ICE,
  amber: AMBER,
  violet: VIOLET,
  nominal: NOMINAL,
  critical: CRITICAL,
  steel: STEEL_HI,
}

// ── motion primitives ───────────────────────────────────────────────────────
// Flight-deck motion is either mechanical (linear, constant) or instrumental
// (slow sinusoidal breathing). Nothing bounces for decoration.

/** 0 → 1 → 0 sinusoidal oscillation — lamp breathing, slow drift. */
export function useOscillator(durationMs = 3200, delayMs = 0): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const half = durationMs / 2
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: half,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: half,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    )
    const handle = setTimeout(() => loop.start(), delayMs)
    return () => {
      clearTimeout(handle)
      loop.stop()
    }
  }, [value, durationMs, delayMs])
  return value
}

/** 0 → 1 monotonic loop — rotations, travelling indicators. */
export function useLinearLoop(durationMs = 8000, delayMs = 0): Animated.Value {
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
    const handle = setTimeout(() => loop.start(), delayMs)
    return () => {
      clearTimeout(handle)
      loop.stop()
    }
  }, [value, durationMs, delayMs])
  return value
}

/**
 * Physical key travel. Returns a native-driver transform that tilts the
 * element away from the finger and settles on a spring, plus the press
 * handlers to spread onto a Pressable.
 *
 * `depth` is also returned raw so callers can drive a lamp flash from the same
 * value — one gesture, one driver.
 */
export function usePressTravel(strength = 1): {
  depth: Animated.Value
  transform: ViewStyle['transform']
  onPressIn: () => void
  onPressOut: () => void
} {
  const depth = useRef(new Animated.Value(0)).current

  const onPressIn = () => {
    Animated.timing(depth, {
      toValue: 1,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }
  const onPressOut = () => {
    Animated.spring(depth, {
      toValue: 0,
      stiffness: 260,
      damping: 18,
      mass: 0.6,
      useNativeDriver: true,
    }).start()
  }

  const transform = [
    { perspective: 700 },
    {
      rotateX: depth.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${5 * strength}deg`],
      }),
    },
    {
      translateY: depth.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1.5 * strength],
      }),
    },
    {
      scale: depth.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1 - 0.014 * strength],
      }),
    },
  ] as ViewStyle['transform']

  return { depth, transform, onPressIn, onPressOut }
}

/**
 * Measures a view once laid out. `MachinedPanel` needs real pixel dimensions
 * because its chamfered silhouette is a stroked SVG path — stretching a viewBox
 * instead would skew the 45° cuts and the hairline width, which is exactly the
 * "machined" quality the theme is built on.
 */
export function useMeasuredSize(): {
  size: { width: number; height: number } | null
  onLayout: (event: LayoutChangeEvent) => void
} {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setSize((previous) => {
      // Sub-pixel layout jitter would otherwise re-render the SVG every frame
      // during a list scroll.
      if (
        previous &&
        Math.abs(previous.width - width) < 0.5 &&
        Math.abs(previous.height - height) < 0.5
      ) {
        return previous
      }
      return { width, height }
    })
  }
  return { size, onLayout }
}

/** Stable, SVG-safe unique id. React's useId emits colons, which break url(#…). */
export function useSvgId(prefix: string): string {
  return useMemo(() => {
    svgIdCounter += 1
    return `${prefix}${svgIdCounter}`
  }, [prefix])
}
let svgIdCounter = 0

// ── deterministic randomness ────────────────────────────────────────────────

/** Lehmer PRNG — stable star fields and tick patterns across re-renders. */
export function rng(seed: number): () => number {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
}

// ── chamfered geometry ──────────────────────────────────────────────────────

export interface Cuts {
  tl?: number
  tr?: number
  br?: number
  bl?: number
}

/** The theme's default cut: top-left and bottom-right, giving panels a grain. */
export const CUT_PLATE: Cuts = { tl: 14, br: 14 }
export const CUT_CHIP: Cuts = { tl: 8, br: 8 }
export const CUT_TIGHT: Cuts = { tl: 6, br: 6 }

/**
 * SVG path for a rectangle with chamfered corners.
 *
 * `inset` pulls the path in from the box edge so a stroke of that width isn't
 * clipped in half by the SVG viewport — pass strokeWidth / 2.
 */
export function chamferPath(width: number, height: number, cuts: Cuts, inset = 0): string {
  const left = inset
  const top = inset
  const right = width - inset
  const bottom = height - inset
  const limit = Math.max(0, Math.min(right - left, bottom - top) / 2)
  const tl = Math.min(cuts.tl ?? 0, limit)
  const tr = Math.min(cuts.tr ?? 0, limit)
  const br = Math.min(cuts.br ?? 0, limit)
  const bl = Math.min(cuts.bl ?? 0, limit)
  return [
    `M ${left + tl} ${top}`,
    `L ${right - tr} ${top}`,
    tr > 0 ? `L ${right} ${top + tr}` : '',
    `L ${right} ${bottom - br}`,
    br > 0 ? `L ${right - br} ${bottom}` : '',
    `L ${left + bl} ${bottom}`,
    bl > 0 ? `L ${left} ${bottom - bl}` : '',
    `L ${left} ${top + tl}`,
    'Z',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Regular polygon path, used for hex lamp bezels and bolt heads. */
export function polygonPath(sides: number, radius: number, cx: number, cy: number, rotation = 0): string {
  const points: string[] = []
  for (let index = 0; index < sides; index += 1) {
    const angle = (index / sides) * Math.PI * 2 + rotation
    points.push(`${cx + Math.cos(angle) * radius} ${cy + Math.sin(angle) * radius}`)
  }
  return `M ${points.join(' L ')} Z`
}

// ── MachinedPanel ───────────────────────────────────────────────────────────
// The theme's one surface primitive. Everything that holds content — cards,
// rows, chips, inputs, buttons, the tab rail — is one of these.
//
// Layer order, bottom to top:
//   1. chamfered fill (a vertical black-glass gradient)
//   2. chamfered 1px hairline in the panel's tone
//   3. milled top-edge light catch (the strongest cue that this is metal)
//   4. optional 2px system bar down the left edge, in the tone
//   5. optional hex bolts on the two square corners
//   6. children
//
// Until the first layout pass `size` is null and only the children render. That
// is a single frame, and every list in this theme mounts its rows through
// `ItemFloater`'s fade-in, which covers it entirely.

export interface MachinedPanelProps {
  children?: React.ReactNode
  // Typed as exactly what the root Animated.View accepts, because nearly every
  // caller passes `usePressTravel`'s transform straight through. A plain View
  // root here throws "Transform with key of rotateX must be a string" at
  // runtime — the interpolations never resolve.
  style?: React.ComponentProps<typeof Animated.View>['style']
  contentStyle?: ViewStyle
  cuts?: Cuts
  tone?: Tone
  /** Panel fill. 'glass' is translucent so the 3D scene reads through it. */
  fill?: 'glass' | 'panel' | 'raised' | 'well' | 'none'
  systemBar?: boolean
  bolts?: boolean
  /** Strength of the tone hairline, 0–1. Lower for quiet, inert panels. */
  edgeStrength?: number
}

const FILLS: Record<string, [string, string]> = {
  // Alpha, not opaque: the shared 3D scene behind every screen has to show
  // through or the theme loses its depth.
  glass: ['rgba(13,20,29,0.90)', 'rgba(6,10,17,0.94)'],
  panel: [HULL, VOID],
  raised: [HULL_HI, HULL],
  well: [HULL_WELL, '#04070C'],
}

export function MachinedPanel({
  children,
  style,
  contentStyle,
  cuts = CUT_PLATE,
  tone = 'ice',
  fill = 'glass',
  systemBar = false,
  bolts = false,
  edgeStrength = 1,
}: MachinedPanelProps) {
  const { size, onLayout } = useMeasuredSize()
  const gradientId = useSvgId('panelFill')
  const toneColor = TONES[tone]

  return (
    <Animated.View
      onLayout={onLayout}
      style={[{ backgroundColor: 'transparent' }, style]}
    >
      {size && size.width > 1 && size.height > 1 ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width={size.width} height={size.height}>
            <Defs>
              {/* Two flat <Stop> children, not a conditional fragment:
                  react-native-svg types gradient children as an element array,
                  so a Fragment in this slot fails to typecheck. */}
              <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0.35" y2="1">
                <Stop
                  offset="0"
                  stopColor={fill === 'none' ? 'rgba(0,0,0,0)' : FILLS[fill][0]}
                />
                <Stop
                  offset="1"
                  stopColor={fill === 'none' ? 'rgba(0,0,0,0)' : FILLS[fill][1]}
                />
              </SvgLinearGradient>
            </Defs>

            {/* 1 + 2 — silhouette fill and powered hairline, one path each so
                the stroke follows the chamfer exactly. */}
            <Path d={chamferPath(size.width, size.height, cuts)} fill={`url(#${gradientId})`} />
            <Path
              d={chamferPath(size.width, size.height, cuts, 0.5)}
              fill="none"
              stroke={toneColor}
              strokeOpacity={0.26 * edgeStrength}
              strokeWidth={1}
            />

            {/* 3 — milled top edge. Stops short of both chamfers so it reads as
                a machined face rather than a drawn border. */}
            <Path
              d={`M ${(cuts.tl ?? 0) + 2} 1.5 L ${size.width - (cuts.tr ?? 0) - 2} 1.5`}
              stroke={MILLED}
              strokeOpacity={0.85 * edgeStrength}
              strokeWidth={1}
              strokeLinecap="round"
            />

            {/* 4 — system bar: the panel's state, in one 2px stripe. */}
            {systemBar ? (
              <Path
                d={`M 1.5 ${(cuts.tl ?? 0) + 3} L 1.5 ${size.height - (cuts.bl ?? 0) - 3}`}
                stroke={toneColor}
                strokeWidth={2}
                strokeOpacity={0.95}
                strokeLinecap="round"
              />
            ) : null}

            {/* 5 — bolts on the corners the chamfer left square. */}
            {bolts ? (
              <>
                <HexBolt cx={size.width - 9} cy={9} />
                <HexBolt cx={9} cy={size.height - 9} />
              </>
            ) : null}
          </Svg>
        </View>
      ) : null}
      <View style={contentStyle}>{children}</View>
    </Animated.View>
  )
}

/** A small machined fastener. SVG children — must live inside an <Svg>. */
export function HexBolt({ cx, cy, radius = 3.4 }: { cx: number; cy: number; radius?: number }) {
  return (
    <>
      <Path
        d={polygonPath(6, radius, cx, cy, Math.PI / 6)}
        fill={STEEL}
        stroke={STEEL_HI}
        strokeWidth={0.6}
        strokeOpacity={0.7}
      />
      <Path
        d={`M ${cx - radius * 0.5} ${cy} L ${cx + radius * 0.5} ${cy}`}
        stroke={VOID}
        strokeWidth={0.9}
        strokeLinecap="round"
      />
    </>
  )
}

/**
 * Engraved tick ladder — the theme's texture of choice, standing in for the
 * scan lines the old space theme put on every surface. SVG children.
 */
export function TickLadder({
  x,
  y,
  length,
  count,
  vertical = false,
  color = STEEL_HI,
  opacity = 0.3,
  majorEvery = 4,
}: {
  x: number
  y: number
  length: number
  count: number
  vertical?: boolean
  color?: string
  opacity?: number
  majorEvery?: number
}) {
  const ticks: React.ReactElement[] = []
  for (let index = 0; index < count; index += 1) {
    const t = count === 1 ? 0 : (index / (count - 1)) * length
    const major = index % majorEvery === 0
    const size = major ? 5 : 2.5
    ticks.push(
      <Path
        key={index}
        d={
          vertical
            ? `M ${x} ${y + t} L ${x + size} ${y + t}`
            : `M ${x + t} ${y} L ${x + t} ${y + size}`
        }
        stroke={color}
        strokeWidth={major ? 1 : 0.8}
        strokeOpacity={major ? opacity : opacity * 0.55}
        strokeLinecap="round"
      />,
    )
  }
  return <>{ticks}</>
}

// ── Lamp ────────────────────────────────────────────────────────────────────
// A hexagonal annunciator lamp: machined bezel, lit lens, and a soft halo. The
// halo is the theme's ONLY glow, and it is always 2D — Filament's bloom is
// skipped on the full-screen scene to protect the frame budget, so lamp glow is
// drawn here where a radial gradient costs nothing.

export function Lamp({
  size,
  color,
  lit,
  glow = 1,
}: {
  size: number
  color: string
  lit: boolean
  glow?: number
}) {
  const id = useSvgId('lamp')
  const half = size / 2
  const bezel = half - 1
  const lens = bezel * 0.68
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={`${id}halo`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={lit ? 0.55 * glow : 0} />
          <Stop offset="0.55" stopColor={color} stopOpacity={lit ? 0.16 * glow : 0} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}lens`} cx="38%" cy="32%" r="70%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={lit ? 0.95 : 0.16} />
          <Stop offset="0.42" stopColor={color} stopOpacity={lit ? 1 : 0.4} />
          <Stop offset="1" stopColor={color} stopOpacity={lit ? 0.72 : 0.16} />
        </RadialGradient>
      </Defs>
      {lit ? <Circle cx={half} cy={half} r={half} fill={`url(#${id}halo)`} /> : null}
      <Path
        d={polygonPath(6, bezel, half, half, Math.PI / 6)}
        fill={HULL_HI}
        stroke={lit ? color : STEEL}
        strokeOpacity={lit ? 0.9 : 0.8}
        strokeWidth={1.2}
      />
      <Circle cx={half} cy={half} r={lens} fill={`url(#${id}lens)`} />
      {/* Specular pip — sells the lens as glass rather than a flat dot. */}
      <Circle
        cx={half - lens * 0.3}
        cy={half - lens * 0.34}
        r={lens * 0.22}
        fill="#FFFFFF"
        opacity={lit ? 0.7 : 0.22}
      />
    </Svg>
  )
}

/**
 * Free-standing 2D glow. Layered *under* a Filament view so a 3D lamp appears
 * to bloom without paying for post-processing, and used on its own wherever a
 * lit element needs a halo.
 */
export function GlowHalo({
  size,
  color,
  intensity = 0.5,
}: {
  size: number
  color: string
  intensity?: number
}) {
  const id = useSvgId('halo')
  return (
    <Svg width={size} height={size} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={intensity} />
          <Stop offset="0.4" stopColor={color} stopOpacity={intensity * 0.4} />
          <Stop offset="0.72" stopColor={color} stopOpacity={intensity * 0.11} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  )
}

// ── star field ──────────────────────────────────────────────────────────────
// Static SVG points in two magnitude classes, plus a handful of brighter stars
// that breathe. Rendered once and never re-laid-out; the breathing stars are
// separate Animated views on the native driver so the big Svg stays static.

export interface StarSpec {
  cx: number
  cy: number
  r: number
  opacity: number
  color: string
}

export function buildStarField(
  seed: number,
  count: number,
  width: number,
  height: number,
): StarSpec[] {
  const random = rng(seed)
  const stars: StarSpec[] = []
  for (let index = 0; index < count; index += 1) {
    const magnitude = random()
    const hue = random()
    stars.push({
      cx: random() * width,
      cy: random() * height,
      r: 0.5 + magnitude * magnitude * 1.5,
      opacity: 0.18 + magnitude * 0.5,
      // Mostly white; a scattering of ice and amber for depth. No violet — it
      // would compete with the drive lamp, which should be the only violet.
      color: hue > 0.94 ? AMBER : hue > 0.82 ? ICE : hue > 0.7 ? '#BFD4EA' : '#FFFFFF',
    })
  }
  return stars
}

export function StarField({
  stars,
  width,
  height,
}: {
  stars: StarSpec[]
  width: number
  height: number
}) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((star, index) => (
        <Circle
          key={index}
          cx={star.cx}
          cy={star.cy}
          r={star.r}
          fill={star.color}
          opacity={star.opacity}
        />
      ))}
    </Svg>
  )
}

export function BreathingStar({ spec, period }: { spec: StarSpec; period: number }) {
  const breath = useOscillator(period, (spec.cx * 7) % 2600)
  const opacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [spec.opacity * 0.25, Math.min(1, spec.opacity * 1.6)],
  })
  const box = spec.r * 6
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: spec.cx - box / 2,
        top: spec.cy - box / 2,
        width: box,
        height: box,
        opacity,
      }}
    >
      <Svg width={box} height={box}>
        <Circle cx={box / 2} cy={box / 2} r={spec.r} fill={spec.color} />
        <Circle cx={box / 2} cy={box / 2} r={spec.r * 2.4} fill={spec.color} opacity={0.16} />
      </Svg>
    </Animated.View>
  )
}

/**
 * The planet the ship is holding station over — only its limb is on screen, so
 * it reads as something enormous just out of frame rather than a cartoon ball.
 *
 * Deliberately 2D: an atmospheric rim is a fresnel gradient, which SVG does in
 * two stops and untextured PBR can't do at all. Filament handles the machined
 * hardware; gradients stay here.
 */
export function PlanetLimb({
  size,
  left,
  top,
}: {
  size: number
  left: number
  top: number
}) {
  const id = useSvgId('planet')
  const half = size / 2
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left, top, width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Body: lit from the upper right, falling to unlit black. */}
          <RadialGradient id={`${id}body`} cx="72%" cy="24%" r="78%">
            <Stop offset="0" stopColor="#26405C" stopOpacity={0.95} />
            <Stop offset="0.35" stopColor="#152538" stopOpacity={0.95} />
            <Stop offset="0.7" stopColor="#080E17" stopOpacity={0.96} />
            <Stop offset="1" stopColor="#04060B" stopOpacity={1} />
          </RadialGradient>
          {/* Atmosphere: a thin bright shell hugging the limb. */}
          <RadialGradient id={`${id}atmo`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.86" stopColor={ICE} stopOpacity={0} />
            <Stop offset="0.955" stopColor={ICE} stopOpacity={0.3} />
            <Stop offset="0.985" stopColor="#BFF4FF" stopOpacity={0.5} />
            <Stop offset="1" stopColor={ICE} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={half} cy={half} r={half * 0.94} fill={`url(#${id}body)`} />
        <Circle cx={half} cy={half} r={half} fill={`url(#${id}atmo)`} />
      </Svg>
    </View>
  )
}

/**
 * Viewport scrims. The 3D scene lives behind every screen, so the top and
 * bottom bands where headers and the tab rail sit get darkened — enough for
 * type to hold, gentle enough that the station is still visible in the margins.
 * Cards carry their own glass, so this stays light-handed on purpose.
 */
export function ViewportScrim({ edge }: { edge: 'top' | 'bottom' }) {
  const id = useSvgId('scrim')
  const top = edge === 'top'
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        [top ? 'top' : 'bottom']: 0,
        height: top ? '26%' : '30%',
      }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id={id} x1="0" y1={top ? '0' : '1'} x2="0" y2={top ? '1' : '0'}>
            <Stop offset="0" stopColor={VOID} stopOpacity={top ? 0.82 : 0.9} />
            <Stop offset="0.55" stopColor={VOID} stopOpacity={top ? 0.32 : 0.42} />
            <Stop offset="1" stopColor={VOID} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  )
}

// ── Filament budget ─────────────────────────────────────────────────────────
//
// Every <FilamentScene> is its own engine, scene, view, camera and render
// thread — `FilamentScene.tsx` builds all of them from one `useEngine`, and
// `engine.getView()` / `engine.getCamera()` are per-engine singletons, so a
// second view means a second engine. That is the whole performance story for
// this theme, and the reason for the two rules below.
//
// RULE 1 — the outboard scene is a singleton.
//   `ui.SceneLayer` is mounted by ThemeCrossfade, and the Wizard and Request
//   modals each wrap themselves in their own SessionThemeProvider. Without a
//   claim, opening the wizard would stand up a second full-screen engine on top
//   of the session's. The first mount (always SessionTabs, which is already on
//   screen when a modal opens) wins and renders 3D; later mounts render the 2D
//   atmosphere alone, which is a complete look in its own right.
//
// RULE 2 — two engines, ever.
//   Exactly two scenes exist in this theme: the outboard viewport and the tab
//   bar's nav pod. Everything else that looks dimensional — buttons, cards, the
//   stage play button — is 2D geometry with perspective press transforms on the
//   native driver, which costs nothing and never contends for the GPU.

let outboardClaimed = false

export function useIsOutboardOwner(): boolean {
  const [isOwner, setIsOwner] = useState(false)
  useEffect(() => {
    if (outboardClaimed) return undefined
    outboardClaimed = true
    setIsOwner(true)
    return () => {
      outboardClaimed = false
      setIsOwner(false)
    }
  }, [])
  return isOwner
}

/**
 * True while the app is foregrounded. Filament keeps rendering behind a
 * backgrounded app otherwise, which is pure battery burn — every scene in this
 * theme gates its choreographer on this.
 */
export function useIsForeground(): boolean {
  const [active, setActive] = useState(() => AppState.currentState === 'active')
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) =>
      setActive(next === 'active'),
    )
    return () => subscription.remove()
  }, [])
  return active
}

// ── camera framing ──────────────────────────────────────────────────────────
//
// Filament's `setLensProjection` treats focal length as a 35mm-format lens over
// a 24mm-tall sensor, so the vertical half-extent of the frustum at distance d
// is (SENSOR_MM / 2) * d / focalLength. Both axes share one scale, which means
// a view's pixels convert to world units with a single factor — that's what
// lets the tab bar place the nav pod at an exact tab centre instead of a
// hand-tuned fudge factor.
//
// If 3D placement ever looks uniformly off, SENSOR_MM is the one number to
// check against the Filament version in use.
export const SENSOR_MM = 24

export function pxPerWorldUnit(
  viewHeightPx: number,
  focalLengthMm: number,
  cameraDistance: number,
): number {
  return (viewHeightPx * focalLengthMm) / (SENSOR_MM * cameraDistance)
}
