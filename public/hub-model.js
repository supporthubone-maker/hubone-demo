(function(root){
 'use strict';
 const DAY=86400000, ms=s=>Date.parse(s+'T00:00:00Z');
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
 function kind(id,catalogs){return catalogs.statuses.find(x=>x.id===id)?.kind||'not-started';}
 function leaves(list){const parents=new Set(list.map(x=>x.parentId).filter(Boolean));return list.filter(x=>!parents.has(x.id));}
 function descendants(id,list){const children=list.filter(x=>x.parentId===id);return children.length?children.flatMap(x=>descendants(x.id,list)):list.filter(x=>x.id===id);}
 function summary(list,catalogs,today){
  const ts=leaves(list),starts=ts.map(x=>x.startDate).filter(Boolean).sort(),ends=ts.map(x=>x.target).filter(Boolean).sort(),done=ts.filter(x=>kind(x.status,catalogs)==='completed').length;
  const working=ts.filter(x=>kind(x.status,catalogs)==='in-progress').length,late=ts.filter(x=>x.target&&x.target<today&&kind(x.status,catalogs)!=='completed').length;
  return {count:ts.length,done,working,late,unscheduled:ts.filter(x=>!x.startDate||!x.target).length,progress:ts.length?Math.round(ts.reduce((a,t)=>a+(t.progress===''?0:Number(t.progress)),0)/ts.length):0,startDate:starts[0]||'',target:ends.at(-1)||'',kind:done===ts.length&&ts.length?'completed':working||ts.some(x=>Number(x.progress)>0)?'in-progress':'not-started'};
 }
 function path(x,list){const p={task:'',subtask:'',ticket:''};let t=x;for(let i=0;t&&i<3;i++){p[t.level]=t.title;t=list.find(v=>v.id===t.parentId);}return p;}
 function filter(list,projects,options,catalogs,today){
  const ids=options.projectIds===null?new Set(projects.map(p=>p.id)):new Set(options.projectIds),leaf=leaves(list).filter(x=>ids.has(x.projectId));
  const selected=leaf.filter(x=>(!options.owner||x.owner===options.owner)&&(!options.status||(options.status==='overdue'?x.target&&x.target<today&&kind(x.status,catalogs)!=='completed':x.status===options.status))&&(!options.query||norm([x.title,...Object.values(path(x,list)),projects.find(p=>p.id===x.projectId)?.name,catalogs.owners.find(o=>o.id===x.owner)?.name,x.inputs,x.notes].join(' ')).includes(norm(options.query))));
  const keep=new Set();for(const x of selected){let p=x;for(let i=0;p&&i<3;i++){keep.add(p.id);p=list.find(y=>y.id===p.parentId);}}
  return {items:list.filter(x=>keep.has(x.id)),leaves:selected};
 }
 function timeline(list,today,scale){const ss=list.map(x=>x.startDate).filter(Boolean).sort(),ee=list.map(x=>x.target).filter(Boolean).sort();let start=ms(ss[0]||today),end=ms(ee.at(-1)||today)+DAY;const dow=new Date(start).getUTCDay();start-=((dow+6)%7)*DAY;end=Math.max(end,start+28*DAY);if(scale==='month'){const a=new Date(start),b=new Date(end-DAY);start=Date.UTC(a.getUTCFullYear(),a.getUTCMonth(),1);end=Date.UTC(b.getUTCFullYear(),b.getUTCMonth()+1,1);}const days=Math.ceil((end-start)/DAY),dayWidth=scale==='day'?28:scale==='month'?3.5:Math.max(7,Math.min(14,500/days));return {start,end,days,dayWidth,width:Math.ceil(days*dayWidth)};}
 root.HubModel={DAY,ms,norm,kind,leaves,descendants,summary,path,filter,timeline};
})(globalThis);
