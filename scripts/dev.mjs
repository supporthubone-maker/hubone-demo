import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import handler from '../api/rpc.js';
http.createServer(async(req,res)=>{
 if(req.url.split('?')[0]==='/api/rpc')return handler(req,res);
 const u=new URL(req.url,'http://localhost:3000');let file=u.pathname==='/'?'index.html':u.pathname.slice(1);
 if(!['index.html','app.js','hub4.js','hub-model.js','hub4.css','admin-tools.js','file-formats.js','vendor/jszip.min.js','vendor/xlsx.full.min.js','data-mapping.html','data-mapping.js','data-mapping.css','mapper-engine.js','account-ux.js','account-ux.css','performance.js','hubi.js','hubi.css','assets/default-avatar.svg','assets/hubi-avatar.png','GOOGLE_SANS_LICENSE.txt'].includes(file)){res.writeHead(404).end('Not found');return;}
 try{const body=await fs.readFile(path.join('public',file));res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/plain; charset=utf-8');res.end(body);}catch{res.writeHead(404).end('Not found');}
}).listen(3000,'127.0.0.1',()=>console.log('HubOne: http://localhost:3000 — use ALLOW_LOCAL_HTTP=true in .env.local for local login.'));
