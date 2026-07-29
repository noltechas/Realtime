import React from 'react'
import { View, Text, Pressable, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, RadialGradient, Stop, Path } from 'react-native-svg'
import {
  Gear,
  CornerScrews,
  BRASS,
  BRASS_BRIGHT,
  AMBER,
  PARCH,
  VERDIGRIS,
  HAIRLINE,
  HAIRLINE_SOFT,
  IRON_PANEL,
  DEPTH_SHADOW,
  useLinearLoop,
  useOscillator,
} from '../../theme/themes/steampunk/atoms/_steam'

// ─── Steampunk-specific wizard chrome ───────────────────────────────────────
// Rendered only when the active wizard theme is 'steampunk'. Speaks the same
// machined precision-instrument language as the theme's atom set (see
// themes/steampunk/atoms/_steam.tsx): iron plates, brass hairlines, machined
// corner screws, enamel lamps — brass reserved for the active element.
//
// Nothing here should leak into other themes — every use is guarded by
// `tokens.name === 'steampunk' ?` in WizardScreen.

// ── BrassFrame ──────────────────────────────────────────────────────────────
// Four machined corner screws as an absolutely-positioned overlay. The
// `filigree` flag adds a faint engraved rule along the top and bottom edges.
export function BrassFrame({
  size = 7,
  rivetColor = BRASS,
  filigree = true,
}: {
  size?: number
  rivetColor?: string
  filigree?: boolean
}) {
  void rivetColor // legacy prop — screws are always machined brass now
  return (
    <>
      <CornerScrews seed="wizard-frame" inset={5} size={size} />
      {filigree ? (
        <>
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 3, left: 20, right: 20, height: 1, backgroundColor: HAIRLINE_SOFT }}
          />
          <View
            pointerEvents="none"
            style={{ position: 'absolute', bottom: 3, left: 20, right: 20, height: 1, backgroundColor: HAIRLINE_SOFT }}
          />
        </>
      ) : null}
    </>
  )
}

// ── Conveyor progress trail ─────────────────────────────────────────────────
// Replaces "Step 1 of 2" — instrument checkpoints joined by a brass linkage.
// Past checkpoints are verdigris seals with a checkmark; the active one is a
// turning brass gear inside a breathing halo; future ones sit as engraved
// outline rings.
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
            {i > 0 ? <Linkage done={state === 'done' || dots[i - 1] === 'done'} /> : null}
            <Checkpoint state={state} />
          </React.Fragment>
        ))}
      </View>
      <Text
        style={{
          marginTop: 8,
          fontFamily: 'Cinzel_700Bold',
          fontSize: 13,
          letterSpacing: 2.8,
          textTransform: 'uppercase',
          color: AMBER,
          includeFontPadding: false,
        }}
      >
        {label}
      </Text>
    </View>
  )
}

// A machined connecting rod between checkpoints — a hairline with a center pin.
function Linkage({ done }: { done: boolean }) {
  return (
    <View style={{ width: 28, height: 22, marginHorizontal: 4, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignSelf: 'stretch', height: done ? 1.5 : 1, backgroundColor: done ? BRASS : HAIRLINE_SOFT }} />
      <View
        style={{
          position: 'absolute',
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: done ? BRASS_BRIGHT : 'rgba(200,151,62,0.35)',
        }}
      />
    </View>
  )
}

function Checkpoint({ state }: { state: 'done' | 'active' | 'pending' }) {
  const spin = useLinearLoop(9000)
  const breath = useOscillator(2000)
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const haloOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] })

  if (state === 'active') {
    return (
      <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: 1,
            borderColor: AMBER,
            opacity: haloOpacity,
          }}
        />
        <Animated.View style={{ width: 21, height: 21, transform: [{ rotate: rot }] }}>
          <Gear size={21} teeth={10} tone="brass" />
        </Animated.View>
      </View>
    )
  }
  if (state === 'done') {
    return (
      <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={22} height={22} viewBox="0 0 22 22">
          <Defs>
            <RadialGradient id="ckpt-done" cx="38%" cy="32%" rx="65%" ry="65%">
              <Stop offset="0%" stopColor="#A4CCBB" stopOpacity={1} />
              <Stop offset="60%" stopColor={VERDIGRIS} stopOpacity={1} />
              <Stop offset="100%" stopColor="#3A5A4D" stopOpacity={1} />
            </RadialGradient>
          </Defs>
          <Circle cx={11} cy={11} r={9} fill="url(#ckpt-done)" stroke="#2C463C" strokeWidth={1} />
          <Path
            d="M 6 11 L 10 14 L 16 7"
            stroke="#F2EADA"
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    )
  }
  // pending — engraved outline ring
  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Circle cx={11} cy={11} r={8} fill="rgba(200,151,62,0.06)" stroke={HAIRLINE} strokeWidth={1} />
        <Circle cx={11} cy={11} r={2} fill="rgba(200,151,62,0.4)" />
      </Svg>
    </View>
  )
}

