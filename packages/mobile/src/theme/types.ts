import type React from 'react'
import type { ViewStyle, TextStyle } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import type {
  KaraokeCatalogRow,
  KaraokeQueueRow,
  KaraokeGuestRow,
  SingerConfig,
  GenreCounts,
} from '@karaoke/shared'
import type { FullSessionRow, TrendingGif } from '../hooks/useSessionRow'

// ── Atom prop interfaces ────────────────────────────────────────────────────
// Each theme module ships an implementation of every atom below. Atoms get
// raw data + callbacks as props — they never read the theme name themselves.
// The screen (data container) picks `ui.{AtomName}` from the active theme
// module via `useTheme().ui` and renders it like any other component.

export interface ButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  loading?: boolean
  disabled?: boolean
}

export interface ColorPickerProps {
  value: number
  onChange: (index: number) => void
  label?: string
}

export interface GenreTabsProps {
  list: string[]
  counts: GenreCounts
  value: string
  onChange: (genre: string) => void
}

export interface SongCardProps {
  track: KaraokeCatalogRow
  onPress: () => void
}

export interface QueueRowProps {
  item: KaraokeQueueRow
  position: number
  voted?: 1 | -1
  guestName: string
  guestId: string
  /** Live guestId -> guest map. Atoms resolve each singer's current name +
   *  avatar from here so profile edits propagate. */
  guests: Map<string, KaraokeGuestRow>
  onVote: (row: KaraokeQueueRow, value: 1 | -1) => void
  onEdit: (row: KaraokeQueueRow) => void
  index: number
}

export interface SongsSearchBarProps {
  value: string
  onChangeText: (text: string) => void
}

export interface ReactionCellProps {
  label: string
  icon: React.ReactNode
  onPress: () => void
  onEditPress?: () => void
  disabled?: boolean
}

export interface StageTabIconProps {
  color: string
  size?: number
  isUp: boolean
}

export interface PlayButtonProps {
  isPlaying: boolean
  singerColor: string
  onPress: () => void
}

export interface ToggleBoxProps {
  label: string
  on: boolean
  onPress: () => void
}

export interface ReactionGridIconColorProps {
  // Color used by Stage screen's emoji + chat + camera + image icons inside
  // reaction cells. Themes that draw cells on a dark surface return a light
  // color here; light-themed cells return tokens.black.
  iconColor: string
  plusIconColor: string
}

// ── Style scaffolds ─────────────────────────────────────────────────────────
// What used to be the global `mobileStyles()` stylesheet. Each theme module
// computes these once at module-load time and exports them on its
// ThemeUIModule. Screens read them via `ui.styles.{...}`.

export interface ThemeUIStyles {
  screen: ViewStyle
  page: ViewStyle
  h1: TextStyle
  h2: TextStyle
  body: TextStyle
  muted: TextStyle
  card: ViewStyle
  input: ViewStyle & TextStyle
  pillBox: ViewStyle
  pillText: TextStyle
  sectionLabel: TextStyle
}

// ── The theme module ────────────────────────────────────────────────────────
// What every theme folder exports as its `index.ts`. Add new atoms here when
// a screen needs to delegate a new structural decision to themes.

export interface ThemeUIModule {
  styles: ThemeUIStyles

  // Cross-screen primitives
  Button: React.ComponentType<ButtonProps>
  ColorPicker: React.ComponentType<ColorPickerProps>
  GenreTabs: React.ComponentType<GenreTabsProps>

  // Navigation chrome
  TabBar: React.ComponentType<BottomTabBarProps>
  Backdrop: React.ComponentType<{}>
  // Wraps a child node and applies any theme-specific entry animation
  // (e.g. deep-sea's bubble-float). Themes without one return `children`
  // unchanged.
  ItemFloater: React.ComponentType<{ delay?: number; style?: ViewStyle; children: React.ReactNode }>

  // Songs screen atoms
  SongsSearchBar: React.ComponentType<SongsSearchBarProps>
  SongCard: React.ComponentType<SongCardProps>

  // Queue screen atoms
  QueueRow: React.ComponentType<QueueRowProps>

  // Stage screen atoms
  ReactionCell: React.ComponentType<ReactionCellProps>
  StageTabIcon: React.ComponentType<StageTabIconProps>
  StagePlayButton: React.ComponentType<PlayButtonProps>
  StageToggleBox: React.ComponentType<ToggleBoxProps>
  // Colors that the screen needs for inline icon renders (Ionicons inside
  // reaction cells). Each theme provides its own readable foreground.
  reactionIconColors: ReactionGridIconColorProps
}

// Re-export commonly used external types for convenience
export type { SingerConfig, FullSessionRow, TrendingGif }
