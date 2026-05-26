import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { RootStackParamList } from './types'
import { MainTabs } from './MainTabs'
import { SessionTabs } from './SessionTabs'
import { LobbyScreen } from '../screens/LobbyScreen'
import { WizardScreen } from '../screens/WizardScreen'
import { useSession } from '../hooks/useSession'
import { useTheme } from '../theme/ThemeContext'

const RootStack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const { tokens } = useTheme()
  const { loading } = useSession()

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tokens.appBg,
        }}
      >
        <ActivityIndicator color={tokens.hotRed} />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokens.appBg },
        }}
      >
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen name="Lobby" component={LobbyScreen} />
        <RootStack.Screen name="Session" component={SessionTabs} />
        <RootStack.Screen
          name="Wizard"
          component={WizardScreen}
          options={{ presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  )
}
