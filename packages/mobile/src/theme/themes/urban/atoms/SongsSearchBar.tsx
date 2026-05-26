import React from 'react'
import { View, TextInput } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { SongsSearchBarProps } from '../../../types'

// Urban search bar — sharp-cornered dark input well with a 1px dim border.
// No skew on the search field (the keyboard caret has to land on real
// upright glyphs to be usable); the rest of the page provides the structural
// character. Search icon is a minimalist outlined magnifier in dim muted.
export function UrbanSongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  const { tokens } = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: tokens.creamDark,
        borderWidth: 1,
        borderColor: tokens.dimBorder,
        borderRadius: 0,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <SearchGlyph color={tokens.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search songs or artists…"
        placeholderTextColor={tokens.faint}
        style={{
          flex: 1,
          marginLeft: 10,
          fontFamily: tokens.fontBody,
          fontSize: 16,
          color: tokens.black,
          padding: 0,
        }}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>
  )
}

function SearchGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 6,
          height: 2,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
          borderRadius: 1,
        }}
      />
    </View>
  )
}
