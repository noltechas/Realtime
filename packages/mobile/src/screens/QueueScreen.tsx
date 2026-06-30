import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Alert,
  type TextStyle,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  castVote,
  subscribeToQueue,
  listQueue,
  sortQueue,
  type KaraokeQueueRow,
  type KaraokeGuestRow,
  type ThemeTokens,
} from '@karaoke/shared'
import type {
  RootStackParamList,
  SessionTabsParamList,
} from '../navigation/types'
import { useTheme, LocalThemeProvider } from '../theme/ThemeContext'
import { useSession } from '../hooks/useSession'
import { useSessionGuests } from '../hooks/useSessionGuests'
import { useCatalog } from '../hooks/useCatalog'
import { useForegroundEpoch } from '../hooks/useAppForeground'
import { supabase } from '../supabase/client'

type QueueNav = CompositeNavigationProp<
  BottomTabNavigationProp<SessionTabsParamList, 'Queue'>,
  NativeStackNavigationProp<RootStackParamList>
>

type VoteValue = 1 | -1

function votedMapKey(sessionCode: string): string {
  return `karaoke.votes.${sessionCode}`
}

function useVotedMap(sessionCode: string | undefined) {
  const [map, setMap] = useState<Record<string, VoteValue>>({})

  useEffect(() => {
    if (!sessionCode) return
    let cancelled = false
    AsyncStorage.getItem(votedMapKey(sessionCode))
      .then((raw) => {
        if (cancelled || !raw) return
        try {
          setMap(JSON.parse(raw) as Record<string, VoteValue>)
        } catch {}
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sessionCode])

  const markVoted = useCallback(
    (id: string, value: VoteValue) => {
      setMap((prev) => {
        if (prev[id]) return prev
        const next = { ...prev, [id]: value }
        if (sessionCode) {
          AsyncStorage.setItem(votedMapKey(sessionCode), JSON.stringify(next)).catch(() => {})
        }
        return next
      })
    },
    [sessionCode],
  )

  return { votedMap: map, markVoted }
}

// Queue tab — data container. Each row's visual structure (urban skews,
// sketch rotations, deep-sea translucency) lives in the active theme's
// `ui.QueueRow` atom. Items are wrapped in `ui.ItemFloater` so themes that
// want an entrance animation (deep-sea bubbles) can add one.
export function QueueScreen() {
  const { tokens, ui } = useTheme()
  const insets = useSafeAreaInsets()
  const { session } = useSession()
  const guests = useSessionGuests()
  const navigation = useNavigation<QueueNav>()
  const { catalog } = useCatalog(session?.sessionId)
  const [rows, setRows] = useState<KaraokeQueueRow[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const { votedMap, markVoted } = useVotedMap(session?.sessionCode)
  const foregroundEpoch = useForegroundEpoch()

  useEffect(() => {
    if (!session) return
    const unsub = subscribeToQueue(supabase, session.sessionId, setRows)
    return () => unsub()
    // foregroundEpoch re-runs this on app resume — see useAppForeground.
  }, [session?.sessionId, foregroundEpoch])

  const onRefresh = async () => {
    if (!session) return
    setRefreshing(true)
    try {
      const fresh = await listQueue(supabase, session.sessionId)
      setRows(fresh)
    } catch {
      // Pull-to-refresh failures are non-fatal; the subscription catches up.
    } finally {
      setRefreshing(false)
    }
  }

  const handleEdit = useCallback(
    (row: KaraokeQueueRow) => {
      const track = catalog.find((c) => c.track_id === row.track_id)
      if (!track) {
        Alert.alert(
          "Can't edit yet",
          'The host is still loading the song catalog. Try again in a moment.',
        )
        return
      }
      navigation.navigate('Wizard', {
        track,
        edit: {
          queueRowId: row.id,
          singerConfigs: Array.isArray(row.singer_configs) ? row.singer_configs : [],
          stageTheme: row.stage_theme,
          isHidden: !!row.is_hidden,
        },
      })
    },
    [catalog, navigation],
  )

  const handleVote = useCallback(
    async (row: KaraokeQueueRow, value: VoteValue) => {
      if (!session) return
      if (votedMap[row.id]) return
      // You can't vote on a song you're singing in. Match by stable guestId
      // (immune to profile-name edits), with a legacy name fallback.
      const gn = (session.guestName || '').toLowerCase()
      const inSong = (row.singer_configs || []).some(
        (s) =>
          (s?.guestId && s.guestId === session.guestId) ||
          (!!gn && (s?.name || '').toLowerCase() === gn),
      )
      if (inSong) return

      markVoted(row.id, value)
      setRows((prev) =>
        sortQueue(
          prev.map((r) =>
            r.id === row.id ? { ...r, score: (r.score || 0) + value } : r,
          ),
        ),
      )
      try {
        await castVote(supabase, {
          queueRowId: row.id,
          guestId: session.guestId,
          value,
        })
      } catch {
        // Realtime will reconcile if the server actually rejected the insert.
      }
    },
    [session, votedMap, markVoted],
  )

  if (!session) {
    return (
      <SafeAreaView style={ui.styles.screen}>
        <View style={ui.styles.page}>
          <Text style={ui.styles.body}>No active session.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const bottomPadding = insets.bottom + 96

  return (
    <SafeAreaView style={ui.styles.screen} edges={['top', 'left', 'right']}>
      <ui.Backdrop />
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
        {tokens.name === 'tropical' ? (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#6E4423',
              borderWidth: 3,
              borderColor: '#C99A54',
              borderRadius: 14,
              paddingHorizontal: 22,
              paddingVertical: 6,
              shadowColor: '#0E2E29',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.22,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text style={{ fontFamily: tokens.fontBody, fontSize: 34, color: '#FFF1C4', letterSpacing: 0.5 }}>Queue</Text>
          </View>
        ) : (
          <Text style={ui.styles.h1}>Queue</Text>
        )}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: bottomPadding,
          gap: 12,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tokens.accentGlowColor}
          />
        }
        ListHeaderComponent={
          rows.length > 0 ? (
            <Text style={sectionLabelStyle(tokens)}>
              Up Next · {rows.length} song{rows.length === 1 ? '' : 's'}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={[ui.styles.card, { alignItems: 'center', paddingVertical: 36 }]}>
              <Text style={[ui.styles.h2, { marginBottom: 8 }]}>Nothing queued yet</Text>
              <Text style={[ui.styles.muted, { textAlign: 'center' }]}>
                Tap the Songs tab to add the first one.
              </Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          // Each row renders under its per-song stage_theme so the card
          // previews how the song will look on stage. Null stage_theme keeps
          // the inherited session tokens.
          <LocalThemeProvider themeName={item.stage_theme}>
            <RowItem
              item={item}
              index={index}
              position={index + 1}
              voted={votedMap[item.id]}
              guestName={session.guestName}
              guestId={session.guestId}
              guests={guests}
              onVote={handleVote}
              onEdit={handleEdit}
            />
          </LocalThemeProvider>
        )}
      />
    </SafeAreaView>
  )
}

// Inner component reads `ui` from its LocalThemeProvider parent so the row
// renders under the per-song theme, not the screen-level theme.
function RowItem(props: {
  item: KaraokeQueueRow
  index: number
  position: number
  voted?: VoteValue
  guestName: string
  guestId: string
  guests: Map<string, KaraokeGuestRow>
  onVote: (row: KaraokeQueueRow, value: VoteValue) => void
  onEdit: (row: KaraokeQueueRow) => void
}) {
  const { ui } = useTheme()
  return (
    <ui.ItemFloater delay={(props.index * 150) % 1000}>
      <ui.QueueRow {...props} />
    </ui.ItemFloater>
  )
}

function sectionLabelStyle(t: ThemeTokens): TextStyle {
  if (t.name === 'tropical') {
    // High-contrast + a white halo so it stays readable over the bright sky photo.
    return {
      fontFamily: t.fontDisplay,
      fontSize: 17,
      color: '#0E2E29',
      opacity: 1,
      marginBottom: 12,
      textShadowColor: 'rgba(255,255,255,0.75)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 5,
    }
  }
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: t.displayUppercase ? 2 : 1,
    textTransform: 'uppercase',
    color: t.black,
    opacity: 0.55,
    marginBottom: 12,
  }
}
