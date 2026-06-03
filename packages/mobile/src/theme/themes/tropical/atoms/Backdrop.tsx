import React from 'react'
import { View, Image, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SAND } from './_tropical'

// Tropical backdrop — the island itself: a full-bleed photo of a palm-fringed
// turquoise lagoon (assets/tropical.jpg) behind all content. Two soft sand
// scrims (a faint all-over warm wash + a stronger bottom fade) keep foreground
// text and the floating tab bar legible over the busy photo without hiding the
// scene. Static + non-interactive (pointerEvents="none").
const TROPICAL_PHOTO = require('../../../../../assets/tropical.jpg')

export function Backdrop(): React.ReactElement {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: SAND, overflow: 'hidden' }]}>
      <Image source={TROPICAL_PHOTO} style={StyleSheet.absoluteFill} resizeMode="cover" />
      {/* faint warm wash so dark ink text reads anywhere over the photo */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,244,222,0.30)' }]} />
      {/* bottom fade to sand so the floating tab bar + lower content stay clean */}
      <LinearGradient
        colors={['transparent', 'rgba(255,244,222,0.0)', 'rgba(255,244,222,0.72)']}
        locations={[0, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  )
}
