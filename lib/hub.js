import {randomUUID} from 'node:crypto';
import {fail,sha,seal,unseal} from './config.js';
import {has,requirePermission,IMPORT_LOG,IMPORT_HEADERS} from './roles.js';
import {boolFlag_} from './domain.js';

export const PROJECTS='HubOne_Projects',ITEMS='HubOne_WorkItems',ACCESS='HubOne_ProjectAccess',MIGRATIONS='HubOne_Migrations',AUDIT='HubOne_Audit';
export const PROJECT_HEADERS=['id','name','active','order','color','revision','updated','updatedBy'];
export const ITEM_HEADERS=['id','projectId','parentId','level','title','owner','startDate','target','status','progress','priority','inputs','accept','notes','next','blockers','deps','actualEnd','revision','updated','updatedBy','legacyKey','legacyMeta'];
export const ACCESS_HEADERS=['uid','allProjects','projectIds','revision','updated','updatedBy'];
export const MIGRATION_HEADERS=['id','sourceHash','legacyCount','itemCount','updated','updatedBy'];
export const AUDIT_HEADERS=['timestamp','actor','type','id','before_json','after_json'];
export const HUB_TABLES=[[PROJECTS,PROJECT_HEADERS],[ITEMS,ITEM_HEADERS],[ACCESS,ACCESS_HEADERS],[MIGRATIONS,MIGRATION_HEADERS],[AUDIT,AUDIT_HEADERS]];
export const HUB_METHODS=['getHubWorkspace','saveHubProject','listProjectAccess','saveProjectAccess','saveWorkItem','previewHubMigration','commitHubMigration'];
function readJob(req,c){try{return unseal(req?.previewToken,c.key);}catch{fail('Nhập file: phiếu xem trước không hợp lệ.');}}
export const norm=v=>String(v??'').normalize('NFC').trim().toLocaleLowerCase('vi');
export const initialized=s=>!!s.tables[MIGRATIONS]?.slice(1).some(r=>r[0]==='v4-main');
export const fingerprint=s=>sha(JSON.stringify(HUB_TABLES.map(([n])=>s.tables[n]||null)));
export function readTable(s,tab,headers){
 const rows=s.tables[tab];if(!rows)return [];
 if(rows[0]?.join('|')!==headers.join('|'))fail('staffing: cấu trúc tab '+tab+' chưa đúng. Không đổi header trực tiếp.');
 const seen=new Set();return rows.slice(1).flatMap((r,i)=>{if(r.every(x=>String(x??'')===''))return [];
 const x=Object.fromEntries(headers.map((h,j)=>[h,String(r[j]??'')]));const id=x.id||x.uid;
 if(!id||seen.has(id))fail('staffing: mã bị thiếu hoặc trùng ở '+tab+' dòng '+(i+2));seen.add(id);
 if('revision' in x){x.revision=Number(x.revision);if(!Number.isInteger(x.revision)||x.revision<1)fail('staffing: phiên bản không hợp lệ ở '+tab);}
 if('active'in x)x.active=boolFlag_(x.active,tab);if('allProjects'in x)x.allProjects=boolFlag_(x.allProjects,tab);
 if('projectIds'in x){try{x.projectIds=JSON.parse(x.projectIds);}catch{fail('staffing: danh sách dự án chưa hợp lệ.');}if(!Array.isArray(x.projectIds)||x.projectIds.some(v=>typeof v!=='string'))fail('staffing: danh sách dự án chưa hợp lệ.');}
 if('order'in x)x.order=Number(x.order);if('progress'in x){x.progress=x.progress===''?'':Number(x.progress);if(x.progress!==''&&(!Number.isFinite(x.progress)||x.progress<0||x.progress>100))fail('staffing: tiến độ chưa hợp lệ trong Sheet.');}
 return [{...x,_row:i+2}];});
}
export const projects=s=>readTable(s,PROJECTS,PROJECT_HEADERS).sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,'vi'));
export function items(s){const list=readTable(s,ITEMS,ITEM_HEADERS),ps=projects(s);for(const x of list){const expected={task:'',subtask:'task',ticket:'subtask'}[x.level],parent=list.find(p=>p.id===x.parentId);if(expected===undefined||!ps.some(p=>p.id===x.projectId)||x.level==='task'&&x.parentId||x.level!=='task'&&(!parent||parent.level!==expected||parent.projectId!==x.projectId))fail('staffing: quan hệ Project/Task/Sub-Task/Ticket bị sai trong Sheet.');}return list;}
export const accesses=s=>readTable(s,ACCESS,ACCESS_HEADERS);
export function publicRow(x){const {_row,...p}=x;return p;}
export const rowHash=x=>sha(JSON.stringify(publicRow(x)));
export function allowedProjects(s,u){
 const all=projects(s);if(u.role==='admin')return all;
 const grant=accesses(s).find(x=>x.uid===u.uid);return all.filter(p=>grant?.allProjects||grant?.projectIds.includes(p.id));
}
export function requireProject(s,u,id){if(!allowedProjects(s,u).some(x=>x.id===id))fail('FORBIDDEN: Bạn chưa được cấp quyền truy cập dự án này.',403);}
const admin=u=>{if(u.role!=='admin')fail('FORBIDDEN: Chỉ Quản trị được quản lý dự án, phạm vi truy cập và chuyển dữ liệu.',403);};
const ready=s=>{if(!initialized(s))fail('staffing: Quản trị cần chuyển dữ liệu Roadmap sang v4 trước.');};
const text=(v,n,max,required=false)=>{if(typeof v!=='string'||v.trim().length>max||required&&!v.trim())fail('staffing: kiểm tra '+n+' (tối đa '+max+' ký tự).');return v.trim();};
function date(v){if(!v)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v||v<'2000-01-01'||v>'2100-12-31')fail('staffing: ngày cần hợp lệ, trong khoảng 2000–2100.');return v;}
export function validateItem(input,s,u,current=null){
 if(!input||typeof input!=='object')fail('staffing: thiếu công việc.');
 const out={};for(const [field,max] of Object.entries({projectId:100,parentId:100,level:10,title:300,owner:150,startDate:10,target:10,status:30,priority:15,inputs:6000,accept:6000,notes:6000,next:3000,blockers:3000,deps:1500,actualEnd:10}))out[field]=text(input[field]??'',field,max,['projectId','level','title','status'].includes(field));
 requireProject(s,u,out.projectId);if(current)requireProject(s,u,current.projectId);
 const p=projects(s).find(x=>x.id===out.projectId);if(!p?.active&&(!current||current.projectId!==out.projectId))fail('staffing: dự án đã ngừng sử dụng.');
 if(current&&out.parentId===current.id)fail('staffing: công việc không thể là cha của chính nó.');
 const list=items(s),level={task:null,subtask:'task',ticket:'subtask'};
 if(!Object.hasOwn(level,out.level))fail('staffing: chọn Task, Sub-Task hoặc Ticket.');
 if(out.level==='task'&&out.parentId)fail('staffing: Task nằm trực tiếp trong Project.');
 if(out.level!=='task'){const parent=list.find(x=>x.id===out.parentId);if(!parent||parent.level!==level[out.level]||parent.projectId!==out.projectId)fail('staffing: công việc cha không thuộc đúng cấp hoặc đúng dự án.');}
 if(current&&list.some(x=>x.parentId===current.id)&&(current.level!==out.level||current.projectId!==out.projectId||current.parentId!==out.parentId))fail('staffing: công việc đã có con; giữ cấp, dự án và công việc cha hiện tại.');
 if(!(current&&norm(current.title)===norm(out.title)&&current.projectId===out.projectId&&current.parentId===out.parentId)&&list.some(x=>x.id!==current?.id&&x.projectId===out.projectId&&x.parentId===out.parentId&&norm(x.title)===norm(out.title)))fail('staffing: tên đã tồn tại dưới cùng công việc cha. Chọn công việc hiện có để sửa.');
 const c=s.catalogs();for(const [field,ct]of [['owner','owners'],['status','statuses'],['priority','priorities']]){if(!out[field]&&field!=='status')continue;const x=c[ct].find(x=>x.id===out[field]);if(!x||!x.active&&current?.[field]!==out[field])fail('Danh mục: '+field+' chưa có hoặc đã ngừng dùng.');}
 out.progress=input.progress===''||input.progress==null?'':Number(input.progress);if(out.progress!==''&&(!Number.isFinite(out.progress)||out.progress<0||out.progress>100))fail('staffing: tiến độ cần từ 0 đến 100.');
 const kind=c.statuses.find(x=>x.id===out.status)?.kind;if(kind==='completed'){if(out.progress!==''&&out.progress!==100)fail('staffing: hoàn thành cần tiến độ 100%.');out.progress=100;}
 date(out.startDate);date(out.target);date(out.actualEnd);if(!!out.startDate!==!!out.target)fail('staffing: nhập cả ngày bắt đầu và kết thúc, hoặc để trống cả hai.');if(out.target&&out.target<out.startDate)fail('staffing: ngày kết thúc phải bằng hoặc sau bắt đầu.');
 return {...out,id:current?.id||'wi-'+randomUUID(),revision:(current?.revision||0)+1,updated:new Date().toISOString(),updatedBy:u.username,legacyKey:current?.legacyKey||'',legacyMeta:current?.legacyMeta||''};
}
export function column(n){let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
export const range=(tab,row,count)=>"'"+tab+"'!A"+row+':'+column(count)+row;
export function rowWrite(s,tab,headers,x,key='id'){
 const rows=s.tables[tab]||[headers],i=rows.findIndex((r,i)=>i>0&&String(r[headers.indexOf(key)])===String(x[key]));const row=i<0?rows.length+1:i+1;
 return {range:range(tab,row,headers.length),values:[headers.map(h=>Array.isArray(x[h])?JSON.stringify(x[h]):x[h]??'')]};
}
export function auditWrite(s,u,type,id,before,after){return {range:range(AUDIT,(s.tables[AUDIT]?.length||1)+1,AUDIT_HEADERS.length),values:[[new Date().toISOString(),u.username,type,id,JSON.stringify(before?publicRow(before):{}),JSON.stringify(after?publicRow(after):{})]]};}
function checkRevision(req,current){if(current){if(req.expectedHash!==rowHash(current)||Number(req.expectedRevision)!==current.revision)fail('CONFLICT: Dữ liệu đã thay đổi. Tải lại trước khi lưu.',409);}else if(req.expectedRevision||req.expectedHash)fail('CONFLICT: Không tìm thấy bản ghi cần sửa.',409);}
export function workspace(s,u){
 const can=has(u,'roadmap.view'),ps=can?allowedProjects(s,u):[],ids=new Set(ps.map(p=>p.id));
 return {ok:true,initialized:initialized(s),isAdmin:u.role==='admin',projects:ps.map(p=>({...publicRow(p),rowHash:rowHash(p)})),items:can?items(s).filter(x=>ids.has(x.projectId)).map(x=>({...publicRow(x),rowHash:rowHash(x)})):[],loadedAt:new Date().toISOString()};
}
function migrationSource(s){return sha(JSON.stringify(['Roadmap_Tasks','DanhMuc_TrienKhai','DanhMuc_NghiepVu','Roadmap_DanhMuc',...HUB_TABLES.map(([n])=>n)].map(n=>s.tables[n]||null)));}
export function previewMigration(req,s,u,c){
 admin(u);if(initialized(s))fail('staffing: dữ liệu đã được chuyển sang v4.');if(projects(s).length||items(s).length)fail('staffing: tab v4 đã có dữ liệu nhưng thiếu dấu hoàn tất; cần đối soát trước khi chuyển lại.');
 const name=text(req?.projectName??'','tên dự án nhận dữ liệu cũ',120,true),legacy=s.tasks(),catalogs=s.catalogs(),stamp=new Date().toISOString(),project={id:'prj-'+randomUUID(),name,active:true,order:1,color:'#287354',revision:1,updated:stamp,updatedBy:u.username};
 const created=[],groups=new Map();
 for(const t of legacy){let parent=groups.get(t.workstream);if(!parent){parent={id:'wi-'+randomUUID(),projectId:project.id,parentId:'',level:'task',title:catalogs.groups.find(g=>g.id===t.workstream)?.name||t.workstream,owner:'',startDate:'',target:'',status:catalogs.statuses.find(x=>x.kind==='not-started'&&x.active).id,progress:'',priority:'',revision:1,updated:stamp,updatedBy:u.username};groups.set(t.workstream,parent);created.push(parent);}
 created.push({...Object.fromEntries(ITEM_HEADERS.map(h=>[h,t[h]??''])),id:'wi-'+randomUUID(),projectId:project.id,parentId:parent.id,level:'subtask',title:t.title,revision:Number(t.revision),legacyKey:t.key,legacyMeta:JSON.stringify({id:t.id,workstream:t.workstream,domain:t.domain,phase:t.phase}),updated:t.updated||stamp,updatedBy:t.updatedBy||u.username});}
 const job={kind:'migration',uid:u.uid,scope:c.scope,expires:Date.now()+600000,sourceHash:migrationSource(s),project,items:created,legacyCount:legacy.length};const token=seal(job,c.key);if(token.length>1300000)fail('staffing: dữ liệu chuyển đổi quá lớn. Liên hệ người hỗ trợ để chia gói.');
 return {ok:true,projectName:name,legacyCount:legacy.length,groupCount:groups.size,itemCount:created.length,rows:created.filter(x=>x.legacyKey).map(x=>({legacyId:JSON.parse(x.legacyMeta).id,project:name,task:created.find(p=>p.id===x.parentId).title,subtask:x.title,owner:catalogs.owners.find(o=>o.id===x.owner)?.name||x.owner,startDate:x.startDate,target:x.target})),previewToken:token};
}
export async function hubAction(method,req,s,u,c,repo){
 if(method==='getHubWorkspace')return workspace(s,u);
 if(method==='previewHubMigration')return previewMigration(req,s,u,c);
 if(method==='commitHubMigration'){
 admin(u);const job=readJob(req,c);if(job.kind!=='migration'||job.uid!==u.uid||job.scope!==c.scope)fail('staffing: phiếu chuyển dữ liệu không hợp lệ.',403);
 if(initialized(s))return {ok:true,alreadyApplied:true,message:'Đã chuyển dữ liệu trước đó; không tạo trùng.'};
 if(job.expires<Date.now()||job.sourceHash!==migrationSource(s))fail('CONFLICT: Dữ liệu hoặc phiếu đã thay đổi. Xem trước chuyển đổi lại.',409);
 await repo.initializeHub();
 const writes=[{range:range(PROJECTS,2,PROJECT_HEADERS.length),values:[PROJECT_HEADERS.map(h=>job.project[h]??'')]},...(job.items.length?[{range:"'"+ITEMS+"'!A2:"+column(ITEM_HEADERS.length)+(job.items.length+1),values:job.items.map(x=>ITEM_HEADERS.map(h=>x[h]??''))}]:[]),{range:range(MIGRATIONS,2,MIGRATION_HEADERS.length),values:[['v4-main',job.sourceHash,job.legacyCount,job.items.length,new Date().toISOString(),u.username]]},auditWrite(s,u,'MIGRATE','v4-main',null,{project:job.project.name,legacyCount:job.legacyCount,itemCount:job.items.length})];
 await repo.writeHub(writes);return {ok:true,message:'Đã chuyển '+job.legacyCount+' công việc. Dữ liệu v3 được giữ nguyên để đối soát.'};
 }
 ready(s);
 if(method==='saveHubProject'){
 admin(u);const input=req?.item,current=projects(s).find(x=>x.id===input?.id);if(input?.id&&!current)fail('staffing: không tìm thấy dự án.');checkRevision(req,current);
 const name=text(input?.name,'tên dự án',120,true);if(projects(s).some(x=>x.id!==current?.id&&norm(x.name)===norm(name)))fail('staffing: tên dự án đã tồn tại.');if(typeof input.active!=='boolean'||!Number.isInteger(Number(input.order))||Math.abs(Number(input.order))>100000||!/^#[a-f0-9]{6}$/i.test(input.color))fail('staffing: kiểm tra trạng thái, màu và thứ tự dự án.');
 const next={id:current?.id||'prj-'+randomUUID(),name,active:input.active,order:Number(input.order),color:input.color,revision:(current?.revision||0)+1,updated:new Date().toISOString(),updatedBy:u.username};
 await repo.writeHub([rowWrite(s,PROJECTS,PROJECT_HEADERS,next),auditWrite(s,u,'PROJECT',next.id,current,next)]);return {ok:true,message:'Đã lưu dự án.'};
 }
 if(method==='listProjectAccess'){
 admin(u);return {ok:true,projects:projects(s).map(publicRow),accounts:s.accounts().filter(x=>x.uid).map(x=>{const a=accesses(s).find(a=>a.uid===x.uid);return {uid:x.uid,username:x.username,name:x.name,role:x.role,active:x.active,allProjects:a?.allProjects||false,projectIds:a?.projectIds||[],revision:a?.revision||0,rowHash:a?rowHash(a):''};})};
 }
 if(method==='saveProjectAccess'){
 admin(u);const target=s.accounts().find(x=>x.uid===req?.uid);if(!target||target.role==='admin')fail('staffing: Quản trị luôn truy cập toàn bộ; chọn tài khoản khác để cấp phạm vi.');const current=accesses(s).find(x=>x.uid===target.uid);checkRevision(req,current);
 if(typeof req.allProjects!=='boolean'||!Array.isArray(req.projectIds)||new Set(req.projectIds).size!==req.projectIds.length||req.projectIds.some(id=>!projects(s).some(p=>p.id===id)))fail('staffing: danh sách dự án không hợp lệ.');
 const next={uid:target.uid,allProjects:req.allProjects,projectIds:req.allProjects?[]:req.projectIds,revision:(current?.revision||0)+1,updated:new Date().toISOString(),updatedBy:u.username};await repo.writeHub([rowWrite(s,ACCESS,ACCESS_HEADERS,next,'uid'),auditWrite(s,u,'ACCESS',next.uid,current,next)]);return {ok:true,message:'Đã lưu phạm vi. Quyền mới áp dụng ngay ở yêu cầu tiếp theo.'};
 }
 if(method==='saveWorkItem'){
 const list=items(s),current=list.find(x=>x.id===req?.item?.id);if(req?.item?.id&&!current)fail('staffing: công việc không tồn tại.');
 requirePermission(u,current?'roadmap.edit':'roadmap.create');requirePermission(u,'roadmap.view');if(current)requireProject(s,u,current.projectId);checkRevision(req,current);
 const next=validateItem(req.item,s,u,current);await repo.writeHub([rowWrite(s,ITEMS,ITEM_HEADERS,next),auditWrite(s,u,'WORK_ITEM',next.id,current,next)]);return {ok:true,item:next,message:'Đã lưu công việc.'};
 }
 fail('staffing: chức năng chưa hợp lệ.');
}

// A flat file represents terminal work items. Ancestors are resolved using the full project path.
export const FILE_COLUMNS=[['project','Project'],['task','Task'],['subtask','Sub-Task'],['ticket','Ticket'],['owner','PIC'],['startDate','Ngày bắt đầu'],['target','Ngày kết thúc'],['status','Trạng thái'],['progress','Tiến độ (%)'],['priority','Độ ưu tiên'],['inputs','Nội dung thực hiện'],['accept','Điều kiện hoàn thành'],['notes','Ghi chú'],['next','Bước tiếp theo'],['blockers','Vướng mắc'],['deps','Công việc cần làm trước'],['actualEnd','Ngày hoàn thành thực tế']];
export const FILE_HEADERS=['_id','_version','_hash','_scope',...FILE_COLUMNS.map(x=>x[1])];
const fileScope=c=>sha(c.scope+':hubone-workitems-v4');
export function pathFor(x,list){const path={task:'',subtask:'',ticket:''};let p=x;for(let n=0;p&&n<3;n++){path[p.level]=p.title;p=list.find(a=>a.id===p.parentId);}return path;}
export function exportItems(req,s,u,c){
 ready(s);requirePermission(u,'roadmap.view');const ps=allowedProjects(s,u).filter(p=>!req.projectIds||req.projectIds.includes(p.id)),ids=new Set(ps.map(p=>p.id)),list=items(s).filter(x=>ids.has(x.projectId)),cat=s.catalogs();
 const label=(ct,id)=>cat[ct].find(v=>v.id===id)?.name||id;
 return {ok:true,type:'workitems',headers:FILE_HEADERS,hiddenColumns:4,maxRows:100,rows:req.template?[]:list.filter(x=>!list.some(y=>y.parentId===x.id)).map(x=>{const row={...x,...pathFor(x,list),project:ps.find(p=>p.id===x.projectId).name,owner:label('owners',x.owner),status:label('statuses',x.status),priority:label('priorities',x.priority)};return [x.id,x.revision,rowHash(x),fileScope(c),...FILE_COLUMNS.map(([h])=>row[h]??'')];}),lists:{Project:ps.filter(p=>p.active).map(p=>p.name),PIC:cat.owners.filter(x=>x.active).map(x=>x.name),'Trạng thái':cat.statuses.filter(x=>x.active).map(x=>x.name),'Độ ưu tiên':cat.priorities.filter(x=>x.active).map(x=>x.name)}};
}
function applyWrites(tables,writes){for(const w of writes){const tab=w.range.split("'")[1],n=Number(w.range.match(/!A(\d+)/)[1]);for(let i=0;i<w.values.length;i++)tables[tab][n-1+i]=w.values[i].map(v=>String(v??''));}}
export function previewItems(req,s,u,c){
 ready(s);requirePermission(u,'roadmap.view');requirePermission(u,'data.import');if(!Array.isArray(req.headers)||req.headers.join('|')!==FILE_HEADERS.join('|'))fail('Nhập file: tải đúng mẫu công việc v4.');
 if(!Array.isArray(req.rows)||!req.rows.length||req.rows.length>100||JSON.stringify(req.rows).length>650000)fail('Nhập file: mỗi lần 1–100 dòng, tối đa 650 KB.');if(s.tables[IMPORT_LOG]?.[0]?.join('|')!==IMPORT_HEADERS.join('|'))fail('Nhập file: vào Vai trò và khởi tạo phân quyền trước.');
 const stage=Object.create(Object.getPrototypeOf(s));stage.tables=structuredClone(s.tables);const writes=[],errors=[],changes=[],seenIds=new Set(),seenPaths=new Set();let created=0,updated=0,ancestors=0;
 const lookup=(ct,value,currentId)=>{if(!value&&ct!=='statuses')return '';const options=s.catalogs()[ct].filter(x=>norm(x.name)===norm(value));const old=options.find(x=>x.id===currentId);if(old)return old.id;if(options.length!==1)fail('Nhập file: '+value+' chưa có hoặc trùng trong danh mục.');return options[0].id;};
 const persist=(next,old)=>{const w=[rowWrite(stage,ITEMS,ITEM_HEADERS,next),auditWrite(stage,u,'IMPORT_WORK_ITEM',next.id,old,next)];writes.push(...w);applyWrites(stage.tables,w);};
 for(const [i,row]of req.rows.entries())try{
 if(!Array.isArray(row)||row.length>FILE_HEADERS.length||row.some(v=>v!==null&&!['string','number','boolean'].includes(typeof v)))fail('Nhập file: giá trị ô không hợp lệ.');if(row.slice(4).every(x=>!String(x??'').trim()))continue;
 const id=String(row[0]??'');if(id&&seenIds.has(id))fail('Nhập file: mã bị lặp.');if(id)seenIds.add(id);if(row[3]&&row[3]!==fileScope(c))fail('Nhập file: file không thuộc đúng app hoặc loại dữ liệu.');if(!id&&row.slice(1,4).some(v=>String(v??'').trim()))fail('Nhập file: dòng mới phải để trống bốn cột kỹ thuật.');
 const data=Object.fromEntries(FILE_COLUMNS.map(([f],j)=>[f,String(row[j+4]??'').trim()])),ps=allowedProjects(stage,u).filter(p=>norm(p.name)===norm(data.project));if(ps.length!==1)fail('Nhập file: Project chưa tồn tại hoặc bạn chưa được cấp quyền.');
 const projectId=ps[0].id;requireProject(stage,u,projectId);const current=id?items(stage).find(x=>x.id===id):null;if(id&&!current)fail('Nhập file: mã công việc không tồn tại.');if(current){requireProject(stage,u,current.projectId);if(items(stage).some(x=>x.parentId===current.id))fail('Nhập file: chỉ cập nhật đầu việc cuối cùng; sửa công việc cha trên app.');if(Number(row[1])!==current.revision||row[2]!==rowHash(current))fail('CONFLICT: Công việc đã thay đổi; tải lại file.',409);}
 requirePermission(u,current?'roadmap.edit':'roadmap.create');if(!data.task||data.ticket&&!data.subtask)fail('Nhập file: cần Task; có Ticket thì cần Sub-Task.');
 const path=[data.task,...(data.subtask?[data.subtask]:[]),...(data.ticket?[data.ticket]:[])],key=projectId+'|'+path.map(norm).join('|');if(seenPaths.has(key))fail('Nhập file: đường dẫn công việc bị lặp.');seenPaths.add(key);let parentId='';
 for(let depth=0;depth<path.length-1;depth++){const matches=items(stage).filter(x=>x.projectId===projectId&&x.parentId===parentId&&norm(x.title)===norm(path[depth]));if(matches.length>1)fail('Nhập file: công việc cha trùng tên trong cùng đường dẫn. Đổi tên trên app để phân biệt.');let parent=matches[0];if(!parent){requirePermission(u,'roadmap.create');parent=validateItem({projectId,parentId,level:['task','subtask'][depth],title:path[depth],status:s.catalogs().statuses.find(x=>x.active&&x.kind==='not-started').id},stage,u);persist(parent,null);ancestors++;}else if(!items(stage).some(x=>x.parentId===parent.id)&&!parent.legacyMeta?.includes('autoAncestor'))fail('Nhập file: công việc cha đang là đầu việc độc lập. Thêm công việc con trên app để kiểm tra chuyển cấp trước.');parentId=parent.id;}
 const dateValue=v=>/^\d{2}\/\d{2}\/\d{4}$/.test(v)?v.slice(6)+'-'+v.slice(3,5)+'-'+v.slice(0,2):v;
 const input={...data,projectId,parentId,level:['task','subtask','ticket'][path.length-1],title:path.at(-1),owner:lookup('owners',data.owner,current?.owner),status:lookup('statuses',data.status,current?.status),priority:lookup('priorities',data.priority,current?.priority),progress:data.progress===''?'':Number(data.progress.replace(',','.')),startDate:dateValue(data.startDate),target:dateValue(data.target),actualEnd:dateValue(data.actualEnd)};
 const next=validateItem(input,stage,u,current);persist(next,current);current?updated++:created++;changes.push({row:i+2,action:current?'Cập nhật':'Thêm mới',name:data.project+' / '+path.join(' / ')});
 }catch(e){errors.push({row:i+2,message:e.message});}
 if(!changes.length&&!errors.length)errors.push({row:0,message:'File chưa có công việc.'});if(errors.length)return {ok:true,canCommit:false,errors,changes,created,updated,ancestors};
 const job={kind:'workitems',id:randomUUID(),uid:u.uid,scope:c.scope,expires:Date.now()+600000,sourceHash:importFingerprint(s),writes,created,updated,ancestors,projectIds:[...new Set(changes.length?items(stage).filter(x=>writes.some(w=>w.values[0]?.[0]===x.id)).map(x=>x.projectId):[])]};const previewToken=seal(job,c.key);if(previewToken.length>1300000)fail('Nhập file: phiên quá lớn. Chia file nhỏ hơn.');return {ok:true,canCommit:true,errors:[],changes,created,updated,ancestors,previewToken};
}
const importFingerprint=s=>sha(fingerprint(s)+JSON.stringify(['Roadmap_DanhMuc','DanhMuc_TrienKhai','DanhMuc_NghiepVu'].map(n=>s.tables[n]||null)));
export async function commitItems(req,s,u,c,repo){
 ready(s);const job=readJob(req,c);if(job.kind!=='workitems'||job.uid!==u.uid||job.scope!==c.scope)fail('Nhập file: phiếu không thuộc tài khoản hoặc app này.',403);requirePermission(u,'roadmap.view');requirePermission(u,'data.import');if(job.created||job.ancestors)requirePermission(u,'roadmap.create');if(job.updated)requirePermission(u,'roadmap.edit');for(const id of job.projectIds)requireProject(s,u,id);
 const rows=s.tables[IMPORT_LOG];if(rows?.[0]?.join('|')!==IMPORT_HEADERS.join('|'))fail('Nhập file: nhật ký nhập chưa sẵn sàng.');const old=rows.find((r,i)=>i&&r[0]===job.id);if(old)return {ok:true,alreadyApplied:true,message:'Phiên nhập đã hoàn tất; không tạo trùng.'};
 if(job.expires<Date.now()||job.sourceHash!==importFingerprint(s))fail('CONFLICT: Dữ liệu, danh mục hoặc quyền đã thay đổi. Xem trước lại file.',409);
 await repo.writeHub([...job.writes,{range:range(IMPORT_LOG,rows.length+1,IMPORT_HEADERS.length),values:[[job.id,u.username,'workitems',new Date().toISOString(),job.created,job.updated,'DONE']]}]);return {ok:true,message:'Đã thêm '+job.created+' đầu việc, cập nhật '+job.updated+'; tạo '+job.ancestors+' công việc cha.'};
}
