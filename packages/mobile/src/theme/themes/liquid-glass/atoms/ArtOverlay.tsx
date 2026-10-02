import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

// Liquid Glass now-playing art: a sheen across its top and a lit hairline
// rim, as if the cover sat under a sheet of glass.
export function ArtOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0.1, y: 0 }} end={{ x: 0.6, y: 0.55 }} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderBottomColor: 'rgba(255,255,255,0.1)' }]} />
    </View>
  )
}
