import React, { useRef } from 'react'
import { Animated, Easing, Image, Pressable, Text, View } from 'react-native'
import type { ProfilePortraitProps } from '../../../types'
import { CameraGlyph, useAvatarActionSheet } from '../../../../components/AvatarPicker'
import { GRAPHITE, IMG, INK, Mark, PencilBox, SHEET, TapedPrint, letter, note } from './_pencil'

// Sketch portrait: your photo as a print taped to the sheet (no photo yet: a
// blank print with your initial lettered on it in your own pencil), a swatch
// of your colour pencilled beside it, and the camera in a pencilled box.
const P = 210

export function ProfilePortrait({ picture, initial, color, onChange }: ProfilePortraitProps) {
  const openPhotoMenu = useAvatarActionSheet({ picture, onChange })
  const press = useRef(new Animated.Value(0)).current
  const to = (v: number) => Animated.timing(press, { toValue: v, duration: v ? 90 : 240, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  return (
    <View style={{ width: P + 60, height: P + 34, alignSelf: 'center', alignItems: 'center', paddingTop: 12 }}>
      <Pressable onPress={openPhotoMenu} onPressIn={() => to(1)} onPressOut={() => to(0)} accessibilityRole="button" accessibilityLabel="Change profile photo">
        <Animated.View style={{ transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }] }}>
          <TapedPrint uri={picture} size={P} seed="portrait" border={10}>
            {!picture ? (
              <View style={{ flex: 1, backgroundColor: SHEET, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={letter(92, color, { lineHeight: 110 })}>{initial || '?'}</Text>
                <Text style={note(22, GRAPHITE)}>add a photo</Text>
              </View>
            ) : (
              <Image source={{ uri: picture }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
            )}
          </TapedPrint>
        </Animated.View>
      </Pressable>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: P * 0.62 }}>
        <Mark src={IMG.swatch} color={color} width={46} height={46} style={{ transform: [{ rotate: '24deg' }] }} />
        <Text style={note(18, GRAPHITE, { marginTop: -2, marginLeft: 4 })}>you</Text>
      </View>
      <Pressable onPress={openPhotoMenu} hitSlop={8} accessibilityRole="button" accessibilityLabel="Change profile photo" style={{ position: 'absolute', right: 0, bottom: 4 }}>
        <PencilBox border={13} fill={SHEET} contentStyle={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
          <CameraGlyph color={INK} />
        </PencilBox>
      </Pressable>
    </View>
  )
}
