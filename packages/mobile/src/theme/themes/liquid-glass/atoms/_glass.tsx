import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Platform, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'

// ── LIQUID GLASS: the shared vocabulary ─────────────────────────────────────
//
// On iOS 26, where the app binary includes expo-glass-effect, every pane is
// the SYSTEM's Liquid Glass (UIGlassEffect): it refracts and reflects what's
// behind it, adapts its tint to it, and (when interactive) gels and
// brightens under the finger. Panes inside a `GlassGroup` within `spacing`
// of each other melt together like droplets.
//
// Everywhere else (an older binary that predates the module, Android, iOS <
// 26) the same atoms fall back to a material blur with a lit hairline rim
// and a sheen, so the theme still reads as glass. The module is loaded only
// after checking the native side exists: on a binary without it, importing
// expo-glass-effect would throw.

type GlassModule = typeof import('expo-glass-effect')
let G: GlassModule | null = null
if (Platform.OS === 'ios' && requireOptionalNativeModule('ExpoGlassEffect')) {
  try {
    G = require('expo-glass-effect') as GlassModule
    if (!(G.isLiquidGlassAvailable() && G.isGlassEffectAPIAvailable())) G = null
  } catch {
    G = null
  }
}
/** True when panes are the system's own Liquid Glass. */
export const NATIVE_GLASS = !!G

// ── Palette & type ──────────────────────────────────────────────────────────
export const WHITE = '#FFFFFF'
export const SOFT = 'rgba(255,255,255,0.74)'
export const FAINT = 'rgba(255,255,255,0.48)'
export const INK = '#0B0D18'
export const NIGHT = '#0B1240'
export const BLUE = '#0A84FF'
export const CYAN = '#64D2FF'
export const GREEN = '#30D158'
export const YELLOW = '#FFD60A'
export const PINK = '#FF375F'
export const RED = '#FF453A'

/** San Francisco (the system face) at a weight. */
export function sf(size: number, weight: TextStyle['fontWeight'] = '600', color: string = WHITE, extra?: TextStyle): TextStyle {
  return {
    fontSize: size,
    fontWeight: weight,
    color,
    letterSpacing: size >= 28 ? -0.6 : size >= 17 ? -0.3 : 0,
    ...extra,
  }
}

/** A soft shadow that keeps white type legible over bright glass. */
export const LIFT: TextStyle = { textShadowColor: 'rgba(0,0,0,0.28)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 }

export const IMG = {
  wallpaper: require('../../../../../assets/liquid-glass/wallpaper.jpg'),
}

// ── Glass ───────────────────────────────────────────────────────────────────

export interface GlassProps {
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
  radius?: number
  /** 'regular' frosts for legibility; 'clear' is barely there */
  variant?: 'regular' | 'clear'
  /** tinted glass, for what matters (the active tab, a primary button) */
  tint?: string
  /** gels and brightens under a finger */
  interactive?: boolean
  /** soft drop shadow */
  shadow?: boolean
}

/** A pane of glass. Children sit on top of it. */
export function Glass({ children, style, radius = 22, variant = 'regular', tint, interactive, shadow = true }: GlassProps) {
  const flat = StyleSheet.flatten(style) || {}
  const r = (flat.borderRadius as number | undefined) ?? radius
  if (G) {
    const NativeGlass = G.GlassView
    return (
      <NativeGlass glassEffectStyle={variant} tintColor={tint} isInteractive={interactive} colorScheme="dark" style={[{ borderRadius: r }, shadow ? styles.shadow : null, style]}>
        {children}
      </NativeGlass>
    )
  }
  // Fallback: the shadow lives on an outer view (iOS drops a shadow from a
  // view that also clips), the material and its rim on an inner clipped one.
  const { margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, position, left, right, top, bottom, flex, alignSelf, width, height, ...inner } = flat as ViewStyle
  const outer: ViewStyle = { margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, position, left, right, top, bottom, flex, alignSelf, width, height }
  return (
    <View style={[outer, shadow ? styles.shadow : null, { borderRadius: r }]}>
      <View style={[{ borderRadius: r, overflow: 'hidden', flex: position === 'absolute' || flex || height !== undefined ? 1 : undefined, width: width !== undefined ? '100%' : undefined }, inner]}>
        <BlurView intensity={variant === 'clear' ? 22 : 46} tint={variant === 'clear' ? 'systemUltraThinMaterialDark' : 'systemThinMaterialDark'} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint ?? 'rgba(255,255,255,0.06)' }]} />
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.0)']} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r, borderWidth: StyleSheet.hairlineWidth * 1.5, borderColor: 'rgba(255,255,255,0.34)', borderBottomColor: 'rgba(255,255,255,0.12)' }]} />
        {children}
      </View>
    </View>
  )
}

/** Glass panes that melt together when they come within `spacing` of each other. */
export function GlassGroup({ children, spacing = 12, style }: { children: React.ReactNode; spacing?: number; style?: StyleProp<ViewStyle> }) {
  if (G) {
    const Container = G.GlassContainer
    return (
      <Container spacing={spacing} style={style}>
        {children}
      </Container>
    )
  }
  return <View style={style}>{children}</View>
}

// ── Motion ──────────────────────────────────────────────────────────────────

/** A press: glass swells a touch under the finger and springs back (the
 *  system's own interactive glass does this natively too). */
export function Press({
  children,
  style,
  outerStyle,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & { children: React.ReactNode; style?: StyleProp<ViewStyle>; outerStyle?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current
  const onPressIn = () => Animated.spring(v, { toValue: 1, stiffness: 420, damping: 22, mass: 0.6, useNativeDriver: true }).start()
  const onPressOut = () => Animated.spring(v, { toValue: 0, stiffness: 260, damping: 13, mass: 0.7, useNativeDriver: true }).start()
  // The transform array is ALWAYS present (values animate): a transform that
  // flips to undefined crashes Fabric on press-out (see project notes).
  const transform = [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }]
  return (
    <Pressable {...rest} style={outerStyle} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform }]}>{children}</Animated.View>
    </Pressable>
  )
}

/** Entry: rises into place with a liquid overshoot. */
export function useEnter(delay = 0) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const a = Animated.spring(v, { toValue: 1, delay, stiffness: 150, damping: 15, mass: 0.9, useNativeDriver: true })
    a.start()
    return () => a.stop()
  }, [v, delay])
  return {
    opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] }),
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
  }
}

/** A slow breath, 0..1..0, for things that are alive (the playing button). */
export function useBreath(period = 2600, on = true) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!on) {
      v.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [v, period, on])
  return v
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
})
