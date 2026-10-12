import { GatewayIntentBits, PermissionFlagsBits, ChannelType } from 'discord.js';
import { isApproved } from './config.js';
const joins=new Map(), floods=new Map(), alertTimes=new Map(), destructiveEvents=new Map();
const securityRoles=['Executive','Lead Dev','Discord Staff'];
const findLog=(guild,name)=>guild.channels.cache.find(c=>c.type===ChannelType.GuildText&&(c.name===name||c.name.includes(name)));
const post=async(guild,title,details,urgent=false)=>{
 const ch=findLog(guild,urgent?'jtz-security-alerts':'moderation-logs')||findLog(guild,'jtz-security-alerts');
 if(!ch)return;
 await ch.send({content:'**'+title+'**\n'+details,allowedMentions:{parse:[]}}).catch(e=>console.error('Security log:',e.message));
};
const guard=g=>g&&isApproved(g.id);
const exempt=member=>member.permissions.has(PermissionFlagsBits.Administrator)||member.roles.cache.some(r=>securityRoles.includes(r.name));
export const securityCommand={name:'jtz-security',description:'Show JTZ security status (monitoring only)',default_member_permissions:PermissionFlagsBits.ManageGuild.toString()};
const destructive=async(guild,kind,detail)=>{
 const now=Date.now(),key=guild.id;
 const recent=(destructiveEvents.get(key)||[]).filter(t=>now-t<60000);
 recent.push(now);destructiveEvents.set(key,recent);
 await post(guild,kind,detail,true);
 if(recent.length>=3&&now-(alertTimes.get(key+':nuke')||0)>120000){
  alertTimes.set(key+':nuke',now);
  await post(guild,'POSSIBLE SERVER NUKE',recent.length+' destructive channel/role events within 60 seconds. Inspect Discord Audit Log immediately. JTZ has not changed permissions or punished anyone.',true);
 }
};
export function attachSecurity(client){
 client.on('guildMemberAdd',async member=>{
  if(!guard(member.guild)||member.user.bot)return;
  const now=Date.now(),id=member.guild.id;
  const arr=(joins.get(id)||[]).filter(t=>now-t<60000);arr.push(now);joins.set(id,arr);
  const age=Math.floor((now-member.user.createdTimestamp)/86400000);
  await post(member.guild,'Member joined','User: <@'+member.id+'> | Account age: '+age+' days'+(age<7?' | **NEW ACCOUNT**':''),age<7);
  if(arr.length>=8 && now-(alertTimes.get(id)||0)>120000){
   alertTimes.set(id,now);
   await post(member.guild,'POSSIBLE RAID','Detected '+arr.length+' member joins in 60 seconds. Review new members and consider Discord verification / raid protection. No automatic punishment was applied.',true);
  }
 });
 client.on('guildMemberRemove',m=>{if(guard(m.guild)&&!m.user.bot)post(m.guild,'Member left','User: '+m.user.tag+' ('+m.id+')');});
 client.on('guildBanAdd',b=>{if(guard(b.guild))post(b.guild,'Member banned','User: '+b.user.tag+' ('+b.user.id+')',true);});
 client.on('guildBanRemove',b=>{if(guard(b.guild))post(b.guild,'Member unbanned','User: '+b.user.tag+' ('+b.user.id+')');});
 client.on('channelDelete',c=>{if(guard(c.guild))destructive(c.guild,'CHANNEL DELETED','Channel: '+c.name+' ('+c.id+')');});
 client.on('roleDelete',r=>{if(guard(r.guild))destructive(r.guild,'ROLE DELETED','Role: '+r.name+' ('+r.id+')');});
 client.on('roleUpdate',(oldRole,newRole)=>{
  if(!guard(newRole.guild))return;
  const added=newRole.permissions.remove(oldRole.permissions);
  const dangerous=[PermissionFlagsBits.Administrator,PermissionFlagsBits.ManageGuild,PermissionFlagsBits.ManageRoles,PermissionFlagsBits.ManageChannels,PermissionFlagsBits.ManageWebhooks,PermissionFlagsBits.BanMembers];
  const grants=dangerous.filter(p=>!oldRole.permissions.has(p)&&newRole.permissions.has(p));
  if(grants.length)post(newRole.guild,'DANGEROUS ROLE PERMISSION GRANTED','Role: '+newRole.name+' ('+newRole.id+') | Newly granted: '+grants.map(p=>Object.entries(PermissionFlagsBits).find(([,v])=>v===p)?.[0]||String(p)).join(', '),true);
 });
 client.on('channelUpdate',(before,after)=>{
  if(!guard(after.guild)||!before.permissionOverwrites?.cache||!after.permissionOverwrites?.cache)return;
  const oldEveryone=before.permissionOverwrites.cache.get(after.guild.id);
  const newEveryone=after.permissionOverwrites.cache.get(after.guild.id);
  if(oldEveryone?.deny.has(PermissionFlagsBits.ViewChannel)&&!newEveryone?.deny.has(PermissionFlagsBits.ViewChannel)){
   post(after.guild,'PRIVATE CHANNEL VISIBILITY CHANGED','Channel: '+after.name+' ('+after.id+') | @everyone ViewChannel deny removed. Review access.',true);
  }
 });
 client.on('messageCreate',async msg=>{
  if(!guard(msg.guild)||msg.author.bot||!msg.member||exempt(msg.member))return;
  if(msg.channel?.topic?.startsWith('JTZ ticket owner:'))return;
  const key=msg.guild.id+':'+msg.author.id,now=Date.now();
  const recent=(floods.get(key)||[]).filter(t=>now-t<8000);recent.push(now);floods.set(key,recent);
  if(recent.length>=7&&now-(alertTimes.get(key)||0)>60000){
   alertTimes.set(key,now);
   await post(msg.guild,'Possible message flood','User: <@'+msg.author.id+'> | Channel: <#'+msg.channel.id+'> | '+recent.length+' messages in 8 seconds. Review manually.',true);
  }
  if(msg.mentions.users.size+msg.mentions.roles.size>=8&&now-(alertTimes.get(key+':mention')||0)>60000){
   alertTimes.set(key+':mention',now);
   await post(msg.guild,'Possible mass mentions','User: <@'+msg.author.id+'> | Channel: <#'+msg.channel.id+'>. Review manually.',true);
  }
 });
 client.on('interactionCreate',async i=>{
  if(!i.isChatInputCommand()||i.commandName!=='jtz-security')return;
  if(!i.inGuild()||!isApproved(i.guildId))return i.reply({content:'Not an approved guild.',ephemeral:true});
  if(!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild))return i.reply({content:'Manage Server permission required.',ephemeral:true});
  return i.reply({content:'**JTZ Security — Phase 1**\n• Member join/leave and ban logging: active when bot permissions allow\n• New account and 8-joins/60s raid alerts: enabled\n• Channel/role deletion alerts and 3-deletions/60s anti-nuke warnings: enabled\n• Dangerous role permission grants and private-channel visibility alerts: enabled\n• Message flood (7 in 8s) and mass-mention alerts: enabled when Message Content and relevant intents are available\n• Automatic kicks/bans/deletions: **OFF**\n• Logs: existing private moderation-logs / jtz-security-alerts channels\n• Full control panel, ticket tiers, applications and persistent moderation records: not yet implemented.',ephemeral:true});
 });
}
