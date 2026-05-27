import React from 'react'
import { View, Text, Pressable, Animated, StyleSheet, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, {
  Circle,
  Defs,
  Polygon,
  Line,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg'
import { useLinearLoop, useOscillator } from '../../theme/themes/retrowave/_shared'

// ─── Retrowave-specific wizard chrome ───────────────────────────────────────
// Original retrowave language — none of the space-theme vocabulary:
//   • no orbiting satellites
//   • no planet-with-tilted-ring color swatches
//   • no dashed-circle avatar orbits
//   • no HUD L-bracket corner marks
//   • no rocket-glyph add-crew buttons
//
// Instead, every component leans on synthwave touchstones: vector-graphics
// step pads (like a TR-808 sequencer), chromatic-aberration framing (the
// "split RGB" tape-glitch look), solid triangle pennants (80s VHS sleeve
// corner accents), Outrun lane dashed stripes, and italic arcade typography.
//
// Export names are intentionally the same as the previous (more space-like)
// versions so the WizardScreen.tsx branches don't need to change.

// ── NeonFrame ──────────────────────────────────────────────────────────────
// Four solid neon TRIANGLE PENNANTS at the card corners — top corners pink,
// bottom corners cyan, all pointing inward toward the card body. Sharp
// filled triangles, not hairline L-brackets. Caller can override the colors
// so singer cards can tint pennants their identity color.
export function NeonFrame({
  size = 10,
  topColor = '#FF2D95',
  bottomColor = '#00F0FF',
  inset = 2,
  /* thickness arg kept for call-site compatibility, no longer used */
  thickness,
}: {
  size?: number
  topColor?: string
  bottomColor?: string
  inset?: number
  thickness?: number
}) {
  void thickness
  const s = size
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', top: inset, left: inset, width: s, height: s }}>
        <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <Polygon points={`0,0 ${s},0 0,${s}`} fill={topColor} />
        </Svg>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', top: inset, right: inset, width: s, height: s }}>
        <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <Polygon points={`0,0 ${s},0 ${s},${s}`} fill={topColor} />
        </Svg>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: inset, left: inset, width: s, height: s }}>
        <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <Polygon points={`0,0 0,${s} ${s},${s}`} fill={bottomColor} />
        </Svg>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: inset, right: inset, width: s, height: s }}>
        <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <Polygon points={`${s},0 ${s},${s} 0,${s}`} fill={bottomColor} />
        </Svg>
      </View>
    </>
  )
}

// ── SunsetTrail (wizard progress) ───────────────────────────────────────────
// TR-808 sequencer-pad progression. Each step is a square pad with its step
// number in italic Audiowide; pads are connected by Outrun-style dashed
// lane stripes. Active pad is hot-pink filled with a chrome top highlight
// + a pulsing white "ON" dot beneath it; done pads are cyan with a check
// mark; pending pads are outlined in dashed pink with the step number dim.
// Below the row, the step label sits in Monoton caps (the neon-tube
// display face) with a magenta glow — feels like an arcade title plate,
// not a planetary "mission".
export function SunsetTrail({
  current,
  total,
  label,
}: {
  current: number
  total: number
  label: string
}) {
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
        {dots.map((state, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <LaneStripe done={state === 'done' || dots[i - 1] === 'done'} /> : null}
            <SequencerPad state={state} step={i + 1} />
          </React.Fragment>
        ))}
      </View>
      <Text
        style={{
          marginTop: 8,
          fontFamily: 'Monoton_400Regular',
          fontSize: 18,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: '#FFFFFF',
          textShadowColor: 'rgba(255,45,149,0.95)',
          textShadowRadius: 10,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        {label}
      </Text>
    </View>
  )
}

function SequencerPad({
  state,
  step,
}: {
  state: 'done' | 'active' | 'pending'
  step: number
}) {
  const pulse = useOscillator(1800)
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] })

  if (state === 'active') {
    return (
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 26,
            height: 22,
            backgroundColor: '#FF2D95',
            borderWidth: 1.5,
            borderColor: '#FFB5DE',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#FF2D95',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 8,
          }}
        >
          {/* Chrome top highlight bar */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: '#FFFFFF',
              opacity: 0.7,
            }}
          />
          <Text
            style={{
              fontFamily: 'Audiowide_400Regular',
              fontSize: 11,
              color: '#0A0420',
              fontStyle: 'italic',
              lineHeight: 14,
            }}
          >
            {String(step).padStart(2, '0')}
          </Text>
        </View>
        {/* Pulsing dot beneath */}
        <Animated.View
          style={{
            marginTop: 3,
            width: 4,
            height: 4,
            backgroundColor: '#FFFFFF',
            opacity: pulseOpacity,
            shadowColor: '#FF2D95',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 3,
          }}
        />
      </View>
    )
  }
  if (state === 'done') {
    return (
      <View
        style={{
          width: 26,
          height: 22,
          backgroundColor: 'rgba(0,240,255,0.18)',
          borderWidth: 1.5,
          borderColor: '#00F0FF',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#00F0FF',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: 5,
        }}
      >
        <Svg width={14} height={14} viewBox="0 0 14 14">
          <Path
            d="M 3 7 L 6 10 L 11 4"
            stroke="#00F0FF"
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    )
  }
  // pending
  return (
    <View
      style={{
        width: 26,
        height: 22,
        backgroundColor: 'transparent',
        borderWidth: 1.2,
        borderColor: 'rgba(255,45,149,0.5)',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'Audiowide_400Regular',
          fontSize: 10,
          color: 'rgba(255,45,149,0.6)',
          fontStyle: 'italic',
          lineHeight: 14,
        }}
      >
        {String(step).padStart(2, '0')}
      </Text>
    </View>
  )
}

