import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import Svg, { Polygon, Path } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'

// Live label for the Stage tab. Returns 'STAGE' when the local guest is
// matched to a singer on the now-playing track, 'REACT' otherwise.
function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'STAGE' : 'REACT'
}

// Custom SVG Icons for Urban Theme — sharp, graffiti-stencil style. The
// nav-bar icons stay as custom SVGs (not Ionicons) because the rest of the
// urban theme uses jagged polygon strokes, and Ionicons rounded fills clash.
function UrbanHomeIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square">
      <Path d="M2 11L12 2L22 11" />
      <Path d="M4 12V22H9V15H15V22H20V12" />
    </Svg>
  )
}

function UrbanProfileIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square">
      <Polygon points="8,10 12,2 16,10 12,12" />
      <Path d="M3 22L7 14H17L21 22" />
    </Svg>
  )
}

function UrbanQueueIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square">
      <Path d="M4 6H22M2 12H18M6 18H20" />
    </Svg>
  )
}

function UrbanSongsIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square">
      <Path d="M9 18V5L21 2V13" />
      <Polygon points="4,18 9,15 9,21" fill={color} stroke="none" />
      <Polygon points="16,13 21,10 21,16" fill={color} stroke="none" />
    </Svg>
  )
}

function UrbanAwardsIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="square">
      <Path d="M3 8L8 12L12 3L16 12L21 8L18 20H6L3 8Z" />
    </Svg>
  )
}

const URBAN_TAB_ICONS: Record<string, (props: { color: string; size?: number }) => React.ReactElement> = {
  Home: UrbanHomeIcon,
  Profile: UrbanProfileIcon,
  Queue: UrbanQueueIcon,
  Songs: UrbanSongsIcon,
  Awards: UrbanAwardsIcon,
}

// Urban tab bar — a shattered/jagged-glass polygon spans the strip, anchored
// at the bottom of the screen. The active tab is highlighted by a skewed
// toxic-green polygon underlay that scales in on tab change. The label and
// icon ride on top of the underlay; inactive tabs are ash-grey and unframed.
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
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        {/* Jagged / shattered-glass background frame spanning the whole bar */}
        {trackWidth > 0 && (
          <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${trackWidth} 68`} preserveAspectRatio="none">
              <Polygon
                points={`0,4 ${trackWidth * 0.4},0 ${trackWidth},8 ${trackWidth * 0.98},68 4,64`}
                fill="rgba(15, 15, 15, 0.9)"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
              />
            </Svg>
          </View>
        )}

        {state.routes.map((route, i) => {
          const Icon = URBAN_TAB_ICONS[route.name]
          const options = descriptors[route.key]?.options
          const overrideIcon = options?.tabBarIcon as
            | ((p: { color: string; size?: number; focused?: boolean }) => React.ReactNode)
            | undefined
          const focused = state.index === i
          const baseLabel = route.name === 'Stage' ? stageLabel : route.name
          const label = baseLabel.toUpperCase()

          return (
            <UrbanTab
              key={route.key}
              label={label}
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

function UrbanTab({
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
  Icon: ((p: { color: string; size?: number; focused?: boolean }) => React.ReactNode) | undefined
  tokens: ReturnType<typeof useTheme>['tokens']
  tabWidth: number
  onPress: () => void
  onLongPress: () => void
}) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0)).current

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1 : 0,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start()
  }, [focused, scale])

  const bgColor = focused ? tokens.accentA : 'transparent'
  // In Urban theme, tokens.appBg is the dark color, tokens.black is #FFFFFF.
  const iconColor = focused ? tokens.appBg : tokens.muted

  // Active tab is painted with a skewed polygon underlay that scales in on
  // focus. The polygon mirrors the parallelogram motif used throughout the
  // theme.
  const activePolygon =
    tabWidth > 0 ? (
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: scale,
            transform: [
              {
                scale: scale.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.05] }),
              },
            ],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${tabWidth} 68`} preserveAspectRatio="none">
          <Polygon points={`4,4 ${tabWidth - 2},0 ${tabWidth},64 2,68`} fill={bgColor} />
        </Svg>
      </Animated.View>
    ) : null

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
      {activePolygon}

      <View style={{ alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        {Icon ? (
          <View style={{ opacity: focused ? 1 : 0.8 }}>
            {Icon({ color: iconColor, size: 22, focused })}
          </View>
        ) : null}

        <View style={{ marginTop: 4 }}>
          <Text
            style={{
              color: iconColor,
              fontFamily: tokens.fontDisplay,
              fontWeight: '900',
              fontSize: 11,
              letterSpacing: tokens.displayLetterSpacing,
              textTransform: tokens.displayUppercase ? 'uppercase' : 'none',
            }}
          >
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}
