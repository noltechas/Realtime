import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, Easing } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useTheme } from '../theme/ThemeContext'
import { TAB_ICONS, type TabIconComponent } from './TabIcons'
import { useSession } from '../hooks/useSession'
import { useSessionRow, guestIsUp } from '../hooks/useSessionRow'

// Live label for the Stage tab — same logic as the other tab bars.
function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName) ? 'Stage' : 'React'
}

// Sketch / hand-drawn nav bar. Cream paper background with a torn-paper top
// edge (zig-zag SVG), each tab label in handwriting font, and the *active*
// tab gets two markings layered on top:
//   1. A blue marker-circle drawn around the icon — like someone circled
//      their favorite. The circle is a stroked SVG ellipse made slightly
//      ragged with a per-mount random rotation so it never looks "machined".
//   2. A wobbly scribble underline beneath the label, also in blue marker,
//      drawn as a single hand-traced SVG path.
// Inactive tabs are just label + icon in graphite, no decorations.
// Press feedback: the pressed tab rotates ~2° for the "marker bouncing"
// feel. Tab switches animate the circle/underline horizontally with a
// gentle spring (no glitch — this is paper, not a CRT).
export function SketchTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()

  const indicator = useRef(new Animated.Value(state.index)).current
  const [trackWidth, setTrackWidth] = useState(0)
  const tabCount = state.routes.length
  const tabWidth = trackWidth > 0 ? trackWidth / tabCount : 0

  useEffect(() => {
    Animated.spring(indicator, {
      toValue: state.index,
      damping: 13,
      stiffness: 150,
      mass: 1,
      useNativeDriver: true,
    }).start()
  }, [state.index, indicator])

  const inputRange = state.routes.map((_, i) => i)
  const translateX =
    tabWidth > 0
      ? indicator.interpolate({
          inputRange,
          outputRange: inputRange.map((i) => i * tabWidth),
        })
      : 0

  const totalHeight = 92 + insets.bottom

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: totalHeight,
      }}
    >
      {/* Torn-paper top edge — a zig-zag SVG band that sits above the cream
          panel so the bar reads as a sheet of paper "torn off" from a pad. */}
      <TornEdge color={tokens.tabBarBg} accent={tokens.black} />

      {/* The actual cream panel that holds the tabs */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 12,
          bottom: 0,
          backgroundColor: tokens.tabBarBg,
          paddingBottom: insets.bottom,
        }}
      >
        {/* A single faint ruled line just under the tabs — same vibe as the
            screen backdrop, anchors the labels to "the page". */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 4,
            height: 1,
            backgroundColor: 'rgba(45,45,45,0.08)',
          }}
        />

        <View
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          style={{
            flexDirection: 'row',
            paddingTop: 10,
            paddingBottom: 6,
            minHeight: 70,
            position: 'relative',
          }}
        >
          {/* Animated marker-circle + underline indicator. Both sit absolutely
              over the active tab and slide via the same animated translateX. */}
          {tabWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 4,
                left: 0,
                width: tabWidth,
                bottom: 0,
                transform: [{ translateX }],
              }}
            >
              <MarkerCircle color={tokens.tabBarPill} />
              <ScribbleUnderline color={tokens.tabBarPill} />
            </Animated.View>
          ) : null}

          {state.routes.map((route, i) => {
            const Icon: TabIconComponent | undefined = TAB_ICONS[route.name]
            const options = descriptors[route.key]?.options
            const overrideIcon = options?.tabBarIcon as
              | ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode)
              | undefined
            const focused = state.index === i
            const label = route.name === 'Stage' ? stageLabel : route.name
            const tint = focused ? tokens.tabBarPill : tokens.tabBarFg

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

            // Each tab label gets a tiny static rotation seeded from its
            // route name — handwriting is never perfectly aligned. Pressing
            // adds a small additional wobble.
            const baseRotate = labelTilt(route.name)

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                hitSlop={4}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                  transform: [
                    { rotate: pressed ? `${baseRotate + 2}deg` : `${baseRotate}deg` },
                    { scale: pressed ? 0.96 : 1 },
                  ],
                })}
              >
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {overrideIcon
                      ? overrideIcon({ color: tint, size: 22, focused })
                      : Icon
                      ? <Icon color={tint} />
                      : null}
                  </View>
                  <Text
                    style={{
                      marginTop: 6,
                      color: tint,
                      fontFamily: tokens.fontDisplay,
                      fontWeight: focused ? '700' : '600',
                      fontSize: 13,
                      letterSpacing: 0.2,
                    }}
                  >
                    {label}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

