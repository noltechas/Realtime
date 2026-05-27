import React, { useEffect, useRef } from 'react'
import {
  Pressable,
  View,
  Text,
  Animated,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useOscillator } from '../_shared'
import type { ToggleBoxProps } from '../../../types'

// Psychedelic toggle — a translucent pill track with a mini lava orb thumb.
// When `on`, the orb glides to the right with a viscous spring; off pushes it
// back. The label has a hot-pink glow when the toggle is active so it visually
// echoes the orb's color.
export function PsychedelicStageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const { tokens } = useTheme()
  const slide = useRef(new Animated.Value(on ? 1 : 0)).current
  // Continuous scale breath only (no Y translation). Period seeded per label.
  const breath = useOscillator(2600 + (hashKey(label) % 17) * 180)
  const breathScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1.035],
  })

  useEffect(() => {
    Animated.spring(slide, {
      toValue: on ? 1 : 0,
      tension: 75,
      friction: 8,
      useNativeDriver: true,
    }).start()
  }, [on, slide])

  const thumbX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22], // track inner width minus thumb width
  })

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: breathScale }] }}>
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        wrapStyle(tokens, on),
        pressed ? { opacity: 0.9 } : null,
      ]}
    >
      <View style={trackStyle(tokens, on)}>
        <Animated.View
          style={{
            position: 'absolute',
            left: 2,
            top: 2,
            width: 22,
            height: 22,
            transform: [{ translateX: thumbX }],
          }}
        >
          {on ? (
            <Svg width={22} height={22} viewBox="0 0 22 22">
              <Defs>
                <RadialGradient id="psyToggleThumb" cx="38%" cy="32%" rx="62%" ry="62%" fx="38%" fy="32%">
                  <Stop offset="0%" stopColor="#ffe98a" stopOpacity={1} />
                  <Stop offset="60%" stopColor="#ff8c2d" stopOpacity={1} />
                  <Stop offset="100%" stopColor="#ff2d95" stopOpacity={0.85} />
                </RadialGradient>
              </Defs>
              <Circle cx={11} cy={11} r={10} fill="url(#psyToggleThumb)" />
            </Svg>
          ) : (
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: tokens.muted,
                opacity: 0.7,
              }}
            />
          )}
        </Animated.View>
      </View>
      <Text style={labelStyle(tokens, on)} numberOfLines={1}>{label}</Text>
    </Pressable>
    </Animated.View>
  )
}

function wrapStyle(t: ReturnType<typeof useTheme>['tokens'], on: boolean): ViewStyle {
  return {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: on ? t.accentA : 'rgba(255,45,149,0.25)',
    backgroundColor: on ? 'rgba(255,45,149,0.12)' : 'rgba(42,20,80,0.5)',
    borderRadius: 22,
    ...(on
      ? {
          shadowColor: t.accentGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 10,
        }
      : {}),
  }
}
function trackStyle(t: ReturnType<typeof useTheme>['tokens'], on: boolean): ViewStyle {
  return {
    width: 50,
    height: 26,
    borderRadius: 13,
    backgroundColor: on ? 'rgba(255,140,45,0.25)' : 'rgba(26,10,46,0.6)',
    borderWidth: 1,
    borderColor: on ? t.accentC : 'rgba(255,45,149,0.3)',
  }
}
function labelStyle(t: ReturnType<typeof useTheme>['tokens'], on: boolean): TextStyle {
  return {
    // Take the remaining row width so a long label can't be hidden behind
    // the track / pushed off-cell.
    flex: 1,
    fontFamily: t.fontDisplay,
    fontSize: 17,
    fontWeight: '700',
    // Bright lavender-white in both states — translucent purple background
    // means muted/colored text gets lost in low-contrast comparisons.
    color: t.black,
    opacity: on ? 1 : 0.92,
    textShadowColor: on ? 'rgba(255,45,149,0.7)' : 'rgba(0,0,0,0.5)',
    textShadowRadius: on ? 6 : 3,
    textShadowOffset: { width: 0, height: 0 },
  }
}
