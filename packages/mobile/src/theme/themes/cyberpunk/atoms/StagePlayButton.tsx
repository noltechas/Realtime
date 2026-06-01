import React from 'react'
import { View, Pressable, type ViewStyle } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { PlayButtonProps } from '../../../types'

// Cyberpunk play / pause button — a sharp-cornered HUD console key, not a
// candy-colored disc. Idle: void fill behind a neon-green outline + glyph with
// a heavy green bloom (matches the "You're Up!" hero's corner-tick framing).
// Playing: the panel charges to solid neon green with a dark void glyph. The
// singer's color is kept only as a thin "channel" bar along the bottom so
// identity still reads without turning the whole control red/pink.
export function CyberpunkStagePlayButton({
  isPlaying,
  singerColor,
  onPress,
}: PlayButtonProps) {
  const { tokens } = useTheme()
  const green = tokens.accentA
  const charged = isPlaying
  const glyphColor = charged ? tokens.appBg : green
  const fill = charged ? green : 'rgba(0,255,136,0.06)'

  const boxStyle: ViewStyle = {
    width: 124,
    height: 124,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: green,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: fill,
    shadowColor: green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: charged ? 0.95 : 0.6,
    shadowRadius: charged ? 28 : 18,
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [boxStyle, pressed ? { opacity: 0.85 } : null]}
    >
      <CornerTick corner="tl" color={green} />
      <CornerTick corner="tr" color={green} />
      <CornerTick corner="bl" color={green} />
      <CornerTick corner="br" color={green} />

      {charged ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={pauseBarStyle(glyphColor)} />
          <View style={pauseBarStyle(glyphColor)} />
        </View>
      ) : (
        <View style={playTriStyle(glyphColor)} />
      )}

      {/* singer "channel" color bar — identity without dominating the control */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 8,
          height: 4,
          backgroundColor: singerColor,
          shadowColor: singerColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 6,
        }}
      />
    </Pressable>
  )
}

function CornerTick({
  corner,
  color,
}: {
  corner: 'tl' | 'tr' | 'bl' | 'br'
  color: string
}) {
  const v = corner.includes('t') ? { top: -2 } : { bottom: -2 }
  const h = corner.includes('l') ? { left: -2 } : { right: -2 }
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: 16, height: 16 }, v as ViewStyle, h as ViewStyle]}>
      <View style={[{ position: 'absolute', height: 3, width: 16, backgroundColor: color }, v as ViewStyle, h as ViewStyle]} />
      <View style={[{ position: 'absolute', width: 3, height: 16, backgroundColor: color }, v as ViewStyle, h as ViewStyle]} />
    </View>
  )
}

function pauseBarStyle(color: string): ViewStyle {
  return {
    width: 14,
    height: 44,
    backgroundColor: color,
    borderRadius: 0,
  }
}

function playTriStyle(color: string): ViewStyle {
  return {
    width: 0,
    height: 0,
    borderTopWidth: 24,
    borderBottomWidth: 24,
    borderLeftWidth: 40,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: color,
    marginLeft: 8,
  }
}
