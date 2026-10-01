import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg'
import { BONE, CANDLE, Candle, IronRule, fraktur, serif } from './_gothic'

// Gothic "You're Up": the bell tolls for you. A bronze bell swings in the
// arch over the words and rings out a shock ring each time it strikes; the
// words are set in Fraktur between two altar candles.
export function YoureUpHero() {
  const swing = useRef(new Animated.Value(0)).current
  const ring = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const toll = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.sequence([
            Animated.timing(swing, { toValue: -1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(swing, { toValue: 0.7, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(swing, { toValue: -0.3, duration: 360, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(swing, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(200),
            Animated.timing(ring, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ]),
        Animated.delay(1700),
      ]),
    )
    toll.start()
    return () => toll.stop()
  }, [swing, ring])

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ height: 52, width: 120, alignItems: 'center', justifyContent: 'flex-start' }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 14,
            width: 60,
            height: 60,
            borderRadius: 30,
            borderWidth: 2,
            borderColor: 'rgba(246,210,126,0.7)',
            opacity: ring.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.9, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.1] }) }],
          }}
        />
        <Animated.View
          style={{
            transform: [
              { translateY: -20 },
              { rotate: swing.interpolate({ inputRange: [-1, 1], outputRange: ['-18deg', '18deg'] }) },
              { translateY: 20 },
            ],
          }}
        >
          <Bell />
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
        <Candle width={10} height={30} seed={5} halo={1.4} />
        <Text style={fraktur(46, BONE, { lineHeight: 54, textShadowColor: 'rgba(227,176,75,0.45)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 })} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {"You're Up"}
        </Text>
        <Candle width={10} height={30} seed={9} halo={1.4} />
      </View>
      <IronRule width={170} />
      <Text style={serif(14, CANDLE, 'italic', { marginTop: 2 })}>The bell tolls for thee</Text>
    </View>
  )
}

function Bell() {
  return (
    <Svg width={40} height={44} viewBox="0 0 100 112">
      <Defs>
        <SvgLinearGradient id="gyb-bronze" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#3A2A14" />
          <Stop offset="0.28" stopColor="#9A7232" />
          <Stop offset="0.42" stopColor="#E5C27A" />
          <Stop offset="0.58" stopColor="#9A7232" />
          <Stop offset="1" stopColor="#2B1E0C" />
        </SvgLinearGradient>
      </Defs>
      <Path d="M44 0 h12 v12 h-12 Z" fill="#2B2730" />
      <Path d="M50 10 C 30 10 24 28 23 50 C 22 68 18 84 6 94 L 94 94 C 82 84 78 68 77 50 C 76 28 70 10 50 10 Z" fill="url(#gyb-bronze)" stroke="#1C1408" strokeWidth={2} />
      <Path d="M8 94 Q 50 104 92 94 L 92 98 Q 50 109 8 98 Z" fill="#7A5A26" stroke="#1C1408" strokeWidth={1.5} />
      <Path d="M30 38 Q 50 32 70 38" stroke="#FFECBE" strokeOpacity={0.5} strokeWidth={2} fill="none" />
    </Svg>
  )
}
