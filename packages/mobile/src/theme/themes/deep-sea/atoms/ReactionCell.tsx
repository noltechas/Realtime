import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import type { ReactionCellProps } from '../../../types'

// Deep-sea reaction cell — translucent navy panel with a faint cyan border
// (heavier on the bottom edge), rounded corners, and the emoji/icon centered
// over a dark surface so the white icon foregrounds the screen exports
// remain legible. Press dims (dark theme — never slides).
export function ReactionCell({
  onPress,
  onEditPress,
  disabled,
  icon,
  label,
}: ReactionCellProps) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flex: 1,
          backgroundColor: 'rgba(6,18,44,0.85)',
          borderWidth: 1,
          borderColor: 'rgba(0,255,200,0.5)',
          borderBottomWidth: 3,
          borderRadius: 16,
          padding: 12,
        },
        pressed ? { opacity: 0.85 } : null,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
        <Text
          style={{
            textAlign: 'center',
            marginTop: 8,
            fontFamily: tokens.fontDisplay,
            fontWeight: '800',
            fontSize: 13,
            color: '#FFFFFF',
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            textShadowColor: 'rgba(0,0,0,0.8)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
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
            borderRadius: 12,
            borderWidth: 1,
            borderColor: tokens.accentA,
            backgroundColor: 'rgba(0,255,200,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="create-outline" size={12} color={tokens.accentA} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}
