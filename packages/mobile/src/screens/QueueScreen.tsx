import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
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
  songAddView,
  type KaraokeCatalogRow,
  type KaraokeQueueRow,
  type KaraokeGuestRow,
} from '@karaoke/shared'
import type {
  RootStackParamList,
  SessionTabsParamList,
} from '../navigation/types'
import { useTheme, LocalThemeProvider } from '../theme/ThemeContext'
import { useSession } from '../hooks/useSession'
import { useSessionGuests } from '../hooks/useSessionGuests'
import { useCatalog } from '../hooks/useCatalog'
import { useSongAdds } from '../hooks/useSongAdds'
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
  const { catalog, loading: catalogLoading, refresh: refreshCatalog } = useCatalog(session?.sessionId)
  // Songs signed up for before they were built: their add's live progress,
  // and a catalog refresh when one lands so its row stops showing "Building".
  const { byTrack: addsByTrack } = useSongAdds(session?.sessionId, () => { void refreshCatalog() })
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
      const inLibrary = catalog.find((c) => c.track_id === row.track_id)
      if (!inLibrary && catalogLoading) {
        Alert.alert(
          "Can't edit yet",
          'The host is still loading the song catalog. Try again in a moment.',
        )
        return
      }
      // A song still being built isn't in the catalog yet: edit its singers
      // from the queue row itself (parts get assigned once it lands).
      const track: KaraokeCatalogRow = inLibrary ?? {
        session_id: row.session_id,
        track_id: row.track_id,
        name: row.track_name,
        artist: row.track_artist,
        art_url: row.track_art_url,
        album_name: null,
        duration_ms: row.track_duration_ms,
        roles: [],
        has_vocals: null,
        genres: null,
        offensive_role_indices: null,
        spotify_data: null,
      }
      navigation.navigate('Wizard', {
        track,
        pendingSong: !inLibrary,
        edit: {
          queueRowId: row.id,
          singerConfigs: Array.isArray(row.singer_configs) ? row.singer_configs : [],
          stageTheme: row.stage_theme,
          isHidden: !!row.is_hidden,
        },
      })
    },
    [catalog, catalogLoading, navigation],
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
        {ui.ScreenTitle ? <ui.ScreenTitle title="Queue" /> : <Text style={ui.styles.h1}>Queue</Text>}
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
            <Text style={ui.styles.sectionLabel}>
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
            {!catalogLoading && !catalog.some((c) => c.track_id === item.track_id) ? (
              <BuildNote view={songAddView(addsByTrack.get(item.track_id))} />
            ) : null}
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

// Under a queued song that isn't in the library yet: how its build is going.
// The host skips past it until it lands, then it plays in its turn.
function BuildNote({ view }: { view: ReturnType<typeof songAddView> }) {
  const { tokens, ui } = useTheme()
  const failed = view.tone === 'failed'
  const text = failed
    ? 'Couldn’t build this song'
    : view.tone === 'ready'
      ? 'Built, loading it in'
      : `Building · ${view.label}${view.pct != null ? ` · ${view.pct}%` : ''}`
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingTop: 6 }}>
      {failed ? null : <ActivityIndicator size="small" color={tokens.muted} style={{ marginRight: 8, transform: [{ scale: 0.8 }] }} />}
      <Text style={[ui.styles.muted, { fontSize: 12, color: failed ? tokens.hotRed : tokens.muted, flex: 1 }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  )
}
