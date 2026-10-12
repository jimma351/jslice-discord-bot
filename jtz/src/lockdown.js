import {ChannelType,PermissionFlagsBits} from 'discord.js';
import {isApproved} from './config.js';
import {styledCategory,styledChannel} from './restyle.js';
const P=PermissionFlagsBits;
const publicNames=new Set(['welcome','rules','open-a-ticket','verify-here']);
const protectedCategories=['💬 NXGC COMMUNITY','📸 NXGC MEDIA','🚓 FIVEM ROLEPLAY','🧟 DAYZ','⚔️ AION2'];
const publicExtras=new Set(['announcements','choose-your-games']);
const match=(name,plain)=>name===plain||name===styledCategory(plain)||name===styledChannel(plain);
const findRole=(g,n)=>g.roles.cache.find(r=>r.name===n);
const findCategory=(g,n)=>g.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&match(c.name,n));
const findText=(g,n)=>g.channels.cache.find(c=>c.type===ChannelType.GuildText&&match(c.name,n));
export const lockdownCommand={name:'jtz-lockdown',description:'Preview or apply verification-first channel access',default_member_permissions:P.Administrator.toString(),options:[{type:1,name:'preview',description:'Show changes without modifying permissions'},{type:1,name:'apply',description:'Restrict community and game channels to Verified'}]};
export function attachLockdown(client){
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
   const changes=[],errors=[],action=i.options.getSubcommand();
   const set=async(c,kind)=>{
    changes.push(kind+': '+c.name);
    if(action==='preview')return;
    try{
     // Edit only visibility on @everyone and Verified, preserving other overwrites.
     await c.permissionOverwrites.edit(g.id,{ViewChannel:false},{reason:'JTZ verification-first lockdown'});
     await c.permissionOverwrites.edit(verified.id,{ViewChannel:true},{reason:'JTZ verification-first lockdown'});
    }catch(e){errors.push(c.name+': '+e.message);}
   };
   for(const n of protectedCategories){
    const cat=findCategory(g,n);
    if(!cat){errors.push('Missing category '+n);continue;}
    await set(cat,'Protected category');
    for(const c of g.channels.cache.filter(c=>c.parentId===cat.id).values()){
     if(publicNames.has([...publicNames].find(n=>match(c.name,n))))continue;
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
   const msg='**JTZ Lockdown '+(action==='preview'?'Preview':'Applied')+'**\n'+changes.map(x=>'• '+x).join('\n')+'\n\n'+(errors.length?'**Review:** '+errors.join(' | '):'No missing targets or edit errors.')+'\n\nNote: Discord Administrator permissions bypass channel restrictions. Existing staff overwrites are preserved. Game roles alone do not unlock these channels; Verified does.';
   await i.editReply(msg.slice(0,1950));
  }catch(e){await i.editReply('Lockdown failed: '+e.message);}
 });
}
