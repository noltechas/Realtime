import React from 'react'
import { View, Text, Pressable, Animated } from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Circle, G, Line } from 'react-native-svg'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useLinearLoop, useOscillator } from '../_shared'
import type { ColorPickerProps } from '../../../types'

// Retrowave ColorPicker — each swatch is a glowing neon orb suspended over
// a small wireframe crosshair. Selected orbs scale up, gain a chromatic-
// aberration ring (cyan + magenta hairlines around the orb), and rotate
// their crosshair backplate continuously. Inactive orbs sit still with a
// faint outline.
//
// A wrapping grid rather than a horizontal scroller — a scroller cut the last
// orbs off at the screen edge. CELL + gap fits seven per row, so 13 lands as a
// clean 7 + 6. Each orb lives in a fixed CELL and only its contents grow on
// selection, so picking a colour can't reflow the grid.
const CELL = 44
export function RetrowaveColorPicker({
  value,
  onChange,
  label = 'Your Color',
}: ColorPickerProps) {
  const { tokens } = useTheme()
  return (
    <View>
      <Text
        style={{
          fontFamily: tokens.fontBody,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: '#FF2D95',
          marginBottom: 10,
          paddingHorizontal: 24,
          // A dark halo, not the usual magenta bloom: this label lands directly
          // on the theme's own magenta horizon grid, where a magenta glow made
          // magenta type disappear into the backdrop.
          textShadowColor: 'rgba(10,4,20,0.95)',
          textShadowRadius: 6,
          textShadowOffset: { width: 0, height: 1 },
        }}
      >
        {label}
      </Text>
      <View
        style={{
          paddingHorizontal: 24,
          paddingVertical: 6,
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: 6,
          rowGap: 10,
        }}
      >
        {UNIVERSAL_SINGER_COLORS.map((c, i) => (
          <NeonOrb
            key={c.color}
            color={c.color}
            selected={i === value}
            seed={i}
            onPress={() => onChange(i)}
          />
        ))}
      </View>
    </View>
  )
}

function NeonOrb({
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
  const id = `rwOrb-${hashKey(`${color}-${seed}`)}`

  const spin = useLinearLoop(8000 + (seed % 11) * 220)
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  const breath = useOscillator(2200 + (seed % 7) * 180)
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] })

  const size = selected ? CELL : 36

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{ width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' }}
    >
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
                shadowOpacity: 1,
                shadowRadius: 14,
              }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.5,
                shadowRadius: 3,
              }),
        }}
      >
        {/* Spinning crosshair backplate — selected only */}
        {selected ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: size,
              height: size,
              transform: [{ rotate }],
            }}
          >
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={size / 2 - 1}
                fill="none"
                stroke="#FF2D95"
                strokeWidth={1}
                strokeDasharray="3,3"
                opacity={0.75}
              />
              <Line
                x1={size / 2}
                y1={0}
                x2={size / 2}
                y2={size}
                stroke="#00F0FF"
                strokeWidth={0.6}
                opacity={0.5}
              />
              <Line
                x1={0}
                y1={size / 2}
                x2={size}
                y2={size / 2}
                stroke="#00F0FF"
                strokeWidth={0.6}
                opacity={0.5}
              />
            </Svg>
          </Animated.View>
        ) : null}

        {/* Chromatic-aberration outer rings — selected only */}
        {selected ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', width: size + 4, height: size + 4 }}
          >
            <View
              style={{
                position: 'absolute',
                left: -1,
                top: 1,
                width: size + 4,
                height: size + 4,
                borderRadius: (size + 4) / 2,
                borderWidth: 1,
                borderColor: '#00F0FF',
                opacity: 0.7,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 1,
                top: -1,
                width: size + 4,
                height: size + 4,
                borderRadius: (size + 4) / 2,
                borderWidth: 1,
                borderColor: '#FF2D95',
                opacity: 0.7,
              }}
            />
          </View>
        ) : null}

        <Animated.View
          style={{
            width: size - 12,
            height: size - 12,
            opacity: selected ? breathOpacity : 1,
          }}
        >
          <Svg width={size - 12} height={size - 12}>
            <Defs>
              <RadialGradient id={id} cx="32%" cy="28%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                <Stop offset="40%" stopColor={color} stopOpacity={1} />
                <Stop offset="100%" stopColor={color} stopOpacity={0.55} />
              </RadialGradient>
            </Defs>
            <Circle
              cx={(size - 12) / 2}
              cy={(size - 12) / 2}
              r={(size - 12) / 2 - 1}
              fill={`url(#${id})`}
            />
            {/* Specular dot */}
            <Circle
              cx={(size - 12) * 0.32}
              cy={(size - 12) * 0.28}
              r={(size - 12) * 0.13}
              fill="#FFFFFF"
              opacity={0.75}
            />
          </Svg>
        </Animated.View>
      </View>
    </Pressable>
  )
}
