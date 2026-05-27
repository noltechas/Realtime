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
} from 'react-native-svg'
import { useLinearLoop, useOscillator } from '../../theme/themes/steampunk/_shared'
import { Gear, Rivet } from '../../theme/themes/steampunk/Gear'

// ─── Steampunk-specific wizard chrome ───────────────────────────────────────
// These components are only rendered when the active wizard theme is
// 'steampunk'. They inject distinctive Victorian-industrial structure into
// the add-a-song flow (riveted brass frames, gear-checkpoint conveyor trails,
// avatar wreaths set in clockwork rings, cabochon-jewel color swatches,
// brass "Add Crew" plates with a spinning gear).
//
// Nothing here should leak into other themes — every use is guarded by
// `tokens.name === 'steampunk' ?` in WizardScreen.

// ── BrassFrame ──────────────────────────────────────────────────────────────
// Four corner rivets + a thin filigree pulse along the top and bottom edges.
// Drawn as an absolutely-positioned overlay so the parent stays a plain
// rounded rectangle.
export function BrassFrame({
  size = 9,
  rivetColor = '#B8762D',
  filigree = true,
}: {
  size?: number
  rivetColor?: string
  filigree?: boolean
}) {
  return (
    <>
      <View style={{ position: 'absolute', top: 4, left: 4 }}>
        <Rivet size={size} color={rivetColor} highlight="#F0DDB5" shadow="#3E2810" />
      </View>
      <View style={{ position: 'absolute', top: 4, right: 4 }}>
        <Rivet size={size} color={rivetColor} highlight="#F0DDB5" shadow="#3E2810" />
      </View>
      <View style={{ position: 'absolute', bottom: 4, left: 4 }}>
        <Rivet size={size} color={rivetColor} highlight="#F0DDB5" shadow="#3E2810" />
      </View>
      <View style={{ position: 'absolute', bottom: 4, right: 4 }}>
        <Rivet size={size} color={rivetColor} highlight="#F0DDB5" shadow="#3E2810" />
      </View>
      {filigree ? (
        <>
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 2, left: 18, right: 18, height: 4 }}
          >
            <Svg width="100%" height="4" viewBox="0 0 200 4" preserveAspectRatio="none">
              <Path
                d="M 0 2 Q 25 0 50 2 Q 75 4 100 2 Q 125 0 150 2 Q 175 4 200 2"
                stroke={rivetColor}
                strokeWidth={0.7}
                fill="none"
                opacity={0.6}
              />
            </Svg>
          </View>
          <View
            pointerEvents="none"
            style={{ position: 'absolute', bottom: 2, left: 18, right: 18, height: 4 }}
          >
            <Svg width="100%" height="4" viewBox="0 0 200 4" preserveAspectRatio="none">
              <Path
                d="M 0 2 Q 25 4 50 2 Q 75 0 100 2 Q 125 4 150 2 Q 175 0 200 2"
                stroke={rivetColor}
                strokeWidth={0.7}
                fill="none"
                opacity={0.6}
              />
            </Svg>
          </View>
        </>
      ) : null}
    </>
  )
}

// ── Conveyor progress trail ─────────────────────────────────────────────────
// Replaces "Step 1 of 2" — gear checkpoints linked by a brass chain belt.
// Past gears get a checkmark; the active gear rotates and glows amber; future
// gears sit dim and outlined. The chain segments are a sequence of stamped
// brass plates with darker pegs separating them.
export function ConveyorTrail({
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
          maxWidth: 240,
        }}
      >
        {dots.map((state, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <ChainSegment done={state === 'done' || dots[i - 1] === 'done'} /> : null}
            <Checkpoint state={state} />
          </React.Fragment>
        ))}
      </View>
      <Text
        style={{
          marginTop: 8,
          fontFamily: 'Cinzel_700Bold',
          fontSize: 14,
          letterSpacing: 2.4,
          textTransform: 'uppercase',
          color: '#E8A93B',
          textShadowColor: 'rgba(232,169,59,0.6)',
          textShadowRadius: 5,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        {label}
      </Text>
    </View>
  )
}

