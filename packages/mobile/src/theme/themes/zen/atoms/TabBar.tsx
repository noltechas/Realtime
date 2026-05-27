import React from 'react'
import { View, Pressable, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { G, Ellipse, Circle } from 'react-native-svg'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useTheme } from '../../../ThemeContext'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import { TAB_ICONS } from '../../../../navigation/TabIcons'

function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

// Zen tab bar — minimal and symmetric:
//   • Solid pink sakura blossom centered above every tab (single fill, no
//     outlines, identical on every tab).
//   • Icon below the blossom — gold/yellow when selected, soft tan when not.
//   • No text, no dots, no dividers, no underline. The yellow icon is the
//     only state change; everything else stays still.
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()

  return (
    <View
      style={{
        backgroundColor: tokens.tabBarBg,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
      }}
    >
      {state.routes.map((route, i) => {
        const Icon = TAB_ICONS[route.name]
        const options = descriptors[route.key]?.options
        const overrideIcon = options?.tabBarIcon as
          | ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode)
          | undefined
        const focused = state.index === i
        const baseLabel = route.name === 'Stage' ? stageLabel : route.name

        return (
          <ZenTab
            key={route.key}
            routeName={route.name}
            label={baseLabel}
            focused={focused}
            Icon={overrideIcon || Icon}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name)
              }
            }}
            onLongPress={() => {
              navigation.emit({ type: 'tabLongPress', target: route.key })
            }}
          />
        )
      })}
    </View>
  )
}

function ZenTab({
  routeName,
  label,
  focused,
  Icon,
  onPress,
  onLongPress,
}: {
  routeName: string
  label: string
  focused: boolean
  Icon: any
  onPress: () => void
  onLongPress: () => void
}) {
  const { tokens } = useTheme()
  // Active = bright yellow; inactive = muted tan from the theme tokens.
  const iconColor = focused ? '#FFD700' : tokens.tabBarFg
  const iconSize = routeName === 'Stage' ? 24 : 20

  const anim = React.useRef(new Animated.Value(focused ? 1 : 0)).current

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start()
  }, [focused, anim])

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
        paddingVertical: 4,
      })}
    >
      <Animated.View
        style={{
          position: 'absolute',
          opacity: anim,
          transform: [
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }
          ],
        }}
      >
        <PinkBlossom />
      </Animated.View>
      <View
        style={{
          width: 30,
          height: 30,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {Icon ? (
          typeof Icon === 'function' && Icon.name === ''
            ? Icon({ color: iconColor, size: iconSize, focused })
            : <Icon color={iconColor} size={iconSize} />
        ) : null}
      </View>
    </Pressable>
  )
}

// Single-color pink sakura. No outlines, no center dot, no second tint.
// Petals overlap by sharing the same solid fill so the silhouette reads as
// one shape.
function PinkBlossom() {
  return (
    <Svg width={46} height={46} viewBox="0 0 20 20">
      <G transform="translate(10 10)">
        {[0, 72, 144, 216, 288].map((a) => (
          <G key={a} transform={`rotate(${a})`}>
            <Ellipse cx={0} cy={-4.5} rx={3.2} ry={4.5} fill="#F4B6C2" />
          </G>
        ))}
        <Circle cx={0} cy={0} r={1.6} fill="#F4B6C2" />
      </G>
    </Svg>
  )
}
