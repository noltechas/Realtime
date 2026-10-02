import React, { useRef } from 'react'
import { Animated, Easing, Image, Pressable, Text, View } from 'react-native'
import type { ProfilePortraitProps } from '../../../types'
import { CameraGlyph, useAvatarActionSheet } from '../../../../components/AvatarPicker'
import { BrassPlate, CAST, ENAMEL, GearTrain, INK, JewelLamp, Porthole, display, meshTrain } from './_engine'

// Steampunk portrait: the guest seen through the engine's great PORTHOLE, a
// pair of gears turning behind its rim, their jewel lamp burning in their own
// colour on the bezel, and the camera as a brass push-button.
const P = 222

export function ProfilePortrait({ picture, initial, color, onChange }: ProfilePortraitProps) {
  const openPhotoMenu = useAvatarActionSheet({ picture, onChange })
  const press = useRef(new Animated.Value(0)).current
  const to = (v: number) => Animated.timing(press, { toValue: v, duration: v ? 90 : 240, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  const gears = meshTrain({ teeth: 24, x: P * 0.14, y: P * 0.74, phase: 9 }, [{ teeth: 14, deg: 155 }, { teeth: 18, from: 0, deg: 60 }], 0.32)
  return (
    <View style={{ width: P + 40, height: P + 10, alignSelf: 'center', alignItems: 'center' }}>
      <GearTrain gears={gears} shadow={4} />
      <Pressable onPress={openPhotoMenu} onPressIn={() => to(1)} onPressOut={() => to(0)} accessibilityRole="button" accessibilityLabel="Change profile photo">
        <Animated.View style={{ transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }] }}>
          <Porthole size={P}>
            {picture ? (
              <Image source={{ uri: picture }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, alignSelf: 'stretch', backgroundColor: ENAMEL, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[display(66, undefined, { lineHeight: 80 }), CAST]}>{initial || '?'}</Text>
              </View>
            )}
          </Porthole>
        </Animated.View>
      </Pressable>
      <View pointerEvents="none" style={{ position: 'absolute', left: P / 2 + 20 + P * 0.36 - 12, top: P / 2 - P * 0.36 - 12 }}>
        <JewelLamp color={color} size={24} />
      </View>
      <Pressable onPress={openPhotoMenu} hitSlop={8} accessibilityRole="button" accessibilityLabel="Change profile photo" style={{ position: 'absolute', right: 10, bottom: 6 }}>
        <BrassPlate radius={27} contentStyle={{ width: 54, height: 54, alignItems: 'center', justifyContent: 'center' }}>
          <CameraGlyph color={INK} />
        </BrassPlate>
      </Pressable>
    </View>
  )
}
