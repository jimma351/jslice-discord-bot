import {ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,StringSelectMenuBuilder,PermissionFlagsBits,MessageFlags} from 'discord.js';
import {fileURLToPath} from 'node:url';
import {isApproved} from './config.js';
import {styledChannel} from './restyle.js';
import {gameChoices,switchGameRoles} from './game-roles.js';

const P=PermissionFlagsBits;
const bannerPath=fileURLToPath(new URL('../assets/nexus-gaming-hub.png',import.meta.url));
const bannerFile=()=>({attachment:bannerPath,name:'nexus-gaming-hub.png'});
const games=['FiveM','DayZ','Aion2'];
const hasGame=(member,name)=>member.roles.cache.some(r=>r.name===name||r.name===name+' Access'||r.name==='All Games');
const isVerified=m=>m.roles.cache.some(r=>r.name==='Verified');
const isDev=m=>m.permissions.has(P.Administrator)||m.roles.cache.some(r=>['Developer','Lead Dev','Executive'].includes(r.name));
const gameMenu=game=>new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('jtzv2_game').setPlaceholder('🎮 Switch game roles & channels').addOptions(gameChoices.map(g=>({label:g,value:g,default:g===game,emoji:g==='FiveM'?'🚓':g==='DayZ'?'🧟':g==='Aion2'?'⚔️':'🌐'}))));
const channelLink=(member,name)=>{
 const channel=member.guild.channels.cache.find(c=>(c.name===name||c.name===styledChannel(name))&&c.permissionsFor(member)?.has(P.ViewChannel));
 return channel?'<#'+channel.id+'>':'the '+name+' channel';
};
const nav=()=>new ActionRowBuilder().addComponents(
 new ButtonBuilder().setCustomId('jtzv2_dashboard').setLabel('Dashboard').setStyle(ButtonStyle.Primary),
 new ButtonBuilder().setCustomId('jtzv2_bio').setLabel('Player Bio').setStyle(ButtonStyle.Secondary),
 new ButtonBuilder().setCustomId('jtzv2_support').setLabel('Open Support').setStyle(ButtonStyle.Secondary),
 new ButtonBuilder().setCustomId('jtzv2_events').setLabel('Events').setStyle(ButtonStyle.Secondary));
