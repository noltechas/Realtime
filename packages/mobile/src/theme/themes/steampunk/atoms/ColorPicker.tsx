import React from 'react'
import { View, Text, Pressable, ScrollView, Animated } from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Circle, G } from 'react-native-svg'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useLinearLoop, useOscillator } from '../_shared'
import { Rivet } from '../Gear'
import type { ColorPickerProps } from '../../../types'

// Steampunk ColorPicker — each swatch is a polished cabochon jewel set into a
// brass bezel with four micro-rivets at compass points. Selected swatches
// scale up, gain a strong amber gas-lamp glow, and the bezel slowly rotates
// (as if the jewel were spinning in its setting). Inactive jewels sit still
// with a faint highlight.
export function SteampunkColorPicker({
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
          letterSpacing: 2.2,
          textTransform: 'uppercase',
          color: '#E8A93B',
          marginBottom: 10,
          paddingHorizontal: 24,
          textShadowColor: 'rgba(232,169,59,0.55)',
          textShadowRadius: 4,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 16, paddingVertical: 6 }}
      >
        {UNIVERSAL_SINGER_COLORS.map((c, i) => (
          <JewelSwatch
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

function JewelSwatch({
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
  const id = `steamJewel-${hashKey(`${color}-${seed}`)}`

  // Selected jewels rotate their bezel slowly + breathe.
  const spin = useLinearLoop(8000 + (seed % 11) * 240)
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })
  const breath = useOscillator(2200 + (seed % 7) * 160)
  const breathOpacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1],
  })

  const size = selected ? 52 : 40

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
                shadowColor: '#E8A93B',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.95,
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
        {/* Rotating brass bezel — six rivets around the rim */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            transform: selected ? [{ rotate }] : [],
          }}
        >
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Defs>
              <RadialGradient id={`${id}-bezel`} cx="35%" cy="30%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#F0D898" stopOpacity={1} />
                <Stop offset="55%" stopColor={selected ? '#E8A93B' : '#B8762D'} stopOpacity={1} />
                <Stop offset="100%" stopColor="#5C3A12" stopOpacity={1} />
              </RadialGradient>
            </Defs>
            <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={`url(#${id}-bezel)`} />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 2}
              fill="none"
              stroke="#5C3A12"
              strokeWidth={0.5}
              opacity={0.6}
            />
            {/* Bezel rivets — 6 around the rim */}
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2 - Math.PI / 2
              const cx = size / 2 + Math.cos(a) * (size / 2 - 4)
              const cy = size / 2 + Math.sin(a) * (size / 2 - 4)
              return (
                <G key={i}>
                  <Circle cx={cx} cy={cy} r={1.6} fill="#3E2810" />
                  <Circle cx={cx - 0.4} cy={cy - 0.4} r={0.8} fill="#F0DDB5" opacity={0.7} />
                </G>
              )
            })}
          </Svg>
        </Animated.View>

        {/* Cabochon jewel — domed colored gem */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size - 12,
            height: size - 12,
            opacity: selected ? breathOpacity : 1,
          }}
        >
          <Svg width={size - 12} height={size - 12}>
            <Defs>
              <RadialGradient id={`${id}-gem`} cx="32%" cy="28%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
                <Stop offset="35%" stopColor={color} stopOpacity={1} />
                <Stop offset="100%" stopColor={color} stopOpacity={0.65} />
              </RadialGradient>
            </Defs>
            <Circle
              cx={(size - 12) / 2}
              cy={(size - 12) / 2}
              r={(size - 12) / 2 - 1}
              fill={`url(#${id}-gem)`}
            />
            {/* Specular highlight */}
            <Circle
              cx={(size - 12) * 0.32}
              cy={(size - 12) * 0.28}
              r={(size - 12) * 0.12}
              fill="#FFFFFF"
              opacity={0.7}
            />
          </Svg>
        </Animated.View>
      </View>
    </Pressable>
  )
}
