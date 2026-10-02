import React, { useRef } from 'react'
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { ProfilePortraitProps } from '../../../types'
import { CameraGlyph, useAvatarActionSheet } from '../../../../components/AvatarPicker'
import { GOLD, GOLD_DEEP, GOLD_HI, GoldenRecord, INK, JOST_300, Twinkle, VOID } from './_record'

// ── The pressed portrait ────────────────────────────────────────────────────
//
// The guest pressed onto the golden record: their photo is the label, with the
// real record's own label line engraved round it, a ring of their colour where
// the label meets the grooves, and their star on the rim.
//
// It replaces the shared staging (screens/profile/PortraitSpotlight), whose
// coloured halo and concentric glow rings are exactly the soft neon light this
// theme doesn't have: light here is starlight, and everything you hold is gold.
//
// The record does not turn. The photo is the subject, and a face that is always
// mid-rotation reads as a glitch, not a record.

const RECORD = 228
const LABEL_RATIO = 0.6
const LABEL = RECORD * LABEL_RATIO

export function ProfilePortrait({ picture, initial, color, onChange }: ProfilePortraitProps) {
  const openPhotoMenu = useAvatarActionSheet({ picture, onChange })
  const press = useRef(new Animated.Value(0)).current
  const to = (v: number) =>
    Animated.timing(press, { toValue: v, duration: v ? 90 : 240, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.982] })

  return (
    <View style={{ width: RECORD + 24, height: RECORD + 12, alignSelf: 'center', alignItems: 'center' }}>
      <Pressable
        onPress={openPhotoMenu}
        onPressIn={() => to(1)}
        onPressOut={() => to(0)}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          {/* the record's weight: a shadow on a plain disc behind it */}
          <View style={styles.drop} />
          <GoldenRecord size={RECORD} labelRatio={LABEL_RATIO} labelColor={picture ? VOID : color} inscription="THE SOUNDS OF EARTH  ·  PLANET EARTH" inscriptionAngle={-66}>
            {picture ? (
              <Image source={{ uri: picture }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : initial ? (
              <>
                <LabelPrint />
                <Text style={{ fontFamily: JOST_300, fontSize: Math.round(LABEL * 0.46), lineHeight: Math.round(LABEL * 0.6), color: INK }}>{initial}</Text>
              </>
            ) : (
              <View style={{ width: LABEL * 0.4, height: LABEL * 0.4, borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: INK, opacity: 0.45 }} />
            )}
          </GoldenRecord>
          {/* their colour, where the label meets the grooves */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: (RECORD - LABEL - 4) / 2,
              top: (RECORD - LABEL - 4) / 2,
              width: LABEL + 4,
              height: LABEL + 4,
              borderRadius: LABEL,
              borderWidth: 2,
              borderColor: color,
            }}
          />
        </Animated.View>
      </Pressable>

      {/* their star, on the rim at one o'clock */}
      <Twinkle size={46} color={color} period={5200} style={{ position: 'absolute', left: RECORD / 2 + 12 + RECORD * 0.37 - 23, top: RECORD / 2 - RECORD * 0.37 - 23 }} />

      {/* the camera: a small gold blank, the same metal as the record */}
      <Pressable
        onPress={openPhotoMenu}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        style={{ position: 'absolute', right: 8, bottom: 8 }}
      >
        <View style={styles.camDrop}>
          <View style={styles.cam}>
            <LinearGradient colors={[GOLD_HI, GOLD, '#C9A24C', GOLD_DEEP]} locations={[0, 0.4, 0.72, 1]} style={StyleSheet.absoluteFill} />
            <CameraGlyph color={INK} />
          </View>
        </View>
      </Pressable>
    </View>
  )
}

/** A printed label's finish: a soft fall of light across the ink and two
 *  pressed rings, so a flat colour reads as paper on a record. */
function LabelPrint() {
  return (
    <>
      <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.22)']} locations={[0, 0.5, 1]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', width: LABEL * 0.86, height: LABEL * 0.86, borderRadius: LABEL, borderWidth: 1, borderColor: 'rgba(26,18,6,0.28)' }} />
      <View style={{ position: 'absolute', width: LABEL * 0.8, height: LABEL * 0.8, borderRadius: LABEL, borderWidth: 1, borderColor: 'rgba(26,18,6,0.16)' }} />
    </>
  )
}

const styles = StyleSheet.create({
  drop: {
    position: 'absolute',
    left: 6,
    top: 10,
    width: RECORD - 12,
    height: RECORD - 12,
    borderRadius: RECORD,
    backgroundColor: VOID,
    shadowColor: '#000',
    shadowOpacity: 0.75,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  camDrop: {
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cam: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#6E5320',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