// Marker circle — an SVG ellipse stroked in blue, sized to wrap the icon.
// `viewBox` and absolute positioning let it ride above the tab strip without
// affecting layout. Slight rotation makes it look hand-drawn.
function MarkerCircle({ color }: { color: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        alignSelf: 'center',
        width: 44,
        height: 38,
        transform: [{ rotate: '-4deg' }],
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 44 38">
        <Circle
          cx={22}
          cy={19}
          r={17}
          stroke={color}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
          // Dasharray approximates a marker that lifted slightly mid-stroke
          // — the gap appears once per loop so it doesn't look like a dashed
          // line, it looks like a single sketchy circle.
          strokeDasharray="92 14"
          strokeDashoffset={8}
        />
      </Svg>
    </View>
  )
}

// Wobbly scribble underline beneath the active label — a single SVG path
// traced in marker blue.
function ScribbleUnderline({ color }: { color: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 6,
        alignSelf: 'center',
        width: 64,
        height: 10,
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 64 10">
        <Path
          d="M 2 6 Q 10 1 18 5 T 34 6 T 50 4 T 62 6"
          stroke={color}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  )
}

// A zig-zag SVG band that sits above the bar so the top edge of the cream
// panel reads as a torn sheet of paper. The viewBox is normalized so the
// pattern scales with screen width. A 1px dark hairline runs along the top
// of the band (the side of the tear) for definition.
function TornEdge({ color, accent }: { color: string; accent: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 14,
      }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 600 14"
        preserveAspectRatio="none"
      >
        {/* Cream "paper" filling, jagged top edge */}
        <Path
          d="M 0 4 L 14 1 L 28 5 L 42 2 L 56 6 L 70 3 L 84 5 L 98 1 L 112 4 L 126 6 L 140 2 L 154 5 L 168 3 L 182 6 L 196 1 L 210 4 L 224 6 L 238 2 L 252 5 L 266 1 L 280 4 L 294 6 L 308 2 L 322 5 L 336 3 L 350 6 L 364 1 L 378 4 L 392 6 L 406 2 L 420 5 L 434 3 L 448 6 L 462 1 L 476 4 L 490 6 L 504 2 L 518 5 L 532 1 L 546 4 L 560 6 L 574 2 L 588 5 L 600 3 L 600 14 L 0 14 Z"
          fill={color}
        />
        {/* Thin dark hairline traces the jagged edge */}
        <Path
          d="M 0 4 L 14 1 L 28 5 L 42 2 L 56 6 L 70 3 L 84 5 L 98 1 L 112 4 L 126 6 L 140 2 L 154 5 L 168 3 L 182 6 L 196 1 L 210 4 L 224 6 L 238 2 L 252 5 L 266 1 L 280 4 L 294 6 L 308 2 L 322 5 L 336 3 L 350 6 L 364 1 L 378 4 L 392 6 L 406 2 L 420 5 L 434 3 L 448 6 L 462 1 L 476 4 L 490 6 L 504 2 L 518 5 L 532 1 L 546 4 L 560 6 L 574 2 L 588 5 L 600 3"
          stroke={accent}
          strokeWidth={1}
          strokeOpacity={0.35}
          fill="none"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  )
}

// Stable hash from a route name → a tiny rotation in degrees. -1.5° to +1.5°,
// quantized to integer multiples so the rotation reads as "handwritten" not
// "noisy".
function labelTilt(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  const choices = [-1.5, -0.5, 0.5, 1.5]
  return choices[((h % choices.length) + choices.length) % choices.length]
}
