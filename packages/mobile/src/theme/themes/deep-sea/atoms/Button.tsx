import React from 'react'
import { Pressable, Text, ActivityIndicator, View, type ViewStyle, type TextStyle } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { ButtonProps } from '../../../types'

// Deep-sea button — rounded translucent capsule with a soft bioluminescent
// glow. Dark theme: press dims (no slide).
//
//   primary   → cyan translucent fill, cyan border + label
//   secondary → purple translucent fill, purple border + label
//   outline   → gold border + label, transparent fill
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { tokens } = useTheme()

  let fill: string
  let borderColor: string
  let fgColor: string
  let glowColor: string
  if (variant === 'secondary') {
    fill = 'rgba(180,77,255,0.14)'
    borderColor = 'rgba(180,77,255,0.55)'
    fgColor = tokens.accentB
    glowColor = tokens.accentB
  } else if (variant === 'outline') {
    fill = 'transparent'
    borderColor = tokens.accentC
    fgColor = tokens.accentC
    glowColor = tokens.accentC
  } else {
    fill = 'rgba(0,255,200,0.14)'
    borderColor = 'rgba(0,255,200,0.55)'
    fgColor = tokens.accentA
    glowColor = tokens.accentGlowColor
  }

  const boxStyle: ViewStyle = {
    backgroundColor: fill,
    borderWidth: 1,
    borderColor,
    borderRadius: tokens.radius,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  }

  const labelStyle: TextStyle = {
    color: fgColor,
    fontFamily: tokens.fontDisplay,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.5,
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        boxStyle,
        disabled || loading ? { opacity: 0.5 } : null,
        // Dark themes dim instead of sliding into a hard offset shadow.
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
