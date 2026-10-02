import React from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { IMG } from './_engine'

// Steampunk now-playing art: seen through a porthole's glass, the skylight's
// reflection across it and the edge falling into shadow.
export function ArtOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['rgba(18,13,10,0)', 'rgba(18,13,10,0.35)']} start={{ x: 0.5, y: 0.4 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <Image source={IMG.portholeGlass} resizeMode="stretch" style={{ position: 'absolute', left: '-24%', top: '-24%', width: '148%', height: '148%', opacity: 0.8 }} />
    </View>
  )
}
