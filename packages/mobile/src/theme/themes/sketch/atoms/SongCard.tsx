import React, { memo } from 'react'
import { Text, View } from 'react-native'
import type { SongCardProps } from '../../../types'
import { GRAPHITE, GRAPHITE_SOFT, IMG, INK, LETTER_B, Mark, Press, TapedPrint, letter, note, useMeasured, wobble } from './_pencil'

// Sketch song card: the album art as a reference print taped up on the sheet
// (each at its own slight angle, taped across the top or across two corners),
// the title lettered underneath and the artist pencilled beside it.
function SongCardImpl({ track, onPress, index = 0 }: SongCardProps) {
  const [size, onLayout] = useMeasured()
  const w = size?.w ?? 0
  const P = w * 0.9
  const key = track.track_id ?? track.name
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`${track.name} by ${track.artist}`}>
      <View onLayout={onLayout} style={{ paddingTop: 8 }}>
        {w ? (
          <View style={{ height: P + 6, alignItems: 'center' }}>
            <TapedPrint uri={track.art_url} size={P} seed={key} tape={index % 3 === 1 ? 'corners' : 'top'}>
              {!track.art_url ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3EFE6' }}>
                  <Mark src={IMG.note} color={GRAPHITE} width={P * 0.3} height={P * 0.42} />
                </View>
              ) : null}
            </TapedPrint>
          </View>
        ) : (
          <View style={{ aspectRatio: 1 / 0.96 }} />
        )}
        <View style={{ paddingHorizontal: 4, marginTop: 6, transform: [{ rotate: `${wobble(key, 7) * 0.8}deg` }] }}>
          <Text numberOfLines={2} style={letter(15, INK, { lineHeight: 19 }, LETTER_B)}>
            {track.name}
          </Text>
          <Text numberOfLines={1} style={note(19, GRAPHITE_SOFT, { marginTop: 1 })}>
            {track.artist}
          </Text>
        </View>
      </View>
    </Press>
  )
}

export const SongCard = memo(SongCardImpl)
