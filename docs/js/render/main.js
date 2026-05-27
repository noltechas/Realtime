import { S } from '../state.js';
import { esc } from '../utils.js';
import { applyTheme } from '../themes.js';
import { renderJoin, renderRejoin, renderJoining, renderProfile, renderDownloadPrompt } from './auth.js';
import { renderSongs, renderRequest } from './songs.js';
import { renderWizardShell, renderWizardSingers, renderWizardRoles, renderWizardStage, renderWizardFooter, renderSingerPickerOverlay } from './wizard.js';
import { renderQueue } from './queue.js';
import { renderStage, renderEmojiPicker, renderTextInput, renderMemePicker, renderYoureUp, renderBN } from './stage.js';
import { renderAwardsScreen, renderVoteConfirmOverlay, renderRevealOverlay } from './awards.js';
import { bindEvents } from '../events/main.js';
import { trackScreen } from '../history.js';

export function render(){
  // Defensive: if a click handler somewhere mis-sets S.screen to an
  // unknown value, log and bail rather than silently leaving the page
  // stuck on a stale DOM with an empty bottom nav.
  var VALID_SCREENS={
    loading:1,"download-prompt":1,join:1,rejoin:1,joining:1,songs:1,request:1,
    "wizard-singers":1,"wizard-roles":1,"wizard-stage":1,
    queue:1,stage:1,profile:1,youreup:1,awards:1,error:1
  };
  if(!VALID_SCREENS[S.screen]){
    if(window.__pushErr)window.__pushErr({time:new Date().toISOString(),message:'render: unknown screen '+JSON.stringify(S.screen)+' — bailing',source:'',line:0,col:0,stack:''});
    return;
  }
  trackScreen();
  var a=document.getElementById("app");
  // Apply song's stage theme on You're Up screen, restore global theme otherwise
  if(S.screen==="youreup"&&S.nowPlayingStageTheme){
    var saved=S.theme_name;
    S.theme_name=S.nowPlayingStageTheme;
    applyTheme();
    S.theme_name=saved;
  }else{
    applyTheme();
  }
  // Bottom nav and overlays live OUTSIDE #app so no in-app styling, animation
  // transform, or backdrop-filter context can break their `position: fixed`.
  // Each render() pass populates them via their own mount nodes.
  var navMount=document.getElementById("bn-mount");
  var overlayMount=document.getElementById("overlay-mount");
  var navActive=null;
  switch(S.screen){
    case"loading":a.innerHTML='<div class="loading-center"><div class="spinner"></div></div>';break;
    case"download-prompt":a.innerHTML=renderDownloadPrompt();break;
    case"join":a.innerHTML=renderJoin();break;
    case"rejoin":a.innerHTML=renderRejoin();break;
    case"joining":a.innerHTML=renderJoining();break;
    case"songs":a.innerHTML=renderSongs();navActive="songs";break;
    case"request":a.innerHTML=renderRequest();navActive="songs";break;
    case"wizard-singers":a.innerHTML=renderWizardShell(2,renderWizardSingers())+renderWizardFooter(2)+renderSingerPickerOverlay();navActive="songs";break;
    case"wizard-roles":a.innerHTML=renderWizardShell(3,renderWizardRoles())+renderWizardFooter(3);navActive="songs";break;
    case"wizard-stage":a.innerHTML=renderWizardShell(4,renderWizardStage())+renderWizardFooter(4);navActive="songs";break;
    case"queue":a.innerHTML=renderQueue();navActive="queue";break;
    case"stage":a.innerHTML=renderStage()+renderEmojiPicker()+renderTextInput()+renderMemePicker();navActive="stage";break;
    case"profile":a.innerHTML=renderProfile();navActive="profile";break;
    case"youreup":a.innerHTML=renderYoureUp();navActive="youreup";break;
    case"awards":a.innerHTML=renderAwardsScreen();navActive="awards";break;
    case"error":a.innerHTML=renderError();break;
  }
  if(navMount){navMount.innerHTML=navActive?renderBN(navActive):"";}
  // Reveal overlay + vote-confirm modal mount in body so nothing in #app can
  // affect them (covers/blocks the whole viewport regardless of screen).
  var overlayHtml="";
  if(S.awardsRevealStep&&S.awardsRevealStep.phase&&S.awardsRevealStep.phase!=="idle"&&S.awardsRevealStep.phase!=="done"){
    overlayHtml+=renderRevealOverlay();
  }
  if(S.screen==="awards"){overlayHtml+=renderVoteConfirmOverlay();}
  if(overlayMount){overlayMount.innerHTML=overlayHtml;}
  try{ bindEvents(); }
  catch(e){
    // Don't let a stray event-handler binding crash the whole app —
    // log it and continue so the page still renders.
    if(window.__pushErr)window.__pushErr({time:new Date().toISOString(),message:'bindEvents threw: '+(e&&e.message||e),source:(e&&e.fileName)||'',line:(e&&e.lineNumber)||0,col:(e&&e.columnNumber)||0,stack:(e&&e.stack)||''});
    else console.error('bindEvents threw:',e);
  }
}

export function renderError(){
  return '<div class="error-screen screen"><div class="error-icon">&#128542;</div><div class="error-title">Session Unavailable</div><div class="error-sub">'+esc(S.errorMessage)+'</div></div>';
}
