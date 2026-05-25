import { S, AWARDS_ICON_PAGE_SIZE } from '../state.js';
import { resizeImage, esc } from '../utils.js';
import { render } from '../render/main.js';
import { shuffleAwardIcons, buildAwardCandidates, awardCandidateBanned, awardOwnVote, matchCandidateByVote, awardsFilteredIcons, awardsPickerThumb } from '../render/awards.js';
import { ensureAwardsManifest } from '../awards-manifest.js';
import { castAwardVote, createCustomAward, updateMyAward, deleteMyAward, loadAwards } from '../supabase.js';

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

export function bindAwardsEvents(){
  // Awards list
  var createBtn=document.getElementById("awards-create-btn");
  if(createBtn){
    createBtn.addEventListener("click",function(){
      var existing=null;for(var i=0;i<S.awards.length;i++)if(S.awards[i].created_by_guest_id===S.guestId){existing=S.awards[i];break;}
      if(existing){
        S.awardScreen="edit";S.awardEditingId=existing.id;
        S.awardCreateDraft={
          title:existing.title,subjectType:existing.subject_type,
          iconId:existing.icon_id||null,iconDataUrl:existing.icon_data_url||null,
          visualMode: existing.icon_data_url ? "photo" : "icon"
        };
      } else {
        S.awardScreen="create";S.awardEditingId=null;
        S.awardCreateDraft={title:"",subjectType:"performance",iconId:null,iconDataUrl:null,visualMode:"icon"};
      }
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
  document.querySelectorAll("[data-candidate-key]").forEach(function(btn){
    btn.addEventListener("click",function(){
      var key=btn.getAttribute("data-candidate-key");
      var award=null;for(var i=0;i<S.awards.length;i++)if(S.awards[i].id===S.awardActiveId){award=S.awards[i];break;}
      if(!award)return;
      var candidates=buildAwardCandidates(award);
      var chosen=null;for(var j=0;j<candidates.length;j++)if(candidates[j].key===key){chosen=candidates[j];break;}
      if(!chosen)return;
      if(awardCandidateBanned(chosen))return;
      if(award.finalized_at)return;
      var existingVote=awardOwnVote(award.id);
      var voted=matchCandidateByVote(award,existingVote,candidates);
      if(voted){
        // Show confirm modal
        S.awardVoteConfirm={awardId:award.id,newLabel:chosen.label,oldLabel:voted.label,subject:resolveSubjectFromCandidate(award,chosen)};
        render();
      } else {
        castAwardVote(award.id,resolveSubjectFromCandidate(award,chosen));
      }
    });
  });

  // Vote-confirm modal
  var vcb=document.getElementById("vote-confirm-backdrop");
  if(vcb){
    vcb.addEventListener("click",function(e){if(e.target===vcb){S.awardVoteConfirm=null;render();}});
  }
  var vcc=document.getElementById("vote-confirm-cancel");
  if(vcc)vcc.addEventListener("click",function(){S.awardVoteConfirm=null;render();});
  var vcy=document.getElementById("vote-confirm-yes");
  if(vcy)vcy.addEventListener("click",function(){
    var c=S.awardVoteConfirm;if(!c)return;
    S.awardVoteConfirm=null;
    castAwardVote(c.awardId,c.subject);
  });

  // Create / edit form
  var ni=document.getElementById("awards-name-input");
  if(ni)ni.addEventListener("input",function(){if(S.awardCreateDraft)S.awardCreateDraft.title=ni.value;});
  document.querySelectorAll("[data-subject]").forEach(function(b){
    b.addEventListener("click",function(){
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
  var cancelBtn=document.getElementById("awards-cancel-btn");
  if(cancelBtn)cancelBtn.addEventListener("click",function(){
    S.awardScreen="list";S.awardCreateDraft=null;S.awardEditingId=null;render();
  });
  var submitBtn=document.getElementById("awards-submit-btn");
  if(submitBtn)submitBtn.addEventListener("click",async function(){
    var d=S.awardCreateDraft;if(!d)return;
    var title=(d.title||"").trim();
    if(!title){alert("Give your award a name.");return;}
    if(!d.iconId&&!d.iconDataUrl){alert("Pick an icon or upload a photo.");return;}
    submitBtn.disabled=true;
    if(S.awardScreen==="edit"&&S.awardEditingId){
      await updateMyAward(S.awardEditingId,{title:title,iconId:d.iconId,iconDataUrl:d.iconDataUrl});
    } else {
      await createCustomAward({title:title,subjectType:d.subjectType,iconId:d.iconId,iconDataUrl:d.iconDataUrl});
    }
    S.awardScreen="list";S.awardCreateDraft=null;S.awardEditingId=null;
    await loadAwards();render();
  });
  var deleteBtn=document.getElementById("awards-delete-btn");
  if(deleteBtn)deleteBtn.addEventListener("click",async function(){
    if(!confirm("Delete this award?"))return;
    if(S.awardEditingId)await deleteMyAward(S.awardEditingId);
    S.awardScreen="list";S.awardCreateDraft=null;S.awardEditingId=null;
    await loadAwards();render();
  });
}
