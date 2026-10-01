import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg'
import type { ReactionCellProps } from '../../../types'
import { BONE, CANDLE, Press, Stone, archPath, gothic, useMeasured, useUid } from './_gothic'

// Gothic reaction tile: a stone tablet with a pointed niche carved into it, and
// the reaction set in the niche like an offering on an altar shelf, lit faintly
// from below. Pressing it sinks the tablet into the wall. The label is cut into
// the stone under the niche.
export function ReactionCell({ label, icon, onPress, onEditPress, disabled, index = 0 }: ReactionCellProps) {
  return (
    <View style={{ flex: 1 }}>
      <Press onPress={onPress} disabled={disabled} outerStyle={{ flex: 1 }} style={{ flex: 1, opacity: disabled ? 0.55 : 1 }}>
        <Stone
          tone="stone"
          cusp={14}
          seed={`rx-${label}-${index}`}
          style={{ flex: 1 }}
          contentStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 10 }}
        >
          <NicheBox>{icon}</NicheBox>
          <Text numberOfLines={1} style={gothic(15, BONE, 700, { marginTop: 8, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1.5 })}>
            {label}
          </Text>
        </Stone>
      </Press>
      {onEditPress ? (
        <Pressable onPress={onEditPress} hitSlop={10} style={{ position: 'absolute', top: 9, right: 9 }}>
          <View style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,10,15,0.85)', borderWidth: 1, borderColor: 'rgba(227,176,75,0.4)' }}>
            <Ionicons name="create-outline" size={15} color={CANDLE} />
          </View>
        </Pressable>
      ) : null}
    </View>
  )
}

/** The carved niche: a dark pointed recess, warm at its foot. */
function NicheBox({ children }: { children: React.ReactNode }) {
  const [size, onLayout] = useMeasured()
  const id = useUid('grxn')
  return (
    // Sized from the tile's HEIGHT (flex in the column), its width following the
    // niche's proportions, so it always fits whatever the grid gives the tile.
    <View onLayout={onLayout} style={{ flex: 1, aspectRatio: 0.86, maxWidth: '72%', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 }}>
      {size ? (
        <Svg width={size.w} height={size.h} style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id={`${id}`} cx="50%" cy="92%" rx="62%" ry="70%">
              <Stop offset="0" stopColor="#E3963C" stopOpacity={0.3} />
              <Stop offset="1" stopColor="#E3963C" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Path d={archPath(size.w, size.h, 0, 0.9)} fill="#060508" />
          <Path d={archPath(size.w, size.h, 0, 0.9)} fill={`url(#${id})`} />
          <Path d={archPath(size.w, size.h, 0.7, 0.9)} stroke="rgba(175,195,234,0.22)" strokeWidth={1.2} fill="none" />
          <Path d={archPath(size.w, size.h, 3.5, 0.9)} stroke="rgba(0,0,0,0.7)" strokeWidth={1.4} fill="none" />
          {/* the shelf the offering stands on */}
          <Path d={`M 4 ${size.h - 4} L ${size.w - 4} ${size.h - 4}`} stroke="rgba(227,176,75,0.4)" strokeWidth={1.4} />
        </Svg>
      ) : null}
      <View style={{ transform: [{ scale: 0.82 }] }}>{children}</View>
    </View>
  )
}
