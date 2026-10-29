import {planRule,text,suggestColumns} from './mapper-engine.js';

export function validateRuleStep(lib,id,{draft=false,project,year,month,params='{}',periodMode='single'}={}){
 if(!lib||!id)throw Error('Bước 1: Chọn Rule ID đã được thiết lập.');
 const enabled=r=>!['TAT','VI_DU'].includes(text(r['Trạng thái']))&&(draft||text(r['Trạng thái'])==='SAN_SANG');
 const mappings=lib.mapping.filter(r=>text(r['Rule ID'])===id&&enabled(r));
 const all=lib.sources.filter(r=>text(r['Rule ID'])===id),sources=all.filter(enabled);
 if(mappings.length&&sources.filter(r=>text(r['Vai trò'])==='MAIN').length!==1){
  const mains=all.filter(r=>text(r['Vai trò'])==='MAIN');
  throw Error('Bước 1 · Nguon · '+id+': cần đúng 1 MAIN đang hoạt động. '+(mains.length?mains.map(r=>text(r['Nguồn ID'])+' = '+(text(r['Trạng thái'])||'trống trạng thái')).join('; '):'Chưa khai báo MAIN.')+' Mở Thiết lập rule → Chỉnh thư viện → Nguon; dùng SAN_SANG khi chạy chính thức.');
 }
 for(const m of mappings){const source=text(m['Nguồn ID']);if(['COLUMN','LOOKUP'].includes(m['Cách lấy'])&&!sources.some(s=>text(s['Nguồn ID'])===source)){
  const row=all.find(s=>text(s['Nguồn ID'])===source);
  throw Error('Bước 1 · Nguon · '+id+': '+source+(row?' đang '+(text(row['Trạng thái'])||'trống trạng thái'):', chưa có dòng cấu hình')+'. Khai báo nguồn cùng Rule ID và chuyển SAN_SANG trong bảng Nguon. Chọn file Excel không thay đổi trạng thái rule.');
 }}
 const plan=planRule(lib,id,{draft});
 if(lib.inputWarnings)plan.warnings.push(...lib.inputWarnings);
 const main=plan.sources.find(s=>s['Vai trò']==='MAIN');
 for(const s of plan.sources){if(s===main)continue;
  const split=v=>text(v).split(';').map(text).filter(Boolean),left=split(s['Khóa tại nguồn']),right=split(s['Khóa phía đối chiếu']);
  if(s['Vai trò']!=='LOOKUP')throw Error('Bước 1 · '+s['Nguồn ID']+': Vai trò phải là MAIN hoặc LOOKUP.');
  if(![main['Nguồn ID'],'PARAM'].includes(s['Nguồn nối tới'])||!left.length||left.length!==right.length)throw Error('Bước 1 · '+s['Nguồn ID']+': thiếu/sai cấu hình nối MASTER. Điền Nguồn nối tới ('+main['Nguồn ID']+' hoặc PARAM), Khóa tại nguồn (cột MASTER) và Khóa phía đối chiếu. Mở “Khai báo MASTER” để xem ví dụ.');
  if(!['ERROR','FIRST','LAST'].includes(text(s['Trùng khóa'])))throw Error('Bước 1 · '+s['Nguồn ID']+': chọn Trùng khóa = ERROR, FIRST hoặc LAST trong Nguon.');
 }
 if(!text(project))throw Error('Bước 1: Nhập mã dự án.');
 if(!['none','single'].includes(periodMode))throw Error('Bước 1: Chọn chế độ kỳ hợp lệ.');
 if(periodMode==='single'&&(!Number.isInteger(Number(year))||Number(year)<1900||Number(year)>2200||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||'')))throw Error('Bước 1: Nhập năm và kỳ báo cáo hợp lệ.');
 if(periodMode==='single'&&Number(month.slice(0,4))!==Number(year))throw Error('Bước 1: Năm báo cáo phải trùng năm của kỳ báo cáo.');
 let extra;try{extra=typeof params==='string'?JSON.parse(params):params;}catch{throw Error('Bước 1: Tham số bổ sung phải là JSON hợp lệ, ví dụ {}.');}
 if(!extra||Array.isArray(extra)||typeof extra!=='object')throw Error('Bước 1: Tham số bổ sung phải là JSON object.');
 const values={...extra,project_code:project};delete values.report_year;delete values.report_month;if(periodMode==='single'){values.report_year=Number(year);values.report_month=month;}
 for(const s of plan.sources.filter(s=>s['Nguồn nối tới']==='PARAM'))for(const k of text(s['Khóa phía đối chiếu']).split(';').map(text).filter(Boolean))if(!text(values[k]))throw Error('Bước 1: Thiếu tham số nối MASTER '+k+'.');
 return {plan,params:values};
}

export function validateSourceStep(plan,data){
 const main=plan.sources.find(s=>s['Vai trò']==='MAIN');
 for(const s of plan.sources){const d=data[s['Nguồn ID']];if(!d)throw Error('Bước 2: Chọn file/sheet cho '+s['Nguồn ID']+'.');if(!d.headers?.length)throw Error('Bước 2 · '+s['Nguồn ID']+': dòng tiêu đề không có tên cột.');
  if(s===main&&!d.rows?.length)throw Error('Bước 2: Sheet MAIN không có dòng dữ liệu sau tiêu đề.');
  if(s!==main){const left=text(s['Khóa tại nguồn']).split(';').map(text).filter(Boolean),right=text(s['Khóa phía đối chiếu']).split(';').map(text).filter(Boolean);
   for(const k of left)if(!d.headers.includes(k))throw Error('Bước 2 · '+s['Nguồn ID']+': thiếu cột khóa MASTER “'+k+'”. Kiểm tra tên cột và dòng tiêu đề.');
   if(s['Nguồn nối tới']===main['Nguồn ID'])for(const k of right)if(!data[main['Nguồn ID']]?.headers?.includes(k))throw Error('Bước 2 · '+main['Nguồn ID']+': thiếu cột khóa đối chiếu “'+k+'”.');
  }
 }
 for(const m of plan.mappings){if(!['COLUMN','LOOKUP'].includes(m['Cách lấy']))continue;if(!text(m['Cột nguồn'])&&plan.draft)continue;const hits=suggestColumns(m,data[m['Nguồn ID']].headers);if(hits.length!==1)throw Error('Bước 2 · '+m['Nguồn ID']+': '+(hits.length?'nhiều cột cùng khớp':'chưa khớp cột')+' “'+(m['Cột nguồn']||m['Cột template'])+'”. Mở Điều chỉnh cột để chọn lại.');}
 return true;
}

export const EDITOR_OPTIONS={
 'Trạng thái':['NHAP','SAN_SANG','TAT','VI_DU'],
 'Vai trò':['MAIN','LOOKUP'],
 'Kênh':['FILE','API_OR_FILE'],
 'Kiểu dữ liệu':['TEXT','INTEGER','NUMBER','DATE','CHUA_XAC_NHAN'],
 'Bắt buộc':['YES','NO','CHUA_XAC_NHAN'],
 'Bắt buộc mặc định':['YES','NO','CHUA_XAC_NHAN'],
 'Cách lấy':['COLUMN','LOOKUP','FIXED','PARAM'],
 'Trùng khóa':['ERROR','FIRST','LAST'],
 'Không tìm thấy':['BLANK','ERROR']
};
