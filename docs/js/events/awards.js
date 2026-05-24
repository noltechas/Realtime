import { S } from '../state.js';
import { resizeImage } from '../utils.js';
import { render } from '../render/main.js';
import { shuffleAwardIcons, buildAwardCandidates, awardCandidateBanned, awardOwnVote, matchCandidateByVote } from '../render/awards.js';
import { castAwardVote, createCustomAward, updateMyAward, deleteMyAward, loadAwards } from '../supabase.js';

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
      S.awardIconCategory="Featured";S.awardIconSearch="";S.awardIconPage=0;
      shuffleAwardIcons();
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
  document.querySelectorAll("[data-cat]").forEach(function(b){
    b.addEventListener("click",function(){S.awardIconCategory=b.getAttribute("data-cat");S.awardIconPage=0;render();});
  });
  var iconSearch=document.getElementById("awards-search-input");
  if(iconSearch){
    iconSearch.addEventListener("input",function(){
      S.awardIconSearch=iconSearch.value;
      S.awardIconPage=0;
      render();
      var s=document.getElementById("awards-search-input");
      if(s){s.focus();s.setSelectionRange(s.value.length,s.value.length);}
    });
  }
  document.querySelectorAll("[data-icon-id]").forEach(function(b){
    b.addEventListener("click",function(){
      if(!S.awardCreateDraft)return;
      S.awardCreateDraft.iconId=b.getAttribute("data-icon-id");
      S.awardCreateDraft.iconDataUrl=null;
      render();
    });
  });
  var prevBtn=document.getElementById("awards-page-prev");
  if(prevBtn)prevBtn.addEventListener("click",function(){S.awardIconPage=Math.max(0,(S.awardIconPage||0)-1);render();});
  var nextBtn=document.getElementById("awards-page-next");
  if(nextBtn)nextBtn.addEventListener("click",function(){S.awardIconPage=(S.awardIconPage||0)+1;render();});
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
