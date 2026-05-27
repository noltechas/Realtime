import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, Animated, Easing } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useTheme } from '../../../ThemeContext'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'

const AnimatedPath = Animated.createAnimatedComponent(Path)
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

// Hand-drawn sketch icons — single-stroke marker paths over a 24×24 grid.
// Custom SVGs (rather than Ionicons) so they match the rest of the sketch
// theme's marker-on-paper aesthetic.
function SketchHomeIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M 3 10 L 12 3 L 21 10 M 5 9 L 5 20 L 19 20 L 19 9 M 10 20 L 10 14 L 14 14 L 14 20"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function SketchProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M 12 12 C 14.5 12 16.5 10 16.5 7.5 C 16.5 5 14.5 3 12 3 C 9.5 3 7.5 5 7.5 7.5 C 7.5 10 9.5 12 12 12 Z M 5 21 C 5 17 8 14 12 14 C 16 14 19 17 19 21"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function SketchQueueIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M 5 6 L 19 6 M 5 12 L 15 12 M 5 18 L 17 18"
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function SketchSongsIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M 11 17 C 8.5 17 6.5 15.5 6.5 13 C 6.5 10.5 8.5 9 11 9 C 13.5 9 15.5 10.5 15.5 13 C 15.5 15.5 13.5 17 11 17 Z M 15.5 13 L 15.5 3 L 20 2 L 20 7 L 15.5 8"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function SketchStageIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <Path d="M12 19v4" />
      <Path d="M8 23h8" />
    </Svg>
  )
}

function SketchReactIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <Path d="M9 9h.01" />
      <Path d="M15 9h.01" />
    </Svg>
  )
}

function SketchAwardsIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M 7 5 L 17 5 M 7 5 L 7 10 C 7 13 9 15 12 15 C 15 15 17 13 17 10 L 17 5 M 4 5 L 7 5 M 4 5 L 4 8 C 4 10 5.5 11 7 10.5 M 20 5 L 17 5 M 20 5 L 20 8 C 20 10 18.5 11 17 10.5 M 12 15 L 12 20 M 9 20 L 15 20"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

const SKETCH_ICONS: Record<string, React.FC<{ color: string }>> = {
  Home: SketchHomeIcon,
  Profile: SketchProfileIcon,
  Queue: SketchQueueIcon,
  Songs: SketchSongsIcon,
  Stage: SketchStageIcon,
  React: SketchReactIcon,
  Awards: SketchAwardsIcon,
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()

  const totalHeight = 84 + insets.bottom

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
      <TornEdge color={tokens.tabBarBg} accent={tokens.black} />

      <View
        style={{
          flex: 1,
          marginTop: 13,
          backgroundColor: tokens.tabBarBg,
          paddingBottom: insets.bottom,
        }}
      >
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
          style={{
            flexDirection: 'row',
            paddingTop: 8,
            paddingBottom: 6,
            flex: 1,
            position: 'relative',
          }}
        >
          {state.routes.map((route, i) => {
            const focused = state.index === i
            const label = route.name === 'Stage' ? stageLabel : route.name
            const tint = focused ? tokens.tabBarPill : tokens.tabBarFg

            const Icon = SKETCH_ICONS[label] || SKETCH_ICONS[route.name] || SketchHomeIcon

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
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <MarkerDraw color={tokens.black} active={focused} />

                  <View
                    style={{
                      width: 28,
                      height: 28,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon color={tint} />
                  </View>
                  <Text
                    style={{
                      marginTop: 4,
                      color: tint,
                      fontFamily: tokens.fontDisplay,
                      fontWeight: focused ? '700' : '600',
                      fontSize: 14,
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

function MarkerDraw({ color, active }: { color: string; active: boolean }) {
  const drawProgress = useRef(new Animated.Value(active ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(drawProgress, {
      toValue: active ? 1 : 0,
      duration: active ? 350 : 200,
      easing: active ? Easing.out(Easing.cubic) : Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start()
  }, [active, drawProgress])

  const circleOffset = drawProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [120, 0],
  })

  const lineOffset = drawProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  })

  return (
    <View style={{ position: 'absolute', width: 64, height: 60, top: -4, alignItems: 'center' }} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', top: 0, width: 44, height: 38, transform: [{ rotate: '-4deg' }], opacity: drawProgress }}>
        <Svg width="100%" height="100%" viewBox="0 0 44 38">
          <AnimatedCircle
            cx={22}
            cy={19}
            r={17}
            stroke={color}
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="120"
            strokeDashoffset={circleOffset}
          />
        </Svg>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', bottom: -2, width: 56, height: 10, opacity: drawProgress }}>
        <Svg width="100%" height="100%" viewBox="0 0 64 10">
          <AnimatedPath
            d="M 2 6 Q 10 1 18 5 T 34 6 T 50 4 T 62 6"
            stroke={color}
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="80"
            strokeDashoffset={lineOffset}
          />
        </Svg>
      </Animated.View>
    </View>
  )
}

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
      <Svg width="100%" height="100%" viewBox="0 0 600 14" preserveAspectRatio="none">
        <Path
          d="M 0 4 L 14 1 L 28 5 L 42 2 L 56 6 L 70 3 L 84 5 L 98 1 L 112 4 L 126 6 L 140 2 L 154 5 L 168 3 L 182 6 L 196 1 L 210 4 L 224 6 L 238 2 L 252 5 L 266 1 L 280 4 L 294 6 L 308 2 L 322 5 L 336 3 L 350 6 L 364 1 L 378 4 L 392 6 L 406 2 L 420 5 L 434 3 L 448 6 L 462 1 L 476 4 L 490 6 L 504 2 L 518 5 L 532 1 L 546 4 L 560 6 L 574 2 L 588 5 L 600 3"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={4}
          fill="none"
          strokeLinejoin="round"
        />
        <Path
          d="M 0 4 L 14 1 L 28 5 L 42 2 L 56 6 L 70 3 L 84 5 L 98 1 L 112 4 L 126 6 L 140 2 L 154 5 L 168 3 L 182 6 L 196 1 L 210 4 L 224 6 L 238 2 L 252 5 L 266 1 L 280 4 L 294 6 L 308 2 L 322 5 L 336 3 L 350 6 L 364 1 L 378 4 L 392 6 L 406 2 L 420 5 L 434 3 L 448 6 L 462 1 L 476 4 L 490 6 L 504 2 L 518 5 L 532 1 L 546 4 L 560 6 L 574 2 L 588 5 L 600 3 L 600 14 L 0 14 Z"
          fill={color}
        />
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

function labelTilt(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  const choices = [-1.5, -0.5, 0.5, 1.5]
  return choices[((h % choices.length) + choices.length) % choices.length]
}
