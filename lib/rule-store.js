import {fail,sha} from './config.js';
import {readLibrary,listRules} from '../public/mapper-engine.js';
import {validateMasterTable} from '../public/master-catalog.js';
export const RULE_SHEETS=['Truong_chuan','Mapping','Nguon','Quy_doi','Dieu_kien'];
export function validateRuleTables(input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('RULE_INVALID: Thư viện phải là các bảng rule.',400);
 if(Buffer.byteLength(JSON.stringify(input))>1200000)fail('RULE_TOO_LARGE: Thư viện tối đa 1,2 MB JSON.',413);
 const tables={};if(input.Master!==undefined){try{tables.Master=validateMasterTable(input.Master);}catch(e){fail('RULE_INVALID: '+e.message);}}for(const name of RULE_SHEETS){const rows=input[name];if(rows===undefined){if(['Truong_chuan','Mapping','Nguon'].includes(name))fail('RULE_INVALID: Thiếu sheet '+name);continue;}
  const width={Truong_chuan:8,Mapping:15,Nguon:14,Quy_doi:7,Dieu_kien:12}[name];
  if(!Array.isArray(rows)||rows.length>10000||rows.some(row=>!Array.isArray(row)||row.length>width||row.some(v=>v!==null&&!['string','number','boolean'].includes(typeof v)||typeof v==='number'&&!Number.isFinite(v)||typeof v==='string'&&v.length>10000)))fail('RULE_INVALID: Sai cấu trúc bảng '+name);
  // Drop title/instruction rows and unused columns. Keep the exact machine headers.
  const required={Truong_chuan:['Template','Cột template','Thứ tự'],Mapping:['Rule ID','Dự án','Template','Cột template'],Nguon:['Rule ID','Nguồn ID','Vai trò'],Quy_doi:['Rule ID','Cột template','Giá trị nguồn'],Dieu_kien:['Rule ID','Nhóm','Cột kiểm tra']}[name];
  const index=rows.findIndex(row=>required.every(h=>row.includes(h)));if(index<0)fail('RULE_INVALID: Sai header '+name);
  tables[name]=rows.slice(index).filter((r,i)=>i===0||r.some(v=>String(v??'').trim())).map(r=>r.map(v=>v??''));
 }
 let lib;try{lib=readLibrary(tables);listRules(lib);}catch(e){fail('RULE_INVALID: '+e.message);}
 const keys=new Set();for(const f of lib.fields){const k=JSON.stringify([String(f.Template).trim(),String(f['Cột template']).trim()]);if(!String(f.Template).trim()||!String(f['Cột template']).trim()||keys.has(k))fail('RULE_INVALID: Trường chuẩn thiếu hoặc trùng tên trong template.');keys.add(k);if(!Number.isInteger(Number(f['Thứ tự']))||Number(f['Thứ tự'])<1)fail('RULE_INVALID: Thứ tự cột phải là số nguyên dương.');}
 return {tables,version:sha(JSON.stringify(tables))};
}
export function ruleStore(p,c){
 const scoped=encodeURIComponent(c.scope);
 const setup=()=>fail('RULE_SETUP_REQUIRED: Chạy supabase/mapping_rules_v4_14.sql trong Supabase đang dùng rồi thử lại.',503);
 async function read(revision){let rows;try{rows=await p.rest('GET',revision===undefined?'staffing_rule_libraries?scope=eq.'+scoped+'&select=*&limit=1':'staffing_rule_versions?scope=eq.'+scoped+'&revision=eq.'+revision+'&select=*&limit=1');}catch{setup();}
  const row=rows?.[0];if(!row)return {ok:true,empty:true,revision:0,version:'',storage:'supabase'};
  return {ok:true,tables:row.tables,version:row.version,revision:row.revision,updatedAt:row.updated_at,updatedBy:row.updated_by,storage:'supabase'};
 }
 async function versions(){let rows;try{rows=await p.rest('GET','staffing_rule_versions?scope=eq.'+scoped+'&select=revision,version,updated_at,updated_by&order=revision.desc&limit=30');}catch{setup();}return {ok:true,versions:rows||[]};}
 async function save(input,expectedRevision,actor){
  if(!Number.isInteger(expectedRevision)||expectedRevision<0)fail('RULE_INVALID: Thiếu phiên bản đối chiếu. Tải lại từ Supabase.',400);
  // Legacy rule-only imports must not erase the shared catalog.
  if(input&&typeof input==='object'&&input.Master===undefined&&expectedRevision>0){const current=await read();if(current.tables?.Master)input={...input,Master:current.tables.Master};}
  const {tables,version}=validateRuleTables(input);let result;
  try{result=await p.rpc('staffing_save_rule_library',{p_scope:c.scope,p_expected_revision:expectedRevision,p_version:version,p_tables:tables,p_actor:actor});}catch{setup();}
  if(result?.conflict)fail('RULE_CONFLICT: Thư viện đã được người khác sửa. Tải bản mới từ Supabase rồi đối chiếu trước khi lưu.',409);
  if(!result?.ok)fail('RULE_SAVE_FAILED: Chưa xác nhận được kết quả lưu. Tải lại trước khi thử tiếp.',503);
  const stored=await read();if(stored.revision!==expectedRevision+1||stored.version!==version)fail('RULE_SAVE_UNVERIFIED: Chưa đối chiếu được bản lưu. Tải lại trước khi sửa tiếp.',503);return stored;
 }
 return {read,versions,save};
}
