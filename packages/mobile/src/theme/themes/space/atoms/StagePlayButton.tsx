import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop, Text as SvgText, TextPath } from 'react-native-svg'
import type { PlayButtonProps } from '../../../types'
import { ETCH, GOLD, GOLD_HI, GoldenRecord, INK, MONO, mix, useUid } from './_record'

// Space transport: THE RECORD ITSELF. Its label is the singer's colour, with
// the inscription turning round it while the song plays; the tonearm swings
// onto the record to play and lifts off to pause. While it plays, sound rolls
// out from the record as engraved rings.

const SIZE = 176

export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const arm = useRef(new Animated.Value(isPlaying ? 1 : 0)).current
  const ring = useRef(new Animated.Value(0)).current
  const id = useUid('splb')

  useEffect(() => {
    Animated.timing(arm, { toValue: isPlaying ? 1 : 0, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start()
  }, [isPlaying, arm])

  useEffect(() => {
    if (!isPlaying) {
      ring.stopAnimation()
      ring.setValue(0)
      return
    }
    const loop = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [isPlaying, ring])

  const W = SIZE + 70
  return (
    <View style={{ width: W, height: SIZE + 40, alignItems: 'center', justifyContent: 'center' }}>
      {/* sound rolling out while it plays */}
      {[0, 1].map((k) => (
        <Animated.View
          key={k}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 20,
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: 1,
            borderColor: ETCH.strong,
            opacity: ring.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.8 - k * 0.3, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1 + k * 0.08, 1.45 + k * 0.1] }) }],
          }}
        />
      ))}
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause' : 'Play'} hitSlop={8} style={{ marginRight: 70 }}>
        <GoldenRecord size={SIZE} labelRatio={0.48} spin={isPlaying} periodMs={1800} labelColor={singerColor}>
          {/* the printed label: the singer's colour, an inscription round it */}
          <Svg width={SIZE * 0.48} height={SIZE * 0.48} viewBox="-50 -50 100 100" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id={`${id}g`} cx="0" cy="0" r="50" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={mix(singerColor, '#FFFFFF', 0.35)} />
                <Stop offset="1" stopColor={mix(singerColor, '#000000', 0.25)} />
              </RadialGradient>
              <Path id={`${id}r`} d="M 0 -38 A 38 38 0 1 1 -0.01 -38" />
            </Defs>
            <Rect x={-50} y={-50} width={100} height={100} fill={`url(#${id}g)`} />
            <Circle r={45} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
            <SvgText fill="rgba(10,8,4,0.6)" fontSize={7} fontFamily={MONO} letterSpacing={1.6}>
              <TextPath href={`#${id}r`}>SOUNDS OF EARTH  /  SIDE ONE  /  </TextPath>
            </SvgText>
          </Svg>
        </GoldenRecord>
        {/* the glyph, still while the label turns beneath it */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(2,3,8,0.78)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,240,200,0.4)', paddingLeft: isPlaying ? 0 : 3 }}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={GOLD_HI} />
          </View>
        </View>
      </Pressable>
      {/* the tonearm, pivoting from the top right */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: 8,
          top: 6,
          width: 46,
          height: 150,
          transformOrigin: '50% 12%',
          transform: [{ rotate: arm.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '22deg'] }) }],
        }}
      >
        <ToneArm />
      </Animated.View>
    </View>
  )
}

function ToneArm() {
  return (
    <Svg width={46} height={150} viewBox="0 0 46 150">
      <Rect x={15} y={2} width={16} height={10} rx={3} fill="#2A2C36" stroke="rgba(255,240,200,0.4)" strokeWidth={1} />
      <Circle cx={23} cy={18} r={9} fill="#1A1C24" stroke="rgba(255,240,200,0.5)" strokeWidth={1} />
      <Circle cx={23} cy={18} r={3.4} fill={GOLD} />
      <Path d="M 23 18 L 23 100 Q 23 120 12 130" fill="none" stroke="#C9CCD6" strokeWidth={3.4} strokeLinecap="round" />
      <Path d="M 22 18 L 22 100" fill="none" stroke="#FFFFFF" strokeWidth={1} opacity={0.6} />
      <Path d="M 16 126 L 4 132 L 7 142 L 18 137 Z" fill="#2A2C36" stroke="rgba(255,240,200,0.5)" strokeWidth={1} />
      <Path d="M 8 141 L 8 146" stroke={INK} strokeWidth={1} />
    </Svg>
  )
}
