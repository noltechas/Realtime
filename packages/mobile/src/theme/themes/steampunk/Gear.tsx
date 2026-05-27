import React from 'react'
import Svg, { Circle, Path, G, Defs, RadialGradient, Stop } from 'react-native-svg'

// Steampunk Gear primitive — a brass cog with a configurable tooth count.
// Used everywhere from the backdrop's giant clockwork to the song-card art
// frame. Teeth are rectangular trapezoids around the rim; the body has an
// outer ring + inner hub + three rivet holes around the hub. Colors come
// from the caller so the same SVG can render in aged brass, polished copper,
// or oxidised verdigris.
export const Gear = React.memo(function Gear({
  size,
  teeth = 12,
  rivets: rivetCount = 3,
  bodyColor = '#B8762D',
  edgeColor = '#7A4D1A',
  hubColor = '#5C3A12',
  highlightColor = '#E8C078',
  opacity = 1,
}: {
  size: number
  teeth?: number
  /** Number of rivet holes around the hub. 0 omits them entirely. */
  rivets?: number
  bodyColor?: string
  edgeColor?: string
  hubColor?: string
  highlightColor?: string
  opacity?: number
}) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 2
  const innerR = outerR * 0.78
  const hubR = outerR * 0.28
  const holeR = outerR * 0.085
  const rivetOrbitR = outerR * 0.5
  const gradId = `gear-grad-${size}-${teeth}`

  // Build the toothed silhouette as a single path string so the rim looks
  // unified rather than a stack of rectangles.
  let toothPath = ''
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2 - Math.PI / teeth / 2
    const a1 = a0 + Math.PI / teeth / 2
    const a2 = a1 + (Math.PI / teeth) * 0.5
    const a3 = a2 + Math.PI / teeth / 2
    const inner = innerR
    const outer = outerR
    const p = (a: number, r: number) => `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`
    toothPath += `${i === 0 ? 'M' : 'L'} ${p(a0, inner)} L ${p(a1, outer)} L ${p(a2, outer)} L ${p(a3, inner)} `
  }
  toothPath += 'Z'

  // Rivet holes evenly spaced around the hub. Caller passes `rivetCount` so
  // gears in lists can each get their own deterministic random count without
  // every gear looking identical.
  const rivets: { x: number; y: number }[] = []
  for (let i = 0; i < rivetCount; i++) {
    const a = (i / rivetCount) * Math.PI * 2 - Math.PI / 2
    rivets.push({
      x: cx + Math.cos(a) * rivetOrbitR,
      y: cy + Math.sin(a) * rivetOrbitR,
    })
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} opacity={opacity}>
      <Defs>
        <RadialGradient id={gradId} cx="35%" cy="30%" rx="70%" ry="70%">
          <Stop offset="0%" stopColor={highlightColor} stopOpacity={1} />
          <Stop offset="55%" stopColor={bodyColor} stopOpacity={1} />
          <Stop offset="100%" stopColor={edgeColor} stopOpacity={1} />
        </RadialGradient>
      </Defs>
      {/* Toothed body with gradient shading */}
      <Path d={toothPath} fill={`url(#${gradId})`} stroke={edgeColor} strokeWidth={1} />
      {/* Inner concentric ring — gives it engraved depth */}
      <Circle cx={cx} cy={cy} r={innerR * 0.78} fill="none" stroke={edgeColor} strokeWidth={1.2} opacity={0.7} />
      {/* Rivet plate holes */}
      {rivets.map((r, i) => (
        <G key={i}>
          <Circle cx={r.x} cy={r.y} r={holeR} fill={hubColor} />
          <Circle cx={r.x - holeR * 0.25} cy={r.y - holeR * 0.25} r={holeR * 0.45} fill={highlightColor} opacity={0.55} />
        </G>
      ))}
      {/* Center hub */}
      <Circle cx={cx} cy={cy} r={hubR} fill={hubColor} />
      <Circle cx={cx - hubR * 0.25} cy={cy - hubR * 0.25} r={hubR * 0.45} fill={highlightColor} opacity={0.7} />
    </Svg>
  )
})

// Brass rivet — a tiny dome that gets sprinkled at every plate corner. Renders
// crisp at 6–14 px; smaller and it becomes a smudge. Has a highlight dot in the
// upper-left to read as a polished hemisphere.
export const Rivet = React.memo(function Rivet({
  size = 8,
  color = '#B8762D',
  highlight = '#F0DDB5',
  shadow = '#4A2E0E',
}: {
  size?: number
  color?: string
  highlight?: string
  shadow?: string
}) {
  const id = `rivet-${size}`
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Defs>
        <RadialGradient id={id} cx="35%" cy="30%" rx="70%" ry="70%">
          <Stop offset="0%" stopColor={highlight} stopOpacity={1} />
          <Stop offset="55%" stopColor={color} stopOpacity={1} />
          <Stop offset="100%" stopColor={shadow} stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <Circle cx={5} cy={5} r={4} fill={`url(#${id})`} stroke={shadow} strokeWidth={0.5} />
    </Svg>
  )
})
