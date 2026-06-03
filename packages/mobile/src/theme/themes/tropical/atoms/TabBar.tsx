import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Line, Circle } from 'react-native-svg'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useTheme } from '../../../ThemeContext'
import { TAB_ICONS, type TabIconComponent } from '../../../../navigation/TabIcons'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import { BAMBOO, BAMBOO_LT, BAMBOO_DK, WOOD, softShadow } from './_tropical'

// Tropical tab bar — a full-width bamboo cane spanning edge to edge, with five
// little wooden signboards hanging beneath it on rope cords (one per tab). The
// signs sway like a real hanging shingle when tapped. The active sign lights up
// in lagoon (white print); every inactive sign shares one deep-palm ink color
// (per the nav rule). Icons are the shared Ionicons set.

const CORD_H = 16
const SIGN_H = 50
const GROUP_H = CORD_H + SIGN_H // pivot offset = GROUP_H / 2 → swings from the top (the cord knot)
const SIGN_W = 62

// Full-width bamboo cane: tan gradient, a sheen line, and evenly-spaced dark
// node bands so it reads as a real pole. Spans the whole device width.
function BambooCane() {
  return (
    <View pointerEvents="none" style={{ height: 22, ...softShadow(6) }}>
      <LinearGradient
        colors={[BAMBOO_LT, BAMBOO, BAMBOO_DK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.45)', borderBottomWidth: 2, borderBottomColor: 'rgba(0,0,0,0.22)' }}
      >
        <View style={{ position: 'absolute', top: 4, left: 0, right: 0, height: 2.5, backgroundColor: 'rgba(255,255,255,0.35)' }} />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <View key={i} style={{ width: 3, height: 22, backgroundColor: '#7C5A2C', opacity: 0.5 }} />
          ))}
        </View>
      </LinearGradient>
    </View>
  )
}

function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

// One hanging signboard. Owns its own swing value so a tap (or becoming the
// active tab) sends it into a damped pendulum swing pinned at the cord knot.
function HangingSign({
  focused,
  label,
  renderIcon,
  onPress,
  tokens,
}: {
  focused: boolean
  label: string
  renderIcon: (color: string) => React.ReactNode
  onPress: () => void
  tokens: { fontBody: string }
}) {
  const swing = useRef(new Animated.Value(0)).current

  const doSwing = () => {
    swing.setValue(1)
    Animated.spring(swing, { toValue: 0, friction: 3.5, tension: 55, useNativeDriver: true }).start()
  }

  // Swing whenever this tab becomes the selected one (programmatic or tap).
  useEffect(() => {
    if (focused) doSwing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused])

  const rotate = swing.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-9deg', '0deg', '11deg'] })
  // Plain wood plank — no outline. Selected just darkens the timber.
  const woodColors: readonly [string, string] = focused ? ['#5A3A1E', '#3A2410'] : ['#9C6B3D', '#6E4423']
  const ink = '#FFF3DC'

  return (
    <Pressable
      onPress={() => {
        doSwing()
        onPress()
      }}
      hitSlop={6}
      style={{ flex: 1, alignItems: 'center' }}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          // Pivot the swing at the top (the cord knot on the bamboo): shift up by
          // half the group height, rotate, shift back.
          transform: [{ translateY: -GROUP_H / 2 }, { rotateZ: rotate }, { translateY: GROUP_H / 2 }],
        }}
      >
        {/* knot + V-cords from the bamboo down to the sign's top corners */}
        <Svg width={SIGN_W} height={CORD_H} style={{ marginBottom: -2 }}>
          <Line x1={SIGN_W / 2} y1={1} x2={9} y2={CORD_H} stroke={WOOD} strokeWidth={2.5} />
          <Line x1={SIGN_W / 2} y1={1} x2={SIGN_W - 9} y2={CORD_H} stroke={WOOD} strokeWidth={2.5} />
          <Circle cx={SIGN_W / 2} cy={2.5} r={3.2} fill={BAMBOO_DK} />
        </Svg>

        {/* the wooden signboard — a plain plank, no outline; the shadow lives on
            the outer wrapper so the clipped grain/sheen don't eat it. */}
        <View style={{ borderRadius: 12, ...softShadow(focused ? 6 : 4) }}>
          <LinearGradient
            colors={woodColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ width: SIGN_W, minHeight: SIGN_H, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, overflow: 'hidden' }}
          >
            {/* wood grain + top sheen */}
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <View style={{ position: 'absolute', left: 6, right: 6, top: '32%', height: 1, backgroundColor: 'rgba(0,0,0,0.16)' }} />
              <View style={{ position: 'absolute', left: 6, right: 6, top: '58%', height: 1, backgroundColor: 'rgba(0,0,0,0.16)' }} />
              <View style={{ position: 'absolute', left: 6, right: 6, top: '80%', height: 1, backgroundColor: 'rgba(0,0,0,0.16)' }} />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '42%', backgroundColor: 'rgba(255,255,255,0.1)' }} />
            </View>
            {/* rope holes punched in the top corners */}
            <View style={{ position: 'absolute', top: 4, left: 8, width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.32)' }} />
            <View style={{ position: 'absolute', top: 4, right: 8, width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.32)' }} />
            {renderIcon(ink)}
            <Text numberOfLines={1} style={{ marginTop: 3, color: ink, fontFamily: tokens.fontBody, fontSize: 10, letterSpacing: 0.2 }}>
              {label}
            </Text>
          </LinearGradient>
        </View>
      </Animated.View>
    </Pressable>
  )
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      {/* full-width bamboo cane — anchored edge to edge, not floating */}
      <BambooCane />

      {/* the hanging signs, dangling beneath the cane */}
      <View pointerEvents="box-none" style={{ flexDirection: 'row', paddingHorizontal: 6, paddingBottom: Math.max(insets.bottom, 8) + 4 }}>
        {state.routes.map((route, i) => {
          const Icon: TabIconComponent | undefined = TAB_ICONS[route.name]
          const options = descriptors[route.key]?.options
          const overrideIcon = options?.tabBarIcon as
            | ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode)
            | undefined
          const label = route.name === 'Stage' ? stageLabel : route.name
          const focused = state.index === i

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
          }

          const renderIcon = (color: string) =>
            overrideIcon ? overrideIcon({ color, size: 22, focused }) : Icon ? <Icon color={color} /> : null

          return (
            <HangingSign
              key={route.key}
              focused={focused}
              label={label}
              renderIcon={renderIcon}
              onPress={onPress}
              tokens={{ fontBody: tokens.fontBody }}
            />
          )
        })}
      </View>
    </View>
  )
}
