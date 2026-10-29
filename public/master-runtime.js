import {readLibrary,listRules,text} from './mapper-engine.js';
import {commonGroups,prepareCommonLibrary,commonKey} from './common-inputs.js';
import {masterRecords,masterRecordKey,projectKey,scopedMaster,masterHeader} from './master-catalog.js';
export function catalogRuntime(lib,table,id,context,{periodMode='none',draft=false,checkValues=true,requireKeys=false}={}){
 if(!context||!['single','rows'].includes(context.mode)||typeof context.project!=='string')throw Error('Bước 1: Chọn thông tin MASTER.');
 const rule=listRules(lib).find(r=>r.id===id);if(!rule)throw Error('Bước 1: Chọn Rule ID từ thư viện.');
 const groups=commonGroups(lib,id,{draft}).filter(g=>/MASTER/i.test(g.id)),ids=groups.map(g=>g.id);
 if(context.mode==='single'){
  const record=masterRecords(table).find(r=>masterRecordKey(r)===context.key&&projectKey(r['Project Code'])===projectKey(context.project));if(!record)throw Error('Bước 1: Chọn đủ dự án, dịch vụ và các thông tin MASTER còn nhiều lựa chọn.');
  const values=commonValues(record,groups);
  if(checkValues)for(const g of groups)for(const f of g.fields)if(f.required&&!text(values[f.key]))throw Error('MASTER của '+record['Project Name']+' còn thiếu '+f.name+'. Quản trị cần cập nhật danh mục MASTER.');
  return {lib:bindProject(prepareCommonLibrary(lib,id,{manualSources:ids,values,draft,periodMode,checkValues:false}),id,record['Project Code']),datasets:Object.create(null),ids,record,ruleProject:rule.project};
 }
 const records=scopedMaster(table,context);if(!records.length)throw Error('Bước 1: Dự án chưa có dữ liệu MASTER phù hợp.');
 if(ids.length&&records.every(r=>!r['Service Code']&&!r['Service Name']))throw Error('Bước 1: MASTER chưa khai báo dịch vụ. Chọn Một dịch vụ cho toàn bộ file hoặc cập nhật danh mục trước.');
 const main=lib.sources.find(s=>s['Rule ID']===id&&s['Vai trò']==='MAIN'),joins=Array.isArray(context.joins)?context.joins:[];
 if(joins.length>4||joins.some(j=>!j||!['Service Code','Service Name','Company Code','Company Name','Industry Code','Industry Name','HO Code','HO Name'].includes(j.master)||typeof j.source!=='string'||j.source.length>500)||new Set(joins.map(j=>j.master)).size!==joins.length)throw Error('Khóa nối MASTER không hợp lệ.');
 if(requireKeys&&ids.length&&!joins.some(j=>['Service Code','Service Name'].includes(j.master)&&j.source))throw Error('Bước 2: Chọn cột mã/tên dịch vụ trong file nguồn để tra MASTER từng dòng.');
 const chosen=joins.filter(j=>j.source),keys=chosen.length?chosen:[{master:'Service Code',source:'__CHON_COT_DICH_VU__'}];
 if(requireKeys&&ids.length){const seen=new Set();for(const r of records){const key=JSON.stringify(keys.map(k=>text(r[k.master]).toLowerCase()));if(seen.has(key))throw Error('MASTER còn nhiều dòng cùng dịch vụ. Chọn thêm HO/ngành/công ty ở bước 1, thêm cột khóa ở bước 2 hoặc tra theo mã nếu tên dịch vụ trùng.');seen.add(key);}}
 const next=prepareCommonLibrary(lib,id,{periodMode,draft});
 next.sources=next.sources.map(s=>s['Rule ID']===id&&ids.includes(s['Nguồn ID'])?{...s,'Trạng thái':'SAN_SANG','Vai trò':'LOOKUP','Nguồn nối tới':main?.['Nguồn ID'],'Khóa tại nguồn':keys.map(k=>k.master).join(';'),'Khóa phía đối chiếu':keys.map(k=>k.source).join(';'),'Trùng khóa':'ERROR','Không tìm thấy':'ERROR'}:s);
 const headers=Object.keys(records[0]),datasets=Object.create(null);for(const source of ids)datasets[source]={headers,rows:records,file:'MASTER dùng chung',sheet:'Master',headerRow:1};
 for(const m of next.mapping)if(m['Rule ID']===id&&ids.includes(m['Nguồn ID'])){const canonical=masterHeader(m['Cột nguồn']||m['Cột template']);if(headers.includes(canonical))m['Cột nguồn']=canonical;}
 return {lib:bindProject(next,id,records[0]['Project Code']),datasets,ids,records,ruleProject:rule.project};
}
// Project identity comes from the selected catalog. Keep saved rules and source IDs intact.
function bindProject(lib,id,project){return {...lib,mapping:lib.mapping.map(m=>text(m['Rule ID'])===id?{...m,'Dự án':project}:m)};}
function commonValues(record,groups){const values=Object.create(null);for(const g of groups)for(const f of g.fields)values[commonKey(g.id,f.name)]=record[masterHeader(f.name)]??'';return values;}
