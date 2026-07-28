import React from 'react'
import { Text, View } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { ScreenTitleProps } from '../../../types'
import { ACCENT, ON_FOOTAGE_SHADOW } from './_glass'

// Psychedelic screen heading — poster lettering straight on the footage.
//
// The title is one of the few things NOT on glass: at this size, with a shadow, it
// holds over the video by itself, and letting the liquid run right up to the
// letterforms is what ties the interface to the background. A short accent rule
// underneath anchors it without boxing it in.
export function PsychedelicScreenTitle({ title }: ScreenTitleProps) {
  const { tokens } = useTheme()
  return (
    <View>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: tokens.fontDisplay,
          fontSize: 36,
          lineHeight: 43,
          color: tokens.black,
          ...ON_FOOTAGE_SHADOW,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          marginTop: 6,
          width: 42,
          height: 3,
          borderRadius: 2,
          backgroundColor: ACCENT,
        }}
      />
    </View>
  )
}
