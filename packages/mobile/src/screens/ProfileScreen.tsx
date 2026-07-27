import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  UNIVERSAL_SINGER_COLORS,
  findColorIndex,
  guestHasNwordPass,
  updateGuest,
  type KaraokeGuestRow,
} from '@karaoke/shared'
import type { RootStackParamList } from '../navigation/types'
import { useTheme } from '../theme/ThemeContext'
import { useProfile } from '../hooks/useProfile'
import { useSession } from '../hooks/useSession'
import { AvatarPicker } from '../components/AvatarPicker'
import { supabase } from '../supabase/client'
import { useSessionGuests } from '../hooks/useSessionGuests'
import { useNwordPasses } from '../hooks/useNwordPasses'
import { NwordPassCard } from '../components/NwordPassCard'
import { NwordPassGiftModal } from '../components/NwordPassGiftModal'

export function ProfileScreen() {
  const { tokens, ui } = useTheme()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { profile, saveProfile } = useProfile()
  const { session, clearSession } = useSession()
  const guestsById = useSessionGuests()
  const { pendingGift, sharePass } = useNwordPasses()

  const [name, setName] = useState('')
  const [colorIndex, setColorIndex] = useState(0)
  const [picture, setPicture] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

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
      const defaultColor = UNIVERSAL_SINGER_COLORS[colorIndex]?.color
      void saveProfile({
        name: trimmed,
        defaultColor,
        profilePicture: picture ?? undefined,
      })
      // Also push the edit to this guest's karaoke_guests row. Singers are
      // referenced by guestId everywhere, and queue rows / stage / awards
      // resolve the name + avatar LIVE from that row — so without this sync a
      // profile-picture change made after joining never shows up on the songs
      // you've added (saveProfile alone only writes local AsyncStorage).
      if (session?.guestId) {
        void updateGuest(supabase, session.guestId, {
          name: trimmed,
          defaultColor,
          profilePicture: picture ?? null,
        }).catch(() => {
          // Non-fatal: the local profile still saved; realtime will reconcile
          // on the next successful edit.
        })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [name, colorIndex, picture, saveProfile, session?.guestId])

  // Leaving a session is the ONLY supported exit — the swipe-back gesture is
  // disabled on the Session screen. Clear the cached session (so the next app
  // launch lands on the join screen, not back in here) then reset the root
  // stack to Main. This button only renders while a session is active, so on
  // the pre-session MainTabs Profile tab it's absent.
  const handleLeaveSession = useCallback(() => {
    Alert.alert(
      'Leave session?',
      'You can rejoin anytime from your recent sessions on the home screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            void clearSession().then(() => {
              navigation
                .getParent<NativeStackNavigationProp<RootStackParamList>>()
                ?.reset({ index: 0, routes: [{ name: 'Main' }] })
            })
          },
        },
      ],
    )
  }, [clearSession, navigation])

  const selectedColor = UNIVERSAL_SINGER_COLORS[colorIndex]?.color ?? tokens.hotRed
  const initial = (name.trim()[0] ?? '').toUpperCase()
  const ownGuest = session?.guestId
    ? guestsById.get(session.guestId)
    : undefined
  const hasNwordPass = guestHasNwordPass(ownGuest)
  const lobbyGuests = Array.from(guestsById.values())

  const handleGift = useCallback(
    async (recipient: KaraokeGuestRow): Promise<void> => {
      await sharePass(recipient.id)
      Alert.alert(
        'Pass sent',
        recipient.name +
          ' will receive a one-time N-Word Pass for their next eligible song.',
      )
    },
    [sharePass],
  )

  // Floating tab bar lives ~96px above the screen bottom (plus the home
  // indicator inset). Reserve that space so centering happens within the
  // visible non-bar area instead of the full screen height.
  const tabBarReserve = insets.bottom + 96

  return (
    <SafeAreaView style={ui.styles.screen} edges={['top', 'left', 'right']}>
      {session ? (
        <Pressable
          onPress={handleLeaveSession}
          style={({ pressed }) => ({
            position: 'absolute',
            top: insets.top + 12,
            left: 16,
            zIndex: 10,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: tokens.hotRed,
            backgroundColor: 'transparent',
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontWeight: '900',
              fontSize: 10,
              letterSpacing: 1,
              color: tokens.hotRed,
              textTransform: 'uppercase',
            }}
          >
            Leave Session
          </Text>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingTop: session ? 74 : 28,
            paddingBottom: tabBarReserve + 28,
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

          <View style={{ marginTop: 28, width: '100%', maxWidth: 430 }}>
            <ui.ColorPicker value={colorIndex} onChange={setColorIndex} />
          </View>

          {hasNwordPass && ownGuest ? (
            <NwordPassCard
              holderName={ownGuest.name}
              identifier={ownGuest.id}
              variant="permanent"
              onShare={() => setShareOpen(true)}
              style={{ marginTop: 34, maxWidth: 390 }}
            />
          ) : pendingGift ? (
            <NwordPassCard
              holderName={ownGuest?.name || name.trim() || 'Guest'}
              identifier={pendingGift.id}
              variant="one-time"
              giftedBy={pendingGift.giver_name_snapshot}
              style={{ marginTop: 34, maxWidth: 390 }}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {session ? (
        <NwordPassGiftModal
          visible={shareOpen}
          guests={lobbyGuests}
          ownGuestId={session.guestId}
          onClose={() => setShareOpen(false)}
          onGift={handleGift}
        />
      ) : null}
    </SafeAreaView>
  )
}
