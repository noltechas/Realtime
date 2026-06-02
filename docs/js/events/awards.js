import { S, AWARDS_ICON_PAGE_SIZE, AWARDS_AWARDED_TO_PREFIX, AWARDS_DESCRIPTION_MAX } from '../state.js';
import { resizeImage, esc } from '../utils.js';
import { render } from '../render/main.js';
import { shuffleAwardIcons, buildAwardCandidates, awardCandidateBanned, awardBallot, matchBallot, awardsFilteredIcons, awardsPickerThumb } from '../render/awards.js';
import { ensureAwardsManifest } from '../awards-manifest.js';
import { setAwardBallot, createCustomAward, updateMyAward, deleteMyAward, loadAwards, sendEncoreTally } from '../supabase.js';

// Mirror of descriptionMeetsMinimum() in mobile/AwardsScreen.tsx — strips the
// "Awarded to " prefix before measuring so leaving the typewritered text alone
// doesn't pass validation.
function descriptionMeetsMinimum(value){
  var v=value||"";
  var body=v.indexOf(AWARDS_AWARDED_TO_PREFIX)===0?v.slice(AWARDS_AWARDED_TO_PREFIX.length):v;
  return body.replace(/^\s+|\s+$/g,"").length>=3;
}

// Tracks the currently-running typewriter interval so we don't double-start
// on render() reentry or leak intervals if the user races back out of step 2.
var awardDescTypewriterInterval=null;
function stopDescriptionTypewriter(){
  if(awardDescTypewriterInterval){
    clearInterval(awardDescTypewriterInterval);
    awardDescTypewriterInterval=null;
  }
}
function maybeStartDescriptionTypewriter(){
  stopDescriptionTypewriter();
  if(S.awardCreateStep!==2)return;
  if(!S.awardCreateDraft)return;
  if(S.awardCreateDraft.description)return;
  var ta=document.getElementById("awards-desc-input");
  if(!ta)return;
  try{ta.focus();}catch(e){/* iOS Safari can refuse — non-fatal */}
  var text=AWARDS_AWARDED_TO_PREFIX;
  var i=0;
  // Initial delay lets the step body finish its CSS slide-in.
  setTimeout(function(){
    awardDescTypewriterInterval=setInterval(function(){
      // Cancel if the textarea has been unmounted (user navigated away).
      if(!document.body.contains(ta)){stopDescriptionTypewriter();return;}
      // Cancel if the user beat us to it and started typing — never overwrite.
      if(S.awardCreateDraft&&S.awardCreateDraft.description.length>text.length){
        stopDescriptionTypewriter();
        return;
      }
      if(i>=text.length){stopDescriptionTypewriter();return;}
      i+=1;
      if(S.awardCreateDraft)S.awardCreateDraft.description=text.slice(0,i);
      ta.value=text.slice(0,i);
      var c=document.getElementById("awards-desc-counter");
      if(c)c.textContent=ta.value.length+"/"+AWARDS_DESCRIPTION_MAX;
    },65);
  },280);
}

