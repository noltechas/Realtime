import React, { useEffect, useRef } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { ToggleBoxProps } from '../../../types'
import {
  CUT_CHIP,
  ICE,
  MONO,
  MachinedPanel,
  STEEL,
  STEEL_HI,
  TEXT,
  TEXT_FAINT,
  VOID,
} from './_ship'

// Space toggle — a rocker switch in a milled track.
//
// The thumb is a rectangular beveled block, not a round dot: nothing on a
// machined panel is a circle unless it's a lamp or a bore. It slides in a
// recessed track, and the state is spelled out in the telemetry face beside it
// (`ON` / `OFF`) rather than relying on colour alone — which also means the
// switch stays readable for a user who can't distinguish ice from steel.
export function SpaceStageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const { tokens } = useTheme()
  const slide = useRef(new Animated.Value(on ? 1 : 0)).current

  useEffect(() => {
    Animated.spring(slide, {
      toValue: on ? 1 : 0,
      stiffness: 240,
      damping: 20,
      mass: 0.6,
      useNativeDriver: true,
    }).start()
  }, [on, slide])

  const thumbX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 22] })

  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <MachinedPanel
        cuts={CUT_CHIP}
        tone={on ? 'ice' : 'steel'}
        fill={on ? 'raised' : 'glass'}
        systemBar={on}
        edgeStrength={on ? 1.3 : 0.6}
        contentStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingLeft: 12,
          paddingRight: 12,
          paddingVertical: 10,
          minHeight: 46,
        }}
      >
        {/* Milled track. */}
        <View
          style={{
            width: 46,
            height: 22,
            backgroundColor: on ? 'rgba(91,233,255,0.16)' : 'rgba(4,6,11,0.85)',
            borderWidth: 1,
            borderColor: on ? ICE : STEEL,
            justifyContent: 'center',
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              left: 1,
              width: 21,
              height: 18,
              top: 1,
              backgroundColor: on ? ICE : STEEL_HI,
              transform: [{ translateX: thumbX }],
            }}
          >
            {/* Bevel on the thumb — bright top edge, dark underside. */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: on ? '#DFFAFF' : '#C6D6E4',
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: VOID,
                opacity: 0.45,
              }}
            />
          </Animated.View>
        </View>

        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: tokens.fontDisplay,
            fontSize: 12,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: TEXT,
            opacity: on ? 1 : 0.72,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: 1.4,
            color: on ? ICE : TEXT_FAINT,
          }}
        >
          {on ? 'ON' : 'OFF'}
        </Text>
      </MachinedPanel>
    </Pressable>
  )
}
