import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

// Steampunk backdrop: contrast only. The engine house itself is `SceneLayer`,
// mounted once behind the whole navigator; every screen renders one of these,
// so it stays cheap: the top darkens so the status bar and title read.
export function Backdrop(): React.ReactElement {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['rgba(12,9,7,0.82)', 'rgba(12,9,7,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 150 }} />
    </View>
  )
}
