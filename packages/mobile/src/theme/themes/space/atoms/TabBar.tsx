import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Pressable, Animated, StyleSheet } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS } from '../../../../navigation/TabIcons'
import { useTheme } from '../../../ThemeContext'
import { useOscillator, useLinearLoop } from '../_shared'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'

function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

// ─── Per-tab planet presets ─────────────────────────────────────────────────
// Each tab gets its own planet identity: a 3-stop radial gradient (highlight
// → mid → shadow) plus a moon color that orbits with it. Cross-fading
// between them on tab change reads as a single planet morphing through the
// solar system. No surface textures — the gradient + moon-color pairing
// alone gives each tab a distinct identity.
interface PlanetPreset {
  highlight: string
  main: string
  shadow: string
  moon: string
}

const TAB_PLANETS: Record<string, PlanetPreset> = {
  // Sun-amber giant — golden body, plasma-cyan moon.
  Songs: {
    highlight: '#FFE9B0',
    main: '#FFC34D',
    shadow: '#7A4400',
    moon: '#40E0D0',
  },
  // Neptune-blue — cool blue body, pale-violet moon.
  Queue: {
    highlight: '#B4DEFF',
    main: '#3C8CD8',
    shadow: '#0E2E58',
    moon: '#E8D4FF',
  },
  // Mars-red — fiery body, warm amber moon.
  Stage: {
    highlight: '#FFC4A0',
    main: '#FF6040',
    shadow: '#7A1A0A',
    moon: '#FFC34D',
  },
  // Violet ice giant — purple body, pearl-white moon.
  Awards: {
    highlight: '#E9D8FF',
    main: '#A88EFF',
    shadow: '#3A1E70',
    moon: '#FFFFFF',
  },
  // Verdant body — emerald world, magenta moon.
  Profile: {
    highlight: '#D2FFE2',
    main: '#40D096',
    shadow: '#0A4830',
    moon: '#E040FB',
  },
}

const FALLBACK_PLANET: PlanetPreset = {
  highlight: '#FFC9FF',
  main: '#E040FB',
  shadow: '#5A1480',
  moon: '#40E0D0',
}

