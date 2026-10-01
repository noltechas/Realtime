import React from 'react'
import { Animated, Text, View } from 'react-native'
import type { ScreenTitleProps } from '../../../types'
import { BONE, IronRule, fraktur, useEnter } from './_gothic'

// Gothic screen heading: the title set in true Fraktur (always title case),
// lit from below by candlelight, over a wrought-iron rule with a quatrefoil
// boss. It rises out of the dark like everything else.
export function ScreenTitle({ title }: ScreenTitleProps) {
  const { opacity, translateY } = useEnter(0, 10)
  return (
    <Animated.View style={{ alignSelf: 'flex-start', opacity, transform: [{ translateY }] }}>
      <Text style={fraktur(38, BONE, { lineHeight: 46 })} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ marginTop: -2, marginLeft: -6 }}>
        <IronRule width={150} />
      </View>
    </Animated.View>
  )
}
