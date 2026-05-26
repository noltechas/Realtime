import React from 'react'
import { View, TextInput } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { SongsSearchBarProps } from '../../../types'

// Deep-sea Songs-screen search field. Translucent navy fill with a faint
// cyan border and a strong bioluminescent halo so it reads as a glowing
// porthole over the caustics backdrop. Placeholder text fades to a soft
// cyan; entered text is solid white so it doesn't get lost on dark surfaces.
export function SongsSearchBar({
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
          backgroundColor: 'rgba(12,29,66,0.6)',
          borderWidth: 1,
          borderColor: 'rgba(0,255,200,0.3)',
          borderRadius: tokens.radiusSmall,
          paddingHorizontal: 14,
          paddingVertical: 10,
          shadowColor: tokens.accentGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 10,
        }}
      >
        <SearchGlyph color={tokens.accentA} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search songs or artists…"
          placeholderTextColor="rgba(0,255,200,0.5)"
          style={{
            flex: 1,
            marginLeft: 10,
            fontFamily: tokens.fontBody,
            fontSize: 16,
            color: '#FFFFFF',
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
