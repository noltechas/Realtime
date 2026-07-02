import React from 'react'
import { View, Text, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Plaque,
  Gear,
  GaugeDial,
  AMBER,
  PARCH_DIM,
  useLinearLoop,
  useOscillator,
} from './_steam'

// Steampunk "You're Up!" hero — the boiler-room summons. An engraved brass
// marquee plate: Cinzel Black lettering with a breathing gas-lamp glow, a
// filament rule burning underneath, two small working gears at the flanks,
// and a pressure gauge pegged into the red — the engine is at full steam and
// waiting on its singer.
export function YoureUpHero() {
  const gearL = useLinearLoop(11000)
  const gearR = useLinearLoop(15000)
  const rotL = gearL.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const rotR = gearR.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] })

  const filament = useOscillator(2800)
  const filamentOpacity = filament.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] })
  const glow = useOscillator(2800)
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] })

  return (
    <View style={{ alignItems: 'center', alignSelf: 'center', marginBottom: 6 }}>
      <Plaque screws seed="youre-up" radius={14} style={{ paddingVertical: 18, paddingHorizontal: 26 }}>
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'Cinzel_700Bold',
              fontSize: 10,
              letterSpacing: 4.2,
              textTransform: 'uppercase',
              color: AMBER,
              includeFontPadding: false,
            }}
          >
            The Stage Awaits
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
            <Animated.View style={{ width: 26, height: 26, transform: [{ rotate: rotL }] }}>
              <Gear size={26} teeth={10} tone="brass" />
            </Animated.View>

            <View>
              {/* breathing glow duplicate behind the lettering */}
              <Animated.Text
                aria-hidden
                style={{
                  position: 'absolute',
                  fontFamily: 'Cinzel_900Black',
                  fontSize: 38,
                  color: AMBER,
                  letterSpacing: 1,
                  opacity: glowOpacity,
                  textShadowColor: AMBER,
                  textShadowRadius: 18,
                  textShadowOffset: { width: 0, height: 0 },
                }}
                numberOfLines={1}
              >
                You're Up!
              </Animated.Text>
              <Text
                style={{
                  fontFamily: 'Cinzel_900Black',
                  fontSize: 38,
                  color: '#F5E5BD',
                  letterSpacing: 1,
                  textShadowColor: 'rgba(0,0,0,0.6)',
                  textShadowRadius: 0,
                  textShadowOffset: { width: 0, height: 2 },
                }}
                numberOfLines={1}
              >
                You're Up!
              </Text>
            </View>

            <Animated.View style={{ width: 26, height: 26, transform: [{ rotate: rotR }] }}>
              <Gear size={26} teeth={10} tone="brass" />
            </Animated.View>
          </View>

          {/* burning filament rule */}
          <Animated.View style={{ marginTop: 10, alignSelf: 'stretch', height: 2, opacity: filamentOpacity }}>
            <LinearGradient
              colors={['rgba(232,169,59,0)', '#FFE4A0', 'rgba(232,169,59,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>

          {/* pressure readout: pegged into the red */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 }}>
            <GaugeDial size={16} value={0.96} />
            <Text
              style={{
                fontFamily: 'Cinzel_700Bold',
                fontSize: 9,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: PARCH_DIM,
                includeFontPadding: false,
              }}
            >
              Pressure Full · Take the Mic
            </Text>
          </View>
        </View>
      </Plaque>
    </View>
  )
}
