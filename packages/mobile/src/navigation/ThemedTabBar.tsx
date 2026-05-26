import React from 'react'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useTheme } from '../theme/ThemeContext'
import { LiquidGlassTabBar } from './LiquidGlassTabBar'
import { CyberpunkTabBar } from './CyberpunkTabBar'
import { SketchTabBar } from './SketchTabBar'

// Dispatcher — picks the right tab-bar component per active theme. Every
// theme can ship its own bar; unknown themes fall back to the LiquidGlass
// (neo-brutal) bar. Keep this map dumb: theme-specific bars are responsible
// for reading the live tokens themselves.
export function ThemedTabBar(props: BottomTabBarProps) {
  const { tokens } = useTheme()
  if (tokens.name === 'cyberpunk') return <CyberpunkTabBar {...props} />
  if (tokens.name === 'sketch') return <SketchTabBar {...props} />
  return <LiquidGlassTabBar {...props} />
}
