import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  View,
  Text,
  Pressable,
  Image,
  Modal,
  TextInput,
  FlatList,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import type { ThemeTokens } from '@karaoke/shared'
import { useSession } from '../hooks/useSession'
import { useProfile } from '../hooks/useProfile'
import {
  useSessionRow,
  guestIsUp,
  type FullSessionRow,
  type TrendingGif,
} from '../hooks/useSessionRow'
import { supabase } from '../supabase/client'
import { useTheme } from '../theme/ThemeContext'
import {
  themeShadow,
  themePressed,
  themeRadius,
  themeCardBorder,
  themeCardShape,
  themeAccentTint,
} from '../theme/styles'
import { ThemedBackdrop } from '../theme/ThemedBackdrop'

const REACTION_COOLDOWN_MS = 300

const EMOJI_LIST = [
  '😀','😂','😍','🤩','🥳','🤯','😱','😭',
  '😎','🤣','😘','🥰','😏','🙄','🤔','😴',
  '👏','👍','👎','✌️','🤟','🤘','👌','🙌',
  '❤️','🔥','✨','🌟','💯','🎉','🎊','🎈',
  '🎵','🎤','🎶','🎸','🥁','🎹','🎧','📢',
  '💀','🫠','🤡','👻','👽','🤖','🐶','🐱',
  '🍻','🍺','🍸','🥂','☕','🍕','🍔','🍪',
  '💪','🚀','🏆','🥇',
]

