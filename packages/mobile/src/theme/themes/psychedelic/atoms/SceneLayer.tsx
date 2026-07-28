import React, { useEffect, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { INK } from './_glass'

// ── The projector ───────────────────────────────────────────────────────────
//
// A real liquid light show, on film: oil, water and aniline dyes on an overhead
// projector. Mounted ONCE behind the entire navigator (see theme/types.ts
// `SceneLayer` and ThemeCrossfade), never per screen.
//
// It is footage rather than something generated. Two procedural attempts — a
// lobed-plate vocabulary and then a domain-warped shader — both read as computer
// graphics; the dye's actual behaviour (surface tension, refraction at the
// oil/water boundary, the way a bubble cluster packs) is not something a noise
// field imitates convincingly.
//
// ── The source ──────────────────────────────────────────────────────────────
// The original is a 2160x2160 square with the projector dish inscribed in it as a
// CIRCLE, so a naive fit shows black corners. The shipped asset is pre-cropped to
// the largest square that fits inside that circle (2160 / sqrt(2) ≈ 1527px),
// which means `contentFit="cover"` fills any aspect ratio — portrait phone or
// landscape stage — with no black anywhere and no runtime zoom hack.
//
// Cropping at encode time rather than scaling at runtime also means the device
// never decodes pixels it is about to throw away.
const LIQUID_VIDEO = require('../../../../../assets/video/liquid-light.mp4')

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

/** Length of the shipped clip, in seconds. Kept in sync with the encode. */
const CLIP_SECONDS = 180

export function SceneLayer(): React.ReactElement {
  // A random start offset per mount, so two people in the same room aren't
  // watching the same frame and a long session doesn't always open on the same
  // image. Chosen once and held — re-rolling on re-render would visibly jump.
  const [startAt] = useState(() => Math.random() * CLIP_SECONDS)

  const player = useVideoPlayer(LIQUID_VIDEO, (instance) => {
    instance.loop = true
    instance.muted = true
    // Slightly under real time: the dye already moves slowly, and easing it
    // further makes the background feel ambient rather than busy behind content.
    instance.playbackRate = 0.85
    instance.currentTime = startAt
    instance.play()
  })

  useEffect(() => {
    // `currentTime` set inside the initialiser can be clobbered if the asset
    // finishes loading afterwards, so seek again once on mount.
    player.currentTime = startAt
  }, [player, startAt])

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: INK }]}>
      <VideoView
        style={{ width: SCREEN_W, height: SCREEN_H }}
        player={player}
        // No chrome of any kind: this is wallpaper, not a player.
        nativeControls={false}
        contentFit="cover"
        allowsPictureInPicture={false}
        allowsFullscreen={false}
      />
    </View>
  )
}