// Holds the most recent infinite-scroll sentinel observer for the icon
// picker, so we can disconnect it before binding a new one on re-render.
var awardIconSentinelObserver=null;
function loadMoreAwardIcons(){
  if(!S.awardCreateDraft)return;
  var grid=document.getElementById("awards-icon-grid");
  var sentinel=document.getElementById("awards-icon-sentinel");
  if(!grid||!sentinel)return;
  var filtered=awardsFilteredIcons(S.awardIconSearch||"");
  var have=S.awardIconVisibleCount||AWARDS_ICON_PAGE_SIZE;
  if(have>=filtered.length){
    sentinel.remove();
    if(awardIconSentinelObserver){awardIconSentinelObserver.disconnect();awardIconSentinelObserver=null;}
    return;
  }
  var nextBatch=filtered.slice(have,have+AWARDS_ICON_PAGE_SIZE);
  if(nextBatch.length===0)return;
  var draft=S.awardCreateDraft;
  var html="";
  for(var i=0;i<nextBatch.length;i++){
    var ic=nextBatch[i];
    html+='<button data-icon-id="'+esc(ic.id)+'"'+(draft.iconId===ic.id?' class="active"':"")+' title="'+esc(ic.label)+'">'+awardsPickerThumb(ic)+'</button>';
  }
  sentinel.insertAdjacentHTML("beforebegin",html);
  S.awardIconVisibleCount=have+nextBatch.length;
  if(S.awardIconVisibleCount>=filtered.length){
    sentinel.remove();
    if(awardIconSentinelObserver){awardIconSentinelObserver.disconnect();awardIconSentinelObserver=null;}
  }
}
function setupAwardIconSentinel(){
  if(awardIconSentinelObserver){awardIconSentinelObserver.disconnect();awardIconSentinelObserver=null;}
  var sentinel=document.getElementById("awards-icon-sentinel");
  if(!sentinel||!("IntersectionObserver" in window))return;
  awardIconSentinelObserver=new IntersectionObserver(function(entries){
    for(var i=0;i<entries.length;i++){
      if(entries[i].isIntersecting){loadMoreAwardIcons();}
    }
  },{rootMargin:"400px 0px"});
  awardIconSentinelObserver.observe(sentinel);
}
function bindAwardIconGrid(){
  // Event delegation so icon buttons appended later by loadMoreAwardIcons()
  // are covered without re-binding.
  var grid=document.getElementById("awards-icon-grid");
  if(grid && !grid.dataset.delegated){
    grid.dataset.delegated="1";
    grid.addEventListener("click",function(e){
      var btn=e.target.closest&&e.target.closest("[data-icon-id]");
      if(!btn||!grid.contains(btn))return;
      if(!S.awardCreateDraft)return;
      var id=btn.getAttribute("data-icon-id");
      S.awardCreateDraft.iconId=id;
      S.awardCreateDraft.iconDataUrl=null;
      // Toggle .active in place rather than re-rendering — a full render()
      // rebuilds #app, which destroys the grid and resets its scrollTop.
      var prev=grid.querySelector("button.active");
      if(prev&&prev!==btn)prev.classList.remove("active");
      btn.classList.add("active");
    });
  }
}

export function resolveSubjectFromCandidate(award,c){
  if(award.subject_type==="singer")return {guestId:c.key,queueRowId:null};
  return {guestId:null,queueRowId:c.key};
}

// The award currently open in the detail view.
function activeAward(){
  for(var i=0;i<S.awards.length;i++)if(S.awards[i].id===S.awardActiveId)return S.awards[i];
  return null;
}
// The voter's current picks (ordered candidates) for an award.
function currentSelected(award,candidates){
  return matchBallot(award,awardBallot(award.id),candidates).map(function(x){return x.candidate;});
}
// Persist a reordered ballot (ordered candidates; index 0 = 1st place).
function commitBallot(award,ordered){
  var picks=ordered.slice(0,3).map(function(c,i){
    var subj=resolveSubjectFromCandidate(award,c);
    return {rank:i+1,subjectGuestId:subj.guestId,subjectQueueRowId:subj.queueRowId};
  });
  setAwardBallot(award.id,picks);
}

