import React, { useEffect, useRef, useState } from 'react'
import { View, Pressable, Animated, StyleSheet } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS } from '../../../../navigation/TabIcons'
import { useTheme } from '../../../ThemeContext'
import { useLinearLoop, useOscillator } from '../_shared'
import { Gear, Rivet } from '../Gear'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'

function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

// Steampunk TabBar — a riveted brass console panel with a sliding pressure
// gauge marker:
//   1. Coal-walnut base, double brass rim, four corner rivets, plus eight
//      smaller rivets along the top/bottom seams.
//   2. A brass active-tab indicator: a polished brass plate (gradient fill
//      + brushed-sheen overlay) that springs to the active tab's center
//      with a spring transition.
//   3. Two large rotating cogs nestled in the bar's left + right ends, peeking
//      out from behind the rim — the entire panel reads as part of a
//      working machine.
//   4. An amber gas-lamp filament glow runs along the top edge, breathing
//      on a slow oscillator.

const PILL_WIDTH_PAD = 8 // breathing room beside icons
const BAR_HEIGHT = 70

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()
  const [trackWidth, setTrackWidth] = useState(0)

  const tabCount = state.routes.length
  const tabWidth = trackWidth > 0 ? trackWidth / tabCount : 0
  const activeIndex = state.index

  const pillX = useRef(new Animated.Value(0)).current

  // Filament breath along the top edge.
  const filament = useOscillator(4200)
  const filamentOpacity = filament.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  })

  // End-cap gears
  const gearL = useLinearLoop(18000)
  const gearR = useLinearLoop(24000)
  const gearLRot = gearL.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const gearRRot = gearR.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] })

  useEffect(() => {
    if (tabWidth <= 0) return
    const center = tabWidth * (activeIndex + 0.5)
    Animated.spring(pillX, {
      toValue: center,
      tension: 90,
      friction: 11,
      useNativeDriver: true,
    }).start()
  }, [activeIndex, tabWidth, pillX])

  useEffect(() => {
    if (tabWidth <= 0) return
    const center = tabWidth * (activeIndex + 0.5)
    pillX.setValue(center)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabWidth > 0]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <View style={{ position: 'relative', overflow: 'visible' }}>
        {/* Bar shell */}
        <View
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          style={{
            height: BAR_HEIGHT,
            backgroundColor: '#1F1108',
            borderRadius: 10,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: '#B8762D',
            shadowColor: '#E8A93B',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.55,
            shadowRadius: 14,
            elevation: 12,
          }}
        >
          {/* Warm interior gas-lamp tint */}
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(232,169,59,0.10)',
              'rgba(184,118,45,0.04)',
              'rgba(58,30,8,0.18)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Filament glow stripe along the top edge */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 1,
              left: 0,
              right: 0,
              height: 2,
              opacity: filamentOpacity,
            }}
          >
            <LinearGradient
              colors={[
                'rgba(232,169,59,0)',
                'rgba(255,228,160,0.95)',
                'rgba(232,169,59,0.9)',
                'rgba(255,228,160,0.95)',
                'rgba(232,169,59,0)',
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: '100%', height: '100%' }}
            />
          </Animated.View>

          {/* Big end-cap gears peeking out of the rim */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: -22,
              top: BAR_HEIGHT / 2 - 24,
              width: 48,
              height: 48,
              opacity: 0.6,
              transform: [{ rotate: gearLRot }],
            }}
          >
            <Gear
              size={48}
              teeth={12}
              bodyColor="#C97D3E"
              edgeColor="#6E3A14"
              hubColor="#3A1E0A"
              highlightColor="#F0A058"
            />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: -22,
              top: BAR_HEIGHT / 2 - 24,
              width: 48,
              height: 48,
              opacity: 0.6,
              transform: [{ rotate: gearRRot }],
            }}
          >
            <Gear
              size={48}
              teeth={12}
              bodyColor="#5C8A7A"
              edgeColor="#2E4640"
              hubColor="#1A2820"
              highlightColor="#8AB5A0"
            />
          </Animated.View>

          {/* BlurView */}
          <BlurView
            pointerEvents="none"
            intensity={14}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />

          {/* Active brass plate marker */}
          {trackWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: tabWidth - PILL_WIDTH_PAD,
                height: BAR_HEIGHT - 14,
                left: -(tabWidth - PILL_WIDTH_PAD) / 2,
                top: 7,
                transform: [{ translateX: pillX }],
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 6,
                  overflow: 'hidden',
                  borderWidth: 1.5,
                  borderColor: '#E8A93B',
                  shadowColor: '#E8A93B',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 10,
                }}
              >
                <LinearGradient
                  colors={['#E8C078', '#B8762D', '#7A4D1A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  locations={[0, 0.5, 1]}
                  style={StyleSheet.absoluteFill}
                />
                {/* Brushed-metal sheen across the middle */}
                <View
                  style={{
                    position: 'absolute',
                    top: '38%',
                    left: 0,
                    right: 0,
                    height: 2,
                    opacity: 0.6,
                  }}
                >
                  <LinearGradient
                    colors={['rgba(255,235,180,0)', 'rgba(255,235,180,0.95)', 'rgba(255,235,180,0)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ width: '100%', height: '100%' }}
                  />
                </View>
                {/* Tiny rivets at the pill's corners */}
                <View style={{ position: 'absolute', top: 3, left: 3 }}>
                  <Rivet size={6} />
                </View>
                <View style={{ position: 'absolute', top: 3, right: 3 }}>
                  <Rivet size={6} />
                </View>
                <View style={{ position: 'absolute', bottom: 3, left: 3 }}>
                  <Rivet size={6} />
                </View>
                <View style={{ position: 'absolute', bottom: 3, right: 3 }}>
                  <Rivet size={6} />
                </View>
              </View>
            </Animated.View>
          ) : null}

          {/* Outer corner rivets — 4 big rivets at bar corners */}
          <View style={{ position: 'absolute', top: 4, left: 4 }}><Rivet size={9} /></View>
          <View style={{ position: 'absolute', top: 4, right: 4 }}><Rivet size={9} /></View>
          <View style={{ position: 'absolute', bottom: 4, left: 4 }}><Rivet size={9} /></View>
          <View style={{ position: 'absolute', bottom: 4, right: 4 }}><Rivet size={9} /></View>

          {/* Tab cells */}
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
                <SteamTab
                  key={route.key}
                  label={baseLabel}
                  focused={focused}
                  Icon={Icon}
                  overrideIcon={overrideIcon}
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
    </View>
  )
}

