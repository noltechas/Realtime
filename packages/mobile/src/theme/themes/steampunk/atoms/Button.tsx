import React from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import type { ButtonProps } from '../../../types'
import { BRASS, BRASS_DEEP, BrassPlate, HOUSE, INK, LAMP, PARCHMENT, Plaque, Press, Rivet, caps } from './_engine'

// Steampunk button:
//   primary    a polished brass plate, two rivets, its legend engraved and
//              filled with black wax
//   secondary  a deep green enamel plate in a riveted brass frame
//   outline    a bare brass hairline
export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const dead = disabled || loading
  const legend = (color: string, shadow?: boolean) =>
    loading ? (
      <ActivityIndicator color={color} />
    ) : (
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[caps(13.5, color, { letterSpacing: 2.6, textAlign: 'center' }), shadow ? { textShadowColor: 'rgba(255,240,205,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 } : null]}
      >
        {label}
      </Text>
    )
  if (variant === 'primary') {
    return (
      <Press onPress={onPress} disabled={dead} style={{ borderRadius: 6, backgroundColor: dead ? HOUSE : undefined }}>
        <BrassPlate radius={6} style={{ opacity: dead ? 0.55 : 1 }} contentStyle={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
          <Rivet size={8} style={{ position: 'absolute', left: 9 }} />
          {legend(INK, true)}
          <Rivet size={8} style={{ position: 'absolute', right: 9 }} />
        </BrassPlate>
      </Press>
    )
  }
  if (variant === 'secondary') {
    return (
      <Press onPress={onPress} disabled={dead}>
        <Plaque border={10} style={{ opacity: dead ? 0.55 : 1 }} contentStyle={{ minHeight: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }}>
          {legend(LAMP)}
        </Plaque>
      </Press>
    )
  }
  return (
    <Press onPress={onPress} disabled={dead}>
      <View style={{ minHeight: 50, borderRadius: 6, borderWidth: 1, borderColor: BRASS_DEEP, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, opacity: dead ? 0.5 : 1, backgroundColor: 'rgba(12,9,7,0.4)' }}>
        <View style={{ position: 'absolute', left: 4, right: 4, top: 4, bottom: 4, borderRadius: 4, borderWidth: 0.5, borderColor: BRASS, opacity: 0.4 }} />
        {legend(PARCHMENT)}
      </View>
    </Press>
  )
}
