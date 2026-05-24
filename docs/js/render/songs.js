import { S, GENRE_ORDER } from '../state.js';
import { esc, fmtD, addedLabel } from '../utils.js';

export function computeGenreCounts(){
  var counts={};
  counts["All Songs"]=S.catalog.length;
  for(var i=0;i<S.catalog.length;i++){
    var gs=S.catalog[i].genres;
    if(!gs||!gs.length)continue;
    for(var j=0;j<gs.length;j++){
      var g=gs[j];
      counts[g]=(counts[g]||0)+1;
    }
  }
  return counts;
}
export function genreList(){
  var counts=computeGenreCounts();
  var present=[];
  for(var i=0;i<GENRE_ORDER.length;i++){
    if(counts[GENRE_ORDER[i]])present.push(GENRE_ORDER[i]);
  }
  return {list:["All Songs"].concat(present),counts:counts};
}
export function renderGenreTabs(){
  var info=genreList();
  if(info.list.length<=1)return '';
  var tabs=info.list.map(function(g){
    var n=info.counts[g]||0;
    var active=(g===S.selectedGenre)?" is-active":"";
    return '<button class="genre-tab'+active+'" type="button" data-genre="'+esc(g)+'">'+
      '<span class="genre-tab-label">'+esc(g)+'</span>'+
      '<span class="genre-tab-count">'+n+'</span>'+
    '</button>';
  }).join("");
  return '<div class="genre-tabs" id="genre-tabs" role="tablist" aria-label="Filter by genre">'+tabs+'</div>';
}
export function filterCatalog(){
  var q=(S.searchQuery||"").toLowerCase();
  var g=S.selectedGenre||"All Songs";
  return S.catalog.filter(function(s){
    if(g!=="All Songs"){
      if(!s.genres||s.genres.indexOf(g)<0)return false;
    }
    if(q){
      if(s.name.toLowerCase().indexOf(q)<0&&s.artist.toLowerCase().indexOf(q)<0)return false;
    }
    return true;
  });
}
export function renderRequestCta(){
  return '<button class="request-song-cta" id="request-song-cta" type="button">'+
    '<span class="request-song-cta-icon">'+
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'+
    '</span>'+
    '<span class="request-song-cta-body">'+
      '<span class="request-song-cta-title">Request a Song to be Added</span>'+
      '<span class="request-song-cta-sub">Tell Chas to add a new song to the library.</span>'+
    '</span>'+
    '<span class="request-song-cta-chevron">'+
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>'+
    '</span>'+
  '</button>';
}
// Cap visible cards. iOS Safari was killing the page when this render emitted
// hundreds of <img>-bearing cards (memory pressure from image-load queueing).
// User can still search/filter to find specific songs — the filter applies
// to the full catalog, the cap only limits what's painted.
var SONGS_RENDER_LIMIT=60;

