import React, { useState } from 'react'
import { Animated, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import type { SongsSearchBarProps } from '../../../types'
import {
  CUT_CHIP,
  ICE,
  MONO,
  MachinedPanel,
  STEEL_HI,
  TEXT_FAINT,
  useOscillator,
} from './_ship'

// Space search bay — a data-entry slot in the panel.
//
// The old space search bar drew a radar dish and swept a scan line across
// itself every eight seconds. Both are gone: this is an input, and an input's
// job is to look ready, not busy. What is left is a recessed well, a machined
// divider separating the glyph from the field, and a mono `IDX` legend on the
// right that lights ice while there is a query — one honest state indicator
// instead of ambient animation.
export function SpaceSongsSearchBar({ value, onChangeText }: SongsSearchBarProps) {
  const { tokens } = useTheme()
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0

  // Caret lamp — the one thing here that moves, and only while the field is
  // actually receiving input.
  const blink = useOscillator(1100)
  const caretOpacity = focused
    ? blink.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] })
    : 0

  return (
    <MachinedPanel
      cuts={CUT_CHIP}
      tone={active ? 'ice' : 'steel'}
      fill="well"
      edgeStrength={active ? 1.3 : 0.7}
      systemBar={active}
      contentStyle={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 12,
        paddingVertical: 11,
        minHeight: 46,
      }}
    >
      <Ionicons
        name="search"
        size={16}
        color={active ? ICE : TEXT_FAINT}
        style={{ marginRight: 10 }}
      />
      {/* Machined divider between the glyph bay and the field. */}
      <View style={{ width: 1, height: 20, marginRight: 10 }}>
        <Svg width={1} height={20}>
          <Path d="M 0.5 0 L 0.5 20" stroke={STEEL_HI} strokeWidth={1} strokeOpacity={0.3} />
        </Svg>
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search the catalog"
        placeholderTextColor={TEXT_FAINT}
        style={{
          flex: 1,
          fontFamily: tokens.fontBody,
          fontSize: 15,
          color: tokens.black,
          padding: 0,
          letterSpacing: 0.3,
        }}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {/* Caret lamp. Always occupies its slot so nothing reflows as it
          blinks — it just goes dark when the field isn't focused. */}
      <Animated.View
        style={{
          width: 2,
          height: 15,
          marginHorizontal: 8,
          backgroundColor: ICE,
          opacity: caretOpacity,
        }}
      />

      <Text
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: 1.4,
          color: active ? ICE : TEXT_FAINT,
        }}
      >
        IDX
      </Text>
      <View
        style={{
          marginLeft: 5,
          width: 5,
          height: 5,
          backgroundColor: active ? ICE : STEEL_HI,
          opacity: active ? 1 : 0.4,
        }}
      />
    </MachinedPanel>
  )
}
