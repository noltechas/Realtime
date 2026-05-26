import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  RefreshControl,
  Pressable,
  Alert,
  type TextStyle,
  type ViewStyle,
  type ImageStyle,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
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
  type SingerConfig,
  type ThemeTokens,
} from '@karaoke/shared'
import type {
  RootStackParamList,
  SessionTabsParamList,
} from '../navigation/types'
import { useTheme, LocalThemeProvider } from '../theme/ThemeContext'
import {
  themeShadow,
  themePressed,
  themeRadius,
  themeCardBorder,
  themeCardShape,
  themeAccentTint,
} from '../theme/styles'
import { useSession } from '../hooks/useSession'
import { useCatalog } from '../hooks/useCatalog'
import { supabase } from '../supabase/client'
import { ThemedBackdrop } from '../theme/ThemedBackdrop'

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
        } catch {
          // Corrupt cache — ignore.
        }
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

export function QueueScreen() {
  const { tokens, styles: globalStyles } = useTheme()
  const insets = useSafeAreaInsets()
  const { session } = useSession()
  const navigation = useNavigation<QueueNav>()
  const { catalog } = useCatalog(session?.sessionId)
  const [rows, setRows] = useState<KaraokeQueueRow[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const { votedMap, markVoted } = useVotedMap(session?.sessionCode)

  useEffect(() => {
    if (!session) return
    const unsub = subscribeToQueue(supabase, session.sessionId, setRows)
    return () => unsub()
  }, [session?.sessionId])

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
      // Defensive: never vote on a song you're in — mirrors the website guard.
      const gn = (session.guestName || '').toLowerCase()
      const inSong = (row.singer_configs || []).some(
        (s) => (s?.name || '').toLowerCase() === gn,
      )
      if (inSong) return

      markVoted(row.id, value)
      // Optimistic local bump + re-sort so the row visually shifts toward its
      // new spot before the realtime subscription returns the authoritative row.
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
      <SafeAreaView style={globalStyles.screen}>
        <View style={globalStyles.page}>
          <Text style={globalStyles.body}>No active session.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const bottomPadding = insets.bottom + 96

  return (
    <SafeAreaView style={globalStyles.screen} edges={['top', 'left', 'right']}>
      <ThemedBackdrop />
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={globalStyles.h1}>Queue</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: bottomPadding,
          gap: 12,
          // flexGrow lets the empty state's flex-centered container fill the
          // viewport so "Nothing queued yet" sits in the middle of the page.
          // When the list has rows the flex layout has nothing to expand into
          // and the gap+padding stack behaves identically to without this.
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
            <View style={[globalStyles.card, { alignItems: 'center', paddingVertical: 36 }]}>
              <Text style={[globalStyles.h2, { marginBottom: 8 }]}>Nothing queued yet</Text>
              <Text style={[globalStyles.muted, { textAlign: 'center' }]}>
                Tap the Songs tab to add the first one.
              </Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          // Each row is rendered under its per-song `stage_theme` so the card
          // previews how the song will look on stage. Null stage_theme keeps
          // the inherited (session) tokens via LocalThemeProvider's fallback.
          <LocalThemeProvider themeName={item.stage_theme}>
            <QueueRow
              item={item}
              position={index + 1}
              voted={votedMap[item.id]}
              guestName={session.guestName}
              guestId={session.guestId}
              onVote={handleVote}
              onEdit={handleEdit}
            />
          </LocalThemeProvider>
        )}
      />
    </SafeAreaView>
  )
}

