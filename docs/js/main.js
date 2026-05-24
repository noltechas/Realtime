import './error-logger.js';
import { S } from './state.js';
import { loadDeviceProfile } from './persistence.js';
import { render } from './render/main.js';
import { validateSession } from './supabase.js';

function init(){
  var p=new URLSearchParams(window.location.search);
  S.sessionCode=p.get("session");
  if(!S.sessionCode){S.screen="error";S.errorMessage="No session code provided. Scan the QR code to join.";render();return;}
  var saved=localStorage.getItem("karaoke_guest_"+S.sessionCode);
  if(saved){try{var g=JSON.parse(saved);S.guestId=g.guestId;S.guestName=g.guestName;S.sessionId=g.sessionId;S.profilePicture=g.profilePicture||null;S.defaultColor=g.defaultColor||null;}catch(e){}}
  var dp=loadDeviceProfile();
  if(dp&&typeof dp.prefersSanitize==="boolean")S.prefersSanitize=dp.prefersSanitize;
  if(dp&&dp.defaultColor&&!S.defaultColor)S.defaultColor=dp.defaultColor;
  validateSession();
}

init();
