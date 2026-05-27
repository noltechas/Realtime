import React from 'react'
import { View, Text, Pressable } from 'react-native'
import Svg, { Path, G, Ellipse, Circle } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import type { ToggleBoxProps } from '../../../types'

// Zen stage toggle — a paper lantern (chochin) on a washi strip:
//   • Off: the lantern is dark, lit only by ambient cream paper. A small
//     unlit cap and rope-tassel make it clearly read as a lantern.
//   • On: the lantern glows vermillion (with a gold inner-glow halo) and a
//     sakura petal replaces the unlit cap. The whole row gets a faint
//     gold sheen on its bottom edge — the "lit" tatami.
//   • The label is set in mincho serif to match other display text.
export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: '#F0E6D3',
          borderTopWidth: 3,
          borderBottomWidth: 3,
          borderTopColor: '#2a1f15',
          borderBottomColor: on ? '#D4442A' : '#2a1f15',
        },
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      {/* Hairline gold thread */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 3,
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
          bottom: 3,
          height: 1,
          backgroundColor: '#D4B85A',
          opacity: on ? 0.85 : 0.55,
        }}
      />

      <ChochinLantern on={on} />

      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '700',
          fontSize: 14,
          color: '#1a1814',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function ChochinLantern({ on }: { on: boolean }) {
  const body = on ? '#D4442A' : '#3a3328'
  const ribColor = on ? '#7A2616' : '#1a1814'
  const ropeColor = on ? '#D4B85A' : '#5a4d3a'
  const halo = on ? '#D4B85A' : 'transparent'

  return (
    <View style={{ width: 28, height: 32, alignItems: 'center', justifyContent: 'center' }}>
      {/* Halo */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: halo,
          opacity: on ? 0.35 : 0,
        }}
      />
      <Svg width={28} height={32} viewBox="0 0 28 32">
        {/* Rope at top */}
        <Path d="M 14 0 L 14 3" stroke={ropeColor} strokeWidth={1} strokeLinecap="round" />
        {/* Top horizontal cap (wooden batten) */}
        <Path d="M 8 4 L 20 4" stroke="#1a1814" strokeWidth={1.4} strokeLinecap="round" />
        {/* Lantern body */}
        <Ellipse
          cx={14}
          cy={16}
          rx={10}
          ry={11}
          fill={body}
          stroke="#1a1814"
          strokeWidth={1}
        />
        {/* Ribs */}
        <Path d="M 4 14 L 24 14" stroke={ribColor} strokeWidth={0.8} opacity={0.55} />
        <Path d="M 4 18 L 24 18" stroke={ribColor} strokeWidth={0.8} opacity={0.55} />
        <Path d="M 4 22 L 24 22" stroke={ribColor} strokeWidth={0.8} opacity={0.55} />
        {/* Bottom batten */}
        <Path d="M 8 28 L 20 28" stroke="#1a1814" strokeWidth={1.4} strokeLinecap="round" />
        {/* Tassel */}
        <Path d="M 14 28 L 14 31" stroke={ropeColor} strokeWidth={0.8} strokeLinecap="round" />
        {/* Center bloom — on state */}
        {on ? (
          <G transform="translate(14 16)">
            {[0, 72, 144, 216, 288].map((a) => (
              <G key={a} transform={`rotate(${a})`}>
                <Ellipse cx={0} cy={-2.5} rx={1.5} ry={2} fill="#F0E6D3" opacity={0.9} />
              </G>
            ))}
            <Circle cx={0} cy={0} r={1} fill="#D4B85A" />
          </G>
        ) : null}
      </Svg>
    </View>
  )
}
