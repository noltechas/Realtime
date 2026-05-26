import { sb, S, caches } from '../state.js';
import { filterGifs, restoreMemeSearch, resizeImage } from '../utils.js';
import { clearDeviceProfile, saveDeviceProfile } from '../persistence.js';
import { initWizardFromTrack, initWizardFromQueueItem, addSinger, removeSinger, setSingerColor, wizardHasAnyChanges, wizardBack, nextWizardStep } from '../wizard.js';
import { castVote, sendReaction, joinSession, rejoinAsGuest, updateProfile, runRequestSearch, submitSongRequest, loadAwards, loadGuests, loadQueue } from '../supabase.js';
import { render } from '../render/main.js';
import { filterCatalog, renderGenreTabs, renderRequest, renderSongCards, songCardHtml, SONGS_BATCH_SIZE } from '../render/songs.js';
import { bindAwardsEvents } from './awards.js';
import { ensureAwardsManifest } from '../awards-manifest.js';
import { pickProfilePhoto } from '../photo-upload.js';

// Timer vars — module-local to event handlers.
var gifSearchTimer=null;
var requestSearchTimer=null;
// Holds the most recent infinite-scroll sentinel observer so we can
// disconnect it before binding a new one on the next render.
var songsSentinelObserver=null;
// Idempotency guard. render() always replaces #app's children, so checking
// the firstElementChild identity tells us whether the DOM has actually been
// re-rendered since the last bindEvents call. If not, we skip rebinding —
// otherwise duplicate calls (e.g., back-to-back renders from Realtime +
// state mutation) end up stacking handlers on the same elements and a
// single tap dispatches multiple events.
var _lastBoundFirstChild=null;
// Songs header auto-hide on scroll: when the user scrolls down past a small
// threshold the title + search bar collapse so just the genre tabs stay
// pinned at the top. Scrolling up restores the full header.
var songsScrollAttached=false;
var songsScrollTicking=false;
var lastSongsScrollY=0;
var songsScrollDelta=0;
var songsHeaderEl=null;
function handleSongsScroll(){
  songsScrollTicking=false;
  var hdr=document.getElementById("songs-header");
  if(!hdr){songsHeaderEl=null;return;}
  var y=window.scrollY||document.documentElement.scrollTop||0;
  var dy=y-lastSongsScrollY;
  lastSongsScrollY=y;
  if(y<24){
    hdr.classList.remove("is-collapsed");
    songsScrollDelta=0;
    return;
  }
  // Accumulate delta in the current direction; reset on direction flip so
  // tiny rubber-band wiggles can't flip the collapsed state.
  if((dy>0)===(songsScrollDelta>0)){songsScrollDelta+=dy;}
  else{songsScrollDelta=dy;}
  if(songsScrollDelta>24){hdr.classList.add("is-collapsed");}
  else if(songsScrollDelta<-24){hdr.classList.remove("is-collapsed");}
}
function onSongsScroll(){
  if(!songsScrollTicking){
    songsScrollTicking=true;
    requestAnimationFrame(handleSongsScroll);
  }
}
function setupSongsScrollListener(){
  if(!songsScrollAttached){
    window.addEventListener("scroll",onSongsScroll,{passive:true});
    songsScrollAttached=true;
  }
  var hdr=document.getElementById("songs-header");
  if(hdr&&hdr!==songsHeaderEl){
    // Songs page just (re)rendered — reset tracking so we don't carry over
    // a stale delta from a previous screen's scroll position.
    songsHeaderEl=hdr;
    lastSongsScrollY=window.scrollY||document.documentElement.scrollTop||0;
    songsScrollDelta=0;
    hdr.classList.remove("is-collapsed");
  } else if(!hdr){
    songsHeaderEl=null;
  }
}

