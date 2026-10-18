import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { token, clientId, guildIds } from './config.js';
import { securityCommand } from './security.js';
import { welcomeCommand } from './welcome.js';
import { lockdownCommand } from './lockdown.js';
import { honeypotCommand } from './honeypot.js';
import { ticketCommand } from './tickets.js';
import { terminalCommand, terminalAdminCommand } from './terminal.js';
if (!token || !clientId || !guildIds.length) throw new Error('Configure DISCORD_TOKEN, CLIENT_ID and ALLOWED_GUILD_IDS');
const cmd = new SlashCommandBuilder().setName('jtz-setup').setDescription('Preview or build the Jimma Lounge server layout')
 .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
 .addSubcommand(s => s.setName('preview').setDescription('Preview planned roles and channels'))
 .addSubcommand(s => s.setName('apply').setDescription('Create missing roles and channels'))
 .addSubcommand(s => s.setName('restyle-preview').setDescription('Preview Jimma Lounge styled names'))
 .addSubcommand(s => s.setName('restyle-apply').setDescription('Apply Jimma Lounge channel styling'));
const rest = new REST({version:'10'}).setToken(token);
const bot = await rest.get(Routes.user('@me'));
console.log('Authenticated Discord bot:', bot.username, 'user ID:', bot.id);
if (bot.id !== clientId) throw new Error('CLIENT_ID does not match the Discord bot authenticated by DISCORD_TOKEN.');
const accessible = await rest.get(Routes.userGuilds());
console.log('Guilds accessible to bot:', accessible.map(g => ({id:g.id,name:g.name})));
let failures = 0;
for (const id of guildIds) {
 if (!accessible.some(g=>g.id===id)) {
  console.error('JTZ cannot see approved guild', id, '- confirm the bot is actually installed in this exact server.');
  failures++;
  continue;
 }
 try {
  const registered = await rest.put(Routes.applicationGuildCommands(clientId, id), {body:[cmd.toJSON(),securityCommand,welcomeCommand,lockdownCommand,honeypotCommand,ticketCommand,terminalCommand,terminalAdminCommand]});
  const verified = await rest.get(Routes.applicationGuildCommands(clientId, id));
  for (const command of registered) {
   if (!verified.some(c => c.name === command.name)) throw new Error('Missing registered command: '+command.name);
  }
  console.log('Verified Discord guild commands in',id,':',verified.map(c=>'/'+c.name).join(', '));
 } catch (err) {
  failures++;
  console.error('Could not register JTZ commands in guild',id,'Discord code:',err.code,'status:',err.status,'message:',err.message);
 }
}

if (failures) throw new Error(`Command registration failed for ${failures} approved guild(s).`);
