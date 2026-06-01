import React from 'react'
import { View, Text, Pressable, Image, type ViewStyle, type TextStyle } from 'react-native'
import Svg, {
  Path,
  Circle,
  Ellipse,
  Line,
  Rect,
  Defs,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg'
import { HudBrackets } from './SpaceWizardChrome'
import { BrassFrame } from './SteampunkWizardChrome'
import { NeonFrame } from './RetrowaveWizardChrome'
import { Gear } from '../../theme/themes/steampunk/Gear'

// The deep-sea theme's actual bubble PNG (same asset its backdrop + tab bar
// use) — rendered un-tinted so the 3D highlight reads.
const bubbleImg = require('../../../assets/bubble.png')

// ─── Stage-theme picker cards ────────────────────────────────────────────────
// The wizard's final step lets a guest pick which theme their song shows in on
// the big screen. Each card here is a *self-contained miniature* of the theme
// it represents — its colors, fonts, border treatment and a small emblem are
// all HARD-CODED to that theme. Crucially, none of these read the active
// session theme, so the "Cyberpunk" card looks exactly the same whether you're
// browsing in Zen, Urban, or anything else.
//
// Shape: a short, wide "nameplate" — much wider than tall (two per row) — with
// the label as the focus and a compact thematic emblem. Every card has an
// obvious unselected → selected transition (corner check badge + inset accent
// ring + intensified glow).

const CARD_HEIGHT = 56

// ── Shared selected-state corner badge ──────────────────────────────────────
function CheckMark({ color, size = 11 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Path
        d="M2.5 7.5 L5.5 10.5 L11.5 4"
        stroke={color}
        strokeWidth={2.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function SelectBadge({
  bg,
  fg,
  ring,
  transform,
}: {
  bg: string
  fg: string
  ring: string
  transform?: any[]
}) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: -8, right: -8, transform }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: bg,
          borderWidth: 2,
          borderColor: ring,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: bg,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.95,
          shadowRadius: 6,
        }}
      >
        <CheckMark color={fg} />
      </View>
    </View>
  )
}

// ── BaseCard ─────────────────────────────────────────────────────────────────
// Handles the parts every card shares: flex sizing, the outer shadow/glow layer
// (kept separate from the clipped inner so iOS doesn't drop the shadow when
// `overflow: 'hidden'` is set), press feedback, the selected inset accent ring,
// and the corner badge. Each theme supplies its own bg / border / emblem.
interface BaseCardProps {
  selected: boolean
  onPress: () => void
  bg: string
  radius?: number
  border?: { width: number; color: string }
  /** Extra inner-View styles — per-corner radii, per-side borders (zen tatami). */
  innerStyle?: ViewStyle
  /** Neon glow shadow color (dark themes). */
  glowColor?: string
  glowRadius?: number
  /** Hard / soft drop shadow (neo-brutal hard, sketch soft). */
  offset?: { w: number; h: number; color: string; radius?: number; opacity?: number }
  /** Outer transform — used by urban's parallelogram skew. */
  transform?: any[]
  /** Inset-ring color when selected. */
  accent: string
  badge: { bg: string; fg: string; ring: string }
  /** Counter-transform applied to the badge (urban un-skew). */
  badgeTransform?: any[]
  children?: React.ReactNode
}

function BaseCard({
  selected,
  onPress,
  bg,
  radius = 8,
  border,
  innerStyle,
  glowColor,
  glowRadius = 9,
  offset,
  transform,
  accent,
  badge,
  badgeTransform,
  children,
}: BaseCardProps) {
  const shadow: ViewStyle | null = offset
    ? {
        shadowColor: offset.color,
        shadowOffset: { width: offset.w, height: offset.h },
        shadowOpacity: offset.opacity ?? 1,
        shadowRadius: offset.radius ?? 0,
      }
    : glowColor
      ? {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: selected ? 0.95 : 0.4,
          shadowRadius: selected ? glowRadius * 1.7 : glowRadius,
        }
      : null

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexBasis: '47%',
          flexGrow: 1,
          minWidth: '47%',
          height: CARD_HEIGHT,
          borderRadius: radius,
          backgroundColor: bg,
        },
        shadow,
        transform ? { transform } : null,
        pressed ? { opacity: 0.88 } : null,
      ]}
    >
      <View
        style={[
          {
            flex: 1,
            borderRadius: radius,
            overflow: 'hidden',
            justifyContent: 'center',
            paddingHorizontal: 13,
            paddingVertical: 6,
            backgroundColor: bg,
          },
          border ? { borderWidth: border.width, borderColor: border.color } : null,
          innerStyle,
        ]}
      >
        {children}
      </View>
      {selected ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            right: 3,
            bottom: 3,
            borderRadius: Math.max(0, radius - 2),
            borderWidth: 2,
            borderColor: accent,
          }}
        />
      ) : null}
      {selected ? <SelectBadge {...badge} transform={badgeTransform} /> : null}
    </Pressable>
  )
}

