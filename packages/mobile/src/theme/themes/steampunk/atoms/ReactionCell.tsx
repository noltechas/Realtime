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
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { useLinearLoop, useOscillator } from '../_shared'
import { Gear, Rivet } from '../Gear'
import type { ReactionCellProps } from '../../../types'

// Per-cell hue palette — each reaction is a different patinated metal:
// polished brass, oxidised verdigris, aged copper, gun-blue steel, walnut,
// and ivory bone. Each cell gets its own color-coded rivet and gear tint.
const CELL_HUES: { tint: string; gradient: [string, string]; glow: string; gearBody: string }[] = [
  { tint: '#E8A93B', gradient: ['#E8C078', '#B8762D'], glow: '#E8A93B', gearBody: '#B8762D' },
  { tint: '#5C8A7A', gradient: ['#8AB5A0', '#5C8A7A'], glow: '#8AB5A0', gearBody: '#5C8A7A' },
  { tint: '#C97D3E', gradient: ['#F0A058', '#C97D3E'], glow: '#F0A058', gearBody: '#C97D3E' },
  { tint: '#7A8FB5', gradient: ['#A8B8D8', '#5C6E90'], glow: '#A8B8D8', gearBody: '#5C6E90' },
  { tint: '#8B2E1F', gradient: ['#C95A45', '#8B2E1F'], glow: '#C95A45', gearBody: '#8B2E1F' },
  { tint: '#D8C098', gradient: ['#F0DDB5', '#A88555'], glow: '#F0DDB5', gearBody: '#A88555' },
]

// Steampunk ReactionCell — a riveted brass panel switchplate. Each cell
// houses a single push-button mechanism:
//   • Mahogany base with a colored brass rim in the cell's hue.
//   • Four corner rivets in the matching metal.
//   • A small rotating gear in the top-right corner — different period per
//     cell so the panel as a whole reads as a working clockwork array.
//   • A faint cell-tinted glow.
//   • Press triggers an amber gas-burst from center + a small concentric ring.
export function SteampunkReactionCell({
  label,
  icon,
  onPress,
  onEditPress,
  disabled,
}: ReactionCellProps) {
  const { tokens } = useTheme()
  const seedHash = hashKey(label)
  const hue = CELL_HUES[seedHash % CELL_HUES.length]

  // Gear spin
  const spin = useLinearLoop(7400 + (seedHash % 13) * 240)
  const rot = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Filament breath on the rim
  const breath = useOscillator(2700 + (seedHash % 11) * 220)
  const breathOpacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  })

  // Press ripples
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
      duration: 620,
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
        {/* Mahogany base */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#2A1A0E' }]}
        />

        {/* Hue tint wash — colored brass light from above */}
        <LinearGradient
          pointerEvents="none"
          colors={[`${hue.gradient[0]}40`, 'transparent', `${hue.gradient[1]}20`]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Bottom warm gas-lamp glow */}
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', 'rgba(232,169,59,0.10)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Corner rivets in the cell hue */}
        <View style={{ position: 'absolute', top: 4, left: 4 }}>
          <Rivet size={8} color={hue.tint} highlight="#F0DDB5" shadow="#3E2810" />
        </View>
        <View style={{ position: 'absolute', top: 4, right: 4 }}>
          <Rivet size={8} color={hue.tint} highlight="#F0DDB5" shadow="#3E2810" />
        </View>
        <View style={{ position: 'absolute', bottom: 4, left: 4 }}>
          <Rivet size={8} color={hue.tint} highlight="#F0DDB5" shadow="#3E2810" />
        </View>
        <View style={{ position: 'absolute', bottom: 4, right: 4 }}>
          <Rivet size={8} color={hue.tint} highlight="#F0DDB5" shadow="#3E2810" />
        </View>

        {/* Small spinning gear in the top-right */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 18,
            height: 18,
            opacity: 0.55,
            transform: [{ rotate: rot }],
          }}
        >
          <Gear
            size={18}
            teeth={8}
            bodyColor={hue.gearBody}
            edgeColor="#3E2810"
            hubColor="#2A1808"
            highlightColor={hue.gradient[0]}
          />
        </Animated.View>

        {/* Pulsing rim border */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 6,
              borderWidth: 2,
              borderColor: hue.tint,
              opacity: breathOpacity,
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

        {/* Press ripple — gas-burst from center */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {ripples.map((v, i) => (
            <Burst key={i} value={v} color={hue.gradient[0]} />
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
          <RadialGradient id={`steam-burst-${color}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFE4A0" stopOpacity={0.9} />
            <Stop offset="55%" stopColor={color} stopOpacity={0.4} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={60} cy={60} r={58} fill={`url(#steam-burst-${color})`} />
        <Circle cx={60} cy={60} r={50} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />
      </Svg>
    </Animated.View>
  )
}

function cellStyle(glowColor: string): ViewStyle {
  return {
    flex: 1,
    backgroundColor: '#2A1A0E',
    borderRadius: 6,
    padding: 12,
    overflow: 'hidden',
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
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
    fontFamily: t.fontDisplay,
    fontSize: 12,
    color: '#F0DDB5',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textShadowColor: glowColor,
    textShadowRadius: 5,
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
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: tint,
    backgroundColor: 'rgba(31,17,8,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  }
}
