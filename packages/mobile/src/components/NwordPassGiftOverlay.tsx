import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
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

export function NwordPassGiftOverlay() {
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const { unseenGift, acknowledgeGift } = useNwordPasses()
  const { profile } = useProfile()
  const { session } = useSession()
  const sessionRow = useSessionRow(session?.sessionId)
  const [activeGift, setActiveGift] = useState<NwordPassGiftRow | null>(null)
  const [cardReady, setCardReady] = useState(false)
  const [canDismiss, setCanDismiss] = useState(false)
  const [presentationVisible, setPresentationVisible] = useState(false)
  const [cardPaused, setCardPaused] = useState(false)
  const closingRef = useRef(false)
  const presentationStartedRef = useRef(false)
  const entranceAnimationRef =
    useRef<Animated.CompositeAnimation | null>(null)

  const awardsPhase = sessionRow?.awards_reveal
    ? (sessionRow.awards_reveal.phase as string)
    : null
  const awardsRevealActive =
    awardsPhase !== null && awardsPhase !== 'idle' && awardsPhase !== 'done'

  const backdropOpacity = useRef(new Animated.Value(0)).current
  const ambientOpacity = useRef(new Animated.Value(0)).current
  const ambientScale = useRef(new Animated.Value(0.72)).current
  const cardY = useRef(new Animated.Value(-0.62)).current
  const cardZ = useRef(new Animated.Value(-1.55)).current
  const cardScale = useRef(new Animated.Value(0.76)).current
  const cardRotateZ = useRef(new Animated.Value(-0.11)).current
  const cardTiltX = useRef(new Animated.Value(0.1)).current
  const messageOpacity = useRef(new Animated.Value(0)).current
  const messageY = useRef(new Animated.Value(24)).current
  const ruleScale = useRef(new Animated.Value(0)).current
  const continueOpacity = useRef(new Animated.Value(0)).current
  const presentationTransform = useMemo(
    () => ({
      translateY: cardY,
      translateZ: cardZ,
      scale: cardScale,
      rotateZ: cardRotateZ,
      tiltX: cardTiltX,
      initial: {
        translateY: -0.62,
        translateZ: -1.55,
        scale: 0.76,
        rotateZ: -0.11,
        tiltX: 0.1,
      },
    }),
    [cardRotateZ, cardScale, cardTiltX, cardY, cardZ],
  )

  const resetAnimation = useCallback(() => {
    entranceAnimationRef.current?.stop()
    entranceAnimationRef.current = null
    backdropOpacity.setValue(0)
    ambientOpacity.setValue(0)
    ambientScale.setValue(0.72)
    cardY.setValue(-0.62)
    cardZ.setValue(-1.55)
    cardScale.setValue(0.76)
    cardRotateZ.setValue(-0.11)
    cardTiltX.setValue(0.1)
    messageOpacity.setValue(0)
    messageY.setValue(24)
    ruleScale.setValue(0)
    continueOpacity.setValue(0)
  }, [
    ambientOpacity,
    ambientScale,
    backdropOpacity,
    cardRotateZ,
    cardScale,
    cardTiltX,
    cardY,
    cardZ,
    continueOpacity,
    messageOpacity,
    messageY,
    ruleScale,
  ])

  const close = useCallback(() => {
    if (!activeGift || !canDismiss || closingRef.current) return
    closingRef.current = true
    setCanDismiss(false)

    entranceAnimationRef.current?.stop()
    entranceAnimationRef.current = null

    Animated.parallel([
      Animated.timing(ambientOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(cardY, {
        toValue: 0.42,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(cardScale, {
        toValue: 0.94,
        duration: 300,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(cardZ, {
        toValue: -0.72,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(cardRotateZ, {
        toValue: 0.035,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(continueOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const giftId = activeGift.id
      // Keep the texture-backed Filament scene alive after dismissal. The
      // library can double-destroy its duplicated holder-name material when
      // the model and texture modifier unmount together. A hidden, paused
      // scene is safe to reuse for the next gift and costs no render frames.
      setPresentationVisible(false)
      setCardPaused(true)
      presentationStartedRef.current = false
      closingRef.current = false
      void acknowledgeGift(giftId)
    })
  }, [
    activeGift,
    acknowledgeGift,
    ambientOpacity,
    canDismiss,
    cardRotateZ,
    cardScale,
    cardY,
    cardZ,
    continueOpacity,
    messageOpacity,
  ])

  useEffect(() => {
    if (
      !unseenGift ||
      presentationVisible ||
      unseenGift.id === activeGift?.id ||
      awardsRevealActive ||
      closingRef.current
    ) {
      return
    }

    resetAnimation()
    presentationStartedRef.current = false
    if (!activeGift) setCardReady(false)
    setCanDismiss(false)
    setCardPaused(false)
    setPresentationVisible(true)
    setActiveGift(unseenGift)
  }, [
    activeGift,
    awardsRevealActive,
    presentationVisible,
    resetAnimation,
    unseenGift,
  ])

  useEffect(() => {
    if (
      !activeGift ||
      !cardReady ||
      presentationStartedRef.current
    ) {
      return
    }
    presentationStartedRef.current = true

    const entranceAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 460,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ambientOpacity, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ambientScale, {
          toValue: 1,
          duration: 820,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardY, {
          toValue: 0.07,
          duration: 780,
          easing: Easing.bezier(0.14, 0.84, 0.2, 1),
          useNativeDriver: false,
        }),
        Animated.timing(cardScale, {
          toValue: 1.012,
          duration: 780,
          easing: Easing.bezier(0.14, 0.84, 0.2, 1),
          useNativeDriver: false,
        }),
        Animated.timing(cardZ, {
          toValue: 0.06,
          duration: 780,
          easing: Easing.bezier(0.14, 0.84, 0.2, 1),
          useNativeDriver: false,
        }),
        Animated.timing(cardRotateZ, {
          toValue: 0.014,
          duration: 780,
          easing: Easing.bezier(0.14, 0.84, 0.2, 1),
          useNativeDriver: false,
        }),
        Animated.timing(cardTiltX, {
          toValue: -0.02,
          duration: 780,
          easing: Easing.bezier(0.14, 0.84, 0.2, 1),
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.spring(cardY, {
          toValue: 0,
          stiffness: 210,
          damping: 20,
          mass: 0.72,
          useNativeDriver: false,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          stiffness: 210,
          damping: 20,
          mass: 0.72,
          useNativeDriver: false,
        }),
        Animated.spring(cardZ, {
          toValue: 0,
          stiffness: 210,
          damping: 20,
          mass: 0.72,
          useNativeDriver: false,
        }),
        Animated.spring(cardRotateZ, {
          toValue: 0,
          stiffness: 190,
          damping: 19,
          mass: 0.72,
          useNativeDriver: false,
        }),
        Animated.spring(cardTiltX, {
          toValue: 0,
          stiffness: 190,
          damping: 19,
          mass: 0.72,
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 460,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(messageY, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ruleScale, {
          toValue: 1,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(380),
      Animated.timing(continueOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ])
    entranceAnimationRef.current = entranceAnimation
    entranceAnimation.start(({ finished }) => {
      entranceAnimationRef.current = null
      if (finished) setCanDismiss(true)
    })

    return () => {
      entranceAnimation.stop()
      if (entranceAnimationRef.current === entranceAnimation) {
        entranceAnimationRef.current = null
      }
    }
  }, [
    activeGift?.id,
    ambientOpacity,
    ambientScale,
    backdropOpacity,
    cardReady,
    cardRotateZ,
    cardScale,
    cardTiltX,
    cardY,
    cardZ,
    continueOpacity,
    messageOpacity,
    messageY,
    ruleScale,
  ])

  if (!activeGift) return null

  const cardWidth = Math.min(windowWidth - 44, 390)

  return (
    <View
      accessibilityViewIsModal
      accessibilityElementsHidden={!presentationVisible}
      importantForAccessibility={
        presentationVisible ? 'yes' : 'no-hide-descendants'
      }
      pointerEvents={presentationVisible ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        !presentationVisible && styles.overlayHidden,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}
      >
        <LinearGradient
          colors={['#090A0D', '#11141A', '#050506']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.08, y: 0 }}
          end={{ x: 0.92, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientBand,
          {
            opacity: ambientOpacity,
            transform: [{ scale: ambientScale }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(228,235,255,0)',
            'rgba(228,235,255,0.09)',
            'rgba(228,235,255,0)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 46,
            paddingBottom: insets.bottom + 28,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={{ width: cardWidth }}
        >
          <NwordPassCard
            holderName={profile?.name || 'Guest'}
            variant="one-time"
            compact
            presentationTransform={presentationTransform}
            paused={cardPaused}
            onReady={() => setCardReady(true)}
          />
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.messageBlock,
            {
              opacity: messageOpacity,
              transform: [{ translateY: messageY }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.rule,
              { transform: [{ scaleX: ruleScale }] },
            ]}
          />
          <Text style={styles.message}>
            {activeGift.giver_name_snapshot} has gifted you the N-Word Pass!
          </Text>
          <Text style={styles.detail}>
            Automatically applied to your next eligible song.
          </Text>
        </Animated.View>

        <Animated.View
          style={[styles.continueWrap, { opacity: continueOpacity }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close N-Word Pass gift"
            disabled={!canDismiss}
            onPress={close}
            hitSlop={20}
            style={styles.continueButton}
          >
            <Text style={styles.continueText}>TAP TO CONTINUE</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 10_000,
    elevation: 10_000,
    backgroundColor: '#050506',
    overflow: 'hidden',
  },
  overlayHidden: {
    opacity: 0,
  },
  ambientBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '25%',
    height: 250,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 19,
  },
  messageBlock: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    marginTop: 42,
  },
  rule: {
    width: 42,
    height: 2,
    marginBottom: 23,
    borderRadius: 1,
    backgroundColor: '#DCE3F2',
  },
  message: {
    color: '#F7F8FA',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.9,
    textAlign: 'center',
  },
  detail: {
    maxWidth: 320,
    marginTop: 15,
    color: '#979EAB',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  continueWrap: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
  },
  continueButton: {
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  continueText: {
    color: '#7F8794',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
})
