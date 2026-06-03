import React from 'react'
import { Pressable, View, type ViewStyle } from 'react-native'
import type { PlayButtonProps } from '../../../types'
import { INK, PANEL, YELLOW, RED, inkShadow, slam, Halftone } from './_comic'

// Comic-Book Stage play/pause button — a clean, bold comic "button": one heavy
// ink-ringed circle in a flat pop color, printed with a faint Ben-Day halftone,
// a concentric inner keyline (the classic comic double-stroke), and a crisp
// transport glyph. PLAY is pop-yellow with an ink triangle; PLAYING flips to
// pop-red with white pause bars. Hard ink offset shadow; slams flush on press.
// (Replaces the old spiky red "explosion" core.)

const SIZE = 152
const RING_INSET = 11

export function StagePlayButton({ isPlaying, onPress }: PlayButtonProps) {
  const fill = isPlaying ? RED : YELLOW
  const fg = isPlaying ? PANEL : INK

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        circleStyle,
        { backgroundColor: fill },
        pressed ? slam(4) : null,
      ]}
    >
      {/* Halftone print, clipped to the circle (separate layer so the offset
          shadow on the circle itself isn't clipped). */}
      <View style={clipStyle} pointerEvents="none">
        <Halftone color={INK} opacity={isPlaying ? 0.18 : 0.12} dot={2.4} gap={8} />
      </View>

      {/* Concentric inner keyline — the comic double-stroke */}
      <View style={[ringStyle, { borderColor: fg }]} pointerEvents="none" />

      {/* Transport glyph */}
      {isPlaying ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 14, height: 46, borderRadius: 3, backgroundColor: fg }} />
          <View style={{ width: 14, height: 46, borderRadius: 3, backgroundColor: fg }} />
        </View>
      ) : (
        <View
          style={{
            width: 0,
            height: 0,
            borderTopWidth: 27,
            borderBottomWidth: 27,
            borderLeftWidth: 44,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: fg,
            marginLeft: 12,
          }}
        />
      )}
    </Pressable>
  )
}

const circleStyle: ViewStyle = {
  width: SIZE,
  height: SIZE,
  borderRadius: SIZE / 2,
  borderWidth: 5,
  borderColor: INK,
  alignItems: 'center',
  justifyContent: 'center',
  ...inkShadow(6),
}

const clipStyle: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: SIZE / 2,
  overflow: 'hidden',
}

const ringStyle: ViewStyle = {
  position: 'absolute',
  top: RING_INSET,
  left: RING_INSET,
  right: RING_INSET,
  bottom: RING_INSET,
  borderRadius: (SIZE - RING_INSET * 2) / 2,
  borderWidth: 3,
}
