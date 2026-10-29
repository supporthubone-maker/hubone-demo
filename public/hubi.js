(function(){
 'use strict';
 const normalize=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
 function findReply(rows,question){
  const q=normalize(question);if(!q)return {found:false,answer:''};const exact=rows.find(x=>normalize(x.question)===q);
  const item=exact||rows.find(x=>String(x.keywords||'').split(/[,;\n|]+/).map(normalize).filter(Boolean).some(k=>q===k||q.includes(k)));
  if(!item)return {found:false,answer:''};
  const active=normalize(item.status)==='active';return {found:true,active,answer:active&&String(item.answer||'').trim()?String(item.answer):'Nội dung này đang chờ cập nhật. Vui lòng liên hệ người phụ trách để được hỗ trợ.'};
 }
 const root=document.createElement('div');root.id='hubi-root';root.hidden=true;
 root.innerHTML='<button type="button" id="hubiChatButton" aria-controls="hubiChatWindow" aria-expanded="false" aria-label="Mở HuBI"><img alt="" class="hubi-chat-icon" decoding="async"></button><section id="hubiChatWindow" hidden role="dialog" aria-modal="false" aria-labelledby="hubi-title"><header class="hubi-chat-header"><div class="hubi-chat-info"><img alt="" class="hubi-header-icon" decoding="async"><div><strong id="hubi-title">HuBI</strong><small>Trợ lý hỗ trợ thông tin</small></div></div><div class="hubi-header-actions"><button type="button" id="hubiExpand" aria-label="Mở rộng HuBI" title="Mở rộng"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/></svg></button><button type="button" id="hubiChatClose" aria-label="Đóng HuBI" title="Đóng">×</button></div></header><div class="hubi-chat-body"><div class="hubi-status-row"><span id="hubiStatus" role="status" aria-live="polite"></span><button type="button" id="hubiReload">Tải lại FAQ</button></div><div id="hubiChatMessages" role="log" aria-live="polite" aria-relevant="additions text"></div><div class="hubi-quick-actions" aria-label="Câu hỏi gợi ý"><button type="button">User Guide Upload Data Spreadsheets</button><button type="button">Chi phí phân quyền user</button><button type="button">Dashboard xuất Report được không?</button></div><div class="hubi-chat-composer"><form id="hubiChatForm"><label class="hubi-sr-only" for="hubiChatInput">Câu hỏi cho HuBI</label><input id="hubiChatInput" type="text" maxlength="1000" placeholder="Nhập câu hỏi của bạn…" autocomplete="off"><button type="submit" id="hubiSend" aria-label="Gửi câu hỏi">➤</button></form><p>Câu hỏi chưa có đáp án sẽ được gửi để bổ sung FAQ.</p></div></div></section>';
 document.body.append(root);
 const $=id=>document.getElementById(id),panel=$('hubiChatWindow'),launcher=$('hubiChatButton'),input=$('hubiChatInput'),messages=$('hubiChatMessages');
 let uid='',epoch=0,faq=[],loadedAt=0,faqPromise=null,busy=false,pageHost=null,previousFocus=null;
 const controllers=new Set(),quick=[...root.querySelectorAll('.hubi-quick-actions button')];
 function linkedText(node,value){
  const text=String(value||''),regex=/https?:\/\/[^\s<>"']+/g;let start=0,m;
  while((m=regex.exec(text))){node.append(document.createTextNode(text.slice(start,m.index)));let url=m[0],suffix='';while(/[),.;!?]$/.test(url)){suffix=url.slice(-1)+suffix;url=url.slice(0,-1);}const a=document.createElement('a');a.href=url;a.textContent=url;a.target='_blank';a.rel='noopener noreferrer';node.append(a,document.createTextNode(suffix));start=m.index+m[0].length;}
  node.append(document.createTextNode(text.slice(start)));
 }
 function message(text,role='bot'){const node=document.createElement('div');node.className='hubi-message '+role;if(role==='bot')linkedText(node,text);else node.textContent=text;messages.append(node);messages.scrollTop=messages.scrollHeight;return node;}
 function replace(node,text){node.replaceChildren();linkedText(node,text);messages.scrollTop=messages.scrollHeight;}
 function controls(){input.disabled=busy;$('hubiSend').disabled=busy;quick.forEach(b=>b.disabled=busy);$('hubiReload').disabled=busy;panel.setAttribute('aria-busy',String(busy));}
 function status(text,error=false){$('hubiStatus').textContent=text;$('hubiStatus').classList.toggle('error',error);}
 async function api(method,arg,generation){
  const perfStart=performance.now();let perfStatus='error',perfServer='',perfId='';
  const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),20000);
  try{const r=await fetch('/api/rpc',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-HubOne-Request':'1'},body:JSON.stringify({method,args:arg===undefined?[]:[arg]}),signal:controller.signal});perfStatus=String(r.status);perfServer=r.headers.get('Server-Timing')||'';perfId=r.headers.get('X-Request-Id')||'';const data=await r.json();
   if(generation!==epoch)throw Error('STALE');
   if(!r.ok||!data.ok){if(/AUTH_EXPIRED|AUTH_DENIED/.test(data.error||'')&&typeof window.suspendSession==='function')window.suspendSession('Phiên truy cập đã hết hạn. Vui lòng xác thực lại.');throw Error(data.error||'HuBI chưa hoàn tất yêu cầu.');}return data;
  }finally{clearTimeout(timer);controllers.delete(controller);if(generation===epoch)window.StaffingPerformance?.record({module:method,ms:performance.now()-perfStart,status:perfStatus,serverTiming:perfServer,requestId:perfId});}
 }
 async function loadFaq(force=false){
  if(!uid)return false;if(!force&&loadedAt&&Date.now()-loadedAt<300000)return true;if(faqPromise)return faqPromise;
  const generation=epoch;status('Đang kết nối FAQ…');
  faqPromise=(async()=>{try{const data=await api('getHuBIFaq',undefined,generation);if(generation!==epoch)return false;if(!Array.isArray(data.faq))throw Error('FAQ không đúng định dạng.');faq=data.faq;loadedAt=Date.now();status(faq.length?'Sẵn sàng hỗ trợ':'FAQ hiện chưa có nội dung.');return true;}
   catch(e){if(generation!==epoch)return false;loadedAt=0;faq=[];status('Chưa kết nối được FAQ. Bấm Tải lại FAQ để thử lại.',true);return false;}
   finally{if(generation===epoch)faqPromise=null;}
  })();return faqPromise;
 }
 async function sendUnknown(question,node,generation){
  try{await api('submitHuBIQuestion',{question},generation);if(generation!==epoch)return;replace(node,'HuBI chưa có câu trả lời phù hợp. Đã gửi câu hỏi của bạn để bổ sung FAQ.');}
  catch(e){if(generation!==epoch)return;replace(node,'HuBI chưa có câu trả lời phù hợp và chưa gửi được câu hỏi.');const retry=document.createElement('button');retry.type='button';retry.className='hubi-retry';retry.textContent='Thử gửi lại';retry.addEventListener('click',async()=>{if(busy||generation!==epoch)return;busy=true;controls();retry.disabled=true;try{await sendUnknown(question,node,generation);}finally{if(generation===epoch){busy=false;controls();}}});node.append(retry);}
 }
 async function ask(question){
  const value=String(question||'').trim();if(!uid||busy||!value||value.length>1000)return;
  const generation=epoch;busy=true;controls();message(value,'user');const pending=message('Đang kiểm tra FAQ…');
  try{if(!await loadFaq()){if(generation===epoch)replace(pending,'HuBI chưa kết nối được FAQ. Bạn hãy tải lại FAQ rồi gửi lại câu hỏi.');return;}if(generation!==epoch)return;
   const result=findReply(faq,value);if(result.found)replace(pending,result.answer);else{replace(pending,'HuBI chưa có câu trả lời phù hợp. Đang gửi câu hỏi…');await sendUnknown(value,pending,generation);}
  }catch(e){if(generation===epoch)replace(pending,'HuBI chưa hoàn tất yêu cầu. Vui lòng thử lại.');}
  finally{if(generation===epoch){busy=false;controls();if(!panel.hidden)input.focus();}}
 }
 function open(){if(!uid)return;previousFocus=document.activeElement;panel.hidden=false;root.classList.add('hubi-open');launcher.setAttribute('aria-expanded','true');loadFaq();input.focus();}
 function close(){if(pageHost)return;panel.hidden=true;root.classList.remove('hubi-open');panel.classList.remove('hubi-expanded');launcher.setAttribute('aria-expanded','false');if(previousFocus?.isConnected)previousFocus.focus();}
 function detachPage(){if(!pageHost)return;root.classList.remove('hubi-open');root.append(panel);pageHost=null;panel.classList.remove('hubi-page-mode');panel.hidden=true;launcher.hidden=false;launcher.setAttribute('aria-expanded','false');}
 function attachPage(host){if(!uid||!host)return;detachPage();pageHost=host;host.append(panel);panel.classList.add('hubi-page-mode');panel.classList.remove('hubi-expanded');panel.hidden=false;launcher.hidden=true;loadFaq();}
 function setSession(user){
  const next=user?.id?String(user.id):'';if(next===uid)return;
  previousFocus=null;epoch++;controllers.forEach(c=>c.abort());controllers.clear();detachPage();uid=next;faq=[];loadedAt=0;faqPromise=null;busy=false;input.value='';messages.replaceChildren();status('');panel.hidden=true;root.classList.remove('hubi-open');panel.classList.remove('hubi-expanded');launcher.setAttribute('aria-expanded','false');root.hidden=!uid;controls();
  if(uid){root.querySelectorAll('img').forEach(img=>{if(!img.getAttribute('src'))img.src='/assets/hubi-avatar.png';});message('Xin chào! Mình là HuBI, trợ lý hỗ trợ thông tin. Bạn cần mình hỗ trợ nội dung gì?');}
 }
 launcher.addEventListener('click',()=>panel.hidden?open():close());$('hubiChatClose').addEventListener('click',close);$('hubiExpand').addEventListener('click',()=>{const expanded=panel.classList.toggle('hubi-expanded');$('hubiExpand').setAttribute('aria-label',expanded?'Thu nhỏ HuBI':'Mở rộng HuBI');});$('hubiReload').addEventListener('click',()=>loadFaq(true));
 $('hubiChatForm').addEventListener('submit',e=>{e.preventDefault();const value=input.value;input.value='';ask(value);});quick.forEach(b=>b.addEventListener('click',()=>ask(b.textContent)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden&&!pageHost)close();});
 const viewport=()=>{const v=window.visualViewport,values={'--hubi-vh':(v?.height||innerHeight)+'px','--hubi-vw':(v?.width||innerWidth)+'px','--hubi-vx':(v?.offsetLeft||0)+'px','--hubi-vy':(v?.offsetTop||0)+'px'};for(const [name,value] of Object.entries(values)){root.style.setProperty(name,value);panel.style.setProperty(name,value);}};window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);window.addEventListener('resize',viewport);viewport();
 window.HuBI={setSession,open,close,attachPage,detachPage,normalize,findReply};
})();
