import React from 'react'
import { View, Text, Pressable, ScrollView, Animated, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../../ThemeContext'
import { blobCornerRadii, hashKey } from '../../../helpers'
import { useOscillator } from '../_shared'
import type { GenreTabsProps } from '../../../types'

// Psychedelic genre tabs — each pill is asymmetrically blob-cornered so the
// row reads as a string of unique wax bubbles rather than uniform chips.
// Inactive: dim purple bg, lavender text, 1px hot-pink rim. Active pills get
// a flowing pink→tangerine→lime gradient fill, hot-pink halo, and a count
// badge bobbing on the right.
export function PsychedelicGenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  if (list.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 14, gap: 10 }}
    >
      {list.map((g) => (
        <GenrePill
          key={g}
          label={g}
          count={counts[g] ?? 0}
          active={g === value}
          onPress={() => onChange(g)}
        />
      ))}
    </ScrollView>
  )
}

function GenrePill({
  label,
  count,
  active,
  onPress,
}: {
  label: string
  count: number
  active: boolean
  onPress: () => void
}) {
  const { tokens } = useTheme()
  const shape = blobCornerRadii(hashKey(label))
  // Per-pill breath. Period spread is wide (2400-5800ms) and seeded by the
  // label hash so neighboring pills never pulse in sync. NO translateY on
  // anything — psychedelic foreground elements grow/shrink only.
  const breath = useOscillator(2400 + (hashKey(label) % 17) * 200)
  const breathScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.04],
  })
  // Count badge gets its own faster, smaller breath so it pulses inside the
  // pill at a different rate — replaces the previous vertical bob.
  const badgeBreath = useOscillator(1700 + (hashKey(label) % 19) * 140)
  const badgeScale = badgeBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  })

  // Each pill gets a deterministic gradient direction so the row doesn't
  // homogenize into a single flow direction.
  const seed = hashKey(label) % 4
  const dirs: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [
    { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } },
    { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } },
    { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
  ]
  const { start, end } = dirs[seed]

  return (
    <Animated.View style={{ transform: [{ scale: breathScale }] }}>
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={[
        shape,
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          minHeight: 42,
          borderWidth: 1,
          borderColor: active ? tokens.accentA : 'rgba(255,45,149,0.25)',
          backgroundColor: active ? 'transparent' : 'rgba(42,20,80,0.55)',
          overflow: 'hidden',
          ...(active
            ? {
                shadowColor: tokens.accentGlowColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 12,
              }
            : {}),
        },
      ]}
    >
      {active ? (
        <LinearGradient
          colors={['#ff2d95', '#ff8c2d', '#b6ff2d']}
          start={start}
          end={end}
          style={[StyleSheet.absoluteFill, shape, { opacity: 0.9 }]}
        />
      ) : null}
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontSize: 15,
          lineHeight: 22,
          color: active ? '#fff' : tokens.muted,
          textShadowColor: active ? 'rgba(0,0,0,0.45)' : 'transparent',
          textShadowRadius: active ? 4 : 0,
          textShadowOffset: { width: 0, height: 1 },
          includeFontPadding: false,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Animated.View
        style={{
          marginLeft: 8,
          paddingHorizontal: 8,
          paddingVertical: 1,
          borderRadius: 999,
          backgroundColor: active ? 'rgba(0,0,0,0.25)' : 'rgba(182,255,45,0.15)',
          minWidth: 24,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: badgeScale }],
        }}
      >
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 12,
            lineHeight: 18,
            color: active ? '#fff' : tokens.accentB,
            includeFontPadding: false,
          }}
          numberOfLines={1}
        >
          {count}
        </Text>
      </Animated.View>
    </Pressable>
    </Animated.View>
  )
}
