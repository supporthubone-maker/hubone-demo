import {fail,sha} from './config.js';
export const RULE_TABS={Truong_chuan:'A5:H5005',Mapping:'A5:O10005',Nguon:'A5:N1005',Quy_doi:'A5:G5005',Dieu_kien:'A5:L5005'};
export async function readMappingLibrary(p){
 const meta=await p.sheets('GET','?fields=sheets.properties.title');const present=new Set(meta.sheets.map(s=>s.properties.title));
 const names=Object.keys(RULE_TABS).filter(n=>present.has(n));for(const n of ['Truong_chuan','Mapping','Nguon'])if(!present.has(n))fail('Thiếu sheet rule '+n+'.',400);
 const q=new URLSearchParams({valueRenderOption:'UNFORMATTED_VALUE',dateTimeRenderOption:'FORMATTED_STRING'});for(const n of names)q.append('ranges',`'${n}'!${RULE_TABS[n]}`);
 const response=await p.sheets('GET','/values:batchGet?'+q);const tables=Object.fromEntries(names.map((n,i)=>[n,response.valueRanges?.[i]?.values||[]]));
 for(const n of names){const limit=Number(RULE_TABS[n].match(/\d+$/)[0])-4;if(tables[n].length>=limit)fail('Thư viện rule vượt giới hạn đọc: '+n+'. Chia nhỏ thư viện trước khi tải.',400);}
 return {tables,version:sha(JSON.stringify(tables)),loadedAt:new Date().toISOString()};
}