// ── Shared label ─────────────────────────────────────────────────────────────
function CardLabel({
  text,
  color,
  font,
  style,
}: {
  text: string
  color: string
  font: string
  style?: TextStyle
}) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      style={[{ color, fontFamily: font, fontSize: 14, flexShrink: 1 }, style]}
    >
      {text}
    </Text>
  )
}

// Compact horizontal layout: label on the left (grows), emblem pinned right.
function Row({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{children}</View>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Per-theme cards
// ════════════════════════════════════════════════════════════════════════════

// 1. Neo-Brutal — cream paper, hard black border, crisp offset shadow, a bold
//    primary-color stripe down the left edge. Selected deepens the shadow.
function NeoBrutalCard({ label, selected, onPress }: CardProps) {
  return (
    <BaseCard
      selected={selected}
      onPress={onPress}
      bg="#FFF8EE"
      radius={8}
      border={{ width: 3, color: '#1A1A1A' }}
      offset={{ w: selected ? 5 : 4, h: selected ? 5 : 4, color: '#1A1A1A' }}
      accent="#FFD60A"
      badge={{ bg: '#FFD60A', fg: '#1A1A1A', ring: '#1A1A1A' }}
      innerStyle={{ paddingLeft: 18 }}
    >
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, borderRightWidth: 2, borderRightColor: '#1A1A1A' }}
      >
        {['#B388FF', '#FFD60A', '#00E676'].map((c) => (
          <View key={c} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </View>
      <CardLabel
        text={label}
        color="#1A1A1A"
        font="System"
        style={{ fontWeight: '900', letterSpacing: -0.3, fontSize: 15 }}
      />
    </BaseCard>
  )
}

// 2. Cyberpunk — void panel, 1px neon-green edge, faint CRT scanlines, monospace
//    caps label with a green glow, and a tiny green/magenta equalizer.
function CyberpunkCard({ label, selected, onPress }: CardProps) {
  return (
    <BaseCard
      selected={selected}
      onPress={onPress}
      bg="#0a0a1a"
      radius={0}
      border={{ width: 1, color: selected ? '#00ff88' : 'rgba(0,255,136,0.45)' }}
      glowColor="#00ff88"
      accent="#00ff88"
      badge={{ bg: '#ff00ff', fg: '#0a0a1a', ring: '#00ff88' }}
    >
      <ScanLines color="rgba(0,255,136,0.10)" />
      <Row>
        <CardLabel
          text={label}
          color="#00ff88"
          font="SDGlitch"
          style={{
            flex: 1,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            // SD Glitch reads smaller than a normal face at the same px, so the
            // nameplate label is bumped up to match the other theme cards.
            fontSize: 17,
            textShadowColor: 'rgba(0,255,136,0.85)',
            textShadowRadius: 6,
            textShadowOffset: { width: 0, height: 0 },
          }}
        />
        <EqualizerBars
          heights={[7, 16, 10, 20]}
          colors={['#00ff88', '#ff00ff', '#00ffff', '#00ff88']}
        />
      </Row>
    </BaseCard>
  )
}

// 3. Sketch — warm paper, dashed blue ballpoint border, a tiny tilt and a soft
//    paper shadow, with a doodled star emblem.
function SketchCard({ label, selected, onPress }: CardProps) {
  return (
    <BaseCard
      selected={selected}
      onPress={onPress}
      bg="#fdfbf7"
      radius={12}
      offset={{ w: 0, h: 3, color: '#000', radius: 5, opacity: 0.16 }}
      transform={[{ rotate: '-1.4deg' }]}
      accent="#2d5da1"
      badge={{ bg: '#2d5da1', fg: '#fdfbf7', ring: '#fdfbf7' }}
      innerStyle={{
        borderWidth: 2,
        borderColor: '#2d5da1',
        borderStyle: 'dashed',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 6,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 16,
      }}
    >
      <Row>
        <CardLabel text={label} color="#2d5da1" font="PencilTrace" style={{ flex: 1, fontSize: 18 }} />
        <SketchStar />
      </Row>
    </BaseCard>
  )
}

// 4. Urban — pitch-black parallelogram (skewX), heavy solid lime edge on the
//    right + bottom, Oswald caps, lime slashes. Label + badge counter-skew.
function UrbanCard({ label, selected, onPress }: CardProps) {
  return (
    <BaseCard
      selected={selected}
      onPress={onPress}
      bg="#0a0a0a"
      radius={0}
      transform={[{ skewX: '-8deg' }]}
      badgeTransform={[{ skewX: '8deg' }]}
      accent="#D4FF00"
      badge={{ bg: '#D4FF00', fg: '#0a0a0a', ring: '#0a0a0a' }}
      innerStyle={{
        borderTopWidth: 1.5,
        borderLeftWidth: 1.5,
        borderTopColor: 'rgba(255,255,255,0.12)',
        borderLeftColor: 'rgba(255,255,255,0.12)',
        borderRightWidth: selected ? 6 : 4,
        borderBottomWidth: selected ? 6 : 4,
        borderRightColor: '#D4FF00',
        borderBottomColor: '#D4FF00',
      }}
    >
      <Row>
        <View style={{ flex: 1, transform: [{ skewX: '8deg' }] }}>
          <CardLabel
            text={label}
            color="#D4FF00"
            font="PermanentMarker_400Regular"
            style={{ textTransform: 'uppercase', letterSpacing: 2, fontSize: 15 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: 4,
                height: 20,
                backgroundColor: '#D4FF00',
                opacity: 0.9 - i * 0.25,
                transform: [{ skewX: '-18deg' }],
              }}
            />
          ))}
        </View>
      </Row>
    </BaseCard>
  )
}