export function StageScreen() {
  const { session } = useSession()
  const { profile } = useProfile()
  const row = useSessionRow(session?.sessionId)
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const guestName = session?.guestName

  const matched = guestIsUp(row, guestName)
  const isUp = matched !== null

  if (!session) {
    return (
      <SafeAreaView style={[safeStyle(tokens)]}>
        <View style={emptyStyle}>
          <Text style={emptyTitleStyle(tokens)}>No active session.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const bottomPadding = insets.bottom + 96

  return (
    <SafeAreaView style={safeStyle(tokens)} edges={['top', 'left', 'right']}>
      <ThemedBackdrop />
      {isUp ? (
        <YoureUp
          row={row}
          matched={matched}
          sessionId={session.sessionId}
          bottomPadding={bottomPadding}
        />
      ) : (
        <ReactGrid
          row={row}
          sessionId={session.sessionId}
          guestName={guestName}
          profilePicture={profile?.profilePicture ?? null}
          bottomPadding={bottomPadding}
        />
      )}
    </SafeAreaView>
  )
}

// ----------------------------------------------------------------------------
// React (reactions grid)
// ----------------------------------------------------------------------------
function ReactGrid({
  row,
  sessionId,
  guestName,
  profilePicture,
  bottomPadding,
}: {
  row: FullSessionRow | null
  sessionId: string
  guestName: string | undefined
  profilePicture: string | null
  bottomPadding: number
}) {
  const { tokens } = useTheme()
  const [customEmoji, setCustomEmoji] = useState<string | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [textOpen, setTextOpen] = useState(false)
  const [memeOpen, setMemeOpen] = useState(false)
  const [textValue, setTextValue] = useState('')
  const lastReactionAtRef = useRef(0)
  const [, forceRerender] = useState(0)

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  useEffect(() => {
    const ch = supabase.channel('cr-' + sessionId)
    ch.subscribe()
    channelRef.current = ch
    return () => {
      supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [sessionId])

  const sendReaction = useCallback(
    (type: 'emoji' | 'text' | 'meme' | 'photo', content: string) => {
      if (!channelRef.current) return
      const now = Date.now()
      if (now - lastReactionAtRef.current < REACTION_COOLDOWN_MS) return
      lastReactionAtRef.current = now
      channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: {
          id: now + '-' + Math.random().toString(36).slice(2, 8),
          reactionType: type,
          content,
          senderName: guestName || '',
          senderProfilePicture: profilePicture,
        },
      })
      forceRerender((v) => v + 1)
      setTimeout(() => forceRerender((v) => v + 1), REACTION_COOLDOWN_MS + 20)
    },
    [guestName, profilePicture],
  )

  const onPickEmoji = useCallback((e: string) => {
    setCustomEmoji(e)
    setEmojiOpen(false)
  }, [])

  const onSendText = useCallback(() => {
    const v = textValue.trim()
    if (!v) return
    sendReaction('text', v)
    setTextValue('')
    setTextOpen(false)
  }, [sendReaction, textValue])

  const onPickPhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Photo access', 'Allow photo access to send a picture reaction.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      })
      if (result.canceled || !result.assets?.[0]?.base64) return
      const asset = result.assets[0]
      const mime = asset.mimeType ?? 'image/jpeg'
      sendReaction('photo', `data:${mime};base64,${asset.base64}`)
    } catch (err: any) {
      Alert.alert('Photo error', err?.message ?? String(err))
    }
  }, [sendReaction])

  const onPickMeme = useCallback((url: string) => {
    sendReaction('meme', url)
    setMemeOpen(false)
  }, [sendReaction])

  const cooldownActive =
    Date.now() - lastReactionAtRef.current < REACTION_COOLDOWN_MS

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={titleStyle(tokens)}>React</Text>
      </View>

      <View style={[gridStyle, { paddingBottom: bottomPadding }]}>
        <View style={gridRowStyle}>
          <ReactionCell
            label="Clap"
            icon={<Text style={cellEmojiStyle}>👏</Text>}
            onPress={() => sendReaction('emoji', '👏')}
            disabled={cooldownActive}
          />
          <ReactionCell
            label="Boo"
            icon={<Text style={cellEmojiStyle}>👎</Text>}
            onPress={() => sendReaction('emoji', '👎')}
            disabled={cooldownActive}
          />
        </View>
        <View style={gridRowStyle}>
          {customEmoji ? (
            <ReactionCell
              label="Custom"
              icon={<Text style={cellEmojiStyle}>{customEmoji}</Text>}
              onPress={() => sendReaction('emoji', customEmoji)}
              onEditPress={() => setEmojiOpen(true)}
              disabled={cooldownActive}
            />
          ) : (
            <ReactionCell
              label="Custom Emoji"
              icon={<Text style={cellPlusStyle(tokens)}>+</Text>}
              onPress={() => setEmojiOpen(true)}
            />
          )}
          <ReactionCell
            label="Say Something"
            icon={<Ionicons name="chatbubble-outline" size={64} color={tokens.black} />}
            onPress={() => setTextOpen(true)}
          />
        </View>
        <View style={gridRowStyle}>
          <ReactionCell
            label="Memes"
            icon={<Ionicons name="image-outline" size={64} color={tokens.black} />}
            onPress={() => setMemeOpen(true)}
          />
          <ReactionCell
            label="Photo"
            icon={<Ionicons name="camera-outline" size={64} color={tokens.black} />}
            onPress={onPickPhoto}
          />
        </View>
      </View>

      <EmojiPicker
        visible={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onPick={onPickEmoji}
      />
      <TextInputSheet
        visible={textOpen}
        value={textValue}
        onChange={setTextValue}
        onSend={onSendText}
        onClose={() => { setTextOpen(false); setTextValue('') }}
      />
      <MemePicker
        visible={memeOpen}
        gifs={row?.trending_gifs ?? []}
        onClose={() => setMemeOpen(false)}
        onPick={onPickMeme}
      />
    </View>
  )
}

