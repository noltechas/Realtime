import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import { CAST, Gauge, Plaque, SteamPuffs, caps, display, LAMP } from './_engine'

// Steampunk "You're up": the engine's nameplate calls you to the controls,
// its gauge swinging into the red, steam blowing off both sides.
export function YoureUpHero() {
  const needle = useRef(new Animated.Value(0.1)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(needle, { toValue: 0.95, duration: 1400, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
        Animated.timing(needle, { toValue: 0.82, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(needle, { toValue: 0.92, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [needle])
  return (
    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
      <SteamPuffs x={24} y={40} size={80} period={5200} rise={120} />
      <SteamPuffs x={330} y={40} size={80} period={5800} delay={1800} rise={120} />
      <Plaque border={15} contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 4 }}>
        <Gauge size={64} value={needle} />
        <View>
          <Text style={caps(10, LAMP, { letterSpacing: 2.6 })}>Full steam ahead</Text>
          <Text style={[display(38, undefined, { lineHeight: 46 }), CAST]}>You're up</Text>
        </View>
      </Plaque>
    </View>
  )
}
