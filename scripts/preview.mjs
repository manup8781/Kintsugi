import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
    const target=path.resolve(root,relative);
    if(!target.startsWith(root))throw new Error('Ruta inválida');
    const info=await stat(target);const file=info.isDirectory()?path.join(target,'index.html'):target;
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('No encontrado')}
});
server.listen(4173,'127.0.0.1',()=>console.log('Vista previa: http://127.0.0.1:4173'));
