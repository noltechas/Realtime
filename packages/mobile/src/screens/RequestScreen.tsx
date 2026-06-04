import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  spotifyTokenIfFresh,
  submitSongRequest,
  type SpotifyTrackResult,
  type ThemeTokens,
} from '@karaoke/shared'
import type { RootStackParamList } from '../navigation/types'
import { useTheme, SessionThemeProvider } from '../theme/ThemeContext'
import type { ThemeUIModule } from '../theme/types'
import { useSession } from '../hooks/useSession'
import { useProfile } from '../hooks/useProfile'
import { useSessionRow } from '../hooks/useSessionRow'
import { useCatalog } from '../hooks/useCatalog'
import { supabase } from '../supabase/client'
import { searchSpotify } from '../spotify/searchSpotify'

type RequestNav = NativeStackNavigationProp<RootStackParamList, 'Request'>
type RequestRouteProp = RouteProp<RootStackParamList, 'Request'>

const SEARCH_DEBOUNCE_MS = 280

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`
}

// Bright/vivid background + guaranteed-dark text, the same contract the
// NowPlayingBanner relies on (`accentB` is always a vivid color). Used for the
// success toast and the "requested" badge so they read on every theme.
const ON_BRIGHT = '#16161D'

// Pick a legible ink for text/icons placed ON a themed card. Most themes pair a
// light card with dark page-ink (or a dark card with light ink), so the page
// body color works — but zen uses a light cream card on a DARK theme, so its
// page body color (also cream) is invisible on the card. Deriving the ink from
// the card's own background luminance keeps on-card content legible on every
// theme without naming any of them; for the 11 already-correct themes it
// resolves to the same dark/light they were using. Falls back to the theme's
// page ink when the card color can't be parsed (e.g. 'transparent').
function parseRgb(color: string | undefined): { r: number; g: number; b: number } | null {
  if (!color) return null
  if (color[0] === '#') {
    let h = color.slice(1)
    if (h.length === 3) h = h.split('').map((c) => c + c).join('')
    if (h.length === 8) h = h.slice(0, 6) // ignore alpha
    if (h.length !== 6) return null
    const n = parseInt(h, 16)
    if (Number.isNaN(n)) return null
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  const m = color.match(/rgba?\(([^)]+)\)/i)
  if (m) {
    const p = m[1].split(',').map((s) => parseFloat(s))
    if (p.length >= 3 && !p.slice(0, 3).some((v) => Number.isNaN(v))) {
      return { r: p[0], g: p[1], b: p[2] }
    }
  }
  return null
}

function simpleLum(rgb: { r: number; g: number; b: number }): number {
  // Perceptual luminance (sRGB weights), 0 (black) … 1 (white).
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
}

// Choose the ink for on-card text/icons. Prefer the theme's OWN body color so
// every already-correct theme keeps its tuned title color exactly (steampunk's
// parchment tan, retrowave's off-white, etc.); only fall back to a luminance-
// derived dark/light ink when that body color lacks contrast against the card —
// which is solely zen's light-cream-on-light-cream case.
function onCardInk(
  cardBg: string | undefined,
  bodyColor: string | undefined,
  fallback: string,
): string {
  const card = parseRgb(cardBg)
  const body = parseRgb(bodyColor)
  if (card && body) {
    const lc = simpleLum(card)
    const lb = simpleLum(body)
    const ratio = (Math.max(lc, lb) + 0.05) / (Math.min(lc, lb) + 0.05)
    if (ratio >= 3 && bodyColor) return bodyColor
  }
  if (!card) return fallback
  return simpleLum(card) > 0.5 ? '#1A1712' : '#F3EADB'
}

interface ConfirmState {
  title: string
  sub: string
  kind: 'success' | 'error'
}

// Per-result lifecycle. Drives the right-hand affordance on each row.
type RowState = 'idle' | 'busy' | 'requested' | 'in-library'

// Public entry — wraps the body in SessionThemeProvider so this root-stack
// modal renders under the live session theme (same pattern as WizardScreen).
export function RequestScreen() {
  return (
    <SessionThemeProvider>
      <RequestScreenBody />
    </SessionThemeProvider>
  )
}

function RequestScreenBody() {
  const { tokens, ui } = useTheme()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<RequestNav>()
  const route = useRoute<RequestRouteProp>()
  const { session } = useSession()
  const { profile } = useProfile()
  const row = useSessionRow(session?.sessionId)
  const { catalog } = useCatalog(session?.sessionId)

  const token = spotifyTokenIfFresh(
    row?.spotify_token,
    row?.spotify_token_expires_at,
  )

  const [query, setQuery] = useState(route.params?.initialQuery ?? '')
  const [results, setResults] = useState<SpotifyTrackResult[]>([])
  const [searching, setSearching] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  // track_ids already in the host's library — tapping one of these tells the
  // guest it's already available instead of sending a redundant request.
  const catalogIds = useMemo(
    () => new Set(catalog.map((c) => c.track_id)),
    [catalog],
  )

  // Legible ink for everything rendered on the result cards, derived from the
  // active theme's card background (see legibleInk). Fixes zen, whose light
  // cream card collided with its light page body color.
  const cardInk = useMemo(() => {
    const cardBg = (StyleSheet.flatten(ui.styles.card) as { backgroundColor?: string } | undefined)
      ?.backgroundColor
    const bodyColor = (StyleSheet.flatten(ui.styles.body) as { color?: string } | undefined)?.color
    return onCardInk(cardBg, bodyColor, tokens.black)
  }, [ui, tokens.black])

  // Latest query at fetch time, so a slow earlier response can't clobber the
  // results of a newer search (out-of-order responses).
  const latestQueryRef = useRef(query)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flashConfirm = useCallback((next: ConfirmState) => {
    setConfirm(next)
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    confirmTimer.current = setTimeout(() => setConfirm(null), 3200)
  }, [])

  // Debounced Spotify search. Mirrors the website's runRequestSearch (280ms).
  useEffect(() => {
    latestQueryRef.current = query
    if (searchTimer.current) clearTimeout(searchTimer.current)

    const q = query.trim()
    if (!q || !token) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    searchTimer.current = setTimeout(() => {
      searchSpotify(token, q)
        .then((items) => {
          // Ignore stale responses for an earlier query.
          if (latestQueryRef.current.trim() !== q) return
          setResults(items)
          setSearching(false)
        })
        .catch(() => {
          if (latestQueryRef.current.trim() !== q) return
          setResults([])
          setSearching(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [query, token])

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      if (searchTimer.current) clearTimeout(searchTimer.current)
    },
    [],
  )

  const rowStateFor = useCallback(
    (track: SpotifyTrackResult): RowState => {
      if (catalogIds.has(track.trackId)) return 'in-library'
      if (submittingId === track.trackId) return 'busy'
      if (requestedIds.has(track.trackId)) return 'requested'
      return 'idle'
    },
    [catalogIds, submittingId, requestedIds],
  )

  const onRequest = useCallback(
    async (track: SpotifyTrackResult) => {
      if (!session || submittingId) return
      if (catalogIds.has(track.trackId)) {
        flashConfirm({
          title: 'Already in the library',
          sub: 'Find it on the Songs tab and add it to the queue.',
          kind: 'success',
        })
        return
      }
      setSubmittingId(track.trackId)
      const res = await submitSongRequest(supabase, {
        sessionId: session.sessionId,
        requestedByGuestId: session.guestId,
        requestedByName: profile?.name || session.guestName || 'Guest',
        requestedByProfilePicture: profile?.profilePicture ?? null,
        track,
      })
      setSubmittingId(null)

      if (res.status === 'ok' || res.status === 'duplicate') {
        setRequestedIds((prev) => {
          const next = new Set(prev)
          next.add(track.trackId)
          return next
        })
      }
      if (res.status === 'ok') {
        flashConfirm({
          title: 'Request sent!',
          sub: 'The host will add your song as soon as they can.',
          kind: 'success',
        })
      } else if (res.status === 'duplicate') {
        flashConfirm({
          title: 'Already requested',
          sub: 'Someone already asked for this one.',
          kind: 'success',
        })
      } else {
        flashConfirm({
          title: "Couldn't send request",
          sub: res.message || 'Try again in a moment.',
          kind: 'error',
        })
      }
    },
    [session, submittingId, catalogIds, profile, flashConfirm],
  )

  const keyExtractor = useCallback((item: SpotifyTrackResult) => item.trackId, [])
  const renderItem = useCallback(
    ({ item }: { item: SpotifyTrackResult }) => (
      <ResultRow
        tokens={tokens}
        ui={ui}
        ink={cardInk}
        track={item}
        state={rowStateFor(item)}
        onPress={() => onRequest(item)}
      />
    ),
    [tokens, ui, cardInk, rowStateFor, onRequest],
  )

  const trimmed = query.trim()
  const tokenLoading = !row // session row not fetched yet
  const requestsAvailable = !!token

  return (
    <SafeAreaView style={ui.styles.screen} edges={['top', 'left', 'right']}>
      <ui.Backdrop />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingHorizontal: 24,
          paddingTop: 8,
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={ui.styles.h1}>Request a Song</Text>
          <Text style={[ui.styles.muted, { marginTop: 4 }]}>
            Can't find it? Ask the host to add it.
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: tokens.cornerStyle === 'sharp' ? 0 : 999,
              borderWidth: 2,
              borderColor: tokens.dimBorder,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: tokens.pressedOverlay,
            },
            pressed ? { opacity: 0.6 } : null,
          ]}
        >
          <Ionicons name="close" size={22} color={tokens.black} />
        </Pressable>
      </View>

      {requestsAvailable ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <View style={{ paddingHorizontal: 24, paddingTop: 16, marginBottom: 8 }}>
            <ui.SongsSearchBar value={query} onChangeText={setQuery} />
          </View>

          {searching && results.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={tokens.hotRed} />
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 8,
                paddingBottom: insets.bottom + 120,
              }}
              ListEmptyComponent={
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={[ui.styles.h2, { marginBottom: 6, textAlign: 'center' }]}>
                    {trimmed ? 'No tracks found' : 'Search for any song'}
                  </Text>
                  <Text style={[ui.styles.muted, { textAlign: 'center' }]}>
                    {trimmed
                      ? 'Try a different spelling or the artist name.'
                      : 'Type a song or artist and tap one to send it to the host.'}
                  </Text>
                </View>
              }
            />
          )}
        </KeyboardAvoidingView>
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          {tokenLoading ? (
            <ActivityIndicator color={tokens.hotRed} />
          ) : (
            <>
              <Ionicons
                name="cloud-offline-outline"
                size={40}
                color={tokens.muted}
                style={{ marginBottom: 14 }}
              />
              <Text style={[ui.styles.h2, { textAlign: 'center', marginBottom: 8 }]}>
                Requests aren't available right now
              </Text>
              <Text style={[ui.styles.muted, { textAlign: 'center' }]}>
                The host needs to connect Spotify on their end before guests can
                request new songs. Try again in a bit.
              </Text>
            </>
          )}
        </View>
      )}

      {/* Confirmation toast */}
      {confirm ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: insets.bottom + 16,
            backgroundColor:
              confirm.kind === 'error' ? tokens.hotRed : tokens.accentB,
            borderRadius: tokens.cornerStyle === 'sharp' ? 0 : tokens.radius,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderWidth: tokens.cardBorderWidth,
            borderColor: tokens.black,
          }}
        >
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontWeight: '800',
              fontSize: 16,
              color: confirm.kind === 'error' ? '#FFFFFF' : ON_BRIGHT,
            }}
          >
            {confirm.title}
          </Text>
          <Text
            style={{
              fontFamily: tokens.fontBody,
              fontSize: 13,
              marginTop: 2,
              color: confirm.kind === 'error' ? '#FFFFFF' : ON_BRIGHT,
              opacity: 0.85,
            }}
          >
            {confirm.sub}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

// A single Spotify search result, composed from the active theme's card style
// + tokens so it inherits each theme's card chrome (box / blob / skew / glow /
// border / shadow). The whole row is the request affordance: tap to send.
function ResultRow({
  tokens,
  ui,
  ink,
  track,
  state,
  onPress,
}: {
  tokens: ThemeTokens
  ui: ThemeUIModule
  ink: string
  track: SpotifyTrackResult
  state: RowState
  onPress: () => void
}) {
  const artRadius = tokens.cornerStyle === 'sharp' ? 0 : tokens.radiusSmall
  const dim = state === 'in-library'
  const duration = formatDuration(track.durationMs)

  return (
    <Pressable
      onPress={onPress}
      disabled={dim || state === 'busy'}
      style={({ pressed }) => [
        ui.styles.card,
        {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          marginBottom: 12,
          // Neutralize any card-level transform (urban skews its cards by
          // -8deg and counter-skews inner content in its bespoke atoms). A
          // skewed row would slant the album art + text, so we flatten it
          // here while keeping every other themed property (colors, border,
          // blob radii, glow).
          transform: [],
          opacity: dim ? 0.55 : 1,
        },
        pressed && !dim ? { opacity: 0.8 } : null,
      ]}
    >
      {track.art ? (
        <Image
          source={{ uri: track.art }}
          style={{
            width: 52,
            height: 52,
            borderRadius: artRadius,
            borderWidth: 1,
            borderColor: tokens.dimBorder,
            backgroundColor: tokens.creamDark,
          }}
        />
      ) : (
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: artRadius,
            borderWidth: 1,
            borderColor: tokens.dimBorder,
            backgroundColor: tokens.creamDark,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="musical-notes" size={22} color={ink} style={{ opacity: 0.6 }} />
        </View>
      )}

      <View style={{ flex: 1, marginLeft: 12, marginRight: 10 }}>
        <Text style={[ui.styles.body, { fontWeight: '800', color: ink }]} numberOfLines={1}>
          {track.name}
        </Text>
        <Text style={[ui.styles.muted, { color: ink, opacity: 0.72 }]} numberOfLines={1}>
          {track.artist}
        </Text>
        {state === 'in-library' ? (
          <Text
            style={[ui.styles.muted, { marginTop: 2, fontWeight: '700', color: ink, opacity: 0.72 }]}
            numberOfLines={1}
          >
            Already in the library
          </Text>
        ) : track.album || duration ? (
          <Text
            style={{
              fontFamily: tokens.fontBody,
              fontSize: 11,
              color: ink,
              opacity: 0.5,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {[track.album, duration].filter(Boolean).join('  ·  ')}
          </Text>
        ) : null}
      </View>

      <RowAffordance tokens={tokens} ink={ink} state={state} />
    </Pressable>
  )
}

// Right-hand state badge. Idle uses foreground-on-card (always legible); the
// "requested" check uses a bright accentB fill + dark glyph (same guaranteed-
// contrast contract as the toast).
function RowAffordance({
  tokens,
  ink,
  state,
}: {
  tokens: ThemeTokens
  ink: string
  state: RowState
}) {
  const size = 34
  const radius = tokens.cornerStyle === 'sharp' ? 0 : 999

  if (state === 'busy') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={ink} />
      </View>
    )
  }
  if (state === 'requested') {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: tokens.accentB,
          borderWidth: 2,
          borderColor: tokens.black,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="checkmark" size={20} color={ON_BRIGHT} />
      </View>
    )
  }
  if (state === 'in-library') {
    // Row already renders at reduced opacity for in-library tracks, so full
    // ink here reads as a dimmed "done" tick.
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="checkmark-done" size={22} color={ink} />
      </View>
    )
  }
  // idle
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: 2,
        borderColor: ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="add" size={22} color={ink} />
    </View>
  )
}