function ReactionCell({
  onPress,
  onEditPress,
  disabled,
  icon,
  label,
}: {
  onPress: () => void
  onEditPress?: () => void
  disabled?: boolean
  icon: React.ReactNode
  label: string
}) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        cellStyle(tokens, label),
        // Press feedback — slide on offset themes, dim on glow themes,
        // plus a per-key wobble on blob (sketch) themes.
        pressed ? themePressed(tokens, label) : null,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      <View style={cellIconAreaStyle}>{icon}</View>
      <Text style={cellLabelStyle(tokens)}>{label}</Text>
      {onEditPress ? (
        <Pressable
          onPress={onEditPress}
          hitSlop={6}
          style={cellEditStyle(tokens)}
        >
          <Ionicons name="create-outline" size={12} color={tokens.black} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}

// ----------------------------------------------------------------------------
// Emoji picker — bottom sheet
// ----------------------------------------------------------------------------
function EmojiPicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean
  onClose: () => void
  onPick: (e: string) => void
}) {
  const { tokens } = useTheme()
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={overlayStyle} onPress={onClose}>
        <Pressable style={sheetBottomStyle(tokens)} onPress={(e) => e.stopPropagation()}>
          <Text style={sheetTitleStyle(tokens)}>Choose an Emoji</Text>
          <View style={emojiGridStyle}>
            {EMOJI_LIST.map((em, i) => (
              <Pressable
                key={i}
                onPress={() => onPick(em)}
                style={({ pressed }) => [
                  emojiBtnStyle,
                  pressed ? { backgroundColor: tokens.vividYellow } : null,
                ]}
              >
                <Text style={{ fontSize: 28, lineHeight: 32 }}>{em}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ----------------------------------------------------------------------------
// Text input — centered sheet
// ----------------------------------------------------------------------------
function TextInputSheet({
  visible,
  value,
  onChange,
  onSend,
  onClose,
}: {
  visible: boolean
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onClose: () => void
}) {
  const { tokens } = useTheme()
  const inputRef = useRef<TextInput>(null)
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => inputRef.current?.focus(), 120)
      return () => clearTimeout(t)
    }
  }, [visible])
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={overlayCenterStyle} onPress={onClose}>
          <Pressable style={sheetCenterStyle(tokens)} onPress={(e) => e.stopPropagation()}>
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChange}
              placeholder="What do you want to say?"
              placeholderTextColor={tokens.faint}
              maxLength={120}
              onSubmitEditing={onSend}
              returnKeyType="send"
              style={textInputStyle(tokens)}
            />
            <Pressable
              onPress={onSend}
              style={({ pressed }) => [
                sendBtnStyle(tokens),
                pressed ? themePressed(tokens) : null,
              ]}
            >
              <Text style={sendBtnLabelStyle(tokens)}>Send</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ----------------------------------------------------------------------------
// Meme picker
// ----------------------------------------------------------------------------
function MemePicker({
  visible,
  gifs,
  onClose,
  onPick,
}: {
  visible: boolean
  gifs: TrendingGif[]
  onClose: () => void
  onPick: (url: string) => void
}) {
  const { tokens } = useTheme()
  const [query, setQuery] = useState('')
  useEffect(() => { if (!visible) setQuery('') }, [visible])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return gifs
    return gifs.filter((g) => g.title && g.title.toLowerCase().includes(q))
  }, [gifs, query])

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={overlayStyle} onPress={onClose}>
        <Pressable style={[sheetBottomStyle(tokens), { maxHeight: '85%' }]} onPress={(e) => e.stopPropagation()}>
          <Text style={sheetTitleStyle(tokens)}>Pick a GIF</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search GIFs…"
            placeholderTextColor={tokens.faint}
            style={textInputStyle(tokens)}
          />
          {gifs.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ color: tokens.muted, fontSize: 14 }}>
                GIFs are loading… try again in a moment
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ color: tokens.muted, fontSize: 14 }}>No matching GIFs</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(g) => g.id}
              numColumns={3}
              columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onPick(item.url)}
                  style={({ pressed }) => [
                    memeBtnStyle(tokens),
                    pressed ? themePressed(tokens) : null,
                  ]}
                >
                  <Image source={{ uri: item.preview }} style={memeImgStyle} />
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
          <Text style={poweredByStyle(tokens)}>Powered by GIPHY</Text>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ----------------------------------------------------------------------------
