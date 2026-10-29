import {text} from './mapper-engine.js';
const on=(r,draft)=>!['TAT','VI_DU'].includes(text(r['Trạng thái']))&&(draft||text(r['Trạng thái'])==='SAN_SANG');
export const commonKey=(source,field)=>JSON.stringify([source,field]);
export function commonGroups(lib,id,{draft=false}={}){
 if(!lib)return [];
 const ms=lib.mapping.filter(m=>text(m['Rule ID'])===id&&on(m,draft));
 return lib.sources.filter(s=>text(s['Rule ID'])===id&&s['Vai trò']==='LOOKUP'&&!['TAT','VI_DU'].includes(text(s['Trạng thái']))).map(source=>{
  const fields=[...new Set(ms.filter(m=>m['Nguồn ID']===source['Nguồn ID']&&['COLUMN','LOOKUP'].includes(m['Cách lấy'])).map(m=>m['Cột template']))].map(name=>{
   const mappings=ms.filter(m=>m['Cột template']===name),field=lib.fields.find(f=>f.Template===ms[0]?.Template&&f['Cột template']===name);
   return {name,key:commonKey(source['Nguồn ID'],name),type:field?.['Kiểu dữ liệu']||'TEXT',required:(field?.['Bắt buộc mặc định']==='YES'||mappings.some(m=>m['Bắt buộc']==='YES'))&&mappings.every(m=>m['Nguồn ID']===source['Nguồn ID'])};
  });return {id:source['Nguồn ID'],source,fields};
 }).filter(g=>g.fields.length);
}
export function prepareCommonLibrary(lib,id,{manualSources=[],values={},draft=false,periodMode='single',checkValues=true}={}){
 if(!lib)return lib;
 const groups=commonGroups(lib,id,{draft}),ids=new Set(manualSources);
 if(!Array.isArray(manualSources)||ids.size!==manualSources.length||manualSources.some(s=>!groups.some(g=>g.id===s)))throw Error('Nguồn nhập thông tin chung không hợp lệ cho Rule ID này.');
 for(const g of groups.filter(g=>ids.has(g.id)))for(const f of g.fields){const v=values[f.key]??'';if(checkValues&&f.required&&!text(v))throw Error('Bước 1 · Thông tin chung: nhập '+f.name+' cho '+g.id+'.');if(typeof v!=='string'&&typeof v!=='number'&&typeof v!=='boolean')throw Error('Giá trị thông tin chung không hợp lệ.');if(String(v).length>10000)throw Error('Thông tin chung quá dài: '+f.name);}
 const next={...lib,inputWarnings:[],fields:lib.fields.map(f=>({...f})),mapping:lib.mapping.map(m=>({...m})),sources:lib.sources.filter(s=>!(text(s['Rule ID'])===id&&ids.has(s['Nguồn ID'])))};
 for(const m of next.mapping)if(text(m['Rule ID'])===id&&on(m,draft)&&ids.has(m['Nguồn ID'])&&['COLUMN','LOOKUP'].includes(m['Cách lấy'])){m['Giá trị / tham số']=values[commonKey(m['Nguồn ID'],m['Cột template'])]??'';m['Cách lấy']='FIXED';m['Nguồn ID']='';m['Cột nguồn']='';}
 if(periodMode==='none'){
  const selected=next.mapping.filter(m=>text(m['Rule ID'])===id&&on(m,draft));
  const parameterOnly=[...new Set(selected.map(m=>m['Cột template']))].filter(name=>selected.filter(m=>m['Cột template']===name).every(m=>m['Cách lấy']==='PARAM'&&['report_year','report_month'].includes(text(m['Giá trị / tham số']))));
  for(const f of next.fields)if(f.Template===selected[0]?.Template&&parameterOnly.includes(f['Cột template']))f['Bắt buộc mặc định']='NO';
  for(const m of selected)if(parameterOnly.includes(m['Cột template']))m['Bắt buộc']='NO';
  if(parameterOnly.length)next.inputWarnings.push('Không gán kỳ: '+parameterOnly.join(', ')+' chỉ lấy từ PARAM năm/tháng, sẽ để trống và không bắt buộc trong lần chạy này. Cột thời gian đọc từ file không bị ghi đè.');
 }
 return next;
}
