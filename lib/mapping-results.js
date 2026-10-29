import {gunzipSync} from 'node:zlib';
import {fail,sha,seal,unseal} from './config.js';
import {readLibrary,planRule} from '../public/mapper-engine.js';
import {prepareCommonLibrary} from '../public/common-inputs.js';
import {catalogRuntime} from '../public/master-runtime.js';
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export function decodeMappingResult(request){
 if(!uuid(request?.id))fail('MAPPING_INVALID: Mã lần chạy không hợp lệ.');
 let data;try{
  if(request.encoding==='gzip-base64'){
   if(typeof request.payload!=='string'||request.payload.length>3700000||!/^[A-Za-z0-9+/]*={0,2}$/.test(request.payload))throw Error();
   data=JSON.parse(gunzipSync(Buffer.from(request.payload,'base64'),{maxOutputLength:16000000}).toString('utf8'));
  }else data=request.payload;
 }catch{fail('MAPPING_INVALID: Kết quả quá lớn hoặc dữ liệu nén không hợp lệ. Chia nhỏ nguồn rồi chạy lại.');}
 if(!data||typeof data!=='object'||Buffer.byteLength(JSON.stringify(data))>16000000)fail('MAPPING_LIMIT: Kết quả tối đa 16 MB trước nén.');
 const {headers,rows,meta}=data;
 if(!Array.isArray(headers)||headers.length<1||headers.length>500||headers.some(h=>typeof h!=='string'||!h.trim()||h.length>500)||new Set(headers).size!==headers.length)fail('MAPPING_INVALID: Cột kết quả không hợp lệ.');
 if(!Array.isArray(rows)||!rows.length||rows.length>50000||rows.some(r=>!Array.isArray(r)||r.length!==headers.length||r.some(v=>v!==null&&!['string','number','boolean'].includes(typeof v)||typeof v==='string'&&v.length>10000||typeof v==='number'&&!Number.isFinite(v))))fail('MAPPING_INVALID: Dữ liệu kết quả không hợp lệ.');
 const short=(v,n=120)=>typeof v==='string'&&!!v.trim()&&v.length<=n;
 const periodMode=meta?.periodMode??'single',manualSources=meta?.manualSources??[];
 const masterContext=meta?.masterContext;if(masterContext!==undefined){if(!masterContext||typeof masterContext!=='object'||Array.isArray(masterContext)||JSON.stringify(masterContext).length>6000||!['single','rows'].includes(masterContext.mode)||typeof masterContext.project!=='string'||masterContext.project.length>120||masterContext.key!==undefined&&(typeof masterContext.key!=='string'||masterContext.key.length>1000)||masterContext.filters!==undefined&&(!masterContext.filters||typeof masterContext.filters!=='object'||Array.isArray(masterContext.filters)||Object.entries(masterContext.filters).some(([k,v])=>!['Company','Industry','HO'].includes(k)||typeof v!=='string'||v.length>120)))fail('MAPPING_INVALID: Lựa chọn MASTER không hợp lệ.');}
 const periodValid=periodMode==='none'?meta?.period==='UNSPECIFIED':periodMode==='single'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(meta?.period);
 if(!meta||!short(meta.rule)||!short(meta.project)||!short(meta.template)||!periodValid||!short(meta.libraryVersion,100)||!short(meta.effectiveVersion,100)||meta.draft!==false||!Number.isInteger(meta.sourceRows)||meta.sourceRows<rows.length||meta.sourceRows>50000||!Number.isInteger(meta.invalidRows)||meta.invalidRows<0||meta.invalidRows!==meta.sourceRows-rows.length||!Array.isArray(manualSources)||manualSources.length>100||new Set(manualSources).size!==manualSources.length||manualSources.some(id=>!short(id)))fail('MAPPING_INVALID: Kiểm tra dự án, kỳ, số dòng và trạng thái rule. Chỉ Accept kết quả chính thức.');
 return {headers,rows,metadata:{rule:meta.rule,project:meta.project,template:meta.template,period:meta.period,periodMode,manualSources,...(masterContext?{masterContext}:{}),libraryVersion:meta.libraryVersion,effectiveVersion:meta.effectiveVersion,validRows:rows.length,sourceRows:meta.sourceRows,invalidRows:meta.invalidRows}};
}
export function mappingResultStore(p,c){
 const setup=()=>fail('MAPPING_SETUP_REQUIRED: Chạy supabase/mapping_results_v4_18.sql trên project Supabase hiện tại.',503);
 const rpc=async(name,args)=>{try{return await p.rpc(name,args);}catch{setup();}};
 async function accept(req,u,library){
  const result=decodeMappingResult(req),parts=[];
  if(!library?.tables||library.version!==result.metadata.libraryVersion)fail('MAPPING_RULE_CHANGED: Rule đã thay đổi hoặc chưa được lưu. Tải lại rule và chạy lại trước khi Accept.',409);
  let plan;try{const base=readLibrary(library.tables),runtime=result.metadata.masterContext?catalogRuntime(base,library.tables.Master,result.metadata.rule,result.metadata.masterContext,{periodMode:result.metadata.periodMode,checkValues:true,requireKeys:true}):null,lib=runtime?runtime.lib:prepareCommonLibrary(base,result.metadata.rule,{manualSources:result.metadata.manualSources,periodMode:result.metadata.periodMode,checkValues:false});plan=planRule(lib,result.metadata.rule);if(runtime)result.metadata.sourceRuleProject=runtime.ruleProject;}catch(e){fail('MAPPING_RULE_INVALID: '+e.message);}
  if(plan.project!==result.metadata.project||plan.template!==result.metadata.template||JSON.stringify(plan.names)!==JSON.stringify(result.headers))fail('MAPPING_INVALID: Dự án/template/cột kết quả không khớp rule đã lưu.');
  let group=[],bytes=2;for(const row of result.rows){const size=Buffer.byteLength(JSON.stringify(row))+1;if(size>500000)fail('MAPPING_LIMIT: Một dòng kết quả quá lớn.');if(group.length&&(group.length>=50||bytes+size>500000)){parts.push(group);group=[];bytes=2;}group.push(row);bytes+=size;}if(group.length)parts.push(group);
  if(parts.length>1000)fail('MAPPING_LIMIT: Kết quả cần chia nhỏ nguồn trước khi lưu.');
  const hash=sha(JSON.stringify(result));const begin=await rpc('staffing_begin_mapping_run',{p_scope:c.scope,p_id:req.id,p_actor:u.uid,p_actor_name:u.username,p_hash:hash,p_metadata:result.metadata,p_headers:result.headers,p_chunks:parts.length});
  if(begin?.conflict)fail('MAPPING_CONFLICT: Mã lần chạy đã gắn với dữ liệu khác.',409);
  if(!begin?.ok)fail('MAPPING_SAVE_FAILED: Chưa mở được phiên lưu.',503);
  if(begin.accepted)return {ok:true,id:req.id,alreadyAccepted:true};
  // Employee values are encrypted server-side. Pending runs never appear in history/stats.
  const chunks=parts.map((rows,i)=>({scope:c.scope,run_id:req.id,chunk_index:i,payload:seal(rows,c.key)}));
  for(let start=0;start<chunks.length;){const batch=[];let bytes=2;while(start<chunks.length&&batch.length<12){const size=Buffer.byteLength(JSON.stringify(chunks[start]))+1;if(batch.length&&bytes+size>750000)break;batch.push(chunks[start++]);bytes+=size;}try{await p.rest('POST','staffing_mapping_chunks?on_conflict=scope,run_id,chunk_index',batch,'resolution=merge-duplicates,return=minimal');}catch{fail('MAPPING_SAVE_PENDING: Chưa lưu đủ dữ liệu. Bấm Accept lại để tiếp tục cùng lần chạy; chưa tính vào thống kê.',503);}}
  const saved=await rpc('staffing_commit_mapping_run',{p_scope:c.scope,p_id:req.id,p_actor:u.uid});
  if(!saved?.ok)fail('MAPPING_SAVE_PENDING: Chưa xác nhận đủ dữ liệu. Bấm Accept lại, không tạo lần chạy mới.',503);return saved;
 }
 async function dashboard(u){return rpc('staffing_mapping_dashboard',{p_scope:c.scope,p_actor:u.role==='admin'?null:u.uid});}
 async function preview(id,u){
  if(!uuid(id))fail('MAPPING_INVALID: Mã lần chạy không hợp lệ.');let rows;
  try{rows=await p.rest('GET','staffing_mapping_runs?scope=eq.'+encodeURIComponent(c.scope)+'&id=eq.'+id+'&status=eq.accepted'+(u.role==='admin'?'':'&actor_uid=eq.'+u.uid)+'&select=id,metadata,headers,actor_name,accepted_at&limit=1');}catch{setup();}
  const row=rows?.[0];if(!row)fail('FORBIDDEN: Không có quyền xem hoặc chưa lưu lần chạy này.',403);
  let chunks;try{chunks=await p.rest('GET','staffing_mapping_chunks?scope=eq.'+encodeURIComponent(c.scope)+'&run_id=eq.'+id+'&chunk_index=eq.0&select=payload&limit=1');}catch{setup();}
  if(!chunks?.[0])fail('MAPPING_READ_FAILED: Chưa đọc được dữ liệu đã lưu.',503);
  return {ok:true,run:row,rows:unseal(chunks[0].payload,c.key).slice(0,20)};
 }
 return {accept,dashboard,preview};
}