// Stage (You're Up)
// ----------------------------------------------------------------------------
function YoureUp({
  row,
  matched,
  sessionId,
  bottomPadding,
}: {
  row: FullSessionRow | null
  matched: { name: string; color: string; colorGlow: string } | null
  sessionId: string
  bottomPadding: number
}) {
  const { tokens } = useTheme()
  const np = row
  const isPlaying = !!np?.is_playing
  const trackName = np?.now_playing_name ?? ''
  const trackArtist = np?.now_playing_artist ?? ''
  const artUrl = np?.now_playing_art_url ?? null

  const vfxOn = (np?.vocal_fx_enabled ?? true) !== false
  const atOn = (np?.autotune_enabled ?? true) !== false

  const singerColor = matched?.color || tokens.softViolet

  const [skipConfirm, setSkipConfirm] = useState(false)

  const onPlayPause = useCallback(async () => {
    if (!sessionId) return
    await supabase
      .from('karaoke_sessions')
      .update({ is_playing: !isPlaying, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
  }, [sessionId, isPlaying])

  const onToggleVfx = useCallback(async () => {
    await supabase
      .from('karaoke_sessions')
      .update({ vocal_fx_enabled: !vfxOn, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
  }, [sessionId, vfxOn])

  const onToggleAt = useCallback(async () => {
    await supabase
      .from('karaoke_sessions')
      .update({ autotune_enabled: !atOn, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
  }, [sessionId, atOn])

  const onConfirmSkip = useCallback(async () => {
    setSkipConfirm(false)
    await supabase
      .from('karaoke_sessions')
      .update({
        skip_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
  }, [sessionId])

  const pulse = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (isPlaying) {
      pulse.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [isPlaying, pulse])
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] })

  return (
    <View style={{ flex: 1, paddingBottom: bottomPadding }}>
      <View style={yupWrapStyle}>
        {!isPlaying ? (
          <Text style={yupHeroStyle(tokens)}>You're Up!</Text>
        ) : null}

        {!isPlaying && artUrl ? (
          <Image source={{ uri: artUrl }} style={yupArtStyle(tokens)} />
        ) : null}

        <Text style={yupSongStyle(tokens)} numberOfLines={2}>{trackName || 'Waiting for the host…'}</Text>
        {!!trackArtist && <Text style={yupArtistStyle(tokens)} numberOfLines={1}>{trackArtist}</Text>}

        <Animated.View style={{ transform: [{ scale: isPlaying ? 1 : pulseScale }] }}>
          <Pressable
            onPress={onPlayPause}
            style={({ pressed }) => [
              playBtnStyle(tokens),
              { backgroundColor: isPlaying ? tokens.vividYellow : singerColor },
              pressed ? playBtnPressedStyle(tokens) : null,
            ]}
          >
            {isPlaying ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={pauseBarStyle(tokens)} />
                <View style={pauseBarStyle(tokens)} />
              </View>
            ) : (
              <View style={playTriStyle(tokens)} />
            )}
          </Pressable>
        </Animated.View>

        <View style={toggleRowStyle}>
          <ToggleBox label="Vocal FX" on={vfxOn} onPress={onToggleVfx} />
          <ToggleBox label="Autotune" on={atOn} onPress={onToggleAt} />
        </View>

        <Pressable
          onPress={() => setSkipConfirm(true)}
          style={({ pressed }) => [
            skipBtnStyle(tokens),
            pressed ? themePressed(tokens) : null,
          ]}
        >
          <Ionicons name="play-skip-forward" size={16} color={tokens.black} />
          <Text style={skipBtnLabelStyle(tokens)}>Skip Song</Text>
        </Pressable>
      </View>

      <SkipConfirm
        visible={skipConfirm}
        onCancel={() => setSkipConfirm(false)}
        onConfirm={onConfirmSkip}
      />
    </View>
  )
}

function ToggleBox({
  label,
  on,
  onPress,
}: {
  label: string
  on: boolean
  onPress: () => void
}) {
  const { tokens } = useTheme()
  const isDark = tokens.isDark
  const activeBg = isDark ? themeAccentTint(tokens, 0.18) : tokens.vividYellow
  const idleBg = isDark ? 'transparent' : tokens.white
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        toggleBtnStyle(tokens),
        { backgroundColor: on ? activeBg : idleBg },
        pressed ? themePressed(tokens) : null,
      ]}
    >
      <View
        style={[
          toggleCheckBoxStyle(tokens),
          { backgroundColor: on ? (isDark ? tokens.accentA : tokens.black) : (isDark ? 'transparent' : tokens.white) },
        ]}
      >
        {on ? <Ionicons name="checkmark" size={16} color={isDark ? tokens.appBg : tokens.white} /> : null}
      </View>
      <Text style={toggleLabelStyle(tokens)}>{label}</Text>
    </Pressable>
  )
}

function SkipConfirm({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { tokens } = useTheme()
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable style={overlayCenterStyle} onPress={onCancel}>
        <Pressable style={skipCardStyle(tokens)} onPress={(e) => e.stopPropagation()}>
          <Text style={skipTitleStyle(tokens)}>Skip this song?</Text>
          <Text style={skipSubStyle(tokens)}>Move on to the next track in the queue.</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [skipBtnGhostStyle(tokens), pressed ? themePressed(tokens) : null]}
            >
              <Text style={skipBtnGhostLabelStyle(tokens)}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [skipBtnDangerStyle(tokens), pressed ? themePressed(tokens) : null]}
            >
              <Text style={skipBtnDangerLabelStyle(tokens)}>Skip</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ----------------------------------------------------------------------------
// Tab icon
// ----------------------------------------------------------------------------
export function StageTabIcon({ color, size = 22 }: { color: string; size?: number }) {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  const isUp = guestIsUp(row, session?.guestName) !== null
  return (
    <Ionicons
      name={isUp ? 'mic' : 'happy-outline'}
      size={size}
      color={color}
    />
  )
}

// ============================================================================
// Style builders
// ============================================================================
function safeStyle(t: ThemeTokens): ViewStyle {
  return { flex: 1, backgroundColor: t.appBg }
}
const emptyStyle: ViewStyle = { flex: 1, alignItems: 'center', justifyContent: 'center' }
function emptyTitleStyle(t: ThemeTokens): TextStyle {
  return { fontFamily: t.fontBody, fontSize: 16, color: t.black }
}
function titleStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '900',
    fontSize: 32,
    color: t.black,
    letterSpacing: t.displayUppercase ? t.displayLetterSpacing : -0.5,
    textTransform: t.displayUppercase ? 'uppercase' : 'none',
  }
}
const gridStyle: ViewStyle = {
  flex: 1,
  paddingHorizontal: 24,
  paddingBottom: 12,
  gap: 12,
}
const gridRowStyle: ViewStyle = {
  flex: 1,
  flexDirection: 'row',
  gap: 12,
}
function cellStyle(t: ThemeTokens, key: string): ViewStyle {
  return {
    flex: 1,
    backgroundColor: t.white,
    ...themeCardBorder(t),
    // Per-cell key seeds the blob mould so the 6 React cells each take a
    // different hand-drawn shape (sketch); other themes ignore the key.
    ...themeCardShape(t, key),
    padding: 12,
    ...themeShadow(t, 'md'),
  }
}
const cellIconAreaStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
}
const cellEmojiStyle: TextStyle = {
  fontSize: 72,
  // iOS emoji glyphs draw above the text baseline by a few px. With
  // `lineHeight === fontSize` the top of clap/boo/balloon emojis get clipped
  // by the surrounding flex container. ~1.18× gives the glyph room to render
  // its natural ascent without misaligning the visual center.
  lineHeight: 86,
  textAlign: 'center',
}
function cellPlusStyle(t: ThemeTokens): TextStyle {
  return {
    fontSize: 64,
    lineHeight: 64,
    color: t.faint,
    fontWeight: '300',
    textAlign: 'center',
  }
}
function cellLabelStyle(t: ThemeTokens): TextStyle {
  return {
    textAlign: 'center',
    marginTop: 8,
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 13,
    color: t.black,
    letterSpacing: t.displayUppercase ? 2 : 0.3,
    textTransform: 'uppercase',
  }
}
function cellEditStyle(t: ThemeTokens): ViewStyle {
  return {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: themeRadius(t, 6),
    borderWidth: t.isDark ? 1 : 2,
    borderColor: t.isDark ? t.accentA : t.black,
    backgroundColor: t.isDark ? themeAccentTint(t, 0.18) : t.vividYellow,
    alignItems: 'center',
    justifyContent: 'center',
  }
}

