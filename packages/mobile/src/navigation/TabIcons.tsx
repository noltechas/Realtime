import React from 'react'
import { Ionicons } from '@expo/vector-icons'

export interface TabIconProps {
  color: string
  size?: number
}

export type TabIconComponent = (props: TabIconProps) => React.ReactElement

// Every nav glyph is a real vector from Ionicons — one family, one optical
// weight, one grid. The Home/Profile/Queue icons used to be hand-stacked
// <View>s (a triangle-on-a-square "house", two blobs, three bars), which read
// as crude next to the Ionicons ones beside them and couldn't scale cleanly.

function HomeIcon({ color, size = 20 }: TabIconProps) {
  return <Ionicons name="home" size={Math.round(size * 1.02)} color={color} />
}

function ProfileIcon({ color, size = 20 }: TabIconProps) {
  return <Ionicons name="person" size={Math.round(size * 1.02)} color={color} />
}

function QueueIcon({ color, size = 20 }: TabIconProps) {
  return <Ionicons name="list" size={Math.round(size * 1.14)} color={color} />
}

function SongsIcon({ color, size = 20 }: TabIconProps) {
  return <Ionicons name="musical-notes" size={Math.round(size * 1.05)} color={color} />
}

function AwardsIcon({ color, size = 20 }: TabIconProps) {
  // Trophy glyph from Ionicons keeps the visual language consistent with the
  // existing Songs tab (also Ionicons-based) and matches the website's award
  // CTA / list iconography.
  return <Ionicons name="trophy" size={Math.round(size * 1.05)} color={color} />
}

function StageIcon({ color, size = 20 }: TabIconProps) {
  // Fallback only. SessionTabs normally overrides the Stage tab's glyph via
  // `options.tabBarIcon` so it can swap mic/smiley on whether the local guest is
  // up — but a tab bar that renders a label with no icon at all when that
  // override is missing looks broken, which is exactly what happened.
  return <Ionicons name="happy-outline" size={Math.round(size * 1.08)} color={color} />
}

export const TAB_ICONS: Record<string, TabIconComponent> = {
  Home: HomeIcon,
  Profile: ProfileIcon,
  Queue: QueueIcon,
  Songs: SongsIcon,
  Awards: AwardsIcon,
  Stage: StageIcon,
}
