import React, { useEffect, useRef } from 'react'
import { Animated, View, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path, Ellipse, Circle, Line, G, Defs, Pattern, Rect } from 'react-native-svg'

// ── Tropical / Tiki Beach shared visual vocabulary ──────────────────────────
// The building blocks every tropical atom composes from: the island palette,
// soft natural sun-shadows, bamboo-pole frames, flickering tiki-torch flames,
// hibiscus blooms and palm/monstera leaves. Keeping them here means the whole
// theme speaks one consistent beach language instead of each atom re-inventing
// it (mirrors comic-book/_comic.tsx).

// ── Palette ──────────────────────────────────────────────────────────────────
export const INK = '#123A33' // deep palm/teal — primary text
export const PALM_DK = '#0E2E29' // darkest palm
export const SAND = '#FFF4DE' // warm beach sand
export const SAND_DK = '#F6E6C2'
export const PANEL = '#FFFFFF'
export const PANEL_GLASS = 'rgba(255,250,238,0.90)' // translucent sand panel over the photo
export const LAGOON = '#10B7B0' // lagoon turquoise (primary accent)
export const LAGOON_DK = '#0B9E97'
export const SKY = '#36C5F0'
export const SUNSET = '#FF6B3D' // sunset coral
export const HIBISCUS = '#FF3D81' // hibiscus pink
export const SUN = '#FFC83D' // sunshine yellow
export const PALM = '#1FB573' // palm green
export const PALM_DEEP = '#0E6B39'
export const BAMBOO = '#CDA85A' // bamboo tan
export const BAMBOO_LT = '#E2C684' // sun-bleached bamboo
export const BAMBOO_DK = '#9A7536'
export const WOOD = '#6E4423' // tiki wood
export const WOOD_LT = '#8A5A2F'

// Soft, natural sun-shadow (no hard offset). `n` scales depth.
export function softShadow(n = 6): ViewStyle {
  return {
    shadowColor: PALM_DK,
    shadowOffset: { width: 0, height: Math.round(n * 0.9) },
    shadowOpacity: 0.18,
    shadowRadius: n * 1.8,
    elevation: n,
  }
}

// Gentle press — sink + shrink a touch (replaces neo-brutal's hard slam).
export function press(): ViewStyle {
  return { transform: [{ translateY: 1 }, { scale: 0.985 }], shadowOpacity: 0.1 }
}

// ── Bamboo frame ─────────────────────────────────────────────────────────────
// A rounded card framed in a bamboo pole: a tan gradient border (created by
// padding) with evenly-spaced dark node ticks along the top & bottom edges and
// rope lashings in the corners. Children render on a clipped inner surface.
// `pole` = border thickness; `fill` = inner surface color.
export function BambooFrame({
  radius = 18,
  pole = 7,
  fill = PANEL_GLASS,
  shadow = 6,
  nodes = 5,
  flexFill = true,
  style,
  innerStyle,
  children,
}: {
  radius?: number
  pole?: number
  fill?: string
  shadow?: number
  nodes?: number
  // true (default): gradient + inner take flex:1 so a sized parent (aspectRatio
  // card) flows its height down. false: the frame sizes to its content — use for
  // content-height rows (e.g. the queue card) so the inner doesn't collapse.
  flexFill?: boolean
  style?: ViewStyle
  innerStyle?: ViewStyle
  children?: React.ReactNode
}) {
  const ticks = Array.from({ length: nodes })
  const fillStyle = flexFill ? { flex: 1 } : null
  return (
    <View style={[softShadow(shadow), { borderRadius: radius }, style]}>
      <LinearGradient
        colors={[BAMBOO_LT, BAMBOO, BAMBOO_DK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ borderRadius: radius, padding: pole }, fillStyle]}
      >
        {/* node ticks along the top & bottom bamboo edges */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: pole + 4, right: pole + 4, height: pole, flexDirection: 'row', justifyContent: 'space-between' }}>
          {ticks.map((_, i) => (
            <View key={`t${i}`} style={{ width: 2, height: pole, backgroundColor: 'rgba(0,0,0,0.22)' }} />
          ))}
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: pole + 4, right: pole + 4, height: pole, flexDirection: 'row', justifyContent: 'space-between' }}>
          {ticks.map((_, i) => (
            <View key={`b${i}`} style={{ width: 2, height: pole, backgroundColor: 'rgba(0,0,0,0.22)' }} />
          ))}
        </View>
        <View style={[fillStyle, { borderRadius: Math.max(radius - pole, 4), overflow: 'hidden', backgroundColor: fill }, innerStyle]}>
          {children}
        </View>
      </LinearGradient>
    </View>
  )
}

// Faint horizontal wood-grain lines, laid over a plank/card surface as a subtle
// "this is timber" texture. Absolutely fills its parent (which should clip).
let _grainCounter = 0
export function PlankGrain({ color = 'rgba(110,68,35,0.1)', gap = 11, style }: { color?: string; gap?: number; style?: ViewStyle }) {
  const id = useRef(`pg${++_grainCounter}`).current
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={1} x2={gap} y2={1} stroke={color} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  )
}

