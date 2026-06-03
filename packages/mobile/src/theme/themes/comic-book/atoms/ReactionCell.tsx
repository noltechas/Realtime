import React from 'react'
import { Pressable, View, Text, type ViewStyle, type TextStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COMIC_BOOK_MOBILE } from '../../../tokens'
import type { ReactionCellProps } from '../../../types'
import { INK, PANEL, inkShadow, slam, Halftone, Burst, spikePoints } from './_comic'

// Comic-Book reaction cell — a comic ACTION PANEL. The emoji / icon is punched
// onto a big pop-colored STARBURST (sized to hold the 64–72px glyphs the screen
// passes in — the old version clipped them), the whole panel is screened with
// Ben-Day halftone, and the label rides a tilted caption box at the bottom like
// a comic panel caption. Slam-flush press.
const t = COMIC_BOOK_MOBILE

// Light pop spots so the ink-tinted Ionicons stay legible on top.
const SPOTS = ['#FFD400', '#2FA8FF', '#00C853', '#FF7A00', '#FF4FA3', '#26E0E0']

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const cellStyle: ViewStyle = {
  flex: 1,
  backgroundColor: PANEL,
  borderWidth: 3,
  borderColor: INK,
  borderRadius: 10,
  padding: 12,
  ...inkShadow(4),
}

const editStyle: ViewStyle = {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 26,
  height: 26,
  borderRadius: 13,
  borderWidth: 2.5,
  borderColor: INK,
  backgroundColor: '#FFD400',
  alignItems: 'center',
  justifyContent: 'center',
  ...inkShadow(1),
}

const captionStyle: TextStyle = {
  fontFamily: t.fontDisplay,
  fontSize: 14,
  color: INK,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  textAlign: 'center',
}

const BURST = 128

export function ReactionCell({ onPress, onEditPress, disabled, icon, label }: ReactionCellProps) {
  const h = hashStr(label)
  const spot = SPOTS[h % SPOTS.length]
  const pts = spikePoints(11 + (h % 5), 47, 38, 22 + (h % 4) * 2, 18 + (h % 4) * 2, -90 + (h % 20))

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [cellStyle, pressed ? slam(3) : null, disabled ? { opacity: 0.4 } : null]}
    >
      {/* Halftone print, clipped to the panel */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, overflow: 'hidden' }}>
        <Halftone color={INK} opacity={0.07} dot={2} gap={9} />
      </View>

      {/* Big action starburst with the glyph punched on top */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: BURST, height: BURST, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <Burst width={BURST} height={BURST} fill={spot} points={pts} strokeWidth={3.5} />
          </View>
          {icon}
        </View>
      </View>

      {/* Caption box */}
      <View
        style={{
          alignSelf: 'stretch',
          backgroundColor: PANEL,
          borderWidth: 2.5,
          borderColor: INK,
          borderRadius: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          marginTop: 4,
          transform: [{ rotate: '-1.5deg' }],
          ...inkShadow(2),
        }}
      >
        <Text style={captionStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {label}
        </Text>
      </View>

      {onEditPress ? (
        <Pressable onPress={onEditPress} hitSlop={6} style={editStyle}>
          <Ionicons name="create-outline" size={13} color={INK} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}
