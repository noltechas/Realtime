import React, { useRef } from 'react'
import { Animated, Easing, Image, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ProfilePortraitProps } from '../../../types'
import { useAvatarActionSheet } from '../../../../components/AvatarPicker'
import { Glass, WHITE, sf } from './_glass'

// Liquid Glass portrait: your photo in a disc set in a ring of glass, the
// camera on a small interactive glass button. No photo yet: your initial,
// large, on your colour.
const P = 196

export function ProfilePortrait({ picture, initial, color, onChange }: ProfilePortraitProps) {
  const openPhotoMenu = useAvatarActionSheet({ picture, onChange })
  const press = useRef(new Animated.Value(0)).current
  const to = (v: number) => Animated.timing(press, { toValue: v, duration: v ? 90 : 240, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  const R = P + 28
  return (
    <View style={{ width: R + 20, height: R + 10, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      <Glass radius={R / 2} style={{ position: 'absolute', width: R, height: R }} />
      <Pressable onPress={openPhotoMenu} onPressIn={() => to(1)} onPressOut={() => to(0)} accessibilityRole="button" accessibilityLabel="Change profile photo">
        <Animated.View style={{ transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }] }}>
          <View style={{ width: P, height: P, borderRadius: P / 2, overflow: 'hidden', backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
            {picture ? <Image source={{ uri: picture }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={sf(86, '800', WHITE)}>{initial || '?'}</Text>}
          </View>
        </Animated.View>
      </Pressable>
      <Pressable onPress={openPhotoMenu} hitSlop={8} accessibilityRole="button" accessibilityLabel="Change profile photo" style={{ position: 'absolute', right: 8, bottom: 8 }}>
        <Glass radius={26} interactive style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="camera" size={22} color={WHITE} />
        </Glass>
      </Pressable>
    </View>
  )
}
