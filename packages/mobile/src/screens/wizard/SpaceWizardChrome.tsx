import React from 'react'
import { View, Text, Pressable, Animated, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  RadialGradient,
  Stop,
  Path,
  Line,
  Polygon,
} from 'react-native-svg'
import { useLinearLoop, useOscillator } from '../../theme/themes/space/atoms/_ship'

// ─── Space-specific wizard chrome ───────────────────────────────────────────
// These components are only rendered when the active wizard theme is 'space'.
// They inject distinctive HUD / cosmic structure into the otherwise generic
// add-a-song flow (mission progress trail, orbit-ringed avatars, rocket-glyph
// add button, HUD bracket frames, sakura/planet color picker dots).
//
// Nothing in here should leak into other themes — the wizard guards every
// use with `tokens.name === 'space' ?` and falls back to the existing
// markup otherwise.

// ── HudBrackets ─────────────────────────────────────────────────────────────
// Four 12×12 corner brackets — magenta at the top, plasma cyan at the bottom.
// Drawn via an absolutely-positioned overlay so the parent can stay a plain
// rounded rectangle.
export function HudBrackets({
  topColor = '#E040FB',
  bottomColor = '#40E0D0',
  size = 12,
  thickness = 1.5,
  inset = 0,
}: {
  topColor?: string
  bottomColor?: string
  size?: number
  thickness?: number
  inset?: number
}) {
  return (
    <>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: inset, left: inset, width: size, height: size }}
      >
        <View style={{ width: size, height: thickness, backgroundColor: topColor }} />
        <View style={{ width: thickness, height: size - thickness, backgroundColor: topColor }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: inset,
          right: inset,
          width: size,
          height: size,
          alignItems: 'flex-end',
        }}
      >
        <View style={{ width: size, height: thickness, backgroundColor: topColor }} />
        <View style={{ width: thickness, height: size - thickness, backgroundColor: topColor }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: inset,
          left: inset,
          width: size,
          height: size,
          justifyContent: 'flex-end',
        }}
      >
        <View style={{ width: thickness, height: size - thickness, backgroundColor: bottomColor }} />
        <View style={{ width: size, height: thickness, backgroundColor: bottomColor }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: inset,
          right: inset,
          width: size,
          height: size,
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
        }}
      >
        <View style={{ width: thickness, height: size - thickness, backgroundColor: bottomColor }} />
        <View style={{ width: size, height: thickness, backgroundColor: bottomColor }} />
      </View>
    </>
  )
}

// ── Mission progress trail ──────────────────────────────────────────────────
// Replaces the boring "Step 1 of 2" text in the wizard header. Three planet
// checkpoints connected by a dashed orbit line. Completed steps show a
// checkmark, the active step is a glowing magenta planet with a pulsing
// outer ring + a cyan satellite tracing it, future steps are dim outlines.
export function MissionTrail({
  current,
  total,
  label,
}: {
  current: number // 1-based index of active step
  total: number
  label: string
}) {
  // For the active checkpoint:
  const pulse = useOscillator(1800)
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] })
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0.15] })

  const orbit = useLinearLoop(3800)
  const orbitRot = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const dots: Array<'done' | 'active' | 'pending'> = []
  for (let i = 1; i <= total; i++) {
    if (i < current) dots.push('done')
    else if (i === current) dots.push('active')
    else dots.push('pending')
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 220,
        }}
      >
        {dots.map((state, i) => {
          const isActive = state === 'active'
          return (
            <React.Fragment key={i}>
              {i > 0 ? (
                <DashSegment
                  done={state === 'done' || dots[i - 1] === 'done'}
                  isNextActive={state === 'active'}
                />
              ) : null}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                {/* Pulsing outer ring on the active checkpoint */}
                {isActive ? (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#E040FB',
                      opacity: ringOpacity,
                      transform: [{ scale: ringScale }],
                    }}
                  />
                ) : null}
                <Checkpoint state={state} />
                {/* Orbit satellite on the active checkpoint */}
                {isActive ? (
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      width: 28,
                      height: 28,
                      alignItems: 'center',
                      transform: [{ rotate: orbitRot }],
                    }}
                  >
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        marginTop: -2,
                        backgroundColor: '#40E0D0',
                        shadowColor: '#40E0D0',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 1,
                        shadowRadius: 4,
                      }}
                    />
                  </Animated.View>
                ) : null}
              </View>
            </React.Fragment>
          )
        })}
      </View>
      <Text
        style={{
          marginTop: 6,
          fontFamily: 'Orbitron_700Bold',
          fontSize: 14,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#E8E6F0',
          textShadowColor: 'rgba(224,64,251,0.55)',
          textShadowRadius: 6,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        {label}
      </Text>
    </View>
  )
}

