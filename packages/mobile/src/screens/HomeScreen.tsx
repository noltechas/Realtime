import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  Animated,
  Easing,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  useFocusEffect,
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { CameraView, useCameraPermissions } from 'expo-camera'
import {
  getSessionsByIds,
  parseSessionCodeFromUrl,
  type SessionStatus,
} from '@karaoke/shared'
import type { MainTabsParamList, RootStackParamList } from '../navigation/types'
import { useTheme } from '../theme/ThemeContext'
import { themeShadow, themePressed, themeRadius, themeCardBorder, themeAccentTint } from '../theme/styles'
import { ThemedBackdrop } from '../theme/ThemedBackdrop'
import { useProfile } from '../hooks/useProfile'
import { useSession } from '../hooks/useSession'
import {
  useSessionHistory,
  type SessionHistoryEntry,
} from '../hooks/useSessionHistory'
import { supabase } from '../supabase/client'

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const min = Math.round(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  if (d < 7) return `${d}d ago`
  const w = Math.round(d / 7)
  return `${w}w ago`
}

export function HomeScreen() {
  const { tokens, styles } = useTheme()
  const navigation = useNavigation<HomeNav>()
  const insets = useSafeAreaInsets()
  const { profile } = useProfile()
  const { session, saveSession } = useSession()
  const { history, removeEntry } = useSessionHistory()

  const [statuses, setStatuses] = useState<Map<string, SessionStatus>>(new Map())
  const [statusLoading, setStatusLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()

  const fetchStatuses = useCallback(async () => {
    if (history.length === 0) {
      setStatuses(new Map())
      setStatusLoading(false)
      return
    }
    try {
      const ids = history.map((h) => h.sessionId)
      const map = await getSessionsByIds(supabase, ids)
      setStatuses(map)
    } finally {
      setStatusLoading(false)
    }
  }, [history])

  useEffect(() => {
    void fetchStatuses()
  }, [fetchStatuses])

  useFocusEffect(
    useCallback(() => {
      void fetchStatuses()
      return () => {
        setScanning(false)
      }
    }, [fetchStatuses]),
  )

  const onTapScanCard = useCallback(async () => {
    if (scanning) {
      setScanning(false)
      return
    }
    if (!permission) return
    if (!permission.granted) {
      if (permission.canAskAgain) {
        const result = await requestPermission()
        if (!result.granted) return
      } else {
        Alert.alert(
          'Camera access',
          "We need camera access to scan the host's QR code. Enable it in Settings to continue.",
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        )
        return
      }
    }
    setScanning(true)
  }, [scanning, permission, requestPermission])

  const onBarcodeScanned = useCallback(
    (data: string) => {
      const code = parseSessionCodeFromUrl(data)
      if (!code) return
      setScanning(false)
      navigation.navigate('Lobby', { code })
    },
    [navigation],
  )

  const onTapSession = useCallback(
    async (entry: SessionHistoryEntry) => {
      const status = statuses.get(entry.sessionId)
      if (!status?.isActive) {
        Alert.alert(
          status ? 'Session ended' : 'Session not found',
          status
            ? `${displayName(entry, status)} is no longer active.`
            : "We couldn't find this session anymore.",
          [
            { text: 'OK' },
            {
              text: 'Remove from history',
              style: 'destructive',
              onPress: () => void removeEntry(entry.sessionId),
            },
          ],
        )
        return
      }
      await saveSession({
        sessionId: entry.sessionId,
        sessionCode: entry.sessionCode,
        guestId: entry.guestId,
        guestName: profile?.name ?? '',
      })
      navigation.navigate('Session')
    },
    [statuses, saveSession, profile?.name, navigation, removeEntry],
  )

  const bottomPadding = insets.bottom + 96
  const sortedHistory = sortHistory(history, session?.sessionId ?? null, statuses)

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ThemedBackdrop />
      <View style={{ flex: 1, paddingBottom: bottomPadding }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 32,
          }}
        >
          <ScanCard
            scanning={scanning}
            onPress={onTapScanCard}
            onBarcodeScanned={onBarcodeScanned}
          />
        </View>

        <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontWeight: '800',
              fontSize: 12,
              letterSpacing: 2,
              color: tokens.muted,
              textTransform: 'uppercase',
            }}
          >
            Recent Sessions
          </Text>
        </View>

        {statusLoading && history.length > 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator color={tokens.hotRed} />
          </View>
        ) : history.length === 0 ? (
          <View style={{ paddingHorizontal: 24 }}>
            <View
              style={{
                alignItems: 'center',
                paddingVertical: 32,
                paddingHorizontal: 20,
                borderWidth: 2,
                borderColor: tokens.dimBorder,
                borderStyle: 'dashed',
                borderRadius: themeRadius(tokens, tokens.radius),
                backgroundColor: tokens.isDark ? themeAccentTint(tokens, 0.05) : 'rgba(255,255,255,0.5)',
              }}
            >
              <Text style={[styles.h2, { marginBottom: 6 }]}>No sessions yet</Text>
              <Text style={[styles.muted, { textAlign: 'center' }]}>
                Sessions you join will show up here so you can hop back in.
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24, gap: 12 }}>
            {sortedHistory.map((entry) => {
              const status = statuses.get(entry.sessionId)
              const isCurrent = session?.sessionId === entry.sessionId
              return (
                <SessionRow
                  key={entry.sessionId}
                  entry={entry}
                  status={status}
                  current={isCurrent}
                  onPress={() => void onTapSession(entry)}
                />
              )
            })}
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

