import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import type { ToggleBoxProps } from '../../../types'

// Deep-sea stage toggle — translucent navy pill with a cyan border (heavier
// on the bottom edge to suggest weight). The inline checkbox glows cyan
// when on, dims to a navy well when off. Used for the Vocal FX / Autotune
// toggles on the singer Stage screen.
export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const { tokens } = useTheme()
  const activeBg = 'rgba(0,255,200,0.15)'
  const idleBg = 'rgba(12,29,66,0.6)'
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: on ? activeBg : idleBg,
          borderWidth: 1,
          borderColor: 'rgba(0,255,200,0.5)',
          borderBottomWidth: 3,
        },
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: tokens.accentA,
            borderBottomWidth: 3,
            backgroundColor: on ? tokens.accentA : 'rgba(0,255,200,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
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
            letterSpacing: 0.3,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  )
}
