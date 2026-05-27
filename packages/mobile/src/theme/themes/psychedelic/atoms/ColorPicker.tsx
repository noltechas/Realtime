import React, { useEffect, useRef } from 'react'
import { View, Text, Pressable, ScrollView, Animated, Easing } from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import type { ColorPickerProps } from '../../../types'

// Psychedelic ColorPicker — each swatch is a glassy bubble (RadialGradient
// with a white highlight to fake "lit-from-above" glass). Bubbles drift gently
// on independent X/Y oscillators so they look suspended in liquid. Selected
// bubble gets a 2px hot-pink rim and scales up slightly.
export function PsychedelicColorPicker({
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
          fontSize: 13,
          letterSpacing: 1,
          color: tokens.accentA,
          marginBottom: 10,
          paddingHorizontal: 24,
          textShadowColor: 'rgba(255,45,149,0.4)',
          textShadowRadius: 6,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 14, paddingVertical: 4 }}
      >
        {UNIVERSAL_SINGER_COLORS.map((c, i) => (
          <Bubble
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

function Bubble({
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
  const { tokens } = useTheme()
  // Continuous scale breath — no translation. Per project rule, psychedelic
  // elements grow/shrink only; no floating up-down. Periods spread per-bubble
  // by seed so neighboring bubbles don't pulse in sync.
  const breath = useRef(new Animated.Value(0)).current
  const id = `psyBubble-${hashKey(`${color}-${seed}`)}`

  useEffect(() => {
    const startDelay = (seed % 7) * 200
    const period = 2600 + (seed % 11) * 280 // 2.6s..5.4s spread
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(breath, {
            toValue: 1,
            duration: period / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breath, {
            toValue: 0,
            duration: period / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start()
    }, startDelay)
    return () => clearTimeout(t)
  }, [breath, seed])

  const breathScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.08],
  })

  const size = selected ? 44 : 38

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ scale: breathScale }],
          alignItems: 'center',
          justifyContent: 'center',
          ...(selected
            ? {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 12,
              }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
              }),
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient
              id={id}
              cx="30%"
              cy="28%"
              rx="70%"
              ry="70%"
              fx="30%"
              fy="28%"
            >
              <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.85} />
              <Stop offset="30%" stopColor={color} stopOpacity={1} />
              <Stop offset="100%" stopColor={color} stopOpacity={0.6} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill={`url(#${id})`} />
          {selected ? (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 2}
              fill="none"
              stroke={tokens.accentA}
              strokeWidth={2}
            />
          ) : null}
        </Svg>
      </Animated.View>
    </Pressable>
  )
}
