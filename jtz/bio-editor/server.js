import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
const html=await readFile(new URL('./index.html',import.meta.url));
const port=Number(process.env.PORT||3000);
const origin='https://nxgc-player-bio-production.up.railway.app';
const guild=process.env.NXGC_GUILD_ID||'1558957008370008144';
const client=process.env.DISCORD_CLIENT_ID||'1483131810044182659';
const secret=process.env.DISCORD_CLIENT_SECRET;
const bot=process.env.DISCORD_BOT_TOKEN;
const signing=process.env.BIO_SESSION_SECRET;
const ready=()=>!!(secret&&bot&&signing);
const api='https://discord.com/api/v10';
const redirect=origin+'/auth/callback';
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split('=').map(decodeURIComponent)).filter(p=>p.length===2));
const sign=s=>createHmac('sha256',signing).update(s).digest('base64url');
const tokenFor=(obj)=>{const data=Buffer.from(JSON.stringify(obj)).toString('base64url');return data+'.'+sign(data)};
const verified=(str)=>{if(!str||!signing)return null;const [data,sig]=str.split('.');if(!data||!sig)return null;const a=Buffer.from(sign(data)),b=Buffer.from(sig);if(a.length!==b.length||!timingSafeEqual(a,b))return null;const obj=JSON.parse(Buffer.from(data,'base64url').toString());return obj.exp>Date.now()?obj:null};
const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
const discord=async(path,opts={})=>{const r=await fetch(api+path,{...opts,headers:{Authorization:'Bot '+bot,...opts.headers}});if(!r.ok)throw Error('Discord API '+r.status+': '+(await r.text()).slice(0,300));return r.status===204?null:r.json()};
const safe=(v,n=500)=>String(v||'').slice(0,n).replace(/@/g,'＠');
const allowedImage=(s)=>typeof s==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(s)&&s.length<1800000;
const jsonBody=async(req)=>{let buf='';for await(const part of req){buf+=part;if(buf.length>9500000)throw Error('Profile too large (9 MB max)')}return JSON.parse(buf)};
const jsonHeaders={'Content-Type':'application/json'};
const assets=['hero','avatar','momentsImage','achievementsImage','goalsImage','groupImage'];
const publish=async(user,data)=>{
 const channels=await discord('/guilds/'+guild+'/channels');
 const channel=channels.find(c=>c.type===0&&c.name==='players-bios');
 if(!channel)throw Error('Create a text channel named #players-bios first.');
 const name=safe(data.name,80)||user.username;
 const fields=[{name:'Game',value:safe(data.game,100)||'Not specified',inline:true},{name:'Gaming moments',value:safe(data.moments,900)||'—'},{name:'Achievements',value:safe(data.achievements,900)||'—'},{name:'Goals',value:safe(data.goals,900)||'—'}];
 if(data.showGroup&&data.group)fields.push({name:'Groups & Affiliations',value:safe([data.group,data.rank,data.groupGame,data.groupBio].filter(Boolean).join(' • '),900)});
 const images=data.images||{};const files=[];
 for(const id of assets){const str=images[id];if(!allowedImage(str))continue;const [meta,encoded]=str.split(',');const mime=meta.match(/image\/(png|jpeg|webp)/)[1];files.push({name:id+'.'+(mime==='jpeg'?'jpg':mime),data:Buffer.from(encoded,'base64'),mime:'image/'+mime});}
 const embed={title:'🎮 '+name+' | NXGC Player Bio',description:safe(data.bio,3500)||'NXGC community player',color:parseInt(String(data.color||'#22d3ee').replace('#',''),16)||2282478,fields,footer:{text:'NXGC BIO OWNER:'+user.id}};
 if(files.some(f=>f.name.startsWith('hero.')))embed.image={url:'attachment://'+files.find(f=>f.name.startsWith('hero.')).name};
 else if(files.some(f=>f.name.startsWith('momentsImage.')))embed.image={url:'attachment://'+files.find(f=>f.name.startsWith('momentsImage.')).name};
 if(files.some(f=>f.name.startsWith('avatar.')))embed.thumbnail={url:'attachment://'+files.find(f=>f.name.startsWith('avatar.')).name};
 const payload={content:'Player Bio for <@'+user.id+'>',embeds:[embed],allowed_mentions:{parse:[]}};
 let existing=null,before=null;
 for(let page=0;page<100;page++){const qs=before?'?limit=100&before='+before:'?limit=100';const msgs=await discord('/channels/'+channel.id+'/messages'+qs);if(!msgs.length)break;existing=msgs.find(m=>m.author?.bot&&m.embeds?.some(e=>e.footer?.text==='NXGC BIO OWNER:'+user.id));if(existing)break;before=msgs[msgs.length-1].id;if(msgs.length<100)break;}
 const endpoint='/channels/'+channel.id+'/messages'+(existing?'/'+existing.id:'');
 const form=new FormData();form.append('payload_json',JSON.stringify(payload));
 for(const [i,file] of files.entries())form.append('files['+i+']',new Blob([file.data],{type:file.mime}),file.name);
 const msg=await discord(endpoint,{method:existing?'PATCH':'POST',body:form});
 return {url:'https://discord.com/channels/'+guild+'/'+channel.id+'/'+msg.id,updated:!!existing};
};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');const path=url.pathname;
 try{
  if(path==='/'||path==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'"});return res.end(html)}
  if(path==='/health'){res.writeHead(200);return res.end('ok')}
  if(path==='/api/me'){const session=verified(cookies(req).nxgc_session);return reply(res,200,{configured:ready(),user:session?{id:session.id,username:session.username}:null})}
  if(path==='/auth/login'){if(!ready())return reply(res,503,{error:'Discord publishing setup is incomplete.'});const state=randomBytes(24).toString('hex');res.writeHead(302,{Location:'https://discord.com/oauth2/authorize?'+new URLSearchParams({client_id:client,response_type:'code',redirect_uri:redirect,scope:'identify guilds',state}), 'Set-Cookie':'nxgc_oauth='+state+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600'});return res.end()}
  if(path==='/auth/callback'){const state=cookies(req).nxgc_oauth;if(!state||state!==url.searchParams.get('state')||!url.searchParams.get('code'))return reply(res,403,{error:'Invalid login attempt.'});const body=new URLSearchParams({client_id:client,client_secret:secret,grant_type:'authorization_code',code:url.searchParams.get('code'),redirect_uri:redirect});const oauth=await fetch(api+'/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});if(!oauth.ok)throw Error('Discord OAuth failed');const access=(await oauth.json()).access_token;const u=await fetch(api+'/users/@me',{headers:{Authorization:'Bearer '+access}});if(!u.ok)throw Error('Discord identity failed');const user=await u.json();await discord('/guilds/'+guild+'/members/'+user.id);res.writeHead(302,{Location:'/', 'Set-Cookie':['nxgc_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0','nxgc_session='+tokenFor({id:user.id,username:user.username,exp:Date.now()+86400000})+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400']});return res.end()}
  if(path==='/auth/logout'){res.writeHead(302,{Location:'/', 'Set-Cookie':'nxgc_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'});return res.end()}
  if(path==='/api/publish'&&req.method==='POST'){if(!ready())return reply(res,503,{error:'Discord publishing is not configured yet.'});const session=verified(cookies(req).nxgc_session);if(!session)return reply(res,401,{error:'Sign in with Discord first.'});const referer=req.headers.origin;if(referer!==origin)return reply(res,403,{error:'Invalid request origin.'});await discord('/guilds/'+guild+'/members/'+session.id);const profile=await jsonBody(req);if(!profile||typeof profile!=='object'||Array.isArray(profile))return reply(res,400,{error:'Invalid profile.'});return reply(res,200,await publish(session,profile))}
  return reply(res,404,{error:'Not found'});
 }catch(e){console.error('NXGC bio request:',e.message);return reply(res,400,{error:e.message})}
});
server.listen(port,'0.0.0.0',()=>console.log('NXGC Bio Editor listening on '+port));
