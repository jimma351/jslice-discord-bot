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
export const customsCommand={name:'jtz-customs',description:'Set up the Jimbo Customs vehicle forums, role, chat, voice and support',default_member_permissions:P.Administrator.toString(),options:[{type:1,name:'preview',description:'Show planned Jimbo Customs setup'},{type:1,name:'apply',description:'Create Jimbo Customs forums and vehicle posts (does not move old channels)'}]};
export function attachCustoms(client){client.on('interactionCreate',async i=>{
 if(!i.isChatInputCommand()||i.commandName!=='jtz-customs')return;
 if(!i.inGuild()||!i.memberPermissions?.has(P.Administrator))return i.reply({content:'Administrator required.',ephemeral:true});
 const names=Object.keys(catalog),count=Object.values(catalog).reduce((n,a)=>n+a.length,0);
 if(i.options.getSubcommand()==='preview')return i.reply({content:'**Jimbo Customs preview**\\n1 category, 2 roles, 3 text channels, 3 voice channels, '+names.length+' vehicle forums and '+count+' vehicle posts.\\nForums: '+names.join(', ')+'\\nExisting channels are NOT moved or deleted. Run /jtz-customs apply to create the new layout.',ephemeral:true});
 await i.deferReply({ephemeral:true});
 try{
 const g=i.guild;await g.roles.fetch();await g.channels.fetch();const me=await g.members.fetchMe();
 if(!me.permissions.has([P.ManageChannels,P.ManageRoles,P.SendMessages,P.CreatePublicThreads]))throw Error('JTZ requires Manage Channels, Manage Roles, Send Messages, and Create Public Threads.');
 let role=g.roles.cache.find(r=>r.name==='Jimbo Customs'&&!r.managed);
 if(!role)role=await g.roles.create({name:'Jimbo Customs',color:0x0a9d9d,reason:'Jimbo Customs membership'});
 let staffRole=g.roles.cache.find(r=>r.name==='Jimbo Customs Staff'&&!r.managed);
 if(!staffRole)staffRole=await g.roles.create({name:'Jimbo Customs Staff',color:0x1b7a9a,reason:'Private Jimbo Customs ticket routing'});
 let category=g.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&c.name==='🔧 JIMBO CUSTOMS');
 if(!category)category=await g.channels.create({name:'🔧 JIMBO CUSTOMS',type:ChannelType.GuildCategory,reason:'Jimbo Customs catalog'});
 const wanted=[...['jimbo-general','jimbo-support','jimbo-announcements'].map(name=>({name,type:ChannelType.GuildText})),...['Customs Lounge','Garage 1','Garage 2'].map(name=>({name,type:ChannelType.GuildVoice})),...names.map(name=>({name,type:ChannelType.GuildForum}))];
 if(wanted.length>50)throw Error('Discord category limit exceeded');
 let made=0,posts=0,skipped=0;
 for(const spec of wanted){
 let channel=g.channels.cache.find(c=>c.parentId===category.id&&c.name===spec.name&&c.type===spec.type);
 if(!channel){channel=await g.channels.create({...spec,parent:category.id,reason:'Jimbo Customs setup'});made++;}
 if(spec.type!==ChannelType.GuildForum)continue;
 // Existing forum posts are not modified. Look up active and archived posts to prevent duplicates.
 let existing=new Set();
 const active=await channel.threads.fetchActive().catch(()=>null);if(active)for(const t of active.threads.values())existing.add(t.name);
 let before;
 for(let page=0;page<20;page++){const archived=await channel.threads.fetchArchived({limit:100,...(before?{before}:{})}).catch(()=>null);if(!archived||!archived.threads.size)break;for(const t of archived.threads.values())existing.add(t.name);before=archived.threads.last()?.archiveTimestamp;if(!archived.hasMore)break;}
 for(const vehicle of catalog[spec.name]){
 if(existing.has(vehicle)){skipped++;continue;}
 await channel.threads.create({name:vehicle,message:{content:'**'+vehicle+'**\\nJimbo Customs vehicle listing. Add vehicle photos, details and discussion in this post.'},reason:'Jimbo Customs catalog import'});posts++;
 }
 }
 await i.editReply('Jimbo Customs created: role '+role.name+', '+made+' new channels, '+posts+' vehicle posts ('+skipped+' already existed). Original vehicle channels were left untouched. Use Jimbo Customs for membership and Jimbo Customs Staff for private ticket access. Ticket department is available in JTZ.');
 }catch(e){console.error('JTZ Customs setup',e);await i.editReply('Jimbo Customs setup stopped: '+e.message+' (existing work was preserved).').catch(()=>{});}
});}
