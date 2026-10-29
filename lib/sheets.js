import {NAV_TAB,NAV_LOG,NAV_TABLES,navigationDefaults,encodeNavigation,readNavigation} from './navigation.js';
import {HUB_TABLES,column} from './hub.js';
import * as d from './domain.js';
import {ROLE_TAB,ROLE_LOG,IMPORT_LOG,ROLE_HEADERS,ROLE_LOG_HEADERS,IMPORT_HEADERS,readRoles} from './roles.js';
import {fail} from './config.js';
import {EXTRA_TAB,CATALOG_LOG,EXTRA_HEADERS,LOG_HEADERS,defaultExtras,encodeExtra,readManagedCatalogs} from './catalogs.js';
export const TAB_NAMES=['TaiKhoan','Roadmap_Tasks','DanhMuc_NghiepVu','DanhMuc_TrienKhai','Roadmap_Log'];
const AUDIT_HEADERS=['timestamp','actor','task_key','action','revision','before_json','after_json'];
export class Snapshot {
 constructor(tables={}){this.tables=tables;}
 getSheetByName(name){const rows=this.tables[name];if(!rows)return null;return {getLastRow:()=>rows.length,getRange:(r,c,n,m)=>({getDisplayValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>String(rows[r-1+i]?.[c-1+j]??'')))})};}
 accounts(){return d.readAccounts_(this);}
 tasks(){const s=this.getSheetByName('Roadmap_Tasks');if(!s)fail('Thiếu tab Roadmap_Tasks. Dùng Sheet đã thiết lập từ bản Apps Script.');return d.readRows_(s);}
 catalogs(){return readManagedCatalogs(this);}
}
export function sheetRepository(p){
 const widths={TaiKhoan:8,Roadmap_Tasks:21,DanhMuc_NghiepVu:4,DanhMuc_TrienKhai:5,Roadmap_Log:7,[EXTRA_TAB]:10,[CATALOG_LOG]:7,[ROLE_TAB]:7,[ROLE_LOG]:5,[IMPORT_LOG]:7,...Object.fromEntries([...HUB_TABLES,...NAV_TABLES].map(([n,h])=>[n,h.length]))};
 async function load(names,headersOnly=[]){const q=new URLSearchParams({valueRenderOption:'FORMATTED_VALUE'});for(const n of names)q.append('ranges',"'"+n+"'!A"+(headersOnly.includes(n)?'1:'+column(widths[n]||21)+'1':':'+column(widths[n]||21)));const r=await p.sheets('GET','/values:batchGet?'+q);const tables={};names.forEach((n,i)=>tables[n]=r.valueRanges?.[i]?.values||[]);return new Snapshot(tables);}
 async function loadAll(){
  const metadata=await p.sheets('GET','?fields=sheets.properties');
  const present=new Set((metadata.sheets||[]).map(x=>x.properties.title));
  return load([...TAB_NAMES,...[...HUB_TABLES,...NAV_TABLES].map(([n])=>n).filter(n=>present.has(n)),...[EXTRA_TAB,CATALOG_LOG,ROLE_TAB,ROLE_LOG,IMPORT_LOG].filter(n=>present.has(n))]);
 }
 async function loadFor(method){
  const security=['acceptMappingRun','getMappingDashboard','getMappingRunPreview','getMapperAccess','getMappingLibrary','saveMappingLibrary','importMappingLibrary','listMappingVersions','restoreAccountKey','backupAccountKeys','getAccountAvatars','saveAccountAvatar','revealAccountKey','getHuBIFaq','submitHuBIQuestion','signIn','signInWithKey','getAccountKey','issueAccountKey','revokeAccountKey','updateAccountKeyLabel'];
  const compact=method==='openNavigationPage'||security.includes(method)||method==='listAccounts'||method==='getAgendaWorkspace'||method==='getWorkspace'||method==='getHubWorkspace'||['getNavigation','resolveNavigationPage','listNavigation'].includes(method);
  if(!compact)return loadAll();
  // Only sheet names are inspected; permission and account rows are always fresh.
  const metadata=await (p.sheetMetadata?p.sheetMetadata():p.sheets('GET','?fields=sheets.properties.title')),present=new Set((metadata.sheets||[]).map(x=>x.properties.title));
  const all=[...TAB_NAMES,...[...HUB_TABLES,...NAV_TABLES].map(([n])=>n),EXTRA_TAB,CATALOG_LOG,ROLE_TAB,ROLE_LOG,IMPORT_LOG];
  const names=security.includes(method)?['TaiKhoan',ROLE_TAB,NAV_TAB]:['openNavigationPage','getAgendaWorkspace','getNavigation','resolveNavigationPage','listNavigation'].includes(method)?['TaiKhoan',ROLE_TAB,NAV_TAB,'HubOne_Migrations']:method==='listAccounts'?['TaiKhoan',ROLE_TAB,'HubOne_Projects','HubOne_ProjectAccess','HubOne_Migrations',NAV_TAB]:method==='getHubWorkspace'?['TaiKhoan',ROLE_TAB,NAV_TAB,...HUB_TABLES.map(([n])=>n)]:all;
  const logs=[NAV_LOG,'Roadmap_Log',CATALOG_LOG,ROLE_LOG,IMPORT_LOG,'HubOne_Audit'];
  return load(names.filter(n=>n==='TaiKhoan'||present.has(n)),logs);
 }
 // Key backups are read only on explicit key-management writes. Normal auth/account
 // snapshots remain A:H and never carry the plaintext backup columns.
 const keyBackupHeaders=['AccessKey','KeyStatus','KeyIssuedAt','KeyRevision','KeyBackupAt','KeyUID'];
 async function readAccountKeyBackups(uids){
  const metadata=await p.sheets('GET','?fields=sheets.properties'),sheet=(metadata.sheets||[]).find(x=>x.properties.title==='TaiKhoan')?.properties;
  if(!sheet)return {};const width=Math.max(8,sheet.gridProperties?.columnCount||26),q=new URLSearchParams({valueRenderOption:'UNFORMATTED_VALUE'});q.append('ranges',"'TaiKhoan'!A:"+column(width));
  const rows=(await p.sheets('GET','/values:batchGet?'+q)).valueRanges?.[0]?.values||[],head=rows[0]||[],start=head.indexOf(keyBackupHeaders[0]);
  if(start<8)return {};if(keyBackupHeaders.some((h,i)=>head[start+i]!==h))fail('KEY_BACKUP_COLUMNS: Header backup trong TaiKhoan đã thay đổi.',409);
  const selected=new Set(uids),result={};for(const row of rows.slice(1)){const uid=String(row[6]||'').toLowerCase();if(selected.has(uid)&&row[start+5]===uid&&typeof row[start]==='string'&&row[start])result[uid]=row[start];}return result;
 }
 async function backupAccountKeys(entries){
  if(!Array.isArray(entries)||entries.length>10000)fail('KEY_BACKUP_INVALID: Danh sách backup chưa hợp lệ.');
  const metadata=await p.sheets('GET','?fields=sheets.properties'),sheet=(metadata.sheets||[]).find(x=>x.properties.title==='TaiKhoan')?.properties;
  if(!sheet)fail('KEY_BACKUP_SETUP: Thiếu tab TaiKhoan.');
  const width=Math.max(8,sheet.gridProperties?.columnCount||26);
  let readWidth=width;
  const read=async()=>{const q=new URLSearchParams({valueRenderOption:'UNFORMATTED_VALUE'});q.append('ranges',"'TaiKhoan'!A:"+column(readWidth));return (await p.sheets('GET','/values:batchGet?'+q)).valueRanges?.[0]?.values||[];};
  const rows=await read(),head=rows[0]||[],found=head.indexOf(keyBackupHeaders[0]);let start;
  if(found>=0){start=found;if(start<8||keyBackupHeaders.some((h,i)=>head[start+i]!==h))fail('KEY_BACKUP_COLUMNS: Nhóm cột AccessKey trong TaiKhoan đã thay đổi. Kiểm tra header trước khi đồng bộ.',409);}
  else{if(keyBackupHeaders.some(h=>head.includes(h)))fail('KEY_BACKUP_COLUMNS: Header backup chưa đầy đủ. Kiểm tra nhóm cột key trong TaiKhoan.',409);start=Math.max(8,...rows.map(row=>row.length));}
  const byUid=new Map();for(const [i,row]of rows.entries()){if(i===0||!row[6])continue;const uid=String(row[6]).toLowerCase();if(byUid.has(uid))fail('KEY_BACKUP_CONFLICT: TaiKhoan bị trùng UID. Không ghi backup.',409);byUid.set(uid,i+1);}
  if(entries.some(e=>!byUid.has(e.uid)))fail('KEY_BACKUP_CONFLICT: Tài khoản đã đổi dòng hoặc bị xóa. Tải lại trước khi đồng bộ.',409);
  if(start+6>width)await p.sheets('POST',':batchUpdate',{requests:[{updateSheetProperties:{properties:{sheetId:sheet.sheetId,gridProperties:{columnCount:start+6}},fields:'gridProperties.columnCount'}}]});
  readWidth=Math.max(width,start+6);
  const left=column(start+1),right=column(start+6),stamp=new Date().toISOString(),writes=[{range:"'TaiKhoan'!"+left+'1:'+right+'1',values:[keyBackupHeaders]}],expected=[];
  for(const e of entries){
   const row=byUid.get(e.uid),values=[e.key||'',e.enabled?(e.key?'Đang dùng':'Đã cấp · Chưa xác nhận chuỗi key'):'Đã thu hồi',e.issuedAt||'',String(e.revision),stamp,e.uid];
   // Clear stale copies belonging to a moved UID within our managed columns only.
   rows.forEach((old,i)=>{if(i>0&&i+1!==row&&old[start+5]===e.uid&&String(old[6]||'').toLowerCase()!==e.uid)writes.push({range:"'TaiKhoan'!"+left+(i+1)+':'+right+(i+1),values:[['','','','','','']]});});
   expected.push({row,values,uid:e.uid});writes.push({range:"'TaiKhoan'!"+left+row+':'+right+row,values:[values]});
  }
  // Clear all stale positions first, then apply current rows. RAW cannot create formulas.
  const cleanups=writes.filter(w=>w.values[0].every(x=>x==='')),updates=writes.filter(w=>!w.values[0].every(x=>x===''));
  await writeRows([...cleanups,...updates]);
  const after=await read();if(expected.some(e=>String(after[e.row-1]?.[6]||'').toLowerCase()!==e.uid||e.values.some((v,i)=>String(after[e.row-1]?.[start+i]??'')!==String(v))))fail('KEY_BACKUP_VERIFY: Chưa xác nhận được bản backup. Kiểm tra TaiKhoan và bấm đồng bộ lại.',503);
  return {ok:true,backedUp:entries.filter(e=>e.enabled&&e.key).length,pending:entries.filter(e=>e.enabled&&!e.key).length,revoked:entries.filter(e=>!e.enabled).length,backedUpAt:stamp};
 }
 function cell(value){return {userEnteredValue:typeof value==='boolean'?{boolValue:value}:typeof value==='number'?{numberValue:value}:{stringValue:String(value??'')}};}
 async function createMissingTables(definitions){
  const metadata=await p.sheets('GET','?fields=sheets.properties'),used=new Set(metadata.sheets.map(x=>x.properties.sheetId)),names=new Set(metadata.sheets.map(x=>x.properties.title));let id=700000;const requests=[];
  for(const [name,headers] of definitions){if(names.has(name))continue;while(used.has(id))id++;used.add(id);requests.push({addSheet:{properties:{sheetId:id,title:name,gridProperties:{rowCount:1000,columnCount:Math.max(10,headers.length),frozenRowCount:1}}}},{updateCells:{start:{sheetId:id,rowIndex:0,columnIndex:0},rows:[{values:headers.map(cell)}],fields:'userEnteredValue'}});id++;}
  if(definitions.some(([name])=>name===ROLE_TAB)){const accountSheet=metadata.sheets.find(x=>x.properties.title==='TaiKhoan');if(!accountSheet)fail('Phân quyền: thiếu tab TaiKhoan.');requests.push({setDataValidation:{range:{sheetId:accountSheet.properties.sheetId,startRowIndex:1,startColumnIndex:2,endColumnIndex:3}}});}
  if(requests.length)await p.sheets('POST',':batchUpdate',{requests});
 }
 async function initializeAdministration(){await createMissingTables([[ROLE_TAB,ROLE_HEADERS],[ROLE_LOG,ROLE_LOG_HEADERS],[IMPORT_LOG,IMPORT_HEADERS]]);return readRoles(await loadAll());}
 async function writeRole(plan,snapshot){await writeRows([{range:"'"+ROLE_TAB+"'!A"+plan.row+':G'+plan.row,values:[plan.values]},{range:"'"+ROLE_LOG+"'!A"+(snapshot.tables[ROLE_LOG].length+1)+':E'+(snapshot.tables[ROLE_LOG].length+1),values:[[plan.next.updated,plan.next.updatedBy,plan.next.id,JSON.stringify(plan.current||{}),JSON.stringify(plan.next)]]}]);return readRoles(await loadAll());}
 async function writeImport(data){await writeRows(data);}
 async function initializeCatalogs(){
  const snapshot=await loadAll();const metadata=await p.sheets('GET','?fields=sheets.properties');
  const ids=new Map(metadata.sheets.map(x=>[x.properties.title,x.properties.sheetId]));
  const used=new Set(ids.values());let id=500000;const requests=[];
  for(const [name,headers,rows] of [[EXTRA_TAB,EXTRA_HEADERS,Object.entries(defaultExtras(snapshot.tasks())).flatMap(([type,items])=>items.map(item=>encodeExtra(type,item)))],[CATALOG_LOG,LOG_HEADERS,[]]]){
   if(ids.has(name))continue;while(used.has(id))id++;used.add(id);ids.set(name,id);
   requests.push({addSheet:{properties:{sheetId:id,title:name,gridProperties:{rowCount:Math.max(1000,rows.length+100),columnCount:Math.max(10,headers.length),frozenRowCount:1}}}});
   requests.push({updateCells:{start:{sheetId:id,rowIndex:0,columnIndex:0},rows:[headers,...rows].map(row=>({values:row.map(cell)})),fields:'userEnteredValue'}});id++;
  }
  if(requests.length)await p.sheets('POST',':batchUpdate',{requests});
  return (await loadAll()).catalogs();
 }
 async function writeCatalog(plan,snapshot){
  const log=snapshot.tables[CATALOG_LOG];if(!log||log[0].join('|')!==LOG_HEADERS.join('|'))fail('Danh mục: log danh mục không đúng cấu trúc.');
  const end=String.fromCharCode(64+plan.values.length);
  await writeRows([{range:"'"+plan.tab+"'!A"+plan.row+':'+end+plan.row,values:[plan.values]},
   {range:"'"+CATALOG_LOG+"'!A"+(log.length+1)+':G'+(log.length+1),values:[[plan.next.updated,plan.next.updatedBy,plan.type,plan.next.id,plan.action,JSON.stringify(plan.current||{}),JSON.stringify(plan.next)]]}]);
  const result=(await loadAll()).catalogs();const stored=result[plan.type].find(x=>String(x.id)===plan.next.id);
  if(!stored||['name','active','order',...(plan.type==='groups'?['color']:[]),...(plan.type==='statuses'?['kind']:[])].some(k=>stored[k]!==plan.next[k]))fail('Danh mục: chưa xác nhận được kết quả lưu. Tải lại trước khi sửa tiếp.',503);
  return result;
 }
 async function writeRows(data){return p.sheets('POST','/values:batchUpdate',{valueInputOption:'RAW',data});}
 async function writeAccount(u){const row=[u.email,u.name,u.roleLabel,!!u.active,u.notes||'',u.username,u.uid,String(u.authVersion)];await writeRows([{range:"'TaiKhoan'!A"+u._row+':H'+u._row,values:[row]}]);}
 async function writeTask(task,current,snapshot){
  const log=snapshot.tables.Roadmap_Log;
  if(!log?.length||log[0].join('|')!==AUDIT_HEADERS.join('|'))fail('Tab Roadmap_Log thiếu hoặc sai header. Khôi phục cấu trúc trước khi lưu.');
  const row=current?current._row:snapshot.tables.Roadmap_Tasks.length+1;
  const values=d.ROADMAP_HEADERS.map(h=>String(task[h]??''));
  const audit=[task.updated,task.updatedBy,task.key,current?'UPDATE':'CREATE',String(task.revision),JSON.stringify(current?d.publicTask_(current):{}),JSON.stringify(d.publicTask_(task))];
  // RAW values never become formulas. Task + log travel in one API request.
  await writeRows([{range:"'Roadmap_Tasks'!A"+row+':U'+row,values:[values]},{range:"'Roadmap_Log'!A"+(log.length+1)+':G'+(log.length+1),values:[audit]}]);
  const fresh=await load(['Roadmap_Tasks']);const stored=fresh.tasks().find(t=>t.key===task.key);
  if(!stored||d.hashRow_(stored)!==d.hashRow_(task))fail('Chưa xác nhận được nội dung đã lưu. Bấm Làm mới để đối soát trước khi lưu lại.',503);
  return stored;
 }
 async function initializeHub(){await createMissingTables(HUB_TABLES);}
 async function writeHub(writes){
  const metadata=await p.sheets('GET','?fields=sheets.properties'),requests=[];
  for(const sheet of metadata.sheets||[]){const prop=sheet.properties,needed=writes.filter(w=>w.range.startsWith("'"+prop.title+"'!")).reduce((n,w)=>Math.max(n,Number(w.range.match(/:(?:[A-Z]+)([0-9]+)$/)?.[1]||0)),0);if(prop.gridProperties&&needed>prop.gridProperties.rowCount)requests.push({updateSheetProperties:{properties:{sheetId:prop.sheetId,gridProperties:{rowCount:needed+100}},fields:'gridProperties.rowCount'}});}
  if(requests.length)await p.sheets('POST',':batchUpdate',{requests});await writeRows(writes);
 }
 async function initializeNavigation(){
  const metadata=await p.sheets('GET','?fields=sheets.properties');
  const sheets=metadata.sheets||[];if(sheets.some(x=>x.properties.title===NAV_TAB))return;
  const names=new Set(sheets.map(x=>x.properties.title)),ids=new Set(sheets.map(x=>x.properties.sheetId)),requests=[];let id=800000;
  for(const [name,headers] of NAV_TABLES){if(names.has(name))continue;while(ids.has(id))id++;ids.add(id);const rows=[headers,...(name===NAV_TAB?navigationDefaults().map(encodeNavigation):[])];
   requests.push({addSheet:{properties:{sheetId:id,title:name,gridProperties:{rowCount:1000,columnCount:Math.max(10,headers.length),frozenRowCount:1}}}},{updateCells:{start:{sheetId:id,rowIndex:0,columnIndex:0},rows:rows.map(row=>({values:row.map(cell)})),fields:'userEnteredValue'}});id++;
  }
  // Headers and default navigation are initialized atomically in one Sheets batch.
  await p.sheets('POST',':batchUpdate',{requests});
 }
 async function writeNavigation(plan,snapshot){
  const log=snapshot.tables[NAV_LOG];if(!log||log[0]?.join('|')!==NAV_TABLES[1][1].join('|'))fail('Menu/page: nhật ký cấu hình thiếu hoặc sai cấu trúc.');
  await writeHub([{range:"'"+NAV_TAB+"'!A"+plan.row+':O'+plan.row,values:[encodeNavigation(plan.next)]},{range:"'"+NAV_LOG+"'!A"+(log.length+1)+':E'+(log.length+1),values:[[plan.next.updated,plan.next.updatedBy,plan.next.id,JSON.stringify(plan.current||{}),JSON.stringify(plan.next)]]}]);
  const result=readNavigation(await load([NAV_TAB]));const stored=result.entries.find(x=>x.id===plan.next.id);
  if(!stored||JSON.stringify(encodeNavigation(stored))!==JSON.stringify(encodeNavigation(plan.next)))fail('Menu/page: chưa xác nhận được kết quả lưu. Tải lại để đối soát.',503);
 }
 return {readAccountKeyBackups,backupAccountKeys,initializeNavigation,writeNavigation,initializeHub,writeHub,load,loadAll,loadFor,writeAccount,writeTask,initializeCatalogs,writeCatalog,initializeAdministration,writeRole,writeImport};
}
