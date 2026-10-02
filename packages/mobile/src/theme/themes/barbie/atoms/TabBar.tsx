import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS, type TabIconComponent } from '../../../../navigation/TabIcons'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import { BARBIE_MOBILE } from '../../../tokens'
import { BODY_600, BODY_700, Gloss, WHITE } from './_barbie'

// Barbie tab bar: a glossy Barbie-pink tray with a white scalloped ruffle
// along its top edge, like the trim on a sundress. The selection is a JELLY
// BUBBLE of white plastic: choosing another tab sends it sliding along the
// tray on a spring, and when it arrives it squashes and wobbles. The active
// glyph sits in the bubble in Barbie pink (tabBarPillFg); every other tab is
// the same pale pink (house rule: one colour for every inactive tab). Glyphs
// are the shared Ionicons set.

const BAR_H = 64
const RUFFLE = 8
const BUBBLE = 42
const FG = BARBIE_MOBILE.tabBarFg
const PILL_FG = BARBIE_MOBILE.tabBarPillFg

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
  const x = useRef(new Animated.Value(slot * (state.index + 0.5))).current
  const jelly = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(x, { toValue: slot * (state.index + 0.5), stiffness: 190, damping: 18, mass: 0.8, useNativeDriver: true }).start()
    jelly.setValue(1)
    Animated.spring(jelly, { toValue: 0, stiffness: 260, damping: 6, mass: 0.6, useNativeDriver: true }).start()
  }, [state.index, slot, x, jelly])

  const totalH = BAR_H + Math.max(insets.bottom, 10)
  const ruffle = useMemo(() => rufflePath(width), [width])

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: totalH + RUFFLE }}>
      <Svg pointerEvents="none" width={width} height={totalH + RUFFLE} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <SvgLinearGradient id="btb-tray" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FF6FBC" />
            <Stop offset="0.45" stopColor="#E0218A" />
            <Stop offset="1" stopColor="#C4127A" />
          </SvgLinearGradient>
        </Defs>
        {/* the white ruffle trim, then the glossy pink tray */}
        <Path d={ruffle} fill={WHITE} />
        <Rect x={0} y={RUFFLE} width={width} height={totalH} fill="url(#btb-tray)" />
        {/* the specular along the tray's rounded top, and its lip */}
        <Rect x={0} y={RUFFLE + 2} width={width} height={3} fill={WHITE} opacity={0.35} />
        <Rect x={0} y={RUFFLE} width={width} height={1.5} fill="#B0115E" opacity={0.25} />
      </Svg>

      {/* the jelly bubble */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: RUFFLE + 5,
          left: -BUBBLE / 2,
          width: BUBBLE,
          height: BUBBLE,
          transform: [
            { translateX: x },
            { scaleX: jelly.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.9, 1, 1.18] }) },
            { scaleY: jelly.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.1, 1, 0.84] }) },
          ],
        }}
      >
        <Gloss tone="white" radius={BUBBLE / 2} rim={2} style={{ width: BUBBLE, height: BUBBLE, shadowOpacity: 0.32 }} />
      </Animated.View>

      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: RUFFLE, height: BAR_H, flexDirection: 'row' }}>
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
              <View style={{ height: BUBBLE, marginTop: 5, alignItems: 'center', justifyContent: 'center' }}>
                {overrideIcon ? overrideIcon({ color, size: 20, focused }) : Icon ? <Icon color={color} size={20} /> : null}
              </View>
              <Text numberOfLines={1} style={{ fontFamily: focused ? BODY_700 : BODY_600, fontSize: 10.5, color: focused ? WHITE : FG, marginTop: 1 }}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

/** The ruffle: a row of small scallops bulging up off the tray's top edge. */
function rufflePath(width: number): string {
  const r = RUFFLE
  const n = Math.max(1, Math.round(width / (r * 2)))
  const s = width / n
  let d = `M 0 ${r + 2} L 0 ${r}`
  for (let i = 0; i < n; i++) d += ` A ${s / 2} ${r} 0 0 1 ${s * (i + 1)} ${r}`
  return d + ` L ${width} ${r + 2} Z`
}
