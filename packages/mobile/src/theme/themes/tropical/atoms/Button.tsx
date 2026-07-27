import React from 'react'
import { ActivityIndicator, Text, type TextStyle } from 'react-native'
import type { ButtonProps } from '../../../types'
import {
  CARVED,
  CORAL,
  CREAM,
  LAGOON,
  PAINTED,
  Press,
  Timber,
  lift,
  script,
} from './_tropical'

// Tropical button — a sign shop made it: a carved plank with the label PAINTED
// on in the surf script (brush lettering is exactly what beach signs use).
// Primary is lagoon enamel over the grain, secondary is sunset coral, and
// outline is the bare board with the label carved into it. Every plank draws a
// different grain (seeded by its label), the edges are beveled, the border
// groove is routed — and the whole thing sinks on the shared press spring.

const RADIUS = 15

const labelBase: TextStyle = { textAlign: 'center' }

export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const dead = disabled || loading
  const paint = variant === 'primary' ? LAGOON : variant === 'secondary' ? CORAL : undefined

  return (
    <Press
      onPress={onPress}
      disabled={dead}
      scaleTo={0.97}
      style={[{ borderRadius: RADIUS }, lift(2), dead ? { opacity: 0.5 } : null]}
    >
      <Timber
        radius={RADIUS}
        paint={paint}
        seed={`btn-${label}`}
        groove
        style={{ minHeight: 54, paddingVertical: 12, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' }}
      >
        {loading ? (
          <ActivityIndicator color={paint ? CREAM : '#4A2A10'} />
        ) : (
          <Text
            style={[script(15.5, CREAM, paint ? PAINTED : CARVED), labelBase]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {label}
          </Text>
        )}
      </Timber>
    </Press>
  )
}
