import 'dotenv/config';
export const guildIds = (process.env.ALLOWED_GUILD_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
export const personalGuildId = '1383300600367808613';
export const ownerId = '184870635854364672';
export const isOwner = id => id === ownerId;
export const isApproved = id => guildIds.includes(id) || id === personalGuildId;
export const token = process.env.DISCORD_TOKEN;
export const clientId = process.env.CLIENT_ID;