// 5. Deep Sea — abyssal navy, soft cyan rim + glow, a cluster of bubbles, and a
//    LuckiestGuy cyan label with glow.
function DeepSeaCard({ label, selected, onPress }: CardProps) {
  return (
    <BaseCard
      selected={selected}
      onPress={onPress}
      bg="#040918"
      radius={12}
      border={{ width: 1, color: selected ? '#00ffc8' : 'rgba(0,255,200,0.4)' }}
      glowColor="#00ffc8"
      glowRadius={11}
      accent="#00ffc8"
      badge={{ bg: '#00ffc8', fg: '#040918', ring: '#040918' }}
    >
      <Row>
        <CardLabel
          text={label}
          color="#00ffc8"
          font="LuckiestGuy_400Regular"
          style={{
            flex: 1,
            fontSize: 15,
            letterSpacing: 0.5,
            textShadowColor: 'rgba(0,255,200,0.6)',
            textShadowRadius: 8,
            textShadowOffset: { width: 0, height: 0 },
          }}
        />
        <BubbleCluster />
      </Row>
    </BaseCard>
  )
}

// 6. Psychedelic — deep-purple haze, fat hot-pink rim with a big halo, a molten
//    lava orb, groovy Remalos label.
function PsychedelicCard({ label, selected, onPress }: CardProps) {
  return (
    <BaseCard
      selected={selected}
      onPress={onPress}
      bg="#1a0a2e"
      radius={16}
      border={{ width: 2, color: selected ? '#ff2d95' : 'rgba(255,45,149,0.65)' }}
      glowColor="#ff2d95"
      glowRadius={14}
      accent="#b6ff2d"
      badge={{ bg: '#ff2d95', fg: '#1a0a2e', ring: '#b6ff2d' }}
    >
      <Row>
        <CardLabel
          text={label}
          color="#ff2d95"
          font="Remalos"
          style={{
            flex: 1,
            fontSize: 18,
            textShadowColor: 'rgba(255,45,149,0.6)',
            textShadowRadius: 10,
            textShadowOffset: { width: 0, height: 0 },
          }}
        />
        <LavaOrb size={30} from="#ff8c2d" to="#ff2d95" />
      </Row>
    </BaseCard>
  )
}

