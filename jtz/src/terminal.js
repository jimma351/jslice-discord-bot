import {ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,StringSelectMenuBuilder,PermissionFlagsBits} from 'discord.js';
import {isApproved} from './config.js';

const P=PermissionFlagsBits;
const games=['FiveM','DayZ','Aion2'];
const rolesForGame=(g,name)=>[name,name+' Access','All Games'].some(r=>g.roles.cache.some(x=>x.name===r));
const hasGame=(member,name)=>member.roles.cache.some(r=>r.name===name||r.name===name+' Access'||r.name==='All Games');
const isVerified=m=>m.roles.cache.some(r=>r.name==='Verified');
const isDev=m=>m.permissions.has(P.Administrator)||m.roles.cache.some(r=>['Developer','Lead Dev','Executive'].includes(r.name));
const gameMenu=()=>new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('jtzv2_game').setPlaceholder('Choose a game').addOptions(games.map(g=>({label:g,value:g,emoji:g==='FiveM'?'🚓':g==='DayZ'?'🧟':'⚔️'}))));
const nav=()=>new ActionRowBuilder().addComponents(
 new ButtonBuilder().setCustomId('jtzv2_dashboard').setLabel('Dashboard').setStyle(ButtonStyle.Primary),
 new ButtonBuilder().setCustomId('jtzv2_passport').setLabel('Passport').setStyle(ButtonStyle.Secondary),
 new ButtonBuilder().setCustomId('jtzv2_support').setLabel('Support').setStyle(ButtonStyle.Secondary),
 new ButtonBuilder().setCustomId('jtzv2_events').setLabel('Events').setStyle(ButtonStyle.Secondary),
 new ButtonBuilder().setCustomId('jtzv2_dev').setLabel('Dev Center').setStyle(ButtonStyle.Secondary));
const view=(member,game,tab)=>{
 const title={dashboard:'Command Center',passport:'Gaming Passport',support:'Support Center',events:'Community Events',dev:'Development Center'}[tab]||'Command Center';
 let description='';
 if(tab==='passport') description='**Member:** <@'+member.id+'>\n**Verification:** '+(isVerified(member)?'Verified':'Not verified')+'\n**Games:** '+(games.filter(g=>hasGame(member,g)).join(', ')||'None selected')+'\n**Member since:** '+(member.joinedAt?'<t:'+Math.floor(member.joinedAt.getTime()/1000)+':D>':'Unknown')+'\nAchievements: Coming in a future update.';
 else if(tab==='support')description='Use the **NXGC Support Center** in #open-a-ticket to create a private department ticket. Your ticket is visible only to you and authorized support staff.';
 else if(tab==='events')description='Community events and registration will appear here when an events source is connected. For now, check your game announcements.';
 else if(tab==='dev')description=isDev(member)?'Developer access confirmed. Your private development channels are controlled by Discord permissions; project tools and release checklists are planned.':'🔒 Developer access required. This panel does not grant access to private channels.';
 else description='**Game:** '+game+'\n**Access:** '+(hasGame(member,game)&&isVerified(member)?'Enabled':'Select this game and verify to unlock channels')+'\n**Live server status:** Not connected\n\nYour personalized NXGC hub. Choose a section below.';
 return new EmbedBuilder().setColor(0x5865f2).setTitle('🎮 NXGC | '+title).setDescription(description).setFooter({text:'JTZV2 Player Terminal • '+game});
};
export const terminalCommand={name:'jtz-terminal',description:'Open your private NXGC player terminal'};
export const terminalAdminCommand={name:'jtzv2-panel',description:'Post the NXGC Player Terminal launch button',default_member_permissions:P.Administrator.toString()};
export function attachTerminal(client){
 client.on('interactionCreate',async i=>{
  if(!i.inGuild()||!isApproved(i.guildId))return;
  const open=i.isChatInputCommand()&&i.commandName==='jtz-terminal';
  const panel=i.isChatInputCommand()&&i.commandName==='jtzv2-panel';
  const btn=i.isButton()&&i.customId.startsWith('jtzv2_');
  const menu=i.isStringSelectMenu()&&i.customId==='jtzv2_game';
  if(!open&&!panel&&!btn&&!menu)return;
  try{
   if(panel){
    if(!i.memberPermissions?.has(P.Administrator))return i.reply({content:'Administrator required.',ephemeral:true});
    await i.channel.send({embeds:[new EmbedBuilder().setTitle('🎮 NXGC | Player Terminal').setColor(0x5865f2).setDescription('Your personalized gaming hub. Open your dashboard, passport, support, events, and developer tools. The terminal is private to each member.')],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('jtzv2_open').setLabel('Open My Terminal').setStyle(ButtonStyle.Primary))]});
    return i.reply({content:'JTZV2 launch panel posted.',ephemeral:true});
   }
   const member=await i.guild.members.fetch(i.user.id);
   if(!isVerified(member)&&!member.permissions.has(P.Administrator))return i.reply({content:'Please verify in #verify-here before using the NXGC terminal.',ephemeral:true});
   let game=games.find(g=>hasGame(member,g))||'FiveM';
   if(menu){game=i.values[0];if(!games.includes(game))return i.reply({content:'Invalid game.',ephemeral:true});}
   const tab=btn&&i.customId!=='jtzv2_open'?i.customId.slice('jtzv2_'.length):'dashboard';
   const payload={embeds:[view(member,game,tab)],components:[gameMenu(),nav()],ephemeral:true};
   if(btn||menu)return i.reply(payload);
   return i.reply(payload);
  }catch(e){console.error('JTZV2 terminal',e);if(!i.replied&&!i.deferred)await i.reply({content:'Terminal unavailable: '+e.message,ephemeral:true}).catch(()=>{});}
 });
}
