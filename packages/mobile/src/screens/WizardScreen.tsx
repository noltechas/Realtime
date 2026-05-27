import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  CommonActions,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  addQueueItem,
  listGuests,
  updateQueueItem,
  UNIVERSAL_SINGER_COLORS,
  findColorIndex,
  type KaraokeGuestRow,
  type SingerConfig,
  type ThemeTokens,
} from '@karaoke/shared'
import type { RootStackParamList } from '../navigation/types'
import { useTheme, SessionThemeProvider } from '../theme/ThemeContext'
import { useSession } from '../hooks/useSession'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../supabase/client'
import {
  HudBrackets as SpaceHudBrackets,
  MissionTrail as SpaceMissionTrail,
  AvatarOrbit as SpaceAvatarOrbit,
  PlanetSwatch as SpacePlanetSwatch,
  AddCrewButton as SpaceAddCrewButton,
} from './wizard/SpaceWizardChrome'
import {
  BrassFrame as SteampunkBrassFrame,
  ConveyorTrail as SteampunkConveyorTrail,
  AvatarGearWreath as SteampunkAvatarGearWreath,
  JewelBezelSwatch as SteampunkJewelBezelSwatch,
  SteampunkAddCrewButton,
} from './wizard/SteampunkWizardChrome'
import {
  NeonFrame as RetrowaveNeonFrame,
  SunsetTrail as RetrowaveSunsetTrail,
  AvatarChromeRing as RetrowaveAvatarChromeRing,
  NeonOrbSwatch as RetrowaveNeonOrbSwatch,
  RetrowaveAddCrewButton,
} from './wizard/RetrowaveWizardChrome'

type WizardNav = NativeStackNavigationProp<RootStackParamList, 'Wizard'>
type WizardRouteProp = RouteProp<RootStackParamList, 'Wizard'>

const MAX_SINGERS = 4

interface WizardSinger {
  name: string
  color: string
  colorGlow: string
  roleIndices: number[]
  profilePicture?: string
  guestId?: string
}

