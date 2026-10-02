import React from 'react'
import { Animated, Text, View } from 'react-native'
import { ETCH, GOLD, GOLD_HI, STAR, Star, display, mono, useEnter, useLoop } from './_record'

// Space "You're Up": a signal going out. Engraved rings roll out from a star
// in gold, and the words are set wide in light capitals, with the line every
// transmission in this theme ends on.
export function YoureUpHero() {
  const { opacity, translateY } = useEnter(0, 8)
  const a = useLoop(3000, 0, false)
  const b = useLoop(3000, 1500, false)
  const ring = (v: Animated.Value, key: string) => (
    <Animated.View
      key={key}
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 1,
        borderColor: ETCH.strong,
        opacity: v.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.9, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 2.1] }) }],
      }}
    />
  )
  return (
    <Animated.View style={{ alignSelf: 'center', alignItems: 'center', opacity, transform: [{ translateY }] }}>
      <View style={{ width: 140, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        {ring(a, 'a')}
        {ring(b, 'b')}
        <Star size={70} color={GOLD_HI} />
      </View>
      <Text style={display(34, STAR, 300, { letterSpacing: 10, marginRight: -10 })}>{"You're up"}</Text>
      <Text style={mono(10.5, GOLD, { marginTop: 8, letterSpacing: 3 })}>Transmitting from Earth</Text>
    </Animated.View>
  )
}
