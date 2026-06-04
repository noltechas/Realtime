import type { NavigatorScreenParams } from '@react-navigation/native'
import type { KaraokeCatalogRow, SingerConfig } from '@karaoke/shared'

// When the Wizard is opened to edit an existing queue row, the caller passes
// the row's current state alongside the catalog track so the wizard can pre-
// populate singers, stage theme, and the hidden flag — and so submit knows to
// UPDATE rather than INSERT.
export interface WizardEditPayload {
  queueRowId: string
  singerConfigs: SingerConfig[]
  stageTheme: string | null
  isHidden: boolean
}

export type MainTabsParamList = {
  Home: undefined
  Profile: undefined
}

export type SessionTabsParamList = {
  Queue: undefined
  Songs: undefined
  Stage: undefined
  Awards: undefined
  Profile: undefined
}

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabsParamList> | undefined
  Lobby: { code: string }
  Session: NavigatorScreenParams<SessionTabsParamList> | undefined
  Wizard: { track: KaraokeCatalogRow; edit?: WizardEditPayload }
  // "Request a song to be added" — opened from the Songs tab when a guest
  // can't find a track. `initialQuery` seeds the Spotify search with whatever
  // they'd typed into the catalog filter.
  Request: { initialQuery?: string } | undefined
}
