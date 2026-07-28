import React, { useRef } from 'react'
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path } from 'react-native-svg'
import { hashKey, hexToRgba } from '../../../helpers'

// ── PSYCHEDELIC / "LIQUID LIGHT" — shared visual vocabulary ─────────────────
//
// The background is real footage of a liquid light show: saturated, polychrome,
// high-contrast and constantly moving. Everything here exists to put a legible,
// FUN interface on top of that.
//
// Four rules, each one the lesson of a rejected attempt:
//
//   1. CARDS ARE OPAQUE PRINTED PLATES, not glass. A saturated field of dye with ink
//      lettering — Fillmore poster construction. Two earlier passes went the other
//      way (grey glass, then tinted glass) and both were legible and completely inert
//      next to the footage. See `Plate`.
//   2. TEXT IS INK ON BRIGHT, or white on dark — never a dyed glyph. That is the line
//      between colourful and unreadable, and it's why every entry in `DYES` is
//      constrained to carry ink at body sizes.
//   3. EVERYTHING BREATHES, AND VISIBLY. ±8-12% scale, not ±3%. An earlier pass
//      animated small enough that the motion could not be seen at all, which is worse
//      than holding still: the cost is paid and nothing is delivered.
//   4. NOTHING BREATHES IN SYNC. Every loop takes a period AND a phase offset derived
//      from the item's own key. A screen of elements pulsing in lockstep reads as a
//      broken refresh; the same elements out of step read as a surface that's alive.
//      This is why `usePulse` takes a delay and why callers must pass one.
//
// Translucent glass survives only where you can genuinely see through it and want to
// — the tab bar's pool (see `GlassPanel`, `TabBar`).

// ── palette ─────────────────────────────────────────────────────────────────

export const INK = '#08060C' // shows only before the first video frame
export const TEXT = '#FFFFFF'
export const TEXT_DIM = '#C6BFD4'
export const TEXT_FAINT = 'rgba(255,255,255,0.5)'

/** The single hot accent for generic state. */
export const ACCENT = '#FF2E88'
export const ACCENT_SOFT = 'rgba(255,46,136,0.16)'
export const MINT = '#5AF0D0'
export const WARM = '#FFF2E8'

// ── dye palette ─────────────────────────────────────────────────────────────
// Pulled from the footage itself, and used as FLAT fills — whole card bases, colour
// discs, the nav bead.
//
// Callers walk this ring by an item's POSITION in its list, never by a hash of its
// id. Hashing picks independently per item and independent picks from six colours
// collide constantly: the first test queue drew green three rows running, which reads
// as a bug rather than a palette. Walking by position also guarantees neighbours never
// match.
//
// Every one of these is bright enough to carry INK text at body sizes (≥5.5:1
// against `INK`), because cards in this theme are OPAQUE PLATES of dye with dark
// lettering on them — 60s poster construction — and a plate you can't set type on is
// useless here. The violet is deliberately lifted from the footage's true #8A3BFF to
// #A96BFF for exactly that reason: at #8A3BFF, ink on it is 3.7:1 and fails.
export const DYES = ['#FF2E88', '#FFB020', '#5AF0D0', '#A96BFF', '#39D353', '#FF5A3C'] as const

/**
 * A palette mate for `dye` — the second flat colour in a two-tone plate.
 *
 * Stepping two places along the ring rather than one guarantees a real hue jump
 * (adjacent entries are neighbours by design), which is what makes the two fields
 * read as a deliberate poster pairing instead of a gradient.
 */
export function partnerDye(dye: string, step = 2): string {
  const index = DYES.indexOf(dye as (typeof DYES)[number])
  if (index < 0) return DYES[step % DYES.length]
  return DYES[(index + step) % DYES.length]
}

/** Ink at partial strength, for secondary type on a bright plate. */
export const INK_SOFT = 'rgba(8,6,12,0.68)'
export const INK_FAINT = 'rgba(8,6,12,0.46)'
/** Weight of the ink keyline around a plate. Poster line work is heavy. */
export const INK_LINE = 3

