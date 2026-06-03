import React from 'react'
import {
  Pressable,
  Text,
  View,
  Image,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import { COMIC_BOOK_MOBILE } from '../../../tokens'
import { hashKey } from '../../../helpers'
import type { SongCardProps } from '../../../types'
import {
  INK,
  PANEL,
  YELLOW,
  inkShadow,
  slam,
  Halftone,
  BurstBadge,
  ComicOutlineText,
} from './_comic'

// Comic-Book song card — a sharp-cornered comic panel. Each card is printed in
// its OWN spot color (stable per track) so a grid reads like a colorful rack of
// single issues:
//   • top plate (ink)        → the ARTIST credit, in the card's spot color
//   • middle panel           → full album art + Ben-Day halftone print
//   • duration               → a yellow starburst price tag pinned to the art
//   • bottom banner (color)  → the SONG title as a knocked-out comic LOGO
//                              (white fill + hard ink outline) on the spot color
// Sharp corners + heavy ink keylines + the hard offset "ink" shadow keep it in
// the printed-panel family. All colors come from the shared comic vocabulary.
const t = COMIC_BOOK_MOBILE

// Per-card spot colors — bright comic primaries/secondaries. White-with-ink
// outline title lettering stays legible on every one of them.
const CARD_COLORS = [
  t.hotRed, // #FF1F4B
  t.accentA, // #2FA8FF sky blue
  t.vividYellow, // #FFD400
  t.softViolet, // #7C4DFF
  t.mintGreen, // #00C853
  '#FF7A18', // pop orange
]

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Release year for the barcode — prefer the explicit releaseYear, fall back to
// parsing the YYYY-MM-DD release date. Null when neither is present.
function getReleaseYear(track: SongCardProps['track']): number | null {
  const sd = track.spotify_data
  if (!sd) return null
  if (typeof sd.releaseYear === 'number' && sd.releaseYear > 1900) return sd.releaseYear
  if (sd.releaseDate) {
    const y = parseInt(String(sd.releaseDate).slice(0, 4), 10)
    if (Number.isFinite(y) && y > 1900) return y
  }
  return null
}

export function SongCard({ track, onPress }: SongCardProps) {
  const duration = formatDuration(track.duration_ms)
  const h = hashKey(track.track_id)
  const color = CARD_COLORS[h % CARD_COLORS.length]
  const year = getReleaseYear(track)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [frameStyle, pressed ? slam(3) : null]}
    >
      {/* TOP PLATE — artist credit in the card's spot color */}
      <View style={topPlateStyle}>
        <Text style={[artistStyle, { color }]} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      {/* MIDDLE PANEL — full album art + halftone print */}
      <View style={artPanelStyle}>
        {track.art_url ? (
          <Image source={{ uri: track.art_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={[{ width: '100%', height: '100%', backgroundColor: color, alignItems: 'center', justifyContent: 'center' }]}>
            <NoteGlyph color={INK} />
          </View>
        )}
        <Halftone color={INK} opacity={0.13} dot={2} gap={5} />

        {/* Duration — the classic starburst price tag */}
        {duration ? (
          <View style={burstWrapStyle} pointerEvents="none">
            <BurstBadge size={44} fill={YELLOW} kind="burst" rotate={11}>
              <Text style={priceStyle}>{duration}</Text>
            </BurstBadge>
          </View>
        ) : null}

        {/* Release-year barcode — borderless white sticker, bottom-left corner */}
        {year ? <Barcode year={year} seed={h} /> : null}
      </View>

      {/* BOTTOM BANNER — the song title as a knocked-out comic logo, on a
          spot-color plate printed with the same Ben-Day halftone as the art. */}
      <View style={[bannerStyle, { backgroundColor: color }]}>
        <View style={bannerDotsStyle} pointerEvents="none">
          <Halftone color={INK} opacity={0.13} dot={2} gap={5} />
        </View>
        <ComicOutlineText
          fontFamily={t.fontDisplay}
          fontSize={18}
          lineHeight={18}
          outlineWidth={1.6}
          letterSpacing={0.2}
          align="center"
          numberOfLines={2}
        >
          {track.name}
        </ComicOutlineText>
      </View>
    </Pressable>
  )
}

// Deterministic bar widths (1–3px) from the track hash, so each song's barcode
// looks unique but never changes between renders.
function barcodeBars(seed: number): number[] {
  const bars: number[] = []
  let x = (seed >>> 0) || 1
  for (let i = 0; i < 13; i++) {
    x = (x * 1103515245 + 12345) >>> 0
    bars.push(1 + (x % 3))
  }
  return bars
}

// A tiny borderless barcode "sticker" — black bars on white with the release
// year printed underneath, like the UPC on a real comic's bottom corner.
function Barcode({ year, seed }: { year: number; seed: number }) {
  const bars = barcodeBars(seed)
  return (
    <View style={barcodeWrapStyle} pointerEvents="none">
      <View style={barcodeBarsRowStyle}>
        {bars.map((w, i) => (
          <View
            key={i}
            style={{ width: w, height: 11, backgroundColor: INK, marginRight: i === bars.length - 1 ? 0 : 1.3 }}
          />
        ))}
      </View>
      <Text style={barcodeYearStyle}>{year}</Text>
    </View>
  )
}

// Hand-built music note placeholder for missing artwork — pure View primitives.
function NoteGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 40, height: 40 }}>
      <View style={{ position: 'absolute', right: 11, top: 0, width: 4, height: 31, backgroundColor: color }} />
      <View style={{ position: 'absolute', right: 11, top: 0, width: 12, height: 6, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 0, bottom: 0, width: 17, height: 13, borderRadius: 999, backgroundColor: color }} />
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────
// Sharp corners (comics are printed on square-cut stock) + heavy ink keyline +
// hard offset shadow. flex column: fixed top plate, flexible art, auto banner.
const frameStyle: ViewStyle = {
  flex: 1,
  aspectRatio: 0.74,
  backgroundColor: INK,
  borderWidth: 3,
  borderColor: INK,
  borderRadius: 0,
  overflow: 'hidden',
  ...inkShadow(4),
}

