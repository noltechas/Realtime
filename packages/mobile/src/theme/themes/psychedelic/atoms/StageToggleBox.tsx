import React, { useEffect, useRef } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { ToggleBoxProps } from '../../../types'
import { GLASS_WELL, HAIRLINE_STRONG, INK, INK_LINE, INK_SOFT, MINT, TEXT, WARM } from './_glass'

// Psychedelic toggle — a printed switch.
//
// ON is an opaque MINT plate with ink lettering; OFF is a dark well with a heavy white
// keyline. So the two states differ in surface, not merely in a hairline's colour —
// which is what the glass version relied on, and what got lost against footage that is
// itself full of colour. State is still carried three ways: the plate, the thumb's
// position, and the word beside it.
export function PsychedelicStageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const { tokens } = useTheme()
  const slide = useRef(new Animated.Value(on ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(slide, {
      toValue: on ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start()
  }, [on, slide])

  const thumbX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 22] })

  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          borderRadius: 16,
          backgroundColor: on ? MINT : GLASS_WELL,
          borderWidth: on ? INK_LINE : 2,
          borderColor: on ? INK : HAIRLINE_STRONG,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingLeft: 14,
          paddingRight: 14,
          paddingVertical: 12,
          minHeight: 50,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.38,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <View
          style={{
            width: 46,
            height: 24,
            borderRadius: 12,
            backgroundColor: on ? 'rgba(8,6,12,0.22)' : 'rgba(0,0,0,0.5)',
            borderWidth: 2,
            borderColor: on ? INK : HAIRLINE_STRONG,
            justifyContent: 'center',
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              left: 2,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: on ? INK : 'rgba(255,255,255,0.6)',
              transform: [{ translateX: thumbX }],
            }}
          />
        </View>

        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: tokens.fontDisplay,
            fontSize: 17,
            color: on ? INK : TEXT,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            fontFamily: tokens.fontBody,
            fontSize: 13,
            fontWeight: '800',
            color: on ? INK_SOFT : WARM,
          }}
        >
          {on ? 'On' : 'Off'}
        </Text>
      </View>
    </Pressable>
  )
}
