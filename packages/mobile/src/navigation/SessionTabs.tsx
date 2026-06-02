import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { SessionTabsParamList } from './types'
import { ThemedTabBar } from './ThemedTabBar'
import { QueueScreen } from '../screens/QueueScreen'
import { SongsScreen } from '../screens/SongsScreen'
import { StageScreen, StageTabIcon } from '../screens/StageScreen'
import { AwardsScreen } from '../screens/AwardsScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { SessionThemeProvider } from '../theme/ThemeContext'
import { SessionGuestsProvider } from '../hooks/useSessionGuests'
import { SessionRevealLayer } from '../awards/SessionRevealLayer'

const Tabs = createBottomTabNavigator<SessionTabsParamList>()

// Tabs shown while a user is inside a session. Queue is the default landing
// tab because that's what they expect to see right after joining — Songs is
// the "add a new track" surface and Profile is the same edit screen that
// lives in the pre-session MainTabs.
//
// Wrapped in SessionThemeProvider so every in-session screen, tab bar, and
// component reads the live theme from the session row (admin-controlled) and
// flips on song-level stage_theme overrides automatically.
export function SessionTabs() {
  return (
    <SessionThemeProvider>
      <SessionGuestsProvider>
      <Tabs.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <ThemedTabBar {...props} />}
        initialRouteName="Queue"
      >
        <Tabs.Screen name="Queue" component={QueueScreen} />
        <Tabs.Screen name="Songs" component={SongsScreen} />
        <Tabs.Screen
          name="Stage"
          component={StageScreen}
          // Label flips between "React" and "Stage" inside LiquidGlassTabBar
          // based on whether the local guest is matched on the now-playing
          // track. StageTabIcon swaps the glyph (mic vs smiley) the same way.
          options={{
            tabBarIcon: ({ color }) => <StageTabIcon color={color} />,
          }}
        />
        <Tabs.Screen name="Awards" component={AwardsScreen} />
        <Tabs.Screen name="Profile" component={ProfileScreen} />
      </Tabs.Navigator>
      {/* Global awards-ceremony overlay — always mounted so the reveal takes
          over from any tab (and resumes if the app was reopened mid-show). */}
      <SessionRevealLayer />
      </SessionGuestsProvider>
    </SessionThemeProvider>
  )
}
