import React from 'react'
import { Animated, Text, View } from 'react-native'
import type { ScreenTitleProps } from '../../../types'
import { CREAM, PAINTED, Timber, lift, script, useEnter } from './_tropical'

// Tropical screen heading — a carved teak plaque with the title painted on in
// the surf script, hung a degree off-true (nothing nailed up at a beach bar is
// level). Drops in on the shared entrance spring.

export function ScreenTitle({ title }: ScreenTitleProps) {
  const enter = useEnter(0, 12)

  return (
    <Animated.View
      style={{
        alignSelf: 'flex-start',
        opacity: enter.opacity,
        transform: [{ translateY: enter.translateY }, { scale: enter.scale }],
      }}
    >
      <View style={[{ borderRadius: 13, transform: [{ rotate: '-1.1deg' }] }, lift(2)]}>
        <Timber
          radius={13}
          seed={`title-${title}`}
          groove
          style={{ paddingHorizontal: 20, paddingVertical: 7 }}
        >
          <Text style={script(21, CREAM, PAINTED)} numberOfLines={1}>
            {title}
          </Text>
        </Timber>
      </View>
    </Animated.View>
  )
}
