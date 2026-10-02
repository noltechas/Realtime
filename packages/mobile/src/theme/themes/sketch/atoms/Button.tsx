import React from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import type { ButtonProps } from '../../../types'
import { GRAPHITE, IMG, INK, LETTER_B, Mark, PencilBox, Press, SHEET, TapeStrip, letter, useMeasured } from './_pencil'

// Sketch button:
//   primary    a strip of masking tape across the sheet, the legend inked on it
//   secondary  a box pencilled round the legend
//   outline    the legend alone, underlined fast in pencil
export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const dead = disabled || loading
  const [size, onLayout] = useMeasured()
  const legend = (color: string, sz = 17) =>
    loading ? (
      <ActivityIndicator color={GRAPHITE} />
    ) : (
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={letter(sz, color, { textAlign: 'center' }, LETTER_B)}>
        {label}
      </Text>
    )
  if (variant === 'primary') {
    return (
      <Press onPress={onPress} disabled={dead} style={{ opacity: dead ? 0.5 : 1 }}>
        <TapeStrip height={56} contentStyle={{ paddingHorizontal: 34 }}>
          {legend(INK, 18)}
        </TapeStrip>
      </Press>
    )
  }
  if (variant === 'secondary') {
    return (
      <Press onPress={onPress} disabled={dead} style={{ opacity: dead ? 0.5 : 1 }}>
        <PencilBox border={14} fill={SHEET} contentStyle={{ minHeight: 30, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}>
          {legend(INK, 16)}
        </PencilBox>
      </Press>
    )
  }
  return (
    <Press onPress={onPress} disabled={dead} style={{ opacity: dead ? 0.45 : 1 }}>
      <View style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
        <View onLayout={onLayout}>{legend(GRAPHITE, 16)}</View>
        {size ? <Mark src={IMG.under[1]} color={GRAPHITE} width={size.w + 10} height={9} style={{ marginTop: -2 }} /> : null}
      </View>
    </Press>
  )
}
