import React from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg from 'react-native-svg'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS, type TabIconComponent } from '../../../../navigation/TabIcons'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import {
  BambooRail,
  CREAM,
  LAGOON,
  RopeKnot,
  RopeSeg,
  Timber,
  glow,
  lift,
  sans,
  useSwing,
} from './_tropical'

// Tropical tab bar — a real bamboo cane lashed edge-to-edge with five carved
// wooden signs hanging beneath it on twisted V-ropes. The signs are alive: each
// one idles in a tiny out-of-phase sway (nothing on a rope hangs perfectly
// still), tapping one kicks it into a damped pendulum swing from its knot, and
// the active sign is a lagoon-PAINTED plank — you can still see the grain
// through the paint — with cream lettering and a warm glow. Inactive signs stay
// raw teak with one shared cream ink (house rule). Glyphs are the shared
// Ionicons set.

const CORD_H = 17
const SIGN_W = 62
const SIGN_H = 52
const GROUP_H = CORD_H + SIGN_H

function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

function HangingSign({
  focused,
  label,
  index,
  renderIcon,
  onPress,
}: {
  focused: boolean
  label: string
  index: number
  renderIcon: (color: string) => React.ReactNode
  onPress: () => void
}) {
  const { transform, kick } = useSwing(GROUP_H / 2, 1.15, index)
  const focusedRef = React.useRef(focused)

  // Kick when this tab becomes active (tap OR programmatic nav).
  React.useEffect(() => {
    if (focused && !focusedRef.current) kick(1)
    focusedRef.current = focused
  }, [focused, kick])

  return (
    <Pressable
      onPress={() => {
        kick(1)
        onPress()
      }}
      hitSlop={6}
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center' }}
    >
      <Animated.View style={{ alignItems: 'center', transform }}>
        {/* knot + twisted V-cords from the cane to the sign's corners */}
        <Svg width={SIGN_W} height={CORD_H} style={{ marginBottom: -1.5 }}>
          <RopeSeg x1={SIGN_W / 2} y1={1.5} x2={10} y2={CORD_H} width={2.6} />
          <RopeSeg x1={SIGN_W / 2} y1={1.5} x2={SIGN_W - 10} y2={CORD_H} width={2.6} />
          <RopeKnot cx={SIGN_W / 2} cy={3} r={3.4} />
        </Svg>

        <View style={[{ borderRadius: 13 }, focused ? glow('#FFB84D', 2) : lift(2)]}>
          <Timber
            radius={13}
            paint={focused ? LAGOON : undefined}
            seed={`tab-${label}`}
            groove
            knot={false}
            style={{ width: SIGN_W, height: SIGN_H, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ alignItems: 'center' }}>
              {renderIcon(focused ? '#FFFFFF' : CREAM)}
              <Text
                numberOfLines={1}
                style={[
                  sans(9.5, 'bold', focused ? '#FFFFFF' : CREAM),
                  {
                    marginTop: 2.5,
                    letterSpacing: 0.3,
                    textShadowColor: 'rgba(30,14,2,0.5)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 1,
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          </Timber>
        </View>
      </Animated.View>
    </Pressable>
  )
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const stageLabel = useStageLabel()

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      {/* the cane, spanning the full width with a real cylinder read */}
      <View style={lift(3)}>
        <BambooRail height={21} />
      </View>

      {/* the signs, dangling beneath it */}
      <View
        pointerEvents="box-none"
        style={{ flexDirection: 'row', paddingHorizontal: 4, paddingBottom: Math.max(insets.bottom, 8) + 2 }}
      >
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
            overrideIcon ? overrideIcon({ color, size: 21, focused }) : Icon ? <Icon color={color} size={21} /> : null

          return (
            <HangingSign
              key={route.key}
              focused={focused}
              label={label}
              index={i}
              renderIcon={renderIcon}
              onPress={onPress}
            />
          )
        })}
      </View>
    </View>
  )
}
