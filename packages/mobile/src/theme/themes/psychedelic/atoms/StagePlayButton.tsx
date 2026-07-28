import React from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { PlayButtonProps } from '../../../types'
import { DYES, INK, Sunburst, WARM, useLift, usePulse, useSpin } from './_glass'

// ── Stage play control — a SPINNING TARGET ──────────────────────────────────
//
// The most important control in the app, built as the most recognisable object in the
// visual language it lives in: a wheel of alternating colour rays with a target of
// concentric rings at its centre. Op-art, straight off a 1967 handbill.
//
// It replaced a plain white disc with a thin coloured ring, which was perfectly legible
// and completely mute — the one thing on the screen a guest is meant to reach for, and it
// looked like a system button.
//
// ── State is carried by MOTION, not by colour ───────────────────────────────
// The rays spin only while playing. That is deliberate and it is the primary cue: a
// colour change would have to compete with a background that is already every colour at
// once, whereas "the wheel is turning" is unmistakable across a room and survives any
// frame of the footage. The glyph and the caption say the same thing redundantly.
//
// The centre stays CREAM with an ink glyph in every state. Legibility of the actual
// control must never depend on playback state or on what the video is doing.
const SIZE = 232
/** The cream centre that holds the glyph. */
const BODY = 132
/** The singer's identity ring, between the rays and the centre. */
const RING = 168

export function PsychedelicStagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const { tokens } = useTheme()
  const { transform, onPressIn, onPressOut } = useLift(1.2)

  // 26s per revolution — slow enough to read as a drift rather than a spinner.
  const spin = useSpin(26000, isPlaying)
  const pulse = usePulse(5900)
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.05] })
  const rayScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1.02, 0.96] })

  // The full dye ring, walked once every six spokes so the wheel repeats three times
  // around. A first version alternated each dye with INK, which had good op-art bite but
  // left half the wheel black — too heavy for the loudest control in the theme.

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ width: SIZE, height: SIZE + 26, alignItems: 'center' }}
    >
      <Animated.View
        style={{
          width: SIZE,
          height: SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          transform,
        }}
      >
        {/* The rays. Spin and breathe are separate transforms on separate loops. */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: spin }, { scale: rayScale }],
            },
          ]}
        >
          <Sunburst size={SIZE} colors={DYES} spokes={18} opacity={0.95} />
        </Animated.View>

        {/* An ink rim, so the wheel has a defined edge instead of eighteen coloured points
            fraying into the footage. Outside the spinning layer — a rotating circle is
            indistinguishable from a still one, so spinning it would only cost. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: 3,
            borderColor: INK,
          }}
        />

        {/* The singer's identity ring. Its colour is the guest's own, so it is the one
            element here that isn't from the theme palette — hence the ink edges on both
            sides of it, which keep it separated from whatever ray it happens to cross. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: RING,
            height: RING,
            borderRadius: RING / 2,
            borderWidth: 9,
            borderColor: singerColor,
            transform: [{ scale: ringScale }],
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: RING + 9,
            height: RING + 9,
            borderRadius: (RING + 9) / 2,
            borderWidth: 2.5,
            borderColor: INK,
          }}
        />

        {/* The cream centre. Opaque, ink keyline, ink glyph — the part that must stay
            readable no matter what. */}
        <View
          style={{
            width: BODY,
            height: BODY,
            borderRadius: BODY / 2,
            backgroundColor: WARM,
            borderWidth: 3,
            borderColor: INK,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 18,
            elevation: 10,
          }}
        >
          {isPlaying ? (
            <View style={{ flexDirection: 'row', gap: 11 }}>
              <View style={pauseBar} />
              <View style={pauseBar} />
            </View>
          ) : (
            <View style={playGlyph} />
          )}
        </View>
      </Animated.View>

      {/* The caption is its own ink pill rather than bare text on the footage: white type
          over a spinning multicolour wheel is unreadable at any size. */}
      <View
        style={{
          marginTop: -6,
          paddingHorizontal: 14,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: isPlaying ? singerColor : INK,
          borderWidth: 2,
          borderColor: INK,
        }}
      >
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 15,
            color: isPlaying ? INK : WARM,
          }}
        >
          {isPlaying ? 'Playing' : 'Tap to start'}
        </Text>
      </View>
    </Pressable>
  )
}

const playGlyph = {
  width: 0,
  height: 0,
  borderTopWidth: 20,
  borderBottomWidth: 20,
  borderLeftWidth: 32,
  borderTopColor: 'transparent' as const,
  borderBottomColor: 'transparent' as const,
  borderLeftColor: INK,
  marginLeft: 10,
}

const pauseBar = {
  width: 12,
  height: 40,
  borderRadius: 3,
  backgroundColor: INK,
}