function ChainSegment({ done }: { done: boolean }) {
  // A brass chain link rendered as 3 small plates with darker pegs.
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 6,
        gap: 2,
      }}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 4,
            borderRadius: 1,
            backgroundColor: done ? '#E8A93B' : '#5C3A12',
            borderWidth: 0.5,
            borderColor: '#3E2810',
            opacity: done ? 1 : 0.8,
          }}
        />
      ))}
    </View>
  )
}

function Checkpoint({ state }: { state: 'done' | 'active' | 'pending' }) {
  const spin = useLinearLoop(8000)
  const breath = useOscillator(1800)
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const haloOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] })

  if (state === 'active') {
    return (
      <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
        {/* Pulsing halo */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 1,
            borderColor: '#E8A93B',
            opacity: haloOpacity,
          }}
        />
        <Animated.View style={{ width: 22, height: 22, transform: [{ rotate: rot }] }}>
          <Gear
            size={22}
            teeth={10}
            bodyColor="#E8C078"
            edgeColor="#7A4D1A"
            hubColor="#3E2810"
            highlightColor="#FFF4D0"
          />
        </Animated.View>
      </View>
    )
  }
  if (state === 'done') {
    return (
      <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={22} height={22} viewBox="0 0 22 22">
          <Defs>
            <RadialGradient id="ckptDone" cx="38%" cy="32%" rx="65%" ry="65%">
              <Stop offset="0%" stopColor="#8AB5A0" stopOpacity={1} />
              <Stop offset="60%" stopColor="#5C8A7A" stopOpacity={1} />
              <Stop offset="100%" stopColor="#2E4640" stopOpacity={1} />
            </RadialGradient>
          </Defs>
          <Circle cx={11} cy={11} r={9} fill="url(#ckptDone)" stroke="#2E4640" strokeWidth={1} />
          <Path
            d="M 6 11 L 10 14 L 16 7"
            stroke="#F0DDB5"
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
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Circle
          cx={11}
          cy={11}
          r={8}
          fill="rgba(184,118,45,0.08)"
          stroke="rgba(184,118,45,0.55)"
          strokeWidth={1}
          strokeDasharray="2,2"
        />
        <Circle cx={11} cy={11} r={2} fill="rgba(184,118,45,0.4)" />
      </Svg>
    </View>
  )
}

// ── Avatar gear-wreath ──────────────────────────────────────────────────────
// Wraps any avatar in a rotating brass gear ring. The avatar itself sits
// inside the gear's hub. Counter-rotating direction makes the avatar feel
// "set" into the mechanism.
export function AvatarGearWreath({
  size = 44,
  color,
  children,
}: {
  size?: number
  color: string
  children: React.ReactNode
}) {
  const spin = useLinearLoop(9000)
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const outer = size + 14
  return (
    <View
      style={{
        width: outer,
        height: outer,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Rotating brass gear ring behind the avatar */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer,
          height: outer,
          transform: [{ rotate: rot }],
        }}
      >
        <Gear
          size={outer}
          teeth={14}
          bodyColor="#B8762D"
          edgeColor="#5C3A12"
          hubColor="#1F1108"
          highlightColor="#E8C078"
          opacity={0.85}
        />
      </Animated.View>
      {/* Avatar — sized internally to `size`, mounted with a colored bezel */}
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
          shadowColor: '#E8A93B',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.75,
          shadowRadius: 6,
        }}
      >
        {children}
      </View>
    </View>
  )
}

