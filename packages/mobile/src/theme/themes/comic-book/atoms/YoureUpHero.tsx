import React from 'react'
import { View, Text } from 'react-native'
import { COMIC_BOOK_MOBILE } from '../../../tokens'
import { INK, RED, YELLOW, Burst } from './_comic'

// Comic-Book "You're Up!" hero — the headline moment: a big yellow action
// BURST with "YOU'RE UP!" punched across it in inked pop-red caps. Replaces the
// generic styled Text on the Stage idle banner.
const t = COMIC_BOOK_MOBILE

const W = 300
const H = 126

export function YoureUpHero() {
  return (
    <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 6 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Burst width={W} height={H} fill={YELLOW} kind="burst" strokeWidth={4} />
      </View>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        minimumFontScale={0.5}
        style={{
          width: W * 0.84,
          fontFamily: t.fontDisplay,
          fontSize: 46,
          lineHeight: 50,
          color: RED,
          letterSpacing: 1,
          textAlign: 'center',
          textTransform: 'uppercase',
          transform: [{ rotate: '-3deg' }],
          textShadowColor: INK,
          textShadowOffset: { width: 2.5, height: 2.5 },
          textShadowRadius: 0,
        }}
      >
        You're Up!
      </Text>
    </View>
  )
}
