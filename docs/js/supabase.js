import { sb, S, caches } from './state.js';
import { tokenIfFresh, showQueueNotification } from './utils.js';
import { applyTheme } from './themes.js';
import { render } from './render/main.js';
import { captureQueueRects, flipQueueAnimation, renderWithQueueFlip } from './animation.js';
import { saveLocal, saveDeviceProfile, loadVotedMap, saveVotedMap } from './persistence.js';

// Channels — module-local; only this file subscribes/sends.
var qCh=null,sCh=null,gCh=null,rCh=null,awCh=null,avCh=null,arCh=null;
var confirmDismissTimer=null;
var lastReactionTime=0;

export function spotifySearch(query){
  if(!query||!S.spotifyToken)return Promise.resolve([]);
  return fetch("https://api.spotify.com/v1/search?type=track&limit=20&q="+encodeURIComponent(query),
    {headers:{Authorization:"Bearer "+S.spotifyToken}})
    .then(function(r){if(!r.ok)throw new Error("Spotify "+r.status);return r.json();})
    .then(function(j){
      var items=(j&&j.tracks&&j.tracks.items)||[];
      return items.map(function(t){
        var art=t.album&&t.album.images&&t.album.images[0]?t.album.images[0].url:null;
        return {
          trackId:t.id,
          name:t.name,
          artist:(t.artists||[]).map(function(a){return a.name;}).join(", "),
          art:art,
          album:t.album?t.album.name:null,
          duration_ms:t.duration_ms||null,
          raw:t
        };
      });
    });
}
export function runRequestSearch(){
  var q=(S.requestQuery||"").trim();
  if(!q){S.requestResults=[];S.requestSearching=false;return Promise.resolve();}
  S.requestSearching=true;
  return spotifySearch(q).then(function(items){
    S.requestResults=items;
    S.requestSearching=false;
  }).catch(function(err){
    console.warn("Spotify search failed:",err);
    S.requestResults=[];
    S.requestSearching=false;
  });
}
export function submitSongRequest(item){
  if(!S.sessionId||S.requestSubmittingId)return;
  if(S.catalog.some(function(c){return c.track_id===item.trackId;})){
    S.requestConfirm={title:"Already in the library",sub:"This song is already available — search for it on the Songs page."};
    render();scheduleConfirmDismiss();
    return;
  }
  S.requestSubmittingId=item.trackId;render();
  sb.from("karaoke_song_requests").insert({
    session_id:S.sessionId,
    requested_by_guest_id:S.guestId||null,
    requested_by_name:S.guestName||"Guest",
    requested_by_profile_picture:S.profilePicture||null,
    track_id:item.trackId,
    track_name:item.name,
    track_artist:item.artist,
    track_art_url:item.art||null,
    track_album:item.album||null,
    track_duration_ms:item.duration_ms||null,
    spotify_data:item.raw||null
  }).then(function(res){
    S.requestSubmittingId=null;
    if(res.error){
      if((res.error.code||"")==="23505"){
        S.requestConfirm={title:"Already requested",sub:"Someone else already asked for this song."};
      }else{
        console.warn("Request insert failed:",res.error);
        S.requestConfirm={title:"Couldn't send request",sub:res.error.message||"Try again in a moment."};
      }
    }else{
      S.requestConfirm={title:"Request sent!",sub:"Chas will add your song ASAP!"};
      S.requestQuery="";S.requestResults=[];S.requestSearching=false;
      S.searchQuery="";S.selectedGenre="All Songs";
      S.screen="songs";
    }
    render();scheduleConfirmDismiss();
  });
}
export function scheduleConfirmDismiss(){
  if(confirmDismissTimer)clearTimeout(confirmDismissTimer);
  confirmDismissTimer=setTimeout(function(){S.requestConfirm=null;render();},3200);
}
export function sendReaction(type,content){
  if(!rCh)return;
  var now=Date.now();
  if(now-lastReactionTime<300)return;
  lastReactionTime=now;
  rCh.send({
    type:"broadcast",
    event:"reaction",
    payload:{
      id:now+"-"+Math.random().toString(36).substr(2,6),
      reactionType:type,
      content:content,
      senderName:S.guestName,
      senderProfilePicture:S.profilePicture
    }
  });
}
export async function validateSession(){
  var r=await sb.from("karaoke_sessions").select("id,is_active,name,now_playing_track_id,now_playing_name,now_playing_artist,now_playing_art_url,theme_name,is_playing,now_playing_singer_configs,now_playing_stage_theme,vocal_fx_enabled,autotune_enabled,trending_gifs,spotify_token,spotify_token_expires_at").eq("code",S.sessionCode).single();
  if(r.error||!r.data||!r.data.is_active){S.screen="error";S.errorMessage="This session has ended or does not exist.";render();return;}
  S.sessionId=r.data.id;caches.playedTrackIds={};
  if(r.data.trending_gifs&&Array.isArray(r.data.trending_gifs)){caches.allGifs=r.data.trending_gifs;}
  S.sessionName=r.data.name||null;
  S.theme_name=r.data.theme_name;
  applyTheme();
  S.isPlaying=!!r.data.is_playing;
  S.vocalFxEnabled=r.data.vocal_fx_enabled!==false;
  S.autotuneEnabled=r.data.autotune_enabled!==false;
  S.spotifyToken=tokenIfFresh(r.data.spotify_token,r.data.spotify_token_expires_at);
  S.nowPlayingSingerConfigs=r.data.now_playing_singer_configs||null;
  S.nowPlayingStageTheme=r.data.now_playing_stage_theme||null;
  if(r.data.now_playing_name){S.nowPlaying={trackId:r.data.now_playing_track_id,name:r.data.now_playing_name,artist:r.data.now_playing_artist,artUrl:r.data.now_playing_art_url};if(r.data.now_playing_track_id)caches.playedTrackIds[r.data.now_playing_track_id]=true;}
  if(S.guestId){
    var gr=await sb.from("karaoke_guests").select("id,profile_picture,default_color").eq("id",S.guestId).eq("session_id",S.sessionId).single();
    if(gr.data){
      if(gr.data.profile_picture&&!S.profilePicture){S.profilePicture=gr.data.profile_picture;saveLocal();}
      if(gr.data.default_color&&!S.defaultColor){S.defaultColor=gr.data.default_color;saveLocal();saveDeviceProfile();}
      await loadCatalog();await loadQueue();await loadGuests();await loadAwards();subRT();
      S.screen="songs";
      checkYoureUp();
      render();return;
    }
    S.guestId=null;S.guestName="";S.profilePicture=null;localStorage.removeItem("karaoke_guest_"+S.sessionCode);
  }
  S.screen="join";render();
}
export async function rejoinAsGuest(g){
  if(S.joining)return;
  S.joining=true;
  S.guestId=g.id;
  S.guestName=g.name;
  S.profilePicture=g.profilePicture||null;
  if(g.defaultColor)S.defaultColor=g.defaultColor;
  S.screen="joining";render();
  saveLocal();
  saveDeviceProfile();
  await loadCatalog();await loadQueue();await loadGuests();await loadAwards();subRT();
  S.joining=false;
  S.screen="songs";
  checkYoureUp();
  render();
}
export async function joinSession(name){
  if(S.joining)return;
  S.joining=true;S.guestName=name.trim();S.joinName="";S.screen="joining";render();
  var ins={session_id:S.sessionId,name:name.trim()};
  if(S.profilePicture)ins.profile_picture=S.profilePicture;
  if(S.defaultColor)ins.default_color=S.defaultColor;
  var r=await sb.from("karaoke_guests").insert(ins).select("id").single();
  if(r.error){S.joining=false;S.screen="join";render();alert("Failed to join. Try again.");return;}
  S.guestId=r.data.id;
  saveLocal();
  saveDeviceProfile();
  await loadCatalog();await loadQueue();await loadGuests();await loadAwards();subRT();S.joining=false;S.screen="songs";render();
}
export async function loadCatalog(){
  var r=await sb.from("karaoke_catalog").select("*").eq("session_id",S.sessionId);
  S.catalog=(r.data||[]).map(function(v){return{v:v,s:Math.random()}}).sort(function(a,b){return a.s-b.s}).map(function(o){return o.v});
}
export async function loadQueue(){
  var r=await sb.from("karaoke_queue").select("*").eq("session_id",S.sessionId).eq("status","queued");
  var rows=r.data||[];
  rows.sort(function(a,b){
    var al=a.locked?1:0, bl=b.locked?1:0;
    if(al!==bl)return bl-al;
    var at=(a.score||0)+(a.bonus_points||0);
    var bt=(b.score||0)+(b.bonus_points||0);
    if(at!==bt)return bt-at;
    var ai=a.created_at?Date.parse(a.created_at):0;
    var bi=b.created_at?Date.parse(b.created_at):0;
    return ai-bi;
  });
  S.queue=rows;
}
export async function castVote(queueRowId,value){
  if(!S.guestId||!queueRowId)return;
  var voted=loadVotedMap();
  if(voted[queueRowId])return;
  // Defensive: never vote on a song you’re in (the UI hides the buttons,
  // but a stale-DOM click could slip through).
  var row=S.queue.find(function(q){return q.id===queueRowId;});
  if(row&&row.singer_configs&&S.guestName){
    var gn=(S.guestName||"").toLowerCase();
    for(var si=0;si<row.singer_configs.length;si++){
      var n=((row.singer_configs[si]&&row.singer_configs[si].name)||"").toLowerCase();
      if(n===gn)return;
    }
  }
  voted[queueRowId]=value;
  saveVotedMap(voted);
  // Optimistically re-render so the user sees the "Voted" pill immediately.
  var local=S.queue.find(function(q){return q.id===queueRowId;});
  if(local){local.score=(local.score||0)+value;}
  // Re-sort the local queue so the row visually shifts to its new spot under FLIP.
  S.queue.sort(function(a,b){
    var al=a.locked?1:0, bl=b.locked?1:0;
    if(al!==bl)return bl-al;
    var at=(a.score||0)+(a.bonus_points||0);
    var bt=(b.score||0)+(b.bonus_points||0);
    if(at!==bt)return bt-at;
    var ai=a.created_at?Date.parse(a.created_at):0;
    var bi=b.created_at?Date.parse(b.created_at):0;
    return ai-bi;
  });
  renderWithQueueFlip();
  var ins=await sb.from("karaoke_votes").insert({queue_row_id:queueRowId,guest_id:S.guestId,value:value});
  if(ins.error){
    // 23505 = UNIQUE violation (guest already voted on this row).
    // Treat as success — keep the optimistic local state.
    if(ins.error.code!=="23505"){console.error("[vote]",ins.error);}
    return;
  }
  var rpc=await sb.rpc("increment_queue_score",{row_id:queueRowId,delta:value});
  if(rpc.error){
    console.warn("[vote] RPC failed, falling back to read-modify-write:",rpc.error.message);
    var rd=await sb.from("karaoke_queue").select("score").eq("id",queueRowId).single();
    if(!rd.error){
      await sb.from("karaoke_queue").update({score:(rd.data.score||0)+value}).eq("id",queueRowId);
    }
  }
}
export async function loadGuests(){
  var r=await sb.from("karaoke_guests").select("id,name,profile_picture,default_color").eq("session_id",S.sessionId);
  S.guests=(r.data||[]).map(function(g){return{id:g.id,name:g.name,profilePicture:g.profile_picture,defaultColor:g.default_color||null};});
}
export function checkYoureUp(){
  if(S.nowPlayingSingerConfigs&&S.guestName&&S.nowPlaying){
    var match=null;
    for(var i=0;i<S.nowPlayingSingerConfigs.length;i++){
      if(S.nowPlayingSingerConfigs[i].name===S.guestName){match=S.nowPlayingSingerConfigs[i];break;}
    }
    if(match&&S.screen!=="youreup"){
      S.matchedSinger=match;
      S.screen="youreup";
      return;
    }
    if(match){S.matchedSinger=match;}
    if(!match&&(S.screen==="youreup"||S.screen==="stage")){S.screen="stage";S.matchedSinger=null;}
  }
  if(!S.nowPlaying&&(S.screen==="youreup"||S.screen==="stage")){
    S.screen="queue";
    S.matchedSinger=null;
  }
}
export function subRT(){
  if(qCh)sb.removeChannel(qCh);
  qCh=sb.channel("cq-"+S.sessionId).on("postgres_changes",{event:"*",schema:"public",table:"karaoke_queue",filter:"session_id=eq."+S.sessionId},function(pl){
    if(pl.eventType==="INSERT")showQueueNotification(pl);
    var oldRects=captureQueueRects();
    loadQueue().then(function(){
      render();
      flipQueueAnimation(oldRects);
    });
  }).subscribe();
  if(sCh)sb.removeChannel(sCh);
  sCh=sb.channel("cs-"+S.sessionId).on("postgres_changes",{event:"UPDATE",schema:"public",table:"karaoke_sessions",filter:"id=eq."+S.sessionId},function(pl){
    var d=pl.new;if(!d.is_active){S.screen="error";S.errorMessage="This session has ended.";render();return;}
    if(S.nowPlaying&&S.nowPlaying.trackId)caches.playedTrackIds[S.nowPlaying.trackId]=true;
    if(d.now_playing_name){S.nowPlaying={trackId:d.now_playing_track_id,name:d.now_playing_name,artist:d.now_playing_artist,artUrl:d.now_playing_art_url};if(d.now_playing_track_id)caches.playedTrackIds[d.now_playing_track_id]=true;}else{S.nowPlaying=null;}
    S.isPlaying=!!d.is_playing;
    if(d.vocal_fx_enabled!==undefined)S.vocalFxEnabled=d.vocal_fx_enabled!==false;
    if(d.autotune_enabled!==undefined)S.autotuneEnabled=d.autotune_enabled!==false;
    S.nowPlayingSingerConfigs=d.now_playing_singer_configs||null;
    var prevStageTheme=S.nowPlayingStageTheme;
    S.nowPlayingStageTheme=d.now_playing_stage_theme||null;
    if(d.theme_name)S.theme_name=d.theme_name;
    if(d.theme_name||prevStageTheme!==S.nowPlayingStageTheme)applyTheme();
    if(d.spotify_token!==undefined||d.spotify_token_expires_at!==undefined){
      S.spotifyToken=tokenIfFresh(d.spotify_token,d.spotify_token_expires_at);
    }
    checkYoureUp();
    render();
  }).subscribe();
  if(gCh)sb.removeChannel(gCh);
  gCh=sb.channel("cg-"+S.sessionId).on("postgres_changes",{event:"*",schema:"public",table:"karaoke_guests",filter:"session_id=eq."+S.sessionId},function(){loadGuests().then(render);}).subscribe();
  if(rCh)sb.removeChannel(rCh);
  rCh=sb.channel("cr-"+S.sessionId);
  rCh.subscribe();
  subAwardsRealtime();
}
export async function addToQueue(){
  if(S.addingToQueue)return;
  var t=S.selectedTrack;if(!t)return;
  var editing=!!S.editQueueRowId;
  var sc=S.singers.slice().map(function(s){var o={name:(s.name||"").trim()||"Singer",color:s.color,colorGlow:s.colorGlow,roleIndices:s.roleIndices||[]};if(s.profilePicture)o.profilePicture=s.profilePicture;if(s.whitePersonCheck)o.whitePersonCheck=true;return o;});
  if(t.roles&&t.roles.length>0&&sc.length>0){
    var ur=sc.filter(function(s){return !s.roleIndices||s.roleIndices.length===0;});
    if(ur.length>0){
      var msg=editing
        ? "One or more singers don't have roles assigned. Save changes anyway?"
        : "One or more singers don't have roles assigned. Add to queue anyway?";
      if(!confirm(msg))return;
    }
  }
  S.addingToQueue=true;
  if(editing){
    // UPDATE in place — preserve score / position / locked / created_at /
    // added_by_* so votes and ordering aren't reset by an edit.
    var upd={singer_configs:sc,stage_theme:S.stage_theme||null,is_hidden:!!S.hide_song};
    var ur2=await sb.from("karaoke_queue").update(upd).eq("id",S.editQueueRowId);
    if(ur2.error){S.addingToQueue=false;alert("Failed to save changes. Try again.");return;}
  }else{
    var mr=await sb.from("karaoke_queue").select("position").eq("session_id",S.sessionId).order("position",{ascending:false}).limit(1).single();
    var np=(mr.data?mr.data.position:-1)+1;
    var ins={session_id:S.sessionId,track_id:t.track_id,track_name:t.name,track_artist:t.artist,track_art_url:t.art_url,track_duration_ms:t.duration_ms,singer_configs:sc,added_by_guest_id:S.guestId,added_by_name:S.guestName,source:"remote",position:np,status:"queued"};
    if(S.stage_theme)ins.stage_theme=S.stage_theme;
    if(S.hide_song)ins.is_hidden=true;
    var r=await sb.from("karaoke_queue").insert(ins);
    if(r.error){S.addingToQueue=false;alert("Failed to add song. Try again.");return;}
  }
  S.addingToQueue=false;S.selectedTrack=null;S.singers=[];S.stage_theme=null;S.hide_song=false;S.customSingerName="";S.singerPickerOpen=false;S.editQueueRowId=null;S.screen="queue";await loadQueue();render();
}
export async function updateProfile(name,pic,defaultColor){
  var upd={name:name.trim()};
  if(pic!==undefined)upd.profile_picture=pic;
  if(defaultColor!==undefined)upd.default_color=defaultColor;
  var r=await sb.from("karaoke_guests").update(upd).eq("id",S.guestId);
  if(r.error){alert("Failed to save profile. Try again.");return;}
  S.guestName=name.trim();
  if(pic!==undefined)S.profilePicture=pic;
  if(defaultColor!==undefined)S.defaultColor=defaultColor;
  saveLocal();
  saveDeviceProfile();
  S.screen="songs";render();
}
export async function loadAwards(){
  if(!S.sessionId)return;
  // Fetch awards, own votes, played history, and guest list in parallel.
  var awP=sb.from("karaoke_awards").select("*").eq("session_id",S.sessionId).order("is_default",{ascending:false}).order("created_at",{ascending:true});
  // RPC over a direct SELECT so the server strips the base64 profilePicture
  // from each singer_configs entry — see karaoke_played_lean migration for
  // the rationale. Without this, busy sessions ship 10+ MB of dead photo
  // data to every Awards-tab load.
  var hP=sb.rpc("karaoke_played_lean",{p_session_id:S.sessionId});
  var gP=sb.from("karaoke_guests").select("id,name,profile_picture").eq("session_id",S.sessionId);
  var rP=sb.from("karaoke_award_results").select("*").eq("session_id",S.sessionId);
  var awR=await awP, hR=await hP, gR=await gP, rR=await rP;
  S.awards=(awR.data)||[];
  S.awardsHistory=(hR.data||[]).map(function(r){
    return {
      queueRowId:r.id,trackId:r.track_id,trackName:r.track_name,trackArtist:r.track_artist,
      trackArtUrl:r.track_art_url,singers:r.singer_configs||[],playedAt:r.created_at
    };
  });
  S.awardsGuestsCache=(gR.data||[]).map(function(g){return {id:g.id,name:g.name,profilePicture:g.profile_picture};});
  S.awardResults=(rR.data)||[];
  // Own votes only
  if(S.guestId&&S.awards.length){
    var ids=S.awards.map(function(a){return a.id;});
    var v=await sb.from("karaoke_award_votes").select("*").in("award_id",ids).eq("voter_guest_id",S.guestId);
    var map={};
    (v.data||[]).forEach(function(vt){map[vt.award_id]=vt;});
    S.awardVotes=map;
  }
}
export async function castAwardVote(awardId,subject){
  if(!S.guestId)return;
  var row={award_id:awardId,voter_guest_id:S.guestId,subject_queue_row_id:subject.queueRowId||null,subject_guest_id:subject.guestId||null,updated_at:new Date().toISOString()};
  var r=await sb.from("karaoke_award_votes").upsert(row,{onConflict:"award_id,voter_guest_id"});
  if(r.error){alert("Failed to cast vote. Try again.");return;}
  // Cache the vote locally for immediate UI feedback
  S.awardVotes[awardId]={award_id:awardId,voter_guest_id:S.guestId,subject_queue_row_id:row.subject_queue_row_id,subject_guest_id:row.subject_guest_id};
  render();
}
export async function createCustomAward(draft){
  if(!S.guestId)return;
  var row={
    session_id:S.sessionId,slug:null,title:draft.title,description:draft.description||"",subject_type:draft.subjectType,
    icon_id:draft.iconId||null,icon_data_url:draft.iconDataUrl||null,
    is_default:false,created_by_guest_id:S.guestId
  };
  var r=await sb.from("karaoke_awards").insert(row).select("*").single();
  if(r.error){
    if(r.error.code==="23505")alert("You already created an award for this session.");
    else alert("Failed to create award: "+r.error.message);
    return null;
  }
  // Local mirror update; realtime will reconcile.
  S.awards=S.awards.concat([r.data]);
  return r.data;
}
export async function updateMyAward(awardId,fields){
  var upd={updated_at:new Date().toISOString()};
  if(fields.title!==undefined)upd.title=fields.title;
  if(fields.description!==undefined)upd.description=fields.description;
  if(fields.iconId!==undefined)upd.icon_id=fields.iconId;
  if(fields.iconDataUrl!==undefined)upd.icon_data_url=fields.iconDataUrl;
  // Mutually exclusive: clear the other when one is set.
  if(fields.iconId)upd.icon_data_url=null;
  if(fields.iconDataUrl)upd.icon_id=null;
  var r=await sb.from("karaoke_awards").update(upd).eq("id",awardId);
  if(r.error){alert("Failed to update award.");return;}
}
export async function deleteMyAward(awardId){
  // Count votes first — companion guests can only delete if 0 votes.
  var c=await sb.from("karaoke_award_votes").select("id",{count:"exact",head:true}).eq("award_id",awardId);
  if(c.count&&c.count>0){alert("You can't delete this award — it already has votes. Ask the host to delete it instead.");return;}
  var r=await sb.from("karaoke_awards").delete().eq("id",awardId);
  if(r.error){alert("Failed to delete award.");return;}
  S.awards=S.awards.filter(function(a){return a.id!==awardId;});
}
export function subAwardsRealtime(){
  if(awCh)sb.removeChannel(awCh);
  if(avCh)sb.removeChannel(avCh);
  if(arCh)sb.removeChannel(arCh);
  awCh=sb.channel("aw-"+S.sessionId)
    .on("postgres_changes",{event:"*",schema:"public",table:"karaoke_awards",filter:"session_id=eq."+S.sessionId},function(){
      loadAwards().then(render);
    }).subscribe();
  avCh=sb.channel("av-"+S.sessionId)
    .on("postgres_changes",{event:"*",schema:"public",table:"karaoke_award_votes"},function(){
      // We can't filter by session_id (votes ref awards, not sessions); refresh own votes only.
      if(!S.guestId||!S.awards.length)return;
      var ids=S.awards.map(function(a){return a.id;});
      sb.from("karaoke_award_votes").select("*").in("award_id",ids).eq("voter_guest_id",S.guestId).then(function(r){
        var map={};(r.data||[]).forEach(function(v){map[v.award_id]=v;});S.awardVotes=map;
        if(S.screen==="awards")render();
      });
    }).subscribe();
  arCh=sb.channel("ar-"+S.sessionId)
    .on("broadcast",{event:"reveal-step"},function(pl){
      var step=pl.payload&&pl.payload.step;
      S.awardsRevealStep=step||null;
      render();
    }).subscribe();
}
