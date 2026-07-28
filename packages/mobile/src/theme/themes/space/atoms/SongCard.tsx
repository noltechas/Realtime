import React from 'react'
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import type { SongCardProps } from '../../../types'
import {
  CUT_PLATE,
  HULL_WELL,
  ICE,
  MONO,
  MachinedPanel,
  STEEL_HI,
  TEXT_DIM,
  TEXT_FAINT,
  useMeasuredSize,
  usePressTravel,
} from './_ship'

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '--:--'
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Space song card — a catalog slot on the panel.
//
// Album art goes in a SQUARE recessed bay with corner registration marks, not
// a circle inside an orbit ring. That single decision is most of what separates
// this from the previous space theme: a circle reads "planet", and once one
// element is a planet every element wants to be one. A square bay reads
// "hardware holding a media object", which is what the screen actually is.
//
// The catalog index across the top — a mono designator derived from the track
// id, plus the duration — is the theme's texture: real-looking readouts instead
// of decorative glow.
export function SpaceSongCard({ track, onPress }: SongCardProps) {
  const { tokens } = useTheme()
  const { depth, transform, onPressIn, onPressOut } = usePressTravel()
  const duration = formatDuration(track.duration_ms)

  // Stable per-track slot designator. Purely typographic detail, but it is the
  // kind of detail that makes a panel look inventoried rather than styled.
  const seed = hashKey(track.track_id || track.name || track.artist)
  const designator = `TRK-${(seed % 9000 + 1000).toString()}`

  // The art bay's rim lights on press — the card's acknowledgement.
  const rimOpacity = depth.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] })

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ flex: 1, marginBottom: 12 }}
    >
      <MachinedPanel
        cuts={CUT_PLATE}
        tone="ice"
        fill="glass"
        systemBar
        bolts
        style={{ flex: 1, transform }}
        contentStyle={{ paddingTop: 10, paddingBottom: 12, paddingHorizontal: 11, paddingLeft: 13 }}
      >
        {/* Catalog header row. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Text style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: TEXT_FAINT }}>
            {designator}
          </Text>
          <Text style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 0.8, color: ICE }}>
            {duration}
          </Text>
        </View>

        {/* Recessed art bay. */}
        <View style={{ width: '100%', aspectRatio: 1, marginBottom: 10 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: HULL_WELL,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {track.art_url ? (
              <Image
                source={{ uri: track.art_url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="musical-notes" size={26} color={TEXT_FAINT} />
            )}
          </View>

          {/* Bay rim + corner registration marks, drawn over the art so they
              read as the bay's own machined edge rather than a border on the
              image. */}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { opacity: rimOpacity }]}
          >
            <RegistrationFrame />
          </Animated.View>
        </View>

        <Text
          numberOfLines={2}
          style={{
            fontFamily: tokens.fontDisplay,
            fontSize: 12,
            lineHeight: 16,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: tokens.black,
          }}
        >
          {track.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: tokens.fontBody,
            fontSize: 11,
            marginTop: 3,
            letterSpacing: 0.3,
            color: TEXT_DIM,
          }}
        >
          {track.artist}
        </Text>
      </MachinedPanel>
    </Pressable>
  )
}

// Four short L-marks at the bay corners plus a hairline rim. Deliberately NOT
// the old HUD corner brackets: these sit flush inside the bay edge and are
// steel, so they read as machined registration rather than a sci-fi overlay.
function RegistrationFrame() {
  const { size, onLayout } = useMeasuredSize()
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {size ? (
        <Svg width={size.width} height={size.height}>
          <Path
            d={`M 0.5 0.5 L ${size.width - 0.5} 0.5 L ${size.width - 0.5} ${
              size.height - 0.5
            } L 0.5 ${size.height - 0.5} Z`}
            fill="none"
            stroke={ICE}
            strokeOpacity={0.4}
            strokeWidth={1}
          />
          {[
            { x: 0, y: 0, dx: 1, dy: 1 },
            { x: size.width, y: 0, dx: -1, dy: 1 },
            { x: size.width, y: size.height, dx: -1, dy: -1 },
            { x: 0, y: size.height, dx: 1, dy: -1 },
          ].map((corner, index) => (
            <Path
              key={index}
              d={`M ${corner.x + corner.dx * 1.5} ${corner.y + corner.dy * 9} L ${
                corner.x + corner.dx * 1.5
              } ${corner.y + corner.dy * 1.5} L ${corner.x + corner.dx * 9} ${
                corner.y + corner.dy * 1.5
              }`}
              fill="none"
              stroke={STEEL_HI}
              strokeOpacity={0.75}
              strokeWidth={1.6}
            />
          ))}
        </Svg>
      ) : null}
    </View>
  )
}
