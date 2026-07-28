import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import Svg, {
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TAB_ICONS } from '../../../../navigation/TabIcons'
import { useTheme } from '../../../ThemeContext'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import { DYES, INK, TEXT_FAINT, phaseFor, swellPath, usePulse } from './_glass'

// ── The tab bar ─────────────────────────────────────────────────────────────
//
// A LIQUID MENISCUS. The bar is a full-bleed pool of dark glass at the bottom of
// the screen whose top surface SWELLS into a long, shallow wave beneath the active
// tab, with a bead of dye resting in the crest. Nothing here is a pill sliding in a
// track.
//
// ── The orb carries the active glyph, and it lives in the sliding layer ─────
// This is the important structural decision, and it took three tries to get right:
//
//   1. An orb inside each tab cell, with the cell's icon LIFTED onto it — the glyph
//      leapt ~40pt out of the bar and looked untethered.
//   2. The orb moved into the sliding layer as a bare marker, with the glyphs left in
//      place below it — aligned, but the orb then hovered ABOVE the icons instead of
//      marking one.
//   3. This: the orb sits in the sliding layer AND RENDERS THE ACTIVE TAB'S ICON in
//      ink inside itself, centred on exactly the y the cells put their glyphs at. The
//      active cell hides its own icon (opacity 0, so it still occupies its slot and
//      the labels stay aligned), and the orb takes over as that glyph's home.
//
// Because the orb is a sibling of the wave path inside the same translated layer, orb
// and crest are aligned BY CONSTRUCTION on any tab count and at any screen width.
//
// ── Nothing is allowed to look cut off ──────────────────────────────────────
//   1. The pool spans the full width AND runs to the true bottom of the screen; the
//      home-indicator inset is added to the pool's HEIGHT rather than used as padding
//      beneath it, so no video shows below the glass.
//   2. The wave is SYMMETRIC and much wider than one tab, and on the outer tabs its
//      shoulders deliberately RUN OFF the screen edge rather than being shortened. That
//      overrun is a considered trade, arrived at after building all three options: keeping
//      both shoulders on screen means either a wave only one tab wide (too small for the
//      orb it carries) or an asymmetric one with a 40pt shoulder on one side and a 92pt one
//      on the other (reads as broken). Letting the surface meet the screen edge mid-rise is
//      the least bad of the three, and at this span the slope there is gentle enough to
//      read as the liquid banking against the wall.
//   3. The SVG carries HALO of empty headroom above the crest, because the dye bloom
//      is centred on the crest and half of it sits above the surface — without the
//      headroom it was sliced off in a hard line right across the top of the hump.
//
// ── Why the wave slides instead of being redrawn ────────────────────────────
// The wave is baked into a canvas three screens wide, centred, then the whole layer
// is translated. Regenerating the path `d` per FRAME would mean building a string on
// the JS thread and writing a native prop every 16ms; translating a fixed path is a
// pure native-driver transform, so it glides as smoothly as any spring. The path is
// rebuilt only when the active tab changes (the spans depend on it), which is a
// discrete event and costs one string build.

// ── vertical geometry, all measured DOWN from the bar's top edge (the crest apex) ──
//
//   0                     crest apex
//   ORB_Y - ORB/2         top of the orb — must be below the apex, so the wave arcs over it
//   DOME                  the flat surface
//   ORB_Y                 orb centre == active glyph centre == every cell's glyph centre
//   ORB_Y + ORB/2         bottom of the orb — must clear the labels
//
// Every one of these is derived rather than separately eyeballed, because they trade off
// against each other and tuning them independently produces contradictions. The first
// attempt put the glyph row only 4pt under the surface and the meniscus line ran
// straight through the middle of all four inactive icons.
//
// The resolution is that the GLYPH ROW sits a clear ORB_SUBMERGE below the surface —
// where a line of icons belongs, inside the pool — while the ORB, being much taller than
// a glyph, still breaks the surface by (ORB/2 - ORB_SUBMERGE) even though it is centred
// on that row.

