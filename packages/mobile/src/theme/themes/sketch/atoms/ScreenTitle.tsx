import React from 'react'
import { Text, View } from 'react-native'
import type { ScreenTitleProps } from '../../../types'
import { IMG, INK, Mark, RED, WaitingBall, letter, useMeasured } from './_pencil'

// Sketch screen heading: lettered in ink, underlined fast in red pencil, and
// the ball sitting on the end of the word, waiting to go.
export function ScreenTitle({ title }: ScreenTitleProps) {
  const [size, onLayout] = useMeasured()
  return (
    <View style={{ alignSelf: 'flex-start', marginBottom: 16, paddingRight: 24 }}>
      <View onLayout={onLayout} style={{ alignSelf: 'flex-start' }}>
        <Text style={letter(38, INK, { lineHeight: 46 })}>{title}</Text>
      </View>
      {size ? (
        <>
          <Mark src={IMG.underline[2]} color={RED} width={size.w + 14} height={16} style={{ marginTop: -7, marginLeft: -4 }} />
          <WaitingBall d={15} color={RED} height={9} period={1250} style={{ position: 'absolute', left: size.w + 2, bottom: 20 }} />
        </>
      ) : null}
    </View>
  )
}