function sectionLabelStyle(t: ThemeTokens): TextStyle {
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

function QueueRow({
  item,
  position,
  voted,
  guestName,
  guestId,
  onVote,
  onEdit,
}: {
  item: KaraokeQueueRow
  position: number
  voted?: VoteValue
  guestName: string
  guestId: string
  onVote: (row: KaraokeQueueRow, value: VoteValue) => void
  onEdit: (row: KaraokeQueueRow) => void
}) {
  const { tokens } = useTheme()
  const score = (item.score ?? 0) + (item.bonus_points ?? 0)
  const singers = useMemo<SingerConfig[]>(
    () => (Array.isArray(item.singer_configs) ? item.singer_configs : []),
    [item.singer_configs],
  )
  const isLocked = item.locked && position === 1
  const inSong = useMemo(() => {
    const gn = (guestName || '').toLowerCase()
    return singers.some((s) => (s.name || '').toLowerCase() === gn)
  }, [singers, guestName])
  const isMine = !isLocked && !!guestId && item.added_by_guest_id === guestId
  const isHidden = !!item.is_hidden

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: tokens.white,
    ...themeCardBorder(tokens),
    // Vary blob mould per row id so adjacent sketch cards bend differently.
    ...themeCardShape(tokens, item.id),
    ...themeShadow(tokens, 'md'),
  }

  return (
    <View style={rowStyle}>
      <Text style={positionStyle(tokens)}>{position}</Text>
      {isHidden ? (
        <View style={hiddenArtStyle(tokens)}>
          <Text style={hiddenArtGlyphStyle(tokens)}>?</Text>
        </View>
      ) : item.track_art_url ? (
        <Image source={{ uri: item.track_art_url }} style={artStyle(tokens)} />
      ) : (
        <View style={[artStyle(tokens) as ViewStyle, { backgroundColor: tokens.creamDark }]} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={titleStyle(tokens)} numberOfLines={1}>
          {isHidden ? 'HIDDEN SONG' : item.track_name}
        </Text>
        {isHidden ? null : (
          <Text style={artistStyle(tokens)} numberOfLines={1}>
            {item.track_artist}
          </Text>
        )}
        {singers.length > 0 ? (
          <View style={singerPillsStyle}>
            {singers.map((singer, i) => (
              <SingerPill key={`${item.id}-${i}-${singer.name}`} singer={singer} />
            ))}
          </View>
        ) : null}
      </View>
      {isMine ? (
        <EditButton onPress={() => onEdit(item)} />
      ) : (
        <VoteColumn
          row={item}
          score={score}
          voted={voted}
          isLocked={isLocked}
          inSong={inSong}
          onVote={onVote}
        />
      )}
    </View>
  )
}

function EditButton({ onPress }: { onPress: () => void }) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Edit song"
      style={({ pressed }) => [
        editBtnStyle(tokens),
        pressed ? themePressed(tokens) : null,
      ]}
    >
      <Ionicons name="create-outline" size={22} color={tokens.black} />
    </Pressable>
  )
}

