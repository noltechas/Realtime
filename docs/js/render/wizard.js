import { S, NC, MAX_SINGERS } from '../state.js';
import { esc, avatarHTML } from '../utils.js';

export function renderWizardStepper(step){
  var roles=(S.selectedTrack&&S.selectedTrack.roles)||[];
  var hasRoles=roles.length>1;
  var totalSteps=hasRoles?4:3;
  var steps=[{key:1,label:"Song",go:"songs"},{key:2,label:"Singers",go:null}];
  if(hasRoles)steps.push({key:3,label:"Roles",go:null});
  steps.push({key:4,label:"Finish",go:null});
  var html='<div class="wiz-stepper" data-total="'+totalSteps+'">';
  for(var i=0;i<steps.length;i++){
    var st=steps[i];
    var cls="wiz-step";
    var data="";
    if(st.key<step){cls+=" is-done";if(st.go){data=' data-go="'+st.go+'"';}}
    else if(st.key===step){cls+=" is-active";}
    else{cls+=" is-upcoming";}
    html+='<button class="'+cls+'"'+data+' type="button"><span class="wiz-step-dot"></span><span class="wiz-step-label">'+esc(st.label)+'</span></button>';
  }
  html+='</div>';
  return html;
}
export function renderWizardSongBanner(){
  var t=S.selectedTrack;if(!t)return"";
  return '<div class="wiz-song-banner">'+
    (t.art_url?'<img src="'+esc(t.art_url)+'" alt="">':"")+
    '<div class="wiz-song-banner-body">'+
      '<div class="wiz-song-banner-title">'+esc(t.name)+'</div>'+
      '<div class="wiz-song-banner-artist">'+esc(t.artist)+'</div>'+
    '</div>'+
  '</div>';
}
export function renderWizardShell(step,body){
  var hasRoles=((S.selectedTrack&&S.selectedTrack.roles)||[]).length>1;
  var totalLabel=hasRoles?"4":"3";
  var numLabel=(step===4&&!hasRoles)?"3":(step===4?"4":(step===3?"3":"2"));
  var stepText="Step "+numLabel+" of "+totalLabel;
  var titles={2:stepText+" \u00b7 Singers",3:stepText+" \u00b7 Roles",4:stepText+" \u00b7 Finish"};
  return '<div class="wiz-screen screen">'+
    '<div class="wiz-topbar">'+
      '<button class="wiz-topbar-back" id="wiz-back" aria-label="Back" type="button">'+
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>'+
      '</button>'+
      '<div class="wiz-topbar-title">'+esc(titles[step]||"")+'</div>'+
      '<button class="wiz-topbar-cancel" id="wiz-cancel" aria-label="Cancel" type="button">'+
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'+
      '</button>'+
    '</div>'+
    renderWizardStepper(step)+
    renderWizardSongBanner()+
    body+
  '</div>';
}
export function renderWizardFooter(step){
  var cta=(step===4)?"Add to Queue":"Next";
  var needsTheme=(step===4&&!S.stage_theme);
  var isDisabled=(step===4&&(S.addingToQueue||needsTheme));
  var disabled=isDisabled?" disabled":"";
  var nextSvg=(step===4)?"":' <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:4px"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
  var label=needsTheme?"Pick a theme to continue":cta;
  return '<div class="wiz-footer">'+
    '<button class="wiz-footer-back" id="wiz-footer-back" type="button">Back</button>'+
    '<button class="add-queue-btn wiz-footer-next" id="wiz-next" type="button"'+disabled+'>'+esc(label)+nextSvg+'</button>'+
  '</div>';
}
export function renderWizardSingers(){
  var ori=(S.selectedTrack&&S.selectedTrack.offensive_role_indices)||[];
  var takenColors={};
  for(var ti=0;ti<S.singers.length;ti++){takenColors[(S.singers[ti].color||"").toLowerCase()]=ti;}
  var rows="";
  for(var i=0;i<S.singers.length;i++){
    var s=S.singers[i];
    var av='<div class="wiz-singer-row-avatar" style="background:'+s.color+'">'+
      (s.profilePicture?'<img src="'+esc(s.profilePicture)+'" alt="">':esc((s.name||"?").charAt(0).toUpperCase()))+
    '</div>';
    var badge=(i===0)?'<span class="wiz-singer-row-badge">You</span>':'';
    var removeBtn=(i===0)?"":'<button class="wiz-singer-row-remove" data-remove="'+i+'" type="button" aria-label="Remove singer">'+
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'+
    '</button>';
    var roles=s.roleIndices||[];
    var flagged=false;
    for(var ri=0;ri<roles.length;ri++){if(ori.indexOf(roles[ri])>=0){flagged=true;break;}}
    var wpcRow="";
    if(flagged){
      var checked=!!s.whitePersonCheck;
      wpcRow='<button class="wpc-row wpc-row--nested'+(checked?" is-checked":"")+'" data-wpc-singer="'+i+'" type="button" role="checkbox" aria-checked="'+(checked?"true":"false")+'">'+
        '<svg class="wpc-row-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>'+
        '<span class="wpc-row-body">'+
          '<span class="wpc-row-title">Sanitize n-word on stage</span>'+
          '<span class="wpc-row-sub">This part contains the n-word. Toggle on and it\u2019ll be replaced with "fella(s)" while they sing.</span>'+
        '</span>'+
        '<span class="secret-toggle__box" aria-hidden="true">'+
          (checked?'<svg width="10" height="10" viewBox="0 0 14 14"><path d="M2.5 7.5 L5.5 10 L11 4" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>':'')+
        '</span>'+
      '</button>';
    }
    // Color picker \u2014 themed swatches per singer
    var swatches="";
    for(var ci=0;ci<NC.length;ci++){
      var nc=NC[ci];
      var lc=nc.c.toLowerCase();
      var sel=(s.color||"").toLowerCase()===lc;
      var takenByOther=(takenColors[lc]!==undefined&&takenColors[lc]!==i);
      var cls="wiz-color-swatch"+(sel?" is-selected":"")+(takenByOther?" is-taken":"");
      swatches+='<button type="button" class="'+cls+'" '+
        'data-singer-idx="'+i+'" data-color-idx="'+ci+'" '+
        'style="--swatch-color:'+nc.c+';--swatch-glow:'+nc.g+'" '+
        'aria-label="Color '+(ci+1)+(sel?" (selected)":"")+(takenByOther?" (used by another singer)":"")+'" aria-pressed="'+(sel?"true":"false")+'">'+
        '<span class="wiz-color-swatch-ring" aria-hidden="true"></span>'+
        '<span class="wiz-color-swatch-check" aria-hidden="true">'+
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'+
        '</span>'+
        '<span class="wiz-color-swatch-x" aria-hidden="true">'+
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 5L19 19M19 5L5 19"/></svg>'+
        '</span>'+
      '</button>';
    }
    var colorBlock='<div class="wiz-color-block" data-singer="'+i+'">'+
      '<div class="wiz-color-eyebrow">'+
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.52-4.5-10-10-10z"/></svg>'+
        '<span>Pick '+(i===0?"your":esc(s.name||"singer")+"\u2019s")+' color</span>'+
      '</div>'+
      '<div class="wiz-color-picker">'+swatches+'</div>'+
    '</div>';
    rows+='<div class="wiz-singer-slot">'+
      '<div class="wiz-singer-row" style="border-color:'+s.color+'">'+
        av+
        '<div class="wiz-singer-row-body">'+
          '<div class="wiz-singer-row-name-wrap"><span class="wiz-singer-row-name">'+esc(s.name||"Singer "+(i+1))+'</span>'+badge+'</div>'+
          '<div class="wiz-singer-row-meta">Singer '+(i+1)+'</div>'+
        '</div>'+
        removeBtn+
      '</div>'+
      colorBlock+
      wpcRow+
    '</div>';
  }
  var addBtn=(S.singers.length<MAX_SINGERS)?'<button class="wiz-add-singer" id="wiz-add-singer" type="button">'+
    '<span class="wiz-add-singer-plus">+</span> Add another singer'+
  '</button>':'';
  return '<div class="wiz-hero">Who\u2019s singing?</div>'+
    '<div class="wiz-hero-sub">You\u2019re locked in as the first singer. Add up to '+(MAX_SINGERS-1)+' more people who\u2019ll sing this song with you.</div>'+
    '<div class="wiz-singer-list">'+rows+'</div>'+
    addBtn;
}
export function renderWizardRoles(){
  var t=S.selectedTrack;if(!t)return"";
  var roles=t.roles||[];
  var singerChipHTML=function(roleIdx){
    return S.singers.map(function(s,si){
      var active=(s.roleIndices||[]).indexOf(roleIdx)>=0;
      var avInner=s.profilePicture?'<img src="'+esc(s.profilePicture)+'" alt="">':esc((s.name||"?").charAt(0).toUpperCase());
      var style=active?'border-color:'+s.color+';background:'+s.colorGlow+';color:var(--white);box-shadow:0 0 0 1.5px '+s.color:'';
      return '<button class="role-singer-chip'+(active?" is-active":"")+'" data-role-idx="'+roleIdx+'" data-singer-idx="'+si+'" type="button" style="'+style+'">'+
        '<span class="role-singer-chip-avatar" style="background:'+s.color+'">'+avInner+'</span>'+
        '<span class="role-singer-chip-name">'+esc(s.name||"Singer "+(si+1))+'</span>'+
      '</button>';
    }).join("");
  };
  var roleRows=roles.map(function(r,ri){
    return '<div class="wiz-role-row">'+
      '<div class="wiz-role-row-head">'+
        '<div class="wiz-role-row-eyebrow">Who sings</div>'+
        '<div class="wiz-role-row-title">'+esc(r)+'</div>'+
      '</div>'+
      '<div class="wiz-role-chips">'+singerChipHTML(ri)+'</div>'+
    '</div>';
  }).join("");
  var unassigned=S.singers.filter(function(s){return !s.roleIndices||s.roleIndices.length===0;}).length;
  var warnHtml="";
  if(unassigned>0){
    var who=(unassigned===1?"1 singer hasn\u2019t":unassigned+" singers haven\u2019t")+" been assigned a role.";
    warnHtml='<div class="wiz-warn">'+
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>'+
      '<div>'+who+' Tap their name under the parts they\u2019ll sing, or continue if they\u2019re just hanging out.</div>'+
    '</div>';
  }
  return '<div class="wiz-hero">Who sings what?</div>'+
    '<div class="wiz-hero-sub">Tap a singer for each part. Multi-select for duets \u2014 a singer can cover multiple parts too.</div>'+
    '<div class="wiz-role-list">'+roleRows+'</div>'+
    warnHtml;
}
export function renderWizardStage(){
  var tiles=[
    {k:"neo-brutal",label:"Default",style:"background:#FFFDF5;color:#1A1A1A;border:3px solid #1A1A1A;border-radius:8px;font-family:'Space Grotesk',sans-serif;box-shadow:3px 3px 0 #1A1A1A;"},
    {k:"cyberpunk",label:"Cyberpunk",style:"background:#0a0a1a;color:#00ff88;border:1.5px solid #00ff88;border-radius:0;font-family:'Courier New',monospace;text-shadow:0 0 8px rgba(0,255,136,0.5);"},
    {k:"sketch",label:"Sketch",style:"background:#fdfbf7;color:#2d5da1;border:2px dashed #2d5da1;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px;font-family:'Patrick Hand',cursive;"},
    {k:"urban",label:"Urban",style:"background:#0a0a0a;color:#D4FF00;border:1.5px solid #D4FF00;border-radius:4px;font-family:'Oswald',sans-serif;text-transform:uppercase;letter-spacing:2px;"},
    {k:"deep-sea",label:"Deep Sea",style:"background:#040918;color:#00ffc8;border:1px solid rgba(0,255,200,0.4);border-radius:12px;font-family:'Quicksand',sans-serif;text-shadow:0 0 8px rgba(0,255,200,0.4);"},
    {k:"psychedelic",label:"Psychedelic",style:"background:#1a0a2e;color:#ff2d95;border:1px solid rgba(255,45,149,0.4);border-radius:16px;font-family:'Chicle',cursive;text-shadow:0 0 8px rgba(255,45,149,0.4);"},
    {k:"zen",label:"Zen",style:"background:#1a1814;color:#D4B85A;border:1px solid rgba(201,168,76,0.4);border-radius:6px;font-family:'Cormorant Garamond',serif;font-style:italic;text-shadow:0 0 8px rgba(201,168,76,0.3);"},
    {k:"space",label:"Space",style:"background:#08080F;color:#E040FB;border:1px solid rgba(224,64,251,0.4);border-radius:4px;font-family:'Orbitron',sans-serif;text-shadow:0 0 8px rgba(224,64,251,0.4);letter-spacing:1px;font-size:11px;"},
    {k:"steampunk",label:"Steampunk",style:"background:#14110F;color:#C8973E;border:1px solid rgba(200,151,62,0.4);border-radius:3px;font-family:'Cinzel Decorative',serif;text-shadow:0 0 8px rgba(200,151,62,0.3);font-size:11px;"},
    {k:"retrowave",label:"Retrowave",style:"background:#0a0614;color:#FF2D95;border:1px solid rgba(255,45,149,0.4);border-radius:4px;font-family:'Audiowide',sans-serif;text-shadow:0 0 8px rgba(255,45,149,0.4);font-size:11px;"}
  ];
  var grid=tiles.map(function(tt){
    var sel=(S.stage_theme===tt.k);
    return '<button class="theme-pick-btn'+(sel?" selected":"")+'" data-stage-theme="'+tt.k+'" type="button" style="'+tt.style+'">'+esc(tt.label)+'</button>';
  }).join("");
  return '<div class="wiz-hero">Finish up</div>'+
    '<div class="wiz-hero-sub">Pick a stage theme and decide whether the title stays a secret until it plays.</div>'+
    '<div class="config-section">'+
      '<div class="config-label">Stage theme</div>'+
      '<div class="wiz-theme-grid">'+grid+'</div>'+
      '<div class="wiz-stage-hint">Themes change how this song looks on the big screen.</div>'+
    '</div>'+
    '<div class="config-section">'+
      '<button class="secret-toggle'+(S.hide_song?" is-checked":"")+'" id="hide-toggle-btn" role="checkbox" aria-checked="'+(S.hide_song?"true":"false")+'" type="button" style="width:100%;padding:12px 14px;border:1.5px solid var(--white-ghost);border-radius:12px;background:var(--surface-1)">'+
        '<span class="secret-toggle__box" aria-hidden="true">'+
          (S.hide_song?'<svg width="10" height="10" viewBox="0 0 14 14"><path d="M2.5 7.5 L5.5 10 L11 4" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>':'')+
        '</span>'+
        '<span class="secret-toggle__text">'+
          '<span class="secret-toggle__label">Keep the song title hidden until I start</span>'+
          '<span class="secret-toggle__hint">'+(S.hide_song?"Other guests won\u2019t see the song name until it plays":"Surprise everyone \u2014 the song name shows up only when it plays")+'</span>'+
        '</span>'+
      '</button>'+
    '</div>';
}
export function renderWizardLyricsCheck(){
  var t=S.selectedTrack;if(!t)return"";
  var ori=t.offensive_role_indices||[];
  if(!ori.length||!S.singers.length)return"";
  var flagged=[];
  for(var i=0;i<S.singers.length;i++){
    var s=S.singers[i];
    var roles=s.roleIndices||[];
    var hits=false;
    for(var r=0;r<roles.length;r++){if(ori.indexOf(roles[r])>=0){hits=true;break;}}
    if(hits)flagged.push({singer:s,index:i});
  }
  if(!flagged.length)return"";
  var rows=flagged.map(function(fl){
    var s=fl.singer,i=fl.index;
    var av=s.profilePicture?'<img src="'+esc(s.profilePicture)+'" alt="">':esc((s.name||"?").charAt(0).toUpperCase());
    var checked=!!s.whitePersonCheck;
    return '<button class="wpc-row'+(checked?" is-checked":"")+'" data-wpc-singer="'+i+'" type="button" role="checkbox" aria-checked="'+(checked?"true":"false")+'">'+
      '<span class="wpc-row-avatar" style="background:'+s.color+'">'+av+'</span>'+
      '<span class="wpc-row-name">'+esc(s.name||"Singer "+(i+1))+'</span>'+
      '<span class="secret-toggle__box" aria-hidden="true" style="margin-left:auto">'+
        (checked?'<svg width="10" height="10" viewBox="0 0 14 14"><path d="M2.5 7.5 L5.5 10 L11 4" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>':'')+
      '</span>'+
    '</button>';
  }).join("");
  return '<div class="config-section">'+
    '<div class="config-label"><div class="config-label-icon" style="background:rgba(251,191,36,0.12)">&#9888;&#65039;</div> Lyric sanitization</div>'+
    '<div class="wpc-hint">One or more singers are assigned to a part with the n-word in the lyrics. Toggle on for anyone who shouldn\u2019t sing it \u2014 those words will be replaced with "fella(s)" on the stage.</div>'+
    '<div class="wpc-list">'+rows+'</div>'+
  '</div>';
}
export function renderSingerPickerOverlay(){
  if(!S.singerPickerOpen)return"";
  var usedNames={};
  for(var i=0;i<S.singers.length;i++){usedNames[(S.singers[i].name||"").toLowerCase()]=true;}
  var available=(S.guests||[]).filter(function(g){return !usedNames[(g.name||"").toLowerCase()];});
  var list="";
  if(available.length===0){
    list='<div class="wiz-hero-sub" style="margin-bottom:12px">No other guests are in this session yet. You can still add someone by typing their name below.</div>';
  }else{
    list='<div class="singer-picker-list">'+available.map(function(g){
      var av=g.profilePicture?'<img src="'+esc(g.profilePicture)+'" alt="">':esc((g.name||"?").charAt(0).toUpperCase());
      var bg=NC[(S.guests.indexOf(g))%NC.length].c;
      return '<button class="singer-picker-pill" data-add-guest="'+esc(g.id)+'" type="button">'+
        '<span class="singer-picker-avatar" style="background:'+bg+'">'+av+'</span>'+
        esc(g.name)+
      '</button>';
    }).join("")+'</div>';
  }
  return '<div class="text-input-overlay" id="singer-picker-overlay">'+
    '<div class="text-input-sheet" id="singer-picker-sheet">'+
      '<div class="emoji-picker-title">Add a singer</div>'+
      list+
      '<div class="singer-picker-divider">Or type a name</div>'+
      '<input class="text-input-field" id="custom-singer-input" placeholder="Someone not on their phone" maxlength="30" value="'+esc(S.customSingerName||"")+'">'+
      '<button class="text-input-send" id="custom-singer-add" type="button">Add singer</button>'+
      '<button class="singer-picker-cancel" id="singer-picker-cancel" type="button">Cancel</button>'+
    '</div>'+
  '</div>';
}
