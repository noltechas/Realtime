import React from 'react'
import { StyleSheet, View } from 'react-native'
import { ViewportScrim } from './_ship'

// Space backdrop — deliberately almost nothing.
//
// Screens render one of these each, and there are six of them alive at once
// inside a session's tab navigator. All of this theme's atmosphere therefore
// lives in `ui.SceneLayer` instead, which is mounted a single time behind the
// whole navigator (see theme/types.ts) and owns the one Filament engine.
//
// What is left here is per-screen and cheap: the two scrims that keep type
// legible over the moving 3D scene. They are per-screen rather than part of the
// SceneLayer because each screen wants its own darkening — and because a scrim
// belongs above a screen's own background, not below it.
export function Backdrop(): React.ReactElement {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <ViewportScrim edge="top" />
      <ViewportScrim edge="bottom" />
    </View>
  )
}
