import React from 'react'
import { View, TextInput } from 'react-native'
import { NEO_BRUTAL_MOBILE } from '../../../tokens'
import type { SongsSearchBarProps } from '../../../types'

// Neo-brutal Songs search bar. Lifted from the default (non-deep-sea) branch
// of SongsScreen — cream-dark fill, 2px hard black border, small radius.
const t = NEO_BRUTAL_MOBILE

// Returns just the input box. The screen owns page-level padding around it
// so atoms don't double-wrap (which would double the horizontal padding and
// push the genre tabs below it down the page).
export function SongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.creamDark,
        borderWidth: 2,
        borderColor: t.black,
        borderRadius: t.radiusSmall,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <SearchGlyph color={t.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search songs or artists…"
        placeholderTextColor={t.faint}
        style={{
          flex: 1,
          marginLeft: 10,
          fontFamily: t.fontBody,
          fontSize: 16,
          color: t.black,
          padding: 0,
        }}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>
  )
}

// Hand-built magnifying glass — pure View primitives so we don't pull in
// Ionicons for one glyph. Sized to match the previous inline implementation.
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
