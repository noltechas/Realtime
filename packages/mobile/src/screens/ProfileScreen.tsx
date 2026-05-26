import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { UNIVERSAL_SINGER_COLORS, findColorIndex } from '@karaoke/shared'
import { useTheme } from '../theme/ThemeContext'
import { useProfile } from '../hooks/useProfile'
import { AvatarPicker } from '../components/AvatarPicker'

export function ProfileScreen() {
  const { tokens, ui } = useTheme()
  const insets = useSafeAreaInsets()
  const { profile, saveProfile } = useProfile()

  const [name, setName] = useState('')
  const [colorIndex, setColorIndex] = useState(0)
  const [picture, setPicture] = useState<string | null>(null)
  const [savedTick, setSavedTick] = useState<number | null>(null)

  // Seed local form state from the saved profile once it loads.
  const seeded = useRef(false)
  useEffect(() => {
    if (profile && !seeded.current) {
      setName(profile.name ?? '')
      setColorIndex(findColorIndex(profile.defaultColor))
      setPicture(profile.profilePicture ?? null)
      seeded.current = true
    }
  }, [profile])

  // Autosave every change (debounced) — no Save button, matches the iOS
  // Settings-style "type and it sticks" pattern.
  useEffect(() => {
    if (!seeded.current) return
    const trimmed = name.trim()
    if (!trimmed) return
    const timer = setTimeout(() => {
      void saveProfile({
        name: trimmed,
        defaultColor: UNIVERSAL_SINGER_COLORS[colorIndex]?.color,
        profilePicture: picture ?? undefined,
      })
      setSavedTick(Date.now())
    }, 500)
    return () => clearTimeout(timer)
  }, [name, colorIndex, picture, saveProfile])

  useEffect(() => {
    if (savedTick === null) return
    const timer = setTimeout(() => setSavedTick(null), 1400)
    return () => clearTimeout(timer)
  }, [savedTick])

  const selectedColor = UNIVERSAL_SINGER_COLORS[colorIndex]?.color ?? tokens.hotRed
  const initial = (name.trim()[0] ?? '').toUpperCase()
  // Floating tab bar lives ~96px above the screen bottom (plus the home
  // indicator inset). Reserve that space so centering happens within the
  // visible non-bar area instead of the full screen height.
  const tabBarReserve = insets.bottom + 96

  return (
    <SafeAreaView style={ui.styles.screen} edges={['top', 'left', 'right']}>
      {savedTick !== null ? (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 12,
            right: 24,
            zIndex: 10,
            backgroundColor: tokens.mintGreen,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderWidth: 2,
            borderColor: tokens.black,
          }}
        >
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontWeight: '900',
              fontSize: 11,
              letterSpacing: 1,
              color: tokens.black,
            }}
          >
            SAVED
          </Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: tabBarReserve,
          }}
        >
          <AvatarPicker
            picture={picture}
            initial={initial}
            ringColor={selectedColor}
            onChange={setPicture}
          />
          <Text
            style={{
              fontFamily: tokens.fontBody,
              fontSize: 13,
              color: tokens.muted,
              marginTop: 14,
            }}
          >
            {picture ? 'Tap to change photo' : 'Tap to add a photo'}
          </Text>

          <View style={{ marginTop: 36, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontWeight: '800',
                fontSize: 11,
                letterSpacing: 2,
                color: tokens.muted,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Your Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="What should we call you?"
              placeholderTextColor={tokens.faint}
              style={[
                ui.styles.input,
                { fontSize: 22, textAlign: 'center', minWidth: 240 },
              ]}
              autoCorrect={false}
              returnKeyType="done"
              maxLength={32}
            />
          </View>

          <View style={{ marginTop: 28, alignSelf: 'stretch' }}>
            <ui.ColorPicker value={colorIndex} onChange={setColorIndex} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
