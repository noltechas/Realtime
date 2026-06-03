import React from 'react'
import { View, TextInput } from 'react-native'
import { TROPICAL_MOBILE } from '../../../tokens'
import type { SongsSearchBarProps } from '../../../types'
import { INK, PANEL_GLASS, LAGOON, BAMBOO_LT, softShadow } from './_tropical'

// Tropical Songs search bar — a translucent sand panel framed with a soft
// bamboo keyline, the magnifier punched onto a lagoon spot. Returns just the
// input box; the screen owns page-level padding.
const t = TROPICAL_MOBILE

export function SongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: PANEL_GLASS,
        borderWidth: 2,
        borderColor: BAMBOO_LT,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        ...softShadow(5),
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: LAGOON,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SearchGlyph color="#FFFFFF" />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search songs or artists…"
        placeholderTextColor={t.faint}
        style={{ flex: 1, fontFamily: t.fontBody, fontWeight: '600', fontSize: 15, color: INK, padding: 0 }}
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
