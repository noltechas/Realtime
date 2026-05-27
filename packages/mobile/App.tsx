import 'react-native-url-polyfill/auto'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from './src/theme/ThemeContext'
import { RootNavigator } from './src/navigation/RootNavigator'
import { useFonts } from 'expo-font'
import { Oswald_400Regular, Oswald_700Bold } from '@expo-google-fonts/oswald'
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker'
import { Kalam_400Regular, Kalam_700Bold } from '@expo-google-fonts/kalam'
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

export default function App() {
  const [fontsLoaded] = useFonts({
    Oswald_400Regular,
    Oswald_700Bold,
    PermanentMarker_400Regular,
    Kalam_400Regular,
    Kalam_700Bold,
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
  })

  if (!fontsLoaded) {
    return null
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
