export const MASTER_COLUMNS=['Company Code','Company Name','Industry Code','Industry Name','Service Code','Service Name','Project Code','Project Name','HO Code','HO Name'];
const value=v=>String(v??'').trim();
const normalize=v=>value(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases={companycode:'Company Code',macongty:'Company Code',companyname:'Company Name',tencongty:'Company Name',congty:'Company Name',industrycode:'Industry Code',manganh:'Industry Code',manganhhang:'Industry Code',industryname:'Industry Name',tennganh:'Industry Name',nganhhang:'Industry Name',servicecode:'Service Code',madichvu:'Service Code',servicename:'Service Name',tendichvu:'Service Name',dichvu:'Service Name',projectcode:'Project Code',maduan:'Project Code',projectname:'Project Name',tenduan:'Project Name',duan:'Project Name',hocode:'HO Code',maho:'HO Code',honame:'HO Name',tenho:'HO Name'};
export const masterHeader=h=>aliases[normalize(h)]||value(h);
export const projectKey=v=>value(v).toUpperCase();
export const MASTER_DIMENSIONS=['Project','Service','Company','Industry','HO'];
export const masterRecordKey=r=>JSON.stringify(MASTER_DIMENSIONS.map(t=>projectKey(r[t+' Code'])));
export function validateMasterTable(input){
 if(Array.isArray(input)&&input.every(Array.isArray))input=input.filter(r=>r.some(v=>value(v))).map(r=>{r=[...r];while(r.length&&!value(r.at(-1)))r.pop();return r;});
 if(!Array.isArray(input)||input.length>5001||input.some(r=>!Array.isArray(r)||r.length>100||r.some(v=>v!==null&&!['string','number','boolean'].includes(typeof v)||typeof v==='number'&&!Number.isFinite(v)||String(v??'').length>10000)))throw Error('MASTER: tối đa 5.000 dự án, 100 cột và 10.000 ký tự mỗi ô.');
 if(JSON.stringify(input).length>500000)throw Error('MASTER: danh mục tối đa 500 KB.');
 const hi=input.findIndex(r=>{const h=r.map(masterHeader);return h.includes('Project Code')&&h.includes('Project Name');});
 if(hi<0)throw Error('MASTER: cần cột Project Code (Mã dự án) và Project Name (Tên dự án).');
 const hs=input[hi].map(masterHeader);if(hs.some(h=>!h)||new Set(hs.map(normalize)).size!==hs.length)throw Error('MASTER: tên cột trống hoặc trùng.');
 const names=[...MASTER_COLUMNS,...hs.filter(h=>!MASTER_COLUMNS.includes(h))],seen=new Set(),codeNames=new Map();if(names.length>100)throw Error('MASTER: tối đa 100 cột sau chuẩn hóa.');
 const rows=input.slice(hi+1).filter(r=>r.some(v=>value(v))).map((r,i)=>{
  const record=Object.create(null);hs.forEach((h,j)=>record[h]=value(r[j]));
  if(!record['Project Code']||!record['Project Name'])throw Error('MASTER: dòng '+(hi+i+2)+' thiếu mã/tên dự án.');
  if(MASTER_DIMENSIONS.some(t=>value(record[t+' Code']).length>120))throw Error('MASTER: mã tối đa 120 ký tự.');
  const id=masterRecordKey(record);if(seen.has(id))throw Error('MASTER: trùng tổ hợp dự án / dịch vụ / công ty / ngành / HO tại '+record['Project Name']+'.');seen.add(id);
  for(const type of ['Project','Service']){const code=value(record[type+' Code']),name=value(record[type+' Name']);if(!code||!name)continue;const k=JSON.stringify([type,type==='Service'?projectKey(record['Project Code']):'',projectKey(code)]);if(codeNames.has(k)&&codeNames.get(k)!==name)throw Error('MASTER: tên không nhất quán cho mã '+type+' '+code+'.');codeNames.set(k,name);}
  for(const type of ['Company','Industry','Service'])if(!!record[type+' Code']!==!!record[type+' Name'])throw Error('MASTER: nhập đủ mã và tên '+type+' của dự án '+record['Project Name']+'.');
  return names.map(h=>record[h]||'');
 });return [names,...rows];
}
export function masterRecords(table){if(!table)return [];const [hs,...rows]=validateMasterTable(table);return rows.map(r=>Object.fromEntries(hs.map((h,i)=>[h,r[i]])));}
export function findMaster(table,code){return masterRecords(table).find(r=>projectKey(r['Project Code'])===projectKey(code));}
export function commonValuesFromMaster(groups,record,keyFor){const out=Object.create(null);if(!record)return out;const values=new Map(Object.entries(record).map(([h,v])=>[normalize(masterHeader(h)),v]));for(const g of groups)for(const f of g.fields)out[keyFor(g.id,f.name)]=values.get(normalize(masterHeader(f.name)))??'';return out;}
export function dimensionChoices(rows,type){const result=new Map();for(const r of rows){const code=r[type+' Code']||'',key=projectKey(code);if(!result.has(key))result.set(key,{code,key,name:r[type+' Name']||code||'Không khai báo'});}return [...result.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));}
export function resolveMaster(table,input={}){
 const all=masterRecords(table),selection={...input};let rows=all;const steps=[];
 for(const type of MASTER_DIMENSIONS){const choices=dimensionChoices(rows,type);let selected=selection[type];if(selected!==undefined&&!choices.some(c=>c.key===projectKey(selected)))selected=undefined;if(choices.length===1)selected=choices[0].code;if(selected!==undefined){selection[type]=selected;rows=rows.filter(r=>projectKey(r[type+' Code'])===projectKey(selected));}else delete selection[type];steps.push({type,choices,selected});if(selected===undefined)break;}
 return {selection,steps,rows,record:steps.length===MASTER_DIMENSIONS.length&&rows.length===1?rows[0]:null};
}
export function scopedMaster(table,context){let rows=masterRecords(table).filter(r=>projectKey(r['Project Code'])===projectKey(context.project));for(const type of ['Company','Industry','HO'])if(context.filters?.[type]!==undefined&&context.filters[type]!==null)rows=rows.filter(r=>projectKey(r[type+' Code'])===projectKey(context.filters[type]));return rows;}
