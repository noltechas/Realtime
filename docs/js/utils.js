import { S, caches } from './state.js?v=20260524d';

export function filterGifs(query){
  if(!query)return caches.allGifs;
  var q=query.toLowerCase();
  return caches.allGifs.filter(function(g){return g.title&&g.title.toLowerCase().indexOf(q)!==-1;});
}
export function addedLabel(_theme){
  // Uniform across themes; theme styling still gives it character.
  return "Added";
}
export function tokenIfFresh(token,expiresAt){
  if(!token)return null;
  if(!expiresAt)return token;
  var t=Date.parse(expiresAt);
  if(isNaN(t))return token;
  return (t>Date.now()+30000)?token:null;
}
export function restoreMemeSearch(){
  var si=document.getElementById("meme-search-field");
  if(si){si.value=S.memeSearchQuery||"";si.focus();var len=si.value.length;si.setSelectionRange(len,len);}
}
export function resizeImage(file,maxSize,quality,cb){
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      try{
        var c=document.createElement("canvas");
        c.width=maxSize;c.height=maxSize;
        var ctx=c.getContext("2d");
        var sz=Math.min(img.width,img.height);
        var sx=(img.width-sz)/2,sy=(img.height-sz)/2;
        ctx.drawImage(img,sx,sy,sz,sz,0,0,maxSize,maxSize);
        cb(c.toDataURL("image/jpeg",quality));
      }catch(err){console.error("resizeImage canvas error:",err);cb(null);}
    };
    img.onerror=function(){console.error("resizeImage image load failed");cb(null);};
    img.src=e.target.result;
  };
  reader.onerror=function(){console.error("resizeImage FileReader failed");cb(null);};
  reader.readAsDataURL(file);
}
export function fmtD(ms){var s=Math.floor(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");}
export function esc(s){if(!s)return"";var d=document.createElement("div");d.textContent=s;return d.innerHTML;}
export function avatarHTML(pic,name,size,bg){
  if(pic){return '<img src="'+pic+'" alt="" style="width:'+size+'px;height:'+size+'px;border-radius:50%;object-fit:cover">';}
  var letter=name?esc(name.charAt(0).toUpperCase()):"?";
  var bgc=bg||"linear-gradient(135deg,#a78bfa,#818cf8)";
  return '<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;background:'+bgc+';display:flex;align-items:center;justify-content:center;font-size:'+Math.round(size*0.42)+'px;font-weight:700;color:#fff;flex-shrink:0">'+letter+'</div>';
}
export function showQueueNotification(pl){
  if(!pl||!pl.new)return;
  var d=pl.new;
  if(d.added_by_guest_id&&d.added_by_guest_id===S.guestId)return;
  var hidden=!!d.is_hidden;
  var song=d.track_name||"a song";
  var artist=d.track_artist||"";
  var artUrl=d.track_art_url||"";
  var singers=d.singer_configs||[];
  var singerNames=[];
  for(var i=0;i<singers.length;i++){if(singers[i].name)singerNames.push(singers[i].name);}
  if(singerNames.length===0)singerNames.push(d.added_by_name||"Someone");
  var displayName=singerNames.length<=2?singerNames.join(" & "):singerNames.slice(0,-1).join(", ")+" & "+singerNames[singerNames.length-1];
  var pics=[];
  for(var p=0;p<singers.length;p++){
    var pic=singers[p].profilePicture||null;
    if(!pic&&S.guests){
      for(var g=0;g<S.guests.length;g++){
        if(S.guests[g].name===singers[p].name&&S.guests[g].profile_picture){pic=S.guests[g].profile_picture;break;}
      }
    }
    if(pic)pics.push(pic);
  }
  var avatarHtml="";
  if(pics.length>0){
    avatarHtml='<div class="notif-avatars" style="display:flex;gap:4px;flex-shrink:0">';
    for(var a=0;a<pics.length;a++){avatarHtml+='<img src="'+pics[a]+'" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover">';}
    avatarHtml+="</div>";
  }
  var container=document.getElementById("notif-container");
  if(!container)return;
  var el=document.createElement("div");
  el.className="notif-toast"+(hidden?" notif-toast--hidden":"");
  if(hidden){
    el.innerHTML='<div class="notif-art notif-art--hidden" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="10.5" width="17" height="10.5" rx="2"/><path d="M7 10.5 V7 a5 5 0 0 1 10 0 v3.5"/></svg></div>'+
      '<div class="notif-body"><div class="notif-title">'+esc(displayName)+' signed up for a secret song</div>'+
      '<div class="notif-sub">title hidden until it plays</div></div>'+
      avatarHtml;
  }else{
    el.innerHTML=(artUrl?'<img class="notif-art" src="'+esc(artUrl)+'" alt="">':"")+
      '<div class="notif-body"><div class="notif-title">'+esc(displayName)+" signed up to sing "+esc(song)+"</div>"+
      '<div class="notif-sub">by '+esc(artist)+"</div></div>"+
      avatarHtml;
  }
  container.appendChild(el);
  setTimeout(function(){el.className="notif-toast notif-out"+(hidden?" notif-toast--hidden":"");setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},400);},4000);
}
