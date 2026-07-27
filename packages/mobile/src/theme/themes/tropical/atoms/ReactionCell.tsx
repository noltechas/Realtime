import React from 'react'
import { Animated, Text, View, type ViewStyle } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { hashKey } from '../../../helpers'
import type { ReactionCellProps } from '../../../types'
import {
  CREAM,
  ISLAND_SPOTS,
  PAPER,
  Press,
  RAMP_WALNUT,
  Timber,
  alpha,
  lift,
  tiki,
} from './_tropical'

// Tropical reaction cell — a dark walnut block from the tiki wall, with the
// emoji/icon on a POLAROID taped up at a hand-placed angle (two translucent
// washi-tape strips in one of the island spot colors, stable per label) and the
// caption on a spot-painted plank bar routed across the bottom. Pressing throws
// the reaction: the polaroid lifts toward you on the press spring while the
// block sinks — two objects, opposite directions, real depth.

const RADIUS = 17

export function ReactionCell({ onPress, onEditPress, disabled, icon, label }: ReactionCellProps) {
  const h = hashKey(label)
  const spot = ISLAND_SPOTS[h % ISLAND_SPOTS.length]
  const tiltDeg = (h % 2 === 0 ? 1 : -1) * (1.6 + (h % 3) * 0.8)

  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.955}
      style={[{ flex: 1, borderRadius: RADIUS }, lift(2), disabled ? { opacity: 0.45 } : null]}
    >
      {(progress) => (
        <Timber
          radius={RADIUS}
          ramp={RAMP_WALNUT}
          seed={`react-${label}`}
          groove
          style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 13, paddingBottom: 11, paddingHorizontal: 10 }}
        >
          {/* the taped-up polaroid */}
          <View style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              style={[
                polaroidStyle,
                {
                  transform: [
                    { rotate: `${tiltDeg}deg` },
                    { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] }) },
                    { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
                  ],
                },
              ]}
            >
              {/* washi tape across the top corners */}
              <View style={[tapeStyle, { left: -13, top: -6, backgroundColor: alpha(spot, 0.62), transform: [{ rotate: '-38deg' }] }]} />
              <View style={[tapeStyle, { right: -13, top: -6, backgroundColor: alpha(spot, 0.62), transform: [{ rotate: '38deg' }] }]} />
              {icon}
            </Animated.View>
          </View>

          {/* spot-painted caption plank */}
          <View style={[{ alignSelf: 'stretch', borderRadius: 8, marginTop: 9 }, lift(1)]}>
            <Timber
              radius={8}
              paint={spot}
              seed={`bar-${label}`}
              knot={false}
              style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 8 }}
            >
              <Text
                style={[tiki(13, '#FFFFFF'), { textAlign: 'center', textShadowColor: 'rgba(20,8,2,0.55)', textShadowOffset: { width: 0, height: 1.2 }, textShadowRadius: 1 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.62}
              >
                {label}
              </Text>
            </Timber>
          </View>

          {onEditPress ? (
            <Press onPress={onEditPress} hitSlop={8} scaleTo={0.85} style={[editStyle, lift(1)]}>
              <Svg width={13} height={13} viewBox="0 0 24 24">
                <Path
                  d="M4 20l1-4.2L15.4 5.4a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.2 19 4 20Z"
                  stroke="#4A2A10"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </Press>
          ) : null}
        </Timber>
      )}
    </Press>
  )
}

const polaroidStyle: ViewStyle = {
  width: '76%',
  maxWidth: 150,
  aspectRatio: 1,
  backgroundColor: PAPER,
  borderRadius: 4,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 5,
  elevation: 5,
}

const tapeStyle: ViewStyle = {
  position: 'absolute',
  width: 40,
  height: 13,
  borderRadius: 2,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.35)',
}

const editStyle: ViewStyle = {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 27,
  height: 27,
  borderRadius: 999,
  backgroundColor: CREAM,
  borderWidth: 1,
  borderColor: 'rgba(74,42,16,0.5)',
  alignItems: 'center',
  justifyContent: 'center',
}
