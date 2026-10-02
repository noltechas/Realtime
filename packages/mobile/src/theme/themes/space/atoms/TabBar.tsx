import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Image, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Line } from 'react-native-svg'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS, type TabIconComponent } from '../../../../navigation/TabIcons'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import { SPACE_MOBILE } from '../../../tokens'
import { DISC_IMAGE, ETCH, GOLD_HI, JOST_500, SHEEN_IMAGE, VOID } from './_record'

// Space tab bar: a strip of black glass under an engraved gold hairline, the
// hairline ticked like a ruler. The selection is a small GOLD RECORD under the
// active glyph, which is engraved dark into it (the token pair tabBarPill /
// tabBarPillFg). Choosing another tab rolls the record along the strip: it
// travels on a spring and turns as it goes, a quarter turn per tab. Every
// other tab is the same dust grey (house rule: one colour for every inactive
// tab). Glyphs are the shared Ionicons set.

const BAR_H = 64
const DISC = 42
const FG = SPACE_MOBILE.tabBarFg
const PILL_FG = SPACE_MOBILE.tabBarPillFg

function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const stageLabel = useStageLabel()
  const n = state.routes.length
  const slot = width / n
  const x = useRef(new Animated.Value(state.index)).current

  useEffect(() => {
    Animated.spring(x, { toValue: state.index, stiffness: 170, damping: 20, mass: 0.9, useNativeDriver: true }).start()
  }, [state.index, x])

  const totalH = BAR_H + Math.max(insets.bottom, 10)
  const ticks = useMemo(() => {
    const out: number[] = []
    for (let t = 6; t < width; t += 12) out.push(t)
    return out
  }, [width])

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: totalH }}>
      <LinearGradient colors={['rgba(5,6,12,0.92)', VOID]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <LinearGradient
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        colors={['rgba(233,196,106,0)', ETCH.strong, ETCH.strong, 'rgba(233,196,106,0)']}
        locations={[0, 0.12, 0.88, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1 }}
      />
      <Svg pointerEvents="none" width={width} height={6} style={{ position: 'absolute', left: 0, top: 1 }}>
        {ticks.map((t, i) => (
          <Line key={t} x1={t} y1={0} x2={t} y2={i % 5 === 2 ? 5 : 2.5} stroke={ETCH.faint} strokeWidth={1} />
        ))}
      </Svg>

      {/* the gold record that marks the active tab, rolling between them */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 8,
          left: slot / 2 - DISC / 2,
          width: DISC,
          height: DISC,
          transform: [
            { translateX: x.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: [0, slot * Math.max(1, n - 1)] }) },
            { rotate: x.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: ['0deg', `${90 * Math.max(1, n - 1)}deg`] }) },
          ],
        }}
      >
        <Image source={DISC_IMAGE} style={{ position: 'absolute', width: DISC, height: DISC }} />
      </Animated.View>
      {/* its light stays put while it turns */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 8,
          left: slot / 2 - DISC / 2,
          width: DISC,
          height: DISC,
          transform: [{ translateX: x.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: [0, slot * Math.max(1, n - 1)] }) }],
        }}
      >
        <Image source={SHEEN_IMAGE} style={{ position: 'absolute', width: DISC, height: DISC, opacity: 0.85 }} />
      </Animated.View>

      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 8, height: BAR_H, flexDirection: 'row' }}>
        {state.routes.map((route, i) => {
          const Icon: TabIconComponent | undefined = TAB_ICONS[route.name]
          const options = descriptors[route.key]?.options
          const overrideIcon = options?.tabBarIcon as ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode) | undefined
          const label = route.name === 'Stage' ? stageLabel : route.name
          const focused = state.index === i
          const color = focused ? PILL_FG : FG
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
          }
          return (
            <Pressable key={route.key} onPress={onPress} accessibilityLabel={label} hitSlop={4} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ height: DISC, alignItems: 'center', justifyContent: 'center' }}>
                {overrideIcon ? overrideIcon({ color, size: 19, focused }) : Icon ? <Icon color={color} size={19} /> : null}
              </View>
              <Text numberOfLines={1} style={{ fontFamily: JOST_500, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: focused ? GOLD_HI : FG, marginTop: 3 }}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