function DashSegment({
  done,
  isNextActive,
}: {
  done: boolean
  isNextActive: boolean
}) {
  const color = done ? '#40E0D0' : isNextActive ? '#E040FB' : 'rgba(168,194,255,0.35)'
  return (
    <View style={{ width: 40, height: 1, marginHorizontal: 4 }}>
      <Svg width={40} height={1.5} viewBox="0 0 40 1.5">
        <Line
          x1={0}
          y1={0.75}
          x2={40}
          y2={0.75}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      </Svg>
    </View>
  )
}

function Checkpoint({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'active') {
    return (
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Defs>
          <RadialGradient id="ckptActive" cx="38%" cy="32%" rx="60%" ry="60%">
            <Stop offset="0%" stopColor="#FFC9FF" stopOpacity={1} />
            <Stop offset="60%" stopColor="#E040FB" stopOpacity={1} />
            <Stop offset="100%" stopColor="#5A1480" stopOpacity={0.95} />
          </RadialGradient>
        </Defs>
        <Circle cx={9} cy={9} r={7} fill="url(#ckptActive)" />
        <Circle cx={9} cy={9} r={7.5} fill="none" stroke="#FFFFFF" strokeWidth={0.6} opacity={0.85} />
      </Svg>
    )
  }
  if (state === 'done') {
    return (
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Circle cx={9} cy={9} r={7} fill="rgba(64,224,208,0.25)" stroke="#40E0D0" strokeWidth={1.2} />
        <Path
          d="M 5 9 L 8 12 L 13 6"
          stroke="#40E0D0"
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    )
  }
  // pending
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Circle
        cx={9}
        cy={9}
        r={6}
        fill="rgba(168,194,255,0.08)"
        stroke="rgba(168,194,255,0.45)"
        strokeWidth={1}
        strokeDasharray="2,2"
      />
    </Svg>
  )
}

// ── Avatar orbit wrapper ────────────────────────────────────────────────────
// Wraps any avatar (image or initial circle) in a dashed cyan orbit ring with
// a small cyan satellite that rotates continuously. The avatar's own size is
// preserved — the orbit padding sits outside it.
export function AvatarOrbit({
  size = 44,
  color,
  children,
}: {
  size?: number
  color: string
  children: React.ReactNode
}) {
  const orbit = useLinearLoop(4400)
  const rot = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })
  const outer = size + 12 // ring sits 6px outside the avatar
  return (
    <View
      style={{
        width: outer,
        height: outer,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Dashed orbit ring */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: 1,
          borderColor: 'rgba(64,224,208,0.55)',
          borderStyle: 'dashed',
        }}
      />
      {/* Avatar (provided by parent) — sized internally to `size` */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.85,
          shadowRadius: 8,
        }}
      >
        {children}
      </View>
      {/* Orbiting satellite */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer,
          height: outer,
          alignItems: 'center',
          transform: [{ rotate: rot }],
        }}
      >
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            marginTop: -2.5,
            backgroundColor: '#40E0D0',
            shadowColor: '#40E0D0',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 5,
          }}
        />
      </Animated.View>
    </View>
  )
}

// ── Planet color swatch ─────────────────────────────────────────────────────
// Replaces the flat color disc with a tiny planet — radial gradient body with
// a thin tilted Saturn-style ring at a deterministic angle (so each color
// sits at a different tilt and the row reads as a planetary chart, not a
// uniform line of dots). Selected planets get a bright glow halo around the
// swatch — no extra colored rim because the planet color already tells the
// user what they picked.
//
// The SVG canvas is intentionally *larger* than the planet body so the
// tilted ring (whose rotated bounding box is wider than the un-rotated
// ellipse) never gets clipped at the swatch edge.
export function PlanetSwatch({
  color,
  selected,
  takenByOther,
  onPress,
  seed,
}: {
  color: string
  selected: boolean
  takenByOther: boolean
  onPress: () => void
  seed: number
}) {
  const tilt = (seed * 31) % 60 - 30 // -30°..+30° per seed
  // Render canvas always at the larger size so the ring has breathing room
  // even when the swatch isn't selected.
  const canvas = 44
  const planetRadius = selected ? 13 : 11
  const ringRx = 17
  const ringRy = 6
  const id = `wizPlanet-${seed}-${color.replace('#', '')}`
  const c = canvas / 2

  return (
    <Pressable
      onPress={() => {
        if (takenByOther) return
        onPress()
      }}
      hitSlop={4}
    >
      <View
        style={{
          width: canvas,
          height: canvas,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: takenByOther ? 0.3 : 1,
          ...(selected
            ? {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 10,
              }
            : {}),
        }}
      >
        <Svg width={canvas} height={canvas} viewBox={`0 0 ${canvas} ${canvas}`}>
          <Defs>
            <RadialGradient id={id} cx="32%" cy="28%" rx="68%" ry="68%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.85} />
              <Stop offset="30%" stopColor={color} stopOpacity={1} />
              <Stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </RadialGradient>
          </Defs>
          {/* Tilted Saturn ring — rotated as a group around the planet
              center so the ellipse element itself stays well-formed and
              its rotated bounding box stays inside the canvas. */}
          <G transform={`rotate(${tilt} ${c} ${c})`}>
            <Ellipse
              cx={c}
              cy={c}
              rx={ringRx}
              ry={ringRy}
              fill="none"
              stroke={selected ? '#FFFFFF' : 'rgba(168,194,255,0.5)'}
              strokeWidth={selected ? 1.3 : 0.9}
              opacity={selected ? 0.95 : 0.6}
            />
          </G>
          <Circle cx={c} cy={c} r={planetRadius} fill={`url(#${id})`} />
        </Svg>
      </View>
    </Pressable>
  )
}

