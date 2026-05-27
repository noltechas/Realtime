import React from 'react'
import { View, TextInput, Animated, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Path, G, Defs, RadialGradient, Stop } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { useLinearLoop, useOscillator } from '../_shared'
import { Rivet } from '../Gear'
import type { SongsSearchBarProps } from '../../../types'

// Steampunk search bar — a brass-plated magnifying-glass console:
//   • Mahogany input body with a thick brass rim and four corner rivets.
//   • The leading glyph is a brass magnifying loupe with a swinging
//     chain underneath. The loupe's lens has a faint amber refraction
//     that pulses on a 2.4s gas-lamp oscillator.
//   • Bottom edge has a thin engraved scrollwork line — a single SVG arc
//     pair (left + right) that gives the bar Victorian filigree without
//     being visually heavy.
export const SteampunkSongsSearchBar = React.memo(SteampunkSongsSearchBarImpl)

function SteampunkSongsSearchBarImpl({ value, onChangeText }: SongsSearchBarProps) {
  const { tokens } = useTheme()

  // Loupe glass shine
  const shine = useOscillator(2400)
  const shineOpacity = shine.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  })

  // Magnifier chain swing — gentle pendulum
  const chain = useLinearLoop(3800)
  const chainRot = chain.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-4deg', '4deg', '-4deg'],
  })

  return (
    <View style={{ position: 'relative' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#1A0E04',
          borderWidth: 2,
          borderColor: '#B8762D',
          borderRadius: 6,
          paddingHorizontal: 16,
          paddingVertical: 12,
          overflow: 'hidden',
          shadowColor: '#E8A93B',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 8,
        }}
      >
        {/* Warm amber tint from below — gas-lamp under the workbench */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(232,169,59,0.03)',
            'rgba(184,118,45,0.06)',
            'rgba(232,169,59,0.10)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Corner rivets */}
        <View style={{ position: 'absolute', top: 3, left: 3 }}><Rivet size={8} /></View>
        <View style={{ position: 'absolute', top: 3, right: 3 }}><Rivet size={8} /></View>
        <View style={{ position: 'absolute', bottom: 3, left: 3 }}><Rivet size={8} /></View>
        <View style={{ position: 'absolute', bottom: 3, right: 3 }}><Rivet size={8} /></View>

        {/* Filigree along the bottom */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', bottom: 1, left: 24, right: 24, height: 6 }}
        >
          <Svg width="100%" height="6" viewBox="0 0 200 6" preserveAspectRatio="none">
            <Path
              d="M 0 3 Q 25 0 50 3 Q 75 6 100 3 Q 125 0 150 3 Q 175 6 200 3"
              stroke="#B8762D"
              strokeWidth={0.8}
              fill="none"
              opacity={0.55}
            />
          </Svg>
        </View>

        {/* Magnifier glyph + swinging chain */}
        <Animated.View
          style={{
            marginRight: 12,
            width: 26,
            height: 26,
            transform: [{ rotate: chainRot }],
          }}
        >
          <Svg width={26} height={26} viewBox="0 0 26 26">
            <Defs>
              <RadialGradient id="loupeGlass" cx="35%" cy="32%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor="#FFE4A0" stopOpacity={0.55} />
                <Stop offset="60%" stopColor="#C9A878" stopOpacity={0.2} />
                <Stop offset="100%" stopColor="#3E2810" stopOpacity={0.4} />
              </RadialGradient>
            </Defs>
            {/* Lens glass interior */}
            <Circle cx={11} cy={11} r={7.5} fill="url(#loupeGlass)" />
            {/* Outer brass ring */}
            <Circle cx={11} cy={11} r={8.5} fill="none" stroke="#B8762D" strokeWidth={2} />
            <Circle cx={11} cy={11} r={6.2} fill="none" stroke="#7A4D1A" strokeWidth={0.6} opacity={0.7} />
            {/* Handle */}
            <Path d="M 17 17 L 23 23" stroke="#B8762D" strokeWidth={3} strokeLinecap="round" />
            <Path d="M 17 17 L 23 23" stroke="#E8C078" strokeWidth={1} strokeLinecap="round" opacity={0.8} />
          </Svg>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              width: 16,
              height: 16,
              borderRadius: 8,
              opacity: shineOpacity,
            }}
          >
            <Svg width={16} height={16}>
              <Defs>
                <RadialGradient id="loupeShine" cx="30%" cy="25%" rx="50%" ry="50%">
                  <Stop offset="0%" stopColor="#FFF4D0" stopOpacity={0.95} />
                  <Stop offset="100%" stopColor="#FFF4D0" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={6} cy={5} r={4} fill="url(#loupeShine)" />
            </Svg>
          </Animated.View>
        </Animated.View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Inspect the archive…"
          placeholderTextColor="#7A5A3A"
          style={{
            flex: 1,
            fontFamily: tokens.fontBody,
            fontSize: 15,
            color: '#E8C9A0',
            padding: 0,
            letterSpacing: 0.5,
          }}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  )
}
