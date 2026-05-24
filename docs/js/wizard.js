import { S, NC, MAX_SINGERS } from './state.js?v=20260524c';
import { render } from './render/main.js?v=20260524c';
import { addToQueue } from './supabase.js?v=20260524c';

export function initWizardFromTrack(track){
  S.selectedTrack=track;
  S.singers=[{name:S.guestName,color:NC[0].c,colorGlow:NC[0].g,roleIndices:[],profilePicture:S.profilePicture,whitePersonCheck:S.prefersSanitize!==false}];
  S.wizardStep=2;
  S.screen="wizard-singers";
  S.customSingerName="";
  S.singerPickerOpen=false;
  S.stage_theme=null;
  S.hide_song=false;
}
export function addSinger(payload){
  if(S.singers.length>=MAX_SINGERS)return;
  var i=S.singers.length;
  var singer={
    name:(payload&&payload.name)||"",
    color:NC[i%NC.length].c,
    colorGlow:NC[i%NC.length].g,
    roleIndices:[],
    profilePicture:(payload&&payload.profilePicture)||null,
    whitePersonCheck:true
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
  if(!name)return false;
  var lc=name.toLowerCase();
  for(var i=0;i<S.singers.length;i++){
    if((S.singers[i].name||"").toLowerCase()===lc)return true;
  }
  return false;
}
export function wizardHasAnyChanges(){
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
    S.selectedTrack=null;S.singers=[];S.stage_theme=null;S.hide_song=false;S.customSingerName="";S.singerPickerOpen=false;
    S.screen="songs";render();return;
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
