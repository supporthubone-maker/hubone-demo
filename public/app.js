
const VI_SEED = [];
const TRANSLATIONS = {};


'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const ICONS={folder:'M3 7V4h6l3 3h9v13H3z',chart:'M4 3v18h17M8 16v-5M13 16V7M18 16V4',link:'M10 13l4-4M8 16l-1 1a4 4 0 01-6-6l4-4a4 4 0 016 0M16 8l1-1a4 4 0 016 6l-4 4a4 4 0 01-6 0',grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',menu:'M3 5h18M3 12h18M3 19h18',plus:'M12 5v14M5 12h14',x:'M6 6l12 12M18 6L6 18',check:'M5 12l4 4L19 6',refresh:'M20 7v5h-5M4 17v-5h5M19 12a7 7 0 00-12-5L4 10m16 4l-3 3a7 7 0 01-12-5',route:'M5 5h10a4 4 0 010 8H9a4 4 0 000 8h10M5 2v6M19 18v6',calendar:'M4 5h16v16H4zM7 2v6M17 2v6M4 10h16',search:'M21 21l-5-5M17 10a7 7 0 11-14 0 7 7 0 0114 0',leaf:'M19 3C9 2 3 6 5 14s13 7 14-11zM5 20L15 9',info:'M12 11v6M12 7h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0',gantt:'M3 4h18M3 20h18M5 8h7v3H5zM10 14h9v3h-9z',list:'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',pointer:'M5 3l13 9-6 1-3 6-4-16z',layers:'M12 3L2 8l10 5 10-5-10-5zM2 13l10 5 10-5M2 18l10 5 10-5',people:'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 3a4 4 0 110 8 4 4 0 010-8M20 21v-2a4 4 0 00-3-4M16 3a4 4 0 010 8',briefcase:'M8 6V3h8v3M3 6h18v15H3zM3 11l9 4 9-4M12 13v4',shield:'M12 2l9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4zM8 12l3 3 5-6',wallet:'M3 5h16v15H3zM3 5V3h14M15 10h7v6h-7z',growth:'M4 20h16M6 16v-5M12 16V7M18 16V3',clock:'M12 8v5l4 2M22 12a10 10 0 11-20 0 10 10 0 0120 0',chevron:'M6 9l6 6 6-6',arrow:'M8 5l7 7-7 7',sort:'M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4'};
function icon(name){return '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="'+(ICONS[name]||ICONS.layers)+'"/></svg>';}
function applyIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const DEFAULT_GROUPS=[
 {id:'business-kpi',name:'Phạm vi và chỉ số',color:'#53846e',bg:'#edf4ee'},
 {id:'data-governance',name:'Quản trị dữ liệu',color:'#708651',bg:'#f0f4e9'},
 {id:'data-foundation',name:'Nền tảng dữ liệu',color:'#58858a',bg:'#edf4f4'},
 {id:'mvp-experience',name:'Giao diện và phân tích',color:'#92754e',bg:'#f8f2e9'},
 {id:'pilot-validation',name:'Thử nghiệm và nghiệm thu',color:'#8875a1',bg:'#f2eef6'},
 {id:'operation-adoption',name:'Vận hành và sử dụng',color:'#6d8199',bg:'#eff2f6'},
 {id:'expansion-evolution',name:'Mở rộng và phát triển',color:'#a37c71',bg:'#f8f0ed'}
];
const DEFAULT_DOMAINS=[{id:'all',name:'Tất cả công việc',label:'Dùng chung',icon:'layers'},{id:'workforce',name:'Nhân sự',label:'Nhân sự',icon:'people'},{id:'talent',name:'Tuyển dụng',label:'Tuyển dụng',icon:'briefcase'},{id:'governance',name:'Chấm công và tuân thủ',label:'Chấm công và tuân thủ',icon:'shield'},{id:'reward',name:'Lương và thưởng',label:'Lương và thưởng',icon:'wallet'},{id:'capability',name:'Năng lực và phát triển',label:'Năng lực và phát triển',icon:'growth'}];
let GROUPS=DEFAULT_GROUPS.map(g=>({...g,active:true}));
let DOMAINS=DEFAULT_DOMAINS.map(d=>({...d,active:true}));
let PHASES=['Chuẩn hóa nền tảng','Xây phiên bản đầu','Thử nghiệm thực tế','Vận hành ổn định','Mở rộng hệ sinh thái'].map((name,i)=>({id:String(i+1),name,active:true,order:i+1}));
let STATUS_ITEMS=[{id:'not-started',name:'Chưa bắt đầu',kind:'not-started',active:true},{id:'in-progress',name:'Đang thực hiện',kind:'in-progress',active:true},{id:'completed',name:'Hoàn thành',kind:'completed',active:true}],PRIORITIES=[{id:'high',name:'Cao',active:true},{id:'medium',name:'Trung bình',active:true},{id:'low',name:'Thấp',active:true}],OWNERS=[];
function statusKind(id){return STATUS_ITEMS.find(x=>x.id===id)?.kind||(['not-started','in-progress','completed'].includes(id)?id:'not-started');}
function ownerName(id){return OWNERS.find(x=>x.id===id)?.name||id;}
let STATUSES={'not-started':'Chưa bắt đầu','in-progress':'Đang thực hiện',completed:'Hoàn thành'};
const DAY=86400000, TODAY=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const TODAY_ISO=(()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>p.find(v=>v.type===k).value).join('-');})();
const dateMs=s=>new Date(s+'T00:00:00Z').getTime();
function fmtDate(s){return s&&/^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'Chưa cập nhật';}
function fmtTime(s){return s?new Date(s).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}):'';}
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
function localizeTask(raw){const t={...raw};const tr=TRANSLATIONS[t.id];if(tr){for(const f of ['title','inputs','accept'])if(t[f]===tr.original[f])t[f]=tr.vi[f];}t.phase=Number(t.phase);t.revision=Number(t.revision)||0;return t;}
const state={tasks:[],drafts:new Map(),domain:'all',phase:0,status:'',group:'',query:'',view:'gantt',scale:'month',collapsed:new Set(),sort:'startDate',sortDir:1,cloud:true,permissions:{canEdit:false,canManage:false,role:'viewer'},catalogs:null,authToken:'',authUser:null,keepDraftsOnLoad:false,ready:false,busy:false,selected:null,loadedAt:'',actor:''};
function taskByKey(key){return state.tasks.find(t=>t.key===key);}
function effective(t){return state.drafts.get(t.key)||t;}
function allTasks(){return state.tasks.map(effective);}
function overdue(t){return statusKind(t.status)!=='completed'&&t.target<TODAY_ISO;}
function domainMatches(t,id){return id==='all'||t.domain.split(',').includes('all')||t.domain.split(',').includes(id);}
function getFiltered(){return allTasks().filter(t=>domainMatches(t,state.domain)&&(!state.phase||t.phase===state.phase)&&(!state.group||t.workstream===state.group)&&(!state.status||(state.status==='overdue'?overdue(t):t.status===state.status))&&(!state.query||normalize([t.title,t.id,t.owner,ownerName(t.owner),t.notes,t.inputs].join(' ')).includes(normalize(state.query))));}
function setNotice(message,type='info'){const n=$('#notice');n.hidden=!message;n.className='notice'+(type==='info'?'':' '+type);n.querySelector('p').textContent=message||'';}
function setFormMessage(message,type=''){const el=$('#form-message');el.textContent=message;el.className='form-message '+type;}
function updateConnection(text,type=''){const el=$('#connection');el.className='connection '+type;el.lastElementChild.textContent=text;}
function canEdit(){return state.ready&&state.permissions.canEdit;}
function canEditCurrent(){const task=state.selected?taskByKey(state.selected):null;return canEdit()&&(task?.revision?state.permissions.canUpdate!==false:state.permissions.canCreate!==false);}
function setBusy(on){state.busy=on;$('#refresh').disabled=on||!state.cloud;$('#add-task').disabled=on||!state.ready||!(state.permissions.canCreate??state.permissions.canEdit);$('#save-all').disabled=on||!canEdit();$('#save-task').disabled=on||!canEditCurrent();$('#discard-task').disabled=on||!canEdit();$('#close-drawer').disabled=on;$('#close-bottom').disabled=on;$$('#task-form input,#task-form textarea,#task-form select').forEach(x=>x.disabled=on||!canEditCurrent());$$('[name="domain"]').forEach(x=>{if(x.dataset.catalogActive==='false')x.disabled=on||!canEdit()||!x.checked;});$('#save-task').classList.toggle('busy',on);}
function updateDraftControls(){const n=state.drafts.size;$('#save-all').hidden=!n;$('#save-all').innerHTML=icon('check')+'Lưu '+n+' bản nháp';if(state.selected&&$('#task-dialog').open&&!state.busy){$('#save-task').disabled=!canEditCurrent()||!state.drafts.has(state.selected);$('#discard-task').disabled=!canEdit()||!state.drafts.has(state.selected);}}
function renderSidebar(){const tasks=allTasks();$('#domain-nav').innerHTML=DOMAINS.map(d=>'<button class="nav-btn '+(d.id===state.domain?'active':'')+'" data-domain="'+d.id+'" aria-current="'+(d.id===state.domain?'page':'false')+'">'+icon(d.icon)+'<span>'+esc(d.name)+'</span><span class="nav-count">'+tasks.filter(t=>domainMatches(t,d.id)).length+'</span></button>').join('');}
function renderStats(){const tasks=allTasks(),total=tasks.length,done=tasks.filter(t=>statusKind(t.status)==='completed').length,working=tasks.filter(t=>statusKind(t.status)==='in-progress').length,late=tasks.filter(overdue).length,pct=total?Math.round(done/total*100):0;const cards=[['Tổng công việc',total+' công việc',GROUPS.filter(g=>g.active).length+' nhóm triển khai · '+PHASES.filter(p=>p.active).length+' giai đoạn','layers',''],['Đã hoàn thành',done+' / '+total,'Tỷ lệ hoàn tất toàn bộ lộ trình','check',pct+'%'],['Đang thực hiện',working+' công việc','Đã bắt đầu và chưa hoàn thành','clock',''],['Cần theo dõi',late+' công việc','Quá ngày kết thúc, chưa hoàn thành','calendar','']];$('#stats').innerHTML=cards.map((c,i)=>'<article class="stat"><div class="stat-top"><span>'+c[0]+'</span><span class="stat-icon">'+icon(c[3])+'</span></div><div class="stat-value">'+c[1]+(c[4]?'<span class="tiny-pill">'+c[4]+'</span>':'')+'</div><p class="stat-caption">'+c[2]+'</p>'+(i===1?'<div class="stat-line"><span style="width:'+pct+'%"></span></div>':'')+'</article>').join('');}
function renderPhases(){const ts=allTasks();$('#phase-strip').innerHTML=PHASES.map((p,i)=>'<button class="phase-btn '+(state.phase===Number(p.id)?'active':'')+'" data-phase="'+esc(p.id)+'" aria-pressed="'+(state.phase===Number(p.id))+'"><span class="phase-number">'+(i+1)+'</span><span class="phase-name"><strong>'+esc(p.name)+(p.active?'':' · Ngừng sử dụng')+'</strong><small>'+ts.filter(t=>t.phase===Number(p.id)&&statusKind(t.status)==='completed').length+' / '+ts.filter(t=>t.phase===Number(p.id)).length+' việc hoàn tất</small></span></button>').join('');}
function timelineRange(){const tasks=allTasks();const starts=tasks.map(t=>t.startDate).filter(Boolean).sort(),ends=tasks.map(t=>t.target).filter(Boolean).sort();const min=starts[0]||'2026-08-01',max=ends.at(-1)||'2027-12-31';const start=dateMs(min.slice(0,7)+'-01'),m=new Date(dateMs(max));const end=Date.UTC(m.getUTCFullYear(),m.getUTCMonth()+1,1);const dayWidth=state.scale==='month'?3.4:9;return{start,end,dayWidth,width:Math.ceil((end-start)/DAY)*dayWidth};}
function renderGantt(tasks,oldScroll){const r=timelineRange(),today=(dateMs(TODAY_ISO)-r.start)/DAY*r.dayWidth,hasToday=today>=0&&today<r.width;let cells='';if(state.scale==='month'){let ms=r.start;while(ms<r.end){const d=new Date(ms),next=Math.min(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1),r.end),current=dateMs(TODAY_ISO)>=ms&&dateMs(TODAY_ISO)<next;cells+='<div class="time-cell '+(current?'current':'')+'" style="left:'+((ms-r.start)/DAY*r.dayWidth)+'px;width:'+((next-ms)/DAY*r.dayWidth)+'px">Tháng '+(d.getUTCMonth()+1)+' / '+d.getUTCFullYear()+'</div>';ms=next;}}else{for(let ms=r.start;ms<r.end;ms+=7*DAY){const d=new Date(ms),next=Math.min(ms+7*DAY,r.end);cells+='<div class="time-cell '+(dateMs(TODAY_ISO)>=ms&&dateMs(TODAY_ISO)<next?'current':'')+'" style="left:'+((ms-r.start)/DAY*r.dayWidth)+'px;width:'+((next-ms)/DAY*r.dayWidth)+'px">'+String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0')+'</div>';}}
 let rows='';for(const group of GROUPS){const ts=tasks.filter(t=>t.workstream===group.id).sort((a,b)=>a.startDate.localeCompare(b.startDate)||a.id.localeCompare(b.id));if(!ts.length)continue;const isCollapsed=state.collapsed.has(group.id),begin=Math.min(...ts.map(t=>dateMs(t.startDate))),end=Math.max(...ts.map(t=>dateMs(t.target)+DAY));rows+='<div class="gantt-row gantt-group"><button class="task-cell '+(isCollapsed?'collapsed':'')+'" data-toggle-group="'+group.id+'" aria-expanded="'+!isCollapsed+'" style="--group-color:'+group.color+'">'+icon('chevron').replace('<svg ','<svg class="chevron" ')+'<span class="group-dot"></span><span class="task-title">'+esc(group.name)+'</span><span class="group-count">'+ts.length+'</span></button><div class="time-track" style="width:'+r.width+'px"><span class="group-span" style="left:'+((begin-r.start)/DAY*r.dayWidth)+'px;width:'+((end-begin)/DAY*r.dayWidth)+'px"></span>'+(hasToday?'<span class="today-line" style="left:'+today+'px"></span>':'')+'</div></div>';
 if(isCollapsed)continue;for(const t of ts){const left=(dateMs(t.startDate)-r.start)/DAY*r.dayWidth,width=(dateMs(t.target)-dateMs(t.startDate)+DAY)/DAY*r.dayWidth,pct=t.progress===''?0:Number(t.progress),color=statusKind(t.status)==='completed'?'#5e8d70':group.color,bg=statusKind(t.status)==='completed'?'#e8f0e8':group.bg;const tip=t.title+' · '+fmtDate(t.startDate)+' – '+fmtDate(t.target)+' · '+(STATUSES[t.status]||t.status)+(t.owner?' · '+ownerName(t.owner):'');rows+='<div class="gantt-row"><button class="task-cell" data-task="'+esc(t.key)+'" title="'+esc(t.title)+'"><span class="status-dot '+statusKind(t.status)+'"'+(overdue(t)?' style="background:#b86154"':'')+'></span><span class="task-id">'+esc(t.id)+'</span><span class="task-title">'+esc(t.title)+'</span>'+(state.drafts.has(t.key)?'<span class="task-draft" aria-label="Có bản nháp">•</span>':'')+'</button><div class="time-track" style="width:'+r.width+'px;--week-width:'+(r.dayWidth*7)+'px"><button class="task-bar '+statusKind(t.status)+'" style="left:'+left+'px;width:'+width+'px;--bar-color:'+color+';--bar-bg:'+bg+'" title="'+esc(tip)+'" aria-label="'+esc(tip)+'" data-task="'+esc(t.key)+'"><span class="bar-progress" style="width:'+pct+'%"></span><span class="bar-text">'+(width>=50?esc(t.id):'')+'</span></button>'+(hasToday?'<span class="today-line" style="left:'+today+'px"></span>':'')+'</div></div>';}}
 $('#content').innerHTML='<div class="gantt-scroll" id="gantt-scroll"><div class="gantt"><div class="gantt-header"><div class="task-header"><span>Công việc / Nhóm triển khai</span><span>'+tasks.length+'</span></div><div class="time-header" style="width:'+r.width+'px">'+cells+(hasToday?'<span class="today-label" style="left:'+today+'px">Hôm nay</span>':'')+'</div></div>'+rows+'</div></div>';
 const el=$('#gantt-scroll');if(oldScroll){el.scrollLeft=oldScroll.left;el.scrollTop=oldScroll.top;}}
function renderList(tasks,oldScroll){const sorted=[...tasks].sort((a,b)=>{const av=state.sort==='progress'?(a.progress===''?-1:Number(a.progress)):String(state.sort==='owner'?ownerName(a.owner):a[state.sort]||''),bv=state.sort==='progress'?(b.progress===''?-1:Number(b.progress)):String(state.sort==='owner'?ownerName(b.owner):b[state.sort]||'');return(typeof av==='number'?av-bv:av.localeCompare(bv,'vi'))*state.sortDir;});const th=(label,field)=>'<th scope="col"><button data-sort="'+field+'" aria-label="Sắp xếp theo '+label+'">'+label+icon('sort')+'</button></th>';$('#content').innerHTML='<div class="table-scroll" id="list-scroll"><table><thead><tr>'+th('Công việc','title')+th('Nhóm công việc','workstream')+th('Ngày kết thúc','target')+th('Người phụ trách','owner')+th('Trạng thái','status')+th('Tiến độ','progress')+'</tr></thead><tbody>'+sorted.map(t=>'<tr><td><button class="table-task" data-task="'+esc(t.key)+'"><small>'+esc(t.id)+(state.drafts.has(t.key)?' · Có bản nháp':'')+'</small>'+esc(t.title)+'</button></td><td>'+esc(GROUPS.find(g=>g.id===t.workstream)?.name||t.workstream)+'</td><td>'+fmtDate(t.target)+(overdue(t)?'<br><span style="color:var(--danger)">Quá hạn</span>':'')+'</td><td>'+esc(ownerName(t.owner)||'Chưa phân công')+'</td><td><span class="status-pill '+statusKind(t.status)+'"><span class="status-dot '+statusKind(t.status)+'"></span>'+esc(STATUSES[t.status]||t.status)+'</span></td><td>'+(t.progress===''?'<span class="muted">Chưa cập nhật</span>':'<span class="progress-cell"><span class="progress-track"><span style="width:'+Number(t.progress)+'%"></span></span>'+Number(t.progress)+'%</span>')+'</td></tr>').join('')+'</tbody></table></div>';if(oldScroll){$('#list-scroll').scrollLeft=oldScroll.left;$('#list-scroll').scrollTop=oldScroll.top;}}
function renderContent(){const old=$('#gantt-scroll')||$('#list-scroll'),oldScroll=old?{left:old.scrollLeft,top:old.scrollTop}:null,tasks=getFiltered();$('#board-title').textContent=state.domain==='all'?'Toàn bộ công việc':DOMAINS.find(d=>d.id===state.domain).name;$('#result-count').textContent=tasks.length+' công việc';$('#clear-filters').classList.toggle('visible',!!(state.phase||state.status||state.group||state.query||state.domain!=='all'));$$('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===state.view);b.setAttribute('aria-pressed',String(b.dataset.view===state.view));});$('#go-today').hidden=state.view!=='gantt';$('#scale').parentElement.hidden=state.view!=='gantt';$('#expand-groups').hidden=state.view!=='gantt';$('#expand-groups').textContent=state.collapsed.size===GROUPS.length?'Mở rộng nhóm':'Thu gọn nhóm';if(!tasks.length)$('#content').innerHTML='<div class="empty">'+icon('search')+'<p>Chưa có công việc phù hợp.</p><p>Thử đổi bộ lọc hoặc tìm kiếm bằng từ khóa khác.</p></div>';else if(state.view==='gantt')renderGantt(tasks,oldScroll);else renderList(tasks,oldScroll);const r=timelineRange();$('#range-label').textContent=fmtDate(new Date(r.start).toISOString().slice(0,10))+' – '+fmtDate(new Date(r.end-DAY).toISOString().slice(0,10))+' · Lịch theo ngày dương lịch';}
function renderAll(){renderSidebar();renderStats();renderPhases();renderContent();updateDraftControls();}
async function rawRpc(method,...args){
 const perfStart=performance.now();let perfStatus='error',perfServer='',perfId='';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55000);
 try{
  const response=await fetch('/api/rpc',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-HubOne-Request':'1'},body:JSON.stringify({method,args}),signal:controller.signal});
  perfStatus=String(response.status);perfServer=response.headers.get('Server-Timing')||'';perfId=response.headers.get('X-Request-Id')||'';
  let data;try{data=await response.json();}catch(e){throw Error('Máy chủ chưa trả dữ liệu hợp lệ. Kiểm tra cấu hình Vercel.');}
  if(!response.ok||!data.ok)throw Error(data.error||'Chưa hoàn tất yêu cầu. Bấm Làm mới để kiểm tra trước khi thử lưu lại.');
  return data;
 }catch(e){if(e.name==='AbortError')throw Error('Yêu cầu quá thời gian. Bản nháp vẫn giữ; bấm Làm mới để kiểm tra kết quả trước khi lưu lại.');throw e;}
 finally{clearTimeout(timer);window.StaffingPerformance?.record({module:method,ms:performance.now()-perfStart,status:perfStatus,serverTiming:perfServer,requestId:perfId});}
}
function friendlyError(err){const text=String(err?.message||err);if(/SpreadsheetApp\.openById|Required permissions|quyền.*openById/i.test(text))return 'Chưa có đủ quyền truy cập Google Sheets. Kiểm tra Service Account, quyền chia sẻ Sheet và biến môi trường trên Vercel. Bản nháp vẫn được giữ lại.';return text;}
async function loadData(initial=false,provided=null){if(state.busy||!state.cloud)return;if(!initial&&state.drafts.size&&!confirm('Đang có '+state.drafts.size+' bản nháp chưa lưu. Làm mới thành công sẽ thay các bản nháp bằng dữ liệu từ Google Sheets. Bạn có muốn tiếp tục?'))return;setBusy(true);updateConnection('Đang tải dữ liệu');if($('#task-dialog').open)setFormMessage('Đang tải dữ liệu…');try{const agenda=typeof window!=='undefined'&&window.Hub4&&!['overview','detail','projects','catalogs'].includes(window.Hub4.state.page);const res=provided||await rpc(agenda?'getAgendaWorkspace':'getWorkspace');if(!res?.ok||!Array.isArray(res.tasks))throw Error('Phản hồi dữ liệu chưa hợp lệ.');if(!res.catalogs||!res.permissions)throw Error('Bản máy chủ chưa được nâng cấp. Kiểm tra bản triển khai Vercel và cấu trúc Google Sheets.');state.tasks=res.tasks.map(localizeTask);if(state.keepDraftsOnLoad){for(const [key,draft] of state.drafts)if(!state.tasks.some(t=>t.key===key))state.tasks.push({...draft,_missing:true});}else state.drafts.clear();state.keepDraftsOnLoad=false;state.permissions=res.permissions;if(res.user)state.authUser=res.user;state.catalogs=res.catalogs;state.ready=true;if(typeof renderWorkspaceAccess==='function')renderWorkspaceAccess();syncCatalogs();state.actor=res.actor||'';state.loadedAt=res.loadedAt;updateConnection(state.permissions.canEdit?'Đã kết nối Sheets':'Đã kết nối · Chỉ xem','online');$('#sync-time').textContent='Đồng bộ lúc '+fmtTime(res.loadedAt);$('#sidebar-actor').textContent=state.permissions.roleName||(state.permissions.role==='admin'?'Quản trị':state.permissions.canEdit?'Được chỉnh sửa':'Chỉ xem');$('#sidebar-actor').title=state.actor;updateAuthButtons();setNotice(initial?(!canEdit()?'Tài khoản chỉ có quyền xem. Liên hệ chủ sở hữu nếu cần chỉnh sửa.':''):'Đã tải dữ liệu và danh mục mới nhất từ Google Sheets.');renderAll();if(typeof window!=='undefined'&&window.Hub4)await window.Hub4.reload(res.hub);if(state.selected&&$('#task-dialog').open){if(taskByKey(state.selected))fillForm();else closeDrawer();}}catch(err){updateConnection(state.ready?'Chưa làm mới được':'Chưa kết nối được','failed');setNotice(friendlyError(err),'error');if(/Tài khoản.*(chưa được|ngừng sử dụng|không thuộc)/.test(String(err.message))){state.permissions.canEdit=false;renderCatalogControls();}if($('#task-dialog').open)setFormMessage(friendlyError(err),'error');}finally{setBusy(false);updateDraftControls();}}
function showDependencies(){const ids=$('#f-deps').value.split(',').map(s=>s.trim()).filter(Boolean);$('#dependency-labels').textContent=ids.map(id=>{const t=allTasks().find(t=>t.id===id);return t?id+': '+t.title:id+': chưa tìm thấy trong lộ trình';}).join(' · ');}
function fillForm(){const original=taskByKey(state.selected);if(!original)return;const task=effective(original);for(const id of ['f-phase','f-status','f-priority','f-owner'])for(const o of $('#'+id).options)o.disabled=o.dataset.active==='false'&&o.value!==String(task[$('#'+id).name]??'');$('#task-code').textContent=task.revision?task.id:'Công việc mới · Chưa lưu';$('#drawer-title').textContent=task.revision?'Chi tiết công việc':'Thêm công việc';for(const name of ['title','workstream','phase','startDate','target','owner','status','priority','progress','inputs','accept','deps','notes','next','blockers'])$('#task-form').elements.namedItem(name).value=task[name]??'';$$('[name="domain"]').forEach(el=>el.checked=task.domain.split(',').includes(el.value));$('#save-meta').textContent=task.updated?'Lần lưu gần nhất: '+fmtTime(task.updated)+(task.updatedBy?' · '+task.updatedBy:''):'Công việc mới chưa được lưu vào Google Sheets.';setFormMessage(!state.ready?'Bản xem thử. Mở liên kết ứng dụng đã triển khai để lưu vào Google Sheets.':!canEdit()?'Tài khoản chỉ có quyền xem.':state.drafts.has(task.key)?'Có thay đổi chưa lưu.':'Dữ liệu đã đồng bộ từ Google Sheets.');showDependencies();setBusy(state.busy);updateDraftControls();}
function openTask(key){if(state.busy)return;state.selected=key;fillForm();if(!$('#task-dialog').open)$('#task-dialog').showModal();}
function closeDrawer(){if(state.busy)return;$('#task-dialog').close();state.selected=null;renderAll();}
function captureDraft(event){if(!state.selected||!canEditCurrent()||state.busy)return;const original=taskByKey(state.selected);if(!original)return;const form=$('#task-form'),task={...(state.drafts.get(original.key)||original)};for(const name of ['title','workstream','phase','startDate','target','owner','status','priority','progress','inputs','accept','deps','notes','next','blockers'])task[name]=form.elements.namedItem(name).value;task.phase=Number(task.phase);const changed=event?.target;if(changed?.name==='domain'){const ds=$$('[name="domain"]');if(changed.value==='all'&&changed.checked)ds.forEach(el=>{if(el.value!=='all')el.checked=false;});else if(changed.value!=='all'&&changed.checked)ds.find(el=>el.value==='all').checked=false;}
 task.domain=$$('[name="domain"]:checked').map(el=>el.value).join(',');if(changed?.name==='status'&&statusKind(task.status)==='completed'){task.progress=100;form.elements.progress.value=100;}task.progress=task.progress===''?'':Number(task.progress);const fields=['title','workstream','domain','phase','startDate','target','owner','status','progress','priority','inputs','accept','deps','notes','next','blockers'];if(!original.revision||original._missing||fields.some(f=>String(original[f]??'')!==String(task[f]??'')))state.drafts.set(task.key,task);else state.drafts.delete(task.key);setFormMessage(state.drafts.has(task.key)?'Bản nháp chưa lưu · Dữ liệu sẽ được ghi khi bạn bấm Lưu.':'Dữ liệu chưa thay đổi.');showDependencies();updateDraftControls();}
function validateClient(t){if(!t.title.trim())throw Error('Nhập tên công việc.');if(!t.domain)throw Error('Chọn ít nhất một mảng nghiệp vụ.');if(!t.startDate||!t.target)throw Error('Nhập đủ ngày bắt đầu và ngày kết thúc.');for(const v of [t.startDate,t.target]){const ms=dateMs(v);if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==v)throw Error('Ngày không hợp lệ.');if(v<'2026-08-01'||v>'2027-12-31')throw Error('Chọn ngày trong khung 01/08/2026 – 31/12/2027.');}if(t.target<t.startDate)throw Error('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');if(t.progress!==''&&(!Number.isFinite(Number(t.progress))||Number(t.progress)<0||Number(t.progress)>100))throw Error('Tiến độ phải từ 0 đến 100.');if(statusKind(t.status)==='completed'&&Number(t.progress)!==100)throw Error('Công việc hoàn thành cần có tiến độ 100%.');}
async function persistDraft(key){const task=state.drafts.get(key),original=taskByKey(key);if(!task||!original)return null;validateClient(task);const res=await rpc('saveRoadmapTask',{task:{...task},expectedRevision:task.revision||0,expectedHash:task.rowHash||''});if(!res?.ok||!res.task)throw Error('Chưa xác nhận được kết quả lưu. Bản nháp vẫn được giữ lại.');const stored=localizeTask(res.task);state.tasks=state.tasks.map(t=>t.key===key?stored:t);state.drafts.delete(key);return res;}
async function saveSelected(event){event?.preventDefault();if(state.busy||!canEdit()||!state.selected)return;captureDraft();if(!$('#task-form').reportValidity())return;const key=state.selected;if(!state.drafts.has(key)){setFormMessage('Không có thay đổi cần lưu.');return;}setBusy(true);setFormMessage('Đang lưu vào Google Sheets…');try{const res=await persistDraft(key);fillForm();setFormMessage(res.auditWarning||'Đã lưu vào Google Sheets lúc '+fmtTime(res.task.updated)+'.',res.auditWarning?'warning':'success');setNotice(res.auditWarning||'Đã lưu công việc '+res.task.id+' vào Google Sheets.',res.auditWarning?'warning':'info');renderAll();}catch(err){const message=friendlyError(err);if(/quyền xem|chưa được cấp quyền|ngừng sử dụng/.test(message)){state.permissions.canEdit=false;renderCatalogControls();}setFormMessage(message,'error');setNotice(message,'error');}finally{setBusy(false);updateDraftControls();}}
async function saveAll(){if(state.busy||!canEdit()||!state.drafts.size)return;const keys=[...state.drafts.keys()];let saved=0,warnings=[];setBusy(true);if($('#task-dialog').open)setFormMessage('Đang lưu các bản nháp…');try{for(const key of keys){const result=await persistDraft(key);if(result){saved++;if(result.auditWarning)warnings.push(result.auditWarning);}}const text='Đã lưu '+saved+' công việc vào Google Sheets.'+(warnings.length?' '+warnings[0]:'');setNotice(text,warnings.length?'warning':'info');if(state.selected&&$('#task-dialog').open){fillForm();setFormMessage(text,warnings.length?'warning':'success');}}catch(err){if(/quyền xem|chưa được cấp quyền|ngừng sử dụng/.test(friendlyError(err))){state.permissions.canEdit=false;renderCatalogControls();}const text='Đã lưu '+saved+' / '+keys.length+' công việc. '+friendlyError(err)+' Các bản nháp còn lại vẫn được giữ.';setNotice(text,'error');if($('#task-dialog').open)setFormMessage(text,'error');}finally{setBusy(false);renderAll();}}
function discardTask(){if(state.busy||!state.selected)return;const key=state.selected,original=taskByKey(key);if(!state.drafts.has(key))return;if(!confirm('Hủy các thay đổi chưa lưu của công việc này?'))return;state.drafts.delete(key);if(!original.revision){state.tasks=state.tasks.filter(t=>t.key!==key);closeDrawer();}else fillForm();renderAll();}
function addTask(){if(state.busy||!state.ready||!(state.permissions.canCreate??state.permissions.canEdit))return;const date=TODAY_ISO<'2026-08-01'?'2026-08-01':TODAY_ISO>'2027-12-31'?'2027-12-31':TODAY_ISO,key='user-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));const t={key,id:'Chưa lưu',title:'',workstream:(state.group&&GROUPS.find(g=>g.id===state.group&&g.active)?state.group:GROUPS.find(g=>g.active)?.id)||'',domain:DOMAINS.find(d=>d.id===state.domain&&d.active)?state.domain:'all',phase:Number(PHASES.find(p=>p.id===String(state.phase)&&p.active)?.id||PHASES.find(p=>p.active)?.id||1),startDate:date,target:date,owner:'',status:STATUS_ITEMS.find(x=>x.active&&x.kind==='not-started')?.id||'not-started',progress:'',priority:'',inputs:'',accept:'',deps:'',notes:'',next:'',blockers:'',revision:0,updated:'',updatedBy:'',rowHash:''};state.tasks.push(t);state.drafts.set(key,{...t});renderAll();openTask(key);$('#f-title').focus();}
function goToday(){const el=$('#gantt-scroll');if(!el)return;const r=timelineRange(),left=(dateMs(TODAY_ISO)-r.start)/DAY*r.dayWidth;el.scrollTo({left:Math.max(0,left-130),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}

function syncCatalogs(){
 const catalogs=state.catalogs||{groups:DEFAULT_GROUPS.map(g=>({...g,active:true})),domains:DEFAULT_DOMAINS.map(d=>({id:d.id,name:d.label,active:true}))};
 const tasks=allTasks(),usedGroups=new Set(tasks.map(t=>t.workstream)),usedDomains=new Set(tasks.flatMap(t=>t.domain.split(',')));
 GROUPS=catalogs.groups.filter(g=>g.active||usedGroups.has(g.id)).map(g=>({id:g.id,name:g.name+(g.active?'':' · Ngừng sử dụng'),active:g.active,color:/^#[0-9a-f]{6}$/i.test(g.color)?g.color:'#53846e',bg:'#f0f5ef'}));
 usedGroups.forEach(id=>{if(!GROUPS.some(g=>g.id===id))GROUPS.push({id,name:'Chưa có danh mục: '+id,active:false,color:'#7c877e',bg:'#f1f3ef'});});
 DOMAINS=catalogs.domains.filter(d=>d.active||usedDomains.has(d.id)).map(d=>{const old=DEFAULT_DOMAINS.find(x=>x.id===d.id);return {id:d.id,label:d.name+(d.active?'':' · Ngừng sử dụng'),name:d.id==='all'?'Tất cả công việc':d.name+(d.active?'':' · Ngừng sử dụng'),active:d.active,icon:old?.icon||'layers'};});
 usedDomains.forEach(id=>{if(id&&!DOMAINS.some(d=>d.id===id))DOMAINS.push({id,label:'Chưa có danh mục: '+id,name:'Chưa có danh mục: '+id,active:false,icon:'layers'});});
 if(!DOMAINS.some(d=>d.id===state.domain))state.domain='all';if(!GROUPS.some(g=>g.id===state.group))state.group='';
 const visible=(type,field)=>{const used=new Set(tasks.map(t=>String(t[field]??'')));return (catalogs[type]||[]).filter(x=>x.active||used.has(String(x.id)));};
 if(catalogs.phases)PHASES=visible('phases','phase');if(catalogs.statuses)STATUS_ITEMS=visible('statuses','status');if(catalogs.priorities)PRIORITIES=visible('priorities','priority');if(catalogs.owners)OWNERS=visible('owners','owner');
 // Preserve legacy values even if an external edit removed their catalog rows.
 for(const [list,field] of [[PHASES,'phase'],[STATUS_ITEMS,'status'],[PRIORITIES,'priority'],[OWNERS,'owner']])for(const t of tasks){const id=String(t[field]??'');if(id&&!list.some(x=>String(x.id)===id))list.push({id,name:id,active:false,kind:statusKind(id)});}
 STATUSES=Object.fromEntries(STATUS_ITEMS.map(x=>[x.id,x.name]));
 if(state.phase&&!PHASES.some(x=>Number(x.id)===state.phase))state.phase=0;
 if(state.status&&state.status!=='overdue'&&!STATUS_ITEMS.some(x=>x.id===state.status))state.status='';
 renderCatalogControls();
}
function renderCatalogControls(){
 const option=(g,disabled=false)=>'<option value="'+esc(g.id)+'"'+(disabled&&!g.active?' disabled':'')+'>'+esc(g.name)+'</option>';
 $('#group-filter').innerHTML='<option value="">Mọi nhóm công việc</option>'+GROUPS.map(g=>option(g)).join('');$('#group-filter').value=state.group;
 $('#f-workstream').innerHTML=GROUPS.map(g=>option(g,true)).join('');
 $('#f-phase').innerHTML=PHASES.map((p,i)=>'<option value="'+esc(p.id)+'" data-active="'+p.active+'">'+(i+1)+'. '+esc(p.name)+(p.active?'':' · Ngừng sử dụng')+'</option>').join('');
 const opts=list=>list.map(x=>'<option value="'+esc(x.id)+'" data-active="'+x.active+'">'+esc(x.name)+(x.active?'':' · Ngừng sử dụng')+'</option>').join('');
 $('#f-status').innerHTML=opts(STATUS_ITEMS);
 $('#f-priority').innerHTML='<option value="">Chưa xác định</option>'+opts(PRIORITIES);
 $('#f-owner').innerHTML='<option value="">Chưa phân công</option>'+opts(OWNERS);
 $('#status-filter').innerHTML='<option value="">Mọi trạng thái</option>'+opts(STATUS_ITEMS)+'<option value="overdue">Quá hạn</option>';$('#status-filter').value=state.status;

 $('#domain-checkboxes').innerHTML=DOMAINS.map(d=>'<label><input type="checkbox" name="domain" value="'+esc(d.id)+'" data-catalog-active="'+d.active+'">'+esc(d.label)+'</label>').join('');
 $('#add-task').hidden=state.ready&&!(state.permissions.canCreate??state.permissions.canEdit);
 $('#save-task').hidden=state.ready&&!state.permissions.canEdit;
 $('#discard-task').hidden=state.ready&&!state.permissions.canEdit;
}

function init(){applyIcons();$('#today-date').textContent='Hôm nay, '+fmtDate(TODAY_ISO);renderCatalogControls();renderAll();
 $('#domain-nav').addEventListener('click',e=>{const b=e.target.closest('[data-domain]');if(!b)return;state.domain=b.dataset.domain;$('#sidebar').classList.remove('open');$('#menu-button').setAttribute('aria-expanded','false');renderAll();});$('#phase-strip').addEventListener('click',e=>{const b=e.target.closest('[data-phase]');if(!b)return;const p=Number(b.dataset.phase);state.phase=state.phase===p?0:p;renderAll();});$('.view-switch').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;state.view=b.dataset.view;renderContent();});$('#search').addEventListener('input',e=>{state.query=e.target.value;renderContent();});$('#status-filter').addEventListener('change',e=>{state.status=e.target.value;renderContent();});$('#group-filter').addEventListener('change',e=>{state.group=e.target.value;renderContent();});$('#clear-filters').addEventListener('click',()=>{Object.assign(state,{phase:0,status:'',group:'',query:'',domain:'all'});$('#search').value='';$('#status-filter').value='';$('#group-filter').value='';renderAll();});$('#content').addEventListener('click',e=>{const t=e.target.closest('[data-task]');if(t){openTask(t.dataset.task);return;}const g=e.target.closest('[data-toggle-group]');if(g){const id=g.dataset.toggleGroup;state.collapsed.has(id)?state.collapsed.delete(id):state.collapsed.add(id);renderContent();return;}const s=e.target.closest('[data-sort]');if(s){if(state.sort===s.dataset.sort)state.sortDir*=-1;else{state.sort=s.dataset.sort;state.sortDir=1;}renderContent();}});$('#expand-groups').addEventListener('click',()=>{if(state.collapsed.size===GROUPS.length)state.collapsed.clear();else GROUPS.forEach(g=>state.collapsed.add(g.id));renderContent();});$('#scale').addEventListener('change',e=>{state.scale=e.target.value;renderContent();goToday();});$('#go-today').addEventListener('click',goToday);$('#refresh').addEventListener('click',()=>loadData());$('#add-task').addEventListener('click',addTask);$('#save-all').addEventListener('click',saveAll);$('#task-form').addEventListener('submit',saveSelected);$('#task-form').addEventListener('input',captureDraft);$('#task-form').addEventListener('change',captureDraft);$('#close-drawer').addEventListener('click',closeDrawer);$('#close-bottom').addEventListener('click',closeDrawer);$('#discard-task').addEventListener('click',discardTask);$('#task-dialog').addEventListener('cancel',e=>{e.preventDefault();closeDrawer();});$('#notice .close-notice').addEventListener('click',()=>setNotice(''));$('#menu-button').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#menu-button').setAttribute('aria-expanded',String(open));});document.addEventListener('click',e=>{if(!$('#sidebar').contains(e.target)&&!$('#menu-button').contains(e.target)){$('#sidebar').classList.remove('open');$('#menu-button').setAttribute('aria-expanded','false');}});document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#sidebar').classList.remove('open');$('#menu-button').setAttribute('aria-expanded','false');}});window.addEventListener('beforeunload',e=>{if(state.drafts.size){e.preventDefault();e.returnValue='';}});
 if(typeof startAdvanced==='function')startAdvanced();startCatalogAdmin();startAuth();setTimeout(()=>{if(state.view==='gantt')goToday();},150);
}

const AUTH_STORAGE_KEY='hubone.vercel.session.v1';
let loginBusy=false,accountBusy=false,editingAccount=null,accountRows=[];
function authMessage(text,type=''){const el=$('#login-message');el.textContent=text||'';el.className='form-message '+type;}
function clearLoginSecret_(){if(typeof window!=='undefined')window.StaffingAccountUX?.resetKeyEye();const input=$('#login-password');input.value='';input.type='password';$('#toggle-password').textContent='Hiện';$('#toggle-password').setAttribute('aria-label','Hiện mật khẩu');$('#access-key').value='';}
function storeSession(session){try{if(session)sessionStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify(session));else sessionStorage.removeItem(AUTH_STORAGE_KEY);}catch(e){}}
function readSession(){try{const value=JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY)||'null');return value&&typeof value.token==='string'&&value.expiresAt>Date.now()?value:null;}catch(e){return null;}}
function updateAuthButtons(){const u=state.authUser;if(typeof window!=='undefined')window.StaffingAccountUX?.sync(state.authToken&&state.ready?u?.id:null);if(typeof window!=='undefined')window.HuBI?.setSession(state.authToken&&state.ready?{id:u?.id||u?.username}:null);$('#open-password').hidden=state.permissions.role!=='admin';$('#manage-catalogs').hidden=!(state.permissions.canManageCatalogs??state.permissions.canManage);if(typeof refreshAdvancedButtons==='function')refreshAdvancedButtons();$('#manage-accounts').hidden=!state.permissions.canManage;$('#auth-user-label').textContent=u?(u.name||u.username):'';$('#auth-user-label').title=u?u.username:'';}
function showLogin(message='',clear=false){
 if(typeof window!=='undefined'&&window.Hub4)window.Hub4.clear();
 for(const id of ['task-dialog','accounts-dialog','password-dialog','catalogs-dialog','roles-dialog','import-dialog'])if($('#'+id).open)$('#'+id).close();
 $('#roadmap-app').hidden=true;$('#auth-screen').hidden=false;
 $('#admin-login').open=false;clearIssuedKey();accountKeyState=null;
 clearLoginSecret_();$('#password-form').reset();$('#create-account-form').reset();$('#reset-account-password').value='';
 if(clear){state.tasks=[];state.drafts.clear();state.selected=null;state.authUser=null;state.catalogs=null;accountRows=[];editingAccount=null;$('#accounts-table').innerHTML='';}
 if(typeof clearAdvancedState==='function')clearAdvancedState();catalogSnapshot=null;catalogEditing=null;$('#catalog-table').innerHTML='';$('#catalog-form').reset();state.authToken='';state.ready=false;state.permissions={canEdit:false,canManage:false,role:'viewer'};storeSession(null);setBusy(false);authMessage(message);updateAuthButtons();
}
function suspendSession(message){showLogin(state.drafts.size?message+' Bản nháp đang giữ trên trang; đăng nhập lại bằng cùng tài khoản để tiếp tục.':message,false);}
async function rpc(method,...args){
 if(!state.authToken)throw new Error('AUTH_EXPIRED: Đăng nhập để tiếp tục.');
 try{return await rawRpc(method,...args,state.authToken);}catch(error){
  if(/AUTH_EXPIRED|AUTH_DENIED/.test(String(error.message)))suspendSession(String(error.message).replace(/^AUTH_\w+:\s*/,''));
  throw error;
 }
}
async function submitLogin(event){
 event.preventDefault();if(loginBusy||!state.cloud)return;if(!$('#login-form').reportValidity())return;
 loginBusy=true;$('#login-submit').disabled=true;authMessage('Đang đăng nhập…');
 const previousId=state.authUser?.id,credentials={username:$('#login-username').value,password:$('#login-password').value};
 try{
  const response=await rawRpc('signIn',credentials);credentials.password='';$('#login-password').value='';
  if(!response?.ok||!response.sessionToken||!response.user)throw Error('Chưa xác nhận được phiên đăng nhập.');
  if(previousId&&previousId!==response.user.id){state.drafts.clear();state.tasks=[];state.selected=null;}
  if(typeof window!=='undefined'&&window.Hub4)window.Hub4.clear();
  state.keepDraftsOnLoad=!!(previousId===response.user.id&&state.drafts.size);state.authToken=response.sessionToken;state.authUser=response.user;
  storeSession({token:response.sessionToken,user:response.user,expiresAt:response.expiresAt});
  $('#auth-screen').hidden=true;$('#roadmap-app').hidden=false;authMessage('');
  await loadData(true);
 }catch(error){authMessage(String(error.message||error).replace(/^AUTH_\w+:\s*/,''),'error');}
 finally{credentials.password='';clearLoginSecret_();loginBusy=false;$('#login-submit').disabled=false;}
}
async function submitKeyLogin(event){
 event.preventDefault();if(loginBusy||!state.cloud||!$('#key-login-form').reportValidity())return;
 loginBusy=true;$('#key-login-submit').disabled=true;$('#login-submit').disabled=true;authMessage('Đang xác thực…');
 const previousId=state.authUser?.id,request={key:$('#access-key').value};
 try{
  const response=await rawRpc('signInWithKey',request);request.key='';$('#access-key').value='';
  if(!response?.ok||!response.sessionToken||!response.user)throw Error('Chưa xác nhận được phiên truy cập.');
  if(previousId&&previousId!==response.user.id){state.drafts.clear();state.tasks=[];state.selected=null;}
  if(typeof window!=='undefined'&&window.Hub4)window.Hub4.clear();
  state.keepDraftsOnLoad=!!(previousId===response.user.id&&state.drafts.size);state.authToken=response.sessionToken;state.authUser=response.user;
  storeSession({token:response.sessionToken,user:response.user,expiresAt:response.expiresAt});
  $('#auth-screen').hidden=true;$('#roadmap-app').hidden=false;$('#admin-login').open=false;authMessage('');await loadData(true);
 }catch(e){authMessage(String(e.message||e).replace(/^AUTH_\w+:\s*/,''),'error');}
 finally{request.key='';clearLoginSecret_();loginBusy=false;$('#key-login-submit').disabled=false;$('#login-submit').disabled=false;}
}
async function logout(){if(typeof window!=='undefined')window.StaffingPerformance?.clear();
 if(state.busy||accountBusy)return;
 if(state.drafts.size&&!confirm('Đang có bản nháp chưa lưu. Đăng xuất sẽ bỏ các bản nháp trên trang. Tiếp tục?'))return;
 const token=state.authToken;showLogin('Đã đăng xuất khỏi thiết bị này.',true);renderAll();
 if(token)try{await rawRpc('signOut',token);}catch(e){}
}
function openPasswordDialog(){
 if(!state.authToken||state.busy||state.permissions.role!=='admin')return;
 $('#password-form').reset();$('#password-message').textContent=state.drafts.size?'Lưu hoặc hủy các bản nháp trước khi đổi mật khẩu.':'';
 $('#password-submit').disabled=!!state.drafts.size;$('#password-dialog').showModal();
}
async function submitPassword(event){
 event.preventDefault();if(accountBusy||state.drafts.size||!$('#password-form').reportValidity())return;
 if($('#new-password').value!==$('#repeat-password').value){$('#password-message').textContent='Hai lần nhập mật khẩu mới chưa khớp.';return;}
 accountBusy=true;$('#password-submit').disabled=true;$('#password-message').textContent='Đang cập nhật mật khẩu…';
 const request={currentPassword:$('#current-password').value,newPassword:$('#new-password').value};
 try{const response=await rpc('changePassword',request);if(!response?.ok)throw Error('Chưa xác nhận được kết quả.');showLogin(response.message||'Đã đổi mật khẩu. Đăng nhập lại bằng mật khẩu mới.',true);renderAll();}
 catch(error){$('#password-message').textContent=String(error.message||error);if(/^Phiên cũ/.test(String(error.message)))suspendSession(String(error.message));}
 finally{request.currentPassword='';request.newPassword='';$('#password-form').reset();accountBusy=false;$('#password-submit').disabled=false;}
}
let accountKeyState=null,keyBusy=false,keyPending=null,keyTimer=null;
function keyMessage(text,error=false){$('#account-key-message').textContent=text;$('#account-key-message').className='form-message'+(error?' error':'');$('#edit-account-message').textContent=text;}
function cancelKeyAction(){keyPending=null;$('#key-action-confirm').hidden=true;}
function clearIssuedKey(){cancelKeyAction();$('#account-custom-key').value='';$('#issued-access-key').value='';$('#issued-key-box').hidden=true;$('#key-copy-help').textContent='Sao chép và gửi riêng cho đúng user. Đóng cửa sổ sẽ xóa key khỏi màn hình.';}
function keyProgress(message){
 const started=Date.now();keyMessage(message);$('#access-key-editor').setAttribute('aria-busy','true');
 keyTimer=setInterval(()=>keyMessage(message+' ('+Math.floor((Date.now()-started)/1000)+' giây)'),1000);
}
function endKeyProgress(){clearInterval(keyTimer);keyTimer=null;$('#access-key-editor').setAttribute('aria-busy','false');}
function renderAccountKey(){
 const k=accountKeyState;$('#open-restore-account-key').hidden=!(state.permissions.role==='admin'&&k?.enabled&&!k?.canReveal);$('#open-restore-account-key').disabled=keyBusy;$('#issue-account-key').textContent=keyBusy?'Đang xử lý…':k?.revision?'Tạo lại key':'Cấp key';
 $('#issue-account-key').disabled=keyBusy||!k||!editingAccount?.active;$('#revoke-account-key').disabled=keyBusy||!k?.enabled;$('#reload-account-key').disabled=keyBusy;
 $('#save-account-key-label').disabled=keyBusy||!k?.revision;for(const id of ['account-key-mode','account-key-label','account-custom-key'])$('#'+id).disabled=keyBusy;
 $('#custom-key-field').hidden=$('#account-key-mode').value!=='custom';
 $('#account-key-status').textContent=keyBusy?'Đang xử lý key…':!k?'Chưa tải được trạng thái key.':k.enabled?'Đã cấp key · '+(k.mode==='custom'?'Tự đặt':'Tự sinh')+' · '+fmtTime(k.issuedAt):k.revision?'Key đã thu hồi.':'Chưa cấp key.';
}
async function loadAccountKey(){
 if(keyBusy||accountBusy||!editingAccount||!$('#accounts-dialog').open)return;
 const uid=editingAccount.uid;keyBusy=true;accountBusy=true;renderAccountKey();
 try{const r=await rpc('getAccountKey',{uid});if(editingAccount?.uid===uid){accountKeyState=r.key;$('#account-key-label').value=r.key.label||'Key '+editingAccount.username;}}
 catch(e){keyMessage(e.message,true);}
 finally{keyBusy=false;accountBusy=false;renderAccountKey();}
}
async function changeAccountKey(method,confirmed=false){
 if(keyBusy||accountBusy){keyMessage('Yêu cầu trước đang được xử lý. Vui lòng đợi.');return;}
 if(!editingAccount||!accountKeyState){keyMessage('Chưa tải được trạng thái key. Bấm Tải lại trạng thái trước khi cấp.',true);return;}
 const issuing=method==='issueAccountKey';
 const request={uid:editingAccount.uid,expectedHash:editingAccount.rowHash,expectedKeyRevision:accountKeyState.revision};
 if(issuing){request.keyMode=$('#account-key-mode').value;request.label=$('#account-key-label').value;
  if(request.keyMode==='custom'){request.customKey=$('#account-custom-key').value;if(!/^[A-Za-z0-9._@!#%+=:-]{7,128}$/.test(request.customKey)||!/[A-Z]/.test(request.customKey)||!/[0-9]/.test(request.customKey)||!/[._@!#%+=:-]/.test(request.customKey)){keyMessage('Key cần 7–128 ký tự, có chữ hoa, số và ký tự đặc biệt; không có khoảng trắng. Xem danh sách ký tự đặc biệt dưới ô nhập.',true);return;}}
 }
 if(!confirmed){keyPending={method,uid:editingAccount.uid};$('#key-action-confirm-text').textContent=(issuing?'Cấp key mới cho ':'Thu hồi key của ')+editingAccount.username+'? Key cũ và các phiên dùng key cũ sẽ mất hiệu lực.';$('#key-action-confirm').hidden=false;$('#confirm-key-action').focus();return;}
 if(keyPending?.uid!==editingAccount.uid||keyPending.method!==method){cancelKeyAction();return;}
 clearIssuedKey();keyBusy=true;accountBusy=true;renderAccountKey();
 keyProgress(issuing?'Đang cấp key, vui lòng đợi…':'Đang thu hồi key, vui lòng đợi…');
 try{const r=await rpc(method,request);endKeyProgress();accountKeyState=r.key;keyMessage(r.message);
  if(issuing){$('#issued-access-key').value=r.accessKey;$('#issued-key-box').hidden=false;$('#issued-key-box').scrollIntoView({block:'nearest',behavior:'smooth'});$('#issued-access-key').focus();$('#issued-access-key').select();r.accessKey='';}
  const row=accountRows.find(x=>x.uid===editingAccount.uid);if(row)row.key=r.key;renderAccounts();
 }catch(e){endKeyProgress();keyMessage(e.message,true);if(!/^KEY_(USED|INVALID|LABEL_INVALID):/.test(e.message))accountKeyState=null;}
 finally{endKeyProgress();request.customKey='';$('#account-custom-key').value='';keyBusy=false;accountBusy=false;renderAccountKey();}
}
async function saveAccountKeyLabel(){
 if(keyBusy||accountBusy||!editingAccount||!accountKeyState?.revision)return;
 const request={uid:editingAccount.uid,expectedHash:editingAccount.rowHash,expectedKeyRevision:accountKeyState.revision,expectedLabel:accountKeyState.label,label:$('#account-key-label').value};
 keyBusy=true;accountBusy=true;renderAccountKey();
 try{const r=await rpc('updateAccountKeyLabel',request);accountKeyState=r.key;$('#edit-account-message').textContent=r.message;const row=accountRows.find(x=>x.uid===editingAccount.uid);if(row)row.key=r.key;renderAccounts();}
 catch(e){$('#edit-account-message').textContent=e.message;}
 finally{keyBusy=false;accountBusy=false;renderAccountKey();}
}
function renderAccounts(){if(typeof window!=='undefined'&&window.StaffingAccountUX){window.StaffingAccountUX.renderAccounts(accountRows);return;}}

async function loadAccounts(){
 if(accountBusy||!state.permissions.canManage)return;
 accountBusy=true;$('#reload-accounts').disabled=true;$('#accounts-message').textContent='Đang tải tài khoản…';
 try{const response=await rpc('listAccounts');if(!response?.ok||!Array.isArray(response.accounts))throw Error('Chưa tải được danh sách tài khoản.');accountRows=response.accounts;if(Array.isArray(response.roles)){const options=response.roles.map(r=>'<option value="'+esc(r.label)+'">'+esc(r.name)+'</option>').join('');$('#account-role').innerHTML=options;$('#edit-account-role').innerHTML=options;if(editingAccount)$('#edit-account-role').value=editingAccount.roleLabel;}renderAccounts();$('#accounts-message').textContent=response.keySetupMessage||'';}
 catch(error){$('#accounts-message').textContent=String(error.message||error);}
 finally{accountBusy=false;$('#reload-accounts').disabled=false;}
}
async function openAccounts(){if(!state.permissions.canManage||state.busy)return;$('#backup-account-keys').hidden=state.permissions.role!=='admin';clearIssuedKey();accountKeyState=null;$('#create-account-form').hidden=true;$('#edit-account-form').hidden=true;$('#accounts-dialog').showModal();await loadAccounts();}
function openAccountEditor(index){
 const u=accountRows[index];if(!u||accountBusy)return;editingAccount=u;
 $('#create-account-form').hidden=true;$('#edit-account-form').hidden=false;$('#edit-account-heading').textContent='Tài khoản: '+u.username;
 $('#edit-account-name').value=u.name;$('#edit-account-role').value=u.roleLabel;$('#edit-account-active').checked=u.active;$('#reset-account-password').value='';$('#edit-account-message').textContent='';
 $('#reset-account-submit').disabled=u.uid===state.authUser?.id;
 clearIssuedKey();keyMessage('');accountKeyState=u.key?{...u.key}:null;
 $('#account-key-mode').value='custom';$('#account-key-label').value=accountKeyState?.label||'Key '+u.username;renderAccountKey();if(!accountKeyState)loadAccountKey();$('#edit-account-form').scrollIntoView?.({block:'start',behavior:'smooth'});
}
async function submitCreateAccount(event){
 event.preventDefault();if(accountBusy||!$('#create-account-form').reportValidity())return;
 const request={username:$('#account-username').value,email:$('#account-email').value,name:$('#account-name').value,roleLabel:$('#account-role').value,password:$('#account-password').value};
 accountBusy=true;$('#create-account-submit').disabled=true;$('#create-account-message').textContent='Đang tạo tài khoản…';
 try{const response=await rpc('createAccount',request);if(!response?.ok)throw Error('Chưa xác nhận được kết quả tạo.');$('#create-account-form').reset();$('#create-account-form').hidden=true;$('#accounts-message').textContent=response.message;accountBusy=false;await loadAccounts();$('#accounts-message').textContent=response.message;}
 catch(error){$('#create-account-message').textContent=String(error.message||error);}
 finally{request.password='';$('#account-password').value='';accountBusy=false;$('#create-account-submit').disabled=false;}
}
async function submitEditAccount(event){
 event.preventDefault();if(accountBusy||!editingAccount||!$('#edit-account-form').reportValidity())return;
 const request={uid:editingAccount.uid,expectedHash:editingAccount.rowHash,name:$('#edit-account-name').value,roleLabel:$('#edit-account-role').value,active:$('#edit-account-active').checked};
 accountBusy=true;$('#edit-account-submit').disabled=true;$('#edit-account-message').textContent='Đang cập nhật…';
 try{const response=await rpc('updateAccount',request);if(!response?.ok)throw Error('Chưa xác nhận được kết quả.');editingAccount=response.account;$('#edit-account-message').textContent=response.message;accountBusy=false;await loadAccounts();}
 catch(error){$('#edit-account-message').textContent=String(error.message||error);}
 finally{accountBusy=false;$('#edit-account-submit').disabled=false;}
}
async function submitResetPassword(){
 if(accountBusy||!editingAccount)return;
 const input=$('#reset-account-password');if(!input.value||input.value.length<12){$('#edit-account-message').textContent='Nhập mật khẩu cấp lại, ít nhất 12 ký tự.';input.focus();return;}
 if(!confirm('Đặt lại mật khẩu và thu hồi các phiên trước của '+editingAccount.username+'?'))return;
 const request={uid:editingAccount.uid,expectedHash:editingAccount.rowHash,newPassword:input.value};
 accountBusy=true;$('#reset-account-submit').disabled=true;$('#edit-account-message').textContent='Đang đặt lại mật khẩu…';
 try{const response=await rpc('resetAccountPassword',request);if(!response?.ok)throw Error('Chưa xác nhận được kết quả.');$('#edit-account-form').hidden=true;accountBusy=false;await loadAccounts();$('#accounts-message').textContent=response.message;}
 catch(error){$('#edit-account-message').textContent=String(error.message||error);}
 finally{request.newPassword='';input.value='';accountBusy=false;$('#reset-account-submit').disabled=false;}
}
function startAuth(){
 $('#confirm-key-action').addEventListener('click',()=>{if(keyPending)changeAccountKey(keyPending.method,true);});$('#cancel-key-action').addEventListener('click',cancelKeyAction);
 $('#account-key-mode').addEventListener('change',()=>{$('#account-custom-key').value='';renderAccountKey();});$('#save-account-key-label').addEventListener('click',saveAccountKeyLabel);
 $('#key-login-form').addEventListener('submit',submitKeyLogin);
 $('#open-restore-account-key').addEventListener('click',()=>{if(editingAccount&&accountKeyState)window.StaffingAccountUX?.openRestore({...editingAccount,key:accountKeyState});});$('#reload-account-key').addEventListener('click',loadAccountKey);$('#issue-account-key').addEventListener('click',()=>changeAccountKey('issueAccountKey'));$('#revoke-account-key').addEventListener('click',()=>changeAccountKey('revokeAccountKey'));
 $('#copy-access-key').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#issued-access-key').value);$('#key-copy-help').textContent='Đã sao chép. Gửi riêng cho đúng user.';}catch{$('#issued-access-key').focus();$('#issued-access-key').select();$('#key-copy-help').textContent='Nhấn Ctrl+C để sao chép key đã chọn.';}});
 $('#accounts-dialog').addEventListener('close',()=>{window.StaffingAccountUX?.hideKeys();clearIssuedKey();accountKeyState=null;});
 $('#login-form').addEventListener('submit',submitLogin);$('#toggle-password').addEventListener('click',()=>{const input=$('#login-password'),visible=input.type==='password';input.type=visible?'text':'password';$('#toggle-password').textContent=visible?'Ẩn':'Hiện';$('#toggle-password').setAttribute('aria-label',visible?'Ẩn mật khẩu':'Hiện mật khẩu');});
 $('#logout-button').addEventListener('click',logout);$('#open-password').addEventListener('click',openPasswordDialog);$('#password-form').addEventListener('submit',submitPassword);$('#manage-accounts').addEventListener('click',openAccounts);$('#reload-accounts').addEventListener('click',loadAccounts);
 $('#new-account-toggle').addEventListener('click',()=>{if(accountBusy)return;clearIssuedKey();accountKeyState=null;$('#edit-account-form').hidden=true;$('#create-account-form').hidden=!$('#create-account-form').hidden;$('#create-account-message').textContent='';$('#account-password').value='';});
 $('#accounts-table').addEventListener('click',e=>{const b=e.target.closest('[data-edit-account]');if(b)openAccountEditor(Number(b.dataset.editAccount));});$('#create-account-form').addEventListener('submit',submitCreateAccount);$('#edit-account-form').addEventListener('submit',submitEditAccount);$('#reset-account-submit').addEventListener('click',submitResetPassword);
 $$('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>{if(!accountBusy)$('#'+b.dataset.closeDialog).close();}));
 for(const id of ['accounts-dialog','password-dialog']){$('#'+id).addEventListener('cancel',e=>{if(accountBusy)e.preventDefault();});$('#'+id).addEventListener('close',()=>{$('#password-form').reset();$('#create-account-form').reset();$('#reset-account-password').value='';});}
 if(!state.cloud){$('#login-submit').disabled=true;$('#key-login-submit').disabled=true;$('#offline-auth-note').hidden=false;return;}
 const cached=readSession();if(cached){state.authToken=cached.token;state.authUser=cached.user||null;$('#auth-screen').hidden=true;$('#roadmap-app').hidden=false;loadData(true);}else{$('#auth-screen').hidden=false;$('#roadmap-app').hidden=true;}
}
let catalogSnapshot=null,catalogEditing=null,catalogBusy=false;
const CATALOG_LABELS={phases:'Giai đoạn',groups:'Nhóm công việc',domains:'Mảng nghiệp vụ',statuses:'Trạng thái',priorities:'Độ ưu tiên',owners:'Người phụ trách'};
function catalogSetBusy(on){catalogBusy=on;for(const id of ['reload-catalogs','new-catalog-item','initialize-catalogs','save-catalog-item','close-catalogs','cancel-catalog-edit','catalog-type'])$('#'+id).disabled=on;$('#catalog-form').querySelectorAll('input,select').forEach(x=>x.disabled=on);if(!on)$('#catalog-id').disabled=true;if(!on&&catalogEditing){$('#catalog-id').disabled=true;$('#catalog-kind').disabled=$('#catalog-type').value==='statuses'&&(catalogEditing.usage>0||['not-started','in-progress','completed'].includes(catalogEditing.id));}}
function renderManagedCatalogs(){
 const type=$('#catalog-type').value,rows=catalogSnapshot?.[type]||[];$('#catalog-setup').hidden=!!catalogSnapshot?.initialized;$('#new-catalog-item').disabled=!catalogSnapshot?.initialized||catalogBusy;
 const kinds={'not-started':'Chưa bắt đầu','in-progress':'Đang thực hiện',completed:'Hoàn thành'};
 $('#catalog-table').innerHTML='<table><thead><tr><th>Tên / Mã</th><th>Thứ tự</th><th>Đang dùng</th><th>Công việc</th><th>Thao tác</th></tr></thead><tbody>'+rows.map((x,i)=>'<tr><td>'+esc(x.name)+(type==='statuses'?'<br><span class="muted">'+esc(kinds[x.kind]||'')+'</span>':'')+'<br><code class="muted">'+esc(x.id)+'</code></td><td>'+esc(x.order)+'</td><td class="catalog-state">'+(x.active?'Đang sử dụng':'Ngừng sử dụng')+'</td><td>'+Number(x.usage||0)+'</td><td><button class="btn" type="button" data-edit-catalog="'+i+'"'+(!catalogSnapshot?.initialized?' disabled':'')+'>Chỉnh sửa</button></td></tr>').join('')+'</tbody></table>';
}
async function loadManagedCatalogs(){if(catalogBusy)return;catalogSetBusy(true);$('#catalog-form').hidden=true;$('#catalog-message').textContent='Đang tải danh mục…';try{const r=await rpc('listCatalogs');catalogSnapshot=r.catalogs;renderManagedCatalogs();$('#catalog-message').textContent='';}catch(e){$('#catalog-message').textContent=String(e.message||e);}finally{catalogSetBusy(false);renderManagedCatalogs();}}
async function openCatalogs(){if(!(state.permissions.canManageCatalogs??state.permissions.canManage)||state.busy||accountBusy)return;if(state.drafts.size){setNotice('Lưu hoặc hủy các bản nháp công việc trước khi quản lý danh mục.','warning');return;}$('#catalogs-dialog').showModal();await loadManagedCatalogs();}
function editCatalogItem(index=null){
 if(catalogBusy||!catalogSnapshot?.initialized)return;
 const type=$('#catalog-type').value,rows=catalogSnapshot[type];catalogEditing=index===null?null:rows[index];$('#catalog-form').reset();$('#catalog-form').hidden=false;$('#catalog-editor-heading').textContent=(catalogEditing?'Chỉnh sửa: ':'Thêm mới: ')+CATALOG_LABELS[type];
 const x=catalogEditing||{id:type==='phases'?String(Math.max(0,...rows.map(x=>Number(x.id)))+1):'',name:'',order:Math.max(0,...rows.map(x=>Number(x.order)))+1,active:true,color:'#53846e',kind:'not-started'};
 $('#catalog-id').value=catalogEditing?x.id:'';$('#catalog-id').disabled=true;$('#catalog-id').required=false;$('#catalog-id').placeholder='App tự sinh khi lưu';$('#catalog-id').maxLength=type==='owners'?150:type==='phases'?4:type==='statuses'?30:type==='priorities'?15:60;
 $('#catalog-id-hint').textContent=!catalogEditing?'App tự sinh mã mới. Người dùng chỉ cần nhập tên và chọn các thông tin bên dưới.':type==='phases'?'Mã giai đoạn là số nguyên 1–9999. Thứ tự hiển thị có thể thay đổi độc lập.':type==='owners'?'Có thể dùng mã nhân sự; các tên từ dữ liệu cũ vẫn giữ nguyên liên kết.':'Mã dùng chữ thường không dấu, số và gạch ngang; không đổi sau khi tạo.';
 $('#catalog-name').maxLength=type==='owners'?150:120;$('#catalog-name').value=x.name;$('#catalog-order').value=x.order;$('#catalog-active').checked=x.active;$('#catalog-color').value=x.color||'#53846e';$('#catalog-kind').value=x.kind||'not-started';$('#catalog-color-field').hidden=type!=='groups';$('#catalog-kind-field').hidden=type!=='statuses';$('#catalog-kind').disabled=type==='statuses'&&!!catalogEditing&&(catalogEditing.usage>0||['not-started','in-progress','completed'].includes(x.id));$('#catalog-edit-message').textContent='';$('#catalog-name').focus();
}
function applyManagedCatalogs(catalogs){catalogSnapshot=catalogs;state.catalogs=catalogs;syncCatalogs();renderAll();renderManagedCatalogs();}
async function initializeManagedCatalogs(){if(catalogBusy)return;catalogSetBusy(true);$('#catalog-message').textContent='Đang khởi tạo danh mục…';try{const r=await rpc('initializeCatalogs');applyManagedCatalogs(r.catalogs);$('#catalog-message').textContent=r.message;}catch(e){$('#catalog-message').textContent=String(e.message||e);}finally{catalogSetBusy(false);renderManagedCatalogs();}}
async function saveManagedCatalog(event){
 event.preventDefault();if(catalogBusy||!$('#catalog-form').reportValidity())return;
 const type=$('#catalog-type').value,request={type,mode:catalogEditing?'update':'create',expectedHash:catalogSnapshot.rowHash,item:{id:$('#catalog-id').value,name:$('#catalog-name').value,order:Number($('#catalog-order').value),active:$('#catalog-active').checked,color:$('#catalog-color').value,kind:$('#catalog-kind').value}};
 catalogSetBusy(true);$('#catalog-edit-message').textContent='Đang lưu danh mục…';
 try{const r=await rpc('saveCatalogItem',request);applyManagedCatalogs(r.catalogs);$('#catalog-form').hidden=true;catalogEditing=null;$('#catalog-message').textContent=r.message;}
 catch(e){$('#catalog-edit-message').textContent=String(e.message||e);}
 finally{catalogSetBusy(false);renderManagedCatalogs();if(catalogEditing&&type==='statuses')$('#catalog-kind').disabled=catalogEditing.usage>0||['not-started','in-progress','completed'].includes(catalogEditing.id);}
}
function startCatalogAdmin(){
 $('#manage-catalogs').addEventListener('click',openCatalogs);$('#reload-catalogs').addEventListener('click',loadManagedCatalogs);$('#initialize-catalogs').addEventListener('click',initializeManagedCatalogs);$('#new-catalog-item').addEventListener('click',()=>editCatalogItem());$('#catalog-form').addEventListener('submit',saveManagedCatalog);$('#catalog-type').addEventListener('change',()=>{catalogEditing=null;$('#catalog-form').hidden=true;renderManagedCatalogs();});$('#catalog-table').addEventListener('click',e=>{const b=e.target.closest('[data-edit-catalog]');if(b)editCatalogItem(Number(b.dataset.editCatalog));});$('#cancel-catalog-edit').addEventListener('click',()=>{if(!catalogBusy){$('#catalog-form').hidden=true;catalogEditing=null;}});$('#close-catalogs').addEventListener('click',()=>{if(!catalogBusy)$('#catalogs-dialog').close();});$('#catalogs-dialog').addEventListener('cancel',e=>{if(catalogBusy)e.preventDefault();});
}

init();

