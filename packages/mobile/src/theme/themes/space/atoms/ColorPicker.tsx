import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, ScrollView, Animated, Easing } from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse, G } from 'react-native-svg'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useLinearLoop } from '../_shared'
import type { ColorPickerProps } from '../../../types'

// Space ColorPicker — each swatch is a planet with a tilted ring. Selected
// planets scale up, get a magenta glow halo, and spawn a small cyan satellite
// that traces the ring continuously. Inactive planets sit at full opacity
// with a faint ring outline — no breath animation (only the selected planet
// orbits its satellite).
export function SpaceColorPicker({
  value,
  onChange,
  label = 'Your Color',
}: ColorPickerProps) {
  const { tokens } = useTheme()
  return (
    <View>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontSize: 11,
          letterSpacing: 1.8,
          textTransform: 'uppercase',
          color: tokens.accentA,
          marginBottom: 10,
          paddingHorizontal: 24,
          textShadowColor: 'rgba(224,64,251,0.45)',
          textShadowRadius: 5,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 16, paddingVertical: 4 }}
      >
        {UNIVERSAL_SINGER_COLORS.map((c, i) => (
          <PlanetSwatch
            key={c.color}
            color={c.color}
            selected={i === value}
            seed={i}
            onPress={() => onChange(i)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

function PlanetSwatch({
  color,
  selected,
  seed,
  onPress,
}: {
  color: string
  selected: boolean
  seed: number
  onPress: () => void
}) {
  const id = `spacePlanet-${hashKey(`${color}-${seed}`)}`
  const ringTilt = (seed * 23) % 60 - 30 // -30°..+30° per seed

  // Selected planets get a satellite orbit driver. Linear loop only — period
  // varies per seed so adjacent picked swatches never sync.
  const orbit = useLinearLoop(3200 + (seed % 11) * 200)
  const rotate = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const size = selected ? 50 : 38

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          ...(selected
            ? {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.95,
                shadowRadius: 14,
              }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.45,
                shadowRadius: 4,
              }),
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient
              id={id}
              cx="32%"
              cy="28%"
              rx="68%"
              ry="68%"
              fx="32%"
              fy="28%"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
              <Stop offset="30%" stopColor={color} stopOpacity={1} />
              <Stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </RadialGradient>
          </Defs>
          {/* Ring */}
          <G transform={`rotate(${ringTilt} ${size / 2} ${size / 2})`}>
            <Ellipse
              cx={size / 2}
              cy={size / 2}
              rx={size / 2 - 1}
              ry={size / 5}
              fill="none"
              stroke={selected ? '#FFFFFF' : 'rgba(168,194,255,0.55)'}
              strokeWidth={selected ? 1.6 : 1}
              opacity={selected ? 0.95 : 0.55}
            />
          </G>
          {/* Planet */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 6}
            fill={`url(#${id})`}
          />
          {selected ? (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 4}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.5}
              opacity={0.85}
            />
          ) : null}
        </Svg>

        {/* Selected planets — orbiting satellite */}
        {selected ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: size + 8,
              height: size + 8,
              transform: [{ rotate }],
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: '#40E0D0',
                marginTop: -2,
                shadowColor: '#40E0D0',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.95,
                shadowRadius: 5,
              }}
            />
          </Animated.View>
        ) : null}
      </View>
    </Pressable>
  )
}