export const HAIRLINE = 'rgba(255,255,255,0.20)'
export const HAIRLINE_SOFT = 'rgba(255,255,255,0.12)'
export const HAIRLINE_STRONG = 'rgba(255,255,255,0.42)'

// Glass fills. Alpha is high enough to hold contrast over the brightest frame the
// footage reaches — this is not a gentle wash, it hits pure white.
export const GLASS = 'rgba(16,12,24,0.66)'
export const GLASS_RAISED = 'rgba(26,20,38,0.76)'
export const GLASS_WELL = 'rgba(6,4,10,0.72)'
export const GLASS_LIGHT = 'rgba(255,255,255,0.10)'

/** Depth over footage comes from a real drop shadow, not a coloured glow. */
export const LIFT: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.42,
  shadowRadius: 16,
  elevation: 8,
}

// ── GlassPanel ──────────────────────────────────────────────────────────────
// The theme's one surface. Everything holding content is one of these.
//
// `blur` IS OFF BY DEFAULT, AND THAT IS A PERFORMANCE DECISION. A real backdrop
// blur is lovely but costs a full-screen sample per instance; a scrolling list of
// eight blurred rows over playing video will drop frames, especially on Android.
// So blur is reserved for the few pieces of persistent chrome (tab bar, search
// bay, hero) and list rows take a slightly heavier translucent fill instead —
// over moving footage that is nearly indistinguishable and costs one draw.

export interface GlassPanelProps {
  children?: React.ReactNode
  style?: React.ComponentProps<typeof Animated.View>['style']
  contentStyle?: ViewStyle
  radius?: number
  fill?: 'glass' | 'raised' | 'well' | 'light' | 'accent' | 'none'
  /** Real backdrop blur. Chrome only — never inside a list. */
  blur?: boolean
  blurIntensity?: number
  /** Marks the panel active: accent hairline plus a hot bar down the leading edge. */
  active?: boolean
  /** Overrides the hairline colour for a state that isn't the accent. */
  edgeColor?: string
  /** Hairline opacity, 0–1. */
  edgeStrength?: number
  /** Border weight. Defaults to a hairline; pass `INK_LINE` for a poster keyline. */
  edgeWidth?: number
  lift?: boolean
}

const FILLS: Record<string, string> = {
  glass: GLASS,
  raised: GLASS_RAISED,
  well: GLASS_WELL,
  light: GLASS_LIGHT,
  accent: ACCENT_SOFT,
  none: 'transparent',
}

export function GlassPanel({
  children,
  style,
  contentStyle,
  radius = 20,
  fill = 'glass',
  blur = false,
  blurIntensity = 28,
  active = false,
  edgeColor,
  edgeStrength = 1,
  edgeWidth,
  lift = true,
}: GlassPanelProps) {
  const hairline = edgeColor ?? (active ? ACCENT : HAIRLINE)
  return (
    <Animated.View style={[lift ? LIFT : null, { borderRadius: radius }, style]}>
      <View style={{ borderRadius: radius, overflow: 'hidden' }}>
        {blur ? (
          <BlurView
            pointerEvents="none"
            intensity={blurIntensity}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: FILLS[fill] }]}
        />
        {/* Top-edge sheen: glass catches light along its upper rim, and it is the
            cheapest cue that this is a physical surface sitting over the footage. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }}
        />
        <View style={contentStyle}>{children}</View>
        {/* Hairline last, so it sits above both the fill and the sheen. */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: edgeWidth ?? (active ? 1.5 : 1),
              borderColor: hairline,
              opacity: Math.min(1, edgeStrength),
            },
          ]}
        />
        {/* Active panels also take a hot bar down the leading edge, so state never
            depends on the hairline's colour alone. */}
        {active ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              top: radius * 0.55,
              bottom: radius * 0.55,
              width: 3,
              backgroundColor: ACCENT,
              borderTopRightRadius: 2,
              borderBottomRightRadius: 2,
            }}
          />
        ) : null}
      </View>
    </Animated.View>
  )
}

