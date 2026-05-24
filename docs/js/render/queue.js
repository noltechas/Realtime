import { S, caches } from '../state.js?v=20260524e';
import { esc, avatarHTML, fmtD } from '../utils.js?v=20260524e';
import { loadVotedMap } from '../persistence.js?v=20260524e';

export function hiddenLabel(t){
  if(t==="cyberpunk")return"[REDACTED]";
  if(t==="sketch")return"shhh\u2026";
  if(t==="urban")return"UNKNOWN";
  if(t==="deep-sea")return"Lost in the deep";
  if(t==="psychedelic")return"Mystery Jam";
  if(t==="zen")return"\u79D8";
  if(t==="space")return"UNKNOWN SIGNAL";
  if(t==="steampunk")return"Classified";
  if(t==="retrowave")return"NO SIGNAL";
  return"HIDDEN SONG";
}
export function hiddenSubtitle(t){
  if(t==="cyberpunk")return"// access denied";
  if(t==="sketch")return"it's a secret!";
  if(t==="urban")return"track redacted";
  if(t==="deep-sea")return"a song from the abyss";
  if(t==="psychedelic")return"guess the groove";
  if(t==="zen")return"concealed";
  if(t==="space")return"transmission encrypted";
  if(t==="steampunk")return"sealed by the archivist";
  if(t==="retrowave")return"track.dat \u2014 error 404";
  return"surprise pick!";
}
export function hiddenArtInner(t){
  if(t==="cyberpunk")return'<span class="qh-cyber">[??]</span>';
  if(t==="sketch")return'<svg class="qh-sketch" width="44" height="44" viewBox="0 0 44 44"><path d="M13 17 Q 13 10 22 10 Q 31 10 31 17 Q 31 22 22 25 L 22 30" stroke="#2d2d2d" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="22" cy="35" r="1.7" fill="#2d2d2d"/></svg>';
  if(t==="urban")return'<span class="qh-urban">??</span>';
  if(t==="deep-sea")return'<svg class="qh-ds" width="44" height="44" viewBox="0 0 44 44"><ellipse cx="22" cy="18" rx="10" ry="8" fill="rgba(0,255,200,0.15)" stroke="#00ffc8" stroke-width="1.2"/><path d="M15 24 q-1 4 -2 8 M19 26 q 0 4 -1 8 M22 26 q 0 4 0 8 M25 26 q 0 4 1 8 M29 24 q 1 4 2 8" stroke="#00ffc8" stroke-width="1" fill="none" opacity="0.8"/><text x="22" y="21" text-anchor="middle" font-size="10" font-weight="700" fill="#00ffc8">?</text></svg>';
  if(t==="psychedelic")return'<span class="qh-psy">?</span>';
  if(t==="zen")return'<span class="qh-zen">\u79D8</span>';
  if(t==="space")return'<span class="qh-space">???</span>';
  if(t==="steampunk")return'<svg class="qh-steam" width="44" height="44" viewBox="0 0 44 44"><rect x="13" y="20" width="18" height="16" rx="2" fill="#C8973E" stroke="#14110F" stroke-width="1.5"/><path d="M17 20 v-3 a5 5 0 0 1 10 0 v3" stroke="#C8973E" stroke-width="2" fill="none"/><circle cx="22" cy="28" r="1.6" fill="#14110F"/></svg>';
  if(t==="retrowave")return'<span class="qh-retro">NO<br>SIG</span>';
  return'<span class="qh-neo">?</span>';
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
    var rowTheme=q.stage_theme||"neo-brutal";
    var isLocked=!!q.locked&&i===0;
    var total=(q.score||0)+(q.bonus_points||0);
    var voted=votedMap[q.id];
    // Is this guest one of the singers on this track? No self-voting.
    var inSong=false;
    if(S.guestName){
      var gn=(S.guestName||"").toLowerCase();
      for(var ssi=0;ssi<cs.length;ssi++){
        if(((cs[ssi]&&cs[ssi].name)||"").toLowerCase()===gn){inSong=true;break;}
      }
    }
    var singerPills="";
    if(cs.length>0){
      singerPills='<div class="queue-singer-pills">'+cs.map(function(s){
        var rn=[];
        if(!hidden&&s.roleIndices&&roles.length>0){s.roleIndices.forEach(function(ri){if(roles[ri])rn.push(roles[ri]);});}
        var dotContent=s.profilePicture?'<img src="'+s.profilePicture+'" alt="">':esc((s.name||"?").charAt(0).toUpperCase());
        return '<div class="queue-singer-pill"><div class="queue-singer-dot" style="background:'+s.color+'">'+dotContent+'</div>'+esc(s.name||"Singer")+(rn.length>0?'<span class="queue-singer-role"> \u00B7 '+esc(rn.join(", "))+'</span>':"")+'</div>';
      }).join("")+'</div>';
    }
    var classes='queue-item'+(hidden?' queue-item--hidden':'')+(isLocked?' queue-item--locked':'');
    var artOrIcon=hidden
      ? '<div class="q-hidden-art">'+hiddenArtInner(rowTheme)+'</div>'
      : (q.track_art_url?'<img src="'+q.track_art_url+'" alt="">':"");
    var titleHtml=hidden?esc(hiddenLabel(rowTheme)):esc(q.track_name);
    var artistHtml=hidden?esc(hiddenSubtitle(rowTheme)):esc(q.track_artist);
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
    return '<div class="'+classes+'" data-q-id="'+esc(q.id)+'" data-stage-theme="'+esc(rowTheme)+'">'+
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
