import {isOwner} from './config.js';
import {ActionRowBuilder,ButtonBuilder,ButtonStyle,ChannelType,EmbedBuilder,PermissionFlagsBits,StringSelectMenuBuilder,AttachmentBuilder,ModalBuilder,TextInputBuilder,TextInputStyle} from 'discord.js';
import {isApproved} from './config.js';
import {styledChannel} from './restyle.js';
const P=PermissionFlagsBits;
const departments={
 customs:{label:'🔧 Jimbo Customs Support',roles:['Jimbo Customs Staff','Executive']},
 fivem:{label:'🚓 FiveM Support',roles:['FiveM Admin','Executive']},
 dayz:{label:'🧟 DayZ Support',roles:['DayZ Admin','Executive']},
 aion2:{label:'⚔️ Aion2 Support',roles:['Aion2 Admin','Executive']},
 report:{label:'🛡️ Player / Staff Report',roles:['Discord Staff','Executive']},
 dev:{label:'💻 Development Support',roles:['Lead Dev','Executive']},
 executive:{label:'👑 Executive / Confidential',roles:['Executive']},
 general:{label:'🎫 General Support',roles:['Discord Staff','Executive']}
};
const tag='JTZ-TICKET:';
const info=c=>{try{return JSON.parse(c?.topic?.startsWith(tag)?c.topic.slice(tag.length):'null');}catch{return null;}};
const find=(g,name)=>g.channels.cache.find(c=>c.type===ChannelType.GuildText&&(c.name===name||c.name===styledChannel(name)));
const staffRoles=(g,d)=>departments[d].roles.map(n=>g.roles.cache.find(r=>r.name===n)).filter(Boolean);
const staff=(m,d)=>m.permissions.has(P.Administrator)||staffRoles(m.guild,d).some(r=>m.roles.cache.has(r.id));
const buttons=(closed=false)=>new ActionRowBuilder().addComponents(
 new ButtonBuilder().setCustomId('jtz_t_claim').setLabel('Claim').setStyle(ButtonStyle.Primary).setDisabled(closed),
 new ButtonBuilder().setCustomId('jtz_t_add').setLabel('Add Member').setStyle(ButtonStyle.Secondary).setDisabled(closed),
 new ButtonBuilder().setCustomId(closed?'jtz_t_reopen':'jtz_t_close').setLabel(closed?'Reopen':'Close').setStyle(closed?ButtonStyle.Success:ButtonStyle.Danger));
const panel=()=>new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('jtz_ticket_department').setPlaceholder('Select a support department').addOptions(Object.entries(departments).map(([value,d])=>({label:d.label,value,description:'Private '+d.label.replace(/^[^ ]+ /,'')+' ticket'}))));
const reply=async(i,s)=>i.deferred||i.replied?i.editReply(s):i.reply({content:s,ephemeral:true});
const logs=g=>find(g,'tickets')||find(g,'moderation-logs');
const archive=async(g,dept)=>{
 const name=dept+'-ticket-archives';
 let c=g.channels.cache.find(c=>c.type===ChannelType.GuildText&&c.name===name);
 const roles=staffRoles(g,dept);
 if(!roles.length)throw Error('No department archive roles available.');
 const perms=[{id:g.id,deny:[P.ViewChannel]},...roles.map(r=>({id:r.id,allow:[P.ViewChannel,P.ReadMessageHistory,P.SendMessages,P.CreatePublicThreads,P.SendMessagesInThreads]}))];
 if(!c)c=await g.channels.create({name,type:ChannelType.GuildText,permissionOverwrites:perms});
 else await c.permissionOverwrites.set(perms,'JTZ private archive permissions');
 return c;
};
const archiveTicket=async(g,dept,data,transcript,ch)=>{
 const parent=await archive(g,dept);
 const post=await parent.send({content:'**Closed ticket** | '+departments[dept].label+' | Owner: <@'+data.owner+'> | Closed by: <@'+data.closedBy+'> | Ticket: '+ch.id,allowedMentions:{parse:[]}});
 const thread=await post.startThread({name:dept+'-ticket-'+ch.id.slice(-8),autoArchiveDuration:1440});
 await thread.send({content:'Saved transcript ('+transcript.count+' messages, up to 2000).',files:[transcript.file]});
 await thread.setArchived(true);
 return thread;
};
const log=async(g,s)=>{const c=logs(g);if(c)await c.send({content:s,allowedMentions:{parse:[]}}).catch(console.error);};
const save=(c,data)=>c.setTopic(tag+JSON.stringify(data),'JTZ ticket state');
const getTicket=i=>{const data=info(i.channel);return data?.owner&&departments[data.dept]?data:null;};
const makeTranscript=async c=>{
 let before,lines=[],count=0;
 while(count<2000){
  const batch=await c.messages.fetch({limit:100,...(before?{before}:{})});
  if(!batch.size)break;
  for(const m of batch.values()){lines.push(new Date(m.createdTimestamp).toISOString()+' | '+m.author.tag+' ('+m.author.id+'): '+(m.content||'[no text]')+(m.attachments.size?' | Attachments: '+m.attachments.map(a=>a.url).join(' '):''));count++;}
  before=batch.last().id;
  if(batch.size<100)break;
 }
 return {file:new AttachmentBuilder(Buffer.from(lines.reverse().join('\n')||'No messages'),{name:'ticket-'+c.id+'.txt'}),count};
};
export const ticketCommand={name:'jtz-tickets',description:'Manage the Jimma Lounge private ticket system',default_member_permissions:P.Administrator.toString(),options:[
 {type:1,name:'panel',description:'Post the department ticket panel in open-a-ticket'},
 {type:1,name:'status',description:'Check ticket setup and routing'}]};
