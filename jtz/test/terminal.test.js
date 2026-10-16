import test from 'node:test';
import assert from 'node:assert/strict';
import {Collection, MessageFlags, PermissionFlagsBits as P} from 'discord.js';
process.env.ALLOWED_GUILD_IDS='guild';
const {attachTerminal}=await import('../src/terminal.js');
const {styledChannel}=await import('../src/restyle.js');
function fixture({kind='command',id='jtz-terminal',verified=true,admin=false,game,fail=false,guildId='guild'}={}) {
 const calls=[];
 const member={id:'user',joinedAt:new Date('2020-01-01'),roles:{cache:new Collection((verified?['Verified','FiveM']:['FiveM']).map(n=>[n,{name:n}]))},permissions:{has:()=>admin}};
 const guild={channels:{cache:new Collection([['support',{id:'support',name:styledChannel('open-a-ticket'),permissionsFor:()=>({has:()=>true})}]])},members:{fetch:async()=>{calls.push('fetch');if(fail)throw Error('private failure detail');return member;}}};
 member.guild=guild;
 const i={guildId,guild,user:{id:'user'},commandName:id,customId:id,values:[game],memberPermissions:member.permissions,
 inGuild:()=>true,isChatInputCommand:()=>kind==='command',isButton:()=>kind==='button',isStringSelectMenu:()=>kind==='menu',
 message:kind==='command'?undefined:{flags:{has:()=>id!=='jtzv2_open'},components:[{components:[{customId:'jtzv2_game',options:[{value:game||'DayZ',default:true}]}]}]},
 channel:{send:async p=>{calls.push('send');i.public=p;}},
 deferReply:async p=>{calls.push('deferReply');assert.equal(p.flags,MessageFlags.Ephemeral);i.deferred=true;},
 deferUpdate:async()=>{calls.push('deferUpdate');i.deferred=true;},
 editReply:async p=>{calls.push('editReply');i.result=p;},reply:async p=>{calls.push('reply');i.result=p;}
 };
 let handler;attachTerminal({on:(_,fn)=>handler=fn});
 return {i,calls,run:()=>handler(i)};
}
test('open defers before member lookup and creates a private dashboard',async()=>{const f=fixture();await f.run();assert.deepEqual(f.calls,['deferReply','fetch','editReply']);assert.match(f.i.result.embeds[0].toJSON().fields[0].value,/FiveM/);});
test('navigation keeps the selected game and updates the same private message',async()=>{const f=fixture({kind:'button',id:'jtzv2_passport',game:'DayZ'});await f.run();assert.deepEqual(f.calls,['deferUpdate','fetch','editReply']);assert.match(f.i.result.embeds[0].toJSON().footer.text,/DayZ/);assert.equal(f.i.result.components[0].toJSON().components[0].options.find(o=>o.default).value,'DayZ');});
test('game selection renders the selected game',async()=>{const f=fixture({kind:'menu',id:'jtzv2_game',game:'Aion2'});await f.run();assert.match(f.i.result.embeds[0].toJSON().fields[0].value,/Aion2/);});
test('shared launch button creates a private reply',async()=>{const f=fixture({kind:'button',id:'jtzv2_open'});await f.run();assert.equal(f.calls[0],'deferReply');});
test('unverified members cannot open terminal',async()=>{const f=fixture({verified:false});await f.run();assert.match(f.i.result.content,/Please verify/);assert.deepEqual(f.i.result.components,[]);});
test('only administrators can post panels',async()=>{const f=fixture({id:'jtzv2-panel'});await f.run();assert.deepEqual(f.calls,['reply']);const a=fixture({id:'jtzv2-panel',admin:true});await a.run();assert.deepEqual(a.calls,['deferReply','send','editReply']);});
test('support resolves styled channel names',async()=>{const f=fixture({kind:'button',id:'jtzv2_support'});await f.run();assert.match(f.i.result.embeds[0].toJSON().description,/<#support>/);});
test('ordinary members see developer access restriction',async()=>{const f=fixture({kind:'button',id:'jtzv2_dev'});await f.run();assert.match(f.i.result.embeds[0].toJSON().description,/Developer access required/);});
test('unrelated ticket interactions and unapproved guilds are ignored',async()=>{for(const options of [{kind:'button',id:'jtz_t_close'},{guildId:'other'}]){const f=fixture(options);await f.run();assert.deepEqual(f.calls,[]);}});
test('deferred errors get a safe response',async()=>{const f=fixture({fail:true});const old=console.error;console.error=()=>{};try{await f.run();}finally{console.error=old;}assert.match(f.i.result.content,/Terminal unavailable/);assert.doesNotMatch(f.i.result.content,/private failure/);});

