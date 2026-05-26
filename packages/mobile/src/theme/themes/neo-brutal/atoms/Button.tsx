import React from 'react'
import { Pressable, Text, ActivityIndicator, View, type ViewStyle, type TextStyle } from 'react-native'
import { NEO_BRUTAL_MOBILE } from '../../../tokens'
import type { ButtonProps } from '../../../types'

// Neo-brutal Button. Lifted from the default (non-dark, non-sketch, non-urban)
// branch of the legacy PrimaryButton.tsx. Press behavior is the classic
// "slide-into-shadow" — translate by +2px on both axes while the shadow drops
// to opacity 0 so the element appears to sit flat against the page.
const t = NEO_BRUTAL_MOBILE

const baseBtn: ViewStyle = {
  borderRadius: t.radius,
  paddingVertical: 14,
  paddingHorizontal: 20,
  alignItems: 'center',
  justifyContent: 'center',
  // Offset shadow (intensity 'md' from the legacy themeShadow helper).
  shadowColor: t.accentGlowColor,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
}

const btnPrimary: ViewStyle = {
  ...baseBtn,
  backgroundColor: t.hotRed,
  borderWidth: t.cardBorderWidth,
  borderColor: t.black,
}

const btnPrimaryLabel: TextStyle = {
  color: t.white,
  fontFamily: t.fontDisplay,
  fontWeight: '800',
  fontSize: 18,
  letterSpacing: 0.5,
}

const btnSecondary: ViewStyle = {
  ...baseBtn,
  backgroundColor: t.accentA,
  borderWidth: t.cardBorderWidth,
  borderColor: t.black,
}

const btnSecondaryLabel: TextStyle = {
  color: t.black,
  fontFamily: t.fontDisplay,
  fontWeight: '800',
  fontSize: 18,
  letterSpacing: 0.5,
}

const btnOutline: ViewStyle = {
  backgroundColor: 'transparent',
  borderWidth: t.cardBorderWidth,
  borderColor: t.hotRed,
  borderRadius: t.radius,
  paddingVertical: 14,
  paddingHorizontal: 20,
  alignItems: 'center',
  justifyContent: 'center',
}

const btnOutlineLabel: TextStyle = {
  color: t.hotRed,
  fontFamily: t.fontDisplay,
  fontWeight: '800',
  fontSize: 18,
  letterSpacing: 0.5,
}

// Pressed feedback: slide into the resting shadow. The shadow drops to
// opacity 0 simultaneously so the element looks pinned to the page.
const pressedStyle: ViewStyle = {
  transform: [{ translateX: 2 }, { translateY: 2 }],
  shadowOpacity: 0,
  elevation: 0,
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const boxStyle =
    variant === 'secondary'
      ? btnSecondary
      : variant === 'outline'
      ? btnOutline
      : btnPrimary
  const labelStyle =
    variant === 'secondary'
      ? btnSecondaryLabel
      : variant === 'outline'
      ? btnOutlineLabel
      : btnPrimaryLabel

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        boxStyle,
        (disabled || loading) ? { opacity: 0.5 } : null,
        pressed ? pressedStyle : null,
      ]}
    >
      <View>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? t.white : t.black} />
        ) : (
          <Text style={labelStyle}>{label}</Text>
        )}
      </View>
    </Pressable>
  )
}