function SingerPill({ singer }: { singer: SingerConfig }) {
  const { tokens } = useTheme()
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  return (
    <View style={singerPillStyle(tokens)}>
      <View style={[singerDotStyle(tokens), { backgroundColor: singer.color || tokens.vividYellow }]}>
        {singer.profilePicture ? (
          <Image
            source={{ uri: singer.profilePicture }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text style={singerInitialStyle(tokens)}>{initial}</Text>
        )}
      </View>
      <Text style={singerNameStyle(tokens)} numberOfLines={1}>
        {singer.name || 'Singer'}
      </Text>
    </View>
  )
}

function VoteColumn({
  row,
  score,
  voted,
  isLocked,
  inSong,
  onVote,
}: {
  row: KaraokeQueueRow
  score: number
  voted?: VoteValue
  isLocked: boolean
  inSong: boolean
  onVote: (row: KaraokeQueueRow, value: VoteValue) => void
}) {
  const { tokens } = useTheme()
  if (isLocked) {
    return (
      <View style={lockBadgeStyle(tokens)}>
        <Ionicons name="lock-closed" size={18} color={tokens.black} />
        <Text style={lockLabelStyle(tokens)}>
          Next Up{'\n'}Locked
        </Text>
      </View>
    )
  }

  if (inSong) {
    if (score === 0) return null
    return (
      <View style={voteColStyle}>
        <ScoreLabel score={score} />
      </View>
    )
  }

  if (voted) {
    return (
      <View style={voteColStyle}>
        {score !== 0 ? <ScoreLabel score={score} /> : null}
        <View style={votedPillStyle(tokens)}>
          <Ionicons name="checkmark" size={11} color={tokens.black} />
          <Text style={votedPillLabelStyle(tokens)}>
            {voted > 0 ? 'Voted Up' : 'Voted Down'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={voteColStyle}>
      {score !== 0 ? <ScoreLabel score={score} /> : null}
      <View style={voteButtonsStyle}>
        <Pressable
          onPress={() => onVote(row, 1)}
          style={({ pressed }) => [
            voteBtnStyle(tokens, 'up'),
            pressed ? themePressed(tokens) : null,
          ]}
          accessibilityLabel="Upvote"
        >
          <Ionicons name="chevron-up" size={18} color={tokens.black} />
        </Pressable>
        <Pressable
          onPress={() => onVote(row, -1)}
          style={({ pressed }) => [
            voteBtnStyle(tokens, 'down'),
            pressed ? themePressed(tokens) : null,
          ]}
          accessibilityLabel="Downvote"
        >
          <Ionicons name="chevron-down" size={18} color={tokens.isDark ? tokens.black : tokens.white} />
        </Pressable>
      </View>
    </View>
  )
}

function ScoreLabel({ score }: { score: number }) {
  const { tokens } = useTheme()
  const color = score > 0 ? tokens.mintGreen : score < 0 ? tokens.hotRed : tokens.black
  return <Text style={[scoreStyle(tokens), { color }]}>{score}</Text>
}

// ─── per-element style builders (theme-aware) ──────────────────────────────

function positionStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 18,
    color: t.faint,
    minWidth: 22,
    textAlign: 'center',
  }
}
function artStyle(t: ThemeTokens): ImageStyle {
  return {
    width: 48,
    height: 48,
    borderRadius: themeRadius(t, 6),
    borderWidth: t.isDark ? 1 : 2,
    borderColor: t.isDark ? t.dimBorder : t.black,
  }
}
function hiddenArtStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 48,
    height: 48,
    borderRadius: themeRadius(t, 6),
    borderWidth: t.isDark ? 1 : 3,
    borderColor: t.isDark ? t.accentA : t.black,
    backgroundColor: t.isDark ? t.appBg : t.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...themeShadow(t, 'sm'),
  }
}
function hiddenArtGlyphStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.isDark ? t.accentA : t.vividYellow,
    fontFamily: t.fontDisplay,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  }
}
function titleStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 14,
    color: t.black,
  }
}
function artistStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontBody,
    fontWeight: '500',
    fontSize: 12,
    color: t.muted,
    marginTop: 1,
  }
}
const singerPillsStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 8,
}
function singerPillStyle(t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingLeft: 3,
    paddingVertical: 2,
    backgroundColor: t.isDark ? 'transparent' : t.cream,
    borderWidth: t.isDark ? 1 : 2,
    borderColor: t.isDark ? t.dimBorder : t.black,
    borderRadius: t.isDark ? 0 : 99,
  }
}
function singerDotStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 16,
    height: 16,
    borderRadius: t.isDark ? 0 : 99,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }
}
function singerInitialStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.isDark ? t.appBg : t.black,
    fontWeight: '800',
    fontSize: 10,
  }
}
function singerNameStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.black,
    fontFamily: t.fontDisplay,
    fontWeight: '700',
    fontSize: 11,
  }
}
const voteColStyle: ViewStyle = {
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  marginLeft: 4,
  alignSelf: 'center',
}
function scoreStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '900',
    fontSize: 16,
    minWidth: 28,
    textAlign: 'center',
    lineHeight: 18,
  }
}
const voteButtonsStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
}
function voteBtnStyle(t: ThemeTokens, dir: 'up' | 'down'): ViewStyle {
  const dark = t.isDark
  const bg = dark
    ? dir === 'up'
      ? themeAccentTint(t, 0.18)
      : 'rgba(255,77,77,0.18)'
    : dir === 'up'
      ? t.vividYellow
      : t.hotRed
  return {
    width: 32,
    height: 32,
    borderRadius: themeRadius(t, 6),
    borderWidth: dark ? 1 : 2.5,
    borderColor: dark
      ? dir === 'up'
        ? t.accentA
        : t.hotRed
      : t.black,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bg,
    ...themeShadow(t, 'sm'),
  }
}
function votedPillStyle(t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: t.isDark ? themeAccentTint(t, 0.18) : t.vividYellow,
    borderWidth: t.isDark ? 1 : 2,
    borderColor: t.isDark ? t.accentA : t.black,
    borderRadius: t.cornerStyle === 'sharp' ? 0 : 99,
    ...themeShadow(t, 'sm'),
  }
}
function votedPillLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.black,
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  }
}
function lockBadgeStyle(t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: t.isDark ? 'rgba(255,204,0,0.16)' : t.vividYellow,
    borderWidth: t.isDark ? 1 : 2.5,
    borderColor: t.isDark ? t.vividYellow : t.black,
    borderRadius: themeRadius(t, 6),
    marginLeft: 4,
    ...themeShadow(t, 'sm'),
  }
}
function lockLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.black,
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  }
}
function editBtnStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 40,
    height: 40,
    borderRadius: themeRadius(t, 6),
    borderWidth: t.isDark ? 1 : 2.5,
    borderColor: t.isDark ? t.accentA : t.black,
    backgroundColor: t.isDark ? themeAccentTint(t, 0.16) : t.vividYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    alignSelf: 'center',
    ...themeShadow(t, 'sm'),
  }
}
