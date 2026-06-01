import React, { useMemo } from 'react'
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SingerConfig, ThemeTokens } from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import { hexToRgba } from '../../../helpers'
import type { QueueRowProps } from '../../../types'
import { CRTOverlay, GlitchBars, useGlitch, jitterStyle } from './Crt'

// Cyberpunk queue row — void-black panel with a 1px translucent neon border
// and a soft glow shadow, sharp corners throughout. Singer pills, vote
// buttons, locked badges, and the "edit my song" affordance all read as
// terminal-HUD widgets: monospace caps, neon accents on dark fills.
export function CyberpunkQueueRow({
  item,
  position,
  voted,
  guestName,
  guestId,
  guests,
  onVote,
  onEdit,
}: QueueRowProps) {
  const { tokens } = useTheme()
  const glitch = useGlitch({ minMs: 8000, maxMs: 20000 })
  const score = (item.score ?? 0) + (item.bonus_points ?? 0)
  const singers = useMemo<SingerConfig[]>(
    () =>
      (Array.isArray(item.singer_configs) ? item.singer_configs : []).map(
        (sc) => {
          // Resolve the singer's LIVE name + avatar from the canonical guest
          // record (so profile edits propagate). Name-only singers pass through.
          const g = sc.guestId ? guests.get(sc.guestId) : undefined
          return g
            ? { ...sc, name: g.name, profilePicture: g.profile_picture ?? undefined }
            : sc
        },
      ),
    [item.singer_configs, guests],
  )
  const isLocked = item.locked && position === 1
  const inSong = useMemo(() => {
    if (guestId && singers.some((s) => s.guestId === guestId)) return true
    const gn = (guestName || '').toLowerCase()
    return !!gn && singers.some((s) => (s.name || '').toLowerCase() === gn)
  }, [singers, guestName, guestId])
  const isMine = !isLocked && !!guestId && item.added_by_guest_id === guestId
  const isHidden = !!item.is_hidden

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: tokens.white,
    borderWidth: tokens.cardBorderWidth,
    borderColor: tokens.dimBorder,
    borderRadius: 0,
    shadowColor: tokens.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
  }

  return (
    <View style={rowStyle}>
      <Text style={positionStyle(tokens)}>{position}</Text>
      <View>
        {isHidden ? (
          <View style={hiddenArtStyle(tokens)}>
            <Text style={hiddenArtGlyphStyle(tokens)}>?</Text>
          </View>
        ) : (
          <Animated.View style={[artWellStyle(tokens), jitterStyle(glitch, 2)]}>
            {item.track_art_url ? (
              <Image
                source={{ uri: item.track_art_url }}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <View style={{ flex: 1, backgroundColor: tokens.creamDark }} />
            )}
            <CRTOverlay coverage={64} snowCount={16} seed={seedFromId(item.id)} lineStep={3} tint={tokens.accentA} />
            <GlitchBars g={glitch} />
          </Animated.View>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={titleStyle(tokens)} numberOfLines={1}>
          {isHidden ? 'HIDDEN SONG' : item.track_name}
        </Text>
        {isHidden ? null : (
          <Text style={artistStyle(tokens)} numberOfLines={1}>
            {item.track_artist}
          </Text>
        )}
        {singers.length > 0 ? (
          <View style={singerPillsStyle}>
            {singers.map((singer, i) => (
              <SingerPill key={`${item.id}-${i}-${singer.name}`} singer={singer} />
            ))}
          </View>
        ) : null}
      </View>
      <View>
        {isMine ? (
          <EditButton onPress={() => onEdit(item)} />
        ) : (
          <VoteColumn
            row={item}
            score={score}
            voted={voted}
            isLocked={isLocked}
            inSong={inSong}
            onVote={onVote}
          />
        )}
      </View>
    </View>
  )
}

function EditButton({ onPress }: { onPress: () => void }) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Edit song"
      style={({ pressed }) => [
        editBtnStyle(tokens),
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      <Ionicons name="create-outline" size={22} color={tokens.black} />
    </Pressable>
  )
}

function SingerPill({ singer }: { singer: SingerConfig }) {
  const { tokens } = useTheme()
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  return (
    <View style={singerPillStyle(tokens)}>
      <View style={[singerDotStyle(), { backgroundColor: singer.color || tokens.vividYellow }]}>
        {singer.profilePicture ? (
          <Image
            source={{ uri: singer.profilePicture }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text style={singerInitialStyle(tokens)}>{initial}</Text>
        )}
      </View>
      <Text style={singerNameStyle(tokens)} numberOfLines={1}>
        {singer.name || 'Singer'}
      </Text>
    </View>
  )
}

function VoteColumn({
  row,
  score,
  voted,
  isLocked,
  inSong,
  onVote,
}: {
  row: QueueRowProps['item']
  score: number
  voted?: 1 | -1
  isLocked: boolean
  inSong: boolean
  onVote: (row: QueueRowProps['item'], value: 1 | -1) => void
}) {
  const { tokens } = useTheme()
  if (isLocked) {
    return (
      <View style={lockBadgeStyle(tokens)}>
        <Ionicons name="lock-closed" size={18} color={tokens.black} />
        <Text style={lockLabelStyle(tokens)}>Next Up{'\n'}Locked</Text>
      </View>
    )
  }

  if (inSong) {
    if (score === 0) return null
    return (
      <View style={voteColStyle}>
        <ScoreLabel score={score} />
      </View>
    )
  }

  if (voted) {
    return (
      <View style={voteColStyle}>
        {score !== 0 ? <ScoreLabel score={score} /> : null}
        <View style={votedPillStyle(tokens)}>
          <Ionicons name="checkmark" size={11} color={tokens.black} />
          <Text style={votedPillLabelStyle(tokens)}>
            {voted > 0 ? 'Voted Up' : 'Voted Down'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={voteColStyle}>
      {score !== 0 ? <ScoreLabel score={score} /> : null}
      <View style={voteButtonsStyle}>
        <Pressable
          onPress={() => onVote(row, 1)}
          style={({ pressed }) => [
            voteBtnStyle(tokens, 'up'),
            pressed ? { opacity: 0.85 } : null,
          ]}
          accessibilityLabel="Upvote"
        >
          <Ionicons name="chevron-up" size={18} color={tokens.black} />
        </Pressable>
        <Pressable
          onPress={() => onVote(row, -1)}
          style={({ pressed }) => [
            voteBtnStyle(tokens, 'down'),
            pressed ? { opacity: 0.85 } : null,
          ]}
          accessibilityLabel="Downvote"
        >
          <Ionicons name="chevron-down" size={18} color={tokens.black} />
        </Pressable>
      </View>
    </View>
  )
}

function ScoreLabel({ score }: { score: number }) {
  const { tokens } = useTheme()
  const color = score > 0 ? tokens.mintGreen : score < 0 ? tokens.hotRed : tokens.black
  return <Text style={[scoreStyle(tokens), { color }]}>{score}</Text>
}

// ── per-element style builders (cyberpunk-flavored, no theme branching) ────

function tint(t: ThemeTokens, opacity: number): string {
  return hexToRgba(t.accentA, opacity) ?? `rgba(255,255,255,${opacity})`
}

function positionStyle(t: ThemeTokens): TextStyle {
  return {
    // Glitch (body) face — SD Glitch display has no digit glyphs.
    fontFamily: t.fontBody,
    fontWeight: '800',
    fontSize: 18,
    color: t.faint,
    minWidth: 22,
    textAlign: 'center',
  }
}
// Clipped 48px screen well for the queue thumbnail — holds the album art plus
// the CRT/glitch overlays. overflow:'hidden' so scanlines + tear bars stay
// inside the frame.
function artWellStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 48,
    height: 48,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: t.dimBorder,
    backgroundColor: t.creamDark,
    overflow: 'hidden',
  }
}
// Stable per-row seed so each thumbnail's TV-snow differs but is consistent.
function seedFromId(id: string | undefined): number {
  let h = 2166136261
  const s = id || 'q'
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) || 1
}
function hiddenArtStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 48,
    height: 48,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: t.accentA,
    backgroundColor: t.appBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: t.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  }
}
function hiddenArtGlyphStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.accentA,
    // Glitch (body) face — SD Glitch display has no '?' glyph.
    fontFamily: t.fontBody,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  }
}
function titleStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    // Bumped vs other themes — SD Glitch's short cap-height reads small.
    fontSize: 16,
    color: t.black,
    // SD Glitch is uppercase-only; uppercase the title so its letters render
    // in the display face (matching the song card) instead of falling back.
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  }
}
function artistStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontBody,
    fontWeight: '500',
    fontSize: 12,
    color: t.muted,
    marginTop: 1,
  }
}
const singerPillsStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 8,
}
function singerPillStyle(t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingLeft: 3,
    paddingVertical: 2,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: t.dimBorder,
    borderRadius: 0,
  }
}
function singerDotStyle(): ViewStyle {
  return {
    width: 16,
    height: 16,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }
}
function singerInitialStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.appBg,
    fontWeight: '800',
    fontSize: 10,
  }
}
function singerNameStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.black,
    // Singer names are free-text mixed case — use the full-coverage Glitch
    // body face so they stay legible (SD Glitch has no lowercase glyphs).
    fontFamily: t.fontBody,
    fontWeight: '700',
    fontSize: 11,
  }
}
const voteColStyle: ViewStyle = {
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  marginLeft: 4,
  alignSelf: 'center',
}
function scoreStyle(t: ThemeTokens): TextStyle {
  return {
    // Glitch (body) face — SD Glitch display has no digits or '-' glyph.
    fontFamily: t.fontBody,
    fontWeight: '900',
    fontSize: 16,
    minWidth: 28,
    textAlign: 'center',
    lineHeight: 18,
  }
}
const voteButtonsStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
}
function voteBtnStyle(t: ThemeTokens, dir: 'up' | 'down'): ViewStyle {
  const bg = dir === 'up' ? tint(t, 0.18) : 'rgba(255,77,77,0.18)'
  return {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: dir === 'up' ? t.accentA : t.hotRed,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bg,
    shadowColor: t.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  }
}
function votedPillStyle(t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: tint(t, 0.18),
    borderWidth: 1,
    borderColor: t.accentA,
    borderRadius: 0,
    shadowColor: t.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  }
}
function votedPillLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.black,
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  }
}
function lockBadgeStyle(t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,204,0,0.16)',
    borderWidth: 1,
    borderColor: t.vividYellow,
    borderRadius: 0,
    marginLeft: 4,
    shadowColor: t.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  }
}
function lockLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.black,
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  }
}
function editBtnStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 40,
    height: 40,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: t.accentA,
    backgroundColor: tint(t, 0.16),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    alignSelf: 'center',
    shadowColor: t.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  }
}
