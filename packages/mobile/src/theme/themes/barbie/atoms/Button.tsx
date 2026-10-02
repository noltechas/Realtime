import React from 'react'
import { ActivityIndicator, Text } from 'react-native'
import type { ButtonProps } from '../../../types'
import { CANDY, Gloss, PINK, PLUM, Press, RASPBERRY, WHITE, display } from './_barbie'

// Barbie button: glossy candy plastic that SQUISHES when you press it, like a
// jelly button, and springs back with a wobble. The sun's glint runs across it
// with everything else.
//   primary    Barbie pink, white sign-painted legend
//   secondary  sunshine yellow, plum legend
//   outline    white plastic with a candy-pink ring
export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const dead = disabled || loading
  const tone = variant === 'primary' ? 'pink' : variant === 'secondary' ? 'sun' : 'white'
  const ink = variant === 'primary' ? WHITE : variant === 'secondary' ? PLUM : PINK
  return (
    <Press onPress={onPress} disabled={dead} style={dead ? { opacity: 0.5 } : null}>
      <Gloss
        tone={tone}
        radius={999}
        style={variant === 'outline' ? { borderWidth: 2, borderColor: CANDY } : null}
        contentStyle={{ minHeight: 54, paddingVertical: 12, paddingHorizontal: 26, alignItems: 'center', justifyContent: 'center' }}
      >
        {loading ? (
          <ActivityIndicator color={ink} />
        ) : (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={display(18, ink, {
              textAlign: 'center',
              lineHeight: 24,
              textShadowColor: variant === 'primary' ? RASPBERRY : 'rgba(255,255,255,0.85)',
              textShadowOffset: { width: 0, height: variant === 'primary' ? 2 : 1.5 },
              textShadowRadius: 0,
            })}
          >
            {label}
          </Text>
        )}
      </Gloss>
    </Press>
  )
}
