import React, { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS, type TabIconComponent } from '../../../../navigation/TabIcons'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import { LIQUID_GLASS_MOBILE } from '../../../tokens'
import { Glass, WHITE, sf } from './_glass'

// Liquid Glass tab bar: a capsule of glass floating above the content, inset
// from the edges. The active tab sits in a lens of brighter glass that slides
// to whichever tab you pick (a spring with a little stretch as it travels,
// like a drop running along the bar). The active glyph and label are white;
// every other tab shares one colour (house rule). Glyphs are the shared
// Ionicons set. Under the bar, the system's scroll-edge effect: content
// scrolling down dims away before it reaches the glass, so a list never
// seems to collide with the bar floating over it.
const BAR_H = 66
const FG = LIQUID_GLASS_MOBILE.tabBarFg

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
  const side = 16
  const barW = width - side * 2
  const slot = (barW - 12) / n
  const x = useRef(new Animated.Value(state.index)).current
  const stretch = useRef(new Animated.Value(0)).current
  const [last, setLast] = useState(state.index)
  useEffect(() => {
    if (last === state.index) return
    setLast(state.index)
    stretch.setValue(1)
    Animated.parallel([
      Animated.spring(x, { toValue: state.index, stiffness: 190, damping: 19, mass: 0.9, useNativeDriver: true }),
      Animated.spring(stretch, { toValue: 0, stiffness: 120, damping: 14, useNativeDriver: true }),
    ]).start()
  }, [state.index, last, x, stretch])
  const bottom = Math.max(insets.bottom - 6, 10)
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAR_H + bottom + 8 }}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(8,11,36,0)', 'rgba(8,11,36,0.62)', 'rgba(8,11,36,0.94)']}
        locations={[0, 0.42, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: -84, bottom: 0 }}
      />
      <Glass radius={BAR_H / 2} style={{ position: 'absolute', left: side, right: side, bottom, height: BAR_H }}>
        {/* the lens over the active tab */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 6,
            top: 6,
            width: slot,
            height: BAR_H - 12,
            borderRadius: (BAR_H - 12) / 2,
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.22)',
            transform: [
              { translateX: x.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: [0, slot * Math.max(1, n - 1)] }) },
              { scaleX: stretch.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) },
              { scaleY: stretch.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
            ],
          }}
        />
        <View style={{ position: 'absolute', left: 6, right: 6, top: 0, bottom: 0, flexDirection: 'row' }}>
          {state.routes.map((route, i) => {
            const Icon: TabIconComponent | undefined = TAB_ICONS[route.name]
            const options = descriptors[route.key]?.options
            const overrideIcon = options?.tabBarIcon as ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode) | undefined
            const label = route.name === 'Stage' ? stageLabel : route.name
            const focused = state.index === i
            const color = focused ? WHITE : FG
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
            }
            return (
              <Pressable key={route.key} onPress={onPress} accessibilityLabel={label} hitSlop={4} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ height: 26, alignItems: 'center', justifyContent: 'center' }}>
                  {overrideIcon ? overrideIcon({ color, size: 22, focused }) : Icon ? <Icon color={color} size={22} /> : null}
                </View>
                <Text numberOfLines={1} style={sf(10.5, focused ? '700' : '600', color, { marginTop: 2, letterSpacing: 0 })}>
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </Glass>
    </View>
  )
}
