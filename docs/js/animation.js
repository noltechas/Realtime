import { render } from './render/main.js?v=20260524b';

export function captureQueueRects(){
  var rects={};
  document.querySelectorAll(".queue-item[data-q-id]").forEach(function(el){
    rects[el.getAttribute("data-q-id")]=el.getBoundingClientRect();
  });
  return rects;
}
export function flipQueueAnimation(oldRects){
  if(!oldRects)return;
  var nodes=document.querySelectorAll(".queue-item[data-q-id]");
  if(!nodes.length)return;
  // Phase 1: position every surviving item at its OLD location (no transition).
  nodes.forEach(function(el){
    var id=el.getAttribute("data-q-id");
    var oldR=oldRects[id];if(!oldR)return;
    var newR=el.getBoundingClientRect();
    var dx=oldR.left-newR.left, dy=oldR.top-newR.top;
    if(Math.abs(dx)<1&&Math.abs(dy)<1)return;
    el.style.transition="none";
    el.style.transform="translate("+dx+"px,"+dy+"px)";
    el.style.willChange="transform";
  });
  // Phase 2: on the next frame, transition them back to identity.
  requestAnimationFrame(function(){
    nodes.forEach(function(el){
      if(!el.style.transform)return;
      el.style.transition="transform 0.45s cubic-bezier(0.22,1,0.36,1)";
      el.style.transform="";
    });
    // Clean up will-change once the transition is done.
    setTimeout(function(){
      nodes.forEach(function(el){el.style.willChange="";el.style.transition="";});
    },500);
  });
}
export function renderWithQueueFlip(){
  var oldRects=captureQueueRects();
  render();
  flipQueueAnimation(oldRects);
}