// ── Plate ───────────────────────────────────────────────────────────────────
// The theme's OPAQUE surface, and the one every card is built from.
//
// A plate is a flat field of dye with a second flat field of a palette mate laid
// over it as a hard-edged disc, wrapped in a heavy ink keyline. That is Fillmore
// poster construction: saturated colour blocks, dark lettering, no gradients doing
// the work. It replaced a dark-glass card that was technically legible and visually
// dead next to the footage.
//
// The discs BREATHE — a real ±8-10% scale, not a 3% wobble. A previous pass animated
// at 5% and the motion was invisible in practice, which is worse than no motion at
// all: the cost is paid and nothing is delivered. Each plate takes a phase offset so
// a scrolling list undulates instead of pulsing in lockstep.
//
// Hard edges are the point. Soft radial blobs read as a generated gradient; a crisp
// circle of one colour crossing a field of another reads as printed ink.

export interface PlateProps {
  children?: React.ReactNode
  /** The plate's base colour — a `DYES` entry, or a bright cream for a hero. */
  dye: string
  /** Stable key for phase + geometry variation. */
  seed: string | number
  /**
   * Outer style. Typed for Animated because callers pass press transforms straight
   * through (see `useLift`) — a plain ViewStyle here compiles but throws
   * "Transform with key of scale must be a number" at runtime, since a bare View
   * can't consume an animated value.
   */
  style?: React.ComponentProps<typeof Animated.View>['style']
  radii?: ViewStyle
  contentStyle?: ViewStyle
  /** Second colour. Defaults to `partnerDye(dye)`. */
  partner?: string
  /** Loop period for the breathing discs, ms. */
  period?: number
  /**
   * Disc diameters, in points.
   *
   * These MUST be scaled to the plate they sit on. Defaults suit a wide, short card
   * (a queue row); a tall card should pass larger ones. Getting this wrong is very
   * visible: the first version used one fixed 168pt disc for everything, and on a
   * ~105pt-tall row it covered half the card with a near-straight edge — the plate
   * read as two colour blocks butted together rather than as a circle crossing a
   * field. A disc only reads as a disc when its curvature is inside the frame.
   */
  bigDisc?: number
  smallDisc?: number
  /**
   * Position in the surrounding list. Supply it whenever there IS one: the discs' phase
   * is then spread by `phaseFor`, which guarantees neighbouring plates are out of step.
   * Falls back to hashing `seed`, which collides locally (see `phaseFor`).
   */
  phaseIndex?: number
  /**
   * Stretch the plate's body to the height its parent assigns it.
   *
   * Needed whenever the plate is a `flex: 1` child of a sized row: the outer wrapper
   * picks up the row's height, but the clipping body inside it is a flex CHILD of that
   * wrapper and shrinks to its content unless told to grow. Without this the reaction
   * grid's cells collapsed into thin bars.
   */
  fill?: boolean
  lift?: boolean
}