const overlayStyle: ViewStyle = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.55)',
  justifyContent: 'flex-end',
}
const overlayCenterStyle: ViewStyle = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.55)',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
}
function sheetBottomStyle(t: ThemeTokens): ViewStyle {
  return {
    backgroundColor: t.cream,
    borderTopWidth: t.isDark ? 1 : 3,
    borderLeftWidth: t.isDark ? 1 : 3,
    borderRightWidth: t.isDark ? 1 : 3,
    borderColor: t.isDark ? t.accentA : t.black,
    borderTopLeftRadius: t.cornerStyle === 'sharp' ? 0 : 16,
    borderTopRightRadius: t.cornerStyle === 'sharp' ? 0 : 16,
    padding: 20,
    paddingBottom: 32,
  }
}
function sheetCenterStyle(t: ThemeTokens): ViewStyle {
  return {
    width: '100%',
    maxWidth: 420,
    backgroundColor: t.cream,
    ...themeCardBorder(t),
    borderRadius: themeRadius(t, 12),
    padding: 20,
    ...themeShadow(t, 'lg'),
  }
}
function sheetTitleStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '900',
    fontSize: 18,
    color: t.black,
    marginBottom: 14,
    letterSpacing: t.displayUppercase ? 1.5 : 0,
    textTransform: t.displayUppercase ? 'uppercase' : 'none',
  }
}
const emojiGridStyle: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
}
const emojiBtnStyle: ViewStyle = {
  width: '14.28%',
  aspectRatio: 1,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
}
function textInputStyle(t: ThemeTokens): TextStyle {
  return {
    width: '100%',
    padding: 14,
    fontSize: 16,
    fontFamily: t.fontBody,
    color: t.black,
    backgroundColor: t.isDark ? themeAccentTint(t, 0.05) : t.white,
    ...themeCardBorder(t),
    borderRadius: themeRadius(t, t.radius),
    marginBottom: 12,
    ...themeShadow(t, 'sm'),
  }
}
function sendBtnStyle(t: ThemeTokens): ViewStyle {
  return {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.isDark ? 'transparent' : t.hotRed,
    borderWidth: t.isDark ? 1 : t.cardBorderWidth,
    borderColor: t.isDark ? t.hotRed : t.black,
    borderRadius: themeRadius(t, t.radius),
    ...themeShadow(t, 'md'),
  }
}
function sendBtnLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.isDark ? t.hotRed : t.white,
    fontFamily: t.fontDisplay,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: t.displayUppercase ? 2 : 0.5,
    textTransform: 'uppercase',
  }
}
function memeBtnStyle(t: ThemeTokens): ViewStyle {
  return {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: t.white,
    ...themeCardBorder(t),
    borderRadius: themeRadius(t, t.radius),
    overflow: 'hidden',
    ...themeShadow(t, 'sm'),
  }
}
const memeImgStyle: ImageStyle = {
  width: '100%',
  height: '100%',
}
function poweredByStyle(t: ThemeTokens): TextStyle {
  return {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 11,
    color: t.faint,
    fontFamily: t.fontBody,
  }
}

