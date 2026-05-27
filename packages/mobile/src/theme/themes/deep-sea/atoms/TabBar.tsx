import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import Svg, { Path, Circle } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bubbleImg = require('../../../../../assets/bubble.png')

// Live label for the Stage tab. Returns 'Stage' when the local guest is
// matched to a singer on the now-playing track, 'React' otherwise.
function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

// ─── Realistic Bubble used inside this tab bar AND by other deep-sea atoms ──
// This is the same bubble PNG the backdrop uses, sized to act as a focus
// indicator behind the active tab. Exported so deep-sea atoms (Wizard role
// chip dot, etc.) can drop the same iconography into their own UI without
// having to know the asset path.
export function RealisticBubble({
  size = 52,
  color: _color,
}: {
  size?: number
  color?: string
}) {
  // `color` is accepted for API parity with the legacy WizardScreen call
  // site (it passes the singer's hex), but the PNG is intentionally drawn
  // un-tinted — RN's Image tintColor would also nuke the highlight gradient
  // that makes the bubble look 3D. Callers can wrap us in a colored ring
  // (e.g. `borderColor: singer.color`) if they need to associate the bubble
  // with a singer.
  return (
    <Image
      source={bubbleImg}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  )
}

// ─── Custom Deep Sea tab icons (rounded, fluid, bubbly) ─────────────────────
function DeepSeaHomeIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 10C3 10 12 2 12 2C12 2 21 10 21 10" />
      <Path d="M5 12V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V12" />
      <Path d="M9 22V14H15V22" />
    </Svg>
  )
}

function DeepSeaProfileIcon({ color, size = 20 }: { color: string; size?: number }) {
  return <Ionicons name="fish" size={size} color={color} />
}

function DeepSeaQueueIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 6H20" />
      <Path d="M8 12H20" />
      <Path d="M8 18H20" />
      <Circle cx="4" cy="6" r="1" fill={color} />
      <Circle cx="4" cy="12" r="1" fill={color} />
      <Circle cx="4" cy="18" r="1" fill={color} />
    </Svg>
  )
}

function DeepSeaSongsIcon({ color, size = 20 }: { color: string; size?: number }) {
  return <Ionicons name="musical-notes" size={Math.round(size * 1.05)} color={color} />
}

function DeepSeaAwardsIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  )
}

const DEEP_SEA_TAB_ICONS: Record<string, any> = {
  Home: DeepSeaHomeIcon,
  Profile: DeepSeaProfileIcon,
  Queue: DeepSeaQueueIcon,
  Songs: DeepSeaSongsIcon,
  Awards: DeepSeaAwardsIcon,
}

// ─── Floating capsule tab bar ───────────────────────────────────────────────
// A rounded navy capsule that floats above the safe-area bottom. The active
// tab gets a popping bubble indicator behind its icon (the same PNG used in
// the backdrop) and every tab's icon gently bobs.
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()
  const [trackWidth, setTrackWidth] = useState(0)

  const tabCount = state.routes.length
  const tabWidth = trackWidth > 0 ? trackWidth / tabCount : 0

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
          flexDirection: 'row',
          height: 68,
          backgroundColor: tokens.tabBarBg,
          borderRadius: 34,
          borderWidth: 1,
          borderColor: tokens.tabBarBorder,
          overflow: 'hidden',
        }}
      >
        {state.routes.map((route, i) => {
          const Icon = DEEP_SEA_TAB_ICONS[route.name]
          const options = descriptors[route.key]?.options
          const overrideIcon = options?.tabBarIcon as
            | ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode)
            | undefined
          const focused = state.index === i
          const baseLabel = route.name === 'Stage' ? stageLabel : route.name

          return (
            <DeepSeaTab
              key={route.key}
              label={baseLabel}
              focused={focused}
              Icon={overrideIcon || Icon}
              tokens={tokens}
              tabWidth={tabWidth}
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
  )
}

function DeepSeaTab({
  label,
  focused,
  Icon,
  tokens,
  tabWidth,
  onPress,
  onLongPress,
}: {
  label: string
  focused: boolean
  Icon: any
  tokens: any
  tabWidth: number
  onPress: () => void
  onLongPress: () => void
}) {
  const floatAnim = useRef(new Animated.Value(0)).current
  const popScale = useRef(new Animated.Value(focused ? 1 : 0)).current
  const popOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current
  const [wasFocused, setWasFocused] = useState(focused)

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    ).start()
  }, [floatAnim])

  useEffect(() => {
    if (focused && !wasFocused) {
      // Animate in — the bubble appears and springs to its resting size.
      popScale.setValue(0.5)
      popOpacity.setValue(0)
      Animated.parallel([
        Animated.spring(popScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(popOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start()
    } else if (!focused && wasFocused) {
      // Pop! — the bubble expands past its resting size while fading out.
      Animated.parallel([
        Animated.timing(popScale, { toValue: 1.8, duration: 250, useNativeDriver: true }),
        Animated.timing(popOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start()
    }
    setWasFocused(focused)
  }, [focused, wasFocused, popScale, popOpacity])

  // Suppress unused warning — tabWidth is passed in for layout calculations
  // in callers that want a centered indicator, but each tab cell stretches
  // with flex:1 so we don't need it here.
  void tabWidth

  const iconColor = focused ? '#FFFFFF' : tokens.tabBarFg
  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -3] })

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Realistic bubble indicator — only visible on the focused tab. */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 52,
          height: 52,
          opacity: popOpacity,
          transform: [{ scale: popScale }],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RealisticBubble size={52} />
      </Animated.View>

      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          transform: [{ translateY: floatY }],
        }}
      >
        {Icon ? (
          <View>
            {typeof Icon === 'function' && Icon.name === ''
              ? Icon({ color: iconColor, size: 22, focused })
              : <Icon color={iconColor} size={22} />}
          </View>
        ) : null}

        <View style={{ marginTop: 4 }}>
          <Text
            style={{
              color: iconColor,
              fontFamily: tokens.fontDisplay,
              fontSize: 10,
              fontWeight: 'bold',
            }}
          >
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  )
}