export function Plate({
  children,
  dye,
  seed,
  style,
  radii,
  contentStyle,
  partner,
  period = 3600,
  bigDisc = 116,
  smallDisc = 74,
  phaseIndex,
  fill = false,
  lift = true,
}: PlateProps) {
  const mate = partner ?? partnerDye(dye)
  const third = partnerDye(mate)
  const corners = radii ?? pouredRadii(seed)

  // Two discs, on separate periods AND separate phases, so they are never at the same
  // size at once and the plate's colour balance keeps shifting rather than throbbing.
  const base =
    phaseIndex === undefined
      ? Math.round(phaseOf(seed) * period)
      : phaseFor(phaseIndex, period, seed)
  const slow = usePulse(period, base)
  const fast = usePulse(Math.round(period * 0.72), base + Math.round(period * 0.5))

  const bigScale = slow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] })
  const smallScale = fast.interpolate({ inputRange: [0, 1], outputRange: [1.08, 0.86] })

  // Flip which corner each disc hangs off, so adjacent plates aren't identical.
  const flip = hashKey(seed) % 2 === 0

  return (
    <Animated.View style={[lift ? LIFT : null, corners, style]}>
      <View
        style={[
          corners,
          { overflow: 'hidden', backgroundColor: dye },
          fill ? { flex: 1 } : null,
        ]}
      >
        {/* The big disc hangs off one side, vertically centred, so a clean arc of it
            sits inside the frame whatever the plate's height turns out to be. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            [flip ? 'right' : 'left']: -bigDisc * 0.58,
            top: '50%',
            marginTop: -bigDisc / 2,
            width: bigDisc,
            height: bigDisc,
            borderRadius: bigDisc / 2,
            backgroundColor: mate,
            transform: [{ scale: bigScale }],
          }}
        />
        {/* The small disc takes the opposite bottom corner — diagonal opposition is
            what keeps the two fields from reading as one lopsided mass. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            [flip ? 'left' : 'right']: -smallDisc * 0.42,
            bottom: -smallDisc * 0.46,
            width: smallDisc,
            height: smallDisc,
            borderRadius: smallDisc / 2,
            backgroundColor: third,
            transform: [{ scale: smallScale }],
          }}
        />
        <View style={contentStyle}>{children}</View>
        {/* Keyline last so it rides above both colour fields. */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { ...corners, borderWidth: INK_LINE, borderColor: INK },
          ]}
        />
      </View>
    </Animated.View>
  )
}

// ── Sunburst ────────────────────────────────────────────────────────────────
// A wheel of alternating colour wedges — the single most recognisable device in 60s
// poster and light-show art, and the right way to make a big round control loud.
//
// Wedges tile the circle exactly (verified: max seam gap ~1e-13 units), and `spokes`
// MUST be even or the last wedge lands next to the first in the same colour and the
// alternation visibly breaks. Spin it by wrapping in an Animated.View with a rotate —
// the geometry is static, so a rotation costs nothing on the JS thread.

export function Sunburst({
  size,
  colors,
  spokes = 18,
  opacity = 1,
}: {
  size: number
  colors: readonly string[]
  spokes?: number
  opacity?: number
}) {
  const even = spokes % 2 === 0 ? spokes : spokes + 1
  const paths = React.useMemo(() => {
    const c = size / 2
    const step = (Math.PI * 2) / even
    const out: string[] = []
    for (let index = 0; index < even; index += 1) {
      const a0 = index * step - Math.PI / 2
      const a1 = a0 + step
      const x1 = c + c * Math.cos(a0)
      const y1 = c + c * Math.sin(a0)
      const x2 = c + c * Math.cos(a1)
      const y2 = c + c * Math.sin(a1)
      out.push(`M ${c} ${c} L ${x1} ${y1} A ${c} ${c} 0 0 1 ${x2} ${y2} Z`)
    }
    return out
  }, [size, even])

  return (
    <Svg width={size} height={size} opacity={opacity}>
      {paths.map((d, index) => (
        <Path key={index} d={d} fill={colors[index % colors.length]} />
      ))}
    </Svg>
  )
}

/**
 * A continuous 0 -> 1 ramp for rotation, in ms per revolution.
 *
 * Separate from `usePulse` because a spin must NOT ease: a sine-eased rotation visibly
 * stalls at each cycle boundary. Linear, and looping, so the wheel turns forever at one
 * speed. Pass `active: false` to park it.
 */
export function useSpin(durationMs: number, active = true): Animated.AnimatedInterpolation<string> {
  const value = useRef(new Animated.Value(0)).current
  React.useEffect(() => {
    if (!active) return
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
  }, [value, durationMs, active])
  return value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
}

// ── motion ──────────────────────────────────────────────────────────────────