// Layered HUD console with these structural rules:
//   1. Clipped bar shell (rounded rectangle) holds the void background,
//      aurora top stripe, BlurView, and tab cells.
//   2. The planet sits ABOVE the BlurView and BEHIND the active tab's
//      icon/label. It does NOT pulse — staying still keeps the focus clean.
//   3. The orbit ring + satellite render as siblings of the clipped shell so
//      they can extend slightly above and below the bar.
//   4. The active planet is the only one at full opacity; all sibling planets
//      cross-fade in/out via Animated.timing on opacity (native driver).
const PLANET_DIAMETER = 52
const ORBIT_DIAMETER = 72 // small gap beyond the planet edge — tight orbit
const SATELLITE_SIZE = 8
const BAR_HEIGHT = 68

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()
  const [trackWidth, setTrackWidth] = useState(0)

  const tabCount = state.routes.length
  const tabWidth = trackWidth > 0 ? trackWidth / tabCount : 0
  const activeIndex = state.index

  // Planet position — springs to the active tab's center on tab change.
  const planetX = useRef(new Animated.Value(0)).current
  // One Animated.Value per route for opacity cross-fade. Created once; the
  // bottom-tab navigator never adds/removes routes at runtime.
  const planetOpacities = useRef(
    state.routes.map((_, i) =>
      new Animated.Value(i === activeIndex ? 1 : 0),
    ),
  ).current

  // Aurora wash position — gradient that travels along the top stripe.
  const aurora = useLinearLoop(9000)
  // Satellite — rotates a container around the planet center.
  const orbit = useLinearLoop(4200)

  // Cross-fade the planets when the active tab changes.
  useEffect(() => {
    planetOpacities.forEach((val, i) => {
      Animated.timing(val, {
        toValue: i === activeIndex ? 1 : 0,
        duration: 360,
        useNativeDriver: true,
      }).start()
    })
  }, [activeIndex, planetOpacities])

  useEffect(() => {
    if (tabWidth <= 0) return
    const center = tabWidth * (activeIndex + 0.5)
    Animated.spring(planetX, {
      toValue: center,
      tension: 80,
      friction: 11,
      useNativeDriver: true,
    }).start()
  }, [activeIndex, tabWidth, planetX])

  // First-render snap.
  useEffect(() => {
    if (tabWidth <= 0) return
    const center = tabWidth * (activeIndex + 0.5)
    planetX.setValue(center)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabWidth > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  // Aurora flow along the top edge — continuous left→right slide.
  const auroraX = aurora.interpolate({
    inputRange: [0, 1],
    outputRange: ['-50%', '50%'],
  })

  // Continuous rotation that drives the satellite container.
  const orbitRot = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const orbitCenterY = BAR_HEIGHT / 2

  // Resolve each route to its planet preset once per render.
  const planets = useMemo(
    () =>
      state.routes.map((r) => TAB_PLANETS[r.name] ?? FALLBACK_PLANET),
    [state.routes],
  )

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 16,
      }}
    >
      {/* Outer relative wrapper — `overflow: 'visible'` so the satellite can
          escape the bar's silhouette without being clipped. */}
      <View style={{ position: 'relative', overflow: 'visible' }}>
        {/* Clipped bar shell — everything painted onto the void rectangle
            (tint, aurora stripe, dots, blur, tab cells) lives here. */}
        <View
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          style={{
            height: BAR_HEIGHT,
            backgroundColor: tokens.tabBarBg,
            borderRadius: 14,
            overflow: 'hidden',
            shadowColor: tokens.accentGlowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.55,
            shadowRadius: 18,
            elevation: 14,
          }}
        >
          {/* Subtle inner glow gradient — magenta tint on the bottom edge. */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(224,64,251,0.08)',
              'rgba(8,8,15,0.0)',
              'rgba(64,224,208,0.06)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Aurora stripe — drifts along the top edge. */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2.5,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '200%',
                height: '100%',
                transform: [{ translateX: auroraX }],
              }}
            >
              <LinearGradient
                colors={[
                  'rgba(224,64,251,0.5)',
                  'rgba(64,224,208,0.7)',
                  'rgba(168,194,255,0.45)',
                  'rgba(224,64,251,0.7)',
                  'rgba(64,224,208,0.5)',
                ]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ width: '100%', height: '100%' }}
              />
            </Animated.View>
          </View>

          {/* Sparse constellation dots behind the tabs. */}
          <Svg
            width="100%"
            height={BAR_HEIGHT}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Circle cx={20} cy={14} r={0.9} fill="#E8E6F0" opacity={0.35} />
            <Circle cx={55} cy={48} r={0.7} fill="#A8C2FF" opacity={0.3} />
            <Circle cx={140} cy={20} r={1.0} fill="#E8E6F0" opacity={0.4} />
            <Circle cx={210} cy={52} r={0.8} fill="#40E0D0" opacity={0.5} />
            <Circle cx={290} cy={16} r={0.7} fill="#E8E6F0" opacity={0.35} />
            <Circle cx={335} cy={50} r={0.9} fill="#A8C2FF" opacity={0.3} />
          </Svg>

          {/* BlurView — under the planet so the planet stays crisp. */}
          <BlurView
            pointerEvents="none"
            intensity={18}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />

          {/* Stacked planets — one per route, cross-faded via opacity. All
              share the same translateX so they stay pinned to the active
              tab's center. */}
          {trackWidth > 0 &&
            planets.map((preset, i) => (
              <Animated.View
                key={state.routes[i].key}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: PLANET_DIAMETER,
                  height: PLANET_DIAMETER,
                  left: -PLANET_DIAMETER / 2,
                  top: BAR_HEIGHT / 2 - PLANET_DIAMETER / 2,
                  opacity: planetOpacities[i],
                  transform: [{ translateX: planetX }],
                }}
              >
                <PlanetSphere
                  preset={preset}
                  size={PLANET_DIAMETER}
                  id={`tabPlanet-${i}`}
                />
              </Animated.View>
            ))}

          {/* HUD frame ring */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(224,64,251,0.4)',
              },
            ]}
          />

          {/* Tab cells (icons + labels) */}
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {state.routes.map((route, i) => {
              const Icon = TAB_ICONS[route.name]
              const options = descriptors[route.key]?.options
              const overrideIcon = options?.tabBarIcon as
                | ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode)
                | undefined
              const focused = state.index === i
              const baseLabel = route.name === 'Stage' ? stageLabel : route.name

              return (
                <SpaceTab
                  key={route.key}
                  label={baseLabel}
                  focused={focused}
                  Icon={Icon}
                  overrideIcon={overrideIcon}
                  onPress={() => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    })
                    if (!focused && !event.defaultPrevented) {
                      navigation.navigate(route.name)
                    }
                  }}
                  onLongPress={() => {
                    navigation.emit({ type: 'tabLongPress', target: route.key })
                  }}
                />
              )
            })}
          </View>
        </View>

        {/* ─── Moon (rendered OUTSIDE the clipped bar, no visible orbit
            ring) ─── Single rotating container pinned to the active tab's
            X. Inside it, one moon dot per route is stacked at the top of
            the container — only the active route's moon has opacity 1, the
            others cross-fade out. Rotating the container drags whichever
            moon is currently visible around a perfect circular path. */}
        {trackWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: ORBIT_DIAMETER,
              height: ORBIT_DIAMETER,
              left: -ORBIT_DIAMETER / 2,
              top: orbitCenterY - ORBIT_DIAMETER / 2,
              alignItems: 'center',
              transform: [{ translateX: planetX }, { rotate: orbitRot }],
            }}
          >
            {planets.map((preset, i) => (
              <Animated.View
                key={state.routes[i].key}
                style={{
                  position: 'absolute',
                  top: -SATELLITE_SIZE / 2,
                  width: SATELLITE_SIZE,
                  height: SATELLITE_SIZE,
                  borderRadius: SATELLITE_SIZE / 2,
                  backgroundColor: preset.moon,
                  opacity: planetOpacities[i],
                  shadowColor: preset.moon,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 6,
                }}
              />
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  )
}

// ── Planet sphere ───────────────────────────────────────────────────────────
// Smooth gradient ball — highlight → mid → shadow. No surface texture; each
// tab's identity comes from its gradient palette and the matching moon
// color, not from busy bands/craters.
function PlanetSphere({
  preset,
  size,
  id,
}: {
  preset: PlanetPreset
  size: number
  id: string
}) {
  const r = size / 2 - 2
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={`${id}-grad`} cx="38%" cy="32%" rx="62%" ry="62%">
          <Stop offset="0%" stopColor={preset.highlight} stopOpacity={1} />
          <Stop offset="55%" stopColor={preset.main} stopOpacity={1} />
          <Stop offset="100%" stopColor={preset.shadow} stopOpacity={0.95} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={r} fill={`url(#${id}-grad)`} />
    </Svg>
  )
}

