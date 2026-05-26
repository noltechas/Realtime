import React from 'react'
import { Pressable, Text, ActivityIndicator, View, type ViewStyle, type TextStyle } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import { blobCornerRadii, sketchAngle, sketchWobble } from '../../../helpers'
import type { ButtonProps } from '../../../types'

// Sketch button — blob corner radii, hand-drawn rotation per label, and a
// slide-on-press wobble so it feels like a marker tapping paper. Mirrors the
// branch that used to live in PrimaryButton.tsx for the sketch theme.
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { tokens } = useTheme()

  const angle = sketchAngle(label)

  // Variant fills — sketch keeps the marker-blue / paper-yellow / red palette
  // so primary "circles" the action in pen, secondary stamps it in highlighter,
  // and outline is a faint pencil border.
  const fill =
    variant === 'primary'
      ? tokens.hotRed
      : variant === 'secondary'
      ? tokens.accentA
      : 'transparent'
  const borderColor =
    variant === 'outline' ? tokens.hotRed : tokens.black
  const fg =
    variant === 'primary'
      ? tokens.white
      : variant === 'secondary'
      ? tokens.white
      : tokens.hotRed
  const borderWidth = tokens.cardBorderWidth

  const boxStyle: ViewStyle = {
    backgroundColor: fill,
    borderWidth,
    borderColor,
    ...blobCornerRadii(`btn-${variant}-${label}`),
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 4,
    elevation: 3,
  }

  const labelStyle: TextStyle = {
    color: fg,
    fontFamily: tokens.fontDisplay,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.5,
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => {
        const sketchRotate = { rotate: `${angle}deg` } as const
        if (!pressed) {
          return [
            boxStyle,
            (disabled || loading) ? { opacity: 0.5 } : null,
            { transform: [sketchRotate, { translateX: 0 }, { translateY: 0 }] as any },
          ]
        }
        // Slide into the shadow + extra wobble — the press feels like the
        // marker briefly digging into the paper.
        const slideX = { translateX: 2 } as const
        const slideY = { translateY: 2 } as const
        return [
          boxStyle,
          (disabled || loading) ? { opacity: 0.5 } : null,
          {
            transform: [
              sketchRotate,
              slideX,
              slideY,
              ...sketchWobble(`${variant}-${label}`),
            ] as any,
            shadowOpacity: 0,
            elevation: 0,
          },
        ]
      }}
    >
      <View>
        {loading ? <ActivityIndicator color={fg} /> : <Text style={labelStyle}>{label}</Text>}
      </View>
    </Pressable>
  )
}
