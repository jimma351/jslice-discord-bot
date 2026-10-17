import { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { token, isApproved } from './config.js';
import { roles, categories } from './plan.js';
import { restyle, styledCategory, styledChannel } from './restyle.js';
import { attachSecurity, securityCommand } from './security.js';
import { attachWelcome, welcomeCommand } from './welcome.js';
import { attachLockdown, lockdownCommand } from './lockdown.js';
import { attachHoneypot, honeypotCommand } from './honeypot.js';
import { attachTickets, ticketCommand } from './tickets.js';
import { attachTerminal, terminalCommand, terminalAdminCommand } from './terminal.js';
if (!token) throw new Error('DISCORD_TOKEN is required');
const client = new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.GuildModeration,...(process.env.JTZ_MEMBER_EVENTS==='true'?[GatewayIntentBits.GuildMembers]:[])]});
attachSecurity(client);
attachWelcome(client);
attachLockdown(client);
attachHoneypot(client);
attachTickets(client);
attachTerminal(client);
client.once('clientReady', async () => {
 console.log('JTZ ready as', client.user.tag);
 console.log('JTZ guilds:', client.guilds.cache.map(g => g.name + ' (' + g.id + ')').join(', ') || 'NONE');
 for (const guild of client.guilds.cache.values()) {
  if (!isApproved(guild.id)) continue;
  try {
   const registered = await guild.commands.set([securityCommand,welcomeCommand,lockdownCommand,honeypotCommand,ticketCommand,terminalCommand,terminalAdminCommand,{name:'jtz-setup',description:'Preview or create NXGC server roles and channels',default_member_permissions:PermissionFlagsBits.Administrator.toString(),options:[{type:1,name:'preview',description:'Preview server setup'},{type:1,name:'apply',description:'Create missing roles and channels'},{type:1,name:'restyle-preview',description:'Preview channel font changes'},{type:1,name:'restyle-apply',description:'Rename existing channels and create private QS log placeholders'}]}]);
   const verified = await guild.commands.fetch();
   for (const command of registered.values()) {
    if (!verified.some(c => c.name === command.name)) throw new Error('Missing registered command: '+command.name);
   }
   console.log('Verified Discord guild commands in',guild.name,guild.id,':',verified.map(c=>'/'+c.name).join(', '));
  } catch (error) { console.error('Failed to register /jtz-setup:',guild.id,error.code,error.message); }
 }
});
client.on('guildCreate', async guild => {
 if (!isApproved(guild.id)) await guild.leave().catch(console.error);
});
client.on('interactionCreate', async interaction => {
 if (interaction.isButton() || interaction.isStringSelectMenu()) {
  if (!interaction.inGuild() || !isApproved(interaction.guildId)) return;
  const guild=interaction.guild;
  try {
   if (interaction.customId==='jtz_games') {
    const selected=interaction.values;
    const member=await guild.members.fetch(interaction.user.id);
    for (const name of ['FiveM','DayZ','Aion2','All Games']) {
     const role=guild.roles.cache.find(r=>r.name===name);
     if (role) {if(selected.includes(name)) await member.roles.add(role); else await member.roles.remove(role);}
    }
    return interaction.reply({content:'Game roles updated: '+(selected.join(', ')||'none'),ephemeral:true});
   }
   if (interaction.customId==='jtz_verify') {
    await interaction.deferReply({flags:64});
    const member=await guild.members.fetch(interaction.user.id);
    const verified=guild.roles.cache.find(r=>r.name==='Verified');
    const unverified=guild.roles.cache.find(r=>r.name==='Unverified');
    if (verified) await member.roles.add(verified);
    if (unverified) await member.roles.remove(unverified);
    return interaction.editReply({content:'Verified! Welcome to NXGC.'});
   }
   if (interaction.customId==='jtz_announcements') {
    const member=await guild.members.fetch(interaction.user.id);
    const role=guild.roles.cache.find(r=>r.name==='Announcements');
    if (!role) return interaction.reply({content:'Announcements role not found.',ephemeral:true});
    const had=member.roles.cache.has(role.id);
    if(had) await member.roles.remove(role); else await member.roles.add(role);
    return interaction.reply({content:'Announcement pings '+(had?'disabled':'enabled'),ephemeral:true});
   }
   if (interaction.customId==='jtz_ticket') {
    await interaction.deferReply({ephemeral:true});
    const existing=guild.channels.cache.find(ch=>ch.topic==='JTZ ticket owner: '+interaction.user.id);
    if(existing) return interaction.editReply('Your ticket is already open: '+existing.toString());
    const parent=guild.channels.cache.find(ch=>(ch.name==='🛡️ STAFF & SECURITY'||ch.name===styledCategory('🛡️ STAFF & SECURITY')) && ch.type===ChannelType.GuildCategory);
    const ticketAccess=['Staff','Discord Staff','Lead Dev','Executive'].map(name=>guild.roles.cache.find(r=>r.name===name)).filter(Boolean);
    const overwrites=[{id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},{id:interaction.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}];
    for(const role of ticketAccess) overwrites.push({id:role.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]});
    const ch=await guild.channels.create({name:'ticket-'+interaction.user.id,type:ChannelType.GuildText,parent:parent?.id,topic:'JTZ ticket owner: '+interaction.user.id,permissionOverwrites:overwrites});
    await ch.send({content:'Support ticket for <@'+interaction.user.id+'>. Staff will assist you here.',components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('jtz_close_ticket').setLabel('Close ticket').setStyle(ButtonStyle.Danger))]});
    return interaction.editReply('Ticket opened: '+ch.toString());
   }
   if (interaction.customId==='jtz_close_ticket') {
    const owner=interaction.channel?.topic?.replace('JTZ ticket owner: ','');
    if(!owner || (interaction.user.id!==owner && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels))) return interaction.reply({content:'Only the ticket owner or staff with Manage Channels can close this.',ephemeral:true});
    await interaction.reply({content:'Closing ticket.',ephemeral:true});
    return interaction.channel.delete('JTZ ticket closed');
   }
  } catch(e) {console.error('JTZ interaction error',e);if(interaction.deferred) return interaction.editReply('Action failed: '+e.message);return interaction.reply({content:'Action failed: '+e.message,ephemeral:true}).catch(()=>{});}
 }

 if (!interaction.isChatInputCommand() || interaction.commandName !== 'jtz-setup') return;
 if (!interaction.inGuild() || !isApproved(interaction.guildId)) return interaction.reply({content:'This server is not approved for JTZ.',ephemeral:true});
 if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({content:'Administrator permission required.',ephemeral:true});
 const action = interaction.options.getSubcommand();
 if (action === 'restyle-preview') return restyle(interaction,true);
 if (action === 'restyle-apply') return restyle(interaction,false);
 if (action === 'preview') return interaction.reply({content:'**Planned roles:** '+roles.join(', ')+'\n**Planned categories:** '+categories.map(c=>c.name+' ('+c.channels.join(', ')+(c.voice?.length?' | Voice: '+c.voice.join(', '):'')+')').join('\n'),ephemeral:true});
 await interaction.deferReply({ephemeral:true});
 try {
  const guild = interaction.guild;
  const me = await guild.members.fetchMe();
  if (!me.permissions.has([PermissionFlagsBits.ManageRoles,PermissionFlagsBits.ManageChannels])) throw new Error('JTZ needs Manage Roles and Manage Channels permissions.');
  await guild.roles.fetch();
  await guild.channels.fetch();
  const roleMap = new Map();
  for (const name of roles) {
   let role = guild.roles.cache.find(r => r.name === name && !r.managed);
   if (!role) role = await guild.roles.create({name,reason:'JTZ initial server setup'});
   roleMap.set(name,role);
  }
  let created = 0;
  for (const category of categories) {
   let parent = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === category.name);
   const overwrites = category.roles ? [
    {id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},
    ...category.roles.map(name => ({id:roleMap.get(name).id,allow:[PermissionFlagsBits.ViewChannel]}))
   ] : undefined;
   if (!parent) {parent = await guild.channels.create({name:category.name,type:ChannelType.GuildCategory,permissionOverwrites:overwrites,reason:'JTZ initial server setup'});created++;} else if (overwrites) {await parent.permissionOverwrites.set(overwrites,'JTZ role access update');}
   for (const name of category.voice || []) {
   if (!guild.channels.cache.some(c => c.parentId === parent.id && c.name === name && c.type === ChannelType.GuildVoice)) {
    await guild.channels.create({name,type:ChannelType.GuildVoice,parent:parent.id,permissionOverwrites:overwrites,reason:'JTZ voice rooms'});
    created++;
   }
  }
  for (const name of category.channels) {
    if (!guild.channels.cache.some(c => c.parentId === parent.id && c.name === name)) {
     await guild.channels.create({name,type:ChannelType.GuildText,parent:parent.id,permissionOverwrites:overwrites,reason:'JTZ initial server setup'});
     created++;
    }
   }
  }
  const panels = [
   {name:'choose-your-games',text:'Choose your games and announcement notifications below.',components:[new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('jtz_games').setPlaceholder('Choose your games').setMinValues(0).setMaxValues(4).addOptions([{label:'FiveM',value:'FiveM'},{label:'DayZ',value:'DayZ'},{label:'Aion2',value:'Aion2'},{label:'All Games',value:'All Games'}])),new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('jtz_announcements').setLabel('Toggle announcement pings').setStyle(ButtonStyle.Secondary))]},
   {name:'verify-here',text:'Read the server rules, then click Verify to receive the Verified role.',components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('jtz_verify').setLabel('Verify').setStyle(ButtonStyle.Success))]},
   {name:'open-a-ticket',text:'Need help? Open a private support ticket.',components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('jtz_ticket').setLabel('Open ticket').setStyle(ButtonStyle.Primary))]}
  ];
  for (const panel of panels) {
   const channel = guild.channels.cache.find(ch=>(ch.name===panel.name||ch.name===styledChannel(panel.name)) && ch.type===ChannelType.GuildText);
   if (channel) await channel.send({content:panel.text,components:panel.components});
  }
  await interaction.editReply('JTZ setup complete. Created '+created+' channels/categories (plus any missing roles). Existing channels were preserved. Check permissions and native Onboarding before inviting members.');
 } catch(err) {console.error(err);await interaction.editReply('Setup stopped: '+err.message);}
});
client.on('error',error=>console.error('JTZ Discord client error:',error));
client.login(token);
