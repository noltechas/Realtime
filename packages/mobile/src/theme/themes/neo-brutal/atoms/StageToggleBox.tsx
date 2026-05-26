import React from 'react'
import { Pressable, View, Text, type ViewStyle, type TextStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NEO_BRUTAL_MOBILE } from '../../../tokens'
import type { ToggleBoxProps } from '../../../types'

// Neo-brutal toggle row used on the Stage's You're Up panel for Vocal FX /
// Autotune. Lifted from the default branch of StageScreen's toggleBtnStyle()
// / toggleCheckBoxStyle() builders — white box with a 3px black border, hard
// offset shadow, and a square checkbox that fills with black when on.
const t = NEO_BRUTAL_MOBILE

const OFFSET_SHADOW_SM = {
  shadowColor: t.accentGlowColor,
  shadowOffset: { width: 2, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 2,
}

const pressedStyle: ViewStyle = {
  transform: [{ translateX: 2 }, { translateY: 2 }],
  shadowOpacity: 0,
  elevation: 0,
}

const baseBtn: ViewStyle = {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: t.radius,
  borderWidth: t.cardBorderWidth,
  borderColor: t.black,
  ...OFFSET_SHADOW_SM,
}

const checkBoxStyle: ViewStyle = {
  width: 22,
  height: 22,
  borderRadius: 4,
  borderWidth: 2,
  borderColor: t.black,
  alignItems: 'center',
  justifyContent: 'center',
}

const labelStyle: TextStyle = {
  fontFamily: t.fontDisplay,
  fontWeight: '800',
  fontSize: 13,
  color: t.black,
  letterSpacing: 0.3,
}

export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const activeBg = t.vividYellow
  const idleBg = t.white
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        baseBtn,
        { backgroundColor: on ? activeBg : idleBg },
        pressed ? pressedStyle : null,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={[
            checkBoxStyle,
            { backgroundColor: on ? t.black : t.white },
          ]}
        >
          {on ? <Ionicons name="checkmark" size={16} color={t.white} /> : null}
        </View>
        <Text style={labelStyle}>{label}</Text>
      </View>
    </Pressable>
  )
}
