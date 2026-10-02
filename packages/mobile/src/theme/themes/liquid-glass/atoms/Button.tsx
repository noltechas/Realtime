import React from 'react'
import { ActivityIndicator, Text } from 'react-native'
import type { ButtonProps } from '../../../types'
import { Glass, Press, WHITE, sf } from './_glass'

// Liquid Glass button: a capsule of glass.
//   primary    tinted glass, the prominent action
//   secondary  regular glass
//   outline    clear glass, barely there (Cancel / Back beside a primary)
export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const dead = disabled || loading
  const legend = loading ? <ActivityIndicator color={WHITE} /> : <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={sf(17, '600', WHITE)}>{label}</Text>
  const primary = variant === 'primary'
  return (
    <Press onPress={onPress} disabled={dead} style={{ opacity: dead ? 0.5 : 1 }}>
      <Glass radius={28} interactive variant={variant === 'outline' ? 'clear' : 'regular'} tint={primary ? 'rgba(10,132,255,0.62)' : undefined} style={{ minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 }}>
        {legend}
      </Glass>
    </Press>
  )
}

