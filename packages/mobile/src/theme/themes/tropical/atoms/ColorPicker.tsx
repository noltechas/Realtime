import React, { useEffect, useRef } from 'react'
import { Animated, ScrollView, Text, View } from 'react-native'
import Svg from 'react-native-svg'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import type { ColorPickerProps } from '../../../types'
import { Bead3D, Hibiscus3D, MUTE, Press, RopeSeg, sans, useSize } from './_tropical'

// Tropical color picker — a lei being strung: the swatches are glossy beads
// threaded on a real twisted cord, and the color you choose BLOOMS — the bead
// springs open into a full dimensional hibiscus in that color (petal shading,
// stamen and all). Deselect and it closes back into a bead. One spring, one
// metaphor, zero checkmarks.

const CELL = 58
const BEAD = 36
const BLOOM = 54

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
      style={{ width: CELL, height: CELL + 6, alignItems: 'center', justifyContent: 'center' }}
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

export function ColorPicker({ value, onChange, label = 'Your Color' }: ColorPickerProps) {
  const [size, onLayout] = useSize()

  return (
    <View onLayout={onLayout}>
      <Text style={[sans(12, 'bold', MUTE), { paddingHorizontal: 24, marginBottom: 0, letterSpacing: 1.3, textTransform: 'uppercase' }]}>
        {label}
      </Text>

      <View>
        {/* the cord the beads are strung on — a shallow catenary sag */}
        {size ? (
          <Svg
            pointerEvents="none"
            width={size.w}
            height={26}
            style={{ position: 'absolute', top: 8 + (CELL + 6) / 2 - 13 }}
          >
            <RopeSeg x1={10} y1={9} x2={size.w / 2} y2={17} width={2.6} />
            <RopeSeg x1={size.w / 2} y1={17} x2={size.w - 10} y2={9} width={2.6} />
          </Svg>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 2, paddingVertical: 8, alignItems: 'center' }}
        >
          {UNIVERSAL_SINGER_COLORS.map((c, i) => (
            <Swatch key={c.color} color={c.color} selected={i === value} onPress={() => onChange(i)} />
          ))}
        </ScrollView>
      </View>
    </View>
  )
}
