// Shared, dependency-free rule engine. No network, DOM or formula evaluation.
export const text=v=>String(v??'').trim();
export const RULE_TEMPLATE_HEADERS={
 Truong_chuan:['Template','Thứ tự','Cột template','Tên tiếng Việt','Kiểu dữ liệu','Bắt buộc mặc định','Tình trạng','Nguồn / ghi chú'],
 Mapping:['Trạng thái','Rule ID','Dự án','Template','Cột template','Nguồn ID','Cột nguồn','Cách lấy','Giá trị / tham số','Ưu tiên','Bắt buộc','Kiểu dữ liệu','Chuẩn hóa','Tên cột gợi ý','Ghi chú'],
 Nguon:['Trạng thái','Rule ID','Nguồn ID','Kênh','Vai trò','Sheet / bảng','Dòng tiêu đề Excel','Nguồn nối tới','Khóa tại nguồn','Khóa phía đối chiếu','Trùng khóa','Không tìm thấy','Kết nối API ID','Ghi chú'],
 Quy_doi:['Trạng thái','Rule ID','Cột template','Giá trị nguồn','Giá trị đầu ra','So sánh','Nếu không khớp'],
 Dieu_kien:['Trạng thái','Rule ID','Nhóm','Ưu tiên','Cột kiểm tra','Phép so sánh','Loại đối chiếu','Giá trị đối chiếu','Hành động','Cột tác động','Giá trị gán','Thông báo']
};
export function ruleTemplateTables(tables=null){
 const output={};for(const [name,headers] of Object.entries(RULE_TEMPLATE_HEADERS)){
  const required=name==='Truong_chuan'?['Template','Cột template','Thứ tự']:name==='Nguon'?['Rule ID','Nguồn ID','Vai trò']:name==='Dieu_kien'?['Rule ID','Nhóm','Cột kiểm tra']:['Rule ID','Cột template'];
  const rows=tables?.[name]?records(tables[name],required):[];
  output[name]=[[...headers],...rows.map(row=>headers.map(h=>row[h]??''))];
 }return output;
}
export function mergeRuleLibraries(base,incoming){
 const next=ruleTemplateTables(incoming);if(!base)return next;
 const previous=ruleTemplateTables(base),oldLib=readLibrary(previous),newLib=readLibrary(next);
 const oldRules=listRules(oldLib),newRules=listRules(newLib);if(!newRules.length)throw Error('File chưa có Rule ID để lưu.');
 for(const r of newRules){const old=oldRules.find(x=>x.id===r.id);if(old&&(old.project!==r.project||old.template!==r.template))throw Error('Rule ID trùng với dự án/template khác: '+r.id);}
 const ids=new Set(newRules.map(r=>r.id)),out={};
 const keys=new Set(oldLib.fields.map(r=>JSON.stringify([r.Template,r['Cột template']])));
 out.Truong_chuan=[previous.Truong_chuan[0],...previous.Truong_chuan.slice(1),...newLib.fields.filter(r=>!keys.has(JSON.stringify([r.Template,r['Cột template']]))).map(r=>RULE_TEMPLATE_HEADERS.Truong_chuan.map(h=>r[h]??''))];
 for(const n of ['Mapping','Nguon','Quy_doi','Dieu_kien']){const i=previous[n][0].indexOf('Rule ID');out[n]=[previous[n][0],...previous[n].slice(1).filter(r=>!ids.has(text(r[i]))),...next[n].slice(1)];}
 if(base.Master)out.Master=base.Master.map(r=>[...r]);return out;
}
const norm=v=>text(v).toLocaleLowerCase('vi');
export function records(matrix,required){
 const header=matrix.findIndex(row=>required.every(h=>row.includes(h)));
 if(header<0)throw Error('Thiếu header: '+required.join(', '));
 const hs=matrix[header].map(text);
 return matrix.slice(header+1).map((row,i)=>Object.assign(Object.create(null),Object.fromEntries(hs.map((h,j)=>[h,row[j]??''])),{_row:header+i+2})).filter(r=>hs.some(h=>text(r[h])));
}
export function readLibrary(tables){
 const get=(name,headers,optional=false)=>{if(!tables[name]){if(optional)return [];throw Error('Thiếu sheet '+name);}return records(tables[name],headers);};
 return {fields:get('Truong_chuan',['Template','Cột template','Thứ tự']),mapping:get('Mapping',['Rule ID','Dự án','Template','Cột template']),sources:get('Nguon',['Rule ID','Nguồn ID','Vai trò']),values:get('Quy_doi',['Rule ID','Cột template','Giá trị nguồn'],true),conditions:get('Dieu_kien',['Rule ID','Nhóm','Cột kiểm tra'],true)};
}
const enabled=(r,draft)=>!['TAT','VI_DU'].includes(text(r['Trạng thái']))&&(draft||text(r['Trạng thái'])==='SAN_SANG');
export function listRules(lib){
 const seen=new Map();for(const r of lib.mapping){const id=text(r['Rule ID']);if(!id)continue;const current=seen.get(id);if(current&&(current.project!==text(r['Dự án'])||current.template!==text(r.Template)))throw Error('Rule ID thuộc nhiều dự án/template: '+id);seen.set(id,{id,project:text(r['Dự án']),template:text(r.Template)});}return [...seen.values()];
}
export function planRule(lib,id,{draft=false}={}){
 const selected=listRules(lib).find(r=>r.id===id);if(!selected)throw Error('Chưa chọn Rule ID.');
 const mappings=lib.mapping.filter(r=>text(r['Rule ID'])===id&&enabled(r,draft));
 if(!mappings.length)throw Error('Rule chưa SAN_SANG. Chọn xem thử bản nháp hoặc duyệt rule.');
 const fields=lib.fields.filter(r=>text(r.Template)===selected.template).sort((a,b)=>Number(a['Thứ tự'])-Number(b['Thứ tự']));
 const names=fields.map(r=>text(r['Cột template']));if(!names.length||new Set(names).size!==names.length)throw Error('Trường chuẩn trống hoặc trùng tên trong template.');
 const sources=lib.sources.filter(r=>text(r['Rule ID'])===id&&enabled(r,draft));
 const ids=sources.map(s=>text(s['Nguồn ID']));if(ids.some(x=>!x)||new Set(ids).size!==ids.length)throw Error('Nguồn ID thiếu hoặc trùng trong rule.');
 if(sources.filter(s=>s['Vai trò']==='MAIN').length!==1)throw Error('Mỗi rule cần đúng một nguồn MAIN.');
 const warnings=[];
 for(const m of mappings){if(!names.includes(text(m['Cột template'])))throw Error('Cột mapping không có trong Truong_chuan: '+m['Cột template']);if(!['COLUMN','LOOKUP','FIXED','PARAM'].includes(m['Cách lấy']))throw Error('Cách lấy không hợp lệ tại Mapping dòng '+m._row);if(['COLUMN','LOOKUP'].includes(m['Cách lấy'])&&!ids.includes(text(m['Nguồn ID'])))throw Error('Thiếu cấu hình nguồn '+m['Nguồn ID']);if(!Number.isInteger(Number(m['Ưu tiên']))||Number(m['Ưu tiên'])<1)throw Error('Ưu tiên phải là số nguyên dương.');if(text(m['Bắt buộc'])==='CHUA_XAC_NHAN'||text(m['Kiểu dữ liệu'])==='CHUA_XAC_NHAN'){if(!draft)throw Error('Chưa xác nhận bắt buộc/kiểu dữ liệu: '+m['Cột template']);warnings.push('Chưa xác nhận: '+m['Cột template']);}}
 for(const f of fields)if(!mappings.some(m=>m['Cột template']===f['Cột template']))warnings.push('Chưa mapping: '+f['Cột template']);
 const valueRules=lib.values.filter(r=>r['Rule ID']===id&&enabled(r,draft));
 const conditions=lib.conditions.filter(r=>r['Rule ID']===id&&enabled(r,draft));
 for(const c of conditions){if(!names.includes(c['Cột kiểm tra'])||(['SET','CLEAR'].includes(c['Hành động'])&&!names.includes(c['Cột tác động'])))throw Error('Điều kiện dùng cột không có trong template.');if(!['=','!=','≠','<','<=','≤','>','>=','≥','IS_BLANK','IS_NOT_BLANK','is blank','is not blank'].includes(c['Phép so sánh']))throw Error('Phép so sánh chưa hỗ trợ: '+c['Phép so sánh']);if(!['SET','CLEAR','ERROR_ROW','SKIP_ROW'].includes(c['Hành động']))throw Error('Hành động chưa hỗ trợ: '+c['Hành động']);}
 return {...selected,fields,names,mappings,sources,valueRules,conditions,warnings,draft};
}
export function suggestColumns(mapping,headers){
 const match=headers.filter(h=>norm(h)===norm(mapping['Cột nguồn']));if(match.length)return match;
 const aliases=text(mapping['Tên cột gợi ý']).split(';').map(norm).filter(Boolean);return headers.filter(h=>aliases.includes(norm(h)));
}
export function parseDate(v){
 if(v instanceof Date){if(isNaN(v.getTime()))throw Error('Ngày không hợp lệ');return v.toISOString().slice(0,10);}
 if(typeof v==='number'){if(v<1||v>2958465)throw Error('Ngày Excel không hợp lệ');return new Date(Date.UTC(1899,11,30)+Math.floor(v)*86400000).toISOString().slice(0,10);}
 const s=text(v);let y,m,d,match;if((match=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/))){[,y,m,d]=match;}else if((match=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/))){[,d,m,y]=match;}else throw Error('Ngày cần YYYY-MM-DD hoặc DD/MM/YYYY');
 const dt=new Date(Date.UTC(+y,+m-1,+d));if(dt.getUTCFullYear()!==+y||dt.getUTCMonth()!==+m-1||dt.getUTCDate()!==+d)throw Error('Ngày không tồn tại');return dt.toISOString().slice(0,10);
}
function convert(v,type,transform){
 if(v===null||v===undefined||text(v)==='')return '';
 if(type==='DATE'||transform==='DATE_DMY')return parseDate(v);
 if(type==='INTEGER'||type==='NUMBER'){const n=typeof v==='number'?v:Number(text(v));if(!Number.isFinite(n)||(type==='INTEGER'&&!Number.isInteger(n)))throw Error('Giá trị không phải '+type);return n;}
 let s=text(v);if(transform==='UPPER')s=s.toUpperCase();if(transform==='LOWER')s=s.toLowerCase();return s;
}
const split=v=>text(v).split(';').map(text).filter(Boolean);
const key=(row,cols)=>{const vals=cols.map(c=>norm(row[c]));return vals.some(v=>!v)?null:JSON.stringify(vals);};
function compare(c,row,params){
 const a=row[c['Cột kiểm tra']]??'',b=c['Loại đối chiếu']==='COLUMN'?row[c['Giá trị đối chiếu']]:c['Loại đối chiếu']==='PARAM'?params[c['Giá trị đối chiếu']]:c['Giá trị đối chiếu'];
 const op=c['Phép so sánh'];if(['IS_BLANK','is blank'].includes(op))return text(a)==='';if(['IS_NOT_BLANK','is not blank'].includes(op))return text(a)!=='';if(op==='=')return norm(a)===norm(b);if(['!=','≠'].includes(op))return norm(a)!==norm(b);
 const numeric=v=>text(v)===''?NaN:Number(v);let x=numeric(a),y=numeric(b);if(!Number.isFinite(x)||!Number.isFinite(y)){try{x=Date.parse(parseDate(a));y=Date.parse(parseDate(b));}catch{return false;}}
 return op==='<'?x<y:['<=','≤'].includes(op)?x<=y:op==='>'?x>y:['>=','≥'].includes(op)?x>=y:false;
}
export function runMapping(plan,data,params={}){
 const sources=new Map(plan.sources.map(s=>[s['Nguồn ID'],s])),main=plan.sources.find(s=>s['Vai trò']==='MAIN'),mainId=main['Nguồn ID'];
 for(const s of plan.sources){const src=data[s['Nguồn ID']];if(!src||!Array.isArray(src.rows))throw Error('Chưa chọn dữ liệu cho '+s['Nguồn ID']);}
 const joins=new Map();for(const s of plan.sources){if(s===main)continue;
  if(![mainId,'PARAM'].includes(s['Nguồn nối tới']))throw Error('Lookup cần nối MAIN hoặc PARAM: '+s['Nguồn ID']);
  const left=split(s['Khóa tại nguồn']),right=split(s['Khóa phía đối chiếu']);if(!left.length||left.length!==right.length)throw Error('Khóa nối thiếu hoặc khác số cột: '+s['Nguồn ID']);
  if(left.some(c=>!data[s['Nguồn ID']].headers.includes(c))||(s['Nguồn nối tới']===mainId&&right.some(c=>!data[mainId].headers.includes(c))))throw Error('Không tìm thấy cột khóa nối: '+s['Nguồn ID']);
  if(s['Nguồn nối tới']==='PARAM'&&right.some(c=>!text(params[c])))throw Error('Thiếu tham số nối: '+right.join(', '));
  const policy=text(s['Trùng khóa']);if(!['ERROR','FIRST','LAST'].includes(policy))throw Error('Chọn ERROR/FIRST/LAST cho trùng khóa Lookup.');const index=new Map();for(const row of data[s['Nguồn ID']].rows){const k=key(row,left);if(k===null)continue;if(index.has(k)&&policy==='ERROR')throw Error('Trùng khóa Lookup: '+s['Nguồn ID']);if(!index.has(k)||policy==='LAST')index.set(k,row);}joins.set(s['Nguồn ID'],{s,left,right,index});
 }
 const resolved=new Map();for(const m of plan.mappings){if(!['COLUMN','LOOKUP'].includes(m['Cách lấy']))continue;if(!text(m['Cột nguồn'])){if(!plan.draft)throw Error('Chưa điền cột nguồn: '+m['Cột template']);continue;}const hits=suggestColumns(m,data[m['Nguồn ID']].headers);if(hits.length!==1)throw Error((hits.length?'Tên cột gợi ý bị trùng: ':'Không tìm thấy cột: ')+m['Cột nguồn']+' ('+m['Nguồn ID']+')');resolved.set(m,hits[0]);}
 const grouped=new Map(plan.names.map(h=>[h,plan.mappings.filter(m=>m['Cột template']===h).sort((a,b)=>Number(a['Ưu tiên'])-Number(b['Ưu tiên']))]));
 const groups=new Map();for(const c of plan.conditions){const g=text(c['Nhóm']);if(!g)throw Error('Thiếu nhóm điều kiện');if(!groups.has(g))groups.set(g,[]);groups.get(g).push(c);}const conditions=[...groups.values()].sort((a,b)=>Number(a[0]['Ưu tiên'])-Number(b[0]['Ưu tiên']));
 const valid=[],errors=[];let skipped=0;
 data[mainId].rows.forEach((anchor,i)=>{const row=Object.create(null),issues=[],sourceRows=new Map([[mainId,anchor]]);
  for(const [id,{s,right,index}] of joins){const k=key(s['Nguồn nối tới']==='PARAM'?params:anchor,right),found=k===null?undefined:index.get(k);sourceRows.set(id,found);if(!found&&s['Không tìm thấy']==='ERROR')issues.push({field:id,message:'Không tìm thấy dòng Lookup'});}
  for(const f of plan.fields){const h=f['Cột template'],ms=grouped.get(h);let value='',chosen=ms[0];for(const m of ms){let v='';if(m['Cách lấy']==='FIXED')v=m['Giá trị / tham số'];else if(m['Cách lấy']==='PARAM')v=params[m['Giá trị / tham số']]??'';else v=sourceRows.get(m['Nguồn ID'])?.[resolved.get(m)]??'';if(text(v)!==''){value=v;chosen=m;break;}}
   try{value=convert(value,text(chosen?.['Kiểu dữ liệu'])==='CHUA_XAC_NHAN'?f['Kiểu dữ liệu']:chosen?.['Kiểu dữ liệu']||f['Kiểu dữ liệu'],chosen?.['Chuẩn hóa']);const rules=plan.valueRules.filter(v=>v['Cột template']===h);const hit=rules.find(v=>v['So sánh']==='IGNORE_CASE'?norm(v['Giá trị nguồn'])===norm(value):String(v['Giá trị nguồn'])===String(value));if(hit)value=hit['Giá trị đầu ra'];else if(rules.length&&text(value)){if(rules[0]['Nếu không khớp']==='ERROR')throw Error('Chưa có giá trị quy đổi');if(rules[0]['Nếu không khớp']==='BLANK')value='';}}catch(e){issues.push({field:h,message:e.message});}row[h]=value;
  }
  let skip=false;const assigned=new Set();for(const block of conditions){if(!block.every(c=>compare(c,row,params)))continue;const c=block[0],action=c['Hành động'],target=c['Cột tác động'];if(action==='ERROR_ROW')issues.push({field:c['Cột kiểm tra'],message:c['Thông báo']||'Không đạt điều kiện'});if(action==='SKIP_ROW'){skip=true;issues.push({field:c['Cột kiểm tra'],message:c['Thông báo']||'Loại theo rule'});}if(['SET','CLEAR'].includes(action)&&!assigned.has(target)){row[target]=action==='SET'?c['Giá trị gán']:'';assigned.add(target);}}
  for(const f of plan.fields){const h=f['Cột template'],required=f['Bắt buộc mặc định']==='YES'||grouped.get(h).some(m=>m['Bắt buộc']==='YES');if(required&&text(row[h])==='')issues.push({field:h,message:'Thiếu dữ liệu bắt buộc'});if(assigned.has(h)){try{row[h]=convert(row[h],grouped.get(h)[0]?.['Kiểu dữ liệu']||f['Kiểu dữ liệu'],'NONE');}catch(e){issues.push({field:h,message:e.message});}}}
  if(issues.length){for(const e of issues)errors.push({source:mainId,line:anchor._sourceRow??i+2,field:e.field,message:e.message,action:skip?'SKIP_ROW':'ERROR_ROW',data:row});if(skip)skipped++;}else valid.push(row);
 });
 return {headers:plan.names,rows:valid,errors,skipped,total:data[mainId].rows.length,warnings:plan.warnings,draft:plan.draft};
}
