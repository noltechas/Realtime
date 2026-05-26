import React from 'react'
import { View, TextInput } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { SongsSearchBarProps } from '../../../types'

// Sketch search bar — dashed border + paper fill so it looks like a
// "Search ___________" fill-in-the-blank line. Magnifying glass on the left
// is drawn as a small pencil circle so it stays consistent with the rest of
// the marker-on-paper iconography.
export function SongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  const { tokens } = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: tokens.creamDark,
        borderWidth: 2,
        borderColor: tokens.dimBorder,
        borderStyle: 'dashed',
        // Slight blob jitter so the search field reads as hand-drawn.
        borderTopLeftRadius: 4,
        borderTopRightRadius: 2,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 5,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <SketchSearchGlyph color={tokens.muted} />
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

function SketchSearchGlyph({ color }: { color: string }) {
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