/**
 * Half-width of the wave, in tabs.
 *
 * Generous on purpose. The wave has to look comfortably larger than the orb resting in it,
 * and `swellPath`'s control points flatten the crest so only about two thirds of the span
 * reads as raised — a span of half a tab put a 50pt orb in a 54pt cradle, which looked
 * cramped. At 1.6 tabs the raised run is ~170pt.
 */
const SPAN_TABS = 1.6
/** How far the crest rises above the pool's surface. */
const DOME = 24
/**
 * How far the glyph row sits below the surface — i.e. how deep the pool is over the icons.
 *
 * This is the number that makes the bar COVER its glyphs. It has been raised twice: at 4pt
 * the meniscus line ran straight through the middle of all four inactive icons, and at 12pt
 * it only grazed their tops. At 20 there is a clear ~10pt band of pool above every glyph,
 * which is what makes them read as sitting IN the bar instead of floating over it.
 */
const ORB_SUBMERGE = 20
/** Headroom above the crest inside the canvas; must exceed the bloom's y-radius. */
const HALO = 52
/**
 * Diameter of the orb of dye.
 *
 * Coupled to ORB_SUBMERGE: the orb is centred on the submerged glyph row, so it breaks the
 * surface by only `ORB/2 - ORB_SUBMERGE`. Every time the glyphs go deeper the orb has to
 * grow to match, or it ends up entirely underwater.
 */
const ORB = 50
/** Orb centre — on the glyph row, which is what makes the orb read as holding a glyph. */
const ORB_Y = DOME + ORB_SUBMERGE
/** Height of a glyph's slot inside a cell. */
const SLOT = 26
/** Where the cell row starts, chosen so every glyph's centre lands exactly on ORB_Y. */
const SLOT_TOP = ORB_Y - SLOT / 2
/** Clears the orb's lowest point, so the active label is never covered by it. */
const LABEL_GAP = Math.max(4, ORB / 2 - SLOT / 2 + 1)
/** The pool below the surface, holding the glyphs and labels. */
const BODY = 58