function SpaceTab({
  label,
  focused,
  Icon,
  overrideIcon,
  onPress,
  onLongPress,
}: {
  label: string
  focused: boolean
  Icon: ((p: { color: string; size?: number }) => React.ReactElement) | undefined
  overrideIcon:
    | ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode)
    | undefined
  onPress: () => void
  onLongPress: () => void
}) {
  const { tokens } = useTheme()
  // Active tab sits on top of the planet — light icon reads against the
  // brightest planet centers (sun-amber, plasma-green) while still being
  // legible on darker ones.
  const iconColor = focused ? '#FFFFFF' : tokens.tabBarFg
  const labelColor = focused ? '#FFFFFF' : tokens.tabBarFg

  // Active label has a soft twinkle — opacity oscillator.
  const twinkle = useOscillator(1900)
  const labelOpacity = focused
    ? twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] })
    : 0.78

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
      }}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <View>
          {overrideIcon
            ? overrideIcon({ color: iconColor, size: 22, focused })
            : Icon
              ? Icon({ color: iconColor, size: 22 })
              : null}
        </View>
        <Animated.Text
          style={{
            marginTop: 3,
            color: labelColor,
            fontFamily: tokens.fontDisplay,
            fontSize: 10,
            letterSpacing: focused ? 1.6 : 1.2,
            textTransform: 'uppercase',
            fontWeight: focused ? '700' : '500',
            opacity: labelOpacity,
            textShadowColor: focused ? 'rgba(8,8,15,0.85)' : 'transparent',
            textShadowRadius: focused ? 4 : 0,
            textShadowOffset: { width: 0, height: 1 },
          }}
        >
          {label}
        </Animated.Text>
      </View>
    </Pressable>
  )
}