/**
 * Press feedback: a calm settle, not a bounce.
 *
 * The background is already in constant motion, so the interface earns its
 * composure by being the still thing. A springy overshoot (which an earlier pass
 * used) reads as toy-like against moving footage.
 */
export function useLift(strength = 1): {
  press: Animated.Value
  transform: ViewStyle['transform']
  onPressIn: () => void
  onPressOut: () => void
} {
  const press = useRef(new Animated.Value(0)).current
  const onPressIn = () => {
    Animated.timing(press, {
      toValue: 1,
      duration: 110,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }
  const onPressOut = () => {
    Animated.timing(press, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }
  const transform = [
    {
      scale: press.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1 - 0.022 * strength],
      }),
    },
  ] as ViewStyle['transform']
  return { press, transform, onPressIn, onPressOut }
}

/**
 * A slab whose top edge SWELLS into one smooth dome — the nav rail's meniscus.
 *
 * The dome is a single bell built from two mirrored cubics, so the shoulders
 * flatten into the baseline with no crease. `bumpX` is the dome's centre in the
 * path's own coordinates and `bumpH` its height above the baseline.
 *
 * IMPORTANT: this is generated ONCE, with the dome at the centre of a canvas three
 * screens wide, and then the whole SVG is translated to move the dome under the
 * active tab. Re-generating `d` per frame would mean a JS-thread string build and
 * a native prop write every 16ms; translating a static path runs entirely on the
 * native driver and is exactly as smooth as a spring on any other transform.
 */
export interface SwellSpec {
  width: number
  height: number
  /** Where the crest peaks, in path coordinates. */
  crestX: number
  /** Horizontal run from the crest down to the baseline, on each side. */
  span: number
  /** How far the crest rises above the baseline. */
  crestH: number
  /** Where the flat surface sits, measured down from the canvas top. */
  baselineY: number
}

export function swellPath({ width, height, crestX, span, crestH, baselineY }: SwellSpec): string {
  const left = crestX - span
  const right = crestX + span
  // `baselineY` and `crestH` are SEPARATE on purpose — an earlier version used one number
  // for both, so any headroom added above the surface also grew the dome and the swell
  // turned into a tall narrow spike.
  const crestY = baselineY - crestH
  // The wave is always SYMMETRIC. Callers may use a span whose shoulders fall outside the
  // viewport — the surface then meets the screen edge mid-rise, which is accepted as the
  // price of a long wave. The alternative was tried and rejected: separate left/right runs,
  // each capped by the room available to that edge, keeps both shoulders on screen and the
  // crest on target, but a wave with a 40pt shoulder on one side and a 92pt one on the other
  // reads as broken rather than as wide.
  return [
    `M 0 ${baselineY}`,
    `L ${left} ${baselineY}`,
    // Up to the crest. The first control point sits ON the baseline so the shoulder leaves
    // it tangentially; the second sits on the crest for a rounded top. Pulling the
    // crest-side handle out to 0.55 of the span flattens the top, which widens the
    // visibly-raised run to about two thirds of the span — whatever rests in the crest has
    // to fit inside that run, or the wave looks too small for what it is carrying.
    `C ${left + span * 0.5} ${baselineY}, ${crestX - span * 0.55} ${crestY}, ${crestX} ${crestY}`,
    `C ${crestX + span * 0.55} ${crestY}, ${right - span * 0.5} ${baselineY}, ${right} ${baselineY}`,
    `L ${width} ${baselineY}`,
    `L ${width} ${height}`,
    `L 0 ${height}`,
    'Z',
  ].join(' ')
}

/**
 * 0 → 1 → 0 breathing.
 *
 * `delayMs` offsets the PHASE, which is the whole point in a list: eight rows
 * breathing in lockstep reads as a broken screen refresh, whereas eight rows on
 * staggered phases reads as a surface that's alive. Derive the delay from a stable
 * hash of the item's id so it never changes across renders.
 *
 * The loop lives entirely on the native driver, so a screenful of these costs no
 * JS-thread work at all.
 */
