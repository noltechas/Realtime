import React from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg'
import { CANDY, PINK, RetroText, SUN, SUN_HI, Twinkle, WHITE, script, useEnter, useLoop } from './_barbie'

// Barbie "You're Up": your moment in the sun. A sunburst turns behind the
// words, the words are sign-painted in Barbie pink, a brush-script "grab the
// mic" sits over them, and the twinkles wink in and out around it.
export function YoureUpHero() {
  const turn = useLoop(40000, 0, false)
  const { opacity, translateY, scale } = useEnter(0)
  const W = 300
  const H = 150
  return (
    <Animated.View style={{ alignSelf: 'center', width: W, height: H, alignItems: 'center', justifyContent: 'center', opacity, transform: [{ translateY }, { scale }] }}>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: (W - 320) / 2, top: (H - 320) / 2, width: 320, height: 320, transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}
      >
        <Svg width={320} height={320} viewBox="-100 -100 200 200">
          <Defs>
            <RadialGradient id="byup-ray" cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={SUN_HI} stopOpacity={0.95} />
              <Stop offset="0.5" stopColor={SUN_HI} stopOpacity={0.4} />
              <Stop offset="0.85" stopColor={SUN_HI} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {Array.from({ length: 20 }, (_, i) => {
            const a0 = (i / 20) * Math.PI * 2
            const a1 = a0 + Math.PI / 20
            return <Path key={i} d={`M 0 0 L ${Math.cos(a0) * 100} ${Math.sin(a0) * 100} L ${Math.cos(a1) * 100} ${Math.sin(a1) * 100} Z`} fill="url(#byup-ray)" />
          })}
        </Svg>
      </Animated.View>
      <Text style={script(30, WHITE, { marginBottom: -10, textShadowColor: PINK, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0, transform: [{ rotate: '-5deg' }] })}>grab the mic</Text>
      <RetroText size={48} align="center">{"You're up!"}</RetroText>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Twinkle size={24} color={SUN} delay={0} period={2400} style={{ position: 'absolute', left: 12, top: 30 }} />
        <Twinkle size={18} color={WHITE} delay={900} period={2600} style={{ position: 'absolute', right: 16, top: 18 }} />
        <Twinkle size={20} color={CANDY} delay={1600} period={2800} style={{ position: 'absolute', right: 34, bottom: 14 }} />
      </View>
    </Animated.View>
  )
}
