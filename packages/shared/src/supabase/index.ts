export { SUPABASE_URL, SUPABASE_ANON_KEY } from './credentials'
export { createKaraokeClient } from './client'
export type { KaraokeClient } from './client'
export type {
  SingerConfig,
  KaraokeSessionRow,
  KaraokeGuestRow,
  KaraokeQueueRow,
} from './tables'
export { resolveSinger, guestsById } from './singers'
export type { GuestLookup, ResolvedSinger } from './singers'
export {
  validateSession,
  parseSessionCodeFromUrl,
  getSessionsByIds,
} from './session'
export type { ValidateSessionResult, SessionStatus } from './session'
export {
  createGuest,
  findReusableGuest,
  getGuest,
  listGuests,
  subscribeToGuests,
  updateGuest,
} from './guests'
export type {
  CreateGuestInput,
  GuestChangeHandler,
  UpdateGuestInput,
} from './guests'
export {
  listQueue,
  subscribeToQueue,
  sortQueue,
  addQueueItem,
  updateQueueItem,
  castVote,
} from './queue'
export type {
  QueueChangeHandler,
  AddQueueItemInput,
  UpdateQueueItemInput,
  CastVoteInput,
} from './queue'
export {
  listCatalog,
  shuffleCatalog,
  computeGenreCounts,
  genreList,
  filterCatalog,
  GENRE_ORDER,
} from './catalog'
export type { KaraokeCatalogRow, GenreCounts } from './catalog'
export {
  spotifyTokenIfFresh,
  normalizeSpotifyTrack,
  submitSongRequest,
} from './requests'
export type {
  SpotifyTrackResult,
  SubmitSongRequestInput,
  SubmitSongRequestResult,
} from './requests'
export {
  loadAwards,
  castAwardVote,
  createCustomAward,
  updateMyAward,
  deleteMyAward,
  buildAwardCandidates,
  awardCandidateBanned,
  matchCandidateByVote,
  matchBallot,
  setAwardBallot,
  resolveSubjectFromCandidate,
  subscribeToAwards,
  awardsIconCdnUrl,
  AWARDS_FALLBACK_SVG,
  AWARDS_ICON_PAGE_SIZE,
} from './awards'
export type {
  AwardSubjectType,
  KaraokeAwardRow,
  KaraokeAwardVoteRow,
  KaraokeAwardResultRow,
  AwardHistoryRow,
  AwardGuestRow,
  AwardsBundle,
  CastAwardVoteInput,
  BallotPick,
  SetAwardBallotInput,
  CreateAwardInput,
  UpdateAwardInput,
  AwardCandidate,
  RevealCandidate,
  AwardsRevealStep,
  AwardsSubscriptionHandlers,
} from './awards'
