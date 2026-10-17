import http from 'node:http';
import {readFile} from 'node:fs/promises';
const port=Number(process.env.PORT||3000);
const html=await readFile(new URL('./index.html',import.meta.url));
http.createServer((req,res)=>{if(req.url==='/'||req.url==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"});res.end(html)}else if(req.url==='/health'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok')}else{res.writeHead(404);res.end('Not found')}}).listen(port,'0.0.0.0',()=>console.log('NXGC Bio Editor listening on '+port));
