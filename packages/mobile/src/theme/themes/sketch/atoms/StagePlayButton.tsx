import React, { useRef } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { PlayButtonProps } from '../../../types'
import { BLUE, Ball, GRAPHITE, Ghost, IMG, INK, Mark, ballSprite, useWaitingBounce } from './_pencil'

// Sketch play control: THE BALL. At rest it sits on a pencilled ground line,
// coloured in your pencil, the play mark inked on it, giving the odd small
// hop to say "go on". Playing, it bounces properly: squashing on the ground,
// stretching as it leaves, its shadow shrinking as it rises, the onion skins
// of the in-betweens pencilled in blue up its path and the spacing chart
// beside it, the way an animator would rough a bounce.
const D = 118
const H = 200

export function StagePlayButton({ isPlaying, singerColor, onPress }: PlayButtonProps) {
  const lift = isPlaying ? 62 : 7
  // at rest it only fidgets: a small hop, a gentle squash
  const { translateY, scaleX, scaleY } = useWaitingBounce(isPlaying ? 760 : 1800, lift, isPlaying ? 1 : 0.35)
  const press = useRef(new Animated.Value(0)).current
  const S = ballSprite(D)
  const pad = (S - D) / 2
  const ground = H - 22
  const shadowScale = translateY.interpolate({ inputRange: [-lift, 0], outputRange: [0.55, 1], extrapolate: 'clamp' })
  const shadowOpacity = translateY.interpolate({ inputRange: [-lift, 0], outputRange: [0.25, 0.6], extrapolate: 'clamp' })
  return (
    <View style={{ width: 250, height: H, alignItems: 'center' }}>
      {/* the ground, and the ball's shadow on it */}
      <Mark src={IMG.underline[1]} color={GRAPHITE} width={190} height={17} style={{ position: 'absolute', top: ground - 6, opacity: 0.75 }} />
      <Animated.Image
        source={IMG.ballShadow}
        style={{ position: 'absolute', top: ground - 9, width: D * 1.05, height: D * 0.27, tintColor: GRAPHITE, opacity: shadowOpacity, transform: [{ scaleX: shadowScale }] }}
      />
      {/* onion skins and the spacing chart, roughed in while it bounces */}
      {isPlaying ? (
        <>
          <Ghost d={D} color={BLUE} opacity={0.32} style={{ position: 'absolute', top: ground - D - pad - lift * 0.52, transform: [{ scaleX: 0.96 }, { scaleY: 1.04 }] }} />
          <Ghost d={D} color={BLUE} opacity={0.22} style={{ position: 'absolute', top: ground - D - pad - lift * 0.9 }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 250 / 2 + D / 2 + 22, top: ground - D * 0.5 - lift, height: lift + D * 0.5, width: 14, opacity: 0.7 }}>
            <View style={{ position: 'absolute', left: 6, top: 0, bottom: 0, width: 1.6, backgroundColor: BLUE }} />
            {[0, 0.07, 0.2, 0.4, 0.66, 1].map((f) => (
              <View key={f} style={{ position: 'absolute', left: 0, top: f * (lift + D * 0.5), width: 14, height: 1.6, backgroundColor: BLUE }} />
            ))}
          </View>
        </>
      ) : null}
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.timing(press, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 0, stiffness: 320, damping: 14, useNativeDriver: true }).start()}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        hitSlop={10}
        style={{ position: 'absolute', top: ground - D - pad * 2 + pad, width: S, height: S }}
      >
        <Animated.View
          style={{
            width: S,
            height: S,
            transform: [
              { translateY },
              // squash and stretch about the contact point (the ball's bottom)
              { translateY: S / 2 - pad },
              { scaleX },
              { scaleY },
              { translateY: -(S / 2 - pad) },
              { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }) },
            ],
          }}
        >
          <Ball d={D} color={singerColor} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={44} color={INK} style={{ marginLeft: isPlaying ? 0 : 5, opacity: 0.88 }} />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  )
}
