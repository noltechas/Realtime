import React, { useRef } from 'react'
import {
  Pressable,
  Text,
  ActivityIndicator,
  Animated,
  View,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { blobCornerRadii, hashKey } from '../../../helpers'
import { useOscillator } from '../_shared'
import type { ButtonProps } from '../../../types'

// Psychedelic Button — blob-cornered, with a continuous hot-pink halo for
// primary, a lime halo for secondary, and a tangerine outline for outline.
// Press triggers a quick scale-down + a soft ripple from the pressed point at
// the button center.
//
//   primary   → hot-pink fill, lavender-white Chicle label
//   secondary → translucent dark fill, lime border + label
//   outline   → transparent fill, tangerine border + label
export function PsychedelicButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { tokens } = useTheme()
  const shape = blobCornerRadii(hashKey(label))
  const press = useRef(new Animated.Value(0)).current
  // Continuous breath — every interactive surface in the psychedelic theme
  // pulses (no Y translation). Period spread is wide (2600-5400ms) and seeded
  // by the label hash so adjacent buttons never share a phase.
  const breath = useOscillator(2600 + (hashKey(label) % 14) * 200)
  const breathScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1.035],
  })

  const triggerPress = () => {
    press.setValue(0)
    Animated.timing(press, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start()
  }

  const bg =
    variant === 'primary'
      ? 'rgba(255,45,149,0.85)'
      : variant === 'secondary'
      ? 'rgba(182,255,45,0.12)'
      : 'transparent'
  const border =
    variant === 'primary'
      ? tokens.accentA
      : variant === 'secondary'
      ? tokens.accentB
      : tokens.accentC
  const glow =
    variant === 'primary'
      ? tokens.accentGlowColor
      : variant === 'secondary'
      ? tokens.accentB
      : tokens.accentC
  const labelColor =
    variant === 'primary'
      ? '#fff'
      : variant === 'secondary'
      ? tokens.accentB
      : tokens.accentC

  const rippleScale = press.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.8] })
  const rippleOpacity = press.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.55, 0],
  })

  return (
    <Animated.View style={{ transform: [{ scale: breathScale }] }}>
    <Pressable
      onPress={() => {
        if (disabled || loading) return
        triggerPress()
        onPress()
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        shape,
        boxStyle(border, bg, glow),
        disabled || loading ? { opacity: 0.5 } : null,
        pressed ? { transform: [{ scale: 0.97 }] } : null,
      ]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Animated.View
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 160,
            height: 160,
            marginLeft: -80,
            marginTop: -80,
            transform: [{ scale: rippleScale }],
            opacity: rippleOpacity,
          }}
        >
          <Svg width={160} height={160} viewBox="0 0 160 160">
            <Defs>
              <RadialGradient id="psyBtnRipple" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                <Stop offset="0%" stopColor="#fff" stopOpacity={0.55} />
                <Stop offset="100%" stopColor="#fff" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={80} cy={80} r={80} fill="url(#psyBtnRipple)" />
          </Svg>
        </Animated.View>
      </View>

      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={labelStyle(tokens, labelColor)}>{label}</Text>
      )}
    </Pressable>
    </Animated.View>
  )
}

function boxStyle(borderColor: string, bg: string, glow: string): ViewStyle {
  return {
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor,
    backgroundColor: bg,
    shadowColor: glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    overflow: 'hidden',
  }
}
function labelStyle(t: ReturnType<typeof useTheme>['tokens'], color: string): TextStyle {
  return {
    color,
    fontFamily: t.fontDisplay,
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  }
}
