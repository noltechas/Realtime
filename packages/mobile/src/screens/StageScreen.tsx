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
import type { ThemeTokens, SingerConfig } from '@karaoke/shared'
import { useSession } from '../hooks/useSession'
import { useProfile } from '../hooks/useProfile'
import {
  useSessionRow,
  guestIsUp,
  singerFxKey,
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
  themeAccentTint,
} from '../theme/helpers'

const REACTION_COOLDOWN_MS = 300

const EMOJI_LIST = [
  '😀','😂','😍','🤩','🥳','🤯','😱','😭',
  '😎','🤣','😘','🥰','😏','🙄','🤔','😴',
  '👏','👍','👎','✌️','🤟','🤘','👌','🙌',
  '❤️','🔥','✨','🌟','💯','🎉','🎊','🎈',
  '🎵','🎤','🎶','🎸','🥁','🎹','🎧','📢',
  '💀','🫠','🤡','👻','👽','🤖','🐶','🐱',
  '💪','🚀','🏆','🥇',
]

// Stage tab — data container. All atoms (reaction cells, play/pause button,
// toggle boxes, the tab icon) come from the active theme's UI module. Modal
// pickers (Emoji / Text / GIF / Skip-confirm) live here because they're
// strictly token-driven (no per-theme structural decisions).
export function StageScreen() {
  const { session } = useSession()
  const { profile } = useProfile()
  const row = useSessionRow(session?.sessionId)
  const insets = useSafeAreaInsets()
  const { tokens, ui } = useTheme()
  const guestName = session?.guestName

  const currentMatch = guestIsUp(row, guestName, session?.guestId)

  // Persist the last known matched singer config so transient Supabase
  // realtime updates don't flicker back to ReactGrid.
  const lastMatchRef = useRef<SingerConfig | null>(null)
  if (currentMatch !== null) {
    lastMatchRef.current = currentMatch
  } else if (!row?.now_playing_track_id && !row?.now_playing_name) {
    lastMatchRef.current = null
  } else if (Array.isArray(row?.now_playing_singer_configs)) {
    lastMatchRef.current = null
  }

  const matched = lastMatchRef.current
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
      <ui.Backdrop />
      {isUp ? (
        <YoureUp
          row={row}
          matched={matched}
          sessionId={session.sessionId}
          guestId={session.guestId}
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
  const { tokens, ui } = useTheme()
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
      // [REACT-DBG] temporary diagnostic — remove after debugging
      console.log('[REACT-DBG] mobile: sendReaction', type, content, 'channel=cr-' + sessionId, 'state=', channelRef.current?.state)
      if (!channelRef.current) {
        console.log('[REACT-DBG] mobile: NO channel ref — send aborted')
        return
      }
      const now = Date.now()
      if (now - lastReactionAtRef.current < REACTION_COOLDOWN_MS) return
      lastReactionAtRef.current = now
      Promise.resolve(
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
        }),
      ).then((r) => console.log('[REACT-DBG] mobile: send result =', r))
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

  const { iconColor, plusIconColor } = ui.reactionIconColors

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
        {tokens.name === 'tropical' ? (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#6E4423',
              borderWidth: 3,
              borderColor: '#C99A54',
              borderRadius: 14,
              paddingHorizontal: 22,
              paddingVertical: 6,
              shadowColor: '#0E2E29',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.22,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text style={{ fontFamily: tokens.fontBody, fontSize: 34, color: '#FFF1C4', letterSpacing: 0.5 }}>React</Text>
          </View>
        ) : (
          <Text style={titleStyle(tokens)}>React</Text>
        )}
      </View>

      <View style={[gridStyle, { paddingBottom: bottomPadding }]}>
        <View style={gridRowStyle}>
          <ui.ReactionCell
            label="Clap"
            icon={<Text style={cellEmojiStyle}>👏</Text>}
            onPress={() => sendReaction('emoji', '👏')}
            disabled={cooldownActive}
          />
          <ui.ReactionCell
            label="Tomato"
            icon={<Text style={cellEmojiStyle}>🍅</Text>}
            onPress={() => sendReaction('emoji', '🍅')}
            disabled={cooldownActive}
          />
        </View>
        <View style={gridRowStyle}>
          {customEmoji ? (
            <ui.ReactionCell
              label="Custom"
              icon={<Text style={cellEmojiStyle}>{customEmoji}</Text>}
              onPress={() => sendReaction('emoji', customEmoji)}
              onEditPress={() => setEmojiOpen(true)}
              disabled={cooldownActive}
            />
          ) : (
            <ui.ReactionCell
              label="Custom Emoji"
              icon={<Text style={cellPlusStyle(tokens, plusIconColor)}>+</Text>}
              onPress={() => setEmojiOpen(true)}
            />
          )}
          <ui.ReactionCell
            label="Say Something"
            icon={<Ionicons name="chatbubble-outline" size={64} color={iconColor} />}
            onPress={() => setTextOpen(true)}
          />
        </View>
        <View style={gridRowStyle}>
          <ui.ReactionCell
            label="Memes"
            icon={<Ionicons name="image-outline" size={64} color={iconColor} />}
            onPress={() => setMemeOpen(true)}
          />
          <ui.ReactionCell
            label="Photo"
            icon={<Ionicons name="camera-outline" size={64} color={iconColor} />}
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
// Text input sheet — centered modal
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
  guestId,
  bottomPadding,
}: {
  row: FullSessionRow | null
  // Only `color` (per-song slot styling) is read here; identity isn't rendered
  // on this panel. Typed as SingerConfig so the now-optional `name` is fine.
  matched: SingerConfig | null
  sessionId: string
  guestId: string | undefined
  bottomPadding: number
}) {
  const { tokens, ui } = useTheme()
  const np = row
  const isPlaying = !!np?.is_playing
  const trackName = np?.now_playing_name ?? ''
  const trackArtist = np?.now_playing_artist ?? ''
  const artUrl = np?.now_playing_art_url ?? null

  // Toggles act on THIS guest's mic only. We key the per-singer override map by
  // the matched singer's key (guestId, falling back to a name key for name-only
  // singers). The current on/off state reads the guest's own override first,
  // then the session-wide flag, then defaults on — mirroring the desktop's
  // precedence so the switch reflects what the singer will actually hear.
  const fxKey = singerFxKey({ guestId: matched?.guestId ?? guestId, name: matched?.name })
  const myOverride = fxKey ? np?.mic_fx_overrides?.[fxKey] : undefined
  const vfxOn = (myOverride?.vocal_fx ?? np?.vocal_fx_enabled ?? true) !== false
  const atOn = (myOverride?.autotune ?? np?.autotune_enabled ?? true) !== false

  const singerColor = matched?.color || tokens.softViolet

  const [skipConfirm, setSkipConfirm] = useState(false)

  const onPlayPause = useCallback(async () => {
    if (!sessionId) return
    await supabase
      .from('karaoke_sessions')
      .update({ is_playing: !isPlaying, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
  }, [sessionId, isPlaying])

  // Merge this guest's override into the map without clobbering other singers'
  // entries. Read-modify-write off the latest realtime snapshot (`np`).
  const writeOverride = useCallback(
    async (next: { vocal_fx: boolean; autotune: boolean }) => {
      if (!fxKey) return
      const merged = { ...(np?.mic_fx_overrides ?? {}), [fxKey]: next }
      await supabase
        .from('karaoke_sessions')
        .update({ mic_fx_overrides: merged, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
    },
    [sessionId, fxKey, np?.mic_fx_overrides],
  )

  const onToggleVfx = useCallback(
    () => writeOverride({ vocal_fx: !vfxOn, autotune: atOn }),
    [writeOverride, vfxOn, atOn],
  )

  const onToggleAt = useCallback(
    () => writeOverride({ vocal_fx: vfxOn, autotune: !atOn }),
    [writeOverride, vfxOn, atOn],
  )

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

  return (
    <View style={{ flex: 1, paddingBottom: bottomPadding }}>
      <View style={yupWrapStyle}>
        {!isPlaying ? (
          ui.YoureUpHero ? (
            <ui.YoureUpHero />
          ) : (
            <Text style={yupHeroStyle(tokens)}>You're Up!</Text>
          )
        ) : null}

        {!isPlaying && artUrl ? (
          <View style={yupArtStyle(tokens)}>
            <Image source={{ uri: artUrl }} style={{ width: '100%', height: '100%' }} />
            {ui.ArtOverlay ? <ui.ArtOverlay /> : null}
          </View>
        ) : null}

        <Text style={yupSongStyle(tokens)} numberOfLines={2}>{trackName || 'Waiting for the host…'}</Text>
        {!!trackArtist && <Text style={yupArtistStyle(tokens)} numberOfLines={1}>{trackArtist}</Text>}

        <ui.StagePlayButton
          isPlaying={isPlaying}
          singerColor={singerColor}
          onPress={onPlayPause}
        />

        <View style={toggleRowStyle}>
          <ui.StageToggleBox label="Vocal FX" on={vfxOn} onPress={onToggleVfx} />
          <ui.StageToggleBox label="Autotune" on={atOn} onPress={onToggleAt} />
        </View>

        <Pressable
          onPress={() => setSkipConfirm(true)}
          style={({ pressed }) => [
            skipBtnStyle(tokens),
            pressed ? themePressed(tokens) : null,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="play-skip-forward" size={16} color={tokens.black} />
            <Text style={skipBtnLabelStyle(tokens)}>Skip Song</Text>
          </View>
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
// Tab icon — the active theme owns the SVG/Ionicons render. The screen
// owns the "isUp" check so the icon swaps live as the session row updates.
// ----------------------------------------------------------------------------
export function StageTabIcon({ color, size = 22 }: { color: string; size?: number }) {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  const isUp = guestIsUp(row, session?.guestName, session?.guestId) !== null
  const { ui } = useTheme()
  const Icon = ui.StageTabIcon
  return <Icon color={color} size={size} isUp={isUp} />
}

// ============================================================================
// Style builders — all token-driven (shadowStyle / cornerStyle / isDark /
// cardShape) rather than theme-name branching. Per-theme structural decisions
// live in the atom files; these are the modal-only fallbacks.
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
const cellIconAreaStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
}
const cellEmojiStyle: TextStyle = {
  fontSize: 72,
  // iOS emoji glyphs draw above the text baseline by a few px. ~1.18× gives
  // the glyph room to render its natural ascent without misaligning center.
  lineHeight: 86,
  textAlign: 'center',
}
function cellPlusStyle(t: ThemeTokens, color: string): TextStyle {
  return {
    fontSize: 64,
    lineHeight: 64,
    color,
    fontWeight: '300',
    textAlign: 'center',
    ...(t.isDark ? { textShadowColor: t.accentGlowColor, textShadowRadius: 8 } : {}),
  }
}

// ── Modals ─────────────────────────────────────────────────────────────────
const overlayStyle: ViewStyle = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
}
const overlayCenterStyle: ViewStyle = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
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

// ── YoureUp scaffolding ────────────────────────────────────────────────────
const yupWrapStyle: ViewStyle = {
  flex: 1,
  paddingHorizontal: 24,
  paddingTop: 12,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
}
function yupHeroStyle(t: ThemeTokens): TextStyle {
  // Deep-sea: the generic hot-red pop color (a pink) clashes underwater, and
  // pairing pink text with a wide teal halo reads as an ugly dark box. Use the
  // theme's signature teal with a clean, same-hue bioluminescent glow so the
  // hero matches the rest of the ocean UI (song title, toggles, nav).
  if (t.name === 'deep-sea') {
    return {
      fontFamily: t.fontDisplay,
      fontWeight: '900',
      fontSize: 44,
      color: '#00ffc8',
      letterSpacing: -1,
      textAlign: 'center',
      marginBottom: 4,
      textShadowColor: 'rgba(0,255,200,0.45)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
    }
  }
  // Urban: BomberUrban is already a heavy graffiti face — forcing fontWeight
  // 900 faux-bolds it into a muddy blob (the old "horrible" look). Render it at
  // its native weight, big, in the theme's signature toxic-lime with a matching
  // glow on the void background.
  if (t.name === 'urban') {
    return {
      fontFamily: t.fontDisplay,
      fontWeight: 'normal',
      fontSize: 60,
      lineHeight: 64,
      color: t.accentA,
      letterSpacing: 1,
      textAlign: 'center',
      marginBottom: 4,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(212,255,0,0.4)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 16,
    }
  }
  // Comic Book: Luckiest Guy is a single-weight display face — faux-bolding it
  // muddies the letters. Render at native weight, big, in pop red with a hard
  // ink drop (offset 3/3, no blur) so it reads like an inked comic title burst.
  if (t.name === 'comic-book') {
    return {
      fontFamily: t.fontDisplay,
      fontWeight: 'normal',
      fontSize: 52,
      color: t.hotRed,
      letterSpacing: 1.5,
      textAlign: 'center',
      marginBottom: 4,
      textTransform: 'uppercase',
      textShadowColor: t.black,
      textShadowOffset: { width: 3, height: 3 },
      textShadowRadius: 0,
    }
  }
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '900',
    fontSize: 44,
    color: t.hotRed,
    letterSpacing: t.displayUppercase ? 3 : -1,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: t.displayUppercase ? 'uppercase' : 'none',
    textShadowColor: t.isDark ? t.accentGlowColor : 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: t.isDark ? 12 : 0,
  }
}
function yupArtStyle(t: ThemeTokens): ViewStyle {
  return {
    width: 200,
    height: 200,
    borderRadius: themeRadius(t, t.radius),
    ...themeCardBorder(t),
    backgroundColor: t.creamDark,
    ...themeShadow(t, 'md'),
    overflow: 'hidden',
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
const toggleRowStyle: ViewStyle = {
  flexDirection: 'row',
  gap: 12,
  width: '100%',
  maxWidth: 360,
  marginTop: 8,
}

// ── Skip button + confirm modal ────────────────────────────────────────────
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
    backgroundColor: t.isDark ? 'transparent' : t.white,
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
