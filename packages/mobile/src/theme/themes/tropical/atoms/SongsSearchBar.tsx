import React, { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, TextInput, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import type { SongsSearchBarProps } from '../../../types'
import {
  AQUA,
  FAINT,
  INK,
  LAGOON,
  Press,
  Timber,
  alpha,
  lift,
  sans,
  shade,
  tint,
} from './_tropical'

// Tropical search — a teak board with a paper field ROUTED INTO it (the paper
// sits in a recess: inner top shadow + lit bottom lip, like a real inlay). The
// magnifier is a glossy lagoon bead button. Focus doesn't swap styles — an aqua
// enamel ring brushes in around the recess while the bead brightens; a clear
// button springs in only once there's something to clear.

const H = 54
const RADIUS = 16

export function SongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  const [focused, setFocused] = useState(false)
  const f = useRef(new Animated.Value(0)).current
  const c = useRef(new Animated.Value(value ? 1 : 0)).current

  useEffect(() => {
    const a = Animated.timing(f, { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: true })
    a.start()
    return () => a.stop()
  }, [focused, f])

  useEffect(() => {
    const a = Animated.spring(c, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      damping: 13,
      stiffness: 210,
      mass: 0.7,
    })
    a.start()
    return () => a.stop()
  }, [value, c])

  return (
    <View style={[{ borderRadius: RADIUS }, lift(2)]}>
      <Timber radius={RADIUS} seed="searchbar" knot={false} style={{ height: H, justifyContent: 'center', paddingHorizontal: 7 }}>
        {/* the routed paper recess */}
        <View
          style={{
            height: H - 14,
            borderRadius: 11,
            backgroundColor: '#FFFDF4',
            borderWidth: 1,
            borderColor: 'rgba(43,22,6,0.5)',
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: 5,
            paddingRight: 6,
            gap: 9,
            overflow: 'hidden',
          }}
        >
          {/* recess shading: shadow falls in from the top, light lips the bottom */}
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(43,22,6,0.12)' }} />
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(255,255,255,0.9)' }} />

          {/* focus enamel ring */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: 11, borderWidth: 2, borderColor: alpha(AQUA, 0.85), opacity: f },
            ]}
          />

          {/* glossy lagoon bead magnifier */}
          <Animated.View
            style={{
              transform: [{ scale: f.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }],
            }}
          >
            <MagnifierBead size={32} />
          </Animated.View>

          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search songs or artists"
            placeholderTextColor={FAINT}
            style={[sans(15, 'semi', INK), { flex: 1, padding: 0 }]}
            autoCorrect={false}
            returnKeyType="search"
          />

          <Animated.View style={{ opacity: c, transform: [{ scale: c }] }}>
            <Press
              onPress={() => onChangeText('')}
              hitSlop={10}
              scaleTo={0.82}
              disabled={!value}
              accessibilityLabel="Clear search"
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: 'rgba(18,58,51,0.09)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Svg width={12} height={12} viewBox="0 0 12 12">
                <Path d="M2.5 2.5 9.5 9.5 M9.5 2.5 2.5 9.5" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
              </Svg>
            </Press>
          </Animated.View>
        </View>
      </Timber>
    </View>
  )
}

/** A dimensionally-lit lagoon bead with a crisp magnifier glyph. */
function MagnifierBead({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={52} r={44} fill={shade(LAGOON, 0.32)} />
      <Circle cx={50} cy={48} r={44} fill={LAGOON} />
      <Circle cx={50} cy={48} r={44} fill="none" stroke={tint(LAGOON, 0.4)} strokeWidth={2} opacity={0.7} />
      {/* specular */}
      <Circle cx={36} cy={33} r={13} fill="rgba(255,255,255,0.35)" />
      <Circle cx={33} cy={30} r={6} fill="rgba(255,255,255,0.5)" />
      {/* magnifier */}
      <Circle cx={45} cy={44} r={15} stroke="#FFFFFF" strokeWidth={7} fill="none" />
      <Path d="M56 56 68 68" stroke="#FFFFFF" strokeWidth={8} strokeLinecap="round" />
    </Svg>
  )
}
