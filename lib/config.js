import {createHash, createHmac, randomBytes, createCipheriv, createDecipheriv} from 'node:crypto';
export class AppError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export const fail=(message,status=400)=>{throw new AppError(message,status);};
export const sha=value=>createHash('sha256').update(String(value)).digest('hex');
export function config(env=process.env){
 const required=['GOOGLE_SPREADSHEET_ID','GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','SESSION_ENCRYPTION_KEY'];
 if(required.some(k=>!env[k]?.trim()))fail('SETUP_REQUIRED: Chưa đủ biến môi trường máy chủ. Kiểm tra hướng dẫn cấu hình.',503);
 const url=env.SUPABASE_URL.trim().replace(/\/$/,'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!/^\w[\w-]{10,}$/.test(env.GOOGLE_SPREADSHEET_ID)||!/^[a-f0-9]{64}$/i.test(env.SESSION_ENCRYPTION_KEY))fail('SETUP_REQUIRED: URL, Spreadsheet ID hoặc khóa mã hóa chưa hợp lệ.',503);
 if(env.VERCEL&&env.ALLOW_LOCAL_HTTP==='true')fail('SETUP_REQUIRED: Tắt ALLOW_LOCAL_HTTP trên Vercel.',503);
 let origin;try{origin=env.APP_ORIGIN?new URL(env.APP_ORIGIN).origin:env.VERCEL_URL?'https://'+env.VERCEL_URL:null;}catch{fail('SETUP_REQUIRED: APP_ORIGIN không hợp lệ.',503);}
 return {ruleSheetId:(env.RULE_SPREADSHEET_ID||'1a2yIRarLmM44270WdNIW4854sgsPNL-ZCprXm0XZxzY').trim(),hubiEndpoint:env.HUBI_API_URL?.trim(),sheetId:env.GOOGLE_SPREADSHEET_ID.trim(),email:env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim(),privateKey:env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'),url,publishable:env.SUPABASE_PUBLISHABLE_KEY.trim(),secret:env.SUPABASE_SECRET_KEY.trim(),key:Buffer.from(env.SESSION_ENCRYPTION_KEY,'hex'),scope:sha(env.GOOGLE_SPREADSHEET_ID.trim()).slice(0,32),origin,local:!env.VERCEL&&env.ALLOW_LOCAL_HTTP==='true'};
}
export function seal(value,key){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([c.update(JSON.stringify(value),'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),data]).toString('base64url');}
export function unseal(value,key){try{const b=Buffer.from(value,'base64url'),d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());}catch{fail('AUTH_EXPIRED: Phiên đăng nhập cần được tạo lại.',401);}}
export const privateHash=(value,key)=>createHmac('sha256',key).update(value).digest('hex');
export async function requestJson(url,options={},label='Dịch vụ',fetcher=fetch,deadline=Date.now()+45000){
 const remaining=deadline-Date.now();if(remaining<100)fail('Yêu cầu quá thời gian. Làm mới để kiểm tra kết quả trước khi lưu lại.',503);
 let response,data;try{response=await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(Math.min(10000,remaining))});const text=await response.text();data=text?JSON.parse(text):null;}catch{fail(label+' chưa phản hồi hợp lệ. Làm mới để kiểm tra kết quả trước khi thử lại.',503);}
 return {ok:response.ok,status:response.status,data};
}
