import React from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { ButtonProps } from '../../../types'
import { ETCH, GOLD, GOLD_DEEP, GOLD_HI, INK, Press, STAR, VOID, display } from './_record'

// Space button:
//   primary    the record's gold, satin, the legend engraved dark into it
//   secondary  black glass with a gold hairline and a gold legend
//   outline    a bare engraved hairline
export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const dead = disabled || loading
  const gold = variant === 'primary'
  const ink = gold ? INK : variant === 'secondary' ? GOLD_HI : STAR
  return (
    // A dead button dims its own face over solid black, never the whole pill:
    // translucent gold over the starfield reads as a smear.
    <Press onPress={onPress} disabled={dead} style={{ borderRadius: 999, backgroundColor: dead && gold ? VOID : undefined }}>
      <View
        style={{
          opacity: dead ? (gold ? 0.55 : 0.5) : 1,
          minHeight: 54,
          borderRadius: 999,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: gold ? '#6E5320' : variant === 'secondary' ? ETCH.mid : ETCH.faint,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 26,
          paddingVertical: 12,
          backgroundColor: gold ? GOLD : variant === 'secondary' ? 'rgba(10,12,20,0.9)' : 'transparent',
        }}
      >
        {gold ? (
          <>
            <LinearGradient colors={[GOLD_HI, GOLD, '#C9A24C', GOLD_DEEP]} locations={[0, 0.4, 0.72, 1]} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={{ position: 'absolute', left: 18, right: 18, top: 1, height: 1, backgroundColor: 'rgba(255,248,224,0.8)' }} />
          </>
        ) : null}
        {loading ? (
          <ActivityIndicator color={ink} />
        ) : (
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={display(14.5, ink, gold ? 600 : 500, { letterSpacing: 3.4, textAlign: 'center' })}>
            {label}
          </Text>
        )}
      </View>
    </Press>
  )
}
