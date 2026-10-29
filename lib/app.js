import {saveKeySecret,revealKeySecret,avatarData} from './profile.js';
import {createHuBIService} from './hubi.js';
import {navigationView,readNavigation,resolveNavigation,planNavigationSave,requireNavigationAdmin,requireNavigationMethod,canOpenBuiltin,BUILTIN_PAGES} from './navigation.js';
import {HUB_METHODS,hubAction,initialized,exportItems,previewItems,commitItems,allowedProjects,accesses,workspace} from './hub.js';
import {randomBytes,randomUUID} from 'node:crypto';
import * as d from './domain.js';
import {generateCatalogRequest,planCatalogSave,validateManagedAssignment} from './catalogs.js';
import {authorizeUser,has,requirePermission,accessView,readRoles,PERMISSIONS,roleForLabel,checkAssignment,canAdminister,planRoleSave,IMPORT_LOG} from './roles.js';
import {buildExport,previewImport,commitImport} from './imports.js';
import {fail,seal,unseal,privateHash,AppError} from './config.js';
import {validAccessKey,customAccessKey,keyLabel,accessKeyHash,newAccessKey,keyView,checkKeyRevision,checkKeySession} from './access-keys.js';
const MAX_AGE=8*60*60*1000, IDLE=60*60*1000;
export const METHODS=new Set(['acceptMappingRun','getMappingDashboard','getMappingRunPreview','getMapperAccess','getMappingLibrary','saveMappingLibrary','importMappingLibrary','listMappingVersions','restoreAccountKey','backupAccountKeys','getAccountAvatars','saveAccountAvatar','revealAccountKey','openNavigationPage','getHuBIFaq','submitHuBIQuestion','getAgendaWorkspace','getNavigation','resolveNavigationPage','listNavigation','saveNavigationItem',...HUB_METHODS,'signInWithKey','getAccountKey','issueAccountKey','revokeAccountKey','updateAccountKeyLabel','signIn','signOut','getRoadmap','saveRoadmapTask','listAccounts','createAccount','updateAccount','resetAccountPassword','changePassword','listCatalogs','initializeCatalogs','saveCatalogItem','getWorkspace','listRoles','initializeAdministration','saveRole','exportData','previewImport','commitImport']);
function importJob(req,c){try{return unseal(req?.previewToken,c.key);}catch{fail('Nhập file: phiếu xác nhận không hợp lệ. Xem trước lại file.');}}
const invalid=()=>fail('AUTH_INVALID: Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản chưa được kích hoạt.',401);
const expired=()=>fail('AUTH_EXPIRED: Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.',401);
function authFailure(r){if(r.status===429)fail('AUTH_RATE_LIMIT: Có quá nhiều lần thử. Đợi vài phút rồi thử lại.',429);if(r.status>=500)fail('AUTH_SERVICE_UNAVAILABLE: Dịch vụ đăng nhập tạm thời chưa sẵn sàng.',503);invalid();}
function userFrom(data){const u=data?.user||data;if(!d.uuid_(u?.id))fail('AUTH_SERVICE_UNAVAILABLE: Chưa xác minh được tài khoản.',503);return u;}
function checkProvider(data,u){const v=userFrom(data);if(v.id.toLowerCase()!==u.uid||String(v.email||'').toLowerCase()!==u.email)invalid();return v;}
function providerSession(data,u,createdAt=Date.now()){checkProvider(data,u);if(typeof data.access_token!=='string'||typeof data.refresh_token!=='string'||!Number.isFinite(Number(data.expires_in))||Number(data.expires_in)<=0)fail('AUTH_SERVICE_UNAVAILABLE: Phiên đăng nhập chưa hợp lệ.',503);return {uid:u.uid,authVersion:u.authVersion,authMethod:'password',verifiedAdminPassword:u.role==='admin',access:data.access_token,refresh:data.refresh_token,providerExpires:Date.now()+Number(data.expires_in)*1000,createdAt};}
export function application({c,repo,store,auth,hubi=createHuBIService(c),trace=null,rules=null,mappingLibrary=null,mappingResults=null}){
 const snapshotFor=method=>repo.loadFor?repo.loadFor(method):repo.loadAll();
 async function persist(token,s){await store.put(token,{payload:seal(s,c.key),expires_at:new Date(s.createdAt+MAX_AGE).toISOString(),last_seen:new Date().toISOString()});}
 async function accountSession(token,method,readOnly=false){
  if(typeof token!=='string'||!/^hv_[a-f0-9]{64}$/.test(token))expired();
  const row=await store.get(token);if(!row)expired();
  if(Date.parse(row.expires_at)<=Date.now()||Date.parse(row.last_seen)+IDLE<=Date.now()){await store.remove(token);expired();}
  const s=unseal(row.payload,c.key);if(!Number.isFinite(s.createdAt)||s.createdAt+MAX_AGE<=Date.now())expired();
  if(readOnly&&s.authMethod!=='key'&&s.providerExpires<=Date.now()+60000)return store.withLock(()=>accountSession(token,method));
  const touch=async()=>{if(readOnly&&store.touch){if(!await store.touch(token))expired();}else await persist(token,s);};
  const parallelAuth=readOnly&&s.authMethod==='password'&&s.verifiedAdminPassword===true;
  const [snap,keyRow,providerChecked]=await Promise.all([snapshotFor(method),s.authMethod==='key'?store.getAccountKey(s.uid):Promise.resolve(null),parallelAuth?auth('GET','user',undefined,s.access):Promise.resolve(null)]);let u=snap.accounts().find(a=>a.uid===s.uid);
  if(!u?.active||!u.username||u.authVersion!==s.authVersion){await store.remove(token);fail('AUTH_DENIED: Tài khoản đã ngừng sử dụng hoặc phiên đã bị thu hồi.',403);}
  // Also retire password sessions issued to ordinary users by older deployments.
  if(s.authMethod!=='key'&&u.role!=='admin'){await store.remove(token);fail('AUTH_DENIED: Phiên tài khoản/mật khẩu chỉ dành cho Quản trị. Vui lòng nhập key cá nhân để tiếp tục.',403);}
  if(s.authMethod==='key'){
   try{checkKeySession(keyRow,s);}catch(e){if(e.status===403)await store.remove(token);throw e;}
   u=authorizeUser(u,snap);await touch();return {u,s,snap};
  }
  if(s.providerExpires<=Date.now()+60000){const r=await auth('POST','token?grant_type=refresh_token',{refresh_token:s.refresh});if(!r.ok){if([400,401,403].includes(r.status)){await store.remove(token);expired();}authFailure(r);}Object.assign(s,providerSession(r.data,u,s.createdAt));await persist(token,s);}
  u=authorizeUser(u,snap);
  const checked=providerChecked||await auth('GET','user',undefined,s.access);if(!checked.ok){if([401,403].includes(checked.status)){await store.remove(token);expired();}authFailure(checked);}checkProvider(checked.data,u);await touch();
  return {u,s,snap};
 }
 function requireAdmin(u){requirePermission(u,'accounts.manage');}
 function editable(u){if(u.role==='viewer')fail('Tài khoản chỉ có quyền xem. Không được thêm hoặc lưu công việc.',403);}
 function checkHash(request,u){if(!u)fail('Không tìm thấy tài khoản liên kết.');if(request.expectedHash!==d.accountHash_(u))fail('CONFLICT: Tài khoản đã được sửa. Tải lại danh sách trước khi cập nhật.',409);}
 function workspaceResponse(snap,u,includeHub=true){
  const all=snap,canView=has(u,'roadmap.view')&&['overview','detail'].some(t=>canOpenBuiltin(snap,u,t));let data={ok:true,actor:u.username,user:{...d.publicAccount_(u),roleName:u.roleName},permissions:accessView(u),catalogs:canView||has(u,'catalogs.manage')?all.catalogs():{groups:[],domains:[],phases:[],statuses:[],priorities:[],owners:[]},hubVersion:initialized(snap)?4:3,tasks:canView&&!initialized(snap)?all.tasks().map(d.localizePublicTask_):[],loadedAt:new Date().toISOString()};
    if(includeHub){data.hub=workspace(snap,u);data.hub.roadmapLoaded=true;data.hub.navigation=navigationView(snap,u);if(!canView){data.hub.items=[];data.hub.projects=[];}}
  return data;
 }
 async function backupKeys(rows){
  if(!repo.backupAccountKeys)return {ok:false,message:'Chưa có bộ đồng bộ key. Cập nhật đầy đủ source.'};
  try{
   const pending=rows.filter(row=>row.enabled&&!row.key_ciphertext);
   const existing=pending.length&&repo.readAccountKeyBackups?await repo.readAccountKeyBackups(pending.map(row=>row.uid)):{};
   const resolved=[];for(const row of rows){const value=existing[row.uid];if(row.enabled&&!row.key_ciphertext&&validAccessKey(value)&&accessKeyHash(value,c)===row.key_hash){const next={...row,key_ciphertext:saveKeySecret(value,row,c)};await store.putAccessKey(next);resolved.push(next);}else resolved.push(row);}
   const entries=resolved.map(row=>({uid:row.uid,key:row.enabled?revealKeySecret(row,c):null,enabled:row.enabled===true,issuedAt:row.issued_at,revision:row.revision}));return await repo.backupAccountKeys(entries);}
  catch(e){return {ok:false,message:e instanceof AppError?e.message:'Chưa đồng bộ được key sang TaiKhoan. Bấm Đồng bộ key → Sheets để thử lại.'};}
 }
 function backupNote(result){return result.ok?' Đã đồng bộ sang tab TaiKhoan.':' Key trong Supabase đã lưu, nhưng backup Google Sheets chưa hoàn tất. '+result.message;}
 async function run(method,args,token,ip='unknown'){
  if(!METHODS.has(method)||!Array.isArray(args)||args.length>2)fail('Yêu cầu không hợp lệ.');
  const req=args[0];
  // IP is taken only from the trusted deployment header in the HTTP handler.
  await store.rate('http:'+privateHash(ip,c.key),180,60);
  if(method==='signInWithKey'){
   await store.rate('key-login-ip:'+privateHash(ip,c.key),20,600);
   const key=typeof req?.key==='string'?req.key.trim():'';
   if(!validAccessKey(key))fail('AUTH_INVALID: Mã truy cập không hợp lệ hoặc đã ngừng sử dụng.',401);
   return store.withLock(async()=>{
    const hash=accessKeyHash(key,c),row=await store.getAccessKey(hash);
    if(!row?.enabled)fail('AUTH_INVALID: Mã truy cập không hợp lệ hoặc đã ngừng sử dụng.',401);
    const snap=await snapshotFor(method);let u=snap.accounts().find(a=>a.uid===row.uid);
    if(!u?.active||!u.username)fail('AUTH_INVALID: Mã truy cập không hợp lệ hoặc đã ngừng sử dụng.',401);
    u=authorizeUser(u,snap);
    const s={uid:u.uid,authVersion:u.authVersion,authMethod:'key',keyHash:hash,keyRevision:row.revision,createdAt:Date.now()},newToken='hv_'+randomBytes(32).toString('hex');
    await persist(newToken,s);if(/^hv_[a-f0-9]{64}$/.test(token||''))await store.remove(token);
    let recovered=false;
    if(!row.key_ciphertext){try{const saved={...row,key_ciphertext:saveKeySecret(key,row,c)};await store.putAccessKey(saved);recovered=true;await backupKeys([saved]);}catch{/* Existing key login stays valid if the optional vault/Sheet upgrade is unavailable. */}}
    return {data:{ok:true,sessionToken:'cookie',user:d.publicAccount_(u),permissions:accessView(u),expiresAt:s.createdAt+MAX_AGE,keyRecovered:recovered},cookie:newToken};
   });
  }
  if(method==='signIn'){
   if(!req||typeof req.username!=='string'||req.username.length>100||typeof req.password!=='string'||req.password.length>256)invalid();
   const login=req.username.trim().toLowerCase();
   await store.rate('login-ip:'+privateHash(ip,c.key),30,600);await store.rate('login-user:'+privateHash(login,c.key),8,600);
   return store.withLock(async()=>{
    const snap=await snapshotFor(method),found=snap.accounts().find(a=>a.username===login),usable=found?.active&&found.uid&&found.username;let u=found;
    const r=await auth('POST','token?grant_type=password',{email:usable?u.email:'unavailable-account@hubone.invalid',password:req.password});
    if(!r.ok||!usable)authFailure(r.ok?{status:400}:r);
    u=authorizeUser(u,snap);
    if(u.role!=='admin'){
     // Provider tokens are server-only and never become an application session.
     try{if(r.data?.access_token)await auth('POST','logout?scope=local',undefined,r.data.access_token);}catch{}
     fail('AUTH_ADMIN_ONLY: Form tài khoản/mật khẩu chỉ dành cho Quản trị. Vui lòng dùng key cá nhân.',403);
    }
    const s=providerSession(r.data,u),newToken='hv_'+randomBytes(32).toString('hex');await persist(newToken,s);
    // Session rotation: invalidate previous cookie after successful replacement.
    if(/^hv_[a-f0-9]{64}$/.test(token||''))await store.remove(token);
    return {data:{ok:true,sessionToken:'cookie',user:d.publicAccount_(u),permissions:accessView(u),expiresAt:s.createdAt+MAX_AGE},cookie:newToken};
   });
  }
  if(method==='signOut')return store.withLock(async()=>{
   if(/^hv_[a-f0-9]{64}$/.test(token||'')){const row=await store.get(token);await store.remove(token);if(row)try{const s=unseal(row.payload,c.key);if(s.authMethod!=='key')await auth('POST','logout?scope=local',undefined,s.access);}catch{}}
   return {data:{ok:true},cookie:''};
  });
  // A public request without a valid cookie never reads business data.
  if(!/^hv_[a-f0-9]{64}$/.test(token||''))expired();
  if(['getHuBIFaq','submitHuBIQuestion'].includes(method)){
   const {u}=await store.withLock(()=>accountSession(token,method));
   await store.rate('hubi:'+method+':'+u.uid,20,600);
   if(method==='getHuBIFaq')return {data:await (trace?trace.measure('hubi_faq',()=>hubi.faq()):hubi.faq())};
   const question=req?.question;if(typeof question!=='string'||!question.trim()||question.length>1000||question.includes('\u0000'))fail('HUBI_INPUT: Câu hỏi cần từ 1 đến 1000 ký tự.');
   return {data:await (trace?trace.measure('hubi_submit',()=>hubi.submit(question.trim())):hubi.submit(question.trim()))};
  }
  const readOnly=['getMappingDashboard','getMappingRunPreview','getMapperAccess','getMappingLibrary','listMappingVersions','importMappingLibrary','getAccountAvatars','revealAccountKey','openNavigationPage','getAgendaWorkspace','getNavigation','resolveNavigationPage','listNavigation','getWorkspace','getHubWorkspace'].includes(method);
  const execute=async()=>{
   const {u,s,snap}=await accountSession(token,method,readOnly);let data;
   if(method==='openNavigationPage'){
    const resolved=resolveNavigation(snap,u,req?.id);data={...resolved};
    if(resolved.page.targetType==='builtin'&&resolved.page.target==='navigation'){requireNavigationAdmin(u);data.configuration={ok:true,...readNavigation(snap),roles:readRoles(snap).roles.map(({id,name,active})=>({id,name,active})),builtinPages:BUILTIN_PAGES,navigation:navigationView(snap,u)};}
    if(resolved.page.targetType==='builtin'&&['overview','detail','projects','catalogs'].includes(resolved.page.target)&&req?.loadWorkspace===true){
     const full=await snapshotFor('getWorkspace'),account=full.accounts().find(a=>a.uid===u.uid);if(!account)fail('AUTH_DENIED: Tài khoản không còn tồn tại.',403);const fresh=authorizeUser(account,full);
     if(!fresh.active||fresh.authVersion!==u.authVersion)fail('AUTH_DENIED: Quyền truy cập đã thay đổi.',403);
     Object.assign(data,resolveNavigation(full,fresh,req.id));data.workspace=workspaceResponse(full,fresh);
    }
    return {data};
   }
   if(['restoreAccountKey','backupAccountKeys'].includes(method)){
    if(u.role!=='admin')fail('FORBIDDEN: Chỉ Quản trị được bổ sung hoặc backup key.',403);
    requireNavigationMethod(snap,u,'getAccountKey',req);
    if(method==='backupAccountKeys'){
     const accounts=new Set(snap.accounts().map(a=>a.uid));const rows=(await store.listKeyBackupRows()).filter(row=>accounts.has(row.uid));const backup=await backupKeys(rows);
     return {data:{ok:true,backup,message:backup.ok?'Đã đồng bộ '+backup.backedUp+' key sang TaiKhoan; '+backup.pending+' key cũ cần xác nhận chuỗi gốc.':backup.message}};
    }
    const target=snap.accounts().find(a=>a.uid===req?.uid);if(!target)fail('Không tìm thấy tài khoản liên kết.');
    const current=await store.getAccountKey(target.uid);checkKeyRevision(req,current);
    if(!current?.enabled)fail('KEY_RESTORE_INVALID: Key đã thu hồi hoặc chưa được cấp.',409);
    await store.rate('restore-key:'+u.uid,20,600);
    const value=typeof req.accessKey==='string'?req.accessKey.trim():'';
    if(!validAccessKey(value)||accessKeyHash(value,c)!==current.key_hash)fail('KEY_RESTORE_MISMATCH: Key nhập lại không khớp key đang dùng. Key cũ được giữ nguyên.',409);
    const next={...current,key_ciphertext:saveKeySecret(value,current,c)};await store.putAccessKey(next);const backup=await backupKeys([next]);
    return {data:{ok:true,key:keyView(next),backup,message:'Đã xác nhận và lưu lại chuỗi key. Giữ nguyên ngày cấp, revision và phiên đăng nhập.'+backupNote(backup)}};
   }
   if(method==='getAccountAvatars'){
    const ids=req?.uids;if(!Array.isArray(ids)||!ids.length||ids.length>20||ids.some(id=>!d.uuid_(id)))fail('AVATAR_INVALID: Chọn tối đa 20 tài khoản.');
    if(u.role!=='admin'&&ids.some(id=>id!==u.uid))fail('FORBIDDEN: Chỉ xem được ảnh tài khoản của bạn.',403);
    const allowed=new Set(snap.accounts().map(a=>a.uid));if(ids.some(id=>!allowed.has(id)))fail('Không tìm thấy tài khoản liên kết.');
    return {data:{ok:true,avatars:await store.getAvatars(ids)}};
   }
   if(method==='saveAccountAvatar'){
    const uid=req?.uid;if(!d.uuid_(uid)||!snap.accounts().some(a=>a.uid===uid))fail('Không tìm thấy tài khoản liên kết.');
    if(u.role!=='admin'&&uid!==u.uid)fail('FORBIDDEN: Chỉ đổi được ảnh tài khoản của bạn.',403);
    const avatar=avatarData(req.avatar);await store.saveAvatar(uid,avatar);return {data:{ok:true,uid,avatar}};
   }
   if(method==='revealAccountKey'){
    if(u.role!=='admin')fail('FORBIDDEN: Chỉ Quản trị được xem lại key.',403);
    requireNavigationMethod(snap,u,'getAccountKey',req);
    const target=snap.accounts().find(a=>a.uid===req?.uid);if(!target)fail('Không tìm thấy tài khoản liên kết.');
    await store.rate('reveal-key:'+u.uid,30,60);
    const current=await store.getAccountKey(target.uid);checkKeyRevision(req,current);
    return {data:{ok:true,accessKey:revealKeySecret(current,c),message:current?.enabled?'Key cũ không có bản lưu; cấp lại nếu cần xem lại.':'Key đã thu hồi hoặc chưa được cấp.'}};
   }
   requireNavigationMethod(snap,u,method,req);
   if(['acceptMappingRun','getMappingDashboard','getMappingRunPreview'].includes(method)){
    if(!mappingResults)fail('MAPPING_SETUP_REQUIRED: Chưa có kho kết quả mapping.',503);
    if(method==='getMappingDashboard')return {data:await mappingResults.dashboard(u)};
    if(method==='getMappingRunPreview')return {data:await mappingResults.preview(req?.id,u)};
    if(u.role==='viewer'||!(u.role==='admin'||u.role==='editor'||has(u,'data.import')))fail('FORBIDDEN: Bạn chưa có quyền Accept dữ liệu.',403);
    if(!rules)fail('RULE_SETUP_REQUIRED: Chưa có thư viện rule.',503);
    return {data:await mappingResults.accept(req,u,await rules.read())};
   }
   if(['getMapperAccess','getMappingLibrary','saveMappingLibrary','importMappingLibrary','listMappingVersions'].includes(method)){
    if(method==='getMapperAccess')return {data:{ok:true,actor:u.username,canManage:u.role==='admin',canAccept:u.role!=='viewer'&&(u.role==='admin'||u.role==='editor'||has(u,'data.import')),storage:'supabase',apiAvailable:false}};
    if(method==='importMappingLibrary'){if(u.role!=='admin')fail('FORBIDDEN: Chỉ admin được nhập thư viện Google Sheet.',403);if(!mappingLibrary)fail('RULE_IMPORT_UNAVAILABLE: Chưa cấu hình nguồn nhập.',503);return {data:{ok:true,...await mappingLibrary(),storage:'preview'}};}
    if(!rules)fail('RULE_SETUP_REQUIRED: Chưa cấu hình kho rule Supabase.',503);
    if(method==='getMappingLibrary'){if(req?.revision!==undefined&&(u.role!=='admin'||!Number.isInteger(req.revision)||req.revision<1))fail('FORBIDDEN: Phiên bản không hợp lệ hoặc chưa có quyền.',403);return {data:await rules.read(req?.revision)};}
    if(u.role!=='admin')fail('FORBIDDEN: Chỉ admin được lưu hoặc xem lịch sử thư viện.',403);
    if(method==='listMappingVersions')return {data:await rules.versions()};
    return {data:await rules.save(req?.tables,req?.expectedRevision,u.username)};
   }
   if(['getNavigation','resolveNavigationPage','listNavigation','saveNavigationItem'].includes(method)){
    if(method==='getNavigation')data={ok:true,navigation:navigationView(snap,u)};
    else if(method==='resolveNavigationPage')data=resolveNavigation(snap,u,req?.id);
    else {requireNavigationAdmin(u);
     if(method==='saveNavigationItem'){
      const initial=readNavigation(snap);if(req?.expectedHash!==initial.rowHash)fail('CONFLICT: Menu/page đã thay đổi. Tải lại trước khi lưu.',409);
      planNavigationSave(req,snap,u);
      if(!initial.initialized)await repo.initializeNavigation();
      const fresh=await repo.loadAll(),plan=planNavigationSave(req,fresh,u);await repo.writeNavigation(plan,fresh);
     }
     const latest=method==='listNavigation'?snap:await repo.loadAll(),config=readNavigation(latest);data={ok:true,...config,roles:readRoles(snap).roles.map(({id,name,active})=>({id,name,active})),builtinPages:BUILTIN_PAGES,navigation:navigationView(latest,u),message:method==='saveNavigationItem'?'Đã lưu menu/page. Trang chủ đã cập nhật.':''};
    }
   }else if(method==='getAgendaWorkspace'){
    const stamp=new Date().toISOString();data={ok:true,actor:u.username,user:{...d.publicAccount_(u),roleName:u.roleName},permissions:accessView(u),tasks:[],catalogs:{groups:[],domains:[],phases:[],statuses:[],priorities:[],owners:[]},hubVersion:initialized(snap)?4:3,loadedAt:stamp,hub:{ok:true,initialized:initialized(snap),isAdmin:u.role==='admin',projects:[],items:[],roadmapLoaded:false,navigation:navigationView(snap,u),loadedAt:stamp}};
   }else if(HUB_METHODS.includes(method)){data=await hubAction(method,req,snap,u,c,repo);
    if(method==='getHubWorkspace'){data.roadmapLoaded=true;data.navigation=navigationView(snap,u);if(!['overview','detail'].some(t=>canOpenBuiltin(snap,u,t))){data.items=[];data.projects=[];}}
   }else if(method==='getRoadmap'||method==='getWorkspace'){
    if(method==='getRoadmap')requirePermission(u,'roadmap.view');
    data=workspaceResponse(snap,u,method==='getWorkspace');
   }else if(method==='saveRoadmapTask'){
    if(initialized(snap))fail('staffing: dữ liệu đã chuyển sang v4. Mở Detail Task mới để cập nhật.');
    if(!has(u,'roadmap.edit')&&!has(u,'roadmap.create'))fail('Tài khoản chỉ có quyền xem. Không được thêm hoặc lưu công việc.',403);if(!req?.task)fail('Thiếu dữ liệu công việc.');
    const expected=Number(req.expectedRevision);if(!Number.isInteger(expected)||expected<0)fail('Phiên bản dữ liệu không hợp lệ.');
    const task=d.validateTask_(req.task),all=await repo.loadAll(),current=all.tasks().find(t=>t.key===task.key);
    if(current){requirePermission(u,'roadmap.edit');if(expected!==Number(current.revision)||String(req.expectedHash||'')!==d.hashRow_(current))fail('CONFLICT: Công việc đã được sửa. Bản nháp được giữ; Làm mới để tải bản mới nhất.',409);task.id=current.id;}
    else{requirePermission(u,'roadmap.create');if(expected!==0||!/^user-[a-zA-Z0-9-]{8,80}$/.test(task.key))fail('Không tìm thấy công việc hoặc mã mới không hợp lệ.');task.id='USR-'+randomUUID().slice(0,8).toUpperCase();}
    validateManagedAssignment(task,current,all.catalogs());Object.assign(task,{revision:current?Number(current.revision)+1:1,updated:new Date().toISOString(),updatedBy:u.username});
    const stored=await repo.writeTask(task,current,all);data={ok:true,task:d.localizePublicTask_(stored),actor:u.username,auditWarning:''};
   }else if(['listCatalogs','initializeCatalogs','saveCatalogItem'].includes(method)){
    requirePermission(u,'catalogs.manage');
    if(method==='listCatalogs')data={ok:true,catalogs:(await repo.loadAll()).catalogs()};
    else if(method==='initializeCatalogs')data={ok:true,catalogs:await repo.initializeCatalogs(),message:'Đã khởi tạo danh mục; công việc cũ được giữ nguyên.'};
    else {const all=await repo.loadAll();const request=generateCatalogRequest(req,all);const plan=planCatalogSave(request,all,u.username);data={ok:true,catalogs:await repo.writeCatalog(plan,all),message:'Đã lưu danh mục.'};}
   }else if(['listRoles','initializeAdministration','saveRole'].includes(method)){
    requirePermission(u,'roles.manage');
    if(method==='initializeAdministration')data={ok:true,...await repo.initializeAdministration(),permissionDefinitions:PERMISSIONS};
    else if(method==='listRoles')data={ok:true,...readRoles(snap),permissionDefinitions:PERMISSIONS};
    else {const plan=planRoleSave(req,snap,u);data={ok:true,...await repo.writeRole(plan,snap),permissionDefinitions:PERMISSIONS,message:'Đã lưu vai trò. Quyền mới được kiểm tra ở mọi yêu cầu tiếp theo.'};}
   }else if(['exportData','previewImport','commitImport'].includes(method)){
    if((method==='exportData'||method==='previewImport')&&req?.type==='workitems'){data=method==='exportData'?exportItems(req,snap,u,c):previewItems(req,snap,u,c);}
    else if(method==='commitImport'&&importJob(req,c)?.kind==='workitems')data=await commitItems(req,snap,u,c,repo);
    else {
     if(initialized(snap)&&((method!=='commitImport'&&req?.type==='tasks')||(method==='commitImport'&&importJob(req,c)?.type==='tasks')))fail('staffing: tải mẫu công việc v4 từ Detail Task; file v3 chỉ dùng đối soát.');
     if(method==='exportData')data={ok:true,...buildExport(req,snap,u,c)};
     else if(method==='previewImport')data={ok:true,...previewImport(req,snap,u,c)};
     else data=await commitImport(req,snap,u,c,repo);
    }
   }else if(method==='changePassword'){
    if(u.role!=='admin')fail('FORBIDDEN: Chỉ Quản trị sử dụng phương thức tài khoản/mật khẩu. User thường truy cập bằng key.',403);
    if(!req||typeof req.currentPassword!=='string'||req.currentPassword.length>256)fail('Nhập mật khẩu hiện tại.');const next=d.password_(req.newPassword);
    await store.rate('password:'+u.uid,8,600);
    const verified=await auth('POST','token?grant_type=password',{email:u.email,password:req.currentPassword});if(!verified.ok)authFailure(verified);const fresh=providerSession(verified.data,u);
    u.authVersion++;await repo.writeAccount(u);await store.remove(token);
    const changed=await auth('PUT','user',{password:next},fresh.access);
    if(!changed.ok)fail('AUTH_EXPIRED: Phiên cũ đã thu hồi nhưng chưa đổi được mật khẩu. Đăng nhập lại bằng mật khẩu cũ và kiểm tra chính sách Supabase.',401);
    try{await auth('POST','logout?scope=global',undefined,fresh.access);}catch{}
    return {data:{ok:true,message:'Đã đổi mật khẩu. Vui lòng đăng nhập lại; các phiên cũ đã thu hồi.'},cookie:''};
   }else{
    requireAdmin(u);const accounts=snap.accounts();
    if(['getAccountKey','issueAccountKey','revokeAccountKey','updateAccountKeyLabel'].includes(method)){
     const target=accounts.find(a=>a.uid&&a.uid===String(req?.uid||'').toLowerCase());
     if(!target)fail('Không tìm thấy tài khoản liên kết.');
     if(!canAdminister(u,roleForLabel(target.roleLabel,snap)))fail('FORBIDDEN: Không được quản lý key của tài khoản có quyền quản trị.',403);
     const current=await store.getAccountKey(target.uid);
     if(method==='getAccountKey')data={ok:true,key:keyView(current)};
     else {
      checkHash(req,target);checkKeyRevision(req,current);
      if(method==='issueAccountKey'){
       if(!target.active||!target.username)fail('Kích hoạt tài khoản có tên đăng nhập trước khi cấp key.');
       authorizeUser(target,snap);
       const mode=req.keyMode??'auto';if(!['auto','custom'].includes(mode))fail('KEY_INVALID: Chọn Tự đặt key hoặc Sinh tự động.');
       const accessKey=mode==='custom'?customAccessKey(req.customKey):newAccessKey(),hash=accessKeyHash(accessKey,c);
       if(await store.getUsedAccessKey(hash)||await store.getAccessKey(hash))fail('KEY_USED: Key này đã được sử dụng. Nhập key khác hoặc chọn Sinh tự động.',409);
       const next={uid:target.uid,key_hash:hash,enabled:true,revision:(current?.revision||0)+1,issued_at:new Date().toISOString(),issued_by:u.uid,label:keyLabel(req.label,'Key '+target.username),key_mode:mode};
       next.key_ciphertext=saveKeySecret(accessKey,next,c);
       await store.putAccessKey(next);const backup=await backupKeys([next]);data={ok:true,accessKey,key:keyView(next),backup,message:'Đã cấp key riêng cho '+target.username+'. Quản trị có thể xem lại key từ danh sách tài khoản. Key và phiên dùng key cũ đã bị thu hồi.'+backupNote(backup)};
      }else if(method==='updateAccountKeyLabel'){
       if(!current)fail('Tài khoản chưa được cấp key.');
       if(req.expectedLabel!==(current.label||''))fail('CONFLICT: Nhãn key đã thay đổi. Tải lại trạng thái trước khi lưu.',409);
       const next={...current,label:keyLabel(req.label)};await store.putAccessKey(next);data={ok:true,key:keyView(next),message:'Đã lưu nhãn key. Key và phiên truy cập được giữ nguyên.'};
      }else{
       if(!current)fail('Tài khoản chưa được cấp key.');
       const next={...current,enabled:false,revision:current.revision+1,key_ciphertext:null};await store.putAccessKey(next);const backup=await backupKeys([next]);data={ok:true,key:keyView(next),backup,message:'Đã thu hồi key và các phiên đang dùng key này.'+backupNote(backup)};
      }
     }
    }else if(method==='listAccounts'){
     let keys=[],keySetupMessage='';try{keys=await store.listAccountKeys();}catch(e){keySetupMessage=e.message;}
     data={ok:true,accounts:accounts.map(a=>({...d.accountView_(a),roleName:readRoles(snap).roles.find(r=>r.id===a.role)?.name||a.roleLabel,key:keySetupMessage?null:keyView(keys.find(k=>k.uid===a.uid)),projectNames:initialized(snap)?allowedProjects(snap,a).map(p=>p.name):[],allProjects:a.role==='admin'||accesses(snap).some(x=>x.uid===a.uid&&x.allProjects)})),roles:readRoles(snap).roles.filter(r=>r.active&&canAdminister(u,r)),keySetupMessage};
    }
    else if(method==='createAccount'){
     if(!req||typeof req!=='object')fail('Nhập thông tin tài khoản.');
     const username=d.username_(req.username),password=d.password_(req.password),email=String(req.email||'').trim().toLowerCase(),name=String(req.name||'').trim(),roleLabel=String(req.roleLabel||''),definition=roleForLabel(roleLabel,snap);checkAssignment(u,definition);const role=definition.id;
     if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!role||name.length>150)fail('Email, họ tên hoặc quyền chưa hợp lệ.');
     const existing=accounts.find(a=>a.email===email);if(accounts.some(a=>a.username===username)||existing?.uid)fail('Email hoặc tên đăng nhập đã có tài khoản liên kết.');
     const created=await auth('POST','admin/users',{email,password,email_confirm:true},null,true);
     if(!created.ok)fail('Chưa tạo được tài khoản. Kiểm tra email đã có trong Supabase hoặc chính sách mật khẩu.');
     const provider=userFrom(created.data),next={email,name,roleLabel,role,active:true,notes:existing?.notes||'',username,uid:provider.id.toLowerCase(),authVersion:existing?existing.authVersion+1:1,_row:existing?existing._row:snap.tables.TaiKhoan.length+1};
     try{await repo.writeAccount(next);}catch(error){
      // A network timeout may mean the write committed. Re-read before compensating.
      let confirmed=false,knownAbsent=false;
      try{const check=await repo.load(['TaiKhoan']);confirmed=check.accounts().some(a=>a.uid===next.uid);knownAbsent=!confirmed;}catch{}
      if(!confirmed){let rolledBack=false;if(knownAbsent)try{rolledBack=(await auth('DELETE','admin/users/'+next.uid,undefined,null,true)).ok;}catch{}
       fail(rolledBack?'Chưa ghi được Sheet; tài khoản Supabase vừa tạo đã được thu hồi. Kiểm tra quyền Sheet rồi thử lại.':'Chưa xác nhận được liên kết tài khoản. Kiểm tra TaiKhoan và Supabase trước khi tạo lại.',503);}
     }
     data={ok:true,account:d.accountView_(next),message:'Đã tạo tài khoản. Cấp thông tin đăng nhập qua kênh riêng.'};
    }else if(method==='updateAccount'){
     if(!req)fail('Thiếu thông tin tài khoản.');const target=accounts.find(a=>a.uid&&a.uid===String(req.uid||'').toLowerCase());checkHash(req,target);
     const roleLabel=String(req.roleLabel||''),definition=roleForLabel(roleLabel,snap);checkAssignment(u,definition);if(!canAdminister(u,roleForLabel(target.roleLabel,snap)))fail('Phân quyền: không được sửa tài khoản có quyền quản trị.',403);const role=definition.id,name=String(req.name||'').trim();
     if(!role||typeof req.active!=='boolean'||name.length>150)fail('Quyền, trạng thái hoặc họ tên không hợp lệ.');
     if(target.role==='admin'&&target.active&&(role!=='admin'||!req.active)&&!accounts.some(a=>a.uid!==target.uid&&a.role==='admin'&&a.active&&a.uid&&a.username))fail('Cần giữ ít nhất một quản trị đang hoạt động.');
     const changed=target.role!==role||target.active!==req.active;Object.assign(target,{name,role,roleLabel,active:req.active,authVersion:target.authVersion+(changed?1:0)});await repo.writeAccount(target);
     data={ok:true,account:d.accountView_(target),message:'Đã cập nhật tài khoản.'};
    }else if(method==='resetAccountPassword'){
     const next=d.password_(req?.newPassword),target=accounts.find(a=>a.uid&&a.uid===String(req?.uid||'').toLowerCase());checkHash(req,target);if(!canAdminister(u,roleForLabel(target.roleLabel,snap)))fail('Phân quyền: không được cấp lại mật khẩu tài khoản quản trị.',403);if(target.uid===u.uid)fail('Dùng Đổi mật khẩu để thay mật khẩu của chính bạn.');
     target.authVersion++;await repo.writeAccount(target);const r=await auth('PUT','admin/users/'+target.uid,{password:next},null,true);if(!r.ok)fail('Phiên cũ đã thu hồi nhưng chưa đặt được mật khẩu mới. Kiểm tra Supabase trước khi thử lại.');
     data={ok:true,message:'Đã đặt lại mật khẩu và thu hồi các phiên cũ.'};
    }
   }
   return {data};
  };
  return readOnly?execute():store.withLock(execute);
 }
 return {run};
}
