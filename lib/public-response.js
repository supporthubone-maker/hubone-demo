// Display labels are independent of storage implementation. Never rewrite business rows.
export function publicMessage(value){
 if(typeof value!=='string')return value;
 if(/supabase\/[^\s]+\.sql|\bSUPABASE_[A-Z_]+/.test(value)){
  const code=value.match(/^([A-Z_]+:)/)?.[1]||'SETUP_REQUIRED:';
  return code+' Dịch vụ dữ liệu chưa sẵn sàng. Vui lòng liên hệ quản trị để kiểm tra cấu hình máy chủ.';
 }
 return value.replace(/supabase/gi,'Kho dữ liệu');
}
export function publicResponse(data){
 if(!data||typeof data!=='object'||Array.isArray(data))return data;
 const result={...data};
 for(const key of ['error','message','warning'])if(typeof result[key]==='string')result[key]=publicMessage(result[key]);
 if(result.storage==='supabase')result.storage='managed';
 return result;
}
