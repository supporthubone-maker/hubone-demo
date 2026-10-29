import {MASTER_DIMENSIONS,projectKey} from './master-catalog.js';
const text=v=>String(v??'').trim();
export function masterPairChoices(draft,saved,type){
 if(!MASTER_DIMENSIONS.includes(type))return [];
 const found=new Map();for(const matrix of [saved,draft]){if(!matrix?.length)continue;const ci=matrix[0].indexOf(type+' Code'),ni=matrix[0].indexOf(type+' Name');if(ci<0||ni<0)continue;for(const row of matrix.slice(1)){const code=text(row[ci]),name=text(row[ni]);if(!code&&!name)continue;const key=JSON.stringify([code,name]);if(!found.has(key))found.set(key,{code,name,key});}}
 return [...found.values()].sort((a,b)=>(a.name||a.code).localeCompare(b.name||b.code,'vi')||a.code.localeCompare(b.code));
}
export function setMasterPair(matrix,row,type,code,name){
 if(!MASTER_DIMENSIONS.includes(type)||!Number.isInteger(row)||row<1||row>=matrix.length)throw Error('Dòng MASTER không hợp lệ.');
 const ci=matrix[0].indexOf(type+' Code'),ni=matrix[0].indexOf(type+' Name');if(ci<0||ni<0)throw Error('Thiếu cột mã/tên MASTER.');
 code=text(code);name=text(name);if(code.length>120||name.length>10000)throw Error('Mã hoặc tên MASTER quá dài.');matrix[row][ci]=code;matrix[row][ni]=name;
}
export function checkNewMasterPair(choices,code,name,{allowBlankName=false}={}){
 code=text(code);name=text(name);if(!code||(!allowBlankName&&!name))throw Error('Nhập đủ mã và tên cho mục mới.');
 if(code.length>120||name.length>10000)throw Error('Mã hoặc tên MASTER quá dài.');
 const existing=choices.find(c=>projectKey(c.code)===projectKey(code));if(existing&&existing.name!==name)throw Error('Mã này đã có tên “'+existing.name+'”. Hãy chọn mục đã có hoặc dùng mã mới.');
 return {code:existing?.code||code,name:existing?.name??name};
}
export function masterPage(matrix,query,page,size=30){
 const q=text(query).toLocaleLowerCase('vi');const entries=(matrix?.slice(1)||[]).map((row,i)=>({row,index:i+1})).filter(e=>!q||e.row.some(v=>text(v).toLocaleLowerCase('vi').includes(q)));
 const pages=Math.max(1,Math.ceil(entries.length/size)),current=Math.max(0,Math.min(Number.isInteger(page)?page:0,pages-1));return {rows:entries.slice(current*size,(current+1)*size),page:current,pages,total:entries.length};
}
