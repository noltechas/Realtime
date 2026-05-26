// In-app browser history integration for the iOS edge-swipe-back gesture.
//
// Without this, the SPA never pushes history entries — every screen change
// just mutates S.screen — so swiping back exits the page (or returns to a
// stale tab) instead of moving between screens the user actually visited.
//
// We push a history entry whenever the visible screen changes, and on
// popstate we restore S.screen from the event's state and re-render.

import { S } from './state.js';

// Pre-auth / transient screens. We never push these — the user shouldn't be
// able to swipe back into a loading spinner or the join form after they're
// already joined. Transitions OUT of one of these screens replace the entry
// instead of pushing so we don't leave a stale entry behind.
var SKIP_SCREENS={loading:1,join:1,rejoin:1,joining:1,error:1};

var _lastTrackedScreen=null;
var _suppressPush=false;
var _renderFn=null;

export function initHistory(renderFn){
  _renderFn=renderFn;
  try{
    history.replaceState({screen:S.screen,sessionCode:S.sessionCode},"",window.location.href);
  }catch(e){}
  _lastTrackedScreen=S.screen;
  window.addEventListener("popstate",function(e){
    var st=e.state;
    if(!st||!st.screen)return;
    // Cross-session entries (different ?session=) shouldn't pull us into a
    // foreign session's screen. Stay put and let the browser navigate.
    if(st.sessionCode&&S.sessionCode&&st.sessionCode!==S.sessionCode)return;
    if(SKIP_SCREENS[st.screen])return;
    _suppressPush=true;
    S.screen=st.screen;
    _lastTrackedScreen=S.screen;
    try{if(_renderFn)_renderFn();}
    finally{_suppressPush=false;}
  });
}

// Called from render() once per pass. Pushes a new history entry if the
// screen changed since the last render, or replaces the current entry if
// we're leaving a pre-auth/transient screen.
export function trackScreen(){
  if(_suppressPush)return;
  if(_lastTrackedScreen===S.screen)return;
  if(SKIP_SCREENS[S.screen]){_lastTrackedScreen=S.screen;return;}
  try{
    if(_lastTrackedScreen===null||SKIP_SCREENS[_lastTrackedScreen]){
      history.replaceState({screen:S.screen,sessionCode:S.sessionCode},"",window.location.href);
    }else{
      history.pushState({screen:S.screen,sessionCode:S.sessionCode},"",window.location.href);
    }
  }catch(e){}
  _lastTrackedScreen=S.screen;
}
