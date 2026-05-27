import React from 'react'
import { View, Text, Image, Pressable } from 'react-native'
import Svg, { Path, G, Circle, Ellipse } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import type { SongCardProps } from '../../../types'

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Zen song card — a hanging shoji-paper panel:
//   • Outer panel is washi-cream paper with sumi-ink tatami binding (thick
//     dark bands with gold hairline threads) at top and bottom.
//   • A bamboo spine runs down the LEFT edge with three node rings.
//   • Album art is wrapped in an ENSO — an incomplete brush-painted circle
//     that opens at the bottom-right (the iconic zen symbol).
//   • A small sakura branch with three blossoms decorates the top-right
//     corner.
//   • Title is set in NotoSerifJP (mincho serif) for calligraphic gravitas.
// Press scales the card down 3% — no breathing or floating, cards hold a
// steady grid alignment.
export function SongCard({ track, onPress }: SongCardProps) {
  const { tokens } = useTheme()
  const duration = formatDuration(track.duration_ms)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        marginBottom: 12,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#F0E6D3',
          borderWidth: 1,
          borderColor: '#2a1f15',
          paddingTop: 14,
          paddingBottom: 14,
          paddingLeft: 22,
          paddingRight: 14,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
        }}
      >
        {/* Tatami binding — dark bands at top and bottom edges */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 5,
            backgroundColor: '#2a1f15',
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 5,
            backgroundColor: '#2a1f15',
          }}
        />
        {/* Hairline contrast threads inside the binding */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 6,
            height: 1,
            backgroundColor: '#D4B85A',
            opacity: 0.5,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 6,
            height: 1,
            backgroundColor: '#D4B85A',
            opacity: 0.5,
          }}
        />

        {/* Bamboo spine — left edge with node rings */}
        <BambooSpine />

        {/* Sakura branch in the top-right corner */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 4,
            right: -6,
            width: 70,
            height: 50,
          }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 70 50">
            <Path
              d="M 70 10 Q 55 14 40 20 Q 28 25 18 38"
              stroke="#2a1f15"
              strokeWidth={1.8}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M 40 20 Q 36 12 32 8"
              stroke="#2a1f15"
              strokeWidth={1.2}
              fill="none"
              strokeLinecap="round"
            />
            <Blossom cx={32} cy={8} size={6} />
            <Blossom cx={20} cy={32} size={5} />
            <Blossom cx={55} cy={14} size={4} />
          </Svg>
        </View>

        {/* Enso brush circle around album art */}
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
            marginTop: 4,
          }}
        >
          <EnsoFrame>
            {track.art_url ? (
              <Image
                source={{ uri: track.art_url }}
                style={{ width: '100%', height: '100%', borderRadius: 999 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#E8DBC0',
                  borderRadius: 999,
                }}
              >
                <NoteGlyph color="#2a1f15" />
              </View>
            )}
          </EnsoFrame>
        </View>

        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontWeight: '700',
            fontSize: 15,
            color: '#1a1814',
            textAlign: 'center',
            lineHeight: 19,
            letterSpacing: 0.3,
          }}
          numberOfLines={2}
        >
          {track.name}
        </Text>
        <Text
          style={{
            fontFamily: tokens.fontBody,
            fontSize: 12,
            color: '#6b5d4a',
            marginTop: 4,
            textAlign: 'center',
            letterSpacing: 0.3,
          }}
          numberOfLines={1}
        >
          {track.artist}
        </Text>
        {duration ? (
          <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            {/* Tiny vermillion sakura dot before the duration */}
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#D4442A' }} />
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontWeight: '700',
                fontSize: 11,
                color: '#D4442A',
                letterSpacing: 1,
              }}
            >
              {duration}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

// ── Bamboo spine ────────────────────────────────────────────────────────────
function BambooSpine() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 6,
        top: 12,
        bottom: 12,
        width: 8,
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#7BA05B',
          borderRadius: 2,
          borderWidth: 1,
          borderColor: '#3a4f29',
        }}
      />
      {/* Node rings — darker bands at three points along the cylinder */}
      {[0.22, 0.5, 0.78].map((p, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: `${p * 100}%`,
            left: -2,
            width: 12,
            height: 4,
            backgroundColor: '#3a4f29',
            borderRadius: 2,
          }}
        />
      ))}
    </View>
  )
}

// ── Enso brush-circle frame ─────────────────────────────────────────────────
function EnsoFrame({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: '92%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
      {/* The image clipped to circle */}
      <View
        style={{
          width: '82%',
          aspectRatio: 1,
          borderRadius: 999,
          overflow: 'hidden',
          backgroundColor: '#E8DBC0',
        }}
      >
        {children}
      </View>
      {/* Enso ink stroke — incomplete circle */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          {/* Outer brush stroke — heavy near top-left, tapers off near
              bottom-right where the enso opens. */}
          <Path
            d="M 72 12 A 44 44 0 1 0 88 28"
            stroke="#1a1814"
            strokeWidth={3.4}
            fill="none"
            strokeLinecap="round"
          />
          {/* Highlight pass for ink texture */}
          <Path
            d="M 72 12 A 44 44 0 1 0 88 28"
            stroke="#5a3f2a"
            strokeWidth={1.2}
            fill="none"
            strokeLinecap="round"
            opacity={0.45}
          />
        </Svg>
      </View>
    </View>
  )
}

// ── Sakura blossom (small) ──────────────────────────────────────────────────
function Blossom({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  return (
    <G transform={`translate(${cx} ${cy})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <G key={a} transform={`rotate(${a})`}>
          <Ellipse
            cx={0}
            cy={-size * 0.55}
            rx={size * 0.55}
            ry={size * 0.7}
            fill="#F4B6C2"
            stroke="#A85E76"
            strokeWidth={0.3}
          />
        </G>
      ))}
      <Circle cx={0} cy={0} r={size * 0.2} fill="#D4B85A" />
    </G>
  )
}

function NoteGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 28, height: 28 }}>
      <View style={{ position: 'absolute', right: 8, top: 0, width: 3, height: 22, backgroundColor: color }} />
      <View style={{ position: 'absolute', right: 8, top: 0, width: 8, height: 4, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 0, bottom: 0, width: 12, height: 9, borderRadius: 999, backgroundColor: color }} />
    </View>
  )
}
