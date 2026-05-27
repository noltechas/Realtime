import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Pressable, Animated, StyleSheet } from 'react-native'
import Svg, { Polygon } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS } from '../../../../navigation/TabIcons'
import { useTheme } from '../../../ThemeContext'
import { useLinearLoop } from '../_shared'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'

// Retrowave TabBar — the bar's background is now an INFINITELY SCROLLING
// VERTICAL STACK of solid black horizontal slats (echoes the slatted-sun
// pattern from the backdrop). The slats are opaque black bars with widths
// that grow toward the bottom of the stack, just like the sun's slats grow
// toward the disc's bottom edge. The entire stack translates upward on a
// continuous linear loop; because the stack is doubled vertically, the
// scroll wraps invisibly.
//
// On top of the slats:
//   • Tab cells (icon + italic label)
//   • A small magenta chevron pinned just above the active icon, sliding
//     between cells on a spring
//
// No scanner strip. No dashed neon connectors. The visual identity here is
// "moving venetian-blind slats" — exactly like the sun, rotated 90° in
// motion direction.

const BAR_HEIGHT = 76
const BAR_BORDER_WIDTH = 1.5

function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

// ── Slat-stack layout ───────────────────────────────────────────────────────
// One full cycle of slats — heights and gaps echo the sun's progression.
// In the sun, slats lived at viewBox y ∈ [55..97] with heights 1.2 → 6.2,
// each ~1.55× thicker than the one above. We scale that up to live across
// the entire bar height. STACK_HEIGHT is the unit translateY covers per
// loop — translating the doubled stack upward by exactly STACK_HEIGHT
// loops seamlessly.
const SLATS: ReadonlyArray<{ y: number; h: number }> = [
  { y: 4, h: 1.2 },
  { y: 14, h: 1.8 },
  { y: 28, h: 2.6 },
  { y: 46, h: 4.0 },
  { y: 68, h: 6.2 },
]
const STACK_HEIGHT = 86 // height of one full slat cycle before it repeats

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()
  const [trackWidth, setTrackWidth] = useState(0)

  const tabCount = state.routes.length
  // `trackWidth` from onLayout is the bar's BORDER BOX width (includes the
  // 1.5px border on each side). RN positions absolute children relative to
  // the parent's content (padding) box, so the cells container actually
  // spans `trackWidth - 2 * BAR_BORDER_WIDTH`. Without this subtraction the
  // chevron drifts ~0.6px per tab to the right (3px / 5 tabs), which is
  // exactly the "chevron is off-center, too far right" effect.
  const innerWidth = trackWidth > 0 ? trackWidth - 2 * BAR_BORDER_WIDTH : 0
  const tabWidth = tabCount > 0 ? innerWidth / tabCount : 0
  const activeIndex = state.index

  const chevronX = useRef(new Animated.Value(0)).current

  // Slats scroll UPWARD continuously on a 5s loop. Translating from 0 to
  // -STACK_HEIGHT covers exactly one cycle — the doubled stack means the
  // wrap is invisible.
  const slatScroll = useLinearLoop(5000)
  const slatY = slatScroll.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -STACK_HEIGHT],
  })

  useEffect(() => {
    if (tabWidth <= 0) return
    const center = tabWidth * (activeIndex + 0.5)
    Animated.spring(chevronX, {
      toValue: center,
      tension: 130,
      friction: 12,
      useNativeDriver: true,
    }).start()
  }, [activeIndex, tabWidth, chevronX])

  useEffect(() => {
    if (tabWidth <= 0) return
    chevronX.setValue(tabWidth * (activeIndex + 0.5))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabWidth > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compose a SINGLE "stack cycle" once and render it twice in the
  // animated container (stack + stack copy, vertically stacked). This is
  // memoized so React doesn't rebuild the slat list on every render.
  const stackBody = useMemo(
    () => (
      <>
        {SLATS.map((s, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: s.y,
              left: 0,
              right: 0,
              height: s.h,
              backgroundColor: '#000000',
            }}
          />
        ))}
      </>
    ),
    [],
  )

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
        <View
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          style={{
            height: BAR_HEIGHT,
            // 70% opacity — the video backdrop is still faintly visible
            // through the bar, but the indigo body dominates so the icons
            // and labels stay clearly readable. Black slats sit fully
            // opaque on top.
            backgroundColor: 'rgba(14,5,38,0.70)',
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: '#FF2D95',
            shadowColor: '#FF2D95',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 14,
            elevation: 14,
          }}
        >
          {/* ── SCROLLING VERTICAL SLAT STACK (background) ── */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: STACK_HEIGHT * 2,
              transform: [{ translateY: slatY }],
            }}
          >
            {/* Stack copy 1 */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: STACK_HEIGHT }}>
              {stackBody}
            </View>
            {/* Stack copy 2 — directly below copy 1, so when the stack
                translates by -STACK_HEIGHT, copy 2 takes copy 1's place
                without a visible seam. */}
            <View
              style={{
                position: 'absolute',
                top: STACK_HEIGHT,
                left: 0,
                right: 0,
                height: STACK_HEIGHT,
              }}
            >
              {stackBody}
            </View>
          </Animated.View>

          {/* ── TAB CELLS ── */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              flexDirection: 'row',
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
                <RetroTab
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

          {/* ── CHEVRON SELECTOR ──
              Pinned near the bar's top edge — high enough that it reads as
              "marker for the column below" rather than "label attached to
              the icon". The horizontal centering math accounts for the
              border-width inset (see innerWidth above) so the chevron sits
              EXACTLY above the active icon's center. */}
          {trackWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 4,
                left: -8,
                width: 16,
                height: 8,
                transform: [{ translateX: chevronX }],
              }}
            >
              <View
                style={{
                  shadowColor: '#FF2D95',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 6,
                }}
              >
                <Svg width={16} height={8} viewBox="0 0 16 8">
                  <Polygon points="0,0 16,0 8,8" fill="#FF2D95" />
                </Svg>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

// ── RetroTab ────────────────────────────────────────────────────────────────
function RetroTab({
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
  const iconColor = focused ? '#FFFFFF' : '#7A5FA8'
  const labelColor = focused ? '#FFFFFF' : '#7A5FA8'

  const pop = useRef(new Animated.Value(focused ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(pop, {
      toValue: focused ? 1 : 0,
      tension: 180,
      friction: 12,
      useNativeDriver: true,
    }).start()
  }, [focused, pop])
  const popScale = pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })

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
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: popScale }],
        }}
      >
        <View
          style={
            focused
              ? {
                  shadowColor: '#FF2D95',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 7,
                }
              : null
          }
        >
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
            fontFamily: tokens.fontBody,
            fontSize: 10,
            letterSpacing: focused ? 2 : 1.4,
            textTransform: 'uppercase',
            fontStyle: 'italic',
            fontWeight: '700',
            opacity: focused ? 1 : 0.9,
            textShadowColor: focused ? 'rgba(255,45,149,0.9)' : 'transparent',
            textShadowRadius: focused ? 6 : 0,
            textShadowOffset: { width: 0, height: 0 },
          }}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  )
}
