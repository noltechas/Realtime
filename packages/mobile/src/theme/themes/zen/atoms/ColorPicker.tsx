import React from 'react'
import { View, Text, Pressable } from 'react-native'
import Svg, { G, Ellipse, Circle } from 'react-native-svg'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import type { ColorPickerProps } from '../../../types'

// Zen color picker — each swatch is rendered as a 5-petal cherry blossom
// stained in the singer's color. The selected blossom gets a sumi-ink ring
// around it and a kintsugi gold dot at the center; idle blossoms have a
// faint stamen dot. No glows, no halos — the choice is the bloom.
//
// A wrapping grid rather than a horizontal scroller — a scroller cut the last
// blossoms off at the screen edge. 44 + 6 fits seven per row, so 13 lands as a
// clean 7 + 6, which reads as a branch in bloom rather than a cropped row. The
// selected blossom scales via `transform`, so it never reflows the grid.
export function ColorPicker({
  value,
  onChange,
  label = 'Your Color',
}: ColorPickerProps) {
  const { tokens } = useTheme()
  return (
    <View>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '700',
          fontSize: 12,
          letterSpacing: 2,
          color: '#6b5d4a',
          textTransform: 'uppercase',
          marginBottom: 10,
          paddingHorizontal: 24,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          paddingHorizontal: 24,
          paddingVertical: 4,
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: 6,
          rowGap: 8,
        }}
      >
        {UNIVERSAL_SINGER_COLORS.map((c, i) => {
          const selected = i === value
          return (
            <Pressable
              key={c.color}
              onPress={() => onChange(i)}
              hitSlop={6}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: pressed ? 0.9 : selected ? 1.08 : 1 }],
              })}
            >
              <Svg width={44} height={44} viewBox="0 0 44 44">
                <G transform="translate(22 22)">
                  {[0, 72, 144, 216, 288].map((a) => (
                    <G key={a} transform={`rotate(${a})`}>
                      <Ellipse
                        cx={0}
                        cy={-11}
                        rx={7}
                        ry={10}
                        fill={c.color}
                        stroke={selected ? '#1a1814' : '#2a1f15'}
                        strokeWidth={selected ? 1.4 : 0.6}
                        opacity={selected ? 1 : 0.85}
                      />
                    </G>
                  ))}
                  <Circle
                    cx={0}
                    cy={0}
                    r={4}
                    fill={selected ? '#D4B85A' : '#1a1814'}
                    stroke={selected ? '#1a1814' : 'transparent'}
                    strokeWidth={selected ? 0.8 : 0}
                  />
                  {selected ? (
                    <>
                      {/* Stamen rays — gold filaments around the center */}
                      {[0, 60, 120, 180, 240, 300].map((a) => (
                        <G key={a} transform={`rotate(${a})`}>
                          <Circle cx={0} cy={-7} r={0.9} fill="#D4B85A" />
                        </G>
                      ))}
                    </>
                  ) : null}
                </G>
              </Svg>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
