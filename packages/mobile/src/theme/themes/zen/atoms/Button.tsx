import React from 'react'
import { Pressable, Text, ActivityIndicator, View, type ViewStyle, type TextStyle } from 'react-native'
import Svg, { Path, G, Ellipse, Circle } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import type { ButtonProps } from '../../../types'

// Zen button — a hanko (Japanese ink seal):
//   • Primary: thick vermillion stamp with a cream double-border (like the
//     classic carved-stone seal frame). A subtle paper-grain overlay and a
//     kintsugi gold chip in one corner. Label is in mincho serif.
//   • Secondary: bamboo-green ink, paler fill, same hanko frame.
//   • Outline: cream washi with a sumi-ink hand-painted brush border
//     (irregular tapered stroke).
// Press: scales down 3% and tilts -1deg for a "hand-pressed" feel.
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { tokens } = useTheme()

  let fill: string
  let borderColor: string
  let innerBorderColor: string
  let fgColor: string
  let chipColor: string
  let showOutline = false

  if (variant === 'secondary') {
    fill = '#7BA05B'
    borderColor = '#3a4f29'
    innerBorderColor = '#F0E6D3'
    fgColor = '#F0E6D3'
    chipColor = '#D4B85A'
  } else if (variant === 'outline') {
    fill = '#F0E6D3'
    borderColor = '#1a1814'
    innerBorderColor = 'transparent'
    fgColor = '#1a1814'
    chipColor = '#D4442A'
    showOutline = true
  } else {
    fill = '#D4442A'
    borderColor = '#7A2616'
    innerBorderColor = '#F0E6D3'
    fgColor = '#F0E6D3'
    chipColor = '#D4B85A'
  }

  const boxStyle: ViewStyle = {
    backgroundColor: fill,
    borderWidth: showOutline ? 0 : 1.5,
    borderColor,
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    overflow: 'hidden',
  }

  const labelStyle: TextStyle = {
    color: fgColor,
    fontFamily: tokens.fontDisplay,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 1.2,
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        boxStyle,
        disabled || loading ? { opacity: 0.5 } : null,
        pressed
          ? { transform: [{ scale: 0.97 }, { rotate: '-1deg' }] }
          : null,
      ]}
    >
      {/* Brush-painted irregular border for outline variant */}
      {showOutline ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 200 56" preserveAspectRatio="none">
            <Path
              d="M 4 4 Q 60 2 100 4 T 196 5 L 195 50 Q 140 53 100 51 T 5 52 Z"
              stroke="#1a1814"
              strokeWidth={2.2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 4 4 Q 60 2 100 4 T 196 5 L 195 50 Q 140 53 100 51 T 5 52 Z"
              stroke="#5a3f2a"
              strokeWidth={0.8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.55}
            />
          </Svg>
        </View>
      ) : null}

      {/* Inner double-border (classic hanko frame) */}
      {!showOutline ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            right: 4,
            bottom: 4,
            borderWidth: 1,
            borderColor: innerBorderColor,
            borderRadius: 3,
            opacity: 0.45,
          }}
        />
      ) : null}

      {/* Paper-grain top overlay */}
      {!showOutline ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 12,
            backgroundColor: '#000',
            opacity: 0.05,
          }}
        />
      ) : null}

      {/* Kintsugi chip in upper-right */}
      {!showOutline ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8 }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 8 8">
            <Path
              d="M 0 0 L 8 1 L 7 4 L 8 8 L 4 7 L 0 8 L 1 4 Z"
              fill={chipColor}
              opacity={0.7}
            />
          </Svg>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {loading ? (
          <ActivityIndicator color={fgColor} />
        ) : (
          <>
            {/* Tiny sakura petal flanking the label */}
            <SakuraDot color={chipColor} />
            <Text style={labelStyle}>{label}</Text>
            <SakuraDot color={chipColor} />
          </>
        )}
      </View>
    </Pressable>
  )
}

function SakuraDot({ color }: { color: string }) {
  return (
    <Svg width={10} height={10} viewBox="0 0 10 10">
      <G transform="translate(5 5)">
        {[0, 72, 144, 216, 288].map((a) => (
          <G key={a} transform={`rotate(${a})`}>
            <Ellipse cx={0} cy={-2.5} rx={1.5} ry={2} fill={color} opacity={0.9} />
          </G>
        ))}
        <Circle cx={0} cy={0} r={0.9} fill="#7A2616" opacity={0.4} />
      </G>
    </Svg>
  )
}
