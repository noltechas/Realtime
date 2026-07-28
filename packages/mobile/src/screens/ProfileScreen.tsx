import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'
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
import { supabase } from '../supabase/client'
import { useSessionGuests } from '../hooks/useSessionGuests'
import { useNwordPasses } from '../hooks/useNwordPasses'
import { NwordPassGiftModal } from '../components/NwordPassGiftModal'
import { ProfileView } from './profile/ProfileView'

// Data container for the Profile page — hooks, autosave and navigation only.
// Everything visual lives in ./profile/ProfileView.
export function ProfileScreen() {
  const { tokens } = useTheme()
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
  // stack to Main. ProfileView only renders the button when this is passed, so
  // on the pre-session MainTabs Profile tab it's absent.
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

  const selectedColor = UNIVERSAL_SINGER_COLORS[colorIndex]?.color ?? tokens.hotRed
  const ownGuest = session?.guestId ? guestsById.get(session.guestId) : undefined
  const hasNwordPass = guestHasNwordPass(ownGuest)
  const passVariant = hasNwordPass && ownGuest
    ? 'permanent'
    : pendingGift
      ? 'one-time'
      : null

  return (
    <>
      <ProfileView
        name={name}
        onNameChange={setName}
        colorIndex={colorIndex}
        onColorIndexChange={setColorIndex}
        color={selectedColor}
        picture={picture}
        onPictureChange={setPicture}
        passVariant={passVariant}
        passHolderName={ownGuest?.name || name.trim() || 'Guest'}
        onSharePass={
          passVariant === 'permanent' ? () => setShareOpen(true) : undefined
        }
        onLeaveSession={session ? handleLeaveSession : undefined}
      />

      {session ? (
        <NwordPassGiftModal
          visible={shareOpen}
          guests={Array.from(guestsById.values())}
          ownGuestId={session.guestId}
          onClose={() => setShareOpen(false)}
          onGift={handleGift}
        />
      ) : null}
    </>
  )
}
