import React from 'react'
import { View, TextInput } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { SongsSearchBarProps } from '../../../types'

// Cyberpunk Songs-screen search field. Very dark transparent green wash
// (rgba 0,255,136,0.04), sharp corners, faint accent border, no glow when
// idle. The CRT-style placeholder text reads in `faint` neon so it doesn't
// overpower the dot-grid backdrop behind it.
export function CyberpunkSongsSearchBar({
  value,
  onChangeText,
}: SongsSearchBarProps) {
  const { tokens } = useTheme()
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 16, marginBottom: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(0,255,136,0.04)',
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
