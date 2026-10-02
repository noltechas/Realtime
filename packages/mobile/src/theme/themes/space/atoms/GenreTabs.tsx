import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native'
import type { GenreTabsProps } from '../../../types'
import { DUST, DUST_DIM, ETCH, GOLD, GOLD_HI, STAR_DIM, Star, display, mono } from './_record'

// Space genre selector: a STAR CHART AXIS. One engraved line runs the length of
// the chart, the way a sky chart draws the ecliptic, and every genre is a
// station on it, marked by a tick and a faint point of light. The genre you're
// browsing is the one that's SHINING: its point blooms into a full eight-
// pointed star on the line and its name is set in gold. The song count is
// written beneath each name in the chart's monospace.

const STAR_SLOT = 30
const AXIS_Y = STAR_SLOT / 2

export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // A ScrollView shrinks by default and the grid below takes every spare
      // pixel, which would clip the labels. Hold it at its content height.
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 2, paddingBottom: 8 }}
    >
      <View>
        <View style={{ position: 'absolute', left: -12, right: -12, top: AXIS_Y, height: 1, backgroundColor: ETCH.mid }} />
        <View style={{ flexDirection: 'row' }}>
          {list.map((genre) => (
            <Station key={genre} label={genre} count={counts[genre] ?? 0} active={genre === value} onPress={() => onChange(genre)} />
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

function Station({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  const lit = useRef(new Animated.Value(active ? 1 : 0)).current
  useEffect(() => {
    Animated.timing(lit, { toValue: active ? 1 : 0, duration: active ? 520 : 240, easing: active ? Easing.out(Easing.back(1.4)) : Easing.in(Easing.quad), useNativeDriver: true }).start()
  }, [active, lit])
  return (
    <Pressable onPress={onPress} hitSlop={{ top: 6, bottom: 6 }} accessibilityLabel={`${label}, ${count} songs`} accessibilityState={{ selected: active }}>
      <View style={{ minWidth: 76, paddingHorizontal: 12, alignItems: 'center' }}>
        <View style={{ width: STAR_SLOT, height: STAR_SLOT, alignItems: 'center', justifyContent: 'center' }}>
          {/* the station's tick on the axis */}
          <View style={{ position: 'absolute', top: AXIS_Y - 4, width: 1, height: 8, backgroundColor: ETCH.strong }} />
          {/* a faint point, always there */}
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: STAR_DIM }} />
          {/* and the star that blooms when it's chosen */}
          <Animated.View style={{ position: 'absolute', opacity: lit, transform: [{ scale: lit.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>
            <Star size={STAR_SLOT} color={GOLD_HI} />
          </Animated.View>
        </View>
        <Text numberOfLines={1} style={display(12, active ? GOLD_HI : DUST, active ? 500 : 400, { letterSpacing: 2.2, marginTop: 3 })}>
          {label}
        </Text>
        <Text style={mono(9, active ? GOLD : DUST_DIM, { marginTop: 2, letterSpacing: 1.4 })}>{count}</Text>
      </View>
    </Pressable>
  )
}
