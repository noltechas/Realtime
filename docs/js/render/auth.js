import { S, NC } from '../state.js';
import { esc, avatarHTML } from '../utils.js';

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
    '<button id="rejoin-open" style="margin-top:14px;width:100%;max-width:320px;padding:14px 16px;border-radius:99px;border:1px solid var(--white-faint);background:transparent;color:var(--white-muted);font-size:13px;font-weight:700;font-family:var(--font-display);cursor:pointer;letter-spacing:0.5px">Rejoin existing user</button>'+
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
