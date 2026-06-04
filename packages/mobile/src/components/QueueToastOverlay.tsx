import React, { useEffect, useRef } from 'react'
import { Animated, Image, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Rect } from 'react-native-svg'
import { resolveSinger } from '@karaoke/shared'
import { resolveMobileTheme } from '../theme/tokens'
import { useSessionGuests } from '../hooks/useSessionGuests'
import { useQueueToast } from '../hooks/useQueueToast'

const SHOW_MS = 4000
const ANIM_IN_MS = 320
const ANIM_OUT_MS = 260

function LockIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="10.5" width="17" height="10.5" rx="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 10.5 V7 a5 5 0 0 1 10 0 v3.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function QueueToastOverlay() {
  const insets = useSafeAreaInsets()
  const guests = useSessionGuests()
  const { toast, dismiss } = useQueueToast()

  const translateY = useRef(new Animated.Value(-120)).current
  const opacity = useRef(new Animated.Value(0)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const animateOut = (onDone?: () => void) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: ANIM_OUT_MS, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: ANIM_OUT_MS, useNativeDriver: true }),
    ]).start(() => onDone?.())
  }

  useEffect(() => {
    if (!toast) return

    translateY.setValue(-120)
    opacity.setValue(0)

    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: ANIM_IN_MS, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: ANIM_IN_MS, useNativeDriver: true }),
    ]).start()

    timerRef.current = setTimeout(() => {
      animateOut(dismiss)
    }, SHOW_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [toast?.id])

  if (!toast) return null

  const tokens = resolveMobileTheme(toast.stageTheme)
  const singers = toast.singerConfigs.map((c) => resolveSinger(c, guests))
  const names = singers.map((s) => s.name).filter(Boolean)
  const displayName =
    names.length === 0
      ? (toast.addedByName ?? 'Someone')
      : names.length <= 2
        ? names.join(' & ')
        : names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1]

  const pics = singers.map((s) => s.profilePicture).filter((p): p is string => !!p)

  const br = tokens.cornerStyle === 'sharp' ? 0 : 14

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 12,
        right: 12,
        zIndex: 9999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <Pressable
        onPress={() => animateOut(dismiss)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: tokens.white,
          borderRadius: br,
          padding: 12,
          gap: 10,
          shadowColor: '#000',
          shadowOpacity: tokens.isDark ? 0.5 : 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
          borderWidth: tokens.cardBorderWidth > 1 ? tokens.cardBorderWidth : 0,
          borderColor: tokens.black,
        }}
      >
        {toast.isHidden ? (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: br - 2,
              backgroundColor: tokens.appBg,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LockIcon color={tokens.softViolet} />
          </View>
        ) : toast.trackArtUrl ? (
          <Image
            source={{ uri: toast.trackArtUrl }}
            style={{ width: 48, height: 48, borderRadius: br - 2, flexShrink: 0 }}
          />
        ) : null}

        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{ color: tokens.black, fontFamily: tokens.fontBody, fontSize: 13, opacity: 0.75 }}
            numberOfLines={1}
          >
            {toast.isHidden
              ? `${displayName} signed up for a secret song`
              : `${displayName} signed up to sing`}
          </Text>
          {!toast.isHidden && (
            <>
              <Text
                style={{
                  color: tokens.black,
                  fontFamily: tokens.fontDisplay,
                  fontSize: 15,
                  letterSpacing: tokens.displayUppercase ? tokens.displayLetterSpacing : 0,
                }}
                numberOfLines={1}
              >
                {toast.trackName}
              </Text>
              <Text
                style={{ color: tokens.muted, fontFamily: tokens.fontBody, fontSize: 12 }}
                numberOfLines={1}
              >
                by {toast.trackArtist}
              </Text>
            </>
          )}
          {toast.isHidden && (
            <Text style={{ color: tokens.muted, fontFamily: tokens.fontBody, fontSize: 12 }}>
              title hidden until it plays
            </Text>
          )}
        </View>

        {pics.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 4, flexShrink: 0 }}>
            {pics.slice(0, 3).map((pic, i) => (
              <Image
                key={i}
                source={{ uri: pic }}
                style={{ width: 32, height: 32, borderRadius: 16 }}
              />
            ))}
          </View>
        )}
      </Pressable>
    </Animated.View>
  )
}
