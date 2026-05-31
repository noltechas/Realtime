import React, { useMemo } from 'react'
import {
  View,
  Text,
  Image,
  Pressable,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import Svg, { Path, G, Circle, Ellipse } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import type {
  KaraokeQueueRow,
  SingerConfig,
  ThemeTokens,
} from '@karaoke/shared'
import { useTheme } from '../../../ThemeContext'
import type { QueueRowProps } from '../../../types'

// Zen queue row — a tatami strip:
//   • Background: a long washi panel with two horizontal sumi-ink hairlines
//     (top & bottom) as tatami stitching.
//   • Left: a vermillion hanko (ink seal) showing the row number in serif
//     mincho type. The seal has a hand-carved-looking rounded square shape.
//   • Album art is wrapped in an enso (incomplete brush circle).
//   • Singer pills look like paper lanterns (chochin) — vertical oval with
//     horizontal ribbing lines and a tiny rope at top.
//   • Score uses sakura-pink for positive, faded ink for negative.
export function QueueRow({
  item,
  position,
  voted,
  guestName,
  guestId,
  onVote,
  onEdit,
}: QueueRowProps) {
  const { tokens } = useTheme()
  const score = (item.score ?? 0) + (item.bonus_points ?? 0)
  const singers = useMemo<SingerConfig[]>(
    () => (Array.isArray(item.singer_configs) ? item.singer_configs : []),
    [item.singer_configs],
  )
  const isLocked = item.locked && position === 1
  const inSong = useMemo(() => {
    const gn = (guestName || '').toLowerCase()
    return singers.some((s) => (s.name || '').toLowerCase() === gn)
  }, [singers, guestName])
  const isMine = !isLocked && !!guestId && item.added_by_guest_id === guestId
  const isHidden = !!item.is_hidden

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        paddingLeft: 8,
        backgroundColor: '#F0E6D3',
        borderTopWidth: 4,
        borderBottomWidth: 4,
        borderTopColor: '#2a1f15',
        borderBottomColor: '#2a1f15',
        marginBottom: 10,
      }}
    >
      {/* Hairline gold thread inside the binding */}
      <View style={hairTopStyle} />
      <View style={hairBotStyle} />

      <HankoSeal position={position} />

      <View>
        {isHidden ? (
          <EnsoArtFrame>
            <View style={hiddenArtInnerStyle()}>
              <Text style={hiddenArtGlyphStyle(tokens)}>?</Text>
            </View>
          </EnsoArtFrame>
        ) : item.track_art_url ? (
          <EnsoArtFrame>
            <Image source={{ uri: item.track_art_url }} style={{ width: '100%', height: '100%', borderRadius: 999 }} />
          </EnsoArtFrame>
        ) : (
          <EnsoArtFrame>
            <View style={{ flex: 1, backgroundColor: '#E8DBC0', borderRadius: 999 }} />
          </EnsoArtFrame>
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
              <LanternPill key={`${item.id}-${i}-${singer.name}`} singer={singer} />
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

// ── Hanko ink seal ─────────────────────────────────────────────────────────
// Square red stamp with the position number. Hand-carved rounded-square outer
// border (suggesting wood/stone seal cut by chisel), with rough edges and a
// kintsugi gold flick to suggest a crack repair.
function HankoSeal({ position }: { position: number }) {
  const { tokens } = useTheme()
  return (
    <View
      style={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#D4442A',
        borderWidth: 1.5,
        borderColor: '#7A2616',
        borderRadius: 4,
        // Slight rotation makes it feel hand-stamped
        transform: [{ rotate: '-2deg' }],
        shadowColor: '#D4442A',
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 0.4,
        shadowRadius: 2,
      }}
    >
      {/* Inner double-border (classic hanko frame) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 3,
          left: 3,
          right: 3,
          bottom: 3,
          borderWidth: 1,
          borderColor: '#F0E6D3',
          borderRadius: 2,
          opacity: 0.5,
        }}
      />
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '800',
          fontSize: 22,
          lineHeight: 26,
          color: '#F0E6D3',
          textAlign: 'center',
        }}
      >
        {position}
      </Text>
      {/* A tiny gold kintsugi chip in one corner */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          width: 6,
          height: 6,
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 6 6">
          <Path d="M 0 0 L 6 1 L 5 3 L 6 6 L 3 5 L 0 6 L 1 3 Z" fill="#D4B85A" opacity={0.7} />
        </Svg>
      </View>
    </View>
  )
}

// ── Enso album-art frame ───────────────────────────────────────────────────
function EnsoArtFrame({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', width: 56, height: 56 }}>
        <Svg width={56} height={56} viewBox="0 0 56 56">
          <Path
            d="M 40 7 A 24 24 0 1 0 49 16"
            stroke="#1a1814"
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </View>
    </View>
  )
}

function LanternPill({ singer }: { singer: SingerConfig }) {
  const { tokens } = useTheme()
  const initial = (singer.name || '?').charAt(0).toUpperCase()
  const pillColor = singer.color || tokens.vividYellow

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
        backgroundColor: '#F0E6D3',
        borderWidth: 1,
        borderColor: '#2a1f15',
        borderRadius: 12,
      }}
    >
      {singer.profilePicture ? (
        <Image
          source={{ uri: singer.profilePicture }}
          style={{ width: 16, height: 16, borderRadius: 8 }}
        />
      ) : (
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: pillColor, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#fff' }}>{initial}</Text>
        </View>
      )}
      <Text style={lanternNameStyle(tokens)} numberOfLines={1}>
        {singer.name || `Singer ${initial}`}
      </Text>
    </View>
  )
}

function EditButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Edit song"
      style={({ pressed }) => [editBtnStyle(), pressed ? { opacity: 0.85 } : null]}
    >
      <Ionicons name="create-outline" size={22} color="#D4442A" />
    </Pressable>
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
  row: KaraokeQueueRow
  score: number
  voted?: 1 | -1
  isLocked: boolean
  inSong: boolean
  onVote: (row: KaraokeQueueRow, value: 1 | -1) => void
}) {
  const { tokens } = useTheme()
  if (isLocked) {
    return (
      <View style={lockBadgeStyle()}>
        <Ionicons name="lock-closed" size={16} color="#F0E6D3" />
        <Text style={lockLabelStyle(tokens)}>{'Next\nLocked'}</Text>
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
        <View style={votedPillStyle()}>
          {/* Sakura petal in place of a checkmark */}
          <SmallSakura size={10} />
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
            voteBtnStyle('up'),
            pressed ? { opacity: 0.85 } : null,
          ]}
          accessibilityLabel="Upvote"
        >
          <Ionicons name="chevron-up" size={16} color="#D4442A" />
        </Pressable>
        <Pressable
          onPress={() => onVote(row, -1)}
          style={({ pressed }) => [
            voteBtnStyle('down'),
            pressed ? { opacity: 0.85 } : null,
          ]}
          accessibilityLabel="Downvote"
        >
          <Ionicons name="chevron-down" size={16} color="#6b5d4a" />
        </Pressable>
      </View>
    </View>
  )
}

function SmallSakura({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <G transform="translate(7 7)">
        {[0, 72, 144, 216, 288].map((a) => (
          <G key={a} transform={`rotate(${a})`}>
            <Ellipse
              cx={0}
              cy={-3.5}
              rx={2.2}
              ry={2.8}
              fill="#D4442A"
              stroke="#7A2616"
              strokeWidth={0.3}
            />
          </G>
        ))}
        <Circle cx={0} cy={0} r={1.3} fill="#D4B85A" />
      </G>
    </Svg>
  )
}

function ScoreLabel({ score }: { score: number }) {
  const { tokens } = useTheme()
  const positive = score > 0
  const color = positive ? '#D4442A' : score < 0 ? '#A89888' : '#1a1814'
  return (
    <Text
      style={[
        scoreStyle(tokens),
        { color },
      ]}
    >
      {score}
    </Text>
  )
}

// ─── styles ─────────────────────────────────────────────────────────────────
const hairTopStyle: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 5,
  height: 1,
  backgroundColor: '#D4B85A',
  opacity: 0.55,
}
const hairBotStyle: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 5,
  height: 1,
  backgroundColor: '#D4B85A',
  opacity: 0.55,
}

function hiddenArtInnerStyle(): ViewStyle {
  return {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8DBC0',
    borderRadius: 999,
  }
}
function hiddenArtGlyphStyle(t: ThemeTokens): TextStyle {
  return {
    color: '#D4442A',
    fontFamily: t.fontDisplay,
    fontSize: 22,
    fontWeight: '900',
  }
}
function titleStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '700',
    fontSize: 15,
    color: '#1a1814',
    letterSpacing: 0.2,
  }
}
function artistStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontBody,
    fontSize: 12,
    color: '#6b5d4a',
    marginTop: 1,
  }
}
const singerPillsStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 6,
}
function lanternNameStyle(t: ThemeTokens): TextStyle {
  return {
    color: '#1a1814',
    fontFamily: t.fontDisplay,
    fontWeight: '700',
    fontSize: 11,
  }
}
const voteColStyle: ViewStyle = {
  // Row layout — score sits to the LEFT of the stacked up/down buttons,
  // matching the visual the other themes use. Previously this was a column
  // and the score landed directly on top of the buttons.
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginLeft: 4,
  alignSelf: 'center',
}
function scoreStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '900',
    fontSize: 16,
    minWidth: 20,
    textAlign: 'center',
    lineHeight: 22,
  }
}
const voteButtonsStyle: ViewStyle = {
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
}
function voteBtnStyle(dir: 'up' | 'down'): ViewStyle {
  return {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: dir === 'up' ? '#D4442A' : '#2a1f15',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dir === 'up' ? '#FAEBE0' : '#E8DBC0',
  }
}
function votedPillStyle(): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FAEBE0',
    borderWidth: 1,
    borderColor: '#D4442A',
    borderRadius: 10,
  }
}
function votedPillLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: '#D4442A',
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  }
}
function lockBadgeStyle(): ViewStyle {
  return {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#D4442A',
    borderWidth: 1,
    borderColor: '#7A2616',
    borderRadius: 4,
    marginLeft: 4,
    transform: [{ rotate: '-2deg' }],
  }
}
function lockLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: '#F0E6D3',
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  }
}
function editBtnStyle(): ViewStyle {
  return {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#D4442A',
    backgroundColor: '#FAEBE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    alignSelf: 'center',
  }
}
