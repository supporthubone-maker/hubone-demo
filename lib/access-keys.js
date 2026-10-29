import {randomBytes} from 'node:crypto';
import {fail,privateHash} from './config.js';

// New custom keys: >6 characters with uppercase, number and special character.
// Login also accepts already-issued v4.2-v4.4 keys, without reissuing credentials.
const validCustomKey=value=>typeof value==='string'&&/^[A-Za-z0-9._@!#%+=:-]{7,128}$/.test(value)&&/[A-Z]/.test(value)&&/[0-9]/.test(value)&&/[._@!#%+=:-]/.test(value);
const validLegacyKey=value=>typeof value==='string'&&/^[A-Za-z0-9._@!#%+=:-]{12,128}$/.test(value)&&/[A-Za-z]/.test(value)&&/[0-9]/.test(value);
export const validAccessKey=value=>typeof value==='string'&&(/^hk_[A-Za-z0-9_-]{43}$/.test(value)||validCustomKey(value)||validLegacyKey(value));
export function customAccessKey(value){if(!validCustomKey(value))fail('KEY_INVALID: Key cần 7–128 ký tự, có chữ hoa, số và ký tự đặc biệt; không có khoảng trắng. Ký tự đặc biệt được dùng: . _ @ ! # % + = : -');return value;}
export function keyLabel(value,fallback=''){const s=value===undefined?fallback:value;if(typeof s!=='string'||s.trim().length>120||/[\u0000-\u001f\u007f]/.test(s))fail('KEY_LABEL_INVALID: Nhãn key tối đa 120 ký tự, không xuống dòng.');return s.normalize('NFC').trim();}
export const accessKeyHash=(value,c)=>privateHash('personal-key:'+c.scope+':'+value,c.key);
export function newAccessKey(){return 'hk_'+randomBytes(32).toString('base64url');}
export function keyView(row){return {enabled:row?.enabled===true,revision:row?.revision||0,issuedAt:row?.issued_at||null,label:row?.label||'',mode:row?.key_mode||'auto',canReveal:!!row?.key_ciphertext&&row.enabled===true};}
export function checkKeyRevision(request,row){
 if(!Number.isSafeInteger(request?.expectedKeyRevision)||request.expectedKeyRevision!==(row?.revision||0))fail('CONFLICT: Mã truy cập đã thay đổi. Tải lại trạng thái key trước khi thao tác.',409);
}
export function checkKeySession(row,s){
 if(!row?.enabled||row.uid!==s.uid||row.key_hash!==s.keyHash||row.revision!==s.keyRevision)fail('AUTH_DENIED: Mã truy cập đã bị thu hồi hoặc thay mới. Liên hệ quản trị để nhận key mới.',403);
}
