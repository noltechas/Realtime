import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

// Barbie backdrop: contrast only. The painted town itself is `SceneLayer`,
// mounted once behind the whole navigator; every screen renders one of these,
// so it stays cheap. A soft white morning haze along the top keeps the status
// bar and the sign-painted title crisp against the sky.
export function Backdrop(): React.ReactElement {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 150 }} />
    </View>
  )
}
