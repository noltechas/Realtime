import React from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import type { ButtonProps } from '../../../types'
import { BONE, CANDLE, Press, Stone, gothic } from './_gothic'

// Gothic button: a carved tablet that works like a hidden switch: pressing it
// SINKS it into the wall and darkens it, then it settles back.
//   primary    sealing wax: deep crimson, bone legend, a waxen sheen
//   secondary  a stone tablet with a moulded groove
//   outline    a bare iron-framed recess, no fill
// The legend is Grenze Gotisch (a Fraktur at button size reads as lace).
export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const dead = disabled || loading
  const tone = variant === 'primary' ? 'wax' : 'stone'
  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? BONE : CANDLE} />
  ) : (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      style={gothic(17, variant === 'outline' ? CANDLE : BONE, 700, {
        textAlign: 'center',
        letterSpacing: 0.5,
        textShadowColor: variant === 'primary' ? 'rgba(40,0,6,0.8)' : 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1.5,
      })}
    >
      {label}
    </Text>
  )
  return (
    <Press onPress={onPress} disabled={dead} style={dead ? { opacity: 0.5 } : null}>
      {variant === 'outline' ? (
        <View
          style={{
            minHeight: 52,
            paddingVertical: 12,
            paddingHorizontal: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(227,176,75,0.45)',
            backgroundColor: 'rgba(11,10,15,0.55)',
          }}
        >
          {content}
        </View>
      ) : (
        <Stone
          tone={tone}
          cusp={11}
          seed={`btn-${label}`}
          contentStyle={{ minHeight: 54, paddingVertical: 13, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}
        >
          {content}
        </Stone>
      )}
    </Press>
  )
}
