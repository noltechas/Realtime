import { S, NC, ANDROID_APP_URL, IOS_APP_URL } from '../state.js';
import { esc, avatarHTML } from '../utils.js';

// Detect the visitor's mobile OS from the user agent. Used by the download
// prompt to pick the right call-to-action.
export function detectPlatform(){
  var ua=navigator.userAgent||"";
  if(/Android/i.test(ua))return"android";
  // iPadOS 13+ reports as Mac with touch — treat as iOS so iPads see the
  // iOS download path, not the desktop fallback.
  if(/iPhone|iPad|iPod/i.test(ua))return"ios";
  if(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1)return"ios";
  return"desktop";
}

export function renderDownloadPrompt(){
  var plat=detectPlatform();
  var primaryHtml="";
  var helper="";
  if(plat==="android"){
    primaryHtml='<a class="join-btn dl-btn-primary" id="dl-download" href="'+esc(ANDROID_APP_URL)+'" download>'+
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-4px;margin-right:8px"><path d="M17.523 15.341a1.025 1.025 0 1 1 0-2.05 1.025 1.025 0 0 1 0 2.05Zm-11.046 0a1.025 1.025 0 1 1 0-2.05 1.025 1.025 0 0 1 0 2.05Zm11.412-6.142 2.047-3.546a.426.426 0 0 0-.738-.427l-2.072 3.589A12.811 12.811 0 0 0 12 7.5a12.81 12.81 0 0 0-5.126 1.315L4.802 5.226a.426.426 0 1 0-.738.427l2.047 3.546C2.582 11.119.357 14.443 0 18.5h24c-.357-4.057-2.582-7.381-6.111-9.301Z"/></svg>'+
      'Download for Android</a>';
    helper="APK installs in a few seconds. You may need to allow installs from your browser.";
  }else if(plat==="ios"){
    if(IOS_APP_URL){
      primaryHtml='<a class="join-btn dl-btn-primary" id="dl-download" href="'+esc(IOS_APP_URL)+'">'+
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-4px;margin-right:8px"><path d="M17.05 12.04c-.03-3.16 2.58-4.68 2.7-4.75-1.47-2.15-3.76-2.45-4.57-2.48-1.95-.2-3.8 1.15-4.79 1.15-1.01 0-2.52-1.13-4.14-1.1-2.13.03-4.1 1.24-5.2 3.14-2.21 3.84-.57 9.52 1.59 12.64 1.06 1.53 2.32 3.24 3.97 3.18 1.6-.06 2.21-1.03 4.14-1.03 1.93 0 2.48 1.03 4.17 1 1.72-.03 2.81-1.55 3.86-3.08 1.21-1.77 1.71-3.48 1.74-3.57-.04-.02-3.34-1.28-3.37-5.1ZM13.9 2.86c.88-1.07 1.47-2.55 1.31-4.03-1.27.05-2.81.85-3.72 1.92-.81.94-1.52 2.45-1.33 3.9 1.42.11 2.86-.72 3.74-1.79Z"/></svg>'+
        'Download for iOS</a>';
    }else{
      primaryHtml='<button class="join-btn dl-btn-primary" id="dl-ios-soon" disabled style="opacity:0.5;cursor:not-allowed">iOS app coming soon</button>';
      helper="iOS app isn't published yet — use the browser link below for now.";
    }
  }else{
    helper="The app is mobile-only. Scan the QR code from your phone to get it.";
  }
  return '<div class="join-screen screen download-prompt-screen">'+
    '<div class="dl-app-icon" aria-hidden="true">'+
      '<img src="app-icon.png" alt="Karaoke">'+
    '</div>'+
    '<div class="dl-title">Lake House Karaoke</div>'+
    primaryHtml+
    (helper?'<div class="dl-helper">'+esc(helper)+'</div>':'')+
    // Pinned to the bottom of the screen by .dl-web-out — the download is the
    // action we want people to take, this is just the escape hatch.
    '<div class="dl-web-out">'+
      '<button class="dl-btn-secondary" id="dl-continue-web" type="button">Continue in browser</button>'+
    '</div>'+
  '</div>';
}

