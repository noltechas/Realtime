import React, { useEffect, useRef } from 'react'
import { View, Text, Animated, Easing, type ViewStyle, type TextStyle } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import { useGlitch, GlitchText, jitterStyle } from './Crt'

const NEON_GREEN = '#00ff88'
const NEON_CYAN = '#00e5ff'
const NEON_LIME = '#aaff00'

// Cyberpunk "You're Up!" stage hero. A glitching terminal readout instead of a
// flat red headline: a green datamoshed "YOU'RE UP!" with RGB-split ghosts and
// rare horizontal tears, framed by HUD corner ticks, a blinking-cursor status
// line, and a scrolling "signal locked" boot bar — leaning fully into the SD
// Glitch display face. Reads as the moment the booth grabs your signal.
export function CyberYoureUpHero() {
  const { tokens } = useTheme()
  // Frequent, lively glitching here (this is the hero moment, not ambient
  // card chrome) — bursts every ~1.6–4.2s.
  const glitch = useGlitch({ minMs: 1600, maxMs: 4200 })

  return (
    <View style={wrapStyle}>
      <StatusLine label="> SIGNAL ACQUIRED" tokens={tokens} />

      <Animated.View style={[bracketWrapStyle, jitterStyle(glitch, 5)]}>
        <CornerTick corner="tl" />
        <CornerTick corner="tr" />
        <CornerTick corner="bl" />
        <CornerTick corner="br" />
        <View style={{ paddingHorizontal: 14, paddingVertical: 6 }}>
          <GlitchPhrase
            segments={[
              { text: 'YOU' },
              { text: "'", body: true },
              { text: 'RE UP' },
              { text: '!', body: true },
            ]}
            size={46}
            glitch={glitch}
            displayFont={tokens.fontDisplay}
            bodyFont={tokens.fontBody}
          />
        </View>
      </Animated.View>

      <BootBar />
    </View>
  )
}

// One headline line, composed of segments. Letters render in the caps-only SD
// Glitch display face; punctuation segments (`body: true`) fall to the
// full-coverage Glitch body face — SD Glitch has no apostrophe or exclamation
// glyph, so this keeps the whole phrase on-brand instead of dropping those
// characters to the system font. Each segment carries its own chromatic split.
function GlitchPhrase({
  segments,
  size,
  glitch,
  displayFont,
  bodyFont,
}: {
  segments: { text: string; body?: boolean }[]
  size: number
  glitch: ReturnType<typeof useGlitch>
  displayFont: string
  bodyFont: string
}) {
  const base: TextStyle = {
    fontWeight: '900',
    fontSize: size,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    textShadowColor: 'rgba(0,255,136,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  }
  return (
    <View style={phraseRowStyle}>
      {segments.map((seg, i) => (
        <GlitchText
          key={`${seg.text}-${i}`}
          text={seg.text}
          style={{ ...base, fontFamily: seg.body ? bodyFont : displayFont }}
          color={NEON_GREEN}
          ghostA={NEON_CYAN}
          ghostB={NEON_LIME}
          g={glitch}
        />
      ))}
    </View>
  )
}

// Blinking terminal status line with a solid cursor block.
function StatusLine({ label, tokens }: { label: string; tokens: ReturnType<typeof useTheme>['tokens'] }) {
  const blink = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0, duration: 520, easing: Easing.step0, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 520, easing: Easing.step0, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [blink])

  return (
    <View style={statusRowStyle}>
      <Text
        style={{
          fontFamily: tokens.fontBody,
          fontSize: 13,
          letterSpacing: 3,
          color: 'rgba(0,255,136,0.7)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Animated.View
        style={{ width: 9, height: 15, backgroundColor: NEON_GREEN, marginLeft: 6, opacity: blink }}
      />
    </View>
  )
}

// Corner HUD ticks (two short neon strokes per corner) framing the headline.
function CornerTick({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const v = corner.includes('t') ? { top: 0 } : { bottom: 0 }
  const h = corner.includes('l') ? { left: 0 } : { right: 0 }
  const stroke = 'rgba(0,255,136,0.85)'
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: 20, height: 20 }, v as ViewStyle, h as ViewStyle]}>
      <View style={[{ position: 'absolute', height: 2, width: 20, backgroundColor: stroke }, v as ViewStyle, h as ViewStyle]} />
      <View style={[{ position: 'absolute', width: 2, height: 20, backgroundColor: stroke }, v as ViewStyle, h as ViewStyle]} />
    </View>
  )
}

// A scanning progress bar under the headline — a bright segment that sweeps a
// dim track, like a sync/boot meter.
function BootBar() {
  const sweep = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    )
    loop.start()
    return () => loop.stop()
  }, [sweep])
  const tx = sweep.interpolate({ inputRange: [0, 1], outputRange: [-80, 200] })

  return (
    <View style={bootTrackStyle}>
      <Animated.View style={[bootFillStyle, { transform: [{ translateX: tx }] }]} />
    </View>
  )
}

const wrapStyle: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginBottom: 2,
}
const statusRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
}
const bracketWrapStyle: ViewStyle = {
  position: 'relative',
  paddingHorizontal: 8,
  paddingVertical: 6,
}
const phraseRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'center',
}
const bootTrackStyle: ViewStyle = {
  width: 220,
  height: 4,
  backgroundColor: 'rgba(0,255,136,0.14)',
  borderWidth: 1,
  borderColor: 'rgba(0,255,136,0.3)',
  overflow: 'hidden',
}
const bootFillStyle: ViewStyle = {
  width: 80,
  height: '100%',
  backgroundColor: NEON_GREEN,
}