// 7. Zen — dark stone tatami panel with vermillion top/bottom bands, gold
//    hairline sides, a gold ensō brushstroke, calligraphic serif label.
function ZenCard({ label, selected, onPress }: CardProps) {
  return (
    <BaseCard
      selected={selected}
      onPress={onPress}
      bg="#231f1a"
      radius={0}
      glowColor="#D4B85A"
      glowRadius={8}
      accent="#D4B85A"
      badge={{ bg: '#D4442A', fg: '#F0E6D3', ring: '#D4B85A' }}
      innerStyle={{
        borderTopWidth: 4,
        borderBottomWidth: 4,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopColor: '#D4442A',
        borderBottomColor: '#D4442A',
        borderLeftColor: 'rgba(212,184,90,0.45)',
        borderRightColor: 'rgba(212,184,90,0.45)',
      }}
    >
      <Row>
        <CardLabel
          text={label}
          color="#D4B85A"
          font="NotoSerifJP_700Bold"
          style={{ flex: 1, fontSize: 15, letterSpacing: 1 }}
        />
        <CherryBlossom />
      </Row>
    </BaseCard>
  )
}

// 8. Space — void HUD console: magenta/cyan corner brackets, a faint star
//    field, Orbitron caps label with a magenta plasma glow.
function SpaceCard({ label, selected, onPress }: CardProps) {
  return (
    <BaseCard
      selected={selected}
      onPress={onPress}
      bg="#08080F"
      radius={8}
      border={{ width: 1, color: selected ? '#E040FB' : 'rgba(224,64,251,0.4)' }}
      glowColor="#E040FB"
      glowRadius={11}
      accent="#E040FB"
      badge={{ bg: '#E040FB', fg: '#08080F', ring: '#40E0D0' }}
    >
      <StarField />
      <HudBrackets size={9} thickness={1.3} inset={4} topColor="#E040FB" bottomColor="#40E0D0" />
      <Row>
        <CardLabel
          text={label}
          color="#E040FB"
          font="Orbitron_700Bold"
          style={{
            flex: 1,
            fontSize: 12,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            textShadowColor: 'rgba(224,64,251,0.7)',
            textShadowRadius: 8,
            textShadowOffset: { width: 0, height: 0 },
          }}
        />
        <SaturnPlanet />
      </Row>
    </BaseCard>
  )
}

// 9. Steampunk — riveted brass plate over dark mahogany with filigree edges, a
//    half-clipped turning cog, engraved Cinzel amber label.
function SteampunkCard({ label, selected, onPress }: CardProps) {
  return (
    <BaseCard
      selected={selected}
      onPress={onPress}
      bg="#2A1A0E"
      radius={8}
      border={{ width: 2, color: '#B8762D' }}
      glowColor="#E8A93B"
      glowRadius={10}
      accent="#E8A93B"
      badge={{ bg: '#E8A93B', fg: '#2A1A0E', ring: '#B8762D' }}
    >
      <BrassFrame size={7} rivetColor="#B8762D" filigree={false} />
      <Row>
        <CardLabel
          text={label}
          color="#E8A93B"
          font="Cinzel_700Bold"
          style={{
            flex: 1,
            fontSize: 12,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            textShadowColor: 'rgba(232,169,59,0.6)',
            textShadowRadius: 7,
            textShadowOffset: { width: 0, height: 0 },
          }}
        />
        <Gear size={28} teeth={10} bodyColor="#B8762D" edgeColor="#7A4D1A" hubColor="#5C3A12" highlightColor="#E8C078" />
      </Row>
    </BaseCard>
  )
}

