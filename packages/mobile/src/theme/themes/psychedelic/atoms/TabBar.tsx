import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS } from '../../../../navigation/TabIcons'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useOscillator } from '../_shared'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'

// Live label for the Stage tab.
function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

// ─── Lava-lamp tab bar (BlurView metaball technique) ─────────────────────────
//
// Approach per research: SVG Filter metaballs are fragile across iOS / Android
// and force JS-bridge animation on SVG attribute props. Instead, we build the
// metaball effect from plain RN `<View>` circles + a `BlurView` overlay. The
// BlurView smears the underlying circles together so two overlapping circles
// merge into a single fluid blob with no visible boundary. Every animated
// prop (translateX, scale) is native-driver, so the orb runs at 60fps with
// no JS-thread cost.
//
// Two-circle physics: a leading `main` circle on a tight spring tracks the
// active tab; a slightly smaller `trail` circle on a softer spring lags
// behind during motion. Through the BlurView the two appear as one blob
// that stretches between them when traveling, then merges back into a
// single round shape when the trail catches up.
//
// NO translateY anywhere — per project rule, foreground elements grow / shrink
// only. The orb's "alive" feel comes from continuous scale breathing at
// different periods per circle, not from any vertical drift.

const MAIN_DIAMETER = 50
const TRAIL_DIAMETER = 40
const HALO_DIAMETER = 110

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()
  const [trackWidth, setTrackWidth] = useState(0)

  const tabCount = state.routes.length
  const tabWidth = trackWidth > 0 ? trackWidth / tabCount : 0
  const activeIndex = state.index

  // Position values for the two blob bodies.
  const mainX = useRef(new Animated.Value(0)).current
  const trailX = useRef(new Animated.Value(0)).current
  const positioned = useRef(false)

  // Per-blob continuous scale breathing. Different periods so the two
  // bodies pulse asynchronously — that's what makes the merged blob's
  // silhouette wiggle organically at rest.
  const mainBreath = useRef(new Animated.Value(0)).current
  const trailBreath = useRef(new Animated.Value(0)).current
  const haloBreath = useRef(new Animated.Value(0)).current

  // Loops on mount.
  useEffect(() => {
    const loop = (val: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: duration / 2, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: duration / 2, useNativeDriver: true }),
        ]),
      )
    const a = loop(mainBreath, 3100)
    const b = loop(trailBreath, 2300)
    const c = loop(haloBreath, 4700)
    a.start()
    b.start()
    c.start()
    return () => {
      a.stop()
      b.stop()
      c.stop()
    }
  }, [mainBreath, trailBreath, haloBreath])

  // On tab change: main springs to new center (responsive), trail springs
  // to same center but with a much softer spring (lower tension, higher
  // friction) so it visibly lags. The BlurView's gooey merge stretches
  // between them.
  useEffect(() => {
    if (tabWidth <= 0) return
    const center = tabWidth * (activeIndex + 0.5)
    // Snap on first measure (avoids springing in from the bar's left edge,
    // half a tab left of tab 0); spring only on later tab changes.
    if (!positioned.current) {
      positioned.current = true
      mainX.setValue(center)
      trailX.setValue(center)
      return
    }
    Animated.spring(mainX, {
      toValue: center,
      tension: 95,
      friction: 9,
      useNativeDriver: true,
    }).start()
    Animated.spring(trailX, {
      toValue: center,
      tension: 45,
      friction: 12,
      useNativeDriver: true,
    }).start()
  }, [activeIndex, tabWidth, mainX, trailX])

  // Scale interpolations — note: NO translateY, NO yBob. Scale only.
  const mainScale = mainBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.1],
  })
  const trailScale = trailBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.05],
  })
  const haloScale = haloBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  })

  const BAR_HEIGHT = 68
  const orbCenterY = BAR_HEIGHT / 2

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
      <View
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        style={{
          height: BAR_HEIGHT,
          backgroundColor: tokens.tabBarBg,
          borderRadius: 34,
          // NOTE: no `borderWidth` here. The pink frame is rendered as a
          // separate `<View>` *after* the BlurView so the orb's warm color
          // can't bleed through the (translucent) border under the blur.
          overflow: 'hidden',
          shadowColor: tokens.accentGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        {/* ── HALO (soft warm glow sitting behind both bodies — gives the
            orb its lava-lamp aura beyond the capsule edges). ── */}
        {trackWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: HALO_DIAMETER,
              height: HALO_DIAMETER,
              left: -HALO_DIAMETER / 2,
              top: orbCenterY - HALO_DIAMETER / 2,
              borderRadius: HALO_DIAMETER / 2,
              backgroundColor: '#ff8c2d',
              opacity: 0.18,
              transform: [{ translateX: mainX }, { scale: haloScale }],
            }}
          />
        )}

        {/* ── TRAIL body — lags behind the main during motion, lives inside
            the BlurView merge zone. Smaller, slightly redder so it reads
            visually as the "wake" half of the blob. ── */}
        {trackWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: TRAIL_DIAMETER,
              height: TRAIL_DIAMETER,
              left: -TRAIL_DIAMETER / 2,
              top: orbCenterY - TRAIL_DIAMETER / 2,
              borderRadius: TRAIL_DIAMETER / 2,
              backgroundColor: '#ff5a2d',
              transform: [{ translateX: trailX }, { scale: trailScale }],
            }}
          />
        )}

        {/* ── MAIN body — leading edge of the blob. Tracks the active tab. ── */}
        {trackWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: MAIN_DIAMETER,
              height: MAIN_DIAMETER,
              left: -MAIN_DIAMETER / 2,
              top: orbCenterY - MAIN_DIAMETER / 2,
              borderRadius: MAIN_DIAMETER / 2,
              backgroundColor: '#ffc34d',
              transform: [{ translateX: mainX }, { scale: mainScale }],
            }}
          />
        )}

        {/* ── BLUR overlay — the gooey merger. Smears the two circles
            together so they read as a single fluid body. Intensity is
            tuned to merge them at rest while letting the elongation read
            during motion. Sits *under* the tab cells so icons render
            crisp on top of the blob. ── */}
        <BlurView
          pointerEvents="none"
          intensity={22}
          tint="default"
          style={StyleSheet.absoluteFill}
        />

        {/* ── Pink border ring — rendered ON TOP of the BlurView so its
            color isn't influenced by the warm orb sitting underneath the
            blur. This is the user-visible "outline" of the tab bar. ── */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 34,
              borderWidth: 1.5,
              borderColor: 'rgba(255,45,149,0.45)',
            },
          ]}
        />

        {/* ── Tab cells (icons + labels) ── */}
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
              <PsyTab
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
    </View>
  )
}

function PsyTab({
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
  // Active tab sits on top of the warm orange orb — deep-purple foreground
  // (tokens.tabBarPillFg = #1a0a2e) reads cleanly against it.
  const iconColor = focused ? tokens.tabBarPillFg : tokens.tabBarFg
  const labelColor = focused ? tokens.tabBarPillFg : tokens.tabBarFg

  // Per-tab breath — each tab's icon + label pulses on its own period,
  // seeded by the route name so the row is staggered out of sync.
  const breath = useOscillator(2400 + (hashKey(label) % 19) * 180)
  const breathScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.06],
  })

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
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: breathScale }],
        }}
      >
        <View style={focused ? null : { opacity: 0.85 }}>
          {overrideIcon
            ? overrideIcon({ color: iconColor, size: 22, focused })
            : Icon
              ? Icon({ color: iconColor, size: 22 })
              : null}
        </View>
        <Text
          style={{
            marginTop: 3,
            color: labelColor,
            fontFamily: tokens.fontDisplay,
            fontSize: 11,
            fontWeight: focused ? '700' : '400',
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  )
}
