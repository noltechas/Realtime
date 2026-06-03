import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Polygon, Path, Rect, Ellipse, Circle, Defs, Pattern, ClipPath } from 'react-native-svg'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useTheme } from '../../../ThemeContext'
import { TAB_ICONS, type TabIconComponent } from '../../../../navigation/TabIcons'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import { INK, PANEL, RED, YELLOW, BLUE, Halftone } from './_comic'

// Comic-Book tab bar — a short, white comic-panel capsule printed with a faint
// Ben-Day halftone. Each tab owns a halftone-filled pop-art shape (starburst /
// speech bubble / BOOM / star / thought bubble) that, when active, blows up
// LARGE and pops up over the top edge of the bar with just the icon (no label).
// Icons are the shared Ionicons set (never custom nav SVG).

type ShapeKind = 'burst' | 'bubble' | 'boom' | 'star' | 'thought' | 'banner'

const TAB_SHAPE: Record<string, { kind: ShapeKind; fill: string; fg: string }> = {
  Songs:   { kind: 'burst',   fill: YELLOW, fg: INK },
  Queue:   { kind: 'bubble',  fill: PANEL,  fg: INK },
  Stage:   { kind: 'boom',    fill: RED,    fg: PANEL },
  Awards:  { kind: 'star',    fill: BLUE,   fg: INK },
  Profile: { kind: 'thought', fill: PANEL,  fg: INK },
  Home:    { kind: 'banner',  fill: RED,    fg: PANEL },
}
const DEFAULT_SHAPE = { kind: 'burst' as ShapeKind, fill: RED, fg: PANEL }

// ── Square (100×100) shape geometry so dots & strokes never distort ──────────
function squarePoints(count: number, oR: number, iR: number, jitter: number[] = []): string {
  const c = 50
  const rot = -Math.PI / 2
  const pts: string[] = []
  for (let i = 0; i < count * 2; i++) {
    const ang = rot + (Math.PI * i) / count
    const outer = i % 2 === 0
    const r = (outer ? oR : iR) * (outer && jitter.length ? jitter[i % jitter.length] : 1)
    pts.push(`${(c + Math.cos(ang) * r).toFixed(1)},${(c + Math.sin(ang) * r).toFixed(1)}`)
  }
  return pts.join(' ')
}
const PTS = {
  burst: squarePoints(12, 47, 26),
  star: squarePoints(5, 48, 20),
  boom: squarePoints(10, 49, 24, [1, 0.74, 1.06, 0.82, 1, 0.78, 1.04, 0.8, 1, 0.76]),
}

// Speech bubble as ONE continuous path — a rounded-rect body whose bottom edge
// juts out into the tail, so there's no internal seam where a separate triangle
// would cross the body's outline. Body centered (~46) so the active icon sits
// inside it; tail points down-left.
const BUBBLE_PATH =
  'M30 20 L70 20 Q86 20 86 36 L86 56 Q86 72 70 72 L52 72 L32 97 L40 72 L30 72 Q14 72 14 56 L14 36 Q14 20 30 20 Z'

function shapeNodes(kind: ShapeKind, fill: string, stroke?: string, sw = 4) {
  const p = stroke !== undefined
    ? { fill, stroke, strokeWidth: sw, strokeLinejoin: 'round' as const }
    : { fill }
  switch (kind) {
    case 'burst': return <Polygon points={PTS.burst} {...p} />
    case 'star': return <Polygon points={PTS.star} {...p} />
    case 'boom': return <Polygon points={PTS.boom} {...p} />
    case 'banner':
      return <Polygon points="8,26 92,26 82,50 92,74 8,74 18,50" {...p} />
    case 'bubble':
      return <Path d={BUBBLE_PATH} {...p} />
    case 'thought':
      // Main puff + two trailing puffs, kept clear of the ellipse so no stroke
      // seam shows where they'd otherwise overlap.
      return (
        <>
          <Ellipse cx={50} cy={44} rx={40} ry={26} {...p} />
          <Circle cx={30} cy={80} r={7} {...p} />
          <Circle cx={18} cy={92} r={4} {...p} />
        </>
      )
  }
}