// ── Animated tiki-torch flame ────────────────────────────────────────────────
// A licking flame: stacked orange + yellow teardrops that flicker (scale +
// sway + brightness). Anchored toward the bottom by a small translateY tied to
// the scale. `size` is the flame height in px. Used by TikiTorch + accents.
export function Flame({ size = 56, delay = 0 }: { size?: number; delay?: number }) {
  const a = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [a, delay])

  const scaleY = a.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.16] })
  const scaleX = a.interpolate({ inputRange: [0, 1], outputRange: [1.06, 0.92] })
  const ty = a.interpolate({ inputRange: [0, 1], outputRange: [size * 0.04, -size * 0.05] })
  const rot = a.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] })
  const w = size * 0.72
  return (
    <Animated.View style={{ width: w, height: size, transform: [{ translateY: ty }, { scaleX }, { scaleY }, { rotate: rot }] }}>
      <Svg width={w} height={size} viewBox="0 0 62 86">
        <Path d="M31 84 C 7 64 5 38 31 4 C 57 38 55 64 31 84 Z" fill={SUNSET} />
        <Path d="M31 80 C 14 62 13 40 31 14 C 49 40 48 62 31 80 Z" fill="#FF8A3C" />
        <Path d="M31 76 C 21 62 21 44 31 24 C 41 44 41 62 31 76 Z" fill={SUN} />
      </Svg>
    </Animated.View>
  )
}

// A complete bamboo tiki torch with a flickering flame + warm glow. Decorative.
export function TikiTorch({ height = 150, flame = 52 }: { height?: number; flame?: number }) {
  return (
    <View style={{ width: 64, height, alignItems: 'center' }}>
      <View style={{ position: 'absolute', top: -flame * 0.3, width: flame * 2.4, height: flame * 2.4, borderRadius: flame * 1.2, backgroundColor: 'rgba(255,170,60,0.28)' }} />
      <Flame size={flame} />
      <View style={{ marginTop: -4 }}>
        <Svg width="64" height={height - flame * 0.6} viewBox={`0 0 64 ${height}`}>
          {/* woven bowl */}
          <Path d="M12 16 q 20 24 40 0 q -7 -16 -20 -16 q -13 0 -20 16 Z" fill={WOOD} stroke="#4A3119" strokeWidth="2" />
          <Path d="M12 16 q 20 10 40 0" stroke="#3A2614" strokeWidth="2.4" fill="none" />
          {/* bamboo pole */}
          <Path d={`M24 22 H40 V${height} H24 Z`} fill={BAMBOO} />
          <Path d={`M27 22 H31 V${height} H27 Z`} fill={BAMBOO_LT} opacity={0.7} />
          {[60, 100, 140].map((y, i) => (
            <Line key={i} x1={22} y1={y} x2={42} y2={y} stroke={BAMBOO_DK} strokeWidth={4} />
          ))}
        </Svg>
      </View>
    </View>
  )
}

// ── Hibiscus bloom ───────────────────────────────────────────────────────────
// Five overlapping petals + a sunshine center with a stamen. `color` tints the
// petals; used as the theme's signature pop accent (badges, selected states).
export function Hibiscus({ size = 40, color = HIBISCUS, stroke = true }: { size?: number; color?: string; stroke?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 70 70">
      <G>
        {[0, 72, 144, 216, 288].map((ang) => (
          <Ellipse
            key={ang}
            cx={35}
            cy={18}
            rx={12.5}
            ry={16.5}
            fill={color}
            stroke={stroke ? 'rgba(0,0,0,0.16)' : undefined}
            strokeWidth={stroke ? 1.2 : 0}
            transform={`rotate(${ang} 35 35)`}
          />
        ))}
        <Circle cx={35} cy={35} r={7.5} fill={SUN} />
        <Circle cx={35} cy={35} r={3} fill={SUNSET} />
      </G>
    </Svg>
  )
}

// ── Monstera leaf — split-leaf silhouette with veins. Decorative. ─────────────
export function MonsteraLeaf({ size = 56, color = PALM, vein = PALM_DEEP }: { size?: number; color?: string; vein?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50 96 C 10 70 4 28 46 6 C 92 26 92 72 50 96 Z" fill={color} stroke={vein} strokeWidth={2.2} />
      <Path d="M50 92 L50 18 M50 66 L24 54 M50 66 L76 54 M50 44 L30 34 M50 44 L70 34" stroke={vein} strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.55} />
    </Svg>
  )
}

// ── Palm frond — a single drooping coconut-palm leaf. Decorative. ─────────────
export function PalmFrond({ width = 120, color = PALM, vein = PALM_DEEP }: { width?: number; color?: string; vein?: string }) {
  const h = width * 0.42
  return (
    <Svg width={width} height={h} viewBox="0 0 172 72">
      <Path d="M2 36 C 50 14 116 16 170 38 C 116 30 56 34 2 40 C 56 38 116 44 170 38 C 116 56 50 58 2 36 Z" fill={color} stroke={vein} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  )
}
