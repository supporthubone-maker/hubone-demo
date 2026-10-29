import {fail,seal,unseal} from './config.js';
import {accessKeyHash} from './access-keys.js';
export function saveKeySecret(value,row,c){return seal({kind:'staffing-key-v1',scope:c.scope,uid:row.uid,revision:row.revision,key:value},c.key);}
export function revealKeySecret(row,c){
 if(!row?.enabled||!row.key_ciphertext)return null;
 let data;try{data=unseal(row.key_ciphertext,c.key);}catch{fail('KEY_UNAVAILABLE: Không đọc được bản lưu key. Liên hệ quản trị hoặc cấp lại key.',409);}
 if(data.kind!=='staffing-key-v1'||data.scope!==c.scope||data.uid!==row.uid||data.revision!==row.revision||accessKeyHash(data.key,c)!==row.key_hash)fail('KEY_UNAVAILABLE: Bản lưu key không khớp trạng thái hiện tại.',409);
 return data.key;
}
export function avatarData(value){
 if(value==='')return '';
 if(typeof value!=='string'||value.length>44000)fail('AVATAR_INVALID: Ảnh sau thu nhỏ tối đa 32 KB.');
 const match=value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);if(!match)fail('AVATAR_INVALID: Chọn ảnh PNG, JPG hoặc WebP.');
 const bytes=Buffer.from(match[2],'base64');if(bytes.length>32768||bytes.length<12||bytes.toString('base64')!==match[2])fail('AVATAR_INVALID: Dữ liệu ảnh chưa hợp lệ.');
 const type=match[1],valid=type==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):type==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(!valid)fail('AVATAR_INVALID: Nội dung ảnh không đúng định dạng.');return value;
}
