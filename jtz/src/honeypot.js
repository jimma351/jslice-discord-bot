import {isOwner} from './config.js';
import {ChannelType,PermissionFlagsBits} from 'discord.js';
import {isApproved} from './config.js';
const P=PermissionFlagsBits;
const NAME='do-not-type-ban',MARK='JTZ_HONEYPOT_MODE=';
const find=g=>g.channels.cache.find(c=>c.type===ChannelType.GuildText&&(c.name===NAME||c.topic?.includes(MARK)));
const mode=c=>c?.topic?.match(/JTZ_HONEYPOT_MODE=(test|armed)/)?.[1]||'off';
const staff=['Executive','Lead Dev','Discord Staff','Admin','Staff'];
const verifiedRoles=['Verified'];
const log=async(g,text)=>{
 const ch=g.channels.cache.find(c=>c.type===ChannelType.GuildText&&(c.name==='jtz-security-alerts'||c.name.includes('security-alerts')));
 if(ch)await ch.send({content:text,allowedMentions:{parse:[]}}).catch(e=>console.error('Honeypot log:',e.message));
 else console.warn('JTZ honeypot log channel missing',g.id,text);
};
export const honeypotCommand={name:'jtz-honeypot',description:'Set up and safely test the NXGC honeypot',default_member_permissions:P.Administrator.toString(),options:[
 {type:1,name:'preview',description:'Inspect honeypot setup and current mode'},
 {type:1,name:'setup',description:'Create honeypot in test mode (no bans)'},
 {type:1,name:'arm',description:'Enable automatic bans for unverified messages'},
 {type:1,name:'disarm',description:'Return honeypot to test mode (no bans)'}]};
export function attachHoneypot(client){
 client.on('messageCreate',async m=>{
  if(!m.guild||!isApproved(m.guild.id)||m.author.bot||m.webhookId)return;
  const trap=find(m.guild);
  if(!trap||m.channelId!==trap.id||mode(trap)==='off')return;
  const member=await m.guild.members.fetch(m.author.id).catch(()=>null);
  if(!member)return;
  if(member.permissions.has(P.Administrator)||member.roles.cache.some(r=>staff.includes(r.name)||verifiedRoles.includes(r.name)))return;
  const detail='User: '+m.author.tag+' ('+m.author.id+') | Channel: <#'+trap.id+'> | Message ID: '+m.id+' | Time: <t:'+Math.floor(Date.now()/1000)+':F>';
  if(mode(trap)==='test')return log(m.guild,'**HONEYPOT TEST — no ban**\n'+detail);
  const me=await m.guild.members.fetchMe().catch(()=>null);
  if(!me?.permissions.has(P.BanMembers)||!member.bannable)return log(m.guild,'**HONEYPOT BAN FAILED — permissions/hierarchy**\n'+detail);
  try{
   await member.ban({deleteMessageSeconds:0,reason:'JTZ honeypot: unverified member posted in #do-not-type-ban'});
   await log(m.guild,'**HONEYPOT AUTO-BAN**\n'+detail);
  }catch(e){await log(m.guild,'**HONEYPOT BAN ERROR**\n'+detail+' | '+e.message);}
 });
 client.on('interactionCreate',async i=>{
  if(!i.isChatInputCommand()||i.commandName!=='jtz-honeypot')return;
  if(!isOwner(i.user.id))return i.reply({content:'JTZ management is owner-only.',flags:64});
  if(!i.inGuild()||!isApproved(i.guildId))return i.reply({content:'Not an approved server.',ephemeral:true});
  if(!i.memberPermissions?.has(P.Administrator))return i.reply({content:'Administrator required.',ephemeral:true});
  await i.deferReply({ephemeral:true});
  try{
   const g=i.guild,action=i.options.getSubcommand();
   await g.channels.fetch();await g.roles.fetch();
   let trap=find(g);
   if(action==='preview')return i.editReply('**JTZ Honeypot**\nChannel: '+(trap?'<#'+trap.id+'>':'missing')+'\nMode: **'+mode(trap)+'**\nVerified users and staff exempt. Test mode only logs. Arm enables automatic bans.\nRequires Manage Channels and Ban Members, plus correct bot role hierarchy.');
   const me=await g.members.fetchMe();
   if(!me.permissions.has(P.ManageChannels))throw Error('JTZ needs Manage Channels.');
   if(action==='setup'){
    if(!trap){
     const category=g.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&c.name.toLowerCase().includes('welcome'));
     const allow=[...new Set(staff)].map(n=>g.roles.cache.find(r=>r.name===n)).filter(Boolean);
     const overwrites=[{id:g.id,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory]},...allow.map(r=>({id:r.id,allow:[P.ViewChannel]})),...verifiedRoles.map(n=>g.roles.cache.find(r=>r.name===n)).filter(Boolean).map(r=>({id:r.id,deny:[P.ViewChannel]}))];
     trap=await g.channels.create({name:NAME,type:ChannelType.GuildText,parent:category?.id,topic:MARK+'test | JTZ trap: posting is prohibited',permissionOverwrites:overwrites,reason:'JTZ honeypot test setup'});
    }else{
     await trap.setTopic(MARK+'test | JTZ trap: posting is prohibited');
    }
    return i.editReply('Honeypot ready in **TEST MODE**: <#'+trap.id+'>. Messages by unverified members are logged, NOT banned. Test with a non-staff account, then use /jtz-honeypot arm.');
   }
   if(!trap)throw Error('Run /jtz-honeypot setup first.');
   if(action==='arm'){
    if(!me.permissions.has(P.BanMembers))throw Error('JTZ needs Ban Members.');
    if(!g.channels.cache.some(c=>c.type===ChannelType.GuildText&&(c.name==='jtz-security-alerts'||c.name.includes('security-alerts'))))throw Error('Security alert log channel missing.');
    await trap.setTopic(MARK+'armed | JTZ trap: posting is prohibited');
    return i.editReply('**HONEYPOT ARMED.** Any message from an unverified non-staff member in <#'+trap.id+'> will trigger an immediate ban. Test mode has ended.');
   }
   await trap.setTopic(MARK+'test | JTZ trap: posting is prohibited');
   return i.editReply('Honeypot disarmed: **TEST MODE**, no automatic bans.');
  }catch(e){await i.editReply('Honeypot error: '+e.message);}
 });
}
