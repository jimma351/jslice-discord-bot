import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { categories } from './plan.js';
const alphabet='abcdefghijklmnopqrstuvwxyz';
const double=['𝕒','𝕓','𝕔','𝕕','𝕖','𝕗','𝕘','𝕙','𝕚','𝕛','𝕜','𝕝','𝕞','𝕟','𝕠','𝕡','𝕢','𝕣','𝕤','𝕥','𝕦','𝕧','𝕨','𝕩','𝕪','𝕫'];
const soft=['ᥲ','b','c','d','ᥱ','f','g','h','ι','j','k','ᥣ','m','n','o','ρ','q','r','s','t','u','v','w','x','ყ','z'];
const convert=(s,letters)=>[...s.toLowerCase()].map(c=>alphabet.includes(c)?letters[alphabet.indexOf(c)]:c).join('');
const icons={welcome:'👋',rules:'📜',announcements:'📢',general:'💬',suggestions:'💡','open-a-ticket':'🎫','verify-here':'✅','choose-your-games':'🎮','irl-photos':'📷','irl-videos':'🎥','game-screenshots':'📸','game-clips':'🎬',memes:'😂','server-status':'🟢','bug-reports':'🐛','scripts-and-resources':'📦','dev-projects':'🧩','moderation-logs':'🛡️','jtz-security-alerts':'🚨',tickets:'🎟️'};
const icon=n=>icons[n]||(n.includes('announcements')?'📢':n.includes('media')?'📸':n.includes('logs')?'📋':n.includes('chat')?'💬':n.includes('voice')?'🔊':n.includes('chill')?'🎮':'💬');
export const styledChannel=(n,voice=false)=>icon(n.toLowerCase())+'・'+convert(n.replaceAll('-',' '),soft).replaceAll(' ',voice?' ':'-');
export const styledCategory=n=>{const parts=n.split(' ');return parts[0]+' ┃ '+convert(parts.slice(1).join(' '),double);};
const logNames=['inventory-logs','banking-logs','garage-logs','police-logs','medical-logs','housing-logs','dealership-logs','admin-logs'];
const logCategory='🔗 ┃ '+convert('Quasar Webhooks',double);
export async function restyle(interaction,preview=false){
 if(preview)return interaction.reply({content:'**Preview only:**\n'+categories.map(c=>styledCategory(c.name)+' → '+c.channels.slice(0,2).map(n=>styledChannel(n)).join(', ')).join('\n')+'\n**Private Quasar logs:** '+logNames.map(n=>styledChannel(n)).join(', '),ephemeral:true});
 await interaction.deferReply({ephemeral:true});
 try{
 const guild=interaction.guild,me=await guild.members.fetchMe();
 if(!me.permissions.has(PermissionFlagsBits.ManageChannels))throw Error('JTZ needs Manage Channels.');
 await guild.channels.fetch();await guild.roles.fetch();
 let renamed=0,created=0;const missing=[];
 for(const spec of categories){
  const target=styledCategory(spec.name);
  const parent=guild.channels.cache.find(ch=>ch.type===ChannelType.GuildCategory&&(ch.name===spec.name||ch.name===target));
  if(!parent){missing.push(spec.name);continue;}
  for(const [names,type] of [[spec.channels,ChannelType.GuildText],[spec.voice||[],ChannelType.GuildVoice]]){
   for(const old of names){
    const next=styledChannel(old,type===ChannelType.GuildVoice);
    const ch=guild.channels.cache.find(ch=>ch.parentId===parent.id&&ch.type===type&&(ch.name===old||ch.name===next));
    if(!ch){missing.push(old);continue;}
    if(ch.name!==next){await ch.setName(next,'JTZ restyle');renamed++;}
   }
  }
  if(parent.name!==target){await parent.setName(target,'JTZ restyle');renamed++;}
 }
 const access=['Executive','Lead Dev'].map(n=>guild.roles.cache.find(r=>r.name===n)).filter(Boolean);
 if(access.length!==2)throw Error('Executive and Lead Dev roles are required.');
 const overwrites=[{id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},...access.map(r=>({id:r.id,allow:[PermissionFlagsBits.ViewChannel]}))];
 let parent=guild.channels.cache.find(ch=>ch.type===ChannelType.GuildCategory&&ch.name===logCategory);
 if(!parent){parent=await guild.channels.create({name:logCategory,type:ChannelType.GuildCategory,permissionOverwrites:overwrites});created++;}
 for(const name of logNames){
  const next=styledChannel(name);
  if(!guild.channels.cache.some(ch=>ch.parentId===parent.id&&ch.type===ChannelType.GuildText&&ch.name===next)){
   await guild.channels.create({name:next,type:ChannelType.GuildText,parent:parent.id,permissionOverwrites:overwrites});created++;
  }
 }
 await interaction.editReply('Renamed '+renamed+' existing channels/categories. Created '+created+' private logging placeholders. No webhooks generated.'+(missing.length?' Missing original names: '+missing.slice(0,15).join(', '):''));
 }catch(e){console.error('Restyle error',e);await interaction.editReply('Restyle stopped: '+e.message);}
}