function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()
  const [width, setWidth] = useState(0)

  const tabCount = state.routes.length
  const tabWidth = width > 0 ? width / tabCount : 0
  const activeDye = DYES[state.index % DYES.length]

  // The glass owns the home-indicator strip rather than sitting above it.
  const barHeight = SLOT_TOP + BODY + insets.bottom

  // The orb renders the ACTIVE tab's glyph, so it has to reach for that route's icon —
  // including the Stage tab's `tabBarIcon` override, which swaps mic for smiley.
  const activeRoute = state.routes[state.index]
  const activeOverride = descriptors[activeRoute.key]?.options?.tabBarIcon as
    | ((props: { color: string; size?: number; focused: boolean }) => React.ReactNode)
    | undefined
  const ActiveIcon = TAB_ICONS[activeRoute.name]

  // The crest sits exactly on the active tab's centre — never clamped. To keep both
  // shoulders on screen the wave is ASYMMETRIC instead: each side's run is capped by
  // how much room there actually is between the crest and that screen edge. Only the
  // first and last tab are ever capped, and only on their outward side.
  const crestAt = tabWidth * (state.index + 0.5)
  // A long, gentle swell — well over three tabs end to end. Symmetric always, which means
  // the shoulders overrun the screen edge on the outer tabs; see note 2 above.
  const span = tabWidth * SPAN_TABS

  // Canvas three screens wide with the wave dead centre, so translating it can never
  // expose an edge no matter which tab is active.
  const canvas = width * 3
  const domeX = width * 1.5
  // Regenerated when the active tab changes, because the spans depend on it — a
  // discrete event, not a per-frame one, so the slide itself is still a pure
  // native-driver translate of a fixed path.
  const swell = useMemo(
    () =>
      tabWidth > 0
        ? swellPath({
            width: canvas,
            height: barHeight + HALO,
            crestX: domeX,
            span,
            crestH: DOME,
            baselineY: HALO + DOME,
          })
        : '',
    [tabWidth, canvas, barHeight, domeX, span],
  )

  const slide = useRef(new Animated.Value(0)).current
  const settled = useRef(false)
  // 5200ms, deliberately not a neat multiple of any other loop in the theme, so the
  // bead never falls into step with the plates or the glyphs.
  const beadBreath = usePulse(5200)

  useEffect(() => {
    if (tabWidth <= 0) return
    const target = crestAt - width * 0.5
    if (!settled.current) {
      // Snap on first measure — the wave should simply BE under the open tab, not
      // glide in from the middle of the screen on mount.
      settled.current = true
      slide.setValue(target)
      return
    }
    Animated.spring(slide, {
      toValue: target,
      // Heavier and better damped than a UI spring: this is a body of liquid moving,
      // so it wants weight and one soft overshoot rather than a bounce.
      stiffness: 130,
      damping: 18,
      mass: 1.1,
      useNativeDriver: true,
    }).start()
  }, [crestAt, tabWidth, width, slide])

  // Big enough to actually see: ±12% plus a small bob, so the orb reads as floating in
  // the crest rather than pinned to it. The glyph rides inside and breathes with it.
  const orbScale = beadBreath.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] })
  const orbBob = beadBreath.interpolate({ inputRange: [0, 1], outputRange: [1.5, -2.5] })
  const orbGlow = beadBreath.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })

  return (
    <View
      pointerEvents="box-none"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: barHeight }}
    >
      {tabWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -width,
            top: -HALO,
            width: canvas,
            height: barHeight + HALO,
            transform: [{ translateX: slide }],
          }}
        >
          {/* The pool. ONE path, so its translucency is uniform — overlapping
              translucent shapes would double up their alpha along the seam. */}
          <Svg width={canvas} height={barHeight + HALO}>
            <Defs>
              <SvgLinearGradient id="psyPool" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="rgba(26,18,40,0.66)" />
                <Stop offset="0.5" stopColor="rgba(14,10,22,0.88)" />
                <Stop offset="1" stopColor="rgba(6,4,10,0.95)" />
              </SvgLinearGradient>
              {/* Dye bleeding up through the crest, in the active tab's colour. */}
              <RadialGradient id="psyBloom" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={activeDye} stopOpacity="0.5" />
                <Stop offset="0.55" stopColor={activeDye} stopOpacity="0.15" />
                <Stop offset="1" stopColor={activeDye} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Path d={swell} fill="url(#psyPool)" />
            <Ellipse
              cx={domeX}
              cy={HALO + DOME * 0.3}
              rx={span * 0.85}
              ry={DOME * 1.8}
              fill="url(#psyBloom)"
            />
            {/* Stroking the whole silhouette gives the meniscus a bright rim for
                free: the path's other three edges are off-screen. */}
            <Path d={swell} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
          </Svg>

          {/* The orb, straddling the crest and CARRYING the active glyph. A sibling of
              the path in the same translated layer, so the two can never drift apart. */}
          <Animated.View
            style={{
              position: 'absolute',
              left: domeX - ORB / 2,
              top: HALO + ORB_Y - ORB / 2,
              width: ORB,
              height: ORB,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ translateY: orbBob }, { scale: orbScale }],
            }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                width: ORB,
                height: ORB,
                borderRadius: ORB / 2,
                backgroundColor: activeDye,
                borderWidth: 2.5,
                borderColor: '#FFFFFF',
                shadowColor: activeDye,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: orbGlow,
                shadowRadius: 12,
                elevation: 10,
              }}
            />
            {/* Wet highlight, so it reads as a drop of dye and not a flat chip. */}
            <View
              style={{
                position: 'absolute',
                top: ORB * 0.15,
                left: ORB * 0.2,
                width: ORB * 0.28,
                height: ORB * 0.17,
                borderRadius: ORB * 0.14,
                backgroundColor: 'rgba(255,255,255,0.62)',
              }}
            />
            {/* Ink glyph — the highest-contrast pairing available on a saturated dye. */}
            {activeOverride
              ? activeOverride({ color: INK, size: 21, focused: true })
              : ActiveIcon
                ? ActiveIcon({ color: INK, size: 21 })
                : null}
          </Animated.View>
        </Animated.View>
      ) : null}

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: SLOT_TOP,
          height: BODY,
          flexDirection: 'row',
        }}
      >
        {state.routes.map((route, index) => {
          const options = descriptors[route.key]?.options
          const focused = state.index === index
          return (
            <TabCell
              key={route.key}
              label={route.name === 'Stage' ? stageLabel : route.name}
              focused={focused}
              Icon={TAB_ICONS[route.name]}
              overrideIcon={
                options?.tabBarIcon as
                  | ((props: {
                      color: string
                      size?: number
                      focused: boolean
                    }) => React.ReactNode)
                  | undefined
              }
              fontFamily={tokens.fontDisplay}
              // Distinct phase per tab — without this all five cells breathe as one.
              phase={phaseFor(index, 4300)}
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

function TabCell({
  label,
  focused,
  Icon,
  overrideIcon,
  fontFamily,
  phase,
  onPress,
  onLongPress,
}: {
  label: string
  focused: boolean
  Icon: ((props: { color: string; size?: number }) => React.ReactElement) | undefined
  overrideIcon:
    | ((props: { color: string; size?: number; focused: boolean }) => React.ReactNode)
    | undefined
  fontFamily: string
  phase: number
  onPress: () => void
  onLongPress: () => void
}) {
  const grow = useRef(new Animated.Value(focused ? 1 : 0)).current
  const breathe = usePulse(4300, phase)

  useEffect(() => {
    Animated.spring(grow, {
      toValue: focused ? 1 : 0,
      stiffness: 170,
      damping: 15,
      mass: 0.85,
      useNativeDriver: true,
    }).start()
  }, [focused, grow])

  // The cell's own glyph FADES OUT when the tab is selected, because the orb in the
  // sliding layer renders that glyph instead (in ink, inside the orb). It keeps
  // occupying its slot at opacity 0 rather than unmounting, so the labels below never
  // shift when the selection moves.
  const glyphOpacity = grow.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
  const glyphScale = grow.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] })
  // The label grows and then keeps breathing. Gating the breathe through `grow` means
  // the inactive tabs sit perfectly still, so the one that's moving is unambiguous.
  const labelScale = Animated.add(
    grow.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }),
    Animated.multiply(grow, breathe).interpolate({ inputRange: [0, 1], outputRange: [0, 0.07] }),
  )

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ flex: 1, alignItems: 'center' }}>
      <Animated.View
        style={{
          height: SLOT,
          justifyContent: 'center',
          opacity: glyphOpacity,
          transform: [{ scale: glyphScale }],
        }}
      >
        {/* Every inactive tab shares one colour — the accent belongs to the orb. */}
        {overrideIcon
          ? overrideIcon({ color: TEXT_FAINT, size: 21, focused })
          : Icon
            ? Icon({ color: TEXT_FAINT, size: 21 })
            : null}
      </Animated.View>

      <Animated.Text
        numberOfLines={1}
        style={{
          marginTop: LABEL_GAP,
          // Legibility never animates: a hard colour swap, never a fade up from
          // near-transparent.
          color: focused ? '#FFFFFF' : TEXT_FAINT,
          fontFamily,
          fontSize: 13,
          textShadowColor: 'rgba(0,0,0,0.7)',
          textShadowRadius: 8,
          textShadowOffset: { width: 0, height: 1 },
          transform: [{ scale: labelScale }],
        }}
      >
        {label}
      </Animated.Text>
    </Pressable>
  )
}
