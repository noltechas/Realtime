import React, { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SongsSearchBarProps } from '../../../types'
import { BODY_600, CANDY, Gloss, MUTED, PINK, PLUM, WHITE } from './_barbie'

// Barbie search: a glossy white plastic pill with the magnifier set into a
// round Barbie-pink button at its left end. Focus rings it in candy pink.
export function SongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  const [focused, setFocused] = useState(false)
  return (
    <Gloss
      tone="white"
      radius={999}
      glint={false}
      style={{ borderWidth: 2, borderColor: focused ? PINK : CANDY }}
      contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 5, paddingRight: 14, paddingVertical: 5, gap: 10 }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: WHITE }}>
        <Ionicons name="search" size={17} color={WHITE} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search the hits"
        placeholderTextColor={MUTED}
        selectionColor={PINK}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={{ flex: 1, fontFamily: BODY_600, fontSize: 16, color: PLUM, paddingVertical: 8 }}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Ionicons name="close-circle" size={19} color={CANDY} />
        </Pressable>
      ) : null}
    </Gloss>
  )
}
