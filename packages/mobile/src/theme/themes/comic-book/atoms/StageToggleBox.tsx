import React from 'react'
import { Pressable, View, Text, type ViewStyle, type TextStyle } from 'react-native'
import { COMIC_BOOK_MOBILE } from '../../../tokens'
import type { ToggleBoxProps } from '../../../types'
import { INK, PANEL, YELLOW, inkShadow, slam, BurstBadge } from './_comic'

// Comic-Book toggle (Vocal FX / Autotune). An inked panel that fills with a
// faint pop-yellow wash when ON; the indicator flips from an empty ink ring to
// a yellow STARBURST punched with an ink check. Luckiest Guy caption, slam press.
const t = COMIC_BOOK_MOBILE

const baseBtn: ViewStyle = {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: 8,
  borderWidth: 3,
  borderColor: INK,
  ...inkShadow(2),
}

const labelStyle: TextStyle = {
  fontFamily: t.fontDisplay,
  fontSize: 15,
  color: INK,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
}

const ringStyle: ViewStyle = {
  width: 26,
  height: 26,
  borderRadius: 13,
  borderWidth: 2.5,
  borderColor: INK,
  backgroundColor: PANEL,
}

export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        baseBtn,
        { backgroundColor: on ? '#FFF3BF' : PANEL },
        pressed ? slam(2) : null,
      ]}
    >
      {on ? (
        <BurstBadge size={28} fill={YELLOW} kind="star" />
      ) : (
        <View style={ringStyle} />
      )}
      <Text style={labelStyle}>{label}</Text>
    </Pressable>
  )
}
