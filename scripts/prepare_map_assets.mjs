import {mkdir,copyFile,readFile} from 'node:fs/promises';
const packageFile=JSON.parse(await readFile(new URL('../node_modules/maplibre-gl/package.json',import.meta.url),'utf8'));
const destination=new URL(`../public/vendor/maplibre/${packageFile.version}/`,import.meta.url);
await mkdir(destination,{recursive:true});
// Keep the worker and its relative shared-module dependency beside one another.
for(const file of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs'])
 await copyFile(new URL(`../node_modules/maplibre-gl/dist/${file}`,import.meta.url),new URL(file,destination));
