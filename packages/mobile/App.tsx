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
import { Quicksand_700Bold } from '@expo-google-fonts/quicksand'
import { Nunito_400Regular } from '@expo-google-fonts/nunito'
import { LuckiestGuy_400Regular } from '@expo-google-fonts/luckiest-guy'
import { Chicle_400Regular } from '@expo-google-fonts/chicle'
import { SpicyRice_400Regular } from '@expo-google-fonts/spicy-rice'
import { NotoSerifJP_700Bold } from '@expo-google-fonts/noto-serif-jp'
import { ZenKakuGothicNew_400Regular } from '@expo-google-fonts/zen-kaku-gothic-new'
import { Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron'
import { Exo2_400Regular, Exo2_700Bold } from '@expo-google-fonts/exo-2'
import { Cinzel_400Regular, Cinzel_700Bold, Cinzel_900Black } from '@expo-google-fonts/cinzel'
import { IMFellEnglish_400Regular } from '@expo-google-fonts/im-fell-english'
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite'
import { Monoton_400Regular } from '@expo-google-fonts/monoton'
import { Audiowide_400Regular } from '@expo-google-fonts/audiowide'

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
    Quicksand_700Bold,
    Nunito_400Regular,
    LuckiestGuy_400Regular,
    Chicle_400Regular,
    SpicyRice_400Regular,
    NotoSerifJP_700Bold,
    ZenKakuGothicNew_400Regular,
    Orbitron_700Bold,
    Orbitron_900Black,
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
