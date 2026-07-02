import React from 'react'
import { View, TextInput } from 'react-native'
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { IRON_WELL, HAIRLINE, PARCH, BRASS, BRASS_BRIGHT, BRASS_DEEP, DEPTH_SHADOW } from './_steam'
import type { SongsSearchBarProps } from '../../../types'

// Steampunk search bar — a recessed brass-rimmed inspection well with a
// polished loupe at the leading edge. Deliberately still: a search field is a
// tool, not a spectacle.
export const SteampunkSongsSearchBar = React.memo(SteampunkSongsSearchBarImpl)

function SteampunkSongsSearchBarImpl({ value, onChangeText }: SongsSearchBarProps) {
  const { tokens } = useTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: IRON_WELL,
        borderWidth: 1,
        borderColor: HAIRLINE,
        borderRadius: 10,
        paddingHorizontal: 14,
        height: 48,
        ...DEPTH_SHADOW,
      }}
    >
      {/* recessed inner shadow line along the top of the well */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 8, right: 8, height: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
      />

      <Loupe />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search the archive…"
        placeholderTextColor="#7E6844"
        style={{
          flex: 1,
          marginLeft: 11,
          fontFamily: tokens.fontBody,
          fontSize: 15,
          color: PARCH,
          padding: 0,
          letterSpacing: 0.3,
        }}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>
  )
}

// A machined brass loupe — static, precise.
function Loupe() {
  return (
    <Svg width={22} height={22} viewBox="0 0 26 26">
      <Defs>
        <RadialGradient id="loupe-glass" cx="35%" cy="30%" rx="65%" ry="65%">
          <Stop offset="0%" stopColor="#F5E8C8" stopOpacity={0.4} />
          <Stop offset="65%" stopColor="#C9A878" stopOpacity={0.12} />
          <Stop offset="100%" stopColor="#3E2810" stopOpacity={0.35} />
        </RadialGradient>
      </Defs>
      <Circle cx={11} cy={11} r={7.4} fill="url(#loupe-glass)" />
      <Circle cx={11} cy={11} r={8.4} fill="none" stroke={BRASS} strokeWidth={2} />
      <Circle cx={11} cy={11} r={6.4} fill="none" stroke={BRASS_DEEP} strokeWidth={0.7} opacity={0.7} />
      <Circle cx={8.4} cy={8.2} r={1.7} fill={BRASS_BRIGHT} opacity={0.5} />
      <Path d="M 17 17 L 22.6 22.6" stroke={BRASS} strokeWidth={2.8} strokeLinecap="round" />
      <Path d="M 16.8 16.8 L 22.2 22.2" stroke={BRASS_BRIGHT} strokeWidth={0.9} strokeLinecap="round" opacity={0.7} />
    </Svg>
  )
}
