import { ChannelType, PermissionFlagsBits as P } from 'discord.js';
import { randomInt } from 'node:crypto';
import { roles, categories } from './plan.js';
import { isOwner, personalGuildId } from './config.js';

const previews = new Map();
const running = new Set();
const EXPIRY = 10 * 60 * 1000;
export const rebuildCommand = {
 name: 'jtz-rebuild',
 description: 'Owner-only Jimma Lounge destructive rebuild (preview and confirmation)',
 default_member_permissions: P.Administrator.toString(),
 options: [
  {type:1,name:'preview',description:'List every channel/category that would be deleted'},
  {type:1,name:'confirm',description:'Confirm a recent preview using its one-time code',
   options:[{type:3,name:'code',description:'One-time code from /jtz-rebuild preview',required:true}]}
 ]
};
const snapshot = guild => [...guild.channels.cache.values()]
 .map(c=>({id:c.id,name:c.name,type:c.type,parentId:c.parentId||''}))
 .sort((a,b)=>a.id.localeCompare(b.id));
const signature = items => JSON.stringify(items);
const paginate = (lines,limit=1050) => {
 const pages=[];let page='';
 for(const line of lines){if((page+'\n'+line).length>limit){if(page)pages.push(page);page='';}page+=(page?'\n':'')+line;}
 if(page)pages.push(page);return pages.length?pages:['(none)'];
};
async function sendPages(i,title,lines) {
 const pages=paginate(lines);
 await i.editReply(title+'\n'+pages[0]);
 for(let n=1;n<pages.length;n++) await i.followUp({content:'**Deletion preview '+(n+1)+'/'+pages.length+'**\n'+pages[n],flags:64});
}
export function attachRebuild(client) {
 client.on('interactionCreate',async i=>{
  if(!i.isChatInputCommand()||i.commandName!=='jtz-rebuild')return;
  if(!i.inGuild()||i.guildId!==personalGuildId||!isOwner(i.user.id))
   return i.reply({content:'Only the Jimma Lounge owner can use this command in Jimma Lounge.',flags:64});
  await i.deferReply({flags:64});
  const guild=i.guild;
  if(running.has(guild.id))return i.editReply('A rebuild is already running.');
  try {
   await guild.channels.fetch();
   const current=snapshot(guild);
   const action=i.options.getSubcommand();
   if(action==='preview'){
    const code=String(randomInt(100000,1000000));
    previews.set(guild.id,{owner:i.user.id,code,expires:Date.now()+EXPIRY,signature:signature(current)});
    const count=categories.reduce((n,c)=>n+c.channels.length+(c.voice?.length||0),0);
    const lines=current.map(c=>(c.type===ChannelType.GuildCategory?'📁 ':c.type===ChannelType.GuildForum?'🗂️ ':c.type===ChannelType.GuildVoice?'🔊 ':'# ')+c.name+' ('+c.id+')');
    await sendPages(i,'**JIMMA LOUNGE — DESTRUCTIVE REBUILD PREVIEW**\n'+current.length+' existing channels/categories would be permanently deleted, including their messages, attachments, threads and forum posts.\nReplacement: '+roles.length+' roles, '+categories.length+' categories, '+count+' text/voice channels; Jimbo Customs forums and catalog are imported separately using /jtz-customs apply.\n**Nothing has been changed.**\n\n**One-time code: '+code+'** (expires in 10 minutes). Only confirm after reviewing ALL pages.\n**Channels slated for deletion:**',lines);
    return;
   }
   const code=i.options.getString('code',true);
   const approval=previews.get(guild.id);
   if(!approval||approval.owner!==i.user.id||approval.code!==code||Date.now()>approval.expires)
    return i.editReply('Confirmation refused: missing, expired, or incorrect preview code. Run /jtz-rebuild preview again.');
   if(signature(current)!==approval.signature)
    return i.editReply('Confirmation refused: channels changed since preview. Run /jtz-rebuild preview again.');
   const me=await guild.members.fetchMe();
   if(!me.permissions.has([P.ManageChannels,P.ManageRoles]))
    return i.editReply('Confirmation refused: JTZ requires Manage Channels and Manage Roles.');
   if(categories.some(c=>c.channels.length+(c.voice?.length||0)>50))
    return i.editReply('Confirmation refused: one of the planned categories exceeds 50 channels.');
   previews.delete(guild.id);
   running.add(guild.id);
   await i.editReply('Confirmed. Starting the Jimma Lounge rebuild. Old channel messages and forum posts cannot be recovered. Progress will be reported here if Discord permits.');
   await guild.roles.fetch();
   const roleMap=new Map();
   for(const name of roles){
    let role=guild.roles.cache.find(r=>r.name===name&&!r.managed);
    if(!role)role=await guild.roles.create({name,reason:'Owner-confirmed Jimma Lounge rebuild'});
    roleMap.set(name,role);
   }
   let deleted=0,created=0;
   const failures=[];
   for(const c of current.filter(c=>c.type!==ChannelType.GuildCategory)){
    try{const ch=await guild.channels.fetch(c.id).catch(()=>null);if(ch){await ch.delete('Owner-confirmed Jimma Lounge rebuild');deleted++;}}
    catch(e){failures.push('Delete '+c.name+': '+e.message);break;}
   }
   if(!failures.length)for(const c of current.filter(c=>c.type===ChannelType.GuildCategory)){
    try{const ch=await guild.channels.fetch(c.id).catch(()=>null);if(ch){await ch.delete('Owner-confirmed Jimma Lounge rebuild');deleted++;}}
    catch(e){failures.push('Delete '+c.name+': '+e.message);break;}
   }
   // If deletion fails, stop rather than creating a partial duplicate layout.
   if(failures.length)return i.editReply('Rebuild stopped after deleting '+deleted+' channels/categories. '+failures[0]+'. Inspect the server before retrying.');
   for(const spec of categories){
    try{
     const overwrites=spec.roles?[{id:guild.roles.everyone.id,deny:[P.ViewChannel]},...spec.roles.map(name=>({id:roleMap.get(name)?.id,allow:[P.ViewChannel]})).filter(x=>x.id)]:undefined;
     const parent=await guild.channels.create({name:spec.name,type:ChannelType.GuildCategory,permissionOverwrites:overwrites,reason:'Owner-confirmed Jimma Lounge rebuild'});created++;
     for(const name of spec.channels){
      await guild.channels.create({name,type:ChannelType.GuildText,parent:parent.id,reason:'Owner-confirmed Jimma Lounge rebuild'});created++;
     }
     for(const name of spec.voice||[]){
      await guild.channels.create({name,type:ChannelType.GuildVoice,parent:parent.id,reason:'Owner-confirmed Jimma Lounge rebuild'});created++;
     }
    }catch(e){failures.push(spec.name+': '+e.message);break;}
   }
   await i.editReply('Jimma Lounge rebuild '+(failures.length?'stopped with an error':'finished')+'. Deleted '+deleted+' old channels/categories; created '+created+' new channels/categories.'+(failures.length?' Error: '+failures[0]:'')+'\nNext: /jtz-customs apply (repeat in batches for vehicle forum posts). Review permissions, onboarding, and welcome/ticket panels.');
  }catch(e){console.error('JTZ rebuild failed',e);await i.editReply('Rebuild error: '+e.message).catch(console.error);}
  finally{running.delete(guild.id);}
 });
}
