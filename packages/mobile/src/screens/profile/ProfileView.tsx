import React from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/ThemeContext'
import { hexToRgba, themeRadius } from '../../theme/helpers'
import { NwordPassCard } from '../../components/NwordPassCard'
import { PortraitSpotlight } from './PortraitSpotlight'

// The Profile page's presentation. Split from ProfileScreen (which owns the
// hooks, autosave and navigation) so the layout is a pure function of its props
// and can be rendered against any theme, with or without a pass, without a live
// session behind it.
//
// The page is one vertical column with a single rhythm, top-aligned. The previous
// version centred everything in the viewport, which is why it read as a handful of
// unrelated controls floating in a void: the avatar sat too high, the name field
// and the colour row started at different left edges, and the colour row was a
// horizontal scroller sunk inside the page's own padding, so its swatches were cut
// off mid-circle at the screen edge. Here:
//   • the portrait is staged (see PortraitSpotlight) rather than floated,
//   • the name lives in a themed card so it belongs to something,
//   • the colour picker is full-bleed — every theme's picker self-pads and now
//     wraps to a grid, so all thirteen swatches are visible and nothing clips,
//   • "Leave session" is a deliberate, bottom-of-page action rather than a chip
//     absolutely positioned over the content.

// Matches QueueScreen / StageScreen, and the padding each theme's ColorPicker
// applies internally, so every left edge on the page lines up.
const PAGE = 24
// The floating tab bar sits ~96px above the bottom of the screen, plus the home
// indicator inset.
const TAB_BAR_RESERVE = 96

export interface ProfileViewProps {
  name: string
  onNameChange: (next: string) => void
  colorIndex: number
  onColorIndexChange: (next: number) => void
  color: string
  picture: string | null
  onPictureChange: (next: string | null) => void
  /** Null when the user holds no pass — the whole section is then absent. */
  passVariant: 'permanent' | 'one-time' | null
  passHolderName: string
  /** Only a permanent pass can be gifted; a one-time pass renders inert. */
  onSharePass?: () => void
  /** Absent outside a session (the pre-session Profile tab has nothing to leave). */
  onLeaveSession?: () => void
}

export function ProfileView({
  name,
  onNameChange,
  colorIndex,
  onColorIndexChange,
  color,
  picture,
  onPictureChange,
  passVariant,
  passHolderName,
  onSharePass,
  onLeaveSession,
}: ProfileViewProps) {
  const { tokens, ui } = useTheme()
  const insets = useSafeAreaInsets()
  const initial = (name.trim()[0] ?? '').toUpperCase()
  // Several themes paint a pictorial backdrop — retrowave's setting sun,
  // tropical's lagoon, space's starfield, psychedelic's swirl — and hotRed type
  // laid straight onto those is unreadable in places. The one control on this
  // page that isn't inside a card therefore gets a fill of the theme's own
  // background colour to sit on. On themes whose backdrop is a flat `appBg` that
  // fill is the same colour as what's behind it, so it costs nothing.
  const plate = hexToRgba(tokens.appBg, 0.62) ?? 'transparent'

  return (
    <SafeAreaView style={ui.styles.screen} edges={['top', 'left', 'right']}>
      <ui.Backdrop />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            paddingBottom: insets.bottom + TAB_BAR_RESERVE + 24,
          }}
        >
          <View style={{ paddingHorizontal: PAGE, paddingTop: 16 }}>
            {ui.ScreenTitle ? (
              <ui.ScreenTitle title="Profile" />
            ) : (
              <Text style={ui.styles.h1}>Profile</Text>
            )}
          </View>

          {/* A theme may replace the portrait wholesale (see `ProfilePortrait` in
              theme/types.ts). PortraitSpotlight is the shared token-driven
              staging every other theme keeps. */}
          <View style={{ marginTop: 10 }}>
            <ui.ItemFloater>
              {ui.ProfilePortrait ? (
                <ui.ProfilePortrait
                  picture={picture}
                  initial={initial}
                  color={color}
                  onChange={onPictureChange}
                />
              ) : (
                <PortraitSpotlight
                  tokens={tokens}
                  picture={picture}
                  initial={initial}
                  color={color}
                  onChange={onPictureChange}
                />
              )}
            </ui.ItemFloater>
          </View>

          <View style={{ paddingHorizontal: PAGE, marginTop: 16 }}>
            <View style={ui.styles.card}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 9,
                  marginBottom: 10,
                }}
              >
                {/* A live chip of the chosen colour, so the card and the picker
                    below it are visibly the same decision. */}
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: themeRadius(tokens, 999),
                    backgroundColor: color,
                    borderWidth: 1,
                    borderColor: tokens.isDark ? tokens.dimBorder : tokens.black,
                  }}
                />
                <Text style={[ui.styles.sectionLabel, { marginBottom: 0 }]}>
                  Your Name
                </Text>
              </View>
              <TextInput
                value={name}
                onChangeText={onNameChange}
                placeholder="What should we call you?"
                placeholderTextColor={tokens.faint}
                style={[ui.styles.input, { fontSize: 20 }]}
                autoCorrect={false}
                returnKeyType="done"
                maxLength={32}
              />
            </View>
          </View>

          {/* Full-bleed on purpose: the picker pads itself to PAGE and wraps its
              swatches, so it lines up with the cards above without ever being
              trapped inside a narrower container. */}
          <View style={{ marginTop: 26 }}>
            <ui.ColorPicker value={colorIndex} onChange={onColorIndexChange} />
          </View>

          {/* No heading and no instructions — the card is unmistakable on its own,
              and it invites the drag/flip gestures by behaving like an object. */}
          {passVariant ? (
            <View style={{ paddingHorizontal: PAGE, marginTop: 26 }}>
              <NwordPassCard
                holderName={passHolderName}
                variant={passVariant}
                interactive
                onShare={onSharePass}
                style={{ width: '100%', maxWidth: 330, alignSelf: 'center' }}
              />
            </View>
          ) : null}

          {/* Bottom of the page on purpose. This used to be a chip absolutely
              positioned over the top-left of the content, where it collided with
              the heading and put the one destructive action on the screen first in
              the reading order. The confirmation dialog explains that rejoining is
              possible, so no caption is needed here. */}
          {onLeaveSession ? (
            <View style={{ paddingHorizontal: PAGE, marginTop: 34 }}>
              <Pressable
                onPress={onLeaveSession}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  borderWidth: 2,
                  borderColor: tokens.hotRed,
                  borderRadius: themeRadius(tokens, 999),
                  backgroundColor: plate,
                  paddingVertical: 13,
                  alignItems: 'center',
                  opacity: pressed ? 0.55 : 1,
                })}
              >
                <Text
                  style={{
                    fontFamily: tokens.fontDisplay,
                    fontWeight: '800',
                    fontSize: 13,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                    color: tokens.hotRed,
                  }}
                >
                  Leave Session
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
