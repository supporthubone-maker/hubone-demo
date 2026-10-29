import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const files=['api','lib','scripts'].flatMap(dir=>fs.readdirSync(dir).filter(n=>/\.m?js$/.test(n)).map(n=>dir+'/'+n)).concat('public/hubi.js','public/performance.js','public/account-ux.js','public/app.js','public/admin-tools.js','public/file-formats.js','public/hub4.js','public/hub-model.js','public/mapper-engine.js','public/data-mapping.js','public/mapping-workflow.js','public/ui-guard.js','public/common-inputs.js','public/master-catalog.js','public/master-runtime.js','public/master-edit-options.js');
for(const path of files){const r=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});if(r.status)process.exit(r.status);}
for(const p of ['package.json','vercel.json'])JSON.parse(fs.readFileSync(p));
if(/google\.script\.run/.test(fs.readFileSync('public/app.js','utf8')))throw Error('Legacy transport remains');
console.log('Build OK: '+files.length+' JavaScript files checked.');
