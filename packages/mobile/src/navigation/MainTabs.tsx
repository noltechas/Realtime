import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { MainTabsParamList } from './types'
import { ThemedTabBar } from './ThemedTabBar'
import { HomeScreen } from '../screens/HomeScreen'
import { ProfileScreen } from '../screens/ProfileScreen'

const Tabs = createBottomTabNavigator<MainTabsParamList>()

export function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <ThemedTabBar {...props} />}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  )
}
