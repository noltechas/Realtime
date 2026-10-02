import React, { memo } from 'react'
import { Image, Text, View } from 'react-native'
import type { SongCardProps } from '../../../types'
import { CAST, ENAMEL, Gear, Plaque, Porthole, Press, display, italic, meshTrain, useMeasured } from './_engine'

// Steampunk song card: the song seen through a riveted brass PORTHOLE, a small
// gear turning behind its rim, and the title on an enamel nameplate below.
const GEARS = [10, 14] as const

function SongCardImpl({ track, onPress, index = 0 }: SongCardProps) {
  const [size, onLayout] = useMeasured()
  const w = size?.w ?? 0
  const P = w * 0.9
  const g = w
    ? meshTrain({ teeth: GEARS[index % 2], x: w * 0.86, y: P * 0.12, phase: (index * 37) % 360 }, [], 0.26)[0]
    : null
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`${track.name} by ${track.artist}`}>
      <View onLayout={onLayout}>
        {w ? (
          <View style={{ height: P, alignItems: 'center' }}>
            {g ? <Gear g={g} shadow={3} /> : null}
            <Porthole size={P}>
              {track.art_url ? <Image source={{ uri: track.art_url }} style={{ width: '100%', height: '100%' }} /> : <View style={{ flex: 1, backgroundColor: ENAMEL }} />}
            </Porthole>
          </View>
        ) : (
          <View style={{ aspectRatio: 1 / 0.9 }} />
        )}
        <Plaque border={9} style={{ marginTop: -6 }} contentStyle={{ paddingHorizontal: 6, paddingVertical: 1, alignItems: 'center' }}>
          <Text numberOfLines={2} style={[display(15, undefined, { textAlign: 'center', lineHeight: 19 }), CAST]}>
            {track.name}
          </Text>
          <Text numberOfLines={1} style={italic(12, undefined, { marginTop: 1, textAlign: 'center' })}>
            {track.artist}
          </Text>
        </Plaque>
      </View>
    </Press>
  )
}

export const SongCard = memo(SongCardImpl)
