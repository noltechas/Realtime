import React from 'react'
import { Animated, View } from 'react-native'
import type { ScreenTitleProps } from '../../../types'
import { RetroText, SUN, Twinkle, useEnter } from './_barbie'

// Barbie screen heading: the title sign-painted (Shrikhand, a white outline, a
// deep pink extrusion), with a twinkle winking at its corner. It pops in.
export function ScreenTitle({ title }: ScreenTitleProps) {
  const { opacity, translateY, scale } = useEnter(0)
  return (
    <Animated.View style={{ alignSelf: 'flex-start', opacity, transform: [{ translateY }, { scale }], marginLeft: -4 }}>
      <RetroText size={34}>{title}</RetroText>
      <View pointerEvents="none" style={{ position: 'absolute', right: -14, top: -4 }}>
        <Twinkle size={20} color={SUN} period={3200} />
      </View>
    </Animated.View>
  )
}
