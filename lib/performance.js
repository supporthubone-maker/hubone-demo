import {randomUUID} from 'node:crypto';
export function requestTrace(){
 const start=performance.now(),id=randomUUID(),spans=[];
 return {id,async measure(name,fn){const t=performance.now();try{return await fn();}finally{spans.push({name,ms:Math.round((performance.now()-t)*10)/10});}},finish(res,method,status){const total=Math.round((performance.now()-start)*10)/10;res.setHeader('X-Request-Id',id);res.setHeader('Server-Timing',[...spans,{name:'server_total',ms:total}].map(s=>s.name.replace(/^supabase_/,'storage_')+';dur='+s.ms).join(', '));if(process.env.PERFORMANCE_LOG==='1')console.info(JSON.stringify({event:'staffing_performance',requestId:id,method,status,totalMs:total,spans}));return total;}};
}
