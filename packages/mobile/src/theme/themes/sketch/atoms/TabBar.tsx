import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS, type TabIconComponent } from '../../../../navigation/TabIcons'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import { SKETCH_MOBILE } from '../../../tokens'
import { Ball, INK, SHEET, ballSprite, note } from './_pencil'

// Sketch tab bar: the foot of the EXPOSURE SHEET, its printed teal rules
// ruling a column for each tab. The ball sits on the sheet's top edge over
// the active tab; choose another and it HOPS there: across at a steady speed,
// up and down under gravity, squashing as it lands. The active glyph and
// label are inked; every other tab shares one pencil grey (house rule).
// Glyphs are the shared Ionicons set.

const BAR_H = 60
const FG = SKETCH_MOBILE.tabBarFg
const RULE = 'rgba(79,138,132,0.5)'
const D = 17
const S = ballSprite(D)
const PAD = (S - D) / 2

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
  const hop = useRef(new Animated.Value(0)).current
  const land = useRef(new Animated.Value(0)).current
  const last = useRef(state.index)
  useEffect(() => {
    if (last.current === state.index) return
    const dist = Math.abs(state.index - last.current)
    last.current = state.index
    const t = 300 + dist * 70
    hop.setValue(0)
    Animated.parallel([
      Animated.timing(x, { toValue: state.index, duration: t, easing: Easing.linear, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: t / 2, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: t / 2, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => {
      if (!finished) return
      land.setValue(1)
      Animated.spring(land, { toValue: 0, stiffness: 420, damping: 11, mass: 0.6, useNativeDriver: true }).start()
    })
  }, [state.index, x, hop, land])

  const rise = 26 + Math.min(3, n) * 4
  const totalH = BAR_H + Math.max(insets.bottom, 10)
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: totalH + S }}>
      {/* the sheet's foot */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: totalH,
          backgroundColor: SHEET,
          borderTopWidth: 1.5,
          borderTopColor: RULE,
          shadowColor: '#2A2218',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        }}
      >
        <View style={{ position: 'absolute', left: 0, right: 0, top: 3, height: 1, backgroundColor: RULE }} />
        {Array.from({ length: n - 1 }, (_, i) => (
          <View key={i} style={{ position: 'absolute', left: slot * (i + 1), top: 4, height: BAR_H - 12, width: 1, backgroundColor: RULE }} />
        ))}
      </View>

      {/* the ball, sitting on the top edge over the active tab */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: slot / 2 - S / 2,
          bottom: totalH - PAD,
          width: S,
          height: S,
          transform: [
            { translateX: x.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: [0, slot * Math.max(1, n - 1)] }) },
            { translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] }) },
            { translateY: S / 2 - PAD },
            { scaleX: land.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.9, 1, 1.3] }) },
            { scaleY: land.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.1, 1, 0.72] }) },
            { translateY: -(S / 2 - PAD) },
          ],
        }}
      >
        <Ball d={D} color={SKETCH_MOBILE.hotRed} />
      </Animated.View>

      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: totalH - BAR_H, height: BAR_H, flexDirection: 'row' }}>
        {state.routes.map((route, i) => {
          const Icon: TabIconComponent | undefined = TAB_ICONS[route.name]
          const options = descriptors[route.key]?.options
          const overrideIcon = options?.tabBarIcon as ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode) | undefined
          const label = route.name === 'Stage' ? stageLabel : route.name
          const focused = state.index === i
          const color = focused ? INK : FG
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
          }
          return (
            <Pressable key={route.key} onPress={onPress} accessibilityLabel={label} hitSlop={4} style={{ flex: 1, alignItems: 'center', paddingTop: 9 }}>
              <View style={{ height: 26, alignItems: 'center', justifyContent: 'center' }}>
                {overrideIcon ? overrideIcon({ color, size: 22, focused }) : Icon ? <Icon color={color} size={22} /> : null}
              </View>
              <Text numberOfLines={1} style={note(17, focused ? INK : FG, { marginTop: 1 })}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.max(insets.bottom, 10), borderTopWidth: 1, borderTopColor: 'rgba(79,138,132,0.2)' }} />
    </View>
  )
}

