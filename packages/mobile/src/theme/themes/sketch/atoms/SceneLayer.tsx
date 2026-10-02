import React from 'react'
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native'
import { IMG } from './_pencil'

// Sketch scene: the sheet of animation bond on the light table, mounted ONCE
// behind the whole navigator (so six screens don't each decode the paper).
// Lit from underneath: it glows a little in the middle and warms toward its
// edges, with its fibres and the ghosts of erased roughs (all baked into the
// rendered paper). Sized explicitly rather than cover-fit, which misplaces on
// iOS.
const PW = 675
const PH = 1462

export function SceneLayer(): React.ReactElement {
  const { width, height } = useWindowDimensions()
  const s = Math.max(width / PW, height / PH)
  const w = PW * s
  const h = PH * s
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#EFEBE2', overflow: 'hidden' }]}>
      <Image source={IMG.paper} style={{ position: 'absolute', left: (width - w) / 2, top: (height - h) / 2, width: w, height: h }} />
    </View>
  )
}
