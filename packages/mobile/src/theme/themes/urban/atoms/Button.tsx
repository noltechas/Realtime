import React from 'react'
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { ButtonProps } from '../../../types'

// Urban button — parallelogram skew (skewX -8deg) with a heavy two-tone
// geometric "drop shadow" baked into the right + bottom borders. The inner
// label is counter-skewed (skewX +8deg) so the text reads upright inside the
// warped shell. Dark theme press behavior is dim, not slide — there's no
// offset shadow to slide into.
//
//   primary   → toxic-green fill on dark border, void label (high contrast)
//   secondary → dark fill on dark border with toxic-green drop shadow
//   outline   → transparent fill, hotRed border + label
export function UrbanButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { tokens } = useTheme()

  // Per-variant fill / border / label color choices. The "drop shadow" is the
  // right+bottom border tinted with the accent color — we vary which accent
  // depending on whether the button's primary fill is itself the accent.
  const fill =
    variant === 'primary'
      ? tokens.accentA
      : variant === 'outline'
      ? 'transparent'
      : tokens.creamDark

  const sideBorderColor = tokens.dimBorder
  const dropShadowColor =
    variant === 'primary'
      ? tokens.black // void shadow on toxic-green fill (negative space)
      : variant === 'outline'
      ? tokens.hotRed
      : tokens.accentA

  const labelColor =
    variant === 'primary'
      ? tokens.appBg // void text on toxic-green
      : variant === 'outline'
      ? tokens.hotRed
      : tokens.black // light text on dark fill

  const boxStyle: ViewStyle = {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: variant === 'outline' ? tokens.hotRed : sideBorderColor,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderRightColor: dropShadowColor,
    borderBottomColor: dropShadowColor,
    transform: [{ skewX: '-8deg' }],
    backgroundColor: fill,
  }

  const labelStyle: TextStyle = {
    color: labelColor,
    fontFamily: tokens.fontDisplay,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  }

  // Counter-skew so the label/spinner stays upright inside the warped shell.
  const unskew: { skewX: string }[] = [{ skewX: '8deg' }]

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        boxStyle,
        disabled || loading ? { opacity: 0.5 } : null,
        // Dim instead of slide — urban is a dark theme without an offset
        // shadow to slide into. Matches the legacy PrimaryButton behavior.
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <View style={{ transform: unskew }}>
        {loading ? <ActivityIndicator color={labelColor} /> : <Text style={labelStyle}>{label}</Text>}
      </View>
    </Pressable>
  )
}
