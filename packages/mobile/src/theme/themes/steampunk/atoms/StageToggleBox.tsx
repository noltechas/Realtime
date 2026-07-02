import React, { useEffect, useRef } from 'react'
import { Pressable, View, Text, Animated, StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, RadialGradient, Stop, Line } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import {
  BRASS_FACE,
  BRASS_BRIGHT,
  IRON_WELL,
  PARCH,
  PARCH_DIM,
  HAIRLINE,
  HAIRLINE_SOFT,
} from './_steam'
import type { ToggleBoxProps } from '../../../types'

// Steampunk StageToggleBox — a valve slide on an instrument plate. The track
// is a recessed iron slot; when the valve opens, the slot fills with polished
// brass and the engraved label lights amber. The thumb is a machined brass
// knob with a screw slot.
export function SteampunkStageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const { tokens } = useTheme()
  const slide = useRef(new Animated.Value(on ? 1 : 0)).current

  useEffect(() => {
    Animated.spring(slide, {
      toValue: on ? 1 : 0,
      tension: 90,
      friction: 10,
      useNativeDriver: true,
    }).start()
  }, [on, slide])

  const thumbX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 22] })

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [wrapStyle(on), pressed ? { opacity: 0.85, transform: [{ translateY: 1 }] } : null]}
    >
      {/* recessed track */}
      <View style={trackStyle(on)}>
        {on ? (
          <LinearGradient
            colors={BRASS_FACE}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
          />
        ) : null}
        <Animated.View
          style={{ position: 'absolute', left: 2, top: 1.5, width: 21, height: 21, transform: [{ translateX: thumbX }] }}
        >
          <Svg width={21} height={21} viewBox="0 0 22 22">
            <Defs>
              <RadialGradient id={on ? 'valve-on' : 'valve-off'} cx="35%" cy="30%" rx="65%" ry="65%">
                <Stop offset="0%" stopColor={on ? '#F7E6BB' : '#C9B088'} stopOpacity={1} />
                <Stop offset="60%" stopColor={on ? '#D8AC5A' : '#8A6B3C'} stopOpacity={1} />
                <Stop offset="100%" stopColor={on ? '#7E571E' : '#3E2C12'} stopOpacity={1} />
              </RadialGradient>
            </Defs>
            <Circle cx={11} cy={11} r={10} fill={`url(#${on ? 'valve-on' : 'valve-off'})`} stroke="rgba(0,0,0,0.55)" strokeWidth={0.7} />
            {/* screw slot */}
            <Line x1={7} y1={11} x2={15} y2={11} stroke="#3A2810" strokeWidth={1.4} strokeLinecap="round" transform={`rotate(${on ? 90 : 0} 11 11)`} />
          </Svg>
        </Animated.View>
      </View>

      <Text style={labelStyle(tokens.fontDisplay, on)} numberOfLines={1}>
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
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: on ? HAIRLINE : HAIRLINE_SOFT,
    backgroundColor: on ? 'rgba(232,169,59,0.08)' : 'rgba(34,23,17,0.85)',
    borderRadius: 9,
    ...(on
      ? { shadowColor: '#E8A93B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8 }
      : {}),
  }
}
function trackStyle(on: boolean): ViewStyle {
  return {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: IRON_WELL,
    borderWidth: 1,
    borderColor: on ? BRASS_BRIGHT : HAIRLINE_SOFT,
    overflow: 'hidden',
  }
}
function labelStyle(fontDisplay: string, on: boolean): TextStyle {
  return {
    flex: 1,
    fontFamily: fontDisplay,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: on ? PARCH : PARCH_DIM,
    includeFontPadding: false,
    textShadowColor: on ? 'rgba(232,169,59,0.5)' : 'transparent',
    textShadowRadius: on ? 6 : 0,
    textShadowOffset: { width: 0, height: 0 },
  }
}
