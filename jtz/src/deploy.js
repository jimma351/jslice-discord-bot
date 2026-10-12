import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { token, clientId, guildIds } from './config.js';
import { securityCommand } from './security.js';
import { welcomeCommand } from './welcome.js';
import { lockdownCommand } from './lockdown.js';
if (!token || !clientId || !guildIds.length) throw new Error('Configure DISCORD_TOKEN, CLIENT_ID and ALLOWED_GUILD_IDS');
const cmd = new SlashCommandBuilder().setName('jtz-setup').setDescription('Preview or build the NXGC server layout')
 .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
 .addSubcommand(s => s.setName('preview').setDescription('Preview planned roles and channels'))
 .addSubcommand(s => s.setName('apply').setDescription('Create missing roles and channels'))
 .addSubcommand(s => s.setName('restyle-preview').setDescription('Preview NXGC styled names'))
 .addSubcommand(s => s.setName('restyle-apply').setDescription('Apply NXGC channel styling'));
const rest = new REST({version:'10'}).setToken(token);
const bot = await rest.get(Routes.user('@me'));
console.log('Authenticated Discord bot:', bot.username, 'user ID:', bot.id);
if (bot.id !== clientId) throw new Error('CLIENT_ID does not match the Discord bot authenticated by DISCORD_TOKEN.');
const accessible = await rest.get(Routes.userGuilds());
console.log('Guilds accessible to bot:', accessible.map(g => ({id:g.id,name:g.name})));
for (const id of guildIds) {
 if (!accessible.some(g=>g.id===id)) {
  console.error('JTZ cannot see approved guild', id, '- confirm the bot is actually installed in this exact server.');
  continue;
 }
 try {
  await rest.put(Routes.applicationGuildCommands(clientId, id), {body:[cmd.toJSON(),securityCommand,welcomeCommand,lockdownCommand]});
  console.log('Registered JTZ commands in',id);
 } catch (err) {
  console.error('Could not register JTZ commands in guild',id,'Discord code:',err.code,'status:',err.status,'message:',err.message);
 }
}
