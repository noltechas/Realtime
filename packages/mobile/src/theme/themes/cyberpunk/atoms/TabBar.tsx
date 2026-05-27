import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, Easing } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useTheme } from '../../../ThemeContext'
import { TAB_ICONS, type TabIconComponent } from '../../../../navigation/TabIcons'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'

// Live label for the Stage tab. Returns 'STAGE' when the local guest is
// matched to a singer on the now-playing track, 'REACT' otherwise. Mirrors
// the LiquidGlassTabBar behavior so the cyberpunk variant is functionally
// equivalent — just with a different aesthetic.
function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'STAGE' : 'REACT'
}

// Cyberpunk HUD nav — full-width terminal panel at the bottom of the screen
// (no floating capsule, no rounded corners). The active tab is "framed" by
// corner brackets, an animated underline indicator, and a flickering LED dot
// — all in the theme's neon green on a void-black panel with a top neon
// hairline + glow. A vertical scan line drifts across the active tab's
// underline every cycle to sell the CRT feel.
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()

  // Underline & corner-bracket position animation. Uses native driver since
  // we only transform the underline; the corner brackets are static View
  // anchors on each tab.
  const indicator = useRef(new Animated.Value(state.index)).current
  const [trackWidth, setTrackWidth] = useState(0)
  const tabCount = state.routes.length
  const tabWidth = trackWidth > 0 ? trackWidth / tabCount : 0

  // Glitch flash — bumped briefly on every tab switch so the indicator
  // appears to "jump" with a hard snap rather than spring-smoothly into
  // place. Drives both opacity (0.4 → 1) and a tiny horizontal jitter.
  const glitch = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(indicator, {
        toValue: state.index,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(glitch, {
          toValue: 1,
          duration: 60,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glitch, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [state.index, indicator, glitch])

  const inputRange = state.routes.map((_, i) => i)
  const translateX =
    tabWidth > 0
      ? indicator.interpolate({
          inputRange,
          outputRange: inputRange.map((i) => i * tabWidth),
        })
      : 0
  const jitter = glitch.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -2, 0],
  })

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(insets.bottom, 6),
        backgroundColor: tokens.appBg,
      }}
    >
      {/* Top neon hairline + soft outer glow. Stacked Views give us a thin
          1px green line and a wider, more diffuse glow below it. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 1,
          backgroundColor: tokens.accentA,
          shadowColor: tokens.accentGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 12,
        }}
      />

      {/* Main tab strip */}
      <View
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        style={{
          flexDirection: 'row',
          minHeight: 64,
          paddingTop: 6,
          paddingBottom: 6,
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,255,136,0.18)',
        }}
      >
        {/* Active-tab indicator: 2px green underline at the bottom of the
            active tab, plus a fading "scanner" rectangle that pulses with the
            glitch on every switch. */}
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: tabWidth,
              bottom: 0,
              backgroundColor: 'rgba(0,255,136,0.06)',
              transform: [{ translateX }, { translateX: jitter }],
            }}
          />
        ) : null}
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: tabWidth,
              height: 2,
              backgroundColor: tokens.accentA,
              transform: [{ translateX }],
              shadowColor: tokens.accentGlowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 8,
            }}
          />
        ) : null}
        {/* Glitch overlay that flashes during tab transitions */}
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: tabWidth,
              bottom: 0,
              backgroundColor: tokens.accentA,
              opacity: glitch.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.12],
              }),
              transform: [{ translateX }],
            }}
          />
        ) : null}

        {state.routes.map((route, i) => {
          const Icon: TabIconComponent | undefined = TAB_ICONS[route.name]
          const options = descriptors[route.key]?.options
          const overrideIcon = options?.tabBarIcon as
            | ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode)
            | undefined
          const focused = state.index === i
          const baseLabel = route.name === 'Stage' ? stageLabel : route.name
          const label = baseLabel.toUpperCase()
          const color = focused ? tokens.accentA : tokens.tabBarFg

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }
          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key })
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              hitSlop={4}
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {/* Corner brackets on the active tab — four 1px green
                  L-shapes anchored to the cell corners. Visible only when
                  focused. */}
              {focused ? <TabBrackets color={tokens.accentA} /> : null}

              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                {overrideIcon
                  ? overrideIcon({ color, size: 22, focused })
                  : Icon
                  ? <Icon color={color} />
                  : null}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 6,
                    gap: 4,
                  }}
                >
                  {focused ? (
                    <Text style={[bracketGlyphStyle, { color: tokens.accentA }]}>
                      &gt;
                    </Text>
                  ) : null}
                  <Text
                    style={{
                      color,
                      fontFamily: tokens.fontDisplay,
                      fontWeight: focused ? '900' : '700',
                      fontSize: 10,
                      letterSpacing: 2.4,
                      textShadowColor: focused
                        ? tokens.accentGlowColor
                        : 'transparent',
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: focused ? 6 : 0,
                    }}
                  >
                    {label}
                  </Text>
                </View>
                {/* Tab index readout — printed in faint green underneath the
                    label as a HUD-style "channel number". Only shown when
                    inactive so the active tab's typography stays clean. */}
                {!focused ? (
                  <Text
                    style={{
                      marginTop: 2,
                      color: 'rgba(0,255,136,0.32)',
                      fontFamily: tokens.fontDisplay,
                      fontSize: 8,
                      letterSpacing: 1.2,
                    }}
                  >
                    CH{(i + 1).toString().padStart(2, '0')}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// Four L-shaped 1px corner brackets that frame the active tab cell. Sized to
// hug the cell with ~6px insets so the brackets don't crowd the icon/label.
function TabBrackets({ color }: { color: string }) {
  const len = 10
  const w = 1
  const inset = 6
  return (
    <>
      {/* Top-left */}
      <View pointerEvents="none" style={{ position: 'absolute', top: inset, left: inset, width: len, height: w, backgroundColor: color }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: inset, left: inset, width: w, height: len, backgroundColor: color }} />
      {/* Top-right */}
      <View pointerEvents="none" style={{ position: 'absolute', top: inset, right: inset, width: len, height: w, backgroundColor: color }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: inset, right: inset, width: w, height: len, backgroundColor: color }} />
      {/* Bottom-left */}
      <View pointerEvents="none" style={{ position: 'absolute', bottom: inset, left: inset, width: len, height: w, backgroundColor: color }} />
      <View pointerEvents="none" style={{ position: 'absolute', bottom: inset, left: inset, width: w, height: len, backgroundColor: color }} />
      {/* Bottom-right */}
      <View pointerEvents="none" style={{ position: 'absolute', bottom: inset, right: inset, width: len, height: w, backgroundColor: color }} />
      <View pointerEvents="none" style={{ position: 'absolute', bottom: inset, right: inset, width: w, height: len, backgroundColor: color }} />
    </>
  )
}

const bracketGlyphStyle = {
  fontSize: 10,
  fontWeight: '900' as const,
}
