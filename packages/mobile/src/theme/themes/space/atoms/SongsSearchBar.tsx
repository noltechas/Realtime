import React, { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SongsSearchBarProps } from '../../../types'
import { DUST, DUST_DIM, ETCH, GOLD, JOST_400, STAR } from './_record'

// Space search: a black-glass slot with an engraved gold hairline; focus
// brightens the hairline, nothing else changes.
export function SongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  const [focused, setFocused] = useState(false)
  return (
    <View
      style={{
        height: 50,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: focused ? ETCH.strong : ETCH.mid,
        backgroundColor: 'rgba(6,8,14,0.9)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        gap: 10,
      }}
    >
      <Ionicons name="search" size={17} color={GOLD} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search the record"
        placeholderTextColor={DUST_DIM}
        selectionColor={GOLD}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={{ flex: 1, fontFamily: JOST_400, fontSize: 16, color: STAR, paddingVertical: 8, letterSpacing: 0.4 }}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={DUST} />
        </Pressable>
      ) : null}
    </View>
  )
}
