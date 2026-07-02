import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import { AMBER, BRASS, BRASS_BRIGHT, BRASS_DEEP, HAIRLINE_SOFT } from './_steam'
import type { ColorPickerProps } from '../../../types'

// Steampunk ColorPicker — enamel indicator lamps set in machined brass
// collets. The selected lamp is LIT: brighter ring, inner glow, a soft amber
// halo. Unselected lamps sit dim in their settings. No rotation, no rivets —
// a bank of instrument lights, read at a glance.
export function SteampunkColorPicker({ value, onChange, label = 'Your Color' }: ColorPickerProps) {
  const { tokens } = useTheme()
  return (
    <View>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontSize: 11,
          letterSpacing: 3.2,
          textTransform: 'uppercase',
          color: AMBER,
          marginBottom: 10,
          paddingHorizontal: 24,
        }}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 14, paddingVertical: 6, alignItems: 'center' }}
      >
        {UNIVERSAL_SINGER_COLORS.map((c, i) => (
          <EnamelLamp
            key={c.color}
            color={c.color}
            selected={i === value}
            seed={i}
            onPress={() => onChange(i)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

function EnamelLamp({
  color,
  selected,
  seed,
  onPress,
}: {
  color: string
  selected: boolean
  seed: number
  onPress: () => void
}) {
  const id = `lamp-${hashKey(`${color}-${seed}`)}`
  const size = selected ? 46 : 38
  const r = size / 2

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          ...(selected
            ? { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10 }
            : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3 }),
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient id={`${id}-collet`} cx="35%" cy="30%" rx="70%" ry="70%">
              <Stop offset="0%" stopColor={selected ? '#F7E6BB' : BRASS_BRIGHT} stopOpacity={1} />
              <Stop offset="55%" stopColor={BRASS} stopOpacity={1} />
              <Stop offset="100%" stopColor={BRASS_DEEP} stopOpacity={1} />
            </RadialGradient>
            <RadialGradient id={`${id}-glass`} cx="34%" cy="28%" rx="70%" ry="70%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={selected ? 0.95 : 0.55} />
              <Stop offset="38%" stopColor={color} stopOpacity={1} />
              <Stop offset="100%" stopColor={color} stopOpacity={selected ? 0.9 : 0.55} />
            </RadialGradient>
          </Defs>
          {/* brass collet */}
          <Circle cx={r} cy={r} r={r - 0.5} fill={`url(#${id}-collet)`} stroke="rgba(0,0,0,0.55)" strokeWidth={0.7} />
          {/* recessed seat */}
          <Circle cx={r} cy={r} r={r - 3.4} fill="#100A05" />
          {/* enamel lens */}
          <Circle cx={r} cy={r} r={r - 5} fill={`url(#${id}-glass)`} />
          {/* specular glint */}
          <Circle cx={r * 0.68} cy={r * 0.6} r={r * 0.14} fill="#FFFFFF" opacity={selected ? 0.85 : 0.4} />
        </Svg>
        {/* dim unselected lamps slightly — unlit filaments */}
        {!selected ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: r,
              backgroundColor: 'rgba(10,6,3,0.28)',
              borderWidth: 1,
              borderColor: HAIRLINE_SOFT,
            }}
          />
        ) : null}
      </View>
    </Pressable>
  )
}
