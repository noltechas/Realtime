import React from 'react'
import { Pressable, Text, ActivityIndicator, View, type ViewStyle, type TextStyle } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { ButtonProps } from '../../../types'

// Cyberpunk button — transparent fills with neon accent borders + text,
// monospace uppercase labels, no slide animation (dark themes dim on press
// instead of sliding into an offset shadow).
//
//   primary   → transparent fill, accentA border + label (neon green)
//   secondary → transparent fill, accentB border + label (neon magenta)
//   outline   → transparent fill, accentC border + label (neon cyan)
export function CyberpunkButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { tokens } = useTheme()

  const borderColor =
    variant === 'secondary'
      ? tokens.accentB
      : variant === 'outline'
      ? tokens.accentC
      : tokens.accentA
  const fgColor = borderColor

  const boxStyle: ViewStyle = {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor,
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  }

  const labelStyle: TextStyle = {
    color: fgColor,
    fontFamily: tokens.fontDisplay,
    fontWeight: '800',
    fontSize: variant === 'primary' ? 18 : 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        boxStyle,
        (disabled || loading) ? { opacity: 0.5 } : null,
        // Dark theme press behavior: dim, never slide.
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <View>
        {loading ? (
          <ActivityIndicator color={fgColor} />
        ) : (
          <Text style={labelStyle}>{label}</Text>
        )}
      </View>
    </Pressable>
  )
}
