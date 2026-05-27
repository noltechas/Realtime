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
import { useOscillator } from '../_shared'
import type { ReactionCellProps } from '../../../types'

// ── Per-cell hue palette ────────────────────────────────────────────────────
// Each reaction grid cell gets its OWN psychedelic color: a top→bottom
// gradient stroke that paints a distinct identity (and reads as one of the
// classic psy-poster gem tones). Color is picked deterministically from the
// label hash so the same label always lands on the same hue.
const CELL_HUES: { tint: string; gradient: [string, string]; glow: string }[] = [
  // hot pink → tangerine
  { tint: '#ff2d95', gradient: ['#ff2d95', '#ff8c2d'], glow: '#ff2d95' },
  // tangerine → acid yellow
  { tint: '#ff8c2d', gradient: ['#ff8c2d', '#ffd84d'], glow: '#ff8c2d' },
  // lime → cyan
  { tint: '#b6ff2d', gradient: ['#b6ff2d', '#2dd9ff'], glow: '#b6ff2d' },
  // cyan → violet
  { tint: '#2dd9ff', gradient: ['#2dd9ff', '#952dff'], glow: '#2dd9ff' },
  // violet → magenta
  { tint: '#952dff', gradient: ['#952dff', '#ff2dff'], glow: '#952dff' },
  // magenta → pink
  { tint: '#ff2dff', gradient: ['#ff2dff', '#ff2d95'], glow: '#ff2dff' },
]

// Psychedelic ReactionCell — barely-there background + a vibrant 2px gradient
// rim in a per-label hue. The cell reads as a glowing colored window rather
// than an opaque chip. Press triggers a colored ripple that matches the
// cell's tint. Each cell breathes (scale only) at its own period.
export function PsychedelicReactionCell({
  label,
  icon,
  onPress,
  onEditPress,
  disabled,
}: ReactionCellProps) {
  const { tokens } = useTheme()
  const seedHash = hashKey(label)
  const hue = CELL_HUES[seedHash % CELL_HUES.length]

  // Idle breath, staggered period per cell.
  const breath = useOscillator(2800 + (seedHash % 13) * 200)
  const breathScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.04],
  })

  // Up to 4 concurrent press ripples. Each is its own Animated.Value with
  // a 0→1 timing on press; opacity + scale interpolate from the value.
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
    <Animated.View style={{ flex: 1, transform: [{ scale: breathScale }] }}>
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
        {/* Soft inner glow tint — a single radial-ish gradient pad at very
            low alpha so the cell reads as a glowing window in its hue,
            without being heavy/opaque. */}
        <LinearGradient
          pointerEvents="none"
          colors={[`${hue.gradient[0]}26`, 'transparent', `${hue.gradient[1]}1a`]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
        />

        {/* Gradient rim — drawn as a stack of two LinearGradients clipped
            inside an absoluteFill ring. (RN can't set a gradient border
            directly; we fake it by laying a gradient on top with a
            transparent center that lets the inner background show through.) */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 22,
              borderWidth: 2,
              borderColor: hue.tint,
              opacity: 0.85,
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

        {/* Press ripple in the cell's hue. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {ripples.map((v, i) => (
            <RippleCircle key={i} value={v} color={hue.gradient[0]} />
          ))}
        </View>

        {onEditPress ? (
          <Pressable
            onPress={onEditPress}
            hitSlop={6}
            style={cellEditStyle(tokens, hue.tint)}
          >
            <Ionicons name="create-outline" size={12} color={hue.tint} />
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  )
}

function RippleCircle({ value, color }: { value: Animated.Value; color: string }) {
  const scale = value.interpolate({ inputRange: [0, 1], outputRange: [0.1, 2.4] })
  const opacity = value.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.65, 0],
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
        <Circle cx={60} cy={60} r={58} fill={color} fillOpacity={0.22} />
        <Circle cx={60} cy={60} r={56} fill="none" stroke={color} strokeWidth={1.5} opacity={0.65} />
      </Svg>
    </Animated.View>
  )
}

function cellStyle(glowColor: string): ViewStyle {
  return {
    flex: 1,
    // Nearly transparent — lets the backdrop blobs read through, so the cell
    // feels like a colored lens rather than a heavy panel. Per request, the
    // background should not be opaque.
    backgroundColor: 'rgba(26,10,46,0.32)',
    borderRadius: 22,
    padding: 12,
    overflow: 'hidden',
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
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
    fontSize: 14,
    color: t.black,
    textShadowColor: glowColor,
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  }
}
function cellEditStyle(t: ReturnType<typeof useTheme>['tokens'], tint: string): ViewStyle {
  return {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tint,
    backgroundColor: 'rgba(26,10,46,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  }
}