// ── Rocket "add crew" button ────────────────────────────────────────────────
// Replaces the dashed-border "+ Add another singer" plate with a HUD console
// that pairs a rocket-launch glyph with the label. Continuous plasma scan
// line travels left→right across the body so the button reads as "live".
export function AddCrewButton({ onPress }: { onPress: () => void }) {
  const scan = useLinearLoop(5400)
  const scanX = scan.interpolate({
    inputRange: [0, 1],
    outputRange: ['-40%', '140%'],
  })
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginTop: 4,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: 'rgba(14,14,26,0.78)',
          borderWidth: 1.5,
          borderColor: 'rgba(64,224,208,0.55)',
          borderRadius: 8,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          overflow: 'hidden',
          shadowColor: '#40E0D0',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
        }}
      >
        {/* Scan line */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '30%',
            transform: [{ translateX: scanX }],
          }}
        >
          <LinearGradient
            colors={[
              'rgba(64,224,208,0)',
              'rgba(64,224,208,0.18)',
              'rgba(64,224,208,0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>

        <HudBrackets size={10} thickness={1.4} inset={4} />

        <RocketGlyph />
        <Text
          style={{
            fontFamily: 'Orbitron_700Bold',
            fontSize: 13,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: '#E8E6F0',
            textShadowColor: 'rgba(64,224,208,0.55)',
            textShadowRadius: 5,
            textShadowOffset: { width: 0, height: 0 },
          }}
        >
          Add Crew Member
        </Text>
      </View>
    </Pressable>
  )
}

function RocketGlyph() {
  // Continuous flicker on the engine flame.
  const flicker = useOscillator(420)
  const scaleY = flicker.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] })
  const opacity = flicker.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] })
  return (
    <View style={{ width: 22, height: 22 }}>
      <Svg width={22} height={22} viewBox="0 0 22 22">
        {/* Rocket body */}
        <Polygon points="11,2 14,9 14,16 8,16 8,9" fill="#E8E6F0" />
        {/* Fins */}
        <Polygon points="8,12 5,17 8,16" fill="#E040FB" />
        <Polygon points="14,12 17,17 14,16" fill="#E040FB" />
        {/* Cockpit window */}
        <Circle cx={11} cy={8} r={1.4} fill="#40E0D0" />
        {/* Nose tip highlight */}
        <Polygon points="11,2 12,5 10,5" fill="#FFC9FF" />
      </Svg>
      {/* Engine flame */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 9,
          width: 4,
          height: 5,
          borderRadius: 2,
          backgroundColor: '#FFC34D',
          opacity,
          transform: [{ scaleY }],
          shadowColor: '#FFC34D',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 4,
        }}
      />
    </View>
  )
}

// ── Constellation backdrop ──────────────────────────────────────────────────
// A faint, decorative grid of stars + connecting lines layered behind a card
// to make it read as a star chart rather than a flat panel. Stars are placed
// deterministically and rendered as a single SVG so the cost stays cheap
// even when many cards are on screen.
export function StarChartBackdrop({
  seed = 0,
  containerStyle,
}: {
  seed?: number
  containerStyle?: ViewStyle
}) {
  // 6 stars + 3 lines, deterministic positions seeded so cards in a list
  // each get their own chart pattern.
  const r = pseudoRandom(seed + 1)
  const stars = Array.from({ length: 6 }, () => ({
    x: 10 + r() * 80,
    y: 8 + r() * 84,
    s: 0.5 + r() * 1.1,
  }))
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.55,
        },
        containerStyle,
      ]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Line
          x1={stars[0].x}
          y1={stars[0].y}
          x2={stars[1].x}
          y2={stars[1].y}
          stroke="#A8C2FF"
          strokeWidth={0.15}
          opacity={0.5}
        />
        <Line
          x1={stars[2].x}
          y1={stars[2].y}
          x2={stars[3].x}
          y2={stars[3].y}
          stroke="#A8C2FF"
          strokeWidth={0.15}
          opacity={0.5}
        />
        {stars.map((s, i) => (
          <Circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.s * 0.5}
            fill={i % 3 === 0 ? '#40E0D0' : '#E8E6F0'}
            opacity={0.55}
          />
        ))}
      </Svg>
    </View>
  )
}

function pseudoRandom(seed: number) {
  let s = (seed * 16807) % 2147483647
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}
