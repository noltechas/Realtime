import React from 'react'
import { Pressable, View, type ViewStyle } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { PlayButtonProps } from '../../../types'

// Urban StagePlayButton — a 120×120 skewed parallelogram with the toxic-green
// drop-shadow border treatment. The play triangle and pause bars are
// counter-skewed (skewX +8deg) so they read upright inside the warped shell.
// `singerColor` paints the resting (idle) background so the button picks up
// the active singer's identity color; flips to `vividYellow` while playing.
export function UrbanStagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const { tokens } = useTheme()
  const unskew: { skewX: string }[] = [{ skewX: '8deg' }]

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        boxStyle(tokens),
        { backgroundColor: isPlaying ? tokens.vividYellow : singerColor },
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      {isPlaying ? (
        <View style={{ flexDirection: 'row', gap: 10, transform: unskew }}>
          <View style={pauseBarStyle(tokens)} />
          <View style={pauseBarStyle(tokens)} />
        </View>
      ) : (
        <View style={[playTriStyle(tokens), { transform: unskew }]} />
      )}
    </Pressable>
  )
}

function boxStyle(t: ReturnType<typeof useTheme>['tokens']): ViewStyle {
  return {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: t.dimBorder,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderRightColor: t.accentA,
    borderBottomColor: t.accentA,
    transform: [{ skewX: '-8deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  }
}
function playTriStyle(t: ReturnType<typeof useTheme>['tokens']): ViewStyle {
  return {
    width: 0,
    height: 0,
    borderTopWidth: 24,
    borderBottomWidth: 24,
    borderLeftWidth: 40,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: t.appBg,
    marginLeft: 8,
  }
}
function pauseBarStyle(t: ReturnType<typeof useTheme>['tokens']): ViewStyle {
  return {
    width: 14,
    height: 44,
    backgroundColor: t.appBg,
    borderRadius: 0,
  }
}
