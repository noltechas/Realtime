import React from 'react'
import { Text, View } from 'react-native'
import { IMG, INK, Mark, RED, WaitingBall, letter, note, useMeasured } from './_pencil'

// Sketch "You're up": lettered big in ink and underlined twice in red, with
// the ball bouncing on the end of it, impatient for you to start.
export function YoureUpHero() {
  const [size, onLayout] = useMeasured()
  return (
    <View style={{ alignItems: 'center', paddingVertical: 10 }}>
      <Text style={note(24, RED, { transform: [{ rotate: '-3deg' }], marginBottom: 2 })}>this one's yours</Text>
      <View style={{ paddingRight: 30 }}>
        <View onLayout={onLayout} style={{ alignSelf: 'flex-start' }}>
          <Text style={letter(52, INK, { lineHeight: 62 })}>You're up!</Text>
        </View>
        {size ? (
          <>
            <Mark src={IMG.underline[0]} color={RED} width={size.w + 10} height={22} style={{ marginTop: -10, marginLeft: -4 }} />
            <Mark src={IMG.underline[1]} color={RED} width={size.w * 0.8} height={18} style={{ marginTop: -11, marginLeft: size.w * 0.12, opacity: 0.85 }} />
            <WaitingBall d={22} color={RED} height={20} period={820} style={{ position: 'absolute', left: size.w + 4, bottom: 44 }} />
          </>
        ) : null}
      </View>
    </View>
  )
}
