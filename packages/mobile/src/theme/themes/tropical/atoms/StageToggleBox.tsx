import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import type { ToggleBoxProps } from '../../../types'
import {
  AQUA,
  CREAM,
  LAGOON,
  PAINTED,
  Press,
  Timber,
  lift,
  sans,
  shade,
  tint,
  useUid,
} from './_tropical'

// Tropical mic toggle (Vocal FX / Autotune) — a teak panel with a switch CARVED
// INTO it: a routed channel (dark cut, lit lip) that floods with lagoon water
// when the effect is live, and a turned-wood knob that slides the channel on a
// spring. The label is painted cream on the plank. Every part of it is the
// object doing its job — no decoration that isn't structure.

const TRACK_W = 47
const TRACK_H = 26
const KNOB = 24
const TRAVEL = TRACK_W - KNOB - 4

export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const v = useRef(new Animated.Value(on ? 1 : 0)).current

  useEffect(() => {
    const a = Animated.spring(v, {
      toValue: on ? 1 : 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 220,
      mass: 0.72,
    })
    a.start()
    return () => a.stop()
  }, [on, v])

  return (
    <Press onPress={onPress} scaleTo={0.97} style={[{ flex: 1, borderRadius: 14 }, lift(2)]}>
      <Timber
        radius={14}
        seed={`toggle-${label}`}
        groove
        knot={false}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
          paddingHorizontal: 13,
          paddingVertical: 11,
        }}
      >
        {/* the routed channel */}
        <View style={channelStyle}>
          {/* lagoon floods in from the left as it switches on */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 999,
                overflow: 'hidden',
                opacity: v.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.6, 1] }),
                transform: [
                  { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-TRACK_W * 0.55, 0] }) },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[tint(AQUA, 0.25), LAGOON, shade(LAGOON, 0.2)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ flex: 1 }}
            />
            {/* waterline glint */}
            <View style={{ position: 'absolute', top: 3, left: 6, right: 6, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.45)' }} />
          </Animated.View>

          {/* channel cut shading (over the water so the recess still reads) */}
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 2, right: 2, height: 3.5, borderRadius: 2, backgroundColor: 'rgba(20,9,1,0.28)' }} />
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 3, right: 3, height: 1.5, backgroundColor: 'rgba(255,232,185,0.35)' }} />

          {/* turned-wood knob */}
          <Animated.View
            style={{
              position: 'absolute',
              top: (TRACK_H - KNOB) / 2,
              left: 0,
              transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [2, 2 + TRAVEL] }) }],
            }}
          >
            <WoodKnob size={KNOB} />
          </Animated.View>
        </View>

        <Text style={[sans(14, 'bold', CREAM), PAINTED, { opacity: on ? 1 : 0.75, flexShrink: 1 }]} numberOfLines={1}>
          {label}
        </Text>
      </Timber>
    </Press>
  )
}

/** A little turned-wood drawer knob, lit from the upper left. */
function WoodKnob({ size = 24 }: { size?: number }) {
  const id = useUid('knob')
  return (
    <View style={{ width: size, height: size, ...lift(1) }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`${id}k`} cx="36%" cy="30%" r="80%">
            <Stop offset="0" stopColor="#EFD3A0" />
            <Stop offset="0.5" stopColor="#C99A54" />
            <Stop offset="1" stopColor="#6E4423" />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={47} fill={`url(#${id}k)`} stroke="rgba(43,22,6,0.6)" strokeWidth={3} />
        {/* turning rings */}
        <Circle cx={50} cy={50} r={30} fill="none" stroke="rgba(43,22,6,0.3)" strokeWidth={2.5} />
        <Circle cx={50} cy={50} r={13} fill="rgba(43,22,6,0.22)" />
        <Circle cx={39} cy={35} r={11} fill="rgba(255,244,214,0.5)" />
      </Svg>
    </View>
  )
}

const channelStyle: ViewStyle = {
  width: TRACK_W,
  height: TRACK_H,
  borderRadius: 999,
  backgroundColor: 'rgba(28,13,2,0.42)',
  borderWidth: 1,
  borderColor: 'rgba(30,14,2,0.55)',
  justifyContent: 'center',
}
