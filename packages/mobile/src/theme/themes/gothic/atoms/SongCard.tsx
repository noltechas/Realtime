import React from 'react'
import { Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SongCardProps } from '../../../types'
import { BONE, CANDLE, GlassWindow, PEWTER, Press, Stone, archRise, gothic, serif, useMeasured, useStorm } from './_gothic'

// Gothic song card: a lancet window. The album art is the GLASS: glazed into a
// pointed arch, leaded into diamond quarries, given the uneven sheen of old
// glass and a backlit fall-off toward the stone jambs. Every card on the screen
// flares at the same instant when lightning strikes outside (one storm for the
// whole app). Under the window, the song is carved into the sill.
//
// Touch: the whole window sinks into the wall and darkens, like a stone switch.

const ARCH = 0.8 // a drop arch: still pointed, short enough for a two-up grid
const FRAME = 6

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`
}

export function SongCard({ track, onPress }: SongCardProps) {
  const [size, onLayout] = useMeasured()
  const flash = useStorm()
  const duration = formatDuration(track.duration_ms)
  const w = size?.w ?? 0
  // Window = the arch head plus a short run of straight jamb.
  const winH = w ? Math.round(archRise(w - FRAME * 2, ARCH) + w * 0.34) : 0

  return (
    <Press onPress={onPress} outerStyle={{ flex: 1 }} style={{ flex: 1 }}>
      <View onLayout={onLayout} style={{ width: '100%' }}>
        {w ? (
          <>
            <GlassWindow
              width={w}
              height={winH}
              uri={track.art_url}
              radius={ARCH}
              quarry={30}
              frame={FRAME}
              flash={flash}
              fallback={<Ionicons name="musical-notes" size={34} color={CANDLE} />}
            />
            {/* The sill: a stone ledge the window stands on, with the song cut
                into it. It overlaps the window's foot so they read as one piece. */}
            <Stone
              tone="stone"
              cusp={8}
              groove={false}
              seed={`sill-${track.track_id}`}
              style={{ marginTop: -2 }}
              contentStyle={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, minHeight: 62 }}
            >
              <Text numberOfLines={2} style={gothic(15.5, BONE, 700, { lineHeight: 18 })}>
                {track.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
                <Text numberOfLines={1} style={[serif(13, PEWTER, 'italic'), { flex: 1 }]}>
                  {track.artist}
                </Text>
                {duration ? <Text style={serif(12, CANDLE, 'bold', { marginLeft: 6 })}>{duration}</Text> : null}
              </View>
            </Stone>
          </>
        ) : (
          <View style={{ aspectRatio: 0.7 }} />
        )}
      </View>
    </Press>
  )
}
