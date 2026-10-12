# JTZ — Nexus Gaming Community bot rebuild

This is an **isolated** Discord.js starter for the new JTZ bot. The original JSlice code on the main branch is not modified.

## Setup
1. Install Node.js 20+.
2. From the `jtz` directory run `npm install`.
3. Copy `.env.example` to `.env` and fill in your bot token, application ID, and approved guild IDs. Never commit `.env`.
4. Run `npm run deploy` to register commands only in approved guilds.
5. Run `npm start`.
6. In an approved Discord server, an administrator can run `/jtz-setup preview` and then `/jtz-setup apply`.

The setup command is **idempotent**: it looks up existing roles, categories, and channels before creating anything. It does not delete existing server configuration. Review the permissions after applying. It does not alter Discord's native Community Onboarding questions.

## Planned next stages
Moderation and logging; tickets; native onboarding guidance; FiveM server-status integration; a secure dashboard; migration of existing Google Sheets, AI and crafting features.

Do not use the Discord bot token for FiveM remote administration. Add authenticated server-side integration separately.
