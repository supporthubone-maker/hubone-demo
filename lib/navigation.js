import {randomUUID} from 'node:crypto';
import {fail,sha} from './config.js';
import {has,readRoles} from './roles.js';
export const NAV_TAB='Staffing_Navigation',NAV_LOG='Staffing_Navigation_Log';
export const NAV_HEADERS=['id','kind','parentId','name','description','icon','targetType','target','openMode','order','active','roles','revision','updated','updatedBy'];
export const NAV_LOG_HEADERS=['timestamp','actor','id','before_json','after_json'];
export const NAV_TABLES=[[NAV_TAB,NAV_HEADERS],[NAV_LOG,NAV_LOG_HEADERS]];
export const BUILTIN_PAGES=[{id:'data-mapping',name:'Chuẩn hóa dữ liệu'},{id:'hubi',name:'HuBI — Trợ lý thông tin'},{id:'oneview',name:'OneView'},{id:'len720',name:'Len720'},{id:'overview',name:'Tổng quan kế hoạch'},{id:'detail',name:'Detail Task'},{id:'projects',name:'Dự án'},{id:'catalogs',name:'Danh mục'},{id:'security',name:'Tài khoản & phân quyền'},{id:'navigation',name:'Quản lý menu & page'}];
const builtins=new Set(BUILTIN_PAGES.map(x=>x.id)),icons=new Set(['layers','calendar','shield','grid','chart','link','folder','people']);
export function navigationDefaults(){
 const base={description:'',icon:'folder',targetType:'',target:'',openMode:'',order:1,active:true,roles:[],revision:1,updated:'',updatedBy:''};
 const menu=(id,name,description,icon,order)=>({...base,id,kind:'menu',parentId:'',name,description,icon,order});
 const page=(id,parentId,name,target,order,roles=[])=>({...base,id,kind:'page',parentId,name,targetType:'builtin',target,order,roles});
 return [menu('menu-normalize','Chuẩn hóa dữ liệu','Rule, nguồn và kết quả dữ liệu','grid',3),page('page-data-mapping','menu-normalize','Xử lý dữ liệu','data-mapping',1,['admin']),menu('menu-enexus','E-Nexus','Thông tin nhân sự','people',1),menu('menu-roadmap','Roadmap','Kế hoạch triển khai','calendar',2),menu('menu-settings','Cấu hình','Quản lý hệ thống','shield',3),{...page('page-oneview','menu-enexus','OneView','oneview',1),description:'Tổng quan nhân sự'},{...page('page-len720','menu-enexus','Len720','len720',2),description:'Hồ sơ & lịch sử cá nhân'},page('page-overview','menu-roadmap','Tổng quan kế hoạch','overview',1),{...page('page-detail','menu-roadmap','Detail Task','detail',2),active:false},{...page('page-projects','menu-settings','Dự án','projects',4,['admin']),active:false},page('page-catalogs','menu-settings','Danh mục','catalogs',3),page('page-security','menu-settings','Tài khoản & phân quyền','security',2),page('page-navigation','menu-settings','Quản lý menu & page','navigation',1,['admin'])];
}
const text=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||required&&!v.trim())fail('Menu/page: tên hoặc nội dung chưa hợp lệ.');return v.trim();};
export function safePageUrl(value){
 const raw=text(value,2000,true);let url;try{url=new URL(raw);}catch{fail('Menu/page: nhập đường link HTTPS đầy đủ.');}
 if(url.protocol!=='https:'||url.username||url.password||!url.hostname)fail('Menu/page: chỉ chấp nhận link HTTPS, không kèm tài khoản/mật khẩu.');
 return url.href;
}
export function encodeNavigation(x){return NAV_HEADERS.map(k=>k==='roles'?JSON.stringify(x.roles):x[k]);}
export function readNavigation(s){
 const rows=s.tables[NAV_TAB];let entries;
 if(!rows)entries=navigationDefaults();else{
  if(rows[0]?.join('|')!==NAV_HEADERS.join('|'))fail('Menu/page: header Staffing_Navigation không đúng.');
  entries=rows.slice(1).map((row,i)=>({row,index:i})).filter(({row})=>row.some(v=>String(v??'')!=='')).map(({row,index:i})=>{
   const x=Object.fromEntries(NAV_HEADERS.map((k,n)=>[k,row[n]??'']));
   try{x.roles=JSON.parse(x.roles);}catch{fail('Menu/page: danh sách vai trò chưa hợp lệ.');}
   if(!['true','false'].includes(String(x.active).toLowerCase()))fail('Menu/page: trạng thái chưa hợp lệ.');
   x.active=String(x.active).toLowerCase()==='true';x.order=Number(x.order);x.revision=Number(x.revision);x._row=i+2;
   if(!/^(?:menu|page)-[a-zA-Z0-9-]{1,70}$/.test(x.id)||!['menu','page'].includes(x.kind)||!Number.isInteger(x.order)||!Number.isInteger(x.revision)||x.revision<1||!Array.isArray(x.roles)||x.roles.some(r=>typeof r!=='string'))fail('Menu/page: bản ghi cấu hình chưa hợp lệ.');
   if(x.kind==='page'&&(!['builtin','url'].includes(x.targetType)||x.targetType==='builtin'&&!builtins.has(x.target)||x.targetType==='url'&&!['embed','tab'].includes(x.openMode)))fail('Menu/page: đích mở page chưa hợp lệ.');
   if(x.targetType==='url')x.target=safePageUrl(x.target);
   return x;
  });
 }
 const mapper=entries.find(x=>x.targetType==='builtin'&&x.target==='data-mapping');
 if(!entries.some(x=>x.id==='menu-normalize')){const old=(!mapper||mapper.parentId==='menu-enexus')?entries.find(x=>x.id==='menu-enexus'):null;entries.push({...navigationDefaults().find(x=>x.id==='menu-normalize'),...(old?{active:old.active,roles:[...old.roles]}:{}),_row:rows?rows.length+1:undefined});}
 if(mapper?.parentId==='menu-enexus'){mapper.parentId='menu-normalize';if(mapper.name==='Chuẩn hóa dữ liệu')mapper.name='Xử lý dữ liệu';}
 if(new Set(entries.map(x=>x.id)).size!==entries.length||entries.some(x=>x.kind==='page'&&!entries.some(m=>m.kind==='menu'&&m.id===x.parentId)))fail('Menu/page: mã bị trùng hoặc thiếu menu cha.');
 const anchor=entries.find(x=>x.id==='page-navigation'),settings=entries.find(x=>x.id==='menu-settings');
 if(!anchor||anchor.kind!=='page'||anchor.targetType!=='builtin'||anchor.target!=='navigation'||anchor.parentId!=='menu-settings'||!anchor.active||!settings?.active||settings.kind!=='menu')fail('Menu/page: cần giữ mục Quản lý menu & page trong Cấu hình.');
 if(!entries.some(x=>x.target==='data-mapping')&&!entries.some(x=>x.id==='page-data-mapping'))entries.push({...navigationDefaults().find(x=>x.target==='data-mapping'),_row:rows?rows.length+(entries.filter(x=>x._row>rows.length).length)+1:undefined}); const items=entries.map(({_row,...x})=>x);
 return {entries,initialized:!!rows,rowHash:sha(JSON.stringify(items.map(encodeNavigation)))};
}
function audience(x,u){return u.role==='admin'||x.roles.length===0||x.roles.includes(u.role);}
function feature(u,target){if(['overview','detail'].includes(target))return has(u,'roadmap.view');if(target==='catalogs')return has(u,'catalogs.manage');if(['projects','navigation'].includes(target))return u.role==='admin';return true;}
export function navigationView(s,u,{forApi=false}={}){
 const {entries}=readNavigation(s),menus=entries.filter(x=>x.kind==='menu'&&x.active&&audience(x,u)),ids=new Set(menus.map(x=>x.id));
 const pages=entries.filter(x=>x.kind==='page'&&x.active&&ids.has(x.parentId)&&(forApi||x.target!=='security'||x.targetType!=='builtin'||u.role==='admin')&&audience(x,u)&&(x.targetType!=='builtin'||feature(u,x.target)));
 const clean=x=>{const {_row,...item}=x;return item;},sort=(a,b)=>a.order-b.order||a.name.localeCompare(b.name,'vi')||a.id.localeCompare(b.id);
 return {menus:menus.filter(x=>pages.some(p=>p.parentId===x.id)).map(clean).sort(sort),pages:pages.map(clean).sort(sort)};
}
export function requireNavigationAdmin(u){if(u.role!=='admin')fail('FORBIDDEN: Chỉ Quản trị được quản lý menu & page.',403);}
export function canOpenBuiltin(s,u,target){return navigationView(s,u,{forApi:true}).pages.some(p=>p.targetType==='builtin'&&p.target===target);}
export function resolveNavigation(s,u,id){const view=navigationView(s,u),page=view.pages.find(x=>x.id===id);if(!page)fail('FORBIDDEN: Page đã ngừng dùng hoặc bạn chưa được cấp quyền truy cập.',403);return {ok:true,page,menu:view.menus.find(x=>x.id===page.parentId)};}
export function requireNavigationMethod(s,u,method,req){
 let targets; if(['acceptMappingRun','getMappingDashboard','getMappingRunPreview','getMapperAccess','getMappingLibrary','saveMappingLibrary','importMappingLibrary','listMappingVersions'].includes(method))targets=['data-mapping'];
 if(['getRoadmap','saveRoadmapTask','saveWorkItem','previewHubMigration','commitHubMigration','exportData','previewImport','commitImport'].includes(method))targets=['overview','detail'];
 if(['listCatalogs','initializeCatalogs','saveCatalogItem'].includes(method))targets=['catalogs'];
 if(method==='saveHubProject'){requireNavigationAdmin(u);targets=['projects'];}
 if(['listProjectAccess','saveProjectAccess','listAccounts','getAccountKey','issueAccountKey','revokeAccountKey','updateAccountKeyLabel','createAccount','updateAccount','resetAccountPassword','changePassword','listRoles','initializeAdministration','saveRole'].includes(method))targets=['security'];
 if(targets&&!targets.some(t=>canOpenBuiltin(s,u,t)))fail('FORBIDDEN: Page chức năng đã ngừng dùng hoặc bạn chưa được cấp quyền truy cập.',403);
}
export function planNavigationSave(req,s,u){
 requireNavigationAdmin(u);const currentState=readNavigation(s);
 if(req?.expectedHash!==currentState.rowHash)fail('CONFLICT: Menu/page đã thay đổi. Tải lại trước khi lưu.',409);
 const raw=req?.item;if(!raw||!['menu','page'].includes(raw.kind))fail('Menu/page: chọn loại menu hoặc page.');
 const current=raw.id?currentState.entries.find(x=>x.id===raw.id):null;if(raw.id&&!current)fail('CONFLICT: Không tìm thấy mục cần sửa.',409);
 if(current&&current.kind!==raw.kind)fail('Menu/page: không đổi loại menu/page đã có.');
 if(currentState.entries.length>=500&&!current)fail('Menu/page: tối đa 500 menu và page.');
 const validRoles=new Set(readRoles(s).roles.map(x=>x.id));
 if(typeof raw.active!=='boolean'||!Number.isInteger(raw.order)||Math.abs(raw.order)>100000||!Array.isArray(raw.roles)||raw.roles.some(x=>!validRoles.has(x))||new Set(raw.roles).size!==raw.roles.length)fail('Menu/page: kiểm tra thứ tự, trạng thái và vai trò.');
 const next={id:current?.id||raw.kind+'-'+randomUUID(),kind:raw.kind,parentId:'',name:text(raw.name,120,true),description:text(raw.description||'',500),icon:icons.has(raw.icon)?raw.icon:'folder',targetType:'',target:'',openMode:'',order:raw.order,active:raw.active,roles:[...raw.roles].sort(),revision:(current?.revision||0)+1,updated:new Date().toISOString(),updatedBy:u.username};
 if(next.kind==='page'){
  if(!currentState.entries.some(x=>x.kind==='menu'&&x.id===raw.parentId))fail('Menu/page: chọn menu cha hợp lệ.');
  next.parentId=raw.parentId;next.targetType=raw.targetType;
  if(raw.targetType==='builtin'){if(!builtins.has(raw.target))fail('Menu/page: chọn chức năng có sẵn trong app.');next.target=raw.target;}
  else if(raw.targetType==='url'){next.target=safePageUrl(raw.target);if(!['embed','tab'].includes(raw.openMode))fail('Menu/page: chọn Nhúng hoặc Tab mới.');next.openMode=raw.openMode;}
  else fail('Menu/page: chọn Chức năng có sẵn hoặc Đường link.');
 }
 if(next.id==='menu-settings'&&(!next.active||next.roles.length))fail('Menu/page: giữ menu Cấu hình hoạt động và không giới hạn vai trò; các page con vẫn kiểm tra quyền riêng.');
 if(next.id==='page-navigation'&&(!next.active||next.parentId!=='menu-settings'||next.targetType!=='builtin'||next.target!=='navigation'||next.roles.join(',')!=='admin'))fail('Menu/page: giữ page Quản lý menu & page hoạt động, thuộc Cấu hình và chỉ dành cho admin.');
 if(currentState.entries.some(x=>x.id!==next.id&&x.kind===next.kind&&x.parentId===next.parentId&&x.name.toLocaleLowerCase('vi')===next.name.toLocaleLowerCase('vi')))fail('Menu/page: tên bị trùng trong cùng cấp.');
 return {current,next,row:current?(current._row||currentState.entries.findIndex(x=>x.id===current.id)+2):(s.tables[NAV_TAB]?.length||currentState.entries.length+1)+1};
}
