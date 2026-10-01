import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import type { GenreTabsProps } from '../../../types'
import { ASH, CANDLE, CandleWax, FLAME, Flame, PEWTER, gothic, serif, useFlicker } from './_gothic'

// Gothic genre selector: a VOTIVE STAND. Every genre is a candle standing on
// one long wrought-iron tray, and the genre you're browsing is the candle that
// is LIT: you light a candle for it. Each candle is as tall as its genre is big
// (the song count), so the stand reads the shape of the library at a glance.
// Choosing another genre lights its candle (the flame grows up out of the wick)
// while the last one is put out and smokes. The tray runs unbroken behind every
// candle, and the name of each is cut into the tray's front edge.

const STAND_H = 50 // room for the tallest candle, its flame and its cup
const TRAY_H = 9
const MIN_W = 58

export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  const max = useMemo(() => Math.max(1, ...list.map((g) => counts[g] ?? 0)), [list, counts])
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // A ScrollView shrinks by default, and on the Songs screen the grid below
      // takes every spare pixel, so without this the stand gets squeezed shorter
      // than its content and the genre names under the tray are clipped.
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 2, paddingBottom: 6 }}
    >
      <View style={{ flexDirection: 'row' }}>
        {list.map((genre, i) => (
          <Votive
            key={genre}
            label={genre}
            count={counts[genre] ?? 0}
            frac={(counts[genre] ?? 0) / max}
            active={genre === value}
            first={i === 0}
            last={i === list.length - 1}
            seed={i + 1}
            onPress={() => onChange(genre)}
          />
        ))}
      </View>
    </ScrollView>
  )
}

function Votive({
  label,
  count,
  frac,
  active,
  first,
  last,
  seed,
  onPress,
}: {
  label: string
  count: number
  frac: number
  active: boolean
  first: boolean
  last: boolean
  seed: number
  onPress: () => void
}) {
  const lit = useRef(new Animated.Value(active ? 1 : 0)).current
  const smoke = useRef(new Animated.Value(1)).current
  const flicker = useFlicker()
  const was = useRef(active)

  useEffect(() => {
    Animated.timing(lit, {
      toValue: active ? 1 : 0,
      duration: active ? 460 : 200,
      easing: active ? Easing.out(Easing.back(1.5)) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start()
    if (was.current && !active) {
      smoke.setValue(0)
      Animated.timing(smoke, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
    }
    was.current = active
  }, [active, lit, smoke])

  // Height by size of the genre: a square-root curve so the small genres still
  // stand up, and the big one doesn't dwarf the row.
  const candleH = Math.round(12 + 24 * Math.sqrt(Math.max(0, Math.min(1, frac))))
  const candleW = 11

  return (
    <Pressable onPress={onPress} hitSlop={{ top: 6, bottom: 6 }} accessibilityLabel={`${label}, ${count} songs`} accessibilityState={{ selected: active }}>
      <View style={{ minWidth: MIN_W, paddingHorizontal: 10, alignItems: 'center' }}>
        {/* the candle's light on the wall behind it */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -10,
            width: 96,
            height: 96,
            opacity: Animated.multiply(lit, flicker.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })),
          }}
        >
          <Svg width={96} height={96}>
            <Defs>
              <RadialGradient id={`gvt-glow-${seed}`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor="#FFB45A" stopOpacity={0.34} />
                <Stop offset="0.45" stopColor="#C9702A" stopOpacity={0.1} />
                <Stop offset="1" stopColor="#C9702A" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={96} height={96} fill={`url(#gvt-glow-${seed})`} />
          </Svg>
        </Animated.View>

        {/* candle + flame, standing on the tray */}
        <View style={{ height: STAND_H, width: 40, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: candleH + 10,
              width: 5,
              height: 16,
              borderRadius: 3,
              backgroundColor: 'rgba(205,205,220,0.4)',
              opacity: smoke.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.85, 0] }),
              transform: [
                { translateY: smoke.interpolate({ inputRange: [0, 1], outputRange: [4, -18] }) },
                { translateX: smoke.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 3, -2] }) },
                { scaleX: smoke.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.4] }) },
              ],
            }}
          />
          <View style={{ position: 'absolute', bottom: candleH - 1 }}>
            <Flame size={12} flicker={flicker} lit={lit} halo={1.4} />
          </View>
          <CandleWax width={candleW} height={candleH} wax="ivory" lit={active} seed={seed * 3} />
          {/* the iron drip cup the candle stands in */}
          <Svg width={24} height={6} style={{ marginTop: -2 }}>
            <Path d="M 1 0.6 L 23 0.6 L 19 5.4 L 5 5.4 Z" fill="#24212A" stroke="#060508" strokeWidth={0.8} />
            <Path d="M 2.5 1.2 L 21.5 1.2" stroke="#8A8494" strokeOpacity={0.55} strokeWidth={0.8} />
          </Svg>
        </View>

        {/* this candle's stretch of the iron tray */}
        <Tray first={first} last={last} />

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
          <Text
            numberOfLines={1}
            style={gothic(14.5, active ? FLAME : PEWTER, active ? 800 : 700, active ? { textShadowColor: 'rgba(255,180,90,0.55)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 } : undefined)}
          >
            {label}
          </Text>
          <Text style={serif(11, active ? CANDLE : ASH, 'italic')}>{count}</Text>
        </View>
      </View>
    </Pressable>
  )
}

/** One segment of the votive tray. Segments butt together edge to edge so the
 *  tray reads as a single forged piece; the ends curl up into scrolls. */
function Tray({ first, last }: { first: boolean; last: boolean }) {
  return (
    <View style={{ alignSelf: 'stretch', height: TRAY_H, marginHorizontal: -10 }}>
      <Svg width="100%" height={TRAY_H} preserveAspectRatio="none" viewBox="0 0 100 9">
        <Defs>
          <SvgLinearGradient id="gvt-tray" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#6A6474" />
            <Stop offset="0.25" stopColor="#2A2630" />
            <Stop offset="1" stopColor="#0B0A0E" />
          </SvgLinearGradient>
        </Defs>
        {/* drip ledge: wax pooled along the top of the tray */}
        <Rect x={0} y={0} width={100} height={2.4} fill="#D9CBAA" opacity={0.22} />
        <Rect x={0} y={1.6} width={100} height={6.2} fill="url(#gvt-tray)" />
        <Rect x={0} y={7.8} width={100} height={1.2} fill="#000" opacity={0.6} />
        {first ? <Path d="M 0 1.6 L 0 9 L 3 9 Z" fill="#09080C" /> : null}
        {last ? <Path d="M 100 1.6 L 100 9 L 97 9 Z" fill="#09080C" /> : null}
      </Svg>
    </View>
  )
}
