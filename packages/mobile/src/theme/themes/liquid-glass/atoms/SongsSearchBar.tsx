import React from 'react'
import { Pressable, TextInput } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SongsSearchBarProps } from '../../../types'
import { FAINT, Glass, SOFT, WHITE, sf } from './_glass'

// Liquid Glass search: a capsule of glass with the magnifier inside it.
export function SongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  return (
    <Glass radius={26} style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 10 }}>
      <Ionicons name="search" size={19} color={SOFT} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Songs, artists"
        placeholderTextColor={FAINT}
        selectionColor="#64D2FF"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        keyboardAppearance="dark"
        style={[sf(17, '500', WHITE), { flex: 1, paddingVertical: 8 }]}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={19} color={SOFT} />
        </Pressable>
      ) : null}
    </Glass>
  )
}
