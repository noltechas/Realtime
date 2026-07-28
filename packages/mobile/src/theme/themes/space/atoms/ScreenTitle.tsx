import React from 'react'
import { Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../../../ThemeContext'
import type { ScreenTitleProps } from '../../../types'
import { ICE, MONO, STEEL_HI, TEXT_FAINT, TickLadder, useMeasuredSize } from './_ship'

// Space screen heading — a panel legend, not a page title.
//
// Three parts, which together read as something silk-screened onto hardware:
// a mono designator that names the subsystem, the title in wide display caps,
// and a machined rule whose left segment is lit ice and whose right segment
// carries an engraved index ladder. The asymmetry is the point — a centred rule
// would read as decoration.
export function SpaceScreenTitle({ title }: ScreenTitleProps) {
  const { tokens } = useTheme()
  const { size, onLayout } = useMeasuredSize()
  const designator = `SYS/${title.slice(0, 3).toUpperCase()}`

  return (
    <View>
      <Text
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: 2.2,
          color: TEXT_FAINT,
          marginBottom: 3,
        }}
      >
        {designator}
      </Text>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontSize: 26,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: tokens.black,
          textShadowColor: 'rgba(91,233,255,0.30)',
          textShadowRadius: 10,
          textShadowOffset: { width: 0, height: 0 },
        }}
        numberOfLines={1}
      >
        {title}
      </Text>
      {/* Machined rule. Measured rather than drawn at "100%" because SVG path
          data takes no percentages — the rule has to know its own pixel width
          to place the engraved ladder against its right end. */}
      <View style={{ height: 8, marginTop: 7 }} onLayout={onLayout}>
        {size && size.width > 1 ? (
          <Svg width={size.width} height={8}>
            {/* Lit segment, then the engraved remainder. */}
            <Path d="M 0 1.5 L 42 1.5" stroke={ICE} strokeWidth={2} strokeOpacity={0.9} />
            <Path
              d={`M 46 1.5 L ${size.width} 1.5`}
              stroke={STEEL_HI}
              strokeWidth={1}
              strokeOpacity={0.2}
            />
            <TickLadder
              x={52}
              y={2}
              length={Math.max(20, size.width - 62)}
              count={Math.max(6, Math.round((size.width - 62) / 14))}
              color={STEEL_HI}
              opacity={0.24}
            />
          </Svg>
        ) : null}
      </View>
    </View>
  )
}
