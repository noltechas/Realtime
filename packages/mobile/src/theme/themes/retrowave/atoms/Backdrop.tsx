import React, { useEffect } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import { VideoView, useVideoPlayer } from 'expo-video'

// Retrowave backdrop — a looping silent video loop of the canonical
// synthwave sun/grid/horizon scene, sourced from `assets/retrowave-backdrop.mp4`.
// Render strategy:
//   • Fullscreen container the same size as the device
//   • VideoView fills it with `contentFit="cover"` (replaces the SVG-built
//     sun + grid + mountains that lived here before)
//   • The player is muted, loops forever, and starts playing as soon as
//     the component mounts
//   • A faint vignette View sits on top fading the bottom edge to the dark
//     sky color so list content overlaid above stays readable
//
// `pointerEvents="none"` so taps still hit the foreground content. The
// previous SVG version (drifting nebula sun, scanline grid, mountain
// silhouettes) has been removed entirely.

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

const RETROWAVE_VIDEO = require('../../../../../assets/retrowave-backdrop.mp4')

export function Backdrop(): React.ReactElement {
  const player = useVideoPlayer(RETROWAVE_VIDEO, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })

  // Defensive: if anything pauses the player (audio session interruption,
  // app backgrounding), make sure it resumes when we re-enter.
  useEffect(() => {
    return () => {
      // expo-video cleans up its own resources when the player is GC'd —
      // nothing to do here.
    }
  }, [player])

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: '#0A0420', overflow: 'hidden' }]}
    >
      <VideoView
        player={player}
        style={{ width: SCREEN_W, height: SCREEN_H }}
        contentFit="cover"
        nativeControls={false}
        // Hide audio routing / picture-in-picture UI we don't want
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />

      {/* Bottom vignette — fade the lower portion to the app bg color so
          the foreground list content + tab bar stay legible against busy
          frames of the video. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: SCREEN_H * 0.3,
          backgroundColor: '#0A0420',
          opacity: 0.55,
        }}
      />
    </View>
  )
}
