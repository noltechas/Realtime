import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

// Space backdrop: contrast only. Deep space itself is `SceneLayer`, mounted
// once behind the whole navigator; every screen renders one of these, so it
// stays cheap: the sky darkens toward the top so the status bar and title read.
export function Backdrop(): React.ReactElement {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['rgba(2,3,8,0.78)', 'rgba(2,3,8,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 150 }} />
    </View>
  )
}
