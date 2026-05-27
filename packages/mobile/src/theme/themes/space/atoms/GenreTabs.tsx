import React from 'react'
import { View, Text, Pressable, ScrollView, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useLinearLoop, useOscillator } from '../_shared'
import type { GenreTabsProps } from '../../../types'

// Space genre tabs — each pill is a rectangular HUD chip with a tiny planet
// marker at its leading edge. Inactive: void chip, thin cyan rim, muted
// label, planet has a faint outline only. Active: magenta gradient fill,
// glowing rim, satellite orbits the planet on a 4s linear loop, label
// renders in void-dark with a cool magenta glow.
export function SpaceGenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
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
  const seedHash = hashKey(label)

  // Continuous orbit driver for the active satellite — period spread per pill
  // so they don't all sync up across the row.
  const orbit = useLinearLoop(3400 + (seedHash % 11) * 220)
  const orbitX = orbit.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [10, 0, -10, 0, 10],
  })
  const orbitY = orbit.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -5, 0, 5, 0],
  })
  const orbitScale = orbit.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.6, 1, 1.2, 1],
  })

  // Subtle count-badge twinkle.
  const tw = useOscillator(2300 + (seedHash % 13) * 180)
  const badgeOpacity = tw.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  })

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 32,
          paddingRight: 14,
          paddingVertical: 8,
          minHeight: 40,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: active ? tokens.accentA : 'rgba(64,224,208,0.35)',
          backgroundColor: active ? 'transparent' : 'rgba(14,14,26,0.7)',
          overflow: 'hidden',
          ...(active
            ? {
                shadowColor: tokens.accentGlowColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 10,
              }
            : {}),
        }}
      >
        {/* Active fill — diagonal magenta→cyan gradient. */}
        {active ? (
          <LinearGradient
            colors={['rgba(224,64,251,0.85)', 'rgba(120,24,160,0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 5 }}
          />
        ) : null}

        {/* Planet marker — sits on the left edge of every pill. Active pills
            get a small cyan satellite orbiting it. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 8,
            top: 0,
            bottom: 0,
            width: 18,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={14} height={14}>
            <Defs>
              <RadialGradient id={`planet-${seedHash}`} cx="38%" cy="32%">
                <Stop
                  offset="0%"
                  stopColor={active ? '#FFFFFF' : '#A8C2FF'}
                  stopOpacity={active ? 1 : 0.65}
                />
                <Stop
                  offset="100%"
                  stopColor={active ? '#40E0D0' : '#3A4470'}
                  stopOpacity={1}
                />
              </RadialGradient>
            </Defs>
            <Circle cx={7} cy={7} r={5.5} fill={`url(#planet-${seedHash})`} />
            <Circle
              cx={7}
              cy={7}
              r={6.5}
              fill="none"
              stroke={active ? '#FFFFFF' : 'rgba(168,194,255,0.3)'}
              strokeWidth={0.5}
            />
          </Svg>
          {active ? (
            <Animated.View
              style={{
                position: 'absolute',
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#FFC34D',
                shadowColor: '#FFC34D',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.95,
                shadowRadius: 4,
                transform: [
                  { translateX: orbitX },
                  { translateY: orbitY },
                  { scale: orbitScale },
                ],
              }}
            />
          ) : null}
        </View>

        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 12,
            lineHeight: 18,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: active ? '#08080F' : tokens.black,
            opacity: active ? 1 : 0.85,
            includeFontPadding: false,
            textShadowColor: active ? 'rgba(255,255,255,0.5)' : 'transparent',
            textShadowRadius: active ? 4 : 0,
            textShadowOffset: { width: 0, height: 0 },
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Animated.View
          style={{
            marginLeft: 8,
            paddingHorizontal: 7,
            paddingVertical: 1,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: active ? 'rgba(8,8,15,0.45)' : 'rgba(64,224,208,0.5)',
            backgroundColor: active
              ? 'rgba(8,8,15,0.35)'
              : 'rgba(64,224,208,0.08)',
            minWidth: 22,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: badgeOpacity,
          }}
        >
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontSize: 10,
              lineHeight: 14,
              letterSpacing: 0.5,
              color: active ? '#08080F' : tokens.accentB,
              includeFontPadding: false,
            }}
            numberOfLines={1}
          >
            {count}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  )
}
