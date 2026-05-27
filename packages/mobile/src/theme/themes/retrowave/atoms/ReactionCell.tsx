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
import Svg, { Circle, Defs, RadialGradient, Stop, Line } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useLinearLoop, useOscillator } from '../_shared'
import { ScanlineOverlay } from '../primitives'
import type { ReactionCellProps } from '../../../types'

// Each reaction cell gets its own neon hue — six classic synthwave-poster
// tones cycled by label hash.
const CELL_HUES: { tint: string; second: string; bg: string }[] = [
  { tint: '#FF2D95', second: '#FF7A3B', bg: 'rgba(255,45,149,0.18)' },
  { tint: '#00F0FF', second: '#FF2D95', bg: 'rgba(0,240,255,0.18)' },
  { tint: '#B967FF', second: '#FFE45A', bg: 'rgba(185,103,255,0.18)' },
  { tint: '#FFB13B', second: '#FF003C', bg: 'rgba(255,177,59,0.18)' },
  { tint: '#FF003C', second: '#00F0FF', bg: 'rgba(255,0,60,0.18)' },
  { tint: '#00FF9F', second: '#B967FF', bg: 'rgba(0,255,159,0.18)' },
]

// Retrowave ReactionCell — an arcade-cabinet button panel:
//   • Indigo body with the cell hue's tint wash and a 2px hue-rim that
//     pulses on a slow oscillator.
//   • Faint scanlines.
//   • Travelling diagonal scan band (top-left → bottom-right).
//   • Press fires a hue-tinted ring burst from center.
//   • Top edge has a chrome highlight strip in the cell's hue.
export function RetrowaveReactionCell({
  label,
  icon,
  onPress,
  onEditPress,
  disabled,
}: ReactionCellProps) {
  const { tokens } = useTheme()
  const seedHash = hashKey(label)
  const hue = CELL_HUES[seedHash % CELL_HUES.length]

  const scan = useLinearLoop(6200 + (seedHash % 11) * 220)
  const scanT = scan.interpolate({
    inputRange: [0, 1],
    outputRange: ['-120%', '120%'],
  })

  const breath = useOscillator(2400 + (seedHash % 13) * 200)
  const rimOpacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  })

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
      duration: 580,
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
          cellStyle(hue.tint),
          pressed ? { opacity: 0.85 } : null,
          disabled ? { opacity: 0.4 } : null,
        ]}
      >
        {/* Hue tint wash */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: hue.bg }]} />
        <LinearGradient
          pointerEvents="none"
          colors={[`${hue.tint}33`, 'transparent', `${hue.second}1f`]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Scanlines */}
        <ScanlineOverlay rowGap={3} opacity={0.16} color="#000000" />

        {/* Diagonal scan band */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '40%',
            transform: [{ translateX: scanT }, { rotate: '12deg' }],
          }}
        >
          <LinearGradient
            colors={[`${hue.tint}00`, `${hue.tint}66`, `${hue.tint}00`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>

        {/* Top chrome edge */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: hue.tint,
            opacity: 0.85,
            shadowColor: hue.tint,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 4,
          }}
        />
        {/* Bottom corner notches (arcade trim) */}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 4, left: 4, width: 10, height: 10 }}>
          <Svg width={10} height={10}>
            <Line x1={0} y1={10} x2={10} y2={10} stroke={hue.tint} strokeWidth={1.5} />
            <Line x1={0} y1={4} x2={0} y2={10} stroke={hue.tint} strokeWidth={1.5} />
          </Svg>
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 4, right: 4, width: 10, height: 10 }}>
          <Svg width={10} height={10}>
            <Line x1={0} y1={10} x2={10} y2={10} stroke={hue.tint} strokeWidth={1.5} />
            <Line x1={10} y1={4} x2={10} y2={10} stroke={hue.tint} strokeWidth={1.5} />
          </Svg>
        </View>

        {/* Pulsing rim */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderWidth: 2,
              borderColor: hue.tint,
              opacity: rimOpacity,
            },
          ]}
        />

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={cellIconAreaStyle}>{icon}</View>
          <Text style={cellLabelStyle(tokens, hue.tint)} numberOfLines={1}>
            {label}
          </Text>
        </View>

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {ripples.map((v, i) => (
            <Burst key={i} value={v} color={hue.tint} />
          ))}
        </View>

        {onEditPress ? (
          <Pressable onPress={onEditPress} hitSlop={6} style={cellEditStyle(hue.tint)}>
            <Ionicons name="create-outline" size={12} color={hue.tint} />
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  )
}

function Burst({ value, color }: { value: Animated.Value; color: string }) {
  const scale = value.interpolate({ inputRange: [0, 1], outputRange: [0.1, 2.4] })
  const opacity = value.interpolate({
    inputRange: [0, 0.12, 1],
    outputRange: [0, 0.85, 0],
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
        <Defs>
          <RadialGradient id={`rwCellBurst-${color}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.85} />
            <Stop offset="55%" stopColor={color} stopOpacity={0.5} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={60} cy={60} r={58} fill={`url(#rwCellBurst-${color})`} />
        <Circle cx={60} cy={60} r={50} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7} />
      </Svg>
    </Animated.View>
  )
}

function cellStyle(glowColor: string): ViewStyle {
  return {
    flex: 1,
    backgroundColor: '#1A0A3A',
    borderRadius: 0,
    padding: 12,
    overflow: 'hidden',
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
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
    fontFamily: t.fontBody,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontStyle: 'italic',
    textShadowColor: glowColor,
    textShadowRadius: 7,
    textShadowOffset: { width: 0, height: 0 },
  }
}
function cellEditStyle(tint: string): ViewStyle {
  return {
    position: 'absolute',
    top: 4,
    right: 38,
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: tint,
    backgroundColor: 'rgba(10,4,32,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  }
}
