import { S, AWARDS_FALLBACK_SVG, AWARDS_ICON_PAGE_SIZE } from '../state.js?v=20260524e';
import { esc, avatarHTML } from '../utils.js?v=20260524e';

// ============================================================
//  AWARDS — companion-site implementation
// ============================================================

// ---- Iconify lookup (from awards-icons/manifest.js)
// AWARDS_ICONS         - all 7000+ icons (metadata only: id, label, category, prefix, featured)
// AWARDS_FEATURED_SVGS - inlined SVG for ~30 curated icons (instant render)
// Non-featured icons are rendered via mask-image, lazy-loaded as needed.
export function awardsIconById(id){
  if(!id)return null;
  var list=window.AWARDS_ICONS||[];
  for(var i=0;i<list.length;i++){if(list[i].id===id)return list[i];}
  return null;
}
export function awardsIconCdnUrl(id){
  if(!id)return null;
  var i=id.indexOf("__");
  if(i<0)return null;
  return "https://api.iconify.design/"+id.slice(0,i)+"/"+id.slice(i+2)+".svg";
}
export function awardsIconBody(award){
  if(award.icon_data_url||award.iconDataUrl){
    return '<img src="'+esc(award.icon_data_url||award.iconDataUrl)+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
  }
  var iconId=award.icon_id||award.iconId;
  if(!iconId)return AWARDS_FALLBACK_SVG;
  var inlined=(window.AWARDS_FEATURED_SVGS||{})[iconId];
  if(inlined)return inlined;
  var url=awardsIconCdnUrl(iconId);
  if(!url)return AWARDS_FALLBACK_SVG;
  return '<span class="awards-icon-mask" style="width:100%;height:100%;-webkit-mask-image:url('+esc(url)+');mask-image:url('+esc(url)+')"></span>';
}
export function awardsIconHtmlFor(award){ return awardsIconBody(award); }
export function awardsPickerThumb(ic){
  var inlined=(window.AWARDS_FEATURED_SVGS||{})[ic.id];
  if(inlined)return inlined;
  var url=awardsIconCdnUrl(ic.id);
  if(!url)return AWARDS_FALLBACK_SVG;
  return '<span class="awards-icon-mask" style="width:100%;height:100%;-webkit-mask-image:url('+esc(url)+');mask-image:url('+esc(url)+')"></span>';
}
export function awardsFilteredIcons(searchQ){
  // Use the shuffled view if present (populated on each Create-page visit) so
  // every guest sees a fresh, randomized browse order. Same Schwartzian
  // shuffle pattern used by the song catalog load.
  var list=(S.awardIconShuffled&&S.awardIconShuffled.length)?S.awardIconShuffled:(window.AWARDS_ICONS||[]);
  var q=(searchQ||"").trim().toLowerCase();
  if(!q)return list.slice();
  var out=[];
  for(var i=0;i<list.length;i++){
    var ic=list[i];
    if(ic.label.toLowerCase().indexOf(q)===-1&&ic.id.toLowerCase().indexOf(q)===-1)continue;
    out.push(ic);
  }
  return out;
}
export function shuffleAwardIcons(){
  var src=window.AWARDS_ICONS||[];
  S.awardIconShuffled=src.map(function(v){return{v:v,s:Math.random()};}).sort(function(a,b){return a.s-b.s;}).map(function(o){return o.v;});
}
export function buildAwardCandidates(award){
  if(award.subject_type==="performance"){
    return S.awardsHistory.map(function(p){
      return {
        key:p.queueRowId,type:"performance",
        label:p.trackName,
        subtitle:(p.singers&&p.singers.length?p.singers.map(function(s){return s.name;}).join(", "):p.trackArtist),
        avatar:p.trackArtUrl,
        singers:p.singers||[],
        bannedNames:(p.singers||[]).map(function(s){return s.name;}),
        bannedIds:(p.singers||[]).map(function(s){return s.guestId||"";}).filter(Boolean)
      };
    });
  }
  if(award.subject_type==="group"){
    return S.awardsHistory.filter(function(p){return (p.singers||[]).length>=2;}).map(function(p){
      return {
        key:p.queueRowId,type:"group",
        label:(p.singers||[]).map(function(s){return s.name;}).join(" & "),
        subtitle:p.trackName+" — "+p.trackArtist,
        avatar:p.trackArtUrl,
        singers:p.singers||[],
        bannedNames:(p.singers||[]).map(function(s){return s.name;}),
        bannedIds:(p.singers||[]).map(function(s){return s.guestId||"";}).filter(Boolean)
      };
    });
  }
  // singer
  var sangNames={},sangIds={};
  S.awardsHistory.forEach(function(p){
    (p.singers||[]).forEach(function(s){
      if(s.name)sangNames[s.name]=true;
      if(s.guestId)sangIds[s.guestId]=true;
    });
  });
  var out=[];
  S.awardsGuestsCache.forEach(function(g){
    if(sangIds[g.id]||sangNames[g.name]){
      out.push({
        key:g.id,type:"singer",label:g.name,subtitle:"Performer",avatar:g.profilePicture||null,
        bannedNames:[g.name],bannedIds:[g.id]
      });
    }
  });
  // Note: name-only performers (no companion guest record) are intentionally
  // omitted. The DB constraint on karaoke_award_votes requires either a guest
  // or queue-row reference, so a name-only entry has nowhere to be recorded.
  return out;
}
export function awardCandidateBanned(c){
  if(!S.guestId&&!S.guestName)return false;
  if(c.bannedIds&&c.bannedIds.indexOf(S.guestId)!==-1)return true;
  if(c.bannedNames&&c.bannedNames.indexOf(S.guestName)!==-1)return true;
  return false;
}
export function awardOwnVote(awardId){return S.awardVotes[awardId]||null;}
export function matchCandidateByVote(award,vote,candidates){
  if(!vote)return null;
  var key=award.subject_type==="singer"?vote.subject_guest_id:vote.subject_queue_row_id;
  for(var i=0;i<candidates.length;i++){
    if(candidates[i].key===key)return candidates[i];
    if(award.subject_type==="singer"&&candidates[i].key==="name:"+key)return candidates[i];
  }
  return null;
}
export function renderAwardsScreen(){
  if(S.awardScreen==="detail"&&S.awardActiveId){
    var aw=null;for(var i=0;i<S.awards.length;i++)if(S.awards[i].id===S.awardActiveId){aw=S.awards[i];break;}
    if(aw)return renderAwardDetail(aw);
  }
  if(S.awardScreen==="create"||S.awardScreen==="edit")return renderAwardCreateScreen();
  return renderAwardsList();
}
export function renderAwardsList(){
  var html='<div class="awards-screen screen">'+
    '<div class="awards-screen-header">'+
      '<div class="awards-screen-header-text">'+
        '<div class="awards-title">Awards</div>'+
        '<div class="awards-sub">Vote anytime. Winners are revealed when the night ends.</div>'+
      '</div>'+
    '</div>';
  var hasOwn=false;var ownAward=null;
  for(var i=0;i<S.awards.length;i++){if(S.awards[i].created_by_guest_id===S.guestId){hasOwn=true;ownAward=S.awards[i];break;}}
  var ctaIcon=hasOwn
    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>'
    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  html+='<button class="awards-create-cta'+(hasOwn?" awards-create-cta--owned":"")+'" id="awards-create-btn">'+
    ctaIcon +
    (hasOwn?"Edit your award: "+esc(ownAward.title):"Create Custom Award")+'</button>';
  html+='<div class="awards-grid">';
  if(S.awards.length===0){
    html+='</div><div class="awards-empty-state">No awards yet. Default awards appear when the host opens the session.</div>';
  }else{
    for(var j=0;j<S.awards.length;j++){
      var aw=S.awards[j];
      var voted=!!awardOwnVote(aw.id);
      var finalized=!!aw.finalized_at;
      var subjectLabel=aw.subject_type==="performance"?"Performance":aw.subject_type==="singer"?"Singer":"Duo / Group";
      var iconHtml='<div class="awards-card__icon"><span class="awards-card__icon-shape">'+awardsIconBody(aw)+'</span></div>';
      var badge=finalized?'<div class="awards-card__finalized-badge">Closed</div>':(voted?'<div class="awards-card__voted-badge">Voted</div>':"");
      var cls="awards-card"+(voted?" awards-card--voted":"")+(finalized?" awards-card--finalized":"");
      html+='<button class="'+cls+'" data-award-id="'+esc(aw.id)+'">'+
        badge+iconHtml+
        '<div class="awards-card__title">'+esc(aw.title)+'</div>'+
        '<div class="awards-card__sub">'+subjectLabel+'</div>'+
      '</button>';
    }
    html+='</div>';
  }
  html+='</div>';
  return html;
}
export function renderAwardDetail(aw){
  var candidates=buildAwardCandidates(aw);
  var vote=awardOwnVote(aw.id);
  var voted=matchCandidateByVote(aw,vote,candidates);
  var subjectLabel=aw.subject_type==="performance"?"Pick the best performance":aw.subject_type==="singer"?"Pick a singer":"Pick the best duo or group";
  var finalized=!!aw.finalized_at;
  var html='<div class="awards-screen screen">'+
    '<div class="awards-detail-header">'+
      '<button class="awards-detail-back" id="awards-back-btn"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>'+
      '<div class="awards-detail-icon">'+awardsIconHtmlFor(aw)+'</div>'+
      '<div class="awards-detail-info">'+
        '<h2>'+esc(aw.title)+'</h2>'+
        '<p>'+esc(subjectLabel)+(aw.is_default?" · Default award":" · Custom award")+(finalized?" · Voting closed":"")+'</p>'+
      '</div>'+
    '</div>';
  if(voted){
    html+='<div class="awards-section-label">Your Vote</div>'+
      '<div class="awards-your-vote-card">'+
        renderCandidateAvatarBlock(voted)+
        '<div class="awards-candidate__info">'+
          '<div class="awards-candidate__label">'+esc(voted.label)+'</div>'+
          (voted.subtitle?'<div class="awards-candidate__sub">'+esc(voted.subtitle)+'</div>':"")+
        '</div>'+
        (finalized?"":'<div class="awards-candidate__hint">Tap below to change</div>')+
      '</div>';
  }
  if(candidates.length===0){
    var emptyMsg=aw.subject_type==="singer"?"No singers yet — once someone takes the mic they'll appear here.":aw.subject_type==="group"?"No multi-singer performances yet.":"No performances yet — check back after a song plays.";
    html+='<div class="awards-empty-state">'+esc(emptyMsg)+'</div>';
  }else{
    html+='<div class="awards-section-label">'+(voted?"Other candidates":"Candidates")+'</div>';
    for(var i=0;i<candidates.length;i++){
      var c=candidates[i];
      if(voted&&c.key===voted.key)continue;
      var banned=awardCandidateBanned(c);
      var disabled=finalized||banned;
      var hint=finalized?'Voting closed':(banned?"Can't vote for yourself":"Tap to vote");
      html+='<button class="awards-candidate'+(disabled?" awards-candidate--disabled":"")+'" data-candidate-key="'+esc(c.key)+'"'+(disabled?' disabled':"")+'>'+
        renderCandidateAvatarBlock(c)+
        '<div class="awards-candidate__info">'+
          '<div class="awards-candidate__label">'+esc(c.label)+'</div>'+
          (c.subtitle?'<div class="awards-candidate__sub">'+esc(c.subtitle)+'</div>':"")+
        '</div>'+
        '<div class="awards-candidate__hint">'+esc(hint)+'</div>'+
      '</button>';
    }
  }
  html+='</div>';
  return html;
}
export function renderCandidateAvatarBlock(c){
  // Album art (performance / group) renders as a square; singer profile pics stay round.
  var sq=(c.type==="performance"||c.type==="group")?" awards-candidate__avatar--square":"";
  if(c.avatar){
    return '<div class="awards-candidate__avatar'+sq+'"><img src="'+esc(c.avatar)+'" alt=""></div>';
  }
  return '<div class="awards-candidate__avatar'+sq+'">'+esc((c.label||"?").charAt(0).toUpperCase())+'</div>';
}
export function renderAwardCreateScreen(){
  var draft=S.awardCreateDraft||{title:"",subjectType:"performance",iconId:null,iconDataUrl:null};
  var isEdit=S.awardScreen==="edit"&&!!S.awardEditingId;
  var searchQ=S.awardIconSearch||"";
  var filtered=awardsFilteredIcons(searchQ);
  // Infinite-scroll: keep growing `awardIconVisibleCount` as the user scrolls.
  // 0 means "first paint" — show the initial batch. Clamp to filtered length
  // so a stale count from a previous (larger) filter doesn't overshoot.
  var visibleCount=S.awardIconVisibleCount||AWARDS_ICON_PAGE_SIZE;
  if(visibleCount>filtered.length)visibleCount=filtered.length;
  if(visibleCount<AWARDS_ICON_PAGE_SIZE)visibleCount=Math.min(AWARDS_ICON_PAGE_SIZE,filtered.length);
  var pageIcons=filtered.slice(0,visibleCount);
  var hasMore=visibleCount<filtered.length;
  // visualMode is the source of truth for which UI to show. Fall back to
  // iconDataUrl presence for backwards-compat with legacy drafts.
  var usingPhoto=draft.visualMode?draft.visualMode==="photo":!!draft.iconDataUrl;
  var html='<div class="awards-create-shell screen">'+
    '<div class="awards-detail-header">'+
      '<button class="awards-detail-back" id="awards-back-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>'+
      '<div class="awards-detail-info">'+
        '<h2>'+(isEdit?"Edit your award":"Create an award")+'</h2>'+
        '<p>Make it memorable — everyone can vote on it</p>'+
      '</div>'+
    '</div>'+

    '<div class="awards-field">'+
      '<div class="awards-field-label">Award name</div>'+
      '<input class="awards-text-input" id="awards-name-input" maxlength="40" placeholder="e.g. Most Dramatic Solo" value="'+esc(draft.title||"")+'">'+
    '</div>'+

    '<div class="awards-field">'+
      '<div class="awards-segmented">'+
        '<button data-subject="performance"'+(draft.subjectType==="performance"?' class="active"':"")+'>A performance</button>'+
        '<button data-subject="singer"'+(draft.subjectType==="singer"?' class="active"':"")+'>A singer</button>'+
        '<button data-subject="group"'+(draft.subjectType==="group"?' class="active"':"")+'>A duo/group</button>'+
      '</div>'+
    '</div>'+

    '<div class="awards-field awards-field--visual">'+
      '<div class="awards-visual-toggle">'+
        '<button data-visual="icon"'+(usingPhoto?"":' class="active"')+'>Pick an icon</button>'+
        '<span class="awards-or">OR</span>'+
        '<button data-visual="photo"'+(usingPhoto?' class="active"':"")+'>Upload a photo</button>'+
      '</div>';
  if(usingPhoto){
    html+='<label class="awards-photo-upload" id="awards-photo-upload">'+
      (draft.iconDataUrl?'<img src="'+esc(draft.iconDataUrl)+'" alt="">':'<svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>')+
      '<span>'+(draft.iconDataUrl?"Tap to change":"Tap to upload a photo")+'</span>'+
      '<input type="file" id="awards-photo-input" accept="image/*" style="position:absolute;opacity:0;width:0;height:0;pointer-events:none">'+
    '</label>';
  }else{
    html+='<input class="awards-picker-search" id="awards-search-input" placeholder="Search '+(window.AWARDS_ICONS||[]).length+' icons…" value="'+esc(searchQ)+'">';
    html+='<div class="awards-icon-grid" id="awards-icon-grid">';
    if(pageIcons.length===0){
      html+='<div style="grid-column:1/-1;padding:24px;text-align:center;color:var(--white-faint);font-size:13px">No icons match. Try a different word.</div>';
    } else {
      for(var i=0;i<pageIcons.length;i++){
        var ic=pageIcons[i];
        html+='<button data-icon-id="'+esc(ic.id)+'"'+(draft.iconId===ic.id?' class="active"':"")+' title="'+esc(ic.label)+'">'+awardsPickerThumb(ic)+'</button>';
      }
      if(hasMore){
        // Sentinel observed by IntersectionObserver — when it scrolls into
        // view, the events layer appends the next batch and updates this
        // element. Removed once we've shown every match.
        html+='<div id="awards-icon-sentinel" style="grid-column:1/-1;padding:18px 12px;font-size:12px;text-align:center;color:var(--white-faint)">Loading more icons…</div>';
      }
    }
    html+='</div>';
  }
  html+='</div>'+
    '<div class="awards-submit-row">';
  if(isEdit){
    html+='<button class="awards-btn awards-btn--danger" id="awards-delete-btn">Delete</button>';
  }
  html+='<button class="awards-btn" id="awards-cancel-btn">Cancel</button>'+
    '<button class="awards-btn awards-btn--primary" id="awards-submit-btn">'+(isEdit?"Save":"Create Award")+'</button>'+
    '</div>'+
  '</div>';
  return html;
}
export function renderVoteConfirmOverlay(){
  if(!S.awardVoteConfirm)return"";
  var c=S.awardVoteConfirm;
  return '<div class="vote-confirm-backdrop" id="vote-confirm-backdrop">'+
    '<div class="vote-confirm-card">'+
      '<div class="vote-confirm-title">Change your vote?</div>'+
      '<div class="vote-confirm-sub">You already picked <strong>'+esc(c.oldLabel)+'</strong>. Switch to <strong>'+esc(c.newLabel)+'</strong>?</div>'+
      '<div class="vote-confirm-actions">'+
        '<button class="vote-confirm-btn vote-confirm-btn-ghost" id="vote-confirm-cancel">Keep my vote</button>'+
        '<button class="vote-confirm-btn vote-confirm-btn-yes" id="vote-confirm-yes">Switch</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}
export function renderRevealOverlay(){
  var step=S.awardsRevealStep;if(!step)return"";
  var inner="";
  if(step.phase==="opening"){
    inner='<div class="awards-reveal__opening">'+
      '<div class="awards-reveal__opening-title">Tonight\'s Awards</div>'+
      '<div class="awards-reveal__opening-sub">'+step.totalAwards+' categor'+(step.totalAwards===1?"y":"ies")+' to reveal</div>'+
    '</div>';
  } else if(step.phase==="nominees"&&step.award){
    var isPerf=step.award.subject_type==="performance"||step.award.subject_type==="group";
    var allCands=step.candidates||[];
    var maxCount=isPerf?5:8;
    var cands=allCands.slice(0,maxCount);
    var nomList="";
    if(isPerf){
      // Rich rows: album art + track name + singer profile pics + names
      for(var i=0;i<cands.length;i++){
        var c=cands[i];
        var initial=esc((c.label||"?").charAt(0).toUpperCase());
        var art=c.avatarUrl
          ? '<img class="awards-reveal__nominee-art" src="'+esc(c.avatarUrl)+'" alt="">'
          : '<div class="awards-reveal__nominee-art" style="display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:22px">'+initial+'</div>';
        var singers=c.singers||[];
        var singerAvatars="";
        var visibleSingers=singers.slice(0,4);
        for(var si=0;si<visibleSingers.length;si++){
          var s=visibleSingers[si];
          var bg=s.color?'background:linear-gradient(135deg,'+s.color+','+s.color+'aa)':"";
          singerAvatars+='<div class="awards-reveal__nominee-singer-avatar" style="'+bg+'">'+
            (s.profilePicture?'<img src="'+esc(s.profilePicture)+'" alt="">':esc((s.name||"?").charAt(0).toUpperCase()))+
          '</div>';
        }
        var singerLine=singers.length
          ? '<div class="awards-reveal__nominee-singers"><div class="awards-reveal__nominee-singers-avatars">'+singerAvatars+'</div><div class="awards-reveal__nominee-singer-names">'+esc(singers.map(function(x){return x.name;}).join(", "))+'</div></div>'
          : "";
        nomList+='<div class="awards-reveal__nominee--rich" style="animation-delay:'+(i*0.1)+'s">'+
          art+
          '<div class="awards-reveal__nominee-meta">'+
            '<div class="awards-reveal__nominee-track">'+esc(c.label)+'</div>'+
            singerLine+
          '</div>'+
        '</div>';
      }
      if(allCands.length>maxCount)nomList+='<div class="awards-reveal__nominee">+'+(allCands.length-maxCount)+' more</div>';
    } else {
      for(var i=0;i<cands.length;i++){
        var c=cands[i];
        var av=c.avatarUrl?'<img src="'+esc(c.avatarUrl)+'" alt="">':'<div class="awards-reveal__nominee-avatar">'+esc((c.label||"?").charAt(0).toUpperCase())+'</div>';
        nomList+='<div class="awards-reveal__nominee" style="animation-delay:'+(i*0.08)+'s">'+av+'<span>'+esc(c.label)+'</span></div>';
      }
      if(allCands.length>maxCount)nomList+='<div class="awards-reveal__nominee">+'+(allCands.length-maxCount)+' more</div>';
    }
    var listCls=isPerf?"awards-reveal__nominees-list awards-reveal__nominees-list--rich":"awards-reveal__nominees-list";
    inner='<div class="awards-reveal__nominees">'+
      '<div class="awards-reveal__award-icon">'+awardsIconBody(step.award)+'</div>'+
      '<div><div class="awards-reveal__nominees-label">Award '+(step.awardIndex+1)+' of '+step.totalAwards+'</div>'+
      '<div class="awards-reveal__award-title">'+esc(step.award.title)+'</div></div>'+
      (cands.length?'<div class="awards-reveal__nominees-label">Nominees</div><div class="'+listCls+'">'+nomList+'</div>':'<div class="awards-reveal__nominees-label" style="opacity:0.6">No candidates</div>')+
    '</div>';
  } else if(step.phase==="drumroll"&&step.award){
    inner='<div class="awards-reveal__drumroll">'+
      '<div class="awards-reveal__award-icon">'+awardsIconHtmlFor(step.award)+'</div>'+
      '<div class="awards-reveal__award-title">'+esc(step.award.title)+'</div>'+
      '<div class="awards-reveal__drumroll-text">And the winner is…</div>'+
      '<div class="awards-reveal__drumroll-dots"><span></span><span></span><span></span><span></span><span></span></div>'+
    '</div>';
  } else if(step.phase==="winner"&&step.award){
    var winners=step.winners||[];
    var awardCrest='<div class="awards-reveal__winner-crest">'+awardsIconBody(step.award)+'</div>';
    if(winners.length===0){
      inner='<div class="awards-reveal__winner">'+
        awardCrest+
        '<div class="awards-reveal__winner-label">Award · '+esc(step.award.title)+'</div>'+
        '<div class="awards-reveal__winner-card">'+
          '<div class="awards-reveal__winner-name" style="font-size:clamp(28px,4vw,52px)">No winner this round</div>'+
          '<div class="awards-reveal__winner-sub">No votes were cast</div>'+
        '</div>'+
      '</div>';
    } else {
      var avHtml="";
      winners.forEach(function(w){
        if(w.singers&&w.singers.length>1){
          w.singers.forEach(function(s){
            avHtml+='<div class="awards-reveal__winner-avatar">'+(s.profilePicture?'<img src="'+esc(s.profilePicture)+'" style="width:100%;height:100%;object-fit:cover">':esc((s.name||"?").charAt(0).toUpperCase()))+'</div>';
          });
        } else {
          avHtml+=w.avatarUrl?'<img class="awards-reveal__winner-avatar" src="'+esc(w.avatarUrl)+'" alt="">':'<div class="awards-reveal__winner-avatar">'+esc((w.label||"?").charAt(0).toUpperCase())+'</div>';
        }
      });
      var names=winners.length===1?esc(winners[0].label):winners.map(function(w){return esc(w.label);}).join(" · ");
      var sub=winners.length===1&&winners[0].subtitle?'<div class="awards-reveal__winner-sub">'+esc(winners[0].subtitle)+'</div>':"";
      if(winners.length>1){
        sub='<div class="awards-reveal__winner-sub">Tied with '+(step.voteCount||0)+' vote'+((step.voteCount||0)===1?"":"s")+' each</div>';
      }
      var votes=winners.length===1?'<div class="awards-reveal__winner-votes">'+(step.voteCount||0)+' vote'+((step.voteCount||0)===1?"":"s")+'</div>':"";
      inner='<div class="awards-reveal__winner">'+
        awardCrest+
        '<div class="awards-reveal__winner-label">Winner · '+esc(step.award.title)+'</div>'+
        '<div class="awards-reveal__winner-card">'+
          '<div class="awards-reveal__winner-avatars">'+avHtml+'</div>'+
          '<div class="awards-reveal__winner-name">'+names+'</div>'+sub+votes+
        '</div>'+
      '</div>';
      // Confetti
      var conf='<div class="awards-reveal__confetti">';
      var colors=["#fde68a","#f59e0b","#ec4899","#a78bfa","#22d3ee","#34d399"];
      for(var ci=0;ci<60;ci++){
        var left=(Math.random()*100).toFixed(1);
        var col=colors[ci%colors.length];
        var dur=(2.5+Math.random()*2).toFixed(2);
        var dl=(Math.random()*1.5).toFixed(2);
        var rot=Math.floor(Math.random()*360);
        conf+='<span style="left:'+left+'%;background:'+col+';animation-duration:'+dur+'s;animation-delay:'+dl+'s;transform:rotateZ('+rot+'deg)"></span>';
      }
      conf+='</div>';
      inner=conf+inner;
    }
  } else if(step.phase==="finale"){
    var summary=step.finaleSummary||[];
    var cards="";
    for(var fi=0;fi<summary.length;fi++){
      var s2=summary[fi];
      var wlabel=s2.winners&&s2.winners.length?s2.winners.map(function(w){return esc(w.label);}).join(" · "):"No winner";
      var wsub=s2.winners&&s2.winners.length===1&&s2.winners[0].subtitle?'<div class="awards-reveal__finale-card-sub">'+esc(s2.winners[0].subtitle)+'</div>':"";
      cards+='<div class="awards-reveal__finale-card">'+
        '<div class="awards-reveal__finale-card-icon">'+awardsIconHtmlFor(s2.award)+'</div>'+
        '<div class="awards-reveal__finale-card-title">'+esc(s2.award.title)+'</div>'+
        '<div class="awards-reveal__finale-card-winner">'+wlabel+'</div>'+wsub+
      '</div>';
    }
    inner='<div class="awards-reveal__finale">'+
      '<div class="awards-reveal__finale-title">That\'s a Wrap!</div>'+
      '<div class="awards-reveal__finale-grid">'+cards+'</div>'+
    '</div>';
  }
  return '<div class="awards-reveal awards-reveal-companion"><div class="awards-reveal__spotlight"></div>'+inner+'</div>';
}
