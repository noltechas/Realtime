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
import type { ToggleBoxProps } from '../../../types'

// Space StageToggleBox — a translucent void capsule with a tiny planet thumb.
// The track is a thin HUD chip; when `on`, the planet glides to the right
// with a soft spring and the rim flips to magenta+glow. Label sits in caps
// with cyan/cool glow when off and magenta glow when on.
export function SpaceStageToggleBox({ label, on, onPress }: ToggleBoxProps) {
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
        wrapStyle(tokens, on),
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      <View style={trackStyle(tokens, on)}>
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
          {on ? (
            <Svg width={22} height={22} viewBox="0 0 22 22">
              <Defs>
                <RadialGradient
                  id="spaceToggleThumb"
                  cx="38%"
                  cy="32%"
                  rx="62%"
                  ry="62%"
                >
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                  <Stop offset="60%" stopColor="#E040FB" stopOpacity={1} />
                  <Stop offset="100%" stopColor="#5A1480" stopOpacity={0.95} />
                </RadialGradient>
              </Defs>
              <Circle cx={11} cy={11} r={10} fill="url(#spaceToggleThumb)" />
            </Svg>
          ) : (
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: tokens.muted,
                opacity: 0.75,
              }}
            />
          )}
        </Animated.View>
      </View>
      <Text style={labelStyle(tokens, on)} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

function wrapStyle(t: ReturnType<typeof useTheme>['tokens'], on: boolean): ViewStyle {
  return {
    // The toggle row in StageScreen lays toggles out in flex:row; using
    // width:'100%' here would make each toggle want the full row width
    // and push siblings off-screen. flex:1 lets the row split evenly.
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: on ? t.accentA : 'rgba(64,224,208,0.35)',
    backgroundColor: on ? 'rgba(224,64,251,0.14)' : 'rgba(14,14,26,0.7)',
    borderRadius: 8,
    ...(on
      ? {
          shadowColor: t.accentGlowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 10,
        }
      : {}),
  }
}
function trackStyle(t: ReturnType<typeof useTheme>['tokens'], on: boolean): ViewStyle {
  return {
    width: 50,
    height: 26,
    borderRadius: 13,
    backgroundColor: on ? 'rgba(224,64,251,0.25)' : 'rgba(8,8,15,0.7)',
    borderWidth: 1,
    borderColor: on ? t.accentA : 'rgba(64,224,208,0.3)',
  }
}
function labelStyle(t: ReturnType<typeof useTheme>['tokens'], on: boolean): TextStyle {
  return {
    flex: 1,
    fontFamily: t.fontDisplay,
    fontSize: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: t.black,
    opacity: on ? 1 : 0.85,
    textShadowColor: on ? 'rgba(224,64,251,0.7)' : 'rgba(64,224,208,0.45)',
    textShadowRadius: on ? 6 : 4,
    textShadowOffset: { width: 0, height: 0 },
  }
}
