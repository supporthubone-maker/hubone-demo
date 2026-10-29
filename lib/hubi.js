import {fail} from './config.js';
import {HUBI_ENDPOINT} from './hubi-endpoint.js';

export function createHuBIService(c,{fetcher=fetch,timeoutMs=10000}={}){
 const endpoint=c.hubiEndpoint||HUBI_ENDPOINT;
 async function request(method,question){
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint))fail('HUBI_SETUP: Địa chỉ Apps Script của HuBI chưa hợp lệ.',503);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const r=await fetcher(endpoint+(method==='GET'?'?_='+Date.now():''),{method,redirect:'follow',cache:'no-store',signal:controller.signal,headers:method==='GET'?{Accept:'application/json'}:{'Content-Type':'text/plain;charset=utf-8'},...(method==='POST'?{body:JSON.stringify({question})}:{})});
   if(!r.ok)throw Error('remote unavailable');
   if(method==='POST'){if(r.url&&!['script.google.com','script.googleusercontent.com'].includes(new URL(r.url).hostname))throw Error('unexpected redirect');await r.body?.cancel();return {ok:true,submitted:true};}
   let text='';if(r.body?.getReader){const reader=r.body.getReader(),parts=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2000000){await reader.cancel();throw Error('too large');}parts.push(Buffer.from(value));}text=Buffer.concat(parts).toString('utf8');}else{text=await r.text();if(Buffer.byteLength(text)>2000000)throw Error('too large');}
   const parsed=JSON.parse(text);if(!Array.isArray(parsed)||parsed.length>2000)throw Error('unexpected format');
   const faq=parsed.filter(x=>x&&typeof x==='object'&&(String(x.question||'').trim()||String(x.keywords||'').trim())).map(x=>({question:String(x.question||'').slice(0,1000),keywords:String(x.keywords||'').slice(0,3000),answer:String(x.status||'').trim().toLowerCase()==='active'?String(x.answer||'').slice(0,20000):'',status:String(x.status||'').slice(0,50)}));
   return {ok:true,faq};
  }catch{fail(method==='GET'?'HUBI_UNAVAILABLE: HuBI chưa tải được FAQ. Kiểm tra quyền Web App Apps Script hoặc thử tải lại FAQ.':'HUBI_UNAVAILABLE: Chưa gửi được câu hỏi đến HuBI. Bạn có thể thử gửi lại.',503);}
  finally{clearTimeout(timer);}
 }
 return {faq:()=>request('GET'),submit:question=>request('POST',question)};
}
