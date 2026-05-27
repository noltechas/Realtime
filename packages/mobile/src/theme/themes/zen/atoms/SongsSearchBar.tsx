import React from 'react'
import { View, TextInput } from 'react-native'
import Svg, { Path, Circle, G, Ellipse } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import type { SongsSearchBarProps } from '../../../types'

// Zen songs search bar — a horizontal hanging scroll (kakemono):
//   • Wooden dowel "rollers" cap each end (vertical bars in deep brown with
//     gold end-caps suggesting brass fittings).
//   • Between them, a strip of washi paper with sumi-ink borders top + bottom.
//   • The search icon is a sumi-ink-painted handheld magnifier circle drawn
//     with a single brush stroke.
//   • Placeholder text reads in dark earth-brown so it doesn't compete with
//     the kintsugi accents elsewhere on the screen.
export function SongsSearchBar({
  value,
  onChangeText,
}: SongsSearchBarProps) {
  const { tokens } = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        height: 50,
      }}
    >
      <ScrollDowel />

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#F0E6D3',
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderTopColor: '#2a1f15',
          borderBottomColor: '#2a1f15',
          paddingHorizontal: 14,
        }}
      >
        {/* Hairline gold thread inside the binding */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 2,
            height: 1,
            backgroundColor: '#D4B85A',
            opacity: 0.55,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 2,
            height: 1,
            backgroundColor: '#D4B85A',
            opacity: 0.55,
          }}
        />

        <BrushMagnifier />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search songs or artists…"
          placeholderTextColor="#8a7864"
          style={{
            flex: 1,
            marginLeft: 10,
            fontFamily: tokens.fontBody,
            fontSize: 15,
            color: '#1a1814',
            padding: 0,
            letterSpacing: 0.2,
          }}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {/* Tiny sakura petal at the right edge */}
        <View style={{ marginLeft: 8, width: 14, height: 14 }}>
          <Svg width={14} height={14} viewBox="0 0 14 14">
            <G transform="translate(7 7)">
              {[0, 72, 144, 216, 288].map((a) => (
                <G key={a} transform={`rotate(${a})`}>
                  <Ellipse
                    cx={0}
                    cy={-3.6}
                    rx={2.2}
                    ry={2.8}
                    fill="#F4B6C2"
                    stroke="#A85E76"
                    strokeWidth={0.3}
                  />
                </G>
              ))}
              <Circle cx={0} cy={0} r={1.2} fill="#D4B85A" />
            </G>
          </Svg>
        </View>
      </View>

      <ScrollDowel />
    </View>
  )
}

// ── Scroll dowel ends ───────────────────────────────────────────────────────
function ScrollDowel() {
  return (
    <View
      style={{
        width: 14,
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Brass cap */}
      <View
        style={{
          width: 14,
          height: 6,
          backgroundColor: '#D4B85A',
          borderWidth: 1,
          borderColor: '#7A6A2C',
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        }}
      />
      {/* Wood dowel */}
      <View
        style={{
          flex: 1,
          width: 9,
          backgroundColor: '#5a3f2a',
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderLeftColor: '#2a1f15',
          borderRightColor: '#2a1f15',
        }}
      />
      {/* Brass cap (bottom) */}
      <View
        style={{
          width: 14,
          height: 6,
          backgroundColor: '#D4B85A',
          borderWidth: 1,
          borderColor: '#7A6A2C',
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
        }}
      />
    </View>
  )
}

// ── Brush-painted magnifier ────────────────────────────────────────────────
function BrushMagnifier() {
  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 22 22">
        {/* Single tapered brushstroke circle */}
        <Path
          d="M 14 4 A 7 7 0 1 0 16 7"
          stroke="#1a1814"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
        {/* Handle as a flick of ink */}
        <Path
          d="M 15.5 15.5 L 20 20"
          stroke="#1a1814"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  )
}
