import React from 'react'
import { Pressable, Text, ActivityIndicator, View, type ViewStyle, type TextStyle } from 'react-native'
import { COMIC_BOOK_MOBILE } from '../../../tokens'
import type { ButtonProps } from '../../../types'
import { INK, PANEL, RED, BLUE, inkShadow, slam } from './_comic'

// Comic-Book action button — a bold inked panel with a hard offset shadow and a
// thin white "printed keyline" inset for the comic ink-trap look. Primary = pop
// red w/ white caps, secondary = sky blue w/ ink caps, outline = ink hairline on
// paper. Luckiest Guy uppercase, slam-flush press.
const t = COMIC_BOOK_MOBILE

const baseBtn: ViewStyle = {
  borderRadius: 8,
  paddingVertical: 14,
  paddingHorizontal: 20,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 3,
  borderColor: INK,
  ...inkShadow(4),
}

const baseLabel: TextStyle = {
  fontFamily: t.fontDisplay,
  fontSize: 18,
  letterSpacing: 1,
  textTransform: 'uppercase',
}

const variants = {
  primary: { box: { ...baseBtn, backgroundColor: RED }, label: { ...baseLabel, color: PANEL } },
  secondary: { box: { ...baseBtn, backgroundColor: BLUE }, label: { ...baseLabel, color: INK } },
  outline: {
    box: { ...baseBtn, backgroundColor: PANEL },
    label: { ...baseLabel, color: INK },
  },
} as const

export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const v = variants[variant]
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        v.box,
        disabled || loading ? { opacity: 0.5 } : null,
        pressed ? slam(3) : null,
      ]}
    >
      {/* printed inner keyline */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 3,
          left: 3,
          right: 3,
          bottom: 3,
          borderRadius: 5,
          borderWidth: 1.5,
          borderColor: variant === 'secondary' || variant === 'outline' ? 'rgba(22,22,29,0.25)' : 'rgba(255,255,255,0.5)',
        }}
      />
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? PANEL : INK} />
      ) : (
        <Text style={v.label}>{label}</Text>
      )}
    </Pressable>
  )
}
