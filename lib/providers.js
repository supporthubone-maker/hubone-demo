import {sign} from 'node:crypto';
import {requestJson,fail} from './config.js';
let cachedGoogleToken=null;
const schemaCache=new Map();
export function providers(c,{fetcher=fetch,deadline=Date.now()+45000,trace=null}={}){
 const json=(url,opt,label)=>{let name='provider';
  if(label==='Google Sheets')name=url.includes('/values:')?'sheets_values':opt.method==='GET'?'sheets_schema':'sheets_write';
  else if(label==='Google xác thực')name='google_auth';
  else if(url.includes('/auth/'))name='supabase_auth';
  else if(url.includes('hubone_rate_limit'))name='supabase_rate';
  else if(url.includes('hubone_acquire_lock'))name='lock_acquire';
  else if(url.includes('hubone_release_lock'))name='lock_release';
  else if(url.includes('hubone_sessions'))name=opt.method==='GET'?'session_read':opt.method==='PATCH'?'session_touch':'session_write';
  else name='supabase_data';
  const run=()=>requestJson(url,opt,label,fetcher,deadline);return trace?trace.measure(name,run):run();};
 function supaHeaders(admin,access){const key=admin?c.secret:c.publishable;return {apikey:key,'Content-Type':'application/json',...(access?{Authorization:'Bearer '+access}:admin&&key.split('.').length===3?{Authorization:'Bearer '+key}:{})};}
 async function auth(method,path,body,access=null,admin=false){return json(c.url+'/auth/v1/'+path,{method,headers:supaHeaders(admin,access),...(body===undefined?{}:{body:JSON.stringify(body)})},'Supabase Auth');}
 async function rest(method,path,body,prefer){const r=await json(c.url+'/rest/v1/'+path,{method,headers:{...supaHeaders(true),...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})},'Supabase phiên đăng nhập');if(!r.ok)fail('SETUP_REQUIRED: Chưa truy cập được kho phiên Supabase. Chạy supabase/setup.sql và kiểm tra Secret key.',503);return r.data;}
 async function rpc(name,args){return rest('POST','rpc/'+name,args);}
 async function googleToken(){
  if(cachedGoogleToken?.email===c.email&&cachedGoogleToken.expires>Date.now()+60000)return cachedGoogleToken.token;
  const now=Math.floor(Date.now()/1000),enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const unsigned=enc({alg:'RS256',typ:'JWT'})+'.'+enc({iss:c.email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
  let signature;try{signature=sign('RSA-SHA256',Buffer.from(unsigned),c.privateKey).toString('base64url');}catch{fail('SETUP_REQUIRED: GOOGLE_PRIVATE_KEY chưa đúng định dạng.',503);}
  const r=await json('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+signature}).toString()},'Google xác thực');
  if(!r.ok||!r.data?.access_token)fail('SETUP_REQUIRED: Chưa xác thực được Service Account. Kiểm tra email, private key và trạng thái khóa.',503);
  cachedGoogleToken={email:c.email,token:r.data.access_token,expires:Date.now()+(r.data.expires_in||3600)*1000};return cachedGoogleToken.token;
 }
 async function sheets(method,path,body){
  if(method!=='GET')schemaCache.delete(c.sheetId+'|'+c.email);
  const r=await json('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(c.sheetId)+path,{method,headers:{Authorization:'Bearer '+await googleToken(),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})},'Google Sheets');
  if(!r.ok)fail(r.status===403?'Google Sheets từ chối truy cập. Kiểm tra Sheets API, quyền Editor và bảo vệ các tab.':'Chưa đọc/ghi được Google Sheets. Kiểm tra Spreadsheet ID, tên tab và quyền Service Account.',503);return r.data;
 }
 async function sheetMetadata(){
  const key=c.sheetId+'|'+c.email,now=Date.now(),cached=schemaCache.get(key);
  if(cached&&cached.until>now)return cached.value;
  const value=await sheets('GET','?fields=sheets.properties.title');
  const names=new Set((value.sheets||[]).map(x=>x.properties.title));if(schemaCache.size>100)schemaCache.clear();if(names.has('HubOne_VaiTro')&&names.has('Staffing_Navigation'))schemaCache.set(key,{until:now+30000,value});return value;
 }
 return {auth,rest,rpc,sheets,sheetMetadata};
}
