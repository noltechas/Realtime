import React from 'react'
import { View, Text } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { TROPICAL_MOBILE } from '../../../tokens'
import { PANEL, SUNSET, HIBISCUS, softShadow, TikiTorch } from './_tropical'

// Tropical "You're Up!" hero — the headline moment: a sunset→hibiscus wave
// banner with "YOU'RE UP!" in big Pacifico, flanked by two flickering tiki
// torches. Replaces the generic styled Text on the Stage idle banner.
const t = TROPICAL_MOBILE

export function YoureUpHero() {
  return (
    <View style={{ alignItems: 'center', alignSelf: 'center', marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <View style={{ transform: [{ scaleX: -1 }] }}>
          <TikiTorch height={110} flame={44} />
        </View>

        <LinearGradient
          colors={[SUNSET, HIBISCUS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 26, paddingVertical: 16, borderRadius: 22, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.7)', ...softShadow(8) }}
        >
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '48%', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: 'rgba(255,255,255,0.20)' }} />
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.5}
            style={{
              fontFamily: t.fontDisplay, // Florida Vibes (runs small — sized up)
              fontSize: 56,
              lineHeight: 64,
              color: PANEL,
              letterSpacing: 0.5,
              textAlign: 'center',
              textShadowColor: 'rgba(0,0,0,0.25)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 3,
            }}
          >
            You're Up!
          </Text>
        </LinearGradient>

        <TikiTorch height={110} flame={44} />
      </View>
    </View>
  )
}
