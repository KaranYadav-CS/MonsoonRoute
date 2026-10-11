#!/usr/bin/env node
/** Pure parser/type syntax validation; complements full `tsc` after npm install. */
import {createRequire} from 'node:module';import {readdirSync,readFileSync} from 'node:fs';import {join,relative} from 'node:path';
const require=createRequire(import.meta.url);let ts;
try{ts=require('typescript')}catch{if(process.env.USE_GLOBAL_TYPESCRIPT!=='1')throw Error('TypeScript dependency unavailable: npm ci must run before syntax validation');ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const ignore=new Set(['node_modules','.next','.git','build','__pycache__']);function walk(root){return readdirSync(root,{withFileTypes:true}).flatMap(e=>{if(ignore.has(e.name))return [];const path=join(root,e.name);return e.isDirectory()?walk(path):(/\.(tsx?|jsx?)$/.test(e.name)?[path]:[])})}
let failures=0;for(const file of walk(process.cwd())){const text=readFileSync(file,'utf8');const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);for(const d of sf.parseDiagnostics){failures++;const at=sf.getLineAndCharacterOfPosition(d.start||0);console.error(relative(process.cwd(),file)+':'+(at.line+1)+':'+(at.character+1)+' '+ts.flattenDiagnosticMessageText(d.messageText,' '))}}
console.log('Parsed '+walk(process.cwd()).length+' TypeScript and TSX source files. Syntax errors: '+failures);
if(failures)process.exit(1);
