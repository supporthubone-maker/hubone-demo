import {randomUUID} from 'node:crypto';
import {fail,sha} from './config.js';
import {boolFlag_,readCatalogs_,validateCatalogAssignment_} from './domain.js';
export const EXTRA_TAB='Roadmap_DanhMuc',CATALOG_LOG='Roadmap_DanhMuc_Log';
export const EXTRA_HEADERS=['Loại','Mã','Tên hiển thị','Thứ tự','Đang sử dụng','Màu sắc','Nhóm trạng thái','Phiên bản','Cập nhật','Cập nhật bởi'];
export const LOG_HEADERS=['Thời gian','Người sửa','Loại','Mã','Thao tác','Trước','Sau'];
export const TYPES=['phases','groups','domains','statuses','priorities','owners'];
const kinds=['not-started','in-progress','completed'];
const sort=(a,b)=>a.order-b.order||String(a.id).localeCompare(String(b.id),'vi');
export function defaultExtras(tasks=[]){
 const phases=['Chuẩn hóa nền tảng','Xây phiên bản đầu','Thử nghiệm thực tế','Vận hành ổn định','Mở rộng hệ sinh thái'].map((name,i)=>({id:String(i+1),name,order:i+1,active:true}));
 for(const t of tasks)if(!phases.some(p=>p.id===String(t.phase)))phases.push({id:String(t.phase),name:'Giai đoạn '+t.phase,order:Number(t.phase),active:true});
 return {phases,statuses:[{id:'not-started',name:'Chưa bắt đầu',kind:'not-started',order:1,active:true},{id:'in-progress',name:'Đang thực hiện',kind:'in-progress',order:2,active:true},{id:'completed',name:'Hoàn thành',kind:'completed',order:3,active:true}],priorities:[{id:'high',name:'Cao',order:1,active:true},{id:'medium',name:'Trung bình',order:2,active:true},{id:'low',name:'Thấp',order:3,active:true}],owners:[...new Set(tasks.map(t=>t.owner).filter(Boolean))].map((name,i)=>({id:name,name,order:i+1,active:true}))};
}
export function encodeExtra(type,item){return [type,String(item.id),item.name,item.order,item.active,item.color||'',item.kind||'',item.revision||1,item.updated||'',item.updatedBy||''];}
export function readManagedCatalogs(snapshot){
 const base=readCatalogs_(snapshot),tasks=snapshot.tasks();const rows=snapshot.tables[EXTRA_TAB];let extra=defaultExtras(tasks);
 if(rows){
  if(!rows.length||rows[0].join('|')!==EXTRA_HEADERS.join('|'))fail('Danh mục: header Roadmap_DanhMuc không đúng. Khôi phục cấu trúc trước khi sửa.');
  extra={phases:[],statuses:[],priorities:[],owners:[]};const seen=new Set();
  rows.slice(1).forEach((row,i)=>{
   if(row.every(v=>String(v)===''))return;
   const type=String(row[0]),id=String(row[1]??'');if(!Object.hasOwn(extra,type)||seen.has(type+':'+id))fail('Danh mục: loại hoặc mã bị trùng tại dòng '+(i+2)+'.');seen.add(type+':'+id);
   const item=validateItem(type,{id,name:String(row[2]||''),order:Number(row[3]),active:boolFlag_(row[4],'Danh mục'),color:String(row[5]||''),kind:String(row[6]||'')});
   const revision=Number(row[7]);if(!Number.isInteger(revision)||revision<1)fail('Danh mục: phiên bản dòng '+(i+2)+' không hợp lệ.');
   extra[type].push({...item,revision,updated:String(row[8]||''),updatedBy:String(row[9]||''),_row:i+2});
  });
 }
 const catalogs={...base,...extra};validateAvailability(catalogs);
 for(const type of TYPES)catalogs[type].sort(sort);
 const source=['DanhMuc_TrienKhai','DanhMuc_NghiepVu',EXTRA_TAB,CATALOG_LOG].map(n=>snapshot.tables[n]||null);
 catalogs.initialized=!!rows&&!!snapshot.tables[CATALOG_LOG];catalogs.rowHash=sha(JSON.stringify(source));
 // Only counts are needed in the management screen; no separate employee data is fetched.
 const hubRows=snapshot.tables.HubOne_WorkItems||[],hubHeader=hubRows[0]||[],hubFields={statuses:'status',owners:'owner',priorities:'priority'};
 for(const type of TYPES)for(const item of catalogs[type])item.usage=tasks.filter(t=>uses(type,item.id,t)).length+(hubFields[type]?hubRows.slice(1).filter(row=>row[hubHeader.indexOf(hubFields[type])]===item.id).length:0);
 return catalogs;
}
export function uses(type,id,task){const fields={groups:'workstream',phases:'phase',statuses:'status',priorities:'priority',owners:'owner'};return type==='domains'?task.domain.split(',').includes(String(id)):String(task[fields[type]])===String(id);}
export function validateItem(type,input){
 if(!TYPES.includes(type)||!input||typeof input!=='object')fail('Danh mục: loại không hợp lệ.');
 if(typeof input.id!=='string'||typeof input.name!=='string')fail('Danh mục: mã và tên cần là văn bản.');
 const id=input.id.trim(),name=input.name.trim(),order=Number(input.order);
 if(type==='phases'){if(!/^[1-9][0-9]{0,3}$/.test(id))fail('Danh mục: mã giai đoạn là số nguyên từ 1 đến 9999.');}
 else if(type==='owners'){if(!id||id.length>150||/[\u0000-\u001f\u007f]/.test(id))fail('Danh mục: mã người phụ trách không hợp lệ.');}
 else {const max=type==='statuses'?30:type==='priorities'?15:60;if(!new RegExp('^[a-z][a-z0-9-]{0,'+(max-1)+'}$').test(id)||type==='statuses'&&id==='overdue')fail('Danh mục: mã dùng chữ thường không dấu, số và gạch ngang; mã trạng thái không được là overdue.');}
 if(!name||name.length>(type==='owners'?150:120)||!Number.isFinite(order)||!Number.isInteger(order)||Math.abs(order)>100000||typeof input.active!=='boolean')fail('Danh mục: kiểm tra tên (1–120 ký tự), thứ tự nguyên và trạng thái sử dụng.');
 const item={id,name,order,active:input.active};
 if(type==='groups'){item.color=String(input.color||'#53846e');if(!/^#[0-9a-fA-F]{6}$/.test(item.color))fail('Danh mục: màu cần có dạng #53846e.');}
 if(type==='statuses'){item.kind=String(input.kind||'');if(!kinds.includes(item.kind))fail('Danh mục: chọn nhóm xử lý trạng thái.');if(kinds.includes(id)&&item.kind!==id)fail('Danh mục: giữ nhóm xử lý của mã trạng thái hệ thống.');}
 return item;
}
function validateAvailability(c){
 if(!c.domains.some(x=>x.id==='all'&&x.active))fail('Danh mục: giữ mục Dùng chung (all) đang sử dụng.');
 if(!c.groups.some(x=>x.active)||!c.phases.some(x=>x.active))fail('Danh mục: giữ ít nhất một nhóm công việc và một giai đoạn đang sử dụng.');
 for(const kind of kinds)if(!c.statuses.some(x=>x.active&&x.kind===kind))fail('Danh mục: cần ít nhất một trạng thái đang sử dụng cho mỗi nhóm Chưa bắt đầu / Đang thực hiện / Hoàn thành.');
}
export function planCatalogSave(request,snapshot,actor){
 const catalogs=readManagedCatalogs(snapshot);
 if(!catalogs.initialized)fail('Danh mục: bấm Khởi tạo danh mục trước khi lưu.');
 if(request?.expectedHash!==catalogs.rowHash)fail('CONFLICT: Danh mục đã thay đổi. Tải lại danh sách trước khi lưu.',409);
 const type=request.type,item=validateItem(type,request.item),list=catalogs[type],current=list.find(x=>String(x.id)===item.id);
 if(request.mode!=='create'&&request.mode!=='update')fail('Danh mục: thao tác không hợp lệ.');
 if(request.mode==='create'&&current)fail('Danh mục: mã đã tồn tại. Dùng Chỉnh sửa để cập nhật.');
 if(request.mode==='update'&&!current)fail('CONFLICT: Không tìm thấy mã đã chọn; không được đổi mã của mục cũ.',409);
 if(type==='statuses'&&current&&current.kind!==item.kind&&current.usage>0)fail('Danh mục: trạng thái đã có công việc liên kết, không được đổi nhóm xử lý. Tạo mã mới nếu cần.');
 const next={...item,revision:current?Number(current.revision||1)+1:1,updated:new Date().toISOString(),updatedBy:actor};
 catalogs[type]=current?list.map(x=>x===current?next:x):[...list,next];validateAvailability(catalogs);
 let tab,row,values;
 if(type==='groups'||type==='domains'){
  tab=type==='groups'?'DanhMuc_TrienKhai':'DanhMuc_NghiepVu';const rows=snapshot.tables[tab];const index=rows.findIndex((r,i)=>i>0&&String(r[0])===item.id);row=current?index+1:rows.length+1;
  values=type==='groups'?[next.id,next.name,next.color,next.order,next.active]:[next.id,next.name,next.order,next.active];
 }else{tab=EXTRA_TAB;row=current?current._row:snapshot.tables[tab].length+1;values=encodeExtra(type,next);}
 return {type,next,current,tab,row,values,action:current?'UPDATE':'CREATE'};
}
export function validateManagedAssignment(task,current,catalogs){
 validateCatalogAssignment_(task,current,catalogs);
 for(const [type,field,optional] of [['phases','phase',false],['statuses','status',false],['priorities','priority',true],['owners','owner',true]]){
  const id=String(task[field]??'');if(optional&&!id)continue;
  const item=catalogs[type].find(x=>String(x.id)===id),same=current&&String(current[field])===id;
  if(!item?.active&&!same)fail('Danh mục: '+({phases:'Giai đoạn',statuses:'Trạng thái',priorities:'Độ ưu tiên',owners:'Người phụ trách'}[type])+' chưa có hoặc đã ngừng sử dụng. Làm mới rồi chọn lại.');
 }
 const status=catalogs.statuses.find(x=>x.id===task.status);
 if(status?.kind==='completed'){if(task.progress!==''&&Number(task.progress)!==100)fail('Công việc hoàn thành cần có tiến độ 100%.');task.progress=100;}
}

export function generateCatalogRequest(req,snapshot){
 if(!req||typeof req!=='object')fail('Danh mục: thiếu yêu cầu.');
 if(req.mode!=='create'||req.item?.id)return req;
 const type=req.type,c=readManagedCatalogs(snapshot);if(!TYPES.includes(type))fail('Danh mục: loại không hợp lệ.');
 const id=type==='phases'?String(Math.max(0,...c.phases.map(x=>Number(x.id)))+1):({statuses:'st',priorities:'p',owners:'nv',groups:'g',domains:'d'}[type])+'-'+randomUUID().replace(/-/g,'').slice(0,12);
 return {...req,item:{...req.item,id}};
}
