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
  const { loading, session } = useSession()

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

  // If we have a cached session from a previous launch, drop the user
  // straight back into the session tabs instead of forcing them through the
  // home → join flow again. Sign-out / leave-session paths call clearSession()
  // which will flip this back to "Main" on next launch.
  const initialRoute: keyof RootStackParamList = session ? 'Session' : 'Main'

  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokens.appBg },
        }}
      >
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen name="Lobby" component={LobbyScreen} />
        <RootStack.Screen
          name="Session"
          component={SessionTabs}
          // Once inside a session there's no backing out to the scan screen via
          // the iOS swipe-back gesture (or Android hardware back). Leaving is a
          // deliberate action: the "Leave Session" button on the Profile tab,
          // which clears the cached session and resets the stack back to Main.
          options={{ gestureEnabled: false }}
        />
        <RootStack.Screen
          name="Wizard"
          component={WizardScreen}
          options={{ presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  )
}
