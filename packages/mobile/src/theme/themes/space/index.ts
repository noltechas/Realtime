import { SPACE_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildSpaceStyles } from './styles'
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
import { DUST, STAR } from './atoms/_record'

// ── SPACE: "GOLDEN RECORD" ──────────────────────────────────────────────────
//
// Earth's music sent out into deep space: the gold record the Voyagers carry,
// and the sky it sails through, held in your hand. The same theme as the
// stage. Every atom is built from the vocabulary in atoms/_record.tsx:
//
//   • DEEP SPACE   one pre-rendered deep field behind every screen (SceneLayer)
//                  with live stars breathing over it and Voyager crossing
//   • GOLD         every song is a golden record with its art as the label
//                  (SongCard, QueueRow); the play button IS the record, with a
//                  tonearm; your profile photo is pressed as a record's label;
//                  the tab bar's selection is a small gold record
//   • ETCHED LINE  black-glass panels with registration ticks, binary marks,
//                  a star-chart axis for the genres, reticles for reactions
//   • STARLIGHT    eight-pointed stars: singers, toggles, the colour picker's
//                  star chart, the active genre
//
// Assets come from `npm run generate:space-assets` (a committed, seeded Python
// script), not hand-made binaries.
export const SPACE_UI: ThemeUIModule = {
  styles: buildSpaceStyles(SPACE_MOBILE),

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

  // Reaction icons sit in reticles on black glass: starlight, with the empty
  // tile's "+" in dust.
  reactionIconColors: {
    iconColor: STAR,
    plusIconColor: DUST,
  },
}