function TabShape({ kind, fill, size, idx }: { kind: ShapeKind; fill: string; size: number; idx: number }) {
  const dotId = `cbtd${idx}`
  const clipId = `cbtc${idx}`
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <Defs>
        <Pattern id={dotId} width={12} height={12} patternUnits="userSpaceOnUse">
          <Circle cx={6} cy={6} r={1.9} fill={INK} fillOpacity={0.22} />
        </Pattern>
        <ClipPath id={clipId}>{shapeNodes(kind, '#000')}</ClipPath>
      </Defs>
      {shapeNodes(kind, fill, INK, 4)}
      <Rect x={0} y={0} width={100} height={100} fill={`url(#${dotId})`} clipPath={`url(#${clipId})`} />
    </Svg>
  )
}

function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

// Inactive tabs show icon + label (the group sits centred). The active tab hides
// its label and centres just the icon in the cell, so the icon drops to the
// bar's vertical centre. The big pop-art badge is centred on the cell too, so it
// straddles the bar (spilling past the top AND bottom outlines like a sticker).
const CELL_H = 44
const BADGE = 78

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()

  const indicator = useRef(new Animated.Value(state.index)).current
  useEffect(() => {
    Animated.spring(indicator, {
      toValue: state.index,
      useNativeDriver: true,
      damping: 14,
      stiffness: 220,
      mass: 1,
    }).start()
  }, [state.index, indicator])

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 24,
        right: 24,
        bottom: Math.max(insets.bottom + 2, 12),
        shadowColor: INK,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 8,
      }}
    >
      {/* Capsule — white comic panel with a faint halftone print */}
      <View style={{ borderRadius: 28, borderWidth: 3, borderColor: tokens.tabBarBorder, backgroundColor: PANEL }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, overflow: 'hidden' }}>
          <Halftone color={INK} opacity={0.06} dot={2} gap={9} />
        </View>

        <View style={{ paddingHorizontal: 6, paddingVertical: 8, flexDirection: 'row' }}>
          {state.routes.map((route, i) => {
            const Icon: TabIconComponent | undefined = TAB_ICONS[route.name]
            const options = descriptors[route.key]?.options
            const overrideIcon = options?.tabBarIcon as
              | ((p: { color: string; size?: number; focused: boolean }) => React.ReactNode)
              | undefined
            const label = route.name === 'Stage' ? stageLabel : route.name
            const shape = TAB_SHAPE[route.name] ?? DEFAULT_SHAPE
            const focused = state.index === i

            const activeOpacity = indicator.interpolate({
              inputRange: [i - 1, i, i + 1],
              outputRange: [0, 1, 0],
              extrapolate: 'clamp',
            })
            const inactiveOpacity = indicator.interpolate({
              inputRange: [i - 1, i, i + 1],
              outputRange: [1, 0, 1],
              extrapolate: 'clamp',
            })
            const shapeScale = indicator.interpolate({
              inputRange: [i - 0.6, i, i + 0.6],
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            })

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
            }
            const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key })

            const renderIcon = (color: string) =>
              overrideIcon
                ? overrideIcon({ color, size: 22, focused })
                : Icon
                ? <Icon color={color} />
                : null

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                hitSlop={8}
                // Active cell floats above its neighbours so the oversized badge
                // can spill over the bar edge + adjacent cells cleanly.
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: focused ? 2 : 1 }}
              >
                <View style={{ width: 54, height: CELL_H, alignItems: 'center', justifyContent: 'center' }}>
                  {/* Active pop-art badge — centred on the whole cell (so it sits
                      vertically centred on the bar and straddles both outlines),
                      BEHIND the icon. */}
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: activeOpacity,
                      transform: [{ scale: shapeScale }],
                    }}
                  >
                    <View style={{ width: BADGE, height: BADGE }}>
                      <TabShape kind={shape.kind} fill={shape.fill} size={BADGE} idx={i} />
                    </View>
                  </Animated.View>

                  {/* Inactive: icon + label, group centred in the cell. */}
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: inactiveOpacity,
                    }}
                  >
                    {renderIcon(tokens.tabBarFg)}
                    <Text
                      numberOfLines={1}
                      style={{
                        marginTop: 3,
                        color: tokens.tabBarFg,
                        fontFamily: tokens.fontDisplay,
                        fontSize: 10,
                        letterSpacing: 0.3,
                        textTransform: 'uppercase',
                      }}
                    >
                      {label}
                    </Text>
                  </Animated.View>

                  {/* Active: just the icon, centred vertically in the cell (drops
                      down into the space the hidden label leaves), atop the badge. */}
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: activeOpacity,
                    }}
                  >
                    {renderIcon(shape.fg)}
                  </Animated.View>
                </View>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}
