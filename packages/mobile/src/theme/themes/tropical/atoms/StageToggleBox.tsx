import React from 'react'
import { Pressable, View, Text, type ViewStyle, type TextStyle } from 'react-native'
import { TROPICAL_MOBILE } from '../../../tokens'
import type { ToggleBoxProps } from '../../../types'
import { PALM_DK, PANEL_GLASS, PANEL, BAMBOO_LT, softShadow, press, Hibiscus } from './_tropical'

// Tropical toggle (Vocal FX / Autotune). A bamboo-keyline sand panel that warms
// to a sunshine wash when ON; the indicator flips from an empty sand ring to a
// blooming hibiscus. Pacifico caption, gentle sink on press.
const t = TROPICAL_MOBILE

const baseBtn: ViewStyle = {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: BAMBOO_LT,
  ...softShadow(3),
}

const labelStyle: TextStyle = {
  fontFamily: t.fontDisplay, // Florida Vibes (runs small — sized up)
  fontSize: 23,
  color: PALM_DK,
  letterSpacing: 0.2,
}

const ringStyle: ViewStyle = {
  width: 28,
  height: 28,
  borderRadius: 14,
  borderWidth: 2.5,
  borderColor: BAMBOO_LT,
  backgroundColor: PANEL,
}

export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [baseBtn, { backgroundColor: on ? '#FFF1C4' : PANEL_GLASS }, pressed ? press() : null]}
    >
      {on ? (
        <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Hibiscus size={28} />
        </View>
      ) : (
        <View style={ringStyle} />
      )}
      <Text style={labelStyle}>{label}</Text>
    </Pressable>
  )
}
