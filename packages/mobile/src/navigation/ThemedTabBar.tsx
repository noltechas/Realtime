import React, { useEffect, useRef } from 'react'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useTheme } from '../theme/ThemeContext'
import { useSession } from '../hooks/useSession'
import { useSessionRow, guestIsUp } from '../hooks/useSessionRow'

// Theme-aware tab bar dispatcher. The actual bar implementation lives in each
// theme module (`theme/themes/<name>/atoms/TabBar.tsx`) and is exposed via
// `useTheme().ui.TabBar`. This file owns the cross-cutting behavior that all
// tab bars share — currently just the "auto-jump to Stage" effect that fires
// when the local guest's name appears in `now_playing_singer_configs`.
export function ThemedTabBar(props: BottomTabBarProps) {
  const { ui } = useTheme()
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  const wasUpRef = useRef(false)

  const isUp = guestIsUp(row, session?.guestName, session?.guestId) !== null

  const hasStage = props.state.routeNames.includes('Stage')

  useEffect(() => {
    if (isUp && !wasUpRef.current && hasStage) {
      props.navigation.navigate('Stage', undefined)
    }
    wasUpRef.current = isUp
  }, [isUp, props.navigation, hasStage])

  const TabBar = ui.TabBar
  return <TabBar {...props} />
}