export function renderJoin(){
  var avInner=S.profilePicture?'<img src="'+S.profilePicture+'" alt="">':'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  return '<div class="join-screen screen">'+
    '<div class="join-logo">Realtime</div>'+
    '<div class="join-title">Karaoke</div>'+
    '<p class="join-sub">Set up your profile to join</p>'+
    '<div class="avatar-upload'+(S.profilePicture?" has-image":"")+'" id="avatar-upload">'+avInner+'</div>'+
    '<div class="avatar-upload-hint">Tap to add a photo (optional)</div>'+
    '<input class="join-input" id="name-input" placeholder="Your name" maxlength="30" autocomplete="off" value="'+esc(S.joinName||"")+'">'+
    '<button class="join-btn" id="join-btn" disabled>Join Session</button>'+
    '<button id="rejoin-open" class="join-alt-btn" type="button">Rejoin existing user</button>'+
    '<div class="join-session-code">'+esc(S.sessionCode)+'</div>'+
  '</div>';
}
export function renderRejoin(){
  var rows=(S.guests||[]).map(function(g){
    var av=g.profilePicture?'<img src="'+g.profilePicture+'" alt="">':'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>';
    return '<button class="rejoin-row guest-picker-pill" data-guest-id="'+esc(g.id)+'">'+
      '<span class="rejoin-row-avatar">'+av+'</span>'+
      '<span class="rejoin-row-name">'+esc(g.name)+'</span>'+
      '</button>';
  }).join("");
  var body=rows||'<div class="rejoin-empty">No one has joined this session yet.</div>';
  return '<div class="join-screen screen">'+
    '<div class="join-logo">Realtime</div>'+
    '<div class="join-title">Rejoin</div>'+
    '<p class="join-sub">Pick your profile</p>'+
    '<div class="rejoin-list">'+body+'</div>'+
    '<button id="rejoin-back" class="rejoin-back-btn">Back</button>'+
    '<div class="join-session-code">'+esc(S.sessionCode)+'</div>'+
  '</div>';
}
export function renderJoining(){
  var avHtml=S.profilePicture?'<div class="joining-avatar"><img src="'+S.profilePicture+'" alt=""></div>':'';
  return '<div class="join-screen screen">'+
    '<div class="join-logo">Realtime</div>'+
    '<div class="join-title">Karaoke</div>'+
    avHtml+
    '<div class="joining-name">'+esc(S.guestName)+'</div>'+
    '<div class="joining-spinner"><div class="spinner"></div></div>'+
    '<div class="joining-text">Joining session...</div>'+
    '<div class="join-session-code">'+esc(S.sessionCode)+'</div>'+
  '</div>';
}
export function renderProfile(){
  var avInner=S.profilePicture?'<img src="'+S.profilePicture+'" alt="">':'<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  var ringColor=S.defaultColor||"#a78bfa";
  var swatches="";
  for(var ci=0;ci<NC.length;ci++){
    var nc=NC[ci];
    var sel=(S.defaultColor||"").toLowerCase()===nc.c.toLowerCase();
    swatches+='<button type="button" class="profile-color-swatch'+(sel?" is-selected":"")+'" '+
      'data-default-color="'+nc.c+'" '+
      'style="--swatch-color:'+nc.c+';--swatch-glow:'+nc.g+'" '+
      'aria-label="Default color '+(ci+1)+(sel?" (selected)":"")+'" aria-pressed="'+(sel?"true":"false")+'">'+
      '<span class="profile-color-swatch-ring" aria-hidden="true"></span>'+
      '<span class="profile-color-swatch-check" aria-hidden="true">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
      '</span>'+
    '</button>';
  }
  var hasColor=!!S.defaultColor;
  var colorHint=hasColor
    ? 'This color will be picked automatically when you add a new song or someone adds you as a singer.'
    : 'Choose a color that’ll be picked automatically for you whenever you sing.';
  var clearBtn=hasColor
    ? '<button type="button" id="profile-color-clear" class="profile-color-clear">Clear</button>'
    : '';
  return '<div class="profile-screen screen">'+
    '<div class="profile-hero">'+
      '<div class="profile-hero-bg" style="--profile-accent:'+ringColor+'"></div>'+
      '<div class="profile-hero-content">'+
        '<button class="profile-avatar-btn'+(S.profilePicture?" has-image":"")+'" id="profile-avatar" type="button" aria-label="Change photo" style="--profile-accent:'+ringColor+'">'+
          '<span class="profile-avatar-inner">'+avInner+'</span>'+
          '<span class="profile-avatar-edit" aria-hidden="true">'+
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>'+
          '</span>'+
        '</button>'+
        '<div class="profile-hero-name">'+esc(S.guestName||"Your Profile")+'</div>'+
        '<div class="profile-hero-sub">'+esc(S.sessionCode||"")+'</div>'+
      '</div>'+
    '</div>'+
    '<div class="profile-card">'+
      '<div class="profile-card-head">'+
        '<div class="profile-card-eyebrow">Display name</div>'+
      '</div>'+
      '<input class="profile-name-input" id="profile-name" value="'+esc(S.guestName)+'" maxlength="30" autocomplete="off" placeholder="Your name">'+
    '</div>'+
    '<div class="profile-card">'+
      '<div class="profile-card-head">'+
        '<div class="profile-card-eyebrow">Default singer color</div>'+
        clearBtn+
      '</div>'+
      '<div class="profile-color-grid">'+swatches+'</div>'+
      '<div class="profile-card-hint">'+colorHint+'</div>'+
    '</div>'+
    '<button class="profile-save-btn" id="profile-save" type="button">Save changes</button>'+
    '<button id="profile-switch" class="profile-switch-btn" type="button">'+
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>'+
      'Switch user'+
    '</button>'+
  '</div>';
}