// ── Cabochon jewel swatch ───────────────────────────────────────────────────
// Replaces the flat color disc with a polished cabochon set into a brass
// bezel. Selected swatches scale up and gain a strong amber glow halo.
// Inactive swatches sit smaller with a faint bezel; taken-by-other singers
// fade out.
export function JewelBezelSwatch({
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
  const canvas = 44
  const gemRadius = selected ? 12 : 10
  const bezelRadius = selected ? 20 : 17
  const id = `wizJewel-${seed}-${color.replace('#', '')}`
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
                shadowColor: '#E8A93B',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 10,
              }
            : {}),
        }}
      >
        <Svg width={canvas} height={canvas} viewBox={`0 0 ${canvas} ${canvas}`}>
          <Defs>
            <RadialGradient id={`${id}-bezel`} cx="35%" cy="30%" rx="68%" ry="68%">
              <Stop offset="0%" stopColor="#F0D898" stopOpacity={1} />
              <Stop offset="55%" stopColor={selected ? '#E8A93B' : '#B8762D'} stopOpacity={1} />
              <Stop offset="100%" stopColor="#3E2810" stopOpacity={1} />
            </RadialGradient>
            <RadialGradient id={`${id}-gem`} cx="32%" cy="28%" rx="65%" ry="65%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
              <Stop offset="35%" stopColor={color} stopOpacity={1} />
              <Stop offset="100%" stopColor={color} stopOpacity={0.6} />
            </RadialGradient>
          </Defs>
          {/* Brass bezel */}
          <Circle cx={c} cy={c} r={bezelRadius} fill={`url(#${id}-bezel)`} />
          <Circle
            cx={c}
            cy={c}
            r={bezelRadius - 0.5}
            fill="none"
            stroke="#3E2810"
            strokeWidth={0.5}
            opacity={0.7}
          />
          {/* Bezel rivets — 6 around the rim */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2
            const rx = c + Math.cos(a) * (bezelRadius - 3)
            const ry = c + Math.sin(a) * (bezelRadius - 3)
            return (
              <G key={i}>
                <Circle cx={rx} cy={ry} r={1.4} fill="#3E2810" />
                <Circle cx={rx - 0.35} cy={ry - 0.35} r={0.7} fill="#F0DDB5" opacity={0.75} />
              </G>
            )
          })}
          {/* Gem */}
          <Circle cx={c} cy={c} r={gemRadius} fill={`url(#${id}-gem)`} />
          {/* Specular */}
          <Ellipse
            cx={c - gemRadius * 0.3}
            cy={c - gemRadius * 0.35}
            rx={gemRadius * 0.32}
            ry={gemRadius * 0.18}
            fill="#FFFFFF"
            opacity={0.65}
          />
        </Svg>
      </View>
    </Pressable>
  )
}

// ── "Add Crew" brass plate button ──────────────────────────────────────────
// Replaces the dashed-border "+ Add another singer" plate with a riveted
// brass plaque whose left side hosts a continuously spinning gear and whose
// label sits in engraved Cinzel caps. An amber filament breathes beneath the
// plate so the button reads as live machinery.
export function SteampunkAddCrewButton({ onPress }: { onPress: () => void }) {
  const spin = useLinearLoop(6000)
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const filament = useOscillator(3400)
  const filamentOpacity = filament.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginTop: 4,
        transform: pressed ? [{ scale: 0.97 }] : undefined,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: '#2A1A0E',
          borderWidth: 2,
          borderColor: '#B8762D',
          borderRadius: 6,
          paddingVertical: 14,
          paddingHorizontal: 18,
          paddingLeft: 56,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          overflow: 'hidden',
          shadowColor: '#E8A93B',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: 10,
        }}
      >
        {/* Warm interior tint */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(232,169,59,0.08)',
            'rgba(184,118,45,0.05)',
            'rgba(58,30,8,0.15)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Filament glow stripe */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 1,
            left: 18,
            right: 18,
            height: 2,
            opacity: filamentOpacity,
          }}
        >
          <LinearGradient
            colors={[
              'rgba(232,169,59,0)',
              'rgba(255,228,160,0.9)',
              'rgba(232,169,59,0.8)',
              'rgba(255,228,160,0.9)',
              'rgba(232,169,59,0)',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>

        <BrassFrame size={8} filigree={false} />

        {/* Spinning gear on the left edge */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 18,
            top: '50%',
            width: 26,
            height: 26,
            marginTop: -13,
            transform: [{ rotate: rot }],
          }}
        >
          <Gear
            size={26}
            teeth={12}
            bodyColor="#C97D3E"
            edgeColor="#6E3A14"
            hubColor="#3A1E0A"
            highlightColor="#F0A058"
          />
        </Animated.View>

        <Text
          style={{
            fontFamily: 'Cinzel_700Bold',
            fontSize: 13,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#F0DDB5',
            textShadowColor: 'rgba(232,169,59,0.65)',
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
