import { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType } from 'discord.js';
import { token, isApproved } from './config.js';
import { roles, categories } from './plan.js';
if (!token) throw new Error('DISCORD_TOKEN is required');
const client = new Client({intents:[GatewayIntentBits.Guilds]});
client.once('ready', () => console.log('JTZ ready as', client.user.tag));
client.on('guildCreate', async guild => {
 if (!isApproved(guild.id)) await guild.leave().catch(console.error);
});
client.on('interactionCreate', async interaction => {
 if (!interaction.isChatInputCommand() || interaction.commandName !== 'jtz-setup') return;
 if (!interaction.inGuild() || !isApproved(interaction.guildId)) return interaction.reply({content:'This server is not approved for JTZ.',ephemeral:true});
 if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({content:'Administrator permission required.',ephemeral:true});
 const action = interaction.options.getSubcommand();
 if (action === 'preview') return interaction.reply({content:'**Planned roles:** '+roles.join(', ')+'\n**Planned categories:** '+categories.map(c=>c.name+' ('+c.channels.join(', ')+')').join('\n'),ephemeral:true});
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
   if (!parent) {parent = await guild.channels.create({name:category.name,type:ChannelType.GuildCategory,permissionOverwrites:overwrites,reason:'JTZ initial server setup'});created++;}
   for (const name of category.channels) {
    if (!guild.channels.cache.some(c => c.parentId === parent.id && c.name === name)) {
     await guild.channels.create({name,type:ChannelType.GuildText,parent:parent.id,reason:'JTZ initial server setup'});
     created++;
    }
   }
  }
  await interaction.editReply('JTZ setup complete. Created '+created+' channels/categories (plus any missing roles). Existing channels were preserved. Check permissions and native Onboarding before inviting members.');
 } catch(err) {console.error(err);await interaction.editReply('Setup stopped: '+err.message);}
});
client.login(token);
