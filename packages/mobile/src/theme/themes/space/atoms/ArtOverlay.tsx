import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { CornerTicks, ETCH, GOLD_HI, Twinkle } from './_record'

// Space stage-art overlay: the now-playing art framed like a field in a
// telescope camera: registration ticks in its corners, the edges falling off
// into the dark, and one star caught on the print.
export function ArtOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['rgba(2,3,8,0.35)', 'rgba(2,3,8,0)', 'rgba(2,3,8,0)', 'rgba(2,3,8,0.45)']} locations={[0, 0.25, 0.7, 1]} style={StyleSheet.absoluteFill} />
      <CornerTicks inset={10} size={14} color={ETCH.strong} />
      <Twinkle size={26} color={GOLD_HI} delay={600} period={4600} style={{ position: 'absolute', right: '12%', top: '10%' }} />
    </View>
  )
}
