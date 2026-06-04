import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import Svg, { G, Ellipse, Circle } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import type { GenreTabsProps } from '../../../types'

// Zen genre tabs — each tab is a "hanko stamp" capsule:
//   • Inactive: cream washi paper with a thin sumi-ink border and a tiny
//     pale sakura petal as the count marker.
//   • Active: vermillion hanko (red ink stamp), slightly tilted (hand-stamped
//     feel), with cream text and a gold center dot in the count blossom.
// The whole row scrolls horizontally and there is no breathing animation
// (kept calm — the active stamp's tilt is the only motion).
export function GenreTabs({
  list,
  counts,
  value,
  onChange,
}: GenreTabsProps) {
  const { tokens } = useTheme()
  if (list.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 14, gap: 10 }}
    >
      {list.map((g, idx) => {
        const active = g === value
        // Hash-based small tilt so a row of stamps feels hand-placed
        const tilt = active ? -2 + ((g.charCodeAt(0) % 5) - 2) * 0.6 : 0

        return (
          <Pressable
            key={g}
            onPress={() => onChange(g)}
            hitSlop={6}
            style={({ pressed }) => ({
              transform: [
                { rotate: `${tilt}deg` },
                { scale: pressed ? 0.95 : 1 },
              ],
            })}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 9,
                minHeight: 42,
                borderRadius: 6,
                borderWidth: active ? 1.5 : 1,
                borderColor: active ? '#7A2616' : '#2a1f15',
                backgroundColor: active ? '#D4442A' : '#F0E6D3',
                shadowColor: active ? '#7A2616' : 'transparent',
                shadowOffset: { width: 1, height: 1 },
                shadowOpacity: active ? 0.4 : 0,
                shadowRadius: 2,
              }}
            >
              {/* Active state: inner hanko frame line */}
              {active ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: 3,
                    right: 3,
                    bottom: 3,
                    borderWidth: 0.8,
                    borderColor: '#F0E6D3',
                    borderRadius: 4,
                    opacity: 0.5,
                  }}
                />
              ) : null}

              <Text
                style={{
                  fontFamily: tokens.fontDisplay,
                  fontWeight: '700',
                  fontSize: 14,
                  lineHeight: 20,
                  color: active ? '#F0E6D3' : '#1a1814',
                  letterSpacing: 0.4,
                  includeFontPadding: false,
                }}
                numberOfLines={1}
              >
                {g}
              </Text>

              {/* Count container — single-color pink sakura with a cream
                  inner disc so the number reads clearly regardless of the
                  outer pill's active state. */}
              <View
                style={{
                  marginLeft: 10,
                  width: 30,
                  height: 30,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View style={{ position: 'absolute', width: 30, height: 30 }}>
                  <Svg width={30} height={30} viewBox="0 0 30 30">
                    <G transform="translate(15 15)">
                      {[0, 72, 144, 216, 288].map((a) => (
                        <G key={a} transform={`rotate(${a})`}>
                          <Ellipse
                            cx={0}
                            cy={-5.5}
                            rx={4.5}
                            ry={6}
                            fill="#F4B6C2"
                          />
                        </G>
                      ))}
                      {/* Inner disc matches petal color for solid look */}
                      <Circle cx={0} cy={0} r={6.2} fill="#F4B6C2" />
                    </G>
                  </Svg>
                </View>
                <Text
                  style={{
                    fontFamily: tokens.fontDisplay,
                    fontWeight: '900',
                    fontSize: 11,
                    color: '#1a1814',
                    includeFontPadding: false,
                    zIndex: 1,
                  }}
                  numberOfLines={1}
                >
                  {counts[g] ?? 0}
                </Text>
              </View>
            </View>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
