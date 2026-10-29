/* Local CSV / XLSX exchange. JSZip 3.10.1 is served from this app; no CDN or file upload to a third party. */
(function(root){
 'use strict';
 const xml=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[x]));
 const letter=n=>{let out='';for(n++;n>0;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;return out;};
 function parseCsv(text){
  text=String(text).replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0],delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
  const rows=[];let row=[],value='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){value+='"';i++;}else if(c==='"'){quoted=false;closed=true;}else value+=c;continue;}
   if(c==='"'){if(value||closed)throw Error('CSV: dấu ngoặc kép không hợp lệ.');quoted=true;}
   else if(c===delimiter){row.push(value);value='';closed=false;}
   else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);rows.push(row);row=[];value='';closed=false;}
   else{if(closed)throw Error('CSV: ký tự ngoài ô có ngoặc kép.');value+=c;}}
  if(quoted)throw Error('CSV: chưa đóng dấu ngoặc kép.');if(value||row.length||closed){row.push(value);rows.push(row);}
  while(rows.length&&rows.at(-1).every(x=>x===''))rows.pop();return rows.map(row=>row.map(v=>/^'(?:['\t\r\n]|\s*[=+\-@])/.test(v)?v.slice(1):v));
 }
 function csvSafe(v){const s=String(v??'');return /^[\t\r\n']|^\s*[=+\-@]/.test(s)?"'"+s:s;}
 function toCsv(rows){return '\uFEFF'+rows.map(r=>r.map(v=>'"'+csvSafe(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');}
 function parseXml(text){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Excel chứa khai báo XML không được hỗ trợ.');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('Excel có XML không hợp lệ.');return doc;}
 const children=(el,name)=>Array.from(el.getElementsByTagNameNS('*',name));
 function sheetXml(rows,hidden=0){
  const width=rows.reduce((m,r)=>Math.max(m,r.length),0),cols=Array.from({length:width},(_,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(i<hidden?20:28)+'" customWidth="1"'+(i<hidden?' hidden="1"':'')+'/>').join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>'+cols+'</cols><sheetData>'+rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((v,j)=>'<c r="'+letter(j)+(i+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>').join('')+'</row>').join('')+'</sheetData></worksheet>';
 }
 async function toXlsx(data){
  const zip=new root.JSZip(),names=['DuLieu','HuongDan'],sheets=[[data.headers,...data.rows], [['Hướng dẫn'],['Dòng mới: để trống các cột mã ẩn; app tự sinh khi xem trước.'],['Cập nhật: tải dữ liệu hiện tại từ app, giữ nguyên cột ẩn, chỉ sửa các cột hiển thị.'],['Không dùng tên công việc để nhận diện dòng cập nhật.'],['Ngày: YYYY-MM-DD hoặc DD/MM/YYYY. Mảng nghiệp vụ: ngăn bằng dấu |.'],['Mỗi lần tối đa 100 dòng dữ liệu. Không dùng công thức.'],['Danh mục có thể dùng'],...Object.entries(data.lists||{}).flatMap(([name,values])=>[[name,...values]])]];
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+names.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>');
  zip.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml','<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+names.map((name,i)=>'<sheet name="'+name+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+names.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'</Relationships>');
  sheets.forEach((rows,i)=>zip.file('xl/worksheets/sheet'+(i+1)+'.xml',sheetXml(rows,i===0?data.hiddenColumns:0)));return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
 }
 async function readXlsx(buffer){
  const zip=await root.JSZip.loadAsync(buffer);let total=0;const files=Object.values(zip.files);if(files.length>2000)throw Error('Excel quá phức tạp. Dùng file mẫu của app.');
  for(const f of files){total+=f._data?.uncompressedSize||0;if(total>20000000)throw Error('Excel sau giải nén quá lớn (tối đa 20 MB).');}
  const text=async name=>{const f=zip.file(name);if(!f)throw Error('Excel thiếu thành phần '+name);return f.async('string');};
  const book=parseXml(await text('xl/workbook.xml')),rels=parseXml(await text('xl/_rels/workbook.xml.rels'));
  if(children(book,'workbookPr').some(x=>x.getAttribute('date1904')==='1'||x.getAttribute('date1904')==='true'))throw Error('Excel dùng lịch 1904; lưu lại bằng mẫu của app.');
  const sheets=children(book,'sheet'),sheet=sheets.find(x=>x.getAttribute('name')==='DuLieu')||sheets[0];if(!sheet)throw Error('Excel chưa có sheet dữ liệu.');
  const rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'),rel=children(rels,'Relationship').find(x=>x.getAttribute('Id')===rid);
  if(!rel||rel.getAttribute('TargetMode')==='External')throw Error('Excel có sheet liên kết ngoài không được hỗ trợ.');
  const target=rel.getAttribute('Target'),path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');if(path.includes('..')||!/^xl\/worksheets\//.test(path))throw Error('Đường dẫn sheet chưa hợp lệ.');
  const shared=zip.file('xl/sharedStrings.xml')?children(parseXml(await text('xl/sharedStrings.xml')),'si').map(x=>children(x,'t').map(y=>y.textContent).join('')):[];
  const doc=parseXml(await text(path)),rows=[];
  for(const node of children(doc,'row')){const number=Number(node.getAttribute('r'));if(!Number.isInteger(number)||number<1||number>101)throw Error('Mỗi lần tối đa 100 dòng dữ liệu; xóa các dòng định dạng thừa cuối file.');const row=[];
   for(const cell of children(node,'c')){const ref=cell.getAttribute('r')||'',letters=ref.match(/^[A-Z]+/)?.[0];if(!letters)throw Error('Ô Excel thiếu tọa độ.');let index=0;for(const ch of letters)index=index*26+ch.charCodeAt(0)-64;index--;if(index>40)throw Error('Excel có quá nhiều cột.');
    if(children(cell,'f').length)throw Error('Không nhập công thức Excel. Copy → Paste Values trước khi nhập.');
    const t=cell.getAttribute('t'),raw=children(cell,'v')[0]?.textContent||'';let value=t==='s'?(shared[Number(raw)]??''):t==='inlineStr'?children(cell,'t').map(x=>x.textContent).join(''):raw;
    if(t==='e')throw Error('Excel đang có ô báo lỗi.');if(t==='b')value=raw==='1'?'TRUE':'FALSE';
    const header=rows[0]?.[index];if((!t||t==='n')&&/^(Ngày bắt đầu|Ngày kết thúc|Ngày hoàn thành thực tế)$/.test(header||'')&&/^\d+(\.\d+)?$/.test(raw)){const n=Number(raw);value=new Date(Date.UTC(1899,11,30)+Math.floor(n)*86400000).toISOString().slice(0,10);}
    row[index]=value;
   }rows[number-1]=row;
  }
  return Array.from({length:rows.length},(_,i)=>Array.from({length:rows[0]?.length||0},(_,j)=>String(rows[i]?.[j]??'')));
 }
 root.HubOneFiles={parseCsv,toCsv,toXlsx,readXlsx};
})(globalThis);
