import React from 'react'
import { View, TextInput } from 'react-native'
import { COMIC_BOOK_MOBILE } from '../../../tokens'
import type { SongsSearchBarProps } from '../../../types'
import { INK, PANEL, YELLOW, inkShadow } from './_comic'

// Comic-Book Songs search bar — an inked panel with a hard offset shadow and the
// magnifier punched onto a yellow spot-color dot. Returns just the input box;
// the screen owns page-level padding.
const t = COMIC_BOOK_MOBILE

export function SongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: PANEL,
        borderWidth: 3,
        borderColor: INK,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
        ...inkShadow(3),
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          borderWidth: 2.5,
          borderColor: INK,
          backgroundColor: YELLOW,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SearchGlyph color={INK} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search songs or artists…"
        placeholderTextColor={t.faint}
        style={{ flex: 1, fontFamily: t.fontBody, fontWeight: '700', fontSize: 15, color: INK, padding: 0 }}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>
  )
}

// Hand-built magnifying glass — pure View primitives.
function SearchGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 11, height: 11, borderRadius: 999, borderWidth: 2.5, borderColor: color }} />
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 6,
          height: 2.5,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
          borderRadius: 1,
        }}
      />
    </View>
  )
}
