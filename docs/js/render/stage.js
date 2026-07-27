import { S, EMOJI_LIST, caches } from '../state.js';
import { esc, avatarHTML } from '../utils.js';

export function renderStage(){
  var customCell="";
  if(S.customEmoji){
    customCell='<div class="reaction-cell" id="react-custom"><span class="reaction-cell-emoji">'+S.customEmoji+'</span><span class="reaction-cell-label">Custom</span><div class="reaction-cell-edit" id="react-custom-edit">\u270F</div></div>';
  }else{
    customCell='<div class="reaction-cell" id="react-custom-pick"><span class="reaction-cell-plus">+</span><span class="reaction-cell-label">Custom Emoji</span></div>';
  }
  return '<div class="stage-screen screen">'+
    '<div class="stage-title">React</div>'+
    '<div class="reaction-grid">'+
      '<div class="reaction-cell" id="react-flowers"><span class="reaction-cell-emoji">\uD83D\uDC90</span><span class="reaction-cell-label">Flowers</span></div>'+
      '<div class="reaction-cell" id="react-tomato"><span class="reaction-cell-emoji">\uD83C\uDF45</span><span class="reaction-cell-label">Tomato</span></div>'+
      customCell+
      '<div class="reaction-cell" id="react-say"><div class="reaction-cell-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div><span class="reaction-cell-label">Say Something</span></div>'+
      '<div class="reaction-cell" id="react-meme"><div class="reaction-cell-icon"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div><span class="reaction-cell-label">Memes</span></div>'+
      '<div class="reaction-cell" id="react-camera"><div class="reaction-cell-icon"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></div><span class="reaction-cell-label">Photo</span></div>'+
    '</div>'+
    '<input type="file" id="react-camera-input" accept="image/*" style="position:absolute;opacity:0;width:1px;height:1px;left:-9999px">'+
  '</div>';
}
export function renderEmojiPicker(){
  if(!S.emojiPickerOpen)return"";
  var btns=EMOJI_LIST.map(function(e){return '<button class="emoji-pick-btn" data-emoji="'+e+'">'+e+'</button>';}).join("");
  return '<div class="emoji-picker-overlay" id="emoji-overlay"><div class="emoji-picker-sheet"><div class="emoji-picker-title">Choose an Emoji</div><div class="emoji-picker-grid">'+btns+'</div></div></div>';
}
export function renderTextInput(){
  if(!S.textInputOpen)return"";
  return '<div class="text-input-overlay" id="text-overlay"><div class="text-input-sheet"><input class="text-input-field" id="text-reaction-input" placeholder="What do you want to say?" maxlength="120" autocomplete="off"><button class="text-input-send" id="text-reaction-send">Send</button></div></div>';
}
export function renderMemePicker(){
  if(!S.memePickerOpen)return"";
  var content="";
  if(S.memeGifs.length===0&&caches.allGifs.length===0){
    content='<div class="meme-gif-loading">GIFs are loading\u2026 try again in a moment</div>';
  }else if(S.memeGifs.length===0){
    content='<div class="meme-gif-loading">No matching GIFs</div>';
  }else{
    content=S.memeGifs.map(function(g){return '<button class="meme-pick-btn" data-gif-url="'+g.url+'"><img src="'+g.preview+'" alt="" loading="lazy"></button>';}).join("");
  }
  return '<div class="meme-picker-overlay" id="meme-overlay"><div class="meme-picker-sheet">'+
    '<div class="emoji-picker-title">Pick a GIF</div>'+
    '<div class="meme-search-wrap"><input class="meme-search-input" id="meme-search-field" placeholder="Search GIFs\u2026" autocomplete="off" value="'+esc(S.memeSearchQuery)+'"></div>'+
    '<div class="meme-picker-grid" id="meme-gif-grid">'+content+'</div>'+
    '<div class="meme-powered-by">Powered by GIPHY</div>'+
  '</div></div>';
}
export function renderBN(act){
  var navAv=S.profilePicture?'<div class="nav-guest-avatar"><img src="'+S.profilePicture+'" alt=""></div>':'<div class="nav-guest-avatar">'+esc(S.guestName?S.guestName.charAt(0).toUpperCase():"?")+'</div>';
  var isSinging=!!(S.matchedSinger&&S.nowPlaying);
  var middleBtn=isSinging?
    '<button class="nav-tab'+(act==="youreup"?" active":"")+'" data-nav="youreup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>Stage</button>':
    '<button class="nav-tab'+(act==="stage"?" active":"")+'" data-nav="stage"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>React</button>';
  return '<div class="bottom-nav">'+
    '<button class="nav-tab'+(act==="songs"?" active":"")+'" data-nav="songs"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Songs</button>'+
    middleBtn+
    '<button class="nav-tab'+(act==="queue"?" active":"")+'" data-nav="queue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>Queue</button>'+
    '<button class="nav-tab'+(act==="awards"?" active":"")+'" data-nav="awards"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><path d="M6 3h12v6a6 6 0 0 1-12 0V3z"/><path d="M9 21h6"/><path d="M12 15v6"/></svg>Awards</button>'+
    '<button class="nav-tab nav-tab--profile'+(act==="profile"?" active":"")+'" data-nav="profile" id="nav-profile" aria-label="'+esc(S.guestName||"Profile")+'" title="'+esc(S.guestName||"Profile")+'">'+navAv+'Profile</button>'+
  '</div>';
}
export function renderYoureUp(){
  var np=S.nowPlaying;if(!np)return'';
  var ms=S.matchedSinger;
  var singerColor=ms?ms.color:"#8b7cff";
  var singerGlow=ms?ms.colorGlow:"rgba(139,124,255,0.3)";
  // Singer color is functional data (each guest's chosen color) — passed to
  // CSS as custom properties so the stylesheet owns the actual design.
  var scVars='--sc:'+singerColor+';--sc-soft:'+singerColor+'cc;--sg:'+singerGlow;
  var artH=np.artUrl?'<img class="youreup-art" src="'+np.artUrl+'" alt="">':'';
  var playIcon=S.isPlaying?
    '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="3" width="5" height="18" rx="1"/></svg>':
    '<svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg>';
  var vfxOn=S.vocalFxEnabled!==false;
  var atOn=S.autotuneEnabled!==false;
  var checkSvg='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  var toggleBtn=function(id,label,on){
    return '<button id="'+id+'" class="youreup-toggle'+(on?" is-on":"")+'" type="button" style="'+scVars+'">'+
      '<span class="youreup-toggle-box" aria-hidden="true">'+(on?checkSvg:'')+'</span>'+
      '<span class="youreup-toggle-label">'+label+'</span>'+
    '</button>';
  };
  var toggles='<div class="youreup-toggles">'+
    toggleBtn("youreup-vfx-btn","Vocal FX",vfxOn)+
    toggleBtn("youreup-at-btn","Autotune",atOn)+
  '</div>';
  var skipBtn='<button id="youreup-skip-btn" class="youreup-skip-btn" type="button">'+
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>'+
    'Skip Song'+
  '</button>';
  var skipConfirm=S.skipConfirmOpen?
    '<div class="skip-confirm-backdrop" id="skip-confirm-backdrop">'+
      '<div class="skip-confirm-card">'+
        '<div class="skip-confirm-title">Skip this song?</div>'+
        '<div class="skip-confirm-sub">Move on to the next track in the queue.</div>'+
        '<div class="skip-confirm-actions">'+
          '<button id="skip-confirm-cancel" class="skip-confirm-btn skip-confirm-btn-ghost">Cancel</button>'+
          '<button id="skip-confirm-yes" class="skip-confirm-btn skip-confirm-btn-danger">Skip</button>'+
        '</div>'+
      '</div>'+
    '</div>':'';
  var playBtn='<button class="youreup-play-btn'+(S.isPlaying?" is-playing":"")+'" id="youreup-play-btn" style="'+scVars+'" aria-label="'+(S.isPlaying?"Pause":"Play")+'">'+playIcon+'</button>';
  if(S.isPlaying){
    return '<div class="youreup-screen screen" style="'+scVars+'">'+
      '<div class="youreup-song" style="margin-top:0">'+esc(np.name)+'</div>'+
      '<div class="youreup-artist">'+esc(np.artist||"")+'</div>'+
      playBtn+
      toggles+
      skipBtn+
      skipConfirm+
    '</div>';
  }
  return '<div class="youreup-screen screen" style="'+scVars+'">'+
    '<div class="youreup-title">You\'re Up!</div>'+
    artH+
    '<div class="youreup-song">'+esc(np.name)+'</div>'+
    '<div class="youreup-artist">'+esc(np.artist||"")+'</div>'+
    playBtn+
    toggles+
    skipBtn+
    skipConfirm+
  '</div>';
}
