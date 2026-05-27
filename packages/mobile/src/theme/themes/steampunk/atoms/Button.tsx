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
import Svg, { Defs, RadialGradient, Stop, Circle, Path } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { useOscillator } from '../_shared'
import { Rivet } from '../Gear'
import type { ButtonProps } from '../../../types'

// Steampunk Button — a brass riveted plate:
//   primary   → polished brass gradient fill, four corner rivets, dark
//               engraved Cinzel label, amber gas-lamp glow underglow.
//   secondary → verdigris (oxidised teal) brass plate, copper rivets.
//   outline   → bare mahogany with brass rim and label, no rivets.
// Press triggers an Edison-bulb amber pulse from the button's center —
// like a pneumatic switch firing a brass solenoid.
export function SteampunkButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { tokens } = useTheme()
  const press = useRef(new Animated.Value(0)).current

  // Slow filament breath on primary buttons — the brass plate has an Edison
  // glow that pulses on a 4s sine.
  const filament = useOscillator(3800)
  const filamentOpacity = filament.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  })

  const triggerPress = () => {
    press.setValue(0)
    Animated.timing(press, {
      toValue: 1,
      duration: 460,
      useNativeDriver: true,
    }).start()
  }

  const isPrimary = variant === 'primary'
  const isSecondary = variant === 'secondary'

  const plateGradient: [string, string, string] = isPrimary
    ? ['#E8C078', '#B8762D', '#7A4D1A']
    : isSecondary
      ? ['#8AB5A0', '#5C8A7A', '#2E4640']
      : ['#3E2810', '#2A1808', '#1A0E04']
  const rimColor = isPrimary ? '#E8A93B' : isSecondary ? '#5C8A7A' : '#B8762D'
  const labelColor = isPrimary
    ? '#1F1108'
    : isSecondary
      ? '#0E1F18'
      : '#E8C9A0'
  const glowColor = isPrimary ? '#E8A93B' : isSecondary ? '#5C8A7A' : '#B8762D'

  const rippleScale = press.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.7] })
  const rippleOpacity = press.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.65, 0],
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
      {/* Plate fill — diagonal brass gradient */}
      <LinearGradient
        colors={plateGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill, { borderRadius: 4 }]}
      />

      {/* Brushed-metal horizontal sheen — a thin lighter band across the
          middle gives the brass a polished hammered look. */}
      {(isPrimary || isSecondary) ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '38%',
            left: 0,
            right: 0,
            height: 2,
            opacity: 0.5,
          }}
        >
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              isPrimary ? 'rgba(255,235,180,0.7)' : 'rgba(220,255,240,0.55)',
              'rgba(255,255,255,0)',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ width: '100%', height: '100%' }}
          />
        </View>
      ) : null}

      {/* Engraved bevel — inset dark line just inside the rim, gives the
          plate the "stamped" feel. */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            margin: 4,
            borderRadius: 2,
            borderWidth: 1,
            borderColor: isPrimary
              ? 'rgba(58,30,8,0.55)'
              : isSecondary
                ? 'rgba(20,40,32,0.55)'
                : 'rgba(184,118,45,0.35)',
          },
        ]}
      />

      {/* Corner rivets — primary + secondary plates only */}
      {(isPrimary || isSecondary) ? (
        <>
          <View style={{ position: 'absolute', top: 5, left: 5 }}>
            <Rivet size={9} />
          </View>
          <View style={{ position: 'absolute', top: 5, right: 5 }}>
            <Rivet size={9} />
          </View>
          <View style={{ position: 'absolute', bottom: 5, left: 5 }}>
            <Rivet size={9} />
          </View>
          <View style={{ position: 'absolute', bottom: 5, right: 5 }}>
            <Rivet size={9} />
          </View>
        </>
      ) : null}

      {/* Edison-bulb filament underglow — primary only */}
      {isPrimary ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: filamentOpacity }]}
        >
          <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 40">
            <Defs>
              <RadialGradient id="btnFilament" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#FFE4A0" stopOpacity={0.45} />
                <Stop offset="100%" stopColor="#FFE4A0" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Path d="M 0 20 H 100" stroke="url(#btnFilament)" strokeWidth={14} fill="none" />
          </Svg>
        </Animated.View>
      ) : null}

      {/* Pneumatic press ripple */}
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
              <RadialGradient id="steamBtnRipple" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FFE4A0" stopOpacity={0.85} />
                <Stop offset="60%" stopColor="#E8A93B" stopOpacity={0.4} />
                <Stop offset="100%" stopColor="#E8A93B" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={80} cy={80} r={80} fill="url(#steamBtnRipple)" />
          </Svg>
        </Animated.View>
      </View>

      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={labelStyle(tokens, labelColor, isPrimary)}>{label}</Text>
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
    borderWidth: 2,
    borderRadius: 4,
    borderColor: rimColor,
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 10,
    overflow: 'hidden',
  }
}

function labelStyle(t: ReturnType<typeof useTheme>['tokens'], color: string, primary: boolean): TextStyle {
  return {
    color,
    fontFamily: t.fontDisplay,
    fontSize: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    textShadowColor: primary ? 'rgba(232,196,120,0.6)' : 'rgba(0,0,0,0.45)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  }
}
