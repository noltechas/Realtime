import React from 'react'
import { View, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { CornerBrackets, HAIRLINE_SOFT } from './_steam'

// Steampunk ArtOverlay — mounts the Stage now-playing art the way the song
// cards do: four brass corner brackets, an engraved inner hairline, and a
// whisper of glass light across the top. Purely decorative, fully static.
export function ArtOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { margin: 4, borderRadius: 6, borderWidth: 1, borderColor: HAIRLINE_SOFT },
        ]}
      />
      <LinearGradient
        colors={['rgba(255,246,224,0.12)', 'rgba(255,246,224,0)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '24%' }}
      />
      <CornerBrackets length={16} thickness={2.5} inset={0} />
    </View>
  )
}
