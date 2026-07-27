import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import {
  guestHasNwordPass,
  type KaraokeGuestRow,
} from '@karaoke/shared'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeContext'

interface NwordPassGiftModalProps {
  visible: boolean
  guests: KaraokeGuestRow[]
  ownGuestId: string
  onClose: () => void
  onGift: (guest: KaraokeGuestRow) => Promise<void>
}

export function NwordPassGiftModal({
  visible,
  guests,
  ownGuestId,
  onClose,
  onGift,
}: NwordPassGiftModalProps) {
  const { tokens } = useTheme()
  const insets = useSafeAreaInsets()
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) return
    setSendingTo(null)
    setError(null)
  }, [visible])

  const recipients = useMemo(
    () =>
      guests
        .filter(
          guest =>
            guest.id !== ownGuestId && !guestHasNwordPass(guest),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [guests, ownGuestId],
  )

  const send = async (guest: KaraokeGuestRow): Promise<void> => {
    if (sendingTo) return
    setSendingTo(guest.id)
    setError(null)
    try {
      await onGift(guest)
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The pass could not be shared. Please try again.',
      )
    } finally {
      setSendingTo(null)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.68)',
        }}
      >
        <Pressable
          accessibilityLabel="Close share pass dialog"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          style={{
            maxHeight: '76%',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: tokens.white,
            borderWidth: 1,
            borderColor: tokens.faint,
            paddingTop: 22,
            paddingBottom: insets.bottom + 20,
            shadowColor: '#000',
            shadowOpacity: 0.32,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: -10 },
            elevation: 20,
          }}
        >
          <View
            style={{
              width: 42,
              height: 4,
              borderRadius: 2,
              backgroundColor: tokens.faint,
              alignSelf: 'center',
              marginBottom: 20,
            }}
          />
          <View style={{ paddingHorizontal: 24 }}>
            <Text
              style={{
                color: tokens.black,
                fontFamily: tokens.fontDisplay,
                fontSize: 24,
                fontWeight: '900',
              }}
            >
              Share a one-time pass
            </Text>
            <Text
              style={{
                color: tokens.muted,
                fontFamily: tokens.fontBody,
                fontSize: 13,
                lineHeight: 19,
                marginTop: 7,
              }}
            >
              Choose someone in this lobby. Their pass will apply automatically
              to the next song where their assigned part includes the word.
            </Text>
          </View>

          {error ? (
            <View
              style={{
                marginHorizontal: 24,
                marginTop: 14,
                borderRadius: 12,
                padding: 12,
                backgroundColor: 'rgba(239,68,68,0.12)',
              }}
            >
              <Text style={{ color: tokens.hotRed, fontSize: 12 }}>{error}</Text>
            </View>
          ) : null}

          <ScrollView
            style={{ marginTop: 18 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {recipients.length === 0 ? (
              <View style={{ paddingHorizontal: 8, paddingVertical: 28 }}>
                <Text
                  style={{
                    color: tokens.muted,
                    textAlign: 'center',
                    fontFamily: tokens.fontBody,
                    fontSize: 13,
                  }}
                >
                  No eligible guests are in the lobby yet.
                </Text>
              </View>
            ) : (
              recipients.map(guest => {
                const sending = sendingTo === guest.id
                return (
                  <Pressable
                    key={guest.id}
                    disabled={sendingTo !== null}
                    onPress={() => void send(guest)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderRadius: 16,
                      padding: 12,
                      backgroundColor: pressed ? tokens.appBg : 'transparent',
                      opacity: sendingTo && !sending ? 0.45 : 1,
                    })}
                  >
                    {guest.profile_picture ? (
                      <Image
                        source={{ uri: guest.profile_picture }}
                        style={{ width: 46, height: 46, borderRadius: 23 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 23,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: guest.default_color || tokens.softViolet,
                        }}
                      >
                        <Text
                          style={{
                            color: '#111',
                            fontWeight: '900',
                            fontSize: 18,
                          }}
                        >
                          {(guest.name[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: tokens.black,
                          fontFamily: tokens.fontDisplay,
                          fontSize: 15,
                          fontWeight: '800',
                        }}
                      >
                        {guest.name}
                      </Text>
                      <Text
                        style={{
                          color: tokens.muted,
                          fontFamily: tokens.fontBody,
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        Send for their next eligible song
                      </Text>
                    </View>
                    {sending ? (
                      <ActivityIndicator color="#C69B3B" />
                    ) : (
                      <Text
                        style={{
                          color: '#B78A2D',
                          fontWeight: '900',
                          fontSize: 18,
                        }}
                      >
                        ↗
                      </Text>
                    )}
                  </Pressable>
                )
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