function SteamTab({
  label,
  focused,
  Icon,
  overrideIcon,
  onPress,
  onLongPress,
}: {
  label: string
  focused: boolean
  Icon: ((p: { color: string; size?: number }) => React.ReactElement) | undefined
  overrideIcon:
    | ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode)
    | undefined
  onPress: () => void
  onLongPress: () => void
}) {
  const { tokens } = useTheme()
  const iconColor = focused ? '#1F1108' : tokens.tabBarFg
  const labelColor = focused ? '#1F1108' : tokens.tabBarFg

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
      }}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <View>
          {overrideIcon
            ? overrideIcon({ color: iconColor, size: 22, focused })
            : Icon
              ? Icon({ color: iconColor, size: 22 })
              : null}
        </View>
        <Animated.Text
          style={{
            marginTop: 3,
            color: labelColor,
            fontFamily: tokens.fontDisplay,
            fontSize: 10,
            letterSpacing: focused ? 2 : 1.4,
            textTransform: 'uppercase',
            fontWeight: focused ? '700' : '500',
            opacity: focused ? 1 : 0.85,
            textShadowColor: focused ? 'rgba(255,235,180,0.6)' : 'transparent',
            textShadowRadius: focused ? 3 : 0,
            textShadowOffset: { width: 0, height: 1 },
          }}
        >
          {label}
        </Animated.Text>
      </View>
    </Pressable>
  )
}