export function usePulse(durationMs = 1800, delayMs = 0): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  React.useEffect(() => {
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

/**
 * Corner radii for a card that looks POURED rather than drawn — one diagonal pair
 * fat, the other tight, with the orientation alternating by hash so a scrolling
 * list reads as a stack of hand-made plates instead of a spec sheet.
 *
 * Deliberately gentler than `blobCornerRadii` in theme/helpers: this theme's cards
 * hold dense text, and radii swinging 6→28 crowd the corner content.
 */
export function pouredRadii(seed: string | number | undefined, base = 20, swing = 9): ViewStyle {
  const fat = base + swing
  const tight = base - swing
  return hashKey(seed) % 2 === 0
    ? {
        borderTopLeftRadius: fat,
        borderTopRightRadius: tight,
        borderBottomRightRadius: fat,
        borderBottomLeftRadius: tight,
      }
    : {
        borderTopLeftRadius: tight,
        borderTopRightRadius: fat,
        borderBottomRightRadius: tight,
        borderBottomLeftRadius: fat,
      }
}

/** A dye at partial alpha, for washes and keylines. Falls back to the raw colour. */
export function dyeAlpha(dye: string, alpha: number): string {
  return hexToRgba(dye, alpha) ?? dye
}

/** Stable 0..1 from a key — for phase offsets, so a list breathes out of step. */
export function phaseOf(seed: string | number | undefined): number {
  return (hashKey(seed) % 1000) / 1000
}

/**
 * A phase offset in ms for the item at `index`, spread by the golden-ratio conjugate.
 *
 * PREFER THIS OVER `phaseOf` FOR ANYTHING IN A LIST. Hashing an item's id spreads
 * phases well on average but collides LOCALLY, and local is all that matters when four
 * rows share a screen: measuring the first build showed rows 1 and 2 agreeing on 7 of 8
 * frame steps — visibly breathing together — because their ids happened to hash within
 * a few percent of each other. Stepping by 0.618 per index is a low-discrepancy
 * sequence, so consecutive items are always far apart in phase, by construction.
 *
 * `jitterSeed` adds up to 8% of hash-derived wander on top, which keeps two lists of
 * the same length from looking identical without spoiling the spread.
 */
export function phaseFor(
  index: number,
  periodMs: number,
  jitterSeed?: string | number,
): number {
  const jitter = jitterSeed === undefined ? 0 : phaseOf(jitterSeed) * 0.08
  return Math.round((((index * 0.6180339887 + jitter) % 1) + 1) % 1 * periodMs)
}

// ── Scrim / Veil ────────────────────────────────────────────────────────────
// The footage runs to pure white, so headers and the tab rail cannot rely on it
// staying dark.

export function Scrim({ edge }: { edge: 'top' | 'bottom' }) {
  const top = edge === 'top'
  return (
    <LinearGradient
      pointerEvents="none"
      colors={
        top
          ? ['rgba(8,6,12,0.88)', 'rgba(8,6,12,0.45)', 'rgba(8,6,12,0)']
          : ['rgba(8,6,12,0)', 'rgba(8,6,12,0.55)', 'rgba(8,6,12,0.92)']
      }
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        [top ? 'top' : 'bottom']: 0,
        height: top ? '26%' : '30%',
      }}
    />
  )
}

/**
 * A flat veil under all content. The edge scrims leave mid-screen unprotected, and
 * body copy in the middle of a list still has to survive a frame of pure white
 * drifting past behind it.
 */
export function Veil({ opacity = 0.32 }: { opacity?: number }) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(8,6,12,${opacity})` }]}
    />
  )
}

/** Shadow for type sitting directly on footage rather than on glass. */
export const ON_FOOTAGE_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.75)',
  textShadowRadius: 12,
  textShadowOffset: { width: 0, height: 1 },
} as const
