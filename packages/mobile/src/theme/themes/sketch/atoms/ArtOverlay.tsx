import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Tape } from './_pencil'

// Sketch now-playing art: a print taped up on the sheet. Its white border,
// and a strip of tape across the top edge.
export function ArtOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { borderWidth: 6, borderColor: '#FBFAF6' }]} />
      <Tape width={96} variant={1} angle={-3} style={{ left: '50%', marginLeft: -48, top: -6 }} />
    </View>
  )
}
