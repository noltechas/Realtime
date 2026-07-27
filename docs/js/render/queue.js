import { S, caches } from '../state.js';
import { esc, avatarHTML, fmtD, resolveSingerConfig } from '../utils.js';
import { loadVotedMap } from '../persistence.js';

export function hiddenLabel(){
  return"Secret Song";
}
export function hiddenSubtitle(){
  return"surprise pick \u2014 revealed when it plays";
}
export function hiddenArtInner(){
  return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="10.5" width="17" height="10.5" rx="2.5"/><path d="M7 10.5 V7 a5 5 0 0 1 10 0 v3.5"/></svg>';
}
export function renderQueue(){
  var npH="";
  if(S.nowPlaying){var np=S.nowPlaying;npH='<div class="now-playing-card">'+(np.artUrl?'<img src="'+np.artUrl+'" alt="">':"")+'<div style="flex:1;min-width:0"><div class="now-playing-badge">Now Playing</div><div class="now-playing-title">'+esc(np.name)+'</div><div class="now-playing-artist">'+esc(np.artist||"")+'</div></div></div>';}
  var upNext=S.queue.filter(function(q){return !caches.playedTrackIds[q.track_id];});
  var votedMap=loadVotedMap();
  var ih="";
  if(upNext.length===0){ih='<div class="queue-empty">Queue is empty. Add some songs!</div>';}
  else{ih=upNext.map(function(q,i){
    var cs=q.singer_configs||[];
    var cat=S.catalog.find(function(c){return c.track_id===q.track_id;});
    var roles=cat&&cat.roles?cat.roles:[];
    var hidden=!!q.is_hidden;
    var isLocked=!!q.locked&&i===0;
    var total=(q.score||0)+(q.bonus_points||0);
    var voted=votedMap[q.id];
    // Is this guest one of the singers on this track? No self-voting. Match by
    // stable guestId (immune to profile-name edits) with a legacy name fallback.
    var inSong=false;
    var gn=(S.guestName||"").toLowerCase();
    for(var ssi=0;ssi<cs.length;ssi++){
      var sc2=cs[ssi]||{};
      if((sc2.guestId&&sc2.guestId===S.guestId)||(gn&&((sc2.name||"").toLowerCase()===gn))){inSong=true;break;}
    }
    var singerPills="";
    if(cs.length>0){
      singerPills='<div class="queue-singer-pills">'+cs.map(function(raw){
        // Resolve the singer's LIVE name + avatar from the canonical guest.
        var s=resolveSingerConfig(raw);
        var rn=[];
        if(!hidden&&s.roleIndices&&roles.length>0){s.roleIndices.forEach(function(ri){if(roles[ri])rn.push(roles[ri]);});}
        var dotContent=s.profilePicture?'<img src="'+s.profilePicture+'" alt="">':esc((s.name||"?").charAt(0).toUpperCase());
        return '<div class="queue-singer-pill"><div class="queue-singer-dot" style="background:'+s.color+'">'+dotContent+'</div>'+esc(s.name||"Singer")+(rn.length>0?'<span class="queue-singer-role"> \u00B7 '+esc(rn.join(", "))+'</span>':"")+'</div>';
      }).join("")+'</div>';
    }
    // The guest who added a row gets an edit button instead of voting controls.
    // Locked top-of-queue is exempt — its config is effectively committed.
    var isMine=!isLocked&&!!S.guestId&&q.added_by_guest_id===S.guestId;
    var classes='queue-item'+(hidden?' queue-item--hidden':'')+(isLocked?' queue-item--locked':'');
    var artOrIcon=hidden
      ? '<div class="q-hidden-art">'+hiddenArtInner()+'</div>'
      : (q.track_art_url?'<img src="'+q.track_art_url+'" alt="">':"");
    var titleHtml=hidden?hiddenLabel():esc(q.track_name);
    var artistHtml=hidden?hiddenSubtitle():esc(q.track_artist);
    var voteCol="";
    var scoreCls="queue-vote-score--"+(total>0?"pos":(total<0?"neg":"zero"));
    // Bare number \u2014 color (green/red) carries the sign. Suppress entirely when 0.
    var scoreLine=(total!==0)
      ? '<div class="queue-vote-score '+scoreCls+'">'+total+'</div>'
      : '';
    if(isLocked){
      voteCol=
        '<div class="queue-vote-col queue-vote-col--locked">'+
          '<div class="queue-lock-badge" title="Locked in \u2014 next to play">'+
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'+
            '<span class="queue-lock-label">Next Up<br>Locked</span>'+
          '</div>'+
        '</div>';
    }else if(isMine){
      // Pencil-edit button \u2014 opens the wizard pre-populated with this row's
      // singers / theme / hidden flag. Score (still being voted by others) is
      // shown above when non-zero so the owner can watch reactions.
      voteCol=
        '<div class="queue-vote-col">'+
          scoreLine+
          '<button type="button" class="queue-edit-btn" data-q-edit="'+esc(q.id)+'" aria-label="Edit song" title="Edit this song">'+
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'+
          '</button>'+
        '</div>';
    }else if(inSong){
      // No vote controls on your own track \u2014 and no chrome either.
      // Show the live score only if it's non-zero; otherwise render nothing.
      voteCol = scoreLine
        ? '<div class="queue-vote-col">'+scoreLine+'</div>'
        : '';
    }else if(voted){
      voteCol=
        '<div class="queue-vote-col">'+
          scoreLine+
          '<div class="queue-voted-pill">'+
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
            '<span>Voted '+(voted>0?"Up":"Down")+'</span>'+
          '</div>'+
        '</div>';
    }else{
      voteCol=
        '<div class="queue-vote-col'+(total===0?" queue-vote-col--no-score":"")+'">'+
          scoreLine+
          '<div class="queue-vote-buttons">'+
            '<button type="button" class="queue-vote-btn queue-vote-btn--up" data-q-vote-up="'+esc(q.id)+'" aria-label="Upvote">'+
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>'+
            '</button>'+
            '<button type="button" class="queue-vote-btn queue-vote-btn--down" data-q-vote-down="'+esc(q.id)+'" aria-label="Downvote">'+
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'+
            '</button>'+
          '</div>'+
        '</div>';
    }
    return '<div class="'+classes+'" data-q-id="'+esc(q.id)+'">'+
      '<div class="queue-pos">'+(i+1)+'</div>'+
      artOrIcon+
      '<div class="queue-item-info"><div class="queue-item-title">'+titleHtml+'</div><div class="queue-item-artist">'+artistHtml+'</div>'+
      (q.added_by_name?'<div class="queue-item-added">Added by '+esc(q.added_by_name)+'</div>':"")+
      singerPills+
      '</div>'+
      voteCol+
    '</div>';
  }).join("");}
  return '<div class="queue-screen screen"><div class="queue-title">Queue</div>'+npH+
    '<div class="queue-section-label">Up Next \u00B7 '+upNext.length+' song'+(upNext.length!==1?"s":"")+'</div>'+ih+'</div>';
}
