import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { NwordPassGiftRow } from '@karaoke/shared'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNwordPasses } from '../hooks/useNwordPasses'
import { useProfile } from '../hooks/useProfile'
import { useSession } from '../hooks/useSession'
import { useSessionRow } from '../hooks/useSessionRow'
import { NwordPassCard } from './NwordPassCard'

const AUTO_DISMISS_MS = 6800
const { width: SCREEN_WIDTH } = Dimensions.get('window')

export function NwordPassGiftOverlay() {
  const insets = useSafeAreaInsets()
  const { unseenGift, acknowledgeGift } = useNwordPasses()
  const { profile } = useProfile()
  const { session } = useSession()
  const sessionRow = useSessionRow(session?.sessionId)
  const [activeGift, setActiveGift] = useState<NwordPassGiftRow | null>(null)
  const closingRef = useRef(false)
  const awardsPhase = sessionRow?.awards_reveal
    ? (sessionRow.awards_reveal.phase as string)
    : null
  const awardsRevealActive =
    awardsPhase !== null && awardsPhase !== 'idle' && awardsPhase !== 'done'

  const backdrop = useRef(new Animated.Value(0)).current
  const cardScale = useRef(new Animated.Value(0.78)).current
  const cardY = useRef(new Animated.Value(90)).current
  const cardRotate = useRef(new Animated.Value(-5)).current
  const headlineOpacity = useRef(new Animated.Value(0)).current
  const headlineY = useRef(new Animated.Value(18)).current
  const haloScale = useRef(new Animated.Value(0.2)).current
  const haloOpacity = useRef(new Animated.Value(0)).current
  const continueOpacity = useRef(new Animated.Value(0)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const close = useCallback(() => {
    if (!activeGift || closingRef.current) return
    closingRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)

    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.94,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(cardY, {
        toValue: 34,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(headlineOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const giftId = activeGift.id
      setActiveGift(null)
      closingRef.current = false
      void acknowledgeGift(giftId)
    })
  }, [
    activeGift,
    acknowledgeGift,
    backdrop,
    cardScale,
    cardY,
    headlineOpacity,
  ])

  useEffect(() => {
    // A native awards ceremony modal has priority. Keep the gift unseen and
    // present it immediately after the host ends the ceremony instead of
    // letting two full-screen reveals compete.
    if (
      !unseenGift ||
      activeGift ||
      awardsRevealActive ||
      closingRef.current
    ) return
    setActiveGift(unseenGift)
  }, [unseenGift, activeGift, awardsRevealActive])

  useEffect(() => {
    if (!activeGift) return

    backdrop.setValue(0)
    cardScale.setValue(0.78)
    cardY.setValue(90)
    cardRotate.setValue(-5)
    headlineOpacity.setValue(0)
    headlineY.setValue(18)
    haloScale.setValue(0.2)
    haloOpacity.setValue(0)
    continueOpacity.setValue(0)

    Animated.sequence([
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(haloScale, {
          toValue: 1,
          damping: 12,
          stiffness: 90,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          damping: 11,
          stiffness: 118,
          mass: 0.72,
          useNativeDriver: true,
        }),
        Animated.spring(cardY, {
          toValue: 0,
          damping: 13,
          stiffness: 105,
          mass: 0.7,
          useNativeDriver: true,
        }),
        Animated.spring(cardRotate, {
          toValue: 0,
          damping: 12,
          stiffness: 110,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(headlineOpacity, {
          toValue: 1,
          duration: 430,
          useNativeDriver: true,
        }),
        Animated.timing(headlineY, {
          toValue: 0,
          duration: 430,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(900),
      Animated.timing(continueOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()

    timerRef.current = setTimeout(close, AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [
    activeGift?.id,
    backdrop,
    cardScale,
    cardY,
    cardRotate,
    headlineOpacity,
    headlineY,
    haloScale,
    haloOpacity,
    continueOpacity,
    close,
  ])

  if (!activeGift) return null

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <Animated.View
        accessibilityViewIsModal
        style={{
          flex: 1,
          opacity: backdrop,
        }}
      >
        <Pressable
          onPress={close}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: insets.top + 26,
            paddingBottom: insets.bottom + 26,
            paddingHorizontal: 22,
            backgroundColor: '#050606',
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(244,214,122,0.20)', 'rgba(8,9,9,0)', 'rgba(154,114,36,0.13)']}
            start={{ x: 0.05, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />

          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: SCREEN_WIDTH * 1.1,
              height: SCREEN_WIDTH * 1.1,
              borderRadius: SCREEN_WIDTH,
              borderWidth: 1,
              borderColor: 'rgba(244,214,122,0.24)',
              backgroundColor: 'rgba(244,214,122,0.035)',
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            }}
          />

          <Animated.View
            style={{
              alignItems: 'center',
              opacity: headlineOpacity,
              transform: [{ translateY: headlineY }],
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                color: '#B99A4C',
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 4,
                marginBottom: 8,
              }}
            >
              ACCESS GRANTED
            </Text>
            <Text
              style={{
                color: '#FFF8DF',
                fontSize: 28,
                fontWeight: '900',
                letterSpacing: -0.7,
                textAlign: 'center',
              }}
            >
              A one-time pass is yours.
            </Text>
            <Text
              style={{
                color: '#B8B3A4',
                fontSize: 14,
                lineHeight: 20,
                textAlign: 'center',
                marginTop: 9,
                maxWidth: 330,
              }}
            >
              {activeGift.giver_name_snapshot} shared their N-Word Pass with you.
              It will apply automatically to your next eligible song.
            </Text>
          </Animated.View>

          <Animated.View
            style={{
              width: '100%',
              maxWidth: 390,
              transform: [
                { translateY: cardY },
                { scale: cardScale },
                {
                  rotate: cardRotate.interpolate({
                    inputRange: [-5, 0],
                    outputRange: ['-5deg', '0deg'],
                  }),
                },
              ],
            }}
          >
            <NwordPassCard
              holderName={profile?.name || 'Guest'}
              identifier={activeGift.id}
              variant="one-time"
              giftedBy={activeGift.giver_name_snapshot}
              compact
            />
          </Animated.View>

          <Animated.Text
            style={{
              color: '#847B66',
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 1.4,
              marginTop: 28,
              opacity: continueOpacity,
            }}
          >
            TAP ANYWHERE TO CONTINUE
          </Animated.Text>
        </Pressable>
      </Animated.View>
    </Modal>
  )
}