export function bindAwardsEvents(){
  // Awards list
  var createBtn=document.getElementById("awards-create-btn");
  if(createBtn){
    createBtn.addEventListener("click",function(){
      var existing=null;for(var i=0;i<S.awards.length;i++)if(S.awards[i].created_by_guest_id===S.guestId){existing=S.awards[i];break;}
      if(existing){
        S.awardScreen="edit";S.awardEditingId=existing.id;
        S.awardCreateDraft={
          title:existing.title,
          description:existing.description||"",
          subjectType:existing.subject_type,
          iconId:existing.icon_id||null,iconDataUrl:existing.icon_data_url||null,
          visualMode: existing.icon_data_url ? "photo" : "icon"
        };
      } else {
        S.awardScreen="create";S.awardEditingId=null;
        S.awardCreateDraft={title:"",description:"",subjectType:"performance",iconId:null,iconDataUrl:null,visualMode:"icon"};
      }
      S.awardCreateStep=1;
      S.awardIconSearch="";S.awardIconVisibleCount=0;
      // Make sure the icon catalog is loaded before shuffleAwardIcons runs —
      // it reads window.AWARDS_ICONS. If it isn't here yet (user hasn't been
      // on Awards tab), inject the script now then render once it lands.
      ensureAwardsManifest().then(function(){shuffleAwardIcons();render();}).catch(function(e){console.warn('manifest load failed:',e);render();});
      render();
    });
  }
  document.querySelectorAll("[data-award-id]").forEach(function(btn){
    btn.addEventListener("click",function(){
      S.awardActiveId=btn.getAttribute("data-award-id");
      S.awardScreen="detail";
      render();
    });
  });

  // Detail
  var back=document.getElementById("awards-back-btn");
  if(back){
    back.addEventListener("click",function(){
      S.awardScreen="list";S.awardActiveId=null;S.awardCreateDraft=null;S.awardEditingId=null;
      render();
    });
  }
  // Ranked ballot — tapping a nominee adds it to the next open rank; tapping a
  // ranked nominee removes it. The whole ballot is replaced on each change.
  document.querySelectorAll("[data-candidate-key]").forEach(function(btn){
    btn.addEventListener("click",function(){
      var key=btn.getAttribute("data-candidate-key");
      var award=activeAward();
      if(!award||award.finalized_at)return;
      var candidates=buildAwardCandidates(award);
      var chosen=null;for(var j=0;j<candidates.length;j++)if(candidates[j].key===key){chosen=candidates[j];break;}
      if(!chosen||awardCandidateBanned(chosen))return;
      var selected=currentSelected(award,candidates);
      var pos=-1;for(var k=0;k<selected.length;k++)if(selected[k].key===chosen.key){pos=k;break;}
      if(pos>=0){
        selected.splice(pos,1);
      }else{
        if(selected.length>=3)return;
        selected.push(chosen);
      }
      commitBallot(award,selected);
    });
  });

  // Encore tap-vote — increment locally + in place (avoids a full re-render on
  // every tap), debounced-broadcast to the stage. The 1s reveal re-broadcast
  // reconciles the displayed counts.
  document.querySelectorAll("[data-encore-id]").forEach(function(btn){
    btn.addEventListener("click",function(){
      var id=btn.getAttribute("data-encore-id");
      if(!S.encoreCounts)S.encoreCounts={};
      S.encoreCounts[id]=(S.encoreCounts[id]||0)+1;
      var cEl=btn.querySelector(".awards-reveal__encore-tap-count");
      if(cEl)cEl.textContent=String(S.encoreCounts[id]);
      btn.classList.remove("is-tapped");void btn.offsetWidth;btn.classList.add("is-tapped");
      sendEncoreTally();
    });
  });

  // Ballot slot remove (×) buttons
  document.querySelectorAll("[data-remove-rank]").forEach(function(btn){
    btn.addEventListener("click",function(e){
      e.stopPropagation();
      var award=activeAward();
      if(!award||award.finalized_at)return;
      var rank=parseInt(btn.getAttribute("data-remove-rank"),10);
      var candidates=buildAwardCandidates(award);
      var selected=currentSelected(award,candidates);
      if(rank>=1&&rank<=selected.length){
        selected.splice(rank-1,1);
        commitBallot(award,selected);
      }
    });
  });

  // Create / edit form
  var ni=document.getElementById("awards-name-input");
  if(ni)ni.addEventListener("input",function(){if(S.awardCreateDraft)S.awardCreateDraft.title=ni.value;});

  // Description textarea — mutate state in place, never call render() on
  // input (would steal focus + cursor position from the user mid-type).
  // Counter updates as a side effect from the keystroke handler.
  var di=document.getElementById("awards-desc-input");
  if(di){
    di.addEventListener("input",function(){
      if(!S.awardCreateDraft)return;
      S.awardCreateDraft.description=di.value;
      // Stop the typewriter if the user starts editing manually.
      stopDescriptionTypewriter();
      var c=document.getElementById("awards-desc-counter");
      if(c)c.textContent=di.value.length+"/"+AWARDS_DESCRIPTION_MAX;
    });
  }

  document.querySelectorAll("[data-subject]").forEach(function(b){
    b.addEventListener("click",function(){
      if(b.disabled)return;
      if(S.awardCreateDraft){S.awardCreateDraft.subjectType=b.getAttribute("data-subject");render();}
    });
  });
  document.querySelectorAll("[data-visual]").forEach(function(b){
    b.addEventListener("click",function(){
      if(!S.awardCreateDraft)return;
      var v=b.getAttribute("data-visual");
      S.awardCreateDraft.visualMode=v;
      if(v==="icon"){S.awardCreateDraft.iconDataUrl=null;if(!S.awardCreateDraft.iconId)S.awardCreateDraft.iconId=(window.AWARDS_ICONS||[])[0]?(window.AWARDS_ICONS[0].id):null;}
      else {S.awardCreateDraft.iconId=null;}
      render();
      // After the upload area mounts, programmatically open the file picker
      // so the "Upload a photo" button feels actionable on one click.
      if(v==="photo"){
        setTimeout(function(){
          var pui=document.getElementById("awards-photo-input");
          if(pui)pui.click();
        },0);
      }
    });
  });
  var iconSearch=document.getElementById("awards-search-input");
  if(iconSearch){
    iconSearch.addEventListener("input",function(){
      S.awardIconSearch=iconSearch.value;
      S.awardIconVisibleCount=0;
      render();
      var s=document.getElementById("awards-search-input");
      if(s){s.focus();s.setSelectionRange(s.value.length,s.value.length);}
    });
  }
  bindAwardIconGrid();
  setupAwardIconSentinel();
  // Photo input: the native label > input pairing handles the click for us.
  // Don't add a JS click handler on the label — doing so double-fires the
  // picker on iOS Safari and cancels the first instance, which is why the
  // "I picked a photo but nothing happened" bug shows up.
  var pui=document.getElementById("awards-photo-input");
  if(pui){
    pui.addEventListener("change",function(){
      var file=pui.files&&pui.files[0];
      if(!file){console.warn("[Awards] photo input change with no file");return;}
      try{
        resizeImage(file,256,0.85,function(url){
          if(!url){console.warn("[Awards] resizeImage returned no data url");return;}
          if(S.awardCreateDraft){
            S.awardCreateDraft.iconDataUrl=url;
            S.awardCreateDraft.iconId=null;
            S.awardCreateDraft.visualMode="photo";
            render();
          }
        });
      }catch(e){console.error("[Awards] photo upload failed:",e);}
    });
  }
  // Wizard navigation. The header "back" arrow + footer "Cancel/Back" button
  // both share onStepBack semantics: step 1 exits, else decrement.
  function exitWizard(){
    stopDescriptionTypewriter();
    S.awardScreen="list";S.awardCreateDraft=null;S.awardEditingId=null;S.awardCreateStep=1;
    render();
  }
  function onStepBack(){
    if(!S.awardCreateStep||S.awardCreateStep<=1){exitWizard();return;}
    stopDescriptionTypewriter();
    S.awardCreateStep=S.awardCreateStep-1;
    render();
  }
  var wizBack=document.getElementById("awards-wizard-back");
  if(wizBack)wizBack.addEventListener("click",onStepBack);
  var wizCancel=document.getElementById("awards-wizard-cancel");
  if(wizCancel)wizCancel.addEventListener("click",onStepBack);

  var wizContinue=document.getElementById("awards-wizard-continue");
  if(wizContinue)wizContinue.addEventListener("click",async function(){
    var d=S.awardCreateDraft;if(!d)return;
    var step=S.awardCreateStep||1;
    // Per-step validation (mirrors descriptionMeetsMinimum() rules from the
    // mobile wizard — see plans/we-need-to-add-nested-curry.md §6).
    if(step===1){
      var title=(d.title||"").trim();
      if(title.length<2){alert("Give your award a name (2+ characters).");return;}
    }else if(step===2){
      if(!descriptionMeetsMinimum(d.description||"")){alert("Write a sentence describing what this honor recognizes.");return;}
    }else if(step===4){
      if(!d.iconId&&!d.iconDataUrl){alert("Pick an icon or upload a photo.");return;}
    }
    stopDescriptionTypewriter();
    if(step<4){
      S.awardCreateStep=step+1;
      render();
      return;
    }
    // Step 4 → submit
    wizContinue.disabled=true;
    var title2=(d.title||"").trim();
    var description=(d.description||"").trim();
    if(S.awardScreen==="edit"&&S.awardEditingId){
      await updateMyAward(S.awardEditingId,{title:title2,description:description,iconId:d.iconId,iconDataUrl:d.iconDataUrl});
    }else{
      await createCustomAward({title:title2,description:description,subjectType:d.subjectType,iconId:d.iconId,iconDataUrl:d.iconDataUrl});
    }
    exitWizard();
    await loadAwards();render();
  });

  var deleteBtn=document.getElementById("awards-delete-btn");
  if(deleteBtn)deleteBtn.addEventListener("click",async function(){
    if(!confirm("Delete this award?"))return;
    if(S.awardEditingId)await deleteMyAward(S.awardEditingId);
    exitWizard();
    await loadAwards();render();
  });

  // Kick off the step-2 typewriter when the screen has freshly mounted with
  // step=2 and a fresh draft. Safe to call every bind pass — it no-ops when
  // the description is already populated.
  maybeStartDescriptionTypewriter();
}
