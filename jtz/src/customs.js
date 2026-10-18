import {isOwner} from './config.js';
import {ChannelType,PermissionFlagsBits as P} from 'discord.js';
const catalog={
 "mlos-mech-shops": [
  "farm-shop",
  "big-paleto-mechanic",
  "medium-paleto-mechanic",
  "small-paleto-mech-shop",
  "big-grape-seed-mechanic",
  "small-grape-seed-mechanic",
  "medium-grape-seed-mechanic",
  "big-sandy-mechanic-shop",
  "la-fuente-blanca-mech-shop",
  "napa-auto-parts",
  "sandy-barndaminium"
 ],
 "tos": [
  "2door-300-heliphant",
  "demonram-4door",
  "demonram-2-door"
 ],
 "bikes": [
  "gcsofttail",
  "gcbagger"
 ],
 "6x6-10x10": [
  "trx",
  "gladiator",
  "3500-dually"
 ],
 "audi": [
  "audi-rst"
 ],
 "atv-golfcart": [
  "golfcart-lifted"
 ],
 "bmw": [
  "m4gts",
  "1995-bmw-m5"
 ],
 "cadi": [
  "ct5",
  "ats"
 ],
 "chevy-cars": [
  "80-elco",
  "21-ss-camaro",
  "monte-carlo",
  "ss-intimidator",
  "1990-irocz",
  "64-impala",
  "ss-monte-carlo-intimidator",
  "18-impala-ss",
  "55-belair",
  "55-nomad"
 ],
 "chevy-trucks": [
  "lifted-78",
  "2011-duramax-2500",
  "trail-blazer",
  "widebody-gucci-tahoe",
  "98-454",
  "78c10-step",
  "78c10-tonka-edition",
  "chevy-widebody",
  "98-obs-silv",
  "gmc-jimmy",
  "obs-stepside-lifted",
  "78-k30-4door",
  "slammed-98-s10",
  "14silv-slammed",
  "g78slamd",
  "65-c10",
  "21-4door"
 ],
 "dodge-cars": [
  "punisher-challanger",
  "70-cuda-retromod",
  "20-daytona",
  "08-magnum",
  "68-dart",
  "catkiller"
 ],
 "dodge-truck": [
  "99-dually",
  "24k-gold",
  "66w200-hunters-special",
  "426-ghoul-ram",
  "trx-muddtruck",
  "megacab-monster-dually",
  "goldschool",
  "gators-66",
  "gramflat",
  "17-powerwagon",
  "g99cum",
  "single-cab-trx",
  "gc24k4d",
  "79-ram-charger",
  "2nd-gen-4door"
 ],
 "donk": [
  "hummer-ev-donk",
  "75-cadi",
  "72impala",
  "72-fleetwood"
 ],
 "ferrari": [
  "g288"
 ],
 "ford-cars": [
  "91-cobra",
  "2000-cobra-r",
  "67-gt500-wide",
  "drift-stang",
  "94-cobra"
 ],
 "ford-trucks": [
  "22bronco",
  "f150-4x4-henessey",
  "ford-f350",
  "71-f100-sema-build",
  "bronco-raptor-lifted",
  "f650",
  "ford-f-800s",
  "lightning",
  "king-ranch",
  "23-raptor"
 ],
 "jeep": [
  "18-wrangler",
  "monster-glad",
  "trackhawk-wb"
 ],
 "lambo": [
  "miura"
 ],
 "mercedes": [
  "mercedes-yachting",
  "amg-hammer"
 ],
 "mercury": [
  "cyclone"
 ],
 "nissan": [
  "r35",
  "slammed-frontier"
 ],
 "oldsmobile": [
  "442"
 ],
 "pontiac": [
  "68-firebird-revamp",
  "79-transam"
 ],
 "semi": [
  "blue-lagoon"
 ],
 "studabaker": [
  "64-champ-flatbed"
 ],
 "toyota": [
  "r35-tacoma",
  "lifted-trd"
 ],
 "utility-trucks": [
  "78k30-towtruck-slammed",
  "c50-service-truck",
  "78c10-off-road-tow-truck",
  "monstertow"
 ]
};
export const customsCommand={name:'jtz-customs',description:'Set up Jimbo Customs vehicle forums and posts',default_member_permissions:P.Administrator.toString(),options:[{type:1,name:'preview',description:'Preview Jimbo Customs catalog'},{type:1,name:'apply',description:'Import up to 12 missing vehicle posts per run'}]};
const BATCH=12;
const running=new Set();
export function attachCustoms(client){client.on('interactionCreate',async i=>{
 if(!i.isChatInputCommand()||i.commandName!=='jtz-customs')return;
  if(!isOwner(i.user.id))return i.reply({content:'JTZ management is owner-only.',flags:64});
 if(!i.inGuild()||!i.memberPermissions?.has(P.Administrator))return i.reply({content:'Administrator required.',flags:64});
 const names=Object.keys(catalog),count=Object.values(catalog).reduce((n,a)=>n+a.length,0);
 if(i.options.getSubcommand()==='preview')return i.reply({content:'**Jimbo Customs**: '+names.length+' vehicle forums and '+count+' catalog posts. Import creates up to '+BATCH+' missing posts per run. Existing posts and old channels are preserved.',flags:64});
 if(running.has(i.guildId))return i.reply({content:'A Jimbo Customs import is already running. Wait for it to finish.',flags:64});
 running.add(i.guildId);
 await i.deferReply({flags:64});
 let made=0,posts=0,skipped=0,remaining=0,errors=[];
 try{
  const g=i.guild;await g.roles.fetch();await g.channels.fetch();
  const me=await g.members.fetchMe();
  if(!me.permissions.has([P.ManageChannels,P.ManageRoles,P.SendMessages,P.CreatePublicThreads]))throw Error('JTZ needs Manage Channels, Manage Roles, Send Messages and Create Public Threads.');
  let role=g.roles.cache.find(r=>r.name==='Jimbo Customs'&&!r.managed);
  if(!role)role=await g.roles.create({name:'Jimbo Customs',color:0x0a9d9d,reason:'Jimbo Customs membership'});
  let staffRole=g.roles.cache.find(r=>r.name==='Jimbo Customs Staff'&&!r.managed);
  if(!staffRole)staffRole=await g.roles.create({name:'Jimbo Customs Staff',color:0x1b7a9a,reason:'Jimbo Customs ticket routing'});
  let category=g.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&c.name==='🔧 JIMBO CUSTOMS');
  if(!category)category=await g.channels.create({name:'🔧 JIMBO CUSTOMS',type:ChannelType.GuildCategory,reason:'Jimbo Customs catalog'});
  const wanted=[...['jimbo-general','jimbo-support','jimbo-announcements'].map(name=>({name,type:ChannelType.GuildText})),...['Customs Lounge','Garage 1','Garage 2'].map(name=>({name,type:ChannelType.GuildVoice})),...names.map(name=>({name,type:ChannelType.GuildForum}))];
  for(const spec of wanted){
   let ch=g.channels.cache.find(c=>c.parentId===category.id&&c.name===spec.name&&c.type===spec.type);
   if(!ch){try{ch=await g.channels.create({...spec,parent:category.id,reason:'Jimbo Customs setup'});made++;}catch(e){errors.push(spec.name+': '+e.message);continue;}}
   if(spec.type!==ChannelType.GuildForum)continue;
   let existing=new Set();
   try{
    const active=await ch.threads.fetchActive();for(const t of active.threads.values())existing.add(t.name);
    const archived=await ch.threads.fetchArchived({limit:100});for(const t of archived.threads.values())existing.add(t.name);
   }catch(e){errors.push(spec.name+' lookup: '+e.message);continue;}
   for(const vehicle of catalog[spec.name]){
    if(existing.has(vehicle)){skipped++;continue;}
    if(posts>=BATCH){remaining++;continue;}
    try{await ch.threads.create({name:vehicle,message:{content:'**'+vehicle+'**\nJimbo Customs vehicle listing. Add vehicle photos, details and discussion in this post.'},reason:'Jimbo Customs catalog import'});posts++;existing.add(vehicle);}
    catch(e){errors.push(vehicle+': '+e.message);remaining++;}
   }
  }
  const result='Jimbo Customs batch complete: **'+posts+' posts created**, '+made+' channels created, '+skipped+' existing posts skipped, '+remaining+' still missing.'+(errors.length?'\nErrors: '+errors.slice(0,4).join(' | '):'')+(remaining?'\nRun **/jtz-customs apply** again for the next batch.':'\nCatalog import complete for the configured list.')+'\nOriginal channels were not changed.';
  await i.editReply(result);
 }catch(e){console.error('JTZ Customs batch error',e);await i.editReply('Customs import stopped: '+e.message+'. Existing posts are preserved.').catch(console.error);}
 finally{running.delete(i.guildId);}
});}