// 10. Retrowave — deep-indigo arcade plate, neon corner triangles, a banded
//     Outrun sun emblem, Audiowide caps in hot pink.
function RetrowaveCard({ label, selected, onPress }: CardProps) {
  return (
    <BaseCard
      selected={selected}
      onPress={onPress}
      bg="#1A0A3A"
      radius={0}
      border={{ width: 1.5, color: selected ? '#FF2D95' : 'rgba(255,45,149,0.55)' }}
      glowColor="#FF2D95"
      glowRadius={12}
      accent="#FF2D95"
      badge={{ bg: '#FF2D95', fg: '#1A0A3A', ring: '#00F0FF' }}
    >
      <NeonFrame size={8} inset={3} topColor="#FF2D95" bottomColor="#00F0FF" />
      <Row>
        <CardLabel
          text={label}
          color="#FF2D95"
          font="Audiowide_400Regular"
          style={{
            flex: 1,
            fontSize: 12,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            textShadowColor: 'rgba(255,45,149,0.8)',
            textShadowRadius: 8,
            textShadowOffset: { width: 0, height: 0 },
          }}
        />
        <RetroSun />
      </Row>
    </BaseCard>
  )
}

// ── Decorative primitives ────────────────────────────────────────────────────

function ScanLines({ color }: { color: string }) {
  const lines = Array.from({ length: 9 }, (_, i) => i * 7 + 2)
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 56" preserveAspectRatio="none">
        {lines.map((y) => (
          <Line key={y} x1={0} y1={y} x2={100} y2={y} stroke={color} strokeWidth={1} />
        ))}
      </Svg>
    </View>
  )
}

function EqualizerBars({ heights, colors }: { heights: number[]; colors: string[] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 22 }}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: 3.5,
            height: h,
            backgroundColor: colors[i % colors.length],
            shadowColor: colors[i % colors.length],
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 3,
          }}
        />
      ))}
    </View>
  )
}

function SketchStar() {
  return (
    <Svg width={22} height={22} viewBox="0 0 26 26">
      <Path
        d="M13 2 L16 9.5 L24 10 L18 15 L20 23 L13 18.5 L6 23 L8 15 L2 10 L10 9.5 Z"
        stroke="#2d5da1"
        strokeWidth={1.8}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Deep-sea bubbles — three of the theme's real bubble PNGs clustered, sized so
// the largest leads the rise and two smaller ones trail behind it.
function BubbleCluster() {
  return (
    <View style={{ width: 34, height: 32 }}>
      <Image
        source={bubbleImg}
        resizeMode="contain"
        style={{ position: 'absolute', right: 1, top: 0, width: 21, height: 21 }}
      />
      <Image
        source={bubbleImg}
        resizeMode="contain"
        style={{ position: 'absolute', left: 0, top: 9, width: 14, height: 14 }}
      />
      <Image
        source={bubbleImg}
        resizeMode="contain"
        style={{ position: 'absolute', right: 5, bottom: 0, width: 10, height: 10 }}
      />
    </View>
  )
}

function LavaOrb({ size, from, to }: { size: number; from: string; to: string }) {
  const id = `lava-${from.replace('#', '')}-${to.replace('#', '')}`
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id={id} cx="38%" cy="34%" rx="70%" ry="70%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
          <Stop offset="35%" stopColor={from} stopOpacity={0.95} />
          <Stop offset="100%" stopColor={to} stopOpacity={0.9} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={`url(#${id})`} />
    </Svg>
  )
}

// Zen cherry blossom — a 5-petal sakura in the theme's vermillion with a gold
// kintsugi center, matching the SmallSakura the zen queue rows use.
function CherryBlossom() {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28">
      <G transform="translate(14 14)">
        {[0, 72, 144, 216, 288].map((a) => (
          <G key={a} transform={`rotate(${a})`}>
            <Ellipse cx={0} cy={-7} rx={4.4} ry={5.6} fill="#D4442A" stroke="#7A2616" strokeWidth={0.5} />
          </G>
        ))}
        <Circle cx={0} cy={0} r={2.6} fill="#D4B85A" />
      </G>
    </Svg>
  )
}

