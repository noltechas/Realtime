import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, RadialGradient, Rect, Stop, Circle } from 'react-native-svg'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS, type TabIconComponent } from '../../../../navigation/TabIcons'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import { GOTHIC_MOBILE } from '../../../tokens'
import { CANDLE, GOTHIC_600, GOTHIC_700, useFlicker } from './_gothic'

// Gothic tab bar: the churchyard fence. A wrought-iron rail runs the full width
// with spear-tipped pickets rising out of it, and from the rail hangs a single
// LANTERN. The lantern is the selection: the active tab's glyph sits inside its
// lit glass as a dark silhouette against the flame (the token pair tabBarPill /
// tabBarPillFg), and choosing another tab carries the lantern along the rail on
// a spring, where it swings on its hook and settles. Every other tab is the same
// iron grey (house rule: one colour for every inactive tab). Glyphs are the
// shared Ionicons set.

const BAR_H = 70
const LANTERN_W = 46
const LANTERN_H = 54
const FG = GOTHIC_MOBILE.tabBarFg
const PILL_FG = GOTHIC_MOBILE.tabBarPillFg

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
  const swing = useRef(new Animated.Value(0)).current
  const flicker = useFlicker()
  const prev = useRef(state.index)

  useEffect(() => {
    const to = slot * (state.index + 0.5)
    const dir = Math.sign(state.index - prev.current)
    prev.current = state.index
    Animated.spring(x, { toValue: to, stiffness: 150, damping: 19, mass: 0.9, useNativeDriver: true }).start()
    if (dir !== 0) {
      // The lantern lags as it is carried, then swings past and settles: a
      // pendulum, lightly damped.
      Animated.sequence([
        Animated.timing(swing, { toValue: -dir * 16, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(swing, { toValue: 0, stiffness: 70, damping: 5, mass: 1, useNativeDriver: true }),
      ]).start()
    }
  }, [state.index, slot, x, swing])

  const fence = useMemo(() => fencePath(width), [width])
  const totalH = BAR_H + Math.max(insets.bottom, 10)

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: totalH + 16 }}>
      {/* the threshold and the fence */}
      <Svg pointerEvents="none" width={width} height={totalH + 16} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <SvgLinearGradient id="gtb-bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0B0A0F" stopOpacity={0.88} />
            <Stop offset="0.3" stopColor="#0B0A0F" stopOpacity={0.96} />
            <Stop offset="1" stopColor="#07060A" stopOpacity={1} />
          </SvgLinearGradient>
          <SvgLinearGradient id="gtb-iron" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#6A6474" />
            <Stop offset="0.35" stopColor="#24212A" />
            <Stop offset="1" stopColor="#0B0A0E" />
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={16} width={width} height={totalH} fill="url(#gtb-bg)" />
        <Path d={fence.pickets} stroke="#0B0A0E" strokeWidth={3.2} />
        <Path d={fence.pickets} stroke="#3A3642" strokeWidth={1.2} />
        <Path d={fence.tips} fill="url(#gtb-iron)" stroke="#060508" strokeWidth={0.8} />
        <Rect x={0} y={16} width={width} height={4} fill="url(#gtb-iron)" />
        <Rect x={0} y={16} width={width} height={1} fill="#8A8494" opacity={0.5} />
        <Rect x={0} y={24} width={width} height={1.6} fill="#1E1B24" />
      </Svg>

      {/* The lantern's light, thrown on the threshold around it. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 4,
          left: -slot * 0.9,
          width: slot * 1.8,
          height: BAR_H,
          opacity: flicker.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }),
          transform: [{ translateX: x }],
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="gtb-pool" cx="50%" cy="45%" rx="50%" ry="55%">
              <Stop offset="0" stopColor="#FFB45A" stopOpacity={0.32} />
              <Stop offset="0.5" stopColor="#C9702A" stopOpacity={0.1} />
              <Stop offset="1" stopColor="#C9702A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill="url(#gtb-pool)" />
        </Svg>
      </Animated.View>

      {/* The lantern itself, hung from the rail. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 17,
          left: -LANTERN_W / 2,
          width: LANTERN_W,
          height: LANTERN_H,
          transform: [
            { translateX: x },
            { translateY: -LANTERN_H / 2 },
            { rotate: swing.interpolate({ inputRange: [-30, 30], outputRange: ['-30deg', '30deg'] }) },
            { translateY: LANTERN_H / 2 },
          ],
        }}
      >
        <Lantern flicker={flicker} />
      </Animated.View>

      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 16, height: BAR_H, flexDirection: 'row' }}>
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
              <View style={{ height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 9 }}>
                {overrideIcon ? overrideIcon({ color, size: 20, focused }) : Icon ? <Icon color={color} size={20} /> : null}
              </View>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: focused ? GOTHIC_700 : GOTHIC_600,
                  fontSize: 11,
                  letterSpacing: 0.3,
                  color: focused ? CANDLE : FG,
                  marginTop: 2,
                }}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

/** The fence crest along the bar's top edge: pickets every ~15px with spear
 *  tips, a taller finial at each lantern bay boundary. */
function fencePath(width: number): { pickets: string; tips: string } {
  const step = 15
  const pickets: string[] = []
  const tips: string[] = []
  for (let x = step / 2, i = 0; x < width; x += step, i++) {
    const tall = i % 5 === 2
    const top = tall ? 2 : 7
    pickets.push(`M ${x} ${top + 5} L ${x} 26`)
    // Spear tip: a lozenge with a little collar under it.
    tips.push(`M ${x} ${top} L ${x + 2.6} ${top + 5} L ${x} ${top + 7.2} L ${x - 2.6} ${top + 5} Z`)
    tips.push(`M ${x - 2} ${top + 8.4} L ${x + 2} ${top + 8.4} L ${x + 2} ${top + 9.6} L ${x - 2} ${top + 9.6} Z`)
  }
  return { pickets: pickets.join(' '), tips: tips.join(' ') }
}

/** An iron lantern: hook, pointed cap with a finial, a cage of four glass panes
 *  with pointed-arch heads, lit from within by a flickering flame. */
function Lantern({ flicker }: { flicker: Animated.Value }) {
  return (
    <View style={{ width: LANTERN_W, height: LANTERN_H }}>
      {/* the glass glow behind the cage bars */}
      <Animated.View style={{ position: 'absolute', left: 8, right: 8, top: 14, bottom: 8, opacity: flicker.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="gtb-glass" cx="50%" cy="58%" rx="60%" ry="60%">
              <Stop offset="0" stopColor="#FFF0C4" />
              <Stop offset="0.45" stopColor="#F6C66A" />
              <Stop offset="1" stopColor="#C9702A" />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill="url(#gtb-glass)" />
        </Svg>
      </Animated.View>
      <Svg width={LANTERN_W} height={LANTERN_H} style={{ position: 'absolute' }}>
        {/* hook and ring */}
        <Circle cx={23} cy={2.6} r={2.4} fill="none" stroke="#4C4755" strokeWidth={1.4} />
        <Path d="M 23 5 L 23 8" stroke="#2A2630" strokeWidth={1.6} />
        {/* pointed cap */}
        <Path d="M 23 7 L 39 15 L 7 15 Z" fill="#1E1B24" stroke="#060508" strokeWidth={1} />
        <Path d="M 23 7 L 31 11" stroke="#8A8494" strokeOpacity={0.6} strokeWidth={0.8} />
        <Path d="M 5 15 L 41 15 L 41 17 L 5 17 Z" fill="#2A2630" />
        {/* cage: frame, mullion-free so the glyph reads, pointed heads on the panes */}
        <Path d="M 8 17 L 8 47 M 38 17 L 38 47" stroke="#0E0D11" strokeWidth={2.4} />
        <Path d="M 8 22 Q 10.5 17.5 13 17.5 M 38 22 Q 35.5 17.5 33 17.5" stroke="#0E0D11" strokeWidth={1.6} fill="none" />
        <Path d="M 8.6 17 L 8.6 47" stroke="#6A6474" strokeOpacity={0.5} strokeWidth={0.6} />
        {/* base plate */}
        <Path d="M 5 47 L 41 47 L 38 51 L 8 51 Z" fill="#1E1B24" stroke="#060508" strokeWidth={1} />
        <Path d="M 20 51 L 26 51 L 23 54 Z" fill="#2A2630" />
      </Svg>
    </View>
  )
}
