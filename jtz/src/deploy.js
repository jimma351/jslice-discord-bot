import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { token, clientId, guildIds } from './config.js';
if (!token || !clientId || !guildIds.length) throw new Error('Configure DISCORD_TOKEN, CLIENT_ID and ALLOWED_GUILD_IDS');
const cmd = new SlashCommandBuilder().setName('jtz-setup').setDescription('Preview or build the NXGC server layout')
 .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
 .addSubcommand(s => s.setName('preview').setDescription('Preview planned roles and channels'))
 .addSubcommand(s => s.setName('apply').setDescription('Create missing roles and channels'));
const rest = new REST({version:'10'}).setToken(token);
const bot = await rest.get(Routes.user('@me'));
console.log('Authenticated Discord bot:', bot.username, 'user ID:', bot.id);
if (bot.id !== clientId) throw new Error('CLIENT_ID does not match the Discord bot authenticated by DISCORD_TOKEN. Check Developer Portal > General Information > Application ID for the EXISTING bot tied to this token. No tokens should be pasted into chat.');
for (const id of guildIds) {
 await rest.put(Routes.applicationGuildCommands(clientId, id), {body:[cmd.toJSON()]});
 console.log('Registered JTZ commands in',id);
}