const STAGE_THEMES = [
  { key: 'neo-brutal', label: 'Default', bg: '#FFF8EE', text: '#1A1A1A', accent: '#FFD60A' },
  { key: 'cyberpunk', label: 'Cyberpunk', bg: '#0a0a1a', text: '#00ff88', accent: '#ff00ff' },
  { key: 'sketch', label: 'Sketch', bg: '#fdfbf7', text: '#2d5da1', accent: '#2d5da1' },
  { key: 'urban', label: 'Urban', bg: '#0a0a0a', text: '#D4FF00', accent: '#D4FF00' },
  { key: 'deep-sea', label: 'Deep Sea', bg: '#040918', text: '#00ffc8', accent: '#00ffc8' },
  { key: 'psychedelic', label: 'Psychedelic', bg: '#1a0a2e', text: '#ff2d95', accent: '#ff2d95' },
  { key: 'zen', label: 'Zen', bg: '#1a1814', text: '#D4B85A', accent: '#D4B85A' },
  { key: 'space', label: 'Space', bg: '#08080F', text: '#E040FB', accent: '#E040FB' },
  { key: 'steampunk', label: 'Steampunk', bg: '#1F1108', text: '#E8A93B', accent: '#B8762D' },
  { key: 'retrowave', label: 'Retrowave', bg: '#0A0420', text: '#FF2D95', accent: '#FF2D95' },
]

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return ''
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`
}

// Token-driven wizard card chrome. Dispatches on structural flags
// (cardShape / cardBorderWidth / shadowStyle / isDark) — no theme-name
// branching, except zen and space which have structural needs (tatami
// binding / HUD corner brackets) that aren't expressible through the
// existing flags. Per-theme structural feel:
//   - zen                                    → tatami binding: vermillion top/bottom bands with gold-hairline sides
//   - space                                  → HUD console: void panel, magenta/cyan rim, corner brackets
//   - sketch (cardShape: 'blob' + offset)   → post-it note: warm paper, slight rotation, blob radii
//   - psychedelic (cardShape: 'blob' + glow) → translucent purple panel with asymmetric blob corners + pink halo
//   - urban  (cardBorderWidth: 0)            → parallelogram skew with accent edge
//   - dark   (cyberpunk, deep-sea)           → translucent panel with accent glow
//   - default (neo-brutal)                   → solid white card with hard black border
function wizardCardStyle(tokens: ThemeTokens, color?: string, overrides?: any, index: number = 0): any {
  if (tokens.name === 'space') {
    // Space HUD console — translucent void panel with a magenta rim (or
    // singer-color override) and a soft plasma glow. Corners are clean (the
    // visible HUD brackets are layered in via WizardSpaceBrackets below).
    return {
      backgroundColor: 'rgba(14,14,26,0.78)',
      borderWidth: 1,
      borderColor: color || 'rgba(224,64,251,0.4)',
      borderRadius: 8,
      shadowColor: color || tokens.accentGlowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 12,
      ...overrides,
    }
  }
  if (tokens.name === 'retrowave') {
    // Retrowave — deep-indigo arcade-console card with a hot-pink rim and a
    // strong pink/cyan dual glow. Sharp corners (radius: 0) — every retrowave
    // surface is angular. NeonFrame corner brackets get layered in by the
    // caller. The color override drives the rim color so singer cards pick
    // up their identity color in the chrome.
    return {
      backgroundColor: '#1A0A3A',
      borderWidth: 1.5,
      borderColor: color || '#FF2D95',
      borderRadius: 0,
      shadowColor: color || '#FF2D95',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.85,
      shadowRadius: 12,
      ...overrides,
    }
  }
  if (tokens.name === 'steampunk') {
    // Steampunk — dark mahogany panel with a thick brass rim and an amber
    // gas-lamp glow. The visible corner rivets + filigree edges are layered
    // in via SteampunkBrassFrame below. The color override drives the brass
    // rim color so singer cards pick up their identity color in the chrome.
    return {
      backgroundColor: '#2A1A0E',
      borderWidth: 2,
      borderColor: color || '#B8762D',
      borderRadius: 8,
      shadowColor: color || '#E8A93B',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 12,
      ...overrides,
    }
  }
  if (tokens.name === 'zen') {
    // Zen tatami binding — thick vermillion (or singer-color) bands top and
    // bottom with gold-hairline sides on a dark-stone surface. Sharp corners,
    // no shadows or glows. The singer-color override flows through `color`
    // so singer cards get their identity color in the binding.
    return {
      backgroundColor: tokens.creamDark,
      borderTopWidth: 4,
      borderBottomWidth: 4,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderTopColor: color || '#D4442A',
      borderBottomColor: color || '#D4442A',
      borderLeftColor: 'rgba(212,184,90,0.35)',
      borderRightColor: 'rgba(212,184,90,0.35)',
      borderRadius: 0,
      ...overrides,
    }
  }
  if (tokens.cardShape === 'blob' && tokens.shadowStyle === 'glow') {
    // Psychedelic — translucent deep-purple panel that lets the lava-lamp
    // backdrop bleed through, framed in a fat 2px hot-pink rim with a strong
    // neon glow. Simple rounded corners (no blob) per request — the
    // psychedelic identity comes from the *halo + tint*, not from the
    // silhouette. Singer-color override drives both the border and the glow
    // hue, so singer cards pick up their identity color in the chrome.
    return {
      backgroundColor: 'rgba(42,20,80,0.58)',
      borderWidth: 2,
      borderColor: color || 'rgba(255,45,149,0.6)',
      shadowColor: color || tokens.accentGlowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.75,
      shadowRadius: 18,
      borderRadius: 22,
      ...overrides,
    }
  }
  if (tokens.cardShape === 'blob') {
    const angle = (index % 2 === 0 ? 1 : -1) * (0.4 + (index % 3) * 0.2)
    return {
      backgroundColor: '#FEF9DA',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
      borderBottomLeftRadius: 4,
      borderBottomRightRadius: 8,
      borderTopLeftRadius: 2,
      borderTopRightRadius: 1,
      transform: [{ rotate: `${angle}deg` }],
      ...overrides,
    }
  }
  if (tokens.cardBorderWidth === 0) {
    return {
      backgroundColor: tokens.creamDark,
      borderWidth: 2,
      borderColor: tokens.dimBorder,
      borderRightWidth: 4,
      borderBottomWidth: 4,
      borderRightColor: color || tokens.accentA,
      borderBottomColor: color || tokens.accentA,
      transform: [{ skewX: '-8deg' }],
      ...overrides,
    }
  }
  if (tokens.isDark) {
    return {
      backgroundColor: tokens.creamDark,
      borderWidth: 1,
      borderColor: color || tokens.dimBorder,
      borderBottomWidth: 3,
      borderRadius: tokens.cornerStyle === 'sharp' ? 0 : tokens.radius,
      ...(color
        ? {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
          }
        : null),
      ...overrides,
    }
  }
  return {
    backgroundColor: tokens.white,
    borderWidth: tokens.cardBorderWidth,
    borderColor: tokens.black,
    borderRadius: tokens.cornerStyle === 'sharp' ? 0 : tokens.radius,
    ...overrides,
  }
}

// Counter-transform for wizardCardStyle's outer transform so text/icons inside
// the card sit straight. Sketch un-rotates, urban un-skews, others no-op
// (psychedelic blob has no rotation).
function wizardCardUnskew(tokens: ThemeTokens, index: number = 0): { transform: any[] } {
  if (tokens.cardBorderWidth === 0) return { transform: [{ skewX: '8deg' }] }
  if (tokens.cardShape === 'blob' && tokens.shadowStyle !== 'glow') {
    const angle = (index % 2 === 0 ? 1 : -1) * (0.4 + (index % 3) * 0.2)
    return { transform: [{ rotate: `${-angle}deg` }] }
  }
  return { transform: [] }
}

// Psychedelic adds a hot-pink glow + brighter rim to small chrome elements
// (inputs, icon buttons, swatches) so they read on-theme inside the wizard
// instead of as generic dark-mode chips. Returns a style fragment for the
// glow + border override, or null on other themes.
function psyChromeExtras(tokens: ThemeTokens): any {
  if (tokens.shadowStyle !== 'glow' || tokens.cardShape !== 'blob') return null
  return {
    borderColor: tokens.accentA,
    shadowColor: tokens.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
  }
}

// Psychedelic also wants display headings (step indicator, "Add a singer",
// etc.) to glow softly so they pop against the lava-lamp backdrop.
function psyHeadingExtras(tokens: ThemeTokens): any {
  if (tokens.shadowStyle !== 'glow' || tokens.cardShape !== 'blob') return null
  return {
    textShadowColor: 'rgba(255,45,149,0.55)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  }
}

// Steampunk wants its Cinzel headings to read as engraved brass plaques —
// gas-lamp amber glow + extra letter spacing + uppercase. Returns a style
// fragment for the wizard step titles ("Who's singing?", "Finish up", etc.).
function steamHeadingExtras(tokens: ThemeTokens): any {
  if (tokens.name !== 'steampunk') return null
  return {
    color: '#E8A93B',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(232,169,59,0.65)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  }
}

// Steampunk wants small chrome (icon buttons, the close button, modal input
// chips) to pick up a brass border + amber glow so they feel part of the
// machinery. Returns null on every other theme.
function steamChromeExtras(tokens: ThemeTokens): any {
  if (tokens.name !== 'steampunk') return null
  return {
    borderColor: '#B8762D',
    shadowColor: '#E8A93B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
  }
}

// Retrowave wants its Monoton step titles to read as neon-tube signage:
// chromatic-aberration-adjacent glow, hot-pink color, extra letter-spacing,
// italic uppercase, sharp drop shadow on the cyan side.
function retroHeadingExtras(tokens: ThemeTokens): any {
  if (tokens.name !== 'retrowave') return null
  return {
    color: '#FFFFFF',
    fontFamily: 'Monoton_400Regular',
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255,45,149,0.95)',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  }
}

// Retrowave small-chrome: pink rim + glow, used on the close button, modal
// input chip, and "Add" button so they read as neon-edge controls.
function retroChromeExtras(tokens: ThemeTokens): any {
  if (tokens.name !== 'retrowave') return null
  return {
    borderColor: '#FF2D95',
    borderRadius: 0,
    shadowColor: '#FF2D95',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
  }
}

// Public entry point — wraps the wizard body in SessionThemeProvider so the
// modal picks up the live session theme (the modal is mounted from the
// RootStack, outside SessionTabs, so it doesn't inherit that provider).
export function WizardScreen() {
  return (
    <SessionThemeProvider>
      <WizardBody />
    </SessionThemeProvider>
  )
}

function WizardBody() {
  const { tokens, ui } = useTheme()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<WizardNav>()
  const route = useRoute<WizardRouteProp>()
  const { track, edit } = route.params
  const isEditMode = !!edit
  const { session } = useSession()
  const { profile, loading: profileLoading } = useProfile()

  const roles = useMemo(() => track.roles ?? [], [track])
  const hasRoles = roles.length > 1

  const [step, setStep] = useState<2 | 3 | 4>(2)
  // Start empty; seed once AsyncStorage hands us the profile + session. The
  // previous lazy-initializer approach captured null values when those hooks
  // were still loading on first render, leaving singer 1 as "Singer".
  const [singers, setSingers] = useState<WizardSinger[]>([])
  const seededRef = useRef(false)

  useEffect(() => {
    if (seededRef.current) return
    if (profileLoading) return
    seededRef.current = true
    // Edit mode: rehydrate singers exactly as the queue row recorded them.
    // No defaulting to current profile — the user is editing a prior config.
    if (edit) {
      setSingers(
        edit.singerConfigs.map((sc) => ({
          name: sc.name || 'Singer',
          color: sc.color,
          colorGlow: sc.colorGlow,
          roleIndices: Array.isArray(sc.roleIndices) ? sc.roleIndices : [],
          ...(sc.profilePicture ? { profilePicture: sc.profilePicture } : {}),
        })),
      )
      return
    }
    const guestName =
      profile?.name?.trim() || session?.guestName?.trim() || 'Singer'
    const colorIdx = findColorIndex(profile?.defaultColor)
    const c = UNIVERSAL_SINGER_COLORS[colorIdx] ?? UNIVERSAL_SINGER_COLORS[0]
    setSingers([
      {
        name: guestName,
        color: c.color,
        colorGlow: c.colorGlow,
        roleIndices: [],
        ...(profile?.profilePicture
          ? { profilePicture: profile.profilePicture }
          : {}),
        ...(session?.guestId ? { guestId: session.guestId } : {}),
      },
    ])
  }, [profileLoading, profile, session, tokens, edit])
  const [stageTheme, setStageTheme] = useState<string | null>(edit?.stageTheme ?? null)
  const [hideSong, setHideSong] = useState<boolean>(edit?.isHidden ?? false)
  const [submitting, setSubmitting] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [guests, setGuests] = useState<KaraokeGuestRow[]>([])
  const [customName, setCustomName] = useState('')

  useEffect(() => {
    if (!session) return
    void listGuests(supabase, session.sessionId).then(setGuests).catch(() => {})
  }, [session?.sessionId])

  const closeAndExit = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const onClose = useCallback(() => {
    // Edit mode always confirms — every edit starts with the rehydrated row's
    // state, so a "is it different from defaults?" check would false-positive.
    const dirty =
      isEditMode ||
      singers.length > 1 ||
      singers.some((s) => s.roleIndices.length > 0) ||
      stageTheme !== null ||
      hideSong
    if (!dirty) return closeAndExit()
    Alert.alert(isEditMode ? 'Discard changes?' : 'Discard this song setup?', undefined, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: closeAndExit },
    ])
  }, [singers, stageTheme, hideSong, closeAndExit, isEditMode])

  const goNext = useCallback(() => {
    if (step === 2) {
      if (!hasRoles) {
        // Auto-assign the single role (if any) to every singer so the desktop
        // app still picks one when it dispatches the song.
        if (roles.length === 1) {
          setSingers((prev) => prev.map((s) => ({ ...s, roleIndices: [0] })))
        }
        setStep(4)
        return
      }
      setStep(3)
      return
    }
    if (step === 3) {
      setStep(4)
      return
    }
  }, [step, hasRoles, roles.length])

  const goBack = useCallback(() => {
    if (step === 4) {
      setStep(hasRoles ? 3 : 2)
      return
    }
    if (step === 3) {
      setStep(2)
      return
    }
    onClose()
  }, [step, hasRoles, onClose])

  const submit = useCallback(async () => {
    if (!session) return
    // Soft warning if singers are missing roles on a multi-role track.
    if (hasRoles) {
      const unassigned = singers.filter((s) => s.roleIndices.length === 0).length
      if (unassigned > 0) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Roles missing',
            `${unassigned === 1 ? '1 singer hasn’t' : `${unassigned} singers haven’t`} been assigned a role. ${isEditMode ? 'Save changes' : 'Add to queue'} anyway?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: isEditMode ? 'Save anyway' : 'Add anyway', onPress: () => resolve(true) },
            ],
          )
        })
        if (!proceed) return
      }
    }

    setSubmitting(true)
    try {
      const configs: SingerConfig[] = singers.map((s) => {
        const sc: SingerConfig = {
          name: s.name.trim() || 'Singer',
          color: s.color,
          colorGlow: s.colorGlow,
          roleIndices: s.roleIndices,
        }
        if (s.profilePicture) sc.profilePicture = s.profilePicture
        // Persist the guestId so the live session can identify the local
        // singer by their stable session-scoped UUID instead of by display
        // name. Without this, a singer whose `name` was stamped from
        // `profile.name` won't match a `guestIsUp()` lookup that compares
        // against `session.guestName` (since those two values drift apart
        // any time the user edits their profile after joining).
        if (s.guestId) sc.guestId = s.guestId
        return sc
      })
      if (isEditMode && edit) {
        await updateQueueItem(supabase, {
          queueRowId: edit.queueRowId,
          singerConfigs: configs,
          stageTheme: stageTheme ?? null,
          isHidden: hideSong,
        })
      } else {
        await addQueueItem(supabase, {
          sessionId: session.sessionId,
          trackId: track.track_id,
          trackName: track.name,
          trackArtist: track.artist,
          trackArtUrl: track.art_url,
          trackDurationMs: track.duration_ms,
          singerConfigs: configs,
          addedByGuestId: session.guestId,
          addedByName: singers[0]?.name ?? session.guestName,
          stageTheme: stageTheme ?? null,
          isHidden: hideSong,
        })
      }
      // React Navigation 7 native-stack changed NAVIGATE semantics: by default
      // it PUSHES even when the target screen is already in the stack. From
      // inside the Wizard modal, a plain `navigate('Session', ...)` would
      // stack a new Session on top of the Wizard — the iOS pageSheet would
      // stay visible and the user could drag it down to reveal the half-
      // mounted Wizard underneath. Passing `pop: true` makes navigate find
      // the existing Session route below and pop the Wizard off, while the
      // `screen: 'Queue'` nested param still routes the SessionTabs to Queue.
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Session',
          params: { screen: 'Queue' },
          pop: true,
        }),
      )
    } catch (err: any) {
      Alert.alert(isEditMode ? "Couldn't save" : "Couldn't add", err?.message ?? String(err))
    } finally {
      setSubmitting(false)
    }
  }, [
    session,
    singers,
    hasRoles,
    track,
    stageTheme,
    hideSong,
    navigation,
    isEditMode,
    edit,
  ])

  const stepLabel = step === 2 ? 'Singers' : step === 3 ? 'Roles' : 'Finish'
  const stepCount = hasRoles ? 3 : 2

  return (
    <SafeAreaView style={ui.styles.screen} edges={['top', 'left', 'right']}>
      <ui.Backdrop />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 12,
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{
              width: 36,
              height: 36,
              borderRadius: tokens.cornerStyle === 'sharp' ? 0 : 18,
              borderWidth: tokens.isDark ? 1 : 2,
              borderColor: tokens.isDark ? tokens.dimBorder : tokens.black,
              backgroundColor: tokens.isDark ? 'transparent' : tokens.white,
              alignItems: 'center',
              justifyContent: 'center',
              ...(psyChromeExtras(tokens) ?? {}),
              ...(steamChromeExtras(tokens) ?? {}),
              ...(retroChromeExtras(tokens) ?? {}),
            }}
          >
            <CloseGlyph color={tokens.isDark ? tokens.accentA : tokens.black} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            {tokens.name === 'space' ? (
              <SpaceMissionTrail
                current={step === 4 ? stepCount : step - 1}
                total={stepCount}
                label={stepLabel}
              />
            ) : tokens.name === 'steampunk' ? (
              <SteampunkConveyorTrail
                current={step === 4 ? stepCount : step - 1}
                total={stepCount}
                label={stepLabel}
              />
            ) : tokens.name === 'retrowave' ? (
              <RetrowaveSunsetTrail
                current={step === 4 ? stepCount : step - 1}
                total={stepCount}
                label={stepLabel}
              />
            ) : (
              <>
                <Text
                  style={{
                    fontFamily: tokens.fontDisplay,
                    fontWeight: '800',
                    fontSize: 11,
                    letterSpacing: 2,
                    color: tokens.muted,
                    textTransform: 'uppercase',
                  }}
                >
                  Step {step === 4 ? stepCount : step - 1} of {stepCount}
                </Text>
                <Text
                  style={{
                    fontFamily: tokens.fontDisplay,
                    fontWeight: '900',
                    fontSize: 18,
                    color: tokens.black,
                    marginTop: 2,
                    ...(psyHeadingExtras(tokens) ?? {}),
                    ...(steamHeadingExtras(tokens) ?? {}),
                    ...(retroHeadingExtras(tokens) ?? {}),
                  }}
                >
                  {stepLabel}
                </Text>
              </>
            )}
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Song banner */}
        <View
          style={wizardCardStyle(tokens, undefined, {
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 10,
            overflow: 'hidden',
          })}
        >
          {tokens.name === 'space' ? (
            <SpaceHudBrackets size={10} thickness={1.2} inset={2} />
          ) : tokens.name === 'steampunk' ? (
            <SteampunkBrassFrame size={8} filigree />
          ) : tokens.name === 'retrowave' ? (
            <RetrowaveNeonFrame size={10} thickness={1.2} inset={2} />
          ) : null}
          <View style={[{ flexDirection: 'row', alignItems: 'center', flex: 1 }, wizardCardUnskew(tokens)]}>
            {track.art_url ? (
              <Image
                source={{ uri: track.art_url }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: tokens.cornerStyle === 'sharp' ? 0 : 6,
                  borderWidth: tokens.isDark ? 1 : 2,
                  borderColor: tokens.isDark ? tokens.dimBorder : tokens.black,
                }}
              />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: tokens.cornerStyle === 'sharp' ? 0 : 6,
                  borderWidth: tokens.isDark ? 1 : 2,
                  borderColor: tokens.isDark ? tokens.dimBorder : tokens.black,
                  backgroundColor: tokens.creamDark,
                }}
              />
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  fontFamily: tokens.fontDisplay,
                  fontWeight: '900',
                  fontSize: 14,
                  color: tokens.black,
                }}
                numberOfLines={1}
              >
                {track.name}
              </Text>
              <Text style={{ fontFamily: tokens.fontBody, fontSize: 13, color: tokens.muted }} numberOfLines={1}>
                {track.artist}
                {track.duration_ms ? `  ·  ${formatDuration(track.duration_ms)}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Step body */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 2 ? (
            <SingersStep
              singers={singers}
              setSingers={setSingers}
              onAddPress={() => setPickerOpen(true)}
            />
          ) : null}
          {step === 3 ? (
            <RolesStep
              singers={singers}
              setSingers={setSingers}
              roles={roles}
            />
          ) : null}
          {step === 4 ? (
            <StageStep
              stageTheme={stageTheme}
              onStageThemeChange={setStageTheme}
              hideSong={hideSong}
              onHideSongChange={setHideSong}
            />
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12),
            gap: 10,
            borderTopWidth: 1,
            borderColor: tokens.dimBorder,
            backgroundColor: tokens.appBg,
          }}
        >
          <View style={{ flex: 1 }}>
            <ui.Button
              label={step === 2 ? 'Cancel' : 'Back'}
              variant="outline"
              onPress={goBack}
            />
          </View>
          <View style={{ flex: 1 }}>
            {step === 4 ? (
              <ui.Button
                label={isEditMode ? 'Save Changes' : 'Add to Queue'}
                onPress={submit}
                loading={submitting}
              />
            ) : (
              <ui.Button label="Next" onPress={goNext} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {pickerOpen ? (
        <SingerPicker
          guests={guests}
          singers={singers}
          customName={customName}
          onCustomNameChange={setCustomName}
          onPickGuest={(g) => {
            if (singers.length >= MAX_SINGERS) return
            const taken = singers.map((s) => s.color.toLowerCase())
            const idx = findFreeColorIndex(g.default_color, taken)
            const c = UNIVERSAL_SINGER_COLORS[idx]
            setSingers([
              ...singers,
              {
                name: g.name,
                color: c.color,
                colorGlow: c.colorGlow,
                roleIndices: [],
                ...(g.profile_picture ? { profilePicture: g.profile_picture } : {}),
                guestId: g.id,
              },
            ])
            setPickerOpen(false)
          }}
          onAddCustom={() => {
            const trimmed = customName.trim()
            if (!trimmed) return
            if (singers.length >= MAX_SINGERS) return
            const taken = singers.map((s) => s.color.toLowerCase())
            const idx = findFreeColorIndex(undefined, taken)
            const c = UNIVERSAL_SINGER_COLORS[idx]
            setSingers([
              ...singers,
              {
                name: trimmed,
                color: c.color,
                colorGlow: c.colorGlow,
                roleIndices: [],
              },
            ])
            setCustomName('')
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  )
}

function findFreeColorIndex(
  preferred: string | null | undefined,
  taken: string[],
): number {
  if (preferred) {
    const idx = UNIVERSAL_SINGER_COLORS.findIndex(
      (c) => c.color.toLowerCase() === preferred.toLowerCase(),
    )
    if (idx >= 0 && !taken.includes(preferred.toLowerCase())) return idx
  }
  for (let i = 0; i < UNIVERSAL_SINGER_COLORS.length; i++) {
    const c = UNIVERSAL_SINGER_COLORS[i]
    if (!taken.includes(c.color.toLowerCase())) return i
  }
  return 0
}

function SingersStep({
  singers,
  setSingers,
  onAddPress,
}: {
  singers: WizardSinger[]
  setSingers: React.Dispatch<React.SetStateAction<WizardSinger[]>>
  onAddPress: () => void
}) {
  const { tokens } = useTheme()
  const takenColors = useMemo(() => {
    const m = new Map<string, number>()
    singers.forEach((s, i) => m.set(s.color.toLowerCase(), i))
    return m
  }, [singers])

  const setColor = useCallback(
    (singerIdx: number, color: string, glow: string) => {
      setSingers((prev) =>
        prev.map((s, i) => (i === singerIdx ? { ...s, color, colorGlow: glow } : s)),
      )
    },
    [setSingers],
  )

  const remove = useCallback(
    (singerIdx: number) => {
      setSingers((prev) => prev.filter((_, i) => i !== singerIdx))
    },
    [setSingers],
  )

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '900',
          fontSize: 24,
          color: tokens.black,
          letterSpacing: -0.5,
          marginBottom: 16,
          ...(steamHeadingExtras(tokens) ?? {}),
          ...(retroHeadingExtras(tokens) ?? {}),
        }}
      >
        Who's singing?
      </Text>

      {singers.map((s, i) => (
        <View
          key={`${i}-${s.guestId ?? s.name}`}
          style={wizardCardStyle(tokens, s.color, {
            padding: 12,
            marginBottom: 12,
            overflow: 'hidden',
          }, i)}
        >
          {tokens.name === 'space' ? (
            <SpaceHudBrackets size={10} thickness={1.2} inset={3} topColor={s.color} bottomColor="#40E0D0" />
          ) : tokens.name === 'steampunk' ? (
            <SteampunkBrassFrame size={9} rivetColor={s.color} filigree />
          ) : tokens.name === 'retrowave' ? (
            <RetrowaveNeonFrame size={10} thickness={1.4} inset={3} topColor={s.color} bottomColor="#00F0FF" />
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, transform: wizardCardUnskew(tokens, i).transform as any }}>
            {tokens.name === 'space' ? (
              <View style={{ marginRight: 12 }}>
                <SpaceAvatarOrbit size={44} color={s.color}>
                  {s.profilePicture ? (
                    <Image
                      source={{ uri: s.profilePicture }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      style={{
                        fontFamily: tokens.fontDisplay,
                        fontWeight: '900',
                        fontSize: 18,
                        color: '#08080F',
                      }}
                    >
                      {(s.name?.[0] ?? '?').toUpperCase()}
                    </Text>
                  )}
                </SpaceAvatarOrbit>
              </View>
            ) : tokens.name === 'steampunk' ? (
              <View style={{ marginRight: 12 }}>
                <SteampunkAvatarGearWreath size={44} color={s.color}>
                  {s.profilePicture ? (
                    <Image
                      source={{ uri: s.profilePicture }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      style={{
                        fontFamily: tokens.fontDisplay,
                        fontWeight: '900',
                        fontSize: 18,
                        color: '#1F1108',
                      }}
                    >
                      {(s.name?.[0] ?? '?').toUpperCase()}
                    </Text>
                  )}
                </SteampunkAvatarGearWreath>
              </View>
            ) : tokens.name === 'retrowave' ? (
              <View style={{ marginRight: 12 }}>
                <RetrowaveAvatarChromeRing size={44} color={s.color}>
                  {s.profilePicture ? (
                    <Image
                      source={{ uri: s.profilePicture }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      style={{
                        fontFamily: tokens.fontBody,
                        fontWeight: '900',
                        fontSize: 18,
                        color: '#0A0420',
                        fontStyle: 'italic',
                      }}
                    >
                      {(s.name?.[0] ?? '?').toUpperCase()}
                    </Text>
                  )}
                </RetrowaveAvatarChromeRing>
              </View>
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  backgroundColor: s.color,
                  borderWidth: 2,
                  borderColor: tokens.isDark ? tokens.accentA : tokens.black,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  marginRight: 12,
                }}
              >
                {s.profilePicture ? (
                  <Image
                    source={{ uri: s.profilePicture }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    style={{
                      fontFamily: tokens.fontDisplay,
                      fontWeight: '900',
                      fontSize: 18,
                      color: tokens.black,
                    }}
                  >
                    {(s.name?.[0] ?? '?').toUpperCase()}
                  </Text>
                )}
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={{
                    fontFamily: tokens.fontDisplay,
                    fontWeight: '900',
                    fontSize: 16,
                    color: tokens.black,
                  }}
                  numberOfLines={1}
                >
                  {s.name || `Singer ${i + 1}`}
                </Text>
                {i === 0 ? (
                  <View
                    style={{
                      backgroundColor: tokens.vividYellow,
                      borderWidth: 1,
                      borderColor: tokens.isDark ? tokens.accentA : tokens.black,
                      borderRadius: 999,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: tokens.fontDisplay,
                        fontWeight: '900',
                        fontSize: 10,
                        letterSpacing: 0.5,
                        color: tokens.black,
                      }}
                    >
                      YOU
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontFamily: tokens.fontBody, fontSize: 12, color: tokens.muted }}>
                Singer {i + 1}
              </Text>
            </View>
            {i > 0 ? (
              <Pressable
                onPress={() => remove(i)}
                hitSlop={10}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: tokens.isDark ? tokens.dimBorder : tokens.black,
                  backgroundColor: tokens.isDark ? tokens.appBg : tokens.white,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CloseGlyph color={tokens.black} size={14} />
              </Pressable>
            ) : null}
          </View>

          <View style={[{ marginTop: 12 }, wizardCardUnskew(tokens)]}>
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontWeight: '800',
                fontSize: 10,
                letterSpacing: 1.5,
                color: tokens.muted,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Pick {i === 0 ? 'your' : `${s.name || 'singer'}’s`} color
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {UNIVERSAL_SINGER_COLORS.map((c, ci) => {
                const lc = c.color.toLowerCase()
                const selected = lc === s.color.toLowerCase()
                const takenByOther = takenColors.has(lc) && takenColors.get(lc) !== i
                if (tokens.name === 'space') {
                  return (
                    <SpacePlanetSwatch
                      key={c.color}
                      color={c.color}
                      selected={selected}
                      takenByOther={takenByOther}
                      seed={ci}
                      onPress={() => setColor(i, c.color, c.colorGlow)}
                    />
                  )
                }
                if (tokens.name === 'steampunk') {
                  return (
                    <SteampunkJewelBezelSwatch
                      key={c.color}
                      color={c.color}
                      selected={selected}
                      takenByOther={takenByOther}
                      seed={ci}
                      onPress={() => setColor(i, c.color, c.colorGlow)}
                    />
                  )
                }
                if (tokens.name === 'retrowave') {
                  return (
                    <RetrowaveNeonOrbSwatch
                      key={c.color}
                      color={c.color}
                      selected={selected}
                      takenByOther={takenByOther}
                      seed={ci}
                      onPress={() => setColor(i, c.color, c.colorGlow)}
                    />
                  )
                }
                return (
                  <Pressable
                    key={c.color}
                    onPress={() => {
                      if (takenByOther) return
                      setColor(i, c.color, c.colorGlow)
                    }}
                    hitSlop={4}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: tokens.cornerStyle === 'sharp' ? 0 : 999,
                      backgroundColor: c.color,
                      borderWidth: selected ? 4 : 2,
                      borderColor: selected
                        ? (tokens.black)
                        : takenByOther
                        ? (tokens.dimBorder)
                        : (tokens.muted),
                      opacity: takenByOther ? 0.35 : 1,
                    }}
                  />
                )
              })}
            </View>
          </View>
        </View>
      ))}

      {singers.length < MAX_SINGERS ? (
        tokens.name === 'space' ? (
          <SpaceAddCrewButton onPress={onAddPress} />
        ) : tokens.name === 'steampunk' ? (
          <SteampunkAddCrewButton onPress={onAddPress} />
        ) : tokens.name === 'retrowave' ? (
          <RetrowaveAddCrewButton onPress={onAddPress} />
        ) : (
          <Pressable
            onPress={onAddPress}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 14,
              borderRadius: tokens.radius,
              borderWidth: 2,
              borderColor: tokens.isDark ? tokens.accentA : tokens.black,
              borderStyle: 'dashed',
              backgroundColor: pressed ? tokens.pressedOverlay : 'transparent',
            })}
          >
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontWeight: '900',
                fontSize: 22,
                color: tokens.black,
                marginRight: 8,
              }}
            >
              +
            </Text>
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontWeight: '800',
                fontSize: 14,
                color: tokens.black,
                letterSpacing: 0.2,
              }}
            >
              Add another singer
            </Text>
          </Pressable>
        )
      ) : null}
    </View>
  )
}

function RolesStep({
  singers,
  setSingers,
  roles,
}: {
  singers: WizardSinger[]
  setSingers: React.Dispatch<React.SetStateAction<WizardSinger[]>>
  roles: string[]
}) {
  const { tokens } = useTheme()
  const toggle = useCallback(
    (singerIdx: number, roleIdx: number) => {
      setSingers((prev) =>
        prev.map((s, i) => {
          if (i !== singerIdx) return s
          const has = s.roleIndices.includes(roleIdx)
          return {
            ...s,
            roleIndices: has
              ? s.roleIndices.filter((r) => r !== roleIdx)
              : [...s.roleIndices, roleIdx].sort((a, b) => a - b),
          }
        }),
      )
    },
    [setSingers],
  )

  const unassigned = singers.filter((s) => s.roleIndices.length === 0).length

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '900',
          fontSize: 24,
          color: tokens.black,
          letterSpacing: -0.5,
          ...(steamHeadingExtras(tokens) ?? {}),
          ...(retroHeadingExtras(tokens) ?? {}),
        }}
      >
        Who sings what?
      </Text>
      <Text
        style={{
          fontFamily: tokens.fontBody,
          fontSize: 14,
          color: tokens.muted,
          marginTop: 4,
          marginBottom: 16,
        }}
      >
        Tap a singer for each part. Multi-select for duets — a singer can cover multiple parts too.
      </Text>

      {roles.map((roleName, ri) => (
        <View
          key={`${ri}-${roleName}`}
          style={wizardCardStyle(tokens, undefined, {
            padding: 12,
            marginBottom: 12,
            overflow: 'hidden',
          })}
        >
          {tokens.name === 'space' ? (
            <SpaceHudBrackets size={10} thickness={1.2} inset={3} />
          ) : tokens.name === 'steampunk' ? (
            <SteampunkBrassFrame size={9} filigree />
          ) : tokens.name === 'retrowave' ? (
            <RetrowaveNeonFrame size={10} thickness={1.4} inset={3} />
          ) : null}
          <View style={wizardCardUnskew(tokens)}>
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontWeight: '800',
              fontSize: 10,
              letterSpacing: 1.5,
              color: tokens.muted,
              textTransform: 'uppercase',
            }}
          >
            Who sings
          </Text>
          <Text
            style={{
              fontFamily: tokens.fontDisplay,
              fontWeight: '900',
              fontSize: 18,
              color: tokens.black,
              marginTop: 2,
              marginBottom: 12,
            }}
          >
            {roleName}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {singers.map((s, si) => {
              const active = s.roleIndices.includes(ri)
              return (
                <Pressable
                  key={si}
                  onPress={() => toggle(si, ri)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: active ? s.color : tokens.dimBorder,
                    backgroundColor: active ? s.colorGlow : 'transparent',
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      backgroundColor: s.color,
                      borderWidth: 1,
                      borderColor: tokens.isDark ? tokens.accentA : tokens.black,
                      marginRight: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {s.profilePicture ? (
                      <Image
                        source={{ uri: s.profilePicture }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text
                        style={{
                          fontFamily: tokens.fontDisplay,
                          fontWeight: '900',
                          fontSize: 11,
                          color: tokens.black,
                          zIndex: 1,
                        }}
                      >
                        {(s.name?.[0] ?? '?').toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{
                      fontFamily: tokens.fontDisplay,
                      fontWeight: '800',
                      fontSize: 13,
                      color: tokens.black,
                    }}
                  >
                    {s.name || `Singer ${si + 1}`}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          </View>
        </View>
      ))}

      {unassigned > 0 ? (
        <View
          style={wizardCardStyle(tokens, tokens.hotRed, {
            flexDirection: 'row',
            backgroundColor: tokens.vividYellow,
            padding: 12,
            marginTop: 4,
          })}
        >
          <View style={[{ flexDirection: 'row', flex: 1 }, wizardCardUnskew(tokens)]}>
            <Text style={{ fontSize: 18, marginRight: 8, color: '#1a1814' }}>!</Text>
            <Text style={{ flex: 1, fontFamily: tokens.fontBody, fontSize: 13, color: '#1a1814' }}>
              {unassigned === 1 ? '1 singer hasn’t' : `${unassigned} singers haven’t`} been
              assigned a role. Tap their name above, or continue if they’re just hanging out.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}

function StageStep({
  stageTheme,
  onStageThemeChange,
  hideSong,
  onHideSongChange,
}: {
  stageTheme: string | null
  onStageThemeChange: (k: string | null) => void
  hideSong: boolean
  onHideSongChange: (v: boolean) => void
}) {
  const { tokens } = useTheme()
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '900',
          fontSize: 24,
          color: tokens.black,
          letterSpacing: -0.5,
          ...(steamHeadingExtras(tokens) ?? {}),
          ...(retroHeadingExtras(tokens) ?? {}),
        }}
      >
        Finish up
      </Text>
      <Text
        style={{
          fontFamily: tokens.fontBody,
          fontSize: 14,
          color: tokens.muted,
          marginTop: 4,
          marginBottom: 16,
        }}
      >
        Pick a stage theme and decide whether the title stays a secret until it plays.
      </Text>

      <Text
        style={{
          fontFamily: tokens.fontDisplay,
          fontWeight: '800',
          fontSize: 11,
          letterSpacing: 2,
          color: tokens.muted,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        Stage theme
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {STAGE_THEMES.map((t, ti) => {
          const selected = stageTheme === t.key
          return (
            <Pressable
              key={t.key}
              onPress={() => onStageThemeChange(selected ? null : t.key)}
              style={wizardCardStyle(tokens, undefined, {
                paddingHorizontal: 14,
                paddingVertical: 12,
                minWidth: '47%',
                backgroundColor: t.bg,
                borderWidth: selected ? 3 : tokens.isDark ? 1 : 1.5,
                borderColor: selected ? (tokens.isDark ? tokens.accentA : tokens.black) : t.accent,
                alignItems: 'center',
                overflow: 'hidden',
              })}
            >
              {tokens.name === 'space' ? (
                <SpaceHudBrackets
                  size={8}
                  thickness={1.2}
                  inset={3}
                  topColor={t.accent}
                  bottomColor={t.accent}
                />
              ) : tokens.name === 'steampunk' ? (
                <SteampunkBrassFrame size={7} rivetColor={t.accent} filigree={false} />
              ) : tokens.name === 'retrowave' ? (
                <RetrowaveNeonFrame size={8} thickness={1.1} inset={3} topColor={t.accent} bottomColor={t.accent} />
              ) : null}
              <View style={wizardCardUnskew(tokens)}>
                <Text
                  style={{
                    color: t.text,
                    fontFamily: tokens.fontDisplay,
                    fontWeight: '900',
                    fontSize: 14,
                    letterSpacing: 0.5,
                  }}
                >
                  {t.label}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
      <Text style={{ fontFamily: tokens.fontBody, fontSize: 12, color: tokens.muted, marginBottom: 24 }}>
        Themes change how this song looks on the big screen.
      </Text>

      <Pressable
        onPress={() => onHideSongChange(!hideSong)}
        style={wizardCardStyle(tokens, undefined, {
          flexDirection: 'row',
          alignItems: 'flex-start',
          padding: 14,
          borderColor: hideSong ? (tokens.isDark ? tokens.accentA : tokens.black) : (tokens.dimBorder),
          backgroundColor: hideSong ? tokens.creamDark : (tokens.isDark ? tokens.appBg : tokens.white),
        })}
      >
        <View style={[{ flexDirection: 'row', flex: 1 }, wizardCardUnskew(tokens)]}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: tokens.cornerStyle === 'sharp' ? 0 : 6,
              borderWidth: tokens.isDark ? 1 : 2,
              borderColor: tokens.isDark ? tokens.accentA : tokens.black,
              backgroundColor: hideSong ? (tokens.isDark ? tokens.accentA : tokens.black) : tokens.white,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              marginTop: 2,
            }}
          >
            {hideSong ? <CheckGlyph color={tokens.white} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontWeight: '800',
                fontSize: 14,
                color: tokens.black,
              }}
            >
              Keep the song title hidden until I start
            </Text>
            <Text style={{ fontFamily: tokens.fontBody, fontSize: 12, color: tokens.muted, marginTop: 4 }}>
              {hideSong
                ? "Other guests won’t see the song name until it plays"
                : "Surprise everyone — the song name shows up only when it plays"}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  )
}

function SingerPicker({
  guests,
  singers,
  customName,
  onCustomNameChange,
  onPickGuest,
  onAddCustom,
  onClose,
}: {
  guests: KaraokeGuestRow[]
  singers: WizardSinger[]
  customName: string
  onCustomNameChange: (v: string) => void
  onPickGuest: (g: KaraokeGuestRow) => void
  onAddCustom: () => void
  onClose: () => void
}) {
  const { tokens } = useTheme()
  const insets = useSafeAreaInsets()

  const usedGuestIds = useMemo(
    () => new Set(singers.map((s) => s.guestId).filter(Boolean) as string[]),
    [singers],
  )
  const available = guests.filter((g) => !usedGuestIds.has(g.id))

  return (
    <Pressable
      onPress={onClose}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
      }}
    >
      <Pressable
        onPress={(e) => e.stopPropagation()}
        style={{
          backgroundColor: tokens.appBg,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTopWidth: tokens.isDark ? 1 : 2,
          borderColor: tokens.isDark ? tokens.accentA : tokens.black,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          maxHeight: '80%',
        }}
      >
        <View
          style={{
            alignSelf: 'center',
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: tokens.dimBorder,
            marginBottom: 14,
          }}
        />
        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontWeight: '900',
            fontSize: 20,
            color: tokens.black,
            marginBottom: 16,
            ...(steamHeadingExtras(tokens) ?? {}),
            ...(retroHeadingExtras(tokens) ?? {}),
          }}
        >
          Add a singer
        </Text>

        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontWeight: '800',
            fontSize: 11,
            letterSpacing: 2,
            color: tokens.muted,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          From this session
        </Text>
        <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
          {available.length === 0 ? (
            <Text style={{ fontFamily: tokens.fontBody, fontSize: 13, color: tokens.muted, marginBottom: 16 }}>
              No other guests in this session yet.
            </Text>
          ) : (
            available.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => onPickGuest(g)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 10,
                  borderRadius: tokens.radiusSmall,
                  marginBottom: 6,
                  backgroundColor: pressed ? (tokens.pressedOverlay) : 'transparent',
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    backgroundColor: g.default_color || tokens.softViolet,
                    borderWidth: tokens.isDark ? 1 : 2,
                    borderColor: tokens.isDark ? tokens.accentA : tokens.black,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    marginRight: 12,
                  }}
                >
                  {g.profile_picture ? (
                    <Image
                      source={{ uri: g.profile_picture }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      style={{
                        fontFamily: tokens.fontDisplay,
                        fontWeight: '900',
                        fontSize: 15,
                        color: tokens.black,
                      }}
                    >
                      {(g.name?.[0] ?? '?').toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: tokens.fontDisplay,
                    fontWeight: '800',
                    fontSize: 15,
                    color: tokens.black,
                  }}
                >
                  {g.name}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>

        <Text
          style={{
            fontFamily: tokens.fontDisplay,
            fontWeight: '800',
            fontSize: 11,
            letterSpacing: 2,
            color: tokens.muted,
            textTransform: 'uppercase',
            marginTop: 12,
            marginBottom: 8,
          }}
        >
          Or add a name
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TextInput
            value={customName}
            onChangeText={onCustomNameChange}
            placeholder="Friend, kid, dog, etc."
            placeholderTextColor={tokens.faint}
            style={{
              flex: 1,
              backgroundColor: tokens.creamDark,
              borderWidth: tokens.isDark ? 1 : 2,
              borderColor: tokens.isDark ? tokens.dimBorder : tokens.black,
              borderRadius: tokens.radiusSmall,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontFamily: tokens.fontBody,
              fontSize: 16,
              color: tokens.black,
              ...(psyChromeExtras(tokens) ?? {}),
              ...(steamChromeExtras(tokens) ?? {}),
              ...(retroChromeExtras(tokens) ?? {}),
            }}
            returnKeyType="done"
            onSubmitEditing={onAddCustom}
          />
          <Pressable
            onPress={onAddCustom}
            disabled={!customName.trim()}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: tokens.radius,
              borderWidth: tokens.isDark ? 1 : 3,
              borderColor: tokens.isDark ? tokens.accentB : tokens.black,
              backgroundColor: customName.trim() ? tokens.hotRed : tokens.creamDark,
              opacity: customName.trim() ? 1 : 0.5,
              ...(customName.trim() ? psyChromeExtras(tokens) ?? {} : {}),
              ...(customName.trim() ? steamChromeExtras(tokens) ?? {} : {}),
              ...(customName.trim() ? retroChromeExtras(tokens) ?? {} : {}),
            }}
          >
            <Text
              style={{
                fontFamily: tokens.fontDisplay,
                fontWeight: '900',
                fontSize: 14,
                color: customName.trim() ? tokens.white : tokens.muted,
              }}
            >
              Add
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  )
}

function CloseGlyph({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: color,
          transform: [{ translateY: -1 }, { rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: color,
          transform: [{ translateY: -1 }, { rotate: '-45deg' }],
        }}
      />
    </View>
  )
}

function CheckGlyph({ color }: { color: string }) {
  return (
    <View style={{ width: 12, height: 12 }}>
      <View
        style={{
          position: 'absolute',
          left: 1,
          top: 6,
          width: 5,
          height: 2,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 3,
          top: 4,
          width: 9,
          height: 2,
          backgroundColor: color,
          transform: [{ rotate: '-50deg' }],
        }}
      />
    </View>
  )
}
