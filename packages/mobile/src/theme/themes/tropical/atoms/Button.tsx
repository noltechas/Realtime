import React from 'react'
import { Pressable, Text, ActivityIndicator, View, type ViewStyle, type TextStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { TROPICAL_MOBILE } from '../../../tokens'
import type { ButtonProps } from '../../../types'
import { INK, PANEL, LAGOON, LAGOON_DK, SUNSET, HIBISCUS, BAMBOO, softShadow, press } from './_tropical'

// Tropical action button — a smooth, sun-lit gradient lozenge with a glossy top
// highlight and a soft natural shadow (it floats, it doesn't slam). Primary =
// lagoon turquoise, secondary = sunset→hibiscus, outline = bamboo-framed sand.
// Pacifico label. Gentle sink on press.
const t = TROPICAL_MOBILE

const baseBtn: ViewStyle = {
  borderRadius: 16,
  overflow: 'hidden',
  ...softShadow(6),
}

const inner: ViewStyle = {
  paddingVertical: 15,
  paddingHorizontal: 22,
  alignItems: 'center',
  justifyContent: 'center',
}

const baseLabel: TextStyle = {
  fontFamily: t.fontDisplay, // Florida Vibes (runs small — sized up)
  fontSize: 25,
  letterSpacing: 0.4,
}

const GRADIENTS: Record<'primary' | 'secondary', [string, string]> = {
  primary: [LAGOON, LAGOON_DK],
  secondary: [SUNSET, HIBISCUS],
}

export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const isOutline = variant === 'outline'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [baseBtn, disabled || loading ? { opacity: 0.5 } : null, pressed ? press() : null]}
    >
      {isOutline ? (
        <View style={[inner, { backgroundColor: PANEL, borderWidth: 2.5, borderColor: BAMBOO, borderRadius: 16 }]}>
          {loading ? <ActivityIndicator color={INK} /> : <Text style={[baseLabel, { color: INK }]}>{label}</Text>}
        </View>
      ) : (
        <LinearGradient colors={GRADIENTS[variant]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={inner}>
          {/* glossy top highlight */}
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '52%', backgroundColor: 'rgba(255,255,255,0.22)' }} />
          {loading ? <ActivityIndicator color={PANEL} /> : <Text style={[baseLabel, { color: PANEL }]}>{label}</Text>}
        </LinearGradient>
      )}
    </Pressable>
  )
}
