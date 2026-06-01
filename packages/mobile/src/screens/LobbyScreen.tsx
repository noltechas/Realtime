import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
  Image,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  validateSession,
  createGuest,
  getGuest,
  updateGuest,
  subscribeToGuests,
  type KaraokeSessionRow,
  type KaraokeGuestRow,
} from '@karaoke/shared'
import type { RootStackParamList } from '../navigation/types'
import { UNIVERSAL_SINGER_COLORS, findColorIndex } from '@karaoke/shared'
import { useTheme } from '../theme/ThemeContext'
import { useSession } from '../hooks/useSession'
import { useProfile } from '../hooks/useProfile'
import { useSessionHistory } from '../hooks/useSessionHistory'
import { supabase } from '../supabase/client'
import { AvatarPicker } from '../components/AvatarPicker'

type LobbyNav = NativeStackNavigationProp<RootStackParamList, 'Lobby'>
type LobbyRouteProp = RouteProp<RootStackParamList, 'Lobby'>

export function LobbyScreen() {
  const { tokens, ui } = useTheme()
  const navigation = useNavigation<LobbyNav>()
  const route = useRoute<LobbyRouteProp>()
  const { code } = route.params
  const { saveSession } = useSession()
  const { profile, loading: profileLoading, saveProfile } = useProfile()
  const { history, recordJoin } = useSessionHistory()

  const [session, setSession] = useState<KaraokeSessionRow | null>(null)
  const [guests, setGuests] = useState<KaraokeGuestRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [colorIndex, setColorIndex] = useState(0)
  const [picture, setPicture] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const autoJoinedRef = useRef(false)
  const [autoJoining, setAutoJoining] = useState(false)

  // If the user has a fully-filled profile (name + color + picture) the join
  // form is unnecessary — we pre-fill everything and submit immediately. They
  // can still edit later by leaving the session.
  const profileComplete = !!(
    profile?.name?.trim() &&
    profile?.defaultColor &&
    profile?.profilePicture
  )

  // Seed form state from the saved profile when it loads — so returning users
  // skip retyping their name, color, and photo.
  useEffect(() => {
    if (profile) {
      setName((prev) => prev || profile.name)
      setColorIndex(findColorIndex(profile.defaultColor))
      setPicture((prev) => (prev !== null ? prev : profile.profilePicture ?? null))
    }
  }, [profile])

  useEffect(() => {
    let cancelled = false
    let unsubGuests: (() => void) | null = null

    ;(async () => {
      const result = await validateSession(supabase, code)
      if (cancelled) return
      if (!result.ok || !result.session) {
        setError(
          result.reason === 'inactive'
            ? 'That session has ended.'
            : result.reason === 'not_found'
            ? "We couldn't find that session code."
            : result.errorMessage ?? 'Something went wrong.',
        )
        return
      }
      setSession(result.session)
      unsubGuests = subscribeToGuests(supabase, result.session.id, setGuests)
    })()

    return () => {
      cancelled = true
      unsubGuests?.()
    }
  }, [code])

  const sessionTitle = useMemo(() => {
    if (!session) return code
    return session.name?.trim() ? session.name : `Session ${session.code}`
  }, [session, code])

  const performJoin = useCallback(
    async (overrides?: {
      name: string
      color: string | undefined
      picture: string | null | undefined
    }) => {
      if (!session) return
      const trimmedName = (overrides?.name ?? name).trim()
      if (!trimmedName) {
        Alert.alert('Pick a name', 'Tell us what to call you on stage.')
        return
      }
      const color = overrides?.color ?? UNIVERSAL_SINGER_COLORS[colorIndex]?.color
      const finalPicture = overrides ? overrides.picture ?? null : picture
      setBusy(true)
      try {
        // If we've joined this session before, reuse the existing guest row so
        // the host doesn't see ghost duplicates. Only fall back to insert when
        // the prior guest is gone (host wiped it, session reset, etc.).
        const priorEntry = history.find((h) => h.sessionId === session.id)
        let guest: KaraokeGuestRow | null = null
        if (priorEntry) {
          const existing = await getGuest(supabase, priorEntry.guestId)
          if (existing) {
            guest = await updateGuest(supabase, priorEntry.guestId, {
              name: trimmedName,
              defaultColor: color ?? null,
              profilePicture: finalPicture ?? null,
            })
          }
        }
        if (!guest) {
          guest = await createGuest(supabase, {
            sessionId: session.id,
            name: trimmedName,
            defaultColor: color,
            profilePicture: finalPicture ?? undefined,
          })
        }
        const guestId = guest.id
        const guestName = guest.name
        await Promise.all([
          saveSession({
            sessionId: session.id,
            sessionCode: session.code,
            guestId,
            guestName,
          }),
          saveProfile({
            name: trimmedName,
            defaultColor: color,
            profilePicture: finalPicture ?? undefined,
          }),
          recordJoin({
            sessionId: session.id,
            sessionCode: session.code,
            sessionName: session.name,
            guestId,
            joinedAt: new Date().toISOString(),
          }),
        ])
        // Session becomes the ONLY route in the stack — no Main/Lobby beneath
        // it — so the swipe-back gesture has nowhere to go. Leaving is handled
        // exclusively by the Profile tab's "Leave Session" button.
        navigation.reset({
          index: 0,
          routes: [{ name: 'Session' }],
        })
      } catch (err: any) {
        Alert.alert("Couldn't join", err?.message ?? String(err))
        setAutoJoining(false)
        autoJoinedRef.current = false
      } finally {
        setBusy(false)
      }
    },
    [
      name,
      session,
      colorIndex,
      picture,
      history,
      saveSession,
      saveProfile,
      recordJoin,
      navigation,
    ],
  )

  // Fire auto-join once session + complete profile are both available. The
  // ref guards against double-firing if effects re-run for any reason.
  useEffect(() => {
    if (autoJoinedRef.current) return
    if (!session || profileLoading) return
    if (!profileComplete || !profile) return
    autoJoinedRef.current = true
    setAutoJoining(true)
    void performJoin({
      name: profile.name,
      color: profile.defaultColor,
      picture: profile.profilePicture ?? null,
    })
  }, [session, profileLoading, profileComplete, profile, performJoin])

  if (error) {
    return (
      <SafeAreaView style={ui.styles.screen} edges={['top', 'left', 'right']}>
        <View style={ui.styles.page}>
          <Text style={[ui.styles.h1, { marginBottom: 12 }]}>Can't join</Text>
          <Text style={[ui.styles.body, { marginBottom: 24 }]}>{error}</Text>
          <ui.Button
            label="Scan Again"
            onPress={() =>
              navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
            }
          />
        </View>
      </SafeAreaView>
    )
  }

  if (!session || profileLoading) {
    return (
      <SafeAreaView style={ui.styles.screen}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tokens.appBg,
          }}
        >
          <ActivityIndicator color={tokens.hotRed} />
          <Text style={[ui.styles.muted, { marginTop: 12 }]}>
            Looking up session {code}…
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Show a joining state instead of the form whenever we're using the saved
  // profile to auto-join — keeps the form from flashing on screen before the
  // network round-trip finishes.
  if (autoJoining || (profileComplete && busy)) {
    return (
      <SafeAreaView style={ui.styles.screen}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tokens.appBg,
            paddingHorizontal: 32,
          }}
        >
          <ActivityIndicator color={tokens.hotRed} />
          <Text
            style={[
              ui.styles.h2,
              { marginTop: 16, textAlign: 'center' },
            ]}
          >
            Joining as {profile?.name ?? 'you'}…
          </Text>
          <Text
            style={[
              ui.styles.muted,
              { marginTop: 6, textAlign: 'center' },
            ]}
          >
            {sessionTitle}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const selectedColor = UNIVERSAL_SINGER_COLORS[colorIndex]?.color ?? tokens.hotRed
  const initial = (name.trim()[0] ?? '').toUpperCase()

  return (
    <SafeAreaView style={ui.styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 }}>
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontWeight: '800',
                fontSize: 12,
                letterSpacing: 3,
                color: tokens.muted,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Joining
            </Text>
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                textTransform: tokens.displayUppercase ? 'uppercase' : 'none',
                fontWeight: '900',
                fontSize: 34,
                lineHeight: 38,
                letterSpacing: -1,
                color: tokens.black,
              }}
            >
              {sessionTitle}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 24, marginTop: 4, marginBottom: 28 }}>
            <Text
              style={{
                fontFamily: tokens.fontBody,
                fontSize: 13,
                color: tokens.muted,
                marginBottom: 10,
              }}
            >
              {guests.length === 0
                ? "Be the first to join"
                : guests.length === 1
                ? '1 person already in the room'
                : `${guests.length} people already in the room`}
            </Text>
            {guests.length > 0 ? (
              <View
                style={{
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: tokens.dimBorder,
                  paddingVertical: 14,
                  marginHorizontal: -24,
                }}
              >
                <GuestMarquee guests={guests} />
              </View>
            ) : null}
          </View>

          <View style={{ alignItems: 'center', marginBottom: 28 }}>
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
                marginTop: 12,
              }}
            >
              {picture ? 'Tap to change photo' : 'Tap to add a photo'}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
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
              style={[ui.styles.input, { fontSize: 20 }]}
              autoCorrect={false}
              returnKeyType="done"
              maxLength={32}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <ui.ColorPicker value={colorIndex} onChange={setColorIndex} />
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderColor: tokens.dimBorder,
            backgroundColor: tokens.appBg,
          }}
        >
          <ui.Button label="Join Session" onPress={() => void performJoin()} loading={busy} />
          <Pressable
            onPress={() =>
              navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
            }
            hitSlop={10}
            style={{ alignSelf: 'center', paddingVertical: 10, marginTop: 4 }}
          >
            <Text
              style={{
                fontFamily: tokens.fontBody,
                fontSize: 14,
                color: tokens.muted,
                textDecorationLine: 'underline',
              }}
            >
              Scan a different code
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function GuestAvatar({ guest }: { guest: KaraokeGuestRow }) {
  const { tokens } = useTheme()
  const initial = (guest.name?.[0] ?? '?').toUpperCase()
  const color = guest.default_color || tokens.softViolet
  const picture = guest.profile_picture
  return (
    <View style={{ alignItems: 'center', marginHorizontal: 10 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: tokens.black,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
          overflow: 'hidden',
        }}
      >
        {picture ? (
          <Image
            source={{ uri: picture }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              textTransform: tokens.displayUppercase ? 'uppercase' : 'none',
              fontWeight: '800',
              fontSize: 18,
              color: tokens.black,
            }}
          >
            {initial}
          </Text>
        )}
      </View>
      <Text
        style={{
          fontFamily: tokens.fontBody,
          fontWeight: '600',
          fontSize: 12,
          color: tokens.black,
          textAlign: 'center',
        }}
      >
        {guest.name}
      </Text>
    </View>
  )
}

