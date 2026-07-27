import React from 'react'
import { Animated, Text, View } from 'react-native'
import Svg from 'react-native-svg'
import {
  CREAM,
  GUAVA,
  PAINTED,
  RopeKnot,
  RopeSeg,
  TikiTorch,
  Timber,
  WaveRule,
  glow,
  script,
  tiki,
  useEnter,
  useSwing,
} from './_tropical'

// Tropical "You're Up!" — the headline moment, built like the entrance to a
// luau: two tiki torches burning (flickering flames, breathing glow) flank a
// guava-painted plank sign that hangs from twisted V-ropes and actually sways.
// "You're Up!" is brush-painted in the surf script with the theme's wave rule
// carved beneath it, and the torchlight warms the sign's shadow. The group
// arrives on the shared entrance spring.

const SIGN_W = 196
const CORD_H = 26

export function YoureUpHero() {
  const enter = useEnter(0, 18)
  const { transform } = useSwing(CORD_H + 34, 1.5)

  return (
    <Animated.View
      style={{
        alignSelf: 'center',
        alignItems: 'center',
        marginBottom: 4,
        opacity: enter.opacity,
        transform: [{ translateY: enter.translateY }, { scale: enter.scale }],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        <View style={{ transform: [{ scaleX: -1 }], marginBottom: -4 }}>
          <TikiTorch height={132} flame={48} />
        </View>

        {/* the hanging sign — swings from its rope knot */}
        <Animated.View style={{ alignItems: 'center', transform }}>
          <Svg width={SIGN_W} height={CORD_H} style={{ marginBottom: -2 }}>
            <RopeSeg x1={SIGN_W / 2} y1={2} x2={26} y2={CORD_H} width={3} />
            <RopeSeg x1={SIGN_W / 2} y1={2} x2={SIGN_W - 26} y2={CORD_H} width={3} />
            <RopeKnot cx={SIGN_W / 2} cy={4} r={4} />
          </Svg>

          <View style={[{ borderRadius: 16 }, glow('#FFB84D', 3)]}>
            <Timber
              radius={16}
              paint={GUAVA}
              seed="youre-up"
              groove
              style={{ width: SIGN_W, alignItems: 'center', paddingVertical: 13, paddingHorizontal: 12 }}
            >
              <Text style={script(23, CREAM, { ...PAINTED, textAlign: 'center' })} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                You’re Up!
              </Text>
              <View style={{ marginTop: 2, opacity: 0.9 }}>
                <WaveRule width={92} color="rgba(255,240,214,0.85)" thickness={2.6} />
              </View>
              <Text style={[tiki(10.5, 'rgba(255,240,214,0.85)'), { marginTop: 4 }]}>Take the mic</Text>
            </Timber>
          </View>
        </Animated.View>

        <View style={{ marginBottom: -4 }}>
          <TikiTorch height={132} flame={48} />
        </View>
      </View>
    </Animated.View>
  )
}
