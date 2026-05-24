import { S } from '../state.js?v=20260524c';
import { esc } from '../utils.js?v=20260524c';
import { applyTheme } from '../themes.js?v=20260524c';
import { renderJoin, renderRejoin, renderJoining, renderProfile } from './auth.js?v=20260524c';
import { renderSongs, renderRequest } from './songs.js?v=20260524c';
import { renderWizardShell, renderWizardSingers, renderWizardRoles, renderWizardStage, renderWizardFooter, renderSingerPickerOverlay } from './wizard.js?v=20260524c';
import { renderQueue } from './queue.js?v=20260524c';
import { renderStage, renderEmojiPicker, renderTextInput, renderMemePicker, renderYoureUp, renderBN } from './stage.js?v=20260524c';
import { renderAwardsScreen, renderVoteConfirmOverlay, renderRevealOverlay } from './awards.js?v=20260524c';
import { bindEvents } from '../events/main.js?v=20260524c';

export function render(){
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
  if(window.__logErr)window.__logErr('render: screen='+S.screen+' calling bindEvents');
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
