import React from 'react'
import { Text, View } from 'react-native'
import type { SongCardProps } from '../../../types'
import { hashKey } from '../../../helpers'
import { ArtLabel, DUST, GOLD, GlassPanel, GoldenRecord, Press, STAR, body, mono, useMeasured } from './_record'

// Space song card: every song is a GOLDEN RECORD. The album art is the
// record's label, set into satin gold grooves under a lamp's bowtie of light,
// on a plate of black glass with registration ticks in its corners. The song
// is written under it like the track listing on a sleeve, with a catalogue
// number in the cover's monospace.

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`
}

export function SongCard({ track, onPress }: SongCardProps) {
  const [size, onLayout] = useMeasured()
  const duration = formatDuration(track.duration_ms)
  const no = String((hashKey(track.track_id) % 900) + 100)
  const w = size?.w ?? 0
  return (
    <Press onPress={onPress} outerStyle={{ flex: 1 }} style={{ flex: 1, borderRadius: 16 }}>
      <GlassPanel radius={16} style={{ flex: 1 }} contentStyle={{ padding: 10, paddingBottom: 12 }}>
        <View onLayout={onLayout} style={{ width: '100%' }}>
          {w ? (
            <GoldenRecord size={w} labelRatio={0.66}>
              <ArtLabel uri={track.art_url} size={w * 0.66} />
            </GoldenRecord>
          ) : (
            <View style={{ aspectRatio: 1 }} />
          )}
        </View>
        <Text numberOfLines={2} style={body(13.5, STAR, 500, { textTransform: 'uppercase', letterSpacing: 1.2, lineHeight: 17, marginTop: 10, textAlign: 'center' })}>
          {track.name}
        </Text>
        <Text numberOfLines={1} style={mono(9.5, DUST, { marginTop: 4, letterSpacing: 1.3, textAlign: 'center', textTransform: 'none' })}>
          {track.artist}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 6 }}>
          <Text style={mono(8.5, 'rgba(233,196,106,0.6)', { letterSpacing: 1.6 })}>No. {no}</Text>
          {duration ? <Text style={mono(8.5, GOLD, { letterSpacing: 1.6 })}>{duration}</Text> : null}
        </View>
      </GlassPanel>
    </Press>
  )
}
