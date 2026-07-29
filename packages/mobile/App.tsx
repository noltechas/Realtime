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
import { Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron'
// Space theme (mobile) — Chakra Petch is the angular technical display face and
// Share Tech Mono carries every telemetry numeral. Orbitron above is retained
// for the desktop-matching stage themes only.
import {
  ChakraPetch_500Medium,
  ChakraPetch_600SemiBold,
  ChakraPetch_700Bold,
} from '@expo-google-fonts/chakra-petch'
import { ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono'
import { Cinzel_400Regular, Cinzel_700Bold, Cinzel_900Black } from '@expo-google-fonts/cinzel'
import { IMFellEnglish_400Regular } from '@expo-google-fonts/im-fell-english'
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite'
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
// large: these five files recover 64 MB, while every other family below wastes under a
// megabyte, so those keep the more readable named import.
//
// These packages declare no `exports` map, so the deep paths are resolvable and stable.
const NotoSerifJP_700Bold = require('@expo-google-fonts/noto-serif-jp/700Bold/NotoSerifJP_700Bold.ttf')
const ZenKakuGothicNew_400Regular = require('@expo-google-fonts/zen-kaku-gothic-new/400Regular/ZenKakuGothicNew_400Regular.ttf')
const Exo2_400Regular = require('@expo-google-fonts/exo-2/400Regular/Exo2_400Regular.ttf')
const Exo2_700Bold = require('@expo-google-fonts/exo-2/700Bold/Exo2_700Bold.ttf')
const Nunito_400Regular = require('@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf')

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
    Orbitron_700Bold,
    Orbitron_900Black,
    ChakraPetch_500Medium,
    ChakraPetch_600SemiBold,
    ChakraPetch_700Bold,
    ShareTechMono_400Regular,
    Exo2_400Regular,
    Exo2_700Bold,
    Cinzel_400Regular,
    Cinzel_700Bold,
    Cinzel_900Black,
    IMFellEnglish_400Regular,
    SpecialElite_400Regular,
    Monoton_400Regular,
    Audiowide_400Regular,
    Remalos: require('./assets/fonts/Remalos-Regular.ttf'),
    // Cyberpunk theme — glitch display + body faces (custom .ttf, fontspace).
    SDGlitch: require('./assets/fonts/SDGlitchDemo-Regular.ttf'),
    Glitch: require('./assets/fonts/Glitch-Regular.ttf'),
    // Sketch theme — hand-drawn pencil faces (custom, fontspace). PencilTrace
    // (outline/traced display) for headings, Thin Pencil Handwriting for body.
    PencilTrace: require('./assets/fonts/PencilTrace-Regular.otf'),
    ThinPencil: require('./assets/fonts/ThinPencilHandwriting-Regular.ttf'),
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
