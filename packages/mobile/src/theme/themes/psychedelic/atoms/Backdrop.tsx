import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Scrim, Veil } from './_glass'

// Psychedelic backdrop — contrast protection, nothing else.
//
// Screens render one of these each, and six are alive at once inside a session's
// tab navigator, so it has to stay cheap. All of the theme's atmosphere is the
// video in `ui.SceneLayer`, mounted once behind the whole navigator.
//
// The footage runs from near-black to PURE WHITE, so text can never rely on it
// being dark. The veil knocks the whole frame down a little and the scrims protect
// the header and tab-rail bands specifically.
export function Backdrop(): React.ReactElement {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Veil />
      <Scrim edge="top" />
      <Scrim edge="bottom" />
    </View>
  )
}
