import React, { useEffect, useRef } from 'react'
import {
  Animated,
  Pressable,
  Text,
  View,
  type ViewStyle,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg'

interface NwordPassCardProps {
  holderName: string
  identifier: string
  variant: 'permanent' | 'one-time'
  giftedBy?: string | null
  onShare?: () => void
  compact?: boolean
  style?: ViewStyle
}

const GOLD = '#F4D67A'
const GOLD_DEEP = '#9A7224'
const INK = '#080909'

function SecurityPattern() {
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, opacity: 0.32 }}
    >
      <Defs>
        <Pattern
          id="micro-lines"
          width="22"
          height="22"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(28)"
        >
          <Line x1="0" y1="2" x2="22" y2="2" stroke={GOLD} strokeWidth="0.7" />
          <Line x1="0" y1="9" x2="22" y2="9" stroke={GOLD} strokeWidth="0.35" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#micro-lines)" />
      <Circle cx="88%" cy="22%" r="46" fill="none" stroke={GOLD} strokeWidth="0.8" />
      <Circle cx="88%" cy="22%" r="35" fill="none" stroke={GOLD} strokeWidth="0.35" />
    </Svg>
  )
}

export function NwordPassCard({
  holderName,
  identifier,
  variant,
  giftedBy,
  onShare,
  compact = false,
  style,
}: NwordPassCardProps) {
  const sweep = useRef(new Animated.Value(-1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1100),
        Animated.timing(sweep, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.delay(2400),
        Animated.timing(sweep, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [sweep])

  const serial = identifier.replace(/-/g, '').slice(0, 8).toUpperCase()
  const isPermanent = variant === 'permanent'

  return (
    <View
      style={[
        {
          width: '100%',
          minHeight: compact ? 182 : 214,
          borderRadius: 22,
          backgroundColor: INK,
          borderWidth: 1,
          borderColor: '#D5B45A',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.34,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 12 },
          elevation: 14,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={['#191B1B', '#080909', '#12100A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <SecurityPattern />

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -70,
          bottom: -70,
          width: 74,
          backgroundColor: 'rgba(255,245,190,0.13)',
          transform: [
            { rotate: '16deg' },
            {
              translateX: sweep.interpolate({
                inputRange: [-1, 1],
                outputRange: [-130, 430],
              }),
            },
          ],
        }}
      />

      <View style={{ padding: compact ? 18 : 22, flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View>
            <Text
              style={{
                color: '#B99A4C',
                fontSize: 9,
                fontWeight: '800',
                letterSpacing: 2.6,
              }}
            >
              REALTIME KARAOKE
            </Text>
            <Text
              style={{
                color: '#F8E7A9',
                fontSize: compact ? 24 : 29,
                lineHeight: compact ? 30 : 35,
                fontWeight: '900',
                letterSpacing: -0.6,
                marginTop: 5,
              }}
            >
              N-WORD PASS
            </Text>
          </View>

          <LinearGradient
            colors={['#FFF1AF', '#B1842D', '#F6DD82']}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#FFECAA',
            }}
          >
            <Text style={{ color: '#17140C', fontSize: 18, fontWeight: '900' }}>N</Text>
          </LinearGradient>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: 'rgba(244,214,122,0.38)',
            marginVertical: compact ? 14 : 18,
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: '#947C44',
                fontSize: 8,
                fontWeight: '800',
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              ISSUED TO
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: '#FFF9E5',
                fontSize: compact ? 18 : 21,
                fontWeight: '800',
              }}
            >
              {holderName || 'Guest'}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: '#BCA66B',
                fontSize: 10,
                marginTop: 4,
              }}
            >
              {isPermanent
                ? 'Permanent host authorization'
                : 'One song · Gifted by ' + (giftedBy || 'a pass holder')}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#8F793F', fontSize: 7, letterSpacing: 1.5 }}>
              SERIAL
            </Text>
            <Text
              style={{
                color: GOLD,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1.2,
                marginTop: 3,
              }}
            >
              {serial || 'PENDING'}
            </Text>
          </View>
        </View>

        {isPermanent && onShare ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share a one-time N-Word Pass"
            onPress={onShare}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              marginTop: 16,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: pressed ? GOLD : GOLD_DEEP,
              backgroundColor: pressed
                ? 'rgba(244,214,122,0.16)'
                : 'rgba(8,9,9,0.62)',
              paddingHorizontal: 16,
              paddingVertical: 9,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
            })}
          >
            <Text style={{ color: GOLD, fontSize: 13, fontWeight: '900' }}>↗</Text>
            <Text
              style={{
                color: '#F8E7A9',
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 1.2,
              }}
            >
              SHARE ONE-TIME PASS
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
