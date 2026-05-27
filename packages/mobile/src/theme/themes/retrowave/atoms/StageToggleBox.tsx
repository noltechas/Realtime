import React, { useEffect, useRef } from 'react'
import {
  Pressable,
  View,
  Text,
  Animated,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../../ThemeContext'
import type { ToggleBoxProps } from '../../../types'

// Retrowave StageToggleBox — an arcade-cab toggle switch:
//   • Sharp-rectangle track with a hot-pink rim when on, cyan when off.
//   • Thumb is a chrome-pink plate when on, dim violet when off.
//   • Track has a thin scanline overlay and a chrome top-edge highlight.
//   • Label sits in italic Audiowide caps with chromatic-aberration fringe.
export function RetrowaveStageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const { tokens } = useTheme()
  const slide = useRef(new Animated.Value(on ? 1 : 0)).current

  useEffect(() => {
    Animated.spring(slide, {
      toValue: on ? 1 : 0,
      tension: 90,
      friction: 9,
      useNativeDriver: true,
    }).start()
  }, [on, slide])

  const thumbX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 22] })

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        wrapStyle(on),
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      <View style={trackStyle(on)}>
        {/* Top chrome highlight */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 }}
        >
          <LinearGradient
            colors={[on ? 'rgba(255,181,222,0.85)' : 'rgba(0,240,255,0.7)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ width: '100%', height: '100%' }}
          />
        </View>
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
          <View
            style={{
              width: 22,
              height: 22,
              overflow: 'hidden',
              shadowColor: on ? '#FF2D95' : '#00F0FF',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: on ? 1 : 0.7,
              shadowRadius: 6,
            }}
          >
            <LinearGradient
              colors={on ? ['#FFB5DE', '#FF2D95', '#5A0838'] : ['#5C6E90', '#3A4470', '#1A0A3A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ width: '100%', height: '100%' }}
            />
            {/* Chrome top */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: '#FFFFFF',
                opacity: 0.75,
              }}
            />
          </View>
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
    borderWidth: 1.5,
    borderColor: on ? '#FF2D95' : '#7A5FA8',
    backgroundColor: on ? 'rgba(255,45,149,0.15)' : '#1A0A3A',
    ...(on
      ? {
          shadowColor: '#FF2D95',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 10,
        }
      : {}),
  }
}
function trackStyle(on: boolean): ViewStyle {
  return {
    width: 50,
    height: 26,
    backgroundColor: on ? 'rgba(255,45,149,0.25)' : '#0A0420',
    borderWidth: 1,
    borderColor: on ? '#FF2D95' : '#00F0FF',
    overflow: 'hidden',
  }
}
function labelStyle(t: ReturnType<typeof useTheme>['tokens'], on: boolean): TextStyle {
  return {
    flex: 1,
    fontFamily: t.fontBody,
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontStyle: 'italic',
    color: on ? '#FFFFFF' : '#B5A0E0',
    opacity: on ? 1 : 0.85,
    textShadowColor: on ? 'rgba(255,45,149,0.85)' : 'rgba(0,240,255,0.4)',
    textShadowRadius: on ? 7 : 4,
    textShadowOffset: { width: 0, height: 0 },
  }
}
