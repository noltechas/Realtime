import React, { useRef } from 'react'
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  Animated,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { useOscillator, useLinearLoop } from '../_shared'
import { NeonText } from '../primitives'
import type { ButtonProps } from '../../../types'

// Retrowave Button — three variants:
//   primary   → polished chrome plate (silver→pink gradient) with a hot-pink
//               italic neon-tube label and a strong pink/cyan dual halo.
//   secondary → translucent indigo with cyan rim + cyan label.
//   outline   → bare indigo, magenta hairline rim, lavender label.
// All variants get a thin top-edge highlight (the chrome reflection band) and
// a sliding scanline that creeps across the body. Press fires a hot-pink
// gas-burst ripple from the button center.
export function RetrowaveButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { tokens } = useTheme()
  const press = useRef(new Animated.Value(0)).current

  // Slow scan across the chrome — primary only.
  const scan = useLinearLoop(5400)
  const scanX = scan.interpolate({
    inputRange: [0, 1],
    outputRange: ['-40%', '140%'],
  })

  // Neon flicker — subtle 200ms-period jitter on the rim glow.
  const flicker = useOscillator(2200)
  const rimOpacity = flicker.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  })

  const triggerPress = () => {
    press.setValue(0)
    Animated.timing(press, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start()
  }

  const isPrimary = variant === 'primary'
  const isSecondary = variant === 'secondary'

  const rimColor = isPrimary ? '#FF2D95' : isSecondary ? '#00F0FF' : '#B967FF'
  const glowColor = rimColor
  const fillColors: [string, string, string] = isPrimary
    ? ['#FFB5DE', '#FF2D95', '#5A0838']
    : isSecondary
      ? ['rgba(0,240,255,0.18)', 'rgba(0,240,255,0.05)', 'rgba(10,4,32,0.85)']
      : ['rgba(185,103,255,0.06)', 'rgba(10,4,32,0.85)', 'rgba(10,4,32,0.95)']
  const labelColor = isPrimary ? '#0A0420' : isSecondary ? '#B5F5FF' : '#F4E8FF'

  const rippleScale = press.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.7] })
  const rippleOpacity = press.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.7, 0],
  })

  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return
        triggerPress()
        onPress()
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        boxStyle(rimColor, glowColor),
        disabled || loading ? { opacity: 0.5 } : null,
        pressed ? { transform: [{ scale: 0.97 }] } : null,
      ]}
    >
      {/* Plate fill */}
      <LinearGradient
        colors={fillColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill]}
      />

      {/* Top edge chrome highlight band */}
      {isPrimary ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
          }}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.85)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ width: '100%', height: '100%' }}
          />
        </View>
      ) : null}

      {/* Animated scan across the chrome — primary only */}
      {isPrimary ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '35%',
            transform: [{ translateX: scanX }],
          }}
        >
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.5)',
              'rgba(255,255,255,0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>
      ) : null}

      {/* Press ripple */}
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
              <RadialGradient id="rwBtnRipple" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.85} />
                <Stop offset="55%" stopColor="#FF2D95" stopOpacity={0.55} />
                <Stop offset="100%" stopColor="#FF2D95" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={80} cy={80} r={80} fill="url(#rwBtnRipple)" />
          </Svg>
        </Animated.View>
      </View>

      {/* Animated rim glow overlay on top */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderWidth: 1.5, borderColor: rimColor, opacity: rimOpacity },
        ]}
      />

      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : isPrimary ? (
        <Text style={labelStyle(tokens, labelColor)}>{label}</Text>
      ) : (
        <NeonText
          style={labelStyle(tokens, labelColor)}
          pinkColor="#FF2D95"
          cyanColor="#00F0FF"
          centerColor={labelColor}
          fringe={1.0}
        >
          {label}
        </NeonText>
      )}
    </Pressable>
  )
}

function boxStyle(rimColor: string, glowColor: string): ViewStyle {
  return {
    paddingVertical: 14,
    paddingHorizontal: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderRadius: 0,
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 12,
    overflow: 'hidden',
  }
}
function labelStyle(t: ReturnType<typeof useTheme>['tokens'], color: string): TextStyle {
  return {
    color,
    fontFamily: t.fontBody,
    fontSize: 14,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  }
}