const devNav=()=>new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('jtzv2_dev').setLabel('Dev Center').setStyle(ButtonStyle.Secondary));
const supportMenu=game=>new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('jtz_ticket_department').setPlaceholder('Choose your ticket type').addOptions([{label:'Development Support',value:'dev',emoji:'💻'},{label:'Community Support',value:(games.includes(game)?game.toLowerCase():'general')+'_community',emoji:'🎮'},{label:'Report a Player',value:'report',emoji:'🚨'},{label:'Report a Bug',value:(games.includes(game)?game.toLowerCase():'general')+'_bug',emoji:'🐛'}]));
const view=(member,game,tab)=>{
 const title={dashboard:'Command Center',bio:'Player Bio Studio',support:'Support Center',events:'Community Events',dev:'Development Center'}[tab]||'Command Center';
 let description='';
 if(tab==='bio')description='**NXGC PLAYER BIO STUDIO**\\n\\nCustomize your banner, avatar, gaming moments, achievements, goals, and group affiliation in the visual editor preview.\\n\\n**Current status:** The editor prototype is saved in the JTZ GitHub repository but is not yet hosted as a website. Browser drafts and image replacements work in the prototype; Discord account saving and publishing are not connected.\\n\\n**Next step:** Staff will provide the hosted editor link once deployment is ready.';
 else if(tab==='support')description='**'+game+' Support**\nSelect a ticket type below. JTZ will create a private ticket routed to the appropriate staff team.\n\n💻 Development Support\n🎮 Community Support\n🚨 Report a Player\n🐛 Report a Bug';
 else if(tab==='events')description='Community events and registration will appear here when an events source is connected. For now, check your game announcements.';
 else if(tab==='dev')description=isDev(member)?'Developer access confirmed. Your private development channels are controlled by Discord permissions; project tools and release checklists are planned.':'🔒 Developer access required. This panel does not grant access to private channels.';
 else description='**Game:** '+game+'\n**Game role:** '+(hasGame(member,game)?'Assigned':'Choose your roles in '+channelLink(member,'choose-your-games'))+'\n**Live server status:** Not connected\n\nYour personalized Nexus Gaming Hub hub. The game menu browses this terminal; channel access follows Discord permissions. Choose a section below.';
 const embed=new EmbedBuilder().setColor(tab==='bio'||tab==='dev'?0xa855f7:0x22d3ee)
  .setAuthor({name:member.displayName||member.user?.username||'Nexus Player'})
  .setTitle('NEXUS GAMING HUB • '+title).setDescription(description)
  .setImage('attachment://nexus-gaming-hub.png')
  .setFooter({text:'Nexus Gaming Hub • '+game+' • Your private player space'});
 const avatar=member.displayAvatarURL?.({size:256});
 if(avatar)embed.setThumbnail(avatar);
 if(tab==='dashboard')embed.setDescription('Choose a game below to switch your game roles and channels. **All Games** shows all three game areas. Community channels stay available; staff permissions may keep extra channels visible.').addFields(
  {name:'🎮 GAME SPACE',value:game,inline:true},
  {name:'🛡️ MEMBER STATUS',value:isVerified(member)?'Verified':'Administrator',inline:true},
  {name:'🔑 GAME ROLE',value:hasGame(member,game)?'Assigned':'Not assigned',inline:true},
  {name:'🌌 YOUR GAMES',value:games.filter(g=>hasGame(member,g)).map(g=>'\x60'+g+'\x60').join('  ')||'Choose your roles in '+channelLink(member,'choose-your-games'),inline:true},
  {name:'📅 JOINED',value:member.joinedAt?'<t:'+Math.floor(member.joinedAt.getTime()/1000)+':D>':'Unknown',inline:true},
  {name:'📡 SERVER STATUS',value:'Not connected yet',inline:true},
  {name:'EXPLORE YOUR HUB',value:'**Player Bio** · Customizable gaming profile\n**Support** · Open a private ticket\n**Events** · Community updates\n**Dev Center** · Development access'});
 return embed;
};
export const terminalCommand={name:'jtz-terminal',description:'Open your private Nexus Gaming Hub player terminal'};
export const terminalAdminCommand={name:'jtzv2-panel',description:'Post the Nexus Gaming Hub Player Terminal launch button',default_member_permissions:P.Administrator.toString()};
export function attachTerminal(client){
 client.on('interactionCreate',async i=>{
  if(!i.inGuild()||!isApproved(i.guildId))return;
  const open=i.isChatInputCommand()&&i.commandName==='jtz-terminal';
  const panel=i.isChatInputCommand()&&i.commandName==='jtzv2-panel';
  const btn=i.isButton()&&['open','dashboard','bio','support','events','dev'].some(tab=>i.customId==='jtzv2_'+tab);
  const menu=i.isStringSelectMenu()&&i.customId==='jtzv2_game';
  if(!open&&!panel&&!btn&&!menu)return;
  try{
   if(panel){
    if(!i.memberPermissions?.has(P.Administrator))return i.reply({content:'Administrator required.',ephemeral:true});
    await i.deferReply({flags:MessageFlags.Ephemeral});
    await i.channel.send({files:[bannerFile()],embeds:[new EmbedBuilder().setTitle('NEXUS GAMING HUB').setColor(0x22d3ee).setImage('attachment://nexus-gaming-hub.png').setDescription('Your personalized gaming hub. Open your dashboard, private support tickets, events, and developer tools. The terminal is private to each member.')],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('jtzv2_open').setLabel('Open My Terminal').setStyle(ButtonStyle.Primary))]});
    return i.editReply({content:'Nexus Gaming Hub launch panel posted.'});
   }
   // Only update private terminal messages; the shared launch panel stays public.
   const update=(menu||(btn&&i.customId!=='jtzv2_open'))&&i.message?.flags.has(MessageFlags.Ephemeral);
   if(update)await i.deferUpdate();
   else await i.deferReply({flags:MessageFlags.Ephemeral});
   let member=await i.guild.members.fetch(i.user.id);
   if(!isVerified(member)&&!member.permissions.has(P.Administrator))return i.editReply({content:'Please verify in '+channelLink(member,'verify-here')+' before using the Nexus Gaming Hub terminal.',embeds:[],components:[]});
   if(menu){
    try { member=await switchGameRoles(i.guild,i.user.id,i.values[0]); }
    catch(error){return await i.editReply({content:'Game roles were not switched. '+error.message,embeds:[],components:[],attachments:[]});}
   }
   const owned=games.filter(g=>hasGame(member,g));
   const game=member.roles.cache.some(r=>r.name==='All Games')?'All Games':owned.length===1?owned[0]:'Choose a game';
   const tab=btn&&i.customId!=='jtzv2_open'?i.customId.slice('jtzv2_'.length):'dashboard';
   return await i.editReply({content:menu?'Game roles updated: **'+game+'**. Community channels stay available. Staff and administrator permissions can keep other channels visible.':null,attachments:[],files:[bannerFile()],embeds:[view(member,game,tab)],components:[gameMenu(game),nav(),devNav(),...(tab==='support'?[supportMenu(game)]:[])]});
  }catch(e){
   console.error('JTZV2 terminal',e);
   const content='Terminal unavailable. Please try /jtz-terminal again or contact staff.';
   if(i.deferred||i.replied)await i.editReply({content,embeds:[],components:[]}).catch(()=>{});
   else await i.reply({content,flags:MessageFlags.Ephemeral}).catch(()=>{});
  }
 });
}

