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
import { AMBER, PARCH_DIM, IRON_PANEL, HAIRLINE, HAIRLINE_SOFT } from './_steam'
import type { ReactionCellProps } from '../../../types'

// Steampunk ReactionCell — one key of a telegraph keyboard. Every cell is the
// SAME quiet iron plate (a professional instrument panel is uniform — the
// icons carry the variety), with an engraved inner rule and a small brass
// indicator dot that flares amber when the key is struck. Press releases a
// soft gas-burst from center.
export function SteampunkReactionCell({
  label,
  icon,
  onPress,
  onEditPress,
  disabled,
}: ReactionCellProps) {
  const { tokens } = useTheme()

  // Two ripple slots so rapid taps can overlap.
  const ripples = useRef<Animated.Value[]>([new Animated.Value(0), new Animated.Value(0)]).current
  const nextSlot = useRef(0)
  const triggerRipple = () => {
    const slot = nextSlot.current
    nextSlot.current = (slot + 1) % ripples.length
    const v = ripples[slot]
    v.setValue(0)
    Animated.timing(v, { toValue: 1, duration: 560, useNativeDriver: true }).start()
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
          cellStyle,
          pressed ? { borderColor: HAIRLINE, transform: [{ translateY: 1 }] } : null,
          disabled ? { opacity: 0.4 } : null,
        ]}
      >
        {/* engraved inner rule */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { margin: 3, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(232,169,59,0.08)' },
          ]}
        />
        {/* glass light along the top */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(236,203,130,0.06)', 'rgba(236,203,130,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 20 }}
        />

        {/* brass indicator dot */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: 'rgba(200,151,62,0.55)',
          }}
        />

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
          <Text style={labelStyle(tokens.fontDisplay)} numberOfLines={1}>
            {label}
          </Text>
        </View>

        {/* gas-burst on press */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {ripples.map((v, i) => (
            <Burst key={i} value={v} />
          ))}
        </View>

        {onEditPress ? (
          <Pressable onPress={onEditPress} hitSlop={6} style={editStyle}>
            <Ionicons name="create-outline" size={12} color={AMBER} />
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  )
}

function Burst({ value }: { value: Animated.Value }) {
  const scale = value.interpolate({ inputRange: [0, 1], outputRange: [0.15, 2.1] })
  const opacity = value.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.6, 0] })
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 110,
        height: 110,
        marginLeft: -55,
        marginTop: -55,
        transform: [{ scale }],
        opacity,
      }}
    >
      <Svg width={110} height={110} viewBox="0 0 110 110">
        <Defs>
          <RadialGradient id="cell-burst" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFE4A0" stopOpacity={0.8} />
            <Stop offset="55%" stopColor={AMBER} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={55} cy={55} r={53} fill="url(#cell-burst)" />
      </Svg>
    </Animated.View>
  )
}

const cellStyle: ViewStyle = {
  flex: 1,
  backgroundColor: IRON_PANEL,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: HAIRLINE_SOFT,
  padding: 12,
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 7,
  elevation: 4,
}

function labelStyle(fontDisplay: string): TextStyle {
  return {
    textAlign: 'center',
    marginTop: 8,
    fontFamily: fontDisplay,
    fontSize: 10.5,
    color: PARCH_DIM,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    includeFontPadding: false,
  }
}

const editStyle: ViewStyle = {
  position: 'absolute',
  top: 5,
  left: 5,
  width: 22,
  height: 22,
  borderRadius: 5,
  borderWidth: 1,
  borderColor: HAIRLINE_SOFT,
  backgroundColor: 'rgba(13,8,5,0.75)',
  alignItems: 'center',
  justifyContent: 'center',
}
