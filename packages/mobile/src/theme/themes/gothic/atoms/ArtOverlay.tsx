import React, { useMemo } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { useMeasured, useStorm } from './_gothic'

// Gothic stage-art overlay: the now-playing art becomes a pane of leaded glass:
// diamond quarries, the uneven sheen of old glass, light falling off to the
// edges, and it flares with the storm.
export function ArtOverlay() {
  const [size, onLayout] = useMeasured()
  const flash = useStorm()
  const leads = useMemo(() => {
    if (!size) return ''
    const out: string[] = []
    const step = 46
    const span = size.w + size.h
    for (let k = -span; k < span; k += step) {
      out.push(`M ${k} 0 L ${k + size.h * 0.62} ${size.h}`)
      out.push(`M ${k + size.h * 0.62} 0 L ${k} ${size.h}`)
    }
    return out.join(' ')
  }, [size])
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {size ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <SvgLinearGradient id="gao-sheen" x1="0" y1="0" x2="1" y2="0.25">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.35" stopColor="#FFFFFF" stopOpacity={0.1} />
              <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.02} />
              <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity={0.07} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </SvgLinearGradient>
            <RadialGradient id="gao-fall" cx="50%" cy="50%" rx="70%" ry="70%">
              <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000" stopOpacity={0.55} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill="url(#gao-sheen)" />
          <Path d={leads} stroke="#060508" strokeOpacity={0.42} strokeWidth={1.1} fill="none" />
          <Rect x={0} y={0} width={size.w} height={size.h} fill="url(#gao-fall)" />
        </Svg>
      ) : null}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#D8E0FF', opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }]} />
    </View>
  )
}
