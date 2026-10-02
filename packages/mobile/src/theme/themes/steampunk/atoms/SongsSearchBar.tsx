import React, { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SongsSearchBarProps } from '../../../types'
import { BRASS, BRASS_DEEP, BRASS_HI, LAMP, OLD_I, PARCHMENT, PARCHMENT_DIM } from './_engine'

// Steampunk search: a recessed slot in the panel, its brass rim catching the
// light on top; focus lights the rim. The lens is brass.
export function SongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  const [focused, setFocused] = useState(false)
  return (
    <View
      style={{
        height: 50,
        borderRadius: 25,
        borderWidth: 1.5,
        borderColor: focused ? BRASS_HI : BRASS_DEEP,
        borderTopColor: focused ? '#FFF0C8' : BRASS,
        backgroundColor: '#0C0907',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        gap: 10,
      }}
    >
      <View pointerEvents="none" style={{ position: 'absolute', left: 14, right: 14, top: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.6)' }} />
      <Ionicons name="search" size={17} color={BRASS_HI} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search the songbook"
        placeholderTextColor={PARCHMENT_DIM}
        selectionColor={LAMP}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={{ flex: 1, fontFamily: OLD_I, fontSize: 17, color: PARCHMENT, paddingVertical: 8 }}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={PARCHMENT_DIM} />
        </Pressable>
      ) : null}
    </View>
  )
}
