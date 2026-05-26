import React from 'react'
import { Pressable, Text, ActivityIndicator } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import { themeWobble } from '../theme/styles'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  loading?: boolean
  disabled?: boolean
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { styles, tokens } = useTheme()
  const boxStyle =
    variant === 'secondary'
      ? styles.btnSecondary
      : variant === 'outline'
      ? styles.btnOutline
      : styles.btnPrimary
  const labelStyle =
    variant === 'secondary'
      ? styles.btnSecondaryLabel
      : variant === 'outline'
      ? styles.btnOutlineLabel
      : styles.btnPrimaryLabel

  // Press behavior per theme:
  //  - Dark themes (cyberpunk, urban) don't slide (no offset shadow to slide
  //    into) — they dim via Pressable's opacity overlay below.
  //  - Sketch (blob) gets the classic slide PLUS a tiny rotation so the
  //    button wobbles like a marker on paper.
  //  - Neo-brutal gets the plain slide.
  const isDark = tokens.isDark
  const isBlob = tokens.cardShape === 'blob'

  // Pre-built tuples avoid the discriminated-union typecheck RN imposes on
  // the `transform` prop.
  const pressedTransform = (pressed: boolean) => {
    if (isDark) return [] as const
    if (!pressed) return [{ translateX: 0 }, { translateY: 0 }] as const
    const slideX = { translateX: 2 } as const
    const slideY = { translateY: 2 } as const
    if (isBlob) {
      return [slideX, slideY, ...themeWobble(tokens, `${variant}-${label}`)]
    }
    return [slideX, slideY]
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        boxStyle,
        (disabled || loading) ? { opacity: 0.5 } : null,
        isDark && pressed ? { opacity: 0.8 } : null,
        // Always include a transform (with 0s when idle) so RN's style diff
        // never sees the prop toggle between an array and undefined — that
        // path triggers a `forEach of null` crash.
        { transform: pressedTransform(pressed) },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary' && isDark
              ? tokens.accentA
              : variant === 'primary'
              ? tokens.white
              : tokens.black
          }
        />
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </Pressable>
  )
}
