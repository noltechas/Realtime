import { S } from '../state.js';
import { esc, avatarHTML } from '../utils.js';

export function renderJoin(){
  var avInner=S.profilePicture?'<img src="'+S.profilePicture+'" alt="">':'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  return '<div class="join-screen screen">'+
    '<div class="join-logo">Realtime</div>'+
    '<div class="join-title">Karaoke</div>'+
    '<p class="join-sub">Set up your profile to join</p>'+
    '<div class="avatar-upload'+(S.profilePicture?" has-image":"")+'" id="avatar-upload">'+avInner+'</div>'+
    '<input type="file" id="avatar-input" accept="image/*" style="display:none">'+
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
  var avInner=S.profilePicture?'<img src="'+S.profilePicture+'" alt="">':'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  return '<div class="profile-screen screen">'+
    '<div class="profile-title">Your Profile</div>'+
    '<div class="profile-avatar-wrap">'+
      '<div class="profile-avatar'+(S.profilePicture?" has-image":"")+'" id="profile-avatar">'+avInner+'</div>'+
      '<input type="file" id="profile-avatar-input" accept="image/*" style="display:none">'+
      '<div class="profile-avatar-label">Tap to change photo</div>'+
    '</div>'+
    '<div class="profile-field">'+
      '<div class="profile-field-label">Name</div>'+
      '<input class="profile-name-input" id="profile-name" value="'+esc(S.guestName)+'" maxlength="30" autocomplete="off">'+
    '</div>'+
    '<button class="profile-save-btn" id="profile-save">Save Changes</button>'+
    '<button id="profile-switch" style="margin-top:14px;width:100%;padding:14px 16px;border-radius:10px;border:1px solid var(--white-faint);background:transparent;color:var(--white-muted);font-size:13px;font-weight:700;font-family:var(--font-display);cursor:pointer;letter-spacing:0.5px">Switch user</button>'+
  '</div>';
}
