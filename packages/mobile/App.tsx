import 'react-native-url-polyfill/auto'
import React from 'react'
import { Text, View, ScrollView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from './src/theme/ThemeContext'
import { RootNavigator } from './src/navigation/RootNavigator'
import { useFonts } from 'expo-font'
import { Oswald_400Regular, Oswald_700Bold } from '@expo-google-fonts/oswald'
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker'
import {
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand'
import { LuckiestGuy_400Regular } from '@expo-google-fonts/luckiest-guy'
import { Chicle_400Regular } from '@expo-google-fonts/chicle'
import { SpicyRice_400Regular } from '@expo-google-fonts/spicy-rice'
import { Monoton_400Regular } from '@expo-google-fonts/monoton'
import { Audiowide_400Regular } from '@expo-google-fonts/audiowide'
import { GreatVibes_400Regular } from '@expo-google-fonts/great-vibes'

// ── Font weights are required BY FILE PATH, not through the package index ────
// Metro does not tree-shake. Every `@expo-google-fonts/*` index.js `require()`s every
// weight the family ships, at module scope, so importing one name from the index bundles
// them ALL. Measured on the 1.0.2 Android build: 82.4 MB of fonts across 123 files, of
// which 65.7 MB was weights nothing renders — noto-serif-jp alone shipped 8 CJK weights
// at 7.3 MB each in order to use exactly one.
//
// Deep-requiring the single .ttf bypasses the index. Only worth it where the waste is
// large: these files recover 64 MB, while every other family below wastes under a
// megabyte, so those keep the more readable named import.
//
// These packages declare no `exports` map, so the deep paths are resolvable and stable.
const NotoSerifJP_700Bold = require('@expo-google-fonts/noto-serif-jp/700Bold/NotoSerifJP_700Bold.ttf')
const ZenKakuGothicNew_400Regular = require('@expo-google-fonts/zen-kaku-gothic-new/400Regular/ZenKakuGothicNew_400Regular.ttf')
const Nunito_400Regular = require('@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf')
// Space theme ("Golden Record"): Jost for display and reading, IBM Plex Mono for
// every number and coordinate. Deep-required: Jost ships 18 files and Plex Mono
// 14, and the theme renders four and two.
const Jost_300Light = require('@expo-google-fonts/jost/300Light/Jost_300Light.ttf')
const Jost_400Regular = require('@expo-google-fonts/jost/400Regular/Jost_400Regular.ttf')
const Jost_500Medium = require('@expo-google-fonts/jost/500Medium/Jost_500Medium.ttf')
const Jost_600SemiBold = require('@expo-google-fonts/jost/600SemiBold/Jost_600SemiBold.ttf')
const IBMPlexMono_400Regular = require('@expo-google-fonts/ibm-plex-mono/400Regular/IBMPlexMono_400Regular.ttf')
const IBMPlexMono_500Medium = require('@expo-google-fonts/ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf')
// Sketch ("Follow the Bouncing Ball"): Shantell Sans, an artist's marker hand,
// for lettering and reading; Just Another Hand for the animator's pencil notes.
const ShantellSans_500Medium = require('@expo-google-fonts/shantell-sans/500Medium/ShantellSans_500Medium.ttf')
const ShantellSans_700Bold = require('@expo-google-fonts/shantell-sans/700Bold/ShantellSans_700Bold.ttf')
const ShantellSans_800ExtraBold = require('@expo-google-fonts/shantell-sans/800ExtraBold/ShantellSans_800ExtraBold.ttf')
const JustAnotherHand_400Regular = require('@expo-google-fonts/just-another-hand/400Regular/JustAnotherHand_400Regular.ttf')
// Steampunk ("The Vox Engine"): Abril Fatface for display and numerals, Old
// Standard TT for reading and engraved capitals.
const AbrilFatface_400Regular = require('@expo-google-fonts/abril-fatface/400Regular/AbrilFatface_400Regular.ttf')
const OldStandardTT_400Regular = require('@expo-google-fonts/old-standard-tt/400Regular/OldStandardTT_400Regular.ttf')
const OldStandardTT_400Regular_Italic = require('@expo-google-fonts/old-standard-tt/400Regular_Italic/OldStandardTT_400Regular_Italic.ttf')
const OldStandardTT_700Bold = require('@expo-google-fonts/old-standard-tt/700Bold/OldStandardTT_700Bold.ttf')
// Gothic theme: deep-required for the same reason: Grenze Gotisch ships nine
// weights and Cormorant Garamond ten, and the theme renders three of each.
const UnifrakturMaguntia_400Regular = require('@expo-google-fonts/unifrakturmaguntia/400Regular/UnifrakturMaguntia_400Regular.ttf')
const GrenzeGotisch_600SemiBold = require('@expo-google-fonts/grenze-gotisch/600SemiBold/GrenzeGotisch_600SemiBold.ttf')
const GrenzeGotisch_700Bold = require('@expo-google-fonts/grenze-gotisch/700Bold/GrenzeGotisch_700Bold.ttf')
const GrenzeGotisch_800ExtraBold = require('@expo-google-fonts/grenze-gotisch/800ExtraBold/GrenzeGotisch_800ExtraBold.ttf')
const CormorantGaramond_600SemiBold = require('@expo-google-fonts/cormorant-garamond/600SemiBold/CormorantGaramond_600SemiBold.ttf')
const CormorantGaramond_600SemiBold_Italic = require('@expo-google-fonts/cormorant-garamond/600SemiBold_Italic/CormorantGaramond_600SemiBold_Italic.ttf')
const CormorantGaramond_700Bold = require('@expo-google-fonts/cormorant-garamond/700Bold/CormorantGaramond_700Bold.ttf')
const Shrikhand_400Regular = require('@expo-google-fonts/shrikhand/400Regular/Shrikhand_400Regular.ttf')
const Yellowtail_400Regular = require('@expo-google-fonts/yellowtail/400Regular/Yellowtail_400Regular.ttf')
const Poppins_500Medium = require('@expo-google-fonts/poppins/500Medium/Poppins_500Medium.ttf')
const Poppins_600SemiBold = require('@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf')
const Poppins_700Bold = require('@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf')
const Poppins_800ExtraBold = require('@expo-google-fonts/poppins/800ExtraBold/Poppins_800ExtraBold.ttf')

// Error boundary so a crash anywhere in the render tree shows visibly on
// screen instead of leaving us staring at a white screen with no logs.
interface ErrorBoundaryState { error: Error | null }
class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[App] Render tree threw:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#1a1a1a', padding: 24, paddingTop: 80 }}>
          <Text style={{ color: '#ff4444', fontSize: 20, fontWeight: '700', marginBottom: 16 }}>
            Crash on launch
          </Text>
          <ScrollView style={{ flex: 1 }}>
            <Text style={{ color: '#ffffff', fontSize: 14, marginBottom: 12 }}>
              {this.state.error.name}: {this.state.error.message}
            </Text>
            <Text style={{ color: '#aaaaaa', fontSize: 11, fontFamily: 'Courier' }}>
              {this.state.error.stack || '(no stack)'}
            </Text>
          </ScrollView>
        </View>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Oswald_400Regular,
    Oswald_700Bold,
    PermanentMarker_400Regular,
    // Tropical body face — three weights so the theme can build a real type
    // hierarchy (metadata / labels / titles) instead of faking one with size.
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    Nunito_400Regular,
    LuckiestGuy_400Regular,
    Chicle_400Regular,
    SpicyRice_400Regular,
    NotoSerifJP_700Bold,
    ZenKakuGothicNew_400Regular,
    Jost_300Light,
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    AbrilFatface_400Regular,
    OldStandardTT_400Regular,
    OldStandardTT_400Regular_Italic,
    OldStandardTT_700Bold,
    Monoton_400Regular,
    Audiowide_400Regular,
    Remalos: require('./assets/fonts/Remalos-Regular.ttf'),
    // Cyberpunk theme — glitch display + body faces (custom .ttf, fontspace).
    SDGlitch: require('./assets/fonts/SDGlitchDemo-Regular.ttf'),
    Glitch: require('./assets/fonts/Glitch-Regular.ttf'),
    ShantellSans_500Medium,
    ShantellSans_700Bold,
    ShantellSans_800ExtraBold,
    JustAnotherHand_400Regular,
    // Urban theme — heavy graffiti/bomber display face for headings.
    BomberUrban: require('./assets/fonts/BomberUrban-Regular.otf'),
    // Deep-sea theme — playful "Krabby Patty" display face for headings.
    KrabbyPatty: require('./assets/fonts/KrabbyPatty-Regular.ttf'),
    // Awards tab — "Delauney" gilded serif, matching the stage ceremony font.
    Delauney: require('./assets/fonts/Delauney-Regular.ttf'),
    // Awards tab — "Great Vibes" flowing script for award descriptions.
    GreatVibes_400Regular,
    // Comic-book theme — Blambot "BadaBoom" display logo face + "Super Squad"
    // secondary (custom .ttf, shared with the desktop/stage + web companion).
    BadaBoomBB: require('./assets/fonts/BadaBoomBB.ttf'),
    SuperSquad: require('./assets/fonts/SuperSquad.ttf'),
    // Tropical theme — Florida Vibes (surf script, headline moments only) + The
    // Last Trunks (condensed beach-block caps for labels). Custom .ttf, shared
    // with the desktop/stage + web.
    FloridaVibes: require('./assets/fonts/FloridaVibes.ttf'),
    TheLastTrunks: require('./assets/fonts/TheLastTrunks.ttf'),
    // Gothic theme: UnifrakturMaguntia (a true Fraktur, display moments only,
    // never in capitals), Grenze Gotisch (the reading blackletter: titles and
    // labels) and Cormorant Garamond (prose). Same faces as the stage.
    UnifrakturMaguntia_400Regular,
    GrenzeGotisch_600SemiBold,
    GrenzeGotisch_700Bold,
    GrenzeGotisch_800ExtraBold,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
    CormorantGaramond_700Bold,
    // Barbie theme: Shrikhand (heavy retro italic, sign-painted titles),
    // Yellowtail (60s brush script, the odd flourish), Poppins (everything
    // else). Same faces as the stage.
    Shrikhand_400Regular,
    Yellowtail_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  })

  // Render once fonts are loaded OR once we know they failed. Without the
  // fontError fallback the app silently hangs on a white screen forever if
  // even one font asset fails to bundle — better to ship with system-font
  // fallbacks than to never render at all.
  if (!fontsLoaded && !fontError) {
    // Visible loading state so a hung font load is observable on TestFlight
    // (previously we returned null, which paints a white screen forever).
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: 16 }}>Loading fonts…</Text>
      </View>
    )
  }
  if (fontError) {
    // Log so we can spot this in TestFlight crash/issue reports.
    console.warn('[App] Font load error, falling back to system fonts:', fontError)
  }

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  )
}
