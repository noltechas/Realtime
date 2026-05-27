import React, { useRef } from 'react'
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useLinearLoop, useOscillator } from '../_shared'
import type { ReactionCellProps } from '../../../types'

// Per-cell hue palette — every reaction grid cell gets its own holographic
// rim color and scanline tint so the grid reads as 6 different "HUD windows"
// rather than a uniform stack.
const CELL_HUES: { tint: string; gradient: [string, string]; glow: string }[] = [
  { tint: '#E040FB', gradient: ['#E040FB', '#9532D6'], glow: '#E040FB' },
  { tint: '#40E0D0', gradient: ['#40E0D0', '#2D8FB0'], glow: '#40E0D0' },
  { tint: '#A8C2FF', gradient: ['#A8C2FF', '#5A6AD8'], glow: '#A8C2FF' },
  { tint: '#FFC34D', gradient: ['#FFC34D', '#D88820'], glow: '#FFC34D' },
  { tint: '#FF4060', gradient: ['#FF4060', '#A82040'], glow: '#FF4060' },
  { tint: '#7DFFB5', gradient: ['#7DFFB5', '#3AAB78'], glow: '#7DFFB5' },
]

// Space ReactionCell — a holographic HUD viewport:
//   • Translucent void background with the cell's hue tint as a faint gradient
//     wash, drawn behind everything.
//   • 2px hue-tinted rim with a matching glow.
//   • Two HUD corner brackets at the top corners (the bottom corners are
//     intentionally bare so the label sits clean).
//   • A continuous scan line travels top→bottom (offset per cell so adjacent
//     cells don't sync up).
//   • Press triggers a hue-tinted ripple from the cell center.
export function SpaceReactionCell({
  label,
  icon,
  onPress,
  onEditPress,
  disabled,
}: ReactionCellProps) {
  const { tokens } = useTheme()
  const seedHash = hashKey(label)
  const hue = CELL_HUES[seedHash % CELL_HUES.length]

  // Scan line — period spread per cell.
  const scan = useLinearLoop(5800 + (seedHash % 13) * 240)
  const scanY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10%', '110%'],
  })

  // Faint glow breath on the cell border.
  const breath = useOscillator(2900 + (seedHash % 11) * 220)
  const borderOpacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  })

  // Up to 4 concurrent press ripples.
  const ripples = useRef<Animated.Value[]>([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current
  const nextSlot = useRef(0)

  const triggerRipple = () => {
    const slot = nextSlot.current
    nextSlot.current = (slot + 1) % ripples.length
    const v = ripples[slot]
    v.setValue(0)
    Animated.timing(v, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={() => {
          if (!disabled) {
            triggerRipple()
            onPress()
          }
        }}
        disabled={disabled}
        style={({ pressed }) => [
          cellStyle(hue.glow),
          pressed ? { opacity: 0.85 } : null,
          disabled ? { opacity: 0.4 } : null,
        ]}
      >
        {/* Hue tint wash */}
        <LinearGradient
          pointerEvents="none"
          colors={[`${hue.gradient[0]}30`, 'transparent', `${hue.gradient[1]}1f`]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Scan line */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 1.5,
            transform: [{ translateY: scanY }],
          }}
        >
          <LinearGradient
            colors={[`${hue.tint}00`, `${hue.tint}cc`, `${hue.tint}00`]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>

        {/* HUD top brackets only — keeps the bottom uncluttered for the label */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 4, left: 4, width: 10, height: 10 }}
        >
          <View style={{ width: 10, height: 1.5, backgroundColor: hue.tint }} />
          <View style={{ width: 1.5, height: 8, backgroundColor: hue.tint }} />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 10,
            height: 10,
            alignItems: 'flex-end',
          }}
        >
          <View style={{ width: 10, height: 1.5, backgroundColor: hue.tint }} />
          <View style={{ width: 1.5, height: 8, backgroundColor: hue.tint }} />
        </View>

        {/* Animated rim border on top of everything */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 6,
              borderWidth: 2,
              borderColor: hue.tint,
              opacity: borderOpacity,
            },
          ]}
        />

        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={cellIconAreaStyle}>{icon}</View>
          <Text style={cellLabelStyle(tokens, hue.tint)} numberOfLines={1}>
            {label}
          </Text>
        </View>

        {/* Press ripple */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {ripples.map((v, i) => (
            <RippleCircle key={i} value={v} color={hue.gradient[0]} />
          ))}
        </View>

        {onEditPress ? (
          <Pressable
            onPress={onEditPress}
            hitSlop={6}
            style={cellEditStyle(hue.tint)}
          >
            <Ionicons name="create-outline" size={12} color={hue.tint} />
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  )
}

function RippleCircle({ value, color }: { value: Animated.Value; color: string }) {
  const scale = value.interpolate({ inputRange: [0, 1], outputRange: [0.1, 2.6] })
  const opacity = value.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.7, 0],
  })
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 120,
        height: 120,
        marginLeft: -60,
        marginTop: -60,
        transform: [{ scale }],
        opacity,
      }}
    >
      <Svg width={120} height={120} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={58} fill={color} fillOpacity={0.25} />
        <Circle
          cx={60}
          cy={60}
          r={56}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0.7}
        />
      </Svg>
    </Animated.View>
  )
}

function cellStyle(glowColor: string): ViewStyle {
  return {
    flex: 1,
    backgroundColor: 'rgba(8,8,15,0.45)',
    borderRadius: 6,
    padding: 12,
    overflow: 'hidden',
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  }
}
const cellIconAreaStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
}
function cellLabelStyle(t: ReturnType<typeof useTheme>['tokens'], glowColor: string): TextStyle {
  return {
    textAlign: 'center',
    marginTop: 8,
    fontFamily: t.fontDisplay,
    fontSize: 12,
    color: t.black,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textShadowColor: glowColor,
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  }
}
function cellEditStyle(tint: string): ViewStyle {
  return {
    position: 'absolute',
    top: 4,
    right: 18,
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: tint,
    backgroundColor: 'rgba(8,8,15,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  }
}
