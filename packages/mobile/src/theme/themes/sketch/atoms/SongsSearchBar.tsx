import React, { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SongsSearchBarProps } from '../../../types'
import { BLUE, FORM, GRAPHITE, GRAPHITE_SOFT, INK, LETTER_M, PencilBox, SHEET, printed } from './_pencil'

// Sketch search: a box pencilled on the sheet with its printed label above
// it, like a field on a form; you write in it. Focus redraws the box in blue.
export function SongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  const [focused, setFocused] = useState(false)
  return (
    <View>
      <Text style={printed(10, FORM, { marginLeft: 4, marginBottom: 2 })}>Search the library</Text>
      <PencilBox border={13} color={focused ? BLUE : GRAPHITE} fill={SHEET} contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 6, minHeight: 30 }}>
        <Ionicons name="search-outline" size={18} color={GRAPHITE} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="a song, an artist"
          placeholderTextColor={GRAPHITE_SOFT}
          selectionColor={BLUE}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{ flex: 1, fontFamily: LETTER_M, fontSize: 16.5, color: INK, paddingVertical: 4 }}
        />
        {value ? (
          <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close" size={18} color={GRAPHITE} />
          </Pressable>
        ) : null}
      </PencilBox>
    </View>
  )
}
