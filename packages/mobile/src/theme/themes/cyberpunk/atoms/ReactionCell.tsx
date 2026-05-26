import React from 'react'
import { View, Text, Pressable, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import { hexToRgba } from '../../../helpers'
import type { ReactionCellProps } from '../../../types'

// Cyberpunk reaction-grid cell — sharp-cornered void panel, dim accent
// border, neon glow on press. Icon + label are rendered upright (no skew,
// no wobble). The optional edit affordance in the corner gets the same
// translucent accent fill as buttons elsewhere in the theme.
export function CyberpunkReactionCell({
  label,
  icon,
  onPress,
  onEditPress,
  disabled,
}: ReactionCellProps) {
  const { tokens } = useTheme()

  const tint = (opacity: number): string =>
    hexToRgba(tokens.accentA, opacity) ?? `rgba(255,255,255,${opacity})`

  const cellStyle: ViewStyle = {
    flex: 1,
    backgroundColor: tokens.white,
    borderWidth: tokens.cardBorderWidth,
    borderColor: tokens.dimBorder,
    borderRadius: 0,
    padding: 12,
    shadowColor: tokens.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        cellStyle,
        pressed ? { opacity: 0.85 } : null,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
        <Text
          style={{
            textAlign: 'center',
            marginTop: 8,
            fontFamily: tokens.fontDisplay,
            fontWeight: '800',
            fontSize: 13,
            color: tokens.black,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      </View>
      {onEditPress ? (
        <Pressable
          onPress={onEditPress}
          hitSlop={6}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: 0,
            borderWidth: 1,
            borderColor: tokens.accentA,
            backgroundColor: tint(0.18),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="create-outline" size={12} color={tokens.black} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}
