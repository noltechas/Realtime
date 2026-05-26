import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  filterCatalog,
  genreList,
  type KaraokeCatalogRow,
} from '@karaoke/shared'
import type { RootStackParamList, SessionTabsParamList } from '../navigation/types'
import { useTheme } from '../theme/ThemeContext'
import { themeShadow, themePressed, themeRadius, themeCardBorder, themeAccentTint } from '../theme/styles'
import { ThemedBackdrop } from '../theme/ThemedBackdrop'
import { useSession } from '../hooks/useSession'
import { useCatalog } from '../hooks/useCatalog'
import { GenreTabs } from '../components/GenreTabs'

type SongsNav = CompositeNavigationProp<
  BottomTabNavigationProp<SessionTabsParamList, 'Songs'>,
  NativeStackNavigationProp<RootStackParamList>
>

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SongsScreen() {
  const { tokens, styles } = useTheme()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<SongsNav>()
  const { session } = useSession()
  const { catalog, loading, refresh } = useCatalog(session?.sessionId)

  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('All Songs')
  const [refreshing, setRefreshing] = useState(false)

  const { list: genreNames, counts } = useMemo(() => genreList(catalog), [catalog])
  const filtered = useMemo(
    () => filterCatalog(catalog, query, genre),
    [catalog, query, genre],
  )

  const bottomPadding = insets.bottom + 96

  const onTapSong = useCallback(
    (track: KaraokeCatalogRow) => {
      if (!session) return
      navigation.navigate('Wizard', { track })
    },
    [session, navigation],
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }, [refresh])

  if (!session) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.page}>
          <Text style={styles.body}>No active session.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ThemedBackdrop />
      <View style={{ paddingHorizontal: 24, paddingTop: 16, marginBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: tokens.isDark ? themeAccentTint(tokens, 0.05) : tokens.creamDark,
            borderWidth: tokens.isDark ? 1 : 2,
            borderColor: tokens.isDark ? tokens.dimBorder : tokens.black,
            borderRadius: themeRadius(tokens, tokens.radiusSmall),
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <SearchGlyph color={tokens.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search songs or artists…"
            placeholderTextColor={tokens.faint}
            style={{
              flex: 1,
              marginLeft: 10,
              fontFamily: tokens.fontBody,
              fontSize: 16,
              color: tokens.black,
              padding: 0,
            }}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <GenreTabs
        list={genreNames}
        counts={counts}
        value={genre}
        onChange={setGenre}
      />

      {loading && catalog.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={tokens.hotRed} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.track_id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 24 }}
          // marginTop lives on the outer scroll view, NOT contentContainerStyle.
          // contentContainerStyle.paddingTop only adds space before the first
          // row — once the user scrolls, song cards slide flush against the
          // pill row above. The outer marginTop is a static buffer the
          // scrollable area can't move into.
          style={{ marginTop: 16 }}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: bottomPadding,
            gap: 12,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View
              style={{
                paddingHorizontal: 24,
                paddingVertical: 32,
                alignItems: 'center',
              }}
            >
              <Text style={[styles.h2, { marginBottom: 6 }]}>
                {query
                  ? 'No songs found'
                  : genre !== 'All Songs'
                  ? `No songs in ${genre}`
                  : 'No songs in the catalog yet'}
              </Text>
              <Text style={[styles.muted, { textAlign: 'center' }]}>
                {query
                  ? 'Try a different search.'
                  : 'Ask the host to add some songs from their desktop app.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <SongCard track={item} onPress={() => onTapSong(item)} />
          )}
        />
      )}
    </SafeAreaView>
  )
}

function SongCard({
  track,
  onPress,
}: {
  track: KaraokeCatalogRow
  onPress: () => void
}) {
  const { tokens } = useTheme()
  const duration = formatDuration(track.duration_ms)
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        maxWidth: '50%',
        backgroundColor: tokens.white,
        ...themeCardBorder(tokens),
        borderRadius: themeRadius(tokens, tokens.radius),
        padding: 10,
        ...themeShadow(tokens, 'md'),
        ...(pressed ? themePressed(tokens) : null),
      })}
    >
      <View
        style={{
          width: '100%',
          aspectRatio: 1,
          borderRadius: themeRadius(tokens, tokens.radiusSmall),
          borderWidth: tokens.isDark ? 1 : 2,
          borderColor: tokens.isDark ? tokens.dimBorder : tokens.black,
          backgroundColor: tokens.creamDark,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        {track.art_url ? (
          <Image
            source={{ uri: track.art_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <NoteGlyph color={tokens.muted} />
          </View>
        )}
      </View>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '900',
          fontSize: 14,
          color: tokens.black,
          letterSpacing: tokens.displayUppercase ? 1 : -0.3,
          textTransform: tokens.displayUppercase ? 'uppercase' : 'none',
        }}
        numberOfLines={2}
      >
        {track.name}
      </Text>
      <Text
        style={{
          fontFamily: tokens.fontBody,
          fontSize: 12,
          color: tokens.muted,
          marginTop: 2,
        }}
        numberOfLines={1}
      >
        {track.artist}
      </Text>
      {duration ? (
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontWeight: '700',
            fontSize: 11,
            color: tokens.faint,
            marginTop: 4,
          }}
        >
          {duration}
        </Text>
      ) : null}
    </Pressable>
  )
}

function SearchGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 6,
          height: 2,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
          borderRadius: 1,
        }}
      />
    </View>
  )
}

function NoteGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 28, height: 28 }}>
      <View
        style={{
          position: 'absolute',
          right: 8,
          top: 0,
          width: 3,
          height: 22,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 8,
          top: 0,
          width: 8,
          height: 4,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 12,
          height: 9,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
    </View>
  )
}
