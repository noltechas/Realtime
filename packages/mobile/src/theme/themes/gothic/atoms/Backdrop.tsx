import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

// Gothic backdrop: contrast only. Every screen renders one, and several are
// alive at once in a session, so it stays cheap: the nave itself (windows,
// moonlight, fog, storm, the watcher) is `SceneLayer`, mounted once behind the
// whole navigator. This just keeps the header band dark enough for the title.
export function Backdrop(): React.ReactElement {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['rgba(7,6,10,0.7)', 'rgba(7,6,10,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 150 }} />
    </View>
  )
}
