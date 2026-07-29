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

// ── The photo action sheet ──────────────────────────────────────────────────
// Take Photo / Choose from Library / Remove, converting whatever comes back to a
// base64 data URL so the karaoke_guests row stays self-contained (no external
// image hosting).
//
// Split out of the component because a theme may replace the whole portrait with
// its own object (see `ProfilePortrait` in theme/types.ts) and must not have to
// reimplement permission prompts, the Settings deep-link, or the data-URL
// encoding to do it. This is the one definition of "let the user change their
// photo"; the view around it is a per-theme decision.
export function useAvatarActionSheet({
  picture,
  onChange,
}: {
  picture: string | null
  onChange: (next: string | null) => void
}): () => void {
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

  return onPress
}

// Big tappable avatar used on the Lobby (when joining) and as the Profile page's
// default portrait — a ring-and-badge treatment driven by token flags. A theme
// that wants something structurally different provides `ui.ProfilePortrait`
// instead of restyling this.
export function AvatarPicker({
  picture,
  initial,
  ringColor,
  onChange,
  size = 140,
}: AvatarPickerProps) {
  const { tokens } = useTheme()
  const onPress = useAvatarActionSheet({ picture, onChange })

  const ringWidth = Math.max(4, Math.round(size * 0.045))
  const badgeSize = Math.round(size * 0.31)
  const radius = tokens.cornerStyle === 'sharp' ? 0 : 999

  // The shadow and the photo clip MUST live on separate views. iOS refuses to
  // draw a layer's shadow when that same layer clips its contents, so while
  // these were combined the shadow silently rendered nothing on every theme —
  // the portrait read as a sticker pasted onto the page. If you merge the two
  // views back together, the shadow disappears again with no warning.
  //
  // Which shadow is a `shadowStyle` decision, not an `isDark` one: the hard
  // offset plate belongs to the themes that use it everywhere else (neo-brutal,
  // comic-book, sketch), a dark theme wants the portrait lit in the singer's own
  // colour, and a light theme with a glow vocabulary (tropical) wants a soft
  // neutral drop rather than a slab of black.
  const shadow =
    tokens.shadowStyle === 'offset'
      ? {
          shadowColor: tokens.black,
          shadowOffset: {
            width: Math.max(3, Math.round(size * 0.05)),
            height: Math.max(3, Math.round(size * 0.055)),
          },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 5,
        }
      : tokens.isDark
        ? {
            shadowColor: ringColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 16,
            elevation: 4,
          }
        : {
            shadowColor: tokens.black,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
            elevation: 4,
          }

  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          // An opaque fill is what gives iOS a shape to derive the shadow from;
          // the inner view covers it, so this colour is never actually seen.
          backgroundColor: tokens.white,
          ...shadow,
        }}
      >
        <View
          style={{
            width: '100%',
            height: '100%',
            borderRadius: radius,
            borderWidth: ringWidth,
            borderColor: ringColor,
            backgroundColor: tokens.white,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
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

// Exported so a theme's own portrait draws the SAME camera mark as the default
// one — the affordance stays recognisable even when its plate doesn't.
export function CameraGlyph({ color }: { color: string }) {
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
