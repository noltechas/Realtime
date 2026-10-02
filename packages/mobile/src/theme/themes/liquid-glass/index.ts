import { LIQUID_GLASS_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildLiquidGlassStyles } from './styles'
import { Button } from './atoms/Button'
import { ColorPicker } from './atoms/ColorPicker'
import { GenreTabs } from './atoms/GenreTabs'
import { TabBar } from './atoms/TabBar'
import { Backdrop } from './atoms/Backdrop'
import { SceneLayer } from './atoms/SceneLayer'
import { ItemFloater } from './atoms/ItemFloater'
import { ScreenTitle } from './atoms/ScreenTitle'
import { SongsSearchBar } from './atoms/SongsSearchBar'
import { SongCard } from './atoms/SongCard'
import { QueueRow } from './atoms/QueueRow'
import { ReactionCell } from './atoms/ReactionCell'
import { StageTabIcon } from './atoms/StageTabIcon'
import { StagePlayButton } from './atoms/StagePlayButton'
import { StageToggleBox } from './atoms/StageToggleBox'
import { YoureUpHero } from './atoms/YoureUpHero'
import { ArtOverlay } from './atoms/ArtOverlay'
import { ProfilePortrait } from './atoms/ProfilePortrait'
import { SOFT, WHITE } from './atoms/_glass'

// ── LIQUID GLASS ────────────────────────────────────────────────────────────
//
// The phone is made of glass, after Apple's Liquid Glass. Every control is a
// pane composed from atoms/_glass.tsx:
//
//   • THE GLASS      on iOS 26 with expo-glass-effect in the binary, the
//                    system's own Liquid Glass (refracts, adapts, gels under
//                    a finger, panes melt together in a GlassGroup); else a
//                    material blur with a lit hairline rim
//   • THE WALLPAPER  a deep night field with glows and glossy ribbons behind
//                    every screen (SceneLayer), drifting slowly, so the glass
//                    always has edges to bend
//   • THE SHAPES     capsules and rounded squares: a floating tab bar with a
//                    sliding lens, glass captions over album art, round glass
//                    vote buttons that merge, a breathing glass play disc,
//                    switches whose knob turns to glass as it flips
export const LIQUID_GLASS_UI: ThemeUIModule = {
  styles: buildLiquidGlassStyles(LIQUID_GLASS_MOBILE),

  Button,
  ColorPicker,
  GenreTabs,

  TabBar,
  Backdrop,
  SceneLayer,
  ItemFloater,
  ScreenTitle,

  SongsSearchBar,
  SongCard,

  QueueRow,

  ReactionCell,
  StageTabIcon,
  StagePlayButton,
  StageToggleBox,
  YoureUpHero,
  ArtOverlay,
  ProfilePortrait,

  // Reaction icons sit on glass over the wallpaper: white, with the empty
  // tile's "+" softer.
  reactionIconColors: {
    iconColor: WHITE,
    plusIconColor: SOFT,
  },
}
