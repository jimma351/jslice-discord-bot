import {ChannelType,PermissionFlagsBits} from 'discord.js';
import {isApproved} from './config.js';
import {styledCategory,styledChannel} from './restyle.js';
const P=PermissionFlagsBits;
const publicNames=new Set(['welcome','rules','open-a-ticket','verify-here']);
const protectedCategories=['💬 NXGC COMMUNITY','📸 NXGC MEDIA','🚓 FIVEM ROLEPLAY','🧟 DAYZ','⚔️ AION2'];
const publicExtras=new Set(['announcements','choose-your-games']);
const games={'🚓 FIVEM ROLEPLAY':['FiveM','FiveM Access'],'🧟 DAYZ':['DayZ','DayZ Access'],'⚔️ AION2':['Aion2','Aion2 Access']};
const match=(name,plain)=>name===plain||name===styledCategory(plain)||name===styledChannel(plain);
const findRole=(g,n)=>g.roles.cache.find(r=>r.name===n);
const findCategory=(g,n)=>g.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&match(c.name,n));
const findText=(g,n)=>g.channels.cache.find(c=>c.type===ChannelType.GuildText&&match(c.name,n));
export const lockdownCommand={name:'jtz-lockdown',description:'Preview or apply verification-first channel access',default_member_permissions:P.Administrator.toString(),options:[{type:1,name:'preview',description:'Show changes without modifying permissions'},{type:1,name:'apply',description:'Restrict community and game channels to Verified'}]};
export function attachLockdown(client){
 const sync=async member=>{
  if(!isApproved(member.guild.id)||member.user.bot)return;
  const verified=findRole(member.guild,'Verified');
  if(!verified)return;
  for(const [cat,[game,access]] of Object.entries(games)){
   const role=findRole(member.guild,access);
   if(!role)continue;
   const gameRole=findRole(member.guild,game),allRole=findRole(member.guild,'All Games');
   const should=member.roles.cache.has(verified.id)&&((gameRole&&member.roles.cache.has(gameRole.id))||(allRole&&member.roles.cache.has(allRole.id)));
   if(should&&!member.roles.cache.has(role.id))await member.roles.add(role,'JTZ verified game access');
   else if(!should&&member.roles.cache.has(role.id))await member.roles.remove(role,'JTZ game access revoked');
  }
 };
 client.on('guildMemberUpdate',async(oldM,newM)=>{if(oldM.roles.cache.size===newM.roles.cache.size&&[...oldM.roles.cache.keys()].every(id=>newM.roles.cache.has(id)))return;await sync(newM).catch(e=>console.error('JTZ game sync:',e.message));});
 client.on('guildMemberAdd',m=>sync(m).catch(e=>console.error('JTZ game join sync:',e.message)));

 client.on('interactionCreate',async i=>{
  if(!i.isChatInputCommand()||i.commandName!=='jtz-lockdown')return;
  if(!i.inGuild()||!isApproved(i.guildId))return i.reply({content:'Not an approved guild.',ephemeral:true});
  if(!i.memberPermissions?.has(P.Administrator))return i.reply({content:'Administrator required.',ephemeral:true});
  await i.deferReply({ephemeral:true});
  try{
   const g=i.guild;await g.channels.fetch();await g.roles.fetch();
   const verified=findRole(g,'Verified'),me=await g.members.fetchMe();
   if(!verified)throw Error('Verified role missing. Run /jtz-setup apply first.');
   if(!me.permissions.has(P.ManageChannels))throw Error('JTZ needs Manage Channels.');
   if(!me.permissions.has(P.ManageRoles))throw Error('JTZ needs Manage Roles.');
   const changes=[],errors=[],action=i.options.getSubcommand();
   const accessRoles={};
   for(const [cat,[game,access]] of Object.entries(games)){
    let r=findRole(g,access);
    if(action==='apply'&&!r)r=await g.roles.create({name:access,permissions:[],reason:'JTZ verified '+game+' access'});
    accessRoles[cat]=r;
    changes.push((r?'Use':'Create')+' gated role: '+access);
   }
   const set=async(c,kind)=>{
    changes.push(kind+': '+c.name);
    if(action==='preview')return;
    try{
     // Edit only visibility on @everyone and Verified, preserving other overwrites.
     await c.permissionOverwrites.edit(g.id,{ViewChannel:false},{reason:'JTZ verification-first lockdown'});
     const game=Object.keys(games).find(cat=>{const parent=c.type===ChannelType.GuildCategory?c:c.parent;return parent&&match(parent.name,cat);});
     await c.permissionOverwrites.edit(verified.id,{ViewChannel:game?null:true},{reason:'JTZ verification-first lockdown'});
     if(game)await c.permissionOverwrites.edit(accessRoles[game].id,{ViewChannel:true},{reason:'JTZ verified game-only access'});
     for(const n of ['FiveM','DayZ','Aion2','All Games','Announcements','No Announcements','Unverified']){
      const r=findRole(g,n);if(r&&c.permissionOverwrites.cache.get(r.id)?.allow.has(P.ViewChannel))await c.permissionOverwrites.edit(r.id,{ViewChannel:null},{reason:'JTZ prevent pre-verification role access'});
     }
    }catch(e){errors.push(c.name+': '+e.message);}
   };
   for(const n of protectedCategories){
    const cat=findCategory(g,n);
    if(!cat){errors.push('Missing category '+n);continue;}
    await set(cat,'Protected category');
    for(const c of g.channels.cache.filter(c=>c.parentId===cat.id).values()){
     if([...publicNames].some(n=>match(c.name,n)))continue;
     await set(c,'Protected channel');
    }
   }
   // Public entry points are explicitly visible even inside restricted categories.
   for(const n of publicNames){
    const c=findText(g,n);
    if(!c){errors.push('Missing public channel '+n);continue;}
    changes.push('Public entry: '+c.name);
    if(action==='apply')try{await c.permissionOverwrites.edit(g.id,{ViewChannel:true},{reason:'JTZ public verification entry'});}catch(e){errors.push(c.name+': '+e.message);}
   }
   // Additional channels in welcome category should not leak to unverified members.
   for(const n of publicExtras){
    const c=findText(g,n);
    if(c)await set(c,'Protected welcome channel');
   }
   if(action==='apply'){
    await g.members.fetch();
    for(const m of g.members.cache.values())await sync(m).catch(e=>errors.push('Member '+m.id+': '+e.message));
   }
   const msg='**JTZ Lockdown '+(action==='preview'?'Preview':'Applied')+'**\n'+changes.map(x=>'• '+x).join('\n')+'\n\n'+(errors.length?'**Review:** '+errors.join(' | '):'No missing targets or edit errors.')+'\n\nNote: Discord Administrator permissions bypass channel restrictions. Existing staff overwrites are preserved. Game categories require Verified plus the selected game (or All Games), through managed access roles.';
   await i.editReply(msg.slice(0,1950));
  }catch(e){await i.editReply('Lockdown failed: '+e.message);}
 });
}
