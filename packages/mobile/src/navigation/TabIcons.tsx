import React from 'react'
import { View, type DimensionValue } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export interface TabIconProps {
  color: string
  size?: number
}

export type TabIconComponent = (props: TabIconProps) => React.ReactElement

function HomeIcon({ color, size = 20 }: TabIconProps) {
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}
    >
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.55,
          borderRightWidth: size * 0.55,
          borderBottomWidth: size * 0.45,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          marginBottom: -1,
        }}
      />
      <View
        style={{
          width: size * 0.78,
          height: size * 0.5,
          backgroundColor: color,
        }}
      />
    </View>
  )
}

function ProfileIcon({ color, size = 20 }: TabIconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.46,
          height: size * 0.46,
          borderRadius: 999,
          backgroundColor: color,
          marginTop: size * 0.02,
        }}
      />
      <View
        style={{
          width: size * 0.82,
          height: size * 0.42,
          borderTopLeftRadius: size * 0.42,
          borderTopRightRadius: size * 0.42,
          backgroundColor: color,
          marginTop: size * 0.06,
        }}
      />
    </View>
  )
}

function QueueIcon({ color, size = 20 }: TabIconProps) {
  const bar = (width: DimensionValue, marginTop = 0) => (
    <View
      style={{
        width,
        height: size * 0.13,
        backgroundColor: color,
        borderRadius: size * 0.04,
        marginTop,
      }}
    />
  )
  return (
    <View style={{ width: size, height: size, justifyContent: 'center' }}>
      {bar('100%')}
      {bar('72%', size * 0.18)}
      {bar('88%', size * 0.18)}
    </View>
  )
}

function SongsIcon({ color, size = 20 }: TabIconProps) {
  // Real vector glyph from Ionicons instead of a hand-built View stack — the
  // music notes need to read cleanly at this size and bundling our own SVGs
  // for one icon isn't worth it when @expo/vector-icons ships with Expo Go.
  return <Ionicons name="musical-notes" size={Math.round(size * 1.05)} color={color} />
}

function AwardsIcon({ color, size = 20 }: TabIconProps) {
  // Trophy glyph from Ionicons keeps the visual language consistent with the
  // existing Songs tab (also Ionicons-based) and matches the website's award
  // CTA / list iconography.
  return <Ionicons name="trophy" size={Math.round(size * 1.05)} color={color} />
}

export const TAB_ICONS: Record<string, TabIconComponent> = {
  Home: HomeIcon,
  Profile: ProfileIcon,
  Queue: QueueIcon,
  Songs: SongsIcon,
  Awards: AwardsIcon,
}
