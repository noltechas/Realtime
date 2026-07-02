import React, { useEffect, useRef, useState } from 'react'
import { View, Pressable, Animated, Text, StyleSheet } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS } from '../../../../navigation/TabIcons'
import { useTheme } from '../../../ThemeContext'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import {
  BRASS_FACE,
  BRASS_INK,
  CornerScrews,
  HAIRLINE,
  useOscillator,
} from './_steam'

function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

// Steampunk TabBar — the instrument console rail:
//   • A low iron rail with one brass hairline, four machined corner screws,
//     and a gas-lamp filament running along its top edge, breathing slowly.
//   • The active tab is a polished brass key that slides into place on a
//     spring — the ONE bright brass element in the chrome.
//   • Icons and Cinzel labels; all inactive tabs share the muted bronze
//     foreground, only the seated key goes engraved-dark.

const PILL_PAD = 10
const BAR_HEIGHT = 66

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()
  const [trackWidth, setTrackWidth] = useState(0)

  const tabCount = state.routes.length
  const tabWidth = trackWidth > 0 ? trackWidth / tabCount : 0
  const activeIndex = state.index

  const pillX = useRef(new Animated.Value(0)).current
  const positioned = useRef(false)

  // Filament breath along the top edge.
  const filament = useOscillator(5200)
  const filamentOpacity = filament.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] })

  useEffect(() => {
    if (tabWidth <= 0) return
    const center = tabWidth * (activeIndex + 0.5)
    // Snap into place the first time we have a measured width — otherwise the
    // spring animates the key in from the bar's left edge. Spring on later
    // tab changes only.
    if (!positioned.current) {
      positioned.current = true
      pillX.setValue(center)
      return
    }
    Animated.spring(pillX, {
      toValue: center,
      tension: 95,
      friction: 12,
      useNativeDriver: true,
    }).start()
  }, [activeIndex, tabWidth, pillX])

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 16,
      }}
    >
      <View
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        style={{
          height: BAR_HEIGHT,
          backgroundColor: 'rgba(18,12,7,0.9)',
          borderRadius: 14,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: HAIRLINE,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.55,
          shadowRadius: 14,
          elevation: 12,
        }}
      >
        <BlurView pointerEvents="none" intensity={22} tint="dark" style={StyleSheet.absoluteFill} />

        {/* faint interior warmth */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(232,169,59,0.06)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']}
          style={StyleSheet.absoluteFill}
        />

        {/* gas-lamp filament along the top edge */}
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 10, right: 10, height: 1, opacity: filamentOpacity }}
        >
          <LinearGradient
            colors={['rgba(232,169,59,0)', 'rgba(255,228,160,0.9)', 'rgba(232,169,59,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* sliding brass key */}
        {trackWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: tabWidth - PILL_PAD,
              height: BAR_HEIGHT - 12,
              left: -(tabWidth - PILL_PAD) / 2,
              top: 6,
              transform: [{ translateX: pillX }],
            }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: 9,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(46,30,8,0.9)',
                shadowColor: '#E8A93B',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.45,
                shadowRadius: 8,
              }}
            >
              <LinearGradient
                colors={BRASS_FACE}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* machined top edge */}
              <View
                style={{
                  position: 'absolute',
                  top: 1,
                  left: 5,
                  right: 5,
                  height: 1,
                  backgroundColor: 'rgba(255,245,220,0.55)',
                }}
              />
            </View>
          </Animated.View>
        ) : null}

        {/* corner screws */}
        <CornerScrews seed="tabbar" inset={5} size={6} />

        {/* tab cells */}
        <View style={{ flexDirection: 'row', flex: 1 }}>
          {state.routes.map((route, i) => {
            const Icon = TAB_ICONS[route.name]
            const options = descriptors[route.key]?.options
            const overrideIcon = options?.tabBarIcon as
              | ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode)
              | undefined
            const focused = state.index === i
            const baseLabel = route.name === 'Stage' ? stageLabel : route.name

            return (
              <ConsoleTab
                key={route.key}
                label={baseLabel}
                focused={focused}
                Icon={Icon}
                overrideIcon={overrideIcon}
                fontDisplay={tokens.fontDisplay}
                inactiveColor={tokens.tabBarFg}
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
      </View>
    </View>
  )
}

function ConsoleTab({
  label,
  focused,
  Icon,
  overrideIcon,
  fontDisplay,
  inactiveColor,
  onPress,
  onLongPress,
}: {
  label: string
  focused: boolean
  Icon: ((p: { color: string; size?: number }) => React.ReactElement) | undefined
  overrideIcon:
    | ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode)
    | undefined
  fontDisplay: string
  inactiveColor: string
  onPress: () => void
  onLongPress: () => void
}) {
  const color = focused ? BRASS_INK : inactiveColor

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <View>
          {overrideIcon
            ? overrideIcon({ color, size: 21, focused })
            : Icon
              ? Icon({ color, size: 21 })
              : null}
        </View>
        <Text
          style={{
            marginTop: 4,
            color,
            fontFamily: fontDisplay,
            fontSize: 9,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            opacity: focused ? 1 : 0.85,
            includeFontPadding: false,
            textShadowColor: focused ? 'rgba(255,245,220,0.4)' : 'transparent',
            textShadowRadius: 0,
            textShadowOffset: { width: 0, height: focused ? 1 : 0 },
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  )
}