const topPlateStyle: ViewStyle = {
  height: 26,
  justifyContent: 'center',
  paddingHorizontal: 8,
  backgroundColor: INK,
}

const artistStyle: TextStyle = {
  fontFamily: t.fontDisplay,
  fontSize: 12.5,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
}

const artPanelStyle: ViewStyle = {
  flex: 1,
  borderTopWidth: 3,
  borderBottomWidth: 3,
  borderColor: INK,
  backgroundColor: t.creamDark,
  overflow: 'hidden',
}

const burstWrapStyle: ViewStyle = {
  position: 'absolute',
  top: 6,
  right: 5,
}

const priceStyle: TextStyle = {
  color: INK,
  fontFamily: t.fontDisplay,
  fontSize: 11.5,
  textAlign: 'center',
}

const bannerStyle: ViewStyle = {
  paddingHorizontal: 8,
  paddingTop: 7,
  paddingBottom: 8,
  overflow: 'hidden',
}

// Halftone overlay filling the title banner, behind the title text.
const bannerDotsStyle: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
}

// Borderless white barcode sticker, bottom-left of the art well.
const barcodeWrapStyle: ViewStyle = {
  position: 'absolute',
  bottom: 4,
  left: 4,
  backgroundColor: PANEL,
  paddingHorizontal: 2.5,
  paddingTop: 2,
  paddingBottom: 1,
  alignItems: 'center',
}

const barcodeBarsRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'flex-end',
}

const barcodeYearStyle: TextStyle = {
  marginTop: 0.5,
  fontSize: 7.5,
  lineHeight: 8,
  fontWeight: '700',
  letterSpacing: 1.2,
  color: INK,
}
