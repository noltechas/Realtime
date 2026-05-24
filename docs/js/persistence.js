import { S } from './state.js';

export function saveLocal(){
  localStorage.setItem("karaoke_guest_"+S.sessionCode,JSON.stringify({guestId:S.guestId,guestName:S.guestName,sessionId:S.sessionId,profilePicture:S.profilePicture}));
}
export function loadDeviceProfile(){
  try{var raw=localStorage.getItem("karaoke_device_profile");return raw?JSON.parse(raw):null;}catch(e){return null;}
}
export function saveDeviceProfile(){
  if(!S.guestName)return;
  try{localStorage.setItem("karaoke_device_profile",JSON.stringify({name:S.guestName,profilePicture:S.profilePicture||null,prefersSanitize:S.prefersSanitize!==false}));}catch(e){}
}
export function clearDeviceProfile(){
  try{localStorage.removeItem("karaoke_device_profile");}catch(e){}
}
export function loadVotedMap(){
  if(!S.sessionCode)return{};
  try{var raw=localStorage.getItem("karaoke_votes_"+S.sessionCode);return raw?JSON.parse(raw):{};}catch(e){return{};}
}
export function saveVotedMap(m){
  if(!S.sessionCode)return;
  try{localStorage.setItem("karaoke_votes_"+S.sessionCode,JSON.stringify(m));}catch(e){}
}
