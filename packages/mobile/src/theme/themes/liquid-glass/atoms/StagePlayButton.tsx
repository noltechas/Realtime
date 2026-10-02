import React from 'react'
import { Animated, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { PlayButtonProps } from '../../../types'
import { Glass, Press, WHITE, useBreath } from './_glass'

// Liquid Glass play control: a big disc of interactive glass. Playing, it
// takes your colour as a tint and breathes, a slow swell of light from
// within, with a ring of your colour pulsing out around it.
const D = 156

function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`
}

export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const breath = useBreath(2400, isPlaying)
  return (
    <View style={{ width: D + 60, height: D + 60, alignItems: 'center', justifyContent: 'center' }}>
      {isPlaying ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: D,
            height: D,
            borderRadius: D / 2,
            borderWidth: 2,
            borderColor: withAlpha(singerColor, 0.7),
            opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }),
            transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.32] }) }],
          }}
        />
      ) : null}
      <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause' : 'Play'} hitSlop={10}>
        <Animated.View style={{ transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] }}>
          <Glass radius={D / 2} interactive tint={isPlaying ? withAlpha(singerColor, 0.45) : undefined} style={{ width: D, height: D, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={58} color={WHITE} style={{ marginLeft: isPlaying ? 0 : 6 }} />
          </Glass>
        </Animated.View>
      </Press>
    </View>
  )
}