function LaneStripe({ done }: { done: boolean }) {
  // Outrun-style dashed connector — bright magenta when done, dim faded
  // when pending. No animation — the active pad's pulsing white dot is
  // the focal motion.
  const color = done ? '#FF2D95' : 'rgba(255,45,149,0.35)'
  return (
    <View style={{ width: 24, height: 2, marginHorizontal: 5, justifyContent: 'center' }}>
      <Svg width={24} height={2} viewBox="0 0 24 2" preserveAspectRatio="none">
        <Line
          x1={0}
          y1={1}
          x2={24}
          y2={1}
          stroke={color}
          strokeWidth={1.4}
          strokeDasharray="3,3"
        />
      </Svg>
    </View>
  )
}

// ── AvatarChromeRing ────────────────────────────────────────────────────────
// Replaces the previous orbiting-satellite design with a STATIC chromatic-
// aberration square frame: three offset square borders (pink shifted up-
// left, singer-color crisp at center, cyan shifted down-right) producing
// the iconic split-RGB tape-glitch effect. A small pink LED dot sits at
// the top-right corner and pulses on a slow sine. The avatar inside is
// still a circle, but the frame around it is angular — no orbit ring, no
// orbiting satellite triangle, none of the space vocabulary.
export function AvatarChromeRing({
  size = 44,
  color,
  children,
}: {
  size?: number
  color: string
  children: React.ReactNode
}) {
  const ledPulse = useOscillator(1500)
  const ledOpacity = ledPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] })

  const frameSize = size + 12

  return (
    <View
      style={{
        width: frameSize + 6,
        height: frameSize + 6,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Cyan border — offset down-right */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 4,
          top: 4,
          width: frameSize,
          height: frameSize,
          borderWidth: 1.5,
          borderColor: '#00F0FF',
          opacity: 0.85,
        }}
      />
      {/* Magenta border — offset up-left */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: frameSize,
          height: frameSize,
          borderWidth: 1.5,
          borderColor: '#FF2D95',
          opacity: 0.85,
        }}
      />
      {/* Singer-color border at center — crisp foreground */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 2,
          top: 2,
          width: frameSize,
          height: frameSize,
          borderWidth: 1.5,
          borderColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.95,
          shadowRadius: 6,
        }}
      />
      {/* Avatar — circle inside the square frame */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
      {/* Top-right pulsing pink LED */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 5,
          height: 5,
          backgroundColor: '#FF2D95',
          opacity: ledOpacity,
          shadowColor: '#FF2D95',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 4,
        }}
      />
    </View>
  )
}

// ── NeonOrbSwatch ───────────────────────────────────────────────────────────
// Glossy 3D neon orb — kept (it's already retrowave-flavored). Selected
// swatches pop up larger and gain a chromatic-aberration outline echoing
// the avatar frame's CA treatment. No ring, no orbit.
export function NeonOrbSwatch({
  color,
  selected,
  takenByOther,
  seed,
  onPress,
}: {
  color: string
  selected: boolean
  takenByOther: boolean
  seed: number
  onPress: () => void
}) {
  const id = `wizOrb-${seed}-${color.replace('#', '')}`
  const canvas = selected ? 44 : 36
  const r = canvas / 2 - 3

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
          width: canvas + 4,
          height: canvas + 4,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: takenByOther ? 0.3 : 1,
          ...(selected
            ? {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 12,
              }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.5,
                shadowRadius: 3,
              }),
        }}
      >
        {selected ? (
          <>
            {/* The sphere sits at the center of the (canvas+4)×(canvas+4)
                container, so its top-left is at (2, 2). For the CA rings
                to encircle the sphere correctly we anchor them at (2, 2)
                and offset by ±1 from there — not from (0, 0), which is
                what the previous version did and is why the rings
                appeared to float up-left of the sphere. */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 3,
                top: 3,
                width: canvas,
                height: canvas,
                borderRadius: canvas / 2,
                borderWidth: 1,
                borderColor: '#00F0FF',
                opacity: 0.9,
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 1,
                top: 1,
                width: canvas,
                height: canvas,
                borderRadius: canvas / 2,
                borderWidth: 1,
                borderColor: '#FF2D95',
                opacity: 0.9,
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 2,
                top: 2,
                width: canvas,
                height: canvas,
                borderRadius: canvas / 2,
                borderWidth: 1,
                borderColor: '#FFFFFF',
                opacity: 0.85,
              }}
            />
          </>
        ) : null}

        <Svg width={canvas} height={canvas} viewBox={`0 0 ${canvas} ${canvas}`}>
          <Defs>
            <RadialGradient id={id} cx="32%" cy="28%" rx="65%" ry="65%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="40%" stopColor={color} stopOpacity={1} />
              <Stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </RadialGradient>
          </Defs>
          <Circle cx={canvas / 2} cy={canvas / 2} r={r} fill={`url(#${id})`} />
          <Circle
            cx={canvas / 2 - r * 0.3}
            cy={canvas / 2 - r * 0.35}
            r={r * 0.18}
            fill="#FFFFFF"
            opacity={0.85}
          />
        </Svg>
      </View>
    </Pressable>
  )
}

