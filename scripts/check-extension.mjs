import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=process.cwd();
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
assert.equal(manifest.manifest_version,3);
assert.match(manifest.version,/^\d+(\.\d+){0,3}$/);
const files=[...Object.values(manifest.icons||{}),...Object.values(manifest.action?.default_icon||{})];
if(manifest.action?.default_popup)files.push(manifest.action.default_popup);
if(manifest.options_page)files.push(manifest.options_page);
if(manifest.background?.service_worker)files.push(manifest.background.service_worker);
for(const script of manifest.content_scripts||[])files.push(...script.js||[],...script.css||[]);
for(const rule of manifest.declarative_net_request?.rule_resources||[])files.push(rule.path);
for(const file of files){
  assert.ok(path.resolve(file).startsWith(root+path.sep),`Path outside extension: ${file}`);
  assert.ok(fs.statSync(file).isFile(),`Missing manifest resource: ${file}`);
}
let count=0;
function inspect(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  if(['.git','node_modules','_metadata','.release'].includes(item.name))continue;
  const file=path.join(dir,item.name);
  if(item.isDirectory())inspect(file);
  else if(file.endsWith('.js')||file.endsWith('.mjs')){
   const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
   assert.equal(result.status,0,`${file}: ${result.stderr}`);count++;
  } else if(file.endsWith('.html')){
   const html=fs.readFileSync(file,'utf8');
   for(const match of html.matchAll(/<script[^>]*\bsrc=["']([^"']+)["']/gi)){
    if(!/^(https?:|data:|chrome-extension:)/.test(match[1]))assert.ok(fs.existsSync(path.resolve(path.dirname(file),match[1])),`Missing script: ${match[1]}`);
   }
  }
 }
}
inspect('.');
console.log(`Manifest resources and ${count} JavaScript files verified.`);
