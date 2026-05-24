import { S } from './state.js';

// Memo: skip the (large) CSS regeneration when the active theme hasn't
// actually changed since the last call. render() invokes applyTheme on
// every cycle, so without memoization we re-inject ~70KB of CSS string
// on every Supabase Realtime tick — a real memory pressure source on
// iOS Safari.
var _lastAppliedTheme=null;

export function applyTheme(){
  var tg=document.getElementById("theme-global");
  if(!tg){tg=document.createElement("style");tg.id="theme-global";document.head.appendChild(tg);}
  var css="";
  // Use stage theme when a song is playing, fall back to session theme
  var activeTheme=S.nowPlayingStageTheme||S.theme_name;
  // Surface the active theme on <body> so static CSS can target it by attribute.
  if(document.body)document.body.setAttribute("data-theme",activeTheme||"neo-brutal");
  if(activeTheme===_lastAppliedTheme && tg.textContent){
    // Theme unchanged and style already injected — nothing to do.
    return;
  }
  _lastAppliedTheme=activeTheme;
  if(activeTheme==="neo-brutal"){
    css=":root{--black:#FFF8EE;--surface-1:rgba(26,26,26,0.04);--surface-2:#FFFFFF;--surface-3:rgba(26,26,26,0.12);--white:#1A1A1A;--white-muted:rgba(26,26,26,0.7);--white-faint:rgba(26,26,26,0.4);--white-ghost:rgba(26,26,26,0.15);--violet:#B388FF;--pink:#FF3B30;--cyan:#00E676;--emerald:#00E676;--amber:#FFD60A;--red:#FF3B30;--grad-hero:linear-gradient(135deg, #FF3B30, #B388FF);--grad-text:linear-gradient(135deg, #FF3B30, #B388FF);--font-display:'Space Grotesk', system-ui, sans-serif;--font-body:'DM Sans', system-ui, sans-serif;}" +
    " .mesh-bg{background:none !important;animation:none !important;}" +
    " .song-card,.config-section,.queue-item,.singer-card,.request-song-cta,.now-playing-card{border:3px solid #1A1A1A !important;box-shadow:4px 4px 0px #1A1A1A !important;border-radius:8px !important;background:#FFFFFF !important;}" +
    " .song-card:active{box-shadow:2px 2px 0px #1A1A1A !important;transform:translate(2px,2px) !important;}" +
    " .join-btn,.add-queue-btn,.profile-save-btn{background:#FF3B30 !important;color:#FFFFFF !important;border:3px solid #1A1A1A !important;box-shadow:4px 4px 0px #1A1A1A !important;border-radius:8px !important;}" +
    " .join-btn:active,.add-queue-btn:active,.profile-save-btn:active{box-shadow:2px 2px 0px #1A1A1A !important;transform:translate(2px,2px) !important;}" +
    " .singer-count-btn{border:3px solid #1A1A1A !important;box-shadow:3px 3px 0px #1A1A1A !important;border-radius:8px !important;background:#FFFFFF !important;color:#1A1A1A !important;}" +
    " .singer-count-btn.active{background:#FFD60A !important;}" +
    " .role-btn{border:2px solid #1A1A1A !important;border-radius:8px !important;background:#FFFFFF !important;color:#1A1A1A !important;}" +
    " .role-btn.active{background:#B388FF !important;color:#FFFFFF !important;}" +
    " .join-input,.search-input,.singer-name-input,.profile-name-input{border:3px solid #1A1A1A !important;border-radius:8px !important;background:#FFFFFF !important;color:#1A1A1A !important;box-shadow:3px 3px 0px #1A1A1A !important;}" +
    " .join-input::placeholder,.search-input::placeholder,.singer-name-input::placeholder,.profile-name-input::placeholder{color:rgba(26,26,26,0.4) !important;}" +
    " .bottom-nav{background:rgba(255,248,238,0.95) !important;border-top:3px solid #1A1A1A !important;}" +
    " .songs-header,.req-header{background:rgba(255,248,238,0.95) !important;}" +
    " .song-card-plus{background:#FFD60A !important;border:3px solid #1A1A1A !important;border-radius:8px !important;color:#1A1A1A !important;box-shadow:2px 2px 0 #1A1A1A !important;width:36px !important;height:36px !important;}" +
    " .song-card-added{background:#00E676 !important;border:3px solid #1A1A1A !important;border-radius:8px !important;color:#1A1A1A !important;box-shadow:2px 2px 0 #1A1A1A !important;font-family:'Space Grotesk',sans-serif !important;font-weight:800 !important;padding:5px 9px !important;}" +
    " .now-playing-card{background:#FFD60A !important;border:3px solid #1A1A1A !important;animation:none !important;}" +
    " .avatar-upload,.profile-avatar{border:3px solid #1A1A1A !important;}" +
    " .guest-picker-pill{border:2px solid #1A1A1A !important;background:#FFFFFF !important;color:#1A1A1A !important;}" +
    " .guest-picker-pill.selected{background:#FFD60A !important;}" +
    " .reaction-cell{border:3px solid #1A1A1A !important;box-shadow:4px 4px 0px #1A1A1A !important;border-radius:8px !important;background:#FFFFFF !important;}" +
    " .reaction-cell:active{box-shadow:2px 2px 0px #1A1A1A !important;transform:translate(2px,2px) !important;}" +
    " .emoji-picker-sheet,.text-input-sheet,.meme-picker-sheet{background:#FFF8EE !important;border:3px solid #1A1A1A !important;}" +
    " .text-input-field{border:3px solid #1A1A1A !important;background:#FFFFFF !important;color:#1A1A1A !important;box-shadow:3px 3px 0px #1A1A1A !important;}" +
    " .text-input-send{background:#FF3B30 !important;border:3px solid #1A1A1A !important;box-shadow:3px 3px 0px #1A1A1A !important;}" +
    " .meme-pick-btn{border:3px solid #1A1A1A !important;box-shadow:3px 3px 0px #1A1A1A !important;background:#FFFFFF !important;}" +
    " .youreup-screen{background:#FFF8EE !important;}" +
    " .youreup-play-btn{border:3px solid #1A1A1A !important;box-shadow:6px 6px 0px #1A1A1A !important;border-radius:50% !important;}" +
    " .youreup-play-btn svg{fill:#1A1A1A !important;}" +
    " .youreup-play-btn:active{box-shadow:2px 2px 0px #1A1A1A !important;transform:translate(4px,4px) !important;}" +
    " .youreup-art{border:3px solid #1A1A1A !important;box-shadow:4px 4px 0px #1A1A1A !important;border-radius:8px !important;}" +
    " .youreup-skip-btn{border:3px solid #1A1A1A !important;box-shadow:4px 4px 0px #1A1A1A !important;border-radius:8px !important;background:#FFFFFF !important;color:#1A1A1A !important;}" +
    " .youreup-skip-btn:active{box-shadow:2px 2px 0px #1A1A1A !important;transform:translate(2px,2px) !important;}" +
    " .skip-confirm-card{background:#FFF8EE !important;border:3px solid #1A1A1A !important;box-shadow:6px 6px 0px #1A1A1A !important;border-radius:8px !important;}" +
    " .skip-confirm-title{color:#1A1A1A !important;}" +
    " .skip-confirm-sub{color:rgba(26,26,26,0.7) !important;}" +
    " .skip-confirm-btn-ghost{border:3px solid #1A1A1A !important;background:#FFFFFF !important;color:#1A1A1A !important;box-shadow:3px 3px 0px #1A1A1A !important;border-radius:8px !important;}" +
    " .skip-confirm-btn-danger{border:3px solid #1A1A1A !important;background:#FF3B30 !important;color:#FFFFFF !important;box-shadow:3px 3px 0px #1A1A1A !important;border-radius:8px !important;}" +
    " .skip-confirm-btn:active{box-shadow:1px 1px 0px #1A1A1A !important;transform:translate(2px,2px) !important;}" +
    /* ---- Awards: Create page ---- */
    " .awards-detail-info h2{color:#1A1A1A !important;}" +
    " .awards-detail-info p{color:rgba(26,26,26,0.7) !important;}" +
    " .awards-field-label{color:#1A1A1A !important;}" +
    " .awards-detail-back{border:3px solid #1A1A1A !important;background:#FFFFFF !important;color:#1A1A1A !important;border-radius:8px !important;box-shadow:2px 2px 0px #1A1A1A !important;}" +
    " .awards-text-input,.awards-picker-search{border:3px solid #1A1A1A !important;border-radius:8px !important;background:#FFFFFF !important;color:#1A1A1A !important;box-shadow:3px 3px 0px #1A1A1A !important;}" +
    " .awards-text-input::placeholder,.awards-picker-search::placeholder{color:rgba(26,26,26,0.4) !important;}" +
    " .awards-segmented{border:3px solid #1A1A1A !important;background:#FFFFFF !important;border-radius:8px !important;box-shadow:3px 3px 0px #1A1A1A !important;padding:4px !important;}" +
    " .awards-segmented button{color:#1A1A1A !important;border-radius:5px !important;font-weight:700 !important;}" +
    " .awards-segmented button.active{background:#FFD60A !important;color:#1A1A1A !important;font-weight:800 !important;}" +
    " .awards-visual-toggle button{border:3px solid #1A1A1A !important;border-radius:8px !important;background:#FFFFFF !important;color:#1A1A1A !important;box-shadow:3px 3px 0px #1A1A1A !important;}" +
    " .awards-visual-toggle button.active{background:#B388FF !important;color:#1A1A1A !important;border-color:#1A1A1A !important;}" +
    " .awards-visual-toggle .awards-or{color:#1A1A1A !important;}" +
    " .awards-icon-grid{border:3px solid #1A1A1A !important;border-radius:8px !important;background:#FFF8EE !important;box-shadow:3px 3px 0px #1A1A1A !important;}" +
    " .awards-icon-grid button{border:2px solid #1A1A1A !important;border-radius:6px !important;background:#FFFFFF !important;color:#1A1A1A !important;}" +
    " .awards-icon-grid button.active{background:#FFD60A !important;color:#1A1A1A !important;border-color:#1A1A1A !important;box-shadow:inset 0 0 0 2px #1A1A1A !important;}" +
    " .awards-btn{border:3px solid #1A1A1A !important;border-radius:8px !important;background:#FFFFFF !important;color:#1A1A1A !important;box-shadow:3px 3px 0px #1A1A1A !important;}" +
    " .awards-btn:active{box-shadow:1px 1px 0px #1A1A1A !important;transform:translate(2px,2px) !important;}" +
    " .awards-btn--primary{background:#FF3B30 !important;color:#FFFFFF !important;border:3px solid #1A1A1A !important;box-shadow:3px 3px 0px #1A1A1A !important;}" +
    " .awards-btn--danger{background:#FF3B30 !important;color:#FFFFFF !important;border:3px solid #1A1A1A !important;box-shadow:3px 3px 0px #1A1A1A !important;}";
  }else if(activeTheme==="cyberpunk"){
    css=":root{--black:#060610;--surface-1:rgba(0,255,136,0.04);--surface-2:rgba(0,255,136,0.07);--surface-3:rgba(0,255,136,0.1);--white:#d0ffe8;--white-muted:rgba(0,255,136,0.6);--white-faint:rgba(0,255,136,0.3);--white-ghost:rgba(0,255,136,0.18);--violet:#00e5ff;--pink:#ff00aa;--cyan:#00ff88;--emerald:#00ff88;--amber:#ffcc00;--red:#ff0055;--grad-hero:linear-gradient(135deg, #00ff88, #00e5ff);--grad-text:linear-gradient(135deg, #00ff88, #00e5ff);--font-display:'Share Tech Mono', 'Courier New', monospace;--font-body:'Share Tech Mono', 'Courier New', monospace;}" +
    " *{border-radius:0 !important;}" +
    " .mesh-bg{background:repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(0,255,136,0.03) 27px,rgba(0,255,136,0.03) 28px),repeating-linear-gradient(90deg,transparent,transparent 27px,rgba(0,255,136,0.03) 27px,rgba(0,255,136,0.03) 28px) !important;animation:none !important;}" +
    " .avatar-upload,.profile-avatar,.nav-guest-avatar,.queue-singer-dot,.guest-picker-avatar{border-radius:0 !important;}" +
    " .avatar-upload,.profile-avatar{border-color:rgba(0,255,136,0.4) !important;}" +
    " .reaction-cell{border:1px solid rgba(0,255,136,0.2) !important;background:rgba(0,255,136,0.04) !important;}" +
    " .reaction-cell:active{border-color:#00ff88 !important;box-shadow:0 0 15px rgba(0,255,136,0.3) !important;}" +
    " .emoji-picker-sheet,.text-input-sheet,.meme-picker-sheet{background:#0a0a1a !important;border:1px solid rgba(0,255,136,0.2) !important;}" +
    " .text-input-field{border:1px solid rgba(0,255,136,0.2) !important;background:rgba(0,255,136,0.04) !important;color:#d0ffe8 !important;}" +
    " .text-input-field:focus{box-shadow:0 0 10px rgba(0,255,136,0.3) !important;}" +
    " .meme-pick-btn{border:1px solid rgba(0,255,136,0.15) !important;background:rgba(0,255,136,0.04) !important;}" +
    " .youreup-play-btn{border-radius:0 !important;border:1px solid #00ff88 !important;box-shadow:0 0 30px rgba(0,255,136,0.4),0 0 60px rgba(0,255,136,0.2) !important;}" +
    " .youreup-art{border-radius:0 !important;border:1px solid rgba(0,255,136,0.3) !important;box-shadow:0 0 20px rgba(0,255,136,0.2) !important;}" +
    " .youreup-skip-btn{border:1px solid #00ff88 !important;border-radius:0 !important;color:#00ff88 !important;background:rgba(0,255,136,0.04) !important;box-shadow:0 0 15px rgba(0,255,136,0.2) !important;}" +
    " .skip-confirm-card{background:#0a0a1a !important;border:1px solid #00ff88 !important;box-shadow:0 0 30px rgba(0,255,136,0.25) !important;border-radius:0 !important;}" +
    " .skip-confirm-btn-ghost{border:1px solid rgba(0,255,136,0.4) !important;color:#d0ffe8 !important;border-radius:0 !important;}" +
    " .skip-confirm-btn-danger{background:#ff0055 !important;border:1px solid #ff0055 !important;color:#fff !important;border-radius:0 !important;box-shadow:0 0 20px rgba(255,0,85,0.4) !important;}" +
    /* ---- Awards: Create page ---- */
    " .awards-detail-info h2{color:#d0ffe8 !important;text-shadow:0 0 8px rgba(0,255,136,0.4) !important;}" +
    " .awards-detail-info p{color:rgba(0,255,136,0.7) !important;}" +
    " .awards-field-label{color:#00ff88 !important;text-shadow:0 0 6px rgba(0,255,136,0.3) !important;}" +
    " .awards-detail-back{border:1px solid rgba(0,255,136,0.4) !important;background:rgba(0,255,136,0.04) !important;color:#00ff88 !important;border-radius:0 !important;}" +
    " .awards-text-input,.awards-picker-search{border:1px solid rgba(0,255,136,0.3) !important;background:rgba(0,255,136,0.04) !important;color:#d0ffe8 !important;border-radius:0 !important;}" +
    " .awards-text-input::placeholder,.awards-picker-search::placeholder{color:rgba(0,255,136,0.4) !important;}" +
    " .awards-text-input:focus,.awards-picker-search:focus{border-color:#00ff88 !important;box-shadow:0 0 12px rgba(0,255,136,0.3) !important;}" +
    " .awards-segmented{border:1px solid rgba(0,255,136,0.25) !important;background:rgba(0,255,136,0.04) !important;border-radius:0 !important;padding:4px !important;}" +
    " .awards-segmented button{color:#d0ffe8 !important;border-radius:0 !important;font-family:'Share Tech Mono',monospace !important;text-transform:uppercase !important;letter-spacing:0.08em !important;}" +
    " .awards-segmented button.active{background:#00ff88 !important;color:#060610 !important;box-shadow:0 0 14px rgba(0,255,136,0.55) !important;}" +
    " .awards-visual-toggle button{border:1px solid rgba(0,255,136,0.35) !important;background:rgba(0,255,136,0.04) !important;color:#00ff88 !important;border-radius:0 !important;font-family:'Share Tech Mono',monospace !important;text-transform:uppercase !important;letter-spacing:0.08em !important;}" +
    " .awards-visual-toggle button.active{background:#00ff88 !important;color:#060610 !important;border-color:#00ff88 !important;box-shadow:0 0 16px rgba(0,255,136,0.55) !important;}" +
    " .awards-visual-toggle .awards-or{color:#00ff88 !important;}" +
    " .awards-icon-grid{border:1px solid rgba(0,255,136,0.25) !important;background:rgba(6,6,16,0.6) !important;border-radius:0 !important;}" +
    " .awards-icon-grid button{border:1px solid rgba(0,255,136,0.2) !important;background:rgba(0,255,136,0.04) !important;color:#00ff88 !important;border-radius:0 !important;}" +
    " .awards-icon-grid button.active{background:rgba(0,255,136,0.18) !important;color:#00ff88 !important;border-color:#00ff88 !important;box-shadow:0 0 14px rgba(0,255,136,0.5) !important;}" +
    " .awards-btn{border:1px solid rgba(0,255,136,0.5) !important;background:rgba(0,255,136,0.06) !important;color:#00ff88 !important;border-radius:0 !important;font-family:'Share Tech Mono',monospace !important;text-transform:uppercase !important;letter-spacing:0.1em !important;text-shadow:0 0 6px rgba(0,255,136,0.4) !important;}" +
    " .awards-btn--primary{background:#00ff88 !important;color:#060610 !important;border:1px solid #00ff88 !important;box-shadow:0 0 18px rgba(0,255,136,0.55),0 0 36px rgba(0,255,136,0.25) !important;text-shadow:none !important;}" +
    " .awards-btn--danger{background:#ff0055 !important;color:#fff !important;border:1px solid #ff0055 !important;box-shadow:0 0 18px rgba(255,0,85,0.45) !important;text-shadow:none !important;}";
  }else if(activeTheme==="sketch"){
    css=":root{--black:#fdfbf7;--surface-1:rgba(45,93,161,0.05);--surface-2:rgba(45,45,45,0.06);--surface-3:rgba(45,45,45,0.1);--white:#2d2d2d;--white-muted:rgba(45,45,45,0.65);--white-faint:rgba(45,45,45,0.4);--white-ghost:rgba(45,45,45,0.15);--violet:#2d5da1;--pink:#ff4d4d;--cyan:#2d5da1;--emerald:#4caf50;--amber:#fff9c4;--red:#ff4d4d;--grad-hero:linear-gradient(135deg, #ff4d4d, #2d5da1);--grad-text:linear-gradient(135deg, #ff4d4d, #2d5da1);--font-display:'Kalam', cursive;--font-body:'Patrick Hand', cursive;}" +
    " .mesh-bg{background:radial-gradient(#e5e0d8 1px, transparent 1px) !important;background-size:24px 24px !important;animation:none !important;}" +
    " .song-card,.config-section,.queue-item,.singer-card,.request-song-cta{border:3px solid #2d2d2d !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;box-shadow:4px 4px 0px #2d2d2d !important;background:#ffffff !important;}" +
    " .now-playing-card{border:3px solid #2d2d2d !important;border-radius:25px 225px 15px 255px / 255px 15px 225px 15px !important;box-shadow:4px 4px 0px #2d2d2d !important;background:#fff9c4 !important;animation:none !important;}" +
    " .join-btn,.add-queue-btn,.profile-save-btn{background:#ff4d4d !important;color:#ffffff !important;border:3px solid #2d2d2d !important;box-shadow:4px 4px 0px #2d2d2d !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;}" +
    " .join-btn:active,.add-queue-btn:active,.profile-save-btn:active{box-shadow:2px 2px 0px #2d2d2d !important;transform:translate(2px,2px) !important;}" +
    " .singer-count-btn{border:3px solid #2d2d2d !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;background:#ffffff !important;color:#2d2d2d !important;box-shadow:3px 3px 0px #2d2d2d !important;}" +
    " .singer-count-btn.active{background:#fff9c4 !important;}" +
    " .role-btn{border:2px dashed #2d2d2d !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;background:#ffffff !important;color:#2d2d2d !important;}" +
    " .role-btn.active{background:#2d5da1 !important;color:#ffffff !important;border-style:solid !important;}" +
    " .join-input,.search-input,.singer-name-input,.profile-name-input{border:2px dashed rgba(45,45,45,0.3) !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;background:#ffffff !important;color:#2d2d2d !important;}" +
    " .join-input:focus,.search-input:focus,.singer-name-input:focus,.profile-name-input:focus{border-color:#2d5da1 !important;border-style:solid !important;}" +
    " .bottom-nav{background:rgba(253,251,247,0.95) !important;border-top:3px solid #2d2d2d !important;}" +
    " .songs-header,.req-header{background:rgba(253,251,247,0.95) !important;}" +
    " .song-card-plus{background:#fff9c4 !important;border:2.5px solid #2d2d2d !important;border-radius:255px 15px 225px 15px/15px 225px 15px 255px !important;color:#2d5da1 !important;box-shadow:2px 2px 0 #2d2d2d !important;width:36px !important;height:36px !important;}" +
    " .song-card-added{background:#fff9c4 !important;border:2.5px dashed #2d2d2d !important;border-radius:140px 12px 120px 12px/12px 120px 12px 140px !important;color:#2d2d2d !important;font-family:'Kalam',cursive !important;font-weight:700 !important;text-transform:none !important;letter-spacing:0 !important;font-size:12px !important;padding:4px 12px !important;box-shadow:2px 2px 0 #2d2d2d !important;}" +
    " .avatar-upload,.profile-avatar{border:3px dashed #2d2d2d !important;}" +
    " .guest-picker-pill{border:2px dashed #2d2d2d !important;background:#ffffff !important;color:#2d2d2d !important;}" +
    " .guest-picker-pill.selected{background:#fff9c4 !important;border-style:solid !important;}" +
    " .reaction-cell{border:3px solid #2d2d2d !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;box-shadow:4px 4px 0px #2d2d2d !important;background:#ffffff !important;}" +
    " .reaction-cell:active{box-shadow:2px 2px 0px #2d2d2d !important;transform:translate(2px,2px) rotate(1deg) !important;}" +
    " .emoji-picker-sheet,.text-input-sheet,.meme-picker-sheet{background:#fdfbf7 !important;border:3px solid #2d2d2d !important;}" +
    " .text-input-field{border:2px dashed rgba(45,45,45,0.3) !important;background:#ffffff !important;color:#2d2d2d !important;}" +
    " .text-input-send{background:#ff4d4d !important;border:3px solid #2d2d2d !important;box-shadow:3px 3px 0px #2d2d2d !important;}" +
    " .meme-pick-btn{border:3px solid #2d2d2d !important;box-shadow:3px 3px 0px #2d2d2d !important;background:#ffffff !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;}" +
    " button:hover{transform:rotate(1deg) !important;}" +
    " .youreup-screen{background:#fdfbf7 !important;}" +
    " .youreup-play-btn{border:3px solid #2d2d2d !important;box-shadow:6px 6px 0px #2d2d2d !important;border-radius:50% !important;}" +
    " .youreup-play-btn svg{fill:#2d5da1 !important;}" +
    " .youreup-play-btn:active{box-shadow:2px 2px 0px #2d2d2d !important;transform:translate(4px,4px) rotate(1deg) !important;}" +
    " .youreup-art{border:3px dashed #2d2d2d !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;box-shadow:4px 4px 0px #2d2d2d !important;}" +
    " .youreup-skip-btn{border:2px dashed #2d2d2d !important;background:#ffffff !important;color:#2d2d2d !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;box-shadow:3px 3px 0px #2d2d2d !important;}" +
    " .youreup-skip-btn:active{box-shadow:1px 1px 0px #2d2d2d !important;transform:translate(2px,2px) rotate(1deg) !important;}" +
    " .skip-confirm-card{background:#fdfbf7 !important;border:3px solid #2d2d2d !important;box-shadow:6px 6px 0px #2d2d2d !important;border-radius:25px 225px 15px 255px / 255px 15px 225px 15px !important;}" +
    " .skip-confirm-title{color:#2d2d2d !important;}" +
    " .skip-confirm-sub{color:rgba(45,45,45,0.65) !important;}" +
    " .skip-confirm-btn-ghost{border:2px dashed #2d2d2d !important;background:#ffffff !important;color:#2d2d2d !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;}" +
    " .skip-confirm-btn-danger{border:3px solid #2d2d2d !important;background:#ff4d4d !important;color:#ffffff !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;box-shadow:3px 3px 0px #2d2d2d !important;}" +
    /* ---- Awards: Create page ---- */
    " .awards-detail-info h2{color:#2d2d2d !important;}" +
    " .awards-detail-info p{color:rgba(45,45,45,0.65) !important;}" +
    " .awards-field-label{color:#2d2d2d !important;font-family:'Kalam',cursive !important;}" +
    " .awards-detail-back{border:3px solid #2d2d2d !important;background:#ffffff !important;color:#2d2d2d !important;border-radius:50% !important;box-shadow:2px 2px 0px #2d2d2d !important;}" +
    " .awards-text-input,.awards-picker-search{border:2px dashed rgba(45,45,45,0.4) !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;background:#ffffff !important;color:#2d2d2d !important;}" +
    " .awards-text-input::placeholder,.awards-picker-search::placeholder{color:rgba(45,45,45,0.4) !important;}" +
    " .awards-text-input:focus,.awards-picker-search:focus{border-color:#2d5da1 !important;border-style:solid !important;}" +
    " .awards-segmented{border:3px solid #2d2d2d !important;background:#ffffff !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;box-shadow:3px 3px 0px #2d2d2d !important;padding:4px !important;}" +
    " .awards-segmented button{color:#2d2d2d !important;font-family:'Kalam',cursive !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;}" +
    " .awards-segmented button.active{background:#2d5da1 !important;color:#fdfbf7 !important;}" +
    " .awards-visual-toggle button{border:2px dashed #2d2d2d !important;background:#ffffff !important;color:#2d2d2d !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;}" +
    " .awards-visual-toggle button.active{background:#fff9c4 !important;border-style:solid !important;color:#2d2d2d !important;box-shadow:3px 3px 0px #2d2d2d !important;}" +
    " .awards-visual-toggle .awards-or{color:#2d2d2d !important;font-family:'Kalam',cursive !important;font-style:italic !important;}" +
    " .awards-icon-grid{border:3px solid #2d2d2d !important;background:#ffffff !important;border-radius:25px 225px 15px 255px / 255px 15px 225px 15px !important;box-shadow:4px 4px 0px #2d2d2d !important;}" +
    " .awards-icon-grid button{border:2px dashed rgba(45,45,45,0.3) !important;background:#ffffff !important;color:#2d2d2d !important;border-radius:127px 8px 99px 12px / 14px 99px 16px 127px !important;}" +
    " .awards-icon-grid button.active{background:#fff9c4 !important;color:#2d2d2d !important;border-style:solid !important;border-color:#2d5da1 !important;}" +
    " .awards-btn{border:3px solid #2d2d2d !important;background:#ffffff !important;color:#2d2d2d !important;border-radius:255px 15px 225px 15px / 15px 225px 15px 255px !important;box-shadow:3px 3px 0px #2d2d2d !important;font-family:'Kalam',cursive !important;}" +
    " .awards-btn:active{box-shadow:1px 1px 0px #2d2d2d !important;transform:translate(2px,2px) rotate(1deg) !important;}" +
    " .awards-btn--primary{background:#ff4d4d !important;color:#ffffff !important;border:3px solid #2d2d2d !important;box-shadow:3px 3px 0px #2d2d2d !important;}" +
    " .awards-btn--danger{background:#ff4d4d !important;color:#ffffff !important;border:3px solid #2d2d2d !important;box-shadow:3px 3px 0px #2d2d2d !important;}";
  }else if(activeTheme==="urban"){
    css=":root{--black:#050505;--surface-1:rgba(212,255,0,0.04);--surface-2:rgba(212,255,0,0.06);--surface-3:rgba(212,255,0,0.1);--white:#f0f0f0;--white-muted:rgba(176,176,176,0.8);--white-faint:rgba(176,176,176,0.5);--white-ghost:rgba(212,255,0,0.1);--violet:#D4FF00;--pink:#FF1E1E;--cyan:#00F0FF;--emerald:#D4FF00;--amber:#FFA600;--red:#FF1E1E;--grad-hero:linear-gradient(135deg, #D4FF00, #FF1E1E);--grad-text:linear-gradient(135deg, #D4FF00, #FF1E1E);--font-display:'Permanent Marker', cursive;--font-body:'Oswald', sans-serif;}" +
    " .mesh-bg{background:radial-gradient(circle at 50% 30%, #1c1c1c 0%, #030303 80%) !important;animation:none !important;}" +
    " body::after{content:'';position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:1000;opacity:0.12;background-image:url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\");mix-blend-mode:overlay;}" +
    " .song-card,.config-section,.queue-item,.singer-card,.request-song-cta{clip-path:polygon(2% 0%, 100% 0%, 98% 100%, 0% 100%) !important;border-radius:0 !important;border:none !important;background:rgba(212,255,0,0.06) !important;}" +
    " .now-playing-card{clip-path:polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%) !important;border-radius:0 !important;border:none !important;background:rgba(212,255,0,0.1) !important;animation:none !important;}" +
    " .join-btn,.add-queue-btn,.profile-save-btn{background:#D4FF00 !important;color:#050505 !important;border:none !important;border-radius:0 !important;clip-path:polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%) !important;font-family:'Oswald',sans-serif !important;font-weight:700 !important;text-transform:uppercase !important;letter-spacing:3px !important;box-shadow:none !important;}" +
    " .join-btn:active,.add-queue-btn:active,.profile-save-btn:active{clip-path:polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%) !important;transform:scale(0.95) !important;}" +
    " .singer-count-btn{border:1px solid rgba(212,255,0,0.2) !important;border-radius:0 !important;clip-path:polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%) !important;background:rgba(212,255,0,0.04) !important;color:#B0B0B0 !important;}" +
    " .singer-count-btn.active{background:rgba(212,255,0,0.15) !important;color:#D4FF00 !important;border-color:#D4FF00 !important;}" +
    " .role-btn{border:1px solid rgba(212,255,0,0.15) !important;border-radius:0 !important;background:rgba(212,255,0,0.04) !important;color:#B0B0B0 !important;clip-path:polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%) !important;}" +
    " .role-btn.active{background:rgba(212,255,0,0.15) !important;color:#D4FF00 !important;border-color:#D4FF00 !important;}" +
    " .join-input,.search-input,.singer-name-input,.profile-name-input{border:1px solid rgba(212,255,0,0.15) !important;border-radius:0 !important;background:rgba(212,255,0,0.04) !important;color:#f0f0f0 !important;}" +
    " .join-input:focus,.search-input:focus,.singer-name-input:focus,.profile-name-input:focus{border-color:transparent !important;box-shadow:0 0 15px #D4FF00, 0 0 5px #D4FF00 inset !important;}" +
    " .bottom-nav{background:rgba(5,5,5,0.95) !important;border-top:1px solid rgba(212,255,0,0.15) !important;}" +
    " .songs-header,.req-header{background:rgba(5,5,5,0.95) !important;}" +
    " .song-card-plus{background:#D4FF00 !important;color:#050505 !important;border:none !important;border-radius:0 !important;clip-path:polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%) !important;box-shadow:0 0 12px rgba(212,255,0,0.55) !important;width:38px !important;height:34px !important;}" +
    " .song-card-added{background:#D4FF00 !important;color:#050505 !important;border:none !important;border-radius:0 !important;clip-path:polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%) !important;font-family:'Oswald',sans-serif !important;font-weight:700 !important;letter-spacing:2px !important;text-transform:uppercase !important;padding:6px 12px !important;box-shadow:0 0 12px rgba(212,255,0,0.45) !important;}" +
    " .songs-title,.req-title,.queue-title,.join-title,.profile-title{font-family:'Permanent Marker',cursive !important;text-transform:uppercase !important;letter-spacing:3px !important;}" +
    " .avatar-upload,.profile-avatar{border-color:rgba(212,255,0,0.3) !important;}" +
    " .guest-picker-pill{border:1px solid rgba(212,255,0,0.15) !important;background:rgba(212,255,0,0.04) !important;color:#B0B0B0 !important;border-radius:0 !important;}" +
    " .guest-picker-pill.selected{background:rgba(212,255,0,0.15) !important;color:#D4FF00 !important;border-color:#D4FF00 !important;}" +
    " .reaction-cell{border:1px solid rgba(212,255,0,0.15) !important;border-radius:0 !important;clip-path:polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%) !important;background:rgba(212,255,0,0.04) !important;}" +
    " .reaction-cell:active{background:rgba(212,255,0,0.12) !important;box-shadow:0 0 15px rgba(212,255,0,0.2) !important;}" +
    " .emoji-picker-sheet,.text-input-sheet,.meme-picker-sheet{background:#0a0a0a !important;border:1px solid rgba(212,255,0,0.2) !important;}" +
    " .text-input-field{border:1px solid rgba(212,255,0,0.15) !important;background:rgba(212,255,0,0.04) !important;color:#f0f0f0 !important;border-radius:0 !important;}" +
    " .text-input-field:focus{box-shadow:0 0 15px #D4FF00, 0 0 5px #D4FF00 inset !important;}" +
    " .text-input-send{background:#D4FF00 !important;color:#050505 !important;border-radius:0 !important;clip-path:polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%) !important;}" +
    " .meme-pick-btn{border:1px solid rgba(212,255,0,0.15) !important;background:rgba(212,255,0,0.04) !important;border-radius:0 !important;}" +
    " .youreup-play-btn{border-radius:0 !important;border:none !important;clip-path:polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%) !important;box-shadow:0 0 30px rgba(212,255,0,0.4),0 0 60px rgba(212,255,0,0.2) !important;}" +
    " .youreup-art{border-radius:0 !important;clip-path:polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%) !important;box-shadow:none !important;}" +
    " .youreup-title{font-family:'Permanent Marker',cursive !important;text-transform:uppercase !important;letter-spacing:3px !important;}" +
    " .youreup-skip-btn{clip-path:polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%) !important;border:1px solid #D4FF00 !important;border-radius:0 !important;background:rgba(212,255,0,0.08) !important;color:#D4FF00 !important;text-transform:uppercase !important;font-family:'Oswald',sans-serif !important;letter-spacing:2px !important;}" +
    " .skip-confirm-card{background:#0a0a0a !important;border:1px solid #D4FF00 !important;border-radius:0 !important;clip-path:polygon(2% 0%, 100% 0%, 98% 100%, 0% 100%) !important;box-shadow:0 0 30px rgba(212,255,0,0.25) !important;}" +
    " .skip-confirm-title{font-family:'Permanent Marker',cursive !important;text-transform:uppercase !important;letter-spacing:3px !important;}" +
    " .skip-confirm-btn-ghost{border:1px solid rgba(212,255,0,0.4) !important;background:rgba(212,255,0,0.04) !important;color:#f0f0f0 !important;border-radius:0 !important;clip-path:polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%) !important;text-transform:uppercase !important;font-family:'Oswald',sans-serif !important;letter-spacing:2px !important;}" +
    " .skip-confirm-btn-danger{background:#FF1E1E !important;border:1px solid #FF1E1E !important;color:#fff !important;border-radius:0 !important;clip-path:polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%) !important;text-transform:uppercase !important;font-family:'Oswald',sans-serif !important;letter-spacing:2px !important;box-shadow:0 0 20px rgba(255,30,30,0.4) !important;}" +
    /* ---- Awards: Create page ---- */
    " .awards-detail-info h2{color:#f0f0f0 !important;font-family:'Permanent Marker',cursive !important;text-transform:uppercase !important;letter-spacing:2px !important;}" +
    " .awards-detail-info p{color:rgba(176,176,176,0.85) !important;}" +
    " .awards-field-label{color:#D4FF00 !important;font-family:'Oswald',sans-serif !important;}" +
    " .awards-detail-back{border:1px solid rgba(212,255,0,0.4) !important;background:rgba(212,255,0,0.06) !important;color:#D4FF00 !important;border-radius:0 !important;}" +
    " .awards-text-input,.awards-picker-search{border:1px solid rgba(212,255,0,0.3) !important;background:rgba(212,255,0,0.04) !important;color:#f0f0f0 !important;border-radius:0 !important;}" +
    " .awards-text-input::placeholder,.awards-picker-search::placeholder{color:rgba(176,176,176,0.5) !important;}" +
    " .awards-text-input:focus,.awards-picker-search:focus{box-shadow:0 0 15px #D4FF00 !important;border-color:#D4FF00 !important;}" +
    " .awards-segmented{border:1px solid rgba(212,255,0,0.3) !important;background:rgba(212,255,0,0.05) !important;border-radius:0 !important;padding:3px !important;}" +
    " .awards-segmented button{color:#f0f0f0 !important;border-radius:0 !important;font-family:'Oswald',sans-serif !important;text-transform:uppercase !important;letter-spacing:2px !important;font-weight:700 !important;}" +
    " .awards-segmented button.active{background:#D4FF00 !important;color:#050505 !important;box-shadow:0 0 14px rgba(212,255,0,0.5) !important;}" +
    " .awards-visual-toggle button{border:1px solid rgba(212,255,0,0.4) !important;background:rgba(212,255,0,0.05) !important;color:#D4FF00 !important;border-radius:0 !important;clip-path:polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%) !important;font-family:'Oswald',sans-serif !important;text-transform:uppercase !important;letter-spacing:2px !important;font-weight:700 !important;}" +
    " .awards-visual-toggle button.active{background:#D4FF00 !important;color:#050505 !important;border-color:#D4FF00 !important;box-shadow:0 0 18px rgba(212,255,0,0.55) !important;}" +
    " .awards-visual-toggle .awards-or{color:#D4FF00 !important;font-family:'Permanent Marker',cursive !important;}" +
    " .awards-icon-grid{border:1px solid rgba(212,255,0,0.2) !important;background:rgba(5,5,5,0.5) !important;border-radius:0 !important;}" +
    " .awards-icon-grid button{border:1px solid rgba(212,255,0,0.15) !important;background:rgba(212,255,0,0.04) !important;color:#D4FF00 !important;border-radius:0 !important;}" +
    " .awards-icon-grid button.active{background:rgba(212,255,0,0.18) !important;color:#D4FF00 !important;border-color:#D4FF00 !important;box-shadow:0 0 14px rgba(212,255,0,0.45) !important;}" +
    " .awards-btn{border:1px solid #D4FF00 !important;background:rgba(212,255,0,0.06) !important;color:#D4FF00 !important;border-radius:0 !important;clip-path:polygon(3% 0%, 100% 0%, 97% 100%, 0% 100%) !important;font-family:'Oswald',sans-serif !important;text-transform:uppercase !important;letter-spacing:2px !important;}" +
    " .awards-btn--primary{background:#D4FF00 !important;color:#050505 !important;border:1px solid #D4FF00 !important;box-shadow:0 0 20px rgba(212,255,0,0.5) !important;font-weight:700 !important;}" +
    " .awards-btn--danger{background:#FF1E1E !important;border:1px solid #FF1E1E !important;color:#fff !important;box-shadow:0 0 18px rgba(255,30,30,0.45) !important;}";
  }else if(activeTheme==="deep-sea"){
    css=":root{--black:#040918;--surface-1:rgba(0,255,200,0.04);--surface-2:rgba(0,255,200,0.07);--surface-3:rgba(0,255,200,0.1);--white:#e0fff8;--white-muted:rgba(142,207,194,0.8);--white-faint:rgba(142,207,194,0.4);--white-ghost:rgba(0,255,200,0.1);--violet:#b44dff;--pink:#ff6b8a;--cyan:#00ffc8;--emerald:#00ffc8;--amber:#ffc857;--red:#ff6b8a;--grad-hero:linear-gradient(135deg, #00ffc8, #b44dff);--grad-text:linear-gradient(135deg, #00ffc8, #b44dff);--font-display:'Quicksand', sans-serif;--font-body:'Nunito', sans-serif;}" +
    " .mesh-bg{background:radial-gradient(ellipse at 30% 40%, rgba(0,255,200,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(180,77,255,0.03) 0%, transparent 60%) !important;animation:none !important;}" +
    " .song-card,.config-section,.queue-item,.singer-card,.request-song-cta{border:1px solid rgba(0,255,200,0.12) !important;background:rgba(12,29,66,0.75) !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;border-radius:12px !important;box-shadow:0 0 8px rgba(0,255,200,0.08), 0 0 20px rgba(0,255,200,0.04) !important;}" +
    " .now-playing-card{border:1px solid rgba(180,77,255,0.3) !important;background:rgba(180,77,255,0.15) !important;border-radius:12px !important;box-shadow:0 0 14px rgba(180,77,255,0.2) !important;animation:none !important;}" +
    " .join-btn,.add-queue-btn,.profile-save-btn{background:rgba(0,255,200,0.12) !important;color:#e0fff8 !important;border:1px solid rgba(0,255,200,0.4) !important;border-radius:8px !important;box-shadow:0 0 10px rgba(0,255,200,0.25) !important;text-shadow:0 0 8px rgba(0,255,200,0.5) !important;}" +
    " .join-btn:active,.add-queue-btn:active,.profile-save-btn:active{box-shadow:0 0 20px rgba(0,255,200,0.4) !important;}" +
    " .singer-count-btn{border:1px solid rgba(0,255,200,0.15) !important;background:rgba(0,255,200,0.04) !important;color:#8ecfc2 !important;border-radius:8px !important;}" +
    " .singer-count-btn.active{background:rgba(0,255,200,0.15) !important;color:#00ffc8 !important;border-color:#00ffc8 !important;}" +
    " .role-btn{border:1px solid rgba(0,255,200,0.12) !important;background:rgba(0,255,200,0.04) !important;color:#8ecfc2 !important;border-radius:8px !important;}" +
    " .role-btn.active{background:rgba(180,77,255,0.15) !important;color:#b44dff !important;border-color:rgba(180,77,255,0.4) !important;}" +
    " .join-input,.search-input,.singer-name-input,.profile-name-input{border:1px solid rgba(0,255,200,0.15) !important;background:rgba(0,255,200,0.04) !important;color:#e0fff8 !important;border-radius:8px !important;}" +
    " .join-input:focus,.search-input:focus,.singer-name-input:focus,.profile-name-input:focus{box-shadow:0 0 0 2px rgba(0,255,200,0.35), 0 0 16px rgba(0,255,200,0.2) !important;border-color:#00ffc8 !important;}" +
    " .join-input::placeholder,.search-input::placeholder,.singer-name-input::placeholder,.profile-name-input::placeholder{color:rgba(142,207,194,0.4) !important;}" +
    " .bottom-nav{background:rgba(4,9,24,0.95) !important;border-top:1px solid rgba(0,255,200,0.12) !important;}" +
    " .songs-header,.req-header{background:rgba(4,9,24,0.95) !important;}" +
    " .song-card-plus{background:rgba(0,255,200,0.18) !important;border:1px solid #00ffc8 !important;color:#00ffc8 !important;border-radius:50% !important;box-shadow:0 0 14px rgba(0,255,200,0.55),0 0 28px rgba(0,255,200,0.25) !important;}" +
    " .song-card-added{background:rgba(0,255,200,0.12) !important;border:1px solid rgba(0,255,200,0.55) !important;color:#00ffc8 !important;font-family:'Quicksand',sans-serif !important;font-weight:700 !important;letter-spacing:1.2px !important;text-transform:none !important;text-shadow:0 0 8px rgba(0,255,200,0.55) !important;border-radius:999px !important;padding:5px 11px !important;backdrop-filter:blur(6px) !important;-webkit-backdrop-filter:blur(6px) !important;}" +
    " .avatar-upload,.profile-avatar{border-color:rgba(0,255,200,0.3) !important;}" +
    " .guest-picker-pill{border:1px solid rgba(0,255,200,0.12) !important;background:rgba(0,255,200,0.04) !important;color:#8ecfc2 !important;border-radius:8px !important;}" +
    " .guest-picker-pill.selected{background:rgba(0,255,200,0.15) !important;color:#00ffc8 !important;border-color:#00ffc8 !important;}" +
    " .reaction-cell{border:1px solid rgba(0,255,200,0.12) !important;background:rgba(12,29,66,0.75) !important;border-radius:12px !important;box-shadow:0 0 8px rgba(0,255,200,0.08) !important;}" +
    " .reaction-cell:active{border-color:#00ffc8 !important;box-shadow:0 0 15px rgba(0,255,200,0.3) !important;}" +
    " .emoji-picker-sheet,.text-input-sheet,.meme-picker-sheet{background:#071228 !important;border:1px solid rgba(0,255,200,0.15) !important;}" +
    " .text-input-field{border:1px solid rgba(0,255,200,0.15) !important;background:rgba(0,255,200,0.04) !important;color:#e0fff8 !important;border-radius:8px !important;}" +
    " .text-input-field:focus{box-shadow:0 0 10px rgba(0,255,200,0.3) !important;}" +
    " .text-input-send{background:rgba(0,255,200,0.12) !important;color:#e0fff8 !important;border:1px solid rgba(0,255,200,0.4) !important;border-radius:8px !important;}" +
    " .meme-pick-btn{border:1px solid rgba(0,255,200,0.12) !important;background:rgba(0,255,200,0.04) !important;border-radius:12px !important;}" +
    " .youreup-screen{background:#040918 !important;}" +
    " .youreup-play-btn{border:1px solid #00ffc8 !important;box-shadow:0 0 30px rgba(0,255,200,0.4),0 0 60px rgba(0,255,200,0.2) !important;}" +
    " .youreup-art{border:1px solid rgba(0,255,200,0.2) !important;border-radius:12px !important;box-shadow:0 0 20px rgba(0,255,200,0.15) !important;}" +
    " .youreup-skip-btn{border:1px solid rgba(0,255,200,0.4) !important;border-radius:8px !important;background:rgba(0,255,200,0.06) !important;color:#00ffc8 !important;box-shadow:0 0 12px rgba(0,255,200,0.15) !important;}" +
    " .skip-confirm-card{background:#071228 !important;border:1px solid rgba(0,255,200,0.3) !important;border-radius:12px !important;box-shadow:0 0 30px rgba(0,255,200,0.2) !important;}" +
    " .skip-confirm-btn-ghost{border:1px solid rgba(0,255,200,0.3) !important;background:rgba(0,255,200,0.04) !important;color:#e0fff8 !important;border-radius:8px !important;}" +
    " .skip-confirm-btn-danger{background:#ff6b8a !important;border:1px solid #ff6b8a !important;color:#fff !important;border-radius:8px !important;box-shadow:0 0 20px rgba(255,107,138,0.4) !important;}" +
    /* ---- Awards: Create page ---- */
    " .awards-detail-info h2{color:#e0fff8 !important;text-shadow:0 0 10px rgba(0,255,200,0.3) !important;}" +
    " .awards-detail-info p{color:rgba(142,207,194,0.85) !important;}" +
    " .awards-field-label{color:#00ffc8 !important;text-shadow:0 0 6px rgba(0,255,200,0.3) !important;}" +
    " .awards-detail-back{border:1px solid rgba(0,255,200,0.3) !important;background:rgba(0,255,200,0.04) !important;color:#00ffc8 !important;border-radius:12px !important;}" +
    " .awards-text-input,.awards-picker-search{border:1px solid rgba(0,255,200,0.25) !important;background:rgba(0,255,200,0.04) !important;color:#e0fff8 !important;border-radius:10px !important;}" +
    " .awards-text-input::placeholder,.awards-picker-search::placeholder{color:rgba(142,207,194,0.4) !important;}" +
    " .awards-text-input:focus,.awards-picker-search:focus{border-color:#00ffc8 !important;box-shadow:0 0 0 2px rgba(0,255,200,0.3),0 0 16px rgba(0,255,200,0.2) !important;}" +
    " .awards-segmented{border:1px solid rgba(0,255,200,0.2) !important;background:rgba(0,255,200,0.04) !important;border-radius:10px !important;padding:4px !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;}" +
    " .awards-segmented button{color:#8ecfc2 !important;border-radius:6px !important;font-family:'Quicksand',sans-serif !important;}" +
    " .awards-segmented button.active{background:linear-gradient(135deg,rgba(0,255,200,0.85),rgba(180,77,255,0.6)) !important;color:#040918 !important;box-shadow:0 0 12px rgba(0,255,200,0.4) !important;}" +
    " .awards-visual-toggle button{border:1px solid rgba(0,255,200,0.25) !important;background:rgba(0,255,200,0.04) !important;color:#8ecfc2 !important;border-radius:10px !important;font-family:'Quicksand',sans-serif !important;}" +
    " .awards-visual-toggle button.active{background:rgba(0,255,200,0.12) !important;color:#00ffc8 !important;border-color:#00ffc8 !important;box-shadow:0 0 14px rgba(0,255,200,0.4) !important;text-shadow:0 0 8px rgba(0,255,200,0.5) !important;}" +
    " .awards-visual-toggle .awards-or{color:#00ffc8 !important;}" +
    " .awards-icon-grid{border:1px solid rgba(0,255,200,0.2) !important;background:rgba(12,29,66,0.6) !important;border-radius:12px !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;box-shadow:0 0 10px rgba(0,255,200,0.08) !important;}" +
    " .awards-icon-grid button{border:1px solid rgba(0,255,200,0.15) !important;background:rgba(0,255,200,0.04) !important;color:#00ffc8 !important;border-radius:8px !important;}" +
    " .awards-icon-grid button.active{background:rgba(180,77,255,0.18) !important;color:#b44dff !important;border-color:#b44dff !important;box-shadow:0 0 14px rgba(180,77,255,0.4) !important;}" +
    " .awards-btn{border:1px solid rgba(0,255,200,0.35) !important;background:rgba(0,255,200,0.06) !important;color:#00ffc8 !important;border-radius:10px !important;text-shadow:0 0 6px rgba(0,255,200,0.4) !important;}" +
    " .awards-btn--primary{background:rgba(0,255,200,0.18) !important;color:#e0fff8 !important;border:1px solid #00ffc8 !important;box-shadow:0 0 18px rgba(0,255,200,0.4),0 0 36px rgba(0,255,200,0.18) !important;text-shadow:0 0 10px rgba(0,255,200,0.5) !important;}" +
    " .awards-btn--danger{background:#ff6b8a !important;color:#fff !important;border:1px solid #ff6b8a !important;box-shadow:0 0 18px rgba(255,107,138,0.4) !important;text-shadow:none !important;}";
  }else if(activeTheme==="psychedelic"){
    css=":root{--black:#1a0a2e;--surface-1:rgba(255,45,149,0.04);--surface-2:rgba(255,45,149,0.07);--surface-3:rgba(255,45,149,0.1);--white:#f5ecff;--white-muted:rgba(200,168,232,0.8);--white-faint:rgba(200,168,232,0.45);--white-ghost:rgba(255,45,149,0.1);--violet:#ff2d95;--pink:#ff2d95;--cyan:#b6ff2d;--emerald:#b6ff2d;--amber:#ff8c2d;--red:#ff2d95;--grad-hero:linear-gradient(135deg, #ff2d95, #b6ff2d, #ff8c2d);--grad-text:linear-gradient(135deg, #ff2d95, #b6ff2d);--font-display:'Chicle', cursive;--font-body:'Spicy Rice', cursive;}" +
    " .mesh-bg{background:radial-gradient(ellipse at 30% 40%, rgba(255,45,149,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(182,255,45,0.04) 0%, transparent 60%) !important;animation:none !important;}" +
    " .song-card,.config-section,.queue-item,.singer-card,.request-song-cta{border:1px solid rgba(255,45,149,0.15) !important;background:rgba(42,20,80,0.75) !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;border-radius:16px !important;box-shadow:0 0 8px rgba(255,45,149,0.1) !important;}" +
    " .now-playing-card{border:1px solid rgba(182,255,45,0.3) !important;background:rgba(182,255,45,0.12) !important;border-radius:16px !important;box-shadow:0 0 14px rgba(182,255,45,0.15) !important;animation:none !important;}" +
    " .join-btn,.add-queue-btn,.profile-save-btn{background:rgba(255,45,149,0.15) !important;color:#f5ecff !important;border:1px solid rgba(255,45,149,0.4) !important;border-radius:16px !important;box-shadow:0 0 10px rgba(255,45,149,0.25) !important;text-shadow:0 0 8px rgba(255,45,149,0.4) !important;}" +
    " .join-btn:active,.add-queue-btn:active,.profile-save-btn:active{box-shadow:0 0 20px rgba(255,45,149,0.4) !important;}" +
    " .singer-count-btn{border:1px solid rgba(255,45,149,0.15) !important;background:rgba(255,45,149,0.04) !important;color:#c8a8e8 !important;border-radius:16px !important;}" +
    " .singer-count-btn.active{background:rgba(255,45,149,0.15) !important;color:#ff2d95 !important;border-color:#ff2d95 !important;}" +
    " .role-btn{border:1px solid rgba(255,45,149,0.12) !important;background:rgba(255,45,149,0.04) !important;color:#c8a8e8 !important;border-radius:16px !important;}" +
    " .role-btn.active{background:rgba(182,255,45,0.12) !important;color:#b6ff2d !important;border-color:rgba(182,255,45,0.4) !important;}" +
    " .join-input,.search-input,.singer-name-input,.profile-name-input{border:1px solid rgba(255,45,149,0.15) !important;background:rgba(255,45,149,0.04) !important;color:#f5ecff !important;border-radius:16px !important;}" +
    " .join-input:focus,.search-input:focus,.singer-name-input:focus,.profile-name-input:focus{box-shadow:0 0 0 2px rgba(255,45,149,0.35), 0 0 16px rgba(255,45,149,0.2) !important;border-color:#ff2d95 !important;}" +
    " .join-input::placeholder,.search-input::placeholder,.singer-name-input::placeholder,.profile-name-input::placeholder{color:rgba(200,168,232,0.4) !important;}" +
    " .bottom-nav{background:rgba(26,10,46,0.95) !important;border-top:1px solid rgba(255,45,149,0.12) !important;}" +
    " .songs-header,.req-header{background:rgba(26,10,46,0.95) !important;}" +
    " .song-card-plus{background:rgba(255,45,149,0.2) !important;border:1px solid #ff2d95 !important;color:#ff2d95 !important;border-radius:50% !important;box-shadow:0 0 16px rgba(255,45,149,0.55),0 0 32px rgba(180,77,255,0.3) !important;}" +
    " .song-card-added{background:rgba(255,45,149,0.18) !important;border:1px solid rgba(255,45,149,0.55) !important;color:#ff2d95 !important;font-family:'Chicle',cursive !important;font-weight:400 !important;letter-spacing:0.5px !important;text-transform:none !important;text-shadow:0 0 8px rgba(255,45,149,0.55) !important;border-radius:999px !important;padding:5px 12px !important;font-size:12px !important;backdrop-filter:blur(6px) !important;-webkit-backdrop-filter:blur(6px) !important;}" +
    " .avatar-upload,.profile-avatar{border-color:rgba(255,45,149,0.3) !important;}" +
    " .guest-picker-pill{border:1px solid rgba(255,45,149,0.12) !important;background:rgba(255,45,149,0.04) !important;color:#c8a8e8 !important;border-radius:16px !important;}" +
    " .guest-picker-pill.selected{background:rgba(255,45,149,0.15) !important;color:#ff2d95 !important;border-color:#ff2d95 !important;}" +
    " .reaction-cell{border:1px solid rgba(255,45,149,0.15) !important;background:rgba(42,20,80,0.75) !important;border-radius:16px !important;box-shadow:0 0 8px rgba(255,45,149,0.08) !important;}" +
    " .reaction-cell:active{border-color:#ff2d95 !important;box-shadow:0 0 15px rgba(255,45,149,0.3) !important;}" +
    " .emoji-picker-sheet,.text-input-sheet,.meme-picker-sheet{background:#241040 !important;border:1px solid rgba(255,45,149,0.15) !important;}" +
    " .text-input-field{border:1px solid rgba(255,45,149,0.15) !important;background:rgba(255,45,149,0.04) !important;color:#f5ecff !important;border-radius:16px !important;}" +
    " .text-input-field:focus{box-shadow:0 0 10px rgba(255,45,149,0.3) !important;}" +
    " .text-input-send{background:rgba(255,45,149,0.15) !important;color:#f5ecff !important;border:1px solid rgba(255,45,149,0.4) !important;border-radius:16px !important;}" +
    " .meme-pick-btn{border:1px solid rgba(255,45,149,0.12) !important;background:rgba(255,45,149,0.04) !important;border-radius:16px !important;}" +
    " .youreup-screen{background:#1a0a2e !important;}" +
    " .youreup-play-btn{border:1px solid #ff2d95 !important;box-shadow:0 0 30px rgba(255,45,149,0.4),0 0 60px rgba(182,255,45,0.2) !important;}" +
    " .youreup-art{border:1px solid rgba(255,45,149,0.2) !important;border-radius:16px !important;box-shadow:0 0 20px rgba(255,45,149,0.15) !important;}" +
    " .youreup-skip-btn{border:1px solid rgba(255,45,149,0.4) !important;border-radius:16px !important;background:rgba(255,45,149,0.06) !important;color:#ff2d95 !important;box-shadow:0 0 12px rgba(255,45,149,0.2) !important;}" +
    " .skip-confirm-card{background:#241040 !important;border:1px solid rgba(255,45,149,0.3) !important;border-radius:16px !important;box-shadow:0 0 30px rgba(255,45,149,0.2) !important;}" +
    " .skip-confirm-btn-ghost{border:1px solid rgba(255,45,149,0.3) !important;background:rgba(255,45,149,0.04) !important;color:#f5ecff !important;border-radius:16px !important;}" +
    " .skip-confirm-btn-danger{background:#ff2d95 !important;border:1px solid #ff2d95 !important;color:#fff !important;border-radius:16px !important;box-shadow:0 0 20px rgba(255,45,149,0.4) !important;}" +
    /* ---- Awards: Create page ---- */
    " .awards-detail-info h2{color:#f5ecff !important;font-family:'Chicle',cursive !important;text-shadow:0 0 12px rgba(255,45,149,0.4) !important;}" +
    " .awards-detail-info p{color:rgba(200,168,232,0.9) !important;}" +
    " .awards-field-label{color:#ff2d95 !important;text-shadow:0 0 8px rgba(255,45,149,0.4) !important;}" +
    " .awards-detail-back{border:1px solid rgba(255,45,149,0.4) !important;background:rgba(255,45,149,0.06) !important;color:#ff2d95 !important;border-radius:16px !important;}" +
    " .awards-text-input,.awards-picker-search{border:1px solid rgba(255,45,149,0.3) !important;background:rgba(255,45,149,0.04) !important;color:#f5ecff !important;border-radius:16px !important;}" +
    " .awards-text-input::placeholder,.awards-picker-search::placeholder{color:rgba(200,168,232,0.45) !important;}" +
    " .awards-text-input:focus,.awards-picker-search:focus{border-color:#ff2d95 !important;box-shadow:0 0 0 2px rgba(255,45,149,0.35),0 0 16px rgba(255,45,149,0.2) !important;}" +
    " .awards-segmented{border:1px solid rgba(255,45,149,0.25) !important;background:rgba(255,45,149,0.04) !important;border-radius:16px !important;padding:4px !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;}" +
    " .awards-segmented button{color:#c8a8e8 !important;border-radius:12px !important;font-family:'Chicle',cursive !important;}" +
    " .awards-segmented button.active{background:linear-gradient(135deg,#ff2d95,#b6ff2d) !important;color:#1a0a2e !important;box-shadow:0 0 14px rgba(255,45,149,0.5) !important;}" +
    " .awards-visual-toggle button{border:1px solid rgba(255,45,149,0.3) !important;background:rgba(255,45,149,0.04) !important;color:#c8a8e8 !important;border-radius:16px !important;font-family:'Chicle',cursive !important;}" +
    " .awards-visual-toggle button.active{background:linear-gradient(135deg,rgba(255,45,149,0.25),rgba(182,255,45,0.18)) !important;color:#ff2d95 !important;border-color:#ff2d95 !important;box-shadow:0 0 16px rgba(255,45,149,0.45) !important;text-shadow:0 0 8px rgba(255,45,149,0.4) !important;}" +
    " .awards-visual-toggle .awards-or{color:#b6ff2d !important;font-family:'Chicle',cursive !important;text-shadow:0 0 8px rgba(182,255,45,0.5) !important;}" +
    " .awards-icon-grid{border:1px solid rgba(255,45,149,0.25) !important;background:rgba(42,20,80,0.6) !important;border-radius:16px !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;}" +
    " .awards-icon-grid button{border:1px solid rgba(255,45,149,0.18) !important;background:rgba(255,45,149,0.04) !important;color:#ff2d95 !important;border-radius:12px !important;}" +
    " .awards-icon-grid button.active{background:rgba(182,255,45,0.18) !important;color:#b6ff2d !important;border-color:#b6ff2d !important;box-shadow:0 0 14px rgba(182,255,45,0.5) !important;}" +
    " .awards-btn{border:1px solid rgba(255,45,149,0.4) !important;background:rgba(255,45,149,0.06) !important;color:#ff2d95 !important;border-radius:16px !important;text-shadow:0 0 6px rgba(255,45,149,0.4) !important;}" +
    " .awards-btn--primary{background:linear-gradient(135deg,#ff2d95,#b6ff2d) !important;color:#1a0a2e !important;border:1px solid #ff2d95 !important;box-shadow:0 0 22px rgba(255,45,149,0.55),0 0 44px rgba(182,255,45,0.25) !important;text-shadow:none !important;}" +
    " .awards-btn--danger{background:#ff2d95 !important;color:#fff !important;border:1px solid #ff2d95 !important;box-shadow:0 0 20px rgba(255,45,149,0.4) !important;text-shadow:none !important;}";
  }else if(activeTheme==="zen"){
    css=":root{--black:#1a1814;--surface-1:rgba(201,168,76,0.04);--surface-2:rgba(201,168,76,0.07);--surface-3:rgba(201,168,76,0.1);--white:#F0E6D3;--white-muted:rgba(184,168,152,0.8);--white-faint:rgba(184,168,152,0.45);--white-ghost:rgba(201,168,76,0.1);--violet:#D4442A;--pink:#E8A0BF;--cyan:#7BA05B;--emerald:#7BA05B;--amber:#D4B85A;--red:#D4442A;--grad-hero:linear-gradient(135deg, #D4442A, #D4B85A);--grad-text:linear-gradient(135deg, #D4442A, #D4B85A);--font-display:'Cormorant Garamond', Georgia, serif;--font-body:'Zen Kaku Gothic New', sans-serif;}" +
    " .mesh-bg{background:radial-gradient(ellipse at 30% 40%, rgba(201,168,76,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(139,107,74,0.03) 0%, transparent 60%) !important;animation:none !important;}" +
    " .song-card,.config-section,.queue-item,.singer-card,.request-song-cta{border:1px solid rgba(201,168,76,0.12) !important;background:rgba(46,40,32,0.75) !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;border-radius:10px !important;box-shadow:0 0 8px rgba(201,168,76,0.08) !important;}" +
    " .now-playing-card{border:1px solid rgba(212,68,42,0.3) !important;background:rgba(212,68,42,0.12) !important;border-radius:10px !important;box-shadow:0 0 14px rgba(212,68,42,0.15) !important;animation:none !important;}" +
    " .join-btn,.add-queue-btn,.profile-save-btn{background:rgba(212,68,42,0.12) !important;color:#F0E6D3 !important;border:1px solid rgba(212,68,42,0.4) !important;border-radius:6px !important;box-shadow:0 0 10px rgba(212,68,42,0.25) !important;text-shadow:0 0 8px rgba(212,68,42,0.4) !important;}" +
    " .join-btn:active,.add-queue-btn:active,.profile-save-btn:active{box-shadow:0 0 20px rgba(212,68,42,0.4) !important;}" +
    " .singer-count-btn{border:1px solid rgba(201,168,76,0.15) !important;background:rgba(201,168,76,0.04) !important;color:#B8A898 !important;border-radius:6px !important;}" +
    " .singer-count-btn.active{background:rgba(201,168,76,0.15) !important;color:#D4B85A !important;border-color:#D4B85A !important;}" +
    " .role-btn{border:1px solid rgba(201,168,76,0.12) !important;background:rgba(201,168,76,0.04) !important;color:#B8A898 !important;border-radius:6px !important;}" +
    " .role-btn.active{background:rgba(212,68,42,0.12) !important;color:#D4442A !important;border-color:rgba(212,68,42,0.4) !important;}" +
    " .join-input,.search-input,.singer-name-input,.profile-name-input{border:1px solid rgba(201,168,76,0.15) !important;background:rgba(201,168,76,0.04) !important;color:#F0E6D3 !important;border-radius:6px !important;}" +
    " .join-input:focus,.search-input:focus,.singer-name-input:focus,.profile-name-input:focus{box-shadow:0 0 0 2px rgba(201,168,76,0.35), 0 0 16px rgba(201,168,76,0.15) !important;border-color:#D4B85A !important;}" +
    " .join-input::placeholder,.search-input::placeholder,.singer-name-input::placeholder,.profile-name-input::placeholder{color:rgba(184,168,152,0.4) !important;}" +
    " .bottom-nav{background:rgba(26,24,20,0.95) !important;border-top:1px solid rgba(201,168,76,0.12) !important;}" +
    " .songs-header,.req-header{background:rgba(26,24,20,0.95) !important;}" +
    " .song-card-plus{background:rgba(212,184,90,0.18) !important;border:1px solid #D4B85A !important;color:#D4B85A !important;border-radius:6px !important;box-shadow:0 0 12px rgba(212,184,90,0.45) !important;}" +
    " .song-card-added{background:rgba(212,184,90,0.15) !important;border:1px solid rgba(212,184,90,0.55) !important;color:#D4B85A !important;font-family:'Cormorant Garamond',serif !important;font-style:italic !important;font-weight:600 !important;letter-spacing:1.5px !important;text-transform:none !important;text-shadow:0 0 6px rgba(212,184,90,0.4) !important;border-radius:4px !important;padding:5px 12px !important;font-size:12px !important;backdrop-filter:blur(6px) !important;-webkit-backdrop-filter:blur(6px) !important;}" +
    " .avatar-upload,.profile-avatar{border-color:rgba(201,168,76,0.3) !important;}" +
    " .guest-picker-pill{border:1px solid rgba(201,168,76,0.12) !important;background:rgba(201,168,76,0.04) !important;color:#B8A898 !important;border-radius:6px !important;}" +
    " .guest-picker-pill.selected{background:rgba(201,168,76,0.15) !important;color:#D4B85A !important;border-color:#D4B85A !important;}" +
    " .reaction-cell{border:1px solid rgba(201,168,76,0.12) !important;background:rgba(46,40,32,0.75) !important;border-radius:10px !important;box-shadow:0 0 8px rgba(201,168,76,0.08) !important;}" +
    " .reaction-cell:active{border-color:#D4B85A !important;box-shadow:0 0 15px rgba(201,168,76,0.3) !important;}" +
    " .emoji-picker-sheet,.text-input-sheet,.meme-picker-sheet{background:#231f1a !important;border:1px solid rgba(201,168,76,0.15) !important;}" +
    " .text-input-field{border:1px solid rgba(201,168,76,0.15) !important;background:rgba(201,168,76,0.04) !important;color:#F0E6D3 !important;border-radius:6px !important;}" +
    " .text-input-field:focus{box-shadow:0 0 10px rgba(201,168,76,0.3) !important;}" +
    " .text-input-send{background:rgba(212,68,42,0.12) !important;color:#F0E6D3 !important;border:1px solid rgba(212,68,42,0.4) !important;border-radius:6px !important;}" +
    " .meme-pick-btn{border:1px solid rgba(201,168,76,0.12) !important;background:rgba(201,168,76,0.04) !important;border-radius:10px !important;}" +
    " .youreup-screen{background:#1a1814 !important;}" +
    " .youreup-play-btn{border:1px solid #D4B85A !important;box-shadow:0 0 30px rgba(201,168,76,0.3),0 0 60px rgba(212,68,42,0.15) !important;}" +
    " .youreup-art{border:1px solid rgba(201,168,76,0.2) !important;border-radius:10px !important;box-shadow:0 0 20px rgba(201,168,76,0.1) !important;}" +
    " .youreup-skip-btn{border:1px solid rgba(201,168,76,0.4) !important;border-radius:6px !important;background:rgba(201,168,76,0.06) !important;color:#D4B85A !important;box-shadow:0 0 12px rgba(201,168,76,0.15) !important;}" +
    " .skip-confirm-card{background:#231f1a !important;border:1px solid rgba(201,168,76,0.3) !important;border-radius:10px !important;box-shadow:0 0 30px rgba(201,168,76,0.2) !important;}" +
    " .skip-confirm-btn-ghost{border:1px solid rgba(201,168,76,0.3) !important;background:rgba(201,168,76,0.04) !important;color:#F0E6D3 !important;border-radius:6px !important;}" +
    " .skip-confirm-btn-danger{background:#D4442A !important;border:1px solid #D4442A !important;color:#F0E6D3 !important;border-radius:6px !important;box-shadow:0 0 20px rgba(212,68,42,0.4) !important;}" +
    /* ---- Awards: Create page ---- */
    " .awards-detail-info h2{color:#F0E6D3 !important;font-family:'Cormorant Garamond',serif !important;font-style:italic !important;}" +
    " .awards-detail-info p{color:rgba(184,168,152,0.9) !important;font-style:italic !important;}" +
    " .awards-field-label{color:#D4B85A !important;font-family:'Cormorant Garamond',serif !important;font-style:italic !important;letter-spacing:2px !important;}" +
    " .awards-detail-back{border:1px solid rgba(201,168,76,0.4) !important;background:rgba(201,168,76,0.06) !important;color:#D4B85A !important;border-radius:6px !important;}" +
    " .awards-text-input,.awards-picker-search{border:1px solid rgba(201,168,76,0.3) !important;background:rgba(201,168,76,0.05) !important;color:#F0E6D3 !important;border-radius:6px !important;font-family:'Cormorant Garamond',serif !important;font-size:16px !important;}" +
    " .awards-text-input::placeholder,.awards-picker-search::placeholder{color:rgba(184,168,152,0.45) !important;font-style:italic !important;}" +
    " .awards-text-input:focus,.awards-picker-search:focus{border-color:#D4B85A !important;box-shadow:0 0 0 2px rgba(201,168,76,0.3),0 0 16px rgba(201,168,76,0.15) !important;}" +
    " .awards-segmented{border:1px solid rgba(201,168,76,0.25) !important;background:rgba(201,168,76,0.05) !important;border-radius:6px !important;padding:4px !important;}" +
    " .awards-segmented button{color:#B8A898 !important;border-radius:3px !important;font-family:'Cormorant Garamond',serif !important;font-style:italic !important;font-size:14px !important;}" +
    " .awards-segmented button.active{background:#D4B85A !important;color:#1a1814 !important;font-weight:700 !important;box-shadow:0 2px 0 #b8943a !important;}" +
    " .awards-visual-toggle button{border:1px solid rgba(201,168,76,0.35) !important;background:rgba(201,168,76,0.05) !important;color:#B8A898 !important;border-radius:6px !important;font-family:'Cormorant Garamond',serif !important;font-style:italic !important;}" +
    " .awards-visual-toggle button.active{background:rgba(212,184,90,0.15) !important;color:#D4B85A !important;border-color:#D4B85A !important;box-shadow:0 0 12px rgba(201,168,76,0.3),0 2px 0 #b8943a !important;font-weight:700 !important;}" +
    " .awards-visual-toggle .awards-or{color:#D4B85A !important;font-family:'Cormorant Garamond',serif !important;font-style:italic !important;}" +
    " .awards-icon-grid{border:1px solid rgba(201,168,76,0.25) !important;background:rgba(46,40,32,0.6) !important;border-radius:6px !important;box-shadow:0 0 10px rgba(201,168,76,0.08) !important;}" +
    " .awards-icon-grid button{border:1px solid rgba(201,168,76,0.18) !important;background:rgba(201,168,76,0.05) !important;color:#D4B85A !important;border-radius:4px !important;}" +
    " .awards-icon-grid button.active{background:rgba(212,68,42,0.15) !important;color:#D4442A !important;border-color:#D4442A !important;box-shadow:0 0 14px rgba(212,68,42,0.35) !important;}" +
    " .awards-btn{border:1px solid rgba(201,168,76,0.4) !important;background:rgba(201,168,76,0.06) !important;color:#F0E6D3 !important;border-radius:6px !important;font-family:'Cormorant Garamond',serif !important;font-style:italic !important;font-weight:700 !important;}" +
    " .awards-btn--primary{background:rgba(212,68,42,0.18) !important;color:#F0E6D3 !important;border:1px solid #D4442A !important;box-shadow:0 0 16px rgba(212,68,42,0.4) !important;text-shadow:0 0 8px rgba(212,68,42,0.4) !important;}" +
    " .awards-btn--danger{background:#D4442A !important;color:#F0E6D3 !important;border:1px solid #D4442A !important;box-shadow:0 0 18px rgba(212,68,42,0.4) !important;text-shadow:none !important;}";
  }else if(activeTheme==="space"){
    css=":root{--black:#08080F;--surface-1:rgba(224,64,251,0.04);--surface-2:rgba(224,64,251,0.07);--surface-3:rgba(224,64,251,0.1);--white:#E8E6F0;--white-muted:rgba(152,150,168,0.8);--white-faint:rgba(152,150,168,0.45);--white-ghost:rgba(224,64,251,0.1);--violet:#E040FB;--pink:#FB40A0;--cyan:#40E0D0;--emerald:#40FB80;--amber:#FFB740;--red:#FF4060;--grad-hero:linear-gradient(135deg, #E040FB, #40E0D0);--grad-text:linear-gradient(135deg, #E040FB, #40E0D0);--font-display:'Orbitron', sans-serif;--font-body:'Exo 2', sans-serif;}" +
    " .mesh-bg{background:radial-gradient(ellipse at 25% 35%, rgba(224,64,251,0.04) 0%, transparent 60%), radial-gradient(ellipse at 75% 55%, rgba(64,224,208,0.03) 0%, transparent 60%) !important;animation:none !important;}" +
    " .song-card,.config-section,.queue-item,.singer-card,.request-song-cta{border:1px solid rgba(224,64,251,0.12) !important;background:rgba(21,21,40,0.75) !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;border-radius:8px !important;box-shadow:0 0 8px rgba(224,64,251,0.08) !important;}" +
    " .now-playing-card{border:1px solid rgba(64,224,208,0.3) !important;background:rgba(64,224,208,0.12) !important;border-radius:8px !important;box-shadow:0 0 14px rgba(64,224,208,0.15) !important;animation:none !important;}" +
    " .join-btn,.add-queue-btn,.profile-save-btn{background:rgba(224,64,251,0.12) !important;color:#E8E6F0 !important;border:1px solid rgba(224,64,251,0.4) !important;border-radius:4px !important;box-shadow:0 0 10px rgba(224,64,251,0.25) !important;text-shadow:0 0 8px rgba(224,64,251,0.4) !important;letter-spacing:1px !important;}" +
    " .join-btn:active,.add-queue-btn:active,.profile-save-btn:active{box-shadow:0 0 20px rgba(224,64,251,0.4) !important;}" +
    " .singer-count-btn{border:1px solid rgba(224,64,251,0.15) !important;background:rgba(224,64,251,0.04) !important;color:#9896A8 !important;border-radius:4px !important;}" +
    " .singer-count-btn.active{background:rgba(224,64,251,0.15) !important;color:#E040FB !important;border-color:#E040FB !important;}" +
    " .role-btn{border:1px solid rgba(224,64,251,0.12) !important;background:rgba(224,64,251,0.04) !important;color:#9896A8 !important;border-radius:4px !important;}" +
    " .role-btn.active{background:rgba(64,224,208,0.12) !important;color:#40E0D0 !important;border-color:rgba(64,224,208,0.4) !important;}" +
    " .join-input,.search-input,.singer-name-input,.profile-name-input{border:1px solid rgba(224,64,251,0.15) !important;background:rgba(224,64,251,0.04) !important;color:#E8E6F0 !important;border-radius:4px !important;}" +
    " .join-input:focus,.search-input:focus,.singer-name-input:focus,.profile-name-input:focus{box-shadow:0 0 0 2px rgba(64,224,208,0.35), 0 0 16px rgba(64,224,208,0.2) !important;border-color:#40E0D0 !important;}" +
    " .join-input::placeholder,.search-input::placeholder,.singer-name-input::placeholder,.profile-name-input::placeholder{color:rgba(152,150,168,0.4) !important;}" +
    " .bottom-nav{background:rgba(8,8,15,0.95) !important;border-top:1px solid rgba(224,64,251,0.12) !important;}" +
    " .songs-header,.req-header{background:rgba(8,8,15,0.95) !important;}" +
    " .song-card-plus{background:rgba(224,64,251,0.2) !important;border:1px solid #E040FB !important;color:#E040FB !important;border-radius:4px !important;box-shadow:0 0 14px rgba(224,64,251,0.55),0 0 28px rgba(64,224,208,0.2) !important;}" +
    " .song-card-added{background:rgba(224,64,251,0.16) !important;border:1px solid rgba(224,64,251,0.55) !important;color:#E040FB !important;font-family:'Orbitron',sans-serif !important;font-weight:700 !important;letter-spacing:2px !important;text-transform:uppercase !important;text-shadow:0 0 8px rgba(224,64,251,0.55) !important;border-radius:2px !important;padding:5px 11px !important;font-size:9px !important;backdrop-filter:blur(6px) !important;-webkit-backdrop-filter:blur(6px) !important;}" +
    " .avatar-upload,.profile-avatar{border-color:rgba(224,64,251,0.3) !important;}" +
    " .guest-picker-pill{border:1px solid rgba(224,64,251,0.12) !important;background:rgba(224,64,251,0.04) !important;color:#9896A8 !important;border-radius:4px !important;}" +
    " .guest-picker-pill.selected{background:rgba(224,64,251,0.15) !important;color:#E040FB !important;border-color:#E040FB !important;}" +
    " .reaction-cell{border:1px solid rgba(224,64,251,0.12) !important;background:rgba(21,21,40,0.75) !important;border-radius:8px !important;box-shadow:0 0 8px rgba(224,64,251,0.08) !important;}" +
    " .reaction-cell:active{border-color:#E040FB !important;box-shadow:0 0 15px rgba(224,64,251,0.3) !important;}" +
    " .emoji-picker-sheet,.text-input-sheet,.meme-picker-sheet{background:#0E0E1A !important;border:1px solid rgba(224,64,251,0.15) !important;}" +
    " .text-input-field{border:1px solid rgba(224,64,251,0.15) !important;background:rgba(224,64,251,0.04) !important;color:#E8E6F0 !important;border-radius:4px !important;}" +
    " .text-input-field:focus{box-shadow:0 0 10px rgba(64,224,208,0.3) !important;}" +
    " .text-input-send{background:rgba(224,64,251,0.12) !important;color:#E8E6F0 !important;border:1px solid rgba(224,64,251,0.4) !important;border-radius:4px !important;}" +
    " .meme-pick-btn{border:1px solid rgba(224,64,251,0.12) !important;background:rgba(224,64,251,0.04) !important;border-radius:8px !important;}" +
    " .youreup-screen{background:#08080F !important;}" +
    " .youreup-play-btn{border:1px solid #E040FB !important;box-shadow:0 0 30px rgba(224,64,251,0.4),0 0 60px rgba(64,224,208,0.2) !important;}" +
    " .youreup-art{border:1px solid rgba(224,64,251,0.2) !important;border-radius:8px !important;box-shadow:0 0 20px rgba(224,64,251,0.15) !important;}" +
    " .youreup-skip-btn{border:1px solid rgba(224,64,251,0.4) !important;border-radius:4px !important;background:rgba(224,64,251,0.06) !important;color:#E040FB !important;box-shadow:0 0 12px rgba(224,64,251,0.2) !important;letter-spacing:1px !important;}" +
    " .skip-confirm-card{background:#0E0E1A !important;border:1px solid rgba(224,64,251,0.3) !important;border-radius:8px !important;box-shadow:0 0 30px rgba(224,64,251,0.25) !important;}" +
    " .skip-confirm-btn-ghost{border:1px solid rgba(224,64,251,0.3) !important;background:rgba(224,64,251,0.04) !important;color:#E8E6F0 !important;border-radius:4px !important;letter-spacing:1px !important;}" +
    " .skip-confirm-btn-danger{background:#FF4060 !important;border:1px solid #FF4060 !important;color:#fff !important;border-radius:4px !important;box-shadow:0 0 20px rgba(255,64,96,0.4) !important;letter-spacing:1px !important;}" +
    /* ---- Awards: Create page ---- */
    " .awards-detail-info h2{color:#E8E6F0 !important;font-family:'Orbitron',sans-serif !important;text-transform:uppercase !important;letter-spacing:2px !important;}" +
    " .awards-detail-info p{color:rgba(152,150,168,0.9) !important;}" +
    " .awards-field-label{color:#E040FB !important;font-family:'Orbitron',sans-serif !important;text-shadow:0 0 8px rgba(224,64,251,0.4) !important;}" +
    " .awards-detail-back{border:1px solid rgba(224,64,251,0.4) !important;background:rgba(224,64,251,0.06) !important;color:#E040FB !important;border-radius:4px !important;}" +
    " .awards-text-input,.awards-picker-search{border:1px solid rgba(224,64,251,0.3) !important;background:rgba(224,64,251,0.05) !important;color:#E8E6F0 !important;border-radius:4px !important;}" +
    " .awards-text-input::placeholder,.awards-picker-search::placeholder{color:rgba(152,150,168,0.45) !important;}" +
    " .awards-text-input:focus,.awards-picker-search:focus{border-color:#40E0D0 !important;box-shadow:0 0 0 2px rgba(64,224,208,0.3),0 0 16px rgba(64,224,208,0.2) !important;}" +
    " .awards-segmented{border:1px solid rgba(224,64,251,0.25) !important;background:rgba(224,64,251,0.05) !important;border-radius:4px !important;padding:4px !important;}" +
    " .awards-segmented button{color:#9896A8 !important;border-radius:2px !important;font-family:'Orbitron',sans-serif !important;text-transform:uppercase !important;letter-spacing:1px !important;font-size:11px !important;}" +
    " .awards-segmented button.active{background:linear-gradient(135deg,#E040FB,#40E0D0) !important;color:#08080F !important;box-shadow:0 0 14px rgba(224,64,251,0.5) !important;}" +
    " .awards-visual-toggle button{border:1px solid rgba(224,64,251,0.3) !important;background:rgba(224,64,251,0.05) !important;color:#9896A8 !important;border-radius:4px !important;font-family:'Orbitron',sans-serif !important;text-transform:uppercase !important;letter-spacing:1px !important;font-size:12px !important;}" +
    " .awards-visual-toggle button.active{background:rgba(224,64,251,0.12) !important;color:#E040FB !important;border-color:#E040FB !important;box-shadow:0 0 14px rgba(224,64,251,0.45) !important;text-shadow:0 0 8px rgba(224,64,251,0.5) !important;}" +
    " .awards-visual-toggle .awards-or{color:#40E0D0 !important;font-family:'Orbitron',sans-serif !important;}" +
    " .awards-icon-grid{border:1px solid rgba(224,64,251,0.22) !important;background:rgba(21,21,40,0.6) !important;border-radius:4px !important;}" +
    " .awards-icon-grid button{border:1px solid rgba(224,64,251,0.15) !important;background:rgba(224,64,251,0.04) !important;color:#E040FB !important;border-radius:2px !important;}" +
    " .awards-icon-grid button.active{background:rgba(64,224,208,0.18) !important;color:#40E0D0 !important;border-color:#40E0D0 !important;box-shadow:0 0 14px rgba(64,224,208,0.45) !important;}" +
    " .awards-btn{border:1px solid rgba(224,64,251,0.4) !important;background:rgba(224,64,251,0.06) !important;color:#E8E6F0 !important;border-radius:4px !important;font-family:'Orbitron',sans-serif !important;text-transform:uppercase !important;letter-spacing:1px !important;}" +
    " .awards-btn--primary{background:linear-gradient(135deg,#E040FB,#40E0D0) !important;color:#08080F !important;border:1px solid #E040FB !important;box-shadow:0 0 20px rgba(224,64,251,0.5),0 0 40px rgba(64,224,208,0.25) !important;text-shadow:none !important;}" +
    " .awards-btn--danger{background:#FF4060 !important;color:#fff !important;border:1px solid #FF4060 !important;box-shadow:0 0 18px rgba(255,64,96,0.45) !important;}";
  }else if(activeTheme==="steampunk"){
    css=":root{--black:#14110F;--surface-1:rgba(200,151,62,0.04);--surface-2:rgba(200,151,62,0.07);--surface-3:rgba(200,151,62,0.1);--white:#E8DCC8;--white-muted:rgba(168,152,120,0.8);--white-faint:rgba(168,152,120,0.45);--white-ghost:rgba(200,151,62,0.1);--violet:#C8973E;--pink:#E07040;--cyan:#5A9E8F;--emerald:#5A9E8F;--amber:#C8973E;--red:#B84030;--grad-hero:linear-gradient(135deg, #C8973E, #E07040);--grad-text:linear-gradient(135deg, #C8973E, #E07040);--font-display:'Cinzel Decorative', serif;--font-body:'Spectral', Georgia, serif;}" +
    " .mesh-bg{background:radial-gradient(ellipse at 30% 40%, rgba(200,151,62,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(224,112,64,0.03) 0%, transparent 60%) !important;animation:none !important;}" +
    " .song-card,.config-section,.queue-item,.singer-card,.request-song-cta{border:1px solid rgba(200,151,62,0.15) !important;background:rgba(37,32,24,0.8) !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;border-radius:6px !important;box-shadow:0 0 8px rgba(200,151,62,0.08) !important;}" +
    " .now-playing-card{border:1px solid rgba(224,112,64,0.3) !important;background:rgba(224,112,64,0.12) !important;border-radius:6px !important;box-shadow:0 0 14px rgba(224,112,64,0.15) !important;animation:none !important;}" +
    " .join-btn,.add-queue-btn,.profile-save-btn{background:rgba(200,151,62,0.12) !important;color:#E8DCC8 !important;border:1px solid rgba(200,151,62,0.4) !important;border-radius:3px !important;box-shadow:0 0 10px rgba(200,151,62,0.25) !important;text-shadow:0 0 8px rgba(200,151,62,0.4) !important;}" +
    " .join-btn:active,.add-queue-btn:active,.profile-save-btn:active{box-shadow:0 0 20px rgba(200,151,62,0.4) !important;}" +
    " .singer-count-btn{border:1px solid rgba(200,151,62,0.15) !important;background:rgba(200,151,62,0.04) !important;color:#A89878 !important;border-radius:3px !important;}" +
    " .singer-count-btn.active{background:rgba(200,151,62,0.15) !important;color:#C8973E !important;border-color:#C8973E !important;}" +
    " .role-btn{border:1px solid rgba(200,151,62,0.12) !important;background:rgba(200,151,62,0.04) !important;color:#A89878 !important;border-radius:3px !important;}" +
    " .role-btn.active{background:rgba(224,112,64,0.12) !important;color:#E07040 !important;border-color:rgba(224,112,64,0.4) !important;}" +
    " .join-input,.search-input,.singer-name-input,.profile-name-input{border:1px solid rgba(200,151,62,0.15) !important;background:rgba(200,151,62,0.04) !important;color:#E8DCC8 !important;border-radius:3px !important;}" +
    " .join-input:focus,.search-input:focus,.singer-name-input:focus,.profile-name-input:focus{box-shadow:0 0 0 2px rgba(200,151,62,0.4), 0 0 0 4px rgba(224,112,64,0.15), 0 0 16px rgba(200,151,62,0.15) !important;border-color:#C8973E !important;}" +
    " .join-input::placeholder,.search-input::placeholder,.singer-name-input::placeholder,.profile-name-input::placeholder{color:rgba(168,152,120,0.4) !important;}" +
    " .bottom-nav{background:rgba(20,17,15,0.95) !important;border-top:1px solid rgba(200,151,62,0.15) !important;}" +
    " .songs-header,.req-header{background:rgba(20,17,15,0.95) !important;}" +
    " .song-card-plus{background:linear-gradient(135deg,#C8973E,#E07040) !important;border:1.5px solid #C8973E !important;color:#14110F !important;border-radius:3px !important;box-shadow:0 0 12px rgba(200,151,62,0.5),inset 0 0 6px rgba(255,255,255,0.25) !important;}" +
    " .song-card-added{background:rgba(200,151,62,0.18) !important;border:1.5px solid #C8973E !important;color:#C8973E !important;font-family:'Cinzel Decorative',serif !important;font-weight:700 !important;letter-spacing:1.5px !important;text-transform:none !important;text-shadow:0 0 6px rgba(200,151,62,0.4) !important;border-radius:2px !important;padding:5px 11px !important;font-size:10px !important;backdrop-filter:blur(6px) !important;-webkit-backdrop-filter:blur(6px) !important;}" +
    " .avatar-upload,.profile-avatar{border-color:rgba(200,151,62,0.3) !important;}" +
    " .guest-picker-pill{border:1px solid rgba(200,151,62,0.12) !important;background:rgba(200,151,62,0.04) !important;color:#A89878 !important;border-radius:3px !important;}" +
    " .guest-picker-pill.selected{background:rgba(200,151,62,0.15) !important;color:#C8973E !important;border-color:#C8973E !important;}" +
    " .reaction-cell{border:1px solid rgba(200,151,62,0.15) !important;background:rgba(37,32,24,0.8) !important;border-radius:6px !important;box-shadow:0 0 8px rgba(200,151,62,0.08) !important;}" +
    " .reaction-cell:active{border-color:#C8973E !important;box-shadow:0 0 15px rgba(200,151,62,0.3) !important;}" +
    " .emoji-picker-sheet,.text-input-sheet,.meme-picker-sheet{background:#1C1816 !important;border:1px solid rgba(200,151,62,0.15) !important;}" +
    " .text-input-field{border:1px solid rgba(200,151,62,0.15) !important;background:rgba(200,151,62,0.04) !important;color:#E8DCC8 !important;border-radius:3px !important;}" +
    " .text-input-field:focus{box-shadow:0 0 10px rgba(200,151,62,0.3) !important;}" +
    " .text-input-send{background:rgba(200,151,62,0.12) !important;color:#E8DCC8 !important;border:1px solid rgba(200,151,62,0.4) !important;border-radius:3px !important;}" +
    " .meme-pick-btn{border:1px solid rgba(200,151,62,0.12) !important;background:rgba(200,151,62,0.04) !important;border-radius:6px !important;}" +
    " .youreup-screen{background:#14110F !important;}" +
    " .youreup-play-btn{border:1px solid #C8973E !important;box-shadow:0 0 30px rgba(200,151,62,0.3),0 0 60px rgba(224,112,64,0.15) !important;}" +
    " .youreup-art{border:1px solid rgba(200,151,62,0.2) !important;border-radius:6px !important;box-shadow:0 0 20px rgba(200,151,62,0.1) !important;}" +
    " .youreup-skip-btn{border:1px solid rgba(200,151,62,0.4) !important;border-radius:3px !important;background:rgba(200,151,62,0.06) !important;color:#C8973E !important;box-shadow:0 0 12px rgba(200,151,62,0.2) !important;}" +
    " .skip-confirm-card{background:#1C1816 !important;border:1px solid rgba(200,151,62,0.3) !important;border-radius:6px !important;box-shadow:0 0 30px rgba(200,151,62,0.25) !important;}" +
    " .skip-confirm-btn-ghost{border:1px solid rgba(200,151,62,0.3) !important;background:rgba(200,151,62,0.04) !important;color:#E8DCC8 !important;border-radius:3px !important;}" +
    " .skip-confirm-btn-danger{background:#B84030 !important;border:1px solid #B84030 !important;color:#E8DCC8 !important;border-radius:3px !important;box-shadow:0 0 20px rgba(184,64,48,0.4) !important;}" +
    /* ---- Awards: Create page ---- */
    " .awards-detail-info h2{color:#E8DCC8 !important;font-family:'Cinzel Decorative',serif !important;letter-spacing:1px !important;}" +
    " .awards-detail-info p{color:rgba(168,152,120,0.9) !important;font-style:italic !important;}" +
    " .awards-field-label{color:#C8973E !important;font-family:'Cinzel Decorative',serif !important;letter-spacing:1.5px !important;}" +
    " .awards-detail-back{border:1px solid rgba(200,151,62,0.4) !important;background:rgba(200,151,62,0.06) !important;color:#C8973E !important;border-radius:3px !important;}" +
    " .awards-text-input,.awards-picker-search{border:1px solid rgba(200,151,62,0.35) !important;background:rgba(200,151,62,0.05) !important;color:#E8DCC8 !important;border-radius:3px !important;font-family:'Spectral',Georgia,serif !important;}" +
    " .awards-text-input::placeholder,.awards-picker-search::placeholder{color:rgba(168,152,120,0.45) !important;font-style:italic !important;}" +
    " .awards-text-input:focus,.awards-picker-search:focus{border-color:#C8973E !important;box-shadow:0 0 0 2px rgba(200,151,62,0.4),0 0 16px rgba(200,151,62,0.15) !important;}" +
    " .awards-segmented{border:1px solid rgba(200,151,62,0.4) !important;background:rgba(200,151,62,0.06) !important;border-radius:3px !important;padding:4px !important;box-shadow:inset 0 0 0 1px rgba(200,151,62,0.2) !important;}" +
    " .awards-segmented button{color:#A89878 !important;border-radius:2px !important;font-family:'Cinzel Decorative',serif !important;letter-spacing:0.5px !important;font-size:12px !important;}" +
    " .awards-segmented button.active{background:linear-gradient(180deg,#D4A04A,#A87A2E) !important;color:#14110F !important;font-weight:700 !important;box-shadow:inset 0 0 0 1px #14110F,inset 0 0 0 2px #C8973E !important;text-shadow:0 1px 0 rgba(20,17,15,0.3) !important;}" +
    " .awards-visual-toggle button{border:1px solid rgba(200,151,62,0.4) !important;background:rgba(200,151,62,0.06) !important;color:#A89878 !important;border-radius:3px !important;font-family:'Cinzel Decorative',serif !important;letter-spacing:0.5px !important;}" +
    " .awards-visual-toggle button.active{background:linear-gradient(180deg,rgba(200,151,62,0.2),rgba(168,122,46,0.18)) !important;color:#C8973E !important;border-color:#C8973E !important;box-shadow:inset 0 0 0 1px #C8973E,0 0 14px rgba(200,151,62,0.35) !important;}" +
    " .awards-visual-toggle .awards-or{color:#C8973E !important;font-family:'Cinzel Decorative',serif !important;}" +
    " .awards-icon-grid{border:1px solid rgba(200,151,62,0.3) !important;background:rgba(37,32,24,0.7) !important;border-radius:3px !important;box-shadow:inset 0 0 0 1px rgba(200,151,62,0.12),0 0 10px rgba(200,151,62,0.1) !important;}" +
    " .awards-icon-grid button{border:1px solid rgba(200,151,62,0.2) !important;background:rgba(200,151,62,0.05) !important;color:#C8973E !important;border-radius:2px !important;}" +
    " .awards-icon-grid button.active{background:rgba(224,112,64,0.18) !important;color:#E07040 !important;border-color:#E07040 !important;box-shadow:0 0 14px rgba(224,112,64,0.4) !important;}" +
    " .awards-btn{border:1px solid rgba(200,151,62,0.45) !important;background:rgba(200,151,62,0.06) !important;color:#E8DCC8 !important;border-radius:3px !important;font-family:'Cinzel Decorative',serif !important;letter-spacing:1px !important;}" +
    " .awards-btn--primary{background:linear-gradient(180deg,#D4A04A,#A87A2E) !important;color:#14110F !important;border:1px solid #C8973E !important;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.15),0 0 18px rgba(200,151,62,0.4) !important;text-shadow:0 1px 0 rgba(20,17,15,0.3) !important;font-weight:700 !important;}" +
    " .awards-btn--danger{background:#B84030 !important;color:#E8DCC8 !important;border:1px solid #B84030 !important;box-shadow:0 0 18px rgba(184,64,48,0.4) !important;}";
  }else if(activeTheme==="retrowave"){
    css=":root{--black:#0a0614;--surface-1:rgba(255,45,149,0.04);--surface-2:rgba(255,45,149,0.07);--surface-3:rgba(255,45,149,0.1);--white:#F0E6FF;--white-muted:rgba(155,140,191,0.8);--white-faint:rgba(155,140,191,0.45);--white-ghost:rgba(255,45,149,0.1);--violet:#B44AFF;--pink:#FF2D95;--cyan:#00BFFF;--emerald:#00BFFF;--amber:#FFD700;--red:#FF1A6B;--grad-hero:linear-gradient(135deg, #FF2D95, #FF6B2B, #FFD700);--grad-text:linear-gradient(135deg, #FFD700, #FF6B2B, #FF2D95);--font-display:'Audiowide', sans-serif;--font-body:'Rajdhani', 'Exo 2', sans-serif;}" +
    " .mesh-bg{background:radial-gradient(ellipse at 30% 40%, rgba(255,45,149,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(0,191,255,0.03) 0%, transparent 60%) !important;animation:none !important;}" +
    " .song-card,.config-section,.queue-item,.singer-card,.request-song-cta{border:1px solid rgba(255,45,149,0.12) !important;background:rgba(24,16,42,0.75) !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;border-radius:4px !important;box-shadow:0 0 8px rgba(255,45,149,0.06) !important;}" +
    " .now-playing-card{border:1px solid rgba(255,215,0,0.3) !important;background:rgba(255,215,0,0.12) !important;border-radius:4px !important;box-shadow:0 0 14px rgba(255,215,0,0.15) !important;animation:none !important;}" +
    " .join-btn,.add-queue-btn,.profile-save-btn{background:rgba(255,45,149,0.1) !important;color:#F0E6FF !important;border:1px solid rgba(255,45,149,0.4) !important;border-radius:4px !important;box-shadow:0 0 10px rgba(255,45,149,0.25) !important;text-shadow:0 0 8px rgba(255,45,149,0.4) !important;}" +
    " .join-btn:active,.add-queue-btn:active,.profile-save-btn:active{box-shadow:0 0 20px rgba(255,45,149,0.4) !important;}" +
    " .singer-count-btn{border:1px solid rgba(255,45,149,0.15) !important;background:rgba(255,45,149,0.04) !important;color:#9B8CBF !important;border-radius:4px !important;}" +
    " .singer-count-btn.active{background:rgba(255,45,149,0.15) !important;color:#FF2D95 !important;border-color:#FF2D95 !important;}" +
    " .role-btn{border:1px solid rgba(255,45,149,0.12) !important;background:rgba(255,45,149,0.04) !important;color:#9B8CBF !important;border-radius:4px !important;}" +
    " .role-btn.active{background:rgba(0,191,255,0.12) !important;color:#00BFFF !important;border-color:rgba(0,191,255,0.4) !important;}" +
    " .join-input,.search-input,.singer-name-input,.profile-name-input{border:1px solid rgba(255,45,149,0.15) !important;background:rgba(255,45,149,0.04) !important;color:#F0E6FF !important;border-radius:4px !important;}" +
    " .join-input:focus,.search-input:focus,.singer-name-input:focus,.profile-name-input:focus{box-shadow:0 0 0 2px rgba(255,45,149,0.35), 0 0 0 4px rgba(0,191,255,0.15), 0 0 16px rgba(255,45,149,0.15) !important;border-color:#FF2D95 !important;}" +
    " .join-input::placeholder,.search-input::placeholder,.singer-name-input::placeholder,.profile-name-input::placeholder{color:rgba(155,140,191,0.4) !important;}" +
    " .bottom-nav{background:rgba(10,6,20,0.95) !important;border-top:1px solid rgba(255,45,149,0.15) !important;}" +
    " .songs-header,.req-header{background:rgba(10,6,20,0.95) !important;}" +
    " .song-card-plus{background:linear-gradient(135deg,#FF2D95,#B44AFF 60%,#00BFFF) !important;border:1px solid #FF2D95 !important;color:#fff !important;border-radius:3px !important;box-shadow:0 0 14px rgba(255,45,149,0.6),0 0 28px rgba(0,191,255,0.3) !important;}" +
    " .song-card-added{background:rgba(255,45,149,0.18) !important;border:1px solid #FF2D95 !important;color:#FF2D95 !important;font-family:'Audiowide',sans-serif !important;font-weight:400 !important;letter-spacing:2px !important;text-transform:uppercase !important;text-shadow:1px 0 0 #00BFFF,-1px 0 0 #FF2D95,0 0 8px rgba(255,45,149,0.5) !important;border-radius:2px !important;padding:5px 11px !important;font-size:9px !important;backdrop-filter:blur(6px) !important;-webkit-backdrop-filter:blur(6px) !important;}" +
    " .avatar-upload,.profile-avatar{border-color:rgba(255,45,149,0.3) !important;}" +
    " .guest-picker-pill{border:1px solid rgba(255,45,149,0.12) !important;background:rgba(255,45,149,0.04) !important;color:#9B8CBF !important;border-radius:4px !important;}" +
    " .guest-picker-pill.selected{background:rgba(255,45,149,0.15) !important;color:#FF2D95 !important;border-color:#FF2D95 !important;}" +
    " .reaction-cell{border:1px solid rgba(255,45,149,0.15) !important;background:rgba(24,16,42,0.75) !important;border-radius:4px !important;box-shadow:0 0 8px rgba(255,45,149,0.06) !important;}" +
    " .reaction-cell:active{border-color:#FF2D95 !important;box-shadow:0 0 15px rgba(255,45,149,0.3) !important;}" +
    " .emoji-picker-sheet,.text-input-sheet,.meme-picker-sheet{background:#110a1e !important;border:1px solid rgba(255,45,149,0.15) !important;}" +
    " .text-input-field{border:1px solid rgba(255,45,149,0.15) !important;background:rgba(255,45,149,0.04) !important;color:#F0E6FF !important;border-radius:4px !important;}" +
    " .text-input-field:focus{box-shadow:0 0 10px rgba(255,45,149,0.3) !important;}" +
    " .text-input-send{background:rgba(255,45,149,0.12) !important;color:#F0E6FF !important;border:1px solid rgba(255,45,149,0.4) !important;border-radius:4px !important;}" +
    " .meme-pick-btn{border:1px solid rgba(255,45,149,0.12) !important;background:rgba(255,45,149,0.04) !important;border-radius:4px !important;}" +
    " .youreup-screen{background:#0a0614 !important;}" +
    " .youreup-play-btn{border:1px solid #FF2D95 !important;box-shadow:0 0 30px rgba(255,45,149,0.3),0 0 60px rgba(0,191,255,0.15) !important;}" +
    " .youreup-art{border:1px solid rgba(255,45,149,0.2) !important;border-radius:4px !important;box-shadow:0 0 20px rgba(255,45,149,0.1) !important;}" +
    " .youreup-skip-btn{border:1px solid rgba(255,45,149,0.4) !important;border-radius:4px !important;background:rgba(255,45,149,0.06) !important;color:#FF2D95 !important;box-shadow:0 0 12px rgba(255,45,149,0.2) !important;}" +
    " .skip-confirm-card{background:#110a1e !important;border:1px solid rgba(255,45,149,0.3) !important;border-radius:4px !important;box-shadow:0 0 30px rgba(255,45,149,0.25) !important;}" +
    " .skip-confirm-btn-ghost{border:1px solid rgba(255,45,149,0.3) !important;background:rgba(255,45,149,0.04) !important;color:#F0E6FF !important;border-radius:4px !important;}" +
    " .skip-confirm-btn-danger{background:#FF1A6B !important;border:1px solid #FF1A6B !important;color:#fff !important;border-radius:4px !important;box-shadow:0 0 20px rgba(255,26,107,0.4) !important;}" +
    /* ---- Awards: Create page ---- */
    " .awards-detail-info h2{color:#F0E6FF !important;font-family:'Audiowide',sans-serif !important;letter-spacing:1px !important;text-shadow:0 0 12px rgba(255,45,149,0.4) !important;}" +
    " .awards-detail-info p{color:rgba(155,140,191,0.9) !important;}" +
    " .awards-field-label{color:#FFD700 !important;font-family:'Audiowide',sans-serif !important;letter-spacing:2px !important;text-shadow:0 0 8px rgba(255,215,0,0.45) !important;}" +
    " .awards-detail-back{border:1px solid rgba(255,45,149,0.45) !important;background:rgba(255,45,149,0.06) !important;color:#FF2D95 !important;border-radius:4px !important;}" +
    " .awards-text-input,.awards-picker-search{border:1px solid rgba(255,45,149,0.35) !important;background:rgba(255,45,149,0.05) !important;color:#F0E6FF !important;border-radius:4px !important;}" +
    " .awards-text-input::placeholder,.awards-picker-search::placeholder{color:rgba(155,140,191,0.45) !important;}" +
    " .awards-text-input:focus,.awards-picker-search:focus{border-color:#FF2D95 !important;box-shadow:0 0 0 2px rgba(255,45,149,0.35),0 0 0 4px rgba(0,191,255,0.15),0 0 16px rgba(255,45,149,0.2) !important;}" +
    " .awards-segmented{border:1px solid rgba(255,45,149,0.3) !important;background:rgba(255,45,149,0.05) !important;border-radius:4px !important;padding:4px !important;}" +
    " .awards-segmented button{color:#9B8CBF !important;border-radius:2px !important;font-family:'Audiowide',sans-serif !important;letter-spacing:1px !important;font-size:11px !important;}" +
    " .awards-segmented button.active{background:linear-gradient(135deg,#FF2D95,#B44AFF 60%,#00BFFF) !important;color:#fff !important;box-shadow:0 0 14px rgba(255,45,149,0.6) !important;text-shadow:1px 0 0 #00BFFF,-1px 0 0 #FF2D95 !important;}" +
    " .awards-visual-toggle button{border:1px solid rgba(255,45,149,0.4) !important;background:rgba(255,45,149,0.05) !important;color:#9B8CBF !important;border-radius:4px !important;font-family:'Audiowide',sans-serif !important;letter-spacing:1px !important;font-size:12px !important;}" +
    " .awards-visual-toggle button.active{background:rgba(255,45,149,0.15) !important;color:#FF2D95 !important;border-color:#FF2D95 !important;box-shadow:0 0 16px rgba(255,45,149,0.55) !important;text-shadow:0 0 8px rgba(255,45,149,0.5) !important;}" +
    " .awards-visual-toggle .awards-or{color:#00BFFF !important;font-family:'Audiowide',sans-serif !important;text-shadow:0 0 8px rgba(0,191,255,0.5) !important;}" +
    " .awards-icon-grid{border:1px solid rgba(255,45,149,0.25) !important;background:rgba(24,16,42,0.7) !important;border-radius:4px !important;}" +
    " .awards-icon-grid button{border:1px solid rgba(255,45,149,0.18) !important;background:rgba(255,45,149,0.04) !important;color:#FF2D95 !important;border-radius:2px !important;}" +
    " .awards-icon-grid button.active{background:rgba(0,191,255,0.18) !important;color:#00BFFF !important;border-color:#00BFFF !important;box-shadow:0 0 14px rgba(0,191,255,0.5) !important;}" +
    " .awards-btn{border:1px solid rgba(255,45,149,0.45) !important;background:rgba(255,45,149,0.06) !important;color:#F0E6FF !important;border-radius:4px !important;font-family:'Audiowide',sans-serif !important;letter-spacing:1px !important;}" +
    " .awards-btn--primary{background:linear-gradient(135deg,#FF2D95,#B44AFF 60%,#00BFFF) !important;color:#fff !important;border:1px solid #FF2D95 !important;box-shadow:0 0 22px rgba(255,45,149,0.55),0 0 44px rgba(0,191,255,0.25) !important;text-shadow:1px 0 0 #00BFFF,-1px 0 0 #FF2D95 !important;}" +
    " .awards-btn--danger{background:#FF1A6B !important;color:#fff !important;border:1px solid #FF1A6B !important;box-shadow:0 0 20px rgba(255,26,107,0.45) !important;text-shadow:none !important;}";
  }else{
    css="";
  }
  // ---- Per-theme genre tab styling ----
  // Each theme overrides the base .genre-tab pill with its own visual language
  // (matches the song-card/search-input precedent in each theme block above).
  var gt="";
  if(activeTheme==="neo-brutal"){
    gt=" .genre-tab{border:3px solid #1A1A1A !important;background:#FFFFFF !important;color:#1A1A1A !important;border-radius:8px !important;box-shadow:3px 3px 0px #1A1A1A !important;font-family:'Space Grotesk',sans-serif !important;text-transform:uppercase !important;letter-spacing:0.06em !important;}" +
    " .genre-tab.is-active{background:#FFD60A !important;color:#1A1A1A !important;border-color:#1A1A1A !important;box-shadow:4px 4px 0px #1A1A1A !important;transform:translate(-1px,-1px) !important;}" +
    " .genre-tab.is-active:active{box-shadow:1px 1px 0px #1A1A1A !important;transform:translate(2px,2px) !important;}" +
    " .genre-tab .genre-tab-count{background:rgba(26,26,26,0.12) !important;color:#1A1A1A !important;opacity:1 !important;border:1.5px solid #1A1A1A !important;}";
  }else if(activeTheme==="cyberpunk"){
    gt=" .genre-tab{border:1px solid rgba(0,255,136,0.45) !important;background:rgba(0,255,136,0.04) !important;color:#00ff88 !important;border-radius:0 !important;font-family:'Share Tech Mono',monospace !important;text-transform:uppercase !important;letter-spacing:0.08em !important;text-shadow:0 0 4px rgba(0,255,136,0.4) !important;}" +
    " .genre-tab::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,255,136,0.06) 3px,rgba(0,255,136,0.06) 4px);pointer-events:none;}" +
    " .genre-tab.is-active{background:#00ff88 !important;color:#060610 !important;border-color:#00ff88 !important;box-shadow:0 0 12px rgba(0,255,136,0.7),0 0 24px rgba(0,255,136,0.35) !important;text-shadow:none !important;}" +
    " .genre-tab .genre-tab-count{background:rgba(0,255,136,0.18) !important;color:#00ff88 !important;border-radius:0 !important;opacity:1 !important;}" +
    " .genre-tab.is-active .genre-tab-count{background:rgba(6,6,16,0.25) !important;color:#060610 !important;}";
  }else if(activeTheme==="sketch"){
    gt=" .genre-tab{border:2px dashed #2d5da1 !important;background:#ffffff !important;color:#2d5da1 !important;border-radius:127px 8px 99px 12px / 14px 99px 16px 127px !important;font-family:'Patrick Hand',cursive !important;font-size:13px !important;}" +
    " .genre-tab:nth-child(odd){transform:rotate(-1deg) !important;}" +
    " .genre-tab:nth-child(even){transform:rotate(1deg) !important;}" +
    " .genre-tab.is-active{background:#2d5da1 !important;color:#fdfbf7 !important;border-style:solid !important;border-color:#2d2d2d !important;box-shadow:3px 3px 0 #2d2d2d !important;}" +
    " .genre-tab .genre-tab-count{background:rgba(45,93,161,0.12) !important;color:#2d5da1 !important;opacity:1 !important;border-radius:99px !important;}" +
    " .genre-tab.is-active .genre-tab-count{background:rgba(253,251,247,0.25) !important;color:#fdfbf7 !important;}";
  }else if(activeTheme==="urban"){
    gt=" .genre-tabs{padding-bottom:18px !important;}" +
    " .genre-tab{background:rgba(212,255,0,0.06) !important;border:1.5px solid #D4FF00 !important;color:#D4FF00 !important;border-radius:0 !important;clip-path:polygon(10% 0,100% 0,90% 100%,0 100%) !important;padding:0 22px !important;font-family:'Oswald',sans-serif !important;text-transform:uppercase !important;letter-spacing:0.18em !important;font-weight:700 !important;}" +
    " .genre-tab.is-active{background:#D4FF00 !important;color:#050505 !important;border-color:#D4FF00 !important;box-shadow:0 0 18px rgba(212,255,0,0.55) !important;}" +
    " .genre-tab .genre-tab-count{background:rgba(212,255,0,0.15) !important;color:#D4FF00 !important;opacity:1 !important;clip-path:polygon(15% 0,100% 0,85% 100%,0 100%) !important;border-radius:0 !important;padding:3px 9px !important;}" +
    " .genre-tab.is-active .genre-tab-count{background:rgba(5,5,5,0.2) !important;color:#050505 !important;}";
  }else if(activeTheme==="deep-sea"){
    gt=" .genre-tab{background:rgba(0,255,200,0.05) !important;border:1px solid rgba(0,255,200,0.3) !important;color:#00ffc8 !important;border-radius:16px !important;backdrop-filter:blur(12px) !important;-webkit-backdrop-filter:blur(12px) !important;font-family:'Quicksand',sans-serif !important;text-shadow:0 0 6px rgba(0,255,200,0.4) !important;}" +
    " .genre-tab.is-active{background:linear-gradient(135deg,rgba(0,255,200,0.85),rgba(180,77,255,0.6)) !important;color:#040918 !important;border-color:rgba(0,255,200,0.7) !important;box-shadow:0 0 16px rgba(0,255,200,0.5),inset 0 0 8px rgba(255,255,255,0.2) !important;text-shadow:none !important;}" +
    " .genre-tab .genre-tab-count{background:rgba(0,255,200,0.12) !important;color:#00ffc8 !important;opacity:1 !important;}" +
    " .genre-tab.is-active .genre-tab-count{background:rgba(4,9,24,0.25) !important;color:#040918 !important;text-shadow:none !important;}";
  }else if(activeTheme==="psychedelic"){
    gt="@keyframes psychTabMorph{0%,100%{border-radius:18px 32px 12px 26px}25%{border-radius:32px 12px 26px 18px}50%{border-radius:12px 26px 32px 18px}75%{border-radius:26px 18px 18px 32px}}" +
    " .genre-tab{background:rgba(255,45,149,0.06) !important;border:1px solid rgba(255,45,149,0.4) !important;color:#ff2d95 !important;border-radius:18px 32px 12px 26px !important;backdrop-filter:blur(10px) !important;-webkit-backdrop-filter:blur(10px) !important;font-family:'Chicle',cursive !important;font-size:13px !important;text-shadow:0 0 8px rgba(255,45,149,0.4) !important;animation:psychTabMorph 9s ease-in-out infinite !important;}" +
    " .genre-tab:nth-child(2){animation-delay:-1.5s !important;}" +
    " .genre-tab:nth-child(3){animation-delay:-3s !important;}" +
    " .genre-tab:nth-child(4){animation-delay:-4.5s !important;}" +
    " .genre-tab:nth-child(5){animation-delay:-6s !important;}" +
    " .genre-tab:nth-child(6){animation-delay:-7.5s !important;}" +
    " .genre-tab.is-active{background:linear-gradient(135deg,#ff2d95,#b6ff2d) !important;color:#1a0a2e !important;border-color:#ff2d95 !important;box-shadow:0 0 22px rgba(255,45,149,0.6),0 0 44px rgba(182,255,45,0.3) !important;text-shadow:none !important;}" +
    " .genre-tab .genre-tab-count{background:rgba(255,45,149,0.18) !important;color:#ff2d95 !important;opacity:1 !important;}" +
    " .genre-tab.is-active .genre-tab-count{background:rgba(26,10,46,0.25) !important;color:#1a0a2e !important;text-shadow:none !important;}";
  }else if(activeTheme==="zen"){
    gt=" .genre-tab{background:rgba(212,184,90,0.05) !important;border:1px solid rgba(212,184,90,0.4) !important;color:#D4B85A !important;border-radius:8px !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;font-family:'Cormorant Garamond',serif !important;font-style:italic !important;font-size:14px !important;letter-spacing:0.02em !important;}" +
    " .genre-tab.is-active{background:#D4B85A !important;color:#1a1814 !important;border-color:#D4B85A !important;box-shadow:0 0 10px rgba(212,184,90,0.4),0 2px 0 #b8943a !important;font-style:italic !important;}" +
    " .genre-tab.is-active::after{content:'';position:absolute;left:14%;right:14%;bottom:-4px;height:2px;background:linear-gradient(90deg,transparent,#b8943a,transparent);border-radius:2px;}" +
    " .genre-tab .genre-tab-count{background:rgba(212,184,90,0.14) !important;color:#D4B85A !important;opacity:1 !important;font-style:normal !important;}" +
    " .genre-tab.is-active .genre-tab-count{background:rgba(26,24,20,0.22) !important;color:#1a1814 !important;}";
  }else if(activeTheme==="space"){
    gt=" .genre-tab{background:rgba(224,64,251,0.06) !important;border:1px solid rgba(224,64,251,0.4) !important;color:#E040FB !important;border-radius:4px !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;font-family:'Orbitron',sans-serif !important;text-transform:uppercase !important;letter-spacing:0.12em !important;font-size:11px !important;}" +
    " .genre-tab.is-active{background:linear-gradient(135deg,#E040FB,#40E0D0) !important;color:#08080F !important;border-color:#E040FB !important;box-shadow:0 0 14px rgba(224,64,251,0.55),0 0 28px rgba(64,224,208,0.3) !important;}" +
    " .genre-tab.is-active::after{content:'';position:absolute;top:3px;right:6px;width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 4px #fff,8px 4px 0 #fff,-6px 6px 0 rgba(255,255,255,0.6);animation:auroraBorder 3s linear infinite;}" +
    " .genre-tab .genre-tab-count{background:rgba(224,64,251,0.18) !important;color:#E040FB !important;opacity:1 !important;border-radius:2px !important;}" +
    " .genre-tab.is-active .genre-tab-count{background:rgba(8,8,15,0.25) !important;color:#08080F !important;}";
  }else if(activeTheme==="steampunk"){
    gt=" .genre-tab{background:rgba(200,151,62,0.06) !important;border:1px solid rgba(200,151,62,0.5) !important;color:#C8973E !important;border-radius:3px !important;box-shadow:inset 0 0 0 2px rgba(200,151,62,0.18),0 1px 0 rgba(200,151,62,0.15) !important;font-family:'Cinzel Decorative',serif !important;font-size:12px !important;letter-spacing:0.06em !important;backdrop-filter:blur(6px) !important;-webkit-backdrop-filter:blur(6px) !important;}" +
    " .genre-tab.is-active{background:linear-gradient(180deg,#D4A04A,#A87A2E) !important;color:#14110F !important;border-color:#C8973E !important;box-shadow:inset 0 0 0 2px #14110F,inset 0 0 0 4px #C8973E,0 0 12px rgba(200,151,62,0.45) !important;text-shadow:0 1px 0 rgba(20,17,15,0.3) !important;}" +
    " .genre-tab.is-active::before{content:'\\2699';position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;animation:steampunkGearSpin 6s linear infinite;}" +
    " .genre-tab.is-active{padding-left:24px !important;}" +
    " .genre-tab .genre-tab-count{background:rgba(200,151,62,0.18) !important;color:#C8973E !important;opacity:1 !important;border:1px solid rgba(200,151,62,0.35) !important;}" +
    " .genre-tab.is-active .genre-tab-count{background:rgba(20,17,15,0.3) !important;color:#14110F !important;border-color:#14110F !important;}";
  }else if(activeTheme==="retrowave"){
    gt=" .genre-tab{background:rgba(255,45,149,0.05) !important;border:1px solid rgba(255,45,149,0.5) !important;color:#FF2D95 !important;border-radius:4px !important;backdrop-filter:blur(6px) !important;-webkit-backdrop-filter:blur(6px) !important;font-family:'Audiowide',sans-serif !important;letter-spacing:0.04em !important;font-size:11px !important;text-shadow:0 0 6px rgba(255,45,149,0.55) !important;overflow:hidden !important;}" +
    " .genre-tab.is-active{background:linear-gradient(135deg,#FF2D95,#B44AFF 60%,#00BFFF) !important;color:#fff !important;border-color:#FF2D95 !important;box-shadow:0 0 14px rgba(255,45,149,0.7),0 0 28px rgba(180,74,255,0.45) !important;text-shadow:1px 0 0 #00BFFF,-1px 0 0 #FF2D95 !important;}" +
    " .genre-tab.is-active::after{content:'';position:absolute;top:0;bottom:0;left:-30%;width:30%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent);animation:retrowaveChromeSweep 3.2s linear infinite;}" +
    " @keyframes retrowaveChromeSweep{0%{left:-30%}100%{left:130%}}" +
    " .genre-tab .genre-tab-count{background:rgba(255,45,149,0.18) !important;color:#FF2D95 !important;opacity:1 !important;border-radius:2px !important;}" +
    " .genre-tab.is-active .genre-tab-count{background:rgba(255,255,255,0.22) !important;color:#fff !important;text-shadow:none !important;}";
  }
  tg.textContent=css+gt;
}