function sortHistory(
  history: SessionHistoryEntry[],
  currentSessionId: string | null,
  statuses: Map<string, SessionStatus>,
): SessionHistoryEntry[] {
  if (!currentSessionId) return history
  const idx = history.findIndex((h) => h.sessionId === currentSessionId)
  if (idx <= 0) return history
  if (!statuses.get(currentSessionId)?.isActive) return history
  return [history[idx], ...history.slice(0, idx), ...history.slice(idx + 1)]
}

// Big black square with a QR icon inside; tap to swap the icon for a live
// camera preview. The transition uses a single animated value driving paired
// opacity + scale curves on each layer — the QR shrinks away while the camera
// zooms in. A separate "pulse" Animated.Value gives the square a brief scale
// nudge on tap as press feedback (no translation — the square doesn't move).
function ScanCard({
  scanning,
  onPress,
  onBarcodeScanned,
}: {
  scanning: boolean
  onPress: () => void
  onBarcodeScanned: (data: string) => void
}) {
  const { tokens } = useTheme()
  const SIZE = 240
  const RADIUS = themeRadius(tokens, 28)

  const swap = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(1)).current
  const [showCamera, setShowCamera] = useState(false)

  useEffect(() => {
    if (scanning) setShowCamera(true)
    Animated.timing(swap, {
      toValue: scanning ? 1 : 0,
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !scanning) setShowCamera(false)
    })
  }, [scanning, swap])

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.04,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(pulse, {
        toValue: 1,
        damping: 10,
        stiffness: 200,
        mass: 1,
        useNativeDriver: true,
      }),
    ]).start()
    onPress()
  }, [pulse, onPress])

  const qrOpacity = swap.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  })
  const qrScale = swap.interpolate({
    inputRange: [0, 0.45],
    outputRange: [1, 0.6],
    extrapolate: 'clamp',
  })
  const camOpacity = swap.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  })
  const camScale = swap.interpolate({
    inputRange: [0.45, 1],
    outputRange: [1.35, 1],
    extrapolate: 'clamp',
  })

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable onPress={handlePress}>
        <Animated.View
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: RADIUS,
            backgroundColor: tokens.isDark ? tokens.white : tokens.black,
            borderWidth: tokens.isDark ? 1 : 0,
            borderColor: tokens.accentA,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            ...themeShadow(tokens, 'lg'),
            transform: [{ scale: pulse }],
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: qrOpacity,
              transform: [{ scale: qrScale }],
            }}
          >
            <QrGlyph color={tokens.isDark ? tokens.accentA : tokens.vividYellow} size={120} />
          </Animated.View>

          {showCamera ? (
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: camOpacity,
                transform: [{ scale: camScale }],
              }}
            >
              <CameraView
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={(r) => onBarcodeScanned(r.data)}
              />
            </Animated.View>
          ) : null}
        </Animated.View>
      </Pressable>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '900',
          fontSize: 28,
          color: tokens.black,
          letterSpacing: tokens.displayUppercase ? 3 : -0.5,
          textTransform: tokens.displayUppercase ? 'uppercase' : 'none',
          marginTop: 24,
          textAlign: 'center',
          ...(tokens.isDark
            ? {
                textShadowColor: tokens.accentGlowColor,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 12,
              }
            : {}),
        }}
      >
        {scanning ? 'Point at a QR' : 'Scan to Join'}
      </Text>
    </View>
  )
}

