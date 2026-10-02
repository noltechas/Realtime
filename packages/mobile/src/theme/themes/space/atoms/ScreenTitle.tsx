import React from 'react'
import { Animated, Text, View } from 'react-native'
import type { ScreenTitleProps } from '../../../types'
import { BinaryMarks, EtchedRule, GOLD_HI, STAR, Star, display, useEnter } from './_record'

// Space screen heading: the title in light, widely tracked Jost capitals with
// a star at its head, over an engraved rule and the title's length written in
// the record cover's binary.
export function ScreenTitle({ title }: ScreenTitleProps) {
  const { opacity, translateY } = useEnter(0, 8)
  return (
    <Animated.View style={{ alignSelf: 'flex-start', opacity, transform: [{ translateY }] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Star size={22} color={GOLD_HI} />
        <Text numberOfLines={1} style={display(29, STAR, 300, { letterSpacing: 7 })}>
          {title}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, marginLeft: 30 }}>
        <EtchedRule width={130} />
        <BinaryMarks n={title.length * 9 + 5} bits={7} height={8} gap={2.5} />
      </View>
    </Animated.View>
  )
}
