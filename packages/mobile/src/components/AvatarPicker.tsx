import React, { useCallback } from 'react'
import { View, Text, Pressable, Image, Alert, Linking } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../theme/ThemeContext'

interface AvatarPickerProps {
  picture: string | null
  initial: string
  ringColor: string
  onChange: (next: string | null) => void
  size?: number
}

// Big tappable avatar used on both the Lobby (when joining) and the Profile
// editor (standalone profile setup). Offers Take Photo / Choose from Library /
// Remove via an action sheet and converts the result to a base64 data URL so
// the karaoke_guests row stays self-contained (no external image hosting).
export function AvatarPicker({
  picture,
  initial,
  ringColor,
  onChange,
  size = 140,
}: AvatarPickerProps) {
  const { tokens } = useTheme()

  const takePhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        Alert.alert(
          'Camera access',
          "We need camera access to take your profile photo. You can grant it in Settings.",
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        )
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
        cameraType: ImagePicker.CameraType.front,
      })
      if (result.canceled || !result.assets?.[0]?.base64) return
      const asset = result.assets[0]
      const mime = asset.mimeType ?? 'image/jpeg'
      onChange(`data:${mime};base64,${asset.base64}`)
    } catch (err: any) {
      Alert.alert('Photo error', err?.message ?? String(err))
    }
  }, [onChange])

  const pickFromLibrary = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert(
          'Photo access',
          'We need access to your photos. Enable it in Settings to continue.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        )
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      })
      if (result.canceled || !result.assets?.[0]?.base64) return
      const asset = result.assets[0]
      const mime = asset.mimeType ?? 'image/jpeg'
      onChange(`data:${mime};base64,${asset.base64}`)
    } catch (err: any) {
      Alert.alert('Photo error', err?.message ?? String(err))
    }
  }, [onChange])

  const onPress = useCallback(() => {
    const buttons: Array<{
      text: string
      onPress?: () => void
      style?: 'cancel' | 'destructive' | 'default'
    }> = [
      { text: 'Take Photo', onPress: () => void takePhoto() },
      { text: 'Choose from Library', onPress: () => void pickFromLibrary() },
    ]
    if (picture) {
      buttons.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => onChange(null),
      })
    }
    buttons.push({ text: 'Cancel', style: 'cancel' })
    Alert.alert('Profile photo', undefined, buttons)
  }, [picture, takePhoto, pickFromLibrary, onChange])

  const ringWidth = Math.max(4, Math.round(size * 0.045))
  const badgeSize = Math.round(size * 0.31)

  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: tokens.cornerStyle === 'sharp' ? 0 : 999,
          borderWidth: ringWidth,
          borderColor: ringColor,
          backgroundColor: tokens.white,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          shadowColor: tokens.isDark ? ringColor : tokens.black,
          shadowOffset: tokens.isDark ? { width: 0, height: 0 } : { width: 4, height: 4 },
          shadowOpacity: tokens.isDark ? 0.6 : 1,
          shadowRadius: tokens.isDark ? 16 : 0,
          elevation: 4,
        }}
      >
        {picture ? (
          <Image
            source={{ uri: picture }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : initial ? (
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontWeight: '900',
              fontSize: Math.round(size * 0.42),
              color: tokens.black,
            }}
          >
            {initial}
          </Text>
        ) : (
          <View
            style={{
              width: Math.round(size * 0.4),
              height: Math.round(size * 0.4),
              borderRadius: 999,
              borderWidth: 3,
              borderColor: tokens.muted,
              borderStyle: 'dashed',
            }}
          />
        )}
      </View>
      <View
        style={{
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: badgeSize,
          height: badgeSize,
          borderRadius: tokens.cornerStyle === 'sharp' ? 0 : 999,
          backgroundColor: tokens.isDark ? tokens.accentA : tokens.vividYellow,
          borderWidth: tokens.isDark ? 1 : 3,
          borderColor: tokens.isDark ? tokens.accentA : tokens.black,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CameraGlyph color={tokens.isDark ? tokens.appBg : tokens.black} />
      </View>
    </Pressable>
  )
}

function CameraGlyph({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 22,
          height: 16,
          borderWidth: 2,
          borderColor: color,
          borderRadius: 3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: color,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          top: -4,
          width: 9,
          height: 4,
          borderTopLeftRadius: 1,
          borderTopRightRadius: 1,
          backgroundColor: color,
        }}
      />
    </View>
  )
}
