// UI shortcut restriction only. Browser-delivered code remains accessible.
(() => {
 'use strict';
 let notice,timer;
 function explain(){
  if(!notice){notice=document.createElement('div');notice.setAttribute('role','status');notice.style.cssText='position:fixed;z-index:2147483647;left:50%;bottom:24px;transform:translateX(-50%);width:max-content;max-width:90vw;padding:12px 18px;border-radius:9px;background:#183d40;color:white;box-shadow:0 5px 20px #0003;font:13px/1.5 Arial,sans-serif;pointer-events:none';notice.textContent='Thao tác này được giới hạn trong giao diện ứng dụng.';document.body.append(notice);}
  notice.hidden=false;clearTimeout(timer);timer=setTimeout(()=>notice.hidden=true,2500);
 }
 document.addEventListener('keydown',event=>{
  const key=String(event.key).toLowerCase(),ctrl=event.ctrlKey,meta=event.metaKey;
  const blocked=key==='f12'||(ctrl&&event.shiftKey&&['i','j','c','k'].includes(key))||(meta&&event.altKey&&['i','j','c','k','u'].includes(key))||((ctrl||meta)&&!event.altKey&&!event.shiftKey&&key==='u');
  if(blocked){event.preventDefault();event.stopImmediatePropagation();explain();}
 },true);
 document.addEventListener('contextmenu',event=>{
  // Preserve paste, spelling, selection and standard editing menus in forms.
  const target=event.target;
  if(target instanceof Element&&target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
  event.preventDefault();explain();
 },true);
})();
