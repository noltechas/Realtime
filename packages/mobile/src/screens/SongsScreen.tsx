import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
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
import { useSession } from '../hooks/useSession'
import { useCatalog } from '../hooks/useCatalog'

type SongsNav = CompositeNavigationProp<
  BottomTabNavigationProp<SessionTabsParamList, 'Songs'>,
  NativeStackNavigationProp<RootStackParamList>
>

// Songs tab — data container. All visual decisions (search bar shape, song
// card structure, genre tab style, idle/empty layout, item entrance animation)
// are delegated to the active theme's UI module. No `tokens.name ===` checks
// live here.
export function SongsScreen() {
  const { tokens, ui } = useTheme()
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

  // Open the "request a song to be added" modal, seeding its Spotify search
  // with whatever the guest had typed into the catalog filter.
  const onRequestSong = useCallback(() => {
    if (!session) return
    navigation.navigate('Request', { initialQuery: query.trim() || undefined })
  }, [session, navigation, query])

  // Stable keyExtractor + renderItem so memoized SongCard/ItemFloater can
  // bail out across filter/search changes. Without this, FlatList runs a
  // fresh renderItem closure on every keystroke and the theme's heavy SVG
  // chrome (steampunk gears, space orbits) repaints in lockstep.
  const keyExtractor = useCallback((item: KaraokeCatalogRow) => item.track_id, [])
  const renderItem = useCallback(
    ({ item }: { item: KaraokeCatalogRow }) => (
      <ui.ItemFloater style={{ flex: 1, maxWidth: '50%' }}>
        <ui.SongCard track={item} onPress={() => onTapSong(item)} />
      </ui.ItemFloater>
    ),
    [ui, onTapSong],
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
      <SafeAreaView style={ui.styles.screen}>
        <View style={ui.styles.page}>
          <Text style={ui.styles.body}>No active session.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={ui.styles.screen} edges={['top', 'left', 'right']}>
      <ui.Backdrop />
      <View style={{ paddingHorizontal: 24, paddingTop: 16, marginBottom: 8 }}>
        <ui.SongsSearchBar value={query} onChangeText={setQuery} />
      </View>

      <ui.GenreTabs
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
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={2}
          // Keep every catalog card mounted across filter/search changes.
          // The steampunk gears (and other themes' continuous animations)
          // are cheap to keep alive on the native driver but expensive to
          // tear down + rebuild, which is what produced the freeze on
          // genre/search toggles. We size the window large enough to cover
          // a typical catalog and disable clipped-subview unmounting.
          removeClippedSubviews={false}
          windowSize={21}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          updateCellsBatchingPeriod={50}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 24 }}
          style={{ marginTop: 16 }}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: bottomPadding,
            gap: 12,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={
            filtered.length > 0 ? (
              <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
                <Text
                  style={[ui.styles.muted, { textAlign: 'center', marginBottom: 10 }]}
                >
                  Can't find your song?
                </Text>
                <ui.Button
                  label="Request a song to be added"
                  variant="outline"
                  onPress={onRequestSong}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View
              style={{
                paddingHorizontal: 24,
                paddingVertical: 32,
                alignItems: 'center',
              }}
            >
              <Text style={[ui.styles.h2, { marginBottom: 6, textAlign: 'center' }]}>
                {query
                  ? 'No songs found'
                  : genre !== 'All Songs'
                  ? `No songs in ${genre}`
                  : 'No songs in the catalog yet'}
              </Text>
              <Text style={[ui.styles.muted, { textAlign: 'center', marginBottom: 18 }]}>
                {query
                  ? 'Not in the library yet — ask the host to add it.'
                  : 'Ask the host to add some songs from their desktop app.'}
              </Text>
              <View style={{ alignSelf: 'stretch' }}>
                <ui.Button
                  label="Request a song to be added"
                  variant="outline"
                  onPress={onRequestSong}
                />
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