export function attachTickets(client){
 client.on('interactionCreate',async i=>{
  if(!i.inGuild()||!isApproved(i.guildId))return;
  const cmd=i.isChatInputCommand()&&i.commandName==='jtz-tickets';
  if(cmd&&!isOwner(i.user.id))return i.reply({content:'JTZ management is owner-only.',flags:64});
  const select=i.isStringSelectMenu()&&i.customId==='jtz_ticket_department';
  const btn=i.isButton()&&i.customId.startsWith('jtz_t_');
  const modal=i.isModalSubmit()&&i.customId==='jtz_t_add_submit';
  if(!cmd&&!select&&!btn&&!modal)return;
  try{
   const g=i.guild;
   if(cmd){
    if(!i.memberPermissions?.has(P.Administrator))return i.reply({content:'Administrator required.',ephemeral:true});
    await i.deferReply({ephemeral:true});
    await g.channels.fetch();await g.roles.fetch();
    if(i.options.getSubcommand()==='status'){
     return reply(i,'**JTZ Tickets**\nPanel channel: '+(find(g,'open-a-ticket')?.toString()||'missing')+'\nLog channel: '+(logs(g)?.toString()||'missing')+'\n'+Object.entries(departments).map(([k,d])=>d.label+': '+(staffRoles(g,k).map(r=>r.name).join(', ')||'**NO ROUTING ROLE FOUND**')).join('\n'));
    }
    const ch=find(g,'open-a-ticket');
    if(!ch)throw Error('Cannot find #open-a-ticket.');
    await ch.send({embeds:[new EmbedBuilder().setTitle('🎫 Jimma Lounge | Support Center').setDescription('Select a department below to create a **private** ticket. Only you and that department’s authorized staff can see it. Please do not share sensitive account credentials.').setColor(0x5279d6)],components:[panel()]});
    return reply(i,'Department ticket panel posted in '+ch.toString()+'. The old Open Ticket button remains usable until its message is removed.');
   }
   if(select){
    await i.deferReply({ephemeral:true});
    const choice=i.values[0];
    const match=/^(fivem|dayz|aion2|general|customs)_(community|bug)$/.exec(choice);
    const dept=match?match[1]:choice;
    const kind=match?(match[2]==='bug'?'Bug Report':'Community Support'):choice==='report'?'Player Report':choice==='dev'?'Development Support':null;
    const spec=departments[dept];if(!spec)throw Error('Invalid department.');
    await g.channels.fetch();await g.roles.fetch();
    const member=await g.members.fetch(i.user.id);
    const old=g.channels.cache.find(c=>{const t=info(c);return t&&t.owner===i.user.id&&t.dept===dept&&(!kind||t.kind===kind)&&!t.closed;});
    if(old)return reply(i,'You already have an open '+spec.label+' ticket: '+old.toString());
    const roles=staffRoles(g,dept);
    if(!roles.length)throw Error('No routing roles exist for '+spec.label+'. Ticket not created to prevent privacy mistakes.');
    const me=await g.members.fetchMe();
    if(!me.permissions.has(P.ManageChannels))throw Error('JTZ needs Manage Channels.');
    let parent=g.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&c.name==='🎟️ Jimma Lounge TICKETS');
    if(!parent)parent=await g.channels.create({name:'🎟️ Jimma Lounge TICKETS',type:ChannelType.GuildCategory,permissionOverwrites:[{id:g.id,deny:[P.ViewChannel]}]});
    const access=[{id:g.id,deny:[P.ViewChannel]},{id:i.user.id,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory,P.AttachFiles]},...roles.map(r=>({id:r.id,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory,P.AttachFiles]}))];
    const ch=await g.channels.create({name:'ticket-'+dept+'-'+i.user.id.slice(-6),type:ChannelType.GuildText,parent:parent.id,permissionOverwrites:access,topic:tag+JSON.stringify({owner:i.user.id,dept,kind,closed:false,claimed:null,created:Date.now()})});
    await ch.send({content:'Ticket opened by <@'+i.user.id+'>. Department: **'+spec.label+'**'+(kind?'\nTicket type: **'+kind+'**':'')+'\nDescribe your issue and a team member will respond.',components:[buttons()],allowedMentions:{users:[i.user.id]}});
    await log(g,'**Ticket opened** | '+spec.label+' | '+ch.toString()+' | User: '+i.user.tag+' ('+i.user.id+')');
    return reply(i,'Your private ticket is ready: '+ch.toString());
   }
   const data=getTicket(i);
   if(!data)return i.reply({content:'This is not a JTZ department ticket.',ephemeral:true});
   const member=await g.members.fetch(i.user.id);
   const isStaff=staff(member,data.dept),isOwner=i.user.id===data.owner;
   if(!isStaff&&!isOwner)return i.reply({content:'You do not have permission to manage this ticket.',ephemeral:true});
   if(btn&&i.customId==='jtz_t_add'){
    if(!isStaff)return i.reply({content:'Only department staff can add members.',ephemeral:true});
    const form=new ModalBuilder().setCustomId('jtz_t_add_submit').setTitle('Add Ticket Member').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('member_id').setLabel('Discord user ID').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(17).setMaxLength(20)));
    return i.showModal(form);
   }
   await i.deferReply({ephemeral:true});
   const op=i.customId;
   if(modal){
    if(!isStaff)return reply(i,'Only department staff can add members.');
    if(data.closed)return reply(i,'Ticket is closed.');
    const id=i.fields.getTextInputValue('member_id').trim();
    if(!/^\d{17,20}$/.test(id))return reply(i,'Invalid Discord user ID.');
    const target=await g.members.fetch(id).catch(()=>null);
    if(!target)return reply(i,'That user is not in this server.');
    await i.channel.permissionOverwrites.edit(id,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});
    await log(g,'**Ticket member added** | '+i.channel.toString()+' | Added: '+id+' | By: '+i.user.id);
    return reply(i,'Added <@'+id+'> to this ticket.');
   }
   if(op==='jtz_t_claim'){
    if(!isStaff)return reply(i,'Only assigned department staff can claim tickets.');
    if(data.closed)return reply(i,'This ticket is closed.');
    if(data.claimed&&data.claimed!==i.user.id)return reply(i,'Already claimed by <@'+data.claimed+'>.');
    data.claimed=i.user.id;await save(i.channel,data);
    await i.channel.send('Ticket claimed by <@'+i.user.id+'>.');
    return reply(i,'Ticket claimed.');
   }
   if(op==='jtz_t_close'){
    if(data.closed)return reply(i,'Ticket already closed.');
    data.closed=true;data.closedBy=i.user.id;data.closedAt=Date.now();
    const transcript=await makeTranscript(i.channel);
    await save(i.channel,data);
    await i.channel.permissionOverwrites.edit(data.owner,{ViewChannel:false,SendMessages:false});
    const saved=await archiveTicket(g,data.dept,data,transcript,i.channel);
    await i.channel.send({content:'🔒 Ticket closed by <@'+i.user.id+'>. Authorized staff may reopen it.',components:[buttons(true)]});
    return reply(i,'Ticket closed. Transcript saved to archive thread.');
   }
   if(op==='jtz_t_reopen'){
    if(!isStaff)return reply(i,'Only department staff can reopen a closed ticket.');
    if(!data.closed)return reply(i,'Ticket is already open.');
    data.closed=false;data.claimed=null;await save(i.channel,data);
    await i.channel.permissionOverwrites.edit(data.owner,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});
    await i.channel.send({content:'🔓 Ticket reopened by <@'+i.user.id+'>.',components:[buttons()]});
    await log(g,'**Ticket reopened** | '+i.channel.toString()+' | By <@'+i.user.id+'>');
    return reply(i,'Ticket reopened.');
   }
  }catch(e){console.error('JTZ ticket:',e);if(i.deferred||i.replied)await i.editReply('Ticket error: '+e.message).catch(()=>{});else await i.reply({content:'Ticket error: '+e.message,ephemeral:true}).catch(()=>{});}
 });
}
