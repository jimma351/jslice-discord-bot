import 'dotenv/config';
export const guildIds = (process.env.ALLOWED_GUILD_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
export const isApproved = id => guildIds.includes(id);
export const token = process.env.DISCORD_TOKEN;
export const clientId = process.env.CLIENT_ID;