function SessionRow({
  entry,
  status,
  current,
  onPress,
}: {
  entry: SessionHistoryEntry
  status: SessionStatus | undefined
  current: boolean
  onPress: () => void
}) {
  const { tokens } = useTheme()
  const live = status?.isActive ?? false
  const title = displayName(entry, status)
  const featured = live && current

  const backgroundColor = featured ? tokens.hotRed : tokens.white
  const titleColor = featured ? tokens.white : tokens.black
  const subtitleColor = featured ? 'rgba(255,255,255,0.85)' : tokens.muted

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor,
        ...themeCardBorder(tokens),
        borderRadius: themeRadius(tokens, tokens.radius),
        padding: 14,
        ...themeShadow(tokens, 'md'),
        ...(pressed ? themePressed(tokens) : null),
        opacity: live ? 1 : 0.78,
      })}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: themeRadius(tokens, 10),
          backgroundColor: featured
            ? 'rgba(255,255,255,0.18)'
            : live
            ? tokens.hotRed
            : tokens.creamDark,
          borderWidth: 2,
          borderColor: featured ? tokens.white : tokens.black,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontWeight: '900',
            fontSize: 20,
            color: featured ? tokens.white : live ? tokens.white : tokens.black,
          }}
        >
          {entry.sessionCode.slice(0, 2)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontWeight: '900',
            fontSize: 16,
            color: titleColor,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: tokens.fontBody,
            fontSize: 13,
            color: subtitleColor,
            marginTop: 2,
          }}
        >
          {live
            ? current
              ? "You're in this one"
              : 'Live now'
            : `Ended · joined ${relativeTime(entry.joinedAt)}`}
        </Text>
      </View>
      {featured ? (
        <View
          style={{
            backgroundColor: tokens.white,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontWeight: '900',
              fontSize: 12,
              letterSpacing: 1,
              color: tokens.hotRed,
              marginRight: 6,
            }}
          >
            CONTINUE
          </Text>
          <View
            style={{
              width: 8,
              height: 8,
              borderRightWidth: 2,
              borderTopWidth: 2,
              borderColor: tokens.hotRed,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      ) : (
        <View
          style={{
            backgroundColor: live ? tokens.hotRed : tokens.pressedOverlay,
            borderRadius: themeRadius(tokens, 999),
            paddingHorizontal: 10,
            paddingVertical: 4,
            marginRight: 6,
          }}
        >
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontWeight: '800',
              fontSize: 11,
              letterSpacing: 1,
              color: live ? tokens.white : tokens.muted,
            }}
          >
            {live ? 'LIVE' : 'ENDED'}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

function QrGlyph({ color, size = 36 }: { color: string; size?: number }) {
  const finderSize = Math.round(size * 0.38)
  const borderW = Math.max(2, Math.round(size * 0.07))
  const innerSize = Math.max(2, finderSize - borderW * 2 - 4)

  const finder = (
    <View
      style={{
        width: finderSize,
        height: finderSize,
        borderWidth: borderW,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: innerSize * 0.55,
          height: innerSize * 0.55,
          backgroundColor: color,
        }}
      />
    </View>
  )

  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', top: 0, left: 0 }}>{finder}</View>
      <View style={{ position: 'absolute', top: 0, right: 0 }}>{finder}</View>
      <View style={{ position: 'absolute', bottom: 0, left: 0 }}>{finder}</View>
      <View
        style={{
          position: 'absolute',
          bottom: Math.round(size * 0.04),
          right: Math.round(size * 0.04),
          width: Math.round(size * 0.16),
          height: Math.round(size * 0.16),
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: Math.round(size * 0.3),
          right: Math.round(size * 0.34),
          width: Math.round(size * 0.1),
          height: Math.round(size * 0.1),
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: Math.round(size * 0.1),
          right: Math.round(size * 0.32),
          width: Math.round(size * 0.1),
          height: Math.round(size * 0.1),
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: Math.round(size * 0.32),
          right: Math.round(size * 0.1),
          width: Math.round(size * 0.08),
          height: Math.round(size * 0.08),
          backgroundColor: color,
        }}
      />
    </View>
  )
}

function displayName(entry: SessionHistoryEntry, status: SessionStatus | undefined): string {
  const name = (status?.name ?? entry.sessionName ?? '').trim()
  return name || `Session ${entry.sessionCode}`
}
