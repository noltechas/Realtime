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