export function renderSongCards(fl){
  var q=(S.searchQuery||"").toLowerCase();
  var empty="";
  if(fl.length===0){
    if(q)empty='<div class="song-empty">No songs found</div>';
    else if(S.selectedGenre&&S.selectedGenre!=="All Songs")empty='<div class="song-empty">No songs in '+esc(S.selectedGenre)+'</div>';
    else empty='<div class="song-empty">No songs in the catalog yet</div>';
    return empty+renderRequestCta();
  }
  var truncated=fl.length>SONGS_RENDER_LIMIT;
  var visible=truncated?fl.slice(0,SONGS_RENDER_LIMIT):fl;
  var cards=visible.map(function(s){
    return '<div class="song-card" data-track="'+s.track_id+'">'+
      (s.art_url?'<img src="'+s.art_url+'" alt="" loading="lazy">':'<div class="song-card-placeholder">&#127925;</div>')+
      '<div class="song-card-info">'+
        '<div class="song-card-title">'+esc(s.name)+'</div>'+
        '<div class="song-card-artist">'+esc(s.artist)+'</div>'+
        '<div class="song-card-dur">'+fmtD(s.duration_ms)+'</div>'+
      '</div></div>';
  }).join("");
  var moreNote=truncated
    ? '<div class="song-empty" style="grid-column:1/-1;padding:20px 12px;font-size:13px;">'+(fl.length-SONGS_RENDER_LIMIT)+' more songs — use the search bar to find them.</div>'
    : '';
  return cards+moreNote+renderRequestCta();
}
export function renderRequest(){
  var disabled=!S.spotifyToken;
  var body="";
  if(disabled){
    body='<div class="req-disabled-note">Song requests aren’t available right now — the host needs to be on the Admin page so the song search is live. Try again in a minute.</div>';
  }else if(S.requestSearching){
    body='<div class="req-loading"><div class="spinner"></div></div>';
  }else if(!(S.requestQuery||"").trim()){
    body='<div class="req-empty">Start typing to search the full Spotify catalog.</div>';
  }else if(S.requestResults.length===0){
    body='<div class="req-empty">No results on Spotify. Try a different spelling.</div>';
  }else{
    body=S.requestResults.map(function(t){
      var submitting=(S.requestSubmittingId===t.trackId);
      var inCatalog=S.catalog.some(function(c){return c.track_id===t.trackId;});
      var art=t.art?'<img src="'+esc(t.art)+'" alt="" loading="lazy">':'<div class="song-card-placeholder">&#127925;</div>';
      var overlay;
      if(inCatalog){
        overlay='<span class="song-card-added">'+esc(addedLabel(S.theme_name))+'</span>';
      }else{
        var plusInner=submitting?
          '<div class="spinner" role="presentation"></div>':
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
        overlay='<span class="song-card-plus" aria-hidden="true">'+plusInner+'</span>';
      }
      var dur=(typeof t.duration_ms==="number"&&t.duration_ms>0)?
        '<div class="song-card-dur">'+fmtD(t.duration_ms)+'</div>':'';
      var attrs='';
      if(submitting)attrs+=' data-req-busy="1"';
      if(inCatalog)attrs+=' data-req-added="1" aria-disabled="true"';
      else attrs+=' role="button" tabindex="0"';
      return '<div class="song-card" data-req-track="'+esc(t.trackId)+'"'+attrs+'>'+
        '<div class="song-card-art-wrap">'+
          art+
          overlay+
        '</div>'+
        '<div class="song-card-info">'+
          '<div class="song-card-title">'+esc(t.name)+'</div>'+
          '<div class="song-card-artist">'+esc(t.artist)+'</div>'+
          dur+
        '</div>'+
      '</div>';
    }).join("");
  }
  var inputHtml=disabled?"":'<div class="search-bar">'+
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'+
    '<input class="search-input" id="req-search-input" placeholder="Search Spotify…" autocomplete="off" value="'+esc(S.requestQuery||"")+'">'+
  '</div>';
  var confirm=S.requestConfirm?
    '<div class="req-confirm"><div class="req-confirm-title">'+esc(S.requestConfirm.title)+'</div><div>'+esc(S.requestConfirm.sub||"")+'</div></div>':"";
  return '<div class="req-screen screen">'+
    '<div class="req-header">'+
      '<button class="req-back" id="req-back" type="button">'+
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>'+
        'Back to Songs'+
      '</button>'+
      '<div class="req-title">Request a Song</div>'+
      '<div class="req-sub">Pick anything from Spotify and Chas will add it to the karaoke library when he can.</div>'+
      inputHtml+
    '</div>'+
    '<div class="req-results" id="req-results">'+body+'</div>'+
    confirm+
  '</div>';
}
// Safe mode: append "?safemode" (or "&safemode") to the URL to skip the
// song-grid render entirely. Lets you reach Queue/Stage/Profile/Awards from
// the bottom nav while you're stuck in a Songs-render crash loop.
function isSafeMode(){
  try{ return new URLSearchParams(window.location.search).has('safemode'); }
  catch(e){ return false; }
}

export function renderSongs(){
  var safe=isSafeMode();
  var fl=safe?[]:filterCatalog();
  var cards=safe
    ? '<div class="song-empty" style="grid-column:1/-1;padding:32px 16px;line-height:1.5;">Safe mode — song grid skipped. Use the bottom nav to reach other screens, then remove <code>?safemode</code> from the URL to restore.</div>'
    : renderSongCards(fl);
  return '<div class="screen">'+
    '<div class="songs-header">'+
      (S.sessionName?'<div style="font-size:11px;opacity:0.5;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">'+esc(S.sessionName)+'</div>':'')+
      '<div class="songs-title">Songs'+(safe?' (safe mode)':'')+'</div>'+
      (safe?'':'<div class="search-bar">'+
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'+
        '<input class="search-input" id="search-input" placeholder="Search songs or artists..." value="'+esc(S.searchQuery)+'">'+
      '</div>'+
      renderGenreTabs())+
    '</div>'+
    '<div class="song-grid" id="song-grid">'+cards+'</div>'+
  '</div>';
}