// Faint scattered stars behind the label (no constellation lines). Lives in a
// stretched SVG — fine for tiny dots; the planet that needs to stay round is a
// separate fixed-aspect SVG emblem.
function StarField() {
  const stars = [
    { x: 16, y: 14, r: 0.9 },
    { x: 40, y: 10, r: 0.6 },
    { x: 58, y: 16, r: 0.5 },
    { x: 30, y: 40, r: 0.6 },
    { x: 50, y: 30, r: 0.7 },
    { x: 12, y: 32, r: 0.5 },
  ]
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 56" preserveAspectRatio="none">
        {stars.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={i % 3 === 0 ? '#40E0D0' : '#E8E6F0'} opacity={0.7} />
        ))}
      </Svg>
    </View>
  )
}

// Space emblem — a shaded ringed planet (Saturn) with a tilted double ring and
// a small magenta moon. Drawn in its own fixed-aspect SVG so the sphere stays
// round and the radial-gradient shading reads as a real 3D body.
function SaturnPlanet() {
  const w = 42
  const h = 34
  const cx = 17
  const cy = 18
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <RadialGradient id="spcBody" cx="36%" cy="28%" rx="72%" ry="72%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="42%" stopColor="#5EE6D8" stopOpacity={1} />
          <Stop offset="100%" stopColor="#13616F" stopOpacity={1} />
        </RadialGradient>
        <RadialGradient id="spcMoon" cx="34%" cy="28%" rx="76%" ry="76%">
          <Stop offset="0%" stopColor="#FFE0FF" stopOpacity={1} />
          <Stop offset="55%" stopColor="#E040FB" stopOpacity={1} />
          <Stop offset="100%" stopColor="#6E1880" stopOpacity={1} />
        </RadialGradient>
      </Defs>
      {/* Tilted Saturn ring — drawn behind the body so the tips read as wings */}
      <G transform={`rotate(-20 ${cx} ${cy})`}>
        <Ellipse cx={cx} cy={cy} rx={15.5} ry={4.9} fill="none" stroke="#BFD4FF" strokeWidth={1.7} opacity={0.92} />
        <Ellipse cx={cx} cy={cy} rx={11.8} ry={3.4} fill="none" stroke="#7FA8E0" strokeWidth={0.8} opacity={0.5} />
      </G>
      <Circle cx={cx} cy={cy} r={9} fill="url(#spcBody)" />
      {/* Small moon */}
      <Circle cx={35} cy={8} r={3} fill="url(#spcMoon)" />
    </Svg>
  )
}

function RetroSun() {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28">
      <Defs>
        <RadialGradient id="retroSun" cx="50%" cy="42%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#FFB13B" stopOpacity={1} />
          <Stop offset="60%" stopColor="#FF2D95" stopOpacity={1} />
          <Stop offset="100%" stopColor="#B967FF" stopOpacity={0.95} />
        </RadialGradient>
      </Defs>
      <G>
        <Circle cx={14} cy={13} r={12} fill="url(#retroSun)" />
        {[12, 17, 22].map((y) => (
          <Rect key={y} x={1} y={y} width={26} height={1.8} fill="#1A0A3A" />
        ))}
      </G>
    </Svg>
  )
}

// ── Dispatcher ───────────────────────────────────────────────────────────────
interface CardProps {
  label: string
  selected: boolean
  onPress: () => void
}

const CARD_BY_KEY: Record<string, React.ComponentType<CardProps>> = {
  'neo-brutal': NeoBrutalCard,
  cyberpunk: CyberpunkCard,
  sketch: SketchCard,
  urban: UrbanCard,
  'deep-sea': DeepSeaCard,
  psychedelic: PsychedelicCard,
  zen: ZenCard,
  space: SpaceCard,
  steampunk: SteampunkCard,
  retrowave: RetrowaveCard,
}

export function ThemeStageCard({
  themeKey,
  label,
  selected,
  onPress,
}: {
  themeKey: string
  label: string
  selected: boolean
  onPress: () => void
}) {
  const Card = CARD_BY_KEY[themeKey] ?? NeoBrutalCard
  return <Card label={label} selected={selected} onPress={onPress} />
}
