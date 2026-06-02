// Shared state and constants. Imported by app.js.
export const SB_URL="https://hnnbxwitjkeijvoldfuv.supabase.co";
export const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubmJ4d2l0amtlaWp2b2xkZnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjcwMTQsImV4cCI6MjA5MDUwMzAxNH0.ENzZ2VLxszHr9StjFds06In7CyGkiyPvu6Jh1LUMMvA";
export const sb=supabase.createClient(SB_URL,SB_KEY);

// Mobile app distribution URLs. Update these when a new build is released.
// Android: build with EAS, drop the APK at docs/downloads/realtime-karaoke.apk,
// commit, and push — GitHub Pages will serve it directly.
// iOS: paste a TestFlight invite URL or App Store link here. Leave "" to hide
// the iOS download button (iOS users still get "Continue in browser").
export const ANDROID_APP_URL="downloads/realtime-karaoke.apk";
export const IOS_APP_URL="https://testflight.apple.com/join/MSRV8ekT";
export const NC=[
{c:"#22d3ee",g:"rgba(34,211,238,0.3)"},
{c:"#f472b6",g:"rgba(244,114,182,0.3)"},
{c:"#fbbf24",g:"rgba(251,191,36,0.3)"},
{c:"#a78bfa",g:"rgba(167,139,250,0.3)"},
{c:"#34d399",g:"rgba(52,211,153,0.3)"},
{c:"#818cf8",g:"rgba(129,140,248,0.3)"},
{c:"#ef4444",g:"rgba(239,68,68,0.3)"},
{c:"#f97316",g:"rgba(249,115,22,0.3)"},
{c:"#84cc16",g:"rgba(132,204,22,0.3)"},
{c:"#14b8a6",g:"rgba(20,184,166,0.3)"},
{c:"#3b82f6",g:"rgba(59,130,246,0.3)"},
{c:"#d946ef",g:"rgba(217,70,239,0.3)"},
{c:"#e11d48",g:"rgba(225,29,72,0.3)"}
];
export const S={screen:"loading",sessionCode:null,sessionId:null,sessionName:null,guestId:null,guestName:"",profilePicture:null,defaultColor:null,guests:[],guestsById:{},catalog:[],searchQuery:"",selectedGenre:"All Songs",selectedTrack:null,singers:[],wizardStep:2,singerPickerOpen:false,customSingerName:"",queue:[],nowPlaying:null,errorMessage:"",theme_name:"neo-brutal",stage_theme:null,hide_song:false,customEmoji:null,emojiPickerOpen:false,textInputOpen:false,memePickerOpen:false,memeSearchQuery:"",memeGifs:[],memeLoading:false,isPlaying:false,nowPlayingSingerConfigs:null,matchedSinger:null,nowPlayingStageTheme:null,joining:false,joinName:"",addingToQueue:false,vocalFxEnabled:true,autotuneEnabled:true,skipConfirmOpen:false,prefersSanitize:true,spotifyToken:null,requestQuery:"",requestResults:[],requestSearching:false,requestSubmittingId:null,requestConfirm:null,
awards:[],awardVotes:{},awardResults:[],awardActiveId:null,awardScreen:"list",awardCreateDraft:null,awardCreateStep:1,awardEditingId:null,awardIconSearch:"",awardIconVisibleCount:0,awardIconShuffled:[],awardVoteConfirm:null,awardsRevealStep:null,awardsHistory:[],awardsGuestsCache:[],encoreCounts:{},encoreVoteAt:null,
songsVisibleCount:30,editQueueRowId:null};

export const EMOJI_LIST=[
  "\uD83D\uDE00","\uD83D\uDE02","\uD83D\uDE0D","\uD83E\uDD29","\uD83E\uDD73","\uD83E\uDD2F","\uD83D\uDE31","\uD83D\uDE2D",
  "\uD83D\uDE0E","\uD83E\uDD23","\uD83D\uDE18","\uD83E\uDD70","\uD83D\uDE0F","\uD83D\uDE44","\uD83E\uDD14","\uD83D\uDE34",
  "\uD83D\uDC4F","\uD83D\uDC4D","\uD83D\uDC4E","\u270C\uFE0F","\uD83E\uDD1F","\uD83E\uDD18","\uD83D\uDC4C","\uD83D\uDE4C",
  "\u2764\uFE0F","\uD83D\uDD25","\u2728","\uD83C\uDF1F","\uD83D\uDCAF","\uD83C\uDF89","\uD83C\uDF8A","\uD83C\uDF88",
  "\uD83C\uDFB5","\uD83C\uDFA4","\uD83C\uDFB6","\uD83C\uDFB8","\uD83E\uDD41","\uD83C\uDFB9","\uD83C\uDFA7","\uD83D\uDCE2",
  "\uD83D\uDC80","\uD83E\uDEE0","\uD83E\uDD21","\uD83D\uDC7B","\uD83D\uDC7D","\uD83E\uDD16","\uD83D\uDC36","\uD83D\uDC31",
  "\uD83C\uDF7B","\uD83C\uDF7A","\uD83C\uDF78","\uD83E\uDD42","\u2615","\uD83C\uDF55","\uD83C\uDF54","\uD83C\uDF6A",
  "\uD83D\uDCAA","\uD83D\uDE80","\uD83C\uDFC6","\uD83E\uDD47"
];

export const MAX_SINGERS=4;

export const GENRE_ORDER=["Hip Hop","R&B","Pop","Rock","Indie","Electronic","Folk","Other"];

export const AWARDS_FALLBACK_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4H6Zm-3 0V3h2v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V3h2v6a6 6 0 0 1-6 6h-1v3h3v2H8v-2h3v-3h-1a6 6 0 0 1-6-6Z"/></svg>';

export const AWARDS_ICON_PAGE_SIZE=60;

// Citation prefix typewritered onto the description field when step 2 mounts.
// Must stay in sync with mobile (AWARDED_TO_PREFIX in AwardsScreen.tsx).
export const AWARDS_AWARDED_TO_PREFIX="Awarded to ";
export const AWARDS_DESCRIPTION_MAX=180;

// Shared caches written by supabase.js, read by utils.js and render/*.
// Object-wrap so reassignment crosses module boundaries.
export const caches = {
  playedTrackIds: {},
  allGifs: []
};
