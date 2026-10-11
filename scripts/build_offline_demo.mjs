/** Compile the exact pure TS engine to browser ESM without shipping a second routing algorithm. */
import {createRequire} from 'node:module';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {join} from 'node:path';
const require=createRequire(import.meta.url);let ts;
try{ts=require('typescript')}catch{if(process.env.USE_GLOBAL_TYPESCRIPT!=='1')throw Error('Install reviewed npm dependencies first');ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const out=join(process.cwd(),'demo');mkdirSync(out,{recursive:true});
const opts={module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022};
const source=readFileSync('packages/engine/index.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:opts,fileName:'index.ts'}).outputText;
if(!js.includes("from '../config/constants.ts'"))throw Error('Engine import changed; demo bundle must be reviewed');
writeFileSync(join(out,'engine.mjs'),js.replace("from '../config/constants.ts'","from './constants.mjs'"));
writeFileSync(join(out,'constants.mjs'),ts.transpileModule(readFileSync('packages/config/constants.ts','utf8'),{compilerOptions:opts,fileName:'constants.ts'}).outputText);
console.log('Offline browser runner generated from pure TypeScript engine; source of truth remains packages/engine/index.ts');
