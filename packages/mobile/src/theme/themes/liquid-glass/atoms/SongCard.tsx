import React, { memo } from 'react'
import { Image, Text, View } from 'react-native'
import type { SongCardProps } from '../../../types'
import { Glass, NIGHT, Press, SOFT, WHITE, sf } from './_glass'

// Liquid Glass song card: a tile of glass holding the album art, with the
// title and artist on the glass beneath it. Nothing is laid over the cover,
// so the type never sits on the cover's own lettering.
function SongCardImpl({ track, onPress }: SongCardProps) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`${track.name} by ${track.artist}`}>
      <Glass radius={24} interactive style={{ padding: 6 }}>
        <View style={{ aspectRatio: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: NIGHT }}>
          {track.art_url ? <Image source={{ uri: track.art_url }} style={{ width: '100%', height: '100%' }} /> : null}
        </View>
        <View style={{ paddingHorizontal: 6, paddingTop: 8, paddingBottom: 5 }}>
          <Text numberOfLines={1} style={sf(14.5, '700', WHITE)}>
            {track.name}
          </Text>
          <Text numberOfLines={1} style={sf(12.5, '500', SOFT, { marginTop: 1 })}>
            {track.artist}
          </Text>
        </View>
      </Glass>
    </Press>
  )
}

export const SongCard = memo(SongCardImpl)
