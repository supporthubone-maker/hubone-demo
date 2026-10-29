import {randomUUID} from 'node:crypto';
import {fail,sha} from './config.js';
import {boolFlag_} from './domain.js';
export const ROLE_TAB='HubOne_VaiTro',ROLE_LOG='HubOne_VaiTro_Log',IMPORT_LOG='HubOne_Import_Log';
export const ROLE_HEADERS=['Mã','Tên vai trò','Quyền','Đang sử dụng','Phiên bản','Cập nhật','Cập nhật bởi'];
export const ROLE_LOG_HEADERS=['Thời gian','Người sửa','Mã vai trò','Trước','Sau'];
export const IMPORT_HEADERS=['Mã phiên nhập','Người nhập','Loại','Thời gian','Thêm mới','Cập nhật','Trạng thái'];
export const PERMISSIONS=[
 {id:'roadmap.view',name:'Xem công việc',module:'Roadmap'},
 {id:'roadmap.create',name:'Thêm công việc',module:'Roadmap'},
 {id:'roadmap.edit',name:'Sửa công việc',module:'Roadmap'},
 {id:'catalogs.manage',name:'Quản lý danh mục',module:'Roadmap'},
 {id:'data.import',name:'Nhập dữ liệu từ file',module:'Roadmap'},
 {id:'accounts.manage',name:'Quản lý tài khoản',module:'Hệ thống'},
 {id:'roles.manage',name:'Quản lý vai trò',module:'Hệ thống'}
];
const all=PERMISSIONS.map(x=>x.id),security=['accounts.manage','roles.manage'];
export const BUILTIN_ROLES=[{id:'viewer',label:'Chỉ xem',name:'Chỉ xem',permissions:['roadmap.view'],active:true,builtin:true},{id:'editor',label:'Chỉnh sửa',name:'Chỉnh sửa',permissions:['roadmap.view','roadmap.create','roadmap.edit'],active:true,builtin:true},{id:'admin',label:'Quản trị',name:'Quản trị',permissions:all,active:true,builtin:true}];
export function readRoles(snapshot){
 const rows=snapshot.tables[ROLE_TAB],custom=[];
 if(rows){if(rows[0]?.join('|')!==ROLE_HEADERS.join('|'))fail('Phân quyền: header HubOne_VaiTro không đúng.');const seen=new Set();
 for(const [i,row] of rows.entries()){if(i===0||row.every(x=>String(x)===''))continue;const id=String(row[0]||'');if(!/^role-[a-f0-9-]{36}$/.test(id)||seen.has(id))fail('Phân quyền: mã vai trò không hợp lệ hoặc trùng.');seen.add(id);
 let permissions;try{permissions=JSON.parse(row[2]);}catch{fail('Phân quyền: danh sách quyền chưa hợp lệ.');}
 const value=validateRole({id,name:String(row[1]||''),permissions,active:boolFlag_(row[3],'Vai trò')});const revision=Number(row[4]);if(!Number.isInteger(revision)||revision<1)fail('Phân quyền: phiên bản vai trò không hợp lệ.');custom.push({...value,label:id,revision,_row:i+1,builtin:false});}
 }
 const roles=[...BUILTIN_ROLES.map(x=>({...x,permissions:[...x.permissions]})),...custom];
 return {roles,initialized:!!rows&&!!snapshot.tables[ROLE_LOG]&&!!snapshot.tables[IMPORT_LOG],rowHash:sha(JSON.stringify([rows||null,snapshot.tables[ROLE_LOG]||null]))};
}
export function validateRole(input){
 if(!input||typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>120||typeof input.active!=='boolean'||!Array.isArray(input.permissions)||input.permissions.some(x=>!all.includes(x))||new Set(input.permissions).size!==input.permissions.length)fail('Phân quyền: kiểm tra tên vai trò, trạng thái và các quyền đã chọn.');
 const permissions=[...input.permissions].sort();if(permissions.some(x=>['roadmap.create','roadmap.edit','data.import'].includes(x))&&!permissions.includes('roadmap.view'))fail('Phân quyền: quyền thêm/sửa/nhập file cần kèm quyền Xem công việc.');
 return {id:input.id||'role-'+randomUUID(),name:input.name.trim(),active:input.active,permissions};
}
export function authorizeUser(user,snapshot){
 const definitions=readRoles(snapshot),role=definitions.roles.find(x=>x.id===user.role);
 if(!role?.active)fail('AUTH_DENIED: Vai trò đã ngừng sử dụng hoặc không còn tồn tại.',403);
 return {...user,roleName:role.name,permissions:role.permissions,roleRevision:role.revision||1};
}
export const has=(u,p)=>u.role==='admin'||(u.permissions||[]).includes(p);
export function requirePermission(u,p){if(!has(u,p))fail('FORBIDDEN: Bạn chưa được cấp quyền '+(PERMISSIONS.find(x=>x.id===p)?.name||p)+'.',403);}
export function accessView(u){return {role:u.role,name:u.name,roleName:u.roleName,canView:has(u,'roadmap.view'),canCreate:has(u,'roadmap.create'),canEdit:has(u,'roadmap.edit')||has(u,'roadmap.create'),canUpdate:has(u,'roadmap.edit'),canManage:has(u,'accounts.manage'),canManageCatalogs:has(u,'catalogs.manage'),canManageRoles:has(u,'roles.manage'),canImport:has(u,'data.import'),permissions:[...(u.permissions||[])]};}
export function roleForLabel(label,snapshot){return readRoles(snapshot).roles.find(x=>x.label===label||x.id===label);}
export function canAdminister(actor,role){return actor.role==='admin'||!!role&&!role.permissions.some(x=>security.includes(x))&&role.id!=='admin';}
export function checkAssignment(actor,role){if(!role?.active||!canAdminister(actor,role))fail('Phân quyền: vai trò này chỉ quản trị hệ thống được cấp hoặc chỉnh sửa.',403);}
export function planRoleSave(req,snapshot,actor){
 requirePermission(actor,'roles.manage');const state=readRoles(snapshot);if(!state.initialized)fail('Phân quyền: bấm Khởi tạo phân quyền trước khi lưu.');
 if(req?.expectedHash!==state.rowHash)fail('CONFLICT: Vai trò đã thay đổi. Tải lại trước khi lưu.',409);
 if(!['create','update'].includes(req.mode))fail('Phân quyền: thao tác chưa hợp lệ.');const current=state.roles.find(x=>x.id===req.item?.id);
 if(req.mode==='update'&&(!current||current.builtin))fail('Phân quyền: giữ nguyên ba vai trò hệ thống; tạo vai trò mới để tùy chỉnh.');
 if(req.mode==='create'&&req.item?.id)fail('Phân quyền: mã vai trò mới do hệ thống tự sinh.');
 const next=validateRole(req.item);if(current&&!canAdminister(actor,current))fail('Phân quyền: không được sửa vai trò quản trị hệ thống.',403);
 if(!canAdminister(actor,next))fail('Phân quyền: chỉ Quản trị được cấp các quyền quản lý tài khoản/vai trò.',403);
 if(!next.active&&snapshot.accounts().some(u=>u.active&&u.role===next.id))fail('Phân quyền: vai trò đang có tài khoản hoạt động; chuyển tài khoản sang vai trò khác trước khi ngừng dùng.');
 next.revision=current?current.revision+1:1;next.updated=new Date().toISOString();next.updatedBy=actor.username;
 return {current,next,row:current?current._row:snapshot.tables[ROLE_TAB].length+1,values:[next.id,next.name,JSON.stringify(next.permissions),next.active,next.revision,next.updated,next.updatedBy]};
}
