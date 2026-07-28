import React, { useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import type { SongsSearchBarProps } from '../../../types'
import { ACCENT, INK, INK_FAINT, INK_LINE, WARM } from './_glass'

// Psychedelic search bay — a CREAM PLATE with ink lettering.
//
// It used to be dark blurred glass, which was defensible on its own and wrong in
// context: everything else on this screen is now an opaque printed plate, so a
// translucent panel at the top of the list read as a leftover from a different
// design. Cream is the right base for the one element the user types INTO — it's the
// brightest surface in the theme, so the caret and the query end up the
// highest-contrast thing on the screen, and it echoes the on-deck queue row.
//
// Losing the backdrop blur costs nothing: blur only reads as glass when you can see
// through it, and this panel is opaque by design now.
export function PsychedelicSongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  const { tokens } = useTheme()
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0

  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: WARM,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 13,
        minHeight: 52,
        gap: 11,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
        elevation: 7,
      }}
    >
      <Ionicons name="search" size={20} color={active ? ACCENT : INK} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Find a song"
        placeholderTextColor={INK_FAINT}
        style={{
          flex: 1,
          fontFamily: tokens.fontBody,
          fontWeight: '700',
          fontSize: 16,
          color: INK,
          padding: 0,
        }}
        selectionColor={ACCENT}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {/* Keyline last, above the fill — the same heavy poster edge every plate wears. */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: 18, borderWidth: INK_LINE, borderColor: INK },
        ]}
      />
    </View>
  )
}
