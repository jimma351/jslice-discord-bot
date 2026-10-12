import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { isApproved } from './config.js';
import { styledCategory, styledChannel } from './restyle.js';

const adminRoles=['Executive','Lead Dev','Discord Staff','Admin','FiveM Admin','DayZ Admin','Aion2 Admin'];
const locate=(guild,name)=>guild.channels.cache.find(c=>c.type===ChannelType.GuildText&&(c.name===name||c.name===styledChannel(name)));
const category=(guild,name)=>guild.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&(c.name===name||c.name===styledCategory(name)));
const send=async(channel,content)=>{if(channel)await channel.send({content,allowedMentions:{parse:[]}}).catch(e=>console.error('JTZ welcome/leave message:',e.message));};

export const welcomeCommand={
 name:'jtz-welcome',description:'Configure NXGC welcome and private leave channels',
 default_member_permissions:PermissionFlagsBits.Administrator.toString(),
 options:[{type:1,name:'setup',description:'Create welcome and staff-only leave channels safely'}]
};

export function attachWelcome(client){
 client.on('guildMemberAdd',async member=>{
  if(!isApproved(member.guild.id)||member.user.bot)return;
  await send(locate(member.guild,'welcome'),'👋 **Welcome to NXGC, '+member.user.username.replaceAll('*','')+'!**\nGlad to have you here, <@'+member.id+'>. Please read the rules, visit verification, and choose your game roles.');
 });
 client.on('guildMemberRemove',async member=>{
  if(!isApproved(member.guild.id)||member.user.bot)return;
  await send(locate(member.guild,'member-leaves'),'📤 **Member left NXGC**\nUser: '+member.user.tag+'\nID: '+member.id+'\nJoined: '+(member.joinedTimestamp?'<t:'+Math.floor(member.joinedTimestamp/1000)+':R>':'Unknown'));
 });
 client.on('interactionCreate',async i=>{
  if(!i.isChatInputCommand()||i.commandName!=='jtz-welcome')return;
  if(!i.inGuild()||!isApproved(i.guildId))return i.reply({content:'Not an approved server.',ephemeral:true});
  if(!i.memberPermissions?.has(PermissionFlagsBits.Administrator))return i.reply({content:'Administrator required.',ephemeral:true});
  await i.deferReply({ephemeral:true});
  try{
   const guild=i.guild,me=await guild.members.fetchMe();
   if(!me.permissions.has(PermissionFlagsBits.ManageChannels))throw Error('JTZ requires Manage Channels.');
   await guild.channels.fetch();await guild.roles.fetch();
   const welcomeParent=category(guild,'📢 WELCOME & INFORMATION');
   const staffParent=category(guild,'🛡️ STAFF & SECURITY');
   const staff=adminRoles.map(name=>guild.roles.cache.find(r=>r.name===name)).filter(Boolean);
   if(!staff.length)throw Error('No Admin or Executive roles found. Run /jtz-setup apply first.');
   const allow=[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory];
   const privateOverwrites=[{id:guild.id,deny:[PermissionFlagsBits.ViewChannel]},...staff.map(r=>({id:r.id,allow}))];
   let welcome=locate(guild,'welcome');
   if(!welcome)welcome=await guild.channels.create({name:styledChannel('welcome'),type:ChannelType.GuildText,parent:welcomeParent?.id,reason:'JTZ public welcome channel'});
   let leave=locate(guild,'member-leaves');
   if(!leave)leave=await guild.channels.create({name:styledChannel('member-leaves'),type:ChannelType.GuildText,parent:staffParent?.id,permissionOverwrites:privateOverwrites,reason:'JTZ private staff leave channel'});
   else await leave.permissionOverwrites.set(privateOverwrites,'JTZ enforce staff-only leave channel');
   await i.editReply('Welcome channel: '+welcome.toString()+' (existing visibility preserved)\nPrivate leave channel: '+leave.toString()+' (restricted to Admin, department admins, Discord Staff, Lead Dev, Executive).\nJTZ will post join/leave messages when member events are enabled. Administrator-level permissions can still override channel restrictions.');
  }catch(e){console.error('JTZ welcome setup',e);await i.editReply('Setup failed: '+e.message);}
 });
}
