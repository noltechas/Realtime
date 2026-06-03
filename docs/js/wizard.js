import { S, NC, MAX_SINGERS } from './state.js';
import { render } from './render/main.js';
import { addToQueue } from './supabase.js';

function findNCByColor(hex){
  if(!hex)return null;
  var lc=hex.toLowerCase();
  for(var i=0;i<NC.length;i++){if(NC[i].c.toLowerCase()===lc)return NC[i];}
  return null;
}
function colorTakenByOther(hex,exceptIdx){
  if(!hex)return false;
  var lc=hex.toLowerCase();
  for(var i=0;i<S.singers.length;i++){
    if(i===exceptIdx)continue;
    if(((S.singers[i].color||"").toLowerCase())===lc)return true;
  }
  return false;
}
export function initWizardFromTrack(track){
  S.selectedTrack=track;
  var pref=findNCByColor(S.defaultColor);
  var first=pref||NC[0];
  // The first singer is the local guest — store guestId so it persists as a
  // reference (name + avatar resolve live). profilePicture is kept for the
  // wizard's own preview only; it is dropped on submit.
  S.singers=[{name:S.guestName,color:first.c,colorGlow:first.g,roleIndices:[],profilePicture:S.profilePicture,guestId:S.guestId||null}];
  S.wizardStep=2;
  S.screen="wizard-singers";
  S.customSingerName="";
  S.singerPickerOpen=false;
  S.stage_theme=null;
  S.hide_song=false;
  S.editQueueRowId=null;
}
// Edit-your-song entry: rehydrate the wizard from an existing karaoke_queue
// row instead of seeding defaults. Submit will UPDATE the row rather than
// INSERT a new one — see addToQueue() in supabase.js for the branch.
export function initWizardFromQueueItem(track,row){
  S.selectedTrack=track;
  var cfgs=(row&&row.singer_configs)||[];
  S.singers=cfgs.map(function(c){
    // Reference-shaped configs carry only a guestId — resolve the live name +
    // avatar from the guest roster. Name-only configs keep their inline name.
    var g=(c.guestId&&S.guestsById)?S.guestsById[c.guestId]:null;
    return {
      name:(g&&g.name)||c.name||"",
      color:c.color||NC[0].c,
      colorGlow:c.colorGlow||NC[0].g,
      roleIndices:Array.isArray(c.roleIndices)?c.roleIndices.slice():[],
      profilePicture:(g?g.profilePicture:c.profilePicture)||null,
      guestId:c.guestId||null
    };
  });
  if(S.singers.length===0){
    // Defensive — shouldn't happen, but a queue row with no singers shouldn't
    // wedge the wizard. Seed with the current guest so the user can save out.
    var first=NC[0];
    S.singers=[{name:S.guestName,color:first.c,colorGlow:first.g,roleIndices:[],profilePicture:S.profilePicture,guestId:S.guestId||null}];
  }
  S.wizardStep=2;
  S.screen="wizard-singers";
  S.customSingerName="";
  S.singerPickerOpen=false;
  S.stage_theme=row.stage_theme||null;
  S.hide_song=!!row.is_hidden;
  S.editQueueRowId=row.id;
}
export function addSinger(payload){
  if(S.singers.length>=MAX_SINGERS)return;
  var i=S.singers.length;
  var pref=payload&&payload.defaultColor?findNCByColor(payload.defaultColor):null;
  var color="",glow="";
  if(pref&&!colorTakenByOther(pref.c,-1)){
    color=pref.c;glow=pref.g;
  }else if(!pref){
    var fallback=NC[i%NC.length];
    if(!colorTakenByOther(fallback.c,-1)){color=fallback.c;glow=fallback.g;}
    else{
      for(var k=0;k<NC.length;k++){
        if(!colorTakenByOther(NC[k].c,-1)){color=NC[k].c;glow=NC[k].g;break;}
      }
    }
  }
  var singer={
    name:(payload&&payload.name)||"",
    color:color,
    colorGlow:glow,
    roleIndices:[],
    profilePicture:(payload&&payload.profilePicture)||null,
    guestId:(payload&&payload.guestId)||null
  };
  S.singers.push(singer);
}
export function removeSinger(i){
  if(i<=0)return;
  if(i>=S.singers.length)return;
  S.singers.splice(i,1);
}
export function setSingerColor(idx,colorIdx){
  if(idx<0||idx>=S.singers.length)return;
  var c=NC[colorIdx];if(!c)return;
  S.singers[idx].color=c.c;
  S.singers[idx].colorGlow=c.g;
}
export function alreadyHasSinger(name,guestId){
  for(var i=0;i<S.singers.length;i++){
    if(guestId&&S.singers[i].guestId===guestId)return true;
    if(name&&(S.singers[i].name||"").toLowerCase()===name.toLowerCase())return true;
  }
  return false;
}
export function wizardHasAnyChanges(){
  // Edit mode: the wizard opens with the existing row's state already in
  // place, so a "different from defaults?" check would false-negative. Treat
  // edit as always-dirty so the user sees a confirm on cancel.
  if(S.editQueueRowId)return true;
  if(S.singers.length>1)return true;
  if(S.singers[0]&&S.singers[0].roleIndices&&S.singers[0].roleIndices.length>0)return true;
  if(S.stage_theme)return true;
  if(S.hide_song)return true;
  return false;
}
export function gotoWizardStep(step){
  S.wizardStep=step;
  S.screen=(step===2)?"wizard-singers":(step===3)?"wizard-roles":"wizard-stage";
  S.singerPickerOpen=false;
  render();
}
export function wizardBack(){
  if(S.wizardStep===2){
    if(wizardHasAnyChanges()){
      if(!confirm("Discard this song setup?"))return;
    }
    // Edit cancel returns to the Queue tab (where the edit started); fresh-add
    // cancel returns to the Songs tab as before.
    var wasEdit=!!S.editQueueRowId;
    S.selectedTrack=null;S.singers=[];S.stage_theme=null;S.hide_song=false;S.customSingerName="";S.singerPickerOpen=false;S.editQueueRowId=null;
    S.screen=wasEdit?"queue":"songs";render();return;
  }
  if(S.wizardStep===3){gotoWizardStep(2);return;}
  if(S.wizardStep===4){
    var roles=(S.selectedTrack&&S.selectedTrack.roles)||[];
    gotoWizardStep(roles.length>1?3:2);return;
  }
}
export function nextWizardStep(){
  var roles=(S.selectedTrack&&S.selectedTrack.roles)||[];
  if(S.wizardStep===2){
    if(roles.length<=1){
      // Auto-assign the single role (or nothing) to every singer.
      if(roles.length===1){
        for(var i=0;i<S.singers.length;i++){
          S.singers[i].roleIndices=[0];
        }
      }
      gotoWizardStep(4);
    }else{
      gotoWizardStep(3);
    }
    return;
  }
  if(S.wizardStep===3){gotoWizardStep(4);return;}
  if(S.wizardStep===4){addToQueue();return;}
}
