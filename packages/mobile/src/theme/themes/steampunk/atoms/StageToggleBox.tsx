import React, { useEffect, useRef } from 'react'
import {
  Pressable,
  View,
  Text,
  Animated,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { Rivet } from '../Gear'
import type { ToggleBoxProps } from '../../../types'

// Steampunk StageToggleBox — a brass lever switch:
//   • Mahogany track with a brass rim. When `off`, the track is unlit;
//     when `on`, the rim flips to gas-lamp amber with a strong glow.
//   • Thumb is a polished brass knob (cabochon-shaped) with a tiny rivet
//     center. Slides left↔right with a spring transition.
//   • Engraved Cinzel label sits in caps, amber on, sepia off.
export function SteampunkStageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const { tokens } = useTheme()
  const slide = useRef(new Animated.Value(on ? 1 : 0)).current

  useEffect(() => {
    Animated.spring(slide, {
      toValue: on ? 1 : 0,
      tension: 80,
      friction: 9,
      useNativeDriver: true,
    }).start()
  }, [on, slide])

  const thumbX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
  })

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        wrapStyle(on),
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      <View style={trackStyle(on)}>
        <Animated.View
          style={{
            position: 'absolute',
            left: 2,
            top: 2,
            width: 22,
            height: 22,
            transform: [{ translateX: thumbX }],
          }}
        >
          <Svg width={22} height={22} viewBox="0 0 22 22">
            <Defs>
              <RadialGradient
                id={on ? 'steamToggleOn' : 'steamToggleOff'}
                cx="35%"
                cy="30%"
                rx="65%"
                ry="65%"
              >
                <Stop offset="0%" stopColor="#F0DDB5" stopOpacity={1} />
                <Stop offset="60%" stopColor={on ? '#E8A93B' : '#7A5A3A'} stopOpacity={1} />
                <Stop offset="100%" stopColor={on ? '#5C3A12' : '#2A1808'} stopOpacity={1} />
              </RadialGradient>
            </Defs>
            <Circle cx={11} cy={11} r={10} fill={`url(#${on ? 'steamToggleOn' : 'steamToggleOff'})`} />
            <Circle cx={11} cy={11} r={9.5} fill="none" stroke="#3E2810" strokeWidth={0.5} opacity={0.7} />
            {/* Center pin */}
            <Circle cx={11} cy={11} r={1.8} fill="#3E2810" />
          </Svg>
        </Animated.View>
      </View>
      <Text style={labelStyle(tokens, on)} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

function wrapStyle(on: boolean): ViewStyle {
  return {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: on ? '#E8A93B' : '#7A4D1A',
    backgroundColor: on ? 'rgba(232,169,59,0.15)' : '#2A1A0E',
    borderRadius: 6,
    ...(on
      ? {
          shadowColor: '#E8A93B',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.65,
          shadowRadius: 10,
        }
      : {}),
  }
}
function trackStyle(on: boolean): ViewStyle {
  return {
    width: 50,
    height: 26,
    borderRadius: 13,
    backgroundColor: on ? 'rgba(232,169,59,0.25)' : '#1A0E04',
    borderWidth: 1.5,
    borderColor: on ? '#E8A93B' : '#5C3A12',
  }
}
function labelStyle(t: ReturnType<typeof useTheme>['tokens'], on: boolean): TextStyle {
  return {
    flex: 1,
    fontFamily: t.fontDisplay,
    fontSize: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: on ? '#F0DDB5' : '#C9A878',
    opacity: on ? 1 : 0.8,
    textShadowColor: on ? 'rgba(232,169,59,0.7)' : 'rgba(184,118,45,0.4)',
    textShadowRadius: on ? 5 : 3,
    textShadowOffset: { width: 0, height: 0 },
  }
}
