import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Platform, Animated, Easing } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useTheme } from '../../../ThemeContext'
import { TAB_ICONS, type TabIconComponent } from '../../../../navigation/TabIcons'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'

// Live label for the Stage tab. Returns 'Stage' when the local guest is
// matched to a singer on the now-playing track, 'React' otherwise. The hook
// re-renders when the session row's realtime UPDATE event fires, so the tab
// label flips even when the user is on a different tab.
function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

// Floating capsule tab bar with an iOS liquid-glass backdrop. A single pill
// is absolutely positioned behind the tabs and animated between them with a
// spring (slight bounce on arrival) + a brief scaleX overshoot during transit
// for a "watery" stretching feel. Generalises to any number of tabs — icons
// come from the TAB_ICONS map keyed by route name (falls back to whatever
// `tabBarIcon` is set in screen options if a route isn't in TAB_ICONS).
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()

  // Two animated values driving the same selection — one for the pill
  // transform (native driver), one for the icon/label crossfade (JS driver,
  // since interpolating between color strings can't run on the native side).
  const indicatorNative = useRef(new Animated.Value(state.index)).current
  const indicatorJS = useRef(new Animated.Value(state.index)).current
  const stretch = useRef(new Animated.Value(1)).current

  const [trackWidth, setTrackWidth] = useState(0)
  const tabCount = state.routes.length
  const tabWidth = trackWidth > 0 ? trackWidth / tabCount : 0

  useEffect(() => {
    Animated.parallel([
      Animated.spring(indicatorNative, {
        toValue: state.index,
        useNativeDriver: true,
        damping: 14,
        stiffness: 180,
        mass: 1,
      }),
      Animated.spring(indicatorJS, {
        toValue: state.index,
        useNativeDriver: false,
        damping: 14,
        stiffness: 180,
        mass: 1,
      }),
      Animated.sequence([
        Animated.timing(stretch, {
          toValue: 1.18,
          duration: 130,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(stretch, {
          toValue: 1,
          damping: 10,
          stiffness: 200,
          mass: 1,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [state.index, indicatorNative, indicatorJS, stretch])

  const inputRange = state.routes.map((_, i) => i)

  // Pill horizontal position. With the indicator at 0 the pill sits at x=0;
  // at index N it sits at N * tabWidth. We let the spring's mild overshoot
  // ride — the outer container clips any pixels that escape the rounded
  // capsule, so the bounce looks natural without ever poking outside the bar.
  const translateX =
    tabWidth > 0
      ? indicatorNative.interpolate({
          inputRange,
          outputRange: inputRange.map((i) => i * tabWidth),
        })
      : 0

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 22,
        right: 22,
        bottom: Math.max(insets.bottom + 4, 16),
        // Shadow lives on this outer wrapper so it can render outside the
        // bar's bounds. The inner sibling applies overflow:hidden + radius to
        // clip the animated pill to the capsule shape.
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 14,
      }}
    >
      <View
        style={{
          borderRadius: 32,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: tokens.tabBarBorder,
          // Solid base color. Without this, the BlurView's semi-transparent
          // tint is the only thing painting the pill — and on dark screens
          // (Awards) the tint blends into the backdrop at the rounded
          // corners, making the ends look chopped off. The blur layer rides
          // on top of this solid base for the frosted-glass effect.
          backgroundColor: tokens.tabBarBg,
        }}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 70 : 0}
          tint={tokens.tabBarBlurTint}
          style={{
            borderRadius: 32,
            backgroundColor:
              Platform.OS === 'ios'
                ? tokens.tabBarOverlay
                : tokens.tabBarBg,
          }}
        >
          <View
            style={{ padding: 6 }}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width - 12)}
          >
            {tabWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 6,
                  bottom: 6,
                  left: 6,
                  width: tabWidth,
                  backgroundColor: tokens.tabBarPill,
                  borderRadius: 26,
                  transform: [{ translateX }, { scaleX: stretch }],
                }}
              />
            ) : null}

            <View style={{ flexDirection: 'row' }}>
              {state.routes.map((route, i) => {
                const Icon: TabIconComponent | undefined = TAB_ICONS[route.name]
                const options = descriptors[route.key]?.options
                // Per-screen icon override (set via Tabs.Screen options) —
                // used by the React/Stage tab so its glyph can flip between
                // mic (singing) and smiley (reacting) based on session state.
                const overrideIcon = options?.tabBarIcon as
                  | ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode)
                  | undefined
                // Label override: the React/Stage tab toggles its label live
                // based on whether the local guest is matched on the current
                // now-playing track. Other routes just use their route name.
                const label = route.name === 'Stage' ? stageLabel : route.name

                const focusAmount = indicatorJS.interpolate({
                  inputRange: [i - 1, i, i + 1],
                  outputRange: [0, 1, 0],
                  extrapolate: 'clamp',
                })

                const onPress = () => {
                  const focused = state.index === i
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
                    hitSlop={6}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      paddingHorizontal: 4,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        position: 'relative',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <TabContent
                        label={label}
                        Icon={Icon}
                        renderIcon={overrideIcon}
                        color={tokens.tabBarFg}
                        focused={state.index === i}
                      />
                      <Animated.View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: focusAmount,
                        }}
                      >
                        <TabContent
                          label={label}
                          Icon={Icon}
                          renderIcon={overrideIcon}
                          color={tokens.tabBarPillFg}
                          focused={state.index === i}
                        />
                      </Animated.View>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </BlurView>
      </View>
    </View>
  )
}

function TabContent({
  label,
  Icon,
  renderIcon,
  color,
  focused,
}: {
  label: string
  Icon: TabIconComponent | undefined
  renderIcon?: (p: { color: string; size?: number; focused: boolean }) => React.ReactNode
  color: string
  focused: boolean
}) {
  const { tokens } = useTheme()
  return (
    <>
      {renderIcon
        ? renderIcon({ color, size: 22, focused })
        : Icon
        ? <Icon color={color} />
        : null}
      <Text
        style={{
          marginTop: 4,
          color,
          fontFamily: tokens.fontDisplay,
          fontWeight: '800',
          fontSize: 11,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </>
  )
}
