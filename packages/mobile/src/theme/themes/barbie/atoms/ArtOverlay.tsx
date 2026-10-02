import React from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Glint, SUN_HI, Twinkle, WHITE, useMeasured } from './_barbie'

// Barbie stage-art overlay: the now-playing art in full sunshine: a warm glare
// falling across it from the top corner, the sun's glint sweeping over it with
// everything else, and a twinkle or two caught on the print.
export function ArtOverlay() {
  const [size, onLayout] = useMeasured()
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <LinearGradient colors={['rgba(255,241,168,0.42)', 'rgba(255,241,168,0)']} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 0.7 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(224,33,138,0)', 'rgba(224,33,138,0.18)']} locations={[0.6, 1]} style={StyleSheet.absoluteFill} />
      {size ? <Glint width={size.w} height={size.h} strength={0.6} /> : null}
      <Twinkle size={26} color={SUN_HI} delay={500} period={3400} style={{ position: 'absolute', left: '12%', top: '10%' }} />
      <Twinkle size={18} color={WHITE} delay={2100} period={3800} style={{ position: 'absolute', right: '14%', top: '22%' }} />
    </View>
  )
}
