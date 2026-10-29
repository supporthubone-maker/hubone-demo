import {publicResponse} from '../lib/public-response.js';
import {mappingResultStore} from '../lib/mapping-results.js';
import {ruleStore} from '../lib/rule-store.js';
import {readMappingLibrary} from '../lib/mapping-library.js';
import {requestTrace} from '../lib/performance.js';
import {config,AppError} from '../lib/config.js';
import {providers} from '../lib/providers.js';
import {sheetRepository} from '../lib/sheets.js';
import {sessionStore} from '../lib/store.js';
import {application,METHODS} from '../lib/app.js';
const COOKIE='__Host-hubone_session_v41',LOCAL_COOKIE='hubone_local_session';
export function sessionCookie(c,value){return (c.local?LOCAL_COOKIE:COOKIE)+'='+value+'; Path=/; HttpOnly; '+(c.local?'SameSite=Strict; ':'SameSite=None; Secure; Partitioned; ')+'Max-Age='+(value?28800:0);}
function respond(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
export function cookieValue(header,name){const matches=String(header||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));if(matches.length!==1)return '';const value=matches[0].slice(name.length+1);return /^hv_[a-f0-9]{64}$/.test(value)?value:'';}
export function handlerFactory({getConfig=config,makeProviders=providers,makeRepo=sheetRepository,makeStore=sessionStore,makeApp=application}={}){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const trace=requestTrace();let traceMethod='invalid';
  const reply=(status,data)=>{trace.finish(res,traceMethod,status);return respond(res,status,publicResponse(data));};
  let clearLogoutCookie=null;
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{ok:false,error:'Chỉ chấp nhận POST.'});}
  try{
   const c=getConfig();
   // APP_ORIGIN or Vercel's deployment hostname only, never arbitrary forwarded Host.
   const expected=c.origin||(c.local?'http://localhost:3000':null);
   if(!expected||req.headers.origin!==expected||req.headers['x-hubone-request']!=='1')throw new AppError('Yêu cầu bị từ chối do nguồn truy cập không hợp lệ.',403);
   if(!/^application\/json(?:\s*;.*)?$/i.test(req.headers['content-type']||''))throw new AppError('Yêu cầu cần application/json.',415);
   let body=req.body;
   if(body===undefined){let chunks=[],bytes=0;for await(const chunk of req){bytes+=Buffer.byteLength(chunk);if(bytes>4000000)throw new AppError('Yêu cầu quá lớn.',413);chunks.push(Buffer.from(chunk));}try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AppError('JSON không hợp lệ.');}}
   else {if(Buffer.isBuffer(body))body=body.toString('utf8');if(typeof body==='string'){if(Buffer.byteLength(body)>4000000)throw new AppError('Yêu cầu quá lớn.',413);try{body=JSON.parse(body);}catch{throw new AppError('JSON không hợp lệ.');}}}
   if(Buffer.byteLength(JSON.stringify(body??null))>(body?.method==='acceptMappingRun'?3900000:['saveMappingLibrary','previewImport','commitImport','commitHubMigration'].includes(body?.method)?1500000:64000))throw new AppError('Yêu cầu quá lớn.',413);
   if(!body||!METHODS.has(body.method)||!Array.isArray(body.args)||body.args.length>2)throw new AppError('Yêu cầu không hợp lệ.');
   traceMethod=body.method;
   if(body.method==='signOut')clearLogoutCookie=sessionCookie(c,'');
   const deadline=Date.now()+48000,p=makeProviders(c,{deadline,trace}),repo=makeRepo(p),store=makeStore(p,c),app=makeApp({c,repo,store,auth:p.auth,trace,rules:ruleStore(p,c),mappingResults:mappingResultStore(p,c),mappingLibrary:()=>readMappingLibrary(makeProviders({...c,sheetId:c.ruleSheetId},{deadline,trace}))});
   const name=c.local?LOCAL_COOKIE:COOKIE,token=cookieValue(req.headers.cookie,name);
   const ip=c.local?'local':String(req.headers['x-vercel-forwarded-for']||'unknown').split(',')[0].trim();
   const result=await app.run(body.method,body.args,token,ip);
   if(result.cookie!==undefined)res.setHeader('Set-Cookie',sessionCookie(c,result.cookie));
   return reply(200,result.data);
  }catch(error){
   if(clearLogoutCookie)res.setHeader('Set-Cookie',clearLogoutCookie);
   // Do not log provider errors, request bodies, cookies, keys or passwords.
   const known=error instanceof AppError;
   // Business validators originate locally and contain no provider response payloads.
   const domain=error?.name==='Error'&&/^(Nhập file:|Phân quyền:|Danh mục:|Trường |Mã |Nhập |Ngày |Lộ trình |Tiến độ |Công việc |Trạng thái |Độ ưu tiên |Giai đoạn |Mảng nghiệp vụ |Nhóm công việc |Tên đăng nhập |Mật khẩu |TaiKhoan|DanhMuc|Thiếu tab |Tên hoặc thứ tự |Thiếu hoặc trùng |Phiên bản dữ liệu|Dòng |Trùng mã |Giữ mã |Cần ít nhất |Thứ tự |Email)/.test(error.message||'');
   return reply(known?error.status:domain?400:503,{ok:false,error:known||domain?error.message:'Máy chủ chưa hoàn tất yêu cầu. Kiểm tra cấu hình và Làm mới để đối soát kết quả trước khi lưu lại.'});
  }
 };
}
export default handlerFactory();
