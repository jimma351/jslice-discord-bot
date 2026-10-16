import {PermissionFlagsBits as P} from 'discord.js';

export const gameChoices=['FiveM','DayZ','Aion2','All Games'];
const gameRoleNames=new Set([...gameChoices,'FiveM Access','DayZ Access','Aion2 Access']);
const changing=new Set();

export async function switchGameRoles(guild,userId,choice) {
 if(!gameChoices.includes(choice))throw new Error('Choose FiveM, DayZ, Aion2, or All Games.');
 const key=guild.id+':'+userId;
 if(changing.has(key))throw new Error('Your game roles are still updating. Please try again in a moment.');
 changing.add(key);
 try {
  await guild.roles.fetch();
  const member=await guild.members.fetch({user:userId,force:true});
  if(!member.roles.cache.some(r=>r.name==='Verified')&&!member.permissions.has(P.Administrator))throw new Error('Please verify before changing your game roles.');
  const matches=guild.roles.cache.filter(r=>r.name===choice);
  if(matches.size!==1)throw new Error('Staff need to configure one '+choice+' role before you can select it.');
  const target=matches.first();
  const remove=member.roles.cache.filter(r=>gameRoleNames.has(r.name)&&r.id!==target.id);
  if(member.roles.cache.has(target.id)&&!remove.size)return member;
  const me=await guild.members.fetchMe();
  if(!me.permissions.has(P.ManageRoles)||!member.manageable||!target.editable||remove.some(r=>!r.editable))throw new Error('Staff need to give the bot Manage Roles and place its role above the game roles and your highest role.');
  // One Discord update: preserve every unrelated role, including staff and verification.
  const next=member.roles.cache.filter(r=>r.id!==guild.id&&!gameRoleNames.has(r.name)).map(r=>r.id);
  next.push(target.id);
  return await member.roles.set(next,'Nexus Gaming Hub: member selected '+choice);
 } finally {
  changing.delete(key);
 }
}