export function bindEvents(){
  // Skip if the DOM hasn't changed since the last bindEvents call.
  var _app=document.getElementById("app");
  var _fc=_app?_app.firstElementChild:null;
  if(_fc && _fc===_lastBoundFirstChild){
    return;
  }
  _lastBoundFirstChild=_fc;
  var ni=document.getElementById("name-input"),jb=document.getElementById("join-btn");
  if(ni&&jb){
    jb.disabled=!ni.value.trim();
    ni.addEventListener("input",function(){S.joinName=ni.value;jb.disabled=!ni.value.trim();});
    jb.addEventListener("click",function(){joinSession(ni.value);});
    ni.addEventListener("keydown",function(e){if(e.key==="Enter"&&ni.value.trim())joinSession(ni.value);});
    ni.focus();
  }
  var au=document.getElementById("avatar-upload");
  if(au){
    au.addEventListener("click",function(){
      if(window.__logErr)window.__logErr('join avatar: TAP, opening global picker');
      var ni2=document.getElementById("name-input");if(ni2)S.joinName=ni2.value;
      pickProfilePhoto(function(url){
        S.profilePicture=url;
        render();
      });
    });
  }
  var ro=document.getElementById("rejoin-open");
  if(ro){ro.addEventListener("click",function(){
    S.screen="rejoin";render();
    loadGuests().then(render);
  });}
  var rb=document.getElementById("rejoin-back");
  if(rb){rb.addEventListener("click",function(){S.screen="join";render();});}
  document.querySelectorAll(".rejoin-row").forEach(function(row){
    row.addEventListener("click",function(){
      var gid=row.dataset.guestId;
      var g=(S.guests||[]).find(function(x){return x.id===gid;});
      if(g)rejoinAsGuest(g);
    });
  });
  var pa=document.getElementById("profile-avatar");
  if(pa){
    pa.addEventListener("click",function(){
      if(window.__logErr)window.__logErr('profile avatar: TAP, opening global picker');
      pickProfilePhoto(function(url){
        S.profilePicture=url;
        render();
      });
    });
  }
  var ps=document.getElementById("profile-save"),pn=document.getElementById("profile-name");
  if(ps&&pn){
    ps.addEventListener("click",function(){if(pn.value.trim())updateProfile(pn.value,S.profilePicture,S.defaultColor);});
  }
  document.querySelectorAll(".profile-color-swatch").forEach(function(sw){
    sw.addEventListener("click",function(){
      var c=sw.getAttribute("data-default-color");
      if(!c)return;
      S.defaultColor=(S.defaultColor||"").toLowerCase()===c.toLowerCase()?null:c;
      render();
    });
  });
  var pcc=document.getElementById("profile-color-clear");
  if(pcc){pcc.addEventListener("click",function(){S.defaultColor=null;render();});}
  var psw=document.getElementById("profile-switch");
  if(psw){psw.addEventListener("click",function(){
    if(!confirm("Switch user? You'll need to enter a new name. Songs you've added will stay queued."))return;
    localStorage.removeItem("karaoke_guest_"+S.sessionCode);
    clearDeviceProfile();
    S.guestId=null;S.guestName="";S.profilePicture=null;S.defaultColor=null;S.joinName="";
    S.screen="join";render();
  });}
  // (The #nav-profile click handler was removed — the profile button now
  // has data-nav="profile" so the generic .nav-tab handler below handles
  // it. Having both attached meant one tap fired two renders, the second
  // one setting S.screen=undefined because the .nav-tab handler read a
  // missing data-nav attribute. With S.screen=undefined every subsequent
  // render() — including post-photo-upload — fell through the switch and
  // left the DOM frozen on the previously-rendered screen.)
  // Append the next batch of song cards before the sentinel. Called by the
  // IntersectionObserver when the sentinel scrolls into view.
  function loadMoreSongs(){
    var fl=filterCatalog();
    var have=(S.songsVisibleCount||SONGS_BATCH_SIZE);
    if(have>=fl.length)return;
    var nextBatch=fl.slice(have,have+SONGS_BATCH_SIZE);
    if(nextBatch.length===0)return;
    var grid=document.getElementById("song-grid");
    var sentinel=document.getElementById("songs-sentinel");
    if(!grid||!sentinel)return;
    var html=nextBatch.map(songCardHtml).join("");
    sentinel.insertAdjacentHTML("beforebegin",html);
    S.songsVisibleCount=have+nextBatch.length;
    if(S.songsVisibleCount>=fl.length){
      // No more songs — remove sentinel and disconnect observer.
      sentinel.remove();
      if(songsSentinelObserver){songsSentinelObserver.disconnect();songsSentinelObserver=null;}
    }
  }
  function setupSongsSentinel(){
    if(songsSentinelObserver){songsSentinelObserver.disconnect();songsSentinelObserver=null;}
    var sentinel=document.getElementById("songs-sentinel");
    if(!sentinel||!("IntersectionObserver" in window))return;
    songsSentinelObserver=new IntersectionObserver(function(entries){
      for(var i=0;i<entries.length;i++){
        if(entries[i].isIntersecting){loadMoreSongs();}
      }
    },{rootMargin:"400px 0px"});
    songsSentinelObserver.observe(sentinel);
  }
  function bindSongCards(){
    // Event delegation so we don't need to re-bind handlers on cards that
    // get appended later by loadMoreSongs() — a single listener on the
    // grid covers every current and future .song-card.
    var grid=document.getElementById("song-grid");
    if(grid && !grid.dataset.delegated){
      grid.dataset.delegated="1";
      grid.addEventListener("click",function(e){
        var card=e.target.closest&&e.target.closest(".song-card");
        if(!card||!grid.contains(card))return;
        var tid=card.dataset.track;
        var track=S.catalog.find(function(s2){return s2.track_id===tid;});
        if(track){initWizardFromTrack(track);render();}
      });
    }
    var reqCta=document.getElementById("request-song-cta");
    if(reqCta)reqCta.addEventListener("click",function(){
      var carry=(S.searchQuery||"").trim();
      S.screen="request";
      S.requestQuery=carry;
      S.requestResults=[];
      S.requestSearching=!!carry;
      render();
      setTimeout(function(){
        var i=document.getElementById("req-search-input");
        if(i){i.focus();try{var n=i.value.length;i.setSelectionRange(n,n);}catch(e){}}
      },80);
      if(carry){
        if(requestSearchTimer)clearTimeout(requestSearchTimer);
        runRequestSearch().then(function(){
          var grid=document.getElementById("req-results");
          if(!grid)return;
          var tmp=document.createElement("div");
          tmp.innerHTML=renderRequest();
          var fresh=tmp.querySelector("#req-results");
          if(fresh){grid.innerHTML=fresh.innerHTML;bindReqResults();}
        });
      }
    });
    setupSongsSentinel();
  }
  function refreshSongsView(opts){
    // Filter/genre changed — reset to the first batch so we don't paint a
    // huge grid for the new filter.
    S.songsVisibleCount=SONGS_BATCH_SIZE;
    var fl=filterCatalog();
    var grid=document.getElementById("song-grid");
    if(grid){grid.innerHTML=renderSongCards(fl);bindSongCards();}
    if(opts&&opts.rerenderTabs){
      var host=document.querySelector(".songs-header");
      if(host){
        var existing=host.querySelector("#genre-tabs");
        var html=renderGenreTabs();
        if(existing){
          var tpl=document.createElement("div");tpl.innerHTML=html;
          var fresh=tpl.firstChild;
          if(fresh)existing.replaceWith(fresh);else existing.remove();
        }else if(html){
          host.insertAdjacentHTML("beforeend",html);
        }
        bindGenreTabs();
      }
    }
  }
  function bindGenreTabs(){
    var strip=document.getElementById("genre-tabs");
    if(!strip)return;
    strip.querySelectorAll(".genre-tab").forEach(function(btn){
      btn.addEventListener("click",function(){
        var g=btn.dataset.genre||"All Songs";
        if(S.selectedGenre===g)return;
        S.selectedGenre=g;
        strip.querySelectorAll(".genre-tab").forEach(function(t){t.classList.remove("is-active");});
        btn.classList.add("is-active");
        try{btn.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});}catch(e){}
        refreshSongsView();
      });
    });
  }
  var si=document.getElementById("search-input");
  if(si){si.addEventListener("input",function(){
    var prevEmpty=(S.searchQuery||"").length===0;
    S.searchQuery=si.value;
    var nowEmpty=S.searchQuery.length===0;
    var rerenderTabs=false;
    if(prevEmpty&&!nowEmpty&&S.selectedGenre!=="All Songs"){
      S.selectedGenre="All Songs";
      rerenderTabs=true;
    }
    refreshSongsView({rerenderTabs:rerenderTabs});
  });}
  bindGenreTabs();
  bindSongCards();
  setupSongsScrollListener();
  var wizBack=document.getElementById("wiz-back");
  if(wizBack)wizBack.addEventListener("click",wizardBack);
  var wizCancel=document.getElementById("wiz-cancel");
  if(wizCancel)wizCancel.addEventListener("click",function(){
    if(wizardHasAnyChanges()&&!confirm("Discard this song setup?"))return;
    S.selectedTrack=null;S.singers=[];S.stage_theme=null;S.hide_song=false;
    S.customSingerName="";S.singerPickerOpen=false;
    S.screen="songs";render();
  });
  var wizFooterBack=document.getElementById("wiz-footer-back");
  if(wizFooterBack)wizFooterBack.addEventListener("click",wizardBack);
  var wizNext=document.getElementById("wiz-next");
  if(wizNext)wizNext.addEventListener("click",nextWizardStep);
  var wizAdd=document.getElementById("wiz-add-singer");
  if(wizAdd)wizAdd.addEventListener("click",function(){
    S.singerPickerOpen=true;S.customSingerName="";render();
    setTimeout(function(){var inp=document.getElementById("custom-singer-input");if(inp)inp.focus();},80);
  });
  document.querySelectorAll(".wiz-singer-row-remove").forEach(function(btn){
    btn.addEventListener("click",function(){
      var idx=parseInt(btn.dataset.remove);
      removeSinger(idx);render();
    });
  });
  document.querySelectorAll(".wiz-color-swatch").forEach(function(sw){
    sw.addEventListener("click",function(){
      var si=parseInt(sw.dataset.singerIdx);
      var ci=parseInt(sw.dataset.colorIdx);
      setSingerColor(si,ci);
      render();
    });
  });
  document.querySelectorAll(".wiz-step[data-go]").forEach(function(stepBtn){
    stepBtn.addEventListener("click",function(){
      var go=stepBtn.dataset.go;
      if(go==="songs"){
        if(wizardHasAnyChanges()&&!confirm("Discard this song setup?"))return;
        S.selectedTrack=null;S.singers=[];S.stage_theme=null;S.hide_song=false;
        S.customSingerName="";S.singerPickerOpen=false;
        S.screen="songs";render();
      }
    });
  });
  document.querySelectorAll(".role-singer-chip").forEach(function(chip){
    chip.addEventListener("click",function(){
      var ri=parseInt(chip.dataset.roleIdx);
      var si=parseInt(chip.dataset.singerIdx);
      var idx=S.singers[si].roleIndices||[];
      if(idx.indexOf(ri)>=0){S.singers[si].roleIndices=idx.filter(function(x){return x!==ri;});}
      else{S.singers[si].roleIndices=idx.concat([ri]);}
      render();
    });
  });
  // Singer picker overlay bindings
  var spOv=document.getElementById("singer-picker-overlay");
  if(spOv){
    spOv.addEventListener("click",function(e){if(e.target===spOv){S.singerPickerOpen=false;render();}});
    document.querySelectorAll(".singer-picker-pill[data-add-guest]").forEach(function(pill){
      pill.addEventListener("click",function(){
        var gid=pill.dataset.addGuest;
        var guest=(S.guests||[]).find(function(g){return g.id===gid;});
        if(!guest)return;
        addSinger({name:guest.name,profilePicture:guest.profilePicture||null,defaultColor:guest.defaultColor||null});
        S.singerPickerOpen=false;S.customSingerName="";render();
      });
    });
    var csi=document.getElementById("custom-singer-input");
    var csa=document.getElementById("custom-singer-add");
    if(csi){
      csi.addEventListener("input",function(){S.customSingerName=csi.value;});
      csi.addEventListener("keydown",function(e){
        if(e.key==="Enter"){
          var v=csi.value.trim();
          if(!v)return;
          addSinger({name:v,profilePicture:null});
          S.singerPickerOpen=false;S.customSingerName="";render();
        }
      });
    }
    if(csa){
      csa.addEventListener("click",function(){
        var v=(csi&&csi.value||"").trim();
        if(!v)return;
        addSinger({name:v,profilePicture:null});
        S.singerPickerOpen=false;S.customSingerName="";render();
      });
    }
    var spc=document.getElementById("singer-picker-cancel");
    if(spc)spc.addEventListener("click",function(){S.singerPickerOpen=false;render();});
  }
  document.querySelectorAll(".theme-pick-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      S.stage_theme=btn.dataset.stageTheme;
      render();
    });
  });
  var hb=document.getElementById("hide-toggle-btn");
  if(hb)hb.addEventListener("click",function(){S.hide_song=!S.hide_song;render();});
  document.querySelectorAll(".wpc-row[data-wpc-singer]").forEach(function(row){
    row.addEventListener("click",function(){
      var si=parseInt(row.dataset.wpcSinger);
      if(!S.singers[si])return;
      S.singers[si].whitePersonCheck=!S.singers[si].whitePersonCheck;
      if(si===0){
        S.prefersSanitize=!!S.singers[si].whitePersonCheck;
        saveDeviceProfile();
      }
      render();
    });
  });
  // Stage reaction buttons
  var rc=document.getElementById("react-clap");
  if(rc)rc.addEventListener("click",function(){sendReaction("emoji","\uD83D\uDC4F");});
  var rtd=document.getElementById("react-thumbsdown");
  if(rtd)rtd.addEventListener("click",function(){sendReaction("emoji","\uD83D\uDC4E");});
  var rcu=document.getElementById("react-custom");
  if(rcu)rcu.addEventListener("click",function(e){if(e.target.closest("#react-custom-edit")){S.emojiPickerOpen=true;render();return;}sendReaction("emoji",S.customEmoji);});
  var rcup=document.getElementById("react-custom-pick");
  if(rcup)rcup.addEventListener("click",function(){S.emojiPickerOpen=true;render();});
  var rsay=document.getElementById("react-say");
  if(rsay)rsay.addEventListener("click",function(){S.textInputOpen=true;render();setTimeout(function(){var ti=document.getElementById("text-reaction-input");if(ti)ti.focus();},100);});
  var rmeme=document.getElementById("react-meme");
  if(rmeme)rmeme.addEventListener("click",function(){
    S.memePickerOpen=true;S.memeSearchQuery="";
    S.memeGifs=caches.allGifs;S.memeLoading=false;render();
  });
  var rcam=document.getElementById("react-camera");
  var rcami=document.getElementById("react-camera-input");
  if(rcam&&rcami){
    rcam.addEventListener("click",function(){rcami.click();});
    rcami.addEventListener("change",function(){
      if(rcami.files&&rcami.files[0]){
        resizeImage(rcami.files[0],200,0.7,function(url){sendReaction("photo",url);});
        rcami.value="";
      }
    });
  }
  // Emoji picker overlay
  var eov=document.getElementById("emoji-overlay");
  if(eov){
    eov.addEventListener("click",function(e){if(e.target===eov){S.emojiPickerOpen=false;render();}});
    document.querySelectorAll(".emoji-pick-btn").forEach(function(btn){
      btn.addEventListener("click",function(){
        S.customEmoji=btn.dataset.emoji;
        S.emojiPickerOpen=false;
        render();
      });
    });
  }
  // Text input overlay
  var tov=document.getElementById("text-overlay");
  if(tov){
    tov.addEventListener("click",function(e){if(e.target===tov){S.textInputOpen=false;render();}});
    var tsend=document.getElementById("text-reaction-send");
    var tinp=document.getElementById("text-reaction-input");
    if(tsend&&tinp){
      tsend.addEventListener("click",function(){var v=tinp.value.trim();if(v){sendReaction("text",v);S.textInputOpen=false;render();}});
      tinp.addEventListener("keydown",function(e){if(e.key==="Enter"){var v=tinp.value.trim();if(v){sendReaction("text",v);S.textInputOpen=false;render();}}});
    }
  }
  // Meme GIF picker overlay
  var mov=document.getElementById("meme-overlay");
  if(mov){
    mov.addEventListener("click",function(e){if(e.target===mov){S.memePickerOpen=false;S.memeSearchQuery="";render();}});
    var mgrid=document.getElementById("meme-gif-grid");
    if(mgrid){
      mgrid.addEventListener("click",function(e){
        var btn=e.target.closest(".meme-pick-btn");
        if(!btn)return;
        var gifUrl=btn.dataset.gifUrl;
        if(gifUrl){
          sendReaction("meme",gifUrl);
          S.memePickerOpen=false;S.memeSearchQuery="";render();
        }
      });
    }
    var msi=document.getElementById("meme-search-field");
    if(msi){
      msi.addEventListener("input",function(){
        S.memeSearchQuery=msi.value;
        if(gifSearchTimer)clearTimeout(gifSearchTimer);
        gifSearchTimer=setTimeout(function(){
          S.memeGifs=filterGifs(msi.value.trim());
          render();restoreMemeSearch();
        },150);
      });
    }
  }
  var yupBtn=document.getElementById("youreup-play-btn");
  if(yupBtn){
    yupBtn.addEventListener("click",function(){
      var newState=!S.isPlaying;
      sb.from("karaoke_sessions")
        .update({is_playing:newState,updated_at:new Date().toISOString()})
        .eq("id",S.sessionId)
        .then(function(res){
          if(res.error)console.error("Failed to toggle play:",res.error);
        });
    });
  }
  var vfxBtn=document.getElementById("youreup-vfx-btn");
  if(vfxBtn){
    vfxBtn.addEventListener("click",function(){
      S.vocalFxEnabled=!S.vocalFxEnabled;
      sb.from("karaoke_sessions").update({vocal_fx_enabled:S.vocalFxEnabled,updated_at:new Date().toISOString()}).eq("id",S.sessionId).then(function(res){
        if(res.error)console.error("Failed to toggle vocal fx:",res.error);
      });
      render();
    });
  }
  var atBtn=document.getElementById("youreup-at-btn");
  if(atBtn){
    atBtn.addEventListener("click",function(){
      S.autotuneEnabled=!S.autotuneEnabled;
      sb.from("karaoke_sessions").update({autotune_enabled:S.autotuneEnabled,updated_at:new Date().toISOString()}).eq("id",S.sessionId).then(function(res){
        if(res.error)console.error("Failed to toggle autotune:",res.error);
      });
      render();
    });
  }
  var skipBtnEl=document.getElementById("youreup-skip-btn");
  if(skipBtnEl){
    skipBtnEl.addEventListener("click",function(){
      S.skipConfirmOpen=true;
      render();
    });
  }
  var skipCancel=document.getElementById("skip-confirm-cancel");
  if(skipCancel){
    skipCancel.addEventListener("click",function(){
      S.skipConfirmOpen=false;
      render();
    });
  }
  var skipBackdrop=document.getElementById("skip-confirm-backdrop");
  if(skipBackdrop){
    skipBackdrop.addEventListener("click",function(e){
      if(e.target===skipBackdrop){
        S.skipConfirmOpen=false;
        render();
      }
    });
  }
  var skipYes=document.getElementById("skip-confirm-yes");
  if(skipYes){
    skipYes.addEventListener("click",function(){
      S.skipConfirmOpen=false;
      sb.from("karaoke_sessions")
        .update({skip_requested_at:new Date().toISOString(),updated_at:new Date().toISOString()})
        .eq("id",S.sessionId)
        .then(function(res){
          if(res.error)console.error("Failed to request skip:",res.error);
        });
      render();
    });
  }
  document.querySelectorAll(".nav-tab").forEach(function(tab){
    tab.addEventListener("click",function(){
      // Reset the songs paint batch whenever the user (re-)enters the Songs
      // tab so we never paint a giant grid for a user who'd scrolled to
      // load more cards in a previous visit.
      if(tab.dataset.nav==="songs")S.songsVisibleCount=SONGS_BATCH_SIZE;
      S.screen=tab.dataset.nav;
      if(tab.dataset.nav==="queue"){loadQueue().then(render);}
      else if(tab.dataset.nav==="awards"){
        S.awardScreen="list";S.awardActiveId=null;
        // Kick off manifest load in parallel with loadAwards; both promises
        // resolve independently. The awards list can render with the CDN
        // fallback before the manifest arrives — manifest just enables the
        // icon picker for create/edit.
        ensureAwardsManifest().then(render).catch(function(e){console.warn('awards manifest load failed:',e);});
        loadAwards().then(render);
      }
      else{render();}
    });
  });
  bindAwardsEvents();
  document.querySelectorAll("[data-q-vote-up]").forEach(function(btn){
    btn.addEventListener("click",function(){
      var id=btn.getAttribute("data-q-vote-up");
      castVote(id,1);
    });
  });
  document.querySelectorAll("[data-q-vote-down]").forEach(function(btn){
    btn.addEventListener("click",function(){
      var id=btn.getAttribute("data-q-vote-down");
      castVote(id,-1);
    });
  });
  document.querySelectorAll("[data-q-edit]").forEach(function(btn){
    btn.addEventListener("click",function(){
      var id=btn.getAttribute("data-q-edit");
      var row=S.queue.find(function(q){return q.id===id;});
      if(!row)return;
      var track=S.catalog.find(function(c){return c.track_id===row.track_id;});
      if(!track){alert("Can't edit yet — the song catalog is still loading.");return;}
      initWizardFromQueueItem(track,row);
      render();
    });
  });
  var reqBack=document.getElementById("req-back");
  if(reqBack)reqBack.addEventListener("click",function(){
    S.screen="songs";S.requestQuery="";S.requestResults=[];S.requestSearching=false;
    render();
  });
  var reqInp=document.getElementById("req-search-input");
  if(reqInp){
    reqInp.addEventListener("input",function(){
      S.requestQuery=reqInp.value;
      if(requestSearchTimer)clearTimeout(requestSearchTimer);
      var resultsEl=document.getElementById("req-results");
      if(resultsEl&&S.requestQuery.trim()&&!S.requestSearching){
        resultsEl.innerHTML='<div class="req-loading"><div class="spinner"></div></div>';
      }
      requestSearchTimer=setTimeout(function(){
        runRequestSearch().then(function(){
          var grid=document.getElementById("req-results");
          if(!grid)return;
          var tmp=document.createElement("div");
          tmp.innerHTML=renderRequest();
          var fresh=tmp.querySelector("#req-results");
          if(fresh){grid.innerHTML=fresh.innerHTML;bindReqResults();}
        });
      },280);
    });
  }
  function bindReqResults(){
    document.querySelectorAll(".song-card[data-req-track]").forEach(function(card){
      var pick=function(){
        if(card.dataset.reqBusy==="1")return;
        var tid=card.dataset.reqTrack;
        var item=S.requestResults.find(function(t){return t.trackId===tid;});
        if(item)submitSongRequest(item);
      };
      card.addEventListener("click",pick);
      card.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();pick();}});
    });
  }
  bindReqResults();
}
