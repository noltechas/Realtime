import React, { useEffect, useRef } from 'react'
import { Animated, Text, View } from 'react-native'
import Svg from 'react-native-svg'
import { UNIVERSAL_SINGER_COLORS, type SingerColor } from '@karaoke/shared'
import type { ColorPickerProps } from '../../../types'
import { Bead3D, Hibiscus3D, MUTE, Press, RopeSeg, sans, useSize } from './_tropical'

// Tropical color picker — a lei being strung: the swatches are glossy beads
// threaded on a real twisted cord, and the color you choose BLOOMS — the bead
// springs open into a full dimensional hibiscus in that color (petal shading,
// stamen and all). Deselect and it closes back into a bead. One spring, one
// metaphor, zero checkmarks.
//
// The lei is strung as TWO strands rather than one sideways-scrolling row. A
// scroller cut the last beads off at the screen edge — and a lei you can only
// see half of isn't a lei. Each strand measures itself and hangs its own cord,
// so the second (shorter) strand sags on its own arc instead of borrowing the
// first one's width.

const CELL = 44
const BEAD = 30
const BLOOM = 42
const PAD = 18
const ROW_H = CELL + 6
// Seven beads per strand fits a phone with room to spare; 13 colors then hang as
// 7 + 6.
const PER_STRAND = 7

function Swatch({ color, selected, onPress }: { color: string; selected: boolean; onPress: () => void }) {
  const v = useRef(new Animated.Value(selected ? 1 : 0)).current

  useEffect(() => {
    const a = Animated.spring(v, {
      toValue: selected ? 1 : 0,
      useNativeDriver: true,
      damping: 10,
      stiffness: 170,
      mass: 0.75,
    })
    a.start()
    return () => a.stop()
  }, [selected, v])

  return (
    <Press
      onPress={onPress}
      hitSlop={7}
      scaleTo={0.88}
      accessibilityLabel={`Pick color ${color}`}
      style={{ width: CELL, height: ROW_H, alignItems: 'center', justifyContent: 'center' }}
    >
      {/* the bead — shrinks away as the bloom opens */}
      <Animated.View
        style={{
          opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.4, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }) }],
        }}
      >
        <Bead3D size={BEAD} color={color} />
      </Animated.View>

      {/* the bloom — spins open over it */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          opacity: v,
          transform: [
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-80deg', '0deg'] }) },
          ],
        }}
      >
        <Hibiscus3D size={BLOOM} color={color} />
      </Animated.View>
    </Press>
  )
}

// One strand of the lei: a measured cord with its own shallow catenary sag, and
// the beads threaded onto it.
function Strand({
  colors,
  offset,
  value,
  onChange,
}: {
  colors: SingerColor[]
  offset: number
  value: number
  onChange: (index: number) => void
}) {
  const [size, onLayout] = useSize()

  return (
    <View style={{ alignSelf: 'flex-start' }} onLayout={onLayout}>
      {size ? (
        <Svg
          pointerEvents="none"
          width={size.w}
          height={26}
          style={{ position: 'absolute', top: ROW_H / 2 - 13 }}
        >
          <RopeSeg x1={8} y1={9} x2={size.w / 2} y2={17} width={2.6} />
          <RopeSeg x1={size.w / 2} y1={17} x2={size.w - 8} y2={9} width={2.6} />
        </Svg>
      ) : null}

      <View style={{ flexDirection: 'row', columnGap: 2, alignItems: 'center' }}>
        {colors.map((c, i) => (
          <Swatch
            key={c.color}
            color={c.color}
            selected={offset + i === value}
            onPress={() => onChange(offset + i)}
          />
        ))}
      </View>
    </View>
  )
}

export function ColorPicker({ value, onChange, label = 'Your Color' }: ColorPickerProps) {
  const strands: SingerColor[][] = []
  for (let i = 0; i < UNIVERSAL_SINGER_COLORS.length; i += PER_STRAND) {
    strands.push(UNIVERSAL_SINGER_COLORS.slice(i, i + PER_STRAND))
  }

  return (
    <View>
      <Text style={[sans(12, 'bold', MUTE), { paddingHorizontal: 24, marginBottom: 0, letterSpacing: 1.3, textTransform: 'uppercase' }]}>
        {label}
      </Text>

      <View style={{ paddingHorizontal: PAD, paddingVertical: 8, rowGap: 4 }}>
        {strands.map((colors, strandIndex) => (
          <Strand
            key={strandIndex}
            colors={colors}
            offset={strandIndex * PER_STRAND}
            value={value}
            onChange={onChange}
          />
        ))}
      </View>
    </View>
  )
}