// ── RetrowaveAddCrewButton ──────────────────────────────────────────────────
// 80s-arcade "INSERT CARTRIDGE" plate: deep-indigo body with a chrome-pink
// top gradient, hot-pink rim with strong halo, and THREE small forward-
// marching chevrons on the leading edge (lighting up in sequence on a 1.6s
// loop — "PUSH START" feel). Italic Audiowide caps label. Triangle pennants
// at each corner replace the previous L-brackets / cyan triangle satellite.
export function RetrowaveAddCrewButton({ onPress }: { onPress: () => void }) {
  const tick = useLinearLoop(1600)
  const op0 = tick.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [1, 0.3, 0.3, 1],
  })
  const op1 = tick.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.3, 1, 0.3, 0.3],
  })
  const op2 = tick.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.3, 0.3, 1, 0.3],
  })

  return (
    <Pressable
      onPress={onPress}
      // Conditional spread (not ternary-to-undefined) — passing
      // `transform: undefined` here causes RN's processTransform to throw
      // "Cannot read property 'forEach' of null" once the prop hits the
      // native side. Omitting the key entirely when not pressed avoids it.
      style={({ pressed }) => ({
        marginTop: 4,
        opacity: pressed ? 0.9 : 1,
        ...(pressed ? { transform: [{ scale: 0.97 }] } : null),
      })}
    >
      <View
        style={{
          backgroundColor: '#0E0526',
          borderWidth: 1.5,
          borderColor: '#FF2D95',
          paddingVertical: 14,
          // Symmetric horizontal padding so the centered text actually
          // sits in the middle of the button. The chevron stack on the
          // left is absolutely-positioned so it doesn't claim flex space.
          paddingHorizontal: 58,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          overflow: 'hidden',
          shadowColor: '#FF2D95',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.95,
          shadowRadius: 10,
        }}
      >
        {/* Chrome-pink interior wash */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,181,222,0.22)', 'rgba(255,45,149,0.1)', 'rgba(10,4,32,0.7)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Top chrome highlight band */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }}
        >
          <LinearGradient
            colors={['rgba(255,181,222,0.95)', 'rgba(255,45,149,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ width: '100%', height: '100%' }}
          />
        </View>

        <NeonFrame size={9} inset={0} />

        {/* Three marching chevrons on the leading edge — vertically
            centered via a top:0/bottom:0/justifyContent wrapper instead of
            the previous top:'50%' + marginTop hack (which rendered too
            high on some layouts). */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 18,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Animated.View style={{ opacity: op0 }}>
              <Svg width={9} height={13} viewBox="0 0 9 13">
                <Polygon points="0,0 9,6.5 0,13" fill="#FF2D95" />
              </Svg>
            </Animated.View>
            <Animated.View style={{ opacity: op1 }}>
              <Svg width={9} height={13} viewBox="0 0 9 13">
                <Polygon points="0,0 9,6.5 0,13" fill="#FF2D95" />
              </Svg>
            </Animated.View>
            <Animated.View style={{ opacity: op2 }}>
              <Svg width={9} height={13} viewBox="0 0 9 13">
                <Polygon points="0,0 9,6.5 0,13" fill="#FF2D95" />
              </Svg>
            </Animated.View>
          </View>
        </View>

        <Text
          style={{
            fontFamily: 'Audiowide_400Regular',
            fontSize: 13,
            letterSpacing: 2.4,
            textTransform: 'uppercase',
            fontStyle: 'italic',
            color: '#FFFFFF',
            textShadowColor: 'rgba(255,45,149,0.95)',
            textShadowRadius: 6,
            textShadowOffset: { width: 0, height: 0 },
          }}
        >
          Add Singer
        </Text>
      </View>
    </Pressable>
  )
}
