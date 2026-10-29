import {randomUUID} from 'node:crypto';
import {fail,sha,seal,unseal} from './config.js';
import {requirePermission,has,IMPORT_LOG,IMPORT_HEADERS} from './roles.js';
import {EXTRA_TAB,CATALOG_LOG,generateCatalogRequest,planCatalogSave,validateManagedAssignment,TYPES} from './catalogs.js';
import * as d from './domain.js';
const META=['_id','_version','_hash','_scope'];
export const TASK_COLUMNS=[['title','Tên công việc'],['workstream','Nhóm công việc'],['phase','Giai đoạn'],['startDate','Ngày bắt đầu'],['target','Ngày kết thúc'],['owner','Người phụ trách'],['status','Trạng thái'],['progress','Tiến độ (%)'],['priority','Độ ưu tiên'],['domain','Mảng nghiệp vụ'],['inputs','Nội dung thực hiện'],['accept','Điều kiện hoàn thành'],['deps','Công việc cần làm trước'],['notes','Ghi chú'],['next','Bước tiếp theo'],['blockers','Vướng mắc']];
const fieldTypes={workstream:'groups',phase:'phases',owner:'owners',status:'statuses',priority:'priorities',domain:'domains'};
const kindNames={'not-started':'Chưa bắt đầu','in-progress':'Đang thực hiện',completed:'Hoàn thành'};
const norm=x=>String(x??'').normalize('NFC').trim().toLocaleLowerCase('vi');
const context=(c,type)=>sha(c.scope+':'+type);
export function columns(type){if(type==='tasks')return [...META,...TASK_COLUMNS.map(x=>x[1])];if(!TYPES.includes(type))fail('Nhập file: loại dữ liệu không hợp lệ.');return [...META,'Tên hiển thị','Thứ tự','Đang sử dụng',...(type==='groups'?['Màu nhóm']:[]),...(type==='statuses'?['Nhóm tính tiến độ']:[])];}
function need(u,type,importing=false){requirePermission(u,'roadmap.view');if(type!=='tasks')requirePermission(u,'catalogs.manage');if(importing)requirePermission(u,'data.import');}
function label(c,type,id){return c[type].find(x=>String(x.id)===String(id))?.name||String(id);}
export function buildExport(req,snapshot,user,c={scope:'default'}){
 const type=req?.type;need(user,type);const headers=columns(type),catalogs=snapshot.catalogs(),rows=[];
 if(!req.template){
  if(type==='tasks')for(const task of snapshot.tasks())rows.push([task.key,task.revision,d.hashRow_(task),context(c,type),...TASK_COLUMNS.map(([field])=>field==='domain'?task.domain.split(',').map(id=>label(catalogs,'domains',id)).join(' | '):fieldTypes[field]?label(catalogs,fieldTypes[field],task[field]):String(task[field]??''))]);
  else for(const x of catalogs[type])rows.push([x.id,x.revision||1,catalogs.rowHash,context(c,type),x.name,x.order,x.active?'Có':'Không',...(type==='groups'?[x.color]:[]),...(type==='statuses'?[kindNames[x.kind]]:[])]);
 }
 return {type,headers,rows,hiddenColumns:4,lists:Object.fromEntries(Object.entries(fieldTypes).map(([field,ct])=>[TASK_COLUMNS.find(x=>x[0]===field)[1],catalogs[ct].filter(x=>x.active).map(x=>x.name)])),maxRows:100};
}
function resolve(catalogs,type,text,currentId){
 const list=catalogs[type],value=String(text??'').trim();if(!value&&['owners','priorities'].includes(type))return '';
 const old=list.find(x=>String(x.id)===String(currentId));if(old&&norm(old.name)===norm(value))return String(old.id);
 const found=list.filter(x=>norm(x.name)===norm(value));if(found.length!==1)fail('Nhập file: '+value+(found.length?' có nhiều mục trùng tên; đổi tên danh mục để phân biệt.':' chưa có trong danh mục. Tạo danh mục rồi nhập lại.'));
 return String(found[0].id);
}
function date(value){const s=String(value??'').trim(),m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?m[3]+'-'+m[2]+'-'+m[1]:s;}
function enabled(value){const s=norm(value);if(['có','co','true','1'].includes(s))return true;if(['không','khong','false','0'].includes(s))return false;fail('Nhập file: Đang sử dụng phải là Có/Không hoặc TRUE/FALSE.');}
function sourceHash(snapshot){return sha(JSON.stringify(['Roadmap_Tasks','DanhMuc_TrienKhai','DanhMuc_NghiepVu',EXTRA_TAB,CATALOG_LOG].map(n=>snapshot.tables[n]||null)));}
const range=(tab,row,count)=>"'"+tab+"'!A"+row+':'+String.fromCharCode(64+count)+row;
function addRow(writes,tables,tab,row,values){writes.push({range:range(tab,row,values.length),values:[values]});tables[tab][row-1]=values.map(x=>String(x??''));}
export function previewImport(req,snapshot,user,c){
 const type=req?.type;need(user,type,true);const headers=columns(type),rows=req.rows;
 if(!Array.isArray(rows)||rows.length<1||rows.length>100||JSON.stringify(rows).length>650000)fail('Nhập file: mỗi lần nhập 1–100 dòng, tổng nội dung tối đa 650 KB.');
 if(!Array.isArray(req.headers)||req.headers.length!==headers.length||req.headers.some((h,i)=>h!==headers[i]))fail('Nhập file: cột không đúng mẫu. Tải mẫu hoặc dữ liệu hiện tại từ app.');
 if(snapshot.tables[IMPORT_LOG]?.[0]?.join('|')!==IMPORT_HEADERS.join('|'))fail('Nhập file: mở Vai trò → Khởi tạo phân quyền trước khi nhập file.');
 const catalogs=snapshot.catalogs();if(!catalogs.initialized)fail('Nhập file: mở Danh mục → Khởi tạo danh mục trước khi nhập file.');
 const tasks=snapshot.tasks(),tables=structuredClone(snapshot.tables),writes=[],changes=[],errors=[],seen=new Set(),stamp=new Date().toISOString();let created=0,updated=0;
 for(let index=0;index<rows.length;index++){
  const row=rows[index];try{
   if(!Array.isArray(row)||row.length>headers.length||row.some(x=>!['string','number','boolean'].includes(typeof x)&&x!==null))fail('Nhập file: giá trị ô không hợp lệ.');
   if(row.slice(4).every(x=>String(x??'').trim()===''))continue;
   const id=String(row[0]??'').trim();if(id&&seen.has(id))fail('Nhập file: trùng mã trong cùng file. Không sao chép dòng cũ để tạo mới.');if(id)seen.add(id);
   if(row[3]&&String(row[3])!==context(c,type))fail('Nhập file: file thuộc loại dữ liệu hoặc app khác. Tải lại file từ đúng màn hình.');
   if(!id&&(String(row[1]??'').trim()||String(row[2]??'').trim()))fail('Nhập file: dòng mới cần để trống toàn bộ bốn cột kỹ thuật; dùng dòng trống hoặc file mẫu.');
   if(type==='tasks'){
    const current=id?tasks.find(t=>t.key===id):null;if(id&&!current)fail('Nhập file: mã công việc không tồn tại. Không tự gõ hoặc sửa mã.');
    requirePermission(user,current?'roadmap.edit':'roadmap.create');
    if(current&&(Number(row[1])!==Number(current.revision)||row[2]!==d.hashRow_(current)))fail('CONFLICT: Công việc đã thay đổi sau khi tải file. Tải dữ liệu mới rồi sửa lại.',409);
    const input={key:current?.key||'user-'+randomUUID()};TASK_COLUMNS.forEach(([field],i)=>input[field]=String(row[i+4]??'').trim());
    for(const [field,ct] of Object.entries(fieldTypes)){
     if(field==='domain'){const values=input.domain.split('|').map(x=>x.trim()).filter(Boolean);input.domain=values.map(v=>resolve(catalogs,ct,v,current?.domain.split(',').find(id=>norm(label(catalogs,ct,id))===norm(v)))).join(',');}
     else input[field]=resolve(catalogs,ct,input[field],current?.[field]);
    }
    input.phase=Number(input.phase);input.startDate=date(input.startDate);input.target=date(input.target);input.progress=input.progress===''?'':Number(input.progress.replace(',','.'));
    const task=d.validateTask_(input);validateManagedAssignment(task,current,catalogs);Object.assign(task,{id:current?.id||'USR-'+randomUUID().slice(0,8).toUpperCase(),revision:current?Number(current.revision)+1:1,updated:stamp,updatedBy:user.username});
    const line=current?current._row:tables.Roadmap_Tasks.length+1;addRow(writes,tables,'Roadmap_Tasks',line,d.ROADMAP_HEADERS.map(h=>String(task[h]??'')));
    addRow(writes,tables,'Roadmap_Log',tables.Roadmap_Log.length+1,[stamp,user.username,task.key,current?'IMPORT_UPDATE':'IMPORT_CREATE',String(task.revision),JSON.stringify(current?d.publicTask_(current):{}),JSON.stringify(d.publicTask_(task))]);
    changes.push({row:index+2,action:current?'Cập nhật':'Thêm mới',name:task.title,id:task.id});current?updated++:created++;
   }else{
    const current=id?catalogs[type].find(x=>String(x.id)===id):null;if(id&&!current)fail('Nhập file: mã danh mục không tồn tại.');
    if(current&&(row[2]!==catalogs.rowHash||Number(row[1])!==Number(current.revision||1)))fail('CONFLICT: Danh mục đã thay đổi sau khi tải file. Tải dữ liệu mới rồi sửa lại.',409);
    const item={id:id||'',name:String(row[4]??''),order:Number(row[5]),active:enabled(row[6])};if(type==='groups')item.color=String(row[7]||'#53846e');if(type==='statuses'){item.kind=Object.keys(kindNames).find(k=>norm(kindNames[k])===norm(row[7]));}
    // Stage each row against the already validated batch, including newly generated IDs.
    const staged=Object.create(Object.getPrototypeOf(snapshot));staged.tables=tables;
    const request=generateCatalogRequest({type,item,mode:current?'update':'create',expectedHash:staged.catalogs().rowHash},staged),plan=planCatalogSave(request,staged,user.username);
    addRow(writes,tables,plan.tab,plan.row,plan.values);addRow(writes,tables,CATALOG_LOG,tables[CATALOG_LOG].length+1,[stamp,user.username,type,plan.next.id,'IMPORT_'+plan.action,JSON.stringify(plan.current||{}),JSON.stringify(plan.next)]);
    changes.push({row:index+2,action:current?'Cập nhật':'Thêm mới',name:plan.next.name,id:plan.next.id});current?updated++:created++;
   }
  }catch(error){errors.push({row:index+2,message:String(error.message||'Dòng dữ liệu chưa hợp lệ.')});}
 }
 if(!changes.length&&!errors.length)errors.push({row:0,message:'File chưa có dòng dữ liệu để nhập.'});
 if(errors.length)return {canCommit:false,changes,errors,created,updated};
 const job={id:randomUUID(),uid:user.uid,scope:c.scope,type,sourceHash:sourceHash(snapshot),expires:Date.now()+10*60000,writes,created,updated};
 const previewToken=seal(job,c.key);if(previewToken.length>1400000)fail('Nhập file: phiên nhập quá lớn. Chia file thành các phần nhỏ hơn.');return {canCommit:true,changes,errors:[],created,updated,previewToken,expiresAt:job.expires};
}
export async function commitImport(req,snapshot,user,c,repo){
 let job;try{job=unseal(req?.previewToken,c.key);}catch{fail('Nhập file: phiếu xác nhận không hợp lệ. Xem trước lại file.');}
 if(job.uid!==user.uid||job.scope!==c.scope||!['tasks',...TYPES].includes(job.type))fail('Nhập file: phiếu xác nhận không thuộc tài khoản hoặc app này.',403);
 need(user,job.type,true);if(job.type==='tasks'){if(job.created)requirePermission(user,'roadmap.create');if(job.updated)requirePermission(user,'roadmap.edit');}
 const rows=snapshot.tables[IMPORT_LOG];if(rows?.[0]?.join('|')!==IMPORT_HEADERS.join('|'))fail('Nhập file: nhật ký nhập chưa được khởi tạo.');
 const previous=rows.find((r,i)=>i>0&&r[0]===job.id);if(previous)return {ok:true,alreadyApplied:true,created:Number(previous[4]),updated:Number(previous[5]),message:'Phiên nhập này đã hoàn tất trước đó; không ghi trùng.'};
 if(job.expires<Date.now())fail('Nhập file: phiếu xem trước hết hạn sau 10 phút. Xem trước lại.');
 if(job.sourceHash!==sourceHash(snapshot))fail('CONFLICT: Dữ liệu thay đổi sau khi xem trước. Xem trước lại để đối soát.',409);
 const log=[job.id,user.username,job.type,new Date().toISOString(),job.created,job.updated,'DONE'];
 await repo.writeImport([...job.writes,{range:range(IMPORT_LOG,rows.length+1,log.length),values:[log]}]);
 return {ok:true,created:job.created,updated:job.updated,message:'Đã nhập '+job.created+' dòng mới, cập nhật '+job.updated+' dòng.'};
}
