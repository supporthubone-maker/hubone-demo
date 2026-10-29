import {randomUUID} from 'node:crypto';
import {sha,fail} from './config.js';
export function sessionStore(p,c){
 const scoped=key=>c.scope+':'+key;
 const query=key=>'hubone_sessions?token_hash=eq.'+encodeURIComponent(scoped(sha(key)));
 async function get(token){return (await p.rest('GET',query(token)+'&select=*'))?.[0]||null;}
 async function put(token,value){await p.rest('POST','hubone_sessions?on_conflict=token_hash',{token_hash:scoped(sha(token)),...value},'resolution=merge-duplicates,return=minimal');}
 async function touch(token){const rows=await p.rest('PATCH',query(token)+'&select=token_hash',{last_seen:new Date().toISOString()},'return=representation');return Array.isArray(rows)&&rows.length>0;}
 async function remove(token){await p.rest('DELETE',query(token));}
 async function rate(key,max,seconds){const ok=await p.rpc('hubone_rate_limit',{p_key:scoped(key),p_limit:max,p_seconds:seconds});if(ok!==true)fail('AUTH_RATE_LIMIT: Có quá nhiều yêu cầu. Đợi vài phút rồi thử lại.',429);}
 async function withLock(fn){const owner=randomUUID(),key=scoped('app-lock');const ok=await p.rpc('hubone_acquire_lock',{p_key:key,p_owner:owner});if(ok!==true)fail('BUSY: Có người đang xử lý dữ liệu. Đợi vài giây rồi thử lại.',409);try{return await fn();}finally{try{await p.rpc('hubone_release_lock',{p_key:key,p_owner:owner});}catch{/* lease expires; no sensitive logging */}}}
 async function keyRequest(method,path,body,prefer){
  try{return await p.rest(method,path,body,prefer);}
  catch{fail('SETUP_KEYS_REQUIRED: Chưa đọc/ghi được mã truy cập. Chạy supabase/access_keys_v4_3.sql và supabase/account_ux_v4_12.sql trong Supabase hiện tại, rồi thử lại.',503);}
 }
 const keyQuery='hubone_access_keys?scope=eq.'+encodeURIComponent(c.scope);
 async function getAccountKey(uid){return (await keyRequest('GET',keyQuery+'&uid=eq.'+encodeURIComponent(uid)+'&select=*'))?.[0]||null;}
 async function getAccessKey(hash){return (await keyRequest('GET',keyQuery+'&key_hash=eq.'+encodeURIComponent(hash)+'&select=*'))?.[0]||null;}
 async function getUsedAccessKey(hash){return (await keyRequest('GET','hubone_access_key_history?scope=eq.'+encodeURIComponent(c.scope)+'&key_hash=eq.'+encodeURIComponent(hash)+'&select=uid'))?.[0]||null;}
 async function listKeyBackupRows(){return await keyRequest('GET',keyQuery+'&select=*&limit=10000');}
 async function listAccountKeys(){return await keyRequest('GET',keyQuery+'&select=uid,enabled,revision,issued_at,label,key_mode,key_ciphertext&limit=10000');}
 async function putAccessKey(value){await keyRequest('POST','hubone_access_keys?on_conflict=scope,uid',{...value,scope:c.scope},'resolution=merge-duplicates,return=minimal');}
 async function getAvatars(ids){
  try{const rows=await p.rest('GET','hubone_account_profiles?scope=eq.'+encodeURIComponent(c.scope)+'&uid=in.('+ids.map(encodeURIComponent).join(',')+')&select=uid,avatar');return Object.fromEntries((rows||[]).map(r=>[r.uid,r.avatar]));}
  catch{fail('SETUP_PROFILE_REQUIRED: Chạy supabase/account_ux_v4_12.sql để dùng ảnh tài khoản.',503);}
 }
 async function saveAvatar(uid,avatar){
  try{await p.rest('POST','hubone_account_profiles?on_conflict=scope,uid',{scope:c.scope,uid,avatar,updated_at:new Date().toISOString()},'resolution=merge-duplicates,return=minimal');}
  catch{fail('SETUP_PROFILE_REQUIRED: Chạy supabase/account_ux_v4_12.sql để lưu ảnh tài khoản.',503);}
 }
 return {listKeyBackupRows,getAvatars,saveAvatar,get,put,touch,remove,rate,withLock,getAccountKey,getAccessKey,getUsedAccessKey,listAccountKeys,putAccessKey};
}
