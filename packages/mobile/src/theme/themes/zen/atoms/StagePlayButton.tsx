import React from 'react'
import { Pressable, View } from 'react-native'
import Svg, { Path, G, Ellipse, Circle } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import type { PlayButtonProps } from '../../../types'

// Zen stage play button — an enso brush circle, 130px:
//   • The enso (incomplete brush-painted circle) is the iconic zen motif and
//     here it forms the entire button. The circle opens at the bottom-right;
//     the gap is intentional.
//   • Idle (not playing): a vermillion ink-stroke triangle sits inside the
//     enso, oriented like a sumi-e play glyph, with a soft singer-color
//     halo behind it.
//   • Playing: two vertical bamboo cylinders (with node rings) replace the
//     play triangle — the bamboo joint motif as a pause symbol.
//   • A sakura blossom sits at the bottom-right opening of the enso,
//     covering the brush gap as if the petal fell from the upper-left.
//   • Press: opacity dip + small scale dip (still calm).
export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 130,
          height: 130,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : null,
      ]}
    >
      {/* Soft singer-color halo behind everything */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 118,
          height: 118,
          borderRadius: 59,
          backgroundColor: isPlaying ? '#D4B85A' : singerColor,
          opacity: 0.18,
        }}
      />

      {/* Enso brush circle */}
      <View style={{ position: 'absolute', width: 130, height: 130 }}>
        <Svg width={130} height={130} viewBox="0 0 130 130">
          {/* Outer enso — heavy ink stroke that thins toward the gap */}
          <Path
            d="M 95 18 A 55 55 0 1 0 110 32"
            stroke="#1a1814"
            strokeWidth={5.5}
            fill="none"
            strokeLinecap="round"
          />
          {/* Highlight pass */}
          <Path
            d="M 95 18 A 55 55 0 1 0 110 32"
            stroke="#5a3f2a"
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            opacity={0.5}
          />
        </Svg>
      </View>

      {/* Sakura blossom covering the enso gap (bottom-right opening) */}
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 18, right: 18, width: 22, height: 22 }}>
        <Svg width={22} height={22} viewBox="0 0 22 22">
          <G transform="translate(11 11)">
            {[0, 72, 144, 216, 288].map((a) => (
              <G key={a} transform={`rotate(${a})`}>
                <Ellipse cx={0} cy={-5.5} rx={4} ry={5} fill="#F4B6C2" stroke="#A85E76" strokeWidth={0.4} />
              </G>
            ))}
            <Circle cx={0} cy={0} r={2} fill="#D4B85A" />
          </G>
        </Svg>
      </View>

      {/* Center icon */}
      {isPlaying ? (
        // Bamboo pause bars
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <BambooBar />
          <BambooBar />
        </View>
      ) : (
        // Ink-stroke play triangle
        <View
          style={{
            marginLeft: 8,
            width: 50,
            height: 50,
          }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 50 50">
            {/* Filled vermillion triangle */}
            <Path
              d="M 8 5 L 44 25 L 8 45 Z"
              fill="#D4442A"
              stroke="#7A2616"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            {/* Sumi ink highlight along the top edge */}
            <Path
              d="M 8 5 L 44 25"
              stroke="#F0E6D3"
              strokeWidth={0.8}
              opacity={0.35}
              strokeLinecap="round"
            />
          </Svg>
        </View>
      )}
    </Pressable>
  )
}

function BambooBar() {
  return (
    <View
      style={{
        width: 14,
        height: 50,
        backgroundColor: '#7BA05B',
        borderRadius: 2,
        borderWidth: 1.2,
        borderColor: '#3a4f29',
      }}
    >
      {/* Bamboo node rings */}
      {[0.22, 0.5, 0.78].map((p, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: -2,
            top: `${p * 100}%`,
            width: 18,
            height: 4,
            backgroundColor: '#3a4f29',
            borderRadius: 2,
          }}
        />
      ))}
    </View>
  )
}
