import React from 'react'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
} from 'react-native'
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import type { ButtonProps } from '../../../types'
import {
  CUT_CHIP,
  ICE,
  ICE_DEEP,
  MILLED,
  STEEL_HI,
  TEXT,
  VOID,
  chamferPath,
  useMeasuredSize,
  usePressTravel,
  useSvgId,
} from './_ship'

// Space Button — a machined key with real travel.
//
//   primary   → ice-lit face, hull-dark legend. The one "armed" control.
//   secondary → black glass with a powered ice hairline and ice legend.
//   outline   → bare steel hairline, instrument-white legend.
//
// The press is physical, not a fade: the key tips away from the finger on a
// perspective transform and settles on a spring (`usePressTravel`), while the
// status lamp on its leading edge comes up to full. Both run off the same
// native-driver value, so one gesture drives one animation and the JS thread
// never sees a frame of it.
export function SpaceButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: ButtonProps) {
  const { tokens } = useTheme()
  const { size, onLayout } = useMeasuredSize()
  const { depth, transform, onPressIn, onPressOut } = usePressTravel()
  const faceId = useSvgId('btnFace')

  const isPrimary = variant === 'primary'
  const isSecondary = variant === 'secondary'
  const inert = disabled || loading

  const legendColor = isPrimary ? VOID : isSecondary ? ICE : TEXT
  const edgeColor = isPrimary ? '#BFF4FF' : isSecondary ? ICE : STEEL_HI
  const lampColor = isPrimary ? VOID : ICE

  // Face gradient. Primary is a lit ice face; the other two are glass at
  // different strengths, so only the alpha changes between them.
  const faceStops = isPrimary
    ? [
        { offset: '0', color: '#8FF2FF' },
        { offset: '0.45', color: ICE },
        { offset: '1', color: ICE_DEEP },
      ]
    : isSecondary
      ? [
          { offset: '0', color: 'rgba(19,28,39,0.95)' },
          { offset: '1', color: 'rgba(6,10,17,0.95)' },
        ]
      : [
          { offset: '0', color: 'rgba(19,28,39,0.55)' },
          { offset: '1', color: 'rgba(6,10,17,0.60)' },
        ]

  // Lamp on the leading edge: dim at rest, full under the finger.
  const lampOpacity = depth.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] })

  return (
    <Pressable
      onPress={() => {
        if (inert) return
        onPress()
      }}
      onPressIn={inert ? undefined : onPressIn}
      onPressOut={inert ? undefined : onPressOut}
      disabled={inert}
      onLayout={onLayout}
      style={{ opacity: inert ? 0.45 : 1 }}
    >
      <Animated.View
        style={{
          minHeight: 48,
          paddingVertical: 14,
          paddingHorizontal: 22,
          alignItems: 'center',
          justifyContent: 'center',
          transform,
        }}
      >
        {size && size.width > 1 && size.height > 1 ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width={size.width} height={size.height}>
              <Defs>
                {/* Stops are mapped from a plain array rather than branched as
                    JSX fragments — react-native-svg types gradient children as
                    an element array, and a Fragment there fails to typecheck. */}
                <SvgLinearGradient id={faceId} x1="0" y1="0" x2="0.2" y2="1">
                  {faceStops.map((stop) => (
                    <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
                  ))}
                </SvgLinearGradient>
              </Defs>
              <Path
                d={chamferPath(size.width, size.height, CUT_CHIP)}
                fill={`url(#${faceId})`}
              />
              <Path
                d={chamferPath(size.width, size.height, CUT_CHIP, 0.75)}
                fill="none"
                stroke={edgeColor}
                strokeOpacity={isPrimary ? 0.85 : 0.42}
                strokeWidth={1.5}
              />
              {/* Bevel: a bright milled top edge and a dark underside. This
                  pair is what sells a flat fill as a raised key. */}
              <Path
                d={`M ${(CUT_CHIP.tl ?? 0) + 2} 2 L ${size.width - 3} 2`}
                stroke={isPrimary ? '#DFFAFF' : MILLED}
                strokeOpacity={isPrimary ? 0.9 : 0.7}
                strokeWidth={1.2}
              />
              <Path
                d={`M 3 ${size.height - 2} L ${
                  size.width - (CUT_CHIP.br ?? 0) - 2
                } ${size.height - 2}`}
                stroke={VOID}
                strokeOpacity={isPrimary ? 0.32 : 0.6}
                strokeWidth={1.2}
              />
            </Svg>
          </View>
        ) : null}

        {/* Status lamp — a 3px bar hugging the leading chamfer. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 7,
            top: '36%',
            bottom: '36%',
            width: 3,
            backgroundColor: lampColor,
            opacity: lampOpacity,
          }}
        />

        {loading ? (
          <ActivityIndicator color={legendColor} />
        ) : (
          <Text
            numberOfLines={1}
            style={legendStyle(tokens.fontDisplay, legendColor, isPrimary)}
          >
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  )
}

function legendStyle(fontFamily: string, color: string, isPrimary: boolean): TextStyle {
  return {
    color,
    fontFamily,
    fontSize: 13,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    // Only the dark-on-light primary gets a lift shadow; on the glass variants
    // it would just muddy an already lower-contrast legend.
    textShadowColor: isPrimary ? 'rgba(255,255,255,0.30)' : 'transparent',
    textShadowRadius: isPrimary ? 3 : 0,
    textShadowOffset: { width: 0, height: 1 },
    marginLeft: 8,
  }
}
