import React from 'react'
import { Text, View } from 'react-native'
import type { ScreenTitleProps } from '../../../types'
import { CAST, Plaque, display } from './_engine'

// Steampunk screen title: the screen's NAMEPLATE, deep green enamel in a
// riveted brass frame, its name cast in brass.
export function ScreenTitle({ title }: ScreenTitleProps) {
  return (
    <View style={{ alignSelf: 'flex-start', marginBottom: 6 }}>
      <Plaque border={13} contentStyle={{ paddingHorizontal: 22, paddingVertical: 3 }}>
        <Text style={[display(27, undefined, { lineHeight: 36 }), CAST]}>{title}</Text>
      </Plaque>
    </View>
  )
}