const yupWrapStyle: ViewStyle = {
  flex: 1,
  paddingHorizontal: 24,
  paddingTop: 12,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
}
function yupHeroStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '900',
    fontSize: 44,
    color: t.hotRed,
    letterSpacing: t.displayUppercase ? 3 : -1,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: t.displayUppercase ? 'uppercase' : 'none',
    textShadowColor: t.isDark ? t.hotRed : 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: t.isDark ? 12 : 0,
  }
}
function yupArtStyle(t: ThemeTokens): ImageStyle {
  return {
    width: 200,
    height: 200,
    borderRadius: themeRadius(t, t.radius),
    ...(themeCardBorder(t) as ImageStyle),
    backgroundColor: t.creamDark,
    ...(themeShadow(t, 'md') as ImageStyle),
  }
}
function yupSongStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '900',
    fontSize: 22,
    color: t.black,
    textAlign: 'center',
    letterSpacing: t.displayUppercase ? 1.5 : 0,
    textTransform: t.displayUppercase ? 'uppercase' : 'none',
  }
}
function yupArtistStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontBody,
    fontWeight: '500',
    fontSize: 14,
    color: t.muted,
    marginBottom: 8,
    textAlign: 'center',
  }
}
function playBtnStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 120,
    height: 120,
    borderRadius: t.cornerStyle === 'sharp' ? 0 : 60,
    borderWidth: t.isDark ? 1 : t.cardBorderWidth,
    borderColor: t.isDark ? t.accentA : t.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...themeShadow(t, 'lg'),
  }
}
function playBtnPressedStyle(t: ThemeTokens): ViewStyle {
  if (t.isDark) return { opacity: 0.85 }
  return {
    transform: [{ translateX: 4 }, { translateY: 4 }],
    shadowOpacity: 0,
    elevation: 0,
  }
}
function playTriStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 0,
    height: 0,
    borderTopWidth: 24,
    borderBottomWidth: 24,
    borderLeftWidth: 40,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: t.isDark ? t.appBg : t.black,
    marginLeft: 8,
  }
}
function pauseBarStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 14,
    height: 44,
    backgroundColor: t.isDark ? t.appBg : t.black,
    borderRadius: 2,
  }
}
const toggleRowStyle: ViewStyle = {
  flexDirection: 'row',
  gap: 12,
  width: '100%',
  maxWidth: 360,
  marginTop: 8,
}
function toggleBtnStyle(t: ThemeTokens): ViewStyle {
  return {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: themeRadius(t, t.radius),
    ...themeCardBorder(t),
    ...themeShadow(t, 'sm'),
  }
}
function toggleCheckBoxStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 22,
    height: 22,
    borderRadius: t.cornerStyle === 'sharp' ? 0 : 4,
    borderWidth: t.isDark ? 1 : 2,
    borderColor: t.isDark ? t.accentA : t.black,
    alignItems: 'center',
    justifyContent: 'center',
  }
}
function toggleLabelStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 13,
    color: t.black,
    letterSpacing: t.displayUppercase ? 1.5 : 0.3,
    textTransform: t.displayUppercase ? 'uppercase' : 'none',
  }
}
function skipBtnStyle(t: ThemeTokens): ViewStyle {
  return {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 360,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: t.white,
    ...themeCardBorder(t),
    borderRadius: themeRadius(t, t.radius),
    ...themeShadow(t, 'md'),
    marginTop: 4,
  }
}
function skipBtnLabelStyle(t: ThemeTokens): TextStyle {
  return {
    color: t.black,
    fontFamily: t.fontDisplay,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: t.displayUppercase ? 2 : 0.5,
    textTransform: 'uppercase',
  }
}
function skipCardStyle(t: ThemeTokens): ViewStyle {
  return {
    width: '100%',
    maxWidth: 360,
    backgroundColor: t.cream,
    ...themeCardBorder(t),
    borderRadius: themeRadius(t, t.radius),
    padding: 24,
    alignItems: 'center',
    ...themeShadow(t, 'lg'),
  }
}
function skipTitleStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '900',
    fontSize: 22,
    color: t.black,
    marginBottom: 8,
    letterSpacing: t.displayUppercase ? 1.5 : 0,
    textTransform: t.displayUppercase ? 'uppercase' : 'none',
  }
}
function skipSubStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontBody,
    fontWeight: '500',
    fontSize: 14,
    color: t.muted,
    marginBottom: 20,
    textAlign: 'center',
  }
}
function skipBtnGhostStyle(t: ThemeTokens): ViewStyle {
  return {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    ...themeCardBorder(t),
    borderRadius: themeRadius(t, t.radius),
    backgroundColor: t.isDark ? 'transparent' : t.white,
    alignItems: 'center',
    ...themeShadow(t, 'sm'),
  }
}
function skipBtnGhostLabelStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 14,
    color: t.black,
    textTransform: 'uppercase',
    letterSpacing: t.displayUppercase ? 1.5 : 0.5,
  }
}
function skipBtnDangerStyle(t: ThemeTokens): ViewStyle {
  return {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: t.isDark ? 1 : t.cardBorderWidth,
    borderColor: t.isDark ? t.hotRed : t.black,
    borderRadius: themeRadius(t, t.radius),
    backgroundColor: t.isDark ? 'transparent' : t.hotRed,
    alignItems: 'center',
    ...themeShadow(t, 'sm'),
  }
}
function skipBtnDangerLabelStyle(t: ThemeTokens): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 14,
    color: t.isDark ? t.hotRed : t.white,
    textTransform: 'uppercase',
    letterSpacing: t.displayUppercase ? 1.5 : 0.5,
  }
}
