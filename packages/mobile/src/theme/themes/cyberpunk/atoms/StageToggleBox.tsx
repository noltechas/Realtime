import React from 'react'
import { View, Text, Pressable, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import { hexToRgba } from '../../../helpers'
import type { ToggleBoxProps } from '../../../types'

// Cyberpunk stage toggle (Vocal FX / Autotune) — sharp-cornered void panel
// with a 1px dim accent border. When `on`, the background fills with a
// tinted accent overlay and the inner checkbox flips to a solid neon green
// with the dark page bg as the check glyph (semantic black-on-bg contrast).
export function CyberpunkStageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const { tokens } = useTheme()

  const tint = (opacity: number): string =>
    hexToRgba(tokens.accentA, opacity) ?? `rgba(255,255,255,${opacity})`

  const activeBg = tint(0.18)
  const idleBg = 'transparent'

  const boxStyle: ViewStyle = {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 0,
    borderWidth: tokens.cardBorderWidth,
    borderColor: tokens.dimBorder,
    backgroundColor: on ? activeBg : idleBg,
    shadowColor: tokens.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [boxStyle, pressed ? { opacity: 0.85 } : null]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 0,
            borderWidth: 1,
            borderColor: tokens.accentA,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: on ? tokens.accentA : 'transparent',
          }}
        >
          {on ? <Ionicons name="checkmark" size={16} color={tokens.appBg} /> : null}
        </View>
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontWeight: '800',
            fontSize: 13,
            color: tokens.black,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  )
}