function GuestMarquee({ guests }: { guests: KaraokeGuestRow[] }) {
  const translateX = useRef(new Animated.Value(0)).current
  const [setWidth, setSetWidth] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(0)

  const shouldAnimate = setWidth > 0 && setWidth > viewportWidth

  useEffect(() => {
    if (!shouldAnimate) {
      translateX.setValue(0)
      return
    }
    translateX.setValue(0)
    const pxPerSecond = 40
    const duration = (setWidth / pxPerSecond) * 1000
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -setWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    animation.start()
    return () => animation.stop()
  }, [shouldAnimate, setWidth, translateX])

  return (
    <View
      style={{ width: '100%', overflow: 'hidden' }}
      onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={{
          flexDirection: 'row',
          transform: [{ translateX }],
          alignSelf: shouldAnimate ? 'flex-start' : 'center',
        }}
      >
        <View
          style={{ flexDirection: 'row' }}
          onLayout={(e) => setSetWidth(e.nativeEvent.layout.width)}
        >
          {guests.map((g) => (
            <GuestAvatar key={g.id} guest={g} />
          ))}
        </View>
        {shouldAnimate ? (
          <View style={{ flexDirection: 'row' }}>
            {guests.map((g) => (
              <GuestAvatar key={`dup-${g.id}`} guest={g} />
            ))}
          </View>
        ) : null}
      </Animated.View>
    </View>
  )
}
