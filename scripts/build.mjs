import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const output=path.join(root,'dist');
const files=['index.html','admin.html','styles.css','dynamic.css','admin.css','admin-pill.css','admin-supabase.css','script.js','admin.js','_headers'];
const supabaseUrl=process.env.SUPABASE_URL;
const supabaseAnonKey=process.env.SUPABASE_ANON_KEY;

if(!supabaseUrl||!supabaseAnonKey){
  throw new Error('Faltan SUPABASE_URL y SUPABASE_ANON_KEY en las variables de entorno de Netlify.');
}

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await Promise.all(files.map(file=>cp(path.join(root,file),path.join(output,file),{recursive:true})));
await cp(path.join(root,'assets'),path.join(output,'assets'),{recursive:true});

const template=await readFile(path.join(root,'config.template.js'),'utf8');
const config=template
  .replace('__SUPABASE_URL__',supabaseUrl.replaceAll('\\','\\\\').replaceAll("'","\\'"))
  .replace('__SUPABASE_ANON_KEY__',supabaseAnonKey.replaceAll('\\','\\\\').replaceAll("'","\\'"));
await writeFile(path.join(output,'config.js'),config,'utf8');
console.log('Sitio Kintsugi preparado en dist/');