// ── Avatar gear-wreath ──────────────────────────────────────────────────────
// Sets an avatar into a slowly turning brass gear ring, with the singer's
// color as the mounting bezel.
export function AvatarGearWreath({
  size = 44,
  color,
  children,
}: {
  size?: number
  color: string
  children: React.ReactNode
}) {
  const spin = useLinearLoop(12000)
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const outer = size + 14
  return (
    <View style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: outer, height: outer, transform: [{ rotate: rot }] }}
      >
        <Gear size={outer} teeth={14} tone="brass" opacity={0.9} />
      </Animated.View>
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
        }}
      >
        {children}
      </View>
    </View>
  )
}

// ── Enamel lamp swatch ──────────────────────────────────────────────────────
// The wizard's color swatch, matching the theme's ColorPicker: an enamel
// indicator lamp in a machined brass collet. Selected lamps are LIT (bright
// collet, glow halo, strong specular); taken-by-other lamps fade out.
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
  const id = `wiz-lamp-${seed}-${color.replace('#', '')}`
  const c = canvas / 2
  const collet = selected ? 20 : 17
  const lens = collet - 4.5

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
            ? { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.85, shadowRadius: 9 }
            : {}),
        }}
      >
        <Svg width={canvas} height={canvas} viewBox={`0 0 ${canvas} ${canvas}`}>
          <Defs>
            <RadialGradient id={`${id}-collet`} cx="35%" cy="30%" rx="70%" ry="70%">
              <Stop offset="0%" stopColor={selected ? '#F7E6BB' : BRASS_BRIGHT} stopOpacity={1} />
              <Stop offset="55%" stopColor={BRASS} stopOpacity={1} />
              <Stop offset="100%" stopColor="#7E571E" stopOpacity={1} />
            </RadialGradient>
            <RadialGradient id={`${id}-lens`} cx="34%" cy="28%" rx="68%" ry="68%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={selected ? 0.95 : 0.5} />
              <Stop offset="38%" stopColor={color} stopOpacity={1} />
              <Stop offset="100%" stopColor={color} stopOpacity={selected ? 0.9 : 0.55} />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c} r={collet} fill={`url(#${id}-collet)`} stroke="rgba(0,0,0,0.55)" strokeWidth={0.7} />
          <Circle cx={c} cy={c} r={collet - 2.6} fill="#100A05" />
          <Circle cx={c} cy={c} r={lens} fill={`url(#${id}-lens)`} />
          <Circle cx={c - lens * 0.35} cy={c - lens * 0.4} r={lens * 0.17} fill="#FFFFFF" opacity={selected ? 0.85 : 0.4} />
        </Svg>
      </View>
    </Pressable>
  )
}

// ── "Add Crew" plate button ─────────────────────────────────────────────────
// An iron instrument plate with a small turning gear at the leading edge and
// engraved Cinzel lettering — quiet until pressed, like the rest of the
// machine.
export function SteampunkAddCrewButton({ onPress }: { onPress: () => void }) {
  const spin = useLinearLoop(8000)
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  return (
    <Pressable
      onPress={onPress}
      // Conditional spread (not ternary-to-undefined) — on press-out RN
      // normalizes `transform: undefined` to null and hands it to
      // processTransform, which throws "Cannot read property 'forEach' of
      // null". Omitting the key entirely when not pressed avoids it.
      style={({ pressed }) => ({
        marginTop: 4,
        ...(pressed ? { transform: [{ translateY: 1 }] } : null),
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: IRON_PANEL,
          borderWidth: 1,
          borderColor: HAIRLINE,
          borderRadius: 9,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          overflow: 'hidden',
          ...DEPTH_SHADOW,
        }}
      >
        {/* engraved inner rule */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            right: 3,
            bottom: 3,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: 'rgba(232,169,59,0.10)',
          }}
        />
        <Animated.View style={{ width: 22, height: 22, transform: [{ rotate: rot }] }}>
          <Gear size={22} teeth={10} tone="brass" />
        </Animated.View>
        <Text
          style={{
            fontFamily: 'Cinzel_700Bold',
            fontSize: 12,
            letterSpacing: 2.2,
            textTransform: 'uppercase',
            color: PARCH,
            includeFontPadding: false,
          }}
        >
          Add Crew Member
        </Text>
      </View>
    </Pressable>
  )
}
