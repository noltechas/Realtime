import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Image, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS, type TabIconComponent } from '../../../../navigation/TabIcons'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import { STEAMPUNK_MOBILE } from '../../../tokens'
import { ENAMEL_STOPS, GEAR_IMG, IMG, LAMP, MODULE, OLD_B, gearGeometry } from './_engine'

// Steampunk tab bar: RACK AND PINION. A brass gear rack runs along the top
// of the enamel control strip, and a pinion rides on it above the active tab.
// Choose another tab and the pinion rolls along the rack to it, turning
// exactly as far as it travels, its teeth meshed with the rack's. The active
// glyph and label are lit lamplight; every other tab shares one colour (house
// rule). Glyphs are the shared Ionicons set.

const BAR_H = 62
const FG = STEAMPUNK_MOBILE.tabBarFg
const ACTIVE = STEAMPUNK_MOBILE.tabBarPill

// the pinion and the rack share one scale, so the teeth match
const S = 0.26
const PINION = 10 as const
const RP = gearGeometry(PINION).pitch * S
const PIN_SIZE = gearGeometry(PINION).size * S
const PITCH = Math.PI * MODULE * S
const RACK_W = 41 * S
const RACK_H = 34 * S
/** where the rack's pitch line sits, below its top edge */
const RACK_PITCH_Y = MODULE * 0.95 * S

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
    Animated.spring(x, { toValue: state.index, stiffness: 120, damping: 18, mass: 1, useNativeDriver: true }).start()
  }, [state.index, x])

  const totalH = BAR_H + Math.max(insets.bottom, 10)
  const rackY = 0
  const teeth = Math.ceil(width / RACK_W) + 1
  // pinion centre over the first tab, its pitch circle on the rack's pitch line
  const cx0 = slot / 2
  const cy = rackY + RACK_PITCH_Y - RP
  // phase the pinion so a gap sits on each rack tooth (rack teeth are centred
  // in each tile, i.e. at (k + 0.5) * pitch)
  const phase0 = useMemo(() => {
    let r = (cx0 / PITCH - 0.5) % 1
    if (r < 0) r += 1
    return 90 - (360 / PINION) * (0.5 - r)
  }, [cx0])
  const travel = slot * Math.max(1, n - 1)
  const turn = (travel / RP) * (180 / Math.PI)

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: totalH }}>
      <LinearGradient colors={ENAMEL_STOPS as unknown as [string, string, ...string[]]} style={{ position: 'absolute', left: 0, right: 0, top: RACK_H - 2, bottom: 0 }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: RACK_H - 2, height: 4, backgroundColor: 'rgba(0,0,0,0.45)' }} />

      {/* the rack */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: rackY, height: RACK_H, flexDirection: 'row' }}>
        {Array.from({ length: teeth }, (_, i) => (
          <Image key={i} source={IMG.rack} resizeMode="stretch" style={{ width: RACK_W, height: RACK_H }} />
        ))}
      </View>

      {/* the pinion, rolling to the active tab */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: cx0 - PIN_SIZE / 2,
          top: cy - PIN_SIZE / 2,
          width: PIN_SIZE,
          height: PIN_SIZE,
          transform: [
            { translateX: x.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: [0, travel] }) },
            { rotate: x.interpolate({ inputRange: [0, Math.max(1, n - 1)], outputRange: [`${phase0}deg`, `${phase0 + turn}deg`] }) },
          ],
        }}
      >
        <Image source={GEAR_IMG[PINION].src} style={{ width: PIN_SIZE, height: PIN_SIZE }} />
      </Animated.View>

      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: RACK_H + 4, height: BAR_H - 6, flexDirection: 'row' }}>
        {state.routes.map((route, i) => {
          const Icon: TabIconComponent | undefined = TAB_ICONS[route.name]
          const options = descriptors[route.key]?.options
          const overrideIcon = options?.tabBarIcon as ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode) | undefined
          const label = route.name === 'Stage' ? stageLabel : route.name
          const focused = state.index === i
          const color = focused ? ACTIVE : FG
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
          }
          return (
            <Pressable key={route.key} onPress={onPress} accessibilityLabel={label} hitSlop={4} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ height: 28, alignItems: 'center', justifyContent: 'center' }}>
                {overrideIcon ? overrideIcon({ color, size: 21, focused }) : Icon ? <Icon color={color} size={21} /> : null}
              </View>
              <Text numberOfLines={1} style={{ fontFamily: OLD_B, fontSize: 9.5, letterSpacing: 1.6, textTransform: 'uppercase', color: focused ? LAMP : FG, marginTop: 2 }}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
