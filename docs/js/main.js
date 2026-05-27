import { S } from './state.js';
import { loadDeviceProfile } from './persistence.js';
import { render } from './render/main.js';
import { validateSession } from './supabase.js';
import { initHistory } from './history.js';

function init(){
  var p=new URLSearchParams(window.location.search);
  S.sessionCode=p.get("session");
  if(!S.sessionCode){S.screen="error";S.errorMessage="No session code provided. Scan the QR code to join.";render();return;}
  var saved=localStorage.getItem("karaoke_guest_"+S.sessionCode);
  if(saved){try{var g=JSON.parse(saved);S.guestId=g.guestId;S.guestName=g.guestName;S.sessionId=g.sessionId;S.profilePicture=g.profilePicture||null;S.defaultColor=g.defaultColor||null;}catch(e){}}
  var dp=loadDeviceProfile();
  if(dp&&typeof dp.prefersSanitize==="boolean")S.prefersSanitize=dp.prefersSanitize;
  if(dp&&dp.defaultColor&&!S.defaultColor)S.defaultColor=dp.defaultColor;
  initHistory(render);
  // Show the download prompt unless the user previously chose to continue on
  // the web on this device, has an existing guest record for this session
  // (returning user — skip friction), or explicitly bypasses via ?web=1.
  var preferWeb=false;
  try{preferWeb=localStorage.getItem("karaoke_prefer_web")==="1";}catch(e){}
  if(p.get("web")==="1")preferWeb=true;
  if(saved)preferWeb=true;
  if(!preferWeb){S.screen="download-prompt";render();return;}
  validateSession();
}

init();
