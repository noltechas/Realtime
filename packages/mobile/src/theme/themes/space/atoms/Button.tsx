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
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { useLinearLoop } from '../_shared'
import type { ButtonProps } from '../../../types'

// Space Button — HUD console button:
//   primary   → magenta gradient fill, void-dark Orbitron caps label
//   secondary → cyan-tinted translucent fill, plasma-cyan label
//   outline   → bare void with magenta rim and label
// Every variant gets four HUD corner brackets so the silhouette always reads
// as part of the space HUD language. Press triggers a quick white ripple from
// the center, then a fast 0.95 scale snap.
export function SpaceButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { tokens } = useTheme()
  const press = useRef(new Animated.Value(0)).current

  // Scan-line travels left→right on a 6s loop — only on primary.
  const scan = useLinearLoop(6000)
  const scanX = scan.interpolate({
    inputRange: [0, 1],
    outputRange: ['-40%', '140%'],
  })

  const triggerPress = () => {
    press.setValue(0)
    Animated.timing(press, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start()
  }

  const isPrimary = variant === 'primary'
  const isSecondary = variant === 'secondary'

  const border = isPrimary
    ? tokens.accentA
    : isSecondary
      ? tokens.accentB
      : tokens.accentA
  const glow = isPrimary
    ? tokens.accentGlowColor
    : isSecondary
      ? tokens.accentB
      : tokens.accentA
  const labelColor = isPrimary
    ? '#08080F'
    : isSecondary
      ? tokens.accentB
      : tokens.black
  const bracketColor = isPrimary ? '#08080F' : isSecondary ? tokens.accentB : tokens.accentA

  const rippleScale = press.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.8] })
  const rippleOpacity = press.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.55, 0],
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
        boxStyle(border, isPrimary, isSecondary, glow),
        disabled || loading ? { opacity: 0.5 } : null,
        pressed ? { transform: [{ scale: 0.97 }] } : null,
      ]}
    >
      {/* Primary fill — magenta gradient */}
      {isPrimary ? (
        <LinearGradient
          colors={['#E040FB', '#9532D6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 6 }]}
        />
      ) : null}
      {isSecondary ? (
        <LinearGradient
          colors={['rgba(64,224,208,0.12)', 'rgba(64,224,208,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 6 }]}
        />
      ) : null}

      {/* Scan line — primary only */}
      {isPrimary ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '30%',
            transform: [{ translateX: scanX }],
          }}
        >
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.18)',
              'rgba(255,255,255,0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>
      ) : null}

      {/* HUD corner brackets — only top-left and bottom-right for a quieter look */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 4, left: 4, width: 8, height: 8 }}
      >
        <View style={{ width: 8, height: 1.5, backgroundColor: bracketColor }} />
        <View style={{ width: 1.5, height: 6, backgroundColor: bracketColor }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          width: 8,
          height: 8,
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}
      >
        <View style={{ width: 1.5, height: 6, backgroundColor: bracketColor }} />
        <View style={{ width: 8, height: 1.5, backgroundColor: bracketColor }} />
      </View>

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
              <RadialGradient id="spaceBtnRipple" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#fff" stopOpacity={0.55} />
                <Stop offset="100%" stopColor="#fff" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={80} cy={80} r={80} fill="url(#spaceBtnRipple)" />
          </Svg>
        </Animated.View>
      </View>

      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={labelStyle(tokens, labelColor)}>{label}</Text>
      )}
    </Pressable>
  )
}

function boxStyle(
  borderColor: string,
  isPrimary: boolean,
  isSecondary: boolean,
  glow: string,
): ViewStyle {
  return {
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 6,
    borderColor,
    backgroundColor: isPrimary
      ? 'transparent'
      : isSecondary
        ? 'transparent'
        : 'rgba(14,14,26,0.7)',
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
    fontSize: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  }
}
